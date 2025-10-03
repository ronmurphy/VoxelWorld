/**
 * 🌡️ Layer 2 Generator - Temperature Zones
 *
 * Purpose:
 * - Generate a 1024x1024 map where each pixel represents 512 blocks
 * - Temperature zones: 1=Warm, 2=Temperate, 3=Cold, 4=Freezing, 0=Water
 * - Creates latitude-based temperature with local variation
 * - Respects land/water from Layer 1
 *
 * Coverage: 524,288 blocks (same as Layer 1, higher resolution)
 * Data Size: 1MB (1024 * 1024 bytes)
 * Generation: One-time per world seed
 */

export class Layer2Generator {
    constructor(seed) {
        this.seed = seed;
        this.size = 1024; // 1024x1024 pixel map (4x Layer 1)
        this.blocksPerPixel = 512; // Each pixel = 512 blocks
        this.latitudeWeight = 0.7; // 70% latitude influence
        this.noiseWeight = 0.3; // 30% noise variation
    }

    /**
     * Generate temperature zones based on Layer 1 land/water
     */
    generate(layer1Data) {
        const tempMap = new Uint8Array(this.size * this.size);
        const layer1Size = 256;

        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                // Check if this position is land (downsample from Layer 1)
                const layer1X = Math.floor(x / 4);
                const layer1Y = Math.floor(y / 4);
                const isLand = layer1Data[layer1Y * layer1Size + layer1X] === 1;

                if (!isLand) {
                    tempMap[y * this.size + x] = 0; // Water = no temperature
                    continue;
                }

                // Generate temperature based on latitude + noise
                const nx = x / this.size;
                const ny = y / this.size;

                // Latitude gradient (colder at poles, warmer at equator)
                // 0 = equator (warm), 1 = poles (cold)
                const latitude = Math.abs(ny - 0.5) * 2; // [0, 1]
                const latitudeTemp = 1.0 - latitude; // Warmer at equator

                // Noise variation (creates temperature pockets)
                const noiseValue = this.simplexNoise(nx * 3, ny * 3, this.seed + 1000) * 0.5 + 0.5; // [0, 1]

                // Combine: 70% latitude, 30% noise
                const rawTemp = latitudeTemp * this.latitudeWeight + noiseValue * this.noiseWeight;

                // Map to temperature zones (1-4)
                if (rawTemp < 0.25) {
                    tempMap[y * this.size + x] = 4; // Freezing
                } else if (rawTemp < 0.50) {
                    tempMap[y * this.size + x] = 3; // Cold
                } else if (rawTemp < 0.75) {
                    tempMap[y * this.size + x] = 2; // Temperate
                } else {
                    tempMap[y * this.size + x] = 1; // Warm
                }
            }
        }

        // Smooth temperature transitions
        return this.smoothTemperatureMap(tempMap, 2);
    }

    /**
     * Smooth temperature map to create natural gradients
     */
    smoothTemperatureMap(tempMap, radius) {
        const smoothed = new Uint8Array(this.size * this.size);

        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (tempMap[y * this.size + x] === 0) {
                    smoothed[y * this.size + x] = 0; // Keep water as 0
                    continue;
                }

                let sum = 0;
                let count = 0;

                // Average neighbors
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
                            const val = tempMap[ny * this.size + nx];
                            if (val > 0) { // Skip water
                                sum += val;
                                count++;
                            }
                        }
                    }
                }

                // Round to nearest temperature zone
                smoothed[y * this.size + x] = count > 0 ? Math.round(sum / count) : 0;
            }
        }

        return smoothed;
    }

    /**
     * Sample temperature at world coordinates
     */
    sampleAt(worldX, worldZ, layer2Data) {
        // Convert world coords to Layer 2 pixel
        const pixelX = Math.floor(worldX / this.blocksPerPixel);
        const pixelY = Math.floor(worldZ / this.blocksPerPixel);

        // Clamp to valid range
        const clampedX = Math.max(0, Math.min(this.size - 1, pixelX));
        const clampedY = Math.max(0, Math.min(this.size - 1, pixelY));

        return layer2Data[clampedY * this.size + clampedX];
    }

    /**
     * Get statistics about temperature distribution
     */
    getStats(layer2Data) {
        const counts = { water: 0, warm: 0, temperate: 0, cold: 0, freezing: 0 };

        for (let i = 0; i < layer2Data.length; i++) {
            const temp = layer2Data[i];
            if (temp === 0) counts.water++;
            else if (temp === 1) counts.warm++;
            else if (temp === 2) counts.temperate++;
            else if (temp === 3) counts.cold++;
            else if (temp === 4) counts.freezing++;
        }

        const total = layer2Data.length;
        return {
            water: ((counts.water / total) * 100).toFixed(1) + '%',
            warm: ((counts.warm / total) * 100).toFixed(1) + '%',
            temperate: ((counts.temperate / total) * 100).toFixed(1) + '%',
            cold: ((counts.cold / total) * 100).toFixed(1) + '%',
            freezing: ((counts.freezing / total) * 100).toFixed(1) + '%'
        };
    }

    // ===== NOISE FUNCTION =====

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
}
