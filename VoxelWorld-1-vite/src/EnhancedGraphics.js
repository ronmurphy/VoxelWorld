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
        this.entityImages = new Map();  // Map<entityType, HTMLImageElement>

        // Asset paths (relative to document root)
        // Vite publicDir is 'assets', so everything in assets/ becomes root-level
        // Path 'art/tools' maps to 'assets/art/tools' on disk
        console.log('🎨 Using Vite publicDir paths (assets/ → /)');
        this.assetPaths = {
            blocks: 'art/blocks',
            tools: 'art/tools',
            time: 'art/time',
            entities: 'art/entities',
            food: 'art/food'
        };

        console.log('🎨 Final asset paths:', this.assetPaths);

        // Available assets - will be discovered dynamically
        this.availableAssets = {
            blocks: [],
            tools: [],
            time: [],
            entities: [],
            food: []
        };

        // Texture aliases - map item/block types to texture filenames
        // Use when code uses different names than files (e.g., tool_bench → toolbench)
        this.textureAliases = {
            tool_bench: 'toolbench',              // Code uses tool_bench, file is toolbench.png
            grappling_hook: 'grapple',            // Code uses grappling_hook, file is grapple.png
            crafted_grappling_hook: 'grapple',    // Crafted version also maps to grapple.png
            magic_amulet: 'cryatal',              // magic_amulet uses cryatal.png (typo in filename)
            crafted_magic_amulet: 'cryatal',      // Crafted version also maps to cryatal.png
            crafted_club: 'club',                 // Crafted versions
            crafted_stone_spear: 'stone_spear',
            crafted_torch: 'torch',
            crafted_wood_shield: 'wood_shield',
            crafted_combat_sword: 'sword',
            crafted_mining_pick: 'pickaxe',
            crafted_stone_hammer: 'stone_hammer',
            crafted_machete: 'machete',
            crafted_compass: 'compass',
            crafted_compass_upgrade: 'compass',
            crafted_speed_boots: 'boots_speed',
            // Farming items
            crafted_hoe: 'stick',  // Temporary: using stick.png until hoe.png is created
            hoe: 'stick',          // Temporary: using stick.png until hoe.png is created
            crafted_watering_can: 'watering_can',  // Will use emoji fallback until watering_can.png is created
            watering_can: 'watering_can'           // Will use emoji fallback until watering_can.png is created
        };

        // UI element size configurations
        this.uiSizes = {
            hotbarIcon: 36,     // Large icons in hotbar slots (matches emoji size)
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
        // Default to enabled (true) if not explicitly set to 'false'
        return stored !== 'false';
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
     * Try to load asset manifest (fileList.json) from category
     * Returns { baseName: extension } map, or null if not found
     */
    async _loadManifest(category) {
        try {
            const manifestPath = `${this.assetPaths[category]}/fileList.json`;
            const response = await fetch(manifestPath);
            
            if (!response.ok) {
                return null; // Manifest doesn't exist, use fallback
            }
            
            const manifest = await response.json();
            console.log(`📋 Loaded manifest for ${category}: ${Object.keys(manifest).length} entries`);
            return manifest;
        } catch (error) {
            // Manifest not found or invalid - this is fine, we'll use discovery fallback
            return null;
        }
    }

    /**
     * Parse manifest into availableAssets and fileExtensionMap
     */
    _parseManifest(category, manifest) {
        const baseNames = new Set();
        
        // Build extension map and track what we have
        const filesByBase = {};
        
        Object.entries(manifest).forEach(([variant, ext]) => {
            // Store extension for this variant
            this.fileExtensionMap[category][variant] = ext;
            
            // Extract base name (remove -sides, -top-bottom, etc.)
            const baseName = variant.replace(/-(sides|top|bottom|top-bottom|all)$/i, '');
            
            // Track variants by base name
            if (!filesByBase[baseName]) {
                filesByBase[baseName] = { main: false, variants: [] };
            }
            
            if (baseName === variant) {
                filesByBase[baseName].main = true;
            } else {
                filesByBase[baseName].variants.push(variant);
            }
        });
        
        // Only include base names that have a main texture OR valid variants
        Object.keys(filesByBase).forEach(baseName => {
            const info = filesByBase[baseName];
            // Include if has main texture, OR has both sides and top-bottom variants
            if (info.main || info.variants.length >= 2) {
                baseNames.add(baseName);
            }
        });
        
        this.availableAssets[category] = Array.from(baseNames);
        
        // Apply texture aliases (add aliased names to available assets)
        const aliasedNames = [];
        baseNames.forEach(name => {
            if (this.textureAliases[name]) {
                aliasedNames.push(this.textureAliases[name]);
            }
        });
        aliasedNames.forEach(alias => this.availableAssets[category].push(alias));
        
        return { count: this.availableAssets[category].length, aliases: aliasedNames.length };
    }

    /**
     * Discover available assets by listing directory contents
     */
    async _discoverAvailableAssets() {
        console.log('🔍 Discovering assets...');

        const isElectron = typeof window !== 'undefined' && window.electronAPI;
        console.log('🔍 Electron detection:', { isElectron, hasElectronAPI: !!window.electronAPI, hasListAssetFiles: !!(window.electronAPI?.listAssetFiles) });

        // Store file extension map for efficient loading
        this.fileExtensionMap = {
            blocks: {},
            tools: {},
            time: {},
            entities: {},
            food: {}
        };

        // === STRATEGY 1: Try loading manifests first (fastest, cleanest) ===
        let manifestsLoaded = false;
        try {
            console.log('📋 Trying to load asset manifests...');
            const categories = ['blocks', 'tools', 'time', 'entities', 'food'];
            const manifestPromises = categories.map(cat => this._loadManifest(cat));
            const manifests = await Promise.all(manifestPromises);
            
            let successCount = 0;
            manifests.forEach((manifest, idx) => {
                const category = categories[idx];
                if (manifest) {
                    const result = this._parseManifest(category, manifest);
                    console.log(`✅ ${category}: ${result.count} assets found (including ${result.aliases} aliases)`);
                    
                    if (category === 'blocks') {
                        const woodBlocks = this.availableAssets[category].filter(name => 
                            name.includes('wood') || name.includes('oak') || name.includes('pine') || name.includes('birch')
                        );
                        console.log(`   🌲 Wood blocks found:`, woodBlocks);
                    }
                    successCount++;
                }
            });
            
            if (successCount === categories.length) {
                manifestsLoaded = true;
                console.log('✅ All manifests loaded successfully!');
            } else {
                console.log(`⚠️ Only ${successCount}/${categories.length} manifests loaded, falling back to discovery`);
            }
        } catch (error) {
            console.log('⚠️ Manifest loading failed, falling back to discovery:', error.message);
        }

        // === STRATEGY 2: Fallback to filesystem discovery (if manifests not available) ===
        if (!manifestsLoaded) {
            // Extract base name and extension from filename
            const parseFilename = (filename) => {
                const match = filename.match(/^(.+)\.(jpeg|jpg|png)$/i);
                if (!match) return null;

                const nameWithExt = match[1];
                const ext = `.${match[2].toLowerCase()}`;

                // Remove variant suffixes like -sides, -top-bottom, -all to get base name
                const baseName = nameWithExt.replace(/-(sides|top|bottom|top-bottom|all)$/i, '');

                return { baseName, variant: nameWithExt, ext };
            };

            if (isElectron && window.electronAPI.listAssetFiles) {
                // Electron: Use filesystem API to list actual files
                console.log('🔍 Using Electron filesystem API for asset discovery');

            for (const category of ['blocks', 'tools', 'time', 'entities', 'food']) {
                try {
                    const files = await window.electronAPI.listAssetFiles(category);
                    const baseNames = new Set();

                    // Build extension map and track what we have
                    const filesByBase = {};

                    files.forEach(file => {
                        const parsed = parseFilename(file);
                        if (parsed) {
                            // Store extension for this variant
                            this.fileExtensionMap[category][parsed.variant] = parsed.ext;

                            // Track variants by base name
                            if (!filesByBase[parsed.baseName]) {
                                filesByBase[parsed.baseName] = { main: false, variants: [] };
                            }

                            if (parsed.baseName === parsed.variant) {
                                filesByBase[parsed.baseName].main = true;
                            } else {
                                filesByBase[parsed.baseName].variants.push(parsed.variant);
                            }
                        }
                    });

                    // Only include base names that have a main texture OR valid variants
                    Object.keys(filesByBase).forEach(baseName => {
                        const info = filesByBase[baseName];
                        // Include if has main texture, OR has both sides and top-bottom variants
                        if (info.main || info.variants.length >= 2) {
                            baseNames.add(baseName);
                        }
                    });

                    this.availableAssets[category] = Array.from(baseNames);

                    // Apply texture aliases (add aliased names to available assets)
                    const aliasedNames = [];
                    baseNames.forEach(name => {
                        if (this.textureAliases[name]) {
                            aliasedNames.push(this.textureAliases[name]);
                        }
                    });
                    aliasedNames.forEach(alias => this.availableAssets[category].push(alias));

                    console.log(`✅ ${category}: ${this.availableAssets[category].length} assets found (including ${aliasedNames.length} aliases)`);
                    
                    // Debug: Show wood block textures found
                    if (category === 'blocks') {
                        const woodBlocks = this.availableAssets[category].filter(name => 
                            name.includes('wood') || name.includes('oak') || name.includes('pine') || name.includes('birch')
                        );
                        console.log(`   🌲 Wood blocks found:`, woodBlocks);
                    }
                } catch (error) {
                    console.warn(`Failed to list ${category} assets:`, error);
                    this.availableAssets[category] = [];
                }
            }
        } else {
            // Web: Use fetch HEAD requests
            console.log('🔍 Using fetch HEAD requests for asset discovery');

            const fileExists = async (path) => {
                try {
                    const response = await fetch(path, { method: 'HEAD' });
                    return response.ok;
                } catch {
                    return false;
                }
            };

            const findFile = async (basePath, name, extensions) => {
                for (const ext of extensions) {
                    const exists = await fileExists(`${basePath}/${name}${ext}`);
                    if (exists) return true;
                }
                return false;
            };

            const extensions = {
                blocks: ['.jpeg', '.jpg', '.png'],
                tools: ['.png', '.jpg', '.jpeg'],
                time: ['.png', '.jpg', '.jpeg'],
                entities: ['.png', '.jpg', '.jpeg'],
                food: ['.png', '.jpg', '.jpeg']
            };

            const candidates = {
                blocks: [
                    'bedrock', 'dirt', 'grass', 'sand', 'snow', 'stone', 'pumpkin', 'iron', 'gold',
                    'oak_wood', 'pine_wood', 'birch_wood', 'palm_wood', 'dead_wood', 'douglas_fir', 'christmas_tree',
                    'oak_wood-leaves', 'pine_wood-leaves', 'birch_wood-leaves', 'palm_wood-leaves', 'dead_wood-leaves', 'douglas_fir-leaves', 'christmas_tree-leaves',
                    'gift_wrapped', 'gift_wrapped-all', 'tilled_soil'
                ],
                tools: [
                    'backpack', 'machete', 'stick', 'stone_hammer', 'workbench', 'pumpkin', 
                    'compass', 'toolbench', 'tool_bench', 'grapple', 'sword', 'pickaxe',
                    'boots_speed', 'cryatal', 'club', 'stone_spear', 'torch', 'wood_shield',
                    // Materials and discovery items (all in /tools/ folder)
                    'coal', 'gold', 'iron', 'feather', 'fur', 'skull', 'flower', 'leaf',
                    'hoe'  // Farming tool
                ],
                time: ['dawn', 'dusk', 'moon', 'night', 'sun'],
                entities: ['ghost', 'angry_ghost'],
                food: ['wheat_seeds', 'carrot_seeds', 'pumpkin_seeds', 'berry_seeds', 'rice', 'corn_ear']
            };

            for (const [category, names] of Object.entries(candidates)) {
                const discovered = [];
                for (const name of names) {
                    const exists = await findFile(this.assetPaths[category], name, extensions[category]);
                    if (exists) discovered.push(name);
                }
                this.availableAssets[category] = discovered;
            }
        }

        console.log('✅ Assets discovered:', {
            blocks: this.availableAssets.blocks.length,
            tools: this.availableAssets.tools.length,
            time: this.availableAssets.time.length,
            entities: this.availableAssets.entities.length,
            food: this.availableAssets.food.length
        });
        } // End of !manifestsLoaded fallback
    }

    /**
     * Load all asset types (blocks, tools, time, entities)
     */
    async _loadAllAssets() {
        const results = await Promise.allSettled([
            this._loadBlockTextures(),
            this._loadToolImages(),
            this._loadTimeImages(),
            this._loadEntityImages(),
            this._loadFoodImages()
        ]);

        let totalLoaded = 0;
        let totalErrors = 0;

        results.forEach((result, index) => {
            const category = ['blocks', 'tools', 'time', 'entities', 'food'][index];
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
        const basePath = this.assetPaths.blocks;

        // Define which blocks have multi-face textures (wood blocks, pumpkin, ores, etc - not leaves)
        const multiFaceBlocks = ['oak_wood', 'pine_wood', 'birch_wood', 'palm_wood', 'dead_wood', 'douglas_fir', 'pumpkin', 'iron', 'gold', 'gift_wrapped', 'tilled_soil'];
        const isMultiFace = multiFaceBlocks.includes(blockType);

        const faceTextures = {
            all: null,      // -all suffix (same texture on all 6 faces)
            sides: null,
            topBottom: null,
            main: null
        };

        // Helper to load texture using known extension from file map
        const tryLoadTexture = async (baseName) => {
            // Check if we have a known extension for this file
            const knownExt = this.fileExtensionMap?.blocks?.[baseName];

            if (knownExt) {
                // Use the exact extension we discovered
                const path = `${basePath}/${baseName}${knownExt}`;
                try {
                    return await this._loadThreeTexture(path);
                } catch (error) {
                    console.warn(`Failed to load known texture: ${path}`);
                }
            } else {
                // Fallback: try all extensions (for web compatibility)
                for (const ext of ['.jpeg', '.jpg', '.png']) {
                    const path = `${basePath}/${baseName}${ext}`;
                    try {
                        return await this._loadThreeTexture(path);
                    } catch (error) {
                        // Try next extension
                    }
                }
            }
            return null;
        };

        // Load textures based on block type
        if (isMultiFace) {
            // Try -all suffix first (same texture on all 6 faces)
            faceTextures.all = await tryLoadTexture(`${blockType}-all`);

            if (!faceTextures.all) {
                // Try sides texture
                faceTextures.sides = await tryLoadTexture(`${blockType}-sides`);

                // Try combined top-bottom texture first
                faceTextures.topBottom = await tryLoadTexture(`${blockType}-top-bottom`);

                // If no combined texture, try separate top and bottom
                if (!faceTextures.topBottom) {
                    faceTextures.top = await tryLoadTexture(`${blockType}-top`);
                    faceTextures.bottom = await tryLoadTexture(`${blockType}-bottom`);
                }
            }

            if (faceTextures.all || faceTextures.sides || faceTextures.topBottom || faceTextures.top || faceTextures.bottom) {
                console.log(`🎨 Loaded ${blockType} multi-face textures (all=${!!faceTextures.all})`);
            }
        }

        // Always try main texture as fallback
        if (!faceTextures.all && !faceTextures.sides && !faceTextures.topBottom) {
            faceTextures.main = await tryLoadTexture(blockType);
            if (faceTextures.main) {
                console.log(`🎨 Loaded ${blockType} main texture`);
            }
        }

        const finalTextures = this._buildFaceTextureMapping(faceTextures, blockType);
        return finalTextures;
    }

    /**
     * Build the final texture mapping using fallback hierarchy
     */
    _buildFaceTextureMapping(faceTextures, blockType) {
        // If -all texture exists, use it for all 6 faces
        if (faceTextures.all) {
            const cubeTextures = [
                faceTextures.all,   // +X (right)
                faceTextures.all,   // -X (left)
                faceTextures.all,   // +Y (top)
                faceTextures.all,   // -Y (bottom)
                faceTextures.all,   // +Z (front)
                faceTextures.all    // -Z (back)
            ];

            console.log(`🎯 Created -all texture for ${blockType}: same texture on all 6 faces`);
            return cubeTextures;
        }

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
                // Apply alias mapping: tool_bench → toolbench for file loading
                const actualFilename = this.textureAliases[toolType] || toolType;
                
                // Try loading with known extension first, then fallback to trying all
                const knownExt = this.fileExtensionMap?.tools?.[actualFilename];
                let imagePath;
                let image;
                
                if (knownExt) {
                    imagePath = `${this.assetPaths.tools}/${actualFilename}${knownExt}`;
                    try {
                        image = await this._loadImage(imagePath);
                    } catch (e) {
                        // Fall through to try all extensions
                    }
                }
                
                if (!image) {
                    // Try all possible extensions
                    for (const ext of ['.png', '.jpg', '.jpeg']) {
                        try {
                            imagePath = `${this.assetPaths.tools}/${actualFilename}${ext}`;
                            image = await this._loadImage(imagePath);
                            break;
                        } catch (e) {
                            // Continue to next extension
                        }
                    }
                }
                
                if (image) {
                    // Store both the image and the relative path (using original toolType as key)
                    this.toolImages.set(toolType, {
                        image: image,
                        path: imagePath
                    });
                    return { toolType, success: true };
                } else {
                    throw new Error(`No image found for ${actualFilename}`);
                }
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
                // Try loading with known extension first, then fallback
                const knownExt = this.fileExtensionMap?.time?.[timePeriod];
                let imagePath;
                let image;
                
                if (knownExt) {
                    imagePath = `${this.assetPaths.time}/${timePeriod}${knownExt}`;
                    try {
                        image = await this._loadImage(imagePath);
                    } catch (e) {
                        // Fall through
                    }
                }
                
                if (!image) {
                    for (const ext of ['.png', '.jpg', '.jpeg']) {
                        try {
                            imagePath = `${this.assetPaths.time}/${timePeriod}${ext}`;
                            image = await this._loadImage(imagePath);
                            break;
                        } catch (e) {
                            // Continue
                        }
                    }
                }
                
                if (image) {
                    this.timeImages.set(timePeriod, {
                        image: image,
                        path: imagePath
                    });
                    return { timePeriod, success: true };
                } else {
                    throw new Error(`No image found for ${timePeriod}`);
                }
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
     * Load entity image assets (including ready/attack pose variants)
     */
    async _loadEntityImages() {
        const promises = this.availableAssets.entities.map(async (entityType) => {
            const entityData = {};
            let hasAnySprite = false;

            // Helper to try loading with multiple extensions
            const tryLoadEntityImage = async (baseName) => {
                const knownExt = this.fileExtensionMap?.entities?.[baseName];
                
                if (knownExt) {
                    // Use known extension from filesystem discovery
                    try {
                        const path = `${this.assetPaths.entities}/${baseName}${knownExt}`;
                        const image = await this._loadImage(path);
                        return { image, path };
                    } catch (e) {
                        // Fall through to try all extensions
                    }
                }
                
                // Try all possible extensions
                for (const ext of ['.png', '.jpg', '.jpeg']) {
                    try {
                        const path = `${this.assetPaths.entities}/${baseName}${ext}`;
                        const image = await this._loadImage(path);
                        return { image, path };
                    } catch (e) {
                        // Continue to next extension
                    }
                }
                throw new Error(`No image found for ${baseName}`);
            };

            // Try to load main entity image (e.g., ghost.png/jpeg)
            try {
                const result = await tryLoadEntityImage(entityType);
                entityData.image = result.image;
                entityData.path = result.path;
                hasAnySprite = true;
            } catch (e) {
                // Base sprite not found, try pose variants
            }

            // Try to load ready pose variant (e.g., angry_ghost_ready_pose_enhanced.png)
            try {
                const result = await tryLoadEntityImage(`${entityType}_ready_pose_enhanced`);
                entityData.readyImage = result.image;
                entityData.readyPath = result.path;
                hasAnySprite = true;
            } catch (e) {
                // Ready pose not found, that's okay
            }

            // Try to load attack pose variant (e.g., angry_ghost_attack_pose_enhanced.png)
            try {
                const result = await tryLoadEntityImage(`${entityType}_attack_pose_enhanced`);
                entityData.attackImage = result.image;
                entityData.attackPath = result.path;
                hasAnySprite = true;
            } catch (e) {
                // Attack pose not found, that's okay
            }

            // Only store if we found at least one sprite variant
            if (hasAnySprite) {
                this.entityImages.set(entityType, entityData);
                console.log(`✅ Loaded entity: ${entityType}`, {
                    base: !!entityData.path,
                    ready: !!entityData.readyPath,
                    attack: !!entityData.attackPath
                });
                return { entityType, success: true };
            } else {
                console.warn(`⚠️ No sprites found for entity: ${entityType}`);
                return { entityType, success: false };
            }
        });

        const results = await Promise.allSettled(promises);
        const loaded = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

        return { loaded, total: this.availableAssets.entities.length };
    }

    /**
     * Load food image assets (seeds, crops, etc.)
     * These are merged into toolImages for inventory display
     */
    async _loadFoodImages() {
        const promises = this.availableAssets.food.map(async (foodType) => {
            try {
                // Try loading with known extension first, then fallback
                const knownExt = this.fileExtensionMap?.food?.[foodType];
                let imagePath;
                let image;
                
                if (knownExt) {
                    imagePath = `${this.assetPaths.food}/${foodType}${knownExt}`;
                    try {
                        image = await this._loadImage(imagePath);
                    } catch (e) {
                        // Fall through
                    }
                }
                
                if (!image) {
                    for (const ext of ['.png', '.jpg', '.jpeg']) {
                        try {
                            imagePath = `${this.assetPaths.food}/${foodType}${ext}`;
                            image = await this._loadImage(imagePath);
                            break;
                        } catch (e) {
                            // Continue
                        }
                    }
                }
                
                if (image) {
                    // Store in toolImages map so they work with inventory system
                    this.toolImages.set(foodType, {
                        image: image,
                        path: imagePath
                    });
                    return { foodType, success: true };
                } else {
                    throw new Error(`No image found for ${foodType}`);
                }
            } catch (error) {
                console.warn(`⚠️ Failed to load food image: ${foodType}`, error);
                return { foodType, success: false, error };
            }
        });

        const results = await Promise.allSettled(promises);
        const loaded = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

        return { loaded, total: this.availableAssets.food.length };
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
                    // Store original relative path for UI usage
                    texture.userData = texture.userData || {};
                    texture.userData.originalPath = imagePath;
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

        // Apply alias mapping for lookup (e.g., crafted_grappling_hook → grapple)
        const lookupKey = this.textureAliases[toolType] || toolType;

        // Try direct lookup first
        let imageData = this.toolImages.get(lookupKey);
        
        // If not found, try fuzzy matching - find any loaded tool that contains the lookup key
        if (!imageData) {
            for (const [loadedTool, data] of this.toolImages.entries()) {
                // Check if either the loaded tool contains the lookup key, or vice versa
                if (loadedTool.includes(lookupKey) || lookupKey.includes(loadedTool)) {
                    imageData = data;
                    console.log(`🔍 Fuzzy match: "${toolType}" → "${lookupKey}" matched with loaded tool "${loadedTool}"`);
                    break;
                }
            }
        }
        
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
        const textures = this.blockTextures.get(materialType);

        if (textures) {
            // Handle multi-face textures (array of THREE.Texture objects)
            if (Array.isArray(textures)) {
                // Use the first side texture (index 0) for inventory icon
                const sideTexture = textures[0];
                if (sideTexture && sideTexture.userData && sideTexture.userData.originalPath) {
                    // Use stored relative path instead of absolute texture.image.src
                    return `<img src="${sideTexture.userData.originalPath}" style="width: ${size}px; height: ${size}px; object-fit: cover; vertical-align: middle; border-radius: 2px; image-rendering: pixelated;" alt="${materialType}">`;
                }
            }
            // Handle single texture (THREE.Texture object)
            else if (textures.userData && textures.userData.originalPath) {
                // Use stored relative path instead of absolute texture.image.src
                return `<img src="${textures.userData.originalPath}" style="width: ${size}px; height: ${size}px; object-fit: contain; vertical-align: middle; border-radius: 2px; image-rendering: pixelated;" alt="${materialType}">`;
            }
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
            timeImagesCount: this.timeImages.size,
            entityImagesCount: this.entityImages.size
        };
    }

    /**
     * Get enhanced entity image or fall back to emoji
     * @param {string} entityType - Type of entity (ghost, etc.)
     * @param {string} defaultEmoji - Fallback emoji
     * @returns {object|null} Image data with path, or null for emoji fallback
     */
    getEnhancedEntityImage(entityType, defaultEmoji) {
        if (!this.isEnabled || !this.assetsLoaded) {
            return null;
        }

        const imageData = this.entityImages.get(entityType);
        if (imageData && imageData.path) {
            return imageData;
        }

        return null;
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

    /**
     * Load entity texture (for animals, etc.)
     * @param {string} texturePath - Path relative to art/ (e.g., 'animals/rabbit_rest.png')
     * @returns {THREE.Texture} Loaded texture
     */
    loadEntityTexture(texturePath) {
        try {
            // Create full path (texturePath already includes 'animals/' prefix)
            const fullPath = `art/${texturePath}`;
            
            const loader = new THREE.TextureLoader();
            const texture = loader.load(fullPath);
            
            // Configure for pixel art
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.LinearMipmapNearestFilter;
            texture.generateMipmaps = true;
            texture.anisotropy = 4;
            
            return texture;
        } catch (error) {
            console.error(`Failed to load entity texture: ${texturePath}`, error);
            return null;
        }
    }
}