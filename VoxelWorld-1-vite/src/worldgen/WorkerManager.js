/**
 * 👷 WorkerManager - Web Worker Communication Handler
 *
 * Purpose:
 * - Manage Web Worker lifecycle (create, initialize, terminate)
 * - Handle message passing between main thread and worker
 * - Queue chunk generation requests
 * - Process worker responses and trigger callbacks
 *
 * Architecture:
 * - Main thread requests chunks via requestChunk()
 * - WorkerManager sends request to worker
 * - Worker generates chunk and sends back data
 * - WorkerManager triggers callback with chunk data
 */

import { ChunkCache } from '../cache/ChunkCache.js';

export class WorkerManager {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;
        this.worker = null;
        this.cache = new ChunkCache(256);
        this.pendingRequests = new Map(); // Map<chunkKey, callback>
        this.requestQueue = []; // Queue of pending requests
        this.isWorkerReady = false;
        this.maxConcurrentRequests = 1; // Process 1 chunk at a time for smoothest gameplay
        this.activeRequests = 0;

        this.stats = {
            requested: 0,
            generated: 0,
            cached: 0,
            errors: 0
        };
    }

    /**
     * Initialize worker with world configuration
     */
    async initialize(worldSeed, biomeConfig, noiseConfig) {
        return new Promise((resolve, reject) => {
            try {
                // Create worker from file
                this.worker = new Worker(
                    new URL('../workers/ChunkWorker.js', import.meta.url),
                    { type: 'module' }
                );

                // Set up message handler
                this.worker.onmessage = this.handleWorkerMessage.bind(this);
                this.worker.onerror = this.handleWorkerError.bind(this);

                // Send init message
                this.worker.postMessage({
                    type: 'INIT',
                    data: {
                        seed: worldSeed,
                        biomeConfig: biomeConfig,
                        noiseConfig: noiseConfig
                    }
                });

                // Wait for init complete
                const initTimeout = setTimeout(() => {
                    reject(new Error('Worker initialization timeout'));
                }, 5000);

                this.onInitComplete = () => {
                    clearTimeout(initTimeout);
                    this.isWorkerReady = true;
                    console.log('✅ ChunkWorker initialized successfully');
                    resolve();
                };

            } catch (error) {
                console.error('🚨 Failed to create worker:', error);
                reject(error);
            }
        });
    }

    /**
     * Handle messages from worker
     */
    handleWorkerMessage(e) {
        const { type, data } = e.data;

        switch (type) {
            case 'INIT_COMPLETE':
                if (this.onInitComplete) {
                    this.onInitComplete();
                }
                break;

            case 'CHUNK_READY':
                this.handleChunkReady(data);
                break;

            case 'CACHE_CLEARED':
                console.log('✅ Worker cache cleared');
                break;

            default:
                console.warn('Unknown worker message type:', type);
        }
    }

    /**
     * Handle worker errors
     */
    handleWorkerError(error) {
        console.error('🚨 Worker error:', error);
        this.stats.errors++;
    }

    /**
     * Handle chunk generation complete
     */
    handleChunkReady(chunkData) {
        const { chunkX, chunkZ } = chunkData;
        const key = `${chunkX},${chunkZ}`;

        this.activeRequests--;
        this.stats.generated++;

        // Store in cache
        this.cache.set(chunkX, chunkZ, chunkData);

        // Trigger callback if pending
        const callback = this.pendingRequests.get(key);
        if (callback) {
            callback(chunkData);
            this.pendingRequests.delete(key);
        }

        // Process next queued request
        this.processQueue();
    }

    /**
     * Request chunk generation
     */
    requestChunk(chunkX, chunkZ, chunkSize, callback) {
        const key = `${chunkX},${chunkZ}`;
        this.stats.requested++;

        // Check cache first
        const cachedData = this.cache.get(chunkX, chunkZ);
        if (cachedData) {
            this.stats.cached++;
            callback(cachedData);
            return;
        }

        // Check if already pending
        if (this.pendingRequests.has(key)) {
            // Already requested, just wait for it
            return;
        }

        // Add to pending requests
        this.pendingRequests.set(key, callback);

        // Add to queue
        this.requestQueue.push({ chunkX, chunkZ, chunkSize });

        // Process queue
        this.processQueue();
    }

    /**
     * Process queued chunk requests
     */
    processQueue() {
        if (!this.isWorkerReady) return;

        // Process up to maxConcurrentRequests at once
        while (this.activeRequests < this.maxConcurrentRequests && this.requestQueue.length > 0) {
            const request = this.requestQueue.shift();

            if (request) {
                this.activeRequests++;
                this.worker.postMessage({
                    type: 'GENERATE_CHUNK',
                    data: request
                });
            }
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        if (this.worker) {
            this.worker.postMessage({ type: 'CLEAR_CACHE' });
        }
    }

    /**
     * Cleanup distant chunks
     */
    cleanupDistantChunks(centerChunkX, centerChunkZ, maxRadius) {
        return this.cache.cleanupDistantChunks(centerChunkX, centerChunkZ, maxRadius);
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            cache: this.cache.getStats(),
            queueLength: this.requestQueue.length,
            activeRequests: this.activeRequests,
            pendingCallbacks: this.pendingRequests.size
        };
    }

    /**
     * Debug: Print stats
     */
    debug() {
        console.log('📊 WorkerManager Stats:', this.getStats());
        this.cache.debug();
    }

    /**
     * Terminate worker
     */
    terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.isWorkerReady = false;
            console.log('🛑 Worker terminated');
        }
    }
}
