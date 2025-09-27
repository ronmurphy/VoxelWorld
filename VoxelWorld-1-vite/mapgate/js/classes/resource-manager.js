window.ResourceManager = class {
    constructor() {
        this.resources = {
            textures: {
                walls: new Map(),
                doors: new Map(),
                environmental: new Map(),
                props: new Map()
            },
            sounds: {
                ambient: new Map(),
                effects: new Map()
            },
            splashArt: {
                title: new Map(),
                loading: new Map(),
                background: new Map()
            },
            effects: {
                particles: new Map(),
                lighting: new Map()
            },
            bestiary: new Map(),
            metadata: {}  // Add metadata storage
        };
    
        this.loadedPacks = new Map();
        this.activePackId = null;
        this.mapResourceLinks = new Map();
        this.activeResourcePack = null;
        this.thumbnailSize = 100;
    
        // Initialize textureAssignments map
        this.textureAssignments = new Map();
        this.defaultWallTextureId = null;
    
        // Initialize sound management
        this.activeAudio = new Map();
    
        // Initialize MonsterManager
        this.monsterManager = null;
    
        // Props filtering system
this.propFolderMap = new Map();
this.activeTagFilter = null;
this.lastSelectedCategory = null;

// Add metadata if it doesn't exist
if (!this.resources.metadata) {
    this.resources.metadata = {};
}

if (!this.resources.shapeforge) {
    this.resources.shapeforge = new Map();
  }

this.loadShapeForgeModels().then(count => {
    console.log(`Initialized ResourceManager with ${count} ShapeForge models`);
  });
    }

    initStoryboard() {
        if (!window.Storyboard) {
          console.error('Storyboard class not available');
          return null;
        }
        
        // Create storyboard instance if not exists
        if (!this.storyboard) {
          this.storyboard = new window.Storyboard(this.scene3D);
          this.storyboard.connectToResourceManager(this);
        }
        
        return this.storyboard;
      }


    async loadResourcePack(file) {
        try {
            // Create loading progress overlay
            const overlay = this.createLoadProgressOverlay();
            document.body.appendChild(overlay);
            
            // Update initial progress
            this.updateLoadProgress(overlay, 0, 'Reading file...');
            
            // Read the file
            const text = await file.text();
            this.updateLoadProgress(overlay, 20, 'Parsing data...');
            
            // Parse the JSON data
            const packData = JSON.parse(text);
            
            // Count total items for progress tracking
            let totalTextures = 0;
            let processedTextures = 0;
            
            // Count textures in each category
            this.updateLoadProgress(overlay, 30, 'Counting resources...');
            
            for (const category in packData.textures) {
                totalTextures += Object.keys(packData.textures[category]).length;
            }
            
            this.updateLoadProgress(overlay, 40, `Found ${totalTextures} textures to process...`);
            
            // Clear existing resources
            this.resources.textures = {
                walls: new Map(),
                doors: new Map(),
                environmental: new Map(),
                props: new Map()
            };
            
            // First restore propFolderMap if it exists in metadata
            if (packData.metadata && packData.metadata.propFolders) {
                this.propFolderMap = new Map();
                
                packData.metadata.propFolders.forEach(folder => {
                    this.propFolderMap.set(folder.tag, {
                        label: folder.label,
                        files: folder.files
                    });
                });
                
                this.updateLoadProgress(overlay, 45, `Restored ${this.propFolderMap.size} folders...`);
            }
            
            // Process textures in chunks
            const chunkSize = 20; // Process more at once for loading since we don't need to compress
            let currentProgress = 45;
            
            // Process each texture category
            for (const category in packData.textures) {
                const textures = packData.textures[category];
                const textureIds = Object.keys(textures);
                const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
                
                // Initialize category if needed
                if (!this.resources.textures[category]) {
                    this.resources.textures[category] = new Map();
                }
                
                // Process textures in chunks
                for (let i = 0; i < textureIds.length; i += chunkSize) {
                    // Update progress
                    const percentComplete = 45 + (processedTextures / totalTextures * 40);
                    this.updateLoadProgress(
                        overlay,
                        percentComplete,
                        `Loading ${categoryName}: ${processedTextures} of ${totalTextures} textures...`
                    );
                    
                    // Process this chunk
                    const chunk = textureIds.slice(i, i + chunkSize);
                    
                    // Add a small delay to allow UI to update and memory to be freed
                    await new Promise(resolve => setTimeout(resolve, 50));
                    
                    // Process each texture in the chunk
                    for (const id of chunk) {
                        const texture = textures[id];
                        this.resources.textures[category].set(id, texture);
                        
                        // Set first wall texture as default if needed
                        if (category === 'walls' && !this.defaultWallTextureId) {
                            this.defaultWallTextureId = id;
                        }
                        
                        processedTextures++;
                    }
                }
            }

                // Load ShapeForge models if present
    if (packData.shapeforge && Array.isArray(packData.shapeforge)) {
        console.log(`Found ${packData.shapeforge.length} ShapeForge models in resource pack`);
        
        // Ask user if they want to load models
        if (confirm(`This resource pack contains ${packData.shapeforge.length} 3D models. Load them?`)) {
          packData.shapeforge.forEach(model => {
            if (model.id && model.data) {
              this.resources.shapeforge.set(model.id, model);
              
              // Also save to IndexedDB
              this.saveModelToIndexedDB(model);
            }
          });
        }
      }
            
            // Continue with the rest of the deserialization (sounds, splashArt, effects)
            this.updateLoadProgress(overlay, 85, 'Loading other resources...');
            
            if (packData.sounds) {
                for (const [category, sounds] of Object.entries(packData.sounds)) {
                    if (!this.resources.sounds[category]) {
                        this.resources.sounds[category] = new Map();
                    }
                    for (const [id, sound] of Object.entries(sounds)) {
                        this.resources.sounds[category].set(id, sound);
                    }
                }
            }
    
            if (packData.splashArt) {
                for (const [category, artItems] of Object.entries(packData.splashArt)) {
                    if (!this.resources.splashArt[category]) {
                        this.resources.splashArt[category] = new Map();
                    }
                    for (const [id, art] of Object.entries(artItems)) {
                        this.resources.splashArt[category].set(id, art);
                    }
                }
            }
    
            if (packData.effects) {
                for (const [category, effects] of Object.entries(packData.effects)) {
                    if (!this.resources.effects[category]) {
                        this.resources.effects[category] = new Map();
                    }
                    for (const [id, effect] of Object.entries(effects)) {
                        this.resources.effects[category].set(id, effect);
                    }
                }
            }
            
            // Also save metadata
            if (packData.metadata) {
                this.resources.metadata = packData.metadata;
            }
            
            // Update active resource pack reference
            this.activeResourcePack = packData;
            
            // Complete progress
            this.updateLoadProgress(overlay, 100, 'Load complete!');
            
            // Add a short delay before removing the overlay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Show success notification
            this.showSuccessNotification(`Successfully loaded resource pack with ${totalTextures} textures`);
            
            // Remove the overlay
            overlay.remove();
            
            return true;
        } catch (error) {
            console.error('Error loading resource pack:', error);
            
            // Remove progress overlay if it exists
            document.querySelector('.load-progress-overlay')?.remove();
            
            // Show error notification
            this.showErrorNotification('Error loading resource pack: ' + error.message);
            
            return false;
        }
    }

    // Helper method for saving models
async saveModelToIndexedDB(model) {
    try {
      const db = await this.openModelDatabase();
      const tx = db.transaction(['models'], 'readwrite');
      const store = tx.objectStore('models');
      await store.put(model);
      return true;
    } catch (e) {
      console.warn(`Failed to save model ${model.id} to IndexedDB:`, e);
      return false;
    }
  }
    
    // Create loading progress overlay (similar to save progress but with different title)
    createLoadProgressOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'load-progress-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        const card = document.createElement('div');
        card.className = 'load-progress-card';
        card.style.cssText = `
            background-color: white;
            border-radius: 8px;
            padding: 24px;
            width: 400px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        `;
        
        card.innerHTML = `
            <h2 style="margin-top: 0; font-size: 1.5em; font-weight: 500;">Loading Resource Pack</h2>
            <p class="progress-status" style="margin-bottom: 16px; color: #666;">Reading file...</p>
            
            <div class="progress-container" style="width: 100%; height: 8px; background-color: #f0f0f0; border-radius: 4px; overflow: hidden; margin-bottom: 16px;">
                <div class="progress-bar" style="width: 0%; height: 100%; background-color: #3F51B5; transition: width 0.3s ease;"></div>
            </div>
            
            <div style="color: #666; font-size: 0.9em;">
                <p>Loading large resource packs may take a moment.</p>
                <p style="margin-bottom: 0;">Please don't close this window.</p>
            </div>
        `;
        
        overlay.appendChild(card);
        return overlay;
    }
    
    // Update progress bar and status text for loading
    updateLoadProgress(overlay, percent, statusText) {
        const progressBar = overlay.querySelector('.progress-bar');
        const progressStatus = overlay.querySelector('.progress-status');
        
        if (progressBar && progressStatus) {
            progressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
            progressStatus.textContent = statusText;
        }
    }
    
    async saveResourcePack(mapName = null) {
        try {
            // Create save progress overlay
            const overlay = this.createSaveProgressOverlay();
            document.body.appendChild(overlay);
            
            // Set initial progress
            this.updateSaveProgress(overlay, 0, 'Preparing resource pack...');
            
            // Small delay to let the UI update
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Prepare basic pack data without texture data first
            const packData = {
                name: this.activeResourcePack?.name || 'New Resource Pack',
                version: '1.0',
                metadata: this.resources.metadata || {},
                chunks: [],  // We'll track chunks here
                      // Add ShapeForge models (optional - make togglable in UI)
      shapeforge: Array.from(this.resources.shapeforge.values())
            };
    
            // Create filename
            const filename = mapName ? 
                `${mapName}.resource.json` : 
                'resource-pack.json';
                
            console.log(`Starting chunked save of resource pack: ${filename}`);
            
            // Count total items for progress tracking
            let totalCategories = Object.keys(this.resources.textures).length;
            let processedCategories = 0;
            let totalTextures = 0;
            let processedTextures = 0;
            
            // Count total textures
            for (const [category, textures] of Object.entries(this.resources.textures)) {
                totalTextures += textures.size;
            }
            
            // Use more efficient method to serialize textures
            this.updateSaveProgress(overlay, 5, 'Processing textures...');
            packData.textures = {};
            
            // Process each texture category
            for (const [category, textures] of Object.entries(this.resources.textures)) {
                packData.textures[category] = {};
                
                const categoryDisplayName = category.charAt(0).toUpperCase() + category.slice(1);
                this.updateSaveProgress(
                    overlay, 
                    5 + (processedCategories / totalCategories * 50), 
                    `Processing ${categoryDisplayName}...`
                );
                
                // Break the operation into chunks
                const textureEntries = Array.from(textures.entries());
                const chunkSize = 10; // Process 10 textures at a time
                
                // Process in chunks to avoid memory issues
                for (let i = 0; i < textureEntries.length; i += chunkSize) {
                    // Create a small delay between chunks to allow garbage collection
                    if (i > 0) {
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                    
                    const chunk = textureEntries.slice(i, i + chunkSize);
                    
                    // Process this chunk
                    for (const [id, texture] of chunk) {
                        // Optimize texture data by compressing images if they're large
                        let optimizedData = texture.data;
                        
                        // Update progress
                        processedTextures++;
                        const textureProgress = 5 + 
                            (processedCategories / totalCategories * 50) + 
                            (i / textureEntries.length * (50 / totalCategories));
                        
                        this.updateSaveProgress(
                            overlay, 
                            textureProgress, 
                            `Processing ${texture.name}...`
                        );
                        
                        // If data is a data URL and is large, try to compress it
                        if (typeof texture.data === 'string' && 
                            texture.data.startsWith('data:image/') && 
                            texture.data.length > 500000) { // 500KB threshold
                            
                            try {
                                // Create a more efficient compressed version
                                optimizedData = await this.compressImageData(texture.data);
                                console.log(`Compressed image: ${texture.name} (${Math.round(texture.data.length/1024)}KB → ${Math.round(optimizedData.length/1024)}KB)`);
                            } catch (e) {
                                console.warn(`Failed to compress image: ${texture.name}`, e);
                                optimizedData = texture.data;
                            }
                        }
                        
                        // Store optimized texture data
                        packData.textures[category][id] = {
                            id: texture.id,
                            name: texture.name,
                            category: texture.category,
                            subcategory: texture.subcategory,
                            data: optimizedData,
                            thumbnail: texture.thumbnail,
                            dateAdded: texture.dateAdded,
                            tags: texture.tags || [],
                            sourcePath: texture.sourcePath || null
                        };
                    }
                }
                
                processedCategories++;
            }
            
            // Update progress
            this.updateSaveProgress(overlay, 60, 'Processing other resources...');
            
            // Save smaller data categories normally
            packData.sounds = this.serializeSounds();
            packData.splashArt = this.serializeSplashArt();
            packData.effects = this.serializeEffects();
            
            // Update progress
            this.updateSaveProgress(overlay, 80, 'Creating file...');
            
            // Prepare the JSON data
            const jsonData = JSON.stringify(packData, null, 2);
            
            // Update progress
            this.updateSaveProgress(overlay, 90, 'Creating download...');
            
            // Save to file
            const blob = new Blob([jsonData], {
                type: 'application/json'
            });
            
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            document.body.appendChild(a);
            
            // Show success before triggering download
            this.updateSaveProgress(overlay, 100, 'Save complete!');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Initiate download
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
            
            // Show success notification
            this.showSuccessNotification(`Successfully saved ${filename}`);
            
            // Remove progress overlay
            overlay.remove();
            
            console.log(`Successfully saved resource pack: ${filename}`);
            return filename;
        } catch (error) {
            console.error('Error saving resource pack:', error);
            
            // Remove progress overlay if it exists
            document.querySelector('.save-progress-overlay')?.remove();
            
            // Show error notification
            this.showErrorNotification('Error saving resource pack: ' + error.message);
            return null;
        }
    }

    createSaveProgressOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'save-progress-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        const card = document.createElement('div');
        card.className = 'save-progress-card';
        card.style.cssText = `
            background-color: white;
            border-radius: 8px;
            padding: 24px;
            width: 400px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        `;
        
        card.innerHTML = `
            <h2 style="margin-top: 0; font-size: 1.5em; font-weight: 500;">Saving Resource Pack</h2>
            <p class="progress-status" style="margin-bottom: 16px; color: #666;">Preparing...</p>
            
            <div class="progress-container" style="width: 100%; height: 8px; background-color: #f0f0f0; border-radius: 4px; overflow: hidden; margin-bottom: 16px;">
                <div class="progress-bar" style="width: 0%; height: 100%; background-color: #3F51B5; transition: width 0.3s ease;"></div>
            </div>
            
            <div style="color: #666; font-size: 0.9em;">
                <p>Processing large resource packs may take a moment.</p>
                <p style="margin-bottom: 0;">Please don't close this window.</p>
            </div>
        `;
        
        overlay.appendChild(card);
        return overlay;
    }
    
    // Update progress bar and status text
    updateSaveProgress(overlay, percent, statusText) {
        const progressBar = overlay.querySelector('.progress-bar');
        const progressStatus = overlay.querySelector('.progress-status');
        
        if (progressBar && progressStatus) {
            progressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
            progressStatus.textContent = statusText;
        }
    }
    
    // Show success notification toast
    showSuccessNotification(message) {
        const toast = document.createElement('div');
        toast.className = 'notification-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: #4CAF50;
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 10000;
            animation: slideIn 0.3s ease, fadeOut 0.5s ease 4.5s forwards;
        `;
        
        toast.innerHTML = `
            <span class="material-icons">check_circle</span>
            <span>${message}</span>
        `;
        
        // Add animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(toast);
        
        // Remove after 5 seconds
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }
    
    // Show error notification toast
    showErrorNotification(message) {
        const toast = document.createElement('div');
        toast.className = 'notification-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: #F44336;
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        toast.innerHTML = `
            <span class="material-icons">error</span>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '<span class="material-icons">close</span>';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            margin-left: 8px;
            padding: 0;
        `;
        
        closeBtn.addEventListener('click', () => {
            toast.remove();
        });
        
        toast.appendChild(closeBtn);
        
        // Remove after 8 seconds if not closed manually
        setTimeout(() => {
            if (document.body.contains(toast)) {
                toast.remove();
            }
        }, 8000);
    }


    // Add a method to save textures in chunks
    async saveTexturesChunked(packData, chunkSize = 10) {
        packData.textures = {};
        
        // Process each texture category
        for (const [category, textures] of Object.entries(this.resources.textures)) {
            packData.textures[category] = {};
            
            // Break the operation into chunks
            const textureEntries = Array.from(textures.entries());
            const totalTextures = textureEntries.length;
            
            console.log(`Saving ${totalTextures} textures in category: ${category}`);
            
            // Process in chunks to avoid memory issues
            for (let i = 0; i < totalTextures; i += chunkSize) {
                // Create a small delay between chunks to allow garbage collection
                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
                
                const chunk = textureEntries.slice(i, i + chunkSize);
                
                // Process this chunk
                chunk.forEach(([id, texture]) => {
                    // Optimize texture data by compressing images if they're large
                    let optimizedData = texture.data;
                    
                    // If data is a data URL and is large, try to compress it
                    if (typeof texture.data === 'string' && 
                        texture.data.startsWith('data:image/') && 
                        texture.data.length > 500000) { // 500KB threshold
                        
                        try {
                            // Create a more efficient compressed version
                            optimizedData = this.compressImageData(texture.data);
                            console.log(`Compressed image: ${texture.name} (${Math.round(texture.data.length/1024)}KB → ${Math.round(optimizedData.length/1024)}KB)`);
                        } catch (e) {
                            console.warn(`Failed to compress image: ${texture.name}`, e);
                            optimizedData = texture.data;
                        }
                    }
                    
                    // Store optimized texture data
                    packData.textures[category][id] = {
                        id: texture.id,
                        name: texture.name,
                        category: texture.category,
                        subcategory: texture.subcategory,
                        data: optimizedData,
                        thumbnail: texture.thumbnail,
                        dateAdded: texture.dateAdded,
                        tags: texture.tags || [],
                        sourcePath: texture.sourcePath || null
                    };
                });
                
                console.log(`Saved chunk ${Math.floor(i/chunkSize) + 1}/${Math.ceil(totalTextures/chunkSize)} in ${category}`);
            }
        }
        
        return packData;
    }
    
    // Add a method to compress image data
    compressImageData(dataUrl, quality = 0.7) {
        return new Promise((resolve, reject) => {
            try {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Set dimensions
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    // Draw at original size
                    ctx.drawImage(img, 0, 0);
                    
                    // Convert to WebP with compression
                    const compressedData = canvas.toDataURL('image/webp', quality);
                    resolve(compressedData);
                };
                
                img.onerror = () => {
                    reject(new Error('Failed to load image for compression'));
                };
                
                img.src = dataUrl;
            } catch (error) {
                reject(error);
            }
        });
    }

    serializeTextures() {
        const serialized = {};
        for (const [category, textures] of Object.entries(this.resources.textures)) {
            serialized[category] = {};
            textures.forEach((texture, id) => {
                serialized[category][id] = {
                    id: texture.id,
                    name: texture.name,
                    category: texture.category,
                    subcategory: texture.subcategory,
                    data: texture.data,
                    thumbnail: texture.thumbnail,
                    dateAdded: texture.dateAdded,
                    // Include tag information
                    tags: texture.tags || [],
                    sourcePath: texture.sourcePath || null
                };
            });
        }
        return serialized;
    }

    // Update serializeSounds method
    serializeSounds() {
        const serialized = {};
        for (const [category, sounds] of Object.entries(this.resources.sounds)) {
            serialized[category] = {};
            sounds.forEach((sound, id) => {
                serialized[category][id] = {
                    id: sound.id,
                    name: sound.name,
                    data: sound.data,
                    duration: sound.duration,
                    dateAdded: sound.dateAdded
                };
            });
        }
        return serialized;
    }

    // Update serializeSplashArt method
    serializeSplashArt() {
        const serialized = {};
        for (const [category, artMap] of Object.entries(this.resources.splashArt)) {
            serialized[category] = {};
            artMap.forEach((art, id) => {
                serialized[category][id] = {
                    id: art.id,
                    name: art.name,
                    data: art.data,
                    thumbnail: art.thumbnail,
                    description: art.description,
                    dateAdded: art.dateAdded
                };
            });
        }
        return serialized;
    }

    serializeEffects() {
        const serialized = {};
        for (const [category, effects] of Object.entries(this.resources.effects)) {
            serialized[category] = {};
            effects.forEach((effect, id) => {
                serialized[category][id] = {
                    id: effect.id,
                    name: effect.name,
                    data: effect.data,
                    thumbnail: effect.thumbnail,
                    dateAdded: effect.dateAdded
                };
            });
        }
        return serialized;
    }

    addSplashArtCategory(image, category = 'title') {
        return {
            ...image,
            category: category
        };
    }

    deserializeResourcePack(packData) {
        // First restore propFolderMap if it exists in metadata
        if (packData.metadata && packData.metadata.propFolders) {
            this.propFolderMap = new Map();
            
            packData.metadata.propFolders.forEach(folder => {
                this.propFolderMap.set(folder.tag, {
                    label: folder.label,
                    files: folder.files
                });
            });
            
            console.log('Restored prop folder map with tags:', this.propFolderMap);
        }
        
        // Handle texture deserialization - check if we're using chunked format
        if (packData.textures) {
            // Process each texture category
            for (const [category, textures] of Object.entries(packData.textures)) {
                if (!this.resources.textures[category]) {
                    this.resources.textures[category] = new Map();
                }
                
                // Process the textures
                for (const [id, texture] of Object.entries(textures)) {
                    this.resources.textures[category].set(id, texture);
    
                    // Set first wall texture as default
                    if (category === 'walls' && !this.defaultWallTextureId) {
                        this.defaultWallTextureId = id;
                    }
                }
            }
        }
        
        // Continue with the rest of the deserialization (sounds, splashArt, effects)
        if (packData.sounds) {
            for (const [category, sounds] of Object.entries(packData.sounds)) {
                if (!this.resources.sounds[category]) {
                    this.resources.sounds[category] = new Map();
                }
                for (const [id, sound] of Object.entries(sounds)) {
                    this.resources.sounds[category].set(id, sound);
                }
            }
        }
    
        if (packData.splashArt) {
            for (const [category, artItems] of Object.entries(packData.splashArt)) {
                if (!this.resources.splashArt[category]) {
                    this.resources.splashArt[category] = new Map();
                }
                for (const [id, art] of Object.entries(artItems)) {
                    this.resources.splashArt[category].set(id, art);
                }
            }
        }
    
        if (packData.effects) {
            for (const [category, effects] of Object.entries(packData.effects)) {
                if (!this.resources.effects[category]) {
                    this.resources.effects[category] = new Map();
                }
                for (const [id, effect] of Object.entries(effects)) {
                    this.resources.effects[category].set(id, effect);
                }
            }
        }
        
        // Also save metadata
        if (packData.metadata) {
            this.resources.metadata = packData.metadata;
        }
    }

    getDefaultWallTexture() {
        if (!this.defaultWallTextureId) return null;
        return this.resources.textures.walls.get(this.defaultWallTextureId);
    }

    serializeTextureAssignments() {
        return Array.from(this.textureAssignments.entries())
            .map(([wallId, data]) => ({
                wallId,
                textureId: data.textureId,
                type: data.type,
                dateAssigned: data.dateAssigned
            }));
    }

    deserializeTextureAssignments(data) {
        this.textureAssignments = new Map();
        data?.forEach(item => {
            this.textureAssignments.set(item.wallId, {
                textureId: item.textureId,
                type: item.type,
                dateAssigned: item.dateAssigned
            });
        });
    }

    // Method to link resources to a map
    linkMapToResources(mapName, resourceIds) {
        this.mapResourceLinks.set(mapName, {
            packId: this.activePackId,
            resources: resourceIds
        });
    }

    // Load additional resource pack without replacing current one
    async loadAdditionalPack(jsonFile) {
        try {
            const response = await fetch(jsonFile);
            const packData = await response.json();
            this.loadedPacks.set(packData.id, packData);

            // Optional: Switch to this pack
            // this.switchResourcePack(packData.id);

            return packData.id;
        } catch (error) {
            console.error('Error loading resource pack:', error);
            return null;
        }
    }

    // Switch between loaded resource packs
    switchResourcePack(packId) {
        if (this.loadedPacks.has(packId)) {
            this.activePackId = packId;
            // Update UI to reflect active pack
            this.updateResourceUI();
            return true;
        }
        return false;
    }

    // Get resource from any loaded pack
    getResourceFromPack(resourceId, packId = null) {
        const pack = packId ?
            this.loadedPacks.get(packId) :
            this.loadedPacks.get(this.activePackId);

        return pack?.resources[resourceId] || null;
    }

    async showTextureSelectionDialog(structure) {
        // Create dialog
        const dialog = document.createElement('sl-dialog');
        dialog.label = `Assign Texture to ${structure.type === 'wall' ? 'Wall' : 'Room'}`;

        // Get appropriate textures based on structure type
        const categories = structure.type === 'wall' ? ['walls', 'doors'] : ['floors'];

        // Create the dialog content
        dialog.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 16px;">
            <!-- Category Selection -->
            <sl-select label="Texture Type" id="textureCategory">
                ${categories.map(cat => `
                    <sl-option value="${cat}">${cat.charAt(0).toUpperCase() + cat.slice(1)}</sl-option>
                `).join('')}
            </sl-select>

            <!-- Texture Gallery -->
            <div class="texture-selection-gallery" style="
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                gap: 8px;
                max-height: 300px;
                overflow-y: auto;
                padding: 8px;
                background: var(--sl-color-neutral-50);
                border-radius: var(--sl-border-radius-medium);
            ">
                <!-- Textures will be loaded here -->
            </div>

            <!-- Preview Area -->
            <div class="texture-preview" style="
                display: none;
                padding: 16px;
                background: var(--sl-color-neutral-50);
                border-radius: var(--sl-border-radius-medium);
                text-align: center;
            ">
                <img style="max-width: 200px; max-height: 200px; object-fit: contain;">
                <div class="preview-name" style="margin-top: 8px; font-weight: 500;"></div>
            </div>
        </div>

        <div slot="footer">
            <sl-button variant="neutral" class="cancel-btn">Cancel</sl-button>
            <sl-button variant="primary" class="apply-btn" disabled>Apply</sl-button>
        </div>
    `;

        // Add to document
        document.body.appendChild(dialog);

        // Get references to elements
        const categorySelect = dialog.querySelector('#textureCategory');
        const gallery = dialog.querySelector('.texture-selection-gallery');
        const preview = dialog.querySelector('.texture-preview');
        const applyBtn = dialog.querySelector('.apply-btn');
        let selectedTextureId = null;

        // Function to update gallery based on category
        const updateGallery = (category) => {
            gallery.innerHTML = '';
            const textures = this.resources?.textures[category];

            if (!textures || textures.size === 0) {
                gallery.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 16px; color: var(--sl-color-neutral-500);">
                    No ${category} textures available
                </div>
            `;
                return;
            }

            textures.forEach((texture, id) => {
                const item = document.createElement('div');
                item.className = 'texture-item';
                item.style.cssText = `
                cursor: pointer;
                padding: 4px;
                border: 2px solid transparent;
                border-radius: var(--sl-border-radius-medium);
                transition: all 0.2s ease;
            `;
                item.innerHTML = `
                <img src="${texture.thumbnail}" 
                     alt="${texture.name}"
                     style="width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 4px;">
            `;

                item.addEventListener('click', () => {
                    // Update selection
                    gallery.querySelectorAll('.texture-item').forEach(i =>
                        i.style.borderColor = 'transparent');
                    item.style.borderColor = 'var(--sl-color-primary-500)';
                    selectedTextureId = id;
                    applyBtn.disabled = false;

                    // Update preview
                    preview.style.display = 'block';
                    preview.querySelector('img').src = texture.data;
                    preview.querySelector('.preview-name').textContent = texture.name;
                });

                gallery.appendChild(item);
            });
        };

        // Handle category changes
        categorySelect.addEventListener('sl-change', () => {
            updateGallery(categorySelect.value);
            selectedTextureId = null;
            applyBtn.disabled = true;
            preview.style.display = 'none';
        });

        // Initial gallery load
        updateGallery(categorySelect.value);

        // Return a promise that resolves with the selected texture or null if canceled
        return new Promise((resolve) => {
            dialog.querySelector('.cancel-btn').addEventListener('click', () => {
                dialog.hide();
                resolve(null);
            });

            dialog.querySelector('.apply-btn').addEventListener('click', () => {
                const category = categorySelect.value;
                const texture = this.resources?.textures[category]?.get(selectedTextureId);
                dialog.hide();
                resolve(texture);
            });

            dialog.addEventListener('sl-after-hide', () => {
                dialog.remove();
            });

            dialog.show();
        });
    }

    getSelectedTexture(category) {
        console.log('Getting selected texture for category:', category);
        if (!this.resources?.textures[category]) {
            console.warn(`No textures found for category: ${category}`);
            return null;
        }

        const textures = this.resources.textures[category];
        const firstTexture = textures.values().next().value;

        // console.log('Found texture:', firstTexture);
        return firstTexture;
    }


/**
 * Get a specific texture by ID, name, or other criteria
 * @param {string} category - The texture category (walls, doors, props, etc.)
 * @param {object} criteria - Object with criteria to match (id, name, etc.)
 * @return {object|null} - The matching texture or null if not found
 */
getSpecificTexture(category, criteria) {
    console.log('Getting specific texture:', { category, criteria });
    
    // Check if category exists
    if (!this.resources?.textures[category]) {
      console.warn(`No textures found for category: ${category}`);
      return null;
    }
    
    const textures = this.resources.textures[category];
    
    // If criteria is a string, assume it's an ID
    if (typeof criteria === 'string') {
      const texture = textures.get(criteria);
      if (texture) {
        console.log('Found texture by ID:', texture.name);
        return texture;
      }
      
      // If not found by ID, try to match by name
      for (const [id, texture] of textures.entries()) {
        if (texture.name === criteria) {
          console.log('Found texture by name:', texture.name);
          return texture;
        }
      }
      
      console.warn(`Texture not found with ID or name: ${criteria}`);
      return null;
    }
    
    // If criteria is an object, match by specified properties
    if (typeof criteria === 'object') {
      // Search through all textures in this category
      for (const [id, texture] of textures.entries()) {
        let isMatch = true;
        
        // Check each criteria property against the texture
        for (const [key, value] of Object.entries(criteria)) {
          if (texture[key] !== value) {
            isMatch = false;
            break;
          }
        }
        
        if (isMatch) {
          console.log('Found texture matching criteria:', texture.name);
          return texture;
        }
      }
      
      console.warn('No texture found matching criteria:', criteria);
      return null;
    }
    
    // If no match or invalid criteria, return null
    return null;
  }

async addTexture(file, category, options = {}) {
    if (!file || !category) {
        console.warn('Missing required parameters:', { file, category });
        return null;
    }

    try {
        console.log('Creating texture from file:', file);
        // Create thumbnail and base64 data
        const imageData = await this.createImageData(file);
        const thumbnail = await this.createThumbnail(file);

        // Extract a clean name from the filename for props
        let name = file.name;
        if (category === 'props') {
            // Remove file extension
            name = name.replace(/\.[^.]+$/, '');
            // Remove numbers and parentheses like (1), (2)
            name = name.replace(/\s*\(\d+\)\s*$/, '');
            // Convert to proper case (first letter capitalized)
            name = name.charAt(0).toUpperCase() + name.slice(1);
        }

        // Enhanced texture data with tags
        const textureData = {
            id: `${category}_${Date.now()}`,
            name: name,
            originalFilename: file.name,
            category,
            subcategory: options.subcategory || null,
            data: imageData,
            thumbnail,
            dateAdded: new Date().toISOString(),
            // Add tags if available (for props folder import)
            tags: options.tags || [],
            sourcePath: options.sourcePath || null
        };

        console.log('Created texture data:', textureData);

        // Store in appropriate category
        if (!this.resources.textures[category]) {
            this.resources.textures[category] = new Map();
        }
        this.resources.textures[category].set(textureData.id, textureData);

        return textureData.id;
    } catch (error) {
        console.error('Error adding texture:', error);
        return null;
    }
}

    async addSplashArt(file, description = '', category = 'title') {
        if (!file) {
            console.warn('No file provided for splash art');
            return null;
        }
        
        try {
            // Create image data and thumbnail
            const imageData = await this.createImageData(file);
            const thumbnail = await this.createThumbnail(file);
            
            const splashArtData = {
                id: `splashArt_${Date.now()}`,
                name: file.name,
                description: description,
                category: category,
                data: imageData,
                thumbnail: thumbnail,
                dateAdded: new Date().toISOString()
            };
            
            // Initialize category if it doesn't exist
            if (!this.resources.splashArt[category]) {
                this.resources.splashArt[category] = new Map();
            }
            
            // Store in the correct category
            this.resources.splashArt[category].set(splashArtData.id, splashArtData);
            console.log('Added splash art:', splashArtData);
            
            return splashArtData.id;
        } catch (error) {
            console.error('Error adding splash art:', error);
            return null;
        }
    }


    async createImageData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async createThumbnail(file) {
    return new Promise(async (resolve, reject) => {
      // Prefer createImageBitmap for faster decoding and GPU-friendly bitmaps
      if (typeof createImageBitmap === 'function') {
        try {
          const bitmap = await createImageBitmap(file);
          try {
            const ratio = bitmap.width / bitmap.height;
            let width = this.thumbnailSize;
            let height = this.thumbnailSize;

            if (ratio > 1) {
              height = Math.round(width / ratio);
            } else {
              width = Math.round(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bitmap, 0, 0, width, height);

            // Close the ImageBitmap if supported
            try { if (bitmap && typeof bitmap.close === 'function') bitmap.close(); } catch (e) { }

            resolve(canvas.toDataURL('image/webp', 0.8));
            return;
          } catch (e) {
            try { if (bitmap && typeof bitmap.close === 'function') bitmap.close(); } catch (err) {}
            // fallthrough to older approach
          }
        } catch (e) {
          // createImageBitmap failed - fall back to object URL approach
          // continue below
        }
      }

      // Fallback for environments without createImageBitmap or on error
      const img = new Image();
      let createdUrl = null;
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Calculate thumbnail dimensions maintaining aspect ratio
          const ratio = img.width / img.height;
          let width = this.thumbnailSize;
          let height = this.thumbnailSize;

          if (ratio > 1) {
            height = Math.round(width / ratio);
          } else {
            width = Math.round(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // Revoke the temporary object URL now that the image data is in the canvas
          try { if (createdUrl) { URL.revokeObjectURL(createdUrl); createdUrl = null; } } catch (e) { }
          resolve(canvas.toDataURL('image/webp', 0.8));
        } catch (e) {
          try { if (createdUrl) { URL.revokeObjectURL(createdUrl); createdUrl = null; } } catch (ee) { }
          reject(e);
        }
      };
      img.onerror = (e) => {
        try { if (createdUrl) { URL.revokeObjectURL(createdUrl); createdUrl = null; } } catch (e) { }
        reject(e);
      };
      createdUrl = URL.createObjectURL(file);
      img.src = createdUrl;
    });
    }

    getTexture(id, category) {
        return this.resources.textures[category]?.get(id) || null;
    }

    assignTextureToWall(wallId, textureId) {
        if (!this.resources.textures.walls.has(textureId)) {
            console.warn('Texture not found:', textureId);
            return false;
        }

        this.textureAssignments.set(wallId, {
            textureId,
            type: 'wall',
            dateAssigned: new Date().toISOString()
        });

        console.log('Texture assigned:', {
            wallId,
            textureId,
            assignments: this.textureAssignments
        });

        return true;
    }

    // Add method to get texture assignment
    getWallTextureAssignment(wallId) {
        return this.textureAssignments.get(wallId);
    }

    // Add this method to the ResourceManager class

    getStructureTextureAssignment(structureId) {
        // This method will handle both walls and rooms
        const assignment = this.textureAssignments.get(structureId);
        if (assignment) {
            // console.log('Found texture assignment for structure:', {
            //     structureId,
            //     assignment
            // });
            return assignment;
        }
        // console.log('No texture assignment found for structure:', structureId);
        return null;
    }

    assignTextureToStructure(structureId, textureId, category) {
        if (!this.resources.textures[category]?.has(textureId)) {
            console.warn('Texture not found:', textureId);
            return false;
        }

        if (!this.textureAssignments) {
            this.textureAssignments = new Map();
        }

        this.textureAssignments.set(structureId, {
            textureId,
            type: category,
            dateAssigned: new Date().toISOString()
        });

        console.log('Texture assigned:', {
            structureId,
            textureId,
            category,
            assignments: this.textureAssignments
        });

        return true;
    }

    getDefaultRoomTexture() {
        if (!this.defaultRoomTextureId) return null;
        return this.resources.textures.rooms?.get(this.defaultRoomTextureId);
    }

    // Gallery UI methods can be added here
    createGalleryUI(container) {
        container.innerHTML = '';

        // Create category tabs
        const tabs = document.createElement('div');
        tabs.className = 'resource-tabs';

        Object.keys(this.resources.textures).forEach(category => {
            const tab = document.createElement('div');
            tab.className = 'resource-tab';
            tab.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            tab.onclick = () => this.showCategory(category, container);
            tabs.appendChild(tab);
        });

        container.appendChild(tabs);

        // Create gallery content area
        const content = document.createElement('div');
        content.className = 'resource-content';
        container.appendChild(content);

        // Show first category by default
        const firstCategory = Object.keys(this.resources.textures)[0];
        if (firstCategory) {
            this.showCategory(firstCategory, container);
        }
    }


updateGallery(drawer, category, view = 'grid') {
    // Determine which tab panel to use
    let tabPanelName;
    if (['ambient', 'effects'].includes(category)) {
        tabPanelName = 'sounds';
    } else if (['walls', 'doors', 'environmental', 'props'].includes(category)) {
        tabPanelName = 'textures';
    } else if (['title', 'loading', 'background'].includes(category)) {
        tabPanelName = 'splashArt';
    } else {
        tabPanelName = category;
    }
    
    console.log(`Looking for gallery in tab panel: ${tabPanelName}`);
    
    // Find the tab panel
    const tabPanel = drawer.querySelector(`sl-tab-panel[name="${tabPanelName}"]`);
    if (!tabPanel) {
        console.error(`Tab panel ${tabPanelName} not found`);
        return;
    }
    
    // Find or create container
    let container = drawer.querySelector(`#${category}Gallery`);
    if (!container) {
        console.log(`Creating new gallery container for ${category}`);
        container = document.createElement('div');
        container.id = `${category}Gallery`;
        container.className = `gallery-container ${view === 'grid' ? 'gallery-grid' : 'gallery-list'}`;
        tabPanel.appendChild(container);
    }

    // Hide all other galleries in the same tab panel and show this one
    tabPanel.querySelectorAll('.gallery-container').forEach(gallery => {
        gallery.style.display = gallery.id === `${category}Gallery` ? '' : 'none';
    });

    // Update container class based on view
    container.className = `gallery-container ${view === 'grid' ? 'gallery-grid' : 'gallery-list'}`;
    
    // IMPORTANT: Get resources FIRST before any UI code that uses them
    // Get resources based on category type
    let resources;
    if (['title', 'loading', 'background'].includes(category)) {
        resources = this.resources.splashArt[category];
        if (!resources) {
            this.resources.splashArt[category] = new Map();
            resources = this.resources.splashArt[category];
        }
    } else if (category === 'ambient' || category === 'effects') {
        resources = this.resources.sounds[category];
    } else {
        resources = this.resources.textures[category];
    }

    // Apply tag filter for props
    let filteredResources = resources;
    if (category === 'props' && this.activeTagFilter) {
        // Get list of file IDs that belong to this tag
        const tagData = this.propFolderMap?.get(this.activeTagFilter);
        if (tagData && tagData.files) {
            // Filter resources to only include files with this tag
            filteredResources = new Map();
            tagData.files.forEach(fileId => {
                if (resources.has(fileId)) {
                    filteredResources.set(fileId, resources.get(fileId));
                }
            });
        }
    }
    
    // NOW we can handle the UI elements that refer to resources
    
    // Handle view controls and search for props
    const viewControls = tabPanel.querySelector('.view-controls');
    if (viewControls) {
        // Remove any existing search controls and count displays
        const existingSearch = viewControls.querySelector('.props-search-controls');
        if (existingSearch) {
            existingSearch.remove();
        }
        
        const existingCount = viewControls.querySelector('.props-count');
        if (existingCount) {
            existingCount.remove();
        }
        
        // Add search controls if we're in props category
        if (category === 'props') {
            const searchControls = document.createElement('div');
            searchControls.className = 'props-search-controls';
            searchControls.style.cssText = `
                display: flex;
                align-items: center;
                gap: 8px;
                margin-right: auto; // Push view toggles to the right
            `;
            
            searchControls.innerHTML = `
                <sl-input type="search" placeholder="Search props..." style="width: 200px;" id="props-search">
                    <span slot="prefix" class="material-icons" style="font-size: 16px; color: #666;">search</span>
                </sl-input>
                ${this.activeTagFilter ? `
                    <sl-button size="small" class="clear-tag-filter" variant="default">
                        <span class="material-icons" style="font-size: 16px;">filter_alt_off</span>
                        Clear Filter
                    </sl-button>
                ` : ''}
            `;
            
            // Add search controls before the view toggles
            viewControls.insertBefore(searchControls, viewControls.firstChild);
            
            // Register search handler
            const searchInput = searchControls.querySelector('#props-search');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.filterPropsByName(drawer, e.target.value);
                });
            }
            
            // Register clear filter handler
            const clearBtn = searchControls.querySelector('.clear-tag-filter');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    this.clearPropsTagFilter(drawer);
                });
            }
            
            // Now that resources and filteredResources are defined, add the count display
            const totalItems = resources ? resources.size : 0;
            const filteredItems = filteredResources ? filteredResources.size : 0;
            
            const countDisplay = document.createElement('div');
            countDisplay.className = 'props-count';
            countDisplay.style.cssText = `
                margin-left: 16px;
                font-size: 0.9em;
                color: #666;
            `;
            
            if (this.activeTagFilter) {
                countDisplay.textContent = `${filteredItems} of ${totalItems} items`;
            } else {
                countDisplay.textContent = `${totalItems} items`;
            }
            
            viewControls.appendChild(countDisplay);
        }
    }

    // Create two-column layout for props
    if (category === 'props') {
        // Check if we already have the layout container
        let layoutContainer = tabPanel.querySelector('.props-layout-container');
        if (!layoutContainer) {
            // Create the layout container
            layoutContainer = document.createElement('div');
            layoutContainer.className = 'props-layout-container';
            layoutContainer.style.cssText = `
                display: flex;
                gap: 16px;
                height: calc(100% - 60px); // Leave room for the controls
            `;
            
            // Move the container into the layout container
            if (container.parentNode) {
                container.parentNode.insertBefore(layoutContainer, container);
                layoutContainer.appendChild(container);
            }
        }
        
        // Update the container styles for the props grid
        container.style.cssText = `
            flex: 1;
            overflow-y: auto;
            height: 100%;
            padding: 8px;
        `;
        
        // Create or update the tag filter sidebar
        let tagSidebar = layoutContainer.querySelector('.props-tag-sidebar');
        if (!tagSidebar) {
            tagSidebar = document.createElement('div');
            tagSidebar.className = 'props-tag-sidebar';
            tagSidebar.style.cssText = `
                width: 250px;
                flex-shrink: 0;
                background: #f5f5f5;
                border-radius: 4px;
                padding: 12px;
                overflow-y: auto;
                height: 100%;
            `;
            
            // Add to layout before the main container
            layoutContainer.insertBefore(tagSidebar, container);
        }
        
        // Update tag filter content
        this.updateTagSidebar(drawer, tagSidebar);
    } else {
        // Reset container styles for non-props categories
        container.style.cssText = '';
    }

    // Check for empty resources case
    if (!filteredResources || filteredResources.size === 0) {
        container.innerHTML = `
            <sl-card class="empty-gallery">
                <div style="text-align: center; padding: 2rem;">
                    ${category === 'ambient' || category === 'effects' ? 
                        '<span class="material-icons" style="font-size: 3rem; opacity: 0.5;">volume_off</span>' :
                        '<span class="material-icons" style="font-size: 3rem; opacity: 0.5;">image_not_supported</span>'
                    }
                    <p>No ${category} added yet</p>
                </div>
            </sl-card>
        `;
        return;
    }

    // Clear the main container
    container.innerHTML = '';

    // Create cards for each resource
    filteredResources.forEach((resource, id) => {
        const card = document.createElement('sl-card');
        card.className = 'resource-item';

        // Build card HTML
        card.innerHTML = `
        ${view === 'grid' ? `
            <img 
                src="${resource.thumbnail}" 
                alt="${resource.name}"
                class="resource-thumbnail"
            />
            <div class="resource-info">
                <div class="resource-name" style="color: #666; font-weight: bold; word-wrap: break-word; overflow-wrap: break-word; white-space: normal; max-width: 90%">${resource.name}</div>
                <div class="resource-meta" style="color: #777; font-size: 0.85em;">${this.formatDate(resource.dateAdded)}</div>
                ${resource.originalFilename ? 
                    `<div class="resource-filename" style="color: #999; font-size: 0.8em; font-style: italic; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${resource.originalFilename}</div>` : ''}
                
                ${category === 'props' && resource.tags && resource.tags.length > 0 ? 
                    `<div class="resource-tags" style="margin-top: 4px; display: flex; flex-wrap: wrap; gap: 4px;">
                        ${resource.tags.map(tag => 
                            `<sl-tag size="small" style="cursor: pointer; max-width: 100%; overflow: hidden;" 
                                    data-tag="${tag}" 
                                    title="${this.formatTagDisplay(tag)}">
                                <span class="material-icons" style="font-size: 12px; margin-right: 4px;">folder</span>
                                ${this.formatTagDisplay(tag).split(' › ').pop()}
                            </sl-tag>`
                        ).join('')}
                    </div>` : ''}
            </div>
        ` : `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <img 
                    src="${resource.thumbnail}" 
                    alt="${resource.name}"
                    class="resource-thumbnail"
                    style="width: 50px; height: 50px;"
                />
                <div class="resource-info">
                    <div class="resource-name" style="color: #666; font-weight: bold; word-wrap: break-word; overflow-wrap: break-word; white-space: normal; max-width: 90%">${resource.name}</div>
                    <div class="resource-meta" style="color: #777; font-size: 0.85em;">${this.formatDate(resource.dateAdded)}</div>
                    ${resource.originalFilename ? 
                        `<div class="resource-filename" style="color: #999; font-size: 0.8em; font-style: italic; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${resource.originalFilename}</div>` : ''}
                    
                    ${category === 'props' && resource.tags && resource.tags.length > 0 ? 
                        `<div class="resource-tags" style="margin-top: 4px; display: flex; flex-wrap: wrap; gap: 4px;">
                            ${resource.tags.map(tag => 
                                `<sl-tag size="small" style="cursor: pointer; max-width: 100%; overflow: hidden;" 
                                        data-tag="${tag}" 
                                        title="${this.formatTagDisplay(tag)}">
                                    <span class="material-icons" style="font-size: 12px; margin-right: 4px;">folder</span>
                                    ${this.formatTagDisplay(tag).split(' › ').pop()}
                                </sl-tag>`
                            ).join('')}
                        </div>` : ''}
                </div>
            </div>
        `}
        <div slot="footer" class="resource-actions">
            <sl-button-group>
                <sl-button size="small" class="preview-btn">
                    <span class="material-icons">visibility</span>
                </sl-button>
                ${category === 'props' ? `
                <sl-button size="small" class="edit-name-btn">
                    <span class="material-icons">edit</span>
                </sl-button>
                ` : ''}
                <sl-button size="small" class="delete-btn" variant="danger">
                    <span class="material-icons">delete</span>
                </sl-button>
            </sl-button-group>
        </div>
        `;

        // Add tag click handlers
        if (category === 'props') {
            const tagElements = card.querySelectorAll('.resource-tags sl-tag');
            tagElements.forEach(tag => {
                tag.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const tagValue = tag.dataset.tag;
                    this.setPropsTagFilter(drawer, tagValue);
                });
            });
        }

        // Add preview button handler
        card.querySelector('.preview-btn').addEventListener('click', () => {
            this.showResourcePreview(resource);
        });

        if (category === 'props') {
            card.querySelector('.edit-name-btn').addEventListener('click', () => {
                this.showNameEditor(resource, category, id, card);
            });
        }

        // Add delete button handler
        card.querySelector('.delete-btn').addEventListener('click', () => {
            const confirmMessage = `Delete ${category === 'ambient' || category === 'effects' ? 'sound' : 'resource'} "${resource.name}"?`;

            if (confirm(confirmMessage)) {
                if (category === 'ambient' || category === 'effects') {
                    this.deleteSound(id, category);
                } else {
                    this.deleteResource(category, id);
                }
                this.updateGallery(drawer, category, view);
            }
        });

        let eyeColor = "#999999"; // Default gray

// Update with the eye color
card.innerHTML = card.innerHTML.replace(
  '<span class="material-icons">visibility</span>',
  `<span class="material-icons" style="color: ${eyeColor};">visibility</span>`
);

// We'll update the real colors asynchronously
const viewBtn = card.querySelector('.preview-btn');
if (viewBtn) {
  viewBtn.dataset.resourceType = category;
  viewBtn.dataset.resourceId = id;
  
  // Update the eye color asynchronously
  this.checkResourceStorageLocation(category, id).then(location => {
    const eye = viewBtn.querySelector('.material-icons');
    if (eye) {
      eye.style.color = this.getStorageIndicatorColor(location);
    }
  });
}

        container.appendChild(card);
    });
}

// New method to update the tag sidebar
updateTagSidebar(drawer, sidebarElement) {
    sidebarElement.innerHTML = '';
    
    // Only proceed if we have folder data
    if (!this.propFolderMap || this.propFolderMap.size === 0) {
        // Add message about how to get tags
        sidebarElement.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                <span class="material-icons" style="color: #666;">info</span>
                <span style="color: #666; font-size: 0.9em;">Import folders to enable tag filtering</span>
            </div>
        `;
        return;
    }
    
    // Create header section with active filter info
    const headerElement = document.createElement('div');
    headerElement.style.cssText = `
        margin-bottom: 16px;
        font-weight: 500;
        color: #333;
    `;
    
    if (this.activeTagFilter) {
        // Show active filter info
        const parentData = this.propFolderMap.get(this.activeTagFilter);
        
        headerElement.innerHTML = `
            <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 8px;">
                <span class="material-icons" style="font-size: 18px; color: #666;">folder_open</span>
                <span>Current Filter:</span>
            </div>
            <div style="background: #e0e0e0; padding: 8px; border-radius: 4px; margin-bottom: 12px;">
                <div style="font-weight: bold;">${parentData ? parentData.label : this.formatTagDisplay(this.activeTagFilter)}</div>
            </div>
        `;
        
        // Add "up" button if not at root level
        if (this.activeTagFilter.includes('-')) {
            const upButton = document.createElement('sl-button');
            upButton.size = 'small';
            upButton.variant = 'neutral';
            upButton.style.width = '100%';
            upButton.style.marginBottom = '16px';
            upButton.innerHTML = `
                <span class="material-icons" style="font-size: 14px; margin-right: 4px;">arrow_upward</span>
                Up One Level
            `;
            
            // Go up one level on click
            upButton.addEventListener('click', () => {
                const tagParts = this.activeTagFilter.split('-');
                tagParts.pop();
                const parentFolder = tagParts.join('-');
                this.setPropsTagFilter(drawer, parentFolder);
            });
            
            headerElement.appendChild(upButton);
        }
    } else {
        // Show "All Props" header
        headerElement.innerHTML = `
            <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 8px;">
                <span class="material-icons" style="font-size: 18px; color: #666;">folder</span>
                <span>All Categories</span>
            </div>
        `;
    }
    
    sidebarElement.appendChild(headerElement);
    
    // Determine which tags to show based on active filter
    let tagsToShow = new Map();
    
    if (this.activeTagFilter) {
        // Find all direct child tags
        const parentTag = this.activeTagFilter;
        
        this.propFolderMap.forEach((data, tag) => {
            // Tag starts with parent but is not the parent itself
            if (tag !== parentTag && tag.startsWith(parentTag + '-')) {
                // Direct child only (no grandchildren)
                const tagParts = tag.split('-');
                const parentParts = parentTag.split('-');
                
                if (tagParts.length === parentParts.length + 1) {
                    tagsToShow.set(tag, data);
                }
            }
        });
    } else {
        // Show only top-level tags
        this.propFolderMap.forEach((data, tag) => {
            // Get only top-level folders (no hyphens means it's a root folder)
            const tagParts = tag.split('-');
            if (tagParts.length === 1) {
                tagsToShow.set(tag, data);
            }
        });
    }
    
    // Create tag list
    const tagList = document.createElement('div');
    tagList.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 4px;
    `;
    
    // Add tag entries
    tagsToShow.forEach((data, tag) => {
        const tagEntry = document.createElement('div');
        tagEntry.className = 'tag-entry';
        tagEntry.style.cssText = `
            background: white;
            border: 1px solid #e0e0e0;
            color: #000;
            border-radius: 4px;
            padding: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
        `;
        
        // Just show the last part of the tag name
        const displayName = this.formatTagDisplay(tag).split(' › ').pop();
        
        tagEntry.innerHTML = `
            <div style="display: flex; align-items: center; gap: 6px;">
                <span class="material-icons" style="font-size: 16px; color: #666;">folder</span>
                <span>${displayName}</span>
            </div>
        `;
        
        // Add hover effect
        tagEntry.addEventListener('mouseenter', () => {
            tagEntry.style.background = '#f0f0f0';
        });
        
        tagEntry.addEventListener('mouseleave', () => {
            tagEntry.style.background = 'white';
        });
        
        // Add click handler
        tagEntry.addEventListener('click', () => {
            this.setPropsTagFilter(drawer, tag);
        });
        
        tagList.appendChild(tagEntry);
    });
    
    if (tagsToShow.size === 0) {
        tagList.innerHTML = `
            <div style="text-align: center; color: #666; padding: 12px;">
                No subfolders found
            </div>
        `;
    }
    
    sidebarElement.appendChild(tagList);
}

// Method to update the props tag filter UI
updatePropsTagFilter(drawer, container) {
    // Remove any existing tag filter
    const existingFilter = container.querySelector('.props-tag-filter');
    if (existingFilter) {
        existingFilter.remove();
    }

    // Create tag filter container
    const tagFilterContainer = document.createElement('div');
    tagFilterContainer.className = 'props-tag-filter';
    tagFilterContainer.style.cssText = `
        margin-bottom: 16px;
        padding: 8px;
        background: #f5f5f5;
        border-radius: 4px;
    `;

    // Only proceed if we have folder data
    if (!this.propFolderMap || this.propFolderMap.size === 0) {
        // Add message about how to get tags
        tagFilterContainer.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span class="material-icons" style="color: #666;">info</span>
                <span style="color: #666; font-size: 0.9em;">Import folders to enable tag filtering</span>
            </div>
        `;
        container.prepend(tagFilterContainer);
        return;
    }

    // Add search box
    const searchContainer = document.createElement('div');
    searchContainer.style.cssText = `
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
    `;
    
    searchContainer.innerHTML = `
        <sl-input type="search" placeholder="Search props..." style="flex: 1;" id="props-search">
            <span slot="prefix" class="material-icons" style="font-size: 16px; color: #666;">search</span>
        </sl-input>
        ${this.activeTagFilter ? `
            <sl-button size="small" class="clear-tag-filter" variant="default">
                <span class="material-icons" style="font-size: 16px;">clear</span>
                Clear Filter
            </sl-button>
        ` : ''}
    `;
    
    tagFilterContainer.appendChild(searchContainer);

    // Add tag cloud for top-level folders
    const tagCloud = document.createElement('div');
    tagCloud.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    `;

    // Get unique top-level tags
    const topLevelTags = new Map();
    
    this.propFolderMap.forEach((data, tag) => {
        // Get only top-level folders (no hyphens means it's a root folder)
        const tagParts = tag.split('-');
        if (tagParts.length === 1) {
            topLevelTags.set(tag, data);
        }
    });
    
    // Add tags to the cloud
    topLevelTags.forEach((data, tag) => {
        const tagElement = document.createElement('sl-tag');
        tagElement.variant = this.activeTagFilter === tag ? 'primary' : 'neutral';
        tagElement.size = 'medium';
        tagElement.style.cursor = 'pointer';
        tagElement.innerHTML = `
            <span class="material-icons" style="font-size: 14px; margin-right: 4px;">folder</span>
            ${data.label}
        `;
        tagElement.dataset.tag = tag;
        
        // Add click handler
        tagElement.addEventListener('click', () => {
            this.setPropsTagFilter(drawer, tag);
        });
        
        tagCloud.appendChild(tagElement);
    });
    
    tagFilterContainer.appendChild(tagCloud);
    
    // If a tag is active, show its subcategories
    if (this.activeTagFilter) {
        // Find all child tags that belong to this parent
        const childTags = new Map();
        const parentTag = this.activeTagFilter;
        
        this.propFolderMap.forEach((data, tag) => {
            // Tag starts with parent but is not the parent itself
            if (tag !== parentTag && tag.startsWith(parentTag + '-')) {
                // Direct child only (no grandchildren)
                const tagParts = tag.split('-');
                const parentParts = parentTag.split('-');
                
                if (tagParts.length === parentParts.length + 1) {
                    childTags.set(tag, data);
                }
            }
        });
        
        // Add subtitle showing current path
        const pathElement = document.createElement('div');
        pathElement.style.cssText = `
            margin: 8px 0;
            font-weight: 500;
            color: #333;
            display: flex;
            align-items: center;
            gap: 4px;
        `;
        
        // Show breadcrumb
        const parentData = this.propFolderMap.get(parentTag);
        
        pathElement.innerHTML = `
            <span class="material-icons" style="font-size: 16px; color: #666;">folder_open</span>
            <span>${parentData ? parentData.label : this.formatTagDisplay(parentTag)}</span>
        `;
        
        // Add "up" button if not at root level
        if (parentTag.includes('-')) {
            const upButton = document.createElement('sl-button');
            upButton.size = 'small';
            upButton.variant = 'neutral';
            upButton.style.marginLeft = 'auto';
            upButton.innerHTML = `
                <span class="material-icons" style="font-size: 14px;">arrow_upward</span>
                Up
            `;
            
            // Go up one level on click
            upButton.addEventListener('click', () => {
                const tagParts = parentTag.split('-');
                tagParts.pop();
                const parentFolder = tagParts.join('-');
                this.setPropsTagFilter(drawer, parentFolder);
            });
            
            pathElement.appendChild(upButton);
        }
        
        tagFilterContainer.appendChild(pathElement);
        
        // Add subcategory tags if any exist
        if (childTags.size > 0) {
            const subTagCloud = document.createElement('div');
            subTagCloud.style.cssText = `
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 8px;
                padding: 8px;
                background: #fff;
                border-radius: 4px;
            `;
            
            childTags.forEach((data, tag) => {
                const tagElement = document.createElement('sl-tag');
                tagElement.variant = 'neutral';
                tagElement.size = 'small';
                tagElement.style.cursor = 'pointer';
                
                // Just show the last part of the tag name
                const displayName = this.formatTagDisplay(tag).split(' › ').pop();
                
                tagElement.innerHTML = `
                    <span class="material-icons" style="font-size: 12px; margin-right: 4px;">folder</span>
                    ${displayName}
                `;
                tagElement.dataset.tag = tag;
                
                // Add click handler
                tagElement.addEventListener('click', () => {
                    this.setPropsTagFilter(drawer, tag);
                });
                
                subTagCloud.appendChild(tagElement);
            });
            
            tagFilterContainer.appendChild(subTagCloud);
        }
    }
    
    // Register search handler
    const searchInput = searchContainer.querySelector('#props-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            this.filterPropsByName(drawer, e.target.value);
        });
    }
    
    // Register clear filter handler
    const clearBtn = searchContainer.querySelector('.clear-tag-filter');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            this.clearPropsTagFilter(drawer);
        });
    }
    
    // Add the tag filter to the container
    container.prepend(tagFilterContainer);
}

// Method to set the active tag filter
setPropsTagFilter(drawer, tag) {
    console.log(`Setting props tag filter: ${tag}`);
    this.activeTagFilter = tag;
    this.updateGallery(drawer, 'props');
}

// Method to clear the active tag filter
clearPropsTagFilter(drawer) {
    console.log('Clearing props tag filter');
    this.activeTagFilter = null;
    this.updateGallery(drawer, 'props');
}

// Filter props by name without changing the tag filter
filterPropsByName(drawer, searchTerm) {
    console.log(`Filtering props by name: ${searchTerm}`);
    
    const container = drawer.querySelector('#propsGallery');
    if (!container) return;
    
    // Get all prop cards
    const cards = container.querySelectorAll('.resource-item');
    
    // Show/hide based on name match
    cards.forEach(card => {
        const nameElement = card.querySelector('.resource-name');
        if (!nameElement) return;
        
        const name = nameElement.textContent.toLowerCase();
        const isMatch = !searchTerm || name.includes(searchTerm.toLowerCase());
        
        card.style.display = isMatch ? '' : 'none';
    });
}

showNameEditor(resource, category, id, cardElement) {
    const dialog = document.createElement('sl-dialog');
    dialog.label = 'Edit Prop Name';
    
    dialog.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 16px;">
            <div style="display: flex; gap: 8px; align-items: center;">
                <img src="${resource.thumbnail}" alt="${resource.name}" 
                     style="width: 64px; height: 64px; object-fit: contain; border-radius: 4px;">
                <div>
                    <div style="font-weight: bold; margin-bottom: 4px;">Original Filename:</div>
                    <div style="color: #666; font-style: italic;">${resource.originalFilename || resource.name}</div>
                </div>
            </div>
            
            <sl-input label="Prop Name" id="propName" value="${resource.name}"></sl-input>
            
            <div>
                <div style="margin-bottom: 8px; color: #666;">
                    <small>Enter a descriptive name for this prop. This name will be used throughout the application.</small>
                </div>
            </div>
        </div>
        
        <div slot="footer">
            <sl-button variant="neutral" class="cancel-btn">Cancel</sl-button>
            <sl-button variant="primary" class="save-btn">Save Changes</sl-button>
        </div>
    `;
    
    document.body.appendChild(dialog);
    dialog.show();
    
    const nameInput = dialog.querySelector('#propName');
    
    // Focus the input when the dialog opens
    dialog.addEventListener('sl-after-show', () => {
        nameInput.focus();
        // Select the text for easy editing
        nameInput.select();
    });
    
    // Handle save
    dialog.querySelector('.save-btn').addEventListener('click', () => {
        const newName = nameInput.value.trim();
        
        if (newName && newName !== resource.name) {
            // Update the resource name
            resource.name = newName;
            
            // Update UI
            const nameElement = cardElement.querySelector('.resource-name');
            if (nameElement) {
                nameElement.textContent = newName;
            }
            
            // If there's no originalFilename stored, store the current one
            if (!resource.originalFilename) {
                resource.originalFilename = resource.name;
            }
            
            console.log(`Updated prop name: ${id} -> "${newName}"`);
        }
        
        dialog.hide();
    });
    
    // Handle cancel
    dialog.querySelector('.cancel-btn').addEventListener('click', () => {
        dialog.hide();
    });
    
    // Cleanup
    dialog.addEventListener('sl-after-hide', () => {
        dialog.remove();
    });
}

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    // Preview method
    async showResourcePreview(resource) {
        const dialog = document.createElement('sl-dialog');
        dialog.label = resource.name;

        let cropActive = false;
        let cropStart = { x: 0, y: 0 };
        let currentCrop = null;

        dialog.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 16px;">
                <div class="image-container" style="position: relative; overflow: hidden; background: #333;">
                    <img src="${resource.data}" 
                         alt="${resource.name}"
                         style="max-width: 100%; max-height: 70vh; display: block; margin: auto; user-select: none; -webkit-user-drag: none;">
                    <div class="crop-overlay" style="display: none; position: absolute; 
                         border: 2px solid #4CAF50; background: rgba(76, 175, 80, 0.2);
                         pointer-events: none;">
                    </div>
                </div>
                
                <div style="display: flex; gap: 8px; justify-content: center;">
                    <sl-button class="crop-btn" variant="primary">
                        <span class="material-icons">crop</span>
                        Start Crop
                    </sl-button>
                    <sl-button class="apply-crop-btn" variant="success" disabled>
                        <span class="material-icons">save</span>
                        Apply Crop
                    </sl-button>
                    <sl-button class="reset-crop-btn" variant="neutral" disabled>
                        <span class="material-icons">restart_alt</span>
                        Reset
                    </sl-button>
                </div>
    
                <div class="crop-instructions" style="display: none; color: #666; text-align: center;">
                    Click and drag to select crop area
                </div>
            </div>
        `;

        const container = dialog.querySelector('.image-container');
        const img = dialog.querySelector('img');
        const overlay = dialog.querySelector('.crop-overlay');
        const cropBtn = dialog.querySelector('.crop-btn');
        const applyCropBtn = dialog.querySelector('.apply-crop-btn');
        const resetCropBtn = dialog.querySelector('.reset-crop-btn');
        const instructions = dialog.querySelector('.crop-instructions');

        // Prevent image dragging
        img.addEventListener('dragstart', (e) => e.preventDefault());
        img.addEventListener('mousedown', (e) => e.preventDefault());

        // Enable cropping
        cropBtn.addEventListener('click', () => {
            cropActive = !cropActive;
            if (cropActive) {
                cropBtn.variant = 'primary';
                container.style.cursor = 'crosshair';
                instructions.style.display = 'block';
            } else {
                cropBtn.variant = 'default';
                container.style.cursor = 'default';
                instructions.style.display = 'none';
                overlay.style.display = 'none';
            }
        });

        // Handle crop selection
        container.addEventListener('mousedown', (e) => {
            if (!cropActive) return;
            e.preventDefault(); // Prevent any dragging

            const rect = container.getBoundingClientRect();
            const imgRect = img.getBoundingClientRect();

            // Adjust start position to be relative to the image, not the container
            cropStart = {
                x: Math.max(imgRect.left, Math.min(imgRect.right, e.clientX)) - rect.left,
                y: Math.max(imgRect.top, Math.min(imgRect.bottom, e.clientY)) - rect.top
            };

            overlay.style.display = 'block';
            overlay.style.left = `${cropStart.x}px`;
            overlay.style.top = `${cropStart.y}px`;
            overlay.style.width = '0px';
            overlay.style.height = '0px';

            const moveHandler = (e) => {
                const currentX = Math.max(imgRect.left, Math.min(imgRect.right, e.clientX)) - rect.left;
                const currentY = Math.max(imgRect.top, Math.min(imgRect.bottom, e.clientY)) - rect.top;

                const width = currentX - cropStart.x;
                const height = currentY - cropStart.y;

                overlay.style.width = `${Math.abs(width)}px`;
                overlay.style.height = `${Math.abs(height)}px`;
                overlay.style.left = `${width < 0 ? currentX : cropStart.x}px`;
                overlay.style.top = `${height < 0 ? currentY : cropStart.y}px`;
            };

            const upHandler = () => {
                document.removeEventListener('mousemove', moveHandler);
                document.removeEventListener('mouseup', upHandler);

                // Store crop data
                const overlayRect = overlay.getBoundingClientRect();
                const imgRect = img.getBoundingClientRect();

                // Calculate crop relative to actual image dimensions
                currentCrop = {
                    x: (overlayRect.left - imgRect.left) / img.offsetWidth,
                    y: (overlayRect.top - imgRect.top) / img.offsetHeight,
                    width: overlayRect.width / img.offsetWidth,
                    height: overlayRect.height / img.offsetHeight
                };

                applyCropBtn.disabled = false;
                resetCropBtn.disabled = false;
            };

            document.addEventListener('mousemove', moveHandler);
            document.addEventListener('mouseup', upHandler);
        });

        // Apply crop
        applyCropBtn.addEventListener('click', async () => {
            if (!currentCrop) return;

            try {
                // Create canvas for cropping
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Load image
                const tempImg = new Image();
                tempImg.src = resource.data;

                await new Promise((resolve, reject) => {
                    tempImg.onload = () => {
                        // Set canvas size to crop size
                        canvas.width = tempImg.width * currentCrop.width;
                        canvas.height = tempImg.height * currentCrop.height;

                        // Draw cropped portion
                        ctx.drawImage(
                            tempImg,
                            tempImg.width * currentCrop.x,
                            tempImg.height * currentCrop.y,
                            tempImg.width * currentCrop.width,
                            tempImg.height * currentCrop.height,
                            0, 0, canvas.width, canvas.height
                        );

                        // Update resource with cropped image
                        resource.data = canvas.toDataURL('image/png');

                        // Generate new thumbnail
                        const thumbnailCanvas = document.createElement('canvas');
                        const thumbCtx = thumbnailCanvas.getContext('2d');
                        thumbnailCanvas.width = 100;
                        thumbnailCanvas.height = 100;

                        // Draw thumbnail
                        thumbCtx.drawImage(canvas, 0, 0, 100, 100);
                        resource.thumbnail = thumbnailCanvas.toDataURL('image/png');

                        dialog.hide();
                        resolve();
                    };
                    tempImg.onerror = reject;
                });
            } catch (error) {
                console.error('Error applying crop:', error);
            }
        });

        // Reset crop
        resetCropBtn.addEventListener('click', () => {
            overlay.style.display = 'none';
            currentCrop = null;
            applyCropBtn.disabled = true;
            resetCropBtn.disabled = true;
        });

        document.body.appendChild(dialog);
        dialog.show();
    }

    // Delete method
    deleteResource(category, id) {
        const resources = this.resources.textures[category];
        if (resources) {
            resources.delete(id);
        }
    }



/**
 * Updated implementation with consistent card sizes across all sections
 */
initStyles() {
    const styles = document.createElement("style");
    styles.textContent = `
    /* Resource Manager Styles */
    .resource-manager-drawer::part(panel) {
      --size: calc(100vw - var(--toolbar-width));
      background: #242424;
      color: #e0e0e0;
      left: var(--toolbar-width);
    }
    
    .resource-manager-drawer::part(header) {
      background: #333;
      border-bottom: 1px solid #444;
      padding: 0 16px;
      height: 48px;
      display: flex;
      align-items: center;
    }
    
    .resource-manager-drawer::part(body) {
      padding: 0;
    }
    
    .resource-manager-drawer::part(footer) {
      background: #333;
      border-top: 1px solid #444;
      padding: 12px;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    
    /* Main container structure */
    .rm-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }
    
    .rm-tabs-container {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    .rm-tab {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    /* Panel structure */
    .rm-panel-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }
    
    .rm-categories-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: #333;
      border-bottom: 1px solid #444;
    }
    
    .rm-categories {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    
    .rm-actions {
      display: flex;
      gap: 8px;
    }
    
    .rm-view-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      background: #2d2d2d;
      border-bottom: 1px solid #444;
    }
    
    .rm-search {
      flex: 1;
      max-width: 300px;
    }
    
    .rm-view-toggles {
      display: flex;
      align-items: center;
    }
    
    /* Content area with props sidebar */
    .rm-scrollable-content {
      flex: 1;
      display: flex;
      overflow: hidden;
    }
    
    .rm-props-sidebar {
      width: 220px;
      min-width: 220px;
      background: #2a2a2a;
      border-right: 1px solid #444;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    
    .rm-props-tags-header {
      padding: 12px;
      border-bottom: 1px solid #444;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .rm-props-title {
      font-weight: 500;
      font-size: 14px;
    }
    
    .rm-props-tags-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }
    
    .rm-gallery-wrapper {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }
    
    /* Tag items styling */
    .rm-tag-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      margin-bottom: 4px;
      background: #333;
      transition: background-color 0.15s;
    }
    
    .rm-tag-item:hover {
      background: #444;
    }
    
    .rm-tag-label {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .rm-tag-count {
      background: #444;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 11px;
      color: #ccc;
    }
    
    .rm-tag-back {
      background: #444;
      border-left: 3px solid #666;
    }
    
    .rm-current-folder {
      padding: 8px 12px;
      margin-bottom: 8px;
      background: #444;
      border-radius: 4px;
    }
    
    .rm-current-folder-name {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      margin-bottom: 4px;
    }
    
    .rm-current-folder-count {
      font-size: 12px;
      color: #aaa;
    }
    
    .rm-no-tags, .rm-no-subfolders {
      padding: 16px;
      text-align: center;
      color: #888;
    }
    
    .rm-no-tags-icon {
      font-size: 24px;
      margin-bottom: 8px;
    }
    
    .rm-no-tags-text {
      font-size: 13px;
    }
    
    /* Gallery styling - CONSISTENT ACROSS ALL SECTIONS */
    .gallery-container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 16px;
    }
    
    .gallery-container.gallery-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    /* Resource item styling - same as original */
    .resource-item {
      border: 1px solid #444;
      border-radius: 4px;
      padding: 0.5rem;
      transition: all 0.2s ease;
      background: #333;
    }
    
    .resource-item:hover {
      border-color: #673ab7;
      transform: translateY(-2px);
    }
    
    .resource-thumbnail {
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
      border-radius: 4px;
      margin-bottom: 0.5rem;
    }
    
    .resource-info {
      font-size: 0.9rem;
      color: #e0e0e0;
    }
    
    .resource-name {
      font-weight: 500;
      margin-bottom: 4px;
      color: #e0e0e0;
      word-wrap: break-word;
      overflow-wrap: break-word;
      white-space: normal;
      max-width: 90%;
    }
    
    .resource-meta {
      font-size: 0.8em;
      color: #999;
    }
    
    .resource-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 6px;
    }
    
    /* Preserve original resource actions styling */
    .resource-actions {
      margin-top: 8px;
      display: flex;
      justify-content: center;
    }
    
    /* Bestiary specific styles - match original */
    #bestiaryGallery .resource-item {
      transition: all 0.2s ease;
      border: 1px solid #444;
    }
    
    #bestiaryGallery .resource-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      border-color: #673ab7;
    }
    
    #bestiaryGallery .resource-name {
      font-weight: 500;
      margin-bottom: 4px;
    }
    
    #bestiaryGallery .resource-meta {
      font-size: 0.8em;
      color: #999;
    }
    
    #bestiaryGallery .monster-badge {
      font-size: 0.75rem;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 2px 5px;
      border-radius: 10px;
      position: absolute;
      top: 6px;
      right: 6px;
    }
    
    /* Grid/List view styles */
    .gallery-grid .resource-thumbnail {
      aspect-ratio: 1;
      object-fit: cover;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    
    .gallery-list .resource-thumbnail {
      width: 60px;
      height: 60px;
      border-radius: 4px;
      object-fit: cover;
    }
    
    .gallery-list .resource-item {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .gallery-list .resource-info {
      flex: 1;
    }
    
    /* Tab panel styling */
    .resource-manager-drawer sl-tab-group::part(base) {
      height: 100%;
    }
    
    .resource-manager-drawer sl-tab-panel::part(base) {
      height: 100%;
      padding: 0;
    }
    
    /* Button styling */
    .resource-manager-drawer sl-button[variant="primary"]::part(base) {
      background: #673ab7;
      border-color: #673ab7;
    }
    
    .resource-manager-drawer sl-button[variant="primary"]:hover::part(base) {
      background: #7e57c2;
      border-color: #7e57c2;
    }
    
    /* Footer styling */
    .rm-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    `;
    
    document.head.appendChild(styles);
  }
  
  /**
   * Create the resource manager UI with consistent card sizes and preserved functionality
   */
  createResourceManagerUI() {
    // Initialize styles once
    if (!this._stylesInitialized) {
      this.initStyles();
      this._stylesInitialized = true;
    }
  
    // Create the drawer
    const drawer = document.createElement('sl-drawer');
    drawer.label = "Resource Manager";
    drawer.placement = "end";
    drawer.classList.add("resource-manager-drawer");
    
    // Main content structure
    drawer.innerHTML = `
      <div class="rm-container">
        <!-- Tab Navigation -->
        <div class="rm-tabs-container">
          <sl-tab-group id="rmTabGroup">
            <sl-tab slot="nav" panel="textures" class="rm-tab">
              <span class="material-icons">image</span>
              <span class="rm-tab-label">Textures</span>
            </sl-tab>
            <sl-tab slot="nav" panel="sounds" class="rm-tab">
              <span class="material-icons">volume_up</span>
              <span class="rm-tab-label">Sounds</span>
            </sl-tab>
            <sl-tab slot="nav" panel="splashArt" class="rm-tab">
              <span class="material-icons">photo_library</span>
              <span class="rm-tab-label">Splash Art</span>
            </sl-tab>
            <sl-tab slot="nav" panel="bestiary" class="rm-tab">
              <span class="material-icons">pets</span>
              <span class="rm-tab-label">Bestiary</span>
            </sl-tab>
            <sl-tab slot="nav" panel="shapeforge" class="rm-tab">
  <span class="material-icons">view_in_ar</span>
  <span class="rm-tab-label">3D Models</span>
</sl-tab>
            
            <!-- Textures Panel -->
            <sl-tab-panel name="textures">
              <div class="rm-panel-container">
                <!-- Texture Categories Bar -->
                <div class="rm-categories-bar">
                  <div class="rm-categories">
                    <sl-button-group class="texture-categories">
                      <sl-button size="small" data-category="walls">Walls</sl-button>
                      <sl-button size="small" data-category="doors">Doors</sl-button>
                      <sl-button size="small" data-category="environmental">Environmental</sl-button>
                      <sl-button size="small" data-category="props">Props</sl-button>
                    </sl-button-group>
                  </div>
                  <div class="rm-actions">
                    <sl-button size="small" class="texture-upload-btn" variant="primary">
                      <span class="material-icons">add_circle</span>
                      <span>Add</span>
                    </sl-button>
                    <input type="file" hidden accept="image/*" multiple class="texture-file-input">
                  </div>
                </div>
                
                <!-- View Controls -->
                <div class="rm-view-controls">
                  <div class="rm-search">
                    <sl-input placeholder="Search..." size="small" clearable id="textureSearch">
                      <span slot="prefix" class="material-icons">search</span>
                    </sl-input>
                  </div>
                  <div class="rm-view-toggles">
                    <sl-button-group>
                      <sl-button size="small" class="view-toggle" data-view="grid" variant="primary">
                        <span class="material-icons">grid_view</span>
                      </sl-button>
                      <sl-button size="small" class="view-toggle" data-view="list">
                        <span class="material-icons">view_list</span>
                      </sl-button>
                    </sl-button-group>
                  </div>
                </div>
                
                <!-- Content Area -->
                <div class="rm-scrollable-content">
                  <!-- Props Sidebar (only visible in props category) -->
                  <div class="rm-props-sidebar" id="propsSidebar" style="display: none;">
                    <div class="rm-props-tags-header">
                      <div class="rm-props-title">Categories</div>
                      <sl-button size="small" class="rm-clear-tags-btn" circle>
                        <span class="material-icons">filter_alt_off</span>
                      </sl-button>
                    </div>
                    <div class="rm-props-tags-list" id="propsTagsList">
                      <!-- Tags will be added here dynamically -->
                    </div>
                  </div>
                  
                  <!-- Gallery Containers -->
                  <div class="rm-gallery-wrapper">
                    <div id="wallsGallery" class="gallery-container gallery-grid"></div>
                    <div id="doorsGallery" class="gallery-container gallery-grid" style="display: none;"></div>
                    <div id="environmentalGallery" class="gallery-container gallery-grid" style="display: none;"></div>
                    <div id="propsGallery" class="gallery-container gallery-grid" style="display: none;"></div>
                  </div>
                </div>
              </div>
            </sl-tab-panel>
            
            <!-- Sounds Panel -->
            <sl-tab-panel name="sounds">
              <div class="rm-panel-container">
                <!-- Sound Categories -->
                <div class="rm-categories-bar">
                  <div class="rm-categories">
                    <sl-button-group class="sound-categories">
                      <sl-button size="small" data-category="ambient" variant="primary">Ambient</sl-button>
                      <sl-button size="small" data-category="effects">Effects</sl-button>
                    </sl-button-group>
                  </div>
                  <div class="rm-actions">
                    <sl-button size="small" class="sound-upload-btn" variant="primary">
                      <span class="material-icons">add_circle</span>
                      <span>Add</span>
                    </sl-button>
                    <input type="file" hidden accept="audio/*" multiple class="sound-file-input">
                  </div>
                </div>
                
                <!-- View Controls -->
                <div class="rm-view-controls">
                  <div class="rm-search">
                    <sl-input placeholder="Search sounds..." size="small" clearable id="soundSearch">
                      <span slot="prefix" class="material-icons">search</span>
                    </sl-input>
                  </div>
                  <div class="rm-view-toggles">
                    <sl-button-group>
                      <sl-button size="small" class="view-toggle" data-view="grid" variant="primary">
                        <span class="material-icons">grid_view</span>
                      </sl-button>
                      <sl-button size="small" class="view-toggle" data-view="list">
                        <span class="material-icons">view_list</span>
                      </sl-button>
                    </sl-button-group>
                  </div>
                </div>
                
                <!-- Content Area -->
                <div class="rm-scrollable-content">
                  <div class="rm-gallery-wrapper">
                    <div id="ambientGallery" class="gallery-container gallery-grid"></div>
                    <div id="effectsGallery" class="gallery-container gallery-grid" style="display: none;"></div>
                  </div>
                </div>
              </div>
            </sl-tab-panel>
            
            <!-- Splash Art Panel -->
            <sl-tab-panel name="splashArt">
              <div class="rm-panel-container">
                <!-- Splash Art Categories -->
                <div class="rm-categories-bar">
                  <div class="rm-categories">
                    <sl-button-group>
                      <sl-button size="small" data-category="title" variant="primary">Title Screen</sl-button>
                      <sl-button size="small" data-category="loading">Loading</sl-button>
                      <sl-button size="small" data-category="background">Background</sl-button>
                    </sl-button-group>
                  </div>
                  <div class="rm-actions">
                    <sl-button size="small" class="splashart-upload-btn" variant="primary">
                      <span class="material-icons">add_circle</span>
                      <span>Add</span>
                    </sl-button>
                    <input type="file" hidden accept="image/*" multiple class="splashart-file-input">
                  </div>
                </div>
                
                <!-- View Controls -->
                <div class="rm-view-controls">
                  <div class="rm-search">
                    <sl-input placeholder="Search..." size="small" clearable id="splashArtSearch">
                      <span slot="prefix" class="material-icons">search</span>
                    </sl-input>
                  </div>
                  <div class="rm-view-toggles">
                    <sl-button-group>
                      <sl-button size="small" class="view-toggle" data-view="grid" variant="primary">
                        <span class="material-icons">grid_view</span>
                      </sl-button>
                      <sl-button size="small" class="view-toggle" data-view="list">
                        <span class="material-icons">view_list</span>
                      </sl-button>
                    </sl-button-group>
                  </div>
                </div>
                
                <!-- Content Area -->
                <div class="rm-scrollable-content">
                  <div class="rm-gallery-wrapper">
                    <div id="titleGallery" class="gallery-container gallery-grid"></div>
                    <div id="loadingGallery" class="gallery-container gallery-grid" style="display: none;"></div>
                    <div id="backgroundGallery" class="gallery-container gallery-grid" style="display: none;"></div>
                  </div>
                </div>
              </div>
            </sl-tab-panel>
            
            <!-- Bestiary Panel -->
            <sl-tab-panel name="bestiary">
              <div class="rm-panel-container">
                <!-- Bestiary Controls -->
                <div class="rm-categories-bar">
                  <div class="rm-categories">
                    <sl-select size="small" placeholder="Filter by type" id="monsterTypeFilter">
                      <sl-option value="">All Types</sl-option>
                      <sl-option value="humanoid">Humanoid</sl-option>
                      <sl-option value="beast">Beast</sl-option>
                      <sl-option value="monstrosity">Monstrosity</sl-option>
                      <sl-option value="dragon">Dragon</sl-option>
                      <sl-option value="undead">Undead</sl-option>
                      <sl-option value="fiend">Fiend</sl-option>
                    </sl-select>
                    <sl-select size="small" placeholder="Filter by CR" id="monsterCrFilter">
                      <sl-option value="">All CRs</sl-option>
                      <sl-option value="0-1">CR 0-1</sl-option>
                      <sl-option value="2-5">CR 2-5</sl-option>
                      <sl-option value="6-10">CR 6-10</sl-option>
                      <sl-option value="11-15">CR 11-15</sl-option>
                      <sl-option value="16+">CR 16+</sl-option>
                    </sl-select>
                  </div>
                  <div class="rm-actions">
                    <sl-button size="small" class="add-monster-btn" variant="primary">
                      <span class="material-icons">add_circle</span>
                      <span>Add Monster</span>
                    </sl-button>
                  </div>
                </div>
                
                <!-- View Controls -->
                <div class="rm-view-controls">
                  <div class="rm-search">
                    <sl-input placeholder="Search monsters..." size="small" clearable id="monsterSearch">
                      <span slot="prefix" class="material-icons">search</span>
                    </sl-input>
                  </div>
                  <div class="rm-view-toggles">
                    <sl-button-group>
                      <sl-button size="small" class="view-toggle" data-view="grid" variant="primary">
                        <span class="material-icons">grid_view</span>
                      </sl-button>
                      <sl-button size="small" class="view-toggle" data-view="list">
                        <span class="material-icons">view_list</span>
                      </sl-button>
                    </sl-button-group>
                  </div>
                </div>
                
                <!-- Content Area -->
                <div class="rm-scrollable-content">
                  <div class="rm-gallery-wrapper">
                    <div id="bestiaryGallery" class="gallery-container gallery-grid"></div>
                  </div>
                </div>
              </div>
            </sl-tab-panel>

            <!-- 3D Models Panel -->
            <sl-tab-panel name="shapeforge">
  <div class="rm-panel-container">
    <!-- ShapeForge Panel Header -->
    <div class="rm-categories-bar">
      <div class="rm-categories">
        <h3 style="margin: 0;">3D Models</h3>
      </div>
      <div class="rm-actions">
        <sl-button size="small" class="model-upload-btn" variant="primary">
          <span class="material-icons">add_circle</span>
          <span>Import Model</span>
        </sl-button>
        <input type="file" hidden accept=".json" class="model-file-input">
      </div>
    </div>
    
    <!-- View Controls -->
    <div class="rm-view-controls">
      <div class="rm-search">
        <sl-input placeholder="Search models..." size="small" clearable id="modelSearch">
          <span slot="prefix" class="material-icons">search</span>
        </sl-input>
      </div>
      <div class="rm-view-toggles">
        <sl-button-group>
          <sl-button size="small" class="view-toggle" data-view="grid" variant="primary">
            <span class="material-icons">grid_view</span>
          </sl-button>
          <sl-button size="small" class="view-toggle" data-view="list">
            <span class="material-icons">view_list</span>
          </sl-button>
        </sl-button-group>
      </div>
    </div>
    
    <!-- Content Area -->
    <div class="rm-scrollable-content">
      <div class="rm-gallery-wrapper">
        <div id="shapeforgeGallery" class="gallery-container gallery-grid"></div>
      </div>
    </div>
  </div>
</sl-tab-panel>

          </sl-tab-group>
        </div>
      </div>
    `;
    
    // Add footer
    const footerDiv = document.createElement('div');
    footerDiv.setAttribute('slot', 'footer');
    footerDiv.className = 'rm-footer';
    footerDiv.innerHTML = `
      <div class="footer-left" style="display: flex; gap: 8px;">
        <sl-button variant="success" id="optimizeStorageBtn" size="small">
          <span class="material-icons" slot="prefix">settings_suggest</span>
          Manage Storage
        </sl-button>
        
        <!-- Storage Legend (compact version) -->
        <div class="storage-legend-compact" style="display: flex; align-items: center; gap: 8px; background: rgba(20, 20, 20, 0.3); padding: 4px 8px; border-radius: 4px;">
          <div style="display: flex; align-items: center; gap: 2px;">
            <span class="material-icons" style="color: #4CAF50; font-size: 16px;">visibility</span>
            <span style="font-size: 0.8em;">DB</span>
          </div>
          <div style="display: flex; align-items: center; gap: 2px;">
            <span class="material-icons" style="color: #FFC107; font-size: 16px;">visibility</span>
            <span style="font-size: 0.8em;">LS</span>
          </div>
          <div style="display: flex; align-items: center; gap: 2px;">
            <span class="material-icons" style="color: #FFFFFF; font-size: 16px;">visibility</span>
            <span style="font-size: 0.8em;">Both</span>
          </div>
        </div>
      </div>
      
      <div class="footer-right" style="display: flex; gap: 8px; margin-left: auto;">
        <sl-button variant="primary" id="saveResourcePack">
          <span class="material-icons" slot="prefix">save</span>
          Save
        </sl-button>
        <sl-button variant="neutral" id="loadResourcePack">
          <span class="material-icons" slot="prefix">folder_open</span>
          Load
        </sl-button>
        <sl-button variant="warning" id="exitResourceManager">
          <span class="material-icons" slot="prefix">close</span>
          Close
        </sl-button>
      </div>
    `;
    drawer.appendChild(footerDiv);
    
    // Initialize functionality
    if (this.mapEditor && !this.monsterManager) {
      this.initializeMonsterManager(this.mapEditor).then(() => {
        // Load bestiary gallery after initialization
        const bestiaryPanel = drawer.querySelector('sl-tab-panel[name="bestiary"]');
        if (bestiaryPanel) {
          this.updateBestiaryGallery(drawer, 'grid');
        }
      });
    }
    
    // Add event handlers
    this.setupEventHandlers(drawer);
    this.setupPropsTagging(drawer);
    this.setupSearchFiltering(drawer);
    
    // Add drawer to document
    document.body.appendChild(drawer);
    return drawer;
  }
  
  /**
   * Setup props tagging functionality 
   */
  setupPropsTagging(drawer) {
    // Get relevant elements
    const propsSidebar = drawer.querySelector('#propsSidebar');
    const propsTagsList = drawer.querySelector('#propsTagsList');
    const clearTagsBtn = drawer.querySelector('.rm-clear-tags-btn');
    
    if (!propsSidebar || !propsTagsList) return;
    
    // Function to update props tags list
    const updateTagsList = () => {
      if (!this.propFolderMap || this.propFolderMap.size === 0) {
        propsTagsList.innerHTML = `
          <div class="rm-no-tags">
            <div class="rm-no-tags-icon">
              <span class="material-icons">folder_off</span>
            </div>
            <div class="rm-no-tags-text">
              Import folder of props to enable tagging
            </div>
          </div>
        `;
        return;
      }
      
      // Clear previous tags
      propsTagsList.innerHTML = '';
      
      // Determine which tags to show
      let tagsToShow = new Map();
      
      if (this.activeTagFilter) {
        // Add back button for navigation
        if (this.activeTagFilter.includes('-')) {
          const upBtn = document.createElement('div');
          upBtn.className = 'rm-tag-item rm-tag-back';
          
          const tagParts = this.activeTagFilter.split('-');
          tagParts.pop();
          const parentFolder = tagParts.join('-');
          
          const parentData = this.propFolderMap.get(parentFolder) || {};
          const parentName = parentData.label || 'Back';
          
          upBtn.innerHTML = `
            <span class="material-icons">arrow_upward</span>
            <span class="rm-tag-label">${parentName}</span>
          `;
          
          upBtn.addEventListener('click', () => {
            this.setPropsTagFilter(drawer, parentFolder);
          });
          
          propsTagsList.appendChild(upBtn);
        }
        
        // Show current folder info
        const currentFolder = this.propFolderMap.get(this.activeTagFilter);
        if (currentFolder) {
          const folderInfo = document.createElement('div');
          folderInfo.className = 'rm-current-folder';
          folderInfo.innerHTML = `
            <div class="rm-current-folder-name">
              <span class="material-icons">folder_open</span>
              <span>${currentFolder.label}</span>
            </div>
            <div class="rm-current-folder-count">
              ${currentFolder.files ? currentFolder.files.length : 0} items
            </div>
          `;
          propsTagsList.appendChild(folderInfo);
        }
        
        // Show child folders
        const parentTag = this.activeTagFilter;
        this.propFolderMap.forEach((data, tag) => {
          if (tag !== parentTag && tag.startsWith(parentTag + '-')) {
            // Direct child only
            const tagParts = tag.split('-');
            const parentParts = parentTag.split('-');
            
            if (tagParts.length === parentParts.length + 1) {
              tagsToShow.set(tag, data);
            }
          }
        });
      } else {
        // Show top-level folders
        this.propFolderMap.forEach((data, tag) => {
          const tagParts = tag.split('-');
          if (tagParts.length === 1) {
            tagsToShow.set(tag, data);
          }
        });
      }
      
      // Create tag items
      tagsToShow.forEach((data, tag) => {
        const tagItem = document.createElement('div');
        tagItem.className = 'rm-tag-item';
        
        // Just show the last part of the tag name
        const displayName = this.formatTagDisplay(tag).split(' › ').pop();
        
        tagItem.innerHTML = `
          <span class="material-icons">folder</span>
          <span class="rm-tag-label">${displayName}</span>
          <span class="rm-tag-count">${data.files ? data.files.length : 0}</span>
        `;
        
        tagItem.addEventListener('click', () => {
          this.setPropsTagFilter(drawer, tag);
        });
        
        propsTagsList.appendChild(tagItem);
      });
    };
    
    // Handle category button clicks
    const categoryButtons = drawer.querySelectorAll('.texture-categories sl-button');
    categoryButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const category = btn.dataset.category;
        
        // Show/hide props sidebar
        if (category === 'props') {
          propsSidebar.style.display = 'flex';
          updateTagsList();
        } else {
          propsSidebar.style.display = 'none';
        }
      });
    });
    
    // Clear filter button
    if (clearTagsBtn) {
      clearTagsBtn.addEventListener('click', () => {
        this.activeTagFilter = null;
        this.updateGallery(drawer, 'props');
        updateTagsList();
      });
    }
    
    // Enhance tag filtering with update for the sidebar
    const originalSetPropsTagFilter = this.setPropsTagFilter;
    this.setPropsTagFilter = (drawer, tag) => {
      originalSetPropsTagFilter.call(this, drawer, tag);
      updateTagsList();
    };
  }
  
  /**
   * Setup search filtering in all panels
   */
  setupSearchFiltering(drawer) {
    // Texture search
    const textureSearch = drawer.querySelector('#textureSearch');
    if (textureSearch) {
      textureSearch.addEventListener('input', () => {
        const searchTerm = textureSearch.value.toLowerCase();
        const activeCategory = drawer.querySelector('.texture-categories sl-button[variant="primary"]')?.dataset.category;
        if (!activeCategory) return;
        
        const galleryItems = drawer.querySelectorAll(`#${activeCategory}Gallery .resource-item`);
        
        galleryItems.forEach(item => {
          const nameElement = item.querySelector('.resource-name');
          if (!nameElement) return;
          
          const name = nameElement.textContent.toLowerCase();
          const isMatch = !searchTerm || name.includes(searchTerm);
          
          item.style.display = isMatch ? '' : 'none';
        });
      });
    }
    
    // Sound search
    const soundSearch = drawer.querySelector('#soundSearch');
    if (soundSearch) {
      soundSearch.addEventListener('input', () => {
        const searchTerm = soundSearch.value.toLowerCase();
        const activeCategory = drawer.querySelector('.sound-categories sl-button[variant="primary"]')?.dataset.category;
        if (!activeCategory) return;
        
        const galleryItems = drawer.querySelectorAll(`#${activeCategory}Gallery .resource-item`);
        
        galleryItems.forEach(item => {
          const nameElement = item.querySelector('.resource-name');
          if (!nameElement) return;
          
          const name = nameElement.textContent.toLowerCase();
          const isMatch = !searchTerm || name.includes(searchTerm);
          
          item.style.display = isMatch ? '' : 'none';
        });
      });
    }
    
    // Splash art search
    const splashArtSearch = drawer.querySelector('#splashArtSearch');
    if (splashArtSearch) {
      splashArtSearch.addEventListener('input', () => {
        const searchTerm = splashArtSearch.value.toLowerCase();
        const activeCategory = drawer.querySelector('.splash-art-controls sl-button[variant="primary"]')?.dataset.category || 'title';
        
        const galleryItems = drawer.querySelectorAll(`#${activeCategory}Gallery .resource-item`);
        
        galleryItems.forEach(item => {
          const nameElement = item.querySelector('.resource-name');
          if (!nameElement) return;
          
          const name = nameElement.textContent.toLowerCase();
          const isMatch = !searchTerm || name.includes(searchTerm);
          
          item.style.display = isMatch ? '' : 'none';
        });
      });
    }
    
    // Bestiary search (more advanced)
    const monsterSearch = drawer.querySelector('#monsterSearch');
    const typeFilter = drawer.querySelector('#monsterTypeFilter');
    const crFilter = drawer.querySelector('#monsterCrFilter');
    
    const applyBestiaryFilters = () => {
      const searchTerm = monsterSearch?.value.toLowerCase() || '';
      const typeValue = typeFilter?.value || '';
      const crValue = crFilter?.value || '';
      
      const bestiaryItems = drawer.querySelectorAll('#bestiaryGallery .resource-item');
      
      bestiaryItems.forEach(item => {
        const nameElement = item.querySelector('.resource-name');
        const typeElement = item.querySelector('.resource-meta');
        if (!nameElement) return;
        
        const name = nameElement.textContent.toLowerCase();
        const typeText = typeElement?.textContent.toLowerCase() || '';
        
        // Match by name
        const nameMatch = !searchTerm || name.includes(searchTerm);
        
        // Match by type
        const typeMatch = !typeValue || typeText.includes(typeValue.toLowerCase());
        
        // Match by CR range (this needs data attributes on monsters)
        let crMatch = true;
        if (crValue) {
          const cr = parseFloat(item.dataset.cr || '0');
          
          if (crValue === '0-1') {
            crMatch = cr >= 0 && cr <= 1;
          } else if (crValue === '2-5') {
            crMatch = cr >= 2 && cr <= 5;
          } else if (crValue === '6-10') {
            crMatch = cr >= 6 && cr <= 10;
          } else if (crValue === '11-15') {
            crMatch = cr >= 11 && cr <= 15;
          } else if (crValue === '16+') {
            crMatch = cr >= 16;
          }
        }
        
        // Apply all filters
        item.style.display = nameMatch && typeMatch && crMatch ? '' : 'none';
      });
    };
    
    // Apply filters when inputs change
    if (monsterSearch) monsterSearch.addEventListener('input', applyBestiaryFilters);
    if (typeFilter) typeFilter.addEventListener('sl-change', applyBestiaryFilters);
    if (crFilter) crFilter.addEventListener('sl-change', applyBestiaryFilters);
  }
  
  /**
   * Update gallery container with proper card sizes and layout
   * This is a modified version to ensure consistent card sizes
   */
  updateGallery(drawer, category, view = 'grid') {
    // Determine which tab panel to use
    let tabPanelName;
    if (['ambient', 'effects'].includes(category)) {
      tabPanelName = 'sounds';
    } else if (['walls', 'doors', 'environmental', 'props'].includes(category)) {
      tabPanelName = 'textures';
    } else if (['title', 'loading', 'background'].includes(category)) {
      tabPanelName = 'splashArt';
    } else {
      tabPanelName = category;
    }
    
    // Find the tab panel
    const tabPanel = drawer.querySelector(`sl-tab-panel[name="${tabPanelName}"]`);
    if (!tabPanel) {
      console.error(`Tab panel ${tabPanelName} not found`);
      return;
    }
    
    // Find or create container
    let container = drawer.querySelector(`#${category}Gallery`);
    if (!container) {
      console.log(`Creating new gallery container for ${category}`);
      container = document.createElement('div');
      container.id = `${category}Gallery`;
      container.className = `gallery-container ${view === 'grid' ? 'gallery-grid' : 'gallery-list'}`;
      
      const galleryWrapper = tabPanel.querySelector('.rm-gallery-wrapper');
      if (galleryWrapper) {
        galleryWrapper.appendChild(container);
      } else {
        tabPanel.appendChild(container);
      }
    }
  
    // Hide all other galleries in the same tab panel and show this one
    tabPanel.querySelectorAll('.gallery-container').forEach(gallery => {
      gallery.style.display = gallery.id === `${category}Gallery` ? '' : 'none';
    });
  
    // Update container class based on view
    container.className = `gallery-container ${view === 'grid' ? 'gallery-grid' : 'gallery-list'}`;
    
    // Get resources
    let resources;
    if (['title', 'loading', 'background'].includes(category)) {
      resources = this.resources.splashArt[category];
      if (!resources) {
        this.resources.splashArt[category] = new Map();
        resources = this.resources.splashArt[category];
      }
    } else if (category === 'ambient' || category === 'effects') {
      resources = this.resources.sounds[category];
    } else {
      resources = this.resources.textures[category];
    }
  
    // Apply tag filter for props
    let filteredResources = resources;
    if (category === 'props' && this.activeTagFilter) {
      // Get list of file IDs that belong to this tag
      const tagData = this.propFolderMap?.get(this.activeTagFilter);
      if (tagData && tagData.files) {
        // Filter resources to only include files with this tag
        filteredResources = new Map();
        tagData.files.forEach(fileId => {
          if (resources.has(fileId)) {
            filteredResources.set(fileId, resources.get(fileId));
          }
        });
      }
    }
    
    // Handle empty resources case
    if (!filteredResources || filteredResources.size === 0) {
      container.innerHTML = `
        <sl-card class="empty-gallery">
          <div style="text-align: center; padding: 2rem;">
            ${category === 'ambient' || category === 'effects' ? 
                '<span class="material-icons" style="font-size: 3rem; opacity: 0.5;">volume_off</span>' :
                '<span class="material-icons" style="font-size: 3rem; opacity: 0.5;">image_not_supported</span>'
            }
            <p>No ${category} added yet</p>
          </div>
        </sl-card>
      `;
      return;
    }
  
    // Clear the container
    container.innerHTML = '';
  
    // Create cards for each resource - using the ORIGINAL card format for consistency
    filteredResources.forEach((resource, id) => {
      const card = document.createElement('sl-card');
      card.className = 'resource-item';
  
      // Build card HTML - maintain original format
      card.innerHTML = `
      ${view === 'grid' ? `
          <img 
              src="${resource.thumbnail}" 
              alt="${resource.name}"
              class="resource-thumbnail"
          />
          <div class="resource-info">
              <div class="resource-name" style="color: #e0e0e0; font-weight: bold; word-wrap: break-word; overflow-wrap: break-word; white-space: normal; max-width: 90%">${resource.name}</div>
              <div class="resource-meta" style="color: #777; font-size: 0.85em;">${this.formatDate(resource.dateAdded)}</div>
              ${resource.originalFilename ? 
                  `<div class="resource-filename" style="color: #999; font-size: 0.8em; font-style: italic; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${resource.originalFilename}</div>` : ''}
              
              ${category === 'props' && resource.tags && resource.tags.length > 0 ? 
                  `<div class="resource-tags" style="margin-top: 4px; display: flex; flex-wrap: wrap; gap: 4px;">
                      ${resource.tags.map(tag => 
                          `<sl-tag size="small" style="cursor: pointer; max-width: 100%; overflow: hidden;" 
                                  data-tag="${tag}" 
                                  title="${this.formatTagDisplay(tag)}">
                              <span class="material-icons" style="font-size: 12px; margin-right: 4px;">folder</span>
                              ${this.formatTagDisplay(tag).split(' › ').pop()}
                          </sl-tag>`
                      ).join('')}
                  </div>` : ''}
          </div>
      ` : `
          <div style="display: flex; align-items: center; gap: 1rem;">
              <img 
                  src="${resource.thumbnail}" 
                  alt="${resource.name}"
                  class="resource-thumbnail"
                  style="width: 50px; height: 50px;"
              />
              <div class="resource-info">
                  <div class="resource-name" style="color: #e0e0e0; font-weight: bold; word-wrap: break-word; overflow-wrap: break-word; white-space: normal; max-width: 90%">${resource.name}</div>
                  <div class="resource-meta" style="color: #777; font-size: 0.85em;">${this.formatDate(resource.dateAdded)}</div>
                  ${resource.originalFilename ? 
                      `<div class="resource-filename" style="color: #999; font-size: 0.8em; font-style: italic; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${resource.originalFilename}</div>` : ''}
                  
                  ${category === 'props' && resource.tags && resource.tags.length > 0 ? 
                      `<div class="resource-tags" style="margin-top: 4px; display: flex; flex-wrap: wrap; gap: 4px;">
                          ${resource.tags.map(tag => 
                              `<sl-tag size="small" style="cursor: pointer; max-width: 100%; overflow: hidden;" 
                                      data-tag="${tag}" 
                                      title="${this.formatTagDisplay(tag)}">
                                  <span class="material-icons" style="font-size: 12px; margin-right: 4px;">folder</span>
                                  ${this.formatTagDisplay(tag).split(' › ').pop()}
                              </sl-tag>`
                          ).join('')}
                      </div>` : ''}
              </div>
          </div>
      `}
      <div slot="footer" class="resource-actions">
          <sl-button-group>
              <sl-button size="small" class="preview-btn">
                  <span class="material-icons">visibility</span>
              </sl-button>
              ${category === 'props' ? `
              <sl-button size="small" class="edit-name-btn">
                  <span class="material-icons">edit</span>
              </sl-button>
              ` : ''}
              <sl-button size="small" class="delete-btn" variant="danger">
                  <span class="material-icons">delete</span>
              </sl-button>
          </sl-button-group>
      </div>
      `;
  
      // Add tag click handlers for props
      if (category === 'props') {
        const tagElements = card.querySelectorAll('.resource-tags sl-tag');
        tagElements.forEach(tag => {
          tag.addEventListener('click', (e) => {
            e.stopPropagation();
            const tagValue = tag.dataset.tag;
            this.setPropsTagFilter(drawer, tagValue);
          });
        });
      }
  
      // Add button handlers - using original handlers
      card.querySelector('.preview-btn').addEventListener('click', () => {
        this.showResourcePreview(resource);
      });
  
      if (category === 'props') {
        card.querySelector('.edit-name-btn').addEventListener('click', () => {
          this.showNameEditor(resource, category, id, card);
        });
      }
  
      // Add delete button handler
      card.querySelector('.delete-btn').addEventListener('click', () => {
        const confirmMessage = `Delete ${category === 'ambient' || category === 'effects' ? 'sound' : 'resource'} "${resource.name}"?`;
  
        if (confirm(confirmMessage)) {
          if (category === 'ambient' || category === 'effects') {
            this.deleteSound(id, category);
          } else {
            this.deleteResource(category, id);
          }
          this.updateGallery(drawer, category, view);
        }
      });

      if (category === 'ambient' || category === 'effects') {
        // Add this after the card HTML is generated but before appending it to the container
        
        // Add a play button to the card
        const cardFooter = card.querySelector('.resource-actions');
        
        // Create play button before other actions
        const playBtn = document.createElement('sl-button');
        playBtn.size = 'small';
        playBtn.classList.add('play-btn');
        playBtn.innerHTML = '<span class="material-icons">play_arrow</span>';
        
        // Add duration display if available
        // if (resource.duration) {
        //   const formattedDuration = this.formatDuration(resource.duration);
        //   const durationSpan = document.createElement('span');
        //   durationSpan.className = 'sound-duration';
        //   durationSpan.style.cssText = 'margin-left: auto; font-size: 0.8em; color: #999;';
        //   durationSpan.textContent = formattedDuration;
        //   cardFooter.prepend(durationSpan);
        // }
        
        // Insert play button at the beginning of the actions
        cardFooter.prepend(playBtn);
        
        // Set up playback functionality
        let isPlaying = false;
        playBtn.addEventListener('click', () => {
          if (isPlaying) {
            this.stopSound(id);
            playBtn.innerHTML = '<span class="material-icons">play_arrow</span>';
            isPlaying = false;
          } else {
            const audio = this.playSound(id, category);
            if (audio) {
              playBtn.innerHTML = '<span class="material-icons">stop</span>';
              isPlaying = true;
              
              // Reset button when audio finishes
              audio.addEventListener('ended', () => {
                playBtn.innerHTML = '<span class="material-icons">play_arrow</span>';
                isPlaying = false;
              });
            }
          }
        });
      }

  
      container.appendChild(card);
    });
  }

// Update ShapeForge gallery
updateShapeForgeGallery(drawer, view = 'grid') {

        console.log("Updating ShapeForge gallery");
        const container = drawer.querySelector('#shapeforgeGallery');
        if (!container) {
          console.error("ShapeForge gallery container not found!");
          return;
        }
        
        // Check if we have models
        if (!this.resources.shapeforge) {
          this.resources.shapeforge = new Map();
          console.warn("ShapeForge resources not initialized, creating empty map");
        }
        
        console.log(`Found ${this.resources.shapeforge.size} models to display`);


    // const container = drawer.querySelector('#shapeforgeGallery');
    if (!container) return;
    
    // Update container class based on view
    container.className = `gallery-container ${view === 'grid' ? 'gallery-grid' : 'gallery-list'}`;
    
    // Get ShapeForge models
    if (!this.resources.shapeforge) {
      this.resources.shapeforge = new Map();
    }
    
    const models = this.resources.shapeforge;
    
    // Check if empty
    if (models.size === 0) {
      container.innerHTML = `
        <sl-card class="empty-gallery">
          <div style="text-align: center; padding: 2rem;">
            <span class="material-icons" style="font-size: 3rem; opacity: 0.5;">view_in_ar</span>
            <p>No 3D models available</p>
          </div>
        </sl-card>
      `;
      return;
    }
    
    // Clear container
    container.innerHTML = '';
    
    // Create cards for each model
    models.forEach((model, id) => {
      const card = document.createElement('sl-card');
      card.className = 'resource-item';
      
      // Determine storage location
      const storageLocation = this.checkResourceStorageLocation('shapeforge', id);
      const eyeColor = this.getStorageIndicatorColor(storageLocation);
      
      card.innerHTML = `
        ${view === 'grid' ? `
          <img 
            src="${model.thumbnail}" 
            alt="${model.name}"
            class="resource-thumbnail"
          />
          <div class="resource-info">
            <div class="resource-name" style="color: #666; font-weight: bold; word-wrap: break-word; overflow-wrap: break-word; white-space: normal; max-width: 90%">${model.name}</div>
            <div class="resource-meta" style="color: #777; font-size: 0.85em;">${this.formatDate(model.dateAdded)}</div>
          </div>
        ` : `
          <div style="display: flex; align-items: center; gap: 1rem;">
            <img 
              src="${model.thumbnail}" 
              alt="${model.name}"
              class="resource-thumbnail"
              style="width: 50px; height: 50px;"
            />
            <div class="resource-info">
              <div class="resource-name" style="color: #666; font-weight: bold; word-wrap: break-word; overflow-wrap: break-word; white-space: normal; max-width: 90%">${model.name}</div>
              <div class="resource-meta" style="color: #777; font-size: 0.85em;">${this.formatDate(model.dateAdded)}</div>
            </div>
          </div>
        `}
        <div slot="footer" class="resource-actions">
          <sl-button-group>
            <sl-button size="small" class="view-btn" data-resource-id="${id}">
              <span class="material-icons" style="color: ${eyeColor};">visibility</span>
            </sl-button>
            <sl-button size="small" class="export-btn">
              <span class="material-icons">file_download</span>
            </sl-button>
            <sl-button size="small" class="delete-btn" variant="danger">
              <span class="material-icons">delete</span>
            </sl-button>

          </sl-button-group>
        </div>
      `;
    // removed idea
    //   <sl-button size="small" class="edit-in-shapeforge-btn" title="Edit in ShapeForge">
    //   <span class="material-icons">edit</span>
    // </sl-button>
      
      // Add event listeners
      card.querySelector('.view-btn').addEventListener('click', () => {
        this.showModelPreview(model);
      });
      
      card.querySelector('.export-btn').addEventListener('click', () => {
        this.exportShapeForgeModel(id, model);
      });

    //   card.querySelector('.edit-in-shapeforge-btn').addEventListener('click', (e) => {
    //     e.stopPropagation(); // Prevent card click event from triggering
        
    //     // Get the model
    //     const model = this.resources.shapeforge.get(id);
    //     if (!model) {
    //       console.error(`Model with ID ${id} not found`);
    //       return;
    //     }
        
    //     // First check if ShapeForge is already available
    //     if (window.shapeForge) {
    //       // Close the drawer
    //       drawer.hide();
          
    //       // Show ShapeForge and load the model
    //       window.shapeForge.show();
          
    //       // Give a small delay for ShapeForge UI to initialize
    //       setTimeout(() => {
    //         if (typeof window.shapeForge.loadProjectFromJson === 'function') {
    //           console.log("Loading model into ShapeForge:", model.name);
    //           window.shapeForge.loadProjectFromJson(model.data);
    //         } else {
    //           console.error("ShapeForge loadProjectFromJson method not found");
    //           alert("Unable to load model in ShapeForge");
    //         }
    //       }, 300);
    //     } else {
    //       // If ShapeForge isn't initialized yet
    //       console.error("ShapeForge not found. Make sure it's loaded first.");
    //       alert("ShapeForge editor is not available. Please load ShapeForge first.");
    //     }
    //   });

      
    //   card.querySelector('.delete-btn').addEventListener('click', () => {
    //     if (confirm(`Delete model "${model.name}"?`)) {
    //       models.delete(id);
    //       this.updateShapeForgeGallery(drawer, view);
    //     }
    //   });

    card.querySelector('.delete-btn').addEventListener('click', async () => {
        if (confirm(`Delete model "${model.name}"?`)) {
          try {
            // Show loading state
            const deleteBtn = card.querySelector('.delete-btn');
            const originalContent = deleteBtn.innerHTML;
            deleteBtn.innerHTML = '<span class="material-icons">hourglass_top</span>';
            deleteBtn.disabled = true;
            
            // Delete from both memory and IndexedDB
            await this.deleteShapeForgeModel(id);
            
            // Success notification
            this.showSuccessNotification(`Deleted model: ${model.name}`);
            
            // Refresh gallery
            this.updateShapeForgeGallery(drawer, view);
          } catch (error) {
            console.error("Error during model deletion:", error);
            this.showErrorNotification("Failed to delete model");
            
            // Reset button
            const deleteBtn = card.querySelector('.delete-btn');
            deleteBtn.innerHTML = '<span class="material-icons">delete</span>';
            deleteBtn.disabled = false;
          }
        }
      });
      
      container.appendChild(card);
    });
  }

  // Add this method to ResourceManager
async deleteShapeForgeModel(id) {
    console.log(`Attempting to delete model with ID: ${id}`);
    
    // Remove from memory
    if (this.resources.shapeforge) {
      this.resources.shapeforge.delete(id);
      console.log("Removed model from memory");
    }
    
    // Delete from IndexedDB
    try {
      const db = await this.openModelDatabase();
      const tx = db.transaction(['models'], 'readwrite');
      const store = tx.objectStore('models');
      await store.delete(id);
      console.log("Deleted model from IndexedDB");
      return true;
    } catch (e) {
      console.error("Error deleting model from IndexedDB:", e);
      // Show error notification
      this.showErrorNotification("Unable to completely delete model from storage");
      return false;
    }
  }
  
  // Import ShapeForge model
  async importShapeForgeModel(file) {
    try {
      const text = await file.text();
      const modelData = JSON.parse(text);
      
      if (!modelData || !modelData.objects) {
        throw new Error('Invalid ShapeForge model format');
      }
      
      // Generate ID and create entry
      const id = `model_${Date.now()}`;
      const model = {
        id: id,
        name: modelData.name || file.name.replace(/\.json$/, ''),
        data: modelData,
        thumbnail: modelData.thumbnail || this.generateDefaultModelThumbnail(),
        dateAdded: new Date().toISOString()
      };
      
      // Add to ShapeForge collection
      if (!this.resources.shapeforge) {
        this.resources.shapeforge = new Map();
      }
      
      this.resources.shapeforge.set(id, model);
      
      // Try to save to indexedDB if available
      if (window.indexedDB) {
        try {
          const db = await this.openModelDatabase();
          const tx = db.transaction(['models'], 'readwrite');
          const store = tx.objectStore('models');
          await store.put(model);
        } catch (e) {
          console.warn('Could not save model to IndexedDB:', e);
        }
      }
      
      this.showSuccessNotification(`Imported model: ${model.name}`);
      return id;
    } catch (error) {
      console.error('Error importing ShapeForge model:', error);
      this.showErrorNotification('Error importing model: ' + error.message);
      return null;
    }
  }
  


showModelPreview(model) {
    const dialog = document.createElement('sl-dialog');
    dialog.label = model.name;
    dialog.style.cssText = "--width: 800px; --max-width: 90vw;";
    
    // Create a nicely formatted JSON string of the model data
    // Only show objects array or full data depending on size
    const modelData = model.data;
    const jsonString = JSON.stringify(modelData, null, 2);
    
    dialog.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 20px; padding: 20px;">
        <!-- Model info section -->
        <div style="display: flex; gap: 20px; align-items: flex-start;">
          <img src="${model.thumbnail}" alt="${model.name}" 
               style="max-width: 200px; max-height: 200px; object-fit: contain; border-radius: 8px; border: 1px solid #eee;">
          
          <div>
            <h3 style="margin-top: 0; margin-bottom: 10px;">${model.name}</h3>
            <div style="color: #666;">
              <p style="margin: 5px 0;">Created: ${this.formatDate(model.dateAdded)}</p>
              <p style="margin: 5px 0;">Objects: ${modelData.objects ? modelData.objects.length : 'Unknown'}</p>
              ${modelData.version ? `<p style="margin: 5px 0;">Version: ${modelData.version}</p>` : ''}
              ${modelData.author ? `<p style="margin: 5px 0;">Author: ${modelData.author}</p>` : ''}
            </div>
          </div>
        </div>
        
        <!-- Code viewer section -->
        <div style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="padding: 8px 12px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 500;">Model Data</span>
            <sl-button size="small" class="copy-btn">
              <span class="material-icons" style="font-size: 16px; margin-right: 4px;">content_copy</span>
              Copy
            </sl-button>
          </div>
          <div style="max-height: 300px; overflow: auto; position: relative;">
            <textarea id="model-json" style="width: 100%; height: 300px; padding: 12px; border: none; font-family: monospace; font-size: 13px; white-space: pre; overflow: auto; resize: none;">${jsonString}</textarea>
          </div>
        </div>
      </div>
      
      <div slot="footer">
        <sl-button variant="neutral" class="close-btn">Close</sl-button>
        <sl-button variant="primary" class="export-btn">
          <span class="material-icons" slot="prefix">file_download</span>
          Export
        </sl-button>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Copy button functionality
    dialog.querySelector('.copy-btn').addEventListener('click', () => {
      const textArea = dialog.querySelector('#model-json');
      textArea.select();
      document.execCommand('copy');
      
      // Show feedback
      const copyBtn = dialog.querySelector('.copy-btn');
      const originalText = copyBtn.innerHTML;
      copyBtn.innerHTML = '<span class="material-icons" style="font-size: 16px; margin-right: 4px;">check</span> Copied!';
      copyBtn.variant = 'success';
      
      setTimeout(() => {
        copyBtn.innerHTML = originalText;
        copyBtn.variant = 'default';
      }, 2000);
    });
    
    dialog.querySelector('.close-btn').addEventListener('click', () => {
      dialog.hide();
    });
    
    dialog.querySelector('.export-btn').addEventListener('click', () => {
      this.exportShapeForgeModel(model.id, model);
    });
    
    dialog.addEventListener('sl-after-hide', () => {
      dialog.remove();
    });
    
    dialog.show();
    
    // Select all text in textarea when clicked
    const jsonTextarea = dialog.querySelector('#model-json');
    jsonTextarea.addEventListener('click', function() {
      this.select();
    });
  }
  
  // Export ShapeForge model
  exportShapeForgeModel(id, model) {
    const data = JSON.stringify(model.data, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${model.name}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showSuccessNotification(`Exported model: ${model.name}`);
  }
  
  // Generate default thumbnail for models without one
  generateDefaultModelThumbnail() {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    
    // Draw background
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, 200, 200);
    
    // Draw cube wireframe
    ctx.strokeStyle = '#3F51B5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    // Front face
    ctx.moveTo(50, 50);
    ctx.lineTo(150, 50);
    ctx.lineTo(150, 150);
    ctx.lineTo(50, 150);
    ctx.lineTo(50, 50);
    
    // Back face
    ctx.moveTo(70, 70);
    ctx.lineTo(170, 70);
    ctx.lineTo(170, 170);
    ctx.lineTo(70, 170);
    ctx.lineTo(70, 70);
    
    // Connect faces
    ctx.moveTo(50, 50);
    ctx.lineTo(70, 70);
    ctx.moveTo(150, 50);
    ctx.lineTo(170, 70);
    ctx.moveTo(150, 150);
    ctx.lineTo(170, 170);
    ctx.moveTo(50, 150);
    ctx.lineTo(70, 170);
    
    ctx.stroke();
    
    return canvas.toDataURL('image/png');
  }
  
  // Database operations for ShapeForge models
  async openModelDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ShapeForgeModels', 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('models')) {
          db.createObjectStore('models', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }


setupEventHandlers(drawer) {

    const shapeforgeTab = drawer.querySelector('sl-tab[panel="shapeforge"]');
  
    if (shapeforgeTab) {
        console.log("Found ShapeForge tab, setting up events");
        
        // Use the tab group instead of the individual tab for more reliable event handling
        const tabGroup = drawer.querySelector('sl-tab-group');
        if (tabGroup) {
            tabGroup.addEventListener('sl-tab-show', (e) => {
                console.log("Tab changed to:", e.detail.name);
                if (e.detail.name === 'shapeforge') {
                    console.log("ShapeForge tab selected!");
                    
                    // Use setTimeout to ensure the DOM is ready
                    setTimeout(() => {
                        this.loadShapeForgeModels().then(count => {
                            console.log(`Loaded ${count} models from storage`);
                            this.updateShapeForgeGallery(drawer);
                        });
                    }, 100);
                }
            });
        }
        
        // Keep your existing button click handler
        const importBtn = drawer.querySelector('.model-upload-btn');
        const fileInput = drawer.querySelector('.model-file-input');
        
        if (importBtn && fileInput) {
            importBtn.addEventListener('click', () => {
                fileInput.click();
            });
            
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.importShapeForgeModel(file).then(() => {
                        this.updateShapeForgeGallery(drawer);
                    });
                }
                fileInput.value = '';
            });
        }
        
        // // Add a manual refresh button for debugging
        // const headerSection = drawer.querySelector('sl-tab-panel[name="shapeforge"] .rm-categories-bar');
        // if (headerSection) {
        //     const refreshBtn = document.createElement('sl-button');
        //     refreshBtn.size = 'small';
        //     refreshBtn.innerHTML = '<span class="material-icons">refresh</span> Refresh';
        //     refreshBtn.style.marginLeft = '8px';
            
        //     refreshBtn.addEventListener('click', async () => {
        //         console.log("Manual refresh triggered");
        //         await this.loadShapeForgeModels();
        //         this.updateShapeForgeGallery(drawer);
        //     });
            
        //     headerSection.appendChild(refreshBtn);
        // }
    }

    const saveBtn = drawer.querySelector('#saveResourcePack');
    const loadBtn = drawer.querySelector('#loadResourcePack');
    const exitBtn = drawer.querySelector('#exitResourceManager');
    const exportBestiaryBtn = drawer.querySelector('#exportBestiaryBtn');
    const importBestiaryBtn = drawer.querySelector('#importBestiaryBtn');

    if (exitBtn) {
        exitBtn.addEventListener('click', () => {
            drawer.hide();
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const action = saveBtn.getAttribute('data-action') || 'save-resources';
            
            if (action === 'save-all') {
                // In bestiary tab, save both resources and bestiary
                this.saveResourcePack();
                
                // Also save bestiary if we have monsters
                if (this.resources.bestiary.size > 0) {
                    this.saveBestiaryToFile();
                }
            } else {
                // Default action - save resource pack only
                this.saveResourcePack();
            }
        });
    }

    if (loadBtn) {
        // Modify to handle bestiary uploads
        const originalLoadHandler = loadBtn.onclick;
        loadBtn.onclick = () => {
            // Create dialog with options
            const dialog = document.createElement('sl-dialog');
            dialog.label = 'Load File';
            dialog.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <sl-button class="load-resource-btn" size="large" style="justify-content: flex-start;">
                        <span class="material-icons" slot="prefix">folder_open</span>
                        Load Resource Pack
                    </sl-button>
                    <sl-button class="load-bestiary-btn" size="large" style="justify-content: flex-start;">
                        <span class="material-icons" slot="prefix">pets</span>
                        Load Bestiary File
                    </sl-button>
                </div>
            `;
            
            document.body.appendChild(dialog);
            
            // Create hidden file inputs
            const resourceInput = document.createElement('input');
            resourceInput.type = 'file';
            resourceInput.accept = '.json';
            resourceInput.style.display = 'none';
            
            const bestiaryInput = document.createElement('input');
            bestiaryInput.type = 'file';
            bestiaryInput.accept = '.json';
            bestiaryInput.style.display = 'none';
            
            document.body.appendChild(resourceInput);
            document.body.appendChild(bestiaryInput);
            
            // Resource pack loading
            resourceInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    // Use the original load behavior
                    this.loadResourcePack(file).then(success => {
                        if (success) {
                            const currentCategory = drawer.querySelector('.texture-categories sl-button[variant="primary"]')?.dataset.category || 'walls';
                            this.updateGallery(drawer, currentCategory);
                            // alert('Resource pack loaded successfully');
                        } else {
                            alert('Failed to load resource pack');
                        }
                    });
                }
            });
            
            // Bestiary loading
            bestiaryInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    const success = await this.loadBestiaryFromFile(file);
                    if (success) {
                        this.updateBestiaryGallery(drawer, 'grid');
                        alert(`Successfully loaded ${this.resources.bestiary.size} monsters`);
                    } else {
                        alert('Failed to load bestiary file');
                    }
                }
            });
            
            // Add button click handlers
            // dialog.querySelector('.load-resource-btn').addEventListener('click', () => {
            //     dialog.hide();
            //     resourceInput.click();
            // });

            dialog.querySelector('.load-resource-btn').addEventListener('click', () => {
                dialog.hide();
                resourceInput.click();
            });
            
            resourceInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    // Use our optimized loading function
                    this.loadResourcePack(file).then(success => {
                        if (success) {
                            const currentCategory = drawer.querySelector('.texture-categories sl-button[variant="primary"]')?.dataset.category || 'walls';
                            this.updateGallery(drawer, currentCategory);
                        }
                    });
                }
            });
            
            dialog.querySelector('.load-bestiary-btn').addEventListener('click', () => {
                dialog.hide();
                bestiaryInput.click();
            });
            
            // Clean up on close
            dialog.addEventListener('sl-after-hide', () => {
                dialog.remove();
                resourceInput.remove();
                bestiaryInput.remove();
            });
            
            dialog.show();
        };
    }

const bestiaryPanel = drawer.querySelector('sl-tab-panel[name="bestiary"]');

  



    // Update the view toggle handler
    drawer.querySelectorAll('.view-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const panel = toggle.closest('sl-tab-panel');
            if (!panel) return;

            const galleryContainer = panel.querySelector('.gallery-container');
            if (!galleryContainer) return;

            const view = toggle.dataset.view;

            // Update button states
            panel.querySelectorAll('.view-toggle').forEach(t => t.variant = 'default');
            toggle.variant = 'primary';

            // Update gallery view
            galleryContainer.className = `gallery-container ${view === 'grid' ? 'gallery-grid' : 'gallery-list'}`;

            // Refresh gallery content
            if (panel.getAttribute('name') === 'bestiary') {
                this.updateBestiaryGallery(drawer, view);
            } else {
                // Handle other gallery types (existing code)
                const category = panel.querySelector('[data-category]')?.dataset.category;
                if (category) {
                    this.updateGallery(drawer, category, view);
                }
            }
        });
    });

    // Setup category selection for textures
    const categoryBtns = drawer.querySelectorAll('.texture-categories sl-button');
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update button states
            categoryBtns.forEach(b => b.setAttribute('variant', 'default'));
            btn.setAttribute('variant', 'primary');

            const category = btn.dataset.category;
            this.lastSelectedCategory = category; // Track the last selected category

            // Hide all galleries first
            ['walls', 'doors', 'environmental', 'props'].forEach(cat => {
                const gallery = drawer.querySelector(`#${cat}Gallery`);
                if (gallery) {
                    gallery.style.display = 'none';
                }
            });

            // Show selected category's gallery
            const selectedGallery = drawer.querySelector(`#${category}Gallery`);
            if (selectedGallery) {
                selectedGallery.style.display = 'grid';
                // Update gallery content
                this.updateGallery(drawer, category);
            }
        });
    });

    this.setupSplashArtHandlers(drawer);



    const tabGroup = drawer.querySelector('sl-tab-group');
    if (tabGroup) {
        tabGroup.addEventListener('sl-tab-show', (e) => {
            const tabName = e.detail.name;
            
            // Get save button
            const saveResourceBtn = drawer.querySelector('#saveResourcePack');
            
            // Update save button text and action based on context
            if (saveResourceBtn) {
                if (tabName === 'bestiary') {
                    saveResourceBtn.innerHTML = `
                        <span class="material-icons" slot="prefix">save</span>
                        Save All
                    `;
                    saveResourceBtn.setAttribute('data-action', 'save-all');
                } else {
                    saveResourceBtn.innerHTML = `
                        <span class="material-icons" slot="prefix">save</span>
                        Save
                    `;
                    saveResourceBtn.setAttribute('data-action', 'save-resources');
                }
            }
            
            // Update gallery if needed
            if (tabName === 'bestiary') {
                this.updateBestiaryGallery(drawer, 'grid');
            }
        });
    }

    // Handle file uploads for each type - KEEP THIS AS A CONST FUNCTION
    const setupUploadHandler = (btnClass, inputClass, type) => {
        const uploadBtn = drawer.querySelector(`.${btnClass}`);
        const fileInput = drawer.querySelector(`.${inputClass}`);

        if (!uploadBtn || !fileInput) {
            console.warn(`Upload elements not found for ${type}`);
            return;
        }

        uploadBtn.addEventListener('click', () => {
            if (type === 'texture' && this.lastSelectedCategory === 'props') {
                // Show dialog with options for props importing
                this.showPropsImportOptions(drawer);
            } else {
                fileInput.click();
            }
        });



        fileInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files || []);
            const tabPanel = uploadBtn.closest('sl-tab-panel');

            if (!files.length) return;

            console.log(`Processing ${files.length} ${type} files`);

            // For folder import of props, extract folder information
            const isPropsImport = type === 'texture' && tabPanel?.querySelector('.texture-categories sl-button[variant="primary"]')?.dataset.category === 'props';
            const importedWithFolders = isPropsImport && fileInput.hasAttribute('webkitdirectory');

            if (importedWithFolders) {
                await this.processFolderImport(files);
            } else {
                // Regular file processing
                for (const file of files) {
                    try {
                        if (type === 'splashArt') {
                            const description = await this.promptForDescription(file.name);
                            await this.addSplashArt(file, description);
                        } else if (type === 'sound') {
                            const category = tabPanel?.querySelector('.sound-categories sl-button[variant="primary"]')?.dataset.category || 'ambient';
                            await this.addSound(file, category);
                        } else {
                            const category = tabPanel?.querySelector('.texture-categories sl-button[variant="primary"]')?.dataset.category || 'walls';
                            await this.addTexture(file, category);
                        }
                    } catch (error) {
                        console.error(`Error processing ${type} file:`, error);
                    }
                }
            }

            // Update gallery with correct category
            if (tabPanel) {
                const view = tabPanel.querySelector('.view-toggle[variant="primary"]')?.dataset.view || 'grid';
                const category = type === 'splashArt' ? 'splashArt' : 
                            tabPanel.querySelector('[data-category][variant="primary"]')?.dataset.category;
                
                if (category) {
                    this.updateGallery(drawer, category, view);
                }
            }

            // Reset file input
            fileInput.value = '';
        });
    };

    setupUploadHandler('texture-upload-btn', 'texture-file-input', 'texture');
    setupUploadHandler('sound-upload-btn', 'sound-file-input', 'sound');
    setupUploadHandler('splashart-upload-btn', 'splashart-file-input', 'splashArt');

    const soundCategoryBtns = drawer.querySelectorAll('.sound-categories sl-button');
    soundCategoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update button states
            soundCategoryBtns.forEach(b => b.setAttribute('variant', 'default'));
            btn.setAttribute('variant', 'primary');

            const category = btn.dataset.category;
            this.updateGallery(drawer, category, 
                drawer.querySelector('.view-toggle[variant="primary"]')?.dataset.view || 'grid'
            );
        });
    });

    const optimizeStorageBtn = drawer.querySelector('#optimizeStorageBtn');
    if (optimizeStorageBtn) {
      optimizeStorageBtn.addEventListener('click', () => {
        this.showStorageManagementDialog();
      });
    }

    // Setup Bestiary tab handlers
    const addMonsterBtn = drawer.querySelector('.add-monster-btn');
    if (addMonsterBtn) {
        addMonsterBtn.addEventListener('click', async () => {
            await this.showMonsterImporter();
        });
    }

    /**
 * Add this to the setupEventHandlers method in ResourceManager
 * This ensures the Splash Art section buttons work correctly
 */

// Fix for splash art category buttons
const splashArtButtons = drawer.querySelectorAll('.rm-panel-container sl-button-group sl-button[data-category]');
splashArtButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    // Update active state in the same button group
    const buttonGroup = btn.closest('sl-button-group');
    if (!buttonGroup) return;
    
    buttonGroup.querySelectorAll('sl-button').forEach(b => {
      b.setAttribute('variant', 'default');
    });
    btn.setAttribute('variant', 'primary');
    
    // Get the category
    const category = btn.dataset.category;
    if (!category) return;
    
    // Get the current view mode
    const viewButtons = drawer.querySelectorAll('.rm-view-toggles sl-button');
    const isGridView = viewButtons[0]?.getAttribute('variant') === 'primary';
    
    // Update gallery with the right category and view
    this.updateGallery(drawer, category, isGridView ? 'grid' : 'list');
  });
});

// const shapeforgeTab = drawer.querySelector('sl-tab[panel="shapeforge"]');
// if (shapeforgeTab) {
//   shapeforgeTab.addEventListener('sl-tab-show', () => {
//     console.log("ShapeForge tab selected, updating gallery");
//     this.updateShapeForgeGallery(drawer);
//   });
// }

// Additional fix for initial display - call this at the end of createResourceManagerUI
setTimeout(() => {
  // Find and trigger click on the first splash art category button to show initial content
  const firstSplashArtButton = drawer.querySelector('sl-tab-panel[name="splashArt"] sl-button[data-category="title"]');
  if (firstSplashArtButton) {
    firstSplashArtButton.click();
  }
}, 100);

/**
 * Also modify the event handler setup for view toggles to ensure they update the display correctly
 */
drawer.querySelectorAll('.rm-view-toggles sl-button-group sl-button').forEach(btn => {
  btn.addEventListener('click', () => {
    // Update button states in the same group
    const buttonGroup = btn.closest('sl-button-group');
    if (!buttonGroup) return;
    
    buttonGroup.querySelectorAll('sl-button').forEach(b => {
      b.setAttribute('variant', 'default');
    });
    btn.setAttribute('variant', 'primary');
    
    // Get current category
    let category;
    
    const tabPanel = btn.closest('sl-tab-panel');
    if (!tabPanel) return;
    
    const panelName = tabPanel.getAttribute('name');
    
    if (panelName === 'textures') {
      category = tabPanel.querySelector('.texture-categories sl-button[variant="primary"]')?.dataset.category || 'walls';
    } else if (panelName === 'sounds') {
      category = tabPanel.querySelector('.sound-categories sl-button[variant="primary"]')?.dataset.category || 'ambient';
    } else if (panelName === 'splashArt') {
      category = tabPanel.querySelector('sl-button[data-category][variant="primary"]')?.dataset.category || 'title';
    } else if (panelName === 'bestiary') {
      category = 'bestiary';
    }
    
    if (category) {
      this.updateGallery(drawer, category, btn.dataset.view);
    }
  });
});

    // Add close handler
    drawer.addEventListener('sl-after-hide', () => {
        // Optional: Clean up any resources if needed
    });
}


// Method to get storage usage statistics
async getStorageUsage() {
  // Default values in case estimation fails
  let stats = {
    usage: 0,
    quota: 500 * 1024 * 1024, // 500MB default
    percentUsed: 0
  };
  
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      stats.usage = estimate.usage || 0;
      stats.quota = estimate.quota || 500 * 1024 * 1024;
      stats.percentUsed = Math.round((stats.usage / stats.quota) * 100);
    } else {
      console.warn('Storage estimation not supported by this browser');
    }
  } catch (err) {
    console.error('Error estimating storage:', err);
  }
  
  return stats;
}

getStorageIndicatorColor(location) {
    switch (location) {
      case 'indexeddb':
        return "#4CAF50"; // Green
      case 'localstorage':
        return "#FFC107"; // Yellow
      case 'both':
        return "#FFFFFF"; // White
      default:
        return "#999999"; // Gray
    }
  }
  
  // Check storage location for any resource type
  async checkResourceStorageLocation(resourceType, resourceId) {
    // Default to "unknown"
    let storageLocation = "unknown";
    
    try {
      // Check IndexedDB
      let inIndexedDB = false;
      
      // Use appropriate database based on resource type
      if (resourceType === 'bestiary') {
        if (this.monsterManager && this.monsterManager.db) {
          const tx = this.monsterManager.db.transaction(['monsters'], 'readonly');
          const store = tx.objectStore('monsters');
          const request = store.get(resourceId);
          
          inIndexedDB = await new Promise((resolve) => {
            request.onsuccess = (event) => resolve(!!event.target.result);
            request.onerror = () => resolve(false);
          });
        }
      } 
      else if (resourceType === 'shapeforge') {
        try {
          const db = await this.openModelDatabase();
          const tx = db.transaction(['models'], 'readonly');
          const store = tx.objectStore('models');
          const request = store.get(resourceId);
          
          inIndexedDB = await new Promise((resolve) => {
            request.onsuccess = (event) => resolve(!!event.target.result);
            request.onerror = () => resolve(false);
          });
        } catch (e) {
          inIndexedDB = false;
        }
      }
      // Add other resource types here as needed
      
      // Check localStorage - all resources go into the same object
      let inLocalStorage = false;
      const storageKey = resourceType === 'bestiary' ? 'monsterDatabase' :
                          resourceType === 'shapeforge' ? 'modelDatabase' :
                          `${resourceType}Database`;
      
      const storageData = localStorage.getItem(storageKey);
      if (storageData) {
        try {
          const data = JSON.parse(storageData);
          if (data && typeof data === 'object') {
            // Check if the resource exists
            if (resourceType === 'bestiary') {
              inLocalStorage = !!(data.monsters && data.monsters[resourceId]);
            } else {
              inLocalStorage = !!(data[resourceId]);
            }
          }
        } catch (e) {
          console.error(`Error parsing localStorage for ${resourceType}:`, e);
        }
      }
      
      // Determine storage location
      if (inIndexedDB && inLocalStorage) {
        storageLocation = "both";
      } else if (inIndexedDB) {
        storageLocation = "indexeddb";
      } else if (inLocalStorage) {
        storageLocation = "localstorage";
      }
    } catch (error) {
      console.error(`Error checking ${resourceType} storage location:`, error);
    }
    
    return storageLocation;
  }

// Update showStorageManagementDialog to handle all resource types
// Revised showStorageManagementDialog with buttons instead of dropdown
async showStorageManagementDialog() {
    // Create dialog component
    const dialog = document.createElement('sl-dialog');
    dialog.label = "Storage Management";
    
    // Create dialog content
    dialog.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <!-- Storage Legend -->
        <div class="storage-legend" style="background:#333; border-radius: 8px; padding: 12px;">
          <h3 style="margin-top: 0;">Resource Storage Legend</h3>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="material-icons" style="color: #4CAF50;">visibility</span>
              <span>Stored in IndexedDB (preferred, large storage capacity)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="material-icons" style="color: #FFC107;">visibility</span>
              <span>Stored in localStorage only (limited storage, ~5MB total)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="material-icons" style="color: #FFFFFF;">visibility</span>
              <span>Stored in both IndexedDB and localStorage (backup)</span>
            </div>
          </div>
        </div>
        
        <!-- Actions Section -->
        <div class="resource-actions">
          <h3 style="margin-top: 0;">Optimize Storage</h3>
          <p>Choose what resources to move to IndexedDB for better performance:</p>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-top: 16px;">
            <sl-button class="optimize-bestiary-btn" variant="primary" style="justify-content: flex-start;">
              <span class="material-icons" slot="prefix">pets</span>
              Bestiary
            </sl-button>
            
            <sl-button class="optimize-models-btn" variant="primary" style="justify-content: flex-start;">
              <span class="material-icons" slot="prefix">view_in_ar</span>
              3D Models
            </sl-button>
            
            <sl-button class="optimize-all-btn" variant="success" style="grid-column: 1 / -1; justify-content: center;">
              <span class="material-icons" slot="prefix">settings_suggest</span>
              Optimize All Resources
            </sl-button>
          </div>
        </div>
        
        <!-- Export/Clear Section -->
        <div class="resource-management" style="border-top: 1px solid #444; padding-top: 16px; margin-top: 8px;">
          <h3 style="margin-top: 0;">Advanced Management</h3>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-top: 16px;">
            <sl-button class="export-bestiary-btn" style="justify-content: flex-start;">
              <span class="material-icons" slot="prefix">download</span>
              Export Bestiary
            </sl-button>
            
            <sl-button class="export-models-btn" style="justify-content: flex-start;">
              <span class="material-icons" slot="prefix">download</span>
              Export 3D Models
            </sl-button>
            
            <sl-button class="clear-bestiary-btn" variant="danger" style="justify-content: flex-start;">
              <span class="material-icons" slot="prefix">delete_forever</span>
              Clear Bestiary
            </sl-button>
            
            <sl-button class="clear-models-btn" variant="danger" style="justify-content: flex-start;">
              <span class="material-icons" slot="prefix">delete_forever</span>
              Clear 3D Models
            </sl-button>
          </div>
        </div>
        
        <div class="warning" style="color: #f44336; font-size: 0.9em;">
          <strong>Note:</strong> "Clear" actions will permanently remove resources from all storage. 
          Export your data first if you want to keep a backup!
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    dialog.show();
    
    // Add event listeners
    // Optimize buttons
    dialog.querySelector('.optimize-bestiary-btn').addEventListener('click', async () => {
      dialog.hide();
      await this.optimizeBestiaryStorage();
    });
    
    dialog.querySelector('.optimize-models-btn').addEventListener('click', async () => {
      dialog.hide();
      await this.optimizeShapeForgeStorage();
    });
    
    dialog.querySelector('.optimize-all-btn').addEventListener('click', async () => {
      dialog.hide();
      this.showSuccessNotification("Optimizing all resources...");
      await this.optimizeBestiaryStorage();
      await this.optimizeShapeForgeStorage();
      // Add other resource types as needed
      this.showSuccessNotification("Storage optimization complete!");
    });
    
    // Export buttons
    dialog.querySelector('.export-bestiary-btn').addEventListener('click', () => {
      dialog.hide();
      this.saveBestiaryToFile();
    });
    
    dialog.querySelector('.export-models-btn').addEventListener('click', () => {
      dialog.hide();
      this.exportAllShapeForgeModels();
    });
    
    // Clear buttons
    dialog.querySelector('.clear-bestiary-btn').addEventListener('click', () => {
      if (confirm('WARNING: This will permanently delete ALL monsters from both IndexedDB and localStorage.\n\nDo you want to continue?')) {
        dialog.hide();
        this.clearBestiary();
      }
    });
    
    dialog.querySelector('.clear-models-btn').addEventListener('click', () => {
      if (confirm('WARNING: This will permanently delete ALL 3D models from both IndexedDB and localStorage.\n\nDo you want to continue?')) {
        dialog.hide();
        this.clearShapeForgeModels();
      }
    });
    
    // Clean up when dialog is closed
    dialog.addEventListener('sl-after-hide', () => {
      document.body.removeChild(dialog);
    });
  }

  // Add this to the constructor or initialization method
  async loadShapeForgeModels() {
    console.log("Loading ShapeForge models from storage...");
    
    if (!this.resources.shapeforge) {
      this.resources.shapeforge = new Map();
    }
    
    let modelsLoaded = 0;
    
    // Try to load from IndexedDB first
    try {
      const db = await this.openModelDatabase();
      const tx = db.transaction(['models'], 'readonly');
      const store = tx.objectStore('models');
      const request = store.getAll();
      
      const models = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (e) => {
          console.error("IndexedDB error:", e);
          reject(e);
        }
      });
      
      // Add models to memory
      models.forEach(model => {
        this.resources.shapeforge.set(model.id, model);
        modelsLoaded++;
      });
      
      console.log(`Loaded ${modelsLoaded} ShapeForge models from IndexedDB`);
    } catch (e) {
      console.warn("Failed to load ShapeForge models from IndexedDB:", e);
    }
    
    // If none loaded, try localStorage as fallback
    if (modelsLoaded === 0) {
      try {
        const storageData = localStorage.getItem('modelDatabase');
        if (storageData) {
          const data = JSON.parse(storageData);
          if (data && typeof data === 'object') {
            Object.entries(data).forEach(([id, model]) => {
              this.resources.shapeforge.set(id, model);
              modelsLoaded++;
            });
          }
        }
        console.log(`Loaded ${modelsLoaded} ShapeForge models from localStorage`);
      } catch (e) {
        console.warn("Failed to load ShapeForge models from localStorage:", e);
      }
    }
    
    return modelsLoaded;
  }
  
  // Add new methods for ShapeForge models optimization
  async optimizeShapeForgeStorage() {
    let optimized = 0;
    let total = 0;
    
    try {
      // Get models from localStorage
      const storageData = localStorage.getItem('modelDatabase');
      if (storageData) {
        const data = JSON.parse(storageData);
        if (data) {
          const models = Object.values(data);
          total = models.length;
          
          // For each model, check if it's in IndexedDB and add if not
          const db = await this.openModelDatabase();
          
          for (const model of models) {
            if (model.id) {
              const tx = db.transaction(['models'], 'readwrite');
              const store = tx.objectStore('models');
              
              // Check if already in IndexedDB
              const existsRequest = store.get(model.id);
              const exists = await new Promise(resolve => {
                existsRequest.onsuccess = () => resolve(!!existsRequest.result);
                existsRequest.onerror = () => resolve(false);
              });
              
              if (!exists) {
                try {
                  // Try to add to IndexedDB
                  await new Promise((resolve, reject) => {
                    const addRequest = store.put(model);
                    addRequest.onsuccess = () => resolve();
                    addRequest.onerror = (e) => reject(e);
                  });
                  optimized++;
                } catch (e) {
                  console.warn(`Failed to optimize storage for model ${model.id}:`, e);
                }
              }
            }
          }
        }
      }
      
      this.showSuccessNotification(`Storage optimization complete: ${optimized} of ${total} models optimized.`);
    } catch (e) {
      console.error("Error during ShapeForge storage optimization:", e);
      this.showErrorNotification(`Error optimizing storage: ${e.message}`);
    }
  }
  
  // Clear all ShapeForge models
  async clearShapeForgeModels() {
    try {
      // Clear from IndexedDB
      const db = await this.openModelDatabase();
      const tx = db.transaction(['models'], 'readwrite');
      const store = tx.objectStore('models');
      await store.clear();
      
      // Clear from localStorage
      localStorage.removeItem('modelDatabase');
      
      // Clear from memory
      if (this.resources.shapeforge) {
        this.resources.shapeforge.clear();
      }
      
      this.showSuccessNotification("All 3D models have been removed");
      
      // Update the gallery if visible
      const drawer = document.querySelector('.resource-manager-drawer');
      if (drawer) {
        this.updateShapeForgeGallery(drawer);
      }
      
      return true;
    } catch (error) {
      console.error('Error clearing ShapeForge models:', error);
      this.showErrorNotification(`Error clearing models: ${error.message}`);
      return false;
    }
  }
  
  // Export all ShapeForge models as a single JSON file
  exportAllShapeForgeModels() {
    if (!this.resources.shapeforge || this.resources.shapeforge.size === 0) {
      this.showInfoNotification("No 3D models to export");
      return false;
    }
    
    try {
      const modelsData = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        models: {}
      };
      
      this.resources.shapeforge.forEach((model, key) => {
        modelsData.models[key] = model;
      });
      
      const blob = new Blob([JSON.stringify(modelsData, null, 2)], {
        type: 'application/json'
      });
      
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'shapeforge_models.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      
      this.showSuccessNotification(`Exported ${this.resources.shapeforge.size} 3D models`);
      return true;
    } catch (error) {
      console.error('Error exporting ShapeForge models:', error);
      this.showErrorNotification(`Error exporting models: ${error.message}`);
      return false;
    }
  }

// Add this method to clear monsters from both storage systems
async clearAllMonsters() {
  // Clear IndexedDB
  if (this.db) {
    try {
      const tx = this.db.transaction(['monsters'], 'readwrite');
      const store = tx.objectStore('monsters');
      await store.clear();
      console.log("Cleared all monsters from IndexedDB");
    } catch (e) {
      console.error("Failed to clear IndexedDB:", e);
    }
  }
  
  // Clear localStorage
  try {
    this.monsterDatabase = { monsters: {} };
    localStorage.setItem('monsterDatabase', JSON.stringify(this.monsterDatabase));
    console.log("Cleared all monsters from localStorage");
  } catch (e) {
    console.error("Failed to clear localStorage:", e);
  }
  
  alert("All monsters have been removed from storage.");
}

showPropsImportOptions(drawer) {
    const dialog = document.createElement('sl-dialog');
    dialog.label = 'Import Props';
    
    dialog.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 16px;">
            <sl-button size="large" class="single-files-btn" style="justify-content: flex-start;">
                <span class="material-icons" slot="prefix">upload_file</span>
                Select Files
                <div style="font-size: 0.8em; color: #666; margin-top: 4px;">
                    Select individual prop files to import
                </div>
            </sl-button>
            
            <sl-button size="large" class="folder-btn" style="justify-content: flex-start;">
                <span class="material-icons" slot="prefix">folder_open</span>
                Select Folder
                <div style="font-size: 0.8em; color: #666; margin-top: 4px;">
                    Import an entire folder of props with automatic tagging
                </div>
            </sl-button>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Create hidden file inputs - these will be cleaned up with the dialog
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;
    fileInput.style.display = 'none';
    
    const folderInput = document.createElement('input');
    folderInput.type = 'file';
    folderInput.accept = 'image/*';
    folderInput.multiple = true;
    folderInput.webkitdirectory = true;
    folderInput.directory = true;
    folderInput.style.display = 'none';
    
    // Append inputs to the dialog instead of document.body for better cleanup
    dialog.appendChild(fileInput);
    dialog.appendChild(folderInput);
    
    // File selection handler
    dialog.querySelector('.single-files-btn').addEventListener('click', () => {
        dialog.hide();
        fileInput.click();
    });
    
    // Folder selection handler
    dialog.querySelector('.folder-btn').addEventListener('click', () => {
        dialog.hide();
        folderInput.click();
    });
    
    // Handle file selections
    fileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            for (const file of files) {
                await this.addTexture(file, 'props');
            }
            this.updateGallery(drawer, 'props');
        }
    });
    
    // Handle folder selections
    folderInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            await this.processFolderImport(files);
            this.updateGallery(drawer, 'props');
        }
    });
    
    // Clean up on dialog close - the dialog and all its children will be removed
    dialog.addEventListener('sl-after-hide', () => {
        dialog.remove(); // This also removes the file inputs that are children of the dialog
    });
    
    dialog.show();
}


getSplashArtUrl(imageData) {
    if (!imageData) return '';
    try {
      const { id, category } = imageData;
      const art = this.resources.splashArt[category]?.get(id);
      
      // Return the full image data, not just the thumbnail
      return art?.data || '';
    } catch (error) {
      console.error('Error getting splash art URL:', error);
      return '';
    }
  }

setupSplashArtHandlers(drawer) {
    console.log('Setting up splash art handlers');
    
    // Set up category buttons
    const categoryBtns = drawer.querySelectorAll('.splash-art-controls sl-button-group sl-button');
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update button states
            categoryBtns.forEach(b => b.setAttribute('variant', 'default'));
            btn.setAttribute('variant', 'primary');

            // Update gallery with selected category
            const category = btn.dataset.category;
            const currentView = drawer.querySelector('.splash-art-controls .view-toggle[variant="primary"]')?.dataset.view || 'grid';
            this.updateGallery(drawer, category, currentView);
        });
    });

    // Set up upload handling
    const uploadBtn = drawer.querySelector('.splashart-upload-btn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            // Create a new file input each time to ensure it triggers
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.multiple = true;
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);

            // Set up the change handler before clicking
            fileInput.addEventListener('change', async (e) => {
                const files = Array.from(e.target.files || []);
                if (!files.length) return;

                const activeCategory = drawer.querySelector('.splash-art-controls sl-button[variant="primary"]')?.dataset.category || 'title';
                
                for (const file of files) {
                    try {
                        const description = await this.promptForDescription(file.name);
                        await this.addSplashArt(file, description, activeCategory);
                    } catch (error) {
                        console.error('Error processing splash art file:', error);
                    }
                }

                // Update gallery
                this.updateGallery(drawer, activeCategory, 
                    drawer.querySelector('.splash-art-controls .view-toggle[variant="primary"]')?.dataset.view || 'grid'
                );

                // Clean up
                document.body.removeChild(fileInput);
            });

            // Now trigger the file input
            fileInput.click();
        });
    }

    // Set up view toggles
    const viewToggles = drawer.querySelectorAll('.splash-art-controls .view-toggle');
    viewToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            viewToggles.forEach(t => t.setAttribute('variant', 'default'));
            toggle.setAttribute('variant', 'primary');

            const currentCategory = drawer.querySelector('.splash-art-controls sl-button[variant="primary"]')?.dataset.category || 'title';
            this.updateGallery(drawer, currentCategory, toggle.dataset.view);
        });
    });
}

    async promptForDescription(filename) {
        return new Promise((resolve) => {
            const dialog = document.createElement('sl-dialog');
            dialog.label = `Add Description for ${filename}`;
            dialog.innerHTML = `
            <sl-input label="Description" id="description-input"></sl-input>
            <div slot="footer">
                <sl-button variant="primary" id="save-btn">Save</sl-button>
                <sl-button variant="default" id="cancel-btn">Cancel</sl-button>
            </div>
        `;

            document.body.appendChild(dialog);
            dialog.show();

            const input = dialog.querySelector('#description-input');
            const saveBtn = dialog.querySelector('#save-btn');
            const cancelBtn = dialog.querySelector('#cancel-btn');

            saveBtn.addEventListener('click', () => {
                dialog.hide();
                resolve(input.value);
            });

            cancelBtn.addEventListener('click', () => {
                dialog.hide();
                resolve('');
            });

            dialog.addEventListener('sl-after-hide', () => {
                dialog.remove();
            });
        });
    }

async initializeMonsterManager(mapEditor) {
    if (!this.monsterManager) {
        console.log('Initializing MonsterManager...');
        this.monsterManager = new MonsterManager(mapEditor);
        
        try {
            // Wait for database initialization
            if (this.monsterManager.dbInitPromise) {
                await this.monsterManager.dbInitPromise;
                console.log('MonsterManager database initialized');
            }
            
            // Now load bestiary data
            await this.loadBestiaryFromDatabase();
        } catch (err) {
            console.error("Error during MonsterManager initialization:", err);
        }
        
        return this.monsterManager;
    }
    return this.monsterManager;
}

async loadBestiaryFromDatabase() {
    console.log("ResourceManager: Loading bestiary from database...");
    
    if (!this.resources.bestiary) {
      this.resources.bestiary = new Map();
    }
    
    // Make sure we have a monsterManager
    if (!this.monsterManager) {
      console.log("ResourceManager: Creating new MonsterManager instance");
      this.monsterManager = new MonsterManager(this.mapEditor);
      
      // Wait for DB initialization
      if (this.monsterManager.dbInitPromise) {
        console.log("ResourceManager: Waiting for database initialization...");
        await this.monsterManager.dbInitPromise;
      }
    }
    
    // Use the new loadAllMonsters method
    const { monsters, source } = await this.monsterManager.loadAllMonsters();
    
    if (monsters && monsters.length > 0) {
      // Add each monster to the bestiary
      monsters.forEach(monster => {
        if (!monster || !monster.id) {
          console.warn("ResourceManager: Found invalid monster without ID", monster);
          return;
        }
        
        this.resources.bestiary.set(monster.id, {
          id: monster.id,
          name: monster.basic?.name || "Unknown Monster",
          data: monster,
          thumbnail: monster.token?.data || this.generateMonsterThumbnail(monster),
          cr: monster.basic?.cr || "0",
          type: monster.basic?.type || "unknown",
          size: monster.basic?.size || "medium",
          dateAdded: monster.dateAdded || new Date().toISOString()
        });
      });
      
      console.log(`ResourceManager: Successfully loaded ${this.resources.bestiary.size} monsters from ${source}`);
    } else {
      console.warn("ResourceManager: No monsters found in any storage");
    }
    
    // Import default monsters if bestiary is empty
    if (this.resources.bestiary.size === 0) {
      console.log("ResourceManager: Bestiary is empty, importing default monsters");
      await this.importDefaultMonsters();
    }
    
    return this.resources.bestiary;
  }

    saveDatabase() {
        try {
            localStorage.setItem("monsterDatabase", JSON.stringify(this.monsterDatabase));
            return true;
        } catch (e) {
            console.error("Error saving monster database:", e);
            return false;
        }
    }

    deleteMonster(monsterId) {
        const key = typeof monsterId === 'string' ? 
            monsterId : 
            monsterId.basic?.name?.toLowerCase().replace(/\s+/g, "_");
        
        if (this.monsterDatabase.monsters[key]) {
            delete this.monsterDatabase.monsters[key];
            this.saveDatabase();
            return true;
        }
        return false;
    }
    
    generateMonsterThumbnail(monster) {
        // Create a canvas for the thumbnail
        const canvas = document.createElement('canvas');
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Generate color based on monster name
        const hashCode = monster.basic.name.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        
        const hue = Math.abs(hashCode) % 360;
        ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;
        ctx.fillRect(0, 0, size, size);
        
        // Add border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, size-4, size-4);
        
        // Add initial
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(monster.basic.name.charAt(0).toUpperCase(), size/2, size/2);
        
        return canvas.toDataURL('image/webp');
    }
    
// NOTE - DO NOT OMIT OR DELETE THE BUTTON FOR LOADING A TOKEN IMAGE
// IT IS USED IN THE NEXT SECTION FOR THE MONSTER IMPORTER
// CORS prevents us from using the url, so we have to do it this way

async showMonsterImporter() {
    const dialog = document.createElement("sl-dialog");
    dialog.label = "Import Monster";
    dialog.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 16px;">
            <div class="instructions" style="background: #f5f5f5; padding: 12px; border-radius: 4px;">
                <p style="margin-top: 0;">To import monster data from 5e.tools:</p>
                <ol style="margin-left: 20px; margin-bottom: 0;">
                    <li>On 5e.tools, right-click on the monster's stat block</li>
                    <li>Select "Inspect Element" or press F12</li>
                    <li>Find the <code>&lt;div id="wrp-pagecontent"&gt;</code> element</li>
                    <li>Right-click the element and select:
                        <ul style="margin-left: 20px;">
                            <li>In Chrome/Edge: "Copy > Copy element"</li>
                            <li>In Firefox: "Copy > Outer HTML"</li>
                        </ul>
                    </li>
                    <li>Paste below</li>
                </ol>
            </div>
            
            <textarea id="monsterHtml" 
                rows="10" 
                style="width: 100%; font-family: monospace; padding: 8px;"
                placeholder="Paste monster stat block HTML here..."></textarea>

            <div id="monsterPreview" style="display: none; max-height: 60vh; overflow-y: auto;">
                <!-- Basic Info Section -->
                <div class="monster-header" style="margin-bottom: 16px;">
                    <h3 class="monster-name" style="margin: 0; font-size: 1.5em;"></h3>
                    <div style="color: #666; font-style: italic;">
                        <span class="monster-size"></span>
                        <span class="monster-type"></span>,
                        <span class="monster-alignment"></span>
                    </div>
                </div>

                <!-- Monster Image -->
                <div class="monster-image" style="margin-bottom: 16px; text-align: center;">
                    <img style="max-width: 200px; display: none; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.2);" />
                    <div class="token-controls" style="margin-top: 8px; display: flex; justify-content: center;"></div>
                </div>

                <!-- Core Stats -->
                <div class="core-stats" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; text-align: center; background: #f5f5f5; padding: 8px; border-radius: 4px;">
                    <div>
                        <div style="font-weight: bold;">Armor Class</div>
                        <div class="monster-ac"></div>
                    </div>
                    <div>
                        <div style="font-weight: bold;">Hit Points</div>
                        <div class="monster-hp"></div>
                    </div>
                    <div>
                        <div style="font-weight: bold;">Speed</div>
                        <div class="monster-speed"></div>
                    </div>
                </div>

                <!-- Ability Scores -->
                <div class="ability-scores" style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 16px; text-align: center; background: #f5f5f5; padding: 8px; border-radius: 4px;">
                    <div>
                        <div style="font-weight: bold;">STR</div>
                        <div class="monster-str"></div>
                    </div>
                    <div>
                        <div style="font-weight: bold;">DEX</div>
                        <div class="monster-dex"></div>
                    </div>
                    <div>
                        <div style="font-weight: bold;">CON</div>
                        <div class="monster-con"></div>
                    </div>
                    <div>
                        <div style="font-weight: bold;">INT</div>
                        <div class="monster-int"></div>
                    </div>
                    <div>
                        <div style="font-weight: bold;">WIS</div>
                        <div class="monster-wis"></div>
                    </div>
                    <div>
                        <div style="font-weight: bold;">CHA</div>
                        <div class="monster-cha"></div>
                    </div>
                </div>

                <!-- Additional Traits -->
                <div class="additional-traits" style="margin-bottom: 16px;">
                    <div style="margin-bottom: 8px;">
                        <strong>Challenge Rating:</strong> <span class="monster-cr"></span>
                        (<span class="monster-xp"></span> XP)
                    </div>
                    <div style="margin-bottom: 8px;">
                        <strong>Proficiency Bonus:</strong> <span class="monster-prof"></span>
                    </div>
                    <div style="margin-bottom: 8px;">
                        <strong>Senses:</strong> <span class="monster-senses"></span>
                    </div>
                    <div style="margin-bottom: 8px;">
                        <strong>Languages:</strong> <span class="monster-languages"></span>
                    </div>
                    <div class="monster-immunities-container" style="margin-bottom: 8px; display: none;">
                        <strong>Immunities:</strong> <span class="monster-immunities"></span>
                    </div>
                </div>
                
                <!-- Actions Section -->
                <div class="monster-actions" style="margin-top: 20px; display: none;">
                    <h3 style="border-bottom: 1px solid #ddd; padding-bottom: 8px;">Actions</h3>
                    <div class="actions-list" style="display: flex; flex-direction: column; gap: 12px;"></div>
                </div>
            </div>

            <div id="loadingIndicator" style="display: none; text-align: center;">
                <sl-spinner></sl-spinner>
                <div>Processing monster data...</div>
            </div>

            <div id="errorMessage" style="display: none; color: #f44336;"></div>
        </div>
        <div slot="footer">
            <sl-button variant="neutral" class="cancel-btn">Cancel</sl-button>
            <sl-button variant="primary" class="save-btn" disabled>Add to Bestiary</sl-button>
        </div>
    `;

    document.body.appendChild(dialog);
    dialog.show();

    const htmlInput = dialog.querySelector("#monsterHtml");
    const saveBtn = dialog.querySelector(".save-btn");
    const cancelBtn = dialog.querySelector(".cancel-btn");
    const loadingIndicator = dialog.querySelector("#loadingIndicator");
    const errorMessage = dialog.querySelector("#errorMessage");
    const preview = dialog.querySelector("#monsterPreview");

    let currentMonsterData = null;

    // Handle HTML paste
    htmlInput.addEventListener("input", async () => {
        const html = htmlInput.value.trim();
        if (html) {
            try {
                loadingIndicator.style.display = "block";
                errorMessage.style.display = "none";
                preview.style.display = "none";
                saveBtn.disabled = true;

                // Parse monster HTML
                currentMonsterData = await this.monsterManager.parseMonsterHtml(html);
                console.log("Parsed monster data:", currentMonsterData);

                if (currentMonsterData) {
                    // Update basic info
                    preview.querySelector(".monster-name").textContent = currentMonsterData.basic.name;
                    preview.querySelector(".monster-size").textContent = currentMonsterData.basic.size;
                    preview.querySelector(".monster-type").textContent = currentMonsterData.basic.type;
                    preview.querySelector(".monster-alignment").textContent = currentMonsterData.basic.alignment;

                    // Update core stats
                    preview.querySelector(".monster-ac").textContent = currentMonsterData.stats.ac;
                    preview.querySelector(".monster-hp").textContent = 
                        `${currentMonsterData.stats.hp.average} (${currentMonsterData.stats.hp.roll})`;
                    preview.querySelector(".monster-speed").textContent = currentMonsterData.stats.speed;

                    // Update ability scores
                    Object.entries(currentMonsterData.abilities).forEach(([ability, data]) => {
                        const element = preview.querySelector(`.monster-${ability}`);
                        if (element) {
                            element.textContent = `${data.score} (${data.modifier >= 0 ? '+' : ''}${data.modifier})`;
                        }
                    });

                    // Update additional traits
                    preview.querySelector(".monster-cr").textContent = currentMonsterData.basic.cr;
                    preview.querySelector(".monster-xp").textContent = currentMonsterData.basic.xp;
                    preview.querySelector(".monster-prof").textContent = `+${currentMonsterData.basic.proficiencyBonus}`;
                    preview.querySelector(".monster-senses").textContent = 
                        currentMonsterData.traits.senses.join(", ") || "None";
                    preview.querySelector(".monster-languages").textContent = currentMonsterData.traits.languages;

                    // Handle immunities
                    const immunitiesContainer = preview.querySelector(".monster-immunities-container");
                    const immunitiesSpan = preview.querySelector(".monster-immunities");
                    if (currentMonsterData.traits.immunities && currentMonsterData.traits.immunities.length > 0) {
                        immunitiesSpan.textContent = currentMonsterData.traits.immunities.join(", ");
                        immunitiesContainer.style.display = "block";
                    } else {
                        immunitiesContainer.style.display = "none";
                    }
                    
                    // Display actions if available
                    const actionsContainer = preview.querySelector(".monster-actions");
                    const actionsList = preview.querySelector(".actions-list");
                    
                    if (currentMonsterData.actions && Array.isArray(currentMonsterData.actions) && currentMonsterData.actions.length > 0) {
                        actionsContainer.style.display = "block";
                        actionsList.innerHTML = "";
                        
                        currentMonsterData.actions.slice(0, 3).forEach(action => {
                            const actionCard = document.createElement("div");
                            actionCard.style.cssText = "padding: 10px; border: 1px solid #ddd; border-radius: 4px; background-color: #f9f9f9;";
                            
                            actionCard.innerHTML = `
                                <div style="font-weight: bold; margin-bottom: 4px;">${action.name}</div>
                                <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 4px;">
                                    ${action.attackBonus !== undefined ? `
                                        <div style="background: #eee; padding: 2px 6px; border-radius: 4px; font-size: 0.9em;">
                                            <strong>Attack:</strong> ${action.attackBonus >= 0 ? '+' : ''}${action.attackBonus}
                                        </div>
                                    ` : ''}
                                    ${action.damageDice ? `
                                        <div style="background: #eee; padding: 2px 6px; border-radius: 4px; font-size: 0.9em;">
                                            <strong>Damage:</strong> ${action.damageDice} ${action.damageType || ''}
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                            
                            actionsList.appendChild(actionCard);
                        });
                        
                        if (currentMonsterData.actions.length > 3) {
                            const moreActions = document.createElement("div");
                            moreActions.style.cssText = "text-align: center; font-style: italic; color: #666; margin-top: 8px;";
                            moreActions.textContent = `+ ${currentMonsterData.actions.length - 3} more actions`;
                            actionsList.appendChild(moreActions);
                        }
                    } else {
                        actionsContainer.style.display = "none";
                    }

                    // Handle token image
                    const imageContainer = preview.querySelector(".monster-image");
                    const tokenControls = preview.querySelector(".token-controls");
                    const imgElement = imageContainer.querySelector("img");
                    
                    // Clear any existing buttons
                    tokenControls.innerHTML = "";
                    
                    if (currentMonsterData?.token && (currentMonsterData.token.data || currentMonsterData.token.url)) {
                        // We have either a data URL or a web URL for the token
                        const imageUrl = currentMonsterData.token.data || currentMonsterData.token.url;
                        imgElement.src = imageUrl;
                        imgElement.style.display = "block";

                        // If we only have URL but not data, add button to capture image data
                        if (!currentMonsterData.token.data) {
                            const captureBtn = document.createElement('sl-button');
                            captureBtn.className = "capture-btn";
                            captureBtn.variant = "primary";
                            captureBtn.innerHTML = "Choose Token Image";
                            captureBtn.style.marginTop = "8px";

                            // Create hidden file input
                            const fileInput = document.createElement('input');
                            fileInput.type = 'file';
                            fileInput.accept = 'image/webp,image/png,image/jpeg';
                            fileInput.style.display = 'none';
                            tokenControls.appendChild(fileInput);

                            // Show instructions when clicked
                            captureBtn.addEventListener('click', () => {
                                const instructions = document.createElement('div');
                                instructions.innerHTML = '1. Right-click the token image above<br>2. Select "Save image as..."<br>3. Save it locally<br>4. Then select the saved file';
                                instructions.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #333; color: white; padding: 10px; border-radius: 5px; z-index: 9999; box-shadow: 0 2px 10px rgba(0,0,0,0.2);';
                                document.body.appendChild(instructions);

                                setTimeout(() => {
                                    instructions.remove();
                                    fileInput.click();
                                }, 3000);
                            });

                            // Handle file selection
                            fileInput.addEventListener('change', (e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                        currentMonsterData.token.data = event.target.result;
                                        captureBtn.innerHTML = "✓ Token Saved";
                                        captureBtn.variant = "success";
                                        captureBtn.disabled = true;
                                        imgElement.src = event.target.result;
                                    };
                                    reader.readAsDataURL(file);
                                }
                            });

                            tokenControls.appendChild(captureBtn);
                            
                            // Add warning about CORS
                            const corsWarning = document.createElement('div');
                            corsWarning.innerHTML = '<span style="color: #ff9800;">⚠</span> Token image must be saved locally for proper display';
                            corsWarning.style.cssText = 'color: #666; font-size: 0.8em; margin-top: 8px; text-align: center;';
                            tokenControls.appendChild(corsWarning);
                        } else {
                            // We already have token data, show a success indicator
                            const tokenStatus = document.createElement('div');
                            tokenStatus.innerHTML = '<span style="color: #4caf50;">✓</span> Token image ready';
                            tokenStatus.style.cssText = 'color: #666; font-size: 0.9em; margin-top: 8px; text-align: center;';
                            tokenControls.appendChild(tokenStatus);
                        }
                    } else {
                        // No token image, show placeholder and upload option
                        imgElement.style.display = "none";
                        
                        const uploadBtn = document.createElement('sl-button');
                        uploadBtn.variant = "primary";
                        uploadBtn.innerHTML = '<span class="material-icons">upload</span> Upload Token Image';
                        
                        const fileInput = document.createElement('input');
                        fileInput.type = 'file';
                        fileInput.accept = 'image/webp,image/png,image/jpeg';
                        fileInput.style.display = 'none';
                        tokenControls.appendChild(fileInput);
                        
                        uploadBtn.addEventListener('click', () => {
                            fileInput.click();
                        });
                        
                        fileInput.addEventListener('change', (e) => {
                            const file = e.target.files[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                    // Initialize token object if needed
                                    if (!currentMonsterData.token) {
                                        currentMonsterData.token = {};
                                    }
                                    
                                    currentMonsterData.token.data = event.target.result;
                                    imgElement.src = event.target.result;
                                    imgElement.style.display = "block";
                                    
                                    uploadBtn.innerHTML = '<span class="material-icons">check</span> Token Uploaded';
                                    uploadBtn.variant = "success";
                                    uploadBtn.disabled = true;
                                };
                                reader.readAsDataURL(file);
                            }
                        });
                        
                        tokenControls.appendChild(uploadBtn);
                        
                        const placeholderText = document.createElement('div');
                        placeholderText.textContent = 'No token image available';
                        placeholderText.style.cssText = 'color: #666; font-style: italic; margin-top: 8px; text-align: center;';
                        tokenControls.appendChild(placeholderText);
                    }

                    preview.style.display = "block";
                    saveBtn.disabled = false;
                }
            } catch (error) {
                console.error("Error in monster data processing:", error);
                errorMessage.textContent = "Error parsing monster data. Please check the HTML.";
                errorMessage.style.display = "block";
                saveBtn.disabled = true;
            } finally {
                loadingIndicator.style.display = "none";
            }
        }
    });

    return new Promise((resolve) => {
        saveBtn.addEventListener("click", async () => {
            if (currentMonsterData) {
                // Ensure we have token data
                if (currentMonsterData.token && currentMonsterData.token.url && !currentMonsterData.token.data) {
                    const imgElement = preview.querySelector(".monster-image img");
                    if (imgElement && imgElement.complete) {
                        try {
                            const canvas = document.createElement('canvas');
                            canvas.width = imgElement.naturalWidth;
                            canvas.height = imgElement.naturalHeight;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(imgElement, 0, 0);
                            currentMonsterData.token.data = canvas.toDataURL('image/webp');
                        } catch (error) {
                            console.error("Final token capture failed:", error);
                            
                            // Alert the user about the problem
                            const warningDialog = document.createElement('sl-dialog');
                            warningDialog.label = "Token Image Issue";
                            warningDialog.innerHTML = `
                                <div style="display: flex; flex-direction: column; gap: 16px;">
                                    <div style="color: #f44336; display: flex; align-items: center; gap: 8px;">
                                        <span class="material-icons">warning</span>
                                        <strong>Could not save token image</strong>
                                    </div>
                                    <p>
                                        The token image couldn't be saved due to CORS restrictions. 
                                        Please use the "Choose Token Image" button to select a local image file.
                                    </p>
                                </div>
                                <div slot="footer">
                                    <sl-button variant="primary" class="ok-btn">OK</sl-button>
                                </div>
                            `;
                            document.body.appendChild(warningDialog);
                            warningDialog.show();
                            
                            warningDialog.querySelector('.ok-btn').addEventListener('click', () => {
                                warningDialog.hide();
                            });
                            
                            warningDialog.addEventListener('sl-after-hide', () => {
                                warningDialog.remove();
                            });
                            
                            return; // Stop saving until they fix the token
                        }
                    }
                }
                
                // Save to bestiary
                const key = currentMonsterData.basic.name.toLowerCase().replace(/\s+/g, "_");
                this.resources.bestiary.set(key, {
                    id: key,
                    name: currentMonsterData.basic.name,
                    data: currentMonsterData,
                    thumbnail: currentMonsterData.token?.data || this.generateMonsterThumbnail(currentMonsterData),
                    cr: currentMonsterData.basic.cr,
                    type: currentMonsterData.basic.type,
                    size: currentMonsterData.basic.size,
                    dateAdded: new Date().toISOString()
                });
                
                // Save to MonsterManager database too
                try {
                    await this.monsterManager.saveMonsterToDatabase(currentMonsterData);
                    this.showSuccessNotification(`Added ${currentMonsterData.basic.name} to the bestiary`);
                } catch (error) {
                    if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
                        this.showQuotaExceededDialog();
                    } else {
                        this.showErrorNotification(`Error saving monster: ${error.message}`);
                    }
                    console.error("Error saving monster:", error);
                }
                
                // Refresh the gallery
                const drawer = document.querySelector('.resource-manager-drawer');
                if (drawer) {
                    const viewMode = drawer.querySelector('.view-toggle[variant="primary"]')?.dataset.view || 'grid';
                    this.updateBestiaryGallery(drawer, viewMode);
                }
                
                dialog.hide();
                resolve(true);
            }
        });

        cancelBtn.addEventListener("click", () => {
            dialog.hide();
            resolve(false);
        });

        dialog.addEventListener("sl-after-hide", () => {
            dialog.remove();
        });
    });
}

    saveBestiaryToFile(filename = 'bestiary.json') {
        try {
            const bestiaryData = {
                version: "1.0",
                timestamp: new Date().toISOString(),
                monsters: {}
            };
            
            this.resources.bestiary.forEach((monster, key) => {
                bestiaryData.monsters[key] = monster.data;
            });
            
            const blob = new Blob([JSON.stringify(bestiaryData, null, 2)], {
                type: 'application/json'
            });
            
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
            
            console.log(`Saved ${this.resources.bestiary.size} monsters to ${filename}`);
            return true;
        } catch (error) {
            console.error("Error saving bestiary:", error);
            return false;
        }
    }
    
        async loadBestiaryFromFile(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (data.monsters) {
                // Clear existing bestiary ONLY if user confirms
                if (this.resources.bestiary.size > 0) {
                    if (!confirm(`You have ${this.resources.bestiary.size} monsters already in your bestiary. Do you want to replace them with the imported monsters?`)) {
                        // If user cancels, we'll merge instead of replace
                        console.log("Merging imported monsters with existing bestiary");
                        
                        // Process monsters
                        let added = 0;
                        let skipped = 0;
                        Object.entries(data.monsters).forEach(([key, monster]) => {
                            // Skip if monster already exists
                            if (this.resources.bestiary.has(key)) {
                                skipped++;
                                return;
                            }
                            
                            // Add new monster
                            this.resources.bestiary.set(key, {
                                id: key,
                                name: monster.basic.name,
                                data: monster,
                                thumbnail: monster.token?.data || this.generateMonsterThumbnail(monster),
                                cr: monster.basic.cr,
                                type: monster.basic.type,
                                size: monster.basic.size,
                                dateAdded: monster.dateAdded || new Date().toISOString()
                            });
                            
                            // Also add to MonsterManager database
                            this.monsterManager.saveMonsterToDatabase(monster);
                            added++;
                        });
                        
                        console.log(`Merged ${added} monsters from file (skipped ${skipped} duplicates)`);
                        return true;
                    }
                }
                
                // Clear existing bestiary if user confirmed or there were no existing monsters
                this.resources.bestiary.clear();
                
                // Load monsters
                let addedCount = 0;
                let errorCount = 0;
                
                for (const [key, monster] of Object.entries(data.monsters)) {
                    try {
                        // Compress token if present to help with storage limits
                        if (monster.token?.data && monster.token.data.length > 10000) {
                            monster.token.data = await this.monsterManager.compressTokenImage(
                                monster.token.data, 
                                0.6 // Use higher compression for bulk imports
                            );
                        }
                        
                        this.resources.bestiary.set(key, {
                            id: key,
                            name: monster.basic.name,
                            data: monster,
                            thumbnail: monster.token?.data || this.generateMonsterThumbnail(monster),
                            cr: monster.basic.cr,
                            type: monster.basic.type,
                            size: monster.basic.size,
                            dateAdded: monster.dateAdded || new Date().toISOString()
                        });
                        
                        // Also add to MonsterManager database - add try/catch to handle quota errors
                        try {
                            await this.monsterManager.saveMonsterToDatabase(monster);
                            addedCount++;
                        } catch (err) {
                            if (err.name === 'QuotaExceededError' || err.message.includes('quota')) {
                                console.error(`Storage quota exceeded while adding monster ${key}`);
                                this.showQuotaExceededDialog();
                                break;
                            } else {
                                throw err;
                            }
                        }
                    } catch (error) {
                        console.error(`Error processing monster ${key}:`, error);
                        errorCount++;
                    }
                }
                
                console.log(`Loaded ${addedCount} monsters from file (${errorCount} errors)`);
                return addedCount > 0;
            } else {
                throw new Error("Invalid bestiary file format");
            }
        } catch (error) {
            console.error("Error loading bestiary file:", error);
            return false;
        }
    }

        // Add this method to ResourceManager
async clearBestiary(showConfirm = true) {
    // Show warning if requested
    if (showConfirm) {
        const confirmed = confirm(
            "WARNING: This will permanently delete ALL monsters from your bestiary. " +
            "This action cannot be undone!\n\n" +
            "It's recommended to export your bestiary first as a backup.\n\n" +
            "Do you want to proceed with deletion?"
        );
        
        if (!confirmed) return false;
    }
    
    try {
        // Clear the ResourceManager's bestiary collection
        this.resources.bestiary.clear();
        
        // Clear IndexedDB if available
        if (this.monsterManager && this.monsterManager.db) {
            const tx = this.monsterManager.db.transaction(['monsters'], 'readwrite');
            const store = tx.objectStore('monsters');
            await store.clear();
        }
        
        // Also clear localStorage as fallback
        if (this.monsterManager && this.monsterManager.monsterDatabase) {
            this.monsterManager.monsterDatabase.monsters = {};
            localStorage.setItem("monsterDatabase", 
                JSON.stringify(this.monsterManager.monsterDatabase));
        }
        
        console.log("Bestiary cleared successfully from all storage");
        return true;
    } catch (error) {
        console.error("Error clearing bestiary:", error);
        return false;
    }
}
    
    // Add a method to show quota exceeded dialog
    showQuotaExceededDialog() {
        const dialog = document.createElement('sl-dialog');
        dialog.label = 'Storage Quota Exceeded';
        
        dialog.innerHTML = `
            <div style="max-width: 500px;">
                <div style="margin-bottom: 16px; display: flex; align-items: center; gap: 12px;">
                    <span class="material-icons" style="font-size: 32px; color: #f44336;">storage</span>
                    <h2 style="margin: 0; font-size: 1.2rem;">Browser Storage Limit Reached</h2>
                </div>
                
                <p>Your browser's storage limit for this application has been exceeded. This typically happens when:</p>
                
                <ul style="margin-bottom: 16px;">
                    <li>You have many monsters with large token images</li>
                    <li>Your bestiary has grown very large</li>
                </ul>
                
                <p style="margin-bottom: 16px;">To fix this issue, you can:</p>
                
                <div style="background: #f5f5f5; padding: 16px; border-radius: 4px; margin-bottom: 16px;">
                    <h3 style="margin-top: 0; font-size: 1rem;">Recommended Actions</h3>
                    <ol style="margin-bottom: 0;">
                        <li><strong>Export your bestiary</strong> to back it up</li>
                        <li><strong>Clear your bestiary</strong> to free up storage</li>
                        <li><strong>Re-import essential monsters</strong> in smaller batches</li>
                    </ol>
                </div>
            </div>
            
            <div slot="footer">
                <sl-button class="export-btn" variant="primary">
                    <span class="material-icons" slot="prefix">download</span>
                    Export Bestiary
                </sl-button>
                <sl-button class="clear-btn" variant="danger">
                    <span class="material-icons" slot="prefix">delete</span>
                    Clear Bestiary
                </sl-button>
            </div>
        `;
        
        document.body.appendChild(dialog);
        dialog.show();
        
        // Add event listeners
        dialog.querySelector('.export-btn').addEventListener('click', async () => {
            await this.saveBestiaryToFile();
            dialog.hide();
        });
        
        dialog.querySelector('.clear-btn').addEventListener('click', async () => {
            const success = await this.clearBestiary();
            if (success) {
                dialog.hide();
                
                // Refresh the bestiary gallery
                const drawer = document.querySelector('.resource-manager-drawer');
                if (drawer) {
                    this.updateBestiaryGallery(drawer, 'grid');
                }
            }
        });
        
        dialog.addEventListener('sl-after-hide', () => {
            dialog.remove();
        });
    }

    debugBestiarySearch(drawer) {
        console.group("Bestiary Search Debugging");
        
        // Check if bestiary panel exists
        const bestiaryPanel = drawer.querySelector('sl-tab-panel[name="bestiary"]');
        console.log("Bestiary panel found:", !!bestiaryPanel);
        
        if (bestiaryPanel) {
            // Check search elements
            const searchInput = bestiaryPanel.querySelector('#monster-search');
            const crFilter = bestiaryPanel.querySelector('#cr-filter');
            const typeFilter = bestiaryPanel.querySelector('#type-filter');
            const sizeFilter = bestiaryPanel.querySelector('#size-filter');
            const clearFiltersBtn = bestiaryPanel.querySelector('#clear-filters');
            
            console.log("Filter elements:", {
                searchInput: {
                    found: !!searchInput,
                    value: searchInput?.value || "N/A",
                    id: searchInput?.id || "N/A",
                    hasListeners: searchInput?._events?.length > 0
                },
                crFilter: {
                    found: !!crFilter,
                    value: crFilter?.value || "N/A",
                    id: crFilter?.id || "N/A",
                    hasListeners: crFilter?._events?.length > 0
                },
                typeFilter: {
                    found: !!typeFilter,
                    value: typeFilter?.value || "N/A",
                    id: typeFilter?.id || "N/A",
                    hasListeners: typeFilter?._events?.length > 0
                },
                sizeFilter: {
                    found: !!sizeFilter,
                    value: sizeFilter?.value || "N/A", 
                    id: sizeFilter?.id || "N/A",
                    hasListeners: sizeFilter?._events?.length > 0
                },
                clearBtn: {
                    found: !!clearFiltersBtn,
                    id: clearFiltersBtn?.id || "N/A",
                    hasListeners: clearFiltersBtn?._events?.length > 0
                }
            });
            
            // Check if monster data exists
            console.log("Bestiary data:", {
                totalMonsters: this.resources.bestiary.size,
                sampleMonster: this.resources.bestiary.size > 0 ? 
                    Array.from(this.resources.bestiary.values())[0].name : "None"
            });
            
            // Test a filter operation
            if (this.resources.bestiary.size > 0) {
                const testResults = Array.from(this.resources.bestiary.values()).filter(monster => 
                    monster.name.toLowerCase().includes('a'));
                console.log(`Test filter for names with 'a': ${testResults.length} results`);
            }
            
            // Check HTML structure
            console.log("Panel HTML structure:", bestiaryPanel.innerHTML.substring(0, 500) + "...");
        }
        
        console.groupEnd();
    }


    async checkMonsterStorageLocation(monsterId) {
        // Default to "unknown"
        let storageLocation = "unknown";
        
        try {
          // Check IndexedDB first
          let inIndexedDB = false;
          if (this.monsterManager && this.monsterManager.db) {
            const tx = this.monsterManager.db.transaction(['monsters'], 'readonly');
            const store = tx.objectStore('monsters');
            const request = store.get(monsterId);
            
            await new Promise((resolve, reject) => {
              request.onsuccess = (event) => {
                inIndexedDB = !!event.target.result;
                resolve();
              };
              request.onerror = (event) => {
                console.error("Error checking IndexedDB for monster:", event);
                resolve();
              };
            });
          }
          
          // Check localStorage
          let inLocalStorage = false;
          const storageData = localStorage.getItem('monsterDatabase');
          if (storageData) {
            try {
              const data = JSON.parse(storageData);
              inLocalStorage = !!(data?.monsters && data.monsters[monsterId]);
            } catch (e) {
              console.error("Error parsing localStorage monster data:", e);
            }
          }
          
          // Determine storage location
          if (inIndexedDB && inLocalStorage) {
            storageLocation = "both";
          } else if (inIndexedDB) {
            storageLocation = "indexeddb";
          } else if (inLocalStorage) {
            storageLocation = "localstorage";
          }
        } catch (error) {
          console.error("Error checking monster storage location:", error);
        }
        
        return storageLocation;
      }

updateBestiaryGallery(drawer, view = 'grid') {
    const container = drawer.querySelector('#bestiaryGallery');
    if (!container) {
        console.warn('Bestiary gallery container not found');
        return;
    }
    
    // Specifically find the bestiary panel header
    const bestiaryPanel = drawer.querySelector('sl-tab-panel[name="bestiary"]');
    if (!bestiaryPanel) {
        console.warn('Bestiary panel not found');
        return;
    }
    
    const panelHeader = bestiaryPanel.querySelector('.panel-header');
    if (panelHeader) {
        // If we've already added the filter controls, don't add them again
        if (!bestiaryPanel.querySelector('.monster-filter-bar')) {
            // Clear existing controls first
            const addMonsterBtn = panelHeader.querySelector('.add-monster-btn');
            panelHeader.innerHTML = '';
            
            // Get unique CR values and monster types for filters
            const crValues = new Set();
            const typeValues = new Set();
            const sizeValues = new Set(['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan']);
            
            this.resources.bestiary.forEach(monster => {
                if (monster.cr) crValues.add(monster.cr);
                if (monster.type) typeValues.add(monster.type);
            });
            
            // Create compact layout with flex
            panelHeader.style.display = 'flex';
            panelHeader.style.flexWrap = 'wrap';
            panelHeader.style.alignItems = 'flex-end';
            panelHeader.style.gap = '8px';
            
            panelHeader.innerHTML = `
    <!-- Native search input -->
    <div class="search-container" style="flex: 1; min-width: 120px; position: relative;">
        <input type="search" id="monster-search" placeholder="Search monsters..." 
               style="width: 100%; padding: 8px; padding-right: 30px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;">
        <button type="button" id="clear-search" 
                style="position: absolute; right: 4px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer;">
            <span class="material-icons" style="font-size: 18px; color: #666;">close</span>
        </button>
    </div>
    
    <!-- CR filter - temporarily shown but disabled 
    <select id="cr-filter" style="width: 80px; padding: 7px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; background-color: #f0f0f0;" disabled>
        <option value="">CR</option>
        ${Array.from(crValues).sort((a, b) => {
            const numA = a === '0' ? 0 : eval(String(a).replace('/','/')); 
            const numB = b === '0' ? 0 : eval(String(b).replace('/','/')); 
            return numA - numB;
        }).map(cr => `<option value="${cr}">CR ${cr}</option>`).join('')}
    </select>
    -->
    
    <!-- Clear filters button -->
    <button type="button" id="clear-filters" 
            style="background: none; border: none; display: flex; align-items: center; justify-content: center; padding: 8px; cursor: pointer;">
        <span class="material-icons" style="font-size: 18px; color: #666;">filter_alt_off</span>
    </button>
`;
            
            // Add the monster button at the end
            if (addMonsterBtn) {
                panelHeader.appendChild(addMonsterBtn);
            } else {
                const newAddBtn = document.createElement('sl-button');
                newAddBtn.setAttribute('size', 'small');
                newAddBtn.classList.add('add-monster-btn');
                newAddBtn.setAttribute('variant', 'primary'); 
                newAddBtn.setAttribute('circle', '');
                newAddBtn.innerHTML = `
                    <span class="material-icons">add</span>
                `;
                panelHeader.appendChild(newAddBtn);
                
                // Add event listener
                newAddBtn.addEventListener('click', async () => {
                    await this.showMonsterImporter();
                    // Refresh gallery after adding monster
                    this.updateBestiaryGallery(drawer, view);
                });
            }
            
            // Add event listeners for filtering
            this.setupBestiaryFilters(drawer, panelHeader);
        }
    }
    
    // Update container class based on view
    container.className = `gallery-container ${view === 'grid' ? 'gallery-grid' : 'gallery-list'}`;
    container.innerHTML = '';
    
    if (this.resources.bestiary.size === 0) {
        container.innerHTML = `
            <sl-card class="empty-gallery">
                <div style="text-align: center; padding: 2rem;">
                    <span class="material-icons" style="font-size: 3rem; opacity: 0.5;">pets</span>
                    <p>No monsters in bestiary yet</p>
                </div>
            </sl-card>
        `;
        return;
    }
    
    // Apply any active filters
    const filteredMonsters = this.getFilteredBestiary(drawer);
    
    if (filteredMonsters.length === 0) {
        container.innerHTML = `
            <sl-card class="empty-gallery">
                <div style="text-align: center; padding: 2rem;">
                    <span class="material-icons" style="font-size: 3rem; opacity: 0.5;">filter_alt_off</span>
                    <p>No monsters match your filters</p>
                </div>
            </sl-card>
        `;
        return;
    }
    
    // Create cards for each filtered monster
    filteredMonsters.forEach(monster => {
        const card = document.createElement('sl-card');
        card.className = 'resource-item';
        
        const displayCR = monster.cr || '?';
        const displayType = monster.type || 'Unknown';
        const isTokenUrl = monster.data?.token?.url && !monster.data.token.data?.startsWith('data:');
        const hasSource = monster.data?.basic?.source;
        
        card.innerHTML = `
            ${view === 'grid' ? `
                <div style="position: relative;">
                    <img 
                        src="${monster.thumbnail}" 
                        alt="${monster.name}"
                        class="resource-thumbnail"
                    />
                    <div class="monster-badge" style="position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.7); color: white; padding: 2px 5px; border-radius: 10px; font-size: 0.75em;">
                        CR ${displayCR}
                    </div>
                    ${hasSource ? `
                        <a href="https://5e.tools/bestiary.html#${monster.name.toLowerCase().replace(/\s+/g, '%20')}_${monster.data.basic.source.toLowerCase()}" 
                           target="_blank" rel="noopener noreferrer" 
                           class="tools-link" 
                           style="position: absolute; bottom: 5px; right: 5px; background: rgba(0,0,0,0.7); color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center;" 
                           title="View on 5e.tools (${monster.data.basic.source})">
                            <span class="material-icons" style="font-size: 14px;">open_in_new</span>
                        </a>
                    ` : ''}
                    ${isTokenUrl ? `
                        <div class="token-warning" style="position: absolute; top: 5px; left: 5px; background: rgba(244, 67, 54, 0.8); color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center;" title="Token needs update. Delete and re-add this monster.">
                            <span class="material-icons" style="font-size: 14px;">warning</span>
                        </div>
                    ` : ''}
                </div>
                <div class="resource-info">
                    <div class="resource-name" style="color: #666; font-weight: bold; word-wrap: break-word; overflow-wrap: break-word; white-space: normal; max-width: 90%">${monster.name} ${isTokenUrl ? `<span class="material-icons" style="font-size: 14px; color: #f44336; vertical-align: middle;">warning</span>` : ''}</div>
                    <div class="resource-meta">${monster.size} ${displayType}${hasSource ? ` <span style="opacity: 0.7;">(${monster.data.basic.source})</span>` : ''}</div>
                </div>
            ` : `
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="position: relative; flex-shrink: 0;">
                        <img 
                            src="${monster.thumbnail}" 
                            alt="${monster.name}"
                            class="resource-thumbnail"
                            style="width: 50px; height: 50px;"
                        />
                        ${isTokenUrl ? `
                            <div class="token-warning" style="position: absolute; top: -5px; left: -5px; background: rgba(244, 67, 54, 0.8); color: white; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center;" title="Token needs update. Delete and re-add this monster.">
                                <span class="material-icons" style="font-size: 10px;">warning</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="resource-info">
                        <div class="resource-name" style="color: #666; font-weight: bold; word-wrap: break-word; overflow-wrap: break-word; white-space: normal; max-width: 90%">
                            ${monster.name} ${isTokenUrl ? `<span class="material-icons" style="font-size: 14px; color: #f44336; vertical-align: middle;">warning</span>` : ''}
                            ${hasSource ? `
                                <a href="https://5e.tools/bestiary.html#${monster.name.toLowerCase().replace(/\s+/g, '%20')}_${monster.data.basic.source.toLowerCase()}" 
                                   target="_blank" rel="noopener noreferrer" 
                                   style="margin-left: 5px; font-size: 0.9em; color: #673ab7;">
                                    <span class="material-icons" style="font-size: 14px; vertical-align: middle;">open_in_new</span> 
                                    <span style="font-size: 0.8em;">${monster.data.basic.source}</span>
                                </a>
                            ` : ''}
                        </div>
                        <div class="resource-meta">CR ${displayCR} | ${monster.size} ${displayType}</div>
                    </div>
                </div>
            `}
            <div slot="footer" class="resource-actions">
                <sl-button-group>
<sl-button size="small" class="view-btn" data-monster-id="${monster.id}">
    <span class="material-icons">visibility</span>
</sl-button>
                    <sl-button size="small" class="edit-btn">
                        <span class="material-icons">edit</span>
                    </sl-button>
                    <sl-button size="small" class="delete-btn" variant="danger">
                        <span class="material-icons">delete</span>
                    </sl-button>
                </sl-button-group>
            </div>
        `;
        
        // Add hover tooltip for warning
        if (isTokenUrl) {
            const warning = card.querySelector('.token-warning');
            if (warning) {
                warning.addEventListener('mouseenter', () => {
                    const tooltip = document.createElement('div');
                    tooltip.className = 'token-warning-tooltip';
                    tooltip.style.cssText = `
                        position: fixed;
                        background: rgba(0,0,0,0.8);
                        color: white;
                        padding: 8px 12px;
                        border-radius: 4px;
                        z-index: 10000;
                        max-width: 250px;
                        font-size: 0.9em;
                        pointer-events: none;
                    `;
                    tooltip.textContent = 'This monster uses a URL token which may not display correctly in 3D view. Delete and re-add this monster to fix.';
                    document.body.appendChild(tooltip);
                    
                    // Position the tooltip
                    const rect = warning.getBoundingClientRect();
                    tooltip.style.left = `${rect.right + 10}px`;
                    tooltip.style.top = `${rect.top}px`;
                    
                    warning.addEventListener('mouseleave', () => {
                        tooltip.remove();
                    }, { once: true });
                });
            }
        }
        
        // Add event listeners
        card.querySelector('.view-btn').addEventListener('click', () => {
            this.showMonsterDetails(monster.data);
        });
        
        card.querySelector('.edit-btn').addEventListener('click', () => {
            // TODO: Add monster editing capability later
            alert('Monster editing will be implemented in a future update');
        });
        
        card.querySelector('.delete-btn').addEventListener('click', async () => {
            if (confirm(`Remove ${monster.name} from bestiary?`)) {
                // First, remove from the resource manager's bestiary collection
                this.resources.bestiary.delete(monster.id);
                
                // Then ensure it's deleted from persistent storage via MonsterManager
                if (this.monsterManager) {
                    // Use the new deleteMonster method if available
                    if (typeof this.monsterManager.deleteMonster === 'function') {
                        this.monsterManager.deleteMonster(monster.id);
                    } else {
                        // Fallback for older versions
                        const database = this.monsterManager.loadDatabase();
                        if (database && database.monsters) {
                            delete database.monsters[monster.id];
                            localStorage.setItem("monsterDatabase", JSON.stringify(database));
                        }
                    }
                    console.log(`Deleted monster '${monster.name}' (${monster.id}) from persistent storage`);
                }
                
                // Refresh the gallery to show changes
                this.updateBestiaryGallery(drawer, view);
            }
        });

                // Add at the end of updateBestiaryGallery function
        // This will color the eyes based on storage location when the page loads
        container.querySelectorAll('.view-btn').forEach(async btn => {
          const monsterId = btn.getAttribute('data-monster-id');
          if (!monsterId) return;
          
          // Check storage location using simple localStorage check
          const inLocal = localStorage.getItem('monsterDatabase')?.includes(monsterId);
          const inIndexedDB = await this.monsterManager.isMonsterInIndexedDB(monsterId);
          
          // Set eye color
          const eyeIcon = btn.querySelector('.material-icons');
          if (inIndexedDB && inLocal) {
            eyeIcon.style.color = "#FFFFFF"; // White - both storages
          } else if (inIndexedDB) {
            eyeIcon.style.color = "#4CAF50"; // Green - IndexedDB only
          } else if (inLocal) {
            eyeIcon.style.color = "#FFC107"; // Yellow - localStorage only
          }
        });
        
        container.appendChild(card);
    });

    // Debugging
    // this.addDirectSearchToPanel(drawer);
}



setupBestiaryFilters(drawer, panelHeader) {
    // Ensure we're targeting elements within the bestiary panel
    const bestiaryPanel = drawer.querySelector('sl-tab-panel[name="bestiary"]');
    if (!bestiaryPanel) return;
    
    const searchInput = bestiaryPanel.querySelector('#monster-search');
    const clearSearchBtn = bestiaryPanel.querySelector('#clear-search');
    const clearFiltersBtn = bestiaryPanel.querySelector('#clear-filters');
    
    console.log("Setting up native search elements:", {
        searchInput: !!searchInput,
        clearSearchBtn: !!clearSearchBtn,
        clearFiltersBtn: !!clearFiltersBtn
    });
    
    // Direct search function that filters gallery items
    const filterGallery = (searchTerm) => {
        const gallery = bestiaryPanel.querySelector('#bestiaryGallery');
        if (!gallery) return;
        
        console.log(`Filtering monsters by name: "${searchTerm}"`);
        
        // Show or hide monster cards based on name match
        const cards = gallery.querySelectorAll('.resource-item');
        let matchCount = 0;
        
        cards.forEach(card => {
            const nameElement = card.querySelector('.resource-name');
            if (!nameElement) return;
            
            const monsterName = nameElement.textContent.replace(/⚠️|warning/, '').trim();
            const isMatch = !searchTerm || 
                           monsterName.toLowerCase().includes(searchTerm.toLowerCase());
            
            card.style.display = isMatch ? '' : 'none';
            if (isMatch) matchCount++;
        });
        
        // Show "no results" message if needed
        let noResultsMsg = gallery.querySelector('.no-results-message');
        if (matchCount === 0) {
            if (!noResultsMsg) {
                noResultsMsg = document.createElement('div');
                noResultsMsg.className = 'no-results-message';
                noResultsMsg.style.cssText = 'text-align: center; padding: 32px; color: #666;';
                noResultsMsg.innerHTML = `
                    <span class="material-icons" style="font-size: 48px; opacity: 0.5;">search_off</span>
                    <p>No monsters match your search</p>
                `;
                gallery.appendChild(noResultsMsg);
            }
            noResultsMsg.style.display = 'block';
        } else if (noResultsMsg) {
            noResultsMsg.style.display = 'none';
        }
        
        console.log(`Found ${matchCount} matching monsters`);
    };
    
    // Add event listeners
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterGallery(e.target.value);
        });
    }
    
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                filterGallery('');
            }
        });
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                filterGallery('');
            }
        });
    }
}

addDirectSearchToPanel(drawer) {
    const bestiaryPanel = drawer.querySelector('sl-tab-panel[name="bestiary"]');
    if (!bestiaryPanel) return;
    
    // Check if search is already added
    if (bestiaryPanel.querySelector('#direct-search')) return;
    
    // Create a simple native search input
    const searchContainer = document.createElement('div');
    searchContainer.style.cssText = 'margin-bottom: 16px; position: sticky; top: 0; background: white; padding: 8px; z-index: 10;';
    searchContainer.innerHTML = `
        <div style="display: flex; gap: 8px; align-items: center;">
            <input type="search" id="direct-search" placeholder="Search monsters..." 
                   style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
            <button id="clear-direct-search" style="background: #f44336; color: white; border: none; border-radius: 4px; padding: 8px;">
                Clear
            </button>
        </div>
    `;
    
    // Insert at the top of the panel
    bestiaryPanel.insertBefore(searchContainer, bestiaryPanel.firstChild);
    
    // Add event handlers
    const searchInput = bestiaryPanel.querySelector('#direct-search');
    const clearBtn = bestiaryPanel.querySelector('#clear-direct-search');
    
    // Simple search functionality
    searchInput.addEventListener('input', () => {
        this.filterBestiaryByName(drawer, searchInput.value);
    });
    
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        this.filterBestiaryByName(drawer, '');
    });
}

// Add this method to ResourceManager class
filterBestiaryByName(drawer, searchTerm) {
    const bestiaryPanel = drawer.querySelector('sl-tab-panel[name="bestiary"]');
    const gallery = bestiaryPanel?.querySelector('#bestiaryGallery');
    if (!gallery) return;
    
    console.log(`Filtering ${this.resources.bestiary.size} monsters by name: "${searchTerm}"`);
    
    // Show or hide monster cards based on name match
    const cards = gallery.querySelectorAll('.resource-item');
    let matchCount = 0;
    
    cards.forEach(card => {
        const nameElement = card.querySelector('.resource-name');
        if (!nameElement) return;
        
        const monsterName = nameElement.textContent.replace(/⚠️|warning/, '').trim();
        const isMatch = !searchTerm || 
                       monsterName.toLowerCase().includes(searchTerm.toLowerCase());
        
        card.style.display = isMatch ? '' : 'none';
        if (isMatch) matchCount++;
    });
    
    // Show "no results" message if needed
    let noResultsMsg = gallery.querySelector('.no-results-message');
    if (matchCount === 0) {
        if (!noResultsMsg) {
            noResultsMsg = document.createElement('div');
            noResultsMsg.className = 'no-results-message';
            noResultsMsg.style.cssText = 'text-align: center; padding: 32px; color: #666;';
            noResultsMsg.innerHTML = `
                <span class="material-icons" style="font-size: 48px; opacity: 0.5;">search_off</span>
                <p>No monsters match your search</p>
            `;
            gallery.appendChild(noResultsMsg);
        }
        noResultsMsg.style.display = 'block';
    } else if (noResultsMsg) {
        noResultsMsg.style.display = 'none';
    }
    
    console.log(`Found ${matchCount} matching monsters`);
}

// Super simple getFilteredBestiary that uses stored filters
getFilteredBestiary(drawer) {
    // Fallback if filters aren't initialized
    if (!this.bestiaryFilters) {
        return Array.from(this.resources.bestiary.values());
    }
    
    const { searchTerm, crFilter, typeFilter, sizeFilter } = this.bestiaryFilters;
    
    console.log("Filtering with stored values:", {
        searchTerm,
        crFilter,
        typeFilter,
        sizeFilter,
        monsterCount: this.resources.bestiary.size
    });
    
    return Array.from(this.resources.bestiary.values()).filter(monster => {
        // Name search - case insensitive
        const nameMatch = !searchTerm || 
            monster.name.toLowerCase().includes(searchTerm.toLowerCase());
        
        // CR filter - exact match
        const crMatch = !crFilter || monster.cr === crFilter;
        
        // Type filter - exact match
        const typeMatch = !typeFilter || monster.type === typeFilter;
        
        // Size filter - exact match
        const sizeMatch = !sizeFilter || monster.size === sizeFilter;
        
        return nameMatch && crMatch && typeMatch && sizeMatch;
    });
}



showMonsterDetails(monsterData) {
    const dialog = document.createElement('sl-dialog');
    dialog.label = monsterData.basic.name;
    dialog.style.cssText = "--width: 700px; --min-height: auto;";
    
    // Generate full stat block HTML
    dialog.innerHTML = `
        <div style="max-height: 70vh; overflow-y: auto;">
            <div style="display: flex; align-items: flex-start; gap: 16px; margin-bottom: 16px;">
                ${monsterData.token?.data ? `
                    <div style="flex: 0 0 150px; text-align: center;">
                        <img src="${monsterData.token.data}" style="width: 150px; height: 150px; object-fit: contain; border-radius: 5px;">
                    </div>
                ` : ''}
                
                <div style="flex: 1;">
                    <div style="font-style: italic; color: #666; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            ${monsterData.basic.size} ${monsterData.basic.type}, ${monsterData.basic.alignment}
                        </div>
                        ${monsterData.basic?.source ? `
                            <a href="https://5e.tools/bestiary.html#${monsterData.basic.name.toLowerCase().replace(/\s+/g, '%20')}_${monsterData.basic.source.toLowerCase()}" 
                               target="_blank" rel="noopener noreferrer" 
                               style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; text-decoration: none; display: flex; align-items: center; gap: 4px;">
                                <span class="material-icons" style="font-size: 14px;">open_in_new</span>
                                <span style="font-weight: bold; color: #444;">5e.tools</span>
                                <span style="color: #666;">(${monsterData.basic.source})</span>
                            </a>
                        ` : ''}
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; text-align: center; background: #f5f5f5; color: #000; padding: 8px; border-radius: 4px; margin-bottom: 12px;">
                        <div>
                            <div style="font-weight: bold;">Armor Class</div>
                            <div>${monsterData.stats.ac}</div>
                        </div>
                        <div>
                            <div style="font-weight: bold;">Hit Points</div>
                            <div>${monsterData.stats.hp.average} (${monsterData.stats.hp.roll})</div>
                        </div>
                        <div>
                            <div style="font-weight: bold;">Speed</div>
                            <div>${monsterData.stats.speed}</div>
                        </div>
                    </div>
                    
                    <div>
                        <div style="font-weight: bold;">Challenge Rating:</div>
                        <div>${monsterData.basic.cr} (${monsterData.basic.xp} XP)</div>
                    </div>
                </div>
            </div>
            
            <!-- Ability Scores -->
            <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; text-align: center; background: #f5f5f5; color: #000; padding: 8px; border-radius: 4px; margin-bottom: 16px;">
                <div>
                    <div style="font-weight: bold;">STR</div>
                    <div>${monsterData.abilities.str.score} (${monsterData.abilities.str.modifier >= 0 ? "+" : ""}${monsterData.abilities.str.modifier})</div>
                </div>
                <div>
                    <div style="font-weight: bold;">DEX</div>
                    <div>${monsterData.abilities.dex.score} (${monsterData.abilities.dex.modifier >= 0 ? "+" : ""}${monsterData.abilities.dex.modifier})</div>
                </div>
                <div>
                    <div style="font-weight: bold;">CON</div>
                    <div>${monsterData.abilities.con.score} (${monsterData.abilities.con.modifier >= 0 ? "+" : ""}${monsterData.abilities.con.modifier})</div>
                </div>
                <div>
                    <div style="font-weight: bold;">INT</div>
                    <div>${monsterData.abilities.int.score} (${monsterData.abilities.int.modifier >= 0 ? "+" : ""}${monsterData.abilities.int.modifier})</div>
                </div>
                <div>
                    <div style="font-weight: bold;">WIS</div>
                    <div>${monsterData.abilities.wis.score} (${monsterData.abilities.wis.modifier >= 0 ? "+" : ""}${monsterData.abilities.wis.modifier})</div>
                </div>
                <div>
                    <div style="font-weight: bold;">CHA</div>
                    <div>${monsterData.abilities.cha.score} (${monsterData.abilities.cha.modifier >= 0 ? "+" : ""}${monsterData.abilities.cha.modifier})</div>
                </div>
            </div>
            
            <!-- Additional Traits -->
            <div style="margin-bottom: 16px;">
                ${monsterData.traits.senses?.length > 0 ? `
                    <div style="margin-bottom: 8px;">
                        <strong>Senses:</strong> ${monsterData.traits.senses.join(', ')}
                    </div>
                ` : ''}
                
                <div style="margin-bottom: 8px;">
                    <strong>Languages:</strong> ${monsterData.traits?.languages || 'None'}
                </div>
                
                ${monsterData.traits?.immunities?.length > 0 ? `
                    <div style="margin-bottom: 8px;">
                        <strong>Immunities:</strong> ${monsterData.traits.immunities.join(', ')}
                    </div>
                ` : ''}
            </div>
            
            <!-- Actions Section - ONLY RENDERED IF ACTIONS EXIST -->
            ${monsterData.actions && Array.isArray(monsterData.actions) && monsterData.actions.length > 0 ? `
                <div style="margin-bottom: 16px;">
                    <h3 style="margin-top: 0; border-bottom: 1px solid #ccc; padding-bottom: 6px;">Actions</h3>
                    
                    ${monsterData.actions.map(action => `
                        <div style="margin-bottom: 12px;">
                            <div style="font-weight: bold; margin-bottom: 4px;">${action.name || 'Unnamed Action'}</div>
                            <div style="display: flex; gap: 12px; margin-bottom: 4px;">
                                ${action.attackBonus !== undefined ? `
                                    <div style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px;">
                                        <strong>Attack:</strong> ${action.attackBonus >= 0 ? '+' : ''}${action.attackBonus}
                                    </div>
                                ` : ''}
                                ${action.damageDice ? `
                                    <div style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px;">
                                        <strong>Damage:</strong> ${action.damageDice} ${action.damageType || ''}
                                    </div>
                                ` : ''}
                            </div>
                            ${action.description ? `<div style="color: #444; font-size: 0.9em;">${action.description}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
        
        <div slot="footer">
            <sl-button class="close-btn" variant="neutral">Close</sl-button>
            <sl-button class="add-encounter-btn" variant="primary">
                <span class="material-icons">add_location</span>
                Add to Map
            </sl-button>
        </div>
    `;
    
    // Add event listeners
    dialog.querySelector('.close-btn').addEventListener('click', () => {
        dialog.hide();
    });
    
    dialog.querySelector('.add-encounter-btn').addEventListener('click', () => {
        if (this.mapEditor) {
            this.addMonsterToMap(monsterData, this.mapEditor);
            dialog.hide();
        } else {
            alert('Map editor not available');
        }
    });
    
    // Show the dialog
    document.body.appendChild(dialog);
    dialog.show();
    
    // Remove from DOM after hiding
    dialog.addEventListener('sl-after-hide', () => {
        dialog.remove();
    });
}

    addMonsterToMap(monster, mapEditor) {
        if (!mapEditor) {
            console.error('Map editor not available');
            return false;
        }
        
        try {
            const monsterData = monster.data || monster;
            
            // Open a dialog to confirm placement
            const dialog = document.createElement('sl-dialog');
            dialog.label = `Add ${monsterData.basic.name} to Map`;
            
            dialog.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        ${monsterData.token?.data ? `
                            <img src="${monsterData.token.data}" 
                                 style="width: 80px; height: 80px; object-fit: contain; border-radius: 5px;">
                        ` : ''}
                        
                        <div>
                            <h3 style="margin: 0 0 8px 0;">${monsterData.basic.name}</h3>
                            <div style="color: #666;">
                                ${monsterData.basic.size} ${monsterData.basic.type}, CR ${monsterData.basic.cr}
                            </div>
                        </div>
                    </div>
                    
                    <div class="placement-option">
                        <sl-radio-group label="Placement Option" name="placement">
                            <sl-radio value="click" checked>Click on map to place</sl-radio>
                            <sl-radio value="random">Place randomly in selected area</sl-radio>
                        </sl-radio-group>
                    </div>
                    
                    <div class="quantity-control">
                        <sl-input type="number" label="Quantity" min="1" max="20" value="1" id="monsterQuantity"></sl-input>
                    </div>
                </div>
                
                <div slot="footer">
                    <sl-button variant="neutral" class="cancel-btn">Cancel</sl-button>
                    <sl-button variant="primary" class="add-btn">Add to Map</sl-button>
                </div>
            `;
            
            document.body.appendChild(dialog);
            
            return new Promise((resolve) => {
                dialog.querySelector('.cancel-btn').addEventListener('click', () => {
                    dialog.hide();
                    resolve(false);
                });
                
                dialog.querySelector('.add-btn').addEventListener('click', () => {
                    const placementOption = dialog.querySelector('sl-radio-group').value;
                    const quantity = parseInt(dialog.querySelector('#monsterQuantity').value) || 1;
                    
                    const result = {
                        monster: monsterData,
                        placement: placementOption,
                        quantity: quantity
                    };
                    
                    dialog.hide();
                    
                    if (placementOption === 'click') {
                        // Find and close the resource manager drawer
                        const resourceDrawer = document.querySelector('.resource-manager-drawer');
                        if (resourceDrawer && resourceDrawer.open) {
                            resourceDrawer.hide();
                        }
                        
                        // Set map editor to encounter placement mode with this monster
                        this.setMapEditorToPlacementMode(mapEditor, result);
                    } else {
                        // Random placement - would need coordinates of a selected area
                        alert('Random placement coming in future update');
                    }
                    
                    resolve(true);
                });
                
                dialog.addEventListener('sl-after-hide', () => {
                    dialog.remove();
                });
                
                dialog.show();
            });
        } catch (error) {
            console.error('Error adding monster to map:', error);
            return false;
        }
    }


    setMapEditorToPlacementMode(mapEditor, placementData) {
        const { monster, quantity } = placementData;
        
        // Store the monster data temporarily
        mapEditor.pendingEncounterMonster = monster;
        mapEditor.pendingEncounterQuantity = quantity;
        
        // Switch to encounter marker placement mode
        mapEditor.setTool("marker-encounter");
        
        // Show instruction toast
        const toast = document.createElement('div');
        toast.className = 'placement-toast';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        toast.innerHTML = `
            <span class="material-icons">touch_app</span>
            <span>Click on the map to place ${monster.basic.name}</span>
        `;
        
        document.body.appendChild(toast);
        
        // Remove toast after 5 seconds
        setTimeout(() => {
            toast.remove();
        }, 5000);
        
        // Modify the MapEditor's addMarker method temporarily to use our monster data
        const originalAddMarker = mapEditor.addMarker;
        mapEditor.addMarker = function(type, x, y, data = {}) {
            if (type === "encounter" && this.pendingEncounterMonster) {
                // Setup the data with our monster
                data.monster = this.pendingEncounterMonster;
                
                // Create the marker with our monster data
                const marker = originalAddMarker.call(this, type, x, y, data);
                
                // Apply proper sizing based on monster size
                this.updateMarkerAppearance(marker);
                
                // Reset after placement
                this.pendingEncounterMonster = null;
                this.pendingEncounterQuantity = null;
                
                // Restore the original method
                this.addMarker = originalAddMarker;
                
                // Remove toast if it's still there
                document.querySelector('.placement-toast')?.remove();
                
                return marker;
            }
            
            return originalAddMarker.call(this, type, x, y, data);
        };
    }


    async addSound(file, category = 'ambient') {
        if (!file) {
            console.warn('No file provided for sound');
            return null;
        }
    
        try {
            console.log('Processing sound file:', file.name);
            
            // Create unique ID for the sound
            const soundId = `${category}_${Date.now()}`;
            
            // Convert file to base64
            const soundData = await this.createSoundData(file);
            
            // Get duration if possible
            let duration = await this.getSoundDuration(file);
            
            const soundInfo = {
                id: soundId,
                name: file.name,
                category,
                data: soundData,
                duration: duration || 0,
                dateAdded: new Date().toISOString()
            };
    
            // Store in appropriate category
            if (!this.resources.sounds[category]) {
                this.resources.sounds[category] = new Map();
            }
            this.resources.sounds[category].set(soundId, soundInfo);
            
            console.log('Added sound:', {
                id: soundId,
                name: file.name,
                category,
                duration
            });
    
            return soundId;
        } catch (error) {
            console.error('Error processing sound file:', error);
            return null;
        }
    }
    
    async createSoundData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    async getSoundDuration(file) {
        return new Promise((resolve) => {
            const audio = new Audio();
      let createdUrl = null;
      const cleanup = () => {
        try { if (createdUrl) { URL.revokeObjectURL(createdUrl); createdUrl = null; } } catch(e) {}
        try { audio.src = ''; } catch(e) {}
      };

      audio.addEventListener('loadedmetadata', () => {
        const dur = audio.duration || 0;
        cleanup();
        resolve(dur);
      }, { once: true });

      audio.addEventListener('error', () => {
        console.warn('Could not get audio duration');
        cleanup();
        resolve(0);
      }, { once: true });

      createdUrl = URL.createObjectURL(file);
      audio.src = createdUrl;
        });
    }

     formatDuration(seconds) {
        if (!seconds || isNaN(seconds)) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
    
    playSound(soundId, category) {
        const sound = this.resources.sounds[category]?.get(soundId);
        if (!sound?.data) {
            console.warn('Sound not found:', soundId);
            return;
        }
    
        // Create and configure audio element
        const audio = new Audio(sound.data);
        audio.volume = 1.0;
    
        // Store reference to stop playback if needed
        if (!this.activeAudio) {
            this.activeAudio = new Map();
        }
        
        // Stop any previous playback of this sound
        if (this.activeAudio.has(soundId)) {
            this.activeAudio.get(soundId).pause();
        }
        
        this.activeAudio.set(soundId, audio);
    
        // Play the sound
        audio.play().catch(error => {
            console.error('Error playing sound:', error);
        });
    
        // Remove reference when done
        audio.addEventListener('ended', () => {
            this.activeAudio.delete(soundId);
        });
    
        return audio;
    }
    
    stopSound(soundId) {
        if (this.activeAudio?.has(soundId)) {
            this.activeAudio.get(soundId).pause();
            this.activeAudio.delete(soundId);
        }
    }
    
    deleteSound(soundId, category) {
        // Stop playback if active
        this.stopSound(soundId);
        
        // Remove from storage
        const categoryMap = this.resources.sounds[category];
        if (categoryMap) {
            categoryMap.delete(soundId);
            return true;
        }
        return false;
    }
    
    async convertBase64ToAudioBuffer(base64Data, audioContext) {
        // Remove data URL prefix if present
        const base64String = base64Data.replace(/^data:audio\/[^;]+;base64,/, '');
        
        // Decode base64
        const binaryString = window.atob(base64String);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
    
        // Create audio buffer
        return new Promise((resolve, reject) => {
            audioContext.decodeAudioData(
                bytes.buffer,
                buffer => resolve(buffer),
                error => reject(error)
            );
        });
    }
    
    // Get sound for Three.js
    async getThreeJSSound(soundName, category = 'effects') {
        // Search through the category for a matching sound name
        const soundEntry = Array.from(this.resources.sounds[category].values())
            .find(sound => sound.name.toLowerCase() === soundName.toLowerCase());
        
        if (!soundEntry) {
            console.warn(`Sound "${soundName}" not found in category "${category}"`);
            return null;
        }
    
        return {
            data: soundEntry.data,
            volume: 0.5 // Default volume, could be made configurable
        };
    }
    
    // Load sound for Three.js
    async loadThreeJSSound(sound, listener) {
        if (!sound || !sound.data) {
            console.warn('Invalid sound data provided');
            return null;
        }
    
        const audioContext = listener.context;
        const threeSound = new THREE.Audio(listener);
    
        try {
            const buffer = await this.convertBase64ToAudioBuffer(sound.data, audioContext);
            threeSound.setBuffer(buffer);
            threeSound.setVolume(sound.volume);
            return threeSound;
        } catch (error) {
            console.error('Error loading sound:', error);
            return null;
        }
    }

// New method to process folder imports
async processFolderImport(files) {
    console.log(`Processing ${files.length} files from folder import`);
    
    // Create a new map for this import, or use existing one if it exists
    const folderMap = this.propFolderMap || new Map();
    
    // Process each file and extract its folder path
    for (const file of files) {
        // Get the file's folder path
        const path = file.webkitRelativePath || '';
        const pathParts = path.split('/');
        
        // Skip files that aren't in folders
        if (pathParts.length < 2) continue;
        
        // Skip non-image files
        if (!file.type.startsWith('image/')) {
            console.log(`Skipping non-image file: ${file.name}`);
            continue;
        }
        
        // Remove filename from path
        pathParts.pop();
        
        // Create tags from folder structure
        const tags = [];
        let currentPath = '';
        for (const part of pathParts) {
            if (currentPath) currentPath += '-';
            currentPath += part.toLowerCase().replace(/\s+/g, '-');
            tags.push(currentPath);
        }
        
        // Add file to the resource
        const textureId = await this.addTexture(file, 'props', {
            tags: tags,
            sourcePath: pathParts.join('/')
        });
        
        // Add folder information to the map
        if (textureId) {
            tags.forEach(tag => {
                // Create entry if it doesn't exist
                if (!folderMap.has(tag)) {
                    folderMap.set(tag, {
                        label: this.formatTagDisplay(tag),
                        files: []
                    });
                }
                
                // Add this file to the tag's files list
                folderMap.get(tag).files.push(textureId);
            });
        }
    }
    
    // Store folder mapping
    this.propFolderMap = folderMap;
    
    // Save folder mapping to resources
    if (!this.resources.metadata) {
        this.resources.metadata = {};
    }
    
    this.resources.metadata.propFolders = Array.from(folderMap.entries()).map(([tag, data]) => ({
        tag,
        label: data.label,
        files: data.files
    }));
    
    console.log(`Processed ${folderMap.size} total folders with tags:`, this.propFolderMap);
}

// Helper to format tag display from tag ID
formatTagDisplay(tag) {
    return tag.split('-').map(part => 
        part.charAt(0).toUpperCase() + part.slice(1)
    ).join(' › ');
}



}

