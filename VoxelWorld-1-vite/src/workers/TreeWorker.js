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
    let debugFirstBiome = null;
    let debugFirstNoiseCheck = null;

    for (let x = 0; x < chunkSize; x++) {
        for (let z = 0; z < chunkSize; z++) {
            const worldX = chunkX * chunkSize + x;
            const worldZ = chunkZ * chunkSize + z;

            // Get biome at this location
            const biome = getBiomeAt(worldX, worldZ);

            // Debug: log first biome
            if (!debugFirstBiome) {
                debugFirstBiome = biome;
                console.log(`🌲 First biome at (${worldX}, ${worldZ}):`, biome.name, 'treeChance:', biome.treeChance);
            }

            // Check if we should generate a tree using noise-based placement
            const passesNoiseCheck = shouldGenerateTree(worldX, worldZ, biome);

            // Debug: log first noise check
            if (debugFirstNoiseCheck === null) {
                debugFirstNoiseCheck = passesNoiseCheck;
                console.log(`🌲 First noise check: ${passesNoiseCheck}`);
            }

            if (passesNoiseCheck) {
                // Check spacing to prevent tree crowding
                const tooCloseToOtherTree = hasNearbyTree(worldX, worldZ, chunkX, chunkZ);

                if (tooCloseToOtherTree) {
                    continue; // Skip this tree, too close to another
                }

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
                    // 🌳 ANCIENT TREE SPAWN CHANCE
                    // 20% total: 15% regular ancient, 5% mega ancient
                    const ancientChance = seededNoise(worldX + 25000, worldZ + 25000);

                    let treeType = getTreeTypeForBiome(biome);
                    let isAncient = false;
                    let isMega = false;

                    if (ancientChance > 0.80) {
                        // 20% of trees are ancient
                        isAncient = true;
                        if (ancientChance > 0.95) {
                            // Top 5% are mega ancient
                            isMega = true;
                        }
                    }

                    // 🎃 DEAD TREE SPAWN (5% chance in any biome)
                    const deadTreeChance = seededNoise(worldX + 35000, worldZ + 35000);
                    const isDeadTree = deadTreeChance > 0.95;

                    if (isDeadTree) {
                        treeType = 'dead_wood';
                        isAncient = false; // Dead trees don't have ancient variants
                        isMega = false;
                    }

                    trees.push({
                        x: worldX,
                        y: surfaceY,
                        z: worldZ,
                        treeType,
                        biome: biome.name,
                        isAncient,
                        isMega
                    });

                    treesPlaced++;

                    // Track tree position for spacing
                    trackTreePosition(worldX, worldZ, chunkX, chunkZ);
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
    // Match BiomeWorldGen.js tree placement logic
    // Use treeChance property (0.08 for Plains, 0.12 for Forest, etc.)
    const treeChance = biome.treeChance || 0.08;

    // Use noise to determine if tree should spawn
    const treeNoise = seededNoise(worldX + 4000, worldZ + 4000);

    // Tree spawns if noise is GREATER than threshold
    // Higher treeChance = lower threshold = more trees
    // Example: treeChance=0.12 → threshold=0.88 → 12% spawn rate
    return treeNoise > (1 - treeChance);
}

function hasNearbyTree(worldX, worldZ, chunkX, chunkZ) {
    const MIN_TREE_DISTANCE = 3;

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

                if (distance < MIN_TREE_DISTANCE) {
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

function seededNoise(x, z) {
    // Simple seeded noise for tree placement
    return seededRandom(Math.floor(x * 10), Math.floor(z * 10), worldSeed + 3000);
}
