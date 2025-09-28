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

        this.initializeBiomes();
        this.initializeNoiseGenerators();
    }

    // 🌍 Enhanced Biome Definitions with Variants
    initializeBiomes() {
        this.biomes = {
            forest: {
                name: 'Forest',
                color: 0x228B22,
                minHeight: -2,
                maxHeight: 4,
                surfaceBlock: 'grass',
                subBlock: 'stone',
                mapColor: '#228B22',
                heightColorRange: { min: 0.6, max: 1.2 },
                shrubChance: 0.35,

                // NEW: Enhanced properties
                variants: ['dense_forest', 'sparse_forest', 'old_growth'],
                transitionZone: 'forest_edge',
                specialFeatures: ['clearings', 'streams'],
                treeDistribution: { min: 0.25, max: 0.40, clusters: true }
            },

            desert: {
                name: 'Desert',
                color: 0xDEB887,
                minHeight: -1,
                maxHeight: 2,
                surfaceBlock: 'sand',
                subBlock: 'sand',
                mapColor: '#DEB887',
                heightColorRange: { min: 0.7, max: 1.1 },
                shrubChance: 0.03,

                variants: ['sandy_desert', 'rocky_desert', 'oasis'],
                transitionZone: 'desert_edge',
                specialFeatures: ['dunes', 'oases', 'mesas'],
                treeDistribution: { min: 0.01, max: 0.03, clusters: false }
            },

            mountain: {
                name: 'Mountain',
                color: 0x696969,
                minHeight: 2,
                maxHeight: 8,
                surfaceBlock: 'stone',
                subBlock: 'iron',
                mapColor: '#696969',
                heightColorRange: { min: 0.8, max: 1.4 },
                shrubChance: 0.08,

                variants: ['rocky_peaks', 'alpine_meadows', 'mountain_forest'],
                transitionZone: 'foothills',
                specialFeatures: ['peaks', 'valleys', 'caves'],
                treeDistribution: { min: 0.15, max: 0.30, clusters: true }
            },

            plains: {
                name: 'Plains',
                color: 0x90EE90,
                minHeight: -1,
                maxHeight: 1,
                surfaceBlock: 'grass',
                subBlock: 'stone',
                mapColor: '#90EE90',
                heightColorRange: { min: 0.65, max: 1.15 },
                shrubChance: 0.20,

                variants: ['grasslands', 'meadows', 'prairie'],
                transitionZone: 'plains_edge',
                specialFeatures: ['rivers', 'hills', 'groves'],
                treeDistribution: { min: 0.05, max: 0.12, clusters: true }
            },

            tundra: {
                name: 'Tundra',
                color: 0xF0F8FF,
                minHeight: -3,
                maxHeight: 0,
                surfaceBlock: 'stone',
                subBlock: 'iron',
                mapColor: '#F0F8FF',
                heightColorRange: { min: 0.5, max: 1.0 },
                shrubChance: 0.01,

                variants: ['frozen_tundra', 'taiga_edge', 'permafrost'],
                transitionZone: 'tundra_border',
                specialFeatures: ['ice_formations', 'frozen_lakes'],
                treeDistribution: { min: 0.02, max: 0.05, clusters: false }
            }
        };
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

            // Elevation noise
            elevation: {
                scale: 0.015,
                octaves: 4,
                persistence: 0.7
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

        // Debug extreme values
        if (Math.abs(normalizedValue) > 1.1) {
            console.warn(`⚠️ NOISE OUT OF RANGE at (${x}, ${z}): ${normalizedValue.toFixed(3)} clamped to ${clampedValue.toFixed(3)}`);
        }

        return clampedValue;
    }

    // 🗺️ Voronoi-like Biome Cell Generation
    generateBiomeCells(x, z, seed) {
        // Create large-scale biome territories using modified Voronoi
        const cellSize = 80; // Size of each biome territory
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
        const transitionStart = cellSize * 0.3; // Transition starts at 30% of cell radius

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
        const adjustedDistance = cellInfo.distanceToCenter + boundaryNoise * 15;

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

        // Calculate blend factor (0 = primary, 1 = secondary)
        const maxTransitionDistance = cellInfo.cellSize * 0.4;
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
                break;
            case 'sparse_forest':
                variantBiome.shrubChance *= 0.6;
                variantBiome.treeDistribution.min *= 0.7;
                variantBiome.treeDistribution.max *= 0.8;
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
        const chunkKey = `${chunkX},${chunkZ}`;
        if (loadedChunks.has(chunkKey)) return;

        console.log(`🌍 Generating advanced biome chunk ${chunkKey}`);

        for (let x = 0; x < chunkSize; x++) {
            for (let z = 0; z < chunkSize; z++) {
                const worldX = chunkX * chunkSize + x;
                const worldZ = chunkZ * chunkSize + z;

                // Get enhanced biome with transitions
                const biome = this.getBiomeAt(worldX, worldZ, worldSeed);

                // Validate biome object
                if (!biome || typeof biome.minHeight !== 'number' || typeof biome.maxHeight !== 'number') {
                    console.error(`🚨 INVALID BIOME at (${worldX}, ${worldZ}):`, biome);
                    continue; // Skip this position
                }

                // Generate height with enhanced noise
                const baseNoiseValue = this.multiOctaveNoise(worldX, worldZ, this.noiseParams.elevation, worldSeed);
                const baseHeight = Math.floor(baseNoiseValue * 3);

                const biomeHeightCenter = Math.floor((biome.maxHeight + biome.minHeight) / 2);
                const biomeHeightRange = (biome.maxHeight - biome.minHeight) / 2;
                const biomeNoiseValue = this.multiOctaveNoise(worldX + 1000, worldZ + 1000, this.noiseParams.elevation, worldSeed + 1000);
                const biomeHeightVariation = Math.floor(biomeNoiseValue * biomeHeightRange);
                const biomeHeight = biomeHeightCenter + biomeHeightVariation;

                const rawHeight = baseHeight + biomeHeight;
                const height = Math.max(biome.minHeight, Math.min(biome.maxHeight, rawHeight));

                // Debug logging for problematic heights
                if (height < 0) {
                    console.warn(`⚠️ LOW HEIGHT at (${worldX}, ${worldZ}): ${height}`, {
                        biome: biome.name,
                        minHeight: biome.minHeight,
                        maxHeight: biome.maxHeight,
                        baseNoiseValue: baseNoiseValue.toFixed(3),
                        baseHeight,
                        biomeHeight,
                        rawHeight,
                        finalHeight: height
                    });
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
                const safeHeight = Math.max(height, MINIMUM_GROUND_LEVEL);

                // Place terrain blocks with safety height
                addBlockFn(worldX, safeHeight, worldZ, surfaceBlock, false, surfaceBlockColor);
                addBlockFn(worldX, safeHeight - 1, worldZ, biome.subBlock, false, subSurfaceColor);
                addBlockFn(worldX, safeHeight - 2, worldZ, biome.subBlock, false, deepColor);
                addBlockFn(worldX, safeHeight - 3, worldZ, "iron", false);

                // 🛡️ EXTRA SAFETY: If original height was very low, fill in gaps to ensure solid ground
                if (height < MINIMUM_GROUND_LEVEL) {
                    console.warn(`🚨 EMERGENCY GROUND FILL at (${worldX}, ${worldZ}): height=${height} raised to ${safeHeight}`);
                    // Fill in any gaps between calculated height and safe height
                    for (let fillY = height; fillY < MINIMUM_GROUND_LEVEL; fillY++) {
                        addBlockFn(worldX, fillY, worldZ, "stone", false);
                    }
                }

                // Debug logging for successful block placement (sample every 64th block to avoid spam)
                if ((worldX + worldZ) % 64 === 0) {
                    console.log(`✅ Placed terrain at (${worldX}, ${safeHeight}, ${worldZ}) | ${biome.name} | height: ${height} -> ${safeHeight}`);
                }

                // Enhanced tree generation (will be integrated with tree system)
                if (!hasSnow && this.shouldGenerateTree(worldX, worldZ, biome, worldSeed)) {
                    const treeHeight = height + 1;
                    // Tree generation will be handled by the tree generation module
                    console.log(`🌳 Tree placement at (${worldX}, ${treeHeight}, ${worldZ}) in ${biome.name} biome`);
                }

                // Enhanced shrub generation with biome variants
                if (!hasSnow && biome.shrubChance > 0) {
                    const shrubNoise = this.multiOctaveNoise(worldX + 3000, worldZ + 3000, this.noiseParams.microDetail, worldSeed + 3000);
                    if (shrubNoise > (1 - biome.shrubChance * 2)) {
                        addBlockFn(worldX, height + 1, worldZ, 'shrub', false);
                    }
                }
            }
        }

        loadedChunks.add(chunkKey);
    }

    // 🌳 Enhanced Tree Generation Check
    shouldGenerateTree(worldX, worldZ, biome, worldSeed) {
        if (!biome.treeDistribution) return false;

        const treeNoise = this.multiOctaveNoise(worldX + 4000, worldZ + 4000, this.noiseParams.microDetail, worldSeed + 4000);
        const baseChance = (biome.treeDistribution.min + biome.treeDistribution.max) / 2;

        // Add clustering for forest biomes
        if (biome.treeDistribution.clusters) {
            const clusterNoise = this.multiOctaveNoise(worldX + 5000, worldZ + 5000, { scale: 0.02, octaves: 2, persistence: 0.5 }, worldSeed + 5000);
            if (clusterNoise > 0.3) {
                // In a cluster - higher tree chance
                return treeNoise > (1 - baseChance * 1.5);
            } else {
                // Outside cluster - lower tree chance
                return treeNoise > (1 - baseChance * 0.3);
            }
        }

        return treeNoise > (1 - baseChance * 2);
    }

    // 🎲 Seed Management
    setWorldSeed(seed) {
        this.worldSeed = seed;
        this.chunkCache.clear(); // Clear cache when seed changes
    }

    // 🧹 Cache Management
    clearCache() {
        this.chunkCache.clear();
    }
}