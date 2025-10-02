import * as THREE from 'three';

/**
 * 🌍 BiomeWorldGen - Advanced Multi-Layer Biome Generation System
 *
 * Features:
 * - Multi-layer noise system (Perlin, Simplex, Voronoi)
 * - Smooth biome transitions with 5-10 block blending zones
 * - Biome variants and sub-biomes for variety
 * - Elevation-based micro-climates
 * - Natural biome distribution with clustering
 */
export class BiomeWorldGen {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;
        this.worldSeed = 0;
        this.chunkCache = new Map(); // Cache biome data for performance

        // 🐛 Debug mode - temporarily enabled to see tree generation
        this.DEBUG_MODE = false; // Toggle for detailed logging
        this.STATS = {
            chunksGenerated: 0,
            lowHeights: 0,
            emergencyFills: 0,
            treesPlaced: 0
        };

        // 🌲 TREE SPACING SYSTEM - Track tree positions to prevent chunks
        this.treePositions = new Set(); // Store "x,z" keys for quick lookup
        this.MIN_TREE_DISTANCE = 3; // Minimum blocks between trees

        this.initializeBiomes();
        this.initializeNoiseGenerators();
    }

    // 🌍 Enhanced Biome Definitions with Variants
    initializeBiomes() {
        this.biomes = {
            forest: {
                name: 'Forest',
                color: 0x228B22,
                minHeight: 2,  // 🌊 NEW SYSTEM: Base terrain y=1-3, forests slightly raised
                maxHeight: 5,  // 🌊 Gentle hills for forest biomes
                surfaceBlock: 'grass',
                subBlock: 'dirt',
                mapColor: '#228B22',
                heightColorRange: { min: 0.6, max: 1.2 },
                shrubChance: 0.35,

                // NEW: Enhanced properties
                variants: ['dense_forest', 'sparse_forest', 'old_growth'],
                transitionZone: 'forest_edge',
                specialFeatures: ['clearings', 'streams'],
                treeDistribution: { min: 0.25, max: 0.40, clusters: true },
                treeChance: 0.32 // Average of treeDistribution range
            },

            desert: {
                name: 'Desert',
                color: 0xDEB887,
                minHeight: 1,  // 🌊 NEW SYSTEM: Deserts at water level (potential oases)
                maxHeight: 4,  // 🌊 Sand dunes for mining
                surfaceBlock: 'sand',
                subBlock: 'sand',
                mapColor: '#DEB887',
                heightColorRange: { min: 0.7, max: 1.1 },
                shrubChance: 0.03,

                variants: ['sandy_desert', 'rocky_desert', 'oasis'],
                transitionZone: 'desert_edge',
                specialFeatures: ['dunes', 'oases', 'mesas'],
                treeDistribution: { min: 0.01, max: 0.03, clusters: false },
                treeChance: 0.02 // Average of treeDistribution range
            },

            mountain: {
                name: 'Mountain',
                color: 0x696969,
                minHeight: 4,  // 🌊 NEW SYSTEM: Mountains rise above water
                maxHeight: 15, // 🌊 TALL mountains for deep mining (y=4 to y=15 = 11 blocks tall!)
                surfaceBlock: 'stone',
                subBlock: 'iron',
                mapColor: '#696969',
                heightColorRange: { min: 0.8, max: 1.4 },
                shrubChance: 0.08,

                variants: ['rocky_peaks', 'alpine_meadows', 'mountain_forest'],
                transitionZone: 'foothills',
                specialFeatures: ['peaks', 'valleys', 'caves'],
                treeDistribution: { min: 0.15, max: 0.30, clusters: true },
                treeChance: 0.22 // Average of treeDistribution range
            },

            plains: {
                name: 'Plains',
                color: 0x90EE90,
                minHeight: 2,  // 🌊 NEW SYSTEM: Flat plains just above water
                maxHeight: 3,  // 🌊 Very flat, minimal hills
                surfaceBlock: 'grass',
                subBlock: 'dirt',
                mapColor: '#90EE90',
                heightColorRange: { min: 0.65, max: 1.15 },
                shrubChance: 0.20,

                variants: ['grasslands', 'meadows', 'prairie'],
                transitionZone: 'plains_edge',
                specialFeatures: ['rivers', 'hills', 'groves'],
                treeDistribution: { min: 0.05, max: 0.12, clusters: true },
                treeChance: 0.08 // Average of treeDistribution range
            },

            tundra: {
                name: 'Tundra',
                color: 0xF0F8FF,
                minHeight: 2,  // 🌊 NEW SYSTEM: Frozen tundra slightly raised
                maxHeight: 5,  // 🌊 Icy hills
                surfaceBlock: 'stone',
                subBlock: 'iron',
                mapColor: '#F0F8FF',
                heightColorRange: { min: 0.5, max: 1.0 },
                shrubChance: 0.01,

                variants: ['frozen_tundra', 'taiga_edge', 'permafrost'],
                transitionZone: 'tundra_border',
                specialFeatures: ['ice_formations', 'frozen_lakes'],
                treeDistribution: { min: 0.02, max: 0.05, clusters: false },
                treeChance: 0.035 // Average of treeDistribution range
            }
        };
    }

    // 🌊 Wave Noise (Sinusoidal patterns)
    waveNoise(x, z, seed = 0) {
        // Create wave patterns using sine functions
        const freq1 = 0.1;
        const freq2 = 0.15;
        const seedOffset = seed * 0.0001;

        const wave1 = Math.sin((x + seedOffset) * freq1) * Math.cos((z + seedOffset) * freq1);
        const wave2 = Math.sin((x + seedOffset) * freq2) * Math.sin((z + seedOffset) * freq2);

        // Combine waves for more interesting patterns
        return (wave1 + wave2 * 0.5) / 1.5; // Normalize to roughly -1 to 1
    }

    // 🎛️ Multi-Layer Noise System Initialization
    initializeNoiseGenerators() {
        this.noiseParams = {
            // Primary biome zones using Voronoi-like cells
            primaryBiome: {
                scale: 0.008,      // Large scale for major biome territories
                octaves: 2,
                persistence: 0.5
            },

            // Secondary variation for sub-biomes
            biomeVariation: {
                scale: 0.025,      // Medium scale for biome variants
                octaves: 3,
                persistence: 0.6
            },

            // Fine detail for micro-features
            microDetail: {
                scale: 0.1,        // Small scale for local features
                octaves: 4,
                persistence: 0.4
            },

            // Elevation noise - Fine-tuned for better terrain variety
            elevation: {
                scale: 0.012,      // Slightly reduced for smoother terrain
                octaves: 5,        // Added octave for more detail
                persistence: 0.65   // Slightly reduced for better balance
            }
        };
    }

    // 🌊 Advanced Multi-Octave Noise Function
    multiOctaveNoise(x, z, params, seed = 0) {
        let value = 0;
        let amplitude = 1;
        let frequency = params.scale;
        let maxValue = 0;

        for (let octave = 0; octave < params.octaves; octave++) {
            // Enhanced noise with seed variation per octave
            const octaveSeed = seed + octave * 1000;
            const n1 = Math.sin((x * frequency + octaveSeed * 0.001)) * Math.cos((z * frequency + octaveSeed * 0.002));
            const n2 = Math.sin((x * frequency * 1.3 + octaveSeed * 0.003) + (z * frequency * 0.7 + octaveSeed * 0.004));
            const octaveValue = (n1 + n2) * 0.5;

            value += octaveValue * amplitude;
            maxValue += amplitude;

            amplitude *= params.persistence;
            frequency *= 2;
        }

        const normalizedValue = value / maxValue; // Normalize to [-1, 1]

        // 🛡️ SAFETY: Clamp to expected range and validate
        const clampedValue = Math.max(-1, Math.min(1, normalizedValue));

        // Debug extreme values (only in debug mode)
        if (this.DEBUG_MODE && Math.abs(normalizedValue) > 1.1) {
            console.warn(`⚠️ NOISE OUT OF RANGE at (${x}, ${z}): ${normalizedValue.toFixed(3)} clamped to ${clampedValue.toFixed(3)}`);
        }

        return clampedValue;
    }

    // 🌊 Genuine Perlin Noise Algorithm with Gradient Interpolation
    perlinNoise(x, z, seed = 0) {
        // Perlin noise permutation table (simplified version)
        const permutation = [];
        for (let i = 0; i < 256; i++) {
            // Create seeded permutation
            const hash = ((i + seed) * 16807) % 2147483647;
            permutation[i] = hash % 256;
            permutation[256 + i] = permutation[i];
        }

        // Gradient vectors for 2D
        const gradients = [
            [1, 1], [-1, 1], [1, -1], [-1, -1],
            [1, 0], [-1, 0], [0, 1], [0, -1]
        ];

        const grad = (hash, x, z) => {
            const g = gradients[hash & 7];
            return g[0] * x + g[1] * z;
        };

        // Fade function (6t^5 - 15t^4 + 10t^3)
        const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);

        // Linear interpolation
        const lerp = (a, b, t) => a + t * (b - a);

        // Get integer and fractional parts
        const X = Math.floor(x) & 255;
        const Z = Math.floor(z) & 255;
        const xf = x - Math.floor(x);
        const zf = z - Math.floor(z);

        // Get fade curves
        const u = fade(xf);
        const v = fade(zf);

        // Hash coordinates of square corners
        const A = permutation[X] + Z;
        const B = permutation[X + 1] + Z;

        // Blend the results from the four corners
        const gradAA = grad(permutation[A], xf, zf);
        const gradBA = grad(permutation[B], xf - 1, zf);
        const gradAB = grad(permutation[A + 1], xf, zf - 1);
        const gradBB = grad(permutation[B + 1], xf - 1, zf - 1);

        const lerpX1 = lerp(gradAA, gradBA, u);
        const lerpX2 = lerp(gradAB, gradBB, u);

        return lerp(lerpX1, lerpX2, v);
    }

    // 🔺 Simplex Noise Algorithm (Ken Perlin's Improved Version)
    simplexNoise(x, z, seed = 0) {
        // Skewing and unskewing factors for 2D
        const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
        const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

        // Simple hash function for seeded randomness
        const hash = (i, j) => {
            let hash = seed;
            hash = ((hash << 5) + hash) + i;
            hash = ((hash << 5) + hash) + j;
            return Math.abs(hash) % 256;
        };

        // Gradient function
        const grad2 = (hash, x, z) => {
            const gradients = [
                [1, 1], [-1, 1], [1, -1], [-1, -1],
                [1, 0], [-1, 0], [0, 1], [0, -1]
            ];
            const g = gradients[hash & 7];
            return g[0] * x + g[1] * z;
        };

        // Skew the input space to determine which simplex cell we're in
        const s = (x + z) * F2;
        const i = Math.floor(x + s);
        const j = Math.floor(z + s);
        const t = (i + j) * G2;
        const X0 = i - t;
        const Z0 = j - t;
        const x0 = x - X0;
        const z0 = z - Z0;

        // Determine which simplex we are in
        let i1, j1;
        if (x0 > z0) {
            i1 = 1; j1 = 0;
        } else {
            i1 = 0; j1 = 1;
        }

        // Offsets for middle and last corner
        const x1 = x0 - i1 + G2;
        const z1 = z0 - j1 + G2;
        const x2 = x0 - 1.0 + 2.0 * G2;
        const z2 = z0 - 1.0 + 2.0 * G2;

        // Calculate the contribution from the three corners
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

        // Add contributions and normalize to [-1,1] range
        const rawValue = 70.0 * (n0 + n1 + n2);
        return Math.max(-1, Math.min(1, rawValue));
    }

    // 📐 Voronoi Cell Noise (Distance-based)
    voronoiNoise(x, z, seed = 0) {
        const cellSize = 16; // Size of Voronoi cells
        const cellX = Math.floor(x / cellSize);
        const cellZ = Math.floor(z / cellSize);

        let minDistance = Infinity;
        let secondMinDistance = Infinity;

        // Check 3x3 grid of cells
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const neighborX = cellX + dx;
                const neighborZ = cellZ + dz;

                // Generate random point within cell
                const hash = this.hashCoords(neighborX, neighborZ, seed);
                const pointX = neighborX * cellSize + (Math.abs(hash) % cellSize);
                const pointZ = neighborZ * cellSize + (Math.abs(hash >> 8) % cellSize);

                // Calculate distance to this point
                const distance = Math.sqrt((x - pointX) ** 2 + (z - pointZ) ** 2);

                if (distance < minDistance) {
                    secondMinDistance = minDistance;
                    minDistance = distance;
                } else if (distance < secondMinDistance) {
                    secondMinDistance = distance;
                }
            }
        }

        // Return F2 - F1 (difference between closest and second closest points)
        const normalizedDistance = (secondMinDistance - minDistance) / cellSize;
        return Math.max(-1, Math.min(1, normalizedDistance * 2 - 1));
    }

    // 🥞 Worley Noise (Cellular Noise)
    worleyNoise(x, z, seed = 0) {
        const cellSize = 20; // Size of Worley cells
        const cellX = Math.floor(x / cellSize);
        const cellZ = Math.floor(z / cellSize);

        let minDistance = Infinity;

        // Check 3x3 grid of cells
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const neighborX = cellX + dx;
                const neighborZ = cellZ + dz;

                // Generate random point within cell
                const hash = this.hashCoords(neighborX, neighborZ, seed);
                const pointX = neighborX * cellSize + (Math.abs(hash) % cellSize);
                const pointZ = neighborZ * cellSize + (Math.abs(hash >> 8) % cellSize);

                // Calculate distance to this point
                const distance = Math.sqrt((x - pointX) ** 2 + (z - pointZ) ** 2);
                minDistance = Math.min(minDistance, distance);
            }
        }

        // Normalize distance to [-1, 1] range
        const normalizedDistance = minDistance / (cellSize * 0.7);
        return Math.max(-1, Math.min(1, 1 - normalizedDistance * 2));
    }

    // 🎛️ Multi-Generator System Architecture
    initializeNoiseGenerators() {
        this.noiseParams = {
            // Primary biome zones using Voronoi-like cells
            primaryBiome: {
                scale: 0.008,      // Large scale for major biome territories
                octaves: 2,
                persistence: 0.5
            },

            // Secondary variation for sub-biomes
            biomeVariation: {
                scale: 0.025,      // Medium scale for biome variants
                octaves: 3,
                persistence: 0.6
            },

            // Fine detail for micro-features
            microDetail: {
                scale: 0.1,        // Small scale for local features
                octaves: 4,
                persistence: 0.4
            },

            // Elevation noise - Fine-tuned for better terrain variety
            elevation: {
                scale: 0.012,      // Slightly reduced for smoother terrain
                octaves: 5,        // Added octave for more detail
                persistence: 0.65   // Slightly reduced for better balance
            }
        };

        // 🌍 Generator Registry - Each generator creates unique terrain characteristics
        this.generators = {
            perlin: {
                name: 'Perlin',
                noiseFunction: this.perlinNoise.bind(this),
                characteristics: 'Rolling hills, smooth transitions',
                biomePreference: ['forest', 'plains'], // Prefers organic biomes
                heightMultiplier: 1.0,
                terrainStyle: 'smooth'
            },
            simplex: {
                name: 'Simplex',
                noiseFunction: this.simplexNoise.bind(this),
                characteristics: 'Sharp features, detailed ridges',
                biomePreference: ['mountain', 'desert'], // Prefers dramatic biomes
                heightMultiplier: 1.2,
                terrainStyle: 'sharp'
            },
            voronoi: {
                name: 'Voronoi',
                noiseFunction: this.voronoiNoise.bind(this),
                characteristics: 'Cellular patterns, flat plateaus',
                biomePreference: ['tundra', 'plains'], // Prefers flat biomes
                heightMultiplier: 0.8,
                terrainStyle: 'cellular'
            },
            worley: {
                name: 'Worley',
                noiseFunction: this.worleyNoise.bind(this),
                characteristics: 'Organic cellular, bubble-like',
                biomePreference: ['forest', 'desert'], // Mixed preferences
                heightMultiplier: 0.9,
                terrainStyle: 'organic'
            },
            wave: {
                name: 'Wave',
                noiseFunction: this.waveNoise.bind(this),
                characteristics: 'Wave patterns, regular undulation',
                biomePreference: ['mountain', 'tundra'], // Mathematical biomes
                heightMultiplier: 1.1,
                terrainStyle: 'mathematical'
            }
        };

        // 🗺️ Generator Region System - Divide world into regions using different generators
        this.generatorRegionSize = 200; // Each generator covers ~200x200 block regions
        this.transitionZoneSize = 8; // 5-10 block transition zones as requested
    }

    // 🎯 Get Primary Generator for World Region
    getGeneratorForRegion(x, z, seed = this.worldSeed) {
        const regionX = Math.floor(x / this.generatorRegionSize);
        const regionZ = Math.floor(z / this.generatorRegionSize);

        // Use hash to deterministically assign generator to region
        const regionHash = this.hashCoords(regionX, regionZ, seed + 9999);
        const generatorNames = Object.keys(this.generators);
        const generatorIndex = Math.abs(regionHash) % generatorNames.length;

        return generatorNames[generatorIndex];
    }

    // 🔄 Detect Multi-Generator Transition Zones
    getGeneratorTransition(x, z, seed = this.worldSeed) {
        const regionX = Math.floor(x / this.generatorRegionSize);
        const regionZ = Math.floor(z / this.generatorRegionSize);

        // Calculate position within region
        const localX = x - (regionX * this.generatorRegionSize);
        const localZ = z - (regionZ * this.generatorRegionSize);

        // Check if we're near any region boundaries
        const nearLeftEdge = localX < this.transitionZoneSize;
        const nearRightEdge = localX > (this.generatorRegionSize - this.transitionZoneSize);
        const nearTopEdge = localZ < this.transitionZoneSize;
        const nearBottomEdge = localZ > (this.generatorRegionSize - this.transitionZoneSize);

        if (!nearLeftEdge && !nearRightEdge && !nearTopEdge && !nearBottomEdge) {
            // Not in transition zone - use primary generator
            return {
                isTransition: false,
                primaryGenerator: this.getGeneratorForRegion(x, z, seed),
                secondaryGenerator: null,
                blendFactor: 0
            };
        }

        // We're in a transition zone - find neighboring generator
        let neighborRegionX = regionX;
        let neighborRegionZ = regionZ;
        let blendProgress = 0;

        if (nearLeftEdge) {
            neighborRegionX = regionX - 1;
            blendProgress = (this.transitionZoneSize - localX) / this.transitionZoneSize;
        } else if (nearRightEdge) {
            neighborRegionX = regionX + 1;
            blendProgress = (localX - (this.generatorRegionSize - this.transitionZoneSize)) / this.transitionZoneSize;
        }

        if (nearTopEdge) {
            neighborRegionZ = regionZ - 1;
            const topBlend = (this.transitionZoneSize - localZ) / this.transitionZoneSize;
            blendProgress = Math.max(blendProgress, topBlend);
        } else if (nearBottomEdge) {
            neighborRegionZ = regionZ + 1;
            const bottomBlend = (localZ - (this.generatorRegionSize - this.transitionZoneSize)) / this.transitionZoneSize;
            blendProgress = Math.max(blendProgress, bottomBlend);
        }

        const primaryGenerator = this.getGeneratorForRegion(x, z, seed);
        const secondaryGenerator = this.getGeneratorForRegion(
            neighborRegionX * this.generatorRegionSize + this.generatorRegionSize/2,
            neighborRegionZ * this.generatorRegionSize + this.generatorRegionSize/2,
            seed
        );

        return {
            isTransition: true,
            primaryGenerator,
            secondaryGenerator,
            blendFactor: Math.min(1, blendProgress)
        };
    }

    // 🌊 Multi-Generator Terrain Generation
    generateMultiNoiseTerrain(x, z, seed = this.worldSeed) {
        const transition = this.getGeneratorTransition(x, z, seed);

        if (!transition.isTransition) {
            // Single generator - use its noise function
            const generator = this.generators[transition.primaryGenerator];
            const noise = generator.noiseFunction(x * 0.02, z * 0.02, seed);
            return {
                height: noise * generator.heightMultiplier,
                generator: transition.primaryGenerator,
                isTransition: false
            };
        } else {
            // Blend between two generators
            const primaryGen = this.generators[transition.primaryGenerator];
            const secondaryGen = this.generators[transition.secondaryGenerator];

            const primaryNoise = primaryGen.noiseFunction(x * 0.02, z * 0.02, seed);
            const secondaryNoise = secondaryGen.noiseFunction(x * 0.02, z * 0.02, seed + 1000);

            const primaryHeight = primaryNoise * primaryGen.heightMultiplier;
            const secondaryHeight = secondaryNoise * secondaryGen.heightMultiplier;

            const blendedHeight = this.lerp(primaryHeight, secondaryHeight, transition.blendFactor);

            return {
                height: blendedHeight,
                generator: `${transition.primaryGenerator}-${transition.secondaryGenerator}`,
                isTransition: true,
                blendFactor: transition.blendFactor
            };
        }
    }

    // 🎲 Generator-Specific Random Biome Assignment
    getBiomeFromGenerator(x, z, generatorName, seed = this.worldSeed) {
        const generator = this.generators[generatorName];
        if (!generator) return 'forest'; // fallback

        // Use generator preferences to bias biome selection
        const preferredBiomes = generator.biomePreference;
        const allBiomes = Object.keys(this.biomes);

        // Create weighted biome list (preferred biomes appear 3x more often)
        const weightedBiomes = [...allBiomes];
        preferredBiomes.forEach(biomeName => {
            if (allBiomes.includes(biomeName)) {
                weightedBiomes.push(biomeName, biomeName); // Add twice more for 3x weight
            }
        });

        // Use generator-specific seed for biome selection
        const generatorSeed = seed + generatorName.charCodeAt(0) * 1000;
        const biomeHash = this.hashCoords(
            Math.floor(x / 50), // Larger biome territories
            Math.floor(z / 50),
            generatorSeed
        );

        const biomeIndex = Math.abs(biomeHash) % weightedBiomes.length;
        return weightedBiomes[biomeIndex];
    }

    // 🌍 Enhanced Biome Generation with Multi-Generator Support
    getBiomeAt(x, z, seed = this.worldSeed) {
        // First, determine which generator(s) control this area
        const transition = this.getGeneratorTransition(x, z, seed);

        let baseBiome;

        if (!transition.isTransition) {
            // Single generator determines biome
            const biomeName = this.getBiomeFromGenerator(x, z, transition.primaryGenerator, seed);
            baseBiome = this.biomes[biomeName];
        } else {
            // Blend biomes from two generators
            const primaryBiomeName = this.getBiomeFromGenerator(x, z, transition.primaryGenerator, seed);
            const secondaryBiomeName = this.getBiomeFromGenerator(x, z, transition.secondaryGenerator, seed + 500);

            const primaryBiome = this.biomes[primaryBiomeName];
            const secondaryBiome = this.biomes[secondaryBiomeName];

            // Create blended biome properties
            baseBiome = {
                name: `${primaryBiome.name}-${secondaryBiome.name} Transition`,
                fullName: `${primaryBiome.name}-${secondaryBiome.name} (${transition.primaryGenerator}-${transition.secondaryGenerator})`,
                color: this.lerpColor(primaryBiome.color, secondaryBiome.color, transition.blendFactor),
                minHeight: this.lerp(primaryBiome.minHeight, secondaryBiome.minHeight, transition.blendFactor),
                maxHeight: this.lerp(primaryBiome.maxHeight, secondaryBiome.maxHeight, transition.blendFactor),
                surfaceBlock: transition.blendFactor < 0.5 ? primaryBiome.surfaceBlock : secondaryBiome.surfaceBlock,
                subBlock: transition.blendFactor < 0.5 ? primaryBiome.subBlock : secondaryBiome.subBlock,
                mapColor: this.lerpColorHex(primaryBiome.mapColor, secondaryBiome.mapColor, transition.blendFactor),
                heightColorRange: {
                    min: this.lerp(primaryBiome.heightColorRange.min, secondaryBiome.heightColorRange.min, transition.blendFactor),
                    max: this.lerp(primaryBiome.heightColorRange.max, secondaryBiome.heightColorRange.max, transition.blendFactor)
                },
                shrubChance: this.lerp(primaryBiome.shrubChance, secondaryBiome.shrubChance, transition.blendFactor),

                // Special multi-generator properties
                isMultiGenerator: true,
                primaryGenerator: transition.primaryGenerator,
                secondaryGenerator: transition.secondaryGenerator,
                blendFactor: transition.blendFactor,
                variants: [...(primaryBiome.variants || []), ...(secondaryBiome.variants || [])]
            };
        }

        // Apply biome variants as before
        return this.applyBiomeVariant(baseBiome, x, z, seed);
    }

    // 🗺️ Legacy Biome Cell Generation (Kept for Compatibility)
    generateBiomeCells(x, z, seed) {
        // Create large-scale biome territories using modified Voronoi
        const cellSize = 90; // Slightly larger territories for more stable biomes
        const cellX = Math.floor(x / cellSize);
        const cellZ = Math.floor(z / cellSize);

        // Generate random biome for this cell
        const cellSeed = this.hashCoords(cellX, cellZ, seed);
        const biomeTypes = Object.keys(this.biomes);
        const primaryBiome = biomeTypes[Math.abs(cellSeed) % biomeTypes.length];

        // Calculate distance to cell center for transition effects
        const centerX = (cellX + 0.5) * cellSize;
        const centerZ = (cellZ + 0.5) * cellSize;
        const distanceToCenter = Math.sqrt((x - centerX) ** 2 + (z - centerZ) ** 2);
        const transitionStart = cellSize * 0.25; // Earlier transition start for smoother blending

        return {
            primaryBiome,
            distanceToCenter,
            transitionStart,
            cellSize
        };
    }

    // 🔢 Hash Function for Consistent Random Values
    hashCoords(x, z, seed) {
        // Simple hash function for consistent pseudo-random values
        let hash = seed;
        hash = ((hash << 5) + hash) + x;
        hash = ((hash << 5) + hash) + z;
        return hash;
    }

    // 🌍 Revolutionary Biome Generation with Transitions
    getBiomeAt(x, z, seed = this.worldSeed) {
        const cacheKey = `${Math.floor(x / 16)},${Math.floor(z / 16)}`;

        // Generate biome cell information
        const cellInfo = this.generateBiomeCells(x, z, seed);

        // Add noise variation for more natural boundaries
        const boundaryNoise = this.multiOctaveNoise(x, z, this.noiseParams.biomeVariation, seed + 5000);
        const adjustedDistance = cellInfo.distanceToCenter + boundaryNoise * 12; // Reduced for smoother boundaries

        // Determine if we're in a transition zone
        if (adjustedDistance > cellInfo.transitionStart) {
            // We're near the edge - check neighboring cells for transition
            const neighborBiomes = this.getNearbyBiomes(x, z, seed);

            if (neighborBiomes.length > 1) {
                // Create transition biome data
                return this.createTransitionBiome(x, z, neighborBiomes, adjustedDistance, cellInfo);
            }
        }

        // Get the primary biome and apply variants
        const baseBiome = this.biomes[cellInfo.primaryBiome];
        return this.applyBiomeVariant(baseBiome, x, z, seed);
    }

    // 🔍 Get Nearby Biomes for Transition Calculation
    getNearbyBiomes(x, z, seed) {
        const nearby = [];
        const checkRadius = 40; // Check nearby cells

        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const checkX = x + dx * checkRadius;
                const checkZ = z + dz * checkRadius;
                const cellInfo = this.generateBiomeCells(checkX, checkZ, seed);

                if (!nearby.includes(cellInfo.primaryBiome)) {
                    nearby.push(cellInfo.primaryBiome);
                }
            }
        }

        return nearby;
    }

    // 🌊 Create Smooth Transition Between Biomes
    createTransitionBiome(x, z, neighborBiomes, distance, cellInfo) {
        const primaryBiome = this.biomes[neighborBiomes[0]];
        const secondaryBiome = this.biomes[neighborBiomes[1]] || primaryBiome;

        // Calculate blend factor (0 = primary, 1 = secondary) - Extended for smoother transitions
        const maxTransitionDistance = cellInfo.cellSize * 0.5; // Longer transition zone
        const transitionProgress = Math.min(1, (distance - cellInfo.transitionStart) / maxTransitionDistance);

        // Blend biome properties
        const blendedBiome = {
            name: `${primaryBiome.name}-${secondaryBiome.name} Transition`,
            color: this.lerpColor(primaryBiome.color, secondaryBiome.color, transitionProgress),
            minHeight: this.lerp(primaryBiome.minHeight, secondaryBiome.minHeight, transitionProgress),
            maxHeight: this.lerp(primaryBiome.maxHeight, secondaryBiome.maxHeight, transitionProgress),
            surfaceBlock: transitionProgress < 0.5 ? primaryBiome.surfaceBlock : secondaryBiome.surfaceBlock,
            subBlock: transitionProgress < 0.5 ? primaryBiome.subBlock : secondaryBiome.subBlock,
            mapColor: this.lerpColorHex(primaryBiome.mapColor, secondaryBiome.mapColor, transitionProgress),
            heightColorRange: {
                min: this.lerp(primaryBiome.heightColorRange.min, secondaryBiome.heightColorRange.min, transitionProgress),
                max: this.lerp(primaryBiome.heightColorRange.max, secondaryBiome.heightColorRange.max, transitionProgress)
            },
            shrubChance: this.lerp(primaryBiome.shrubChance, secondaryBiome.shrubChance, transitionProgress),

            // 🌳 Tree properties for transition biomes
            treeDistribution: {
                min: this.lerp(primaryBiome.treeDistribution?.min || 0, secondaryBiome.treeDistribution?.min || 0, transitionProgress),
                max: this.lerp(primaryBiome.treeDistribution?.max || 0, secondaryBiome.treeDistribution?.max || 0, transitionProgress),
                clusters: primaryBiome.treeDistribution?.clusters || secondaryBiome.treeDistribution?.clusters || false
            },
            treeChance: this.lerp(primaryBiome.treeChance || 0, secondaryBiome.treeChance || 0, transitionProgress),

            // Special transition properties
            isTransition: true,
            transitionProgress,
            primaryBiome: primaryBiome.name,
            secondaryBiome: secondaryBiome.name
        };

        return blendedBiome;
    }

    // 🎨 Apply Biome Variants for Variety
    applyBiomeVariant(baseBiome, x, z, seed) {
        const variantNoise = this.multiOctaveNoise(x, z, this.noiseParams.microDetail, seed + 10000);

        // Select variant based on noise
        const variants = baseBiome.variants || ['default'];
        const variantIndex = Math.floor((variantNoise + 1) * 0.5 * variants.length);
        const selectedVariant = variants[Math.min(variantIndex, variants.length - 1)];

        // Apply variant modifications
        const variantBiome = { ...baseBiome };
        variantBiome.variant = selectedVariant;

        // Modify properties based on variant
        switch (selectedVariant) {
            case 'dense_forest':
                variantBiome.shrubChance *= 1.5;
                variantBiome.treeDistribution.min *= 1.3;
                variantBiome.treeDistribution.max *= 1.2;
                variantBiome.treeChance *= 1.25; // Increase tree spawn rate
                break;
            case 'sparse_forest':
                variantBiome.shrubChance *= 0.6;
                variantBiome.treeDistribution.min *= 0.7;
                variantBiome.treeDistribution.max *= 0.8;
                variantBiome.treeChance *= 0.75; // Decrease tree spawn rate
                break;
            case 'rocky_desert':
                variantBiome.surfaceBlock = 'stone';
                // 🛡️ SAFE HEIGHT MODIFICATION: Ensure reasonable bounds
                variantBiome.minHeight = Math.max(-2, variantBiome.minHeight + 1); // Never below -2
                variantBiome.maxHeight = Math.min(10, variantBiome.maxHeight + 2); // Never above 10
                break;
            case 'oasis':
                variantBiome.surfaceBlock = 'grass';
                variantBiome.shrubChance = 0.8;
                variantBiome.treeDistribution.min = 0.3;
                variantBiome.treeDistribution.max = 0.5;
                variantBiome.treeChance = 0.4; // High tree density in oasis
                break;
        }

        // 🛡️ FINAL VALIDATION: Ensure variant biome has safe height ranges
        if (variantBiome.minHeight >= variantBiome.maxHeight) {
            console.error(`🚨 INVALID HEIGHT RANGE for ${selectedVariant}:`, variantBiome.minHeight, '>=', variantBiome.maxHeight);
            // Fix by resetting to safe defaults
            variantBiome.minHeight = -1;
            variantBiome.maxHeight = 2;
        }

        // Ensure absolute bounds
        variantBiome.minHeight = Math.max(-3, variantBiome.minHeight);
        variantBiome.maxHeight = Math.min(10, variantBiome.maxHeight);

        return variantBiome;
    }

    // 🎨 Color Interpolation Utilities
    lerp(a, b, t) {
        return a + (b - a) * t;
    }

    lerpColor(color1, color2, t) {
        const r1 = (color1 >> 16) & 0xFF;
        const g1 = (color1 >> 8) & 0xFF;
        const b1 = color1 & 0xFF;

        const r2 = (color2 >> 16) & 0xFF;
        const g2 = (color2 >> 8) & 0xFF;
        const b2 = color2 & 0xFF;

        const r = Math.round(this.lerp(r1, r2, t));
        const g = Math.round(this.lerp(g1, g2, t));
        const b = Math.round(this.lerp(b1, b2, t));

        return (r << 16) | (g << 8) | b;
    }

    lerpColorHex(hex1, hex2, t) {
        const color1 = parseInt(hex1.replace('#', ''), 16);
        const color2 = parseInt(hex2.replace('#', ''), 16);
        const result = this.lerpColor(color1, color2, t);
        return '#' + result.toString(16).padStart(6, '0');
    }

    // 📏 Calculate Height-Based Color for Terrain Blocks
    getHeightBasedColor(biome, height) {
        const heightRange = biome.maxHeight - biome.minHeight;
        const normalizedHeight = heightRange > 0 ?
            (height - biome.minHeight) / heightRange : 0.5;

        const brightnessRange = biome.heightColorRange.max - biome.heightColorRange.min;
        const brightness = biome.heightColorRange.min + (normalizedHeight * brightnessRange);

        const baseColor = new THREE.Color(biome.color);
        return baseColor.multiplyScalar(brightness);
    }

    // 🗺️ Enhanced Chunk Generation with Biome Transitions
    generateChunk(chunkX, chunkZ, worldSeed, addBlockFn, loadedChunks, chunkSize) {
        // disabled due to console spam.
        // console.log(`🔧 GENERATING CHUNK (${chunkX}, ${chunkZ}) - START`);
        const chunkKey = `${chunkX},${chunkZ}`;
        if (loadedChunks.has(chunkKey)) return;

        this.STATS.chunksGenerated++;
        if (this.DEBUG_MODE && this.STATS.chunksGenerated % 50 === 0) {
            console.log(`🌍 Generated ${this.STATS.chunksGenerated} chunks - Latest: ${chunkKey}`);
        }

        for (let x = 0; x < chunkSize; x++) {
            for (let z = 0; z < chunkSize; z++) {
                // 🛡️ Force coordinates to be integers to prevent fractional issues
                const worldX = Math.floor(chunkX * chunkSize + x);
                const worldZ = Math.floor(chunkZ * chunkSize + z);

                // Get enhanced biome with transitions
                const biome = this.getBiomeAt(worldX, worldZ, worldSeed);

                // Validate biome object with emergency fallback
                if (!biome || typeof biome.minHeight !== 'number' || typeof biome.maxHeight !== 'number') {
                    console.error(`🚨 INVALID BIOME at (${worldX}, ${worldZ}):`, biome);
                    // 🛡️ EMERGENCY: Use default forest biome instead of skipping
                    biome = this.biomes.forest || {
                        name: 'Emergency Forest',
                        minHeight: 0,
                        maxHeight: 4,
                        surfaceBlock: 'grass',
                        subBlock: 'stone',
                        color: 0x228B22,
                        mapColor: '#228B22',
                        heightColorRange: { min: 0.6, max: 1.2 },
                        shrubChance: 0.1
                    };
                    console.warn(`🚑 Using emergency biome fallback at (${worldX}, ${worldZ})`);
                }

                // 🌍 Generate height using multi-generator system with emergency fallback
                let terrainData;
                try {
                    terrainData = this.generateMultiNoiseTerrain(worldX, worldZ, worldSeed);
                    // Validate terrain data
                    if (!terrainData || typeof terrainData.height !== 'number' || !isFinite(terrainData.height)) {
                        throw new Error(`Invalid terrain data: ${JSON.stringify(terrainData)}`);
                    }
                } catch (error) {
                    console.warn(`🚨 TERRAIN GENERATION FAILED at (${worldX}, ${worldZ}): ${error.message}`);
                    // Emergency fallback terrain
                    terrainData = { height: 0.5, generator: 'emergency' };
                }

                // Scale noise output to biome height range
                const biomeHeightCenter = (biome.maxHeight + biome.minHeight) / 2;
                const biomeHeightRange = (biome.maxHeight - biome.minHeight) / 2;

                // Apply generator height with biome constraints and ensure integer results
                const generatorHeight = terrainData.height * biomeHeightRange;
                const rawHeight = biomeHeightCenter + generatorHeight;

                // 🚨 EMERGENCY: Force safe integer heights to eliminate fractional issues
                const safeHeight = Math.floor(Math.max(0, Math.min(4, rawHeight + 2))); // Force heights between 0-4
                const height = safeHeight;

                // Enhanced debugging for problematic heights
                if (Math.abs(terrainData.height) > 1.5) {
                    console.warn(`⚠️ EXTREME NOISE VALUE: ${terrainData.height.toFixed(3)} from ${terrainData.generator} at (${worldX}, ${worldZ})`);
                }

                // Add generator info to debug logging
                if (this.DEBUG_MODE && (worldX + worldZ) % 256 === 0) {
                    console.log(`🎛️ Generated terrain: ${terrainData.generator} at (${worldX}, ${worldZ}) → height ${height}`);
                }

                // Track problematic heights
                if (height < 0) {
                    this.STATS.lowHeights++;
                    if (this.DEBUG_MODE) {
                        console.warn(`⚠️ LOW HEIGHT at (${worldX}, ${worldZ}): ${height}`, {
                            biome: biome.name,
                            minHeight: biome.minHeight,
                            maxHeight: biome.maxHeight,
                            terrainHeight: terrainData.height.toFixed(3),
                            generator: terrainData.generator,
                            rawHeight: rawHeight.toFixed(3),
                            finalHeight: height
                        });
                    }
                }

                // Create layers with biome-appropriate colors
                const surfaceColor = this.getHeightBasedColor(biome, height);
                const subSurfaceColor = this.getHeightBasedColor(biome, height - 1);
                const deepColor = this.getHeightBasedColor(biome, height - 2);

                // Enhanced snow generation
                const snowNoise = this.multiOctaveNoise(worldX + 2000, worldZ + 2000, this.noiseParams.microDetail, worldSeed + 2000);
                const hasSnow = (biome.name.includes('Mountain') || biome.name.includes('Tundra') || biome.name.includes('Forest')) &&
                               height >= biome.maxHeight - 1 &&
                               snowNoise > -0.2;

                const surfaceBlock = hasSnow ? 'snow' : biome.surfaceBlock;
                const surfaceBlockColor = hasSnow ? new THREE.Color(0xFFFFFF) : surfaceColor;

                // 🛡️ SAFETY: Ensure minimum ground level to prevent fall-through
                const MINIMUM_GROUND_LEVEL = -1; // Never generate terrain below this
                const finalHeight = Math.max(height, MINIMUM_GROUND_LEVEL);

                // Place terrain blocks with safety height - add validation
                try {
                    addBlockFn(worldX, finalHeight, worldZ, surfaceBlock, false, surfaceBlockColor);
                    addBlockFn(worldX, finalHeight - 1, worldZ, biome.subBlock, false, subSurfaceColor);
                    addBlockFn(worldX, finalHeight - 2, worldZ, biome.subBlock, false, deepColor);
                    addBlockFn(worldX, finalHeight - 3, worldZ, "iron", false);

                    // Validation: Ensure blocks are actually placed
                    if (this.DEBUG_MODE && (worldX + worldZ) % 512 === 0) {
                        console.log(`✅ Successfully placed terrain stack at (${worldX}, ${finalHeight}, ${worldZ})`);
                    }
                } catch (error) {
                    console.error(`🚨 FAILED to place terrain at (${worldX}, ${finalHeight}, ${worldZ}):`, error);
                    // Emergency fallback: place at least one block
                    try {
                        addBlockFn(worldX, Math.max(0, finalHeight), worldZ, "stone", false);
                    } catch (fallbackError) {
                        console.error(`🚨 EMERGENCY FALLBACK FAILED:`, fallbackError);
                    }
                }

                // 🛡️ EXTRA SAFETY: If original height was very low, fill in gaps to ensure solid ground
                if (height < MINIMUM_GROUND_LEVEL) {
                    this.STATS.emergencyFills++;
                    console.warn(`🚨 EMERGENCY GROUND FILL #${this.STATS.emergencyFills} at (${worldX}, ${worldZ}): height=${height} raised to ${finalHeight}`);
                    // Fill in any gaps between calculated height and safe height
                    for (let fillY = height; fillY < MINIMUM_GROUND_LEVEL; fillY++) {
                        addBlockFn(worldX, fillY, worldZ, "stone", false);
                    }
                }

                // Debug logging for successful block placement (only in debug mode, reduced frequency)
                if (this.DEBUG_MODE && (worldX + worldZ) % 128 === 0) {
                    console.log(`✅ Placed terrain at (${worldX}, ${finalHeight}, ${worldZ}) | ${biome.name} | height: ${height} -> ${finalHeight}`);
                }

                // � WATER GENERATION: Fill empty spaces at y=1, y=2, y=3 with water blocks
                // Only add water where terrain height is below the water level
                const WATER_LEVEL = 4; // Water fills up to y=4 (accounting for +2 height offset)
                if (finalHeight < WATER_LEVEL) {
                    const waterColor = new THREE.Color(0x1E90FF); // Dodger blue
                    // Fill from above terrain to water level
                    for (let waterY = finalHeight + 1; waterY <= WATER_LEVEL; waterY++) {
                        addBlockFn(worldX, waterY, worldZ, 'water', false, waterColor);
                    }
                }

                // �🌳 FIXED: Tree generation with accurate ground detection and spacing
                if (!hasSnow && this.shouldGenerateTree(worldX, worldZ, biome, this.worldSeed)) {
                    // 🌲 TREE SPACING SYSTEM - Prevent massive tree chunks
                    if (this.hasNearbyTree(worldX, worldZ)) {
                        // Skip this tree if too close to another
                        continue;
                    }

                    // 🌱 SMART GROUND DETECTION - Use ground scan or terrain height
                    let actualGroundHeight = this.findGroundHeight(worldX, worldZ);
                    if (actualGroundHeight === null) {
                        // No surface found or invalid surface, use calculated terrain height
                        actualGroundHeight = height + 1;
                        if (this.DEBUG_MODE) {
                            console.log(`🌱 Using calculated terrain height at (${worldX}, ${worldZ}): ${actualGroundHeight}`);
                        }
                    } else {
                        if (this.DEBUG_MODE) {
                            console.log(`🌱 Using detected ground height at (${worldX}, ${worldZ}): ${actualGroundHeight}`);
                        }
                    }

                    this.STATS.treesPlaced++;

                    // 🌳 ACTUALLY GENERATE THE TREE based on biome type
                    if (biome.name === 'Mountain' || biome.name.includes('mountain')) {
                        this.voxelWorld.generatePineTree(worldX, actualGroundHeight, worldZ);
                    } else if (biome.name === 'Tundra' || biome.name.includes('tundra')) {
                        this.voxelWorld.generateBirchTree(worldX, actualGroundHeight, worldZ);
                    } else if (biome.name === 'Desert' || biome.name.includes('desert')) {
                        this.voxelWorld.generatePalmTree(worldX, actualGroundHeight, worldZ);
                    } else {
                        // Forest, Plains, and other biomes get Oak trees
                        this.voxelWorld.generateOakTree(worldX, actualGroundHeight, worldZ);
                    }

                    // 🗺️ Track tree position for spacing calculations
                    this.trackTreePosition(worldX, worldZ);

                    if (this.DEBUG_MODE && this.STATS.treesPlaced % 10 === 0) {
                        console.log(`🌳 Generated ${this.STATS.treesPlaced} trees - Latest ${biome.name === 'Mountain' ? 'Pine' : 'Oak'} at (${worldX}, ${actualGroundHeight}, ${worldZ}) in ${biome.name}`);
                    }
                }

                // 🚫 DISABLED: Enhanced shrub generation with biome-specific density
                // if (!hasSnow && biome.shrubChance > 0) {
                //     // 🌿 BIOME-SPECIFIC SHRUB DENSITY
                //     const shrubDensityMultipliers = {
                //         'Tundra': 8,        // High shrub density in tundra
                //         'Plains': 4,        // Moderate shrubs in plains
                //         'Desert': 2,        // Sparse shrubs in desert
                //         'Forest': 3,        // Some undergrowth
                //         'Mountain': 3       // Mountain vegetation
                //     };

                //     let shrubMultiplier = 2; // Default
                //     for (const [biomeName, mult] of Object.entries(shrubDensityMultipliers)) {
                //         if (biome.name.includes(biomeName)) {
                //             shrubMultiplier = mult;
                //             break;
                //         }
                //     }

                //     const shrubNoise = this.multiOctaveNoise(worldX + 3000, worldZ + 3000, this.noiseParams.microDetail, worldSeed + 3000);
                //     if (shrubNoise > (1 - biome.shrubChance * shrubMultiplier)) {
                //         addBlockFn(worldX, height + 1, worldZ, 'shrub', false);
                //     }
                // }
            }
        }

        loadedChunks.add(chunkKey);
        // console.log(`✅ CHUNK (${chunkX}, ${chunkZ}) - COMPLETED`); // Removed for performance

        // 📊 Log statistics summary every 20 chunks (reduced frequency)
        if (this.STATS.chunksGenerated % 20 === 0) {
            console.log(`📊 BiomeWorldGen Stats: ${this.STATS.chunksGenerated} chunks, ${this.STATS.lowHeights} low heights, ${this.STATS.emergencyFills} emergency fills, ${this.STATS.treesPlaced} trees`);
        }
    }

    // 🌳 Enhanced Tree Generation Check with Biome-Specific Density
    shouldGenerateTree(worldX, worldZ, biome, worldSeed) {
        if (!biome.treeDistribution) {
            console.log(`🚫 No treeDistribution for biome: ${biome.name}`);
            return false;
        }

        // 🌲 BIOME-SPECIFIC TREE DENSITY SYSTEM
        const biomeDensityMultipliers = {
            'Forest': 8,            // Moderate tree density (scaled back from 15)
            'dense_forest': 12,     // Dense but not overwhelming
            'sparse_forest': 6,     // Light forest areas
            'Plains': 10,           // Scattered but visible trees (increased from 6)
            'Mountain': 10,         // Moderate density
            'mountain_forest': 12,  // Forested mountains
            'Desert': 2,            // Very rare
            'oasis': 8,             // More trees in oasis
            'Tundra': 3             // Sparse, hardy trees
        };

        // Check for transition biomes (e.g., "Mountain-Plains Transition")
        let multiplier = 4; // Default multiplier
        for (const [biomeName, mult] of Object.entries(biomeDensityMultipliers)) {
            if (biome.name.includes(biomeName)) {
                multiplier = mult;
                break;
            }
        }

        if (this.DEBUG_MODE && Math.random() < 0.001) {
            console.log(`🌳 Checking tree at (${worldX}, ${worldZ}) in ${biome.name}, multiplier: ${multiplier}`);
        }

        const treeNoise = this.multiOctaveNoise(worldX + 4000, worldZ + 4000, this.noiseParams.microDetail, worldSeed + 4000);
        const baseChance = (biome.treeDistribution.min + biome.treeDistribution.max) / 2;

        // Add clustering for forest biomes
        if (biome.treeDistribution.clusters) {
            const clusterNoise = this.multiOctaveNoise(worldX + 5000, worldZ + 5000, { scale: 0.02, octaves: 2, persistence: 0.5 }, worldSeed + 5000);
            if (clusterNoise > 0.2) { // Easier to trigger clusters
                // In a cluster - much higher tree chance
                return treeNoise > (1 - baseChance * multiplier * 1.5);
            } else {
                // Outside cluster - reduced but still decent chance
                return treeNoise > (1 - baseChance * multiplier * 0.4);
            }
        }

        const result = treeNoise > (1 - baseChance * multiplier);

        if (this.DEBUG_MODE && Math.random() < 0.01) {
            console.log(`🌳 Tree result: ${result} (noise: ${treeNoise.toFixed(3)}, threshold: ${(1 - baseChance * multiplier).toFixed(3)}, baseChance: ${baseChance.toFixed(3)}) for ${biome.name}`);
        }

        return result;
    }

    // 🌱 GROUND HEIGHT DETECTION - Find actual surface for tree placement
    findGroundHeight(worldX, worldZ) {
        // Scan from high to low to find the true ground surface
        const searchRange = { min: -5, max: 15 }; // Reduced range for better surface detection

        for (let y = searchRange.max; y >= searchRange.min; y--) {
            const blockAt = this.voxelWorld.getBlock(worldX, y, worldZ);
            const blockAbove = this.voxelWorld.getBlock(worldX, y + 1, worldZ);

            // Found ground surface: solid block with air/empty above
            if (blockAt && blockAt.type && blockAt.type !== 'air' && (!blockAbove || blockAbove.type === 'air' || !blockAbove.type)) {
                // Don't place trees on certain block types
                const invalidSurfaces = ['water', 'lava', 'snow'];
                if (invalidSurfaces.includes(blockAt.type)) {
                    return null; // Invalid surface for tree placement
                }

                return y + 1; // Return height ON TOP of the surface block
            }
        }

        // Fallback: if no surface found, return null to use terrain calculation
        if (this.DEBUG_MODE) {
            console.warn(`⚠️ Could not find ground surface at (${worldX}, ${worldZ}), using terrain height`);
        }
        return null; // Signal to use terrain height instead
    }

    // 🌲 TREE SPACING METHODS - Prevent massive tree chunks
    hasNearbyTree(x, z) {
        // Check in a MIN_TREE_DISTANCE radius around this position
        for (let dx = -this.MIN_TREE_DISTANCE; dx <= this.MIN_TREE_DISTANCE; dx++) {
            for (let dz = -this.MIN_TREE_DISTANCE; dz <= this.MIN_TREE_DISTANCE; dz++) {
                const checkX = x + dx;
                const checkZ = z + dz;
                const key = `${checkX},${checkZ}`;
                if (this.treePositions.has(key)) {
                    return true; // Found nearby tree
                }
            }
        }
        return false; // No nearby trees
    }

    trackTreePosition(x, z) {
        const key = `${x},${z}`;
        this.treePositions.add(key);

        // Memory management: Remove old tree positions to prevent memory leak
        if (this.treePositions.size > 10000) {
            // Keep only recent 5000 positions (arbitrary cleanup)
            const positions = Array.from(this.treePositions);
            this.treePositions.clear();
            positions.slice(-5000).forEach(pos => this.treePositions.add(pos));
        }
    }

    // 🎲 Seed Management
    setWorldSeed(seed) {
        this.worldSeed = seed;
        this.chunkCache.clear(); // Clear cache when seed changes
        this.treePositions.clear(); // Clear tree positions for new seed
    }

    // 🧹 Cache Management
    clearCache() {
        this.chunkCache.clear();
    }

    // 🐛 Debug Control Methods
    enableDebugMode() {
        this.DEBUG_MODE = true;
        console.log('🐛 BiomeWorldGen debug mode ENABLED - Detailed logging active');
    }

    disableDebugMode() {
        this.DEBUG_MODE = false;
        console.log('🐛 BiomeWorldGen debug mode DISABLED - Production logging');
    }

    // 🔮 ON-DEMAND TERRAIN GENERATION - For generating single blocks underground
    generateTerrainAt(worldX, worldZ) {
        const biome = this.getBiomeAt(worldX, worldZ, this.worldSeed);
        const terrainData = this.generateMultiNoiseTerrain(worldX, worldZ, this.worldSeed);

        // Calculate actual terrain height
        const biomeHeightCenter = (biome.maxHeight + biome.minHeight) / 2;
        const biomeHeightRange = (biome.maxHeight - biome.minHeight) / 2;
        const generatorHeight = terrainData.height * biomeHeightRange;
        const rawHeight = biomeHeightCenter + generatorHeight;
        const height = Math.floor(Math.max(0, Math.min(12, rawHeight + 2)));

        // Get colors for layers
        const surfaceColor = this.getHeightBasedColor(biome, height);
        const subSurfaceColor = this.getHeightBasedColor(biome, height - 1);

        return {
            biome,
            height,
            surfaceColor: new THREE.Color(surfaceColor),
            subSurfaceColor: new THREE.Color(subSurfaceColor)
        };
    }

    getStats() {
        return { ...this.STATS };
    }

    resetStats() {
        this.STATS = {
            chunksGenerated: 0,
            lowHeights: 0,
            emergencyFills: 0,
            treesPlaced: 0
        };
        console.log('📊 BiomeWorldGen statistics reset');
    }
}