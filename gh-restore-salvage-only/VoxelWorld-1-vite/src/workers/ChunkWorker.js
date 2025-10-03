/**
 * 🔧 ChunkWorker - Background Chunk Generation
 *
 * Runs terrain generation in a Web Worker to prevent main thread blocking.
 * Uses transferable objects for zero-copy data transfer.
 *
 * This worker receives chunk generation requests and returns raw block data
 * that the main thread can use to create THREE.js geometry.
 */

// Import RegionNoiseCache (will need to bundle or inline)
// For now, we'll inline the noise functions directly in the worker

let regionNoiseCache = null;
let worldSeed = 0;
let biomes = null;
let noiseParams = null;

// Initialize worker
self.onmessage = function(e) {
    const { type, data } = e.data;

    switch (type) {
        case 'INIT':
            initWorker(data);
            break;

        case 'GENERATE_CHUNK':
            generateChunk(data);
            break;

        case 'CLEAR_CACHE':
            clearCache();
            break;
    }
};

function initWorker({ seed, biomeConfig, noiseConfig }) {
    worldSeed = seed;
    biomes = biomeConfig;
    noiseParams = noiseConfig;

    // Initialize region noise cache
    regionNoiseCache = {
        regionSize: 128,
        cache: new Map(),
        maxCacheSize: 64
    };

    self.postMessage({ type: 'INIT_COMPLETE' });
}

function generateChunk({ chunkX, chunkZ, chunkSize }) {
    // Block data storage
    // Format: Array of { x, y, z, blockType, color }
    const blocks = [];

    // Track tree positions for this chunk
    const treePositions = new Set();
    
    // 🌊 Track water blocks for debugging
    let waterBlockCount = 0;

    for (let x = 0; x < chunkSize; x++) {
        for (let z = 0; z < chunkSize; z++) {
            const worldX = Math.floor(chunkX * chunkSize + x);
            const worldZ = Math.floor(chunkZ * chunkSize + z);

            // Get biome at this location
            const biome = getBiomeAt(worldX, worldZ);

            // Generate terrain height
            const terrainData = generateMultiNoiseTerrain(worldX, worldZ);

            // Scale noise to biome height range
            const biomeHeightCenter = (biome.maxHeight + biome.minHeight) / 2;
            const biomeHeightRange = (biome.maxHeight - biome.minHeight) / 2;
            const generatorHeight = terrainData.height * biomeHeightRange;
            const rawHeight = biomeHeightCenter + generatorHeight;

            // 🌊 OCEAN SUPPORT: Allow negative heights for ocean biomes (seafloor below y=0)
            // Normal biomes: clamp to 0-12, Ocean: allow -2 to 1
            let safeHeight;
            if (biome.name === 'Ocean') {
                safeHeight = Math.floor(Math.max(-2, Math.min(1, rawHeight + 2)));
            } else {
                safeHeight = Math.floor(Math.max(0, Math.min(12, rawHeight + 2)));
            }
            const height = safeHeight;

            // Get colors for layers (as hex values, not THREE.Color)
            const surfaceColor = getHeightBasedColor(biome, height);
            const subSurfaceColor = getHeightBasedColor(biome, height - 1);
            const deepColor = getHeightBasedColor(biome, height - 2);

            // Check for snow
            const snowNoise = multiOctaveNoise(
                worldX + 2000,
                worldZ + 2000,
                noiseParams.microDetail,
                worldSeed + 2000
            );
            const hasSnow = (biome.name.includes('Mountain') || biome.name.includes('Tundra') || biome.name.includes('Forest')) &&
                           height >= biome.maxHeight - 1 &&
                           snowNoise > -0.2;

            const surfaceBlock = hasSnow ? 'snow' : biome.surfaceBlock;
            const surfaceBlockColor = hasSnow ? 0xFFFFFF : surfaceColor;

            // 🎯 OPTIMIZED SPARSE GENERATION
            // Generate bedrock + surface + 2 support layers for solid terrain
            // Deeper blocks generated on-demand when mining

            // 🌊 PRE-CHECK: Calculate water depth for basin excavation
            const WATER_LEVEL = 4; // 🌊 Water fills up to y=4
            let effectiveHeight = height;
            let shouldExcavate = false;

            if (height < WATER_LEVEL) {
                // 🌊 DEPTH VARIATION: Use noise to create deeper pockets
                const depthNoise = simplexNoise(worldX * 0.05, worldZ * 0.05, worldSeed + 5000);

                // In ocean biome or with high depth noise, excavate deeper basin
                if (biome.name === 'Ocean' || depthNoise > 0.4) {
                    const extraDepth = Math.floor((depthNoise + 1) * 2); // 0-4 extra blocks deep
                    effectiveHeight = Math.max(1, height - extraDepth); // Don't go below y=1 (bedrock is y=0)
                    shouldExcavate = true;
                }
            }

            // 1. Bedrock foundation (y=0) - unbreakable
            blocks.push({ x: worldX, y: 0, z: worldZ, blockType: 'bedrock', color: 0x1a1a1a, isPlayerPlaced: false });

            // 2. Smart sparse generation - surface + 4 support layers only
            // 🌊 IMPORTANT: Only generate terrain blocks above water basin floor
            const terrainFloor = shouldExcavate ? effectiveHeight : height;

            // 🌊 Ocean biomes can have negative terrain heights (seafloor below bedrock level)
            // In this case, don't generate terrain blocks - just water above bedrock
            if (terrainFloor >= 1) {
                // Generate only top 5 layers for collision (much faster!)
                const startY = Math.max(1, terrainFloor - 4); // Start 4 blocks below surface (or y=1, whichever is higher)

                for (let fillY = startY; fillY <= terrainFloor; fillY++) {
                    let blockType, color;

                    if (fillY === terrainFloor) {
                        // Surface layer (grass/sand/snow)
                        blockType = surfaceBlock;
                        color = surfaceBlockColor;
                    } else if (fillY >= terrainFloor - 2) {
                        // Sub-surface layers (dirt/sand)
                        blockType = biome.subBlock;
                        color = subSurfaceColor;
                    } else {
                        // Deep layer (stone with occasional iron)
                        if (fillY % 7 === 0) {
                            blockType = 'iron';
                            color = 0x808080;
                        } else {
                            blockType = 'stone';
                            color = 0x696969;
                        }
                    }

                    blocks.push({ x: worldX, y: fillY, z: worldZ, blockType, color, isPlayerPlaced: false });
                }
            }
            // Blocks below startY (deep underground) will be generated on-demand when player digs

            // 🌊 WATER GENERATION: Fill from basin floor to water level
            if (height < WATER_LEVEL) {
                const waterColor = 0x1E90FF; // Dodger blue

                // Fill from effective floor to water level
                for (let waterY = effectiveHeight + 1; waterY <= WATER_LEVEL; waterY++) {
                    blocks.push({ x: worldX, y: waterY, z: worldZ, blockType: 'water', color: waterColor, isPlayerPlaced: false });
                    waterBlockCount++; // Track water blocks
                }
            }

            // NOTE: Tree generation disabled in worker - let main thread handle it
            // Trees need to be registered in VoxelWorld's tree registry for harvesting
            // Worker-generated trees would bypass the tree ID system
        }
    }

    // Convert blocks array to transferable format
    // This allows zero-copy transfer to main thread
    const blockCount = blocks.length;
    const positions = new Int16Array(blockCount * 3); // x, y, z
    const blockTypes = new Uint8Array(blockCount); // Block type ID
    const colors = new Uint32Array(blockCount); // Color as hex
    const flags = new Uint8Array(blockCount); // isPlayerPlaced, etc.

    // Block type mapping (must match VoxelWorld.js blockTypes)
    const blockTypeMap = {
        'bedrock': 0, 'grass': 1, 'sand': 2, 'stone': 3, 'iron': 4, 'snow': 5, 'water': 6,
        'oak_wood': 10, 'pine_wood': 11, 'birch_wood': 12, 'palm_wood': 13, 'dead_wood': 14,
        'forest_leaves': 20, 'mountain_leaves': 21, 'plains_leaves': 22,
        'desert_leaves': 23, 'tundra_leaves': 24
    };

    for (let i = 0; i < blockCount; i++) {
        const block = blocks[i];
        positions[i * 3] = block.x;
        positions[i * 3 + 1] = block.y;
        positions[i * 3 + 2] = block.z;
        blockTypes[i] = blockTypeMap[block.blockType] || 0;
        colors[i] = block.color;
        flags[i] = block.isPlayerPlaced ? 1 : 0;
    }

    // Send data back to main thread with transferable objects
    self.postMessage({
        type: 'CHUNK_READY',
        data: {
            chunkX,
            chunkZ,
            blockCount,
            waterBlockCount, // 🌊 Include water count for debugging
            positions,
            blockTypes,
            colors,
            flags
        }
    }, [positions.buffer, blockTypes.buffer, colors.buffer, flags.buffer]);
}

function clearCache() {
    if (regionNoiseCache) {
        regionNoiseCache.cache.clear();
    }
    self.postMessage({ type: 'CACHE_CLEARED' });
}

// ===== HELPER FUNCTIONS =====

function getBiomeAt(worldX, worldZ) {
    // Voronoi-like biome selection
    const cellSize = 90;
    const cellX = Math.floor(worldX / cellSize);
    const cellZ = Math.floor(worldZ / cellSize);

    let minDistance = Infinity;
    let selectedBiome = biomes.plains;

    for (let oz = -1; oz <= 1; oz++) {
        for (let ox = -1; ox <= 1; ox++) {
            const centerX = (cellX + ox) * cellSize + seededRandom(cellX + ox, cellZ + oz, worldSeed + 100) * cellSize;
            const centerZ = (cellZ + oz) * cellSize + seededRandom(cellX + ox, cellZ + oz, worldSeed + 200) * cellSize;

            const dx = worldX - centerX;
            const dz = worldZ - centerZ;
            const distance = Math.sqrt(dx * dx + dz * dz);

            if (distance < minDistance) {
                minDistance = distance;
                const hash = Math.abs((cellX + ox) * 73856093 ^ (cellZ + oz) * 19349663);
                const biomeIndex = hash % Object.keys(biomes).length;
                selectedBiome = Object.values(biomes)[biomeIndex];
            }
        }
    }

    return selectedBiome;
}

function generateMultiNoiseTerrain(worldX, worldZ) {
    const noise1 = multiOctaveNoise(worldX, worldZ, noiseParams.elevation, worldSeed);
    const noise2 = simplexNoise(worldX * 0.02, worldZ * 0.02, worldSeed + 500);
    const noise3 = waveNoise(worldX, worldZ, worldSeed + 1000);

    const blendedHeight = noise1 * 0.6 + noise2 * 0.25 + noise3 * 0.15;

    return {
        height: Math.max(-1, Math.min(1, blendedHeight)),
        generator: 'multi'
    };
}

function shouldGenerateTree(worldX, worldZ, biome, treePositions) {
    const MIN_TREE_DISTANCE = 3;

    // Check nearby trees
    for (let dx = -MIN_TREE_DISTANCE; dx <= MIN_TREE_DISTANCE; dx++) {
        for (let dz = -MIN_TREE_DISTANCE; dz <= MIN_TREE_DISTANCE; dz++) {
            if (treePositions.has(`${worldX + dx},${worldZ + dz}`)) {
                return false;
            }
        }
    }

    const treeChance = biome.treeChance || 0.1;
    const random = seededRandom(worldX, worldZ, worldSeed + 3000);
    return random < treeChance;
}

function getTreeTypeForBiome(biome) {
    if (biome.name === 'Forest') return 'oak_wood';
    if (biome.name === 'Mountain') return 'pine_wood';
    if (biome.name === 'Tundra') return 'birch_wood';
    if (biome.name === 'Desert') return 'palm_wood';
    return 'oak_wood';
}

function getLeavesTypeForBiome(biome) {
    // Map biome names to leaf types that exist in VoxelWorld.js
    if (biome.name === 'Forest') return 'forest_leaves';
    if (biome.name === 'Mountain') return 'mountain_leaves';
    if (biome.name === 'Plains') return 'plains_leaves';
    if (biome.name === 'Desert') return 'desert_leaves';
    if (biome.name === 'Tundra') return 'tundra_leaves';
    return 'forest_leaves'; // Default
}

function getHeightBasedColor(biome, height) {
    if (!biome.heightColorRange) return biome.color;

    const normalizedHeight = (height - biome.minHeight) / (biome.maxHeight - biome.minHeight);
    const factor = biome.heightColorRange.min + normalizedHeight * (biome.heightColorRange.max - biome.heightColorRange.min);

    const r = ((biome.color >> 16) & 0xFF) * factor;
    const g = ((biome.color >> 8) & 0xFF) * factor;
    const b = (biome.color & 0xFF) * factor;

    return ((Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b)) >>> 0;
}

// ===== NOISE FUNCTIONS =====

function seededRandom(x, z, seed) {
    let hash = seed;
    hash = ((hash << 5) + hash) + x;
    hash = ((hash << 5) + hash) + z;
    hash = (hash * 16807) % 2147483647;
    return Math.abs(Math.sin(hash));
}

function waveNoise(x, z, seed = 0) {
    const freq1 = 0.1;
    const freq2 = 0.15;
    const seedOffset = seed * 0.0001;

    const wave1 = Math.sin((x + seedOffset) * freq1) * Math.cos((z + seedOffset) * freq1);
    const wave2 = Math.sin((x + seedOffset) * freq2) * Math.sin((z + seedOffset) * freq2);

    return (wave1 + wave2 * 0.5) / 1.5;
}

function multiOctaveNoise(x, z, params, seed = 0) {
    let value = 0;
    let amplitude = 1;
    let frequency = params.scale;
    let maxValue = 0;

    for (let octave = 0; octave < params.octaves; octave++) {
        const octaveSeed = seed + octave * 1000;
        const n1 = Math.sin((x * frequency + octaveSeed * 0.001)) * Math.cos((z * frequency + octaveSeed * 0.002));
        const n2 = Math.sin((x * frequency * 1.3 + octaveSeed * 0.003) + (z * frequency * 0.7 + octaveSeed * 0.004));
        const octaveValue = (n1 + n2) * 0.5;

        value += octaveValue * amplitude;
        maxValue += amplitude;

        amplitude *= params.persistence;
        frequency *= 2;
    }

    const normalizedValue = value / maxValue;
    return Math.max(-1, Math.min(1, normalizedValue));
}

function simplexNoise(x, z, seed = 0) {
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

    const hash = (i, j) => {
        let hash = seed;
        hash = ((hash << 5) + hash) + i;
        hash = ((hash << 5) + hash) + j;
        return Math.abs(hash) % 256;
    };

    const grad2 = (hash, x, z) => {
        const gradients = [
            [1, 1], [-1, 1], [1, -1], [-1, -1],
            [1, 0], [-1, 0], [0, 1], [0, -1]
        ];
        const g = gradients[hash & 7];
        return g[0] * x + g[1] * z;
    };

    const s = (x + z) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(z + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Z0 = j - t;
    const x0 = x - X0;
    const z0 = z - Z0;

    let i1, j1;
    if (x0 > z0) {
        i1 = 1; j1 = 0;
    } else {
        i1 = 0; j1 = 1;
    }

    const x1 = x0 - i1 + G2;
    const z1 = z0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const z2 = z0 - 1.0 + 2.0 * G2;

    let n0 = 0, n1 = 0, n2 = 0;

    let t0 = 0.5 - x0 * x0 - z0 * z0;
    if (t0 >= 0) {
        t0 *= t0;
        n0 = t0 * t0 * grad2(hash(i, j), x0, z0);
    }

    let t1 = 0.5 - x1 * x1 - z1 * z1;
    if (t1 >= 0) {
        t1 *= t1;
        n1 = t1 * t1 * grad2(hash(i + i1, j + j1), x1, z1);
    }

    let t2 = 0.5 - x2 * x2 - z2 * z2;
    if (t2 >= 0) {
        t2 *= t2;
        n2 = t2 * t2 * grad2(hash(i + 1, j + 1), x2, z2);
    }

    const rawValue = 70.0 * (n0 + n1 + n2);
    return Math.max(-1, Math.min(1, rawValue));
}
