/**
 * 💾 ChunkCache - LRU RAM Cache for Chunk Data
 *
 * Purpose:
 * - Cache generated chunks in RAM for instant retrieval
 * - LRU (Least Recently Used) eviction when cache is full
 * - Prevents regenerating chunks when player moves around
 *
 * Performance:
 * - 256 chunk limit = ~1-2MB memory usage
 * - Instant access for cached chunks (no generation delay)
 * - Automatic eviction of rarely used chunks
 */

export class ChunkCache {
    constructor(maxSize = 256) {
        this.maxSize = maxSize;
        this.cache = new Map(); // Map<chunkKey, CacheEntry>
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            stores: 0
        };
    }

    /**
     * Get chunk key from coordinates
     */
    getKey(chunkX, chunkZ) {
        return `${chunkX},${chunkZ}`;
    }

    /**
     * Check if chunk is cached
     */
    has(chunkX, chunkZ) {
        return this.cache.has(this.getKey(chunkX, chunkZ));
    }

    /**
     * Get cached chunk data
     */
    get(chunkX, chunkZ) {
        const key = this.getKey(chunkX, chunkZ);
        const entry = this.cache.get(key);

        if (entry) {
            this.stats.hits++;
            entry.lastAccess = Date.now();
            entry.accessCount++;
            return entry.data;
        }

        this.stats.misses++;
        return null;
    }

    /**
     * Store chunk data in cache
     */
    set(chunkX, chunkZ, data) {
        const key = this.getKey(chunkX, chunkZ);

        // Create cache entry
        const entry = {
            chunkX,
            chunkZ,
            data,
            lastAccess: Date.now(),
            accessCount: 1,
            createdAt: Date.now()
        };

        this.cache.set(key, entry);
        this.stats.stores++;

        // Evict oldest if cache is full
        if (this.cache.size > this.maxSize) {
            this.evictOldest();
        }
    }

    /**
     * Remove chunk from cache
     */
    remove(chunkX, chunkZ) {
        const key = this.getKey(chunkX, chunkZ);
        return this.cache.delete(key);
    }

    /**
     * Evict least-recently-used chunk
     */
    evictOldest() {
        let oldestKey = null;
        let oldestTime = Infinity;

        for (const [key, entry] of this.cache) {
            if (entry.lastAccess < oldestTime) {
                oldestTime = entry.lastAccess;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
            this.stats.evictions++;
        }
    }

    /**
     * Clear entire cache
     */
    clear() {
        this.cache.clear();
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            stores: 0
        };
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0
            ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
            : 0;

        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hits: this.stats.hits,
            misses: this.stats.misses,
            evictions: this.stats.evictions,
            stores: this.stats.stores,
            hitRate: hitRate.toFixed(1) + '%',
            memoryUsageKB: this.estimateMemoryUsage()
        };
    }

    /**
     * Estimate memory usage
     */
    estimateMemoryUsage() {
        // Rough estimate: ~4KB per chunk entry (block data + metadata)
        return Math.round((this.cache.size * 4));
    }

    /**
     * Get chunks around a position (for preloading)
     */
    getChunksAround(centerChunkX, centerChunkZ, radius) {
        const chunks = [];

        for (let dz = -radius; dz <= radius; dz++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const chunkX = centerChunkX + dx;
                const chunkZ = centerChunkZ + dz;
                const data = this.get(chunkX, chunkZ);

                if (data) {
                    chunks.push({ chunkX, chunkZ, data });
                }
            }
        }

        return chunks;
    }

    /**
     * Remove chunks outside a radius (cleanup old chunks)
     */
    cleanupDistantChunks(centerChunkX, centerChunkZ, maxRadius) {
        const toRemove = [];

        for (const [key, entry] of this.cache) {
            const dx = entry.chunkX - centerChunkX;
            const dz = entry.chunkZ - centerChunkZ;
            const distance = Math.sqrt(dx * dx + dz * dz);

            if (distance > maxRadius) {
                toRemove.push(key);
            }
        }

        for (const key of toRemove) {
            this.cache.delete(key);
        }

        return toRemove.length;
    }

    /**
     * Get most accessed chunks
     */
    getMostAccessed(count = 10) {
        const entries = Array.from(this.cache.values());
        entries.sort((a, b) => b.accessCount - a.accessCount);
        return entries.slice(0, count).map(e => ({
            chunkX: e.chunkX,
            chunkZ: e.chunkZ,
            accessCount: e.accessCount
        }));
    }

    /**
     * Debug: Print cache state
     */
    debug() {
        console.log('📊 ChunkCache State:', this.getStats());
        console.log('🏆 Most Accessed Chunks:', this.getMostAccessed(5));
    }
}
