/**
 * 🌡️ RegionNoiseCache - Pre-computed noise maps for regions
 *
 * Purpose:
 * - Generate temperature/moisture maps per region (not per chunk)
 * - Cache region noise data for faster chunk generation
 * - Smoother biome transitions by using consistent regional data
 *
 * Performance Benefits:
 * - Fewer noise calculations (1 region = many chunks)
 * - Smoother biome blending across chunk boundaries
 * - Reduced redundant computation
 */

export class RegionNoiseCache {
    constructor(regionSize = 128) {
        this.regionSize = regionSize; // Blocks per region (covers ~16 chunks)
        this.cache = new Map(); // Map<regionKey, RegionData>
        this.maxCacheSize = 64; // Keep up to 64 regions in memory (~512KB)
    }

    /**
     * Get region key from world coordinates
     */
    getRegionKey(worldX, worldZ) {
        const regionX = Math.floor(worldX / this.regionSize);
        const regionZ = Math.floor(worldZ / this.regionSize);
        return `${regionX},${regionZ}`;
    }

    /**
     * Get or generate region noise data
     */
    getRegionData(worldX, worldZ, worldSeed) {
        const key = this.getRegionKey(worldX, worldZ);

        // Check cache first
        if (this.cache.has(key)) {
            const cached = this.cache.get(key);
            cached.lastAccess = Date.now();
            return cached;
        }

        // Generate new region data
        const regionData = this.generateRegionData(worldX, worldZ, worldSeed);

        // Store in cache
        this.cache.set(key, regionData);

        // Evict oldest if cache is full
        if (this.cache.size > this.maxCacheSize) {
            this.evictOldest();
        }

        return regionData;
    }

    /**
     * Generate noise maps for a region
     */
    generateRegionData(worldX, worldZ, seed) {
        const regionX = Math.floor(worldX / this.regionSize);
        const regionZ = Math.floor(worldZ / this.regionSize);

        // Resolution: 16x16 samples per region
        const resolution = 16;
        const samplesPerBlock = this.regionSize / resolution;

        const temperatureMap = new Float32Array(resolution * resolution);
        const moistureMap = new Float32Array(resolution * resolution);
        const elevationMap = new Float32Array(resolution * resolution);

        // Generate noise samples
        for (let z = 0; z < resolution; z++) {
            for (let x = 0; x < resolution; x++) {
                const worldX = (regionX * this.regionSize) + (x * samplesPerBlock);
                const worldZ = (regionZ * this.regionSize) + (z * samplesPerBlock);

                const index = z * resolution + x;

                // Temperature noise (varies by latitude + local variation)
                const tempNoise = this.simplexNoise(worldX * 0.003, worldZ * 0.003, seed + 1000);
                const latitudeFactor = Math.abs(worldZ * 0.001) % 1.0; // Simple latitude
                temperatureMap[index] = (tempNoise * 0.4 + (1.0 - latitudeFactor) * 0.6); // [-1, 1]

                // Moisture noise (coastal proximity + local variation)
                const moistNoise = this.simplexNoise(worldX * 0.004, worldZ * 0.004, seed + 2000);
                moistureMap[index] = moistNoise; // [-1, 1]

                // Elevation base noise (large-scale terrain)
                const elevNoise = this.multiOctaveNoise(worldX, worldZ, {
                    scale: 0.008,
                    octaves: 3,
                    persistence: 0.5
                }, seed);
                elevationMap[index] = elevNoise; // [-1, 1]
            }
        }

        return {
            regionX,
            regionZ,
            resolution,
            samplesPerBlock,
            temperatureMap,
            moistureMap,
            elevationMap,
            lastAccess: Date.now()
        };
    }

    /**
     * Sample from region noise map using bilinear interpolation
     */
    sampleRegionNoise(map, regionData, worldX, worldZ) {
        const { regionX, regionZ, resolution, samplesPerBlock } = regionData;

        // Convert world coords to region-local coords
        const localX = worldX - (regionX * this.regionSize);
        const localZ = worldZ - (regionZ * this.regionSize);

        // Convert to sample coordinates (floating point)
        const sampleX = localX / samplesPerBlock;
        const sampleZ = localZ / samplesPerBlock;

        // Get integer and fractional parts for bilinear interpolation
        const x0 = Math.floor(sampleX);
        const z0 = Math.floor(sampleZ);
        const x1 = Math.min(x0 + 1, resolution - 1);
        const z1 = Math.min(z0 + 1, resolution - 1);
        const fx = sampleX - x0;
        const fz = sampleZ - z0;

        // Clamp to valid range
        const cx0 = Math.max(0, Math.min(resolution - 1, x0));
        const cz0 = Math.max(0, Math.min(resolution - 1, z0));

        // Get four corner samples
        const v00 = map[cz0 * resolution + cx0];
        const v10 = map[cz0 * resolution + x1];
        const v01 = map[z1 * resolution + cx0];
        const v11 = map[z1 * resolution + x1];

        // Bilinear interpolation
        const v0 = v00 * (1 - fx) + v10 * fx;
        const v1 = v01 * (1 - fx) + v11 * fx;
        return v0 * (1 - fz) + v1 * fz;
    }

    /**
     * Get temperature at world coordinates
     */
    getTemperature(worldX, worldZ, worldSeed) {
        const regionData = this.getRegionData(worldX, worldZ, worldSeed);
        return this.sampleRegionNoise(regionData.temperatureMap, regionData, worldX, worldZ);
    }

    /**
     * Get moisture at world coordinates
     */
    getMoisture(worldX, worldZ, worldSeed) {
        const regionData = this.getRegionData(worldX, worldZ, worldSeed);
        return this.sampleRegionNoise(regionData.moistureMap, regionData, worldX, worldZ);
    }

    /**
     * Get base elevation at world coordinates
     */
    getElevation(worldX, worldZ, worldSeed) {
        const regionData = this.getRegionData(worldX, worldZ, worldSeed);
        return this.sampleRegionNoise(regionData.elevationMap, regionData, worldX, worldZ);
    }

    /**
     * Evict least-recently-used region
     */
    evictOldest() {
        let oldestKey = null;
        let oldestTime = Infinity;

        for (const [key, data] of this.cache) {
            if (data.lastAccess < oldestTime) {
                oldestTime = data.lastAccess;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }

    /**
     * Clear cache
     */
    clear() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            cachedRegions: this.cache.size,
            maxCacheSize: this.maxCacheSize,
            memoryUsageKB: Math.round((this.cache.size * 16 * 16 * 3 * 4) / 1024) // 3 maps, 4 bytes per float
        };
    }

    // ===== NOISE FUNCTIONS (Same as BiomeWorldGen) =====

    simplexNoise(x, z, seed = 0) {
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

    multiOctaveNoise(x, z, params, seed = 0) {
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
}
