/**
 * ChunkPersistence.js
 *
 * File I/O wrapper for chunk persistence system.
 * Handles both Electron (Node.js fs) and browser (IndexedDB) environments.
 *
 * Directory Structure:
 * - Electron: {userData}/VoxelWorld/saves/{worldSeed}/chunks/
 * - Browser: IndexedDB database "VoxelWorld" with stores "chunks" and "modifications"
 *
 * File Types:
 * - chunk_X_Z.dat - Generated terrain data (binary)
 * - chunk_X_Z.mod - Player modifications (binary)
 */

import { ChunkSerializer } from './ChunkSerializer.js';

export class ChunkPersistence {
    constructor(worldSeed, isElectron = false) {
        this.worldSeed = worldSeed;
        this.isElectron = isElectron;
        this.fs = null;
        this.path = null;
        this.chunksDir = null;
        this.db = null;

        this.initPromise = this.initialize();
    }

    /**
     * Initialize persistence layer (async)
     */
    async initialize() {
        if (this.isElectron) {
            await this.initElectron();
        } else {
            await this.initIndexedDB();
        }
    }

    /**
     * Initialize Electron file system persistence
     */
    async initElectron() {
        try {
            // Dynamic import for Node.js modules (only available in Electron)
            const fsModule = await import('fs/promises');
            const pathModule = await import('path');
            const { app } = await import('electron');

            this.fs = fsModule;
            this.path = pathModule.default;

            // Get user data directory
            const userDataPath = app.getPath('userData');
            this.chunksDir = this.path.join(userDataPath, 'VoxelWorld', 'saves', this.worldSeed.toString(), 'chunks');

            // Create directory structure
            await this.fs.mkdir(this.chunksDir, { recursive: true });

            console.log(`📁 Electron chunk storage initialized: ${this.chunksDir}`);
        } catch (error) {
            console.error('❌ Failed to initialize Electron file system:', error);
            throw error;
        }
    }

    /**
     * Initialize IndexedDB persistence for browser
     */
    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('VoxelWorld', 2); // Increment version for new store

            request.onerror = () => {
                console.error('❌ Failed to open IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('💾 IndexedDB chunk storage initialized');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores if they don't exist
                if (!db.objectStoreNames.contains('chunks')) {
                    const chunkStore = db.createObjectStore('chunks', { keyPath: 'key' });
                    chunkStore.createIndex('worldSeed', 'worldSeed', { unique: false });
                    chunkStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                if (!db.objectStoreNames.contains('modifications')) {
                    const modStore = db.createObjectStore('modifications', { keyPath: 'key' });
                    modStore.createIndex('worldSeed', 'worldSeed', { unique: false });
                    modStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // 🎨 LOD chunks store
                if (!db.objectStoreNames.contains('lod')) {
                    const lodStore = db.createObjectStore('lod', { keyPath: 'key' });
                    lodStore.createIndex('chunkX', 'chunkX', { unique: false });
                    lodStore.createIndex('chunkZ', 'chunkZ', { unique: false });
                    lodStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                console.log('📊 IndexedDB schema upgraded');
            };
        });
    }

    /**
     * Generate storage key for chunk
     */
    getChunkKey(chunkX, chunkZ, isMod = false) {
        const suffix = isMod ? 'mod' : 'dat';
        return `${this.worldSeed}_chunk_${chunkX}_${chunkZ}.${suffix}`;
    }

    /**
     * Save chunk data to disk/IndexedDB
     *
     * @param {number} chunkX - Chunk X coordinate
     * @param {number} chunkZ - Chunk Z coordinate
     * @param {Object} chunkData - Chunk data from ChunkWorker
     * @param {boolean} isMod - Is this a modification file?
     * @returns {Promise<void>}
     */
    async saveChunk(chunkX, chunkZ, chunkData, isMod = false) {
        await this.initPromise; // Ensure initialized

        // Serialize chunk to binary
        const buffer = ChunkSerializer.serializeChunk(chunkData, chunkX, chunkZ);

        if (this.isElectron) {
            // Electron: Write to file system
            const filename = isMod
                ? ChunkSerializer.getModFilename(chunkX, chunkZ)
                : ChunkSerializer.getChunkFilename(chunkX, chunkZ);
            const filepath = this.path.join(this.chunksDir, filename);

            const uint8Array = new Uint8Array(buffer);
            await this.fs.writeFile(filepath, uint8Array);

            // console.log(`💾 Saved chunk (${chunkX}, ${chunkZ}) to ${filename} (${buffer.byteLength} bytes)`);
        } else {
            // Browser: Write to IndexedDB
            const storeName = isMod ? 'modifications' : 'chunks';
            const key = this.getChunkKey(chunkX, chunkZ, isMod);

            await this.writeIndexedDB(storeName, {
                key,
                worldSeed: this.worldSeed,
                chunkX,
                chunkZ,
                data: buffer,
                timestamp: Date.now()
            });

            // console.log(`💾 Saved chunk (${chunkX}, ${chunkZ}) to IndexedDB (${buffer.byteLength} bytes)`);
        }
    }

    /**
     * Load chunk data from disk/IndexedDB
     *
     * @param {number} chunkX - Chunk X coordinate
     * @param {number} chunkZ - Chunk Z coordinate
     * @param {boolean} isMod - Load modification file?
     * @returns {Promise<Object|null>} Deserialized chunk data or null if not found
     */
    async loadChunk(chunkX, chunkZ, isMod = false) {
        await this.initPromise; // Ensure initialized

        try {
            let buffer;

            if (this.isElectron) {
                // Electron: Read from file system
                const filename = isMod
                    ? ChunkSerializer.getModFilename(chunkX, chunkZ)
                    : ChunkSerializer.getChunkFilename(chunkX, chunkZ);
                const filepath = this.path.join(this.chunksDir, filename);

                // Check if file exists
                try {
                    await this.fs.access(filepath);
                } catch {
                    return null; // File doesn't exist
                }

                const uint8Array = await this.fs.readFile(filepath);
                buffer = uint8Array.buffer;
            } else {
                // Browser: Read from IndexedDB
                const storeName = isMod ? 'modifications' : 'chunks';
                const key = this.getChunkKey(chunkX, chunkZ, isMod);

                const record = await this.readIndexedDB(storeName, key);
                if (!record) return null;

                buffer = record.data;
            }

            // Deserialize binary to chunk data
            const chunkData = ChunkSerializer.deserializeChunk(buffer);
            // console.log(`📂 Loaded chunk (${chunkX}, ${chunkZ}) from storage (${buffer.byteLength} bytes)`);

            return chunkData;
        } catch (error) {
            console.error(`❌ Failed to load chunk (${chunkX}, ${chunkZ}):`, error);
            return null;
        }
    }

    /**
     * Check if chunk exists in storage
     *
     * @param {number} chunkX - Chunk X coordinate
     * @param {number} chunkZ - Chunk Z coordinate
     * @param {boolean} isMod - Check modification file?
     * @returns {Promise<boolean>}
     */
    async chunkExists(chunkX, chunkZ, isMod = false) {
        await this.initPromise;

        try {
            if (this.isElectron) {
                const filename = isMod
                    ? ChunkSerializer.getModFilename(chunkX, chunkZ)
                    : ChunkSerializer.getChunkFilename(chunkX, chunkZ);
                const filepath = this.path.join(this.chunksDir, filename);

                await this.fs.access(filepath);
                return true;
            } else {
                const storeName = isMod ? 'modifications' : 'chunks';
                const key = this.getChunkKey(chunkX, chunkZ, isMod);

                const record = await this.readIndexedDB(storeName, key);
                return record !== null;
            }
        } catch {
            return false;
        }
    }

    /**
     * Delete chunk from storage
     *
     * @param {number} chunkX - Chunk X coordinate
     * @param {number} chunkZ - Chunk Z coordinate
     * @param {boolean} isMod - Delete modification file?
     * @returns {Promise<void>}
     */
    async deleteChunk(chunkX, chunkZ, isMod = false) {
        await this.initPromise;

        try {
            if (this.isElectron) {
                const filename = isMod
                    ? ChunkSerializer.getModFilename(chunkX, chunkZ)
                    : ChunkSerializer.getChunkFilename(chunkX, chunkZ);
                const filepath = this.path.join(this.chunksDir, filename);

                await this.fs.unlink(filepath);
                console.log(`🗑️ Deleted chunk (${chunkX}, ${chunkZ})`);
            } else {
                const storeName = isMod ? 'modifications' : 'chunks';
                const key = this.getChunkKey(chunkX, chunkZ, isMod);

                await this.deleteIndexedDB(storeName, key);
                console.log(`🗑️ Deleted chunk (${chunkX}, ${chunkZ}) from IndexedDB`);
            }
        } catch (error) {
            console.error(`❌ Failed to delete chunk (${chunkX}, ${chunkZ}):`, error);
        }
    }

    /**
     * List all chunks for current world seed
     *
     * @returns {Promise<Array>} Array of {chunkX, chunkZ, isMod}
     */
    async listChunks() {
        await this.initPromise;

        try {
            if (this.isElectron) {
                const files = await this.fs.readdir(this.chunksDir);
                const chunks = files
                    .map(filename => ChunkSerializer.parseChunkFilename(filename))
                    .filter(parsed => parsed !== null)
                    .map(parsed => ({
                        chunkX: parsed.x,
                        chunkZ: parsed.z,
                        isMod: parsed.type === 'mod'
                    }));

                return chunks;
            } else {
                // IndexedDB: Get all chunks for this world seed
                const chunks = [];

                // Get chunk data
                const chunkRecords = await this.getAllIndexedDB('chunks', 'worldSeed', this.worldSeed);
                chunks.push(...chunkRecords.map(r => ({ chunkX: r.chunkX, chunkZ: r.chunkZ, isMod: false })));

                // Get modifications
                const modRecords = await this.getAllIndexedDB('modifications', 'worldSeed', this.worldSeed);
                chunks.push(...modRecords.map(r => ({ chunkX: r.chunkX, chunkZ: r.chunkZ, isMod: true })));

                return chunks;
            }
        } catch (error) {
            console.error('❌ Failed to list chunks:', error);
            return [];
        }
    }

    // --- IndexedDB Helper Methods ---

    /**
     * Write to IndexedDB
     */
    writeIndexedDB(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Read from IndexedDB
     */
    readIndexedDB(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete from IndexedDB
     */
    deleteIndexedDB(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all records from IndexedDB by index
     */
    getAllIndexedDB(storeName, indexName, indexValue) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(indexValue);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 🎨 Save LOD chunk to disk/IndexedDB
     * LOD chunks are simple colorBlocks arrays: [{ x, y, z, color }]
     * 
     * @param {number} chunkX - Chunk X coordinate
     * @param {number} chunkZ - Chunk Z coordinate
     * @param {Array} colorBlocks - Array of { x, y, z, color } objects
     */
    async saveLODChunk(chunkX, chunkZ, colorBlocks) {
        await this.initPromise;

        try {
            // Serialize LOD data to JSON (simpler than binary for small LOD chunks)
            const lodData = JSON.stringify({
                chunkX,
                chunkZ,
                colorBlocks,
                timestamp: Date.now()
            });

            if (this.isElectron) {
                // Electron: Save to filesystem with 'lod_' prefix
                const filename = `lod_${chunkX}_${chunkZ}.json`;
                const filepath = this.path.join(this.chunksDir, filename);
                await this.fs.writeFile(filepath, lodData, 'utf8');
                // console.log(`💾 Saved LOD chunk (${chunkX}, ${chunkZ}) to disk`);
            } else {
                // Browser: Save to IndexedDB 'lod' store
                const key = `lod_${chunkX}_${chunkZ}`;
                await this.writeIndexedDB('lod', {
                    key,
                    chunkX,
                    chunkZ,
                    data: lodData,
                    timestamp: Date.now()
                });
                // console.log(`💾 Saved LOD chunk (${chunkX}, ${chunkZ}) to IndexedDB`);
            }
        } catch (error) {
            console.error(`❌ Failed to save LOD chunk (${chunkX}, ${chunkZ}):`, error);
        }
    }

    /**
     * 🎨 Load LOD chunk from disk/IndexedDB
     * 
     * @param {number} chunkX - Chunk X coordinate
     * @param {number} chunkZ - Chunk Z coordinate
     * @returns {Promise<Array|null>} colorBlocks array or null if not found
     */
    async loadLODChunk(chunkX, chunkZ) {
        await this.initPromise;

        try {
            let lodData;

            if (this.isElectron) {
                // Electron: Load from filesystem
                const filename = `lod_${chunkX}_${chunkZ}.json`;
                const filepath = this.path.join(this.chunksDir, filename);

                try {
                    await this.fs.access(filepath);
                } catch {
                    return null; // File doesn't exist
                }

                const jsonData = await this.fs.readFile(filepath, 'utf8');
                lodData = JSON.parse(jsonData);
            } else {
                // Browser: Load from IndexedDB
                const key = `lod_${chunkX}_${chunkZ}`;
                const record = await this.readIndexedDB('lod', key);
                if (!record) return null;

                lodData = JSON.parse(record.data);
            }

            // console.log(`💾 Loaded LOD chunk (${chunkX}, ${chunkZ}) from disk`);
            return lodData.colorBlocks;
        } catch (error) {
            console.error(`❌ Failed to load LOD chunk (${chunkX}, ${chunkZ}):`, error);
            return null;
        }
    }
}
