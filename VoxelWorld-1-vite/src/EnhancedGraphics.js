/**
 * EnhancedGraphics.js
 *
 * Advanced graphics system that replaces procedural/emoji graphics with custom image assets.
 * Features asset loading, caching, settings management, and fallback systems.
 */

import * as THREE from 'three';

export class EnhancedGraphics {
    constructor() {
        // Settings management
        this.isEnabled = this.loadSetting();
        this.assetsLoaded = false;
        this.loadingPromise = null;

        // Asset caches
        this.blockTextures = new Map(); // Map<blockType, THREE.Texture>
        this.toolImages = new Map();    // Map<toolType, HTMLImageElement>
        this.timeImages = new Map();    // Map<timePeriod, HTMLImageElement>

        // Asset paths (relative to document root)
        this.assetPaths = {
            blocks: 'assets/art/blocks',
            tools: 'assets/art/tools',
            time: 'assets/art/time'
        };

        // Available assets - will be discovered dynamically
        this.availableAssets = {
            blocks: [],
            tools: [],
            time: []
        };

        // UI element size configurations
        this.uiSizes = {
            hotbarIcon: 16,     // Small icons in hotbar slots
            inventoryIcon: 20,  // Medium icons in backpack inventory
            statusIcon: 24,     // Icons in status messages
            timeIndicator: 32,  // Main time indicator in top-left
            workbenchIcon: 28   // Icons in workbench interface
        };

        console.log('🎨 EnhancedGraphics initialized:', {
            enabled: this.isEnabled,
            availableAssets: this.availableAssets
        });
    }

    /**
     * Load enhanced graphics setting from localStorage
     */
    loadSetting() {
        const stored = localStorage.getItem('enhanced_graphics_enabled');
        return stored === 'true'; // Default to false if not set
    }

    /**
     * Save enhanced graphics setting to localStorage
     */
    saveSetting(enabled) {
        this.isEnabled = enabled;
        localStorage.setItem('enhanced_graphics_enabled', enabled.toString());
        console.log(`🎨 Enhanced Graphics ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }

    /**
     * Toggle enhanced graphics on/off
     */
    toggle() {
        this.saveSetting(!this.isEnabled);
        // Return the new state so caller can handle any UI updates
        return this.isEnabled;
    }

    /**
     * Initialize and load all assets if enhanced graphics is enabled
     */
    async initialize() {
        if (!this.isEnabled) {
            console.log('🎨 Enhanced Graphics disabled - skipping asset loading');
            return { success: true, assetsLoaded: 0 };
        }

        // Prevent multiple simultaneous loads
        if (this.loadingPromise) {
            return await this.loadingPromise;
        }

        console.log('🎨 Discovering and loading enhanced graphics assets...');

        // First discover what assets are available
        await this._discoverAvailableAssets();

        this.loadingPromise = this._loadAllAssets();
        const result = await this.loadingPromise;

        this.assetsLoaded = result.success;
        return result;
    }

    /**
     * Dynamically discover available assets by attempting to load them
     */
    async _discoverAvailableAssets() {
        console.log('🔍 Discovering available assets...');

        // Asset types and their expected file extensions
        const assetConfig = {
            blocks: { extensions: ['.jpeg', '.jpg', '.png'], commonNames: ['bedrock', 'dirt', 'sand', 'snow', 'stone', 'wood', 'iron', 'coal', 'diamond', 'emerald', 'gold', 'obsidian', 'glass', 'brick', 'cobblestone', 'gravel', 'clay', 'moss', 'grass', 'water', 'lava'] },
            tools: { extensions: ['.png', '.jpg', '.jpeg'], commonNames: ['backpack', 'machete', 'workbench', 'pickaxe', 'axe', 'shovel', 'sword', 'bow', 'hammer', 'hoe'] },
            time: { extensions: ['.png', '.jpg', '.jpeg'], commonNames: ['dawn', 'dusk', 'moon', 'night', 'sun', 'morning', 'afternoon', 'evening', 'midnight'] }
        };

        for (const [category, config] of Object.entries(assetConfig)) {
            const discovered = [];

            // Try common asset names with different extensions
            for (const name of config.commonNames) {
                for (const ext of config.extensions) {
                    const assetPath = `${this.assetPaths[category]}/${name}${ext}`;

                    try {
                        // Attempt to fetch the asset to see if it exists
                        const response = await fetch(assetPath, { method: 'HEAD' });
                        if (response.ok) {
                            discovered.push(name);
                            console.log(`✅ Found ${category} asset: ${name}${ext}`);
                            break; // Found this asset, try next name
                        }
                    } catch (error) {
                        // Asset doesn't exist, continue to next extension/name
                    }
                }
            }

            this.availableAssets[category] = discovered;
            console.log(`🎨 ${category}: ${discovered.length} assets discovered -`, discovered);
        }
    }

    /**
     * Load all asset types (blocks, tools, time)
     */
    async _loadAllAssets() {
        const results = await Promise.allSettled([
            this._loadBlockTextures(),
            this._loadToolImages(),
            this._loadTimeImages()
        ]);

        let totalLoaded = 0;
        let totalErrors = 0;

        results.forEach((result, index) => {
            const category = ['blocks', 'tools', 'time'][index];
            if (result.status === 'fulfilled') {
                totalLoaded += result.value.loaded;
                console.log(`✅ ${category}: ${result.value.loaded} assets loaded`);
            } else {
                totalErrors++;
                console.error(`❌ ${category} loading failed:`, result.reason);
            }
        });

        const success = totalLoaded > 0; // Success if we loaded anything
        console.log(`🎨 Asset loading complete: ${totalLoaded} loaded, ${totalErrors} categories failed`);

        return { success, assetsLoaded: totalLoaded, errors: totalErrors };
    }

    /**
     * Load block texture assets and create THREE.js textures
     */
    async _loadBlockTextures() {
        const promises = this.availableAssets.blocks.map(async (blockType) => {
            try {
                const imagePath = `${this.assetPaths.blocks}/${blockType}.jpeg`;
                const texture = await this._loadThreeTexture(imagePath);
                this.blockTextures.set(blockType, texture);
                return { blockType, success: true };
            } catch (error) {
                console.warn(`⚠️ Failed to load block texture: ${blockType}`, error);
                return { blockType, success: false, error };
            }
        });

        const results = await Promise.allSettled(promises);
        const loaded = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

        return { loaded, total: this.availableAssets.blocks.length };
    }

    /**
     * Load tool image assets
     */
    async _loadToolImages() {
        const promises = this.availableAssets.tools.map(async (toolType) => {
            try {
                const imagePath = `${this.assetPaths.tools}/${toolType}.png`;
                const image = await this._loadImage(imagePath);
                // Store both the image and the relative path
                this.toolImages.set(toolType, {
                    image: image,
                    path: imagePath
                });
                return { toolType, success: true };
            } catch (error) {
                console.warn(`⚠️ Failed to load tool image: ${toolType}`, error);
                return { toolType, success: false, error };
            }
        });

        const results = await Promise.allSettled(promises);
        const loaded = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

        return { loaded, total: this.availableAssets.tools.length };
    }

    /**
     * Load time icon assets
     */
    async _loadTimeImages() {
        const promises = this.availableAssets.time.map(async (timePeriod) => {
            try {
                const imagePath = `${this.assetPaths.time}/${timePeriod}.png`;
                const image = await this._loadImage(imagePath);
                // Store both the image and the relative path
                this.timeImages.set(timePeriod, {
                    image: image,
                    path: imagePath
                });
                return { timePeriod, success: true };
            } catch (error) {
                console.warn(`⚠️ Failed to load time image: ${timePeriod}`, error);
                return { timePeriod, success: false, error };
            }
        });

        const results = await Promise.allSettled(promises);
        const loaded = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

        return { loaded, total: this.availableAssets.time.length };
    }

    /**
     * Create a THREE.js texture from an image path
     */
    async _loadThreeTexture(imagePath) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            loader.load(
                imagePath,
                (texture) => {
                    // Configure texture settings for pixel art
                    texture.magFilter = THREE.NearestFilter;
                    texture.minFilter = THREE.NearestFilter;
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    resolve(texture);
                },
                undefined, // onProgress
                (error) => reject(error)
            );
        });
    }

    /**
     * Load an HTML image element from a path
     */
    async _loadImage(imagePath) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = imagePath;
        });
    }

    // === PUBLIC API METHODS ===

    /**
     * Get enhanced block material or fall back to default
     */
    getEnhancedBlockMaterial(blockType, defaultMaterial) {
        if (!this.isEnabled || !this.assetsLoaded) {
            return defaultMaterial;
        }

        const texture = this.blockTextures.get(blockType);
        if (texture) {
            // Create new material with the texture applied
            return new THREE.MeshLambertMaterial({
                map: texture,
                // Keep some of the original color as tint if desired
                // color: defaultMaterial.color
            });
        }

        return defaultMaterial;
    }

    /**
     * Get enhanced tool icon or fall back to emoji
     * @param {string} toolType - Type of tool (machete, workbench, etc.)
     * @param {string} defaultEmoji - Fallback emoji
     * @param {number} size - Size in pixels (default: 20)
     */
    getEnhancedToolIcon(toolType, defaultEmoji, size = 20) {
        if (!this.isEnabled || !this.assetsLoaded) {
            return defaultEmoji;
        }

        const imageData = this.toolImages.get(toolType);
        if (imageData && imageData.path) {
            // Return HTML img element with proper scaling using relative path
            return `<img src="${imageData.path}" style="width: ${size}px; height: ${size}px; object-fit: contain; vertical-align: middle;" alt="${toolType}">`;
        }

        return defaultEmoji;
    }

    /**
     * Get enhanced material icon or fall back to emoji
     * @param {string} materialType - Type of material (stone, dirt, sand, etc.)
     * @param {string} defaultEmoji - Fallback emoji
     * @param {number} size - Size in pixels (default: 20)
     */
    getEnhancedMaterialIcon(materialType, defaultEmoji, size = 20) {
        if (!this.isEnabled || !this.assetsLoaded) {
            return defaultEmoji;
        }

        // Check if we have a block texture for this material
        const image = this.blockTextures.get(materialType);
        if (image && image.image && image.image.src) {
            // Return HTML img element with proper scaling
            return `<img src="${image.image.src}" style="width: ${size}px; height: ${size}px; object-fit: contain; vertical-align: middle; border-radius: 2px;" alt="${materialType}">`;
        }

        return defaultEmoji;
    }

    /**
     * Get enhanced time icon or fall back to material icon
     * @param {string} timePeriod - Time period (sun, moon, dawn, dusk, night)
     * @param {string} defaultMaterialIcon - Fallback material icon name
     * @param {number} size - Size in pixels (default: 32 to match current time indicator)
     */
    getEnhancedTimeIcon(timePeriod, defaultMaterialIcon, size = 32) {
        if (!this.isEnabled || !this.assetsLoaded) {
            return { type: 'material', content: defaultMaterialIcon };
        }

        const imageData = this.timeImages.get(timePeriod);
        if (imageData && imageData.path) {
            // Return image data with sizing for UI to render using relative path
            return {
                type: 'image',
                content: imageData.path,
                alt: timePeriod,
                style: `width: ${size}px; height: ${size}px; object-fit: contain;`
            };
        }

        return { type: 'material', content: defaultMaterialIcon };
    }

    /**
     * Check if enhanced graphics is enabled and assets are loaded
     */
    isReady() {
        return this.isEnabled && this.assetsLoaded;
    }

    /**
     * Get loading status
     */
    getStatus() {
        return {
            enabled: this.isEnabled,
            assetsLoaded: this.assetsLoaded,
            blockTexturesCount: this.blockTextures.size,
            toolImagesCount: this.toolImages.size,
            timeImagesCount: this.timeImages.size
        };
    }

    // === CONVENIENCE METHODS WITH PREDEFINED SIZES ===

    /**
     * Get tool icon for hotbar (16px)
     */
    getHotbarToolIcon(toolType, defaultEmoji) {
        return this.getEnhancedToolIcon(toolType, defaultEmoji, this.uiSizes.hotbarIcon);
    }

    /**
     * Get tool icon for inventory (20px)
     */
    getInventoryToolIcon(toolType, defaultEmoji) {
        return this.getEnhancedToolIcon(toolType, defaultEmoji, this.uiSizes.inventoryIcon);
    }

    /**
     * Get tool icon for status messages (24px)
     */
    getStatusToolIcon(toolType, defaultEmoji) {
        return this.getEnhancedToolIcon(toolType, defaultEmoji, this.uiSizes.statusIcon);
    }

    /**
     * Get tool icon for workbench interface (28px)
     */
    getWorkbenchToolIcon(toolType, defaultEmoji) {
        return this.getEnhancedToolIcon(toolType, defaultEmoji, this.uiSizes.workbenchIcon);
    }

    /**
     * Get material icon for hotbar (16px)
     */
    getHotbarMaterialIcon(materialType, defaultEmoji) {
        return this.getEnhancedMaterialIcon(materialType, defaultEmoji, this.uiSizes.hotbarIcon);
    }

    /**
     * Get material icon for inventory (20px)
     */
    getInventoryMaterialIcon(materialType, defaultEmoji) {
        return this.getEnhancedMaterialIcon(materialType, defaultEmoji, this.uiSizes.inventoryIcon);
    }

    /**
     * Get material icon for status messages (24px)
     */
    getStatusMaterialIcon(materialType, defaultEmoji) {
        return this.getEnhancedMaterialIcon(materialType, defaultEmoji, this.uiSizes.statusIcon);
    }

    /**
     * Get time icon for main time indicator (32px)
     */
    getTimeIndicatorIcon(timePeriod, defaultMaterialIcon) {
        return this.getEnhancedTimeIcon(timePeriod, defaultMaterialIcon, this.uiSizes.timeIndicator);
    }

    /**
     * Map time periods to asset names
     */
    getTimePeriodAssetName(time) {
        if (time >= 6 && time < 8) return 'dawn';
        if (time >= 8 && time < 17) return 'sun';
        if (time >= 17 && time < 19) return 'dusk';
        if (time >= 19 && time < 21) return 'moon';
        return 'night';
    }
}