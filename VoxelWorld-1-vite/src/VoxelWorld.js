import * as THREE from 'three';

class NebulaVoxelApp {
    constructor(container) {
        // Initialize properties
        this.world = {};
        this.loadedChunks = new Set();
        this.chunkSize = 8;  // Reduced from 12 for better performance
        this.renderDistance = 1;  // Reduced from 2 for better performance
        this.player = {
            position: { x: 0, y: 10, z: 0 },
            rotation: { x: 0, y: 0 }
        };
        this.keys = {};
        this.selectedSlot = 0;
        this.inventory = {
            grass: 50,
            stone: 30,
            wood: 25,
            sand: 20,
            glass: 15,
            brick: 10,
            glowstone: 8,
            iron: 5,
            flowers: 0
        };
        this.hotbarSlots = ['grass', 'stone', 'wood', 'sand', 'glass', 'brick', 'glowstone', 'iron'];
        this.container = container;
        this.controlsEnabled = true;
        this.isPaused = false;
        this.eventListeners = [];
        // Device detection and mobile controls
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                       ('ontouchstart' in window) ||
                       (window.innerWidth <= 768 && window.innerHeight <= 1024);

        // Mobile virtual joysticks
        this.leftJoystick = null;
        this.rightJoystick = null;
        this.leftJoystickActive = false;
        this.rightJoystickActive = false;
        this.leftJoystickCenter = { x: 0, y: 0 };
        this.rightJoystickCenter = { x: 0, y: 0 };
        this.leftJoystickValue = { x: 0, y: 0 };
        this.rightJoystickValue = { x: 0, y: 0 };
        this.addBlock = (x, y, z, type, playerPlaced = false, customColor = null) => {
            const geo = new THREE.BoxGeometry(1, 1, 1);

            let mat;
            if (customColor) {
                // Create custom material with height-based color
                mat = new THREE.MeshLambertMaterial({
                    map: this.materials[type].map,
                    color: customColor
                });
            } else {
                // Use darker material for player-placed blocks, normal for generated
                mat = playerPlaced ? this.playerMaterials[type] : this.materials[type];
            }

            const cube = new THREE.Mesh(geo, mat);
            cube.position.set(x, y, z);
            cube.userData = { type, playerPlaced };
            this.scene.add(cube);
            this.world[`${x},${y},${z}`] = { type, mesh: cube, playerPlaced };
        };

        this.removeBlock = (x, y, z) => {
            const key = `${x},${y},${z}`;
            if (this.world[key]) {
                this.scene.remove(this.world[key].mesh);
                delete this.world[key];
            }
        };

        // Seed system functions
        this.generateInitialSeed = () => {
            // Use current timestamp + random for initial seed
            return Date.now() + Math.floor(Math.random() * 1000000);
        };

        this.createSeededRandom = (seed) => {
            // Simple seeded random number generator
            let x = Math.sin(seed) * 10000;
            return () => {
                x = Math.sin(x) * 10000;
                return x - Math.floor(x);
            };
        };

        // Seeded noise function for coherent terrain generation
        this.seededNoise = (x, z, seed) => {
            // Use seed to create consistent but different noise patterns
            const n1 = Math.sin((x * 0.05 + seed * 0.001)) * Math.cos((z * 0.05 + seed * 0.002));
            const n2 = Math.sin((x * 0.03 + seed * 0.003) + (z * 0.04 + seed * 0.004));
            return (n1 + n2) * 0.5; // Combine for more variation
        };

        this.generateSeedFromString = (seedString) => {
            // Convert string to seed using ASCII values
            let seed = 0;
            for (let i = 0; i < seedString.length; i++) {
                seed += seedString.charCodeAt(i) * (i + 1);
            }
            // Add current timestamp for uniqueness
            seed += Date.now();
            return seed;
        };

        this.newGame = (seedString = '') => {
            // Clear current world
            for (let key in this.world) {
                const [x, y, z] = key.split(',').map(Number);
                this.removeBlock(x, y, z);
            }
            this.loadedChunks.clear();
            this.world = {};

            // Generate new seed
            if (seedString.trim()) {
                this.worldSeed = this.generateSeedFromString(seedString);
            } else {
                this.worldSeed = this.generateInitialSeed();
            }

            // Create new seeded random generator
            this.seededRandom = this.createSeededRandom(this.worldSeed);

            // Reset player position
            this.player.position = { x: 0, y: 10, z: 0 };
            this.player.rotation = { x: 0, y: 0 };

            // Reload initial chunks
            this.updateChunks();

            this.updateStatus(`New world generated with seed: ${this.worldSeed}`);
        };

        // Initialize seed system
        this.worldSeed = this.generateInitialSeed();
        this.seededRandom = this.createSeededRandom(this.worldSeed);

        // Hardware performance benchmark
        this.runPerformanceBenchmark = async () => {
            const benchmarkKey = 'voxelWorld_performanceBenchmark';
            const storedResult = localStorage.getItem(benchmarkKey);

            if (storedResult) {
                const result = JSON.parse(storedResult);
                this.renderDistance = result.renderDistance;
                this.updateStatus(`Performance benchmark loaded: Render distance ${this.renderDistance}`);
                return;
            }

            this.updateStatus('Running performance benchmark...');

            // Create a small test scene to measure performance
            const testBlocks = [];
            const testSize = 8; // 8x8x8 test area

            // Generate test blocks
            for (let x = -testSize/2; x < testSize/2; x++) {
                for (let y = 0; y < 4; y++) {
                    for (let z = -testSize/2; z < testSize/2; z++) {
                        const block = this.addBlock(x, y, z, 'stone', false);
                        if (block) testBlocks.push(block);
                    }
                }
            }

            // Measure rendering performance over 2 seconds
            const frames = [];
            const startTime = performance.now();
            let frameCount = 0;

            return new Promise((resolve) => {
                const measureFrame = () => {
                    const currentTime = performance.now();
                    frameCount++;

                    if (currentTime - startTime >= 2000) { // 2 second test
                        const avgFPS = frameCount / ((currentTime - startTime) / 1000);
                        frames.push(avgFPS);

                        // Clean up test blocks
                        testBlocks.forEach(block => {
                            if (block && block.mesh) {
                                this.scene.remove(block.mesh);
                            }
                        });

                        // Calculate performance score and set render distance
                        const finalAvgFPS = frames.reduce((a, b) => a + b) / frames.length;
                        let renderDistance;

                        if (finalAvgFPS >= 50) renderDistance = 3;      // High-end devices
                        else if (finalAvgFPS >= 30) renderDistance = 2; // Mid-range devices
                        else if (finalAvgFPS >= 15) renderDistance = 1; // Low-end devices
                        else renderDistance = 0;                   // Very low-end devices

                        // Store result
                        const result = {
                            avgFPS: Math.round(finalAvgFPS),
                            renderDistance: renderDistance,
                            timestamp: Date.now()
                        };
                        localStorage.setItem(benchmarkKey, JSON.stringify(result));

                        this.renderDistance = renderDistance;
                        this.updateStatus(`Benchmark complete: ${Math.round(avgFPS)} FPS, Render distance: ${renderDistance}`);
                        resolve(result);
                    } else {
                        requestAnimationFrame(measureFrame);
                    }
                };

                requestAnimationFrame(measureFrame);
            });
        };

        // Target highlight update method
        this.updateTargetHighlight = () => {
            if (!this.raycaster) return; // Only update if raycaster exists
            
            this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
            const intersects = this.raycaster.intersectObjects(this.scene.children.filter(obj => obj.isMesh && obj !== this.targetHighlight));
            
            if (intersects.length > 0) {
                const hit = intersects[0];
                this.targetHighlight.position.copy(hit.object.position);
                
                // Default to green (placement mode)
                this.targetHighlight.material.color.setHex(0x00ff00);
                this.targetHighlight.visible = true;
            } else {
                this.targetHighlight.visible = false;
            }
        };
        this.controlsEnabled = true;
        this.isPaused = false;
        this.eventListeners = [];

        // Block types and procedural textures
        const blockTypes = {
            grass: { color: 0x228B22, texture: 'grass' },    // Forest green with grass pattern
            stone: { color: 0x696969, texture: 'stone' },    // Dim gray with stone pattern
            wood: { color: 0x8B4513, texture: 'wood' },      // Saddle brown with wood grain
            sand: { color: 0xF4A460, texture: 'sand' },      // Sandy brown with grain texture
            glass: { color: 0x87CEEB, texture: 'glass' },    // Sky blue, translucent
            brick: { color: 0xB22222, texture: 'brick' },    // Fire brick with mortar lines
            glowstone: { color: 0xFFD700, texture: 'glow' }, // Gold with glowing effect
            iron: { color: 0x708090, texture: 'metal' },     // Slate gray with metallic shine
            flowers: { color: 0xFF69B4, texture: 'flower' }, // Hot pink with flower pattern
            snow: { color: 0xFFFFFF, texture: 'snow' }       // Pure white with snow texture
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
            } else if (blockType.texture === 'snow') {
                // Snow texture - small white sparkles
                ctx.fillStyle = '#FFFFFF';
                ctx.globalAlpha = 0.4;
                for (let i = 0; i < 25; i++) {
                    const size = Math.random() * 2 + 1;
                    ctx.beginPath();
                    ctx.arc(Math.random() * 64, Math.random() * 64, size, 0, Math.PI * 2);
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
        this.materials = {};
        this.playerMaterials = {}; // Darker versions for player-placed blocks

        Object.keys(blockTypes).forEach(type => {
            // Normal materials
            this.materials[type] = createBlockMaterial(blockTypes[type]);

            // Pre-create darker materials for player-placed blocks (performance optimization)
            const darkerColor = new THREE.Color(blockTypes[type].color).multiplyScalar(0.7);
            this.playerMaterials[type] = new THREE.MeshBasicMaterial({
                map: this.materials[type].map,
                color: darkerColor
            });
        });

        // Three.js setup
        this.scene = new THREE.Scene();
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.camera.position.set(0, 10, 20);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.raycaster = new THREE.Raycaster();
        container.appendChild(this.renderer.domElement);

        // Make container fullscreen
        container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            margin: 0;
            padding: 0;
            overflow: hidden;
        `;

        // Block targeting highlight (shows which block will be affected)
        this.targetHighlight = new THREE.Mesh(
            new THREE.BoxGeometry(1.02, 1.02, 1.02),
            new THREE.MeshBasicMaterial({ 
                color: 0x00ff00, 
                wireframe: true, 
                transparent: true, 
                opacity: 0.8 
            })
        );
        this.targetHighlight.visible = false;
        this.scene.add(this.targetHighlight);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Day/Night Cycle
        this.dayNightCycle = {
            currentTime: 12, // Start at noon (24-hour format)
            cycleDuration: 600, // 10 minutes for full cycle
            timeScale: 1.0,
            isActive: true,
            lastUpdate: Date.now(),
            directionalLight: directionalLight,
            ambientLight: ambientLight
        };

        // Biome definitions
        this.biomes = {
            forest: {
                name: 'Forest',
                color: 0x228B22, // Forest green
                minHeight: -2,
                maxHeight: 4,
                surfaceBlock: 'grass',
                subBlock: 'stone',
                mapColor: '#228B22',
                heightColorRange: { min: 0.6, max: 1.2 } // Brightness multiplier range
            },
            desert: {
                name: 'Desert',
                color: 0xDEB887, // Burlywood/sand
                minHeight: -1,
                maxHeight: 2,
                surfaceBlock: 'sand',
                subBlock: 'sand',
                mapColor: '#DEB887',
                heightColorRange: { min: 0.7, max: 1.1 }
            },
            mountain: {
                name: 'Mountain',
                color: 0x696969, // Dim gray
                minHeight: 2,
                maxHeight: 8,
                surfaceBlock: 'stone',
                subBlock: 'iron',
                mapColor: '#696969',
                heightColorRange: { min: 0.8, max: 1.4 }
            },
            plains: {
                name: 'Plains',
                color: 0x90EE90, // Light green
                minHeight: -1,
                maxHeight: 1,
                surfaceBlock: 'grass',
                subBlock: 'stone',
                mapColor: '#90EE90',
                heightColorRange: { min: 0.65, max: 1.15 }
            },
            tundra: {
                name: 'Tundra',
                color: 0xF0F8FF, // Alice blue
                minHeight: -3,
                maxHeight: 0,
                surfaceBlock: 'stone',
                subBlock: 'iron',
                mapColor: '#F0F8FF',
                heightColorRange: { min: 0.5, max: 1.0 }
            }
        };

        // Simple biome selection based on position (can be improved with noise)
        this.getBiomeAt = (x, z) => {
            const biomeSeed = this.seededNoise(x, z, this.worldSeed) * 2 - 1; // Convert to -1 to 1 range
            const distanceFromCenter = Math.sqrt(x * x + z * z);

            if (distanceFromCenter > 40) return this.biomes.tundra;
            if (biomeSeed > 0.3) return this.biomes.mountain;
            if (biomeSeed < -0.3) return this.biomes.desert;
            if (Math.abs(biomeSeed) < 0.1) return this.biomes.plains;
            return this.biomes.forest;
        };

        // Calculate height-based color for terrain blocks
        this.getHeightBasedColor = (biome, height) => {
            // Normalize height within biome's range
            const heightRange = biome.maxHeight - biome.minHeight;
            const normalizedHeight = heightRange > 0 ?
                (height - biome.minHeight) / heightRange : 0.5;

            // Calculate brightness multiplier
            const brightnessRange = biome.heightColorRange.max - biome.heightColorRange.min;
            const brightness = biome.heightColorRange.min + (normalizedHeight * brightnessRange);

            // Apply brightness to base biome color
            const baseColor = new THREE.Color(biome.color);
            return baseColor.multiplyScalar(brightness);
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

                    // Get biome for this position
                    const biome = this.getBiomeAt(worldX, worldZ);

                    // Generate height with biome-specific noise
                    const baseHeight = Math.floor(this.seededNoise(worldX, worldZ, this.worldSeed) * 2);
                    const biomeHeight = Math.floor((biome.maxHeight + biome.minHeight) / 2) + Math.floor(this.seededNoise(worldX + 1000, worldZ + 1000, this.worldSeed) * (biome.maxHeight - biome.minHeight) / 2);
                    const height = Math.max(biome.minHeight, Math.min(biome.maxHeight, baseHeight + biomeHeight));

                    // Create layers based on biome with height-based coloring
                    const surfaceColor = this.getHeightBasedColor(biome, height);
                    const subSurfaceColor = this.getHeightBasedColor(biome, height - 1);
                    const deepColor = this.getHeightBasedColor(biome, height - 2);

                    // Check for snow on high elevations in cold biomes
                    const snowNoise = this.seededNoise(worldX + 2000, worldZ + 2000, this.worldSeed);
                    const hasSnow = (biome.name === 'mountain' || biome.name === 'tundra' || biome.name === 'forest') &&
                                   height >= biome.maxHeight - 1 &&
                                   snowNoise > -0.3; // 70% chance for snow based on noise

                    const surfaceBlock = hasSnow ? 'snow' : biome.surfaceBlock;
                    const surfaceBlockColor = hasSnow ? new THREE.Color(0xFFFFFF) : surfaceColor;

                    this.addBlock(worldX, height, worldZ, surfaceBlock, false, surfaceBlockColor);           // Surface
                    this.addBlock(worldX, height - 1, worldZ, biome.subBlock, false, subSurfaceColor);      // Sub-surface
                    this.addBlock(worldX, height - 2, worldZ, biome.subBlock, false, deepColor);            // More sub-surface
                    this.addBlock(worldX, height - 3, worldZ, "iron");                                     // Iron at bottom (unbreakable)
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
                        this.removeBlock(worldX, y, worldZ);
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

        // Save/Load system methods
        this.updateStatus = (message) => {
            console.log(`[VoxelWorld] ${message}`);
            // Could add UI status display here later
        };

        this.saveWorld = () => {
            try {
                // Collect only player-placed blocks for efficient storage
                const modifiedBlocks = [];
                for (let key in this.world) {
                    if (this.world[key].playerPlaced) {
                        const [x, y, z] = key.split(",").map(Number);
                        modifiedBlocks.push({
                            pos: key,
                            type: this.world[key].type
                        });
                    }
                }

                const saveData = {
                    modifiedBlocks: modifiedBlocks,
                    player: this.player,
                    worldSeed: this.worldSeed,
                    timestamp: Date.now()
                };

                localStorage.setItem("NebulaWorld", JSON.stringify(saveData));
                this.updateStatus(`World saved (${modifiedBlocks.length} custom blocks)`);
                return true;
            } catch (error) {
                console.error("Save failed:", error);
                this.updateStatus("Save failed");
                return false;
            }
        };

        this.loadWorld = () => {
            try {
                const data = localStorage.getItem("NebulaWorld");
                if (!data) {
                    this.updateStatus("No save data found");
                    return false;
                }

                const saveData = JSON.parse(data);

                // Clear only player-placed blocks, keep generated world
                for (let key in this.world) {
                    if (this.world[key].playerPlaced) {
                        const [x, y, z] = key.split(",").map(Number);
                        this.removeBlock(x, y, z);
                    }
                }

                // Load only the modified blocks
                saveData.modifiedBlocks.forEach(b => {
                    const [x, y, z] = b.pos.split(",").map(Number);
                    this.addBlock(x, y, z, b.type, true); // Mark as player-placed
                });

                this.player = saveData.player;

                // Restore seed if available, otherwise generate new one
                if (saveData.worldSeed) {
                    this.worldSeed = saveData.worldSeed;
                    this.seededRandom = this.createSeededRandom(this.worldSeed);
                } else {
                    // For backwards compatibility with old saves
                    this.worldSeed = this.generateInitialSeed();
                    this.seededRandom = this.createSeededRandom(this.worldSeed);
                }

                this.updateStatus(`World loaded (${saveData.modifiedBlocks.length} custom blocks)`);
                return true;
            } catch (error) {
                console.error("Load failed:", error);
                this.updateStatus("Load failed");
                return false;
            }
        };

        // Day/Night Cycle update method
        this.updateDayNightCycle = () => {
            if (!this.dayNightCycle.isActive) return;

            const now = Date.now();
            const deltaTime = (now - this.dayNightCycle.lastUpdate) / 1000; // Convert to seconds
            this.dayNightCycle.lastUpdate = now;

            // Update time (cycleDuration seconds = 24 hours)
            this.dayNightCycle.currentTime += (24 / this.dayNightCycle.cycleDuration) * deltaTime * this.dayNightCycle.timeScale;
            if (this.dayNightCycle.currentTime >= 24) {
                this.dayNightCycle.currentTime -= 24;
            }

            // Calculate sun position based on time of day
            const sunAngle = ((this.dayNightCycle.currentTime - 6) / 12) * Math.PI; // Sun rises at 6am, peaks at noon, sets at 6pm
            const sunX = Math.cos(sunAngle) * 20;
            const sunY = Math.max(0.1, Math.sin(sunAngle) * 20); // Keep light slightly above horizon
            const sunZ = 0;

            this.dayNightCycle.directionalLight.position.set(sunX, sunY, sunZ);

            // Adjust light intensity and color based on time
            let intensity, color, ambientIntensity, skyColor;

            if (this.dayNightCycle.currentTime >= 6 && this.dayNightCycle.currentTime < 8) {
                // Dawn (6am-8am) - orange/red light
                intensity = 0.3 + ((this.dayNightCycle.currentTime - 6) / 2) * 0.5;
                color = new THREE.Color().lerpColors(new THREE.Color(0xff4500), new THREE.Color(0xffffff), (this.dayNightCycle.currentTime - 6) / 2);
                ambientIntensity = 0.2 + ((this.dayNightCycle.currentTime - 6) / 2) * 0.3;
                skyColor = new THREE.Color().lerpColors(new THREE.Color(0x2c1810), new THREE.Color(0x87ceeb), (this.dayNightCycle.currentTime - 6) / 2);
            } else if (this.dayNightCycle.currentTime >= 8 && this.dayNightCycle.currentTime < 17) {
                // Day (8am-5pm) - full white light
                intensity = 0.8;
                color = new THREE.Color(0xffffff);
                ambientIntensity = 0.5;
                skyColor = new THREE.Color(0x87ceeb); // Sky blue
            } else if (this.dayNightCycle.currentTime >= 17 && this.dayNightCycle.currentTime < 19) {
                // Dusk (5pm-7pm) - orange/red fading
                intensity = 0.8 - ((this.dayNightCycle.currentTime - 17) / 2) * 0.6;
                color = new THREE.Color().lerpColors(new THREE.Color(0xffffff), new THREE.Color(0xff4500), (this.dayNightCycle.currentTime - 17) / 2);
                ambientIntensity = 0.5 - ((this.dayNightCycle.currentTime - 17) / 2) * 0.3;
                skyColor = new THREE.Color().lerpColors(new THREE.Color(0x87ceeb), new THREE.Color(0xff6b35), (this.dayNightCycle.currentTime - 17) / 2);
            } else if (this.dayNightCycle.currentTime >= 19 && this.dayNightCycle.currentTime < 21) {
                // Evening (7pm-9pm) - dim blue
                intensity = 0.2 - ((this.dayNightCycle.currentTime - 19) / 2) * 0.15;
                color = new THREE.Color().lerpColors(new THREE.Color(0xff4500), new THREE.Color(0x4169e1), (this.dayNightCycle.currentTime - 19) / 2);
                ambientIntensity = 0.2 - ((this.dayNightCycle.currentTime - 19) / 2) * 0.15;
                skyColor = new THREE.Color().lerpColors(new THREE.Color(0xff6b35), new THREE.Color(0x1a1a2e), (this.dayNightCycle.currentTime - 19) / 2);
            } else {
                // Night (9pm-6am) - very dim blue
                intensity = 0.05;
                color = new THREE.Color(0x4169e1);
                ambientIntensity = 0.05;
                skyColor = new THREE.Color(0x0a0a0f); // Very dark blue/black
            }

            this.dayNightCycle.directionalLight.intensity = intensity;
            this.dayNightCycle.directionalLight.color.copy(color);
            this.dayNightCycle.ambientLight.intensity = ambientIntensity;
            this.scene.background = skyColor;

            // Update time indicator icon and color
            this.updateTimeIndicator();
        };

        // Update time indicator based on current time
        this.updateTimeIndicator = () => {
            if (!this.timeIndicator) return;

            const time = this.dayNightCycle.currentTime;
            let icon, color, title;

            if (time >= 6 && time < 8) {
                // Dawn - sunrise
                icon = 'wb_twilight';
                color = '#FF8C00'; // Orange
                title = 'Dawn - Click for menu';
            } else if (time >= 8 && time < 17) {
                // Day - sun
                icon = 'wb_sunny';
                color = '#FFD700'; // Gold
                title = 'Daytime - Click for menu';
            } else if (time >= 17 && time < 19) {
                // Dusk - sunset
                icon = 'wb_twighlight';
                color = '#FF6347'; // Tomato red
                title = 'Sunset - Click for menu';
            } else if (time >= 19 && time < 21) {
                // Evening - moon rise
                icon = 'brightness_2';
                color = '#9370DB'; // Medium purple
                title = 'Evening - Click for menu';
            } else {
                // Night - full moon
                icon = 'brightness_3';
                color = '#C0C0C0'; // Silver
                title = 'Nighttime - Click for menu';
            }

            this.timeIndicator.textContent = icon;
            this.timeIndicator.style.color = color;
            this.timeIndicator.title = title;
        };

        // Update mini-map
        this.updateMiniMap = () => {
            if (!this.miniMap || !this.miniMapContext) return;

            const ctx = this.miniMapContext;
            const size = 120;
            const scale = 0.5; // How many world units per pixel
            const viewRadius = size * scale / 2;

            // Clear canvas
            ctx.fillStyle = '#000011';
            ctx.fillRect(0, 0, size, size);

            // Draw terrain
            for (let x = -viewRadius; x < viewRadius; x += 2) {
                for (let z = -viewRadius; z < viewRadius; z += 2) {
                    const worldX = Math.floor(this.player.position.x + x);
                    const worldZ = Math.floor(this.player.position.z + z);

                    const biome = this.getBiomeAt(worldX, worldZ);

                    // Convert world coordinates to mini-map coordinates
                    const mapX = size/2 + x / scale;
                    const mapZ = size/2 + z / scale;

                    if (mapX >= 0 && mapX < size && mapZ >= 0 && mapZ < size) {
                        ctx.fillStyle = biome.mapColor;
                        ctx.fillRect(mapX, mapZ, 2, 2);
                    }
                }
            }

            // Draw player position (red dot)
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(size/2, size/2, 3, 0, Math.PI * 2);
            ctx.fill();

            // Draw player direction (small line)
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(size/2, size/2);
            ctx.lineTo(
                size/2 + Math.sin(this.player.rotation.y) * 8,
                size/2 + Math.cos(this.player.rotation.y) * 8
            );
            ctx.stroke();
        };

        // Improved movement with gravity and chunk loading
        let lastChunkUpdate = 0;
        let lastTime = 0;
        const animate = (currentTime = 0) => {
            this.animationId = requestAnimationFrame(animate);
            
            // Calculate delta time for FPS-independent movement
            const deltaTime = Math.min((currentTime - lastTime) / 1000, 1/30); // Cap at 30 FPS minimum
            lastTime = currentTime;
            
            // Always continue animation loop, but skip input processing if paused or controls disabled
            if (this.isPaused || !this.controlsEnabled) {
                // Still render the scene even when paused
                this.renderer.render(this.scene, this.camera);
                return;
            }
            
            const speed = 4.0; // Units per second
            const jumpSpeed = 8.0; // Jump velocity
            const gravity = 20.0; // Gravity acceleration
            
            // Handle movement
            const dir = new THREE.Vector3();

            // Keyboard input (desktop)
            if (this.keys["w"]) dir.z -= 1;
            if (this.keys["s"]) dir.z += 1;
            if (this.keys["a"]) dir.x -= 1;
            if (this.keys["d"]) dir.x += 1;
            if (this.keys[" "]) this.player.velocity = this.player.velocity || jumpSpeed; // Spacebar to jump

            // Mobile joystick input
            if (this.isMobile) {
                dir.x += this.leftJoystickValue.x;
                dir.z += this.leftJoystickValue.y;

                // Mobile jump (if right joystick pressed up)
                if (this.rightJoystickValue.y < -0.5) {
                    this.player.velocity = this.player.velocity || jumpSpeed;
                }
            }
            
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
            const moveSpeed = speed * deltaTime;
            
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
            this.player.velocity -= gravity * deltaTime; // Apply gravity over time
            this.player.position.y += this.player.velocity * deltaTime; // Apply velocity over time
            
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
            this.camera.position.set(this.player.position.x, this.player.position.y, this.player.position.z);

            // Mobile camera controls
            if (this.isMobile && this.rightJoystickActive) {
                const cameraSpeed = 2.0 * deltaTime;
                this.player.rotation.y += this.rightJoystickValue.x * cameraSpeed;
                this.player.rotation.x += this.rightJoystickValue.y * cameraSpeed;

                // Clamp vertical rotation
                const maxLookUp = Math.PI / 2 - 0.1;
                const maxLookDown = -Math.PI / 2 + 0.1;
                this.player.rotation.x = Math.max(maxLookDown, Math.min(maxLookUp, this.player.rotation.x));
            }

            // Use quaternions for stable rotation
            const yawQuaternion = new THREE.Quaternion();
            const pitchQuaternion = new THREE.Quaternion();
            
            yawQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.player.rotation.y);
            pitchQuaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.player.rotation.x);
            
            // Combine rotations: yaw first, then pitch
            const finalQuaternion = new THREE.Quaternion();
            finalQuaternion.multiplyQuaternions(yawQuaternion, pitchQuaternion);
            
            this.camera.quaternion.copy(finalQuaternion);

            // Update target highlight every frame for responsive feedback
            this.updateTargetHighlight();

            // Update day/night cycle
            this.updateDayNightCycle();

            // Update mini-map
            this.updateMiniMap();

            this.renderer.render(this.scene, this.camera);
        };
        animate();

        // Handle window resize (fullscreen)
        window.addEventListener('resize', () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            this.renderer.setSize(width, height);
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        });

        // Keyboard controls
        const keydownHandler = (e) => {
            if (!this.controlsEnabled) return;
            
            const key = e.key.toLowerCase();
            
            // Movement keys
            if (['w', 'a', 's', 'd', ' '].includes(key)) {
                this.keys[key] = true;
                e.preventDefault();
            }
            
            // Hotbar selection (1-9)
            if (key >= '1' && key <= '9') {
                const slot = parseInt(key) - 1;
                if (slot < this.hotbarSlots.length) {
                    this.selectedSlot = slot;
                    console.log(`Selected hotbar slot ${slot + 1}: ${this.hotbarSlots[slot]}`);
                }
                e.preventDefault();
            }
            
            // Q and E for hotbar navigation
            if (key === 'q') {
                this.selectedSlot = (this.selectedSlot - 1 + this.hotbarSlots.length) % this.hotbarSlots.length;
                console.log(`Selected hotbar slot ${this.selectedSlot + 1}: ${this.hotbarSlots[this.selectedSlot]}`);
                e.preventDefault();
            }
            if (key === 'e') {
                this.selectedSlot = (this.selectedSlot + 1) % this.hotbarSlots.length;
                console.log(`Selected hotbar slot ${this.selectedSlot + 1}: ${this.hotbarSlots[this.selectedSlot]}`);
                e.preventDefault();
            }
        };
        
        const keyupHandler = (e) => {
            if (!this.controlsEnabled) return;
            
            const key = e.key.toLowerCase();
            if (['w', 'a', 's', 'd', ' '].includes(key)) {
                this.keys[key] = false;
                e.preventDefault();
            }
        };
        
        document.addEventListener('keydown', keydownHandler);
        document.addEventListener('keyup', keyupHandler);
        this.eventListeners.push(
            { element: document, type: 'keydown', handler: keydownHandler },
            { element: document, type: 'keyup', handler: keyupHandler }
        );

        // Mouse controls - request pointer lock on canvas click
        this.renderer.domElement.addEventListener('click', () => {
            if (!document.pointerLockElement) {
                this.renderer.domElement.requestPointerLock();
            }
        });

        // Mouse look
        const mousemoveHandler = (e) => {
            if (document.pointerLockElement === this.renderer.domElement && this.controlsEnabled) {
                this.player.rotation.y -= e.movementX * 0.002;
                this.player.rotation.x -= e.movementY * 0.002;
                // Clamp vertical rotation to prevent flipping upside down
                const maxLookUp = Math.PI / 2 - 0.1;   // Almost straight up
                const maxLookDown = -Math.PI / 2 + 0.1; // Almost straight down
                this.player.rotation.x = Math.max(maxLookDown, Math.min(maxLookUp, this.player.rotation.x));
            }
        };
        document.addEventListener('mousemove', mousemoveHandler);
        this.eventListeners.push({ element: document, type: 'mousemove', handler: mousemoveHandler });

        // Block interaction with raycasting
        const mouse = new THREE.Vector2();
        
        // Block highlight system
        let currentHighlight = null;

        const mousedownHandler = (e) => {
            if (!this.controlsEnabled || document.pointerLockElement !== this.renderer.domElement) return;
            
            // Change highlight color based on button
            if (e.button === 0) { // Left click - red for removal
                this.targetHighlight.material.color.setHex(0xff0000);
            } else if (e.button === 2) { // Right click - green for placement
                this.targetHighlight.material.color.setHex(0x00ff00);
            }
            
            // Update raycaster
            this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
            const intersects = this.raycaster.intersectObjects(this.scene.children.filter(obj => obj.isMesh && obj !== this.targetHighlight));
            
            if (intersects.length > 0) {
                const hit = intersects[0];
                const pos = hit.object.position.clone();
                
                if (e.button === 0) { // Left click - remove block
                    this.removeBlock(pos.x, pos.y, pos.z);
                } else if (e.button === 2) { // Right click - place block
                    const normal = hit.face.normal;
                    const placePos = pos.clone().add(normal);
                    const selectedBlock = this.hotbarSlots[this.selectedSlot];
                    
                    if (this.inventory[selectedBlock] > 0) {
                        this.addBlock(placePos.x, placePos.y, placePos.z, selectedBlock, true);
                        this.inventory[selectedBlock]--;
                        console.log(`Placed ${selectedBlock}, ${this.inventory[selectedBlock]} remaining`);
                    } else {
                        console.log(`No ${selectedBlock} in inventory!`);
                    }
                }
            }
        };
        
        const mouseupHandler = (e) => {
            // Reset highlight color to default (green for placement)
            this.targetHighlight.material.color.setHex(0x00ff00);
        };
        
        document.addEventListener('mousedown', mousedownHandler);
        document.addEventListener('mouseup', mouseupHandler);
        this.eventListeners.push(
            { element: document, type: 'mousedown', handler: mousedownHandler },
            { element: document, type: 'mouseup', handler: mouseupHandler }
        );

        // Auto-save on page unload
        this.saveWorldHandler = () => this.saveWorld();
        window.addEventListener("beforeunload", this.saveWorldHandler);
        this.eventListeners.push({ element: window, type: 'beforeunload', handler: this.saveWorldHandler });

        // UI Elements
        this.createContentArea = () => {
            const contentArea = document.createElement('div');
            contentArea.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 1000;
            `;
            this.container.appendChild(contentArea);
            return contentArea;
        };

        this.createStatusBar = () => {
            const statusBar = document.createElement('div');
            statusBar.style.cssText = `
                position: absolute;
                bottom: 16px;
                left: 16px;
                background: rgba(0,0,0,0.7);
                color: white;
                padding: 8px 16px;
                border-radius: 6px;
                font-family: monospace;
                font-size: 14px;
                pointer-events: auto;
                z-index: 1000;
            `;
            statusBar.textContent = "Ready";
            this.container.appendChild(statusBar);
            return statusBar;
        };

        // Create UI elements
        const contentArea = this.createContentArea();
        const statusBar = this.createStatusBar();

        // Time indicator icon (replaces menu button)
        this.timeIndicator = document.createElement('i');
        this.timeIndicator.className = 'material-icons';
        this.timeIndicator.textContent = 'wb_sunny'; // Default to sun
        this.timeIndicator.style.cssText = `
            position: absolute;
            top: 16px;
            left: 16px;
            z-index: 2000;
            font-size: 32px;
            color: #FFD700;
            cursor: pointer;
            pointer-events: auto;
            text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
            transition: all 0.3s ease;
        `;
        this.timeIndicator.title = 'Click to open menu';
        contentArea.appendChild(this.timeIndicator);

        // Mini-map
        this.miniMap = document.createElement('canvas');
        this.miniMap.width = 120;
        this.miniMap.height = 120;
        this.miniMap.style.cssText = `
            position: absolute;
            bottom: 16px;
            right: 16px;
            z-index: 2000;
            border: 2px solid rgba(255,255,255,0.8);
            border-radius: 8px;
            background: rgba(0,0,0,0.7);
            pointer-events: auto;
        `;
        this.miniMap.title = 'Mini-map showing biomes and your position';
        contentArea.appendChild(this.miniMap);
        this.miniMapContext = this.miniMap.getContext('2d');

        // Modal menu overlay (centered)
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.6);
            display: none;
            z-index: 3000;
            pointer-events: auto;
        `;
        modal.innerHTML = `
            <div style="background: rgba(40,40,40,0.95); border-radius: 12px; padding: 24px 32px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); display: flex; flex-direction: column; gap: 18px; align-items: center; min-width: 220px;">
                <h2 style="margin:0 0 12px 0; color: white; font-size: 20px;">Voxel World Menu</h2>
                <button id="modal-newgame-btn" style="font-size: 16px; padding: 8px 24px; background: #FF9800; color: white; border: none; border-radius: 6px; cursor: pointer;">🎲 New Game</button>
                <button id="modal-benchmark-btn" style="font-size: 16px; padding: 8px 24px; background: #9C27B0; color: white; border: none; border-radius: 6px; cursor: pointer;">⚡ Re-run Benchmark</button>
                <button id="modal-save-btn" style="font-size: 16px; padding: 8px 24px; background: #4CAF50; color: white; border: none; border-radius: 6px; cursor: pointer;">💾 Save Game</button>
                <button id="modal-load-btn" style="font-size: 16px; padding: 8px 24px; background: #2196F3; color: white; border: none; border-radius: 6px; cursor: pointer;">📂 Load Game</button>
                <button id="modal-delete-btn" style="font-size: 16px; padding: 8px 24px; background: #f44336; color: white; border: none; border-radius: 6px; cursor: pointer;">🗑 Delete Save</button>
                <button id="modal-close-btn" style="margin-top: 12px; font-size: 14px; padding: 6px 18px; background: #666; color: white; border-radius: 6px; cursor: pointer;">Close Menu</button>
            </div>
        `;
        contentArea.appendChild(modal);

        // Time indicator click handler (opens menu)
        this.timeIndicator.onclick = () => {
            modal.style.display = 'block';
        };

        const modalSaveBtn = modal.querySelector("#modal-save-btn");
        const modalLoadBtn = modal.querySelector("#modal-load-btn");
        const modalDeleteBtn = modal.querySelector("#modal-delete-btn");
        const modalNewGameBtn = modal.querySelector("#modal-newgame-btn");
        const modalBenchmarkBtn = modal.querySelector("#modal-benchmark-btn");
        const modalCloseBtn = modal.querySelector("#modal-close-btn");

        const saveWorld = () => {
            this.saveWorld();
            modal.style.display = 'none';
        };

        const loadWorld = () => {
            this.loadWorld();
            modal.style.display = 'none';
        };

        const deleteSave = () => {
            localStorage.removeItem("NebulaWorld");
            this.updateStatus("Save deleted");
            modal.style.display = 'none';
        };

        const newGame = () => {
            const seedString = prompt("Enter a seed (leave empty for random):", "");
            this.newGame(seedString);
            modal.style.display = 'none';
        };

        const reRunBenchmark = async () => {
            modal.style.display = 'none';
            // Clear stored benchmark result to force re-run
            localStorage.removeItem('voxelWorld_performanceBenchmark');
            await this.runPerformanceBenchmark();
        };

        if (modalSaveBtn) modalSaveBtn.onclick = saveWorld;
        if (modalLoadBtn) modalLoadBtn.onclick = loadWorld;
        if (modalDeleteBtn) modalDeleteBtn.onclick = deleteSave;
        if (modalNewGameBtn) modalNewGameBtn.onclick = newGame;
        if (modalBenchmarkBtn) modalBenchmarkBtn.onclick = reRunBenchmark;
        if (modalCloseBtn) modalCloseBtn.onclick = () => modal.style.display = 'none';

        // Update status bar reference
        this.statusBar = statusBar;
        this.updateStatus = (message) => {
            console.log(`[VoxelWorld] ${message}`);
            if (this.statusBar) {
                this.statusBar.textContent = message;
            }
        };

        // Create mobile virtual joysticks if on mobile device
        if (this.isMobile) {
            this.createMobileJoysticks(contentArea);
        }
    }

    // Create mobile virtual joysticks
    createMobileJoysticks(contentArea) {
        // Left joystick (movement)
        this.leftJoystick = document.createElement('div');
        this.leftJoystick.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 20px;
            width: 120px;
            height: 120px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 50%;
            border: 2px solid rgba(255, 255, 255, 0.5);
            pointer-events: auto;
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const leftStick = document.createElement('div');
        leftStick.style.cssText = `
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.8);
            border-radius: 50%;
            pointer-events: none;
            transition: transform 0.1s ease;
        `;
        this.leftJoystick.appendChild(leftStick);
        this.leftJoystick.stick = leftStick;

        // Right joystick (camera)
        this.rightJoystick = document.createElement('div');
        this.rightJoystick.style.cssText = `
            position: absolute;
            bottom: 20px;
            right: 20px;
            width: 120px;
            height: 120px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 50%;
            border: 2px solid rgba(255, 255, 255, 0.5);
            pointer-events: auto;
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const rightStick = document.createElement('div');
        rightStick.style.cssText = `
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.8);
            border-radius: 50%;
            pointer-events: none;
            transition: transform 0.1s ease;
        `;
        this.rightJoystick.appendChild(rightStick);
        this.rightJoystick.stick = rightStick;

        contentArea.appendChild(this.leftJoystick);
        contentArea.appendChild(this.rightJoystick);

        // Touch event handlers
        this.setupMobileTouchHandlers();
    }

    // Setup mobile touch event handlers
    setupMobileTouchHandlers() {
        // Left joystick (movement)
        this.leftJoystick.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.leftJoystickActive = true;
            const rect = this.leftJoystick.getBoundingClientRect();
            this.leftJoystickCenter.x = rect.left + rect.width / 2;
            this.leftJoystickCenter.y = rect.top + rect.height / 2;
            this.updateJoystick(e.touches[0], this.leftJoystick, 'left');
        });

        this.leftJoystick.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.leftJoystickActive) {
                this.updateJoystick(e.touches[0], this.leftJoystick, 'left');
            }
        });

        this.leftJoystick.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.leftJoystickActive = false;
            this.leftJoystickValue = { x: 0, y: 0 };
            this.leftJoystick.stick.style.transform = 'translate(0px, 0px)';
        });

        // Right joystick (camera)
        this.rightJoystick.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.rightJoystickActive = true;
            const rect = this.rightJoystick.getBoundingClientRect();
            this.rightJoystickCenter.x = rect.left + rect.width / 2;
            this.rightJoystickCenter.y = rect.top + rect.height / 2;
            this.updateJoystick(e.touches[0], this.rightJoystick, 'right');
        });

        this.rightJoystick.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.rightJoystickActive) {
                this.updateJoystick(e.touches[0], this.rightJoystick, 'right');
            }
        });

        this.rightJoystick.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.rightJoystickActive = false;
            this.rightJoystickValue = { x: 0, y: 0 };
            this.rightJoystick.stick.style.transform = 'translate(0px, 0px)';
        });

        // Block placement on mobile (tap on screen)
        this.renderer.domElement.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1 && !this.leftJoystickActive && !this.rightJoystickActive) {
                // Single tap for block placement/removal
                this.handleMobileBlockInteraction(e.touches[0]);
            }
        });
    }

    // Update joystick position and value
    updateJoystick(touch, joystick, side) {
        const rect = joystick.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let deltaX = touch.clientX - centerX;
        let deltaY = touch.clientY - centerY;

        // Limit to joystick radius
        const maxDistance = rect.width / 2 - 20;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance > maxDistance) {
            deltaX = (deltaX / distance) * maxDistance;
            deltaY = (deltaY / distance) * maxDistance;
        }

        // Update stick position
        joystick.stick.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

        // Update joystick value (-1 to 1)
        const value = {
            x: deltaX / maxDistance,
            y: deltaY / maxDistance
        };

        if (side === 'left') {
            this.leftJoystickValue = value;
        } else {
            this.rightJoystickValue = value;
        }
    }

    // Handle mobile block placement/removal
    handleMobileBlockInteraction(touch) {
        // Update raycaster for touch position
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children.filter(obj => obj.isMesh && obj !== this.targetHighlight));

        if (intersects.length > 0) {
            const hit = intersects[0];
            const pos = hit.object.position.clone();

            // For mobile, we'll use a simple tap-to-remove, double-tap-to-place system
            // For now, just remove blocks on tap
            this.removeBlock(pos.x, pos.y, pos.z);
            this.updateStatus('Block removed (tap to remove)');
        }
    }
}

export async function initVoxelWorld(container) {
    const app = new NebulaVoxelApp(container);

    // Run performance benchmark on first load
    await app.runPerformanceBenchmark();

    return app;
}
