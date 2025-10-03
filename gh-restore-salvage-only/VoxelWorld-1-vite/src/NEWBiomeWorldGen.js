import * as THREE from 'three';

/**
 * 🌍 MinecraftStyleBiomeGen - Temperature/Rainfall Climate System
 *
 * Revolutionary Features:
 * - Temperature + Rainfall dual noise maps (just like Minecraft!)
 * - Biome lookup table based on climate coordinates
 * - Baseline Y=32 sea level with biome height modulation
 * - Bedrock layers at Y=0-1 for absolute safety
 * - Only generates 2 blocks below surface (performance optimization)
 * - Natural geographic clustering (hot near hot, cold near cold)
 */
export class MinecraftStyleBiomeGen {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;
        this.worldSeed = 0;
        this.chunkCache = new Map(); // Cache biome data for performance

        // 🌡️ Minecraft-Style Configuration
        this.BASELINE_SEA_LEVEL = 8;   // PERFORMANCE: Lowered from 32 to 8 for fewer blocks
        this.BEDROCK_LAYER_1 = 0;      // Absolute floor
        this.BEDROCK_LAYER_2 = 1;      // Safety layer
        this.GENERATION_DEPTH = 2;     // Only generate 2 blocks below surface

        this.DEBUG_MODE = false; // Production ready
        this.STATS = {
            chunksGenerated: 0,
            temperatureExtremes: 0,
            rainfallExtremes: 0,
            biomeTransitions: 0,
            bedrockPlacements: 0
        };

        this.initializeBiomes();
        this.initializeNoiseGenerators();
    }

    // 🌡️🌧️ MINECRAFT-STYLE BIOME LOOKUP TABLE (Temperature vs Rainfall)
    initializeBiomes() {
        // 🎯 Biome definitions with height modulation (relative to Y=32 baseline)
        this.biomes = {
            // 🥶 COLD BIOMES
            tundra: {
                name: 'Tundra',
                color: 0xF0F8FF,
                heightModulation: { min: -4, max: 0 },    // Y=28-32
                surfaceBlock: 'stone',
                subBlock: 'iron',
                mapColor: '#F0F8FF',
                shrubChance: 0.01,
                treeChance: 0.02
            },
            taiga: {
                name: 'Taiga',
                color: 0x0B6623,
                heightModulation: { min: -2, max: +4 },   // Y=30-36
                surfaceBlock: 'grass',
                subBlock: 'stone',
                mapColor: '#0B6623',
                shrubChance: 0.15,
                treeChance: 0.25
            },

            // 🌲 TEMPERATE BIOMES
            forest: {
                name: 'Forest',
                color: 0x228B22,
                heightModulation: { min: -2, max: +3 },   // Y=30-35
                surfaceBlock: 'grass',
                subBlock: 'stone',
                mapColor: '#228B22',
                shrubChance: 0.35,
                treeChance: 0.40
            },
            plains: {
                name: 'Plains',
                color: 0x90EE90,
                heightModulation: { min: -1, max: +2 },   // Y=31-34
                surfaceBlock: 'grass',
                subBlock: 'stone',
                mapColor: '#90EE90',
                shrubChance: 0.20,
                treeChance: 0.08
            },
            seasonal_forest: {
                name: 'Seasonal Forest',
                color: 0x679267,
                heightModulation: { min: 0, max: +4 },    // Y=32-36
                surfaceBlock: 'grass',
                subBlock: 'stone',
                mapColor: '#679267',
                shrubChance: 0.30,
                treeChance: 0.35
            },

            // 🏔️ MOUNTAIN BIOMES
            mountain: {
                name: 'Mountain',
                color: 0x696969,
                heightModulation: { min: +8, max: +16 },  // Y=40-48
                surfaceBlock: 'stone',
                subBlock: 'iron',
                mapColor: '#696969',
                shrubChance: 0.08,
                treeChance: 0.15
            },

            // 🌵 DRY BIOMES
            shrubland: {
                name: 'Shrubland',
                color: 0x8FBC8F,
                heightModulation: { min: -1, max: +3 },   // Y=31-35
                surfaceBlock: 'grass',
                subBlock: 'stone',
                mapColor: '#8FBC8F',
                shrubChance: 0.40,
                treeChance: 0.05
            },
            desert: {
                name: 'Desert',
                color: 0xDEB887,
                heightModulation: { min: -2, max: +1 },   // Y=30-33
                surfaceBlock: 'sand',
                subBlock: 'sand',
                mapColor: '#DEB887',
                shrubChance: 0.03,
                treeChance: 0.01
            },

            // 🌿 WET BIOMES
            swamp: {
                name: 'Swamp',
                color: 0x2F4F2F,
                heightModulation: { min: -3, max: -1 },   // Y=29-31
                surfaceBlock: 'grass',
                subBlock: 'stone',
                mapColor: '#2F4F2F',
                shrubChance: 0.50,
                treeChance: 0.30
            },
            rain_forest: {
                name: 'Rain Forest',
                color: 0x013220,
                heightModulation: { min: -1, max: +5 },   // Y=31-37
                surfaceBlock: 'grass',
                subBlock: 'stone',
                mapColor: '#013220',
                shrubChance: 0.60,
                treeChance: 0.50
            },

            // 🏖️ TROPICAL BIOMES
            savanna: {
                name: 'Savanna',
                color: 0xBDB76B,
                heightModulation: { min: 0, max: +3 },    // Y=32-35
                surfaceBlock: 'grass',
                subBlock: 'stone',
                mapColor: '#BDB76B',
                shrubChance: 0.25,
                treeChance: 0.12
            }
        };

        // 🗺️ TEMPERATURE/RAINFALL BIOME LOOKUP TABLE
        // Based on the Minecraft climate chart you showed me!
        this.biomeTable = this.createBiomeTable();
    }

    // 🌡️🌧️ MINECRAFT-STYLE DUAL NOISE SYSTEM
    initializeNoiseGenerators() {
        this.noiseParams = {
            // 🌡️ Temperature map - Large scale continental patterns
            temperature: {
                scale: 0.005,      // Very large scale for continent-sized climate zones
                octaves: 3,
                persistence: 0.6
            },

            // 🌧️ Rainfall map - Independent weather patterns
            rainfall: {
                scale: 0.007,      // Large scale weather systems
                octaves: 3,
                persistence: 0.55
            },

            // 🏔️ Height variation - Modulates around baseline Y=32
            heightVariation: {
                scale: 0.015,      // Medium scale for hills/valleys
                octaves: 4,
                persistence: 0.7
            },

            // 🌪️ Fine detail - Local terrain features
            microTerrain: {
                scale: 0.08,       // Small scale surface details
                octaves: 2,
                persistence: 0.4
            }
        };
    }

    // 🗺️ Create the Temperature/Rainfall Biome Lookup Table
    createBiomeTable() {
        // 11x11 grid (-1.0 to +1.0 for both temp and rainfall)
        const table = [];

        // Based on your Minecraft climate chart:
        // X-axis: Temperature (cold to hot)
        // Y-axis: Rainfall (dry to wet)

        const biomeGrid = [
            // Rainfall: DRY (bottom of chart)
            ['tundra',    'tundra',    'shrubland', 'shrubland', 'desert',   'desert',    'desert',    'desert',    'savanna',   'savanna',   'savanna'],
            ['tundra',    'tundra',    'shrubland', 'shrubland', 'desert',   'desert',    'desert',    'savanna',   'savanna',   'savanna',   'savanna'],
            ['tundra',    'plains',    'plains',    'shrubland', 'shrubland','desert',    'savanna',   'savanna',   'savanna',   'savanna',   'savanna'],
            ['tundra',    'plains',    'plains',    'plains',    'shrubland','shrubland', 'savanna',   'savanna',   'savanna',   'savanna',   'savanna'],
            ['taiga',     'plains',    'plains',    'plains',    'plains',   'shrubland', 'shrubland', 'savanna',   'savanna',   'savanna',   'savanna'],
            ['taiga',     'taiga',     'plains',    'plains',    'plains',   'plains',    'shrubland', 'shrubland', 'savanna',   'savanna',   'savanna'],
            ['taiga',     'taiga',     'forest',    'forest',    'plains',   'plains',    'plains',    'shrubland', 'shrubland', 'savanna',   'savanna'],
            ['taiga',     'taiga',     'forest',    'forest',    'forest',   'seasonal_forest', 'plains', 'plains',   'shrubland', 'shrubland', 'savanna'],
            ['taiga',     'forest',    'forest',    'forest',    'seasonal_forest', 'seasonal_forest', 'seasonal_forest', 'plains', 'shrubland', 'rain_forest', 'rain_forest'],
            ['swamp',     'swamp',     'forest',    'forest',    'seasonal_forest', 'seasonal_forest', 'seasonal_forest', 'rain_forest', 'rain_forest', 'rain_forest', 'rain_forest'],
            // Rainfall: WET (top of chart)
            ['swamp',     'swamp',     'swamp',     'forest',    'forest',   'seasonal_forest', 'rain_forest', 'rain_forest', 'rain_forest', 'rain_forest', 'rain_forest']
        ];

        // Convert grid to lookup table
        for (let y = 0; y < 11; y++) {
            table[y] = [];
            for (let x = 0; x < 11; x++) {
                table[y][x] = biomeGrid[10 - y][x]; // Flip Y to match rainfall (wet at top)
            }
        }

        return table;
    }

    // 🌊 Enhanced Perlin Noise for Climate Generation
    generatePerlinNoise(x, z, params, seed = 0) {
        let value = 0;
        let amplitude = 1;
        let frequency = params.scale;
        let maxValue = 0;

        for (let octave = 0; octave < params.octaves; octave++) {
            // Use proper Perlin noise instead of sine/cosine
            const octaveSeed = seed + octave * 1000;
            const noiseValue = this.perlinNoise(x * frequency, z * frequency, octaveSeed);

            value += noiseValue * amplitude;
            maxValue += amplitude;

            amplitude *= params.persistence;
            frequency *= 2;
        }

        const normalizedValue = value / maxValue;
        return Math.max(-1, Math.min(1, normalizedValue));
    }

    // 🌊 Genuine Perlin Noise Algorithm (Ken Perlin's Original)
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

    // 🔢 Hash Function for Consistent Random Values
    hashCoords(x, z, seed) {
        // Simple hash function for consistent pseudo-random values
        let hash = seed;
        hash = ((hash << 5) + hash) + x;
        hash = ((hash << 5) + hash) + z;
        return hash;
    }

    // 🌡️🌧️ MINECRAFT-STYLE TEMPERATURE/RAINFALL BIOME GENERATION
    getBiomeAt(x, z, seed = this.worldSeed) {
        // 🌡️ Generate temperature map (-1.0 = cold, +1.0 = hot)
        const temperature = this.generatePerlinNoise(x, z, this.noiseParams.temperature, seed + 1000);

        // 🌧️ Generate rainfall map (-1.0 = dry, +1.0 = wet)
        const rainfall = this.generatePerlinNoise(x, z, this.noiseParams.rainfall, seed + 2000);

        // Track extremes for stats
        if (Math.abs(temperature) > 0.9) this.STATS.temperatureExtremes++;
        if (Math.abs(rainfall) > 0.9) this.STATS.rainfallExtremes++;

        // 🗺️ Convert to table coordinates (0-10 for both axes)
        const tempIndex = Math.floor((temperature + 1) * 5); // -1..1 → 0..10
        const rainIndex = Math.floor((rainfall + 1) * 5);    // -1..1 → 0..10

        // Clamp to valid table bounds
        const safeTemp = Math.max(0, Math.min(10, tempIndex));
        const safeRain = Math.max(0, Math.min(10, rainIndex));

        // 🎯 Lookup biome from temperature/rainfall table
        const biomeName = this.biomeTable[safeRain][safeTemp];
        const biome = this.biomes[biomeName];

        if (!biome) {
            console.error(`🚨 Invalid biome lookup: ${biomeName} at temp=${safeTemp}, rain=${safeRain}`);
            return this.biomes.plains; // Safe fallback
        }

        // Check for smooth transitions between adjacent biomes
        return this.createSmoothTransition(x, z, temperature, rainfall, biome, seed);
    }

    // 🌊 Create Smooth Climate Transitions
    createSmoothTransition(x, z, temperature, rainfall, primaryBiome, seed) {
        // Check if we're near a biome boundary by sampling nearby points
        const sampleDistance = 8; // Sample points 8 blocks away
        const samples = [
            { dx: -sampleDistance, dz: 0 },
            { dx: sampleDistance, dz: 0 },
            { dx: 0, dz: -sampleDistance },
            { dx: 0, dz: sampleDistance }
        ];

        const nearbyBiomes = [];
        for (const sample of samples) {
            const sampleTemp = this.generatePerlinNoise(x + sample.dx, z + sample.dz, this.noiseParams.temperature, seed + 1000);
            const sampleRain = this.generatePerlinNoise(x + sample.dx, z + sample.dz, this.noiseParams.rainfall, seed + 2000);

            const tempIndex = Math.max(0, Math.min(10, Math.floor((sampleTemp + 1) * 5)));
            const rainIndex = Math.max(0, Math.min(10, Math.floor((sampleRain + 1) * 5)));

            const sampleBiomeName = this.biomeTable[rainIndex][tempIndex];
            if (sampleBiomeName !== primaryBiome.name.toLowerCase().replace(' ', '_') && !nearbyBiomes.includes(sampleBiomeName)) {
                nearbyBiomes.push(sampleBiomeName);
            }
        }

        // If no different biomes nearby, return primary biome
        if (nearbyBiomes.length === 0) {
            return {
                ...primaryBiome,
                temperature,
                rainfall,
                isTransition: false
            };
        }

        // Create transition biome
        this.STATS.biomeTransitions++;
        const secondaryBiome = this.biomes[nearbyBiomes[0]];

        // Calculate transition strength based on how close we are to boundary
        const transitionNoise = this.generatePerlinNoise(x, z, this.noiseParams.microTerrain, seed + 3000);
        const transitionStrength = Math.abs(transitionNoise) * 0.3; // 0-30% blending

        return {
            name: `${primaryBiome.name}-${secondaryBiome.name} Transition`,
            color: this.lerpColor(primaryBiome.color, secondaryBiome.color, transitionStrength),
            heightModulation: {
                min: this.lerp(primaryBiome.heightModulation.min, secondaryBiome.heightModulation.min, transitionStrength),
                max: this.lerp(primaryBiome.heightModulation.max, secondaryBiome.heightModulation.max, transitionStrength)
            },
            surfaceBlock: transitionStrength < 0.5 ? primaryBiome.surfaceBlock : secondaryBiome.surfaceBlock,
            subBlock: transitionStrength < 0.5 ? primaryBiome.subBlock : secondaryBiome.subBlock,
            mapColor: this.lerpColorHex(primaryBiome.mapColor, secondaryBiome.mapColor, transitionStrength),
            shrubChance: this.lerp(primaryBiome.shrubChance, secondaryBiome.shrubChance, transitionStrength),
            treeChance: this.lerp(primaryBiome.treeChance, secondaryBiome.treeChance, transitionStrength),

            // Climate data
            temperature,
            rainfall,
            isTransition: true,
            transitionStrength,
            primaryBiome: primaryBiome.name,
            secondaryBiome: secondaryBiome.name
        };
    }

    // 🏔️ MINECRAFT-STYLE HEIGHT GENERATION
    generateTerrainHeight(x, z, biome, seed = this.worldSeed) {
        // 🏔️ Base height variation around Y=32 baseline
        const heightNoise = this.generatePerlinNoise(x, z, this.noiseParams.heightVariation, seed + 4000);

        // 🌪️ Fine surface details
        const microNoise = this.generatePerlinNoise(x, z, this.noiseParams.microTerrain, seed + 5000);

        // Calculate height relative to baseline
        const biomeHeightRange = biome.heightModulation.max - biome.heightModulation.min;
        const biomeHeightCenter = (biome.heightModulation.max + biome.heightModulation.min) / 2;

        // Apply noise to biome height range
        const heightVariation = heightNoise * (biomeHeightRange / 2);
        const microVariation = microNoise * 0.5; // Small surface details

        const relativeHeight = biomeHeightCenter + heightVariation + microVariation;
        const finalHeight = this.BASELINE_SEA_LEVEL + relativeHeight;

        // 🛡️ Ensure we never go below bedrock + generation depth
        const minAllowedHeight = this.BEDROCK_LAYER_2 + this.GENERATION_DEPTH + 1; // Y=4 minimum

        return {
            surfaceHeight: Math.max(minAllowedHeight, Math.floor(finalHeight)),
            biomeHeight: relativeHeight,
            heightNoise,
            microNoise
        };
    }

    // 🏔️ Apply Mountain Height Modulation for Dramatic Terrain
    applyMountainModulation(height, biome, x, z, seed) {
        // Mountains get extra height variation
        if (biome.name === 'Mountain') {
            const mountainNoise = this.generatePerlinNoise(x, z, { scale: 0.02, octaves: 3, persistence: 0.8 }, seed + 6000);
            const extraHeight = mountainNoise * 8; // Up to 8 blocks extra height
            return height + Math.max(0, extraHeight); // Only add positive height
        }

        return height;
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
        // Use height relative to baseline Y=32
        const relativeHeight = height - this.BASELINE_SEA_LEVEL;
        const heightRange = biome.heightModulation.max - biome.heightModulation.min;

        const normalizedHeight = heightRange > 0 ?
            (relativeHeight - biome.heightModulation.min) / heightRange : 0.5;

        // Simple brightness variation based on height
        const brightness = 0.7 + (normalizedHeight * 0.4); // 0.7 to 1.1 brightness

        const baseColor = new THREE.Color(biome.color);
        return baseColor.multiplyScalar(Math.max(0.3, Math.min(1.3, brightness)));
    }

    // 🗺️ MINECRAFT-STYLE CHUNK GENERATION with Y=32 Baseline
    generateChunk(chunkX, chunkZ, worldSeed, addBlockFn, loadedChunks, chunkSize) {
        const chunkKey = `${chunkX},${chunkZ}`;
        if (loadedChunks.has(chunkKey)) return;

        this.STATS.chunksGenerated++;
        if (this.STATS.chunksGenerated % 10 === 0) {
            console.log(`🌍 Generated ${this.STATS.chunksGenerated} chunks - Latest: ${chunkKey}`);
        }

        for (let x = 0; x < chunkSize; x++) {
            for (let z = 0; z < chunkSize; z++) {
                const worldX = Math.floor(chunkX * chunkSize + x);
                const worldZ = Math.floor(chunkZ * chunkSize + z);

                // 🌡️🌧️ Get biome from temperature/rainfall system
                const biome = this.getBiomeAt(worldX, worldZ, worldSeed);

                // 🏔️ Generate terrain height with Y=32 baseline
                const heightData = this.generateTerrainHeight(worldX, worldZ, biome, worldSeed);
                const surfaceHeight = this.applyMountainModulation(heightData.surfaceHeight, biome, worldX, worldZ, worldSeed);

                // 🚀 PERFORMANCE: Skip bedrock for now (causing massive block counts)
                // addBlockFn(worldX, this.BEDROCK_LAYER_1, worldZ, 'iron', false, new THREE.Color(0x2C2C2C));
                // addBlockFn(worldX, this.BEDROCK_LAYER_2, worldZ, 'iron', false, new THREE.Color(0x3C3C3C));
                // this.STATS.bedrockPlacements += 2;

                // 🌍 Only generate 2 blocks below surface (Minecraft optimization!)
                const minGenerationHeight = surfaceHeight - this.GENERATION_DEPTH;

                // 🚀 PERFORMANCE: Only fill the last few blocks below surface (not everything to bedrock!)
                for (let y = Math.max(this.BEDROCK_LAYER_2 + 1, minGenerationHeight - 2); y < minGenerationHeight; y++) {
                    addBlockFn(worldX, y, worldZ, 'stone', false, new THREE.Color(0x666666));
                }

                // 🎨 Create biome-appropriate terrain layers
                const surfaceColor = this.getHeightBasedColor(biome, surfaceHeight);
                const subColor = this.getHeightBasedColor(biome, surfaceHeight - 1);

                // 🌨️ Snow on high cold biomes
                const hasSnow = (biome.name.includes('Mountain') || biome.name.includes('Tundra')) &&
                               (biome.temperature < -0.3) &&
                               (surfaceHeight > this.BASELINE_SEA_LEVEL + 4);

                const surfaceBlock = hasSnow ? 'snow' : biome.surfaceBlock;
                const finalSurfaceColor = hasSnow ? new THREE.Color(0xFFFFFF) : surfaceColor;

                // Place surface terrain (only 2 blocks as per Minecraft!)
                addBlockFn(worldX, surfaceHeight, worldZ, surfaceBlock, false, finalSurfaceColor);
                addBlockFn(worldX, surfaceHeight - 1, worldZ, biome.subBlock, false, subColor);

                // 🌿 Tree and shrub generation
                if (!hasSnow && biome.treeChance > 0) {
                    const treeNoise = this.generatePerlinNoise(worldX + 1000, worldZ + 1000, this.noiseParams.microTerrain, worldSeed + 7000);
                    if (treeNoise > (1 - biome.treeChance)) {
                        addBlockFn(worldX, surfaceHeight + 1, worldZ, 'wood', false);
                    }
                }

                if (!hasSnow && biome.shrubChance > 0) {
                    const shrubNoise = this.generatePerlinNoise(worldX + 2000, worldZ + 2000, this.noiseParams.microTerrain, worldSeed + 8000);
                    if (shrubNoise > (1 - biome.shrubChance)) {
                        addBlockFn(worldX, surfaceHeight + 1, worldZ, 'shrub', false);
                    }
                }

                // 🐛 Debug logging (reduced frequency)
                if (this.DEBUG_MODE && (worldX + worldZ) % 256 === 0) {
                    console.log(`🎯 (${worldX},${worldZ}): ${biome.name} | Surface Y=${surfaceHeight} | Temp=${biome.temperature?.toFixed(2)} | Rain=${biome.rainfall?.toFixed(2)}`);
                }
            }
        }

        loadedChunks.add(chunkKey);

        // 📊 Enhanced statistics
        if (this.STATS.chunksGenerated % 20 === 0) {
            console.log(`📊 MinecraftStyleBiomeGen Stats:`);
            console.log(`   🌍 ${this.STATS.chunksGenerated} chunks generated`);
            console.log(`   🌡️ ${this.STATS.temperatureExtremes} temperature extremes`);
            console.log(`   🌧️ ${this.STATS.rainfallExtremes} rainfall extremes`);
            console.log(`   🌊 ${this.STATS.biomeTransitions} biome transitions`);
            console.log(`   🛡️ ${this.STATS.bedrockPlacements} bedrock blocks placed`);
        }
    }

    // 🎯 Player/Backpack Spawn Height Calculator
    getSpawnHeight(x, z, worldSeed) {
        // Generate a sample biome and height for spawn location
        const biome = this.getBiomeAt(x, z, worldSeed);
        const heightData = this.generateTerrainHeight(x, z, biome, worldSeed);
        const surfaceHeight = this.applyMountainModulation(heightData.surfaceHeight, biome, x, z, worldSeed);

        // Spawn 2 blocks above surface for safety
        return surfaceHeight + 2;
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

    // 🐛 Debug Control Methods
    enableDebugMode() {
        this.DEBUG_MODE = true;
        console.log('🐛 MinecraftStyleBiomeGen debug mode ENABLED - Climate system logging active');
    }

    disableDebugMode() {
        this.DEBUG_MODE = false;
        console.log('🐛 MinecraftStyleBiomeGen debug mode DISABLED - Production mode');
    }

    getStats() {
        return { ...this.STATS };
    }

    resetStats() {
        this.STATS = {
            chunksGenerated: 0,
            temperatureExtremes: 0,
            rainfallExtremes: 0,
            biomeTransitions: 0,
            bedrockPlacements: 0
        };
        console.log('📊 MinecraftStyleBiomeGen statistics reset');
    }
}