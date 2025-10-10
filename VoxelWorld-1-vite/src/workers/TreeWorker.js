/**
 * 🌲 TreeWorker - Background Tree & Decoration Generation
 *
 * Handles tree placement, ruins, pumpkins, and other decorations.
 * Runs in a Web Worker to prevent main thread blocking during chunk decoration.
 *
 * Input: heightMap, waterMap, biomeMap from ChunkWorker
 * Output: treePositions[] with metadata for main thread to render
 */

let worldSeed = 0;
let biomes = null;
let chunkSize = 8;

// Track tree positions across chunks for spacing
const treePositions = new Map(); // chunkKey -> Set of positions

// Initialize worker
self.onmessage = function(e) {
    const { type, data } = e.data;

    switch (type) {
        case 'INIT':
            initWorker(data);
            break;

        case 'GENERATE_TREES':
            generateTreesForChunk(data);
            break;

        case 'GENERATE_LOD_TREES':
            generateLODTreesForChunk(data);
            break;

        case 'CLEAR_CACHE':
            clearCache();
            break;
    }
};

function initWorker({ seed, biomeConfig, size }) {
    worldSeed = seed;
    biomes = biomeConfig;
    chunkSize = size || 8;

    console.log('🌲 TreeWorker initialized:', {
        seed: worldSeed,
        chunkSize,
        biomeCount: Object.keys(biomes || {}).length,
        biomes: biomes
    });

    self.postMessage({ type: 'INIT_COMPLETE' });
}

function generateTreesForChunk({ chunkX, chunkZ, heightMap, waterMap, biomeData }) {
    console.log(`🌲 TreeWorker: Generating trees for chunk (${chunkX}, ${chunkZ})`);
    const trees = [];
    let treesAttempted = 0;
    let treesPlaced = 0;

    // 🎄 MEGA DOUGLAS FIR CHECK: 0.1% Dec 24-25 ONLY (ultra-rare Christmas landmark)
    // Check this FIRST before ancient trees (separate system)
    const megaFirRoll = seededRandom(chunkX, chunkZ, worldSeed + 70000);
    const spawnMegaFir = megaFirRoll < 0.001; // 0.1% chance (1 in 1000 chunks)

    if (spawnMegaFir) {
        const centerX = chunkX * chunkSize + Math.floor(chunkSize / 2);
        const centerZ = chunkZ * chunkSize + Math.floor(chunkSize / 2);

        const heightIndex = Math.floor(chunkSize / 2) * chunkSize + Math.floor(chunkSize / 2);
        const groundHeight = heightMap[heightIndex];
        const surfaceY = groundHeight + 1;

        // Check valid location (not water, valid height)
        if (waterMap && waterMap[heightIndex] !== 1 && surfaceY > 1 && surfaceY <= 65) {
            trees.push({
                x: centerX,
                y: surfaceY,
                z: centerZ,
                treeType: 'douglas_fir',
                biome: 'Christmas',
                isAncient: false,
                isMega: false,
                isMegaFir: true // 🎄 Special flag for ChristmasSystem
            });

            treesPlaced++;
            console.log(`🎄✨ MEGA DOUGLAS FIR SITE (${chunkX}, ${chunkZ}): Will spawn Dec 24-25!`);
        }
        // Mega Fir chunk has NO other trees (it's a landmark)
    }
    // 🏛️ ANCIENT TREE SYSTEM: Very rare (1% = every 100 chunks)
    // Generate special landmark trees: Ancient, Mega, or Cone
    else {
        const ancientTreeRoll = seededRandom(chunkX, chunkZ, worldSeed + 50000);
        const spawnAncientTree = ancientTreeRoll < 0.01; // 1% chance (every ~100 chunks)

        if (spawnAncientTree) {
        const centerX = chunkX * chunkSize + Math.floor(chunkSize / 2);
        const centerZ = chunkZ * chunkSize + Math.floor(chunkSize / 2);
        const biome = getBiomeAt(centerX, centerZ);

        const heightIndex = Math.floor(chunkSize / 2) * chunkSize + Math.floor(chunkSize / 2);
        const groundHeight = heightMap[heightIndex];
        const surfaceY = groundHeight + 1;

        // Check valid location (not water, valid height)
        if (waterMap && waterMap[heightIndex] !== 1 && surfaceY > 1 && surfaceY <= 65) {
            // Randomly select ancient tree type (33% each)
            const typeRoll = seededRandom(chunkX + 1000, chunkZ + 1000, worldSeed + 60000);
            let ancientType = 'ancient'; // 3x3 trunk, 15 blocks
            if (typeRoll > 0.66) ancientType = 'mega';     // 20-32 blocks tall
            else if (typeRoll > 0.33) ancientType = 'cone'; // Hybrid LOD style

            const treeType = getTreeTypeForBiome(biome);

            trees.push({
                x: centerX,
                y: surfaceY,
                z: centerZ,
                treeType,
                biome: biome.name,
                isAncient: true,
                isMega: (ancientType === 'mega'),
                isCone: (ancientType === 'cone'),
                ancientType
            });

            treesPlaced++;
            console.log(`🏛️ ANCIENT TREE (${chunkX}, ${chunkZ}): ${ancientType.toUpperCase()} ${treeType}`);
        }
        // Ancient tree chunk has NO other trees (it's a landmark)
        } else {
        // ✅ NORMAL CHUNK: Generate regular scattered trees
        for (let x = 0; x < chunkSize; x++) {
            for (let z = 0; z < chunkSize; z++) {
                const worldX = chunkX * chunkSize + x;
                const worldZ = chunkZ * chunkSize + z;

                // Get biome at this location
                const biome = getBiomeAt(worldX, worldZ);

                // Check if we should generate a tree using noise-based placement
                const passesNoiseCheck = shouldGenerateTree(worldX, worldZ, biome);

                if (passesNoiseCheck) {
                    treesAttempted++;

                    // Get height from worker's heightMap
                    const heightIndex = x * chunkSize + z;

                    // Check water map - skip if this position has water
                    if (waterMap && waterMap[heightIndex] === 1) {
                        continue; // Water position - no trees
                    }

                    // Get ground height from heightMap
                    const groundHeight = heightMap[heightIndex];
                    const surfaceY = groundHeight + 1; // Tree sits on top of ground block

                    // Only place tree if we found a valid surface
                    if (surfaceY > 1 && surfaceY <= 65) {
                        // 🌲 DETERMINE TREE TYPE FIRST (needed for spacing calculation)
                        let treeType = getTreeTypeForBiome(biome);

                        // 🎃 DEAD TREE SPAWN (5% chance in any biome)
                        const deadTreeChance = seededNoise(worldX + 35000, worldZ + 35000);
                        const isDeadTree = deadTreeChance > 0.95;

                        if (isDeadTree) {
                            treeType = 'dead_wood';
                        }

                        // 🎄 DOUGLAS FIR SPAWN (1% year-round chance in any biome)
                        const douglasFirRoll = seededRandom(worldX + 70000, worldZ + 70000, worldSeed + 70000);
                        const isDouglasFir = douglasFirRoll < 0.01; // 1% chance

                        if (isDouglasFir) {
                            treeType = 'douglas_fir';
                        }

                        // Check spacing based on tree type (different trees need different space!)
                        const tooCloseToOtherTree = hasNearbyTree(worldX, worldZ, chunkX, chunkZ, treeType);

                        if (tooCloseToOtherTree) {
                            continue; // Skip this tree, too close to another
                        }

                        trees.push({
                            x: worldX,
                            y: surfaceY,
                            z: worldZ,
                            treeType,
                            biome: biome.name,
                            isAncient: false,
                            isMega: false
                        });

                        treesPlaced++;

                        // Track tree position for spacing
                        trackTreePosition(worldX, worldZ, chunkX, chunkZ);

                        // 🎃 PUMPKIN NEAR TREE: 5% chance for oak, birch, pine trees
                        if (['oak_wood', 'birch_wood', 'pine_wood'].includes(treeType)) {
                            const pumpkinRoll = seededRandom(worldX + 40000, worldZ + 40000, worldSeed + 40000);
                            if (pumpkinRoll < 0.05) { // 5% chance
                                // Place pumpkin 2-3 blocks away from tree in random direction
                                const angle = seededRandom(worldX + 41000, worldZ + 41000, worldSeed + 41000) * Math.PI * 2;
                                const distance = 2 + Math.floor(seededRandom(worldX + 42000, worldZ + 42000, worldSeed + 42000) * 2); // 2-3 blocks
                                const pumpkinX = Math.round(worldX + Math.cos(angle) * distance);
                                const pumpkinZ = Math.round(worldZ + Math.sin(angle) * distance);

                                // Add pumpkin to tree data (main thread will place it)
                                if (!trees[trees.length - 1].pumpkin) {
                                    trees[trees.length - 1].pumpkin = {
                                        x: pumpkinX,
                                        z: pumpkinZ,
                                        y: surfaceY // Place on same surface level as tree
                                    };
                                }
                            }
                        }
                    }
                }
            }
        }
        }
    }

    // Send tree data back to main thread
    console.log(`🌲 TreeWorker: Sending ${treesPlaced} trees for chunk (${chunkX}, ${chunkZ})`);
    self.postMessage({
        type: 'TREES_READY',
        data: {
            chunkX,
            chunkZ,
            trees,
            treesPlaced,
            treesAttempted
        }
    });
}

function clearCache() {
    treePositions.clear();
    self.postMessage({ type: 'CACHE_CLEARED' });
}

// ===== HELPER FUNCTIONS =====

function getBiomeAt(worldX, worldZ) {
    // Voronoi-like biome selection (same as ChunkWorker)
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

function shouldGenerateTree(worldX, worldZ, biome) {
    // 🌲 USE OLD WORKING FORMULA from VoxelWorld-X BiomeWorldGen.js!
    const baseTreeChance = biome.treeChance || 0.08;

    // Biome-specific density multipliers (from old working code)
    const biomeDensityMultipliers = {
        'Forest': 8,
        'Plains': 10,
        'Mountain': 10,
        'Desert': 2,
        'Tundra': 3
    };

    let multiplier = 5; // Default
    const biomeName = biome.name || '';
    for (const [name, mult] of Object.entries(biomeDensityMultipliers)) {
        if (biomeName.includes(name)) {
            multiplier = mult;
            break;
        }
    }

    // Use high-frequency noise for scatter
    const treeNoise = multiOctaveNoise(worldX + 4000, worldZ + 4000, worldSeed + 4000, 3, 0.15, 0.6);

    // OLD FORMULA: threshold = 1 - (baseChance * multiplier)
    // Example Plains: 1 - (0.08 * 10) = 1 - 0.8 = 0.2
    // Trees spawn when noise > 0.2 (80% of positions!)
    const threshold = 1 - (baseTreeChance * multiplier);

    // Normalize noise from [-1, 1] to [0, 1]
    const normalizedNoise = (treeNoise + 1) / 2;

    return normalizedNoise > threshold;
}

function hasNearbyTree(worldX, worldZ, chunkX, chunkZ, treeType) {
    // 🌲 TREE-TYPE-SPECIFIC SPACING: Different trees need different space for their canopies
    const TREE_SPACING = {
        'oak_wood': 5,      // 5x5 canopy needs room
        'pine_wood': 6,     // Tall conical canopy
        'birch_wood': 3,    // Sparse canopy, can be tight
        'palm_wood': 5,     // Extended fronds
        'dead_wood': 3,     // No canopy, just trunk + loot
        'douglas_fir': 6,   // 🎄 Tall cone (similar to pine)
        'default': 4        // Fallback spacing
    };

    const minDistance = TREE_SPACING[treeType] || TREE_SPACING['default'];

    // Check current chunk
    const currentChunkKey = `${chunkX},${chunkZ}`;
    const currentChunkTrees = treePositions.get(currentChunkKey) || new Set();

    // Check adjacent chunks
    for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
            const neighborKey = `${chunkX + dx},${chunkZ + dz}`;
            const neighborTrees = treePositions.get(neighborKey) || new Set();

            for (const posKey of neighborTrees) {
                const [tx, tz] = posKey.split(',').map(Number);
                const distance = Math.sqrt((worldX - tx) ** 2 + (worldZ - tz) ** 2);

                if (distance < minDistance) {
                    return true;
                }
            }
        }
    }

    return false;
}

function trackTreePosition(worldX, worldZ, chunkX, chunkZ) {
    const chunkKey = `${chunkX},${chunkZ}`;

    if (!treePositions.has(chunkKey)) {
        treePositions.set(chunkKey, new Set());
    }

    const posKey = `${worldX},${worldZ}`;
    treePositions.get(chunkKey).add(posKey);
}

function getTreeTypeForBiome(biome) {
    // Map biome names to tree types
    if (biome.name === 'Forest') return 'oak_wood';
    if (biome.name === 'Mountain') return 'pine_wood';
    if (biome.name === 'Tundra') return 'birch_wood';
    if (biome.name === 'Desert') return 'palm_wood';
    if (biome.name === 'Plains') return 'oak_wood';
    return 'oak_wood'; // Default
}

// ===== NOISE FUNCTIONS =====

function seededRandom(x, z, seed = worldSeed) {
    let hash = seed;
    hash = ((hash << 5) + hash) + x;
    hash = ((hash << 5) + hash) + z;
    hash = (hash * 16807) % 2147483647;
    return Math.abs(Math.sin(hash));
}

function multiOctaveNoise(x, z, seed, octaves, scale, persistence) {
    let value = 0;
    let amplitude = 1;
    let frequency = scale;
    let maxValue = 0;

    for (let octave = 0; octave < octaves; octave++) {
        const octaveSeed = seed + octave * 1000;
        const n1 = Math.sin((x * frequency + octaveSeed * 0.001)) * Math.cos((z * frequency + octaveSeed * 0.002));
        const n2 = Math.sin((x * frequency * 1.3 + octaveSeed * 0.003) + (z * frequency * 0.7 + octaveSeed * 0.004));
        const octaveValue = (n1 + n2) * 0.5;

        value += octaveValue * amplitude;
        maxValue += amplitude;

        amplitude *= persistence;
        frequency *= 2;
    }

    const normalizedValue = value / maxValue;
    return Math.max(-1, Math.min(1, normalizedValue));
}

function seededNoise(x, z) {
    // Simple seeded noise for tree placement
    return seededRandom(Math.floor(x * 10), Math.floor(z * 10), worldSeed + 3000);
}

/**
 * 🎨 Generate LOD trees for distant chunks
 * Returns simple colored blocks representing trees
 */
function generateLODTreesForChunk({ chunkX, chunkZ, heightMap, waterMap }) {
    console.log(`🎨 TreeWorker: Generating LOD trees for chunk (${chunkX}, ${chunkZ})`);
    const lodTreeBlocks = [];

    for (let x = 0; x < chunkSize; x++) {
        for (let z = 0; z < chunkSize; z++) {
            const worldX = chunkX * chunkSize + x;
            const worldZ = chunkZ * chunkSize + z;

            // Get biome at this location
            const biome = getBiomeAt(worldX, worldZ);

            // Check if tree should spawn (same logic as full trees)
            const passesNoiseCheck = shouldGenerateTree(worldX, worldZ, biome);

            if (passesNoiseCheck) {
                // Determine tree type for spacing (LOD trees are simplified but need same spacing)
                const treeType = getTreeTypeForBiome(biome);

                // Check spacing based on tree type
                const tooCloseToOtherTree = hasNearbyTree(worldX, worldZ, chunkX, chunkZ, treeType);
                if (tooCloseToOtherTree) {
                    continue;
                }

                // Get height from heightMap
                const heightIndex = x * chunkSize + z;

                // Skip if water
                if (waterMap && waterMap[heightIndex] === 1) {
                    continue;
                }

                const groundHeight = heightMap[heightIndex];
                const surfaceY = groundHeight + 1;

                if (surfaceY > 1 && surfaceY <= 65) {
                    // Simple LOD tree: Just a few colored blocks
                    // Brown trunk block + green canopy blocks
                    const treeHeight = 5; // Simplified height for LOD
                    const trunkColor = 0x8B4513; // Brown
                    const leavesColor = 0x228B22; // Green

                    // Add trunk (1-2 blocks)
                    lodTreeBlocks.push({
                        x: worldX,
                        y: surfaceY,
                        z: worldZ,
                        color: trunkColor
                    });
                    lodTreeBlocks.push({
                        x: worldX,
                        y: surfaceY + 1,
                        z: worldZ,
                        color: trunkColor
                    });

                    // Add simple canopy (3x3 flat top)
                    for (let dx = -1; dx <= 1; dx++) {
                        for (let dz = -1; dz <= 1; dz++) {
                            lodTreeBlocks.push({
                                x: worldX + dx,
                                y: surfaceY + 2,
                                z: worldZ + dz,
                                color: leavesColor
                            });
                        }
                    }

                    // Track tree position
                    trackTreePosition(worldX, worldZ, chunkX, chunkZ);
                }
            }
        }
    }

    console.log(`🎨 TreeWorker: Sending ${lodTreeBlocks.length} LOD tree blocks for chunk (${chunkX}, ${chunkZ})`);

    // Send LOD tree data back to main thread
    self.postMessage({
        type: 'LOD_TREES_READY',
        data: {
            chunkX,
            chunkZ,
            lodTreeBlocks
        }
    });
}
