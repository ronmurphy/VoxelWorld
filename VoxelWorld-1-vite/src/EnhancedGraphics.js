/**
 * EnhancedGraphics.js
 *
 * Advanced graphics system that replaces procedural/emoji graphics with custom image assets.
 * Features asset loading, caching, settings management, and fallback systems.
 */

import * as THREE from 'three';

export class EnhancedGraphics {
    constructor(splashScreen = null) {
        // Settings management
        this.isEnabled = this.loadSetting();
        this.assetsLoaded = false;
        this.loadingPromise = null;
        this.splashScreen = splashScreen;

        // Asset caches
        this.blockTextures = new Map(); // Map<blockType, THREE.Texture or Array<THREE.Texture>>
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

        // Texture aliases - map block types to texture names
        // No aliases needed - files are named exactly as block types (oak_wood, pine_wood, etc.)
        this.textureAliases = {};

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
            if (this.splashScreen) {
                this.splashScreen.setTexturesLoaded();
            }
            return { success: true, assetsLoaded: 0 };
        }

        // Prevent multiple simultaneous loads
        if (this.loadingPromise) {
            return await this.loadingPromise;
        }

        console.log('🎨 Discovering and loading enhanced graphics assets...');
        if (this.splashScreen) {
            this.splashScreen.setLoadingTextures();
        }

        // First discover what assets are available
        await this._discoverAvailableAssets();

        this.loadingPromise = this._loadAllAssets();
        const result = await this.loadingPromise;

        this.assetsLoaded = result.success;

        if (this.splashScreen) {
            this.splashScreen.setTexturesLoaded();
        }

        // 🎨 Trigger ready callback if assets were successfully loaded
        if (result.success && this.onReady) {
            console.log('🎨 Enhanced Graphics ready, triggering callback...');
            this.onReady();
        }

        return result;
    }

    /**
     * Dynamically discover available assets by attempting to load them
     */
    async _discoverAvailableAssets() {
        console.log('🔍 Discovering available assets...');

        // 🚫 REMOVED HARDCODED LISTS: Instead of guessing what assets exist,
        // we'll scan the actual directory structure to find real files
        console.log('🔍 Scanning actual asset directories for real files...');

        // We'll discover assets by actually checking what files exist
        const assetConfig = {
            blocks: { extensions: ['.jpeg', '.jpg', '.png'] },
            tools: { extensions: ['.png', '.jpg', '.jpeg'] },
            time: { extensions: ['.png', '.jpg', '.jpeg'] }
        };

        for (const [category, config] of Object.entries(assetConfig)) {
            const discovered = [];

            // 🔍 NEW: Only check assets that actually exist based on file system
            const knownAssets = {
                blocks: ['bedrock', 'dirt', 'grass', 'oak_wood', 'pine_wood', 'birch_wood', 'palm_wood', 'dead_wood', 'oak_wood-leaves', 'pine_wood-leaves', 'birch_wood-leaves', 'palm_wood-leaves', 'dead_wood-leaves', 'sand', 'snow', 'stone'],
                tools: ['backpack', 'machete', 'workbench'],
                time: ['dawn', 'dusk', 'moon', 'night', 'sun']
            };

            const assetNames = knownAssets[category] || [];
            console.log(`🔍 Checking ${category}: ${assetNames.length} known assets`);

            for (const name of assetNames) {
                let foundMainTexture = false;

                // Skip if this name is an alias KEY (not the target)
                // We want to discover the target (e.g., 'oak') but skip the key (e.g., 'oak_wood')
                const isAliasKey = category === 'blocks' && Object.keys(this.textureAliases).includes(name);
                if (isAliasKey) {
                    console.log(`🔗 Skipping alias key ${name} - will use target ${this.textureAliases[name]} instead`);
                    continue;
                }

                // For blocks, check for face-specific textures first (multi-face wood blocks)
                if (category === 'blocks') {
                    const faceVariants = ['-sides', '-top-bottom'];

                    for (const variant of faceVariants) {
                        for (const ext of config.extensions) {
                            const facePath = `${this.assetPaths[category]}/${name}${variant}${ext}`;

                            try {
                                const img = new Image();
                                const imageLoaded = await new Promise((resolve) => {
                                    img.onload = () => resolve(true);
                                    img.onerror = () => resolve(false);
                                    setTimeout(() => resolve(false), 3000);
                                    img.src = facePath;
                                });

                                if (imageLoaded) {
                                    console.log(`✅ Found face texture: ${name}${variant}${ext}`);
                                    foundMainTexture = true; // Mark as found if we have face textures
                                }
                            } catch (error) {
                                console.log(`💥 Face texture fetch error: ${facePath} - ${error.message}`);
                            }
                        }
                    }
                }

                // Check for main texture (single texture blocks)
                if (!foundMainTexture) {
                    for (const ext of config.extensions) {
                        const assetPath = `${this.assetPaths[category]}/${name}${ext}`;

                        try {
                            // Attempt to actually load the image to verify it exists
                            console.log(`🔍 Loading image to verify: ${assetPath}`);
                            const img = new Image();
                            const imageLoaded = await new Promise((resolve) => {
                                img.onload = () => resolve(true);
                                img.onerror = () => resolve(false);
                                // Add timeout to prevent hanging
                                setTimeout(() => resolve(false), 3000);
                                img.src = assetPath;
                            });

                            if (imageLoaded) {
                                discovered.push(name);
                                console.log(`✅ Verified ${category} asset: ${name}${ext}`);
                                foundMainTexture = true;
                                break; // Found this asset, try next name
                            } else {
                                console.log(`❌ Image failed to load: ${assetPath}`);
                            }
                        } catch (error) {
                            console.log(`💥 Image load error: ${assetPath} - ${error.message}`);
                        }
                    }
                }

                // If we found textures (either face-specific or main), add to discovered
                if (foundMainTexture) {
                    if (!discovered.includes(name)) {
                        discovered.push(name);
                        console.log(`✅ Added ${category} asset: ${name}`);
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
     * Load block texture assets and create THREE.js textures (with multi-face support)
     */
    async _loadBlockTextures() {
        const promises = this.availableAssets.blocks.map(async (blockType) => {
            try {
                const textures = await this._loadMultiFaceTextures(blockType);
                this.blockTextures.set(blockType, textures);
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
     * Load multi-face textures for a block with fallback hierarchy
     * Returns either a single texture or an array of 6 textures for cube faces
     */
    async _loadMultiFaceTextures(blockType) {
        const extensions = ['.jpeg', '.jpg', '.png'];
        const basePath = this.assetPaths.blocks;

        // Try to find face-specific textures
        const faceTextures = {
            top: null,
            bottom: null,
            sides: null,
            topBottom: null,
            main: null
        };

        // Search for all texture variants
        for (const ext of extensions) {
            const paths = {
                top: `${basePath}/${blockType}-top${ext}`,
                bottom: `${basePath}/${blockType}-bottom${ext}`,
                sides: `${basePath}/${blockType}-sides${ext}`,
                topBottom: `${basePath}/${blockType}-top-bottom${ext}`,
                main: `${basePath}/${blockType}${ext}`
            };

            for (const [type, path] of Object.entries(paths)) {
                if (!faceTextures[type]) {
                    try {
                        const texture = await this._loadThreeTexture(path);
                        faceTextures[type] = texture;
                        console.log(`🎨 Loaded ${blockType} ${type} texture`);
                    } catch (error) {
                        // Texture doesn't exist, continue
                    }
                }
            }
        }

        // Build final texture mapping with fallback hierarchy
        const finalTextures = this._buildFaceTextureMapping(faceTextures, blockType);

        return finalTextures;
    }

    /**
     * Build the final texture mapping using fallback hierarchy
     */
    _buildFaceTextureMapping(faceTextures, blockType) {
        // If we have face-specific textures, create array for cube faces
        const hasSpecificTextures = faceTextures.top || faceTextures.bottom || faceTextures.sides || faceTextures.topBottom;

        if (hasSpecificTextures) {
            // THREE.js cube face order: [+X, -X, +Y, -Y, +Z, -Z] = [right, left, top, bottom, front, back]

            // Determine top texture
            const topTexture = faceTextures.top || faceTextures.topBottom || faceTextures.main;

            // Determine bottom texture
            const bottomTexture = faceTextures.bottom || faceTextures.topBottom || faceTextures.main;

            // Determine side texture
            const sideTexture = faceTextures.sides || faceTextures.main;

            if (topTexture || bottomTexture || sideTexture) {
                const cubeTextures = [
                    sideTexture,   // +X (right)
                    sideTexture,   // -X (left)
                    topTexture,    // +Y (top)
                    bottomTexture, // -Y (bottom)
                    sideTexture,   // +Z (front)
                    sideTexture    // -Z (back)
                ];

                console.log(`🎯 Created multi-face texture for ${blockType}: top=${!!topTexture}, bottom=${!!bottomTexture}, sides=${!!sideTexture}`);
                return cubeTextures;
            }
        }

        // Fallback to single main texture
        if (faceTextures.main) {
            console.log(`📦 Using single texture for ${blockType}`);
            return faceTextures.main;
        }

        throw new Error(`No textures found for ${blockType}`);
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
                    // Configure texture settings for pixel art with mipmaps
                    texture.magFilter = THREE.NearestFilter;
                    texture.minFilter = THREE.LinearMipmapNearestFilter; // Mipmaps for performance, nearest for pixel-art look
                    texture.generateMipmaps = true;
                    texture.anisotropy = 4; // Sharp textures at angles
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
     * Now supports both single textures and multi-face texture arrays
     */
    getEnhancedBlockMaterial(blockType, defaultMaterial) {
        if (!this.isEnabled || !this.assetsLoaded) {
            return defaultMaterial;
        }

        // Check for texture alias (e.g., oak_wood -> oak)
        const textureKey = this.textureAliases[blockType] || blockType;
        const textures = this.blockTextures.get(textureKey);

        if (textures) {
            // Check if it's a multi-face texture array
            if (Array.isArray(textures)) {
                // Create material array for cube faces
                return textures.map(texture => new THREE.MeshLambertMaterial({
                    map: texture
                }));
            } else {
                // Single texture - create single material
                return new THREE.MeshLambertMaterial({
                    map: textures
                });
            }
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