/**
 * 👷 WorkerManager - Web Worker Communication Handler
 *
 * Purpose:
 * - Manage Web Worker lifecycle (create, initialize, terminate)
 * - Handle message passing between main thread and worker
 * - Queue chunk generation requests
 * - Process worker responses and trigger callbacks
 * - Handle chunk persistence (disk/IndexedDB storage)
 *
 * Architecture:
 * - Main thread requests chunks via requestChunk()
 * - WorkerManager checks: RAM cache → Disk → Generate
 * - Worker generates chunk and sends back data
 * - WorkerManager saves to disk and triggers callback
 */

import { ChunkCache } from '../cache/ChunkCache.js';
import { ChunkPersistence } from '../serialization/ChunkPersistence.js';

export class WorkerManager {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;
        this.worker = null; // ChunkWorker
        this.treeWorker = null; // TreeWorker for decorations
        this.cache = new ChunkCache(256);
        this.persistence = null; // Will be initialized in initialize()
        this.pendingRequests = new Map(); // Map<chunkKey, callback>
        this.pendingTreeRequests = new Map(); // Map<chunkKey, {chunkData, callback}>
        this.deferredTreeRequests = []; // Queue for tree requests when TreeWorker not ready yet
        this.requestQueue = []; // Queue of pending requests
        this.isWorkerReady = false;
        this.isTreeWorkerReady = false;
        this.maxConcurrentRequests = 1; // Process 1 chunk at a time for smoothest gameplay
        this.activeRequests = 0;

        this.stats = {
            requested: 0,
            generated: 0,
            cached: 0,
            loadedFromDisk: 0,
            savedToDisk: 0,
            errors: 0,
            treesGenerated: 0
        };
    }

    /**
     * Initialize worker with world configuration
     */
    async initialize(worldSeed, biomeConfig, noiseConfig) {
        // Initialize persistence layer
        const isElectron = typeof window !== 'undefined' && window.process && window.process.type === 'renderer';
        this.persistence = new ChunkPersistence(worldSeed, isElectron);
        await this.persistence.initPromise;

        return new Promise((resolve, reject) => {
            try {
                // Create ChunkWorker
                this.worker = new Worker(
                    new URL('../workers/ChunkWorker.js', import.meta.url),
                    { type: 'module' }
                );

                // Set up message handler for ChunkWorker
                this.worker.onmessage = this.handleWorkerMessage.bind(this);
                this.worker.onerror = this.handleWorkerError.bind(this);

                // Create TreeWorker 🌲
                this.treeWorker = new Worker(
                    new URL('../workers/TreeWorker.js', import.meta.url),
                    { type: 'module' }
                );

                // Set up message handler for TreeWorker
                this.treeWorker.onmessage = this.handleTreeWorkerMessage.bind(this);
                this.treeWorker.onerror = this.handleTreeWorkerError.bind(this);

                // Send init message to ChunkWorker
                this.worker.postMessage({
                    type: 'INIT',
                    data: {
                        seed: worldSeed,
                        biomeConfig: biomeConfig,
                        noiseConfig: noiseConfig
                    }
                });

                // Send init message to TreeWorker
                this.treeWorker.postMessage({
                    type: 'INIT',
                    data: {
                        seed: worldSeed,
                        biomeConfig: biomeConfig,
                        size: 8 // chunkSize
                    }
                });

                // Wait for both workers to initialize
                const initTimeout = setTimeout(() => {
                    reject(new Error('Worker initialization timeout'));
                }, 5000);

                let chunkWorkerReady = false;
                let treeWorkerReady = false;

                const checkBothReady = () => {
                    if (chunkWorkerReady && treeWorkerReady) {
                        clearTimeout(initTimeout);
                        this.isWorkerReady = true;
                        this.isTreeWorkerReady = true;
                        console.log('✅ ChunkWorker initialized successfully');
                        console.log('✅ TreeWorker initialized successfully');
                        console.log('💾 Chunk persistence enabled');
                        resolve();
                    }
                };

                this.onInitComplete = () => {
                    chunkWorkerReady = true;
                    checkBothReady();
                };

                this.onTreeWorkerInitComplete = () => {
                    treeWorkerReady = true;
                    checkBothReady();
                    
                    // 🌲 Process any deferred tree requests that came in before TreeWorker was ready
                    if (this.deferredTreeRequests.length > 0) {
                        console.log(`🌲 TreeWorker ready! Processing ${this.deferredTreeRequests.length} deferred tree requests`);
                        for (const request of this.deferredTreeRequests) {
                            const { chunkX, chunkZ, chunkData, callback } = request;
                            const key = `${chunkX},${chunkZ}`;
                            this.pendingTreeRequests.set(key, { chunkData, callback });
                            this.treeWorker.postMessage({
                                type: 'GENERATE_TREES',  // 🐛 FIX: Use uppercase to match TreeWorker
                                data: {
                                    chunkX, chunkZ,
                                    heightMap: chunkData.heightMap,
                                    waterMap: chunkData.waterMap,
                                    worldSeed: this.worldSeed,
                                    chunkSize: this.chunkSize
                                }
                            });
                        }
                        this.deferredTreeRequests = [];
                    }
                };

            } catch (error) {
                console.error('🚨 Failed to create workers:', error);
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

            case 'LOD_CHUNK_READY':
                this.handleLODChunkReady(data);
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
        console.error('🚨 ChunkWorker error:', error);
        this.stats.errors++;
    }

    /**
     * 🌲 Handle messages from TreeWorker
     */
    handleTreeWorkerMessage(e) {
        const { type, data } = e.data;

        switch (type) {
            case 'INIT_COMPLETE':
                if (this.onTreeWorkerInitComplete) {
                    this.onTreeWorkerInitComplete();
                }
                break;

            case 'TREES_READY':
                this.handleTreesReady(data);
                break;

            case 'CACHE_CLEARED':
                console.log('✅ TreeWorker cache cleared');
                break;

            default:
                console.warn('Unknown TreeWorker message type:', type);
        }
    }

    /**
     * 🌲 Handle TreeWorker errors
     */
    handleTreeWorkerError(error) {
        console.error('🚨 TreeWorker error:', error);
        this.stats.errors++;
    }

    /**
     * 🌲 Handle tree generation complete
     */
    async handleTreesReady(treeData) {
        const { chunkX, chunkZ, trees, treesPlaced } = treeData;
        const key = `${chunkX},${chunkZ}`;

        console.log(`🌲 WorkerManager: Received ${treesPlaced} trees for chunk (${chunkX}, ${chunkZ})`);
        this.stats.treesGenerated += treesPlaced;

        // Get the pending tree request data
        const pendingData = this.pendingTreeRequests.get(key);
        if (pendingData) {
            const { chunkData, callback } = pendingData;

            // Attach tree data to chunk data
            chunkData.trees = trees;

            // Trigger callback with complete chunk + tree data
            if (callback) {
                callback(chunkData);
            }

            this.pendingTreeRequests.delete(key);
        } else {
            console.warn(`⚠️ No pending tree request for chunk (${chunkX}, ${chunkZ})`);
        }
    }

    /**
     * Handle chunk generation complete
     * 🔄 Now forwards to TreeWorker for decoration
     */
    async handleChunkReady(chunkData) {
        const { chunkX, chunkZ, heightMap, waterMap } = chunkData;
        const key = `${chunkX},${chunkZ}`;

        this.activeRequests--;
        this.stats.generated++;

        // Store in RAM cache
        this.cache.set(chunkX, chunkZ, chunkData);

        // Save to disk asynchronously (non-blocking)
        this.saveChunkToDisk(chunkX, chunkZ, chunkData);

        // 🌲 Forward to TreeWorker for tree generation
        const callback = this.pendingRequests.get(key);
        if (callback && this.isTreeWorkerReady) {
            // Store chunk data and callback for when trees are ready
            this.pendingTreeRequests.set(key, { chunkData, callback });
            this.pendingRequests.delete(key);

            // Request tree generation from TreeWorker
            this.treeWorker.postMessage({
                type: 'GENERATE_TREES',
                data: {
                    chunkX,
                    chunkZ,
                    heightMap,
                    waterMap,
                    biomeData: null // TreeWorker will calculate biomes itself
                }
            });
        } else if (callback) {
            // Fallback: TreeWorker not ready, return chunk without trees
            console.warn('⚠️ TreeWorker not ready, generating chunk without trees');
            chunkData.trees = [];
            callback(chunkData);
            this.pendingRequests.delete(key);
        }

        // Process next queued request
        this.processQueue();
    }

    /**
     * 🎨 Handle LOD chunk generation complete
     */
    handleLODChunkReady(lodData) {
        const { chunkX, chunkZ, colorBlocks } = lodData;
        const key = `lod_${chunkX},${chunkZ}`;

        // 💾 Save LOD chunk to disk asynchronously (non-blocking)
        this.saveLODChunkToDisk(chunkX, chunkZ, colorBlocks);

        // Trigger callback if pending
        const callback = this.pendingRequests.get(key);
        if (callback) {
            callback(lodData);
            this.pendingRequests.delete(key);
        }
    }

    /**
     * 💾 Save LOD chunk to disk (non-blocking)
     */
    async saveLODChunkToDisk(chunkX, chunkZ, colorBlocks) {
        try {
            await this.persistence.saveLODChunk(chunkX, chunkZ, colorBlocks);
            this.stats.savedToDisk++;
        } catch (error) {
            console.error(`❌ Failed to save LOD chunk (${chunkX}, ${chunkZ}) to disk:`, error);
        }
    }

    /**
     * Save chunk to disk (non-blocking)
     */
    async saveChunkToDisk(chunkX, chunkZ, chunkData) {
        try {
            // Convert transferable format back to block array
            const blocks = this.convertTransferableToBlocks(chunkData);
            const chunkObject = { blocks, trees: [] };

            await this.persistence.saveChunk(chunkX, chunkZ, chunkObject, false);
            this.stats.savedToDisk++;
        } catch (error) {
            console.error(`❌ Failed to save chunk (${chunkX}, ${chunkZ}) to disk:`, error);
        }
    }

    /**
     * Convert transferable format to block array
     */
    convertTransferableToBlocks(chunkData) {
        const { blockCount, positions, blockTypes, colors, flags } = chunkData;
        const blocks = [];

        // Block type ID to string mapping (must match ChunkSerializer & ChunkWorker!)
        const idToBlockType = {
            0: 'bedrock', 1: 'grass', 2: 'sand', 3: 'stone', 4: 'iron', 5: 'snow', 6: 'water', 7: 'dirt', 8: 'pumpkin', 9: 'gold',
            10: 'oak_wood', 11: 'pine_wood', 12: 'birch_wood', 13: 'palm_wood', 14: 'dead_wood',
            20: 'oak_wood-leaves', 21: 'pine_wood-leaves', 22: 'birch_wood-leaves',
            23: 'palm_wood-leaves', 24: 'dead_wood-leaves'
        };

        for (let i = 0; i < blockCount; i++) {
            const x = positions[i * 3];
            const y = positions[i * 3 + 1];
            const z = positions[i * 3 + 2];
            const typeId = blockTypes[i];
            const type = idToBlockType[typeId] || 'air';
            const color = colors[i];
            const isPlayerPlaced = flags[i] === 1;

            // Store block in chunk-relative coordinates (0-7)
            const chunkX = Math.floor(x / 8);
            const chunkZ = Math.floor(z / 8);
            const localX = x - chunkX * 8;
            const localZ = z - chunkZ * 8;

            blocks.push({
                x: localX,
                y,
                z: localZ,
                type,
                color,
                flags: isPlayerPlaced ? 1 : 0
            });
        }

        return blocks;
    }

    /**
     * Request chunk generation
     * Checks: RAM cache → Disk → Generate
     */
    async requestChunk(chunkX, chunkZ, chunkSize, callback) {
        const key = `${chunkX},${chunkZ}`;
        this.stats.requested++;

        // 1. Check RAM cache first
        const cachedData = this.cache.get(chunkX, chunkZ);
        if (cachedData) {
            this.stats.cached++;
            callback(cachedData);
            return;
        }

        // 2. Check if already pending
        if (this.pendingRequests.has(key)) {
            // Already requested, just wait for it
            return;
        }

        // 3. Check disk storage
        try {
            const diskData = await this.persistence.loadChunk(chunkX, chunkZ, false);
            if (diskData) {
                this.stats.loadedFromDisk++;

                // Load modifications (.mod file) if they exist
                const modData = await this.persistence.loadChunk(chunkX, chunkZ, true);

                // Apply modifications to base chunk
                let finalBlocks = diskData.blocks;
                if (modData && modData.blocks) {
                    // Create modification map
                    const modifications = new Map();
                    for (const block of modData.blocks) {
                        const posKey = `${block.x},${block.y},${block.z}`;
                        if (block.flags === 255) {
                            // Special "removed" flag
                            modifications.set(posKey, null);
                        } else {
                            modifications.set(posKey, block);
                        }
                    }

                    // Apply modifications to base blocks
                    const blockMap = new Map();
                    for (const block of diskData.blocks) {
                        const posKey = `${block.x},${block.y},${block.z}`;
                        blockMap.set(posKey, block);
                    }

                    // Merge modifications
                    for (const [posKey, modBlock] of modifications.entries()) {
                        if (modBlock === null) {
                            blockMap.delete(posKey);
                        } else {
                            blockMap.set(posKey, modBlock);
                        }
                    }

                    finalBlocks = Array.from(blockMap.values());
                    // console.log(`💾 Applied ${modifications.size} modifications to chunk (${chunkX}, ${chunkZ})`);
                }

                // Convert disk data to transferable format
                const transferableData = this.convertBlocksToTransferable(
                    { blocks: finalBlocks, trees: diskData.trees || [] },
                    chunkX,
                    chunkZ
                );

                // Store in RAM cache
                this.cache.set(chunkX, chunkZ, transferableData);

                // 🌲 FIX: If no tree data saved, request trees from TreeWorker
                if (!diskData.trees || diskData.trees.length === 0) {
                    if (this.isTreeWorkerReady && transferableData.heightMap) {
                        console.log(`🌲 Chunk (${chunkX}, ${chunkZ}) loaded from disk without trees - requesting tree generation`);
                        this.pendingTreeRequests.set(key, { chunkData: transferableData, callback });
                        this.treeWorker.postMessage({
                            type: 'GENERATE_TREES',  // 🐛 FIX: Use uppercase to match TreeWorker case statement
                            data: {
                                chunkX, chunkZ,
                                heightMap: transferableData.heightMap,
                                waterMap: transferableData.waterMap,
                                worldSeed: this.worldSeed,
                                chunkSize: this.chunkSize
                            }
                        });
                        return; // Wait for trees before calling callback
                    } else if (transferableData.heightMap) {
                        // TreeWorker not ready yet - defer this request
                        console.log(`⏳ Chunk (${chunkX}, ${chunkZ}) has no trees but TreeWorker not ready - deferring tree generation`);
                        this.deferredTreeRequests.push({ chunkX, chunkZ, chunkData: transferableData, callback });
                        return; // Wait for TreeWorker to become ready
                    }
                }

                // Return to callback (with or without trees)
                callback(transferableData);
                return;
            }
        } catch (error) {
            console.error(`❌ Failed to load chunk (${chunkX}, ${chunkZ}) from disk:`, error);
            // Fall through to generation
        }

        // 4. Not in cache or disk - generate it
        // Add to pending requests
        this.pendingRequests.set(key, callback);

        // Add to queue
        this.requestQueue.push({ chunkX, chunkZ, chunkSize });

        // Process queue
        this.processQueue();
    }

    /**
     * Convert block array to transferable format
     */
    convertBlocksToTransferable(chunkObject, chunkX, chunkZ) {
        const { blocks, trees } = chunkObject;
        const blockCount = blocks.length;

        const positions = new Int16Array(blockCount * 3);
        const blockTypes = new Uint8Array(blockCount);
        const colors = new Uint32Array(blockCount);
        const flags = new Uint8Array(blockCount);
        
        // 🗺️ Regenerate heightMap and waterMap from blocks
        const chunkSize = 8;
        const heightMap = new Uint8Array(chunkSize * chunkSize);
        const waterMap = new Uint8Array(chunkSize * chunkSize);
        heightMap.fill(0);
        waterMap.fill(0);

        // Block type string to ID mapping (must match ChunkSerializer & ChunkWorker!)
        const blockTypeToId = {
            'bedrock': 0, 'grass': 1, 'sand': 2, 'stone': 3, 'iron': 4, 'snow': 5, 'water': 6, 'dirt': 7, 'pumpkin': 8,
            'oak_wood': 10, 'pine_wood': 11, 'birch_wood': 12, 'palm_wood': 13, 'dead_wood': 14,
            'oak_wood-leaves': 20, 'pine_wood-leaves': 21, 'birch_wood-leaves': 22,
            'palm_wood-leaves': 23, 'dead_wood-leaves': 24
        };

        for (let i = 0; i < blockCount; i++) {
            const block = blocks[i];

            // Convert chunk-relative to world coordinates
            const worldX = chunkX * 8 + block.x;
            const worldZ = chunkZ * 8 + block.z;

            positions[i * 3] = worldX;
            positions[i * 3 + 1] = block.y;
            positions[i * 3 + 2] = worldZ;
            blockTypes[i] = blockTypeToId[block.type] || 0;
            colors[i] = block.color;
            flags[i] = block.flags || 0;
            
            // Update heightMap and waterMap
            const mapIndex = block.z * chunkSize + block.x;
            if (block.y > heightMap[mapIndex]) {
                heightMap[mapIndex] = block.y;
            }
            if (block.type === 'water' && block.y > waterMap[mapIndex]) {
                waterMap[mapIndex] = block.y;
            }
        }

        return {
            chunkX,
            chunkZ,
            blockCount,
            waterBlockCount: blocks.filter(b => b.type === 'water').length,
            positions,
            blockTypes,
            colors,
            flags,
            heightMap,  // 🗺️ Regenerated from blocks
            waterMap    // 🗺️ Regenerated from blocks
        };
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
     * 🎨 Request LOD chunk generation (simplified colored blocks for visual horizon)
     * Returns: { chunkX, chunkZ, colorBlocks: [{ x, y, z, color }] }
     */
    async requestLODChunk(chunkX, chunkZ, chunkSize, callback) {
        const key = `lod_${chunkX},${chunkZ}`;

        // Check if already pending
        if (this.pendingRequests.has(key)) {
            return;
        }

        // 💾 Check disk storage FIRST (major speed boost!)
        try {
            const colorBlocks = await this.persistence.loadLODChunk(chunkX, chunkZ);
            if (colorBlocks) {
                this.stats.loadedFromDisk++;
                // Return cached LOD data immediately
                callback({ chunkX, chunkZ, colorBlocks });
                return;
            }
        } catch (error) {
            console.error(`❌ Failed to load LOD chunk (${chunkX}, ${chunkZ}) from disk:`, error);
        }

        // Not on disk, generate via worker
        this.pendingRequests.set(key, callback);

        // Send to worker
        if (this.worker && this.isWorkerReady) {
            this.worker.postMessage({
                type: 'GENERATE_LOD_CHUNK',
                data: { chunkX, chunkZ, chunkSize }
            });
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
