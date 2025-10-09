/**
 * MiniTextureLoader.js - Unified mini texture loader
 *
 * Environment-aware texture loading:
 * - Electron: Load pre-generated files from art/chunkMinis/
 * - Browser: Use IndexedDB cache with on-demand generation
 */

import * as THREE from 'three';
import { MiniTextureCache } from './MiniTextureCache.js';

export class MiniTextureLoader {
    constructor() {
        // Detect environment
        this.isElectron = this.detectElectron();

        // Initialize appropriate backend
        if (this.isElectron) {
            console.log('🖥️ MiniTextureLoader: Electron mode (pre-generated files)');
            this.loader = new THREE.TextureLoader();
        } else {
            console.log('🌐 MiniTextureLoader: Browser mode (IndexedDB cache)');
            this.cache = new MiniTextureCache();
        }

        // Memory pool for loaded textures (avoid duplicate loads)
        this.texturePool = new Map();
    }

    /**
     * Detect if running in Electron
     */
    detectElectron() {
        // Check for Electron-specific globals
        if (typeof window !== 'undefined') {
            return !!(window.process && window.process.type);
        }
        return false;
    }

    /**
     * Load mini texture for a block type
     * @param {string} blockType - Block type name (e.g., "grass", "stone")
     * @returns {Promise<THREE.Texture|null>}
     */
    async load(blockType) {
        // Check pool first
        if (this.texturePool.has(blockType)) {
            return this.texturePool.get(blockType);
        }

        let texture;

        if (this.isElectron) {
            // Electron: Load pre-generated file
            texture = await this.loadFromFile(blockType);
        } else {
            // Browser: Load from IndexedDB cache (or generate)
            texture = await this.cache.loadOrGenerate(blockType);
        }

        // Pool the texture (if successfully loaded)
        if (texture) {
            this.texturePool.set(blockType, texture);
        }

        return texture;
    }

    /**
     * Load pre-generated mini texture from file (Electron mode)
     */
    async loadFromFile(blockType) {
        return new Promise((resolve) => {
            const path = `art/chunkMinis/${blockType}.png`;

            this.loader.load(
                path,
                (texture) => {
                    // Configure for pixel art
                    texture.magFilter = THREE.NearestFilter;
                    texture.minFilter = THREE.NearestMipMapLinearFilter;
                    texture.generateMipmaps = true;

                    console.log(`✅ Loaded mini texture: ${blockType}`);
                    resolve(texture);
                },
                undefined,
                (error) => {
                    console.warn(`⚠️ Failed to load mini texture: ${blockType}`, error);
                    resolve(null); // Fallback to color-only
                }
            );
        });
    }

    /**
     * Preload multiple textures (useful for common block types)
     * @param {string[]} blockTypes - Array of block type names
     */
    async preload(blockTypes) {
        console.log(`🔄 Preloading ${blockTypes.length} mini textures...`);

        const promises = blockTypes.map(type => this.load(type));
        const results = await Promise.allSettled(promises);

        const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
        console.log(`✅ Preloaded ${successful}/${blockTypes.length} mini textures`);
    }

    /**
     * Get texture from pool (synchronous, must be pre-loaded)
     * @param {string} blockType
     * @returns {THREE.Texture|null}
     */
    get(blockType) {
        return this.texturePool.get(blockType) || null;
    }

    /**
     * Check if texture is loaded
     */
    has(blockType) {
        return this.texturePool.has(blockType);
    }

    /**
     * Clear texture pool and cache
     */
    async clear() {
        // Dispose all textures
        for (const texture of this.texturePool.values()) {
            texture.dispose();
        }
        this.texturePool.clear();

        // Clear IndexedDB cache (browser mode only)
        if (!this.isElectron && this.cache) {
            await this.cache.clearCache();
        }

        console.log('🗑️ MiniTextureLoader cleared');
    }

    /**
     * Get loader statistics
     */
    async getStats() {
        const stats = {
            environment: this.isElectron ? 'Electron' : 'Browser',
            pooledTextures: this.texturePool.size,
            indexedDBCache: null
        };

        if (!this.isElectron && this.cache) {
            const cacheStats = await this.cache.getStats();
            stats.indexedDBCache = cacheStats;
        }

        return stats;
    }
}
