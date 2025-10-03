class ShapeForgeBrowser {
    constructor(options = {}) {
        this.basePath = options.basePath || 'assets/sampleObjects/ShapeForge/';
        this.onSelect = options.onSelect || (() => {});
        this.onLoad = options.onLoad || (() => {});
        this.containerElement = options.container || null;
        this.modal = options.modal !== false; // default to modal
        this.title = options.title || 'Browse ShapeForge Objects';
        this.allowMultiple = options.allowMultiple || false;
        
        // Cache for discovered files
        this.cachedFiles = null;
        this.cacheTimestamp = 0;
        this.cacheExpiry = 30000; // 30 seconds
        
        console.log('🎯 ShapeForgeBrowser (MapGate) initialized:', {
            basePath: this.basePath,
            modal: this.modal,
            title: this.title
        });
    }
    
    /**
     * Dynamically discover ShapeForge files
     */
    async discoverFiles() {
        const now = Date.now();
        if (this.cachedFiles && (now - this.cacheTimestamp) < this.cacheExpiry) {
            console.log(`📂 Using cached ShapeForge files (${this.cachedFiles.length} files)`);
            return this.cachedFiles;
        }
        
        console.log(`📂 Dynamically discovering ShapeForge files...`);
        let sampleFiles = [];
        
        try {
            // Method 1: Try directory listing (works on dev servers)
            const dirResponse = await fetch(this.basePath);
            if (dirResponse.ok) {
                const dirText = await dirResponse.text();
                const fileMatches = dirText.match(/href="([^"]*\.shapeforge\.json)"/g);
                if (fileMatches) {
                    sampleFiles = fileMatches.map(match => {
                        const fullPath = match.match(/href="([^"]*)"/)[1];
                        // Extract just the filename from absolute paths
                        return fullPath.split('/').pop();
                    });
                    console.log(`📂 Found ${sampleFiles.length} files via directory listing`);
                }
            }
        } catch (error) {
            console.log(`📂 Directory listing not available, using fallback method`);
        }
        
        // Method 2: Fallback - test common/likely filenames
        if (sampleFiles.length === 0) {
            // First get the actual files from the directory listing we observed
            const knownFiles = [
                'Chest.shapeforge.json',
                'Dungeon Entrance.shapeforge.json',
                'Exit.shapeforge.json',
                'FireMarker.shapeforge.json',
                'Fireball_d20.shapeforge.json',
                'Grass Patch.shapeforge.json',
                'Not-Statue.shapeforge.json',
                'Pillar.shapeforge.json',
                'Statue.shapeforge.json',
                'TexturedPillar2.shapeforge.json',
                'TexturedStatue.shapeforge.json',
                'TexturedStatue2.shapeforge.json',
                'grass.shapeforge.json',
                'magic_d20.shapeforge.json',
                'mountain.shapeforge.json',
                'woodBlock.shapeforge.json'
            ];
            
            // Add additional common files that might exist
            const additionalCommonNames = [
                'castle.shapeforge.json',
                'house.shapeforge.json',
                'town.shapeforge.json',
                'tower.shapeforge.json',
                'tree.shapeforge.json',
                'rock.shapeforge.json',
                'bridge.shapeforge.json',
                'well.shapeforge.json',
                'fountain.shapeforge.json'
            ];
            
            const allPossibleFiles = [...knownFiles, ...additionalCommonNames];
            
            const existenceTests = allPossibleFiles.map(async filename => {
                try {
                    const testResponse = await fetch(`${this.basePath}${filename}`, { method: 'HEAD' });
                    return testResponse.ok ? filename : null;
                } catch (error) {
                    return null;
                }
            });
            
            const results = await Promise.all(existenceTests);
            sampleFiles = results.filter(filename => filename !== null);
            console.log(`📂 Discovered ${sampleFiles.length} files via existence testing`);
        }
        
        // Cache the results
        this.cachedFiles = sampleFiles;
        this.cacheTimestamp = now;
        
        return sampleFiles;
    }
    
    /**
     * Load ShapeForge file data
     */
    async loadFile(filename) {
        try {
            console.log(`📄 Loading ShapeForge file: ${filename}`);
            const response = await fetch(`${this.basePath}${filename}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log(`✅ Loaded ${filename}:`, data.name || 'Untitled');
            
            if (this.onLoad) {
                this.onLoad(data, filename);
            }
            
            return data;
        } catch (error) {
            console.error(`❌ Failed to load ${filename}:`, error);
            throw error;
        }
    }
    
    /**
     * Create file card element
     */
    createFileCard(filename, data) {
        const displayName = (data.name && data.name !== 'Untitled Project') ? data.name : filename.replace('.shapeforge.json', '');
        
        const card = document.createElement('div');
        card.className = 'shapeforge-file-card';
        card.style.cssText = `
            border: 1px solid #e1e5e9;
            border-radius: 12px;
            padding: 12px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            min-height: 160px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
            overflow: hidden;
        `;
        
        // Check if object has effects for badge
        const hasEffects = data.objects && data.objects.some(obj => obj.effect);
        const effectsBadge = hasEffects ? 
            `<div style="position: absolute; top: 8px; right: 8px; background: linear-gradient(135deg, #ff6b35, #ff8c42); color: white; font-size: 10px; padding: 3px 8px; border-radius: 12px; font-weight: bold; box-shadow: 0 2px 4px rgba(255,107,53,0.3);">FX</div>` : '';
        
        // Default thumbnail if none provided
        const defaultThumbnail = `data:image/svg+xml;base64,${btoa(`
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="80" height="80" fill="url(#grad)"/>
                <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <g transform="translate(20, 20)">
                    <path d="M10 10h20v20h-20z" stroke="white" stroke-width="2" fill="none" opacity="0.7"/>
                    <path d="M15 15h15v15h-15z" stroke="white" stroke-width="2" fill="none" opacity="0.5"/>
                    <path d="M20 20h10v10h-10z" stroke="white" stroke-width="2" fill="none" opacity="0.3"/>
                </g>
            </svg>
        `)}`;

        card.innerHTML = `
            ${effectsBadge}
            <div>
                <img src="${data.thumbnail || defaultThumbnail}" 
                     style="width: 80px; height: 80px; margin: 0 auto 12px auto; object-fit: cover; border-radius: 8px; display: block;" 
                     alt="${displayName}">
            </div>
            <div>
                <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px; color: #2c3e50; line-height: 1.3; min-height: 32px; display: flex; align-items: center; justify-content: center;">${displayName}</div>
                <div style="font-size: 11px; color: #7f8c8d; opacity: 0.8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${filename}</div>
            </div>
        `;
        
        // Hover effects
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-4px) scale(1.02)';
            card.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.15)';
            card.style.borderColor = '#667eea';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1)';
            card.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            card.style.borderColor = '#e1e5e9';
        });
        
        // Click handler
        card.addEventListener('click', () => {
            this.selectFile(data, filename);
        });
        
        return card;
    }
    
    /**
     * Handle file selection
     */
    selectFile(data, filename) {
        console.log(`🎯 Selected ShapeForge file: ${filename}`);
        
        if (this.onSelect) {
            this.onSelect(data, filename);
        }
        
        // Close modal if it exists
        if (this.modal && this.currentDialog) {
            this.currentDialog.hide();
        }
    }
    
    /**
     * Render file grid
     */
    async renderGrid(container) {
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">Discovering ShapeForge files...</div>';
        
        try {
            const files = await this.discoverFiles();
            
            if (files.length === 0) {
                container.innerHTML = `<div style="text-align: center; padding: 20px; color: #666;">No ShapeForge files found in ${this.basePath}</div>`;
                return;
            }
            
            // Create grid
            const grid = document.createElement('div');
            grid.style.cssText = `
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                gap: 16px;
                padding: 16px;
                max-height: 60vh;
                overflow-y: auto;
            `;
            
            container.innerHTML = '';
            container.appendChild(grid);
            
            // Load and display files
            let loadedCount = 0;
            
            for (const filename of files) {
                try {
                    const data = await this.loadFile(filename);
                    const card = this.createFileCard(filename, data);
                    grid.appendChild(card);
                    loadedCount++;
                } catch (error) {
                    console.warn(`⚠️ Skipping ${filename} due to error:`, error);
                }
            }
            
            console.log(`✅ Rendered ${loadedCount}/${files.length} ShapeForge files`);
            
        } catch (error) {
            console.error('❌ Failed to render grid:', error);
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">Error loading ShapeForge files</div>';
        }
    }
    
    /**
     * Show as modal dialog (requires Shoelace)
     */
    showModal() {
        if (typeof document === 'undefined') {
            console.error('❌ ShapeForgeBrowser.showModal() requires DOM environment');
            return;
        }
        
        // Create modal dialog
        const dialog = document.createElement('sl-dialog');
        dialog.label = this.title;
        dialog.style.cssText = '--width: 85vw; --height: 75vh;';
        
        dialog.innerHTML = `
            <div style="height: 65vh; overflow: hidden;">
                <div id="shapeforge-grid" style="height: 100%;"></div>
            </div>
            <sl-button slot="footer" variant="neutral" onclick="this.closest('sl-dialog').hide()">
                <span slot="prefix" class="material-icons">close</span>
                Close
            </sl-button>
        `;
        
        document.body.appendChild(dialog);
        this.currentDialog = dialog;
        
        dialog.show();
        
        // Render grid
        const gridContainer = dialog.querySelector('#shapeforge-grid');
        this.renderGrid(gridContainer);
        
        // Cleanup on close
        dialog.addEventListener('sl-hide', () => {
            setTimeout(() => {
                if (dialog.parentNode) {
                    dialog.parentNode.removeChild(dialog);
                }
            }, 100);
        });
    }
    
    /**
     * Show inline in container
     */
    showInline(container) {
        if (!container) {
            console.error('❌ ShapeForgeBrowser.showInline() requires container element');
            return;
        }
        
        this.renderGrid(container);
    }
    
    /**
     * Main show method - chooses modal or inline based on options
     */
    show(container = null) {
        if (container) {
            this.showInline(container);
        } else if (this.modal) {
            this.showModal();
        } else {
            console.error('❌ ShapeForgeBrowser.show() requires container when modal=false');
        }
    }
    
    /**
     * Clear cache (force refresh)
     */
    clearCache() {
        this.cachedFiles = null;
        this.cacheTimestamp = 0;
        console.log('🗑️ ShapeForgeBrowser cache cleared');
    }
}

// Export for both module and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShapeForgeBrowser;
} else if (typeof window !== 'undefined') {
    window.ShapeForgeBrowser = ShapeForgeBrowser;
}

console.log('📦 ShapeForgeBrowser (MapGate local copy) loaded');