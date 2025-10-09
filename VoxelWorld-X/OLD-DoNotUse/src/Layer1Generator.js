/**
 * 🌍 Layer 1 Generator - Continental Land/Water Mask
 *
 * Purpose:
 * - Generate a 256x256 map where each pixel represents 2048 blocks
 * - Binary mask: 1 = land, 0 = water
 * - Creates continental landmasses and oceans
 * - Smoothed to remove tiny islands and lakes
 *
 * Coverage: 524,288 blocks (256 * 2048)
 * Data Size: 64KB (256 * 256 bytes)
 * Generation: One-time per world seed
 */

export class Layer1Generator {
    constructor(seed) {
        this.seed = seed;
        this.size = 256; // 256x256 pixel map
        this.blocksPerPixel = 2048; // Each pixel = 2048 blocks
        this.landThreshold = 0.4; // 60% land, 40% water
    }

    /**
     * Generate the land/water mask
     */
    generate() {
        const mask = new Uint8Array(this.size * this.size);

        // Generate raw noise
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                const nx = x / this.size;
                const ny = y / this.size;

                // Large-scale continental noise (single octave)
                const value = this.simplexNoise(nx * 2, ny * 2, this.seed) * 0.5 + 0.5; // [0, 1]

                // Binary: 1 = land, 0 = water
                mask[y * this.size + x] = value > this.landThreshold ? 1 : 0;
            }
        }

        // Smooth to remove single-pixel noise
        return this.smoothBinaryMask(mask, 3);
    }

    /**
     * Smooth binary mask to remove tiny islands/lakes
     */
    smoothBinaryMask(mask, radius) {
        const smoothed = new Uint8Array(this.size * this.size);

        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                let sum = 0;
                let count = 0;

                // Count neighbors
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
                            sum += mask[ny * this.size + nx];
                            count++;
                        }
                    }
                }

                // If majority are land, make this land (removes single-pixel noise)
                smoothed[y * this.size + x] = (sum / count) > 0.5 ? 1 : 0;
            }
        }

        return smoothed;
    }

    /**
     * Sample land/water at world coordinates
     */
    sampleAt(worldX, worldZ, layer1Data) {
        // Convert world coords to Layer 1 pixel
        const pixelX = Math.floor(worldX / this.blocksPerPixel);
        const pixelY = Math.floor(worldZ / this.blocksPerPixel);

        // Clamp to valid range
        const clampedX = Math.max(0, Math.min(this.size - 1, pixelX));
        const clampedY = Math.max(0, Math.min(this.size - 1, pixelY));

        return layer1Data[clampedY * this.size + clampedX];
    }

    /**
     * Get statistics about generated land/water
     */
    getStats(layer1Data) {
        let landCount = 0;
        let waterCount = 0;

        for (let i = 0; i < layer1Data.length; i++) {
            if (layer1Data[i] === 1) {
                landCount++;
            } else {
                waterCount++;
            }
        }

        const total = layer1Data.length;
        return {
            landCount,
            waterCount,
            landPercent: ((landCount / total) * 100).toFixed(1) + '%',
            waterPercent: ((waterCount / total) * 100).toFixed(1) + '%'
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
