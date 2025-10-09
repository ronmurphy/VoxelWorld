/**
 * MiniTextureCache.js - Browser-side mini texture cache using IndexedDB
 *
 * For development/browser testing only - generates and caches 32x32 textures
 * Electron builds use pre-generated files from vite-plugin-mini-textures
 */

import * as THREE from 'three';

export class MiniTextureCache {
    constructor() {
        this.db = null;
        this.dbName = 'VoxelWorld_MiniTextures';
        this.storeName = 'miniTextures';
        this.version = 1;

        // In-memory cache for this session (avoid repeated IndexedDB reads)
        this.memoryCache = new Map();

        console.log('🎨 MiniTextureCache initialized (browser mode)');
    }

    /**
     * Initialize IndexedDB connection
     */
    async init() {
        if (this.db) return; // Already initialized

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ IndexedDB mini texture cache ready');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                    console.log('📦 Created mini texture object store');
                }
            };
        });
    }

    /**
     * Load or generate a mini texture for a block type
     * @param {string} blockType - Block type name (e.g., "grass", "stone")
     * @returns {Promise<THREE.Texture>}
     */
    async loadOrGenerate(blockType) {
        // Check memory cache first (fastest)
        if (this.memoryCache.has(blockType)) {
            return this.memoryCache.get(blockType);
        }

        // Ensure DB is initialized
        await this.init();

        // Check IndexedDB cache
        const cachedBlob = await this.getFromDB(blockType);
        if (cachedBlob) {
            const texture = await this.blobToTexture(cachedBlob);
            this.memoryCache.set(blockType, texture);
            return texture;
        }

        // Not cached - generate from source
        const texture = await this.generateMini(blockType);
        return texture;
    }

    /**
     * Get cached blob from IndexedDB
     */
    async getFromDB(blockType) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(blockType);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Save blob to IndexedDB
     */
    async saveToDB(blockType, blob) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(blob, blockType);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Generate 32x32 mini texture from source image
     */
    async generateMini(blockType) {
        try {
            const sourcePath = `art/blocks/${blockType}.png`;

            // Load source image
            const sourceImage = await this.loadImage(sourcePath);

            // Create 32x32 canvas
            const canvas = document.createElement('canvas');
            canvas.width = 32;
            canvas.height = 32;
            const ctx = canvas.getContext('2d');

            // Resize with high-quality scaling
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(sourceImage, 0, 0, 32, 32);

            // Convert to blob and cache
            const blob = await this.canvasToBlob(canvas);
            await this.saveToDB(blockType, blob);

            // Convert to THREE.Texture
            const texture = await this.blobToTexture(blob);
            this.memoryCache.set(blockType, texture);

            console.log(`✨ Generated mini texture: ${blockType}`);
            return texture;

        } catch (error) {
            console.warn(`⚠️ Failed to generate mini texture for ${blockType}:`, error);
            // Return null - caller will fallback to color-only
            return null;
        }
    }

    /**
     * Load image from URL
     */
    async loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load ${url}`));
            img.src = url;
        });
    }

    /**
     * Convert canvas to Blob
     */
    async canvasToBlob(canvas) {
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Canvas to blob failed'));
            }, 'image/png');
        });
    }

    /**
     * Convert Blob to THREE.Texture
     */
    async blobToTexture(blob) {
        const url = URL.createObjectURL(blob);
        const texture = new THREE.TextureLoader().load(url, () => {
            URL.revokeObjectURL(url); // Clean up object URL
        });

        // Configure texture for pixel art
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestMipMapLinearFilter;
        texture.generateMipmaps = true;

        return texture;
    }

    /**
     * Clear all cached mini textures
     */
    async clearCache() {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.clear();

            request.onsuccess = () => {
                this.memoryCache.clear();
                console.log('🗑️ Mini texture cache cleared');
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get cache statistics
     */
    async getStats() {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.count();

            request.onsuccess = () => {
                resolve({
                    indexedDBCount: request.result,
                    memoryCacheCount: this.memoryCache.size
                });
            };
            request.onerror = () => reject(request.error);
        });
    }
}
