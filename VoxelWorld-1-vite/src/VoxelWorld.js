import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { WorkbenchSystem } from './WorkbenchSystem.js';

class NebulaVoxelApp {
    constructor(container) {
        // Initialize properties
        this.world = {};
        this.loadedChunks = new Set();
        this.chunkSize = 8;  // Reduced from 12 for better performance
        this.renderDistance = 1;  // Reduced from 2 for better performance
        this.chunkCleanupRadius = 12; // Keep tracking data for chunks within this radius
        
        // World item spawning system
        this.visitedChunks = new Set(); // Track chunks that have been visited
        this.chunkSpawnTimes = new Map(); // Track last spawn time for chunks
        this.gameStartTime = Date.now(); // Track game start for time-based respawns
        this.player = {
            position: { x: 0, y: 10, z: 0 },
            rotation: { x: 0, y: 0 }
        };
        this.isOnGround = false;
        this.keys = {};
        this.selectedSlot = 0;
        this.hasBackpack = false; // Track if player found backpack
        this.backpackPosition = null; // Track backpack location for minimap

        // Punch-to-harvest system
        this.isHarvesting = false;
        this.harvestingTarget = null;
        this.harvestingStartTime = 0;
        this.harvestingDuration = 0;
        // Legacy inventory removed - using pure slot-based system
        // NEW: Slot-based inventory system (replaces old string array)
        this.hotbarSlots = [
            { itemType: 'grass', quantity: 0 },
            { itemType: 'stone', quantity: 0 },
            { itemType: 'wood', quantity: 0 },
            { itemType: 'workbench', quantity: 0 },
            { itemType: null, quantity: 0 } // 5th slot for backpack button
        ];

        // Keep old system for backwards compatibility during transition
        this.legacyHotbarSlots = ['grass', 'stone', 'wood', 'workbench'];

        // NEW: Backpack slots (25 slots total)
        this.backpackSlots = [];
        for (let i = 0; i < 25; i++) {
            this.backpackSlots.push({ itemType: null, quantity: 0 });
        }

        // Stack limit for items per slot
        this.STACK_LIMIT = 8;

        // Slot helper functions
        this.getHotbarSlot = (index) => {
            return this.hotbarSlots[index] || null;
        };

        this.setHotbarSlot = (index, itemType, quantity) => {
            if (index >= 0 && index < this.hotbarSlots.length) {
                this.hotbarSlots[index] = { itemType, quantity: Math.min(quantity, this.STACK_LIMIT) };
            }
        };

        this.findEmptyHotbarSlot = () => {
            for (let i = 0; i < this.hotbarSlots.length - 1; i++) { // Exclude backpack button slot
                if (!this.hotbarSlots[i].itemType || this.hotbarSlots[i].quantity === 0) {
                    return i;
                }
            }
            return -1;
        };

        this.getBackpackSlot = (index) => {
            return this.backpackSlots[index] || null;
        };

        this.setBackpackSlot = (index, itemType, quantity) => {
            if (index >= 0 && index < this.backpackSlots.length) {
                this.backpackSlots[index] = { itemType, quantity: Math.min(quantity, this.STACK_LIMIT) };
            }
        };

        this.findEmptyBackpackSlot = () => {
            for (let i = 0; i < this.backpackSlots.length; i++) {
                if (!this.backpackSlots[i].itemType || this.backpackSlots[i].quantity === 0) {
                    return i;
                }
            }
            return -1;
        };

        this.findItemInSlots = (itemType) => {
            // Check hotbar first (excluding backpack button)
            for (let i = 0; i < this.hotbarSlots.length - 1; i++) {
                if (this.hotbarSlots[i].itemType === itemType && this.hotbarSlots[i].quantity < this.STACK_LIMIT) {
                    return { location: 'hotbar', index: i };
                }
            }
            // Then check backpack
            for (let i = 0; i < this.backpackSlots.length; i++) {
                if (this.backpackSlots[i].itemType === itemType && this.backpackSlots[i].quantity < this.STACK_LIMIT) {
                    return { location: 'backpack', index: i };
                }
            }
            return null; // Item not found or all stacks are full
        };

        this.countItemInSlots = (itemType) => {
            let total = 0;
            // Count in hotbar (excluding backpack button)
            for (let i = 0; i < this.hotbarSlots.length - 1; i++) {
                if (this.hotbarSlots[i].itemType === itemType) {
                    total += this.hotbarSlots[i].quantity;
                }
            }
            // Count in backpack
            for (let i = 0; i < this.backpackSlots.length; i++) {
                if (this.backpackSlots[i].itemType === itemType) {
                    total += this.backpackSlots[i].quantity;
                }
            }
            return total;
        };

        this.getAllMaterialsFromSlots = () => {
            const materials = {};
            // Check hotbar (excluding backpack button)
            for (let i = 0; i < this.hotbarSlots.length - 1; i++) {
                const slot = this.hotbarSlots[i];
                if (slot.itemType && slot.quantity > 0) {
                    materials[slot.itemType] = (materials[slot.itemType] || 0) + slot.quantity;
                }
            }
            // Check backpack
            for (let i = 0; i < this.backpackSlots.length; i++) {
                const slot = this.backpackSlots[i];
                if (slot.itemType && slot.quantity > 0) {
                    materials[slot.itemType] = (materials[slot.itemType] || 0) + slot.quantity;
                }
            }
            return materials;
        };

        this.removeFromInventory = (itemType, quantity = 1) => {
            let remaining = quantity;

            // First check hotbar (excluding backpack button)
            for (let i = 0; i < this.hotbarSlots.length - 1 && remaining > 0; i++) {
                const slot = this.hotbarSlots[i];
                if (slot.itemType === itemType && slot.quantity > 0) {
                    const removeAmount = Math.min(slot.quantity, remaining);
                    slot.quantity -= removeAmount;
                    remaining -= removeAmount;

                    // Clear slot if empty
                    if (slot.quantity === 0) {
                        slot.itemType = '';
                    }
                }
            }

            // Then check backpack
            for (let i = 0; i < this.backpackSlots.length && remaining > 0; i++) {
                const slot = this.backpackSlots[i];
                if (slot.itemType === itemType && slot.quantity > 0) {
                    const removeAmount = Math.min(slot.quantity, remaining);
                    slot.quantity -= removeAmount;
                    remaining -= removeAmount;

                    // Clear slot if empty
                    if (slot.quantity === 0) {
                        slot.itemType = '';
                    }
                }
            }

            // Update UI
            this.updateHotbarCounts();
            this.updateBackpackInventoryDisplay();

            return quantity - remaining; // Return how many were actually removed
        };

        // Smart inventory addition that respects stacking
        this.addToInventory = (itemType, quantity = 1) => {
            let remaining = quantity;

            // First, try to add to existing stacks
            while (remaining > 0) {
                const existingSlot = this.findItemInSlots(itemType);
                if (existingSlot) {
                    const slot = existingSlot.location === 'hotbar'
                        ? this.hotbarSlots[existingSlot.index]
                        : this.backpackSlots[existingSlot.index];

                    const canAdd = Math.min(remaining, this.STACK_LIMIT - slot.quantity);
                    slot.quantity += canAdd;
                    remaining -= canAdd;
                } else {
                    // No existing stack with space, find empty slot
                    const emptyHotbar = this.findEmptyHotbarSlot();
                    if (emptyHotbar !== -1) {
                        const canAdd = Math.min(remaining, this.STACK_LIMIT);
                        this.setHotbarSlot(emptyHotbar, itemType, canAdd);
                        remaining -= canAdd;
                    } else {
                        const emptyBackpack = this.findEmptyBackpackSlot();
                        if (emptyBackpack !== -1) {
                            const canAdd = Math.min(remaining, this.STACK_LIMIT);
                            this.setBackpackSlot(emptyBackpack, itemType, canAdd);
                            remaining -= canAdd;
                        } else {
                            // No space left
                            console.warn(`No space for ${remaining} ${itemType} items`);
                            break;
                        }
                    }
                }
            }

            // Pure slot-based system - no legacy inventory needed

            // Update UI
            this.updateHotbarCounts();
            this.updateBackpackInventoryDisplay();

            return quantity - remaining; // Return how many were actually added
        };

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

        // Initialize new WorkbenchSystem
        this.workbenchSystem = new WorkbenchSystem(this);

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

            // Create billboard sprite for special items
            let billboard = null;
            if (this.shouldUseBillboard(type)) {
                billboard = this.createBillboard(x, y, z, type);
                if (billboard) {
                    this.scene.add(billboard);
                }
            }

            this.world[`${x},${y},${z}`] = { type, mesh: cube, playerPlaced, billboard };
        };

        // 🎨 PHASE 2: 3D Object Creation Engine - Place crafted objects with real dimensions!
        this.placeCraftedObject = (x, y, z, itemId) => {
            console.log(`🎯 placeCraftedObject called: ${itemId} at (${x},${y},${z})`);

            // Get crafted item metadata
            const metadata = this.inventoryMetadata[itemId];
            if (!metadata) {
                console.error(`❌ No metadata found for crafted item: ${itemId}`);
                return;
            }

            console.log('📊 Crafted item metadata:', metadata);

            // Extract shape and dimensions
            const shapeType = metadata.shape.type;
            const dimensions = metadata.shape.dimensions;
            const material = metadata.material.type;
            const color = metadata.appearance.color;

            console.log(`🔧 Creating ${shapeType} (${dimensions.length}x${dimensions.width}x${dimensions.height}) from ${material}`);

            // Create geometry based on shape type and actual dimensions
            let geometry;
            switch (shapeType) {
                case 'cube':
                    geometry = new THREE.BoxGeometry(dimensions.length, dimensions.height, dimensions.width);
                    break;
                case 'sphere':
                    const radius = Math.max(dimensions.length, dimensions.width, dimensions.height) / 2;
                    geometry = new THREE.SphereGeometry(radius, 16, 16);
                    break;
                case 'cylinder':
                    const cylinderRadius = Math.max(dimensions.length, dimensions.width) / 2;
                    geometry = new THREE.CylinderGeometry(cylinderRadius, cylinderRadius, dimensions.height, 16);
                    break;
                case 'pyramid':
                    const pyramidRadius = Math.max(dimensions.length, dimensions.width) / 2;
                    geometry = new THREE.ConeGeometry(pyramidRadius, dimensions.height, 8);
                    break;
                case 'stairs':
                    // For now, create a simple box - can enhance later
                    geometry = new THREE.BoxGeometry(dimensions.length, dimensions.height, dimensions.width);
                    break;
                case 'wall':
                    geometry = new THREE.BoxGeometry(dimensions.length, dimensions.height, dimensions.width);
                    break;
                case 'hollow_cube':
                    // For now, create a regular box - can enhance with hollow geometry later
                    geometry = new THREE.BoxGeometry(dimensions.length, dimensions.height, dimensions.width);
                    break;
                default:
                    console.warn(`⚠️ Unknown shape type: ${shapeType}, defaulting to cube`);
                    geometry = new THREE.BoxGeometry(dimensions.length, dimensions.height, dimensions.width);
            }

            // Create material based on crafted item's material and color
            let craftedMaterial;
            if (this.blockTypes[material]) {
                // Use the base material type with custom color
                craftedMaterial = new THREE.MeshLambertMaterial({
                    map: this.materials[material].map,
                    color: new THREE.Color(color)
                });
            } else {
                // Fallback to basic colored material
                craftedMaterial = new THREE.MeshLambertMaterial({
                    color: new THREE.Color(color)
                });
            }

            // Create the 3D mesh
            const craftedObject = new THREE.Mesh(geometry, craftedMaterial);

            // PHASE 3: Smart Floor Positioning - treat target as floor surface
            const floorY = y; // Target position becomes the floor
            const objectY = floorY + dimensions.height / 2; // Object bottom sits on floor, center vertically

            // Handle objects larger than 1x1 footprint by centering them on target
            const objectX = x; // Center X on target
            const objectZ = z; // Center Z on target

            console.log(`📍 Positioning: Floor at Y=${floorY}, Object center at (${objectX}, ${objectY}, ${objectZ})`);
            console.log(`📏 Object footprint: ${dimensions.length}x${dimensions.width}, Height: ${dimensions.height}`);

            craftedObject.position.set(objectX, objectY, objectZ);

            // Set user data for identification
            craftedObject.userData = {
                type: 'craftedObject',
                itemId: itemId,
                metadata: metadata,
                originalName: metadata.name,
                dimensions: dimensions,
                isCraftedObject: true
            };

            // Add to scene
            this.scene.add(craftedObject);

            // PHASE 4: Track in crafted objects system
            if (!this.craftedObjects) {
                this.craftedObjects = {};
            }
            const objectKey = `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
            this.craftedObjects[objectKey] = {
                mesh: craftedObject,
                itemId: itemId,
                metadata: metadata,
                position: { x, y, z },
                dimensions: dimensions
            };

            console.log(`✅ Created crafted object "${metadata.name}" at (${x},${y},${z})`);
            this.updateStatus(`🎨 Placed "${metadata.name}"!`, 'craft');
        };

        // Check if block type should use billboard
        this.shouldUseBillboard = (type) => {
            const billboardTypes = ['backpack', 'shrub']; // Can expand: 'flower', 'crystal', etc.
            return billboardTypes.includes(type);
        };

        // Create emoji billboard sprite
        this.createBillboard = (x, y, z, type) => {
            const emojiConfig = {
                backpack: {
                    emoji: '🎒',
                    float: true,
                    rotate: true,
                    floatSpeed: 2.0,
                    floatAmount: 0.15
                },
                shrub: {
                    emoji: '🌿',
                    float: true,
                    rotate: false,
                    floatSpeed: 1.0,
                    floatAmount: 0.08
                },
                flower: {
                    emoji: '🌸',
                    float: true,
                    rotate: false,
                    floatSpeed: 0.8,
                    floatAmount: 0.05
                },
                crystal: {
                    emoji: '💎',
                    float: false,
                    rotate: true,
                    floatSpeed: 3.0,
                    floatAmount: 0.0
                }
            };

            const config = emojiConfig[type];
            if (!config) return null;

            // Create canvas with emoji
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 128;
            const ctx = canvas.getContext('2d');

            // Clear background
            ctx.clearRect(0, 0, 128, 128);

            // Draw emoji
            ctx.font = '96px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(config.emoji, 64, 64);

            // Create texture and sprite
            const texture = new THREE.CanvasTexture(canvas);
            texture.magFilter = THREE.LinearFilter;
            texture.minFilter = THREE.LinearFilter;

            const material = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                alphaTest: 0.1,
                sizeAttenuation: true // Proper perspective - smaller when far away
            });

            const sprite = new THREE.Sprite(material);
            sprite.position.set(x, y + 0.6, z); // Float above block
            sprite.scale.set(0.8, 0.8, 1); // Size

            // Add floating animation
            sprite.userData = {
                type: 'billboard',
                blockType: type,
                initialY: y + 0.6,
                animationTime: Math.random() * Math.PI * 2, // Random start phase
                config: config // Store animation config
            };

            return sprite;
        };

        // Animate floating billboards
        this.animateBillboards = (currentTime) => {
            for (const key in this.world) {
                const worldItem = this.world[key];
                if (worldItem.billboard && worldItem.billboard.userData.type === 'billboard') {
                    const billboard = worldItem.billboard;
                    const userData = billboard.userData;
                    const config = userData.config;

                    // Floating animation - if enabled
                    if (config.float) {
                        userData.animationTime += config.floatSpeed * 0.016; // Assume ~60fps (16ms)
                        const offset = Math.sin(userData.animationTime) * config.floatAmount;
                        billboard.position.y = userData.initialY + offset;
                    }

                    // Rotation animation - if enabled
                    if (config.rotate) {
                        billboard.material.rotation += 0.005; // Slow rotation
                    }
                }
            }
        };

        this.removeBlock = (x, y, z) => {
            const key = `${x},${y},${z}`;
            if (this.world[key]) {
                const blockData = this.world[key];

                // Check if it's a shrub for harvesting
                if (blockData.type === 'shrub') {
                    this.addToInventory('wood', 1); // Add 1 wood to inventory using slot system
                    const totalWood = this.countItemInSlots('wood');
                    console.log(`Harvested shrub! Wood: ${totalWood}`);
                    this.updateStatus(`Harvested shrub! Wood: ${totalWood}`);
                    // addToInventory already handles UI updates
                }
                // Check if it's a backpack for pickup
                else if (blockData.type === 'backpack' && !this.hasBackpack) {
                    this.hasBackpack = true; // Mark backpack as found
                    this.backpackPosition = null; // Remove from minimap
                    this.generateBackpackLoot(); // Add random starting items
                    this.showHotbarTutorial(); // Show hotbar and tutorial
                    console.log(`Found backpack! Hotbar unlocked!`);
                    this.updateStatus(`🎒 Found backpack! Use 1-4 for quick access, 5 to open storage!`, 'discovery');
                }
                // Random drop system for regular blocks
                else if (blockData.type === 'grass') {
                    // 10% chance to get dirt when harvesting grass
                    if (Math.random() < 0.1) {
                        this.addToInventory('dirt', 1);
                        this.updateStatus(`🪨 Found dirt!`, 'discovery');
                    }
                }
                else if (blockData.type === 'stone') {
                    // 5% chance to get coal when harvesting stone
                    if (Math.random() < 0.05) {
                        this.addToInventory('coal', 1);
                        this.updateStatus(`⚫ Found coal!`, 'discovery');
                    }
                }

                // Properly dispose of mesh geometry and material to prevent memory leaks
                if (blockData.mesh) {
                    this.scene.remove(blockData.mesh);
                    if (blockData.mesh.geometry) {
                        blockData.mesh.geometry.dispose();
                    }
                    // Don't dispose material as it's shared
                }

                // Also remove billboard if it exists
                if (blockData.billboard) {
                    this.scene.remove(blockData.billboard);
                    if (blockData.billboard.material && blockData.billboard.material.map) {
                        // Don't dispose shared textures
                    }
                }

                delete this.world[key];

                // Log removal for debugging
                console.log(`Removed block ${blockData.type} at (${x},${y},${z})`);
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

            // Spawn backpack near starting position
            this.spawnStartingBackpack();

            this.updateStatus(`New world generated with seed: ${this.worldSeed}`);
        };

        // Spawn backpack near player starting position
        this.spawnStartingBackpack = () => {
            if (this.hasBackpack) return; // Don't spawn if already found

            // Find a good spot 3-6 blocks away from spawn
            const spawnRadius = 3 + Math.floor(this.seededRandom() * 4); // 3-6 blocks away
            const angle = this.seededRandom() * Math.PI * 2; // Random direction

            const backpackX = Math.floor(Math.cos(angle) * spawnRadius);
            const backpackZ = Math.floor(Math.sin(angle) * spawnRadius);

            // Find ground level at that position
            let groundY = 0;
            for (let y = 5; y >= -5; y--) {
                const key = `${backpackX},${y},${backpackZ}`;
                if (this.world[key]) {
                    groundY = y + 1; // Place on top of ground
                    break;
                }
            }

            // Place backpack on ground
            this.addBlock(backpackX, groundY, backpackZ, 'backpack', false);
            this.backpackPosition = { x: backpackX, z: backpackZ }; // Store for minimap
            console.log(`Backpack spawned at ${backpackX}, ${groundY}, ${backpackZ}`);
        };

        // Generate random loot when backpack is found
        this.generateBackpackLoot = () => {
            // Helper function for random range
            const randomRange = (min, max) => Math.floor(this.seededRandom() * (max - min + 1)) + min;

            // BradCode - needs to not overwrite having workbench

            // Guaranteed items (survival essentials)
            const woodCount = randomRange(8, 16);
            this.addToInventory('wood', woodCount);
            const stoneCount = randomRange(4, 10);
            this.addToInventory('stone', stoneCount);
            this.addToInventory('workbench', 1);  // ESSENTIAL - needed for crafting system!

            
            // Common items (high chance)
            if (this.seededRandom() > 0.2) {
                const sandCount = randomRange(2, 6);
                this.addToInventory('sand', sandCount);
            }
            if (this.seededRandom() > 0.3) {
                const grassCount = randomRange(3, 8);
                this.addToInventory('grass', grassCount);
            }

            // Uncommon items (medium chance)
            if (this.seededRandom() > 0.5) {
                const glassCount = randomRange(1, 3);
                this.addToInventory('glass', glassCount);
            }
            if (this.seededRandom() > 0.6) {
                const brickCount = randomRange(1, 2);
                this.addToInventory('brick', brickCount);
            }
            if (this.seededRandom() > 0.7) {
                const flowersCount = randomRange(1, 3);
                this.addToInventory('flowers', flowersCount);
            }

            // Rare items (low chance but exciting!)
            if (this.seededRandom() > 0.8) {
                this.addToInventory('glowstone', 1);  // 20% chance - lucky!
            }
            if (this.seededRandom() > 0.9) {
                this.addToInventory('iron', 1);  // 10% chance - jackpot!
            }

            // Log what we found for excitement
            // Items automatically added to slots via addToInventory()
            console.log(`Backpack loot generated and added to slots!`);
            // Note: addToInventory() already handles UI updates
        };

        // World item spawning system for random discoveries
        this.cleanupChunkTracking = (playerChunkX, playerChunkZ) => {
            // Remove tracking data for chunks beyond cleanup radius to prevent memory bloat
            const chunksToRemove = [];
            
            // Check visitedChunks Set
            for (const chunkKey of this.visitedChunks) {
                const [chunkX, chunkZ] = chunkKey.split(',').map(Number);
                const distance = Math.max(
                    Math.abs(chunkX - playerChunkX),
                    Math.abs(chunkZ - playerChunkZ)
                );
                
                if (distance > this.chunkCleanupRadius) {
                    chunksToRemove.push(chunkKey);
                }
            }
            
            // Remove distant chunks from both data structures
            chunksToRemove.forEach(chunkKey => {
                this.visitedChunks.delete(chunkKey);
                this.chunkSpawnTimes.delete(chunkKey);
            });
            
            if (chunksToRemove.length > 0) {
                console.log(`Cleaned up tracking data for ${chunksToRemove.length} distant chunks`);
            }
        };

        this.checkChunkForWorldItems = (chunkX, chunkZ) => {
            const chunkKey = `${chunkX},${chunkZ}`;
            
            // Skip if already visited and not enough time has passed
            if (this.visitedChunks.has(chunkKey)) {
                const lastSpawnTime = this.chunkSpawnTimes.get(chunkKey) || 0;
                const timeSinceSpawn = Date.now() - lastSpawnTime;
                const twoGameDays = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds
                
                if (timeSinceSpawn < twoGameDays) {
                    return; // Not enough time has passed
                }
            }
            
            // Mark chunk as visited
            this.visitedChunks.add(chunkKey);
            this.chunkSpawnTimes.set(chunkKey, Date.now());
            
            // 5% chance to spawn random world items
            if (this.seededRandom() > 0.95) {
                this.spawnRandomWorldItems(chunkX, chunkZ);
            }
        };

        this.spawnRandomWorldItems = (chunkX, chunkZ) => {
            // Get biome at chunk center
            const centerX = chunkX * this.chunkSize + this.chunkSize / 2;
            const centerZ = chunkZ * this.chunkSize + this.chunkSize / 2;
            const biome = this.getBiomeAt(centerX, centerZ);
            
            let itemType = null;
            let emoji = null;
            
            // Spawn biome-appropriate items with multiple options and rarities
            const spawnRoll = this.seededRandom(); // 0-1 for rarity determination
            
            if (biome.surfaceBlock === 'sand') { // Desert biome
                if (spawnRoll > 0.7) { // 30% chance
                    itemType = 'skull';
                    emoji = '💀';
                }
                // Could add more desert items here later
            } else if (biome.name === 'Forest') { // Forest biome
                if (spawnRoll > 0.8) { // 20% chance for rare items
                    const forestItems = [
                        { type: 'mushroom', emoji: '🍄' },
                        { type: 'flower', emoji: '🌸' },
                        { type: 'berry', emoji: '🍓' }
                    ];
                    const selected = forestItems[Math.floor(this.seededRandom() * forestItems.length)];
                    itemType = selected.type;
                    emoji = selected.emoji;
                } else if (spawnRoll > 0.4) { // 40% chance for common items
                    itemType = 'leaf';
                    emoji = '🍃';
                }
            } else if (biome.name === 'Mountain') { // Mountain biome
                if (spawnRoll > 0.85) { // 15% chance for rare crystal
                    itemType = 'crystal';
                    emoji = '💎';
                } else if (spawnRoll > 0.6) { // 25% chance for ore nugget
                    itemType = 'oreNugget';
                    emoji = '⛰️';
                }
            } else if (biome.name === 'Plains') { // Plains biome
                if (spawnRoll > 0.8) { // 20% chance for rare items
                    const plainsItems = [
                        { type: 'wheat', emoji: '🌾' },
                        { type: 'feather', emoji: '🪶' },
                        { type: 'bone', emoji: '🦴' }
                    ];
                    const selected = plainsItems[Math.floor(this.seededRandom() * plainsItems.length)];
                    itemType = selected.type;
                    emoji = selected.emoji;
                }
            } else if (biome.name === 'Tundra') { // Tundra biome
                if (spawnRoll > 0.9) { // 10% chance for very rare items
                    const tundraItems = [
                        { type: 'shell', emoji: '🐚' },
                        { type: 'fur', emoji: '🐻‍❄️' },
                        { type: 'iceShard', emoji: '❄️' }
                    ];
                    const selected = tundraItems[Math.floor(this.seededRandom() * tundraItems.length)];
                    itemType = selected.type;
                    emoji = selected.emoji;
                }
            }
            
            // Rare equipment finds (very low chance across all biomes)
            if (spawnRoll > 0.98) { // 2% chance for equipment
                const equipmentItems = [
                    { type: 'rustySword', emoji: '⚔️' },
                    { type: 'oldPickaxe', emoji: '⛏️' },
                    { type: 'ancientAmulet', emoji: '📿' }
                ];
                const selected = equipmentItems[Math.floor(this.seededRandom() * equipmentItems.length)];
                itemType = selected.type;
                emoji = selected.emoji;
            }
            
            if (itemType && emoji) {
                // Find a good spot in the chunk
                const offsetX = Math.floor(this.seededRandom() * this.chunkSize);
                const offsetZ = Math.floor(this.seededRandom() * this.chunkSize);
                const worldX = chunkX * this.chunkSize + offsetX;
                const worldZ = chunkZ * this.chunkSize + offsetZ;
                
                // Find ground level
                let groundY = 0;
                for (let y = 10; y >= -5; y--) {
                    const key = `${worldX},${y},${worldZ}`;
                    if (this.world[key]) {
                        groundY = y + 1; // Place on top of ground
                        break;
                    }
                }
                
                // Create the world item
                this.createWorldItem(worldX, groundY, worldZ, itemType, emoji);
                console.log(`Spawned ${itemType} at ${worldX}, ${groundY}, ${worldZ} in ${biome.name} biome`);
            }
        };

        this.createWorldItem = (x, y, z, itemType, emoji) => {
            const key = `${x},${y},${z}`;
            
            // Create billboard sprite
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 128;
            const ctx = canvas.getContext('2d');
            
            // Clear background
            ctx.clearRect(0, 0, 128, 128);
            
            // Draw emoji
            ctx.font = '96px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(emoji, 64, 64);
            
            // Create texture and sprite
            const texture = new THREE.CanvasTexture(canvas);
            texture.magFilter = THREE.LinearFilter;
            texture.minFilter = THREE.LinearFilter;
            
            const material = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
            });
            
            const sprite = new THREE.Sprite(material);
            sprite.position.set(x, y + 0.5, z); // Float slightly above ground
            sprite.userData = { 
                type: 'worldItem', 
                itemType: itemType,
                emoji: emoji,
                animationTime: Math.random() * Math.PI * 2
            };
            
            this.scene.add(sprite);
            
            // Create invisible collision box for easier targeting
            const collisionBox = new THREE.Mesh(
                new THREE.BoxGeometry(1.5, 1.5, 1.5), // Larger than sprite for easier clicking
                new THREE.MeshBasicMaterial({ 
                    transparent: true, 
                    opacity: 0, // Completely invisible
                    depthWrite: false // Don't interfere with depth buffer
                })
            );
            collisionBox.position.set(x, y + 0.75, z); // Center of the collision box
            collisionBox.userData = { 
                type: 'worldItem', 
                itemType: itemType,
                emoji: emoji,
                sprite: sprite // Reference to the visual sprite
            };
            
            this.scene.add(collisionBox);
            
            // Store in world
            this.world[key] = {
                type: itemType,
                billboard: sprite,
                collisionBox: collisionBox,
                harvestable: true
            };
        };

        this.harvestWorldItem = (target) => {
            // Handle both sprites and collision boxes
            let itemType, emoji, sprite;
            
            if (target.userData.sprite) {
                // Clicked on collision box - get data from associated sprite
                sprite = target.userData.sprite;
                itemType = target.userData.itemType;
                emoji = target.userData.emoji;
            } else {
                // Clicked directly on sprite
                sprite = target;
                itemType = target.userData.itemType;
                emoji = target.userData.emoji;
            }
            
            // Add to inventory
            this.addToInventory(itemType, 1);

            // Remove from scene and world
            this.scene.remove(sprite);
            
            // Find and remove collision box if it exists
            const pos = sprite.position;
            const key = `${Math.floor(pos.x)},${Math.floor(pos.y)},${Math.floor(pos.z)}`;
            const worldData = this.world[key];
            if (worldData && worldData.collisionBox) {
                this.scene.remove(worldData.collisionBox);
            }
            
            delete this.world[key];
            
            // Update UI
            this.updateHotbarCounts();
            this.updateBackpackInventoryDisplay();
            
            // Notification
            this.updateStatus(`${emoji} Found ${itemType}! (${this.countItemInSlots(itemType)} total)`, 'discovery');
            console.log(`Harvested world item: ${itemType} (${emoji})`);
        };

        // PHASE 6: Harvest crafted objects and return original items to inventory
        this.harvestCraftedObject = (craftedMesh) => {
            console.log(`🎨 Harvesting crafted object...`);

            // Get object data from userData
            const itemId = craftedMesh.userData.itemId;
            const originalName = craftedMesh.userData.originalName;
            const position = craftedMesh.position;

            console.log(`🔧 Harvesting "${originalName}" (${itemId}) at (${position.x},${position.y},${position.z})`);

            // Find and remove from crafted objects tracking
            let removedKey = null;
            if (this.craftedObjects) {
                for (const [key, objectData] of Object.entries(this.craftedObjects)) {
                    if (objectData.mesh === craftedMesh) {
                        removedKey = key;
                        break;
                    }
                }
                if (removedKey) {
                    delete this.craftedObjects[removedKey];
                    console.log(`🗑️ Removed from crafted objects tracking: ${removedKey}`);
                }
            }

            // Remove 3D mesh from scene
            this.scene.remove(craftedMesh);

            // Clean up mesh resources
            if (craftedMesh.geometry) {
                craftedMesh.geometry.dispose();
            }
            if (craftedMesh.material) {
                if (craftedMesh.material.map) {
                    // Don't dispose shared textures
                }
                craftedMesh.material.dispose();
            }

            // Add original crafted item back to inventory
            this.addToInventory(itemId, 1);

            // Update UI displays
            this.updateHotbarCounts();
            this.updateBackpackInventoryDisplay();

            // Success notification with custom name
            const icon = this.getItemIcon(itemId);
            this.updateStatus(`${icon} Harvested "${originalName}"!`, 'harvest');
            console.log(`✅ Successfully harvested crafted object "${originalName}" → returned ${itemId} to inventory`);
        };

        // Show hotbar and tutorial after backpack pickup
        this.showHotbarTutorial = () => {
            // Create hotbar if it doesn't exist
            if (!this.hotbarElement) {
                this.createHotbar();
            }

            // Show the hotbar
            this.hotbarElement.style.display = 'flex';

            // Show tutorial message for a few seconds
            setTimeout(() => {
                this.updateStatus('Backpack found! Check your hotbar - you got random starting supplies!');
            }, 1000);

            setTimeout(() => {
                this.updateStatus('Slots 1-4 for quick access, slot 5 opens full inventory. Harvest shrubs for more wood!');
            }, 4000);
        };

        // Create the hotbar UI element
        this.createHotbar = () => {
            this.hotbarElement = document.createElement('div');
            this.hotbarElement.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                display: none;
                flex-direction: row;
                gap: 8px;
                background: rgba(0, 0, 0, 0.8);
                padding: 12px;
                border-radius: 8px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                z-index: 2000;
                pointer-events: auto;
                backdrop-filter: blur(4px);
            `;

            // Create 5 hotbar slots
            for (let i = 0; i < 5; i++) {
                const slot = document.createElement('div');
                slot.className = `hotbar-slot slot-${i}`;
                slot.style.cssText = `
                    width: 60px;
                    height: 60px;
                    background: rgba(50, 50, 50, 0.9);
                    border: 2px solid ${i === this.selectedSlot ? '#FFD700' : '#666'};
                    border-radius: 8px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    font-family: monospace;
                    font-size: 10px;
                    color: white;
                    position: relative;
                    cursor: pointer;
                `;

                // Add slot number
                const slotNumber = document.createElement('div');
                slotNumber.textContent = i + 1;
                slotNumber.style.cssText = `
                    position: absolute;
                    top: 2px;
                    left: 4px;
                    font-size: 8px;
                    opacity: 0.7;
                `;
                slot.appendChild(slotNumber);

                // Slot 5 is special - it's the backpack button
                if (i === 4) {
                    const backpackIcon = document.createElement('div');
                    backpackIcon.textContent = '🎒';
                    backpackIcon.style.fontSize = '20px';
                    slot.appendChild(backpackIcon);

                    const label = document.createElement('div');
                    label.textContent = 'BAG';
                    label.style.fontSize = '8px';
                    slot.appendChild(label);
                } else {
                    // Regular inventory slots
                    // NEW: Use slot-based system
                    const slotData = this.hotbarSlots[i];
                    const itemName = slotData ? slotData.itemType : null;
                    const itemCount = slotData ? slotData.quantity : 0;

                    const itemIcon = document.createElement('div');
                    itemIcon.className = 'item-icon';
                    // Use innerHTML for crafted items (HTML icons), textContent for emojis
                    if (itemName) {
                        const iconContent = this.getItemIcon(itemName);
                        if (iconContent.includes('<span')) {
                            itemIcon.innerHTML = iconContent;
                        } else {
                            itemIcon.textContent = iconContent;
                        }
                    } else {
                        itemIcon.textContent = ''; // Empty slot
                    }
                    itemIcon.style.fontSize = '16px';
                    slot.appendChild(itemIcon);

                    const itemCountDiv = document.createElement('div');
                    itemCountDiv.textContent = itemCount > 0 ? itemCount : '';
                    itemCountDiv.className = `item-count-${i}`;
                    itemCountDiv.style.fontSize = '10px';
                    slot.appendChild(itemCountDiv);
                }

                // Click handler for slot selection
                slot.addEventListener('click', () => {
                    if (i === 4) {
                        // Backpack button clicked - toggle inventory
                        this.toggleBackpackInventory();
                    } else {
                        this.selectedSlot = i;
                        this.updateHotbarSelection();
                    }
                });

                // Right-click handler for item transfer to backpack
                if (i < 4) { // Only for actual hotbar slots, not backpack button
                    slot.addEventListener('contextmenu', (e) => {
                        e.preventDefault(); // Prevent context menu
                        this.transferItemToBackpack(i);
                    });
                }

                this.hotbarElement.appendChild(slot);
            }

            // Add to the container
            this.container.appendChild(this.hotbarElement);
        };

        // Slot Management Helper Functions
        this.getHotbarSlot = (index) => {
            return this.hotbarSlots[index] || null;
        };

        this.getBackpackSlot = (index) => {
            return this.backpackSlots[index] || null;
        };

        this.setHotbarSlot = (index, itemType, quantity) => {
            if (index >= 0 && index < this.hotbarSlots.length) {
                this.hotbarSlots[index] = { itemType, quantity };
            }
        };

        this.setBackpackSlot = (index, itemType, quantity) => {
            if (index >= 0 && index < this.backpackSlots.length) {
                this.backpackSlots[index] = { itemType, quantity };
            }
        };

        this.findEmptyHotbarSlot = () => {
            for (let i = 0; i < this.hotbarSlots.length; i++) {
                if (!this.hotbarSlots[i].itemType || this.hotbarSlots[i].quantity === 0) {
                    return i;
                }
            }
            return -1; // No empty slots
        };

        this.findEmptyBackpackSlot = () => {
            for (let i = 0; i < this.backpackSlots.length; i++) {
                if (!this.backpackSlots[i].itemType || this.backpackSlots[i].quantity === 0) {
                    return i;
                }
            }
            return -1; // No empty slots
        };

        this.findHotbarSlotWithItem = (itemType) => {
            for (let i = 0; i < this.hotbarSlots.length; i++) {
                if (this.hotbarSlots[i].itemType === itemType && this.hotbarSlots[i].quantity > 0) {
                    return i;
                }
            }
            return -1; // Item not found
        };

        this.findBackpackSlotWithItem = (itemType) => {
            for (let i = 0; i < this.backpackSlots.length; i++) {
                if (this.backpackSlots[i].itemType === itemType && this.backpackSlots[i].quantity > 0) {
                    return i;
                }
            }
            return -1; // Item not found
        };

        // Sync functions removed - using pure slot-based system now

        // Get emoji icon for item types
        // Material Design icon system for crafted items
        this.getMaterialColor = (material) => {
            const materialColors = {
                wood: '#8B4513',      // Brown
                stone: '#708090',     // Slate gray
                iron: '#C0C0C0',      // Silver
                glass: '#87CEEB',     // Sky blue
                sand: '#F4A460',      // Sandy brown
                grass: '#228B22',     // Forest green
                brick: '#B22222',     // Fire brick
                glowstone: '#FFD700', // Gold
                coal: '#2F4F4F',      // Dark slate gray
                dirt: '#8B7355'       // Burlywood
            };
            return materialColors[material] || '#666666';
        };

        this.getShapeIcon = (shape) => {
            const shapeIcons = {
                cube: 'crop_square',           // ⬜ Square
                sphere: 'radio_button_unchecked', // ⭕ Circle
                cylinder: 'settings',          // ⚙️ Gear (cylindrical)
                pyramid: 'change_history',     // 🔺 Triangle
                stairs: 'stairs',              // 🪜 Stairs
                wall: 'crop_portrait',         // ▮ Vertical rectangle
                hollow_cube: 'crop_square'     // ⬜ Square (will be styled differently)
            };
            return shapeIcons[shape] || 'help_outline';
        };

        this.getCraftedItemIcon = (material, shape, dimensions) => {
            const color = this.getMaterialColor(material);
            const icon = this.getShapeIcon(shape);
            const size = dimensions ? `${dimensions.length}×${dimensions.width}×${dimensions.height}` : '';

            return `<span class="material-icons crafted-item-icon" style="color: ${color}; font-size: 16px;" title="${material} ${shape} ${size}">${icon}</span>`;
        };

        this.getItemIcon = (itemType) => {
            // Check if this is a crafted item (starts with "crafted_")
            if (itemType.startsWith('crafted_')) {
                // Parse crafted item format: "crafted_wood_cube_3x2x4"
                const parts = itemType.replace('crafted_', '').split('_');

                if (parts.length >= 2) {
                    const material = parts[0];
                    const shape = parts[1];

                    // Extract dimensions if present
                    let dimensions = null;
                    if (parts.length > 2) {
                        const dimensionPart = parts[parts.length - 1];
                        const dimensionMatch = dimensionPart.match(/(\d+)x(\d+)x(\d+)/);
                        if (dimensionMatch) {
                            dimensions = {
                                length: parseInt(dimensionMatch[1]),
                                width: parseInt(dimensionMatch[2]),
                                height: parseInt(dimensionMatch[3])
                            };
                        }
                    }

                    return this.getCraftedItemIcon(material, shape, dimensions);
                }
            }

            // Default emoji icons for base materials
            const icons = {
                grass: '🌱',
                stone: '🪨',
                wood: '🪵',
                workbench: '🔨',
                sand: '🏖️',
                glass: '💎',
                brick: '🧱',
                glowstone: '✨',
                iron: '⚙️',
                flowers: '🌸',
                snow: '❄️',
                dirt: '🪨',
                coal: '⚫',
                skull: '💀',
                leaf: '🍃'
            };
            return icons[itemType] || '❓';
        };

        // Update hotbar visual selection
        this.updateHotbarSelection = () => {
            if (!this.hotbarElement) return;

            const slots = this.hotbarElement.querySelectorAll('.hotbar-slot');
            slots.forEach((slot, index) => {
                slot.style.border = index === this.selectedSlot ?
                    '2px solid #FFD700' : '2px solid #666';
            });
        };

        // Update hotbar item counts and icons
        this.updateHotbarCounts = () => {
            if (!this.hotbarElement) return;

            for (let i = 0; i < 4; i++) {
                // NEW: Use slot-based system
                const slot = this.hotbarSlots[i];
                const itemCount = slot ? slot.quantity : 0;
                const itemType = slot ? slot.itemType : null;

                // Update count
                const countElement = this.hotbarElement.querySelector(`.item-count-${i}`);
                if (countElement) {
                    countElement.textContent = itemCount > 0 ? itemCount : '';
                }

                // Update icon
                const slotElement = this.hotbarElement.querySelector(`.slot-${i}`);
                if (slotElement) {
                    const iconElement = slotElement.querySelector('.item-icon');
                    if (iconElement) {
                        if (itemType && itemCount > 0) {
                            const iconContent = this.getItemIcon(itemType);
                            if (iconContent.includes('<span')) {
                                iconElement.innerHTML = iconContent;
                            } else {
                                iconElement.textContent = iconContent;
                            }
                        } else {
                            iconElement.textContent = '';
                            iconElement.innerHTML = '';
                        }
                    }
                }
            }
        };

        // Toggle backpack inventory slide-down
        this.toggleBackpackInventory = () => {
            if (!this.backpackInventoryElement) {
                this.createBackpackInventory();
            }

            const isVisible = this.backpackInventoryElement.style.transform.includes('translateY(0px)');

            if (isVisible) {
                // Slide up (hide) and re-enable pointer lock
                this.backpackInventoryElement.style.transform = 'translateX(-50%) translateY(-100%)';
                this.updateStatus('Backpack closed');

                // Re-request pointer lock after a short delay
                setTimeout(() => {
                    if (this.controlsEnabled) {
                        this.renderer.domElement.requestPointerLock();
                    }
                }, 100);
            } else {
                // Slide down (show) and release pointer lock
                this.backpackInventoryElement.style.transform = 'translateX(-50%) translateY(0px)';
                this.updateBackpackInventoryDisplay();
                this.updateStatus('Backpack opened - 5x5 grid storage');

                // Exit pointer lock to allow cursor interaction
                if (document.pointerLockElement) {
                    document.exitPointerLock();
                }
            }
        };

        // Create backpack inventory UI
        this.createBackpackInventory = () => {
            this.backpackInventoryElement = document.createElement('div');
            this.backpackInventoryElement.style.cssText = `
                position: fixed;
                top: 0;
                left: 50%;
                transform: translateX(-50%) translateY(-100%);
                width: 400px;
                background: rgba(40, 40, 40, 0.95);
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 0 0 12px 12px;
                padding: 20px;
                z-index: 3000;
                transition: transform 0.3s ease-out;
                backdrop-filter: blur(8px);
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            `;

            // Title header
            const header = document.createElement('div');
            header.textContent = '🎒 Backpack Storage (5x5 Grid)';
            header.style.cssText = `
                color: white;
                font-family: monospace;
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 15px;
                text-align: center;
                border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                padding-bottom: 10px;
            `;
            this.backpackInventoryElement.appendChild(header);

            // 5x5 grid container
            const gridContainer = document.createElement('div');
            gridContainer.style.cssText = `
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 8px;
                margin-bottom: 15px;
            `;

            // Create 25 inventory slots (5x5) - slots data already exists, just create UI
            for (let i = 0; i < 25; i++) {
                const slot = document.createElement('div');
                slot.className = `backpack-slot slot-${i}`;
                slot.style.cssText = `
                    width: 60px;
                    height: 60px;
                    background: rgba(60, 60, 60, 0.8);
                    border: 2px solid #555;
                    border-radius: 6px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    font-family: monospace;
                    font-size: 10px;
                    color: white;
                    cursor: pointer;
                    position: relative;
                `;

                // Empty slot content
                const slotIcon = document.createElement('div');
                slotIcon.textContent = '📦';
                slotIcon.style.cssText = `
                    font-size: 16px;
                    opacity: 0.3;
                `;
                slot.appendChild(slotIcon);

                const slotLabel = document.createElement('div');
                slotLabel.textContent = 'Empty';
                slotLabel.style.cssText = `
                    font-size: 8px;
                    opacity: 0.5;
                    margin-top: 2px;
                `;
                slot.appendChild(slotLabel);

                // Right-click handler for item transfer to hotbar
                slot.addEventListener('contextmenu', (e) => {
                    e.preventDefault(); // Prevent context menu
                    this.transferItemToHotbar(i);
                });

                // Store slot reference
                // Store DOM element reference (data is in this.backpackSlots array)
                this.backpackSlots[i].element = slot;

                gridContainer.appendChild(slot);
            }

            this.backpackInventoryElement.appendChild(gridContainer);

            // Info footer
            const footer = document.createElement('div');
            footer.textContent = 'Click hotbar slots to move items • Each slot holds 8 items (upgradeable)';
            footer.style.cssText = `
                color: rgba(255, 255, 255, 0.6);
                font-family: monospace;
                font-size: 11px;
                text-align: center;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                padding-top: 10px;
            `;
            this.backpackInventoryElement.appendChild(footer);

            // Close button
            const closeButton = document.createElement('button');
            closeButton.textContent = '×';
            closeButton.style.cssText = `
                position: absolute;
                top: 8px;
                right: 12px;
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                opacity: 0.7;
            `;
            closeButton.addEventListener('click', () => this.toggleBackpackInventory());
            this.backpackInventoryElement.appendChild(closeButton);

            // Add to container
            this.container.appendChild(this.backpackInventoryElement);
        };

        // TODO: Replace with new WorkbenchSystem

        // Create workbench modal UI
        this.createWorkbenchModal = () => {
            // Create modal backdrop
            this.workbenchModal = document.createElement('div');
            this.workbenchModal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.8);
                display: none;
                z-index: 4000;
                backdrop-filter: blur(4px);
            `;

            // Create modal content
            const modalContent = document.createElement('div');
            modalContent.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 90vw;
                max-width: 1200px;
                height: 80vh;
                background: rgba(30, 30, 30, 0.95);
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 12px;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            `;

            // Header
            const header = document.createElement('div');
            header.style.cssText = `
                background: rgba(50, 50, 50, 0.8);
                padding: 15px 20px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;

            const title = document.createElement('h2');
            title.textContent = '🔨 Workbench - Shape Forge';
            title.style.cssText = `
                color: white;
                margin: 0;
                font-size: 24px;
            `;

            const closeButton = document.createElement('button');
            closeButton.textContent = '✕';
            closeButton.style.cssText = `
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 5px 10px;
                border-radius: 4px;
                transition: background 0.2s;
            `;
            closeButton.addEventListener('click', () => this.closeWorkbenchModal());
            closeButton.addEventListener('mouseenter', () => {
                closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
            });
            closeButton.addEventListener('mouseleave', () => {
                closeButton.style.background = 'none';
            });

            header.appendChild(title);
            header.appendChild(closeButton);

            // Main content area with three panels
            const mainContent = document.createElement('div');
            mainContent.style.cssText = `
                flex: 1;
                display: flex;
                min-height: 0;
            `;

            // Materials Panel (left)
            const materialsPanel = this.createMaterialsPanel();

            // 3D Preview Panel (center)
            const previewPanel = this.create3DPreviewPanel();

            // Shape Builder Panel (right)
            const builderPanel = this.createBuilderPanel();

            mainContent.appendChild(materialsPanel);
            mainContent.appendChild(previewPanel);
            mainContent.appendChild(builderPanel);

            modalContent.appendChild(header);
            modalContent.appendChild(mainContent);
            this.workbenchModal.appendChild(modalContent);

            // Add to DOM
            this.container.appendChild(this.workbenchModal);
        };

        // Close workbench modal
        this.closeWorkbenchModal = () => {
            if (this.workbenchModal) {
                this.workbenchModal.style.display = 'none';
            }
            this.currentWorkbench = null;
            this.updateStatus('Workbench closed', 'info');

            // Re-request pointer lock after a short delay
            setTimeout(() => {
                if (this.controlsEnabled) {
                    this.renderer.domElement.requestPointerLock();
                }
            }, 100);
        };

        // Create materials panel (left panel)
        this.createMaterialsPanel = () => {
            const panel = document.createElement('div');
            panel.style.cssText = `
                width: 300px;
                background: rgba(20, 20, 20, 0.7);
                border-right: 1px solid rgba(255, 255, 255, 0.2);
                padding: 20px;
                overflow-y: auto;
            `;

            const title = document.createElement('h3');
            title.textContent = '📦 Materials';
            title.style.cssText = `
                color: white;
                margin: 0 0 15px 0;
                font-size: 18px;
            `;
            panel.appendChild(title);

            // Create material list based on current inventory
            const materialsList = document.createElement('div');
            materialsList.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;

            // Show available materials from slots
            const availableMaterials = this.getAllMaterialsFromSlots();
            Object.keys(availableMaterials).forEach(materialType => {
                const count = availableMaterials[materialType];
                if (count > 0 && materialType !== 'workbench') { // Don't show workbench as material
                    const materialItem = document.createElement('div');
                    materialItem.style.cssText = `
                        background: rgba(40, 40, 40, 0.8);
                        border: 2px solid rgba(255, 255, 255, 0.2);
                        border-radius: 8px;
                        padding: 10px;
                        cursor: pointer;
                        transition: all 0.2s;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    `;

                    const emoji = this.getItemIcon(materialType);
                    const name = materialType.charAt(0).toUpperCase() + materialType.slice(1);

                    materialItem.innerHTML = `
                        <span style="font-size: 20px;">${emoji}</span>
                        <div style="color: white;">
                            <div style="font-weight: bold;">${name}</div>
                            <div style="font-size: 12px; opacity: 0.7;">${count} available</div>
                        </div>
                    `;

                    // Add selection functionality
                    materialItem.addEventListener('click', () => {
                        // Remove selection from other materials
                        materialsList.querySelectorAll('div').forEach(item => {
                            item.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        });
                        // Highlight this material
                        materialItem.style.borderColor = '#4CAF50';
                        this.selectedMaterial = materialType;
                        console.log('📦 Material selected:', materialType);

                        // Auto-select cube shape if no shape is selected
                        if (!this.selectedShape) {
                            this.selectedShape = 'cube';
                            console.log('🔷 Auto-selected cube shape');

                            // Highlight the cube button
                            setTimeout(() => {
                                const cubeButton = document.querySelector('button[data-shape="cube"]');
                                if (cubeButton) {
                                    // Remove highlight from other shapes
                                    document.querySelectorAll('button[data-shape]').forEach(btn => {
                                        btn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                                    });
                                    // Highlight cube
                                    cubeButton.style.borderColor = '#2196F3';
                                }
                            }, 50);
                        }

                        this.updateWorkbenchPreview();
                        this.updateStatus(`Selected material: ${name}`);
                    });

                    materialItem.addEventListener('mouseenter', () => {
                        materialItem.style.background = 'rgba(60, 60, 60, 0.8)';
                    });

                    materialItem.addEventListener('mouseleave', () => {
                        materialItem.style.background = 'rgba(40, 40, 40, 0.8)';
                    });

                    materialsList.appendChild(materialItem);
                }
            });

            panel.appendChild(materialsList);
            return panel;
        };

        // Create 3D preview panel (center panel)
        this.create3DPreviewPanel = () => {
            const panel = document.createElement('div');
            panel.style.cssText = `
                flex: 1;
                background: rgba(10, 10, 10, 0.7);
                border-right: 1px solid rgba(255, 255, 255, 0.2);
                display: flex;
                flex-direction: column;
                padding: 20px;
            `;

            const title = document.createElement('h3');
            title.textContent = '🎯 Preview';
            title.style.cssText = `
                color: white;
                margin: 0 0 15px 0;
                font-size: 18px;
            `;
            panel.appendChild(title);

            // Create 3D preview canvas container
            const previewContainer = document.createElement('div');
            previewContainer.style.cssText = `
                flex: 1;
                background: rgba(0, 0, 0, 0.3);
                border: 2px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                position: relative;
                min-height: 300px;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            // Create Three.js scene for 3D preview
            console.log('🎬 Creating workbench 3D scene...');
            this.workbenchScene = new THREE.Scene();
            this.workbenchScene.background = new THREE.Color(0x111111);

            this.workbenchCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
            this.workbenchCamera.position.set(3, 3, 3);
            this.workbenchCamera.lookAt(0, 0, 0);

            this.workbenchRenderer = new THREE.WebGLRenderer({ antialias: true });
            this.workbenchRenderer.setSize(400, 300); // Will resize based on container
            this.workbenchRenderer.shadowMap.enabled = true;
            this.workbenchRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

            console.log('✅ Workbench scene created:', {
                scene: !!this.workbenchScene,
                camera: !!this.workbenchCamera,
                renderer: !!this.workbenchRenderer
            });

            // Add lighting
            const ambientLight = new THREE.AmbientLight(0x666666, 1.0);
            this.workbenchScene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(1, 1, 1);
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 1024;
            directionalLight.shadow.mapSize.height = 1024;
            this.workbenchScene.add(directionalLight);

            // Add grid for reference
            const gridHelper = new THREE.GridHelper(3, 3, 0x444444, 0x222222);
            gridHelper.position.y = -0.5;
            this.workbenchScene.add(gridHelper);

            // Add canvas to container
            previewContainer.appendChild(this.workbenchRenderer.domElement);

            // Add OrbitControls for camera interaction
            this.workbenchControls = new OrbitControls(this.workbenchCamera, this.workbenchRenderer.domElement);
            this.workbenchControls.enableDamping = true;
            this.workbenchControls.dampingFactor = 0.25;
            this.workbenchControls.enableZoom = true;
            this.workbenchControls.enableRotate = true;
            this.workbenchControls.enablePan = false;

            // Store reference to current preview object
            this.currentPreviewObject = null;

            // Auto-resize renderer when container changes
            const resizeObserver = new ResizeObserver(entries => {
                for (let entry of entries) {
                    const { width, height } = entry.contentRect;
                    if (width > 0 && height > 0) {
                        this.workbenchRenderer.setSize(width - 4, height - 4); // Account for border
                        this.workbenchCamera.aspect = (width - 4) / (height - 4);
                        this.workbenchCamera.updateProjectionMatrix();
                    }
                }
            });
            resizeObserver.observe(previewContainer);

            // Controls
            const controls = document.createElement('div');
            controls.style.cssText = `
                margin-top: 15px;
                display: flex;
                gap: 10px;
                justify-content: center;
            `;

            const rotateBtn = document.createElement('button');
            rotateBtn.textContent = '🔄 Rotate';
            rotateBtn.style.cssText = `
                background: rgba(70, 70, 70, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: white;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.2s;
            `;
            rotateBtn.addEventListener('click', () => {
                if (this.workbenchCamera) {
                    // Rotate camera around the scene
                    const angle = Date.now() * 0.01;
                    const radius = 3;
                    this.workbenchCamera.position.x = Math.cos(angle) * radius;
                    this.workbenchCamera.position.z = Math.sin(angle) * radius;
                    this.workbenchCamera.lookAt(0, 0, 0);
                    this.updateStatus('Rotating preview...');
                }
            });

            const zoomBtn = document.createElement('button');
            zoomBtn.textContent = '🔍 Zoom';
            zoomBtn.style.cssText = `
                background: rgba(70, 70, 70, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: white;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.2s;
            `;
            zoomBtn.addEventListener('click', () => {
                if (this.workbenchCamera) {
                    // Toggle between zoomed in and out
                    const currentDistance = this.workbenchCamera.position.length();
                    const newDistance = currentDistance > 3 ? 2 : 4;
                    this.workbenchCamera.position.normalize().multiplyScalar(newDistance);
                    this.updateStatus(`Zoom: ${newDistance < 3 ? 'In' : 'Out'}`);
                }
            });

            controls.appendChild(rotateBtn);
            controls.appendChild(zoomBtn);

            panel.appendChild(previewContainer);
            panel.appendChild(controls);

            // Store reference for 3D scene later
            this.workbenchPreviewContainer = previewContainer;

            // Start rendering loop for workbench preview
            this.startWorkbenchPreviewLoop();

            return panel;
        };

        // Create builder panel (right panel)
        this.createBuilderPanel = () => {
            const panel = document.createElement('div');
            panel.style.cssText = `
                width: 300px;
                background: rgba(20, 20, 20, 0.7);
                padding: 20px;
                overflow-y: auto;
            `;

            const title = document.createElement('h3');
            title.textContent = '🔨 Builder';
            title.style.cssText = `
                color: white;
                margin: 0 0 15px 0;
                font-size: 18px;
            `;
            panel.appendChild(title);

            // Shape selector
            const shapesSection = document.createElement('div');
            shapesSection.style.cssText = `
                margin-bottom: 20px;
            `;

            const shapesTitle = document.createElement('h4');
            shapesTitle.textContent = 'Shapes';
            shapesTitle.style.cssText = `
                color: white;
                margin: 0 0 10px 0;
                font-size: 14px;
                opacity: 0.8;
            `;
            shapesSection.appendChild(shapesTitle);

            // Basic shapes
            const shapes = [
                { name: 'Cube', icon: '⬜', type: 'cube' },
                { name: 'Sphere', icon: '⚪', type: 'sphere' },
                { name: 'Cylinder', icon: '🥫', type: 'cylinder' },
                { name: 'Cone', icon: '🔺', type: 'cone' }
            ];

            const shapesGrid = document.createElement('div');
            shapesGrid.style.cssText = `
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
            `;

            shapes.forEach(shape => {
                const shapeBtn = document.createElement('button');
                shapeBtn.setAttribute('data-shape', shape.type);
                shapeBtn.style.cssText = `
                    background: rgba(40, 40, 40, 0.8);
                    border: 2px solid rgba(255, 255, 255, 0.2);
                    border-radius: 6px;
                    padding: 12px;
                    color: white;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: center;
                `;
                shapeBtn.innerHTML = `
                    <div style="font-size: 20px;">${shape.icon}</div>
                    <div style="font-size: 12px; margin-top: 4px;">${shape.name}</div>
                `;

                shapeBtn.addEventListener('click', () => {
                    // Remove selection from other shapes
                    shapesGrid.querySelectorAll('button').forEach(btn => {
                        btn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    });
                    // Highlight this shape
                    shapeBtn.style.borderColor = '#2196F3';
                    this.selectedShape = shape.type;
                    console.log('🔷 Shape selected:', shape.type);
                    this.updateWorkbenchPreview();
                    this.updateStatus(`Selected shape: ${shape.name}`);
                });

                shapesGrid.appendChild(shapeBtn);
            });

            shapesSection.appendChild(shapesGrid);

            // Position Grid (3x3x3 positioning)
            const positionSection = document.createElement('div');
            positionSection.style.cssText = `
                margin-bottom: 20px;
            `;

            const positionTitle = document.createElement('h4');
            positionTitle.textContent = 'Position (3×3×3 Grid)';
            positionTitle.style.cssText = `
                color: white;
                margin: 0 0 10px 0;
                font-size: 14px;
                opacity: 0.8;
            `;
            positionSection.appendChild(positionTitle);

            // Create 3x3 grid for positioning
            const positionGrid = document.createElement('div');
            positionGrid.style.cssText = `
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 4px;
                margin-bottom: 10px;
            `;

            for (let i = 0; i < 9; i++) {
                const positionBtn = document.createElement('button');
                positionBtn.style.cssText = `
                    aspect-ratio: 1;
                    background: rgba(40, 40, 40, 0.8);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 4px;
                    color: white;
                    cursor: pointer;
                    font-size: 10px;
                    transition: all 0.2s;
                `;

                const x = i % 3;
                const z = Math.floor(i / 3);
                positionBtn.textContent = `${x},${z}`;

                positionBtn.addEventListener('click', () => {
                    // Remove selection from other positions
                    positionGrid.querySelectorAll('button').forEach(btn => {
                        btn.style.background = 'rgba(40, 40, 40, 0.8)';
                    });
                    // Highlight this position
                    positionBtn.style.background = 'rgba(76, 175, 80, 0.8)';
                    this.selectedPosition = { x, y: 0, z }; // Y=0 for now (ground level)
                    console.log('📍 Position selected:', { x, y: 0, z });
                    this.updateWorkbenchPreview();
                    this.updateStatus(`Position: ${x}, 0, ${z}`);
                });

                positionGrid.appendChild(positionBtn);
            }

            positionSection.appendChild(positionGrid);

            // Height selector
            const heightLabel = document.createElement('div');
            heightLabel.style.cssText = `
                color: white;
                font-size: 12px;
                margin-bottom: 5px;
                opacity: 0.8;
            `;
            heightLabel.textContent = 'Height: 0';

            const heightSlider = document.createElement('input');
            heightSlider.type = 'range';
            heightSlider.min = '0';
            heightSlider.max = '2';
            heightSlider.step = '1';
            heightSlider.value = '0';
            heightSlider.style.cssText = `
                width: 100%;
                margin-bottom: 15px;
            `;

            heightSlider.addEventListener('input', (e) => {
                const height = parseInt(e.target.value);
                heightLabel.textContent = `Height: ${height}`;
                if (this.selectedPosition) {
                    this.selectedPosition.y = height;
                    this.updateWorkbenchPreview();
                    this.updateStatus(`Position: ${this.selectedPosition.x}, ${height}, ${this.selectedPosition.z}`);
                }
            });

            positionSection.appendChild(heightLabel);
            positionSection.appendChild(heightSlider);

            // Create Object Button
            const createSection = document.createElement('div');
            createSection.style.cssText = `
                margin-top: 20px;
            `;

            const createBtn = document.createElement('button');
            createBtn.textContent = '✨ Create Object';
            createBtn.style.cssText = `
                width: 100%;
                background: linear-gradient(45deg, #4CAF50, #45a049);
                border: none;
                color: white;
                padding: 15px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            `;

            createBtn.addEventListener('click', () => {
                this.createShapeForgeObject();
            });

            createBtn.addEventListener('mouseenter', () => {
                createBtn.style.transform = 'translateY(-2px)';
                createBtn.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.4)';
            });

            createBtn.addEventListener('mouseleave', () => {
                createBtn.style.transform = 'translateY(0)';
                createBtn.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
            });

            createSection.appendChild(createBtn);

            panel.appendChild(shapesSection);
            panel.appendChild(positionSection);
            panel.appendChild(createSection);

            return panel;
        };

        // Create ShapeForge object
        this.createShapeForgeObject = () => {
            if (!this.selectedMaterial) {
                this.updateStatus('⚠️ Please select a material first!', 'warning');
                return;
            }
            if (!this.selectedShape) {
                this.updateStatus('⚠️ Please select a shape first!', 'warning');
                return;
            }
            if (!this.selectedPosition) {
                this.updateStatus('⚠️ Please select a position first!', 'warning');
                return;
            }

            // Check if player has enough materials (for now, require 1 of selected material)
            const availableCount = this.countItemInSlots(this.selectedMaterial);
            if (availableCount < 1) {
                this.updateStatus(`⚠️ Not enough ${this.selectedMaterial}! Need 1, have ${availableCount}`, 'error');
                return;
            }

            console.log('Creating ShapeForge object:', {
                material: this.selectedMaterial,
                shape: this.selectedShape,
                position: this.selectedPosition,
                workbenchPos: this.currentWorkbench
            });

            // Use material
            this.removeFromInventory(this.selectedMaterial, 1);

            // Create the object (placeholder for now)
            const objectName = `${this.selectedMaterial}_${this.selectedShape}`;

            // Add crafted object to inventory
            this.addToInventory(objectName, 1);

            // Update all displays
            this.updateHotbarCounts();
            this.updateBackpackInventoryDisplay();

            // Use enhanced notification system with craft type
            const craftedEmoji = this.getItemIcon(objectName);
            this.updateStatus(`${craftedEmoji} Created ${objectName}! Added to inventory.`, 'craft');

            // TODO: Later we'll implement actual 3D object creation and placement
        };

        // Start workbench preview rendering loop
        this.startWorkbenchPreviewLoop = () => {
            const animate = () => {
                if (this.workbenchRenderer && this.workbenchScene && this.workbenchCamera) {
                    // Update controls for smooth interaction
                    if (this.workbenchControls) {
                        this.workbenchControls.update();
                    }
                    this.workbenchRenderer.render(this.workbenchScene, this.workbenchCamera);
                }
                if (this.workbenchModal && this.workbenchModal.style.display !== 'none') {
                    requestAnimationFrame(animate);
                }
            };
            animate();
        };

        // Update workbench 3D preview based on current selections
        this.updateWorkbenchPreview = () => {
            console.log('🔧 updateWorkbenchPreview called', {
                workbenchScene: !!this.workbenchScene,
                selectedShape: this.selectedShape,
                selectedMaterial: this.selectedMaterial,
                selectedPosition: this.selectedPosition
            });

            if (!this.workbenchScene || !this.selectedShape || !this.selectedMaterial) {
                console.log('⚠️ Preview update skipped - missing requirements');
                return;
            }

            console.log('✅ Creating 3D preview...');

            // Remove current preview object
            if (this.currentPreviewObject) {
                this.workbenchScene.remove(this.currentPreviewObject);
                this.currentPreviewObject = null;
            }

            // Create geometry based on selected shape
            let geometry;
            switch (this.selectedShape) {
                case 'cube':
                    geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
                    break;
                case 'sphere':
                    geometry = new THREE.SphereGeometry(0.3, 16, 16);
                    break;
                case 'cylinder':
                    geometry = new THREE.CylinderGeometry(0.25, 0.25, 0.5, 16);
                    break;
                case 'cone':
                    geometry = new THREE.ConeGeometry(0.25, 0.5, 16);
                    break;
                default:
                    geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
            }

            // Create material based on selected material type
            const blockType = this.blockTypes[this.selectedMaterial];
            let material;

            if (blockType) {
                // Use the same material as the game blocks
                material = new THREE.MeshLambertMaterial({
                    color: blockType.color,
                    map: this.materials[this.selectedMaterial].map
                });
            } else {
                // Fallback to basic colored material
                const colors = {
                    grass: 0x4CAF50,
                    stone: 0x808080,
                    wood: 0x8B4513,
                    iron: 0x708090,
                    glass: 0x87CEEB,
                    brick: 0xB22222,
                    glowstone: 0xFFFF88
                };
                material = new THREE.MeshLambertMaterial({
                    color: colors[this.selectedMaterial] || 0x888888
                });
            }

            // Create mesh
            this.currentPreviewObject = new THREE.Mesh(geometry, material);

            // Position the object based on selection
            if (this.selectedPosition) {
                // Convert 3x3 grid position to world coordinates (-1 to 1)
                const x = (this.selectedPosition.x - 1) * 0.7; // Center at 0
                const y = this.selectedPosition.y * 0.7;
                const z = (this.selectedPosition.z - 1) * 0.7;
                this.currentPreviewObject.position.set(x, y, z);
            }

            // Add to scene
            this.workbenchScene.add(this.currentPreviewObject);

            // Add subtle rotation animation
            this.currentPreviewObject.userData.startTime = Date.now();
            const rotatePreview = () => {
                if (this.currentPreviewObject && this.workbenchModal && this.workbenchModal.style.display !== 'none') {
                    const elapsed = (Date.now() - this.currentPreviewObject.userData.startTime) * 0.001;
                    this.currentPreviewObject.rotation.y = elapsed * 0.5;
                    requestAnimationFrame(rotatePreview);
                }
            };
            rotatePreview();
        };

        // Show workbench tutorial for first-time users
        this.showWorkbenchTutorial = () => {
            // Check if user has seen the tutorial before
            const tutorialSeen = localStorage.getItem('voxelworld_workbench_tutorial_seen');
            if (tutorialSeen) return;

            // Create tutorial overlay
            const tutorialOverlay = document.createElement('div');
            tutorialOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.8);
                z-index: 5000;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: tutorialFadeIn 0.5s ease-out;
            `;

            const tutorialContent = document.createElement('div');
            tutorialContent.style.cssText = `
                background: rgba(30, 30, 30, 0.95);
                color: white;
                padding: 30px;
                border-radius: 12px;
                max-width: 500px;
                text-align: center;
                border: 2px solid #4CAF50;
                box-shadow: 0 8px 24px rgba(0,0,0,0.4);
                backdrop-filter: blur(8px);
            `;

            tutorialContent.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 15px;">🔨</div>
                <h2 style="color: #4CAF50; margin: 0 0 20px 0;">Welcome to the Workbench!</h2>
                <div style="font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                    <div style="margin-bottom: 12px;">📦 <strong>Step 1:</strong> Select a material from the left panel</div>
                    <div style="margin-bottom: 12px;">🔷 <strong>Step 2:</strong> Choose a shape (cube auto-selected)</div>
                    <div style="margin-bottom: 12px;">📍 <strong>Step 3:</strong> Pick a position on the 3×3 grid</div>
                    <div style="margin-bottom: 12px;">✨ <strong>Step 4:</strong> Click "Create Object" to craft!</div>
                    <div style="margin-top: 15px; font-size: 14px; opacity: 0.8;">
                        🔄 Use the preview controls to rotate and zoom the 3D preview
                    </div>
                </div>
                <button id="tutorial-got-it" style="
                    background: linear-gradient(45deg, #4CAF50, #45a049);
                    border: none;
                    color: white;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                ">
                    Got it! Let's craft! 🚀
                </button>
            `;

            // Add animation CSS
            if (!document.head.querySelector('style[data-tutorial-animation]')) {
                const style = document.createElement('style');
                style.setAttribute('data-tutorial-animation', 'true');
                style.textContent = `
                    @keyframes tutorialFadeIn {
                        from { opacity: 0; transform: scale(0.9); }
                        to { opacity: 1; transform: scale(1); }
                    }
                `;
                document.head.appendChild(style);
            }

            tutorialOverlay.appendChild(tutorialContent);

            // Handle "Got it" button
            const gotItButton = tutorialContent.querySelector('#tutorial-got-it');
            gotItButton.addEventListener('click', () => {
                localStorage.setItem('voxelworld_workbench_tutorial_seen', 'true');
                tutorialOverlay.style.animation = 'tutorialFadeIn 0.3s ease-out reverse';
                setTimeout(() => {
                    tutorialOverlay.remove();
                    this.updateStatus('📦 Select a material to get started!', 'info', false);
                }, 300);
            });

            // Add to DOM
            this.container.appendChild(tutorialOverlay);
        };

        // Check for nearby workbench and show interaction prompt
        this.checkWorkbenchProximity = () => {
            if (!this.player) return;

            const playerPos = this.player.position;
            let nearbyWorkbench = null;

            // Check all blocks within 2 units for workbench
            for (let x = Math.floor(playerPos.x - 2); x <= Math.floor(playerPos.x + 2); x++) {
                for (let y = Math.floor(playerPos.y - 1); y <= Math.floor(playerPos.y + 2); y++) {
                    for (let z = Math.floor(playerPos.z - 2); z <= Math.floor(playerPos.z + 2); z++) {
                        const key = `${x},${y},${z}`;
                        const block = this.world[key];
                        if (block && block.type === 'workbench') {
                            const blockPos = new THREE.Vector3(x, y, z);
                            const distance = new THREE.Vector3().copy(playerPos).distanceTo(blockPos);
                            if (distance <= 2.0) {
                                nearbyWorkbench = { x, y, z, distance };
                                break;
                            }
                        }
                    }
                    if (nearbyWorkbench) break;
                }
                if (nearbyWorkbench) break;
            }

            // Show/hide interaction prompt
            if (nearbyWorkbench && !this.currentNearbyWorkbench) {
                this.currentNearbyWorkbench = nearbyWorkbench;
                this.showWorkbenchPrompt(nearbyWorkbench);
            } else if (!nearbyWorkbench && this.currentNearbyWorkbench) {
                this.currentNearbyWorkbench = null;
                this.hideWorkbenchPrompt();
            }
        };

        // Show workbench interaction prompt
        this.showWorkbenchPrompt = (workbench) => {
            if (this.workbenchPrompt) {
                this.hideWorkbenchPrompt();
            }

            this.workbenchPrompt = document.createElement('div');
            this.workbenchPrompt.style.cssText = `
                position: fixed;
                bottom: 120px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 15px 25px;
                border-radius: 12px;
                font-size: 16px;
                font-weight: bold;
                text-align: center;
                z-index: 3500;
                border: 2px solid #4CAF50;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                backdrop-filter: blur(4px);
                animation: slideUp 0.3s ease-out;
            `;

            // Check if mobile
            if (this.isMobile) {
                this.workbenchPrompt.innerHTML = `
                    <div>🔨 Workbench</div>
                    <div style="font-size: 14px; margin-top: 5px; opacity: 0.9;">Tap to craft objects</div>
                `;
                this.workbenchPrompt.addEventListener('click', () => {
                    this.workbenchSystem.open(workbench.x, workbench.y, workbench.z);
                });
                this.workbenchPrompt.style.cursor = 'pointer';
            } else {
                this.workbenchPrompt.innerHTML = `
                    <div>🔨 Workbench</div>
                    <div style="font-size: 14px; margin-top: 5px; opacity: 0.9;">Press [E] to craft objects</div>
                `;
            }

            // Add CSS animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes slideUp {
                    from { transform: translateX(-50%) translateY(20px); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
            `;
            if (!document.head.querySelector('style[data-workbench-prompt]')) {
                style.setAttribute('data-workbench-prompt', 'true');
                document.head.appendChild(style);
            }

            this.container.appendChild(this.workbenchPrompt);
        };

        // Hide workbench interaction prompt
        this.hideWorkbenchPrompt = () => {
            if (this.workbenchPrompt) {
                this.workbenchPrompt.remove();
                this.workbenchPrompt = null;
            }
        };

        // Update backpack inventory display
        this.updateBackpackInventoryDisplay = () => {
            if (!this.backpackSlots) return;

            // Ensure backpack UI is created before updating
            if (!this.backpackInventoryElement) {
                this.createBackpackInventory();
            }

            // Update each backpack slot using new slot system
            let filledSlots = 0;

            // Update each backpack slot
            for (let i = 0; i < this.backpackSlots.length; i++) {
                const slotData = this.backpackSlots[i];
                const slot = slotData.element;

                // Skip if slot element doesn't exist yet
                if (!slot) continue;

                // Clear current content
                slot.innerHTML = '';

                if (slotData.itemType && slotData.quantity > 0) {
                    // Has an item
                    filledSlots++;
                    const iconContent = this.getItemIcon(slotData.itemType);
                    const name = slotData.itemType.charAt(0).toUpperCase() + slotData.itemType.slice(1);

                    // Store item type for transfers
                    slot.dataset.itemType = slotData.itemType;

                    // Create item icon
                    const itemIcon = document.createElement('div');
                    // Use innerHTML for crafted items (HTML icons), textContent for emojis
                    if (iconContent.includes('<span')) {
                        itemIcon.innerHTML = iconContent;
                    } else {
                        itemIcon.textContent = iconContent;
                    }
                    itemIcon.style.cssText = `
                        font-size: 20px;
                        margin-bottom: 2px;
                    `;
                    slot.appendChild(itemIcon);

                    // Create item count
                    const itemCount = document.createElement('div');
                    itemCount.textContent = slotData.quantity;
                    itemCount.style.cssText = `
                        font-size: 10px;
                        font-weight: bold;
                        color: #4CAF50;
                    `;
                    slot.appendChild(itemCount);

                    // Create item name (smaller)
                    const itemName = document.createElement('div');
                    itemName.textContent = name.substring(0, 6); // Truncate long names
                    itemName.style.cssText = `
                        font-size: 7px;
                        opacity: 0.8;
                        margin-top: 1px;
                    `;
                    slot.appendChild(itemName);

                    // Add tooltip on hover
                    slot.title = `${name}: ${slotData.quantity}`;

                    // Update slot styling for filled slot
                    slot.style.background = 'rgba(40, 80, 40, 0.8)';
                    slot.style.borderColor = '#4CAF50';

                    // Slot data already contains the correct values
                } else {
                    // Empty slot
                    slot.dataset.itemType = '';

                    const emptyIcon = document.createElement('div');
                    emptyIcon.textContent = '📦';
                    emptyIcon.style.cssText = `
                        font-size: 16px;
                        opacity: 0.3;
                    `;
                    slot.appendChild(emptyIcon);

                    const emptyLabel = document.createElement('div');
                    emptyLabel.textContent = 'Empty';
                    emptyLabel.style.cssText = `
                        font-size: 8px;
                        opacity: 0.5;
                        margin-top: 2px;
                    `;
                    slot.appendChild(emptyLabel);

                    // Reset slot styling for empty slot
                    slot.style.background = 'rgba(60, 60, 60, 0.8)';
                    slot.style.borderColor = '#555';
                    slot.title = 'Empty slot';

                    // Slot data already handles empty state
                }
            }

            console.log(`Backpack updated: ${filledSlots} filled slots out of ${this.backpackSlots.length} total`);
        };

        // Transfer item from hotbar to backpack
        this.transferItemToBackpack = (hotbarIndex) => {
            const hotbarSlot = this.hotbarSlots[hotbarIndex];
            if (!hotbarSlot.itemType || hotbarSlot.quantity === 0) {
                this.updateStatus(`No items in hotbar slot ${hotbarIndex + 1}`, 'warning');
                return;
            }

            // Find an empty backpack slot or one with the same item type
            const emptyBackpackSlot = this.findEmptyBackpackSlot();
            const existingSlot = this.findItemInSlots(hotbarSlot.itemType);

            let targetSlotIndex = -1;
            if (existingSlot && existingSlot.location === 'backpack') {
                const backpackSlot = this.backpackSlots[existingSlot.index];
                if (backpackSlot.quantity < this.STACK_LIMIT) {
                    targetSlotIndex = existingSlot.index;
                }
            } else if (emptyBackpackSlot !== -1) {
                targetSlotIndex = emptyBackpackSlot;
            }

            if (targetSlotIndex !== -1) {
                // Transfer 1 item from hotbar to backpack
                const itemType = hotbarSlot.itemType;
                const transferAmount = 1;

                // Remove from hotbar
                hotbarSlot.quantity -= transferAmount;
                if (hotbarSlot.quantity === 0) {
                    hotbarSlot.itemType = '';
                }

                // Add to backpack
                if (this.backpackSlots[targetSlotIndex].itemType === itemType) {
                    this.backpackSlots[targetSlotIndex].quantity += transferAmount;
                } else {
                    this.setBackpackSlot(targetSlotIndex, itemType, transferAmount);
                }

                this.updateHotbarCounts();
                this.updateBackpackInventoryDisplay();
                console.log(`Transferred 1 ${itemType} from hotbar to backpack`);
                this.updateStatus(`📦 Moved ${itemType} to backpack`, 'success');
            } else {
                this.updateStatus(`Backpack is full!`, 'warning');
            }
        };

        // Transfer item from backpack to hotbar
        this.transferItemToHotbar = (backpackIndex) => {
            // Get the item type from the backpack slot
            if (!this.backpackSlots || !this.backpackSlots[backpackIndex]) return;

            const backpackSlot = this.backpackSlots[backpackIndex];
            if (!backpackSlot.itemType || backpackSlot.quantity === 0) {
                this.updateStatus(`No items in backpack slot`, 'warning');
                return;
            }

            // Find an empty hotbar slot or one with the same item type (excluding backpack button)
            const emptyHotbarSlot = this.findEmptyHotbarSlot();
            const existingSlot = this.findItemInSlots(backpackSlot.itemType);

            let targetSlotIndex = -1;
            if (existingSlot && existingSlot.location === 'hotbar') {
                const hotbarSlot = this.hotbarSlots[existingSlot.index];
                if (hotbarSlot.quantity < this.STACK_LIMIT) {
                    targetSlotIndex = existingSlot.index;
                }
            } else if (emptyHotbarSlot !== -1) {
                targetSlotIndex = emptyHotbarSlot;
            }

            if (targetSlotIndex !== -1) {
                // Transfer 1 item from backpack to hotbar
                const itemType = backpackSlot.itemType;
                const transferAmount = 1;

                // Remove from backpack
                backpackSlot.quantity -= transferAmount;
                if (backpackSlot.quantity === 0) {
                    backpackSlot.itemType = '';
                }

                // Add to hotbar
                if (this.hotbarSlots[targetSlotIndex].itemType === itemType) {
                    this.hotbarSlots[targetSlotIndex].quantity += transferAmount;
                } else {
                    this.setHotbarSlot(targetSlotIndex, itemType, transferAmount);
                }

                this.updateHotbarCounts();
                this.updateBackpackInventoryDisplay();
                console.log(`Transferred 1 ${itemType} from backpack to hotbar`);
                this.updateStatus(`🔧 Moved ${itemType} to hotbar`, 'success');
            } else {
                this.updateStatus(`Hotbar is full!`, 'warning');
            }
        };

        // Get harvesting time for block type with current tool
        this.getHarvestTime = (blockType) => {
            const currentTool = this.hotbarSlots[this.selectedSlot];

            // Base harvest times (in milliseconds)
            const baseTimes = {
                grass: 500,
                wood: 1000,
                stone: 1500,
                sand: 300,
                shrub: 400,
                backpack: 100, // Quick pickup
                workbench: 800,
                brick: 2000,
                iron: 3000, // Very hard without proper tools
                glass: 800,
                glowstone: 1200,
                flowers: 200
            };

            // Tool efficiency multipliers
            const toolEfficiency = {
                // Fists (no tool)
                grass: { grass: 1.0, wood: 2.0, stone: 4.0 }, // Grass good for grass, bad for hard materials
                stone: { stone: 0.7, wood: 1.2, grass: 1.1 }, // Stone tools better for stone
                wood: { wood: 0.6, grass: 0.8, stone: 2.0 }, // Wood tools best for wood
                workbench: { wood: 0.8, stone: 1.5 }, // Workbench is a tool itself
                iron: { stone: 0.5, iron: 0.3, wood: 0.4 }, // Iron tools are best
                // Other materials default to 1.5x (inefficient as tools)
            };

            const baseTime = baseTimes[blockType] || 1000;
            const efficiency = toolEfficiency[currentTool]?.[blockType] || 1.5; // Default slow

            // Some blocks require specific tools
            if (blockType === 'iron' && !['iron', 'stone'].includes(currentTool)) {
                return -1; // Cannot harvest without proper tool
            }

            return Math.floor(baseTime * efficiency);
        };

        // Start harvesting a block
        this.startHarvesting = (x, y, z) => {
            const key = `${x},${y},${z}`;
            const blockData = this.world[key];

            if (!blockData) return;

            const harvestTime = this.getHarvestTime(blockData.type);

            // Check if block can be harvested with current tool
            if (harvestTime === -1) {
                this.updateStatus(`Cannot harvest ${blockData.type} without proper tools!`);
                return;
            }

            // Stop any existing harvesting
            this.stopHarvesting();

            // Start new harvesting
            this.isHarvesting = true;
            this.harvestingTarget = { x, y, z, blockType: blockData.type };
            this.harvestingStartTime = Date.now();
            this.harvestingDuration = harvestTime;

            console.log(`Starting to harvest ${blockData.type} (${harvestTime}ms)`);
            this.updateStatus(`Harvesting ${blockData.type}... (${(harvestTime/1000).toFixed(1)}s)`);
        };

        // Stop harvesting
        this.stopHarvesting = () => {
            if (this.isHarvesting) {
                this.isHarvesting = false;
                this.harvestingTarget = null;
                console.log('Harvesting stopped');
            }
        };

        // Update harvesting progress (called in game loop)
        this.updateHarvesting = () => {
            if (!this.isHarvesting || !this.harvestingTarget) return;

            const elapsed = Date.now() - this.harvestingStartTime;
            const progress = elapsed / this.harvestingDuration;

            if (progress >= 1.0) {
                // Harvesting complete!
                const { x, y, z } = this.harvestingTarget;
                this.completeHarvesting(x, y, z);
            } else {
                // Update progress display
                const remaining = ((this.harvestingDuration - elapsed) / 1000).toFixed(1);
                this.updateStatus(`Harvesting... ${remaining}s remaining`);
            }
        };

        // Complete harvesting and remove block
        this.completeHarvesting = (x, y, z) => {
            console.log(`Harvesting completed at ${x}, ${y}, ${z}`);

            // Get block type before removing it
            const key = `${x},${y},${z}`;
            const blockData = this.world[key];

            console.log('Block data:', blockData); // Debug logging

            if (blockData && blockData.type !== 'shrub' && blockData.type !== 'backpack') {
                // Add the harvested block to inventory
                const blockType = blockData.type;

                // Debug: Check what we're actually harvesting
                console.log(`Block at ${key}:`, {
                    type: blockType,
                    playerPlaced: blockData.playerPlaced,
                    blockData: blockData
                });

                this.addToInventory(blockType, 1);
                console.log(`Harvested ${blockType}!`);

                // addToInventory() already handles UI updates

                // Use enhanced notification system with harvest type
                const emoji = this.getItemIcon(blockType);
                this.updateStatus(`${emoji} Harvested ${blockType}!`, 'harvest');
            } else if (!blockData) {
                console.log(`No block data found at ${key}`);
            } else {
                console.log(`Skipping special block type: ${blockData.type}`);
            }

            this.removeBlock(x, y, z); // Use existing removal logic
            this.stopHarvesting();
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
        this.blockTypes = {
            grass: { color: 0x228B22, texture: 'grass' },    // Forest green with grass pattern
            dirt: { color: 0x8B4513, texture: 'dirt' },      // Brown dirt texture
            stone: { color: 0x696969, texture: 'stone' },    // Dim gray with stone pattern
            coal: { color: 0x2F2F2F, texture: 'coal' },      // Dark gray/black coal texture
            wood: { color: 0x8B4513, texture: 'wood' },      // Saddle brown with wood grain
            sand: { color: 0xF4A460, texture: 'sand' },      // Sandy brown with grain texture
            glass: { color: 0x87CEEB, texture: 'glass' },    // Sky blue, translucent
            brick: { color: 0xB22222, texture: 'brick' },    // Fire brick with mortar lines
            glowstone: { color: 0xFFD700, texture: 'glow' }, // Gold with glowing effect
            iron: { color: 0x708090, texture: 'metal' },     // Slate gray with metallic shine
            flowers: { color: 0xFF69B4, texture: 'flower' }, // Hot pink with flower pattern
            snow: { color: 0xFFFFFF, texture: 'snow' },      // Pure white with snow texture
            shrub: { color: 0x2F5233, texture: 'shrub' },    // Dark green with brown stem pattern
            backpack: { color: 0x8B4513, texture: 'transparent' }, // Transparent for billboard
            workbench: { color: 0x8B7355, texture: 'workbench' } // Tan brown workbench
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
            } else if (blockType.texture === 'shrub') {
                // Shrub texture - brown stem with green leafy top
                ctx.globalAlpha = 0.6;
                // Brown stem in center
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(28, 48, 8, 16); // Vertical stem
                // Green leafy areas
                ctx.fillStyle = '#90EE90';
                for (let i = 0; i < 15; i++) {
                    const x = 16 + Math.random() * 32;
                    const y = 16 + Math.random() * 32;
                    ctx.beginPath();
                    ctx.arc(x, y, 3 + Math.random() * 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                // Add some darker green depth
                ctx.fillStyle = '#228B22';
                for (let i = 0; i < 8; i++) {
                    const x = 20 + Math.random() * 24;
                    const y = 20 + Math.random() * 24;
                    ctx.fillRect(x, y, 2, 2);
                }
            } else if (blockType.texture === 'backpack') {
                // Backpack texture - leather with strap details
                ctx.globalAlpha = 0.4;
                // Leather stitching pattern
                ctx.strokeStyle = '#654321';
                ctx.lineWidth = 2;
                // Outer border stitching
                ctx.strokeRect(8, 8, 48, 48);
                // Cross straps
                ctx.beginPath();
                ctx.moveTo(20, 8);
                ctx.lineTo(20, 56);
                ctx.moveTo(44, 8);
                ctx.lineTo(44, 56);
                ctx.stroke();
                // Buckle details
                ctx.fillStyle = '#444444';
                ctx.fillRect(18, 16, 4, 6);
                ctx.fillRect(42, 16, 4, 6);
                // Wear marks for aged look
                ctx.globalAlpha = 0.2;
                ctx.fillStyle = '#5D4037';
                for (let i = 0; i < 12; i++) {
                    ctx.fillRect(12 + Math.random() * 40, 12 + Math.random() * 40, 2, 1);
                }
            } else if (blockType.texture === 'workbench') {
                // Workbench texture - wood with tool marks
                ctx.globalAlpha = 0.4;
                // Wood grain
                ctx.strokeStyle = '#654321';
                ctx.lineWidth = 1;
                for (let i = 0; i < 8; i++) {
                    ctx.beginPath();
                    ctx.moveTo(0, 8 + i * 6);
                    ctx.lineTo(64, 8 + i * 6);
                    ctx.stroke();
                }
                // Tool marks and scratches
                ctx.strokeStyle = '#333333';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(16, 20);
                ctx.lineTo(48, 44);
                ctx.moveTo(20, 40);
                ctx.lineTo(44, 20);
                ctx.stroke();
                // Corner reinforcements
                ctx.fillStyle = '#444444';
                ctx.fillRect(4, 4, 6, 6);
                ctx.fillRect(54, 4, 6, 6);
                ctx.fillRect(4, 54, 6, 6);
                ctx.fillRect(54, 54, 6, 6);
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
            } else if (blockType.texture === 'transparent') {
                return new THREE.MeshLambertMaterial({
                    transparent: true,
                    opacity: 0.0, // Completely invisible
                    alphaTest: 0.1
                });
            } else {
                return new THREE.MeshLambertMaterial({ map: texture });
            }
        };

        // Create materials once for efficiency (normal + darker versions)
        this.materials = {};
        this.playerMaterials = {}; // Darker versions for player-placed blocks

        Object.keys(this.blockTypes).forEach(type => {
            // Normal materials
            this.materials[type] = createBlockMaterial(this.blockTypes[type]);

            // Pre-create darker materials for player-placed blocks (performance optimization)
            const darkerColor = new THREE.Color(this.blockTypes[type].color).multiplyScalar(0.7);
            this.playerMaterials[type] = new THREE.MeshLambertMaterial({
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
                heightColorRange: { min: 0.6, max: 1.2 }, // Brightness multiplier range
                shrubChance: 0.35 // High density - 35% chance per surface block
            },
            desert: {
                name: 'Desert',
                color: 0xDEB887, // Burlywood/sand
                minHeight: -1,
                maxHeight: 2,
                surfaceBlock: 'sand',
                subBlock: 'sand',
                mapColor: '#DEB887',
                heightColorRange: { min: 0.7, max: 1.1 },
                shrubChance: 0.03 // Very rare - 3% chance (desert brush)
            },
            mountain: {
                name: 'Mountain',
                color: 0x696969, // Dim gray
                minHeight: 2,
                maxHeight: 8,
                surfaceBlock: 'stone',
                subBlock: 'iron',
                mapColor: '#696969',
                heightColorRange: { min: 0.8, max: 1.4 },
                shrubChance: 0.08 // Low density - 8% chance (hardy mountain shrubs)
            },
            plains: {
                name: 'Plains',
                color: 0x90EE90, // Light green
                minHeight: -1,
                maxHeight: 1,
                surfaceBlock: 'grass',
                subBlock: 'stone',
                mapColor: '#90EE90',
                heightColorRange: { min: 0.65, max: 1.15 },
                shrubChance: 0.20 // Medium density - 20% chance
            },
            tundra: {
                name: 'Tundra',
                color: 0xF0F8FF, // Alice blue
                minHeight: -3,
                maxHeight: 0,
                surfaceBlock: 'stone',
                subBlock: 'iron',
                mapColor: '#F0F8FF',
                heightColorRange: { min: 0.5, max: 1.0 },
                shrubChance: 0.01 // Extremely rare - 1% chance (hardy tundra plants)
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

                    // Generate shrubs on top of surface (if no snow)
                    if (!hasSnow && biome.shrubChance > 0) {
                        const shrubNoise = this.seededNoise(worldX + 3000, worldZ + 3000, this.worldSeed);
                        if (shrubNoise > (1 - biome.shrubChance * 2)) { // Convert chance to noise threshold
                            this.addBlock(worldX, height + 1, worldZ, 'shrub', false); // Place shrub on top of surface
                        }
                    }
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

            // Clean up distant chunk tracking data to prevent memory bloat
            this.cleanupChunkTracking(playerChunkX, playerChunkZ);

            // Load chunks around player
            for (let dx = -this.renderDistance; dx <= this.renderDistance; dx++) {
                for (let dz = -this.renderDistance; dz <= this.renderDistance; dz++) {
                    const chunkX = playerChunkX + dx;
                    const chunkZ = playerChunkZ + dz;
                    generateChunk(chunkX, chunkZ);
                    
                    // Check for random world item spawning in this chunk
                    this.checkChunkForWorldItems(chunkX, chunkZ);
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

        // Spawn starting backpack after terrain is ready
        this.spawnStartingBackpack();

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

                // PHASE 5: Collect crafted objects for saving
                const craftedObjectsData = [];
                if (this.craftedObjects) {
                    for (const [key, objectData] of Object.entries(this.craftedObjects)) {
                        craftedObjectsData.push({
                            key: key,
                            itemId: objectData.itemId,
                            position: objectData.position,
                            metadata: objectData.metadata
                        });
                    }
                }

                const saveData = {
                    modifiedBlocks: modifiedBlocks,
                    craftedObjects: craftedObjectsData, // NEW: Save crafted objects
                    inventoryMetadata: this.inventoryMetadata, // NEW: Save item metadata
                    player: this.player,
                    worldSeed: this.worldSeed,
                    timestamp: Date.now()
                };

                localStorage.setItem("NebulaWorld", JSON.stringify(saveData));
                this.updateStatus(`World saved (${modifiedBlocks.length} blocks, ${craftedObjectsData.length} crafted objects)`);
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

                // PHASE 5: Load crafted objects and inventory metadata
                if (saveData.inventoryMetadata) {
                    this.inventoryMetadata = saveData.inventoryMetadata;
                    console.log(`📦 Restored ${Object.keys(this.inventoryMetadata).length} item metadata entries`);
                }

                if (saveData.craftedObjects && saveData.craftedObjects.length > 0) {
                    console.log(`🎨 Loading ${saveData.craftedObjects.length} crafted objects...`);
                    // Clear existing crafted objects first
                    if (this.craftedObjects) {
                        for (const [key, objectData] of Object.entries(this.craftedObjects)) {
                            if (objectData.mesh) {
                                this.scene.remove(objectData.mesh);
                            }
                        }
                    }
                    this.craftedObjects = {};

                    // Recreate each crafted object
                    saveData.craftedObjects.forEach(objData => {
                        console.log(`🔧 Recreating crafted object: ${objData.itemId} at ${objData.key}`);
                        // Restore metadata to inventoryMetadata if missing
                        if (!this.inventoryMetadata[objData.itemId]) {
                            this.inventoryMetadata[objData.itemId] = objData.metadata;
                        }
                        // Recreate the 3D object at its saved position
                        this.placeCraftedObject(objData.position.x, objData.position.y, objData.position.z, objData.itemId);
                    });
                }

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

                const craftedCount = saveData.craftedObjects ? saveData.craftedObjects.length : 0;
                this.updateStatus(`World loaded (${saveData.modifiedBlocks.length} blocks, ${craftedCount} crafted objects)`);
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

            // Draw backpack position (red square) if not collected yet
            if (this.backpackPosition && !this.hasBackpack) {
                const relX = this.backpackPosition.x - this.player.position.x;
                const relZ = this.backpackPosition.z - this.player.position.z;

                // Convert to minimap coordinates
                const backpackMapX = size/2 + relX / scale;
                const backpackMapZ = size/2 + relZ / scale;

                // Only draw if within minimap bounds
                if (backpackMapX >= 0 && backpackMapX < size && backpackMapZ >= 0 && backpackMapZ < size) {
                    ctx.fillStyle = '#ff0000'; // Bright red
                    ctx.fillRect(backpackMapX - 2, backpackMapZ - 2, 4, 4); // 4x4 red square

                    // Add a subtle glow effect
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                    ctx.fillRect(backpackMapX - 3, backpackMapZ - 3, 6, 6); // Outer glow
                }
            }

            // Draw player position (white dot)
            ctx.fillStyle = '#ffffff'; // Changed to white so backpack red stands out
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

            // Animate billboards (even when paused - they should keep floating)
            this.animateBillboards(currentTime);

            // Check for nearby workbench (even when paused)
            this.checkWorkbenchProximity();

            // Always continue animation loop, but skip input processing if paused or controls disabled
            if (this.isPaused || !this.controlsEnabled) {
                // Still render the scene even when paused
                this.renderer.render(this.scene, this.camera);
                return;
            }

            const speed = 4.0; // Units per second
            const jumpSpeed = 9.0; // Jump velocity - increased for 2-block obstacles, was 8.0
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

            // ========== RAYCAST UTILITY FUNCTIONS (Phase 2) ==========
            // Simple block existence check for raycast system
            const checkBlockAtPosition = (x, y, z) => {
                const blockX = Math.floor(x);
                const blockY = Math.floor(y);
                const blockZ = Math.floor(z);
                const key = `${blockX},${blockY},${blockZ}`;
                return this.world[key] && this.world[key] !== 'air';
            };

            // Main raycast collision detection function
            const raycastCollision = (fromPos, toPos, rayHeight) => {
                const direction = new THREE.Vector3().subVectors(toPos, fromPos);
                const distance = direction.length();
                if (distance < 0.001) return { hit: false };

                direction.normalize();
                const steps = Math.max(2, Math.ceil(distance * 6)); // 6 checks per unit for precision

                for (let i = 1; i <= steps; i++) {
                    const t = i / steps;
                    const checkPos = new THREE.Vector3().lerpVectors(fromPos, toPos, t);
                    checkPos.y = rayHeight;

                    if (checkBlockAtPosition(checkPos.x, checkPos.y, checkPos.z)) {
                        return {
                            hit: true,
                            position: checkPos.clone(),
                            distance: distance * t
                        };
                    }
                }
                return { hit: false };
            };

            // Helper to create Vector3 from player position
            const getPlayerVector3 = () => {
                return new THREE.Vector3(this.player.position.x, this.player.position.y, this.player.position.z);
            };
            // ========== END RAYCAST UTILITIES ==========

            // ========== HITBOX COLLISION SYSTEM ==========
            // Player hitbox dimensions
            const PLAYER_WIDTH = 0.6;
            const PLAYER_HEIGHT = 1.8;
            const PLAYER_DEPTH = 0.6;

            // Create player hitbox at given position
            const createPlayerHitbox = (x, y, z) => {
                const halfWidth = PLAYER_WIDTH / 2;
                const halfHeight = PLAYER_HEIGHT / 2;
                const halfDepth = PLAYER_DEPTH / 2;

                return {
                    minX: x - halfWidth,
                    maxX: x + halfWidth,
                    minY: y - halfHeight,
                    maxY: y + halfHeight,
                    minZ: z - halfDepth,
                    maxZ: z + halfDepth
                };
            };

            // Create block hitbox at given block coordinates
            const createBlockHitbox = (blockX, blockY, blockZ) => {
                return {
                    minX: blockX,
                    maxX: blockX + 1,
                    minY: blockY,
                    maxY: blockY + 1,
                    minZ: blockZ,
                    maxZ: blockZ + 1
                };
            };

            // AABB collision detection between two hitboxes
            const hitboxesCollide = (hitbox1, hitbox2) => {
                return (
                    hitbox1.minX <= hitbox2.maxX && hitbox1.maxX >= hitbox2.minX &&
                    hitbox1.minY <= hitbox2.maxY && hitbox1.maxY >= hitbox2.minY &&
                    hitbox1.minZ <= hitbox2.maxZ && hitbox1.maxZ >= hitbox2.minZ
                );
            };

            // Check if player hitbox collides with any blocks in the world
            const checkHitboxCollision = (playerHitbox) => {
                // Get the range of blocks to check based on player hitbox bounds
                const minBlockX = Math.floor(playerHitbox.minX);
                const maxBlockX = Math.floor(playerHitbox.maxX);
                const minBlockY = Math.floor(playerHitbox.minY);
                const maxBlockY = Math.floor(playerHitbox.maxY);
                const minBlockZ = Math.floor(playerHitbox.minZ);
                const maxBlockZ = Math.floor(playerHitbox.maxZ);

                // Check all blocks in the range
                for (let x = minBlockX; x <= maxBlockX; x++) {
                    for (let y = minBlockY; y <= maxBlockY; y++) {
                        for (let z = minBlockZ; z <= maxBlockZ; z++) {
                            if (checkBlockAtPosition(x, y, z)) {
                                const blockHitbox = createBlockHitbox(x, y, z);
                                if (hitboxesCollide(playerHitbox, blockHitbox)) {
                                    return { collision: true, blockX: x, blockY: y, blockZ: z };
                                }
                            }
                        }
                    }
                }
                return { collision: false };
            };
            // ========== END HITBOX UTILITIES ==========

            // ========== HITBOX-BASED COLLISION SYSTEM ==========
            // Apply horizontal movement with proper AABB collision
            const moveSpeed = speed * deltaTime;

            // Hitbox-based horizontal collision with perfect coverage
            if (Math.abs(dir.x) > 0.001 || Math.abs(dir.z) > 0.001) {
                const currentPos = getPlayerVector3();
                const newX = currentPos.x + dir.x * moveSpeed;
                const newZ = currentPos.z + dir.z * moveSpeed;

                // Create player hitbox excluding bottom to avoid ground collision
                const createHorizontalHitbox = (x, z) => {
                    return {
                        minX: x - PLAYER_WIDTH / 2,
                        maxX: x + PLAYER_WIDTH / 2,
                        minY: currentPos.y - PLAYER_HEIGHT / 2 + 0.1, // Slightly above ground
                        maxY: currentPos.y + PLAYER_HEIGHT / 2,
                        minZ: z - PLAYER_DEPTH / 2,
                        maxZ: z + PLAYER_DEPTH / 2
                    };
                };

                // Test full movement first
                const newHitbox = createHorizontalHitbox(newX, newZ);
                const fullCollision = checkHitboxCollision(newHitbox);

                if (!fullCollision.collision) {
                    // No collision - move freely
                    this.player.position.x = newX;
                    this.player.position.z = newZ;
                } else {
                    // Collision detected - try sliding along walls
                    // Test X movement only
                    const xOnlyHitbox = createHorizontalHitbox(newX, currentPos.z);
                    const xCollision = checkHitboxCollision(xOnlyHitbox);

                    if (!xCollision.collision) {
                        this.player.position.x = newX;
                    }

                    // Test Z movement only
                    const zOnlyHitbox = createHorizontalHitbox(currentPos.x, newZ);
                    const zCollision = checkHitboxCollision(zOnlyHitbox);

                    if (!zCollision.collision) {
                        this.player.position.z = newZ;
                    }
                }
            }
            
            // Hitbox-based vertical collision with full player volume
            if (!this.player.velocity) this.player.velocity = 0;
            this.player.velocity -= gravity * deltaTime; // Apply gravity over time

            const currentPos = getPlayerVector3();
            const newY = this.player.position.y + (this.player.velocity * deltaTime);

            if (this.player.velocity <= 0) {
                // Falling or stationary - check for ground collision using full hitbox
                const testHitbox = createPlayerHitbox(currentPos.x, newY, currentPos.z);
                const collision = checkHitboxCollision(testHitbox);

                if (collision.collision) {
                    // Found collision - place player on top of the colliding block
                    const groundLevel = collision.blockY + 1;
                    this.player.position.y = groundLevel + PLAYER_HEIGHT / 2;
                    this.player.velocity = 0;
                    this.isOnGround = true;
                } else {
                    // No collision - continue falling
                    this.player.position.y = newY;
                    this.isOnGround = false;
                }
            } else {
                // Jumping upward - check for ceiling collision using full hitbox
                const testHitbox = createPlayerHitbox(currentPos.x, newY, currentPos.z);
                const collision = checkHitboxCollision(testHitbox);

                if (collision.collision) {
                    // Hit ceiling - stop upward movement
                    this.player.velocity = 0;
                    // Don't change Y position to avoid clipping into ceiling
                } else {
                    // No ceiling collision - continue jumping
                    this.player.position.y = newY;
                    this.isOnGround = false;
                }
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
                const cameraSpeed = 0.5 * deltaTime;
                this.player.rotation.y -= this.rightJoystickValue.x * cameraSpeed;
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

            // Update harvesting progress
            this.updateHarvesting();

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
            
            // Hotbar selection (1-4) and backpack toggle (5)
            if (key >= '1' && key <= '9') {
                const slot = parseInt(key) - 1;
                if (slot < this.hotbarSlots.length && slot < 4) {
                    // Keys 1-4: Select hotbar slots
                    this.selectedSlot = slot;
                    this.updateHotbarSelection();
                    const slotData = this.hotbarSlots[slot];
                    const displayText = slotData?.itemType ? `${slotData.itemType} (${slotData.quantity})` : 'empty';
                    console.log(`Selected hotbar slot ${slot + 1}: ${displayText}`);
                    e.preventDefault();
                } else if (key === '5' && this.hasBackpack) {
                    // Key 5: Toggle backpack inventory
                    this.toggleBackpackInventory();
                    e.preventDefault();
                }
            }

            // ESC key: Close backpack if open
            if (key === 'escape' && this.hasBackpack && this.backpackInventoryElement) {
                const isVisible = this.backpackInventoryElement.style.transform.includes('translateY(0px)');
                if (isVisible) {
                    this.toggleBackpackInventory();
                    e.preventDefault();
                }
            }

            // Q and E for hotbar navigation
            if (key === 'q') {
                this.selectedSlot = (this.selectedSlot - 1 + this.hotbarSlots.length) % this.hotbarSlots.length;
                this.updateHotbarSelection();
                const slotData = this.hotbarSlots[this.selectedSlot];
                const displayText = slotData?.itemType ? `${slotData.itemType} (${slotData.quantity})` : 'empty';
                console.log(`Selected hotbar slot ${this.selectedSlot + 1}: ${displayText}`);
                e.preventDefault();
            }
            if (key === 'e') {
                // Check if near workbench first
                if (this.currentNearbyWorkbench) {
                    this.workbenchSystem.open(
                        this.currentNearbyWorkbench.x,
                        this.currentNearbyWorkbench.y,
                        this.currentNearbyWorkbench.z
                    );
                    e.preventDefault();
                } else {
                    // Fallback to hotbar navigation
                    this.selectedSlot = (this.selectedSlot + 1) % this.hotbarSlots.length;
                    this.updateHotbarSelection();
                    const slotData = this.hotbarSlots[this.selectedSlot];
                const displayText = slotData?.itemType ? `${slotData.itemType} (${slotData.quantity})` : 'empty';
                console.log(`Selected hotbar slot ${this.selectedSlot + 1}: ${displayText}`);
                    e.preventDefault();
                }
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
            
            // Update raycaster - include both meshes and sprites for world items
            this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
            const intersects = this.raycaster.intersectObjects(
                this.scene.children.filter(obj => 
                    (obj.isMesh || obj.isSprite) && 
                    obj !== this.targetHighlight
                )
            );
            
            if (intersects.length > 0) {
                const hit = intersects[0];
                const pos = hit.object.position.clone();
                
                // Check if clicked object is a world item billboard
                if (hit.object.userData.type === 'worldItem') {
                    // Harvest world item directly
                    this.harvestWorldItem(hit.object);
                    return;
                }
                
                if (e.button === 0) { // Left click - harvesting (blocks or crafted objects)
                    // PHASE 6: Check if clicked object is a crafted object
                    if (hit.object.userData && hit.object.userData.isCraftedObject) {
                        console.log(`🎨 Harvesting crafted object: ${hit.object.userData.originalName}`);
                        this.harvestCraftedObject(hit.object);
                    } else {
                        // Regular block harvesting
                        this.startHarvesting(pos.x, pos.y, pos.z);
                    }
                } else if (e.button === 2) { // Right click - block placement only
                    const normal = hit.face.normal;
                    const placePos = pos.clone().add(normal);
                    const selectedSlot = this.hotbarSlots[this.selectedSlot];
                    const selectedBlock = selectedSlot?.itemType;

                    if (selectedBlock && selectedSlot.quantity > 0) {
                        // 🎯 THE BIG MOMENT: Detect crafted items vs regular blocks
                        if (selectedBlock.startsWith('crafted_')) {
                            // Place crafted 3D object with real dimensions!
                            console.log(`🎨 Placing crafted object: ${selectedBlock}`);
                            this.placeCraftedObject(placePos.x, placePos.y, placePos.z, selectedBlock);
                        } else {
                            // Place regular 1x1x1 block
                            this.addBlock(placePos.x, placePos.y, placePos.z, selectedBlock, true);
                        }
                        selectedSlot.quantity--;

                        // Clear slot if empty
                        if (selectedSlot.quantity === 0) {
                            selectedSlot.itemType = '';
                        }

                        this.updateHotbarCounts(); // Update hotbar display
                        this.updateBackpackInventoryDisplay(); // Update backpack display
                        console.log(`Placed ${selectedBlock}, ${selectedSlot.quantity} remaining in slot`);
                    } else {
                        console.log(`No items in selected hotbar slot!`);
                    }
                }
            }
        };
        
        const mouseupHandler = (e) => {
            // Reset highlight color to default (green for placement)
            this.targetHighlight.material.color.setHex(0x00ff00);

            // Stop harvesting when left mouse button is released
            if (e.button === 0) {
                this.stopHarvesting();
            }
        };
        
        // Prevent browser context menu when pointer is locked
        const contextmenuHandler = (e) => {
            if (document.pointerLockElement === this.renderer.domElement) {
                e.preventDefault();
            }
        };

        document.addEventListener('mousedown', mousedownHandler);
        document.addEventListener('mouseup', mouseupHandler);
        document.addEventListener('contextmenu', contextmenuHandler);
        this.eventListeners.push(
            { element: document, type: 'mousedown', handler: mousedownHandler },
            { element: document, type: 'mouseup', handler: mouseupHandler },
            { element: document, type: 'contextmenu', handler: contextmenuHandler }
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
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 10px 16px;
                border-radius: 8px;
                font-family: monospace;
                font-size: 14px;
                pointer-events: auto;
                z-index: 1000;
                border-left: 4px solid #4CAF50;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                backdrop-filter: blur(4px);
                transition: all 0.3s ease;
                opacity: 0.9;
                min-width: 200px;
                max-width: 400px;
            `;
            statusBar.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span id="status-icon">🎮</span>
                    <span id="status-text">Ready to explore!</span>
                </div>
            `;
            this.container.appendChild(statusBar);

            // Store references to inner elements
            this.statusIcon = statusBar.querySelector('#status-icon');
            this.statusText = statusBar.querySelector('#status-text');

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
            top: 48px;
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
            top: 48px;
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
        // Enhanced notification system
        this.updateStatus = (message, type = 'info', autoDismiss = true) => {
            console.log(`[VoxelWorld] ${message}`);

            if (!this.statusBar || !this.statusIcon || !this.statusText) return;

            // Clear any existing auto-dismiss timer
            if (this.statusTimer) {
                clearTimeout(this.statusTimer);
            }

            // Define notification types with icons and colors
            const notificationTypes = {
                info: { icon: 'ℹ️', color: '#2196F3', borderColor: '#2196F3' },
                success: { icon: '✅', color: '#4CAF50', borderColor: '#4CAF50' },
                warning: { icon: '⚠️', color: '#FF9800', borderColor: '#FF9800' },
                error: { icon: '❌', color: '#F44336', borderColor: '#F44336' },
                harvest: { icon: '⛏️', color: '#8BC34A', borderColor: '#8BC34A' },
                craft: { icon: '🔨', color: '#9C27B0', borderColor: '#9C27B0' },
                discovery: { icon: '🎒', color: '#FF5722', borderColor: '#FF5722' },
                progress: { icon: '⏳', color: '#FFC107', borderColor: '#FFC107' },
                magic: { icon: '✨', color: '#E91E63', borderColor: '#E91E63' }
            };

            const notification = notificationTypes[type] || notificationTypes.info;

            // Update icon and text
            this.statusIcon.textContent = notification.icon;
            this.statusText.textContent = message;

            // Update styling
            this.statusBar.style.borderLeftColor = notification.borderColor;
            this.statusBar.style.opacity = '1';
            this.statusBar.style.transform = 'translateX(0)';

            // Add a subtle pulse animation for important notifications
            if (['success', 'error', 'discovery'].includes(type)) {
                this.statusBar.style.animation = 'statusPulse 0.6s ease-out';
                setTimeout(() => {
                    if (this.statusBar) {
                        this.statusBar.style.animation = '';
                    }
                }, 600);
            }

            // Auto-dismiss after delay
            if (autoDismiss) {
                const dismissDelay = type === 'error' ? 8000 :
                                   type === 'discovery' ? 6000 :
                                   type === 'warning' ? 5000 : 4000;

                this.statusTimer = setTimeout(() => {
                    if (this.statusBar) {
                        this.statusBar.style.opacity = '0.5';
                        this.statusText.textContent = 'Ready to explore!';
                        this.statusIcon.textContent = '🎮';
                        this.statusBar.style.borderLeftColor = '#4CAF50';
                    }
                }, dismissDelay);
            }
        };

        // Add CSS animation for pulse effect
        if (!document.head.querySelector('style[data-status-animation]')) {
            const style = document.createElement('style');
            style.setAttribute('data-status-animation', 'true');
            style.textContent = `
                @keyframes statusPulse {
                    0% { transform: translateX(0) scale(1); }
                    50% { transform: translateX(-2px) scale(1.02); }
                    100% { transform: translateX(0) scale(1); }
                }
            `;
            document.head.appendChild(style);
        }

        // Add Material Design icon styles for crafted items
        if (!document.head.querySelector('style[data-crafted-icons]')) {
            const style = document.createElement('style');
            style.setAttribute('data-crafted-icons', 'true');
            style.textContent = `
                /* Material Design icons for crafted items */
                .crafted-item-icon {
                    display: inline-block !important;
                    vertical-align: middle;
                    font-size: 16px !important;
                    line-height: 1;
                    font-family: 'Material Icons' !important;
                    font-weight: normal;
                    font-style: normal;
                    text-decoration: none;
                    text-transform: none;
                    letter-spacing: normal;
                    word-wrap: normal;
                    white-space: nowrap;
                    direction: ltr;
                    -webkit-font-smoothing: antialiased;
                    text-rendering: optimizeLegibility;
                    -moz-osx-font-smoothing: grayscale;
                    font-feature-settings: 'liga';
                    user-select: none;
                }

                /* Ensure proper sizing in hotbar and backpack */
                .hotbar-slot .crafted-item-icon,
                .backpack-slot .crafted-item-icon {
                    font-size: 16px !important;
                }
            `;
            document.head.appendChild(style);
        }

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
                // Single tap to start harvesting
                this.handleMobileTouchStart(e.touches[0]);
            }
        });

        this.renderer.domElement.addEventListener('touchend', (e) => {
            // Stop harvesting when touch ends
            this.stopHarvesting();
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
    handleMobileTouchStart(touch) {
        // Update raycaster for touch position
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children.filter(obj => obj.isMesh && obj !== this.targetHighlight));

        if (intersects.length > 0) {
            const hit = intersects[0];
            const pos = hit.object.position.clone();

            // Start harvesting on mobile touch and hold
            this.startHarvesting(pos.x, pos.y, pos.z);
        }
    }
}

export async function initVoxelWorld(container) {
    console.log('🔧 initVoxelWorld called with container:', container);
    
    try {
        const app = new NebulaVoxelApp(container);
        console.log('📱 NebulaVoxelApp created');

        // Initialize workbench system
        app.workbenchSystem.init();
        console.log('🔨 WorkbenchSystem initialized');

        console.log('✅ VoxelWorld initialization completed');

        return app;
    } catch (error) {
        console.error('❌ Error in initVoxelWorld:', error);
        throw error;
    }
}
