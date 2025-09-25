// Nebula Voxel World - First NebulaApp Game
// Created by GitHub Copilot with human feedback and guidance
// Based on NebulaApp-Single template
// 
// A Minecraft-like 3D voxel world built with Three.js featuring:
// - Chunk-based world generation with procedural textures
// - Full 6DOF movement with physics and collision detection
// - Block placement/removal with visual feedback
// - Save/load system optimized for performance
// - Real-time 3D graphics at 60fps
//
// This represents the first fully functional game created for the NebulaDesktop platform!

class NebulaVoxelApp {
    constructor() {
        this.windowId = null;
        this.world = {};
        this.loadedChunks = new Set(); // Track which chunks are loaded
        this.chunkSize = 12; // Smaller chunks for better performance
        this.renderDistance = 2; // Reduced render distance (5x5 chunks)
        this.player = {
            position: { x: 0, y: 10, z: 0 }, // Start higher up and centered
            rotation: { x: 0, y: 0 }
        };
        this.keys = {};
        this.selectedSlot = 0; // Currently selected hotbar slot
        
        // Expanded inventory system
        this.inventory = {
            grass: 50,
            stone: 30,
            wood: 25,
            sand: 20,
            glass: 15,
            brick: 10,
            glowstone: 8,
            iron: 5,
            flowers: 0 // Collectible
        };
        
        // Hotbar slots (what shows in the vertical bar)
        this.hotbarSlots = ['grass', 'stone', 'wood', 'sand', 'glass', 'brick', 'glowstone', 'iron'];
        
        // Three.js objects for cleanup
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.animationId = null;
        this.eventListeners = [];
        
        this.init();
    }

    async init() {
        if (!window.windowManager) {
            console.error('WindowManager not available');
            return;
        }

        this.windowId = window.windowManager.createWindow({
            title: 'Voxel World',
            width: 1000,
            height: 720,
            resizable: true,
            maximizable: true,
            minimizable: true
        });

        window.windowManager.loadApp(this.windowId, this);
        console.log(`VoxelApp initialized with window ${this.windowId}`);
    }

    render() {
        const container = document.createElement('div');
        container.className = 'voxelapp-container';
        container.style.cssText = `
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            background: black;
        `;

        const contentArea = this.createContentArea();
        const statusBar = this.createStatusBar();

        // Modal menu button
        const menuBtn = document.createElement('button');
        menuBtn.textContent = '☰ Menu';
        menuBtn.style.cssText = `
            position: absolute;
            top: 16px;
            left: 16px;
            z-index: 2000;
            background: rgba(0,0,0,0.7);
            color: white;
            border: none;
            border-radius: 6px;
            padding: 8px 16px;
            font-size: 18px;
            cursor: pointer;
        `;
        contentArea.appendChild(menuBtn);

        // Modal menu overlay (near button)
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: absolute;
            top: 56px;
            left: 16px;
            background: rgba(0,0,0,0.6);
            display: none;
            z-index: 3000;
        `;
        modal.innerHTML = `
            <div style="background: var(--nebula-surface); border-radius: 12px; padding: 24px 32px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); display: flex; flex-direction: column; gap: 18px; align-items: center; min-width: 220px;">
                <h2 style="margin:0 0 12px 0; color: var(--nebula-text-primary); font-size: 20px;">Voxel World Menu</h2>
                <button id="modal-save-btn" style="font-size: 16px; padding: 8px 24px;">💾 Save Game</button>
                <button id="modal-load-btn" style="font-size: 16px; padding: 8px 24px;">📂 Load Game</button>
                <button id="modal-delete-btn" style="font-size: 16px; padding: 8px 24px;">🗑 Delete Save</button>
                <button id="modal-close-btn" style="margin-top: 12px; font-size: 14px; padding: 6px 18px; background: var(--nebula-danger); color: white; border-radius: 6px;">Close Menu</button>
            </div>
        `;
        contentArea.appendChild(modal);

        // Initialize pointer lock ready flag
        this.pointerLockReady = true;
        
        // Pause/resume logic
        menuBtn.onclick = () => {
            modal.style.display = 'block';
            if (typeof this.pauseGame === 'function') this.pauseGame();
            // Exit pointer lock if active
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
        };
        
        modal.querySelector('#modal-close-btn').onclick = () => {
            modal.style.display = 'none';
            if (typeof this.resumeGame === 'function') this.resumeGame();
            // Debounce pointer lock: allow after short delay
            this.pointerLockReady = false;
            setTimeout(() => { this.pointerLockReady = true; }, 300);
        };

        container.appendChild(contentArea);
        container.appendChild(statusBar);

        setTimeout(() => {
            this.loadThree(contentArea);
        }, 0);

        return container;
    }

    createToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'voxelapp-toolbar';
        toolbar.style.cssText = `
            height: 48px;
            background: var(--nebula-surface);
            border-bottom: 1px solid var(--nebula-border);
            display: flex;
            align-items: center;
            padding: 0 16px;
            gap: 8px;
            flex-shrink: 0;
        `;

        toolbar.innerHTML = `
            <button id="save-btn">💾 Save</button>
            <button id="load-btn">📂 Load</button>
            <button id="delete-btn">🗑 Delete Save</button>
            <div style="margin-left: auto; font-weight: 500;">
                Voxel World
            </div>
        `;

        return toolbar;
    }

    createContentArea() {
        const content = document.createElement('div');
        content.className = 'voxelapp-content';
        content.style.cssText = `
            flex: 1;
            overflow: hidden;
            position: relative;
        `;
        return content;
    }

    createStatusBar() {
        const statusBar = document.createElement('div');
        statusBar.className = 'voxelapp-status';
        statusBar.style.cssText = `
            height: 24px;
            background: var(--nebula-surface);
            border-top: 1px solid var(--nebula-border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 16px;
            font-size: 12px;
            color: var(--nebula-text-secondary);
        `;
        statusBar.innerHTML = `
            <span id="status-info">Ready</span>
            <span id="status-details">VoxelApp v0.2</span>
        `;
        return statusBar;
    }

    updateStatus(msg) {
        const el = document.getElementById('status-info');
        if (el) el.textContent = msg;
    }

    loadThree(container) {
        // Check if Three.js is already loaded
        if (window.THREE) {
            this.startGame(container);
            return;
        }

        // Temporarily disable AMD to avoid conflicts with Monaco Editor's loader
        const originalDefine = window.define;
        if (window.define && window.define.amd) {
            window.define = undefined;
        }

        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js";
        script.onload = () => {
            // Restore original define after Three.js loads
            if (originalDefine) {
                window.define = originalDefine;
            }
            
            // Add a small delay to ensure THREE is fully available
            setTimeout(() => {
                if (window.THREE) {
                    console.log('✅ Three.js loaded successfully');
                    this.startGame(container);
                } else {
                    console.error('Three.js failed to load properly');
                    this.updateStatus('Failed to load 3D engine');
                }
            }, 100);
        };
        script.onerror = () => {
            // Restore original define on error too
            if (originalDefine) {
                window.define = originalDefine;
            }
            console.error('Failed to load Three.js');
            this.updateStatus('Failed to load 3D engine');
        };
        document.head.appendChild(script);
    }

    startGame(container) {
    // Initialize controlsEnabled to true
    this.controlsEnabled = true;
        // Listen for pointer lock changes to re-enable controls
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement === container) {
                // Pointer lock regained, resume movement controls
                this.controlsEnabled = true;
                console.log('Pointer lock active, controls enabled');
                // Always restart animation loop when pointer lock is gained and game is not paused
                if (!this.isPaused && !this.animationId) {
                    console.log('Restarting animation loop');
                    animate();
                }
            } else {
                // Pointer lock lost
                this.controlsEnabled = false;
                console.log('Pointer lock lost, controls disabled');
            }
        });
        // Pause/resume helpers
        this.isPaused = false;
        this.pauseGame = () => {
            this.isPaused = true;
        };
        this.resumeGame = () => {
            this.isPaused = false;
        };
        // Verify Three.js is available
        if (!window.THREE) {
            console.error('Three.js not available');
            this.updateStatus('3D engine not loaded');
            return;
        }

        const THREE = window.THREE;
        console.log('✅ Three.js loaded successfully');
        this.updateStatus('Initializing 3D world...');

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        
        // Store as instance variables for cleanup
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setClearColor(0x87CEEB); // Sky blue background
        container.appendChild(renderer.domElement);

        // Handle window resize
        const handleResize = () => {
            const width = container.clientWidth;
            const height = container.clientHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        };
        window.addEventListener('resize', handleResize);
        this.eventListeners.push({ element: window, type: 'resize', handler: handleResize });

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        // Better lighting setup
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6); // Soft ambient light
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        const blockTypes = {
            grass: { color: 0x228B22, texture: 'grass' },    // Forest green with grass pattern
            stone: { color: 0x696969, texture: 'stone' },    // Dim gray with stone pattern
            wood: { color: 0x8B4513, texture: 'wood' },      // Saddle brown with wood grain
            sand: { color: 0xF4A460, texture: 'sand' },      // Sandy brown with grain texture
            glass: { color: 0x87CEEB, texture: 'glass' },    // Sky blue, translucent
            brick: { color: 0xB22222, texture: 'brick' },    // Fire brick with mortar lines
            glowstone: { color: 0xFFD700, texture: 'glow' }, // Gold with glowing effect
            iron: { color: 0x708090, texture: 'metal' },     // Slate gray with metallic shine
            flowers: { color: 0xFF69B4, texture: 'flower' }  // Hot pink with flower pattern
        };

        // Create textured materials
        const createBlockMaterial = (blockType) => {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 64;
            const ctx = canvas.getContext('2d');
            
            // Base color
            ctx.fillStyle = `#${blockType.color.toString(16).padStart(6, '0')}`;
            ctx.fillRect(0, 0, 64, 64);
            
            // Add simple texture patterns
            ctx.globalAlpha = 0.3;
            if (blockType.texture === 'grass') {
                // Grass texture - small green dots
                ctx.fillStyle = '#90EE90';
                for (let i = 0; i < 20; i++) {
                    ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
                }
            } else if (blockType.texture === 'stone') {
                // Stone texture - gray speckles
                ctx.fillStyle = '#A9A9A9';
                for (let i = 0; i < 25; i++) {
                    ctx.fillRect(Math.random() * 64, Math.random() * 64, 1, 1);
                }
            } else if (blockType.texture === 'wood') {
                // Wood texture - vertical grain lines
                ctx.strokeStyle = '#654321';
                ctx.lineWidth = 1;
                for (let i = 0; i < 8; i++) {
                    ctx.beginPath();
                    ctx.moveTo(i * 8 + Math.random() * 4, 0);
                    ctx.lineTo(i * 8 + Math.random() * 4, 64);
                    ctx.stroke();
                }
            } else if (blockType.texture === 'sand') {
                // Sand texture - random dots
                ctx.fillStyle = '#D2B48C';
                for (let i = 0; i < 30; i++) {
                    ctx.fillRect(Math.random() * 64, Math.random() * 64, 1, 1);
                }
            } else if (blockType.texture === 'glass') {
                // Glass texture - light streaks
                ctx.globalAlpha = 0.1;
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2;
                for (let i = 0; i < 5; i++) {
                    ctx.beginPath();
                    ctx.moveTo(Math.random() * 64, 0);
                    ctx.lineTo(Math.random() * 64, 64);
                    ctx.stroke();
                }
            } else if (blockType.texture === 'brick') {
                // Brick texture - mortar lines
                ctx.strokeStyle = '#8B8B8B';
                ctx.lineWidth = 1;
                // Horizontal lines
                for (let y = 8; y < 64; y += 16) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(64, y);
                    ctx.stroke();
                }
                // Vertical lines (offset pattern)
                for (let y = 0; y < 64; y += 16) {
                    const offset = (y / 16) % 2 === 0 ? 0 : 16;
                    for (let x = offset; x < 64; x += 32) {
                        ctx.beginPath();
                        ctx.moveTo(x, y);
                        ctx.lineTo(x, y + 16);
                        ctx.stroke();
                    }
                }
            } else if (blockType.texture === 'glow') {
                // Glowstone texture - bright particles
                ctx.fillStyle = '#FFFF00';
                ctx.globalAlpha = 0.6;
                for (let i = 0; i < 15; i++) {
                    ctx.fillRect(Math.random() * 64, Math.random() * 64, 3, 3);
                }
            } else if (blockType.texture === 'metal') {
                // Metal texture - horizontal lines with shine
                ctx.strokeStyle = '#C0C0C0';
                ctx.lineWidth = 1;
                for (let y = 2; y < 64; y += 4) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(64, y);
                    ctx.stroke();
                }
            } else if (blockType.texture === 'flower') {
                // Flower texture - small colored circles
                const colors = ['#FF1493', '#FF69B4', '#FFB6C1', '#FF6347'];
                for (let i = 0; i < 10; i++) {
                    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
                    ctx.beginPath();
                    ctx.arc(Math.random() * 64, Math.random() * 64, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.magFilter = THREE.NearestFilter; // Pixelated look
            
            // Create material based on block type
            if (blockType.texture === 'glass') {
                return new THREE.MeshLambertMaterial({ 
                    map: texture, 
                    transparent: true, 
                    opacity: 0.6 
                });
            } else if (blockType.texture === 'glow') {
                return new THREE.MeshLambertMaterial({ 
                    map: texture, 
                    emissive: new THREE.Color(0x444400) 
                });
            } else {
                return new THREE.MeshLambertMaterial({ map: texture });
            }
        };

        // Create materials once for efficiency (normal + darker versions)
        const materials = {};
        const playerMaterials = {}; // Darker versions for player-placed blocks
        
        Object.keys(blockTypes).forEach(type => {
            // Normal materials
            materials[type] = createBlockMaterial(blockTypes[type]);
            
            // Pre-create darker materials for player-placed blocks (performance optimization)
            const darkerColor = new THREE.Color(blockTypes[type].color).multiplyScalar(0.7);
            playerMaterials[type] = new THREE.MeshBasicMaterial({ 
                map: materials[type].map, 
                color: darkerColor 
            });
        });

        const addBlock = (x, y, z, type, playerPlaced = false) => {
            const geo = new THREE.BoxGeometry(1, 1, 1);
            // Use darker material for player-placed blocks, normal for generated
            const mat = playerPlaced ? playerMaterials[type] : materials[type];
            const cube = new THREE.Mesh(geo, mat);
            cube.position.set(x, y, z);
            cube.userData = { type, playerPlaced };
            scene.add(cube);
            this.world[`${x},${y},${z}`] = { type, mesh: cube, playerPlaced };
        };

        const removeBlock = (x, y, z) => {
            const key = `${x},${y},${z}`;
            if (this.world[key]) {
                scene.remove(this.world[key].mesh);
                delete this.world[key];
            }
        };

        // Chunk-based terrain generation functions
        const getChunkKey = (chunkX, chunkZ) => `${chunkX},${chunkZ}`;
        
        const generateChunk = (chunkX, chunkZ) => {
            const chunkKey = getChunkKey(chunkX, chunkZ);
            if (this.loadedChunks.has(chunkKey)) return;
            
            console.log(`Generating chunk ${chunkKey}`);
            
            for (let x = 0; x < this.chunkSize; x++) {
                for (let z = 0; z < this.chunkSize; z++) {
                    const worldX = chunkX * this.chunkSize + x;
                    const worldZ = chunkZ * this.chunkSize + z;
                    
                    // Generate height with noise (simpler calculation)
                    const height = Math.floor(Math.sin(worldX * 0.05) * Math.cos(worldZ * 0.05) * 2);
                    
                    // Create layers: grass -> stone (simplified for available types)
                    addBlock(worldX, height, worldZ, "grass");           // Surface
                    addBlock(worldX, height - 1, worldZ, "stone");       // Stone layer  
                    addBlock(worldX, height - 2, worldZ, "stone");       // More stone
                    addBlock(worldX, height - 3, worldZ, "iron");        // Iron at bottom (unbreakable for now)
                }
            }
            
            this.loadedChunks.add(chunkKey);
        };
        
        const unloadChunk = (chunkX, chunkZ) => {
            const chunkKey = getChunkKey(chunkX, chunkZ);
            if (!this.loadedChunks.has(chunkKey)) return;
            
            console.log(`Unloading chunk ${chunkKey}`);
            
            for (let x = 0; x < this.chunkSize; x++) {
                for (let z = 0; z < this.chunkSize; z++) {
                    const worldX = chunkX * this.chunkSize + x;
                    const worldZ = chunkZ * this.chunkSize + z;
                    
                    // Only remove the 3 layers we actually create
                    for (let y = -5; y <= 5; y++) { // Small range around ground level
                        removeBlock(worldX, y, worldZ);
                    }
                }
            }
            
            this.loadedChunks.delete(chunkKey);
        };
        
        const updateChunks = () => {
            const playerChunkX = Math.floor(this.player.position.x / this.chunkSize);
            const playerChunkZ = Math.floor(this.player.position.z / this.chunkSize);
            
            // Load chunks around player
            for (let dx = -this.renderDistance; dx <= this.renderDistance; dx++) {
                for (let dz = -this.renderDistance; dz <= this.renderDistance; dz++) {
                    generateChunk(playerChunkX + dx, playerChunkZ + dz);
                }
            }
            
            // Unload distant chunks
            Array.from(this.loadedChunks).forEach(chunkKey => {
                const [chunkX, chunkZ] = chunkKey.split(',').map(Number);
                const distance = Math.max(
                    Math.abs(chunkX - playerChunkX),
                    Math.abs(chunkZ - playerChunkZ)
                );
                
                if (distance > this.renderDistance + 1) {
                    unloadChunk(chunkX, chunkZ);
                }
            });
        };

        // Initial chunk loading around spawn
        console.log('Loading initial chunks...');
        updateChunks();
        console.log('✅ Initial chunks loaded');
        this.updateStatus('World ready - Click to play!');

        // Controls - make sure to capture all key events properly
        this.keys = {}; // Reset keys object
        const keydownHandler = (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = true;
            
            // Hotbar selection (1-9 keys)
            if (e.key >= '1' && e.key <= '9') {
                const slot = parseInt(e.key) - 1;
                if (slot < this.hotbarSlots.length) {
                    this.selectedSlot = slot;
                    this.updateHotbar();
                    e.preventDefault();
                    return;
                }
            }
            
            // Hotbar navigation with Q/E keys
            if (key === 'q') {
                this.selectedSlot = (this.selectedSlot - 1 + this.hotbarSlots.length) % this.hotbarSlots.length;
                this.updateHotbar();
                e.preventDefault();
                return;
            }
            if (key === 'e') {
                this.selectedSlot = (this.selectedSlot + 1) % this.hotbarSlots.length;
                this.updateHotbar();
                e.preventDefault();
                return;
            }
            
            // Don't prevent default for important shortcuts
            if (e.ctrlKey || e.altKey || e.metaKey) {
                return; // Allow Ctrl+Shift+R, Alt+Tab, etc.
            }
            e.preventDefault(); // Only prevent default for game keys
        };
        const keyupHandler = (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = false;
            
            // Don't prevent default for important shortcuts
            if (e.ctrlKey || e.altKey || e.metaKey) {
                return;
            }
            e.preventDefault();
        };
        
        document.addEventListener("keydown", keydownHandler);
        document.addEventListener("keyup", keyupHandler);
        this.eventListeners.push({ element: document, type: 'keydown', handler: keydownHandler });
        this.eventListeners.push({ element: document, type: 'keyup', handler: keyupHandler });

        // Add simple crosshair overlay (like Minecraft)
        const crosshair = document.createElement('div');
        crosshair.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            width: 4px;
            height: 4px;
            background: white;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 1000;
            box-shadow: 
                0 -8px 0 white, 0 8px 0 white,
                -8px 0 0 white, 8px 0 0 white,
                0 0 0 1px rgba(0,0,0,0.5);
        `;
        container.appendChild(crosshair);

        // Block emoji mapping method (defined before hotbar creation)
        this.getBlockEmoji = (blockType) => {
            const emojiMap = {
                grass: '🌱',
                stone: '🪨',
                wood: '🪵',
                sand: '🏖️',
                glass: '💎',
                brick: '🧱',
                glowstone: '⭐',
                iron: '⚙️',
                flowers: '🌸'
            };
            return emojiMap[blockType] || '📦';
        };

        // Create vertical hotbar UI
        const hotbar = document.createElement('div');
        hotbar.id = 'voxel-hotbar';
        hotbar.style.cssText = `
            position: fixed;
            right: 20px;
            bottom: 40px;
            background: rgba(0, 0, 0, 0.8);
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 8px;
            padding: 6px;
            display: flex;
            flex-direction: column;
            gap: 5px;
            pointer-events: none;
            z-index: 1000;
            font-family: 'Courier New', monospace;
            backdrop-filter: blur(5px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        `;
        
        // Create hotbar slots
        this.hotbarElements = [];
        for (let i = 0; i < this.hotbarSlots.length; i++) {
            const slot = document.createElement('div');
            slot.style.cssText = `
                width: 44px;
                height: 44px;
                background: rgba(40, 40, 40, 0.9);
                border: 2px solid ${i === this.selectedSlot ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.2)'};
                border-radius: 6px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                position: relative;
                transition: all 0.2s ease;
                font-size: 24px;
                color: white;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            `;
            
            // Add block type emoji/icon
            const blockType = this.hotbarSlots[i];
            const blockEmoji = this.getBlockEmoji(blockType);
            slot.innerHTML = `
                <div style="font-size: 20px; margin-bottom: 2px;">${blockEmoji}</div>
                <div style="font-size: 9px; font-weight: bold;">${this.inventory[blockType] || 0}</div>
            `;
            
            // Add number indicator
            const numberIndicator = document.createElement('div');
            numberIndicator.style.cssText = `
                position: absolute;
                top: -6px;
                left: -6px;
                width: 12px;
                height: 12px;
                background: rgba(0, 0, 0, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.5);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 8px;
                color: white;
                font-weight: bold;
            `;
            numberIndicator.textContent = i + 1;
            slot.appendChild(numberIndicator);
            
            this.hotbarElements.push(slot);
            hotbar.appendChild(slot);
        }
        
        container.appendChild(hotbar);
        this.hotbarElement = hotbar;

        // Add hotbar update method
        this.updateHotbar = () => {
            this.hotbarElements.forEach((element, index) => {
                const blockType = this.hotbarSlots[index];
                const quantity = this.inventory[blockType] || 0;
                const isSelected = index === this.selectedSlot;
                
                // Update border for selection
                element.style.border = `2px solid ${isSelected ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.2)'}`;
                
                // Update content
                const blockEmoji = this.getBlockEmoji(blockType);
                element.innerHTML = `
                    <div style="font-size: 28px; margin-bottom: 2px;">${blockEmoji}</div>
                    <div style="font-size: 10px; font-weight: bold;">${quantity}</div>
                `;
                
                // Re-add number indicator
                const numberIndicator = document.createElement('div');
                numberIndicator.style.cssText = `
                    position: absolute;
                    top: -8px;
                    left: -8px;
                    width: 16px;
                    height: 16px;
                    background: rgba(0, 0, 0, 0.8);
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    color: white;
                    font-weight: bold;
                `;
                numberIndicator.textContent = index + 1;
                element.appendChild(numberIndicator);
            });
        };
        
        // Initialize hotbar display
        this.updateHotbar();

        container.requestPointerLock = container.requestPointerLock || container.mozRequestPointerLock;
        // Only allow pointer lock after menu closes and debounce
        const clickHandler = () => {
            if (!this.isPaused && this.pointerLockReady && document.pointerLockElement !== container) {
                container.requestPointerLock();
            }
        };
        container.addEventListener("click", clickHandler);
        this.eventListeners.push({ element: container, type: 'click', handler: clickHandler });
        
        // Target block highlight
        let targetHighlight = null;
        const createTargetHighlight = () => {
            const highlightGeo = new THREE.BoxGeometry(1.05, 1.05, 1.05);
            const highlightMat = new THREE.MeshBasicMaterial({ 
                color: 0xffffff, 
                wireframe: true, 
                transparent: true, 
                opacity: 0.5 
            });
            targetHighlight = new THREE.Mesh(highlightGeo, highlightMat);
            scene.add(targetHighlight);
        };
        createTargetHighlight();
        
        // Update target highlight every frame
        const updateTargetHighlight = () => {
            raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
            const intersects = raycaster.intersectObjects(Object.values(this.world).map(b => b.mesh));
            
            if (intersects.length > 0) {
                const hit = intersects[0];
                targetHighlight.position.copy(hit.object.position);
                targetHighlight.visible = true;
            } else {
                targetHighlight.visible = false;
            }
        };
        const mousemoveHandler = (e) => {
            if (document.pointerLockElement === container && this.controlsEnabled) {
                this.player.rotation.y -= e.movementX * 0.002;
                this.player.rotation.x -= e.movementY * 0.002;
                // Clamp vertical rotation to prevent flipping upside down
                const maxLookUp = Math.PI / 2 - 0.1;   // Almost straight up
                const maxLookDown = -Math.PI / 2 + 0.1; // Almost straight down
                this.player.rotation.x = Math.max(maxLookDown, Math.min(maxLookUp, this.player.rotation.x));
            }
        };
        document.addEventListener("mousemove", mousemoveHandler);
        this.eventListeners.push({ element: document, type: 'mousemove', handler: mousemoveHandler });

        // Simple block highlight system (only when clicking, not every frame)
        let currentHighlight = null;
        
        const highlightBlock = (position, isPlacement = false) => {
            // Remove previous highlight
            if (currentHighlight) {
                scene.remove(currentHighlight);
            }
            
            // Create new highlight
            const highlightGeo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
            const highlightMat = new THREE.MeshBasicMaterial({ 
                color: isPlacement ? 0x00ff00 : 0xff0000, // Green for place, red for remove
                wireframe: true, 
                transparent: true, 
                opacity: 0.8 
            });
            currentHighlight = new THREE.Mesh(highlightGeo, highlightMat);
            currentHighlight.position.copy(position);
            scene.add(currentHighlight);
            
            // Auto-remove highlight after 0.5 seconds
            setTimeout(() => {
                if (currentHighlight) {
                    scene.remove(currentHighlight);
                    currentHighlight = null;
                }
            }, 500);
        };

        // Place & remove blocks
        const mousedownHandler = (e) => {
            if (!this.controlsEnabled) return;
            raycaster.setFromCamera(new THREE.Vector2(0, 0), camera); // center of screen
            const intersects = raycaster.intersectObjects(Object.values(this.world).map(b => b.mesh));

            if (intersects.length > 0) {
                const hit = intersects[0];
                const pos = hit.object.position;

                if (e.button === 0) { // Left = place
                    const selectedBlockType = this.hotbarSlots[this.selectedSlot];
                    // Check if player has blocks of this type
                    if (this.inventory[selectedBlockType] > 0) {
                        const normal = hit.face.normal.clone();
                        const newPos = pos.clone().add(normal);
                        highlightBlock(newPos, true); // Green highlight for placement
                        addBlock(newPos.x, newPos.y, newPos.z, selectedBlockType, true); // Mark as player-placed
                        // Decrease inventory
                        this.inventory[selectedBlockType]--;
                        this.updateHotbar();
                        this.updateStatus(`Placed ${selectedBlockType} (${this.inventory[selectedBlockType]} left)`);
                    } else {
                        this.updateStatus(`No ${selectedBlockType} blocks remaining!`);
                    }
                }

                if (e.button === 2) { // Right = remove
                    // Don't allow removing iron blocks (acting as bedrock)
                    if (hit.object.userData.type !== 'iron') {
                        const blockType = hit.object.userData.type;
                        highlightBlock(pos, false); // Red highlight for removal
                        removeBlock(pos.x, pos.y, pos.z);
                        // Add to inventory if it's a type we track
                        if (this.inventory.hasOwnProperty(blockType)) {
                            this.inventory[blockType]++;
                            this.updateHotbar();
                            this.updateStatus(`Collected ${blockType} (${this.inventory[blockType]} total)`);
                        } else {
                            this.updateStatus("Removed block");
                        }
                    } else {
                        this.updateStatus("Cannot break iron blocks!");
                    }
                }
            }
        };
        const contextmenuHandler = (e) => e.preventDefault();
        
        container.addEventListener("mousedown", mousedownHandler);
        container.addEventListener("contextmenu", contextmenuHandler); // prevent right-click menu
        this.eventListeners.push({ element: container, type: 'mousedown', handler: mousedownHandler });
        this.eventListeners.push({ element: container, type: 'contextmenu', handler: contextmenuHandler });

        // Mouse wheel for hotbar navigation
        const wheelHandler = (e) => {
            e.preventDefault();
            const direction = e.deltaY > 0 ? 1 : -1;
            this.selectedSlot = (this.selectedSlot + direction + this.hotbarSlots.length) % this.hotbarSlots.length;
            this.updateHotbar();
        };
        container.addEventListener("wheel", wheelHandler);
        this.eventListeners.push({ element: container, type: 'wheel', handler: wheelHandler });

        // Save/load - optimized for performance
        const saveWorld = () => {
            // Only save player-modified blocks, not the entire generated world
            const modifiedBlocks = {};
            for (let key in this.world) {
                if (this.world[key].playerPlaced) {
                    modifiedBlocks[key] = this.world[key];
                }
            }
            
            const saveData = {
                modifiedBlocks: Object.entries(modifiedBlocks).map(([k, v]) => ({ 
                    pos: k, 
                    type: v.type,
                    playerPlaced: v.playerPlaced 
                })),
                player: this.player
            };
            localStorage.setItem("NebulaWorld", JSON.stringify(saveData));
            this.updateStatus(`World saved (${Object.keys(modifiedBlocks).length} custom blocks)`);
        };

        const loadWorld = () => {
            const data = localStorage.getItem("NebulaWorld");
            if (!data) return alert("No save found!");
            
            const saveData = JSON.parse(data);
            
            // Clear only player-placed blocks, keep generated world
            for (let key in this.world) {
                if (this.world[key].playerPlaced) {
                    removeBlock(...key.split(",").map(Number));
                }
            }
            
            // Load only the modified blocks
            saveData.modifiedBlocks.forEach(b => {
                const [x, y, z] = b.pos.split(",").map(Number);
                addBlock(x, y, z, b.type, true); // Mark as player-placed
            });
            
            this.player = saveData.player;
            this.updateStatus(`World loaded (${saveData.modifiedBlocks.length} custom blocks)`);
        };

        const deleteSave = () => {
            localStorage.removeItem("NebulaWorld");
            this.updateStatus("Save deleted");
        };

    // Modal menu button handlers
    const modalSaveBtn = document.getElementById("modal-save-btn");
    const modalLoadBtn = document.getElementById("modal-load-btn");
    const modalDeleteBtn = document.getElementById("modal-delete-btn");
    if (modalSaveBtn) modalSaveBtn.onclick = saveWorld;
    if (modalLoadBtn) modalLoadBtn.onclick = loadWorld;
    if (modalDeleteBtn) modalDeleteBtn.onclick = deleteSave;
 

        // Improved movement with gravity and chunk loading
        let lastChunkUpdate = 0;
        const animate = () => {
            this.animationId = requestAnimationFrame(animate);
            
            // Always continue animation loop, but skip input processing if paused or controls disabled
            if (this.isPaused || !this.controlsEnabled) {
                // Still render the scene even when paused
                renderer.render(scene, camera);
                return;
            }
            
            const speed = 0.15; // Slightly faster movement
            const jumpSpeed = 0.3;
            const gravity = 0.01;
            
            // Handle movement
            const dir = new THREE.Vector3();
            if (this.keys["w"]) dir.z -= 1;
            if (this.keys["s"]) dir.z += 1;
            if (this.keys["a"]) dir.x -= 1;
            if (this.keys["d"]) dir.x += 1;
            if (this.keys[" "]) this.player.velocity = this.player.velocity || jumpSpeed; // Spacebar to jump
            
            // Apply rotation to movement direction
            dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.rotation.y);
            
            // Optimized horizontal collision - more lenient checking
            const checkBlockCollision = (x, y, z) => {
                const blockX = Math.floor(x);
                const blockY = Math.floor(y);
                const blockZ = Math.floor(z);
                const key = `${blockX},${blockY},${blockZ}`;
                const hasBlock = this.world[key] && this.world[key] !== 'air';
                return hasBlock;
            };
            
            // Apply horizontal movement FIRST (before gravity/ground collision)
            const moveSpeed = speed;
            
            // X movement - always allow unless hitting a wall
            if (Math.abs(dir.x) > 0.001) {
                const newX = this.player.position.x + (dir.x * moveSpeed);
                const currentY = Math.floor(this.player.position.y);
                
                // Check for wall collision at current height only
                if (!checkBlockCollision(newX, currentY, this.player.position.z)) {
                    this.player.position.x = newX;
                }
            }
            
            // Z movement - always allow unless hitting a wall  
            if (Math.abs(dir.z) > 0.001) {
                const newZ = this.player.position.z + (dir.z * moveSpeed);
                const currentY = Math.floor(this.player.position.y);
                
                // Check for wall collision at current height only
                if (!checkBlockCollision(this.player.position.x, currentY, newZ)) {
                    this.player.position.z = newZ;
                }
            }
            
            // Apply gravity and vertical movement AFTER horizontal movement
            if (!this.player.velocity) this.player.velocity = 0;
            this.player.velocity -= gravity;
            this.player.position.y += this.player.velocity;
            
            // Ground collision - completely separate from horizontal movement
            const getGroundLevel = (x, z) => {
                const blockX = Math.floor(x);
                const blockZ = Math.floor(z);
                
                // Check downward from current position for ground
                const currentY = Math.floor(this.player.position.y);
                for (let y = currentY + 1; y >= currentY - 5; y--) { // Check one block above too
                    const key = `${blockX},${y},${blockZ}`;
                    if (this.world[key]) {
                        return y + 1; // Stand on top of the block
                    }
                }
                return currentY - 3; // Fallback
            };
            
            // Apply ground collision more aggressively to prevent falling through
            const groundLevel = getGroundLevel(this.player.position.x, this.player.position.z);
            const playerBottom = this.player.position.y - 0.9;
            
            if (playerBottom <= groundLevel) {
                this.player.position.y = groundLevel + 0.9;
                this.player.velocity = 0;
            }

            // Update chunks every 30 frames (about 0.5 seconds)
            if (++lastChunkUpdate > 30) {
                updateChunks();
                lastChunkUpdate = 0;
            }

            // Update camera with quaternion-based rotation (more stable)
            camera.position.set(this.player.position.x, this.player.position.y, this.player.position.z);
            
            // Use quaternions for stable rotation
            const yawQuaternion = new THREE.Quaternion();
            const pitchQuaternion = new THREE.Quaternion();
            
            yawQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.player.rotation.y);
            pitchQuaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.player.rotation.x);
            
            // Combine rotations: yaw first, then pitch
            const finalQuaternion = new THREE.Quaternion();
            finalQuaternion.multiplyQuaternions(yawQuaternion, pitchQuaternion);
            
            camera.quaternion.copy(finalQuaternion);

            renderer.render(scene, camera);
        };
        animate();

        // Store the saveWorld function for cleanup
        this.saveWorldHandler = saveWorld;
        window.addEventListener("beforeunload", this.saveWorldHandler);
        this.eventListeners.push({ element: window, type: 'beforeunload', handler: this.saveWorldHandler });
    }

    cleanup() {
        console.log("Starting VoxelApp cleanup...");
        
        // Cancel animation frame
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Remove all event listeners
        this.eventListeners.forEach(({ element, type, handler }) => {
            element.removeEventListener(type, handler);
        });
        this.eventListeners = [];
        
        // Dispose of Three.js scene and all its children
        if (this.scene) {
            this.scene.traverse((child) => {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => {
                            if (material.map) material.map.dispose();
                            material.dispose();
                        });
                    } else {
                        if (child.material.map) child.material.map.dispose();
                        child.material.dispose();
                    }
                }
            });
            this.scene.clear();
            this.scene = null;
        }
        
        // Dispose of renderer
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.forceContextLoss();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
            this.renderer = null;
        }
        
        // Clear camera reference
        this.camera = null;
        
        // Remove crosshair if it exists
        const crosshairs = document.querySelectorAll('div[style*="position: fixed"]');
        crosshairs.forEach(crosshair => {
            if (crosshair.style.cssText.includes('pointer-events: none')) {
                crosshair.remove();
            }
        });
        
        // Remove hotbar if it exists
        if (this.hotbarElement && this.hotbarElement.parentNode) {
            this.hotbarElement.parentNode.removeChild(this.hotbarElement);
            this.hotbarElement = null;
        }
        this.hotbarElements = [];
        
        // Clear world data
        this.world = {};
        this.loadedChunks.clear();
        
        // Release pointer lock if active
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
        
        console.log("VoxelApp cleanup complete - all resources disposed");
    }

    getTitle() { return 'Voxel World'; }
    getIcon() { return '🟩'; }
}

// Register with Nebula
window.NebulaVoxelApp = NebulaVoxelApp;
if (window.registerNebulaApp) {
    window.registerNebulaApp({
        id: 'nebulavoxelapp',
        name: 'Voxel World',
        icon: '🟩',
        className: 'NebulaVoxelApp',
        description: 'Minecraft-like voxel game',
        category: 'games'
    });
}
new NebulaVoxelApp();
