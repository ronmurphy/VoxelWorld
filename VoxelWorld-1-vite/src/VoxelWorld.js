import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import Stats from 'stats.js';
import { WorkbenchSystem } from './WorkbenchSystem.js';
import { ToolBenchSystem } from './ToolBenchSystem.js';
import { KitchenBenchSystem } from './KitchenBenchSystem.js';
import { CompanionHuntSystem } from './CompanionHuntSystem.js';
import { BiomeWorldGen } from './BiomeWorldGen.js';
import { WorkerManager } from './worldgen/WorkerManager.js';
import { InventorySystem } from './InventorySystem.js';
import { HotbarSystem } from './HotbarSystem.js';
import { BackpackSystem } from './BackpackSystem.js';
import { EnhancedGraphics } from './EnhancedGraphics.js';
import { AnimationSystem } from './AnimationSystem.js';
import { PlayerItemsSystem } from './PlayerItemsSystem.js';
import { StaminaSystem } from './StaminaSystem.js';
import { PlayerHP } from './PlayerHP.js';
import { BlockResourcePool } from './BlockResourcePool.js';
import { ModificationTracker } from './serialization/ModificationTracker.js';
import { GhostSystem } from './GhostSystem.js';
import { AngryGhostSystem } from './AngryGhostSystem.js';
import { BattleSystem } from './BattleSystem.js';
import { BattleArena } from './BattleArena.js';
import { RPGIntegration } from './rpg/RPGIntegration.js';
import { CompanionCodex } from './ui/CompanionCodex.js';
import { CompanionPortrait } from './ui/CompanionPortrait.js';
import { TutorialScriptSystem } from './ui/TutorialScriptSystem.js';
import { SargemQuestEditor } from './ui/SargemQuestEditor.js';
import { NPCManager } from './entities/NPC.js';
import { ChunkLODManager } from './rendering/ChunkLODManager.js';
import { LODDebugOverlay } from './rendering/LODDebugOverlay.js';
import { ChunkMeshManager } from './rendering/ChunkMeshManager.js';
import ChristmasSystem from './ChristmasSystem.js';
import { FarmingSystem } from './FarmingSystem.js';
import { MusicSystem } from './MusicSystem.js';
import { marked } from 'marked';
import { SaveSystem } from './SaveSystem.js';
import { AnimalSystem } from './AnimalSystem.js';

// 🚀 Enable BVH acceleration for all BufferGeometry raycasting
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;
import { farmingBlockTypes } from './FarmingBlockTypes.js';
import { CraftedTools } from './CraftedTools.js';
import { SpearSystem } from './SpearSystem.js';
import { createEmojiChooser } from './EmojiChooser.js';
import * as CANNON from 'cannon-es';

class NebulaVoxelApp {
    constructor(container) {
        // Initialize resource pool FIRST for geometry/material pooling
        this.resourcePool = new BlockResourcePool();
        console.log('🎮 Phase 1: Object Pooling enabled');

        // 📊 Initialize FPS counter (hidden by default)
        this.stats = new Stats();
        this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb
        this.stats.dom.style.position = 'absolute';
        this.stats.dom.style.top = '0px';
        this.stats.dom.style.left = '0px';
        this.stats.dom.style.display = 'none'; // Hidden by default
        this.statsEnabled = false;
        document.body.appendChild(this.stats.dom);
        console.log('📊 FPS counter initialized (toggle with View > FPS menu)');

        // Initialize properties
        this.world = {};
        this.loadedChunks = new Set();
        this.chunkSize = 8;  // Reduced from 12 for better performance

        // Load render distance from user preference first, then benchmark cache
        const userPrefKey = 'voxelWorld_renderDistancePref';
        const userPref = localStorage.getItem(userPrefKey);

        if (userPref !== null) {
            // User has manually set a render distance preference
            this.renderDistance = parseInt(userPref);
            console.log(`📊 Loaded user render distance preference: ${this.renderDistance}`);
        } else {
            // No user preference, use benchmark result
            const benchmarkKey = 'voxelWorld_performanceBenchmark';
            const storedBenchmark = localStorage.getItem(benchmarkKey);
            if (storedBenchmark) {
                const result = JSON.parse(storedBenchmark);
                this.renderDistance = result.renderDistance;
                console.log(`📊 Loaded cached benchmark: Render distance ${this.renderDistance}`);
            } else {
                this.renderDistance = 1;  // Default for first launch
                console.log(`📊 No benchmark found, using default render distance 1`);
            }
        }

        this.chunkCleanupRadius = 8; // 🎯 PERFORMANCE: Reduced from 12 to 8 for faster cleanup
        
        // World item spawning system
        this.visitedChunks = new Set(); // Track chunks that have been visited
        this.chunkSpawnTimes = new Map(); // Track last spawn time for chunks
        this.gameStartTime = Date.now(); // Track game start for time-based respawns
        this.player = {
            position: { x: 0, y: 40, z: 0 }, // Start high, will adjust after world generation
            rotation: { x: 0, y: 0 }
        };
        this.isOnGround = false;
        this.keys = {};
        this.selectedSlot = 0;
        this.movementEnabled = true; // Separate flag for movement vs camera controls
        this.inBattleArena = false; // Flag for 8x8 arena movement restriction
        this.respawnCampfire = null; // 🔥 Track last placed campfire for respawn point
        this.spawnPosition = { x: 0, y: 20, z: 0 }; // Default world spawn
        this.hasBackpack = false; // Track if player found backpack
        this.backpackPosition = null; // Track backpack location for minimap
        this.treePositions = []; // Track tree locations for minimap debugging
        this.waterPositions = []; // 🌊 Track water block locations for minimap
        this.pumpkinPositions = []; // 🎃 Track pumpkin locations for compass
        this.worldItemPositions = []; // 🔍 Track world item locations (collectibles) for compass
        this.ruinPositions = []; // 🏛️ Track ruin locations for minimap (center position)
        this.exploredChunks = new Set(); // Track all visited chunks for world map
        this.worldMapModal = null; // Full-screen world map modal
        this.ghostBillboards = new Map(); // 👻 Track Halloween ghost billboards by chunk key
        this.debugHalloween = false; // 🎃 Debug flag to force Halloween mode
        this.activeBillboards = []; // 🎯 PERFORMANCE: Track only billboards that need animation

        // � TEXTURE CACHE: Prevent memory leak by reusing loaded textures
        this.textureLoader = new THREE.TextureLoader();
        this.textureCache = {};

        // �🌳 TREE ID SYSTEM: Advanced tree tracking with unique identifiers
        this.nextTreeId = 1; // Incremental unique tree ID generator
        this.treeRegistry = new Map(); // Map<treeId, treeMetadata>
        this.blockToTreeMap = new Map(); // Map<blockKey, treeId> for fast lookups

        // Punch-to-harvest system
        this.isHarvesting = false;
        this.harvestingTarget = null;
        this.harvestingStartTime = 0;
        this.harvestingDuration = 0;
        // 🎒 Inventory system now handled by InventorySystem module
        // All inventory management moved to InventorySystem.js

        // 🔄 DELEGATE FUNCTIONS TO NEW INVENTORY SYSTEM
        // These functions maintain API compatibility while delegating to InventorySystem
        this.getHotbarSlot = (index) => this.inventory.getHotbarSlot(index);

        this.setHotbarSlot = (index, itemType, quantity) => this.inventory.setHotbarSlot(index, itemType, quantity);

        this.findEmptyHotbarSlot = () => this.inventory.findEmptyHotbarSlot();

        this.getBackpackSlot = (index) => this.inventory.getBackpackSlot(index);

        this.setBackpackSlot = (index, itemType, quantity) => this.inventory.setBackpackSlot(index, itemType, quantity);

        this.findEmptyBackpackSlot = () => this.inventory.findEmptyBackpackSlot();

        this.findItemInSlots = (itemType) => this.inventory.findItemInSlots(itemType);

        this.countItemInSlots = (itemType) => this.inventory.countItemInSlots(itemType);

        this.getAllMaterialsFromSlots = () => this.inventory.getAllMaterialsFromSlots();

        this.removeFromInventory = (itemType, quantity) => this.inventory.removeFromInventory(itemType, quantity);

        this.addToInventory = (itemType, quantity) => this.inventory.addToInventory(itemType, quantity);

        // 🎯 Check if a tool is equipped in equipment slots (for harvesting checks)
        this.hasEquippedTool = (toolType) => {
            if (!this.hotbarSystem) return false;
            const activeTools = this.hotbarSystem.getActiveTools();
            // Check for both base tool name and crafted_ version
            const craftedName = `crafted_${toolType}`;
            return activeTools.some(tool => tool.itemType === toolType || tool.itemType === craftedName);
        };

        // 🎯 Check if player has a tool (either selected in hotbar OR equipped)
        this.hasTool = (toolType) => {
            // Check selected hotbar slot
            const selectedSlot = this.hotbarSystem.getSelectedSlot();
            if (selectedSlot && selectedSlot.itemType === toolType) return true;
            
            // Check equipment slots
            return this.hasEquippedTool(toolType);
        };

        this.container = container;
        this.controlsEnabled = true;
        this.isPaused = false;
        this.isTorchAllowed = false;  // 🔦 Set by day/night cycle (dusk/night only)
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

        // 🔧 Initialize ToolBenchSystem
        this.toolBenchSystem = new ToolBenchSystem(this);
        this.hasToolBench = false;  // Unlocked when tool_bench is crafted

        // 🍳 Initialize KitchenBenchSystem
        this.kitchenBenchSystem = new KitchenBenchSystem(this);
        this.companionHuntSystem = new CompanionHuntSystem(this);
        this.hasKitchenBench = false;  // Unlocked when kitchen_bench is crafted
        console.log('🍳 KitchenBenchSystem initialized');

        // 🌾 Initialize FarmingSystem
        this.farmingSystem = new FarmingSystem(this);
        console.log('🌾 FarmingSystem initialized');

        // 🎵 Initialize MusicSystem
        this.musicSystem = new MusicSystem();
        console.log('🎵 MusicSystem initialized');

        // 💾 Initialize SaveSystem (with Electron API support)
        this.saveSystem = new SaveSystem(this, window.electronAPI || null);
        this.gameTime = 0; // Track total playtime in seconds
        this.gameTimeInterval = setInterval(() => {
            this.gameTime++;
        }, 1000);
        console.log('💾 SaveSystem initialized');
        
        // Log save directory location (helpful for debugging)
        if (window.electronAPI && window.electronAPI.getUserDataPath) {
            const userDataPath = window.electronAPI.getUserDataPath();
            console.log(`💾 Save files location: ${userDataPath}/saves/`);
        }

        // 🐰 Initialize Animal System
        this.animalSystem = new AnimalSystem(this);
        console.log('🐰 Animal System initialized');

        // Initialize Day/Night music system (async, will complete in background)
        this.musicSystemReady = false;
        if (this.musicSystem.autoplayEnabled) {
            this.musicSystem.initDayNightMusic(
                '/music/forestDay.ogg',
                '/music/forestNight.ogg'
            ).then(() => {
                this.musicSystemReady = true;
                // Start with appropriate music for current time
                const currentTime = this.dayNightCycle ? this.dayNightCycle.currentTime : 12;
                this.musicSystem.updateTimeOfDay(currentTime);
                console.log('🎵 Day/Night music system started');
            }).catch(error => {
                console.error('🎵 Failed to initialize music:', error);
            });
        } else {
            console.log('🎵 Autoplay disabled - music not started');
        }

        // 🔧 Initialize CraftedTools handler
        this.craftedTools = new CraftedTools(this);
        console.log('🔧 CraftedTools handler initialized');

        // 🗡️ Initialize SpearSystem
        this.spearSystem = new SpearSystem(this);
        console.log('🗡️ SpearSystem initialized');

        // 🎯 Player upgrades (modifiable through ToolBench)
        this.backpackStackSize = 50;  // Can upgrade to 75, 100
        this.movementSpeed = 1.0;     // Can upgrade to 1.5 (speed boots)
        this.harvestSpeed = 1.0;      // Can upgrade to 1.5 (machete upgrade)

        // �️ Fog settings
        this.useHardFog = false; // Set to true for  b Hill-style hard fog wall

        // �🌍 Initialize Advanced BiomeWorldGen System (reverted for performance)
        this.biomeWorldGen = new BiomeWorldGen(this);

        // 👷 Initialize Web Worker-based chunk generation
        this.workerManager = new WorkerManager(this);
        this.workerInitialized = false;

        // 💾 Initialize ModificationTracker for chunk persistence
        const isElectron = typeof window !== 'undefined' && window.process && window.process.type === 'renderer';
        this.modificationTracker = null; // Will be initialized after worldSeed is set

        // 🎒 Initialize Advanced InventorySystem
        this.inventory = new InventorySystem(this);

        // 🎯 Initialize HotbarSystem (8 slots: 5 inventory + 3 equipment)
        this.hotbarSystem = new HotbarSystem(this, this.inventory);

        // 🎒 Initialize BackpackSystem
        this.backpackSystem = new BackpackSystem(this);
        // Wire up methods for compatibility
        this.createBackpackInventory = () => this.backpackSystem.createBackpackInventory();
        this.updateBackpackInventoryDisplay = () => this.backpackSystem.updateBackpackInventoryDisplay();

        // 📘 Initialize Companion Codex
        this.companionCodex = new CompanionCodex(this);

        // 🖼️ Initialize Companion Portrait HUD
        this.companionPortrait = new CompanionPortrait(this);

        // 🎓 Initialize Tutorial Script System
        this.tutorialSystem = new TutorialScriptSystem(this);
        console.log('🎓 TutorialScriptSystem initialized');

        // 🐈‍⬛ Initialize Sargem Quest Editor (dev tool, StarNode-based)
        this.sargemEditor = new SargemQuestEditor(this);

        // 👥 Initialize NPC Manager
        this.npcManager = new NPCManager(this);

        // 🎨 Initialize Enhanced Graphics System
        this.enhancedGraphics = new EnhancedGraphics();

        // ✨ Initialize Animation System
        this.animationSystem = new AnimationSystem(this);

        // 🔦 Initialize Player Items System (torch, machete, etc.)
        this.playerItemsSystem = new PlayerItemsSystem(this);

        // ⚡ Initialize Stamina System (movement + performance optimization)
        this.staminaSystem = new StaminaSystem(this);

        // ❤️ Initialize Player HP System (visible from start)
        this.playerHP = new PlayerHP(this);

        // 🎨 Set up Enhanced Graphics ready callback
        this.enhancedGraphics.onReady = () => {
            console.log('🎨 Enhanced Graphics assets discovered, recreating materials...');
            this.recreateAllMaterials();

            // 👻 Reload ghost textures with enhanced graphics
            if (this.ghostSystem) {
                this.ghostSystem.reloadGhostTextures();
            }

            // 💀 Reload angry ghost textures with enhanced graphics
            if (this.angryGhostSystem) {
                this.angryGhostSystem.reloadGhostTextures();
            }
        };

        // 👻 Initialize Ghost System (requires scene, so will be set after scene is created)
        this.ghostSystem = null;

        // 💀 Initialize Angry Ghost System (hostile ghosts that trigger battles)
        this.angryGhostSystem = null;

        // ⚔️ Initialize Battle System (Pokemon-style auto-battler)
        this.battleSystem = null;

        // 🏟️ Initialize Battle Arena (3D arena combat)
        this.battleArena = null;

        // 🎲 Initialize RPG System (requires scene, so will be set after scene is created)
        this.rpgIntegration = null;

        // 🏛️ CENTRALIZED BILLBOARD ITEMS REGISTRY
        // Single source of truth for all billboard/world items
        // Used by: spawnRandomWorldItems, ruins treasures, billboard rendering
        this.BILLBOARD_ITEMS = {
            // Desert biome items
            skull: { emoji: '💀', biome: 'Desert', rarity: 0.3 },

            // Forest biome items
            mushroom: { emoji: '🍄', biome: 'Forest', rarity: 0.2 },
            flower: { emoji: '🌸', biome: 'Forest', rarity: 0.2 },
            berry: { emoji: '🍓', biome: 'Forest', rarity: 0.2 },
            leaf: { emoji: '🍃', biome: 'Forest', rarity: 0.4 },

            // Mountain biome items
            crystal: { emoji: '💎', biome: 'Mountain', rarity: 0.15 },
            oreNugget: { emoji: '⛰️', biome: 'Mountain', rarity: 0.25 },

            // Plains biome items
            wheat: { emoji: '🌾', biome: 'Plains', rarity: 0.2 },
            feather: { emoji: '🪶', biome: 'Plains', rarity: 0.2 },
            bone: { emoji: '🦴', biome: 'Plains', rarity: 0.2 },

            // Tundra biome items
            shell: { emoji: '🐚', biome: 'Tundra', rarity: 0.1 },
            fur: { emoji: '🐻‍❄️', biome: 'Tundra', rarity: 0.1 },
            iceShard: { emoji: '❄️', biome: 'Tundra', rarity: 0.1 },

            // Rare equipment (very exciting finds!)
            rustySword: { emoji: '⚔️', biome: 'any', rarity: 0.02 },
            oldPickaxe: { emoji: '⛏️', biome: 'any', rarity: 0.02 },
            ancientAmulet: { emoji: '📿', biome: 'any', rarity: 0.02 }
        };

        // 🔄 COMPATIBILITY: Provide access to inventory arrays for legacy code
        // These properties delegate to InventorySystem for backward compatibility
        Object.defineProperty(this, 'hotbarSlots', {
            get: () => this.inventory.hotbarSlots,
            set: (value) => { this.inventory.hotbarSlots = value; }
        });

        Object.defineProperty(this, 'backpackSlots', {
            get: () => this.inventory.backpackSlots,
            set: (value) => { this.inventory.backpackSlots = value; }
        });

        // Provide access to STACK_LIMIT for legacy code
        this.STACK_LIMIT = this.inventory.STACK_LIMIT;

        // 🌳 HELPER: Check if a block type is any kind of leaf (must be defined before addBlock)
        this.isLeafBlock = (blockType) => {
            const leafTypes = ['leaf', 'forest_leaves', 'mountain_leaves', 'desert_leaves', 'plains_leaves', 'tundra_leaves', 'oak_wood-leaves', 'pine_wood-leaves', 'birch_wood-leaves', 'palm_wood-leaves', 'dead_wood-leaves', 'douglas_fir-leaves'];
            return leafTypes.includes(blockType);
        };

        this.addBlock = (x, y, z, type, playerPlaced = false, customColor = null) => {
            const key = `${x},${y},${z}`;

            // 🍃 OVERLAP PREVENTION: Check for existing blocks at this position
            const existingBlock = this.world[key];
            if (existingBlock) {
                // If it's a leaf block overlapping with another leaf, skip entirely
                // This prevents confusing overlapping canopies when trees are harvested
                if (this.isLeafBlock(type) && this.isLeafBlock(existingBlock.type)) {
                    return; // Don't place overlapping leaves
                }
                // For other block types, allow overwriting (existing behavior)
                if (existingBlock.mesh) {
                    this.scene.remove(existingBlock.mesh);
                    // 🗑️ MEMORY LEAK FIX: Dispose replaced block geometry
                    if (existingBlock.mesh.geometry) {
                        existingBlock.mesh.geometry.dispose();
                    }
                    // Don't dispose material - it's shared from resource pool
                }
                if (existingBlock.billboard) {
                    this.scene.remove(existingBlock.billboard);
                    // 🗑️ MEMORY LEAK FIX: Dispose replaced billboard
                    if (existingBlock.billboard.geometry) {
                        existingBlock.billboard.geometry.dispose();
                    }
                    if (existingBlock.billboard.material) {
                        if (existingBlock.billboard.material.map) {
                            existingBlock.billboard.material.map.dispose();
                        }
                        existingBlock.billboard.material.dispose();
                    }
                }
            }

            // 🧊 GREEDY MESHING: Use chunk-based rendering if enabled
            if (this.useGreedyMeshing && this.chunkMeshManager) {
                // Get block color for greedy meshing
                const blockColor = customColor || (this.materials[type]?.color?.getHex ? this.materials[type].color.getHex() : 0x888888);

                // Add to chunk mesh system
                this.chunkMeshManager.addBlock(x, y, z, type, blockColor);

                // Store block data (without individual mesh)
                let billboard = null;
                if (this.shouldUseBillboard(type)) {
                    billboard = this.createBillboard(x, y, z, type);
                    if (billboard) {
                        this.scene.add(billboard);
                    }
                }

                this.world[key] = { type, mesh: null, playerPlaced, billboard, greedyMeshed: true };
            } else {
                // TRADITIONAL: Regular mesh rendering with object pooling
                const geo = this.resourcePool.getGeometry('cube');

                let mat;
                if (customColor) {
                    // Create custom material with height-based color
                    const baseMaterial = new THREE.MeshLambertMaterial({
                        map: this.materials[type].map,
                        color: customColor
                    });
                    // Try to enhance with texture if available
                    mat = this.enhancedGraphics.getEnhancedBlockMaterial(type, baseMaterial);
                } else {
                    // Use darker material for player-placed blocks, normal for generated
                    const baseMaterial = playerPlaced ? this.playerMaterials[type] : this.materials[type];
                    // Try to enhance with texture if available
                    mat = this.enhancedGraphics.getEnhancedBlockMaterial(type, baseMaterial);
                }

                const cube = new THREE.Mesh(geo, mat);
                cube.position.set(x, y, z);
                cube.userData = { type, playerPlaced };

                // 🚀 BVH: Build acceleration structure for this mesh
                if (cube.geometry && !cube.geometry.boundsTree) {
                    cube.geometry.computeBoundsTree();
                }

                this.scene.add(cube);

                // Create billboard sprite for special items
                let billboard = null;
                if (this.shouldUseBillboard(type)) {
                    billboard = this.createBillboard(x, y, z, type);
                    if (billboard) {
                        this.scene.add(billboard);
                    }
                }

                this.world[key] = { type, mesh: cube, playerPlaced, billboard };
            }

            // 🌊 Track ALL water blocks for minimap (to show rivers and lakes clearly)
            if (type === 'water' && !playerPlaced) {
                this.waterPositions.push({ x, y, z });
            }

            // 🎃 Track pumpkins for compass navigation and Halloween ghosts
            if (type === 'pumpkin' && !playerPlaced) {
                this.pumpkinPositions.push({ x, y, z });

                // 👻 HALLOWEEN SPECIAL: Spawn ghost billboard on first pumpkin per chunk
                const chunkX = Math.floor(x / this.chunkSize);
                const chunkZ = Math.floor(z / this.chunkSize);
                const chunkKey = `${chunkX},${chunkZ}`;

                const isHalloween = this.debugHalloween || (new Date().getMonth() === 9 && new Date().getDate() === 31);

                if (isHalloween && !this.ghostBillboards.has(chunkKey)) {
                    // Create ghost billboard for first pumpkin in chunk
                    const ghostBillboard = this.createGhostBillboard(x, y, z);
                    if (ghostBillboard) {
                        this.scene.add(ghostBillboard);
                        this.ghostBillboards.set(chunkKey, {
                            billboard: ghostBillboard,
                            pumpkinX: x,
                            pumpkinY: y,
                            pumpkinZ: z,
                            chunkKey: chunkKey
                        });
                        console.log(`👻🎃 Halloween ghost spawned at chunk ${chunkKey} above pumpkin (${x},${y},${z})`);
                    }
                }
            }

            // 💾 Track player modifications for chunk persistence
            if (playerPlaced && this.modificationTracker) {
                const color = customColor || (mat.color ? mat.color.getHex() : 0xFFFFFF);
                this.modificationTracker.trackModification(x, y, z, type, color, true);
            }
        };

        // � HELPER: Determine which side of a building is closest to the player
        // Returns: 'north', 'south', 'east', or 'west'
        this.getClosestSideToPlayer = (buildingX, buildingZ) => {
            const playerPos = this.player.position;
            
            // Calculate relative position of player to building
            const dx = playerPos.x - buildingX;
            const dz = playerPos.z - buildingZ;
            
            // Determine which axis has greater distance
            if (Math.abs(dx) > Math.abs(dz)) {
                // Player is more to the East or West
                return dx > 0 ? 'east' : 'west';
            } else {
                // Player is more to the North or South
                // In Three.js, positive Z is South, negative Z is North
                return dz > 0 ? 'south' : 'north';
            }
        };

        // �🎨 PHASE 2: 3D Object Creation Engine - Place crafted objects with real dimensions!
        this.placeCraftedObject = (x, y, z, itemId) => {
            console.log(`🎯 placeCraftedObject called: ${itemId} at (${x},${y},${z})`);

            // Get crafted item metadata
            let metadata = this.inventoryMetadata[itemId];
            
            // 🏠 SPECIAL: If no metadata (e.g., from giveItem), create default for simple_house
            if (!metadata && itemId.includes('simple_house')) {
                console.log('🏠 No metadata for simple_house - using default 4x4x4 dimensions');
                metadata = {
                    shape: {
                        type: 'simple_house',
                        dimensions: { length: 4, width: 4, height: 4 }
                    },
                    material: { type: 'oak' },
                    appearance: { color: 0x8B4513 }
                };
            }
            
            if (!metadata) {
                console.error(`❌ No metadata found for crafted item: ${itemId}`);
                return;
            }

            // 🪜 SPECIAL HANDLING: Ladders use auto-stacking placement logic
            if (metadata.isLadder) {
                return this.placeLadderAutoStack(x, y, z, itemId, metadata);
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
                
                case 'simple_house':
                    // 🏠 SIMPLE HOUSE - Built with actual voxel blocks via StructureGenerator
                    // Check minimum dimensions
                    if (dimensions.length < 4 || dimensions.width < 4 || dimensions.height < 4) {
                        console.error(`❌ Simple House requires minimum 4x4x4 dimensions (got ${dimensions.length}x${dimensions.width}x${dimensions.height})`);
                        this.updateStatus(`⚠️ Simple House needs at least 4x4x4 size!`, 'error');
                        return; // Cancel placement
                    }

                    // Determine which side faces the player for door placement
                    const doorSide = this.getClosestSideToPlayer(x, z);
                    console.log(`🚪 Door will be on ${doorSide} side (closest to player)`);

                    // Use StructureGenerator to build house with actual voxel blocks
                    if (this.biomeWorldGen && this.biomeWorldGen.structureGenerator) {
                        this.biomeWorldGen.structureGenerator.generateHouse(
                            x, z,
                            dimensions.length,  // Interior length
                            dimensions.width,   // Interior width  
                            dimensions.height,  // Interior height
                            material,           // Wall material (wood type)
                            'stone',           // Floor/roof material
                            doorSide,          // Door placement
                            this.addBlock.bind(this),
                            (wx, wz) => this.getGroundHeight(wx, wz)
                        );
                        
                        this.updateStatus(`🏠 Built house with ${dimensions.length}×${dimensions.width}×${dimensions.height} interior!`, 'craft');
                        
                        // Consume materials from inventory
                        const materialCost = dimensions.length * dimensions.width * dimensions.height * 2;
                        this.inventory.removeFromInventory(material, materialCost);
                        
                        console.log(`✅ House placed using ${materialCost} ${material} blocks`);
                        
                        // 💾 FORCE IMMEDIATE SAVE of house modifications (don't wait for auto-save)
                        if (this.modificationTracker) {
                            this.modificationTracker.flushDirtyChunks().then(() => {
                                console.log('💾 House modifications saved immediately!');
                            }).catch(err => {
                                console.error('❌ Failed to save house modifications:', err);
                            });
                        }
                        
                        return; // Exit early - no mesh creation needed
                    } else {
                        console.error('❌ StructureGenerator not available');
                        this.updateStatus(`⚠️ Could not build house - system error`, 'error');
                        return;
                    }
                    break;
                
                default:
                    console.warn(`⚠️ Unknown shape type: ${shapeType}, defaulting to cube`);
                    geometry = new THREE.BoxGeometry(dimensions.length, dimensions.height, dimensions.width);
            }

            console.log(`✅ Geometry created successfully:`, geometry.type, geometry);

            // Create material based on crafted item's material and color
            let craftedMaterial;
            
            // 🔧 WORKAROUND: Pyramids (ConeGeometry) have issues with textured materials in THREE.js r180
            // Force pyramids to use solid color materials only
            if (shapeType === 'pyramid') {
                console.log(`Creating solid color material for pyramid (no texture) with color ${color}`);
                craftedMaterial = new THREE.MeshLambertMaterial({
                    color: new THREE.Color(color),
                    emissive: material === 'campfire' ? new THREE.Color(0xFF4400) : new THREE.Color(0x000000),
                    emissiveIntensity: material === 'campfire' ? 0.5 : 0
                });
            } else if (this.blockTypes[material] && this.materials[material]) {
                // Materials can be either a single material or an array of materials (for cube faces)
                console.log(`Creating textured material for ${material} with color ${color}`);

                let sourceMaterial = this.materials[material];

                // If it's an array (multi-face materials), use the first one
                if (Array.isArray(sourceMaterial)) {
                    console.log(`  Material is array of ${sourceMaterial.length}, using first element`);
                    sourceMaterial = sourceMaterial[0];
                }

                console.log(`  Source material:`, sourceMaterial);
                console.log(`  Has map:`, !!sourceMaterial.map);
                console.log(`  Map type:`, sourceMaterial.map?.constructor.name);
                console.log(`  Map.image:`, sourceMaterial.map?.image);

                if (sourceMaterial.map && sourceMaterial.map.image) {
                    // Create a new CanvasTexture from the source canvas
                    const newTexture = new THREE.CanvasTexture(sourceMaterial.map.image);
                    newTexture.magFilter = THREE.NearestFilter;
                    newTexture.generateMipmaps = true;
                    newTexture.minFilter = THREE.LinearMipmapLinearFilter;
                    newTexture.anisotropy = 4;
                    newTexture.needsUpdate = true;

                    // 🎨 Reduce tint strength by interpolating color toward white (30% tint, 70% texture)
                    const tintColor = new THREE.Color(color);
                    const white = new THREE.Color(0xFFFFFF);
                    const lighterTint = tintColor.clone().lerp(white, 0.7); // 70% white = subtle tint

                    console.log(`  ✓ Created fresh texture copy for ${material} with lighter tint`);
                    craftedMaterial = new THREE.MeshBasicMaterial({
                        map: newTexture,
                        color: lighterTint
                    });
                } else {
                    console.log(`  ✗ No texture source for ${material}, using solid color`);
                    craftedMaterial = new THREE.MeshBasicMaterial({
                        color: new THREE.Color(color)
                    });
                }
            } else {
                // Fallback to basic colored material (for custom items or when texture doesn't exist)
                console.log(`Creating basic material for ${material} with color ${color} (no texture available)`);
                craftedMaterial = new THREE.MeshLambertMaterial({
                    color: new THREE.Color(color),
                    emissive: material === 'campfire' ? new THREE.Color(0xFF4400) : new THREE.Color(0x000000),
                    emissiveIntensity: material === 'campfire' ? 0.5 : 0
                });
            }
            
            // 🔧 FIX: Force material to compile uniforms immediately
            craftedMaterial.needsUpdate = true;

            // Create the 3D mesh (or use existing Group for complex shapes like simple_house)
            let craftedObject;
            if (geometry.isGroup) {
                // Geometry is already a THREE.Group (e.g., simple_house with all walls/floor/ceiling)
                craftedObject = geometry;
            } else {
                // Normal geometry - create mesh with material
                craftedObject = new THREE.Mesh(geometry, craftedMaterial);
            }
            
            // 🔧 FIX: Ensure mesh matrices are properly initialized
            craftedObject.matrixAutoUpdate = true;
            craftedObject.castShadow = true;
            craftedObject.receiveShadow = true;
            
            // 🔧 FIX: Initialize rotation quaternion (important for cylinders)
            craftedObject.quaternion.set(0, 0, 0, 1);
            
            craftedObject.updateMatrix();

            // PHASE 3: Smart Floor Positioning - treat target as floor surface
            const floorY = y; // Target position becomes the floor
            const objectY = floorY + dimensions.height / 2; // Object bottom sits on floor, center vertically

            // Handle objects larger than 1x1 footprint by centering them on target
            const objectX = x; // Center X on target
            const objectZ = z; // Center Z on target

            console.log(`📍 Positioning: Floor at Y=${floorY}, Object center at (${objectX}, ${objectY}, ${objectZ})`);
            console.log(`📏 Object footprint: ${dimensions.length}x${dimensions.width}, Height: ${dimensions.height}`);

            craftedObject.position.set(objectX, objectY, objectZ);
            
            // 🔧 FIX: Update matrix world after positioning
            craftedObject.updateMatrixWorld(true);

            // Set user data for identification
            craftedObject.userData = {
                type: 'craftedObject',
                itemId: itemId,
                metadata: metadata,
                originalName: metadata.name,
                dimensions: dimensions,
                isCraftedObject: true
            };

            // 🔥 Add effects BEFORE adding to scene (fire, glow, etc.)
            if (metadata.effects && metadata.effects.length > 0) {
                this.addCraftedObjectEffects(craftedObject, metadata.effects, objectX, objectY, objectZ);
            }

            // 🎯 PHASE 2.1: Create physics body for collision detection
            this.createPhysicsBodyForCraftedObject(craftedObject, shapeType, dimensions, material);

            // 🔧 FIX: Add to scene AFTER all setup is complete, with a frame delay
            requestAnimationFrame(() => {
                this.scene.add(craftedObject);
                console.log(`✅ Created crafted object "${metadata.name}" at (${x},${y},${z})`);
                this.updateStatus(`🎨 Placed "${metadata.name}"!`, 'craft');
            });

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

            // 🔥 CAMPFIRE RESPAWN SYSTEM: Track last placed campfire
            // Check for campfire items: 'campfire', 'Campfire', or crafted items with '_campfire' suffix
            const isCampfire = itemId === 'campfire' ||
                             itemId === 'Campfire' ||
                             itemId.toLowerCase().includes('_campfire');

            if (isCampfire) {
                this.respawnCampfire = {
                    x: Math.floor(x),
                    y: Math.floor(y),
                    z: Math.floor(z),
                    timestamp: Date.now()
                };
                this.saveRespawnPoint();
                console.log(`🔥 Respawn point set at campfire (${Math.floor(x)}, ${Math.floor(y)}, ${Math.floor(z)})`);

                // 🎓 Trigger campfire tutorial
                if (this.tutorialSystem) {
                    this.tutorialSystem.onCampfirePlaced();
                }

                // Update bottom-left status area
                const statusIcon = document.getElementById('status-icon');
                const statusText = document.getElementById('status-text');
                if (statusIcon && statusText) {
                    statusIcon.textContent = '🔥';
                    statusText.textContent = 'Game saved! Respawn point updated!';

                    // Reset back to default after 3 seconds
                    setTimeout(() => {
                        statusIcon.textContent = '🎮';
                        statusText.textContent = 'Ready to explore!';
                    }, 3000);
                }
            }
        };

        // 🪜 AUTO-STACKING LADDER PLACEMENT SYSTEM
        this.placeLadderAutoStack = (x, y, z, itemId, metadata) => {
            console.log(`🪜 Auto-stacking ladder placement at (${x},${y},${z})`);

            // Determine facing direction (towards nearest solid block)
            const facingDir = this.getLadderFacingDirection(x, y, z);
            if (!facingDir) {
                console.warn('🪜 No wall found for ladder placement');
                this.updateStatus('❌ Ladders need a wall to attach to!');
                return;
            }

            // Get quantity from height slider (already in metadata.shape.dimensions.height)
            const quantity = Math.floor(metadata.shape.dimensions.height);
            console.log(`🪜 Placing ${quantity} ladder(s) in ${facingDir.name} direction`);

            // Track how many ladders we actually place
            let laddersPlaced = 0;
            let currentY = y;

            // Auto-stack loop
            for (let i = 0; i < quantity; i++) {
                // Check if space above is empty
                const aboveBlock = this.getBlock(x, currentY + 1, z);
                if (aboveBlock && aboveBlock.type !== 'water') {
                    console.log(`🪜 Blocked at Y=${currentY + 1}, stopping`);
                    break; // Space occupied, stop stacking
                }

                // Check if wall behind is still solid
                const wallX = x + facingDir.offset.x;
                const wallZ = z + facingDir.offset.z;
                const wallBlock = this.getBlock(wallX, currentY + 1, wallZ);

                if (!wallBlock || wallBlock.type === 'water') {
                    console.log(`🪜 No wall at (${wallX}, ${currentY + 1}, ${wallZ}), stopping`);
                    break; // No wall support, stop stacking
                }

                // Place ladder at current height
                this.placeSingleLadder(x, currentY + 1, z, itemId, metadata, facingDir);
                laddersPlaced++;
                currentY++; // Move up for next ladder

                // Consume from inventory
                this.removeFromInventory(itemId, 1);

                // Check if we're out of ladders
                const remaining = this.countItemInSlots(itemId);
                if (remaining <= 0) {
                    console.log(`🪜 Ran out of ladders after placing ${laddersPlaced}`);
                    break;
                }
            }

            console.log(`✅ Placed ${laddersPlaced} auto-stacking ladder(s)`);
            this.updateStatus(`🪜 Placed ${laddersPlaced} ladder(s)!`, 'craft');
        };

        // 🪜 Place a single ladder piece
        this.placeSingleLadder = (x, y, z, itemId, metadata, facingDir) => {
            const dimensions = metadata.shape.dimensions;
            const shapeType = 'wall'; // Ladders use wall geometry
            const color = metadata.appearance.color;
            const material = metadata.material.type;

            // Create thin wall geometry for ladder
            const geometry = new THREE.BoxGeometry(1, 1, 0.1);

            // Create material
            const ladderMaterial = new THREE.MeshLambertMaterial({
                color: new THREE.Color(color)
            });

            const ladderMesh = new THREE.Mesh(geometry, ladderMaterial);
            ladderMesh.position.set(x, y, z);

            // Rotate ladder to face the wall
            if (facingDir.name === 'north') ladderMesh.rotation.y = 0;
            else if (facingDir.name === 'south') ladderMesh.rotation.y = Math.PI;
            else if (facingDir.name === 'east') ladderMesh.rotation.y = -Math.PI / 2;
            else if (facingDir.name === 'west') ladderMesh.rotation.y = Math.PI / 2;

            ladderMesh.userData = {
                type: 'ladder',
                isLadder: true,
                itemId: itemId,
                metadata: metadata
            };

            this.scene.add(ladderMesh);

            // Track in crafted objects
            if (!this.craftedObjects) this.craftedObjects = {};
            const objectKey = `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
            this.craftedObjects[objectKey] = {
                mesh: ladderMesh,
                itemId: itemId,
                metadata: metadata,
                position: { x, y, z },
                dimensions: dimensions
            };
        };

        // 🪜 Determine which direction ladder should face (towards nearest wall)
        this.getLadderFacingDirection = (x, y, z) => {
            const directions = [
                { name: 'north', offset: { x: 0, z: 1 } },
                { name: 'south', offset: { x: 0, z: -1 } },
                { name: 'east', offset: { x: 1, z: 0 } },
                { name: 'west', offset: { x: -1, z: 0 } }
            ];

            // Check each direction for a solid block
            for (const dir of directions) {
                const checkX = x + dir.offset.x;
                const checkZ = z + dir.offset.z;
                const block = this.getBlock(checkX, y, checkZ);

                if (block && block.type !== 'water') {
                    return dir; // Found wall in this direction
                }
            }

            return null; // No wall found
        };

        // 🔥 CAMPFIRE RESPAWN SYSTEM: Save/Load Methods
        this.saveRespawnPoint = () => {
            if (this.respawnCampfire) {
                localStorage.setItem('NebulaWorld_respawnCampfire', JSON.stringify(this.respawnCampfire));
                console.log('💾 Respawn point saved to localStorage');
            }
        };

        this.loadRespawnPoint = () => {
            const saved = localStorage.getItem('NebulaWorld_respawnCampfire');
            if (saved) {
                this.respawnCampfire = JSON.parse(saved);
                console.log(`🔥 Loaded respawn campfire from localStorage: (${this.respawnCampfire.x}, ${this.respawnCampfire.y}, ${this.respawnCampfire.z})`);
            }
        };

        // Load campfire respawn point immediately after defining the function
        this.loadRespawnPoint();

        // Check if block type should use billboard
        this.shouldUseBillboard = (type) => {
            // Special items (backpack, shrub) always use billboard
            if (type === 'backpack' || type === 'shrub') return true;

            // World items from centralized registry
            return this.BILLBOARD_ITEMS.hasOwnProperty(type);
        };

        // Create emoji billboard sprite
        this.createBillboard = (x, y, z, type) => {
            // Animation configs for special items (backpack, shrub)
            const specialAnimations = {
                backpack: {
                    float: true,
                    rotate: true,
                    floatSpeed: 2.0,
                    floatAmount: 0.15
                },
                shrub: {
                    float: true,
                    rotate: false,
                    floatSpeed: 1.0,
                    floatAmount: 0.08
                }
            };

            // Build config from centralized registry or special items
            let config = null;

            if (specialAnimations[type]) {
                // Special items (backpack, shrub) - hardcoded emoji
                config = {
                    emoji: type === 'backpack' ? '🎒' : '🌿',
                    ...specialAnimations[type]
                };
            } else if (this.BILLBOARD_ITEMS[type]) {
                // World items from centralized registry
                config = {
                    emoji: this.BILLBOARD_ITEMS[type].emoji,
                    float: true,
                    rotate: false,
                    floatSpeed: 1.0,
                    floatAmount: 0.05
                };
            }

            if (!config) return null;

            // Try to use enhanced graphics first, fall back to emoji
            let texture;

            // Use EnhancedGraphics API to get enhanced asset if available
            // DEBUG: Uncomment to debug billboard loading
            // console.log(`🔍 Billboard debug for ${type}: isReady=${this.enhancedGraphics.isReady()}, hasImage=${this.enhancedGraphics.toolImages.has(type)}`);
            if (this.enhancedGraphics.isReady() && this.enhancedGraphics.toolImages.has(type)) {
                // Use enhanced PNG image through proper API with relative path
                const enhancedImageData = this.enhancedGraphics.toolImages.get(type);
                
                // 🎨 TEXTURE CACHE: Reuse loaded textures to prevent memory leak
                if (!this.textureCache[enhancedImageData.path]) {
                    this.textureCache[enhancedImageData.path] = this.textureLoader.load(enhancedImageData.path);
                    this.textureCache[enhancedImageData.path].magFilter = THREE.LinearFilter;
                    this.textureCache[enhancedImageData.path].minFilter = THREE.LinearFilter;
                }
                texture = this.textureCache[enhancedImageData.path];
                // console.log(`🎨 Using enhanced billboard texture for ${type}: ${enhancedImageData.path}`);
            } else {
                // Fall back to emoji canvas
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
                texture = new THREE.CanvasTexture(canvas);
                texture.magFilter = THREE.LinearFilter;
                texture.minFilter = THREE.LinearFilter;
                // commented out due to console spam -- brad
                // console.log(`📱 Using emoji fallback for ${type} billboard: ${config.emoji}`);
            }

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

            // 🎯 PERFORMANCE: Add to activeBillboards array for efficient animation
            this.activeBillboards.push(sprite);

            return sprite;
        };

        // 👻 Create Halloween ghost billboard (Oct 31st only!)
        this.createGhostBillboard = (x, y, z) => {
            // Create emoji canvas for ghost
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 128;
            const ctx = canvas.getContext('2d');

            // Clear background (transparent)
            ctx.clearRect(0, 0, 128, 128);

            // Draw ghost emoji
            ctx.font = '96px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('👻', 64, 64);

            // Create texture and sprite
            const texture = new THREE.CanvasTexture(canvas);
            texture.magFilter = THREE.LinearFilter;
            texture.minFilter = THREE.LinearFilter;

            const material = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                alphaTest: 0.1,
                sizeAttenuation: true
            });

            const sprite = new THREE.Sprite(material);
            sprite.position.set(x, y + 1.5, z); // Float 1.5 blocks above pumpkin
            sprite.scale.set(1.0, 1.0, 1); // Slightly larger than backpack

            // Add floating animation data
            sprite.userData = {
                type: 'ghost',
                initialY: y + 1.5,
                animationTime: Math.random() * Math.PI * 2,
                config: {
                    float: true,
                    rotate: false,
                    floatSpeed: 1.5,
                    floatAmount: 0.2 // Spooky slow float
                }
            };

            return sprite;
        };

        // Animate floating billboards
        this.animateBillboards = (currentTime) => {
            // 🎯 PERFORMANCE: Only animate billboards in activeBillboards array
            // This avoids iterating through the entire this.world object
            this.activeBillboards.forEach(billboard => {
                if (!billboard || !billboard.userData) return;
                
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
            });

            // 👻 Animate Halloween ghost billboards (distance culled)
            const playerPos = this.player.position;
            this.ghostBillboards.forEach((ghostData) => {
                const billboard = ghostData.billboard;
                if (!billboard || !billboard.userData) return;
                
                // 🎯 PERFORMANCE: Skip animation for distant ghosts (>100 blocks)
                const dist = Math.sqrt(
                    Math.pow(billboard.position.x - playerPos.x, 2) +
                    Math.pow(billboard.position.z - playerPos.z, 2)
                );
                if (dist > 100) return;
                
                const userData = billboard.userData;
                const config = userData.config;

                // Floating animation
                if (config.float) {
                    userData.animationTime += config.floatSpeed * 0.016;
                    const offset = Math.sin(userData.animationTime) * config.floatAmount;
                    billboard.position.y = userData.initialY + offset;
                }
            });
        };

        // 🔥 Animate particle effects for crafted objects
        this.animateParticleEffects = (currentTime) => {
            if (!this.craftedObjects) return;

            let particleEffectCount = 0;
            Object.values(this.craftedObjects).forEach(objData => {
                const craftedMesh = objData.mesh;
                if (!craftedMesh || !craftedMesh.userData.effectObjects) return;

                craftedMesh.userData.effectObjects.forEach(effect => {
                    if (effect.type === 'particles') {
                        particleEffectCount++;

                        // 🔧 Handle sprite-based particles (new system for r180 compatibility)
                        if (effect.sprites && effect.sprites.length > 0) {
                            const sprites = effect.sprites;
                            const velocities = effect.velocities;
                            const maxHeight = effect.maxHeight || 1.0;
                            const baseY = effect.baseY || 0;

                            for (let i = 0; i < sprites.length; i++) {
                                const sprite = sprites[i];
                                const velocity = velocities[i];

                                // Update sprite position
                                sprite.position.x += velocity.x;
                                sprite.position.y += velocity.y;
                                sprite.position.z += velocity.z;

                                // Reset particle when it gets too high
                                if (sprite.position.y - baseY > maxHeight) {
                                    const spreadScale = Math.abs(velocity.y) / 0.05;
                                    sprite.position.x = craftedMesh.position.x + (Math.random() - 0.5) * 0.3 * spreadScale;
                                    sprite.position.y = baseY;
                                    sprite.position.z = craftedMesh.position.z + (Math.random() - 0.5) * 0.3 * spreadScale;
                                }
                            }
                        }
                        // 🔧 OLD SYSTEM: BufferGeometry particles (deprecated, causes r180 shader bugs)
                        else if (effect.object && effect.object.geometry) {
                            if (!effect.object.geometry.attributes || !effect.object.geometry.attributes.position) {
                                console.warn('⚠️ Old particle system has invalid geometry, skipping');
                                return;
                            }

                            const positions = effect.positions;
                            const velocities = effect.velocities;
                            const maxHeight = effect.maxHeight || 1.0;

                            for (let i = 0; i < velocities.length; i++) {
                                positions[i * 3] += velocities[i].x;
                                positions[i * 3 + 1] += velocities[i].y;
                                positions[i * 3 + 2] += velocities[i].z;

                                if (positions[i * 3 + 1] > maxHeight) {
                                    const spreadScale = Math.abs(velocities[i].y) / 0.05;
                                    positions[i * 3] = (Math.random() - 0.5) * 0.3 * spreadScale;
                                    positions[i * 3 + 1] = 0;
                                    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.3 * spreadScale;
                                }
                            }

                            effect.object.geometry.attributes.position.needsUpdate = true;
                        }
                    }

                    if (effect.type === 'light') {
                        // Flicker the light slightly using base intensity
                        const baseIntensity = effect.baseIntensity || 1.5;
                        const flicker = Math.sin(currentTime * 0.01) * 0.15 + 0.85; // Oscillate between 0.85 and 1.0
                        effect.object.intensity = baseIntensity * flicker;
                    }
                });
            });

            if (particleEffectCount > 0 && currentTime % 120 === 0) {
                console.log(`🔥 Animating ${particleEffectCount} particle effects`);
            }

            // 💥 Animate explosion effects from stone hammer (using Sprites)
            if (this.explosionEffects && this.explosionEffects.length > 0) {
                for (let i = this.explosionEffects.length - 1; i >= 0; i--) {
                    const explosion = this.explosionEffects[i];
                    explosion.lifetime++;

                    // Update each sprite particle
                    for (let j = 0; j < explosion.particles.length; j++) {
                        const sprite = explosion.particles[j];
                        const velocity = explosion.velocities[j];

                        // Update position
                        sprite.position.x += velocity.x;
                        sprite.position.y += velocity.y;
                        sprite.position.z += velocity.z;

                        // Apply gravity to velocity
                        velocity.y -= 0.01;

                        // Fade out sprite
                        const fadeProgress = explosion.lifetime / explosion.maxLifetime;
                        sprite.material.opacity = 1.0 - fadeProgress;
                    }

                    // Remove expired explosions
                    if (explosion.lifetime >= explosion.maxLifetime) {
                        // Clean up all sprites
                        explosion.particles.forEach(sprite => {
                            this.scene.remove(sprite);
                            sprite.material.dispose();
                        });
                        this.explosionEffects.splice(i, 1);
                    }
                }
            }
        };

        // Get block data at world coordinates (with on-demand underground generation)
        this.getBlock = (x, y, z) => {
            const key = `${x},${y},${z}`;

            // If block exists, return it
            if (this.world[key]) {
                return this.world[key];
            }

            // 🔮 ON-DEMAND UNDERGROUND GENERATION (Minecraft-style)
            // If block doesn't exist and is underground (y > 0 and below surface), generate it
            if (y > 0 && y < 15) { // Underground range
                // Check if this position is in a loaded chunk
                const chunkX = Math.floor(x / this.chunkSize);
                const chunkZ = Math.floor(z / this.chunkSize);
                const chunkKey = `${chunkX},${chunkZ}`;

                if (this.loadedChunks.has(chunkKey)) {
                    // Generate underground block on-demand
                    const terrainData = this.biomeWorldGen.generateTerrainAt(x, z);
                    const surfaceHeight = terrainData.height;

                    // Only generate if below surface
                    if (y < surfaceHeight) {
                        // Determine block type based on depth
                        let blockType, blockColor;

                        if (y === 0) {
                            // Bedrock layer (should already exist, but safety check)
                            blockType = 'bedrock';
                            blockColor = new THREE.Color(0x1a1a1a);
                        } else if (y < surfaceHeight - 2) {
                            // Deep underground - stone with occasional iron
                            if (Math.random() < 0.1) { // 10% iron chance
                                blockType = 'iron';
                                blockColor = new THREE.Color(0x808080);
                            } else {
                                blockType = 'stone';
                                blockColor = new THREE.Color(0x696969);
                            }
                        } else {
                            // Near surface - use biome sub-block
                            blockType = terrainData.biome.subBlock;
                            blockColor = terrainData.subSurfaceColor;
                        }

                        // Create the block
                        this.addBlock(x, y, z, blockType, blockColor, false);
                        return this.world[key];
                    }
                }
            }

            return null;
        };

        // 🌾 Get current day for farming system
        this.getCurrentDay = () => {
            return this.dayNightCycle ? this.dayNightCycle.currentDay : 0;
        };

        // 🌾 Set block (helper for farming system)
        this.setBlock = (x, y, z, blockType) => {
            this.addBlock(x, y, z, blockType, false);
        };

        this.removeBlock = (x, y, z, giveItems = true) => {
            const key = `${x},${y},${z}`;
            if (this.world[key]) {
                const blockData = this.world[key];

                // 🎯 Only give items if this is actual player harvesting (not chunk cleanup)
                if (giveItems) {
                    // Check active tool (inventory OR equipment)
                    const hasStoneHammer = this.hasTool('stone_hammer');

                    console.log(`🔨 Harvesting block ${blockData.type}, hasStoneHammer: ${hasStoneHammer}`);

                    // Check if it's a shrub for harvesting
                    if (blockData.type === 'shrub') {
                        this.inventory.addToInventory('oak_wood', 1); // Add 1 oak wood to inventory using slot system
                        const totalWood = this.inventory.countItemInSlots('oak_wood');
                        console.log(`Harvested shrub! Oak Wood: ${totalWood}`);
                        this.updateStatus(`Harvested shrub! Oak Wood: ${totalWood}`);
                        // addToInventory already handles UI updates
                    }
                    // Check if it's a backpack for pickup
                    else if (blockData.type === 'backpack' && !this.hasBackpack) {
                        this.hasBackpack = true; // Mark backpack as found
                        this.backpackPosition = null; // Remove from minimap
                        this.generateBackpackLoot(); // Add random starting items
                        this.showHotbarTutorial(); // Show hotbar and tutorial
                        this.showToolButtons(); // Show tool menu buttons
                        console.log(`Found backpack! Hotbar unlocked!`);
                        this.updateStatus(`🎒 Found backpack! Inventory system unlocked!`, 'discovery');

                        // Show backpack tutorial for first-time players
                        if (this.tutorialSystem) {
                            this.tutorialSystem.onBackpackOpened();
                        }

                        // 🖼️ Create companion portrait after backpack found
                        if (this.companionPortrait) {
                            this.companionPortrait.create();
                        }
                    }
                    // 🔨 Stone Hammer: Special harvesting for stone blocks
                    else if (hasStoneHammer && blockData.type === 'stone') {
                        // Create explosion particle effect
                        this.createExplosionEffect(x, y, z, blockData.type);
                        
                        // 20% chance for iron OR 10% chance for coal
                        const roll = Math.random();
                        if (roll < 0.20) {
                            this.inventory.addToInventory('iron', 1);
                            this.updateStatus(`⛏️ Iron ore discovered!`, 'discovery');
                        } else if (roll < 0.30) { // 20% + 10% = 30% total
                            this.inventory.addToInventory('coal', 1);
                            this.updateStatus(`⛏️ Coal found!`, 'discovery');
                        }
                    }
                    // 🔨 Stone Hammer: Special harvesting for iron blocks
                    else if (hasStoneHammer && blockData.type === 'iron') {
                        // Create explosion particle effect
                        this.createExplosionEffect(x, y, z, blockData.type);

                        // 15% chance to get iron from iron block
                        if (Math.random() < 0.15) {
                            this.inventory.addToInventory('iron', 1);
                            this.updateStatus(`⛏️ Iron extracted!`, 'discovery');
                        }
                    }
                    // 🔨 Stone Hammer: Special harvesting for gold blocks (rarer than iron)
                    else if (hasStoneHammer && blockData.type === 'gold') {
                        // Create explosion particle effect
                        this.createExplosionEffect(x, y, z, blockData.type);

                        // 12% chance to get gold from gold block (slightly rarer than iron)
                        if (Math.random() < 0.12) {
                            this.inventory.addToInventory('gold', 1);
                            this.updateStatus(`✨ Gold extracted!`, 'discovery');
                        }
                    }
                    // Random drop system for regular blocks (without stone hammer)
                    else if (blockData.type === 'grass') {
                        // 10% chance to get dirt when harvesting grass
                        if (Math.random() < 0.1) {
                            this.inventory.addToInventory('dirt', 1);
                            this.updateStatus(`🪨 Found dirt!`, 'discovery');
                        }
                        // 🌾 FARMING: 10% chance to get wheat seeds
                        if (Math.random() < 0.1) {
                            this.inventory.addToInventory('wheat_seeds', 1);
                            this.updateStatus(`🌾 Found wheat seeds!`, 'discovery');
                        }
                        // 🥕 FARMING: 8% chance to get carrot seeds
                        else if (Math.random() < 0.08) {
                            this.inventory.addToInventory('carrot_seeds', 1);
                            this.updateStatus(`🥕 Found carrot seeds!`, 'discovery');
                        }
                    }
                    else if (blockData.type === 'stone') {
                        // 5% chance to get coal when harvesting stone (without stone hammer)
                        if (Math.random() < 0.05) {
                            this.inventory.addToInventory('coal', 1);
                            this.updateStatus(`⚫ Found coal!`, 'discovery');
                        }
                    }
                    else if (blockData.type === 'shrub') {
                        // 🫐 FARMING: Always drop berry seeds when harvesting shrubs
                        this.inventory.addToInventory('berry_seeds', 1);
                        this.updateStatus(`🫐 Berry seeds collected!`, 'discovery');
                    }
                }

                // 🧊 GREEDY MESHING: Remove from chunk mesh system if enabled
                if (this.useGreedyMeshing && this.chunkMeshManager && blockData.greedyMeshed) {
                    this.chunkMeshManager.removeBlock(x, y, z);
                }
                // TRADITIONAL: Handle regular mesh blocks
                else if (blockData.mesh) {
                    this.scene.remove(blockData.mesh);
                    if (blockData.mesh.geometry) {
                        blockData.mesh.geometry.dispose();
                    }
                    // Don't dispose material as it's shared
                }

                // Also remove billboard if it exists
                if (blockData.billboard) {
                    this.scene.remove(blockData.billboard);

                    // 🎯 PERFORMANCE: Remove from activeBillboards array
                    const billboardIndex = this.activeBillboards.indexOf(blockData.billboard);
                    if (billboardIndex !== -1) {
                        this.activeBillboards.splice(billboardIndex, 1);
                    }

                    // 🗑️ MEMORY LEAK FIX: Dispose billboard geometry and material
                    if (blockData.billboard.geometry) {
                        blockData.billboard.geometry.dispose();
                    }
                    if (blockData.billboard.material) {
                        // Dispose texture if it exists
                        if (blockData.billboard.material.map) {
                            blockData.billboard.material.map.dispose();
                        }
                        blockData.billboard.material.dispose();
                    }
                }

                delete this.world[key];

                // 🌊 Remove from water positions tracking if it was water
                if (blockData.type === 'water') {
                    const waterIndex = this.waterPositions.findIndex(w => w.x === x && w.y === y && w.z === z);
                    if (waterIndex !== -1) {
                        this.waterPositions.splice(waterIndex, 1);
                    }
                }

                // 👻 Remove ghost billboard if a pumpkin in the chunk is harvested
                if (blockData.type === 'pumpkin') {
                    // 🎃 FARMING: Always drop pumpkin seeds when harvesting pumpkin
                    this.inventory.addToInventory('pumpkin_seeds', 1);
                    this.updateStatus(`🎃 Pumpkin seeds collected!`, 'discovery');

                    const chunkX = Math.floor(x / this.chunkSize);
                    const chunkZ = Math.floor(z / this.chunkSize);
                    const chunkKey = `${chunkX},${chunkZ}`;

                    const ghostData = this.ghostBillboards.get(chunkKey);
                    if (ghostData) {
                        // Remove ghost billboard from scene
                        this.scene.remove(ghostData.billboard);

                        // 🗑️ MEMORY LEAK FIX: Dispose ghost billboard resources
                        if (ghostData.billboard.geometry) {
                            ghostData.billboard.geometry.dispose();
                        }
                        if (ghostData.billboard.material) {
                            if (ghostData.billboard.material.map) {
                                ghostData.billboard.material.map.dispose();
                            }
                            ghostData.billboard.material.dispose();
                        }

                        this.ghostBillboards.delete(chunkKey);
                        console.log(`👻💀 Ghost billboard removed from chunk ${chunkKey} (pumpkin harvested)`);
                    }

                    // Remove from pumpkin positions tracking
                    const pumpkinIndex = this.pumpkinPositions.findIndex(p => p.x === x && p.y === y && p.z === z);
                    if (pumpkinIndex !== -1) {
                        this.pumpkinPositions.splice(pumpkinIndex, 1);
                    }
                }

                // 💾 Track block removal for chunk persistence (if player harvesting)
                if (giveItems && this.modificationTracker) {
                    this.modificationTracker.trackModification(x, y, z, null, 0, false);
                }

                // Log removal for debugging
                // commented out due to console spam - brad
                //console.log(`Removed block ${blockData.type} at (${x},${y},${z})`);
            }
        };

        // 💥 Create explosion particle effect for stone hammer
        // NOTE: Using Sprites instead of THREE.Points to avoid r180 shader bug
        this.createExplosionEffect = (x, y, z, blockType) => {
            const particleCount = 20;
            const particles = [];
            const velocities = [];

            // Determine particle color based on block type
            let baseColor = { r: 0.5, g: 0.5, b: 0.5 }; // Default grey for stone
            if (blockType === 'iron') {
                baseColor = { r: 0.7, g: 0.7, b: 0.8 }; // Silvery for iron
            } else if (blockType === 'stone') {
                baseColor = { r: 0.4, g: 0.4, b: 0.4 }; // Dark grey for stone
            }

            // Create explosion particles using Sprites (THREE.Points causes r180 shader errors)
            for (let i = 0; i < particleCount; i++) {
                // Create sprite material with color variation
                const r = Math.max(0, Math.min(1, baseColor.r + (Math.random() - 0.5) * 0.2));
                const g = Math.max(0, Math.min(1, baseColor.g + (Math.random() - 0.5) * 0.2));
                const b = Math.max(0, Math.min(1, baseColor.b + (Math.random() - 0.5) * 0.2));

                const spriteMaterial = new THREE.SpriteMaterial({
                    color: new THREE.Color(r, g, b),
                    transparent: true,
                    opacity: 1.0,
                    blending: THREE.NormalBlending,
                    depthWrite: false
                });

                const sprite = new THREE.Sprite(spriteMaterial);
                sprite.scale.set(0.2, 0.2, 0.2);
                sprite.position.set(x, y, z);

                this.scene.add(sprite);
                particles.push(sprite);

                // Random explosion velocities (outward in all directions) - SLOWER for visibility
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI;
                const speed = 0.05 + Math.random() * 0.08; // Reduced speed for longer visibility

                velocities.push({
                    x: Math.sin(phi) * Math.cos(theta) * speed,
                    y: Math.sin(phi) * Math.sin(theta) * speed + 0.03, // Slight upward bias
                    z: Math.cos(phi) * speed
                });
            }

            // Store particle data for animation
            const explosionData = {
                particles: particles, // Array of sprites
                velocities: velocities,
                lifetime: 0,
                maxLifetime: 180 // Frames until particles disappear (180 frames = 3 seconds at 60fps)
            };

            // Initialize explosion effects array if it doesn't exist
            if (!this.explosionEffects) {
                this.explosionEffects = [];
            }

            // 🎯 PERFORMANCE: Limit maximum simultaneous explosions to prevent memory leak
            if (this.explosionEffects.length >= 50) {
                // Force cleanup oldest explosion
                const oldest = this.explosionEffects.shift();
                oldest.particles.forEach(sprite => {
                    this.scene.remove(sprite);
                    if (sprite.material) sprite.material.dispose();
                });
                console.log('💥 Forced cleanup of oldest explosion (limit: 50)');
            }

            this.explosionEffects.push(explosionData);

            console.log(`💥 Created explosion effect with ${particleCount} sprites at (${x}, ${y}, ${z}) for ${blockType}`);
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
            return (n1 + n2) * 0.5; // Combine for more variation (returns -1 to 1)
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
                this.removeBlock(x, y, z, false); // Don't give items when clearing world
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
            this.biomeWorldGen.setWorldSeed(this.worldSeed);

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

        // Spawn backpack in front of player (for first-time tutorial)
        this.spawnStarterBackpack = () => {
            if (this.hasBackpack) return; // Don't spawn if already found

            // Get player position and camera direction
            const px = Math.floor(this.player.position.x);
            const py = Math.floor(this.player.position.y);
            const pz = Math.floor(this.player.position.z);

            // Get camera forward direction (where player is looking)
            const cameraDirection = new THREE.Vector3();
            this.camera.getWorldDirection(cameraDirection);

            // Spawn 2-3 blocks in front of player at ground level
            const distance = 2.5;
            const backpackX = Math.floor(px + cameraDirection.x * distance);
            const backpackZ = Math.floor(pz + cameraDirection.z * distance);

            // Find ground level at that position
            let groundY = py;
            for (let y = py + 2; y >= py - 5; y--) {
                const key = `${backpackX},${y},${backpackZ}`;
                if (this.world[key]) {
                    groundY = y + 1; // Place on top of ground
                    break;
                }
            }

            // Place backpack on ground
            this.addBlock(backpackX, groundY, backpackZ, 'backpack', false);
            this.backpackPosition = { x: backpackX, z: backpackZ }; // Store for minimap
            console.log(`🎒 Starter backpack spawned at ${backpackX}, ${groundY}, ${backpackZ}`);
            this.updateStatus('📦 Your companion has brought you an Explorer\'s Pack!', 'discovery');
        };

        // Generate random loot when backpack is found
        this.generateBackpackLoot = () => {
            console.log('🎒 Starting backpack loot generation...');

            // Helper function for random range
            const randomRange = (min, max) => Math.floor(this.seededRandom() * (max - min + 1)) + min;

            // CRITICAL: Add machete to EQUIPMENT SLOT (not regular inventory)
            console.log('🔧 Adding essential machete to equipment slot...');
            if (this.hotbarSystem) {
                this.hotbarSystem.addToolToEquipment('machete', 1);
            } else {
                // Fallback if hotbar system not ready
                this.inventory.addToInventory('machete', 1);
            }

            // Guaranteed starter materials (but smaller amounts to fit in hotbar + backpack)
            const woodCount = randomRange(4, 8);  // Reduced from 8-16
            // Randomly select a wood type for variety
            const woodTypes = ['oak_wood', 'pine_wood', 'birch_wood', 'palm_wood', 'dead_wood'];
            const randomWoodType = woodTypes[Math.floor(this.seededRandom() * woodTypes.length)];
            console.log(`🪵 Adding ${woodCount} ${randomWoodType}...`);
            this.inventory.addToInventory(randomWoodType, woodCount);

            const stoneCount = randomRange(2, 6);  // Reduced from 4-10
            console.log(`🪨 Adding ${stoneCount} stone...`);
            this.inventory.addToInventory('stone', stoneCount);

            
            // Common items (high chance)
            if (this.seededRandom() > 0.2) {
                const sandCount = randomRange(2, 6);
                this.inventory.addToInventory('sand', sandCount);
            }
            if (this.seededRandom() > 0.3) {
                const grassCount = randomRange(3, 8);
                this.inventory.addToInventory('grass', grassCount);
            }

            // Uncommon items (medium chance)
            if (this.seededRandom() > 0.5) {
                const glassCount = randomRange(1, 3);
                this.inventory.addToInventory('glass', glassCount);
            }
            if (this.seededRandom() > 0.6) {
                const brickCount = randomRange(1, 2);
                this.inventory.addToInventory('brick', brickCount);
            }
            if (this.seededRandom() > 0.7) {
                const flowersCount = randomRange(1, 3);
                this.inventory.addToInventory('flowers', flowersCount);
            }

            // Rare items (low chance but exciting!)
            if (this.seededRandom() > 0.8) {
                this.inventory.addToInventory('glowstone', 1);  // 20% chance - lucky!
            }
            if (this.seededRandom() > 0.9) {
                this.inventory.addToInventory('iron', 1);  // 10% chance - jackpot!
            }

            // Log what we found for excitement
            // Items automatically added to slots via addToInventory()
            console.log(`Backpack loot generated and added to slots!`);

            // Debug: Check what ended up where using InventorySystem
            console.log('🔍 INVENTORY CONTENTS:');
            this.inventory.debugInventory();

            // Note: addToInventory() already handles UI updates
        };

        // World item spawning system for random discoveries
        this.cleanupChunkTracking = (playerChunkX, playerChunkZ, customRadius = null) => {
            // Remove tracking data for chunks beyond cleanup radius to prevent memory bloat
            const chunksToRemove = [];
            // CRITICAL: Use ?? instead of || because customRadius can be 0 (which is falsy but valid!)
            const cleanupRadius = customRadius ?? this.chunkCleanupRadius;
            
            // Check visitedChunks Set
            for (const chunkKey of this.visitedChunks) {
                const [chunkX, chunkZ] = chunkKey.split(',').map(Number);
                const distance = Math.max(
                    Math.abs(chunkX - playerChunkX),
                    Math.abs(chunkZ - playerChunkZ)
                );
                
                if (distance > cleanupRadius) {
                    chunksToRemove.push(chunkKey);
                }
            }
            
            // 🔍 DEBUG: Log what we found (especially during emergency cleanup!)
            if (customRadius !== null && customRadius <= 1) {
                console.log(`🔍 Cleanup scan: ${this.visitedChunks.size} chunks total, ${chunksToRemove.length} chunks beyond ${cleanupRadius} chunk radius`);
            }
            
            // 🧹 PERFORMANCE: Actually unload chunk blocks and billboards
            let blocksRemoved = 0;
            let billboardsRemoved = 0;
            
            chunksToRemove.forEach(chunkKey => {
                const [chunkX, chunkZ] = chunkKey.split(',').map(Number);
                
                // Iterate through all blocks in this chunk
                // Use -10 to 128 to cover underground and mountain peaks
                for (let x = chunkX * this.chunkSize; x < (chunkX + 1) * this.chunkSize; x++) {
                    for (let z = chunkZ * this.chunkSize; z < (chunkZ + 1) * this.chunkSize; z++) {
                        for (let y = -10; y <= 128; y++) {
                            const blockKey = `${x},${y},${z}`;
                            const blockData = this.world[blockKey];
                            
                            if (blockData) {
                                // Remove mesh from scene
                                if (blockData.mesh) {
                                    this.scene.remove(blockData.mesh);
                                    if (blockData.mesh.geometry) {
                                        blockData.mesh.geometry.dispose();
                                    }
                                    // Material is shared, don't dispose
                                }
                                
                                // Remove billboard from scene and tracking
                                if (blockData.billboard) {
                                    this.scene.remove(blockData.billboard);
                                    
                                    // Remove from activeBillboards array
                                    const billboardIndex = this.activeBillboards.indexOf(blockData.billboard);
                                    if (billboardIndex !== -1) {
                                        this.activeBillboards.splice(billboardIndex, 1);
                                        billboardsRemoved++;
                                    }
                                    
                                    // Dispose billboard resources
                                    if (blockData.billboard.material) {
                                        if (blockData.billboard.material.map) {
                                            blockData.billboard.material.map.dispose();
                                        }
                                        blockData.billboard.material.dispose();
                                    }
                                }
                                
                                // Remove from world
                                delete this.world[blockKey];
                                blocksRemoved++;
                            }
                        }
                    }
                }
                
                // Remove chunk tracking
                this.visitedChunks.delete(chunkKey);
                this.chunkSpawnTimes.delete(chunkKey);
                this.loadedChunks.delete(chunkKey); // 🔑 CRITICAL: Allow chunk to regenerate if player returns
            });
            
            if (chunksToRemove.length > 0) {
                console.log(`🧹 Unloaded ${chunksToRemove.length} distant chunks (blocks: ${blocksRemoved}, billboards: ${billboardsRemoved})`);
            } else if (customRadius !== null && customRadius <= 1) {
                // Log when emergency cleanup finds nothing to remove (suspicious!)
                console.warn(`⚠️ Emergency cleanup found 0 chunks to remove! (radius ${cleanupRadius}, ${this.visitedChunks.size} chunks total)`);
            }
        };

        // 🧹 PERFORMANCE: Cleanup distant position arrays to prevent unbounded growth
        this.cleanupDistantPositions = (playerX, playerZ, maxDistance = 200) => {
            const cleanupRadius = maxDistance;
            
            // Track what we cleaned
            const before = {
                water: this.waterPositions.length,
                pumpkins: this.pumpkinPositions.length,
                items: this.worldItemPositions.length,
                trees: this.treePositions.length
            };
            
            // Clean water positions (keep only nearby)
            this.waterPositions = this.waterPositions.filter(pos => 
                Math.abs(pos.x - playerX) < cleanupRadius && 
                Math.abs(pos.z - playerZ) < cleanupRadius
            );
            
            // Clean pumpkin positions
            this.pumpkinPositions = this.pumpkinPositions.filter(pos => 
                Math.abs(pos.x - playerX) < cleanupRadius && 
                Math.abs(pos.z - playerZ) < cleanupRadius
            );
            
            // Clean world item positions (collectibles)
            this.worldItemPositions = this.worldItemPositions.filter(pos => 
                Math.abs(pos.x - playerX) < cleanupRadius && 
                Math.abs(pos.z - playerZ) < cleanupRadius
            );
            
            // Clean tree positions
            this.treePositions = this.treePositions.filter(pos => 
                Math.abs(pos.x - playerX) < cleanupRadius && 
                Math.abs(pos.z - playerZ) < cleanupRadius
            );
            
            // Log if significant cleanup happened
            const cleaned = {
                water: before.water - this.waterPositions.length,
                pumpkins: before.pumpkins - this.pumpkinPositions.length,
                items: before.items - this.worldItemPositions.length,
                trees: before.trees - this.treePositions.length
            };
            
            const totalCleaned = cleaned.water + cleaned.pumpkins + cleaned.items + cleaned.trees;
            if (totalCleaned > 50) {
                console.log(`🧹 Position cleanup: removed ${totalCleaned} distant positions (water: ${cleaned.water}, pumpkins: ${cleaned.pumpkins}, items: ${cleaned.items}, trees: ${cleaned.trees})`);
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
            const biome = this.biomeWorldGen.getBiomeAt(centerX, centerZ, this.worldSeed);
            
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

            // 🔍 Track world item for compass navigation
            this.worldItemPositions.push({ x, y, z, itemType });
        };

        this.harvestWorldItem = (target) => {
            // Handle both sprites and collision boxes
            let itemType, emoji, sprite, discoveryId, isCompanionDiscovery;
            
            if (target.userData.sprite) {
                // Clicked on collision box - get data from associated sprite
                sprite = target.userData.sprite;
                itemType = target.userData.itemType;
                emoji = target.userData.emoji;
                discoveryId = target.userData.discoveryId;
                isCompanionDiscovery = target.userData.isCompanionDiscovery;
            } else {
                // Clicked directly on sprite
                sprite = target;
                itemType = target.userData.itemType;
                emoji = target.userData.emoji;
                discoveryId = target.userData.discoveryId;
                isCompanionDiscovery = target.userData.isCompanionDiscovery;
            }
            
            // Add to inventory
            this.inventory.addToInventory(itemType, 1);

            // �️ Notify spear system if this was a thrown spear
            if ((itemType === 'stone_spear' || itemType === 'crafted_stone_spear') && this.spearSystem) {
                this.spearSystem.removeSpear(sprite);
            }

            // �🐕 Notify companion hunt system if this was a discovery item
            if (isCompanionDiscovery && discoveryId && this.companionHuntSystem) {
                this.companionHuntSystem.onItemCollected(discoveryId);
                console.log(`🐕 Companion discovery collected: ${discoveryId}`);
            }

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
            this.updateStatus(`${emoji} Found ${itemType}! (${this.inventory.countItemInSlots(itemType)} total)`, 'discovery');
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

            // 🔥 CLEANUP: Remove effect objects (particles, lights) BEFORE removing mesh
            if (craftedMesh.userData.effectObjects && craftedMesh.userData.effectObjects.length > 0) {
                craftedMesh.userData.effectObjects.forEach(effect => {
                    if (effect.type === 'particles') {
                        // Clean up sprite-based particles
                        if (effect.sprites) {
                            effect.sprites.forEach(sprite => {
                                this.scene.remove(sprite);
                                if (sprite.material) sprite.material.dispose();
                            });
                            console.log(`🔥 Removed ${effect.sprites.length} fire particles`);
                        }
                        // Clean up old BufferGeometry particles
                        else if (effect.object) {
                            this.scene.remove(effect.object);
                            if (effect.object.geometry) effect.object.geometry.dispose();
                            if (effect.object.material) effect.object.material.dispose();
                        }
                    }
                    if (effect.type === 'light') {
                        this.scene.remove(effect.object);
                        console.log(`💡 Removed glow light`);
                    }
                });
                craftedMesh.userData.effectObjects = [];
                console.log(`✅ Cleaned up all effect objects for "${originalName}"`);
            }

            // 🎯 PHASE 2.1 & 2.2: Remove physics bodies from physics world (including hollow objects)
            if (craftedMesh.userData.physicsBodies) {
                // Multiple physics bodies (hollow object)
                craftedMesh.userData.physicsBodies.forEach(body => {
                    this.physicsWorld.removeBody(body);
                });
                this.physicsObjects.delete(craftedMesh);
                console.log(`🗑️ Removed ${craftedMesh.userData.physicsBodies.length} physics bodies for hollow crafted object`);
            } else if (this.physicsObjects.has(craftedMesh)) {
                // Single physics body (solid object)
                const cannonBody = this.physicsObjects.get(craftedMesh);
                this.physicsWorld.removeBody(cannonBody);
                this.physicsObjects.delete(craftedMesh);
                console.log(`🗑️ Removed physics body for harvested crafted object`);
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
            this.inventory.addToInventory(itemId, 1);

            // Update UI displays
            this.updateHotbarCounts();
            this.updateBackpackInventoryDisplay();

            // Success notification with custom name
            const icon = this.getItemIcon(itemId, 'status');
            this.updateStatus(`${icon} Harvested "${originalName}"!`, 'harvest');
            console.log(`✅ Successfully harvested crafted object "${originalName}" → returned ${itemId} to inventory`);
        };

        // Show hotbar and tutorial after backpack pickup
        this.showHotbarTutorial = () => {
            // Create hotbar if it doesn't exist
            if (!this.hotbarElement) {
                // OLD: this.createHotbar();
                // NEW: Use HotbarSystem
                this.hotbarSystem.createUI();
                this.hotbarElement = this.hotbarSystem.hotbarElement;
                
                // Connect UI elements to InventorySystem
                this.inventory.setUIElements(this.hotbarElement, this.backpackInventoryElement);
            }

            // Show the hotbar
            this.hotbarElement.style.display = 'flex';

            // Show tutorial message for a few seconds
            setTimeout(() => {
                this.updateStatus('Backpack found! Check your hotbar - you got random starting supplies!');
            }, 1000);

            setTimeout(() => {
                this.updateStatus('Use 1-5 for items, B for backpack, E for workbench!');
            }, 4000);
        };

        // Refresh all existing billboards to use enhanced graphics
        this.refreshAllBillboards = () => {
            Object.keys(this.world).forEach(key => {
                const worldItem = this.world[key];
                if (worldItem && worldItem.billboard && worldItem.billboard.userData.type === 'billboard') {
                    const billboard = worldItem.billboard;
                    const billboardType = worldItem.type;

                    // Remove old billboard
                    this.scene.remove(billboard);

                    // 🗑️ MEMORY LEAK FIX: Dispose old billboard resources
                    if (billboard.geometry) {
                        billboard.geometry.dispose();
                    }
                    if (billboard.material) {
                        if (billboard.material.map) {
                            billboard.material.map.dispose();
                        }
                        billboard.material.dispose();
                    }

                    // Create new billboard with current enhanced graphics setting
                    const newBillboard = this.createBillboard(billboard.position.x, billboard.position.y - 0.6, billboard.position.z, billboardType);
                    if (newBillboard) {
                        this.scene.add(newBillboard);
                        worldItem.billboard = newBillboard;
                    }
                }
            });
            console.log('🔄 Refreshed all billboards for enhanced graphics');
        };

        // Refresh all block textures after enhanced graphics initialization
        this.refreshAllBlockTextures = () => {
            let refreshedCount = 0;
            let multiFaceCount = 0;
            const startTime = performance.now();

            Object.values(this.world).forEach(block => {
                if (block.mesh && block.type) {
                    // Get the current material (could be default or enhanced)
                    const currentMaterial = block.mesh.material;

                    // Try to get enhanced material
                    const enhancedMaterial = this.enhancedGraphics.getEnhancedBlockMaterial(
                        block.type,
                        currentMaterial
                    );

                    // Only update if we got a different (enhanced) material
                    if (enhancedMaterial !== currentMaterial) {
                        block.mesh.material = enhancedMaterial;
                        refreshedCount++;

                        // If it's an array of materials (multi-face), count it
                        if (Array.isArray(enhancedMaterial)) {
                            multiFaceCount++;
                        }
                    }
                }
            });

            const endTime = performance.now();
            console.log(`🔄 Refreshed ${refreshedCount} blocks (${multiFaceCount} multi-face) with enhanced textures in ${(endTime - startTime).toFixed(1)}ms`);
        };

        // Update tool button icon with enhanced graphics if available
        this.updateToolButtonIcon = (buttonElement, toolType, defaultEmoji) => {
            console.log(`🔧 Updating tool button for ${toolType}, enhanced graphics ready: ${this.enhancedGraphics.isReady()}`);

            // Preserve existing hotkey label before clearing content
            const existingLabel = buttonElement.querySelector('div');
            let labelHTML = '';
            if (existingLabel) {
                labelHTML = existingLabel.outerHTML;
            }

            if (this.enhancedGraphics.isReady()) {
                const enhancedIcon = this.enhancedGraphics.getEnhancedToolIcon(toolType, defaultEmoji, 28);
                console.log(`🎨 Enhanced icon result for ${toolType}: ${enhancedIcon.substring(0, 50)}...`);

                if (enhancedIcon.includes('<img')) {
                    console.log(`✅ Using enhanced image for ${toolType}`);
                    // Use enhanced image with proper styling - preserve display state
                    buttonElement.innerHTML = enhancedIcon + labelHTML;
                    buttonElement.style.fontSize = '';
                    buttonElement.style.lineHeight = '32px';
                    // Only change display if currently visible (don't override 'none')
                    if (buttonElement.style.display !== 'none') {
                        buttonElement.style.display = 'flex';
                        buttonElement.style.alignItems = 'center';
                        buttonElement.style.justifyContent = 'center';
                    }
                } else {
                    console.log(`📱 Enhanced graphics returned emoji for ${toolType}: ${enhancedIcon}`);
                    // Enhanced graphics returned emoji fallback - preserve display state
                    buttonElement.innerHTML = enhancedIcon + labelHTML;
                    buttonElement.style.fontSize = '28px';
                    buttonElement.style.lineHeight = '32px';
                    // Only change display if currently visible (don't override 'none')
                    if (buttonElement.style.display !== 'none') {
                        buttonElement.style.display = 'block';
                    }
                }
            } else {
                console.log(`📱 Using emoji fallback for ${toolType}: ${defaultEmoji}`);
                // Enhanced graphics not ready, use default emoji - preserve display state
                buttonElement.innerHTML = defaultEmoji + labelHTML;
                buttonElement.style.fontSize = '28px';
                buttonElement.style.lineHeight = '32px';
                // Only change display if currently visible (don't override 'none')
                if (buttonElement.style.display !== 'none') {
                    buttonElement.style.display = 'block';
                }
            }
        };

        // Show tool buttons when backpack is found
        this.showToolButtons = () => {
            if (this.backpackTool) {
                this.backpackTool.style.display = 'block';
                // Refresh icon to use enhanced graphics if available
                this.updateToolButtonIcon(this.backpackTool, 'backpack', '🎒');
                console.log('🎒 Backpack tool button enabled');
            }

            // Always show workbench tool when player has backpack (UI-only tool)
            if (this.hasBackpack && this.workbenchTool) {
                this.workbenchTool.style.display = 'block';
                // Refresh icon to use enhanced graphics if available
                this.updateToolButtonIcon(this.workbenchTool, 'workbench', '🔨');
                console.log('🔨 Workbench tool button enabled (UI-only tool)');
            }

            // Initialize hotkey label colors based on current time
            if (this.timeOfDay !== undefined) {
                this.updateToolHotkeyColors(this.timeOfDay);
            }
        };

        // Get emoji icon for item types
        // Material Design icon system for crafted items
        this.getMaterialColor = (material) => {
            const materialColors = {
                wood: '#8B4513',      // Brown (legacy)
                stone: '#708090',     // Slate gray
                iron: '#C0C0C0',      // Silver
                glass: '#87CEEB',     // Sky blue
                sand: '#F4A460',      // Sandy brown
                grass: '#228B22',     // Forest green
                brick: '#B22222',     // Fire brick
                glowstone: '#FFD700', // Gold
                coal: '#2F4F4F',      // Dark slate gray
                dirt: '#8B7355',      // Burlywood

                // NEW: Biome-specific wood colors
                oak_wood: '#8B4513',      // Classic brown oak
                pine_wood: '#654321',     // Darker brown pine
                palm_wood: '#D2B48C',     // Light tan palm
                birch_wood: '#F5F5DC',    // Pale birch

                // NEW: Biome-specific leaf colors
                forest_leaves: '#228B22',   // Bright green
                mountain_leaves: '#006400', // Dark green needles
                desert_leaves: '#9ACD32',   // Yellow-green fronds
                plains_leaves: '#90EE90',   // Light green
                tundra_leaves: '#708090',   // Gray-green hardy

                // NEW: Tools
                machete: '#C0C0C0'          // Silver blade
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

        this.getItemIcon = (itemType, context = 'inventory') => {
            // Default emoji icons for base materials (DEFINE FIRST for use as fallbacks)
            const icons = {
                grass: '🌱',
                stone: '🪨',
                wood: '🪵',      // Legacy wood
                workbench: '🔨',
                sand: '🏖️',
                glass: '💎',
                brick: '🧱',
                glowstone: '✨',
                iron: '⚙️',      // Iron ore/nugget (temporary - needs icon)
                gold: '🟡',      // Gold ore/nugget (temporary - needs icon)
                flowers: '🌸',
                snow: '❄️',
                dirt: '🪨',
                coal: '⚫',
                pumpkin: '🎃',   // Halloween pumpkin!
                skull: '💀',
                leaf: '🍃',      // Legacy leaf
                stick: '🪵',     // Crafted from leaves - tool material

                // NEW: Biome-specific wood types
                oak_wood: '🪵',      // Classic brown oak
                pine_wood: '🌲',     // Evergreen pine
                palm_wood: '🥥',     // Tropical palm
                birch_wood: '🍃',    // Light birch

                // NEW: Biome-specific leaf types
                forest_leaves: '🌿',   // Bright green forest
                mountain_leaves: '🌲', // Dark green needles
                desert_leaves: '🌴',   // Yellow-green fronds
                plains_leaves: '🌱',   // Light green plains
                tundra_leaves: '🍂',   // Gray-green hardy

                // NEW: Tools
                machete: '🔪',        // For harvesting leaves and vegetation
                stone_hammer: '🔨',   // Stone hammer for mining
                backpack: '🎒',       // Backpack icon
                compass: '🧭',        // Navigation compass
                compass_upgrade: '🧭', // Crystal compass (reassignable)
                tool_bench: '🔧',     // Tool bench for advanced crafting
                kitchen_bench: '🍳',  // Kitchen bench for cooking

                // Tree types for compass tracking
                oak_tree: '🌳',
                pine_tree: '🌲',
                palm_tree: '🌴',
                birch_tree: '🌿',
                dead_tree: '💀',

                // Exploring collectibles
                skull: '💀',
                mushroom: '🍄',
                flower: '🌸',
                berry: '🍓',
                crystal: '💎',
                oreNugget: '⛰️',
                wheat: '🌾',
                feather: '🪶',
                bone: '🦴',
                shell: '🐚',
                fur: '🐻‍❄️',
                iceShard: '❄️',
                rustySword: '⚔️',
                oldPickaxe: '⛏️',
                ancientAmulet: '📿',

                // 🌾 FARMING ITEMS
                hoe: '🌾',           // Hoe for tilling soil
                watering_can: '💧',  // Watering can for crops
                wheat_seeds: '🌾',   // Wheat seeds
                carrot_seeds: '🥕',  // Carrot seeds
                pumpkin_seeds: '🎃', // Pumpkin seeds
                berry_seeds: '🫐',   // Berry seeds
                
                // 🧪 CONSUMABLE TOOLS
                healing_potion: '🧪',          // Healing potion (heals companion or player)
                crafted_healing_potion: '🧪',  // Crafted version
                light_orb: '💡',               // Light orb (ceiling-mounted light)
                crafted_light_orb: '💡',       // Crafted version
                
                // 🏠 STRUCTURES
                simple_house: '🏠',            // Simple house structure
                crafted_simple_house: '🏠',    // Crafted version
                
                // 🥬 HARVESTED INGREDIENTS
                wheat: '🌾',         // Harvested wheat
                carrot: '🥕',        // Harvested carrot
                potato: '🥔',        // Harvested potato
                pumpkin: '🎃',       // Harvested pumpkin
                berry: '🫐',         // Harvested berry
                mushroom: '🍄',      // Harvested mushroom
                rice: '🍚',          // Rice grain
                corn_ear: '🌽',      // Corn on the cob
                
                // 🍖 COMPANION HUNT INGREDIENTS (rare)
                fish: '🐟',          // From fishing expeditions
                egg: '🥚',           // From gathering nests
                honey: '🍯',         // From finding beehives
                apple: '🍎',         // From foraging

                // 🍳 COOKED FOODS
                bread: '🍞',
                roasted_wheat: '🍞',
                baked_potato: '🥔',
                roasted_corn: '🌽',
                grilled_fish: '🍣',
                carrot_stew: '🍲',
                berry_bread: '🫓',
                mushroom_soup: '🥣',
                fish_rice: '🍱',
                veggie_medley: '🥗',
                honey_bread: '🥖',
                pumpkin_pie: '🥧',
                super_stew: '🍜',
                berry_honey_snack: '🍪',
                energy_bar: '🍫',
                rice_bowl: '🍚',
                corn_chips: '🌽',
                grain_mix: '🌾',
                berry_snack: '🫐',
                potato_chips: '🥔',
                mushroom_bites: '🍄',
                cooked_egg: '🍳',
                cookie: '🍪'
            };

            // Get the default icon for this item (used as fallback if no graphics found)
            // ❌ = clear visual indicator that emoji is missing and needs to be defined
            const defaultIcon = icons[itemType] || '❌';
            
            // ⚡ TOOLBENCH TOOLS: Check for ToolBench crafted tools FIRST (before general crafted_ parsing)
            // These are special items like crafted_grappling_hook, crafted_speed_boots, etc.
            const toolBenchTools = [
                'crafted_grappling_hook', 'crafted_speed_boots', 'crafted_combat_sword',
                'crafted_mining_pick', 'crafted_stone_hammer', 'crafted_magic_amulet',
                'crafted_compass', 'crafted_compass_upgrade', 'crafted_machete',
                'crafted_club', 'crafted_stone_spear', 'crafted_torch', 'crafted_wood_shield',
                'crafted_hoe', 'crafted_watering_can', 'crafted_healing_potion', 'crafted_light_orb',
                'grappling_hook', 'speed_boots', 'combat_sword', 'mining_pick',
                'stone_hammer', 'magic_amulet', 'compass', 'compass_upgrade', 'machete',
                'club', 'stone_spear', 'torch', 'wood_shield', 'hoe', 'watering_can',
                'healing_potion', 'light_orb'
            ];
            
            if (toolBenchTools.includes(itemType)) {
                if (context === 'status') {
                    return this.enhancedGraphics.getStatusToolIcon(itemType, defaultIcon);
                } else if (context === 'hotbar') {
                    return this.enhancedGraphics.getHotbarToolIcon(itemType, defaultIcon);
                } else {
                    return this.enhancedGraphics.getInventoryToolIcon(itemType, defaultIcon);
                }
            }

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

            // Try to get enhanced graphics icon FIRST (if enhanced graphics is enabled and loaded)
            // Try to get enhanced icon for tools, discovery items, and food items
            const toolsAndDiscoveryItems = [
                // Crafting tools (excluding benches - those are special UI items)
                'machete', 'stone_hammer', 'stick', 'compass', 'compass_upgrade', 
                'grappling_hook', 'crafted_grappling_hook', 'hoe',
                // Consumable tools
                'healing_potion', 'crafted_healing_potion', 'light_orb', 'crafted_light_orb',
                // Discovery items (in /tools/ folder)
                'skull', 'mushroom', 'flower', 'berry', 'crystal', 'feather', 'bone', 'shell', 
                'fur', 'iceShard', 'rustySword', 'oldPickaxe', 'ancientAmulet',
                // Ores and materials (in /tools/ folder)
                'coal', 'iron', 'gold', 'pumpkin', 'leaf',
                // Food items (in /food/ folder - EnhancedGraphics loads these into toolImages)
                // Seeds
                'wheat_seeds', 'carrot_seeds', 'pumpkin_seeds', 'berry_seeds',
                // Harvested ingredients
                'wheat', 'carrot', 'potato', 'pumpkin', 'berry', 'mushroom', 'rice', 'corn_ear',
                // Companion Hunt ingredients (rare)
                'fish', 'egg', 'honey', 'apple',
                // Cooked foods (Brad's amazing Lora art!)
                'bread', 'roasted_wheat', 'baked_potato', 'roasted_corn', 'grilled_fish',
                'carrot_stew', 'berry_bread', 'mushroom_soup', 'fish_rice', 'veggie_medley',
                'honey_bread', 'pumpkin_pie', 'super_stew', 'berry_honey_snack', 'energy_bar',
                'rice_bowl', 'corn_chips', 'grain_mix', 'berry_snack', 'potato_chips', 
                'mushroom_bites', 'cooked_egg', 'cookie'
            ];
            
            if (toolsAndDiscoveryItems.includes(itemType)) {
                if (context === 'status') {
                    return this.enhancedGraphics.getStatusToolIcon(itemType, defaultIcon);
                } else if (context === 'hotbar') {
                    return this.enhancedGraphics.getHotbarToolIcon(itemType, defaultIcon);
                } else {
                    return this.enhancedGraphics.getInventoryToolIcon(itemType, defaultIcon);
                }
            }

            // Try to get enhanced icon for materials that have block textures
            const materialsWithAssets = [
                'bedrock', 'dirt', 'sand', 'snow', 'stone', 'grass', 'pumpkin',
                'oak_wood', 'pine_wood', 'birch_wood', 'palm_wood', 'dead_wood', 'douglas_fir', 'christmas_tree',
                'oak_wood-leaves', 'pine_wood-leaves', 'birch_wood-leaves', 'palm_wood-leaves', 'dead_wood-leaves', 'douglas_fir-leaves', 'christmas_tree-leaves',
                'forest_leaves', 'mountain_leaves', 'desert_leaves', 'plains_leaves', 'tundra_leaves',
                'tilled_soil', 'gift_wrapped'
            ];

            // Map dead_tree to dead_wood texture
            const textureMap = {
                'dead_tree': 'dead_wood'
            };
            const mappedType = textureMap[itemType] || itemType;

            if (materialsWithAssets.includes(mappedType)) {
                if (context === 'status') {
                    return this.enhancedGraphics.getStatusMaterialIcon(mappedType, defaultIcon);
                } else if (context === 'hotbar') {
                    return this.enhancedGraphics.getHotbarMaterialIcon(mappedType, defaultIcon);
                } else {
                    return this.enhancedGraphics.getInventoryMaterialIcon(mappedType, defaultIcon);
                }
            }

            // Fallback to emoji if no enhanced graphics available
            // Final safety check: ensure we never return empty/null/undefined
            return defaultIcon || '❌';
        };

        // Format item names for display (replace underscores with spaces, capitalize each word)
        this.formatItemName = (itemType) => {
            return itemType
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        };

        // Update hotbar visual selection
        this.updateHotbarSelection = () => {
            if (!this.hotbarElement) return;

            const slots = this.hotbarElement.querySelectorAll('.hotbar-slot');
            slots.forEach((slot, index) => {
                slot.style.border = index === this.selectedSlot ?
                    '2px solid #FFD700' : '2px solid #666';
            });

            // Check for first-time machete selection tutorial
            const selectedItem = this.hotbarSystem.getSelectedSlot();
            if (selectedItem && selectedItem.itemType === 'machete') {
                if (this.tutorialSystem) {
                    this.tutorialSystem.onMacheteSelected();
                }
            }
        };

        // Update hotbar item counts and icons
        this.updateHotbarCounts = () => {
            // Delegate to InventorySystem
            this.inventory.updateHotbarCounts();
        };

        // Toggle backpack inventory slide-down
        this.toggleBackpackInventory = () => {
            if (!this.backpackSystem.backpackInventoryElement) {
                this.createBackpackInventory();
            }

            const isVisible = this.backpackSystem.backpackInventoryElement.style.transform.includes('translateY(0px)');

            if (isVisible) {
                // Slide up (hide) and re-enable pointer lock
                this.backpackSystem.backpackInventoryElement.style.transform = 'translateX(-50%) translateY(-100%)';
                this.updateStatus('Backpack closed');

                // Re-request pointer lock after a short delay
                setTimeout(() => {
                    if (this.controlsEnabled) {
                        this.renderer.domElement.requestPointerLock();
                    }
                }, 100);
            } else {
                // Slide down (show) and release pointer lock
                this.backpackSystem.backpackInventoryElement.style.transform = 'translateX(-50%) translateY(0px)';
                this.updateBackpackInventoryDisplay();
                this.updateStatus('Backpack opened - 20 slots (4x5 grid) • 50 per stack');

                // 🎓 Trigger backpack tutorial (first time)
                if (this.tutorialSystem) {
                    this.tutorialSystem.onBackpackOpened();
                }

                // Exit pointer lock to allow cursor interaction
                if (document.pointerLockElement) {
                    document.exitPointerLock();
                }
            }
        };

        // NOTE: Old workbench modal code removed - WorkbenchSystem.js is now used
        // ===============================================================
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
                z-index: 50000;
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

        // 📖 Create full-screen exploration journal book
        this.createWorldMapModal = () => {
            // Initialize pins if not already done (cleared on each page load)
            if (!this.explorerPins) {
                this.explorerPins = []; // Start fresh each session
                this.activeNavigation = null; // Currently navigating to pin
            }

            this.worldMapModal = document.createElement('div');
            this.worldMapModal.style.cssText = `
                position: fixed;
                top: 5%;
                left: 5%;
                width: 90%;
                height: 90%;
                background: linear-gradient(135deg, rgba(101, 67, 33, 0.98), rgba(139, 90, 43, 0.98));
                border: 8px solid #654321;
                border-radius: 20px;
                z-index: 50000;
                display: none;
                box-shadow: 0 0 40px rgba(0, 0, 0, 0.9), inset 0 0 20px rgba(101, 67, 33, 0.4);
                backdrop-filter: blur(2px);
                transition: all 0.4s ease;
                transform: scale(0.7);
                opacity: 0;
                border-style: ridge;
                border-width: 10px;
            `;

            // Create bookmark tabs container (on the left edge)
            const bookmarkTabs = document.createElement('div');
            bookmarkTabs.style.cssText = `
                position: absolute;
                left: -40px;
                top: 150px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                z-index: 1001;
            `;

            // Map bookmark tab (active)
            const mapTab = document.createElement('div');
            mapTab.className = 'bookmark-tab active';
            mapTab.title = 'World Map (M)';
            mapTab.style.cssText = `
                width: 40px;
                height: 80px;
                background: linear-gradient(90deg, #D4AF37, #F4E4A6);
                border: 3px solid #654321;
                border-right: none;
                border-radius: 8px 0 0 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: default;
                font-size: 24px;
                box-shadow: -2px 2px 8px rgba(0, 0, 0, 0.5), inset 0 0 10px rgba(212, 175, 55, 0.5);
            `;
            mapTab.textContent = '🗺️';

            // Codex bookmark tab
            const codexTab = document.createElement('div');
            codexTab.className = 'bookmark-tab';
            codexTab.title = 'Companion Codex (C)';
            codexTab.style.cssText = `
                width: 40px;
                height: 80px;
                background: linear-gradient(90deg, #8B4513, #A0522D);
                border: 3px solid #654321;
                border-right: none;
                border-radius: 8px 0 0 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 24px;
                transition: all 0.2s ease;
                box-shadow: -2px 2px 8px rgba(0, 0, 0, 0.5);
            `;
            codexTab.textContent = '📘';

            codexTab.addEventListener('mouseover', () => {
                codexTab.style.left = '5px';
                codexTab.style.background = 'linear-gradient(90deg, #A0522D, #CD853F)';
            });

            codexTab.addEventListener('mouseout', () => {
                codexTab.style.left = '0';
                codexTab.style.background = 'linear-gradient(90deg, #8B4513, #A0522D)';
            });

            codexTab.addEventListener('click', () => {
                this.closeWorldMap(false); // Don't re-engage pointer lock, we're switching tabs
                // Open companion codex
                if (this.companionCodex) {
                    setTimeout(() => this.companionCodex.show(), 100);
                }
            });

            bookmarkTabs.appendChild(mapTab);
            bookmarkTabs.appendChild(codexTab);
            this.worldMapModal.appendChild(bookmarkTabs);

            // Create book layout container
            const bookContainer = document.createElement('div');
            bookContainer.style.cssText = `
                width: 100%;
                height: calc(100% - 80px);
                display: flex;
                padding: 20px;
                gap: 20px;
            `;

            // Left page - Pin Management
            const leftPage = document.createElement('div');
            leftPage.style.cssText = `
                width: 48%;
                height: 100%;
                background: linear-gradient(45deg, #F5E6D3, #E8D5B7);
                border: 3px solid #8B4513;
                border-radius: 15px 5px 5px 15px;
                padding: 20px;
                box-shadow: inset 2px 0 10px rgba(139, 69, 19, 0.3);
                overflow-y: auto;
            `;

            // Book spine separator
            const bookSpine = document.createElement('div');
            bookSpine.style.cssText = `
                width: 4%;
                height: 100%;
                background: linear-gradient(180deg, #654321, #8B4513, #654321);
                border-radius: 5px;
                box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
            `;

            // Add decorative spine elements
            for (let i = 0; i < 5; i++) {
                const spineDecor = document.createElement('div');
                spineDecor.style.cssText = `
                    width: 60%;
                    height: 3px;
                    background: #8B4513;
                    margin: 20px 0;
                    border-radius: 2px;
                `;
                bookSpine.appendChild(spineDecor);
            }

            // Right page - World Map
            const rightPage = document.createElement('div');
            rightPage.style.cssText = `
                width: 48%;
                height: 100%;
                background: linear-gradient(45deg, #F5E6D3, #E8D5B7);
                border: 3px solid #8B4513;
                border-radius: 5px 15px 15px 5px;
                padding: 20px;
                box-shadow: inset -2px 0 10px rgba(139, 69, 19, 0.3);
                position: relative;
            `;

            // World map canvas (right page)
            const worldMapCanvas = document.createElement('canvas');
            worldMapCanvas.id = 'worldMapCanvas';
            worldMapCanvas.style.cssText = `
                width: 100%;
                height: 100%;
                display: block;
                background: transparent;
                border-radius: 8px;
                cursor: crosshair;
            `;

            // Create pin management interface (left page content)
            this.createPinManagementInterface(leftPage);

            // Header with title and close button
            const header = document.createElement('div');
            header.style.cssText = `
                height: 60px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0 30px;
                border-bottom: 4px solid #654321;
                background: linear-gradient(180deg, rgba(139, 90, 43, 0.9), rgba(101, 67, 33, 0.9));
                border-radius: 15px 15px 0 0;
                box-shadow: inset 0 -3px 6px rgba(0, 0, 0, 0.4);
            `;

            const title = document.createElement('h1');
            title.textContent = '📖 Explorer\'s Journal - Charted Territories & Waypoints';
            title.style.cssText = `
                color: #2F1B14;
                margin: 0;
                font-family: 'Georgia', serif;
                font-size: 24px;
                text-shadow: 2px 2px 3px rgba(245, 230, 211, 0.8);
                font-weight: bold;
                letter-spacing: 1.5px;
                text-align: center;
                flex: 1;
            `;

            const closeBtn = document.createElement('button');
            closeBtn.textContent = '📚 Close Journal';
            closeBtn.style.cssText = `
                background: linear-gradient(135deg, #8B4513, #A0522D);
                color: #F5E6D3;
                border: 3px solid #654321;
                border-radius: 10px;
                padding: 10px 20px;
                cursor: pointer;
                font-size: 16px;
                font-weight: bold;
                font-family: 'Georgia', serif;
                transition: all 0.3s;
                box-shadow: 0 3px 6px rgba(0, 0, 0, 0.4);
            `;
            closeBtn.onmouseover = () => {
                closeBtn.style.background = 'linear-gradient(135deg, #A0522D, #CD853F)';
                closeBtn.style.transform = 'translateY(-2px)';
                closeBtn.style.boxShadow = '0 5px 10px rgba(0, 0, 0, 0.4)';
            };
            closeBtn.onmouseout = () => {
                closeBtn.style.background = 'linear-gradient(135deg, #8B4513, #A0522D)';
                closeBtn.style.transform = 'translateY(0)';
                closeBtn.style.boxShadow = '0 3px 6px rgba(0, 0, 0, 0.4)';
            };
            closeBtn.onclick = () => this.closeWorldMap();

            header.appendChild(title);
            header.appendChild(closeBtn);

            // Assemble the book
            bookContainer.appendChild(leftPage);
            bookContainer.appendChild(bookSpine);
            bookContainer.appendChild(rightPage);
            rightPage.appendChild(worldMapCanvas);

            this.worldMapModal.appendChild(header);
            this.worldMapModal.appendChild(bookContainer);

            // Add to DOM (must be document.body for proper z-index stacking)
            document.body.appendChild(this.worldMapModal);

            // Add click handler for pin placement on world map
            worldMapCanvas.addEventListener('click', (e) => this.handleMapClick(e));
        };

        // 📍 Create pin management interface for left page
        this.createPinManagementInterface = (leftPage) => {
            // Pin management title
            const pinTitle = document.createElement('h3');
            pinTitle.textContent = '📍 Waypoint Markers';
            pinTitle.style.cssText = `
                color: #2F1B14;
                font-family: 'Georgia', serif;
                font-size: 20px;
                margin: 0 0 20px 0;
                text-align: center;
                border-bottom: 2px solid #8B4513;
                padding-bottom: 10px;
            `;

            // Pin creation section
            const createPinSection = document.createElement('div');
            createPinSection.style.cssText = `
                background: rgba(139, 69, 19, 0.1);
                border: 2px solid #8B4513;
                border-radius: 10px;
                padding: 15px;
                margin-bottom: 20px;
            `;

            const createTitle = document.createElement('h4');
            createTitle.textContent = '✨ Create New Waypoint';
            createTitle.style.cssText = `
                color: #654321;
                font-family: 'Georgia', serif;
                margin: 0 0 15px 0;
                font-size: 16px;
            `;

            // Pin name input
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.placeholder = 'Waypoint name...';
            nameInput.style.cssText = `
                width: 100%;
                padding: 8px;
                border: 2px solid #8B4513;
                border-radius: 5px;
                font-family: 'Georgia', serif;
                background: rgb(124, 82, 40);
                margin-bottom: 10px;
                box-sizing: border-box;
            `;

            // Color picker
            const colorSection = document.createElement('div');
            colorSection.style.cssText = `
                display: flex;
                justify-content: space-between;
                margin-bottom: 15px;
                flex-wrap: wrap;
                gap: 5px;
            `;

            const pinColors = ['#FF4444', '#44FF44', '#4444FF', '#FFFF44', '#FF44FF', '#44FFFF', '#FFA500', '#800080'];
            let selectedColor = pinColors[0];

            pinColors.forEach(color => {
                const colorBtn = document.createElement('button');
                colorBtn.style.cssText = `
                    width: 30px;
                    height: 30px;
                    background: ${color};
                    border: 3px solid ${color === selectedColor ? '#2F1B14' : '#8B4513'};
                    border-radius: 50%;
                    cursor: pointer;
                    transition: all 0.2s;
                `;
                colorBtn.onclick = () => {
                    selectedColor = color;
                    colorSection.querySelectorAll('button').forEach(btn => btn.style.border = '3px solid #8B4513');
                    colorBtn.style.border = '3px solid #2F1B14';
                };
                colorSection.appendChild(colorBtn);
            });

            // Instructions
            const instructions = document.createElement('p');
            instructions.textContent = '📌 Click on the map to place your waypoint';
            instructions.style.cssText = `
                color: #654321;
                font-family: 'Georgia', serif;
                font-style: italic;
                margin: 10px 0;
                text-align: center;
                font-size: 14px;
            `;

            // Store references for pin creation
            this.newPinName = nameInput;
            this.newPinColor = () => selectedColor;

            createPinSection.appendChild(createTitle);
            createPinSection.appendChild(nameInput);
            createPinSection.appendChild(colorSection);
            createPinSection.appendChild(instructions);

            // Pin list section
            const pinListSection = document.createElement('div');
            pinListSection.style.cssText = `
                background: rgba(139, 69, 19, 0.05);
                border: 2px solid #8B4513;
                border-radius: 10px;
                padding: 15px;
                max-height: 400px;
                overflow-y: auto;
            `;

            const listTitle = document.createElement('h4');
            listTitle.textContent = '🗂️ Saved Waypoints';
            listTitle.style.cssText = `
                color: #654321;
                font-family: 'Georgia', serif;
                margin: 0 0 15px 0;
                font-size: 16px;
            `;

            const pinList = document.createElement('div');
            pinList.id = 'pinList';
            this.pinListContainer = pinList;

            pinListSection.appendChild(listTitle);
            pinListSection.appendChild(pinList);

            // Assemble left page
            leftPage.appendChild(pinTitle);
            leftPage.appendChild(createPinSection);
            leftPage.appendChild(pinListSection);

            // Populate existing pins
            this.updatePinList();
        };

        // 📍 Update pin list display
        this.updatePinList = () => {
            if (!this.pinListContainer) return;

            this.pinListContainer.innerHTML = '';

            if (this.explorerPins.length === 0) {
                const emptyMsg = document.createElement('p');
                emptyMsg.textContent = '📍 No waypoints yet. Click on the map to create one!';
                emptyMsg.style.cssText = `
                    color: #8B4513;
                    font-family: 'Georgia', serif;
                    font-style: italic;
                    text-align: center;
                    margin: 20px 0;
                `;
                this.pinListContainer.appendChild(emptyMsg);
                return;
            }

            this.explorerPins.forEach((pin, index) => {
                const pinItem = document.createElement('div');
                pinItem.style.cssText = `
                    background: rgba(245, 230, 211, 0.8);
                    border: 2px solid #8B4513;
                    border-radius: 8px;
                    padding: 10px;
                    margin-bottom: 10px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                `;

                const pinInfo = document.createElement('div');
                pinInfo.style.cssText = `
                    display: flex;
                    align-items: center;
                    gap: 10px;
                `;

                const colorDot = document.createElement('div');
                colorDot.style.cssText = `
                    width: 20px;
                    height: 20px;
                    background: ${pin.color};
                    border: 2px solid #654321;
                    border-radius: 50%;
                `;

                const pinText = document.createElement('div');
                pinText.innerHTML = `
                    <strong style="color: #2F1B14; font-family: Georgia;">${pin.name}</strong><br>
                    <small style="color: #654321; font-family: Georgia;">(${Math.floor(pin.x)}, ${Math.floor(pin.z)})</small>
                `;

                const pinActions = document.createElement('div');
                pinActions.style.cssText = 'display: flex; gap: 5px;';

                const navigateBtn = document.createElement('button');
                navigateBtn.textContent = '🧭';
                navigateBtn.title = 'Navigate to this waypoint';
                navigateBtn.style.cssText = `
                    background: #44AA44;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    padding: 5px 8px;
                    cursor: pointer;
                    font-size: 14px;
                `;
                navigateBtn.onclick = () => this.startNavigation(pin);

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '🗑️';
                deleteBtn.title = 'Delete waypoint';
                deleteBtn.style.cssText = `
                    background: #AA4444;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    padding: 5px 8px;
                    cursor: pointer;
                    font-size: 14px;
                `;
                deleteBtn.onclick = () => this.deletePin(index);

                pinInfo.appendChild(colorDot);
                pinInfo.appendChild(pinText);
                pinActions.appendChild(navigateBtn);
                pinActions.appendChild(deleteBtn);
                pinItem.appendChild(pinInfo);
                pinItem.appendChild(pinActions);
                this.pinListContainer.appendChild(pinItem);
            });
        };

        // 📍 Handle map click for pin placement
        this.handleMapClick = (e) => {
            if (!this.newPinName.value.trim()) {
                this.updateStatus('📍 Enter a waypoint name first!', 'warning');
                return;
            }

            const canvas = e.target;
            const rect = canvas.getBoundingClientRect();

            // Scale click coordinates from display size to canvas internal size
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const clickX = (e.clientX - rect.left) * scaleX;
            const clickY = (e.clientY - rect.top) * scaleY;

            // Convert screen coordinates to world coordinates
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const pixelsPerChunk = 6;
            const chunkSize = 8;

            const playerChunkX = Math.floor(this.player.position.x / chunkSize);
            const playerChunkZ = Math.floor(this.player.position.z / chunkSize);

            // Calculate relative pixel offset from center
            const pixelOffsetX = clickX - centerX;
            const pixelOffsetY = clickY - centerY;

            // Convert pixel offset to chunk offset
            const relativeChunkX = Math.round(pixelOffsetX / pixelsPerChunk);
            const relativeChunkZ = Math.round(pixelOffsetY / pixelsPerChunk);

            // Calculate target chunk coordinates
            const targetChunkX = playerChunkX + relativeChunkX;
            const targetChunkZ = playerChunkZ + relativeChunkZ;

            // Convert back to world coordinates (center of target chunk)
            const worldX = targetChunkX * chunkSize + chunkSize / 2;
            const worldZ = targetChunkZ * chunkSize + chunkSize / 2;

            // Create new pin
            const newPin = {
                id: Date.now(),
                name: this.newPinName.value.trim(),
                color: this.newPinColor(),
                x: worldX,
                z: worldZ,
                created: new Date().toISOString()
            };

            this.explorerPins.push(newPin);
            this.savePins();
            this.updatePinList();
            this.renderWorldMap();

            // Clear input
            this.newPinName.value = '';
            this.updateStatus(`📍 Waypoint "${newPin.name}" placed!`, 'success');
        };

        // 📍 Start navigation to pin
        this.startNavigation = (pin) => {
            this.activeNavigation = pin;
            this.updateStatus(`🧭 Navigating to "${pin.name}"`, 'info', false);
            this.closeWorldMap();
        };

        // 📍 Delete pin
        this.deletePin = (index) => {
            const pin = this.explorerPins[index];
            this.explorerPins.splice(index, 1);
            this.savePins();
            this.updatePinList();
            this.renderWorldMap();
            this.updateStatus(`🗑️ Waypoint "${pin.name}" deleted`, 'info');
        };

        // 📍 Save pins (will be handled by main save/load system)
        this.savePins = () => {
            // Pins are now saved as part of game save system, not separate localStorage
            // This function kept for compatibility but doesn't write to localStorage
        };

        /**
         * 🎨 Hide all non-modal UI elements
         * Called when opening modals (backpack, journal, codex, etc.)
         * Provides clean view without obstruction
         */
        this.hideUI = () => {
            // Hotbar
            if (this.hotbarElement) {
                this.hotbarElement.dataset.wasVisible = this.hotbarElement.style.display !== 'none';
                this.hotbarElement.style.display = 'none';
            }

            // Companion portrait
            if (this.companionPortrait?.portraitElement) {
                this.companionPortrait.portraitElement.dataset.wasVisible = 
                    this.companionPortrait.portraitElement.style.display !== 'none';
                this.companionPortrait.portraitElement.style.display = 'none';
            }

            // Mini hunt indicator (if companion is hunting)
            const miniHuntIndicator = document.getElementById('mini-hunt-indicator');
            if (miniHuntIndicator) {
                miniHuntIndicator.dataset.wasVisible = miniHuntIndicator.style.display !== 'none';
                miniHuntIndicator.style.display = 'none';
            }

            // Minimap
            if (this.miniMap) {
                this.miniMap.dataset.wasVisible = this.miniMap.style.display !== 'none';
                this.miniMap.style.display = 'none';
            }

            // Status text (at top of screen)
            if (this.statusElement) {
                this.statusElement.dataset.wasVisible = this.statusElement.style.display !== 'none';
                this.statusElement.style.display = 'none';
            }

            // Stamina bar
            const staminaContainer = document.getElementById('player-stamina');
            if (staminaContainer) {
                staminaContainer.dataset.wasVisible = staminaContainer.style.display !== 'none';
                staminaContainer.style.display = 'none';
            }

            // Hearts (health display)
            const heartsContainer = document.getElementById('hearts-container');
            if (heartsContainer) {
                heartsContainer.dataset.wasVisible = heartsContainer.style.display !== 'none';
                heartsContainer.style.display = 'none';
            }

            // Tool buttons (E, T, K, B buttons)
            const toolButtons = document.querySelectorAll('.tool-button');
            toolButtons.forEach(btn => {
                btn.dataset.wasVisible = btn.style.display !== 'none';
                btn.style.display = 'none';
            });

            console.log('🎨 UI elements hidden for modal view');
        };

        /**
         * 🎨 Show all non-modal UI elements
         * Called when closing modals (restores previous visibility)
         * Does NOT show UI when switching between "bookmarked" modals (journal ↔ codex)
         */
        this.showUI = () => {
            // Hotbar
            if (this.hotbarElement && this.hotbarElement.dataset.wasVisible === 'true') {
                this.hotbarElement.style.display = 'flex';
            }

            // Companion portrait
            if (this.companionPortrait?.portraitElement && 
                this.companionPortrait.portraitElement.dataset.wasVisible === 'true') {
                this.companionPortrait.portraitElement.style.display = 'block';
            }

            // Mini hunt indicator
            const miniHuntIndicator = document.getElementById('mini-hunt-indicator');
            if (miniHuntIndicator && miniHuntIndicator.dataset.wasVisible === 'true') {
                miniHuntIndicator.style.display = 'flex';
            }

            // Minimap
            if (this.miniMap && this.miniMap.dataset.wasVisible === 'true') {
                this.miniMap.style.display = 'block';
            }

            // Status text
            if (this.statusElement && this.statusElement.dataset.wasVisible === 'true') {
                this.statusElement.style.display = 'block';
            }

            // Stamina bar
            const staminaContainer = document.getElementById('player-stamina');
            if (staminaContainer && staminaContainer.dataset.wasVisible === 'true') {
                staminaContainer.style.display = 'block';
            }

            // Hearts container
            const heartsContainer = document.getElementById('hearts-container');
            if (heartsContainer && heartsContainer.dataset.wasVisible === 'true') {
                heartsContainer.style.display = 'flex';
            }

            // Tool buttons
            const toolButtons = document.querySelectorAll('.tool-button');
            toolButtons.forEach(btn => {
                if (btn.dataset.wasVisible === 'true') {
                    btn.style.display = btn.classList.contains('flex') ? 'flex' : 'block';
                }
            });

            console.log('🎨 UI elements restored after modal close');
        };

        // 🗺️ Toggle world map modal
        this.toggleWorldMap = () => {
            if (!this.worldMapModal) {
                this.createWorldMapModal();
            }

            if (this.worldMapModal.style.display === 'none' || !this.worldMapModal.style.display) {
                this.openWorldMap();
            } else {
                this.closeWorldMap();
            }
        };

        // 🗺️ Open world map with animation
        this.openWorldMap = () => {
            // Release pointer lock when opening journal
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }

            // Disable VoxelWorld input controls while journal is open
            this.controlsEnabled = false;
            console.log('🔒 Disabled input controls for Explorer\'s Journal');

            this.worldMapModal.style.display = 'block';
            // Trigger animation
            setTimeout(() => {
                this.worldMapModal.style.transform = 'scale(1)';
                this.worldMapModal.style.opacity = '1';
            }, 10);

            // Render the world map
            this.renderWorldMap();
            console.log('🗺️ World map opened - showing explored regions');
        };

        // 🗺️ Close world map with animation
        this.closeWorldMap = (reEngagePointerLock = true) => {
            this.worldMapModal.style.transform = 'scale(0.8)';
            this.worldMapModal.style.opacity = '0';
            setTimeout(() => {
                this.worldMapModal.style.display = 'none';

                // Re-enable VoxelWorld input controls when journal closes
                this.controlsEnabled = true;
                console.log('✅ Re-enabled input controls after closing Explorer\'s Journal');

                // Only re-request pointer lock if closing completely (not switching tabs)
                if (reEngagePointerLock && this.controlsEnabled) {
                    setTimeout(() => {
                        this.renderer.domElement.requestPointerLock();
                    }, 100);
                }
            }, 300);
            console.log('🗺️ World map closed');
        };

        // 📊 Toggle FPS counter visibility
        this.toggleFPS = () => {
            this.statsEnabled = !this.statsEnabled;
            this.stats.dom.style.display = this.statsEnabled ? 'block' : 'none';
            console.log(`📊 FPS Counter: ${this.statsEnabled ? 'ON' : 'OFF'}`);
            return this.statsEnabled;
        };

        // 🧭 Open compass target selector modal
        this.openCompassTargetSelector = (compassType, compassSlot) => {
            // Check if compass is already locked
            const isUpgrade = compassType === 'compass_upgrade';
            const compassMetadata = compassSlot.metadata || {};
            const currentTarget = compassMetadata.lockedTarget;

            if (currentTarget && !isUpgrade) {
                // Basic compass is locked - show current target
                this.updateStatus(`🧭 Compass locked to: ${currentTarget}`, 'info');
                console.log(`🧭 Compass already tracking: ${currentTarget}`);
                return;
            }

            // Release pointer lock
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }

            // Disable controls
            this.controlsEnabled = false;

            // Create modal
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 50000;
            `;

            const panel = document.createElement('div');
            panel.style.cssText = `
                background: #2a1810;
                border: 3px solid #8B4513;
                border-radius: 12px;
                padding: 20px;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            `;

            const title = document.createElement('h2');
            title.textContent = isUpgrade ? '🧭 Crystal Compass - Select Target' : '🧭 Compass - Select Target (Permanent)';
            title.style.cssText = `
                color: #FFD700;
                text-align: center;
                margin-bottom: 10px;
            `;

            const subtitle = document.createElement('p');
            subtitle.textContent = isUpgrade ? 'You can change this target anytime' : 'Warning: This choice is permanent!';
            subtitle.style.cssText = `
                color: ${isUpgrade ? '#90EE90' : '#FF6B6B'};
                text-align: center;
                margin-bottom: 20px;
                font-style: italic;
            `;

            const itemGrid = document.createElement('div');
            itemGrid.style.cssText = `
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                gap: 10px;
                margin-bottom: 20px;
            `;

            // Define trackable items (exploring collectibles)
            const trackableItems = [
                // Trees
                { type: 'oak_tree', name: 'Oak Tree', emoji: '🌳' },
                { type: 'pine_tree', name: 'Pine Tree', emoji: '🌲' },
                { type: 'palm_tree', name: 'Palm Tree', emoji: '🌴' },
                { type: 'birch_tree', name: 'Birch Tree', emoji: '🌿' },
                { type: 'dead_tree', name: 'Dead Tree', emoji: '💀' },
                { type: 'pumpkin', name: 'Pumpkin', emoji: '🎃' },

                // Desert items
                { type: 'skull', name: 'Skull', emoji: '💀' },

                // Forest items
                { type: 'mushroom', name: 'Mushroom', emoji: '🍄' },
                { type: 'flower', name: 'Flower', emoji: '🌸' },
                { type: 'berry', name: 'Berry', emoji: '🍓' },

                // Mountain items
                { type: 'crystal', name: 'Crystal', emoji: '💎' },
                { type: 'oreNugget', name: 'Ore Nugget', emoji: '⛰️' },

                // Plains items
                { type: 'wheat', name: 'Wheat', emoji: '🌾' },
                { type: 'feather', name: 'Feather', emoji: '🪶' },
                { type: 'bone', name: 'Bone', emoji: '🦴' },

                // Tundra items
                { type: 'shell', name: 'Shell', emoji: '🐚' },
                { type: 'fur', name: 'Fur', emoji: '🐻‍❄️' },
                { type: 'iceShard', name: 'Ice Shard', emoji: '❄️' },

                // Rare equipment
                { type: 'rustySword', name: 'Rusty Sword', emoji: '⚔️' },
                { type: 'oldPickaxe', name: 'Old Pickaxe', emoji: '⛏️' },
                { type: 'ancientAmulet', name: 'Ancient Amulet', emoji: '📿' }
            ];

            trackableItems.forEach(item => {
                const itemBtn = document.createElement('button');
                const icon = this.getItemIcon(item.type, 'hotbar');
                // Use innerHTML if icon contains HTML (img tag), otherwise textContent
                if (icon.includes('<img')) {
                    itemBtn.innerHTML = icon;
                } else {
                    itemBtn.textContent = icon;
                }
                itemBtn.title = item.name;
                itemBtn.style.cssText = `
                    background: #3a2810;
                    border: 2px solid #8B4513;
                    border-radius: 8px;
                    padding: 20px;
                    font-size: 32px;
                    cursor: pointer;
                    transition: all 0.2s;
                `;
                itemBtn.onmouseover = () => {
                    itemBtn.style.background = '#4a3820';
                    itemBtn.style.transform = 'scale(1.1)';
                };
                itemBtn.onmouseout = () => {
                    itemBtn.style.background = '#3a2810';
                    itemBtn.style.transform = 'scale(1)';
                };
                itemBtn.onclick = () => {
                    this.setCompassTarget(compassSlot, item.type, item.name);
                    document.body.removeChild(modal);
                    this.controlsEnabled = true;
                    setTimeout(() => {
                        this.renderer.domElement.requestPointerLock();
                    }, 100);
                };
                itemGrid.appendChild(itemBtn);
            });

            const closeBtn = document.createElement('button');
            closeBtn.textContent = 'Cancel';
            closeBtn.style.cssText = `
                background: #8B4513;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 10px 20px;
                font-size: 16px;
                cursor: pointer;
                display: block;
                margin: 0 auto;
            `;
            closeBtn.onclick = () => {
                document.body.removeChild(modal);
                this.controlsEnabled = true;
                setTimeout(() => {
                    this.renderer.domElement.requestPointerLock();
                }, 100);
            };

            panel.appendChild(title);
            panel.appendChild(subtitle);
            panel.appendChild(itemGrid);
            panel.appendChild(closeBtn);
            modal.appendChild(panel);
            document.body.appendChild(modal);
        };

        // 🧭 Set compass target
        this.setCompassTarget = (compassSlot, targetType, targetName) => {
            if (!compassSlot.metadata) {
                compassSlot.metadata = {};
            }
            compassSlot.metadata.lockedTarget = targetType;
            compassSlot.metadata.targetName = targetName;

            // Check if any targets exist
            const nearest = this.findNearestTarget(targetType);
            if (!nearest) {
                this.updateStatus(`🧭 Compass set to ${targetName}, but you have not passed by any yet`, 'info');
            } else {
                const distance = Math.floor(nearest.distance);
                this.updateStatus(`🧭 Compass locked to ${targetName} (${distance}m away)`, 'discovery');
            }
            console.log(`🧭 Compass locked to target: ${targetType}`);
        };

        // 🔍 Find nearest target of specified type
        this.findNearestTarget = (targetType) => {
            const playerX = this.player.position.x;
            const playerZ = this.player.position.z;
            let nearest = null;
            let minDistance = Infinity;

            // Search different tracking arrays based on target type
            if (targetType === 'pumpkin') {
                this.pumpkinPositions.forEach(pos => {
                    const dist = Math.sqrt(
                        Math.pow(pos.x - playerX, 2) +
                        Math.pow(pos.z - playerZ, 2)
                    );
                    if (dist < minDistance) {
                        minDistance = dist;
                        nearest = { ...pos, distance: dist };
                    }
                });
            } else if (targetType.includes('_tree')) {
                // Tree types: oak_tree, pine_tree, etc.
                const treeType = targetType.replace('_tree', ''); // oak, pine, palm, birch, dead
                this.treePositions.forEach(tree => {
                    if (tree.type === treeType) {
                        const dist = Math.sqrt(
                            Math.pow(tree.x - playerX, 2) +
                            Math.pow(tree.z - playerZ, 2)
                        );
                        if (dist < minDistance) {
                            minDistance = dist;
                            nearest = { ...tree, distance: dist };
                        }
                    }
                });
            } else {
                // World items (collectibles)
                this.worldItemPositions.forEach(item => {
                    if (item.itemType === targetType) {
                        const dist = Math.sqrt(
                            Math.pow(item.x - playerX, 2) +
                            Math.pow(item.z - playerZ, 2)
                        );
                        if (dist < minDistance) {
                            minDistance = dist;
                            nearest = { ...item, distance: dist };
                        }
                    }
                });
            }

            return nearest;
        };

        // 🗺️ Render the full world map showing explored chunks
        this.renderWorldMap = () => {
            const canvas = document.getElementById('worldMapCanvas');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');

            // Set canvas size to match display size
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;

            const mapSize = Math.min(canvas.width, canvas.height) - 40; // Leave margin
            const chunkSize = 8; // Each chunk is 8x8 blocks
            const pixelsPerChunk = 6; // Each chunk is 6x6 pixels on the map for better visibility

            // Create aged paper background effect
            const gradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, Math.max(canvas.width, canvas.height));
            gradient.addColorStop(0, '#F5E6D3');
            gradient.addColorStop(0.7, '#E8D5B7');
            gradient.addColorStop(1, '#D2B48C');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Add subtle paper texture with random spots
            ctx.fillStyle = 'rgba(139, 69, 19, 0.05)';
            for (let i = 0; i < 200; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const size = Math.random() * 3 + 1;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw explorer's grid - faded and irregular
            ctx.strokeStyle = 'rgba(139, 69, 19, 0.2)';
            ctx.lineWidth = 0.5;
            const gridSpacing = pixelsPerChunk * 2;
            for (let x = 30; x < canvas.width - 30; x += gridSpacing) {
                ctx.beginPath();
                ctx.moveTo(x + (Math.random() - 0.5) * 2, 30);
                ctx.lineTo(x + (Math.random() - 0.5) * 2, canvas.height - 30);
                ctx.stroke();
            }
            for (let y = 30; y < canvas.height - 30; y += gridSpacing) {
                ctx.beginPath();
                ctx.moveTo(30, y + (Math.random() - 0.5) * 2);
                ctx.lineTo(canvas.width - 30, y + (Math.random() - 0.5) * 2);
                ctx.stroke();
            }

            // Add compass rose in top-right corner
            const compassX = canvas.width - 80;
            const compassY = 60;
            const compassRadius = 25;

            // Compass background
            ctx.fillStyle = 'rgba(139, 69, 19, 0.3)';
            ctx.beginPath();
            ctx.arc(compassX, compassY, compassRadius + 5, 0, Math.PI * 2);
            ctx.fill();

            // Compass directions
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 2;
            ctx.font = 'bold 12px Georgia';
            ctx.fillStyle = '#654321';
            ctx.textAlign = 'center';

            // N, S, E, W markers
            ctx.fillText('N', compassX, compassY - compassRadius + 5);
            ctx.fillText('S', compassX, compassY + compassRadius - 5);
            ctx.fillText('E', compassX + compassRadius - 5, compassY + 3);
            ctx.fillText('W', compassX - compassRadius + 5, compassY + 3);

            // Compass circle
            ctx.beginPath();
            ctx.arc(compassX, compassY, compassRadius, 0, Math.PI * 2);
            ctx.stroke();

            // Calculate map center and bounds
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const playerChunkX = Math.floor(this.player.position.x / chunkSize);
            const playerChunkZ = Math.floor(this.player.position.z / chunkSize);

            // Draw explored chunks with hand-drawn style
            this.exploredChunks.forEach(chunkKey => {
                const [chunkX, chunkZ] = chunkKey.split(',').map(Number);

                // Calculate position relative to player
                const relativeX = chunkX - playerChunkX;
                const relativeZ = chunkZ - playerChunkZ;

                // Convert to screen coordinates
                const screenX = centerX + (relativeX * pixelsPerChunk);
                const screenY = centerY + (relativeZ * pixelsPerChunk);

                // Only draw if within canvas bounds
                if (screenX >= 30 && screenX < canvas.width - 30 &&
                    screenY >= 30 && screenY < canvas.height - 30) {

                    // Get biome color for this chunk
                    const worldX = chunkX * chunkSize + chunkSize/2;
                    const worldZ = chunkZ * chunkSize + chunkSize/2;
                    const biome = this.biomeWorldGen.getBiomeAt(worldX, worldZ, this.worldSeed);

                    // Make colors more muted and map-like
                    let mapColor = biome.mapColor;
                    if (biome.name === 'forest') mapColor = '#2F5233';
                    else if (biome.name === 'desert') mapColor = '#D2B48C';
                    else if (biome.name === 'mountain') mapColor = '#696969';
                    else if (biome.name === 'plains') mapColor = '#9ACD32';
                    else if (biome.name === 'tundra') mapColor = '#F0F8FF';

                    ctx.fillStyle = mapColor;

                    // Draw slightly irregular shapes for organic look
                    const jitter = 1;
                    ctx.fillRect(
                        screenX + (Math.random() - 0.5) * jitter,
                        screenY + (Math.random() - 0.5) * jitter,
                        pixelsPerChunk + (Math.random() - 0.5) * jitter,
                        pixelsPerChunk + (Math.random() - 0.5) * jitter
                    );

                    // Add subtle border for definition
                    ctx.strokeStyle = 'rgba(101, 67, 33, 0.3)';
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(screenX, screenY, pixelsPerChunk, pixelsPerChunk);
                }
            });

            // Draw backpack position if not collected with treasure map style
            if (this.backpackPosition && !this.hasBackpack) {
                const backpackChunkX = Math.floor(this.backpackPosition.x / chunkSize);
                const backpackChunkZ = Math.floor(this.backpackPosition.z / chunkSize);
                const relativeX = backpackChunkX - playerChunkX;
                const relativeZ = backpackChunkZ - playerChunkZ;
                const screenX = centerX + (relativeX * pixelsPerChunk);
                const screenY = centerY + (relativeZ * pixelsPerChunk);

                // Draw treasure X mark
                ctx.strokeStyle = '#B22222';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(screenX - 4, screenY - 4);
                ctx.lineTo(screenX + pixelsPerChunk + 4, screenY + pixelsPerChunk + 4);
                ctx.moveTo(screenX + pixelsPerChunk + 4, screenY - 4);
                ctx.lineTo(screenX - 4, screenY + pixelsPerChunk + 4);
                ctx.stroke();

                // Add treasure label
                ctx.font = 'bold 10px Georgia';
                ctx.fillStyle = '#B22222';
                ctx.textAlign = 'center';
                ctx.fillText('⚔️', screenX + pixelsPerChunk/2, screenY - 8);
            }

            // Draw trees with forest symbols
            this.treePositions.forEach(tree => {
                const treeChunkX = Math.floor(tree.x / chunkSize);
                const treeChunkZ = Math.floor(tree.z / chunkSize);
                const relativeX = treeChunkX - playerChunkX;
                const relativeZ = treeChunkZ - playerChunkZ;
                const screenX = centerX + (relativeX * pixelsPerChunk);
                const screenY = centerY + (relativeZ * pixelsPerChunk);

                if (screenX >= 30 && screenX < canvas.width - 30 &&
                    screenY >= 30 && screenY < canvas.height - 30) {
                    // Draw tree symbol
                    ctx.font = '8px Georgia';
                    ctx.fillStyle = '#228B22';
                    ctx.textAlign = 'center';
                    ctx.fillText('🌲', screenX + pixelsPerChunk/2, screenY + pixelsPerChunk/2 + 3);
                }
            });

            // Draw explorer pins/waypoints
            if (this.explorerPins && this.explorerPins.length > 0) {
                this.explorerPins.forEach(pin => {
                    const pinChunkX = Math.floor(pin.x / chunkSize);
                    const pinChunkZ = Math.floor(pin.z / chunkSize);
                    const relativeX = pinChunkX - playerChunkX;
                    const relativeZ = pinChunkZ - playerChunkZ;
                    const screenX = centerX + (relativeX * pixelsPerChunk);
                    const screenY = centerY + (relativeZ * pixelsPerChunk);

                    if (screenX >= 30 && screenX < canvas.width - 30 &&
                        screenY >= 30 && screenY < canvas.height - 30) {

                        // Draw pin marker
                        ctx.fillStyle = pin.color;
                        ctx.strokeStyle = '#2F1B14';
                        ctx.lineWidth = 2;

                        // Pin shape
                        ctx.beginPath();
                        ctx.arc(screenX + pixelsPerChunk/2, screenY + pixelsPerChunk/2, 8, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();

                        // Pin name label
                        ctx.font = 'bold 10px Georgia';
                        ctx.fillStyle = '#2F1B14';
                        ctx.textAlign = 'center';
                        ctx.fillText(pin.name, screenX + pixelsPerChunk/2, screenY - 8);

                        // Navigation indicator if this pin is active
                        if (this.activeNavigation && this.activeNavigation.id === pin.id) {
                            ctx.strokeStyle = '#FFD700';
                            ctx.lineWidth = 3;
                            ctx.beginPath();
                            ctx.arc(screenX + pixelsPerChunk/2, screenY + pixelsPerChunk/2, 12, 0, Math.PI * 2);
                            ctx.stroke();

                            // Pulsing effect for active navigation
                            const pulseRadius = 15 + Math.sin(Date.now() / 200) * 3;
                            ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
                            ctx.lineWidth = 2;
                            ctx.beginPath();
                            ctx.arc(screenX + pixelsPerChunk/2, screenY + pixelsPerChunk/2, pulseRadius, 0, Math.PI * 2);
                            ctx.stroke();
                        }
                    }
                });
            }

            // Draw player position as explorer marker
            ctx.fillStyle = '#B22222';
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 2;

            // Draw explorer icon
            ctx.beginPath();
            ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Player direction indicator - explorer's bearing
            ctx.strokeStyle = '#654321';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(
                centerX + Math.sin(this.player.rotation.y) * 20,
                centerY + Math.cos(this.player.rotation.y) * 20
            );
            ctx.stroke();

            // Add explorer label
            ctx.font = 'bold 10px Georgia';
            ctx.fillStyle = '#2F1B14';
            ctx.textAlign = 'center';
            ctx.fillText('🧭', centerX, centerY - 15);

            // Draw info text in explorer's journal style
            ctx.fillStyle = '#2F1B14';
            ctx.font = 'italic 14px Georgia';
            ctx.textAlign = 'left';

            // Add journal-style annotations
            ctx.fillText(`📍 Regions Charted: ${this.exploredChunks.size}`, 30, canvas.height - 50);
            ctx.fillText(`🗺️ Current Position: (${Math.floor(this.player.position.x)}, ${Math.floor(this.player.position.z)})`, 30, canvas.height - 30);

            // Add date stamp for authenticity
            const date = new Date();
            ctx.font = 'italic 12px Georgia';
            ctx.fillStyle = 'rgba(47, 27, 20, 0.6)';
            ctx.fillText(`Expedition Day: ${date.toLocaleDateString()}`, 30, canvas.height - 10);

            // Add legend in bottom right
            ctx.textAlign = 'right';
            ctx.font = 'italic 11px Georgia';
            ctx.fillStyle = '#654321';
            ctx.fillText('🌲 Forests  ⚔️ Treasure  🧭 Explorer', canvas.width - 30, canvas.height - 30);
            ctx.fillText('🗺️ Press M to close journal', canvas.width - 30, canvas.height - 10);

            // Reset text alignment
            ctx.textAlign = 'left';
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
            const availableMaterials = this.inventory.getAllMaterialsFromSlots();
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

            // 🎮 Use same GPU preference as main renderer (defaults to low-power)
            const gpuPreference = localStorage.getItem('voxelWorld_gpuPreference') || 'low-power';

            this.workbenchRenderer = new THREE.WebGLRenderer({
                antialias: true,
                powerPreference: gpuPreference // 🎮 User-selected GPU preference
            });
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
            const availableCount = this.inventory.countItemInSlots(this.selectedMaterial);
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
            this.inventory.removeFromInventory(this.selectedMaterial, 1);

            // Create the object (placeholder for now)
            const objectName = `${this.selectedMaterial}_${this.selectedShape}`;

            // Add crafted object to inventory
            this.inventory.addToInventory(objectName, 1);

            // Update all displays
            this.updateHotbarCounts();
            this.updateBackpackInventoryDisplay();

            // Use enhanced notification system with craft type
            const craftedEmoji = this.getItemIcon(objectName, 'status');
            this.updateStatus(`${craftedEmoji} Created ${objectName}! Added to inventory.`, 'craft');

            // TODO: Later we'll implement actual 3D object creation and placement
        };

        // Start workbench preview rendering loop
        // 🎯 PHASE 1.3: Physics objects synchronization method
        this.updatePhysicsObjects = () => {
            // Sync Three.js objects with their Cannon.js physics bodies
            for (const [threeObject, cannonBody] of this.physicsObjects) {
                // Update Three.js object position from physics body
                threeObject.position.copy(cannonBody.position);
                threeObject.quaternion.copy(cannonBody.quaternion);
            }
        };

        // 🔥 Add visual effects to crafted objects (fire, glow, particles)
        this.addCraftedObjectEffects = (craftedObject, effects, x, y, z) => {
            console.log(`🔥 Adding effects to crafted object:`, effects);

            if (!craftedObject.userData.effectObjects) {
                craftedObject.userData.effectObjects = [];
            }

            // Get dimensions for scaling effects
            const dimensions = craftedObject.userData.metadata?.shape?.dimensions || { height: 1, length: 1, width: 1 };
            const heightScale = dimensions.height || 1;
            const sizeScale = Math.max(dimensions.length, dimensions.width) || 1;
            
            console.log(`📏 Scaling effects: height=${heightScale}, size=${sizeScale}`);

            effects.forEach(effectType => {
                if (effectType === 'fire') {
                    // Create fire particle system using Sprites (THREE.Points causes r180 shader bugs)
                    console.log(`🔥 Creating fire particle effect using Sprites (scaled by ${heightScale}x)`);

                    // Scale particle count with size (more particles for bigger fires)
                    const particleCount = Math.floor(20 * sizeScale);
                    const fireSprites = [];
                    const velocities = [];

                    // Scale spread and velocity with dimensions
                    const spreadScale = sizeScale * 0.3;
                    const velocityScale = heightScale * 0.05;

                    // Create individual sprite particles
                    for (let i = 0; i < particleCount; i++) {
                        // Create sprite material with fire colors
                        const spriteMaterial = new THREE.SpriteMaterial({
                            color: 0xff8844,
                            transparent: true,
                            opacity: 0.8,
                            blending: THREE.AdditiveBlending,
                            depthWrite: false
                        });

                        const sprite = new THREE.Sprite(spriteMaterial);
                        sprite.scale.set(0.15 * sizeScale, 0.15 * sizeScale, 0.15 * sizeScale);

                        // Position sprite at base with spread
                        sprite.position.set(
                            x + (Math.random() - 0.5) * spreadScale,
                            y,
                            z + (Math.random() - 0.5) * spreadScale
                        );

                        this.scene.add(sprite);
                        fireSprites.push(sprite);

                        // Store velocity for animation
                        velocities.push({
                            x: (Math.random() - 0.5) * 0.02,
                            y: Math.random() * velocityScale + velocityScale, // Higher velocity for taller fires
                            z: (Math.random() - 0.5) * 0.02
                        });
                    }

                    craftedObject.userData.effectObjects.push({
                        type: 'particles',
                        sprites: fireSprites, // Array of sprite objects
                        velocities: velocities,
                        maxHeight: heightScale * 1.5, // Particles rise higher for taller fires
                        baseY: y // Store base position for respawn
                    });

                    console.log(`🔥 Added ${particleCount} fire sprite particles at (${x}, ${y}, ${z}), max height: ${heightScale * 1.5}`);
                }

                if (effectType === 'holy' || effectType === 'glow') {
                    // Create glowing point light - scale intensity and distance with size
                    const intensity = 1.5 * Math.pow(sizeScale, 0.7); // Intensity scales with size (but not linearly)
                    const distance = 10 * sizeScale; // Bigger fires light up more area
                    
                    const light = new THREE.PointLight(0xffe599, intensity, distance, 2);
                    light.position.set(x, y + (heightScale * 0.5), z); // Position at middle of fire height
                    
                    // 🔧 FIX: Ensure light matrix is properly initialized
                    light.matrixAutoUpdate = true;
                    light.updateMatrix();
                    light.updateMatrixWorld(true);
                    
                    this.scene.add(light);

                    craftedObject.userData.effectObjects.push({
                        type: 'light',
                        object: light,
                        baseIntensity: intensity // Store base intensity for flickering
                    });

                    console.log(`✨ Added glow light at (${x}, ${y}, ${z}) - intensity: ${intensity.toFixed(2)}, distance: ${distance.toFixed(1)}`);
                }
            });
        };

        // 🎯 PHASE 2.1: Create physics body for crafted objects
        this.createPhysicsBodyForCraftedObject = (threeObject, shapeType, dimensions, materialType) => {
            console.log(`🔧 Creating physics body for ${shapeType} with dimensions:`, dimensions);

            // 🎯 PHASE 2.2: Hollow space detection for doors/windows
            if (this.hasHollowSpaces(shapeType)) {
                console.log(`🚪 Detected hollow spaces in ${shapeType} - creating complex collision`);
                this.createHollowPhysicsBody(threeObject, shapeType, dimensions, materialType);
                return;
            }

            let cannonShape;

            // Create appropriate physics shape based on object type
            switch (shapeType) {
                case 'cube':
                    cannonShape = new CANNON.Box(new CANNON.Vec3(
                        dimensions.length / 2,
                        dimensions.height / 2,
                        dimensions.width / 2
                    ));
                    break;
                case 'sphere':
                    const radius = Math.max(dimensions.length, dimensions.width, dimensions.height) / 2;
                    cannonShape = new CANNON.Sphere(radius);
                    break;
                case 'cylinder':
                    cannonShape = new CANNON.Cylinder(
                        dimensions.width / 2,  // radiusTop
                        dimensions.width / 2,  // radiusBottom
                        dimensions.height,     // height
                        8                      // numSegments
                    );
                    break;
                default:
                    // Default to box shape for complex shapes
                    cannonShape = new CANNON.Box(new CANNON.Vec3(
                        dimensions.length / 2,
                        dimensions.height / 2,
                        dimensions.width / 2
                    ));
                    break;
            }

            // Create physics body
            const cannonBody = new CANNON.Body({
                mass: 0, // Static body (won't fall or move)
                shape: cannonShape,
                position: new CANNON.Vec3(threeObject.position.x, threeObject.position.y, threeObject.position.z),
                material: this.physicsMaterials[materialType] || this.physicsMaterials.wood
            });

            // Add to physics world and tracking
            this.physicsWorld.addBody(cannonBody);
            this.physicsObjects.set(threeObject, cannonBody);

            console.log(`✅ Physics body created for crafted object at (${threeObject.position.x}, ${threeObject.position.y}, ${threeObject.position.z})`);
        };

        // 🎯 PHASE 2.2: Check if shape has hollow spaces that players can walk through
        this.hasHollowSpaces = (shapeType) => {
            const hollowShapes = ['hollow_cube', 'door', 'window', 'archway', 'simple_house'];
            return hollowShapes.includes(shapeType);
        };

        // 🎯 PHASE 2.2: Create complex physics body for hollow objects
        this.createHollowPhysicsBody = (threeObject, shapeType, dimensions, materialType) => {
            console.log(`🏗️ Creating hollow physics body for ${shapeType}`);

            const cannonBodies = [];
            const material = this.physicsMaterials[materialType] || this.physicsMaterials.wood;

            switch (shapeType) {
                case 'hollow_cube':
                    // Create 6 walls for a hollow cube (minus one face for entrance)
                    const wallThickness = 0.2;
                    const halfLength = dimensions.length / 2;
                    const halfHeight = dimensions.height / 2;
                    const halfWidth = dimensions.width / 2;

                    // Front wall (with opening)
                    // Left side of opening
                    const leftWall = new CANNON.Body({
                        mass: 0,
                        shape: new CANNON.Box(new CANNON.Vec3(wallThickness / 2, halfHeight, halfWidth)),
                        position: new CANNON.Vec3(
                            threeObject.position.x - halfLength + wallThickness / 2,
                            threeObject.position.y,
                            threeObject.position.z
                        ),
                        material: material
                    });
                    cannonBodies.push(leftWall);

                    // Right side of opening
                    const rightWall = new CANNON.Body({
                        mass: 0,
                        shape: new CANNON.Box(new CANNON.Vec3(wallThickness / 2, halfHeight, halfWidth)),
                        position: new CANNON.Vec3(
                            threeObject.position.x + halfLength - wallThickness / 2,
                            threeObject.position.y,
                            threeObject.position.z
                        ),
                        material: material
                    });
                    cannonBodies.push(rightWall);

                    // Top wall
                    const topWall = new CANNON.Body({
                        mass: 0,
                        shape: new CANNON.Box(new CANNON.Vec3(halfLength, wallThickness / 2, halfWidth)),
                        position: new CANNON.Vec3(
                            threeObject.position.x,
                            threeObject.position.y + halfHeight - wallThickness / 2,
                            threeObject.position.z
                        ),
                        material: material
                    });
                    cannonBodies.push(topWall);

                    // Bottom wall (floor)
                    const bottomWall = new CANNON.Body({
                        mass: 0,
                        shape: new CANNON.Box(new CANNON.Vec3(halfLength, wallThickness / 2, halfWidth)),
                        position: new CANNON.Vec3(
                            threeObject.position.x,
                            threeObject.position.y - halfHeight + wallThickness / 2,
                            threeObject.position.z
                        ),
                        material: material
                    });
                    cannonBodies.push(bottomWall);
                    break;

                case 'simple_house':
                    // Create house walls with door opening
                    const houseWallThickness = 0.3;
                    const houseHalfLength = dimensions.length / 2;
                    const houseHalfHeight = dimensions.height / 2;
                    const houseHalfWidth = dimensions.width / 2;

                    // Four walls with door opening in front wall
                    // Back wall (solid)
                    const backWall = new CANNON.Body({
                        mass: 0,
                        shape: new CANNON.Box(new CANNON.Vec3(houseWallThickness / 2, houseHalfHeight, houseHalfWidth)),
                        position: new CANNON.Vec3(
                            threeObject.position.x + houseHalfLength - houseWallThickness / 2,
                            threeObject.position.y,
                            threeObject.position.z
                        ),
                        material: material
                    });
                    cannonBodies.push(backWall);

                    // Side walls
                    const leftSideWall = new CANNON.Body({
                        mass: 0,
                        shape: new CANNON.Box(new CANNON.Vec3(houseHalfLength, houseHalfHeight, houseWallThickness / 2)),
                        position: new CANNON.Vec3(
                            threeObject.position.x,
                            threeObject.position.y,
                            threeObject.position.z - houseHalfWidth + houseWallThickness / 2
                        ),
                        material: material
                    });
                    cannonBodies.push(leftSideWall);

                    const rightSideWall = new CANNON.Body({
                        mass: 0,
                        shape: new CANNON.Box(new CANNON.Vec3(houseHalfLength, houseHalfHeight, houseWallThickness / 2)),
                        position: new CANNON.Vec3(
                            threeObject.position.x,
                            threeObject.position.y,
                            threeObject.position.z + houseHalfWidth - houseWallThickness / 2
                        ),
                        material: material
                    });
                    cannonBodies.push(rightSideWall);
                    break;

                default:
                    console.warn(`❌ Hollow shape ${shapeType} not implemented yet - using solid collision`);
                    // Fallback to solid shape
                    const solidShape = new CANNON.Box(new CANNON.Vec3(
                        dimensions.length / 2,
                        dimensions.height / 2,
                        dimensions.width / 2
                    ));
                    const solidBody = new CANNON.Body({
                        mass: 0,
                        shape: solidShape,
                        position: new CANNON.Vec3(threeObject.position.x, threeObject.position.y, threeObject.position.z),
                        material: material
                    });
                    cannonBodies.push(solidBody);
                    break;
            }

            // Add all bodies to physics world and track them
            cannonBodies.forEach(body => {
                this.physicsWorld.addBody(body);
                this.physicsObjects.set(threeObject, body); // Map to first body (for cleanup)
            });

            // Store all bodies for this object for proper cleanup
            threeObject.userData.physicsBodies = cannonBodies;

            console.log(`✅ Created ${cannonBodies.length} physics bodies for hollow ${shapeType}`);
        };

        // 🌳 HELPER: Check if a block type is any kind of wood
        this.isWoodBlock = (blockType) => {
            const woodTypes = ['wood', 'oak_wood', 'pine_wood', 'palm_wood', 'birch_wood', 'dead_wood', 'douglas_fir'];
            return woodTypes.includes(blockType);
        };

        // (isLeafBlock moved earlier in constructor, before addBlock)

        // 🌳 ENHANCED: Scan entire tree structure and separate grounded vs floating blocks
        this.scanEntireTreeStructure = (startX, startY, startZ) => {
            const visited = new Set();
            const allWoodBlocks = [];
            const toCheck = [{x: startX, y: startY, z: startZ}];

            // First, find ALL connected wood blocks using broader search pattern
            while (toCheck.length > 0) {
                const {x, y, z} = toCheck.pop();
                const key = `${x},${y},${z}`;

                // Skip if already visited
                if (visited.has(key)) continue;
                visited.add(key);

                const blockData = this.world[key];
                if (!blockData || !this.isWoodBlock(blockData.type)) continue;

                // Found a wood block - add to collection
                allWoodBlocks.push({x, y, z, blockData});

                // Search for connected wood blocks (including diagonals like old method)
                const searchOffsets = [
                    { dx: 0, dy: 1, dz: 0 },   // Directly above
                    { dx: 0, dy: -1, dz: 0 },  // Directly below
                    { dx: 1, dy: 1, dz: 0 },   // Diagonal up-north
                    { dx: -1, dy: 1, dz: 0 },  // Diagonal up-south
                    { dx: 0, dy: 1, dz: 1 },   // Diagonal up-east
                    { dx: 0, dy: 1, dz: -1 },  // Diagonal up-west
                    { dx: 1, dy: 0, dz: 0 },   // Adjacent north
                    { dx: -1, dy: 0, dz: 0 },  // Adjacent south
                    { dx: 0, dy: 0, dz: 1 },   // Adjacent east
                    { dx: 0, dy: 0, dz: -1 },  // Adjacent west
                ];

                for (const offset of searchOffsets) {
                    const nextX = x + offset.dx;
                    const nextY = y + offset.dy;
                    const nextZ = z + offset.dz;
                    const nextKey = `${nextX},${nextY},${nextZ}`;

                    if (!visited.has(nextKey)) {
                        toCheck.push({x: nextX, y: nextY, z: nextZ});
                    }
                }
            }

            // Now determine which blocks are still grounded vs floating
            const groundedBlocks = new Set();
            const floatingBlocks = [];

            // Find blocks connected to ground (check each block for ground support)
            for (const block of allWoodBlocks) {
                if (this.isWoodBlockGrounded(block.x, block.y, block.z, allWoodBlocks)) {
                    groundedBlocks.add(`${block.x},${block.y},${block.z}`);
                }
            }

            // Separate floating blocks from grounded ones
            for (const block of allWoodBlocks) {
                const key = `${block.x},${block.y},${block.z}`;
                if (!groundedBlocks.has(key)) {
                    floatingBlocks.push(block);
                }
            }

            console.log(`🌳 Tree analysis: ${allWoodBlocks.length} total, ${groundedBlocks.size} grounded, ${floatingBlocks.length} floating`);
            return floatingBlocks; // Only return blocks that should fall
        };

        // 🌳 Check if a wood block is supported by ground (either directly or through other grounded wood)
        this.isWoodBlockGrounded = (x, y, z, allWoodBlocks) => {
            // Check if block is directly on ground
            const groundBlock = this.getBlock(x, y - 1, z);
            if (groundBlock && !this.isWoodBlock(groundBlock.type)) {
                return true; // Resting on solid ground
            }

            // Check if supported by other grounded wood blocks below
            for (const otherBlock of allWoodBlocks) {
                if (otherBlock.x === x && otherBlock.z === z && otherBlock.y < y) {
                    // There's a wood block below this one - check if that one reaches ground
                    let checkY = otherBlock.y;
                    let foundGround = false;

                    while (checkY >= y - 10) { // Don't search too far down
                        const supportBlock = this.getBlock(x, checkY - 1, z);
                        if (supportBlock && !this.isWoodBlock(supportBlock.type)) {
                            foundGround = true;
                            break;
                        }
                        checkY--;
                    }

                    if (foundGround) return true;
                }
            }

            return false; // Not grounded
        };

        // 🌳 Get all connected wood blocks without filtering
        this.getAllConnectedWoodBlocks = (startX, startY, startZ) => {
            const visited = new Set();
            const allWoodBlocks = [];
            const toCheck = [{x: startX, y: startY, z: startZ}];

            while (toCheck.length > 0) {
                const {x, y, z} = toCheck.pop();
                const key = `${x},${y},${z}`;

                if (visited.has(key)) continue;
                visited.add(key);

                const blockData = this.world[key];
                if (!blockData || !this.isWoodBlock(blockData.type)) continue;

                allWoodBlocks.push({x, y, z, blockData});

                // Search all directions including diagonals
                const searchOffsets = [
                    { dx: 0, dy: 1, dz: 0 }, { dx: 0, dy: -1, dz: 0 },
                    { dx: 1, dy: 0, dz: 0 }, { dx: -1, dy: 0, dz: 0 },
                    { dx: 0, dy: 0, dz: 1 }, { dx: 0, dy: 0, dz: -1 },
                    { dx: 1, dy: 1, dz: 0 }, { dx: -1, dy: 1, dz: 0 },
                    { dx: 0, dy: 1, dz: 1 }, { dx: 0, dy: 1, dz: -1 },
                ];

                for (const offset of searchOffsets) {
                    const nextX = x + offset.dx;
                    const nextY = y + offset.dy;
                    const nextZ = z + offset.dz;
                    const nextKey = `${nextX},${nextY},${nextZ}`;

                    if (!visited.has(nextKey)) {
                        toCheck.push({x: nextX, y: nextY, z: nextZ});
                    }
                }
            }

            return allWoodBlocks;
        };

        // 🌳 Check if a block is at the base of the tree (on ground level)
        this.isTreeBaseBlock = (x, y, z, allTreeBlocks) => {
            // Find the lowest Y coordinate in the tree
            const minY = Math.min(...allTreeBlocks.map(block => block.y));

            // Check if this block is at or near the base level
            return y <= minY + 1; // Base or just above base
        };

        // 🌳 Get blocks that would be floating after removing the harvested block
        this.getFloatingBlocks = (allTreeBlocks, harvestedX, harvestedY, harvestedZ) => {
            // Remove the harvested block from consideration
            const remainingBlocks = allTreeBlocks.filter(block =>
                !(block.x === harvestedX && block.y === harvestedY && block.z === harvestedZ)
            );

            const floatingBlocks = [];

            for (const block of remainingBlocks) {
                if (!this.isWoodBlockGrounded(block.x, block.y, block.z, remainingBlocks)) {
                    floatingBlocks.push(block);
                }
            }

            return floatingBlocks;
        };

        // 🌳 TREE ID SYSTEM: ID-based tree harvesting (replaces spatial analysis)
        this.checkTreeFalling = (harvestedX, harvestedY, harvestedZ) => {
            console.log(`🌳 Tree ID harvesting: checking block at (${harvestedX}, ${harvestedY}, ${harvestedZ})`);

            // 🌳 STEP 1: Get tree ID from harvested block
            const treeId = this.getTreeIdFromBlock(harvestedX, harvestedY, harvestedZ);

            if (!treeId) {
                console.log(`🌳 No tree ID found for block - not part of registered tree`);
                return;
            }

            // 🌳 STEP 2: Get complete tree metadata
            const treeMetadata = this.getTreeMetadata(treeId);

            if (!treeMetadata) {
                console.error(`🚨 Tree metadata not found for ID ${treeId}`);
                return;
            }

            console.log(`🌳 Found tree ID ${treeId}: ${treeMetadata.treeType} with ${treeMetadata.trunkBlocks.length} trunk blocks and ${treeMetadata.leafBlocks.length} leaf blocks`);

            // 🪵 RESOURCE COLLECTION: Give player ALL trunk blocks from this tree
            const woodType = treeMetadata.treeType; // e.g., 'oak_wood', 'pine_wood'
            const woodCount = treeMetadata.trunkBlocks.length;

            if (woodCount > 0) {
                this.inventory.addToInventory(woodType, woodCount);

                const woodIcon = this.getItemIcon(woodType);
                this.updateStatus(`🌳 TIMBER! Collected ${woodCount}x ${woodType.replace('_', ' ')} ${woodIcon}`, 'discovery');
                console.log(`🪵 Gave player ${woodCount}x ${woodType} from tree ID ${treeId}`);
            }

            // 💀 TREASURE LOOT: Check if this dead tree has treasure
            if (treeMetadata.hasTreasure) {
                console.log(`💀🎁 Dead tree has treasure! Spawning world item...`);

                // Pick random item from BILLBOARD_ITEMS
                const billboardKeys = Object.keys(this.BILLBOARD_ITEMS);
                const randomKey = billboardKeys[Math.floor(Math.random() * billboardKeys.length)];
                const itemData = this.BILLBOARD_ITEMS[randomKey];

                // Spawn billboard item near player
                const spawnX = this.player.position.x + (Math.random() - 0.5) * 3; // ±1.5 blocks from player
                const spawnZ = this.player.position.z + (Math.random() - 0.5) * 3;
                const spawnY = this.player.position.y;

                this.createWorldItem(spawnX, spawnY, spawnZ, randomKey, itemData.emoji);

                this.updateStatus(`💀💎 Dead tree treasure spawned nearby!`, 'discovery');
            }

            // 🍃 MACHETE LEAF COLLECTION: Check if player has machete (inventory OR equipment)
            const hasMachete = this.hasTool('machete');

            if (hasMachete && treeMetadata.leafBlocks.length > 0) {
                // Collect all leaf types from this tree
                const leafTypes = {};
                treeMetadata.leafBlocks.forEach(leafBlock => {
                    leafTypes[leafBlock.blockType] = (leafTypes[leafBlock.blockType] || 0) + 1;
                });

                // Add all collected leaves to inventory
                Object.entries(leafTypes).forEach(([leafType, count]) => {
                    this.inventory.addToInventory(leafType, count);
                });

                const totalLeaves = treeMetadata.leafBlocks.length;
                this.updateStatus(`🔪🍃 Machete collected ${totalLeaves} leaves from tree!`, 'discovery');
                console.log(`🔪 Machete collected ${totalLeaves} leaves from tree ID ${treeId}`);
            }

            // 🌳 STEP 3: Remove ALL blocks belonging to this tree (no spatial guessing!)
            const allTreeBlocks = [...treeMetadata.trunkBlocks, ...treeMetadata.leafBlocks];

            // Create falling animation for all tree blocks
            this.createFallingTreePhysics(allTreeBlocks, harvestedX, harvestedY, harvestedZ, treeMetadata.treeType);

            // Remove all blocks from world
            allTreeBlocks.forEach(block => {
                this.removeBlock(block.x, block.y, block.z, false); // false = don't give items (already handled above)
            });

            // 🗑️ STEP 4: Clean up tree from registry (garbage collection)
            this.removeTreeFromRegistry(treeId);

            console.log(`🌳 Tree ID ${treeId} completely harvested and removed from world`);
        };

        // 🌳 NEW: Find blocks that remain connected to ground after harvesting (excluding harvested block)
        this.getGroundConnectedBlocks = (allBlocks, harvestedX, harvestedY, harvestedZ) => {
            // Find all ground-level blocks (lowest Y values) as potential tree bases
            const minY = Math.min(...allBlocks.map(block => block.y));
            const groundBlocks = allBlocks.filter(block =>
                block.y === minY &&
                !(block.x === harvestedX && block.y === harvestedY && block.z === harvestedZ) // Exclude harvested block
            );

            if (groundBlocks.length === 0) {
                console.log(`🌳 No ground blocks remain after harvesting - entire tree will fall`);
                return [];
            }

            // Use flood-fill from ground blocks to find all reachable blocks (without going through harvested block)
            const visited = new Set();
            const connected = [];
            const queue = [...groundBlocks];

            // Mark harvested block as "blocked" so flood-fill can't pass through it
            const harvestedKey = `${harvestedX},${harvestedY},${harvestedZ}`;

            while (queue.length > 0) {
                const current = queue.shift();
                const key = `${current.x},${current.y},${current.z}`;

                if (visited.has(key)) continue;
                if (key === harvestedKey) continue; // Skip harvested block

                visited.add(key);
                connected.push(current);

                // Find adjacent blocks in the original tree structure
                allBlocks.forEach(block => {
                    const blockKey = `${block.x},${block.y},${block.z}`;
                    if (visited.has(blockKey) || blockKey === harvestedKey) return;

                    // Check if block is adjacent to current block
                    const dx = Math.abs(block.x - current.x);
                    const dy = Math.abs(block.y - current.y);
                    const dz = Math.abs(block.z - current.z);

                    // Allow horizontal and vertical adjacency (including diagonals for branching trees)
                    if (dx <= 1 && dy <= 1 && dz <= 1 && (dx + dy + dz) <= 2) {
                        queue.push(block);
                    }
                });
            }

            console.log(`🌳 Ground connection analysis: ${connected.length} blocks remain connected to ground`);
            return connected;
        };

        // 🎯 PHASE 3: Scan connected wood blocks to find tree structure
        this.scanTreeStructure = (startX, startY, startZ) => {
            const visited = new Set();
            const treeBlocks = [];
            const queue = [{ x: startX, y: startY, z: startZ }];

            while (queue.length > 0) {
                const { x, y, z } = queue.shift();
                const key = `${x},${y},${z}`;

                if (visited.has(key)) continue;
                visited.add(key);

                // Check if there's a wood block at this position
                const blockData = this.getBlock(x, y, z);
                if (!blockData || !this.isWoodBlock(blockData.type)) continue;

                treeBlocks.push({ x, y, z, blockData });

                // Search for connected wood blocks (above, diagonal up, and adjacent)
                const searchOffsets = [
                    { dx: 0, dy: 1, dz: 0 },   // Directly above
                    { dx: 1, dy: 1, dz: 0 },   // Diagonal up-north
                    { dx: -1, dy: 1, dz: 0 },  // Diagonal up-south
                    { dx: 0, dy: 1, dz: 1 },   // Diagonal up-east
                    { dx: 0, dy: 1, dz: -1 },  // Diagonal up-west
                    { dx: 1, dy: 0, dz: 0 },   // Adjacent north
                    { dx: -1, dy: 0, dz: 0 },  // Adjacent south
                    { dx: 0, dy: 0, dz: 1 },   // Adjacent east
                    { dx: 0, dy: 0, dz: -1 },  // Adjacent west
                ];

                searchOffsets.forEach(offset => {
                    const newX = x + offset.dx;
                    const newY = y + offset.dy;
                    const newZ = z + offset.dz;
                    const newKey = `${newX},${newY},${newZ}`;

                    if (!visited.has(newKey)) {
                        queue.push({ x: newX, y: newY, z: newZ });
                    }
                });
            }

            return treeBlocks;
        };

        // 🍃 ENHANCED: Find and cascade leaves that are no longer connected to STANDING wood
        this.cascadeDisconnectedLeaves = (fallenWoodBlocks, remainingWoodBlocks = []) => {
            console.log(`🍃 Checking for disconnected leaves around ${fallenWoodBlocks.length} fallen wood blocks (${remainingWoodBlocks.length} still standing)`);

            const leafBlocks = [];
            const searchRadius = 4; // Increased radius to catch all leaf types (Pine trees can have wider canopies)

            // Find all leaf blocks near the fallen wood blocks
            fallenWoodBlocks.forEach(({ x: woodX, y: woodY, z: woodZ }) => {
                for (let dx = -searchRadius; dx <= searchRadius; dx++) {
                    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
                        for (let dz = -searchRadius; dz <= searchRadius; dz++) {
                            const leafX = woodX + dx;
                            const leafY = woodY + dy;
                            const leafZ = woodZ + dz;

                            const blockData = this.getBlock(leafX, leafY, leafZ);
                            if (blockData && this.isLeafBlock(blockData.type)) {
                                // 🌳 ENHANCED: Check if this leaf is still connected to STANDING wood only
                                if (!this.isLeafConnectedToStandingWood(leafX, leafY, leafZ, remainingWoodBlocks)) {
                                    leafBlocks.push({ x: leafX, y: leafY, z: leafZ, type: blockData.type });
                                }
                            }
                        }
                    }
                }
            });

            if (leafBlocks.length > 0) {
                console.log(`🍃 Found ${leafBlocks.length} disconnected leaf blocks - cascading!`);
                this.createFallingLeaves(leafBlocks);
            }
        };

        // 🍃 ENHANCED: Check if a leaf block is connected to STANDING wood only (not fallen wood)
        this.isLeafConnectedToStandingWood = (leafX, leafY, leafZ, standingWoodBlocks) => {
            const connectionRadius = 3; // Increased radius for better Pine/Palm tree support

            // Check if any standing wood blocks are within connection radius
            for (const woodBlock of standingWoodBlocks) {
                const dx = Math.abs(leafX - woodBlock.x);
                const dy = Math.abs(leafY - woodBlock.y);
                const dz = Math.abs(leafZ - woodBlock.z);

                // Allow connection if within radius (including diagonal connections)
                if (dx <= connectionRadius && dy <= connectionRadius && dz <= connectionRadius) {
                    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    if (distance <= connectionRadius) {
                        return true; // Found standing wood nearby
                    }
                }
            }
            return false; // No standing wood found, leaf is disconnected
        };

        // 🍃 LEGACY: Check if a leaf block is connected to ANY wood (kept for backward compatibility)
        this.isLeafConnectedToWood = (leafX, leafY, leafZ) => {
            const connectionRadius = 2;

            for (let dx = -connectionRadius; dx <= connectionRadius; dx++) {
                for (let dy = -connectionRadius; dy <= connectionRadius; dy++) {
                    for (let dz = -connectionRadius; dz <= connectionRadius; dz++) {
                        const checkX = leafX + dx;
                        const checkY = leafY + dy;
                        const checkZ = leafZ + dz;

                        const blockData = this.getBlock(checkX, checkY, checkZ);
                        if (blockData && this.isWoodBlock(blockData.type)) {
                            return true; // Found standing wood nearby
                        }
                    }
                }
            }
            return false; // No wood found, leaf is disconnected
        };

        // 🍃 Create falling leaf blocks with machete-based leaf collection
        this.createFallingLeaves = (leafBlocks) => {
            // 🔪 Check if player has machete (inventory OR equipment) for leaf collection
            const hasMachete = this.hasTool('machete');

            // Count leaves for machete collection
            let collectedLeaves = 0;
            const leafTypes = {};

            leafBlocks.forEach(({ x, y, z, type }, index) => {
                setTimeout(() => {
                    // Remove the stationary leaf block
                    this.removeBlock(x, y, z, false);

                    // 🔪 MACHETE LEAF COLLECTION: Give leaves to player if machete equipped
                    if (hasMachete) {
                        // Count leaf types for inventory addition
                        leafTypes[type] = (leafTypes[type] || 0) + 1;
                        collectedLeaves++;
                    }

                    // Create falling leaf with appropriate color (visual effect)
                    const leafColor = this.getLeafColor(type);
                    this.createFallingLeafBlock(x, y, z, leafColor);
                }, index * 25); // 25ms delay between leaves for cascade effect
            });

            // 🔪 Add collected leaves to inventory after all timeouts
            if (hasMachete && collectedLeaves > 0) {
                setTimeout(() => {
                    // Add each leaf type to inventory
                    Object.entries(leafTypes).forEach(([leafType, count]) => {
                        this.inventory.addToInventory(leafType, count);
                    });

                    // Show collection notification
                    const macheteIcon = this.getItemIcon('machete', 'status');
                    this.updateStatus(`${macheteIcon} Machete collected ${collectedLeaves} leaves from fallen tree!`, 'discovery');
                    console.log(`🔪 Machete collected ${collectedLeaves} leaves:`, leafTypes);
                }, leafBlocks.length * 25 + 100); // After all leaves have been processed
            }

            // Show cascade notification
            const message = hasMachete
                ? `🍃 ${leafBlocks.length} leaves cascading - collected with machete!`
                : `🍃 ${leafBlocks.length} leaves cascading (need machete to collect)`;
            this.updateStatus(message, 'discovery');
        };

        // 🍃 Get color for different leaf types
        this.getLeafColor = (leafType) => {
            const leafColors = {
                leaf: 0x228B22,           // Legacy green
                forest_leaves: 0x228B22,   // Bright green
                mountain_leaves: 0x006400, // Dark green needles
                desert_leaves: 0x9ACD32,   // Yellow-green fronds
                plains_leaves: 0x90EE90,   // Light green
                tundra_leaves: 0x708090    // Gray-green hardy
            };
            return leafColors[leafType] || 0x228B22;
        };

        // 🍃 Create individual falling leaf block
        this.createFallingLeafBlock = (x, y, z, color) => {
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshLambertMaterial({ color });
            const fallingLeaf = new THREE.Mesh(geometry, material);
            fallingLeaf.position.set(x, y, z);
            this.scene.add(fallingLeaf);

            // Lighter physics for leaves
            const cannonShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
            const cannonBody = new CANNON.Body({
                mass: 2, // Much lighter than wood (wood is mass 10)
                shape: cannonShape,
                position: new CANNON.Vec3(x, y, z),
                material: this.physicsMaterials.forest_leaves // Use leaf material
            });

            // Gentle falling motion for leaves
            cannonBody.velocity.set(
                (Math.random() - 0.5) * 5, // Light horizontal drift
                Math.random() * 2,         // Slight upward velocity
                (Math.random() - 0.5) * 5
            );

            this.physicsWorld.addBody(cannonBody);
            this.physicsObjects.set(fallingLeaf, cannonBody);

            // Auto-cleanup leaves faster (15 seconds vs 30 for wood)
            setTimeout(() => {
                this.scene.remove(fallingLeaf);
                this.physicsWorld.removeBody(cannonBody);
                this.physicsObjects.delete(fallingLeaf);

                // 🗑️ MEMORY LEAK FIX: Dispose geometry and material
                if (fallingLeaf.geometry) fallingLeaf.geometry.dispose();
                if (fallingLeaf.material) fallingLeaf.material.dispose();
            }, 15000);
        };

        // 🎯 PHASE 3: Create dramatic falling tree physics
        this.createFallingTreePhysics = (treeBlocks, chopX, chopY, chopZ, treeType = 'unknown') => {
            console.log(`🎬 Creating dramatic falling tree animation with ${treeBlocks.length} blocks!`);

            // Separate blocks into wood and leaves for different physics
            const woodBlocks = treeBlocks.filter(block => !this.isLeafBlock(block.blockType));
            const leafBlocks = treeBlocks.filter(block => this.isLeafBlock(block.blockType));

            console.log(`🌳 Tree contains ${woodBlocks.length} wood blocks and ${leafBlocks.length} leaf blocks`);

            // Calculate fall direction (away from player) but moderate the force
            const playerX = this.player.position.x;
            const playerZ = this.player.position.z;
            const fallDirectionX = chopX - playerX;
            const fallDirectionZ = chopZ - playerZ;
            const fallLength = Math.sqrt(fallDirectionX * fallDirectionX + fallDirectionZ * fallDirectionZ);
            const normalizedFallX = fallLength > 0 ? fallDirectionX / fallLength : 1;
            const normalizedFallZ = fallLength > 0 ? fallDirectionZ / fallLength : 0;

            // Create falling wood blocks with moderate physics
            woodBlocks.forEach((block, index) => {
                this.removeBlock(block.x, block.y, block.z, false);
                setTimeout(() => {
                    this.createFallingWoodBlock(
                        block.x, block.y, block.z,
                        normalizedFallX, normalizedFallZ,
                        index * 0.05, // Less staggering for wood
                        block.blockType
                    );
                }, index * 30); // Faster falling for wood blocks
            });

            // Create falling leaf blocks with gentle physics
            leafBlocks.forEach((block, index) => {
                this.removeBlock(block.x, block.y, block.z, false);
                setTimeout(() => {
                    this.createFallingLeafBlock(
                        block.x, block.y, block.z,
                        block.blockType
                    );
                }, index * 20 + woodBlocks.length * 30); // Start after wood blocks
            });

            // Add satisfying tree fall sound effect notification with tree type
            const treeDisplayName = treeType.replace('_wood', '').replace('_', ' ');
            this.updateStatus(`🌳 TIMBER! ${treeDisplayName} tree crashed down with ${woodBlocks.length} wood and ${leafBlocks.length} leaf blocks!`, 'discovery');
            console.log(`🎉 Tree falling sequence initiated - wood and leaves will fall realistically!`);
        };

        // 🍃 Create falling leaf block with gentle physics
        this.createFallingLeafBlock = (x, y, z, leafType = 'leaf') => {
            // Create Three.js mesh for falling leaf block
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const leafColor = this.getLeafColor(leafType);
            const material = new THREE.MeshLambertMaterial({
                color: leafColor,
                transparent: true,
                opacity: 0.8 // Slightly transparent for leaves
            });
            const fallingLeaf = new THREE.Mesh(geometry, material);
            fallingLeaf.position.set(x, y, z);

            // Add to scene
            this.scene.add(fallingLeaf);

            // Create physics body with very light leaf properties
            const cannonShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
            const cannonBody = new CANNON.Body({
                mass: 0.5, // Very light like real leaves
                shape: cannonShape,
                position: new CANNON.Vec3(x, y, z),
                material: this.physicsMaterials.wood // Use wood material for now
            });

            // Apply gentle falling motion - leaves just fall down with slight drift
            cannonBody.velocity.set(
                (Math.random() - 0.5) * 2, // Very small horizontal drift
                -2 + Math.random() * 1,    // Gentle downward velocity
                (Math.random() - 0.5) * 2  // Very small horizontal drift
            );

            // Add gentle leaf tumbling
            cannonBody.angularVelocity.set(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            );

            // Add to physics world
            this.physicsWorld.addBody(cannonBody);
            this.physicsObjects.set(fallingLeaf, cannonBody);

            // Mark as falling leaf block
            fallingLeaf.userData = {
                type: 'falling_leaf',
                blockType: leafType,
                lifetime: 0
            };

            // Remove after falling for a while (leaves disappear)
            setTimeout(() => {
                if (this.physicsObjects.has(fallingLeaf)) {
                    const body = this.physicsObjects.get(fallingLeaf);
                    this.physicsWorld.removeBody(body);
                    this.physicsObjects.delete(fallingLeaf);
                    this.scene.remove(fallingLeaf);

                    // 🗑️ MEMORY LEAK FIX: Dispose geometry and material
                    if (fallingLeaf.geometry) fallingLeaf.geometry.dispose();
                    if (fallingLeaf.material) fallingLeaf.material.dispose();

                    console.log(`🍃 Leaf block cleaned up after falling`);
                }
            }, 8000); // 8 seconds to fall and disappear
        };

        // 🍃 Get color for different leaf types
        this.getLeafColor = (leafType) => {
            const leafColors = {
                leaf: 0x228B22,           // Forest green
                forest_leaves: 0x228B22,  // Forest green
                mountain_leaves: 0x2F4F2F, // Dark green
                desert_leaves: 0x8B7D6B,  // Brownish for desert
                plains_leaves: 0x32CD32,  // Lime green
                tundra_leaves: 0x556B2F   // Dark olive green
            };
            return leafColors[leafType] || leafColors.leaf;
        };

        // 🪵 Get color for different wood types
        this.getWoodColor = (woodType) => {
            const woodColors = {
                wood: 0x8B4513,      // Legacy brown
                oak_wood: 0x8B4513,  // Classic brown oak
                pine_wood: 0x654321, // Darker brown pine
                palm_wood: 0xD2B48C, // Light tan palm
                birch_wood: 0xF5F5DC // Pale birch
            };
            return woodColors[woodType] || 0x8B4513;
        };

        // 🎯 PHASE 3: Create individual falling wood block with physics
        this.createFallingWoodBlock = (x, y, z, fallDirX, fallDirZ, delay, woodType = 'wood') => {
            // Create Three.js mesh for falling wood block with appropriate color
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const woodColor = this.getWoodColor(woodType);
            const material = new THREE.MeshLambertMaterial({ color: woodColor });
            const fallingBlock = new THREE.Mesh(geometry, material);
            fallingBlock.position.set(x, y, z);

            // Add to scene
            this.scene.add(fallingBlock);

            // Create physics body with realistic wood properties
            const cannonShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
            const cannonBody = new CANNON.Body({
                mass: 10, // Wood blocks have mass so they fall!
                shape: cannonShape,
                position: new CANNON.Vec3(x, y, z),
                material: this.physicsMaterials.wood
            });

            // Apply moderate falling force (reduced from excessive 50-80 to realistic 5-10)
            const fallForce = 5 + Math.random() * 5; // Moderate force for natural effect
            cannonBody.velocity.set(
                fallDirX * fallForce + (Math.random() - 0.5) * 4, // Reduced horizontal spread
                Math.random() * 3, // Gentle upward velocity
                fallDirZ * fallForce + (Math.random() - 0.5) * 4
            );

            // Add rotational tumbling for realistic tree falling
            cannonBody.angularVelocity.set(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10
            );

            // Add to physics world
            this.physicsWorld.addBody(cannonBody);
            this.physicsObjects.set(fallingBlock, cannonBody);

            // Mark as falling tree block for special handling
            fallingBlock.userData = {
                type: 'fallingTreeBlock',
                spawnTime: Date.now(),
                collected: false
            };

            // Auto-cleanup after 3 seconds to prevent world clutter
            setTimeout(() => {
                if (fallingBlock.userData && !fallingBlock.userData.collected) {
                    this.scene.remove(fallingBlock);
                    this.physicsWorld.removeBody(cannonBody);
                    this.physicsObjects.delete(fallingBlock);

                    // 🗑️ MEMORY LEAK FIX: Dispose geometry and material
                    if (fallingBlock.geometry) fallingBlock.geometry.dispose();
                    if (fallingBlock.material) fallingBlock.material.dispose();

                    console.log(`🗑️ Auto-cleaned up fallen wood block after 3 seconds`);
                }
            }, 3000);

            console.log(`🪵 Created falling wood block with physics at (${x}, ${y}, ${z})`);
        };

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

        // 🌍 Update biome indicator in status display
        this.updateBiomeIndicator = () => {
            const playerX = Math.floor(this.player.position.x);
            const playerY = Math.floor(this.player.position.y);
            const playerZ = Math.floor(this.player.position.z);
            let currentBiome = this.biomeWorldGen.getBiomeAt(playerX, playerZ, this.worldSeed);

            // 🏔️ HEIGHT-AWARE BIOME DETECTION: Override biome based on elevation
            // If player is significantly above biome's max height, it's probably a mountain
            let heightBasedBiome = currentBiome.name;

            // Check if player is on a tall mountain (above normal terrain)
            if (playerY > 20) {
                heightBasedBiome = "Mountain";
            } else if (playerY > 15 && currentBiome.maxHeight < 12) {
                // Player is moderately high, and base biome is low-elevation
                heightBasedBiome = "Mountain";
            }

            // If height-based detection differs from terrain biome, create override
            if (heightBasedBiome !== currentBiome.name) {
                console.log(`🏔️ Height-based biome override: ${currentBiome.name} → ${heightBasedBiome} (y=${playerY})`);
                currentBiome = this.biomeWorldGen.biomes[heightBasedBiome] || currentBiome;
            }

            // Only update if biome changed to avoid spam
            if (this.lastDisplayedBiome !== currentBiome.name) {
                this.lastDisplayedBiome = currentBiome.name;
                console.log(`🌍 Biome changed to: ${currentBiome.name} at (${playerX}, ${playerY}, ${playerZ})`);

                // Get biome icon and tree chance
                const biomeInfo = this.getBiomeDisplayInfo(currentBiome);

                // Update status display with biome info using stored references
                if (this.statusIcon && this.statusText) {
                    this.statusIcon.textContent = biomeInfo.icon;
                    this.statusText.textContent = `${currentBiome.name} Biome - ${biomeInfo.description}`;

                    // Optional: Add tree count for debugging
                    const treeChance = this.getTreeChanceForBiome(currentBiome.name);
                    if (treeChance > 0) {
                        this.statusText.textContent += ` (${Math.round(treeChance * 100)}% trees)`;
                    }
                } else {
                    console.warn("🚨 Status elements not found - biome indicator not updated");
                }

                // Update the Explorer's Info Panel biome display
                if (this.biomeDisplay) {
                    const isTransition = currentBiome.isTransition || false;
                    const displayText = isTransition 
                        ? `🌐 ${currentBiome.name} (Transition)`
                        : `${biomeInfo.icon} ${currentBiome.name}`;
                    this.biomeDisplay.textContent = displayText;
                    
                    // Add subtle animation on biome change
                    this.biomeDisplay.style.animation = 'none';
                    setTimeout(() => {
                        this.biomeDisplay.style.animation = 'biomeFade 0.5s ease-in-out';
                    }, 10);
                }
            }
        };

        // 🌍 Get display info for biomes
        this.getBiomeDisplayInfo = (biome) => {
            const biomeInfo = {
                Forest: { icon: '🌲', description: 'Dense woodlands with oak trees' },
                Mountain: { icon: '⛰️', description: 'Rocky peaks with pine forests' },
                Plains: { icon: '🌾', description: 'Open grasslands with scattered groves' },
                Desert: { icon: '🏜️', description: 'Arid sands with rare palm oases' },
                Tundra: { icon: '🌨️', description: 'Frozen wilderness with hardy birch trees' }
            };
            return biomeInfo[biome.name] || { icon: '🌍', description: 'Unknown terrain' };
        };

        // 🌍 Get tree spawn chance for biome
        this.getTreeChanceForBiome = (biomeName) => {
            const treeChances = {
                Forest: 0.30,
                Mountain: 0.25,
                Plains: 0.08,
                Desert: 0.02,
                Tundra: 0.03
            };
            return treeChances[biomeName] || 0;
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

            // 🍳 KITCHEN BENCH PROXIMITY DETECTION
            let nearbyKitchenBench = null;
            for (let x = Math.floor(playerPos.x - 2); x <= Math.floor(playerPos.x + 2); x++) {
                for (let y = Math.floor(playerPos.y - 2); y <= Math.floor(playerPos.y + 2); y++) {
                    for (let z = Math.floor(playerPos.z - 2); z <= Math.floor(playerPos.z + 2); z++) {
                        const key = `${x},${y},${z}`;
                        const block = this.world[key];
                        if (block && block.type === 'kitchen_bench') {
                            const blockPos = new THREE.Vector3(x, y, z);
                            const distance = new THREE.Vector3().copy(playerPos).distanceTo(blockPos);
                            if (distance <= 2.0) {
                                nearbyKitchenBench = { x, y, z, distance };
                                break;
                            }
                        }
                    }
                    if (nearbyKitchenBench) break;
                }
                if (nearbyKitchenBench) break;
            }

            // Show/hide kitchen bench interaction prompt
            if (nearbyKitchenBench && !this.currentNearbyKitchenBench) {
                this.currentNearbyKitchenBench = nearbyKitchenBench;
                this.showKitchenBenchPrompt(nearbyKitchenBench);
            } else if (!nearbyKitchenBench && this.currentNearbyKitchenBench) {
                this.currentNearbyKitchenBench = null;
                this.hideKitchenBenchPrompt();
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

        // 🍳 Show kitchen bench interaction prompt
        this.showKitchenBenchPrompt = (kitchenBench) => {
            if (this.kitchenBenchPrompt) {
                this.hideKitchenBenchPrompt();
            }

            this.kitchenBenchPrompt = document.createElement('div');
            this.kitchenBenchPrompt.style.cssText = `
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
                border: 2px solid #FF9800;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                backdrop-filter: blur(4px);
                animation: slideUp 0.3s ease-out;
            `;

            // Check if mobile
            if (this.isMobile) {
                this.kitchenBenchPrompt.innerHTML = `
                    <div>🍳 Kitchen Bench</div>
                    <div style="font-size: 14px; margin-top: 5px; opacity: 0.9;">Tap to cook food</div>
                `;
                this.kitchenBenchPrompt.addEventListener('click', () => {
                    this.kitchenBenchSystem.open();
                });
                this.kitchenBenchPrompt.style.cursor = 'pointer';
            } else {
                this.kitchenBenchPrompt.innerHTML = `
                    <div>🍳 Kitchen Bench</div>
                    <div style="font-size: 14px; margin-top: 5px; opacity: 0.9;">Press <span style="background: #FF9800; padding: 2px 8px; border-radius: 4px; margin: 0 2px;">F</span> to cook</div>
                `;
            }

            document.body.appendChild(this.kitchenBenchPrompt);
        };

        // Hide kitchen bench interaction prompt
        this.hideKitchenBenchPrompt = () => {
            if (this.kitchenBenchPrompt) {
                this.kitchenBenchPrompt.remove();
                this.kitchenBenchPrompt = null;
            }
        };

        // Backpack display connected to InventorySystem backend
        // (Handled by BackpackSystem.js)

        // Transfer methods now handled by InventorySystem.js
        // Use this.inventory.transferItemToBackpack() and this.inventory.transferItemToHotbar() instead

        // Get harvesting time for block type with current tool
        this.getHarvestTime = (blockType) => {
            const selectedSlot = this.inventory?.hotbarSlots?.[this.selectedSlot];
            const currentTool = selectedSlot?.itemType || null;

            // Base harvest times (in milliseconds)
            const baseTimes = {
                grass: 500,
                wood: 1000,
                stone: 1500,
                sand: 300,
                shrub: 400,
                pumpkin: 600, // Medium harvest time
                backpack: 100, // Quick pickup
                workbench: 800,
                brick: 2000,
                iron: 3000, // Very hard without proper tools
                gold: 3500, // Even harder than iron
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
                // 🔪 MACHETE: Excellent for vegetation and wood harvesting
                machete: {
                    wood: 0.3, oak_wood: 0.3, pine_wood: 0.3, palm_wood: 0.3, birch_wood: 0.3, // All wood types
                    shrub: 0.2, grass: 0.4, // Vegetation
                    // Leaf harvesting (if directly targeting leaves)
                    leaf: 0.2, forest_leaves: 0.2, mountain_leaves: 0.2,
                    desert_leaves: 0.2, plains_leaves: 0.2, tundra_leaves: 0.2
                },
                // 🔨 STONE HAMMER: Excellent for stone, iron, and gold harvesting
                stone_hammer: {
                    stone: 0.4, // 1500ms * 0.4 = 600ms (fast!)
                    iron: 0.5,  // 3000ms * 0.5 = 1500ms (reasonable)
                    gold: 0.6,  // 3500ms * 0.6 = 2100ms (slower than iron)
                    brick: 0.6, // Also good for brick
                    wood: 1.8,  // Inefficient for wood
                    grass: 2.0  // Very inefficient for soft materials
                },
                // Other materials default to 1.5x (inefficient as tools)
            };

            const baseTime = baseTimes[blockType] || 1000;
            const efficiency = toolEfficiency[currentTool]?.[blockType] || 1.5; // Default slow

            // Some blocks require specific tools
            if (blockType === 'iron' && !['iron', 'stone_hammer'].includes(currentTool)) {
                return -1; // Cannot harvest iron without stone hammer or iron tool
            }

            if (blockType === 'gold' && !['iron', 'stone_hammer'].includes(currentTool)) {
                return -1; // Cannot harvest gold without stone hammer or iron tool
            }

            return Math.floor(baseTime * efficiency);
        };

        // Start harvesting a block
        this.startHarvesting = (x, y, z) => {
            const key = `${x},${y},${z}`;
            const blockData = this.world[key];

            if (!blockData) return;

            // 🛡️ BEDROCK IS UNBREAKABLE
            if (blockData.type === 'bedrock') {
                this.updateStatus(`🛡️ Bedrock is unbreakable!`);
                return;
            }

            // 🎄 MEGA DOUGLAS FIR BLOCKS ARE INDESTRUCTIBLE
            if (this.christmasSystem && this.christmasSystem.isMegaFirBlock(x, y, z)) {
                this.updateStatus(`🎄 The Christmas tree is magical and indestructible!`);
                return;
            }

            const harvestTime = this.getHarvestTime(blockData.type);

            // Check if block can be harvested with current tool
            if (harvestTime === -1) {
                this.updateStatus(`Cannot harvest ${blockData.type} without proper tools!`);
                return;
            }

            // Stop any existing harvesting
            this.stopHarvesting();

            // ⚡ STAMINA: Calculate stamina cost for harvesting
            // SURVIVAL REBALANCE: Most gathering is nearly FREE!
            const harvestTimeSeconds = harvestTime / 1000;

            // Define free gathering blocks (0 stamina)
            const freeBlocks = ['grass', 'flowers', 'shrub', 'leaf', 'forest_leaves',
                               'mountain_leaves', 'desert_leaves', 'plains_leaves', 'tundra_leaves'];

            // Define cheap gathering blocks (1-2 stamina)
            const cheapBlocks = ['sand', 'wood', 'oak_wood', 'pine_wood', 'palm_wood', 'birch_wood'];

            let staminaCost = 0;

            if (freeBlocks.includes(blockData.type)) {
                // FREE gathering for basic resources
                staminaCost = 0;
            } else if (cheapBlocks.includes(blockData.type)) {
                // Cheap gathering (1-2 stamina)
                staminaCost = Math.ceil(harvestTimeSeconds * 0.5);
            } else {
                // Normal resources (stone, iron, etc.) - original formula
                staminaCost = Math.ceil(harvestTimeSeconds * 2);
            }

            // 🌲 TREE BONUS: If harvesting a tree, multiply cost by trunk size!
            // Check if this block is part of a registered tree
            const treeId = this.getTreeIdFromBlock(x, y, z);
            if (treeId) {
                const treeMetadata = this.getTreeMetadata(treeId);
                if (treeMetadata && treeMetadata.trunkBlocks) {
                    const trunkCount = treeMetadata.trunkBlocks.length;
                    const leafCount = treeMetadata.leafBlocks.length;
                    staminaCost = staminaCost * trunkCount;
                    console.log(`🌲 BIG TREE! ${treeMetadata.treeType} with ${trunkCount} trunk blocks → ${trunkCount}x multiplier = ${staminaCost} stamina cost`);
                }
            }
            
            // Check if player has enough stamina
            if (this.staminaSystem && this.staminaSystem.currentStamina < staminaCost) {
                this.updateStatus(`Too exhausted to harvest! (Need ${staminaCost} stamina, have ${Math.floor(this.staminaSystem.currentStamina)})`);
                return;
            }

            // Start new harvesting
            this.isHarvesting = true;
            this.harvestingTarget = { x, y, z, blockType: blockData.type, staminaCost }; // Store cost for completion
            this.harvestingStartTime = Date.now();
            this.harvestingDuration = harvestTime;

            console.log(`Starting to harvest ${blockData.type} (${harvestTime}ms, costs ${staminaCost} stamina)`);
            this.updateStatus(`Harvesting ${blockData.type}... (${(harvestTime/1000).toFixed(1)}s, -${staminaCost} stamina)`);
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
                const { x, y, z, blockType, staminaCost } = this.harvestingTarget;
                
                // ⚡ STAMINA: Drain stamina for harvesting action
                if (this.staminaSystem && staminaCost) {
                    this.staminaSystem.currentStamina = Math.max(0, this.staminaSystem.currentStamina - staminaCost);
                    this.staminaSystem.updateStaminaDisplay();
                    console.log(`⚡ Harvesting drained ${staminaCost} stamina (${Math.floor(this.staminaSystem.currentStamina)}/${this.staminaSystem.maxStamina} remaining)`);
                }
                
                this.completeHarvesting(x, y, z);
            } else {
                // Update progress display (silently - no console spam)
                const remaining = ((this.harvestingDuration - elapsed) / 1000).toFixed(1);
                // Only update status bar, no console log
            }
        };

        // Complete harvesting and remove block
        this.completeHarvesting = (x, y, z) => {
            // Silent completion - only log errors
            // console.log(`Harvesting completed at ${x}, ${y}, ${z}`);

            // Get block type before removing it
            const key = `${x},${y},${z}`;
            const blockData = this.world[key];

            // console.log('Block data:', blockData); // Debug logging

            if (blockData && blockData.type !== 'shrub' && blockData.type !== 'backpack') {
                // Add the harvested block to inventory
                const blockType = blockData.type;

                // Debug: Check what we're actually harvesting
                // console.log(`Block at ${key}:`, {
                //     type: blockType,
                //     playerPlaced: blockData.playerPlaced,
                //     blockData: blockData
                // });

                // 🌾 CROP HARVESTING: Check if we're harvesting a mature crop (check FIRST!)
                if (this.farmingSystem) {
                    const cropBlockData = this.farmingSystem.getFarmingBlockTypes()[blockType];
                    if (cropBlockData && cropBlockData.harvestable) {
                        // Use FarmingSystem's harvest logic for proper yields
                        const success = this.farmingSystem.harvestCrop(x, y, z);
                        if (success) {
                            // Don't call removeBlock - FarmingSystem already handles it
                            this.stopHarvesting();
                            return; // Exit early - FarmingSystem handled everything
                        }
                    }
                }

                // 🎁 GIFT BOX HARVESTING: Christmas gift boxes drop random ToolBench items
                if (blockType === 'gift_wrapped') {
                    // Get random ToolBench item from ChristmasSystem
                    const lootItem = this.christmasSystem.getRandomGiftLoot();
                    this.inventory.addToInventory(lootItem, 1);

                    console.log(`🎁 Opened gift box and received ${lootItem}!`);
                    this.updateStatus(`🎁 Gift opened! Received ${lootItem}!`, 'discover');
                }
                // 🔪 MACHETE LEAF HARVESTING: Check if we're harvesting leaves with machete
                else if (this.isLeafBlock(blockType)) {
                    const hasMachete = this.hasTool('machete');

                    if (hasMachete) {
                        // Machete allows leaf collection
                        this.inventory.addToInventory(blockType, 1);
                        // console.log(`🔪 Machete harvested ${blockType}!`);

                        const emoji = this.getItemIcon(blockType, 'status');
                        this.updateStatus(`🔪${emoji} Machete harvested ${blockType}!`, 'harvest');
                    } else {
                        // No machete - leaves just disappear
                        // console.log(`${blockType} destroyed (need machete to collect)`);
                        this.updateStatus(`🍃 ${blockType} destroyed (need machete to collect)`, 'harvest');
                    }
                } else {
                    // Regular block harvesting
                    this.inventory.addToInventory(blockType, 1);
                    // console.log(`Harvested ${blockType}!`);

                    // Use enhanced notification system with harvest type
                    const emoji = this.getItemIcon(blockType, 'status');
                    this.updateStatus(`${emoji} Harvested ${blockType}!`, 'harvest');
                }

                // 🎯 PHASE 3: Revolutionary tree physics - Check if we just chopped a tree base!
                if (this.isWoodBlock(blockType)) {
                    this.checkTreeFalling(x, y, z);
                }
            } else if (!blockData) {
                console.log(`No block data found at ${key}`);
            } else {
                console.log(`Skipping special block type: ${blockData.type}`);
            }

            this.removeBlock(x, y, z); // Use existing removal logic
            this.stopHarvesting();
        };

        // 🧹 GLOBAL UTILITY: Clear all data and reload
        // Can be called from browser console: clearAllData()
        window.clearAllData = () => {
            console.log('🧹 Clearing all localStorage and IndexedDB data...');
            localStorage.clear(); // This includes campfire respawn data
            indexedDB.deleteDatabase('VoxelWorld').onsuccess = () => {
                console.log('✅ All data cleared (including campfire respawn)! Reloading page...');
                location.reload();
            };
        };

        // 🧨 NUCLEAR OPTION: Clear absolutely everything (RAM caches, disk caches, localStorage, IndexedDB, worker caches)
        window.nuclearClear = () => {
            console.log('🧨💥 NUCLEAR CLEAR - WIPING EVERYTHING...');

            // 1. Clear all localStorage (includes campfire respawn)
            console.log('🧹 Clearing localStorage (including campfire respawn)...');
            localStorage.clear();

            // 2. Clear all sessionStorage
            console.log('🧹 Clearing sessionStorage...');
            sessionStorage.clear();

            // 3. Clear RAM chunk cache if it exists
            if (this.workerManager && this.workerManager.cache) {
                console.log('🧹 Clearing RAM chunk cache...');
                this.workerManager.cache.clear();
            }

            // 4. Clear BiomeWorldGen cache
            if (this.biomeWorldGen) {
                console.log('🧹 Clearing BiomeWorldGen cache...');
                this.biomeWorldGen.clearCache();
            }

            // 5. Clear worker cache (send message to worker)
            if (this.workerManager && this.workerManager.worker) {
                console.log('🧹 Clearing Web Worker cache...');
                this.workerManager.worker.postMessage({ type: 'CLEAR_CACHE' });
            }

            // 6. Clear all IndexedDB databases
            console.log('🧹 Clearing IndexedDB databases...');
            indexedDB.deleteDatabase('VoxelWorld').onsuccess = () => {
                console.log('✅ VoxelWorld database deleted');
            };
            indexedDB.deleteDatabase('ChunkPersistence').onsuccess = () => {
                console.log('✅ ChunkPersistence database deleted');
            };

            // 7. Clear in-memory world data
            if (this.world) {
                console.log('🧹 Clearing in-memory world data...');
                this.world = {};
            }

            // 8. Clear loaded chunks tracking
            if (this.loadedChunks) {
                console.log('🧹 Clearing loaded chunks set...');
                this.loadedChunks.clear();
            }

            // 9. Clear tree caches
            if (this.treeCache) {
                console.log('🧹 Clearing tree cache...');
                this.treeCache.clear();
            }
            if (this.treePositions) {
                console.log('🧹 Clearing tree positions...');
                this.treePositions = [];
            }

            // 10. Clear pumpkin and world item positions
            if (this.pumpkinPositions) {
                console.log('🧹 Clearing pumpkin positions...');
                this.pumpkinPositions = [];
            }
            if (this.worldItemPositions) {
                console.log('🧹 Clearing world item positions...');
                this.worldItemPositions = [];
            }

            // 11. Stop and dispose music
            if (this.musicSystem) {
                console.log('🧹 Stopping music...');
                this.musicSystem.dispose();
            }

            console.log('🧨💥 NUCLEAR CLEAR COMPLETE! Reloading page in 1 second...');
            setTimeout(() => {
                location.reload(true); // Hard reload (bypass cache)
            }, 1000);
        };

        // 🎮 PLAYER NEW GAME: Safe new game with confirmation modal
        window.playerNewGameClean = () => {
            // Create themed confirmation modal
            const modal = document.createElement('div');
            modal.className = 'voxel-modal-overlay';
            modal.style.zIndex = '10000'; // Above everything

            modal.innerHTML = `
                <div class="voxel-modal character-creation-modal" style="max-width: 500px;">
                    <div class="modal-header">
                        <h2>🎮 Start New Game</h2>
                        <p class="subtitle">This action cannot be undone</p>
                    </div>

                    <div class="modal-body">
                        <div class="info-box" style="background: #fff3cd; border-color: #ffc107; color: #856404;">
                            <p><strong>⚠️ Warning: All Progress Will Be Lost</strong></p>
                            <p>Starting a new game will permanently delete:</p>
                            <ul style="margin: 10px 0; padding-left: 20px;">
                                <li>Your current world and all placed blocks</li>
                                <li>All inventory items and crafted tools</li>
                                <li>Companion progress and equipment</li>
                                <li>Campfire respawn points</li>
                                <li>All discovered locations</li>
                            </ul>
                            <p style="margin-top: 15px;"><strong>📋 Development Build Note:</strong></p>
                            <p style="margin-bottom: 0;">This is a development build. Advanced save file management (multiple saves, campfire-based saves) will be available in future updates.</p>
                        </div>
                    </div>

                    <div class="modal-footer" style="justify-content: space-between;">
                        <button class="btn btn-secondary" id="new-game-cancel">Cancel</button>
                        <button class="btn btn-primary" id="new-game-confirm" style="background: #dc3545;">Yes, Start New Game</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Handle cancel
            modal.querySelector('#new-game-cancel').addEventListener('click', () => {
                console.log('🎮 New game cancelled by player');
                modal.remove();
            });

            // Handle confirm
            modal.querySelector('#new-game-confirm').addEventListener('click', () => {
                console.log('🎮 New game confirmed! Calling nuclearClear()...');
                modal.remove();
                window.nuclearClear(); // Reuse existing nuclear clear logic
            });

            // Close on overlay click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    console.log('🎮 New game cancelled (clicked outside)');
                    modal.remove();
                }
            });
        };

        // 🧹 CACHE CLEAR: Clear all caches but keep saved games
        window.clearCaches = () => {
            console.log('🧹 CLEARING CACHES (preserving saved games)...');

            // 1. Clear sessionStorage (temporary data only)
            console.log('🧹 Clearing sessionStorage...');
            sessionStorage.clear();

            // 2. Clear RAM chunk cache if it exists
            if (this.workerManager && this.workerManager.cache) {
                console.log('🧹 Clearing RAM chunk cache...');
                this.workerManager.cache.clear();
            }

            // 3. Clear BiomeWorldGen cache
            if (this.biomeWorldGen) {
                console.log('🧹 Clearing BiomeWorldGen cache...');
                this.biomeWorldGen.clearCache();
            }

            // 4. Clear worker cache (send message to worker)
            if (this.workerManager && this.workerManager.worker) {
                console.log('🧹 Clearing Web Worker cache...');
                this.workerManager.worker.postMessage({ type: 'CLEAR_CACHE' });
            }

            // 5. Clear ChunkPersistence IndexedDB (terrain cache) but keep VoxelWorld (saved games)
            console.log('🧹 Clearing ChunkPersistence database (terrain cache)...');
            indexedDB.deleteDatabase('ChunkPersistence').onsuccess = () => {
                console.log('✅ ChunkPersistence database deleted');
            };

            // 6. Clear performance benchmarks (not game data)
            console.log('🧹 Clearing performance benchmarks...');
            localStorage.removeItem('voxelWorld_performanceBenchmark');
            localStorage.removeItem('voxelWorld_renderDistancePref');

            // 7. Clear tutorial flags (you can see tutorials again)
            console.log('🧹 Clearing tutorial flags...');
            localStorage.removeItem('voxelworld_workbench_tutorial_seen');

            // 8. Clear campfire respawn point (temporary data)
            console.log('🧹 Clearing campfire respawn point...');
            localStorage.removeItem('NebulaWorld_respawnCampfire');

            console.log('🧹✅ CACHE CLEAR COMPLETE! Reloading page in 1 second...');
            console.log('💾 Your saved game (NebulaWorld) has been preserved!');
            setTimeout(() => {
                location.reload(true); // Hard reload (bypass browser cache)
            }, 1000);
        };

        // commented out due to console spam -- brad
        // console.log('💡 Utility available: clearAllData() - clears localStorage + IndexedDB and reloads');
        // console.log('💡 Utility available: clearCaches() - 🧹 clears caches but KEEPS saved games');
        // console.log('💡 Utility available: nuclearClear() - 🧨 WIPES EVERYTHING (RAM, disk, caches, workers)');
        // console.log('💡 Utility available: unlockUI() - 🔓 unlocks hotbar, backpack, companion, and workbench');

        // 🎁 DEBUG UTILITY: Give item to inventory
        // Can be called from browser console: giveItem("stone_hammer")
        /**
         * 🔓 Unlock UI elements (hotbar, backpack, companion, workbench)
         * Called automatically by giveItem() for testing convenience
         */
        this.unlockUI = () => {
            if (this.hasBackpack) {
                console.log('🔓 UI already unlocked');
                return;
            }

            console.log('🔓 Unlocking UI elements...');

            this.hasBackpack = true; // Mark backpack as found
            this.backpackPosition = null; // Remove from minimap
            this.generateBackpackLoot(); // Add random starting items
            this.showHotbarTutorial(); // Show hotbar and tutorial
            this.showToolButtons(); // Show tool menu buttons

            // Show backpack tutorial for first-time players
            if (this.tutorialSystem) {
                this.tutorialSystem.onBackpackOpened();
            }

            // 🖼️ Create companion portrait after backpack found
            if (this.companionPortrait) {
                this.companionPortrait.create();
            }

            console.log('✅ UI unlocked! Hotbar, backpack, companion, and workbench are now available.');
            this.updateStatus('🔓 Debug: UI unlocked! All systems ready.', 'success');
        };

        // Make unlockUI() globally accessible for testing
        window.unlockUI = () => this.unlockUI();

        window.giveItem = (itemName, quantity = 1) => {
            // Auto-unlock UI if not already unlocked (for testing convenience)
            if (!this.hasBackpack) {
                this.unlockUI();
            }

            // 🔧 AUTO-ADD "crafted_" PREFIX for craftable tools
            const craftableTools = [
                'grappling_hook', 'speed_boots', 'combat_sword', 'mining_pick',
                'stone_hammer', 'magic_amulet', 'compass', 'compass_upgrade',
                'club', 'stone_spear', 'torch', 'wood_shield',
                'hoe', 'watering_can', 'healing_potion', 'light_orb', 'simple_house'
            ];

            // If user types a craftable tool name WITHOUT "crafted_" prefix, auto-add it
            if (craftableTools.includes(itemName)) {
                itemName = `crafted_${itemName}`;
                console.log(`🔧 Auto-converted to: ${itemName}`);
            }

            // Valid items - comprehensive list of all discovery items, tools, and crafted items
            const validItems = [
                // 🌍 Discovery/Exploring items (treasure items)
                'skull', 'mushroom', 'flower', 'berry', 'leaf',
                'crystal', 'oreNugget', 'wheat', 'feather', 'bone',
                'shell', 'fur', 'iceShard',
                'rustySword', 'oldPickaxe', 'ancientAmulet',

                // 🔧 Base tools and materials
                'stone', 'stick', 'iron', 'gold', 'coal',
                'machete', 'stone_hammer', 'compass', 'compass_upgrade',
                'grappling_hook', 'speed_boots', 'combat_sword', 'mining_pick',
                'magic_amulet', 'club', 'stone_spear', 'torch', 'wood_shield',

                // � Farming items
                'hoe', 'watering_can', 'wheat_seeds', 'carrot_seeds', 'pumpkin_seeds', 'berry_seeds',
                'carrot', 'rice', 'corn_ear',

                // 🍖 Companion Hunt ingredients (rare)
                'egg', 'fish', 'honey', 'apple',

                // �🏗️ Workbench/ToolBench items
                'workbench', 'backpack', 'tool_bench',

                // 🎨 Crafted items (with crafted_ prefix) - allow any starting with 'crafted_'
                'crafted_grappling_hook', 'crafted_speed_boots', 'crafted_combat_sword',
                'crafted_mining_pick', 'crafted_stone_hammer', 'crafted_magic_amulet',
                'crafted_compass', 'crafted_compass_upgrade', 'crafted_machete',
                'crafted_club', 'crafted_stone_spear', 'crafted_torch', 'crafted_wood_shield',
                'crafted_backpack_upgrade_1', 'crafted_backpack_upgrade_2',
                'crafted_healing_potion', 'crafted_light_orb'
            ];

            // Check if item is valid or starts with 'crafted_'
            if (!validItems.includes(itemName) && !itemName.startsWith('crafted_')) {
                console.error(`❌ Invalid item: "${itemName}"`);
                console.log('%c📋 Valid Discovery Items:', 'font-weight: bold; color: #FF9800;');
                console.log('  skull, mushroom, flower, berry, leaf, crystal, oreNugget, wheat');
                console.log('  feather, bone, shell, fur, iceShard, rustySword, oldPickaxe, ancientAmulet');
                console.log('%c🔧 Valid Tools:', 'font-weight: bold; color: #2196F3;');
                console.log('  stone, stick, iron, gold, coal, machete, stone_hammer, compass');
                console.log('  grappling_hook, speed_boots, combat_sword, mining_pick, magic_amulet');
                console.log('  club, stone_spear, torch, wood_shield');
                console.log('%c� Valid Farming Items:', 'font-weight: bold; color: #8BC34A;');
                console.log('  hoe, wheat_seeds, carrot_seeds, pumpkin_seeds, berry_seeds');
                console.log('  carrot, rice, corn_ear');
                console.log('%c🍖 Companion Hunt Items:', 'font-weight: bold; color: #FF5722;');
                console.log('  egg, fish, honey, apple');
                console.log('%c�🎨 Valid Crafted Items:', 'font-weight: bold; color: #9C27B0;');
                console.log('  Any tool with "crafted_" prefix (e.g., crafted_grappling_hook)');
                console.log('  Or use the tools list above with crafted_ prefix');
                return;
            }

            // Add to inventory
            const added = this.inventory.addToInventory(itemName, quantity);
            if (added > 0) {
                // Get the icon for visual feedback
                const icon = this.getItemIcon(itemName, 'status');
                const displayName = this.formatItemName(itemName);
                
                console.log(`✅ Gave ${added}x ${itemName}`);
                this.updateStatus(`🎁 Debug: Gave ${added}x ${icon} ${displayName}`, 'success');
                
                // Update hotbar to show the new item with icon
                this.updateHotbarCounts();
            } else {
                console.warn(`⚠️ Could not add ${itemName} - inventory might be full`);
            }
        };

        // 📦 DEBUG UTILITY: Give block to inventory
        // Can be called from browser console: giveBlock("stone", 64)
        window.giveBlock = (blockName, quantity = 1) => {
            // Get valid blocks from blockTypes
            const validBlocks = Object.keys(this.blockTypes);

            if (!validBlocks.includes(blockName)) {
                console.error(`❌ Invalid block: "${blockName}"`);
                console.log('Valid blocks:', validBlocks.join(', '));
                return;
            }

            // Add to inventory
            const added = this.inventory.addToInventory(blockName, quantity);
            if (added > 0) {
                console.log(`✅ Gave ${added}x ${blockName}`);
                this.updateStatus(`🎁 Debug: Gave ${added}x ${blockName}`, 'success');
            } else {
                console.warn(`⚠️ Could not add all ${blockName} blocks - inventory might be full (added ${added}/${quantity})`);
            }
        };

        // 📋 LIST ITEMS UTILITY: Show all available items organized by category
        // Can be called from browser console: listItems()
        window.listItems = () => {
            console.log('%c� All Available Items for giveItem() Command', 'font-size: 16px; font-weight: bold; color: #4CAF50;');
            console.log('');
            
            console.log('%c🌍 Discovery Items (Find in the world):', 'font-weight: bold; color: #FF9800;');
            console.log('  Desert: skull, sand');
            console.log('  Forest: mushroom, flower, berry, leaf');
            console.log('  Mountain: crystal, oreNugget');
            console.log('  Plains: wheat, feather, bone');
            console.log('  Tundra: fur, iceShard');
            console.log('  Rare (any biome): rustySword, oldPickaxe, ancientAmulet');
            console.log('');
            
            console.log('%c🔧 Base Tools & Materials:', 'font-weight: bold; color: #2196F3;');
            console.log('  Materials: stone, stick, iron, gold, coal');
            console.log('  Basic Tools: machete, stone_hammer');
            console.log('  Navigation: compass, compass_upgrade');
            console.log('  Movement: grappling_hook, speed_boots');
            console.log('  Combat: combat_sword, mining_pick, club, stone_spear, wood_shield');
            console.log('  Magic: magic_amulet');
            console.log('  Utility: torch');
            console.log('');
            
            console.log('%c🏗️ Workbench Items:', 'font-weight: bold; color: #795548;');
            console.log('  workbench, tool_bench, backpack');
            console.log('');
            
            console.log('%c� Farming Items:', 'font-weight: bold; color: #8BC34A;');
            console.log('  Tools: hoe, watering_can');
            console.log('  Seeds: wheat_seeds, carrot_seeds, pumpkin_seeds, berry_seeds');
            console.log('  Harvested: carrot, rice, corn_ear');
            console.log('');
            
            console.log('%c🍖 Companion Hunt Items (Rare):', 'font-weight: bold; color: #FF5722;');
            console.log('  egg, fish, honey, apple');
            console.log('  (Companions find these during hunts)');
            console.log('');
            
            console.log('%c�🎨 Crafted Items (use crafted_ prefix):', 'font-weight: bold; color: #9C27B0;');
            console.log('  crafted_grappling_hook, crafted_speed_boots');
            console.log('  crafted_combat_sword, crafted_mining_pick, crafted_stone_hammer');
            console.log('  crafted_magic_amulet, crafted_compass, crafted_compass_upgrade');
            console.log('  crafted_machete, crafted_club, crafted_stone_spear');
            console.log('  crafted_torch, crafted_wood_shield');
            console.log('  crafted_backpack_upgrade_1, crafted_backpack_upgrade_2');
            console.log('  crafted_healing_potion, crafted_light_orb');
            console.log('  crafted_hoe, crafted_watering_can');
            console.log('');
            
            console.log('%c💡 Usage Examples:', 'font-weight: bold; color: #FFC107;');
            console.log('  giveItem("crystal", 5)          - Give 5 crystals');
            console.log('  giveItem("crafted_grappling_hook", 1) - Give grappling hook');
            console.log('  giveItem("rustySword", 1)       - Give rusty sword');
            console.log('');
            
            return '✅ Item list displayed above ⬆️';
        };

        // 🌱 DEBUG UTILITY: Grow crop to next stage (like bonemeal!)
        window.growCrop = () => {
            // Use same raycaster method as "I" key (block inspector)
            this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
            const intersects = this.raycaster.intersectObjects(this.scene.children.filter(obj => obj.isMesh && obj !== this.targetHighlight));

            if (intersects.length === 0) {
                console.log('❌ Not looking at any block (aim at crop and run growCrop())');
                return;
            }

            const hit = intersects[0];
            const pos = hit.object.position;
            const x = pos.x;
            const y = pos.y;
            const z = pos.z;

            const cropInfo = this.farmingSystem?.cropGrowthManager?.getCropInfo(x, y, z);
            if (!cropInfo) {
                console.log(`❌ No crop at (${x}, ${y}, ${z})`);
                return;
            }

            if (cropInfo.stage >= 3) {
                console.log('🌾 Crop is already fully grown!');
                return;
            }

            // Force grow to next stage
            cropInfo.stage++;

            // Find the block type for this new stage
            const stageBlocks = {
                wheat: ['wheat_stage1', 'wheat_stage2', 'wheat_stage3'],
                carrot: ['carrot_stage1', 'carrot_stage2', 'carrot_stage3'],
                pumpkin: ['pumpkin_stage1', 'pumpkin_stage2', 'pumpkin_stage3'],
                berry: ['berry_bush_stage1', 'berry_bush_stage2', 'berry_bush_stage3']
            };

            const newBlockType = stageBlocks[cropInfo.cropType][cropInfo.stage - 1];
            this.setBlock(x, y, z, newBlockType);

            // Update 3D model
            if (this.farmingSystem) {
                this.farmingSystem.create3DCropModel(x, y, z, cropInfo.cropType, cropInfo.stage);
            }

            this.updateStatus(`🌱 Crop grew to stage ${cropInfo.stage}/3!`, 'craft');
            console.log(`🌱 Grew ${cropInfo.cropType} to stage ${cropInfo.stage} at (${x}, ${y}, ${z})`);
        };

        console.log('�💡 Debug utilities available:');
        console.log('  giveItem("stone_hammer") - adds item to inventory');
        console.log('  giveBlock("stone", 64) - adds blocks to inventory');
        console.log('  listItems() - show all available items');
        console.log('  growCrop() - grow crop at crosshair to next stage (aim at crop first)');
        console.log('  makeRuins("small", "lshape") - generates test ruin near player');
        console.log('    Sizes: small, medium, large, colossal');
        console.log('    Shapes: square, rectangle, lshape, tshape, cross, ushape, circle');
        console.log('  clearSeed() - clears saved seed and generates new random world on refresh');
        console.log('  setSeed(12345) - sets a specific seed for the world');
        console.log('  Type showCommands() to see all available commands');

        // 📋 HELP UTILITY: Show all available commands
        // Can be called from browser console: showCommands()
        window.showCommands = () => {
            console.log('%c🎮 VoxelWorld Console Commands', 'font-size: 16px; font-weight: bold; color: #4CAF50;');
            console.log('');
            
            console.log('%c📦 Item & Block Commands:', 'font-weight: bold; color: #2196F3;');
            console.log('  giveItem("name", quantity)     - Add item to inventory');
            console.log('    Examples: giveItem("stone_hammer"), giveItem("workbench", 5)');
            console.log('    Type listItems() to see all available items');
            console.log('');
            console.log('  giveBlock("name", quantity)    - Add blocks to inventory');
            console.log('    Examples: giveBlock("stone", 64), giveBlock("dirt", 100)');
            console.log('');
            console.log('  listItems()                    - Show all available items organized by category');
            console.log('');
            
            console.log('%c🏛️ World Generation Commands:', 'font-weight: bold; color: #FF9800;');
            console.log('  makeRuins("size")              - Generate test ruin near player');
            console.log('    Sizes: "small", "medium", "large", "colossal"');
            console.log('    Example: makeRuins("large")');
            console.log('');
            
            console.log('%c🌍 Seed Commands:', 'font-weight: bold; color: #9C27B0;');
            console.log('  setSeed(number)                - Set world seed (requires refresh)');
            console.log('    Example: setSeed(12345)');
            console.log('');
            console.log('  clearSeed()                    - Clear seed, generate random world (requires refresh)');
            console.log('');
            
            console.log('%c🧹 Cleanup Commands:', 'font-weight: bold; color: #F44336;');
            console.log('  clearCaches()                  - Clear caches but KEEP saved games');
            console.log('    ✅ Safe - preserves your world data');
            console.log('');
            console.log('  clearAllData()                 - Clear localStorage + IndexedDB, reload');
            console.log('    ⚠️  Deletes saved games!');
            console.log('');
            console.log('  nuclearClear()                 - 🧨 WIPE EVERYTHING (RAM, disk, all caches)');
            console.log('    ☢️  NUCLEAR OPTION - removes all data and hard reloads');
            console.log('');
            
            console.log('%c📋 Help Commands:', 'font-weight: bold; color: #607D8B;');
            console.log('  showCommands()                 - Show this help (you just ran it!)');
            console.log('');
            
            console.log('%c💡 Tips:', 'font-weight: bold; color: #FFC107;');
            console.log('  • Press F12 to open console');
            console.log('  • Type command exactly as shown (case-sensitive)');
            console.log('  • Use quotes for string parameters: "stone_hammer"');
            console.log('  • Commands that modify world require page refresh');
            console.log('  • Current seed logged at page load: check console');
            console.log('');
            
            return '📋 Command list displayed above ⬆️';
        };

        // 🏛️ DEBUG UTILITY: Generate test ruin near player
        // Can be called from browser console: makeRuins("medium", "lshape")
        window.makeRuins = (size = "small", shape = "square") => {
            if (!this.biomeWorldGen || !this.biomeWorldGen.structureGenerator) {
                console.error('❌ Structure generator not available');
                return;
            }

            const playerX = Math.floor(this.player.position.x);
            const playerY = Math.floor(this.player.position.y);
            const playerZ = Math.floor(this.player.position.z);

            const biome = this.biomeWorldGen.getBiomeAt(playerX, playerZ, this.worldSeed);

            this.biomeWorldGen.structureGenerator.debugGenerateRuin(
                size,
                shape,
                playerX,
                playerY,
                playerZ,
                (x, y, z, type, playerPlaced, color) => this.addBlock(x, y, z, type, playerPlaced, color),
                (x, z) => this.biomeWorldGen.findGroundHeight(x, z),
                biome.name
            );

            const shapeName = this.biomeWorldGen.structureGenerator.SHAPES[shape]?.name || shape;
            this.updateStatus(`🏛️ Generated ${size} ${shapeName} near you!`, 'success');
        };

        // 🌱 DEBUG UTILITY: Clear saved seed
        // Can be called from browser console: clearSeed()
        window.clearSeed = () => {
            localStorage.removeItem('voxelWorld_debugSeed');
            localStorage.removeItem('voxelWorld_seed');
            console.log('✅ Seed cleared! Refresh page to generate new random world.');
            this.updateStatus('🌱 Seed cleared! Refresh to generate new world.', 'success');
        };

        // 🎲 DEBUG UTILITY: Set specific seed
        // Can be called from browser console: setSeed(12345)
        window.setSeed = (newSeed) => {
            if (typeof newSeed !== 'number') {
                console.error('❌ Seed must be a number');
                return;
            }
            localStorage.setItem('voxelWorld_debugSeed', newSeed.toString());
            console.log(`✅ Seed set to ${newSeed}! Refresh page to apply.`);
            this.updateStatus(`🎲 Seed set to ${newSeed}! Refresh to apply.`, 'success');
        };

        // 🧪 DEBUG MODE: Set to true during development to persist seed across reloads
        // ⚠️ IMPORTANT: Set to false before production release!
        const USE_DEBUG_SEED = true;
        const DEBUG_SEED = 12345; // Fixed seed for consistent testing

        // Initialize seed system - persist across reloads
        let storedSeed = null;
        if (USE_DEBUG_SEED) {
            storedSeed = localStorage.getItem('voxelWorld_debugSeed');
        } else {
            storedSeed = localStorage.getItem('voxelWorld_seed');
        }

        if (storedSeed) {
            this.worldSeed = parseInt(storedSeed, 10);
            console.log(`🌍 Loaded persistent world seed: ${this.worldSeed}${USE_DEBUG_SEED ? ' (DEBUG MODE)' : ''}`);
        } else {
            if (USE_DEBUG_SEED) {
                this.worldSeed = DEBUG_SEED;
                localStorage.setItem('voxelWorld_debugSeed', this.worldSeed.toString());
                console.log(`🧪 DEBUG MODE: Using fixed seed: ${this.worldSeed}`);
            } else {
                this.worldSeed = this.generateInitialSeed();
                localStorage.setItem('voxelWorld_seed', this.worldSeed.toString());
                console.log(`🌍 Generated new world seed: ${this.worldSeed}`);
            }
        }
        this.seededRandom = this.createSeededRandom(this.worldSeed);

        // Hardware performance benchmark
        // Hardware performance benchmark - DUAL MODE SYSTEM
        this.runPerformanceBenchmark = async () => {
            const benchmarkKey = 'voxelWorld_performanceBenchmark';
            const gpuPreference = localStorage.getItem('voxelWorld_gpuPreference') || 'low-power';
            const storedResult = localStorage.getItem(benchmarkKey);

            // Check if we have a valid cached benchmark for current GPU mode
            if (storedResult) {
                const result = JSON.parse(storedResult);
                // Only use cached result if it matches current GPU preference
                if (result.gpuMode === gpuPreference) {
                    this.renderDistance = result.renderDistance;
                    this.updateStatus(`Performance benchmark loaded: Render distance ${this.renderDistance} (${gpuPreference} mode)`);
                    return;
                }
                // If GPU mode changed, re-run benchmark
                console.log(`🎮 GPU mode changed from ${result.gpuMode} to ${gpuPreference}, re-running benchmark...`);
            }

            // 🎮 Choose benchmark based on GPU preference
            if (gpuPreference === 'high-performance') {
                return await this.runHighPerformanceBenchmark();
            } else {
                return await this.runLowPowerBenchmark();
            }
        };

        // 🔋 LOW POWER BENCHMARK - Conservative thresholds for iGPU
        this.runLowPowerBenchmark = async () => {
            const benchmarkKey = 'voxelWorld_performanceBenchmark';
            this.updateStatus('Running low-power benchmark (iGPU optimized)...');

            // Smaller test scene for iGPU
            const testBlockPositions = [];
            const testSize = 8; // 8x8x8 test area (same as before)
            const testOffset = 1000;

            for (let x = -testSize/2; x < testSize/2; x++) {
                for (let y = 0; y < 4; y++) {
                    for (let z = -testSize/2; z < testSize/2; z++) {
                        const worldX = x + testOffset;
                        const worldY = y + 100;
                        const worldZ = z + testOffset;
                        this.addBlock(worldX, worldY, worldZ, 'stone', false);
                        testBlockPositions.push({x: worldX, y: worldY, z: worldZ});
                    }
                }
            }

            const frames = [];
            const startTime = performance.now();
            let frameCount = 0;

            return new Promise((resolve) => {
                const measureFrame = () => {
                    const currentTime = performance.now();
                    frameCount++;

                    if (currentTime - startTime >= 2000) {
                        const avgFPS = frameCount / ((currentTime - startTime) / 1000);
                        frames.push(avgFPS);

                        testBlockPositions.forEach(pos => {
                            this.removeBlock(pos.x, pos.y, pos.z, false);
                        });

                        const finalAvgFPS = frames.reduce((a, b) => a + b) / frames.length;
                        let renderDistance;

                        // 🔋 CONSERVATIVE THRESHOLDS - Better for iGPU
                        if (finalAvgFPS >= 45) renderDistance = 3;      // Very smooth iGPU
                        else if (finalAvgFPS >= 30) renderDistance = 2; // Smooth iGPU (most common)
                        else if (finalAvgFPS >= 20) renderDistance = 1; // Playable iGPU
                        else renderDistance = 1;                        // Minimum playable

                        const result = {
                            avgFPS: Math.round(finalAvgFPS),
                            renderDistance: renderDistance,
                            gpuMode: 'low-power',
                            timestamp: Date.now()
                        };
                        localStorage.setItem(benchmarkKey, JSON.stringify(result));

                        this.renderDistance = renderDistance;
                        this.updateFog(); // Update fog for new render distance
                        this.updateStatus(`Low-power benchmark complete: ${Math.round(avgFPS)} FPS, Render distance: ${renderDistance}`);
                        console.log('🔋 iGPU Benchmark Result:', result);
                        resolve(result);
                    } else {
                        requestAnimationFrame(measureFrame);
                    }
                };

                requestAnimationFrame(measureFrame);
            });
        };

        // ⚡ HIGH PERFORMANCE BENCHMARK - Aggressive thresholds for dGPU
        this.runHighPerformanceBenchmark = async () => {
            const benchmarkKey = 'voxelWorld_performanceBenchmark';
            this.updateStatus('Running high-performance benchmark (dGPU optimized)...');

            // Larger test scene for dGPU
            const testBlockPositions = [];
            const testSize = 10; // 10x10x10 test area (more demanding)
            const testOffset = 1000;

            for (let x = -testSize/2; x < testSize/2; x++) {
                for (let y = 0; y < 5; y++) { // More vertical layers
                    for (let z = -testSize/2; z < testSize/2; z++) {
                        const worldX = x + testOffset;
                        const worldY = y + 100;
                        const worldZ = z + testOffset;
                        this.addBlock(worldX, worldY, worldZ, 'stone', false);
                        testBlockPositions.push({x: worldX, y: worldY, z: worldZ});
                    }
                }
            }

            const frames = [];
            const startTime = performance.now();
            let frameCount = 0;

            return new Promise((resolve) => {
                const measureFrame = () => {
                    const currentTime = performance.now();
                    frameCount++;

                    if (currentTime - startTime >= 2000) {
                        const avgFPS = frameCount / ((currentTime - startTime) / 1000);
                        frames.push(avgFPS);

                        testBlockPositions.forEach(pos => {
                            this.removeBlock(pos.x, pos.y, pos.z, false);
                        });

                        const finalAvgFPS = frames.reduce((a, b) => a + b) / frames.length;
                        let renderDistance;

                        // ⚡ AGGRESSIVE THRESHOLDS - Push dGPU to limits
                        if (finalAvgFPS >= 55) renderDistance = 4;      // Ultra high-end (RTX 4060+)
                        else if (finalAvgFPS >= 45) renderDistance = 3; // High-end dGPU
                        else if (finalAvgFPS >= 30) renderDistance = 2; // Mid-range dGPU
                        else if (finalAvgFPS >= 15) renderDistance = 1; // Low-end dGPU
                        else renderDistance = 1;                        // Minimum playable

                        const result = {
                            avgFPS: Math.round(finalAvgFPS),
                            renderDistance: renderDistance,
                            gpuMode: 'high-performance',
                            timestamp: Date.now()
                        };
                        localStorage.setItem(benchmarkKey, JSON.stringify(result));

                        this.renderDistance = renderDistance;
                        this.updateFog(); // Update fog for new render distance
                        this.updateStatus(`High-performance benchmark complete: ${Math.round(avgFPS)} FPS, Render distance: ${renderDistance}`);
                        console.log('⚡ dGPU Benchmark Result:', result);
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

                // Regular mesh - use object position
                this.targetHighlight.position.copy(hit.object.position);

                // 🏠 Check if simple_house is selected in hotbar to show footprint
                const selectedSlot = this.hotbarSystem?.getSelectedSlot();
                const isHouseSelected = selectedSlot && selectedSlot.itemType && selectedSlot.itemType.includes('simple_house');
                
                // Track last selection to avoid recreating geometry every frame
                if (!this.lastReticleState) {
                    this.lastReticleState = { isHouse: false, length: 0, width: 0 };
                }
                
                if (isHouseSelected) {
                    // Get house dimensions from workbench or use defaults
                    const interiorLength = this.workbenchSystem?.selectedShape === 'simple_house' 
                        ? (this.workbenchSystem.shapeLength || 4)
                        : 4;
                    const interiorWidth = this.workbenchSystem?.selectedShape === 'simple_house' 
                        ? (this.workbenchSystem.shapeWidth || 4)
                        : 4;
                    
                    // Calculate FULL exterior dimensions (interior + 2 walls)
                    const exteriorLength = interiorLength + 2;  // +1 wall each side
                    const exteriorWidth = interiorWidth + 2;    // +1 wall each side
                    
                    // Only recreate geometry if dimensions changed
                    if (!this.lastReticleState.isHouse || 
                        this.lastReticleState.length !== exteriorLength || 
                        this.lastReticleState.width !== exteriorWidth) {
                        
                        // Resize reticle to show FULL house footprint (exterior × exterior × 1 block tall)
                        this.targetHighlight.geometry.dispose(); // Clean up old geometry
                        this.targetHighlight.geometry = new THREE.BoxGeometry(
                            exteriorLength + 0.02,  // Length (X) - FULL exterior
                            1.02,                   // Height (Y) - 1 block tall footprint
                            exteriorWidth + 0.02    // Width (Z) - FULL exterior
                        );
                        
                        // Update state to prevent recreation next frame
                        this.lastReticleState.isHouse = true;
                        this.lastReticleState.length = exteriorLength;
                        this.lastReticleState.width = exteriorWidth;
                        
                        console.log(`🏠 Reticle footprint: ${exteriorLength}×${exteriorWidth}×1 (${interiorLength}×${interiorWidth} interior + walls)`);
                    }
                } else {
                    // Normal 1×1×1 reticle for regular blocks
                    // Only reset if currently showing house-sized reticle
                    if (this.lastReticleState.isHouse) {
                        this.targetHighlight.geometry.dispose();
                        this.targetHighlight.geometry = new THREE.BoxGeometry(1.02, 1.02, 1.02);
                        this.lastReticleState.isHouse = false;
                        this.lastReticleState.length = 0;
                        this.lastReticleState.width = 0;
                    }
                }

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
            bedrock: { color: 0x1a1a1a, texture: 'bedrock', unbreakable: true }, // 🛡️ Unbreakable foundation
            grass: { color: 0x228B22, texture: 'grass' },    // Forest green with grass pattern
            dirt: { color: 0x8B4513, texture: 'dirt' },      // Brown dirt texture
            stone: { color: 0x696969, texture: 'stone' },    // Dim gray with stone pattern
            coal: { color: 0x2F2F2F, texture: 'coal' },      // Dark gray/black coal texture
            wood: { color: 0x8B4513, texture: 'wood' },      // Saddle brown with wood grain (legacy)
            sand: { color: 0xF4A460, texture: 'sand' },      // Sandy brown with grain texture
            sandstone: { color: 0xE3BC9A, texture: 'sandstone' }, // Desert tan sandstone
            glass: { color: 0x87CEEB, texture: 'glass' },    // Sky blue, translucent
            brick: { color: 0xB22222, texture: 'brick' },    // Fire brick with mortar lines
            glowstone: { color: 0xFFD700, texture: 'glow' }, // Gold with glowing effect
            iron: { color: 0x708090, texture: 'iron' },     // Slate gray iron ore
            gold: { color: 0xFFD700, texture: 'gold' },     // Gold ore with golden shine
            flowers: { color: 0xFF69B4, texture: 'flower' }, // Hot pink with flower pattern
            snow: { color: 0xFFFFFF, texture: 'snow' },      // Pure white with snow texture
            shrub: { color: 0x2F5233, texture: 'shrub' },    // Dark green with brown stem pattern
            pumpkin: { color: 0xFF8C00, texture: 'pumpkin' },    // 🎃 Orange pumpkin (Halloween!)
            backpack: { color: 0x8B4513, texture: 'transparent' }, // Transparent for billboard
            water: { color: 0x1E90FF, texture: 'water', transparent: true }, // 🌊 Blue water with transparency

            // 🏛️ Billboard treasure items (invisible cubes for collision/interaction)
            skull: { color: 0xFFFFFF, texture: 'transparent' },
            mushroom: { color: 0xFF6347, texture: 'transparent' },
            flower: { color: 0xFF69B4, texture: 'transparent' },
            berry: { color: 0xFF1493, texture: 'transparent' },
            leaf: { color: 0x90EE90, texture: 'transparent' },
            crystal: { color: 0x87CEEB, texture: 'transparent' },
            oreNugget: { color: 0x708090, texture: 'transparent' },
            wheat: { color: 0xF0E68C, texture: 'transparent' },
            feather: { color: 0xFFFFFF, texture: 'transparent' },
            bone: { color: 0xFFFFF0, texture: 'transparent' },
            shell: { color: 0xFFE4B5, texture: 'transparent' },
            fur: { color: 0x8B7355, texture: 'transparent' },
            iceShard: { color: 0xE0FFFF, texture: 'transparent' },
            rustySword: { color: 0xB87333, texture: 'transparent' },
            oldPickaxe: { color: 0x696969, texture: 'transparent' },
            ancientAmulet: { color: 0xFFD700, texture: 'transparent' },

            // NEW: Biome-specific wood types
            oak_wood: { color: 0x8B4513, texture: 'oak_wood' },      // Classic brown oak
            pine_wood: { color: 0x654321, texture: 'pine_wood' },    // Darker brown pine
            palm_wood: { color: 0xD2B48C, texture: 'palm_wood' },    // Light tan palm
            birch_wood: { color: 0xF5F5DC, texture: 'birch_wood' },  // Pale birch
            dead_wood: { color: 0x3C3C3C, texture: 'dead_wood' },    // Dark gray dead wood

            // NEW: Biome-specific leaf types (with hyphenated versions for tree generation)
            forest_leaves: { color: 0x228B22, texture: 'forest_leaves' },   // Bright green
            mountain_leaves: { color: 0x006400, texture: 'mountain_leaves' }, // Dark green needles
            desert_leaves: { color: 0x9ACD32, texture: 'desert_leaves' },   // Yellow-green fronds
            plains_leaves: { color: 0x90EE90, texture: 'plains_leaves' },   // Light green
            tundra_leaves: { color: 0x708090, texture: 'tundra_leaves' },   // Gray-green hardy

            // Tree-specific leaf types (matching tree generation function naming)
            'oak_wood-leaves': { color: 0x228B22, texture: 'oak_wood-leaves' },   // Oak tree leaves
            'pine_wood-leaves': { color: 0x006400, texture: 'pine_wood-leaves' }, // Pine needles
            'palm_wood-leaves': { color: 0x9ACD32, texture: 'palm_wood-leaves' }, // Palm fronds
            'birch_wood-leaves': { color: 0x90EE90, texture: 'birch_wood-leaves' }, // Birch leaves
            'dead_wood-leaves': { color: 0x4A4A4A, texture: 'dead_wood-leaves' }, // Dead leaves (gray-brown)

            // 🎄 Christmas-themed blocks
            douglas_fir: { color: 0x0F4D0F, texture: 'douglas_fir' },               // Dark green Douglas Fir wood
            'douglas_fir-leaves': { color: 0x1B5E20, texture: 'douglas_fir-leaves' }, // Deep green needles
            gift_wrapped: { color: 0xFF0000, texture: 'gift_wrapped' },             // Red gift box with bow

            workbench: { color: 0x8B7355, texture: 'workbench' } // Tan brown workbench
        };

        // 🌾 MERGE FARMING BLOCK TYPES
        this.blockTypes = { ...this.blockTypes, ...farmingBlockTypes };
        console.log(`🌾 Merged ${Object.keys(farmingBlockTypes).length} farming block types`);

        // Create textured materials with Enhanced Graphics integration
        const createBlockMaterial = (blockType, enhancedGraphics = null) => {
            // 🎨 ENHANCED GRAPHICS FIRST: Check if we have enhanced textures
            if (enhancedGraphics && enhancedGraphics.isReady()) {
                const enhancedMaterial = enhancedGraphics.getEnhancedBlockMaterial(blockType.texture, null);
                if (enhancedMaterial && enhancedMaterial !== null) {
                    // console.log(`🎨 Using enhanced texture for ${blockType.texture}`);
                    return enhancedMaterial;
                }
            }

            // 🎨 FALLBACK: Create procedural canvas texture
            // console.log(`🎨 Using procedural texture for ${blockType.texture}`);
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
            } else if (blockType.texture === 'sandstone') {
                // Sandstone texture - layered sedimentary look
                ctx.fillStyle = '#C4A676'; // Darker tan for layers
                // Horizontal sediment layers
                for (let y = 0; y < 64; y += 8) {
                    const offset = Math.floor(Math.random() * 4);
                    ctx.fillRect(0, y + offset, 64, 1);
                    ctx.fillRect(0, y + offset + 2, 64, 1);
                }
                // Add some texture noise
                ctx.fillStyle = '#D4B686';
                for (let i = 0; i < 20; i++) {
                    ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 1);
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
            } else if (blockType.texture === 'water') {
                // 🌊 Water texture - wavy blue patterns
                ctx.globalAlpha = 0.3;
                ctx.strokeStyle = '#4682B4'; // Steel blue
                ctx.lineWidth = 2;
                // Create wave patterns
                for (let i = 0; i < 5; i++) {
                    ctx.beginPath();
                    for (let x = 0; x < 64; x += 4) {
                        const y = 16 + i * 10 + Math.sin(x * 0.1 + i) * 4;
                        if (x === 0) {
                            ctx.moveTo(x, y);
                        } else {
                            ctx.lineTo(x, y);
                        }
                    }
                    ctx.stroke();
                }
                // Add light reflections
                ctx.fillStyle = '#FFFFFF';
                ctx.globalAlpha = 0.2;
                for (let i = 0; i < 8; i++) {
                    ctx.fillRect(Math.random() * 64, Math.random() * 64, 3, 1);
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
            } else if (blockType.texture === 'kitchen_bench') {
                // Kitchen bench texture - wood with cooking surface
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
                // Stove burner circles
                ctx.strokeStyle = '#444444';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(20, 32, 8, 0, Math.PI * 2);
                ctx.arc(44, 32, 8, 0, Math.PI * 2);
                ctx.stroke();
                // Pot/pan on burner
                ctx.fillStyle = '#666666';
                ctx.fillRect(16, 20, 10, 6);
                // Corner reinforcements
                ctx.fillStyle = '#444444';
                ctx.fillRect(4, 4, 6, 6);
                ctx.fillRect(54, 4, 6, 6);
                ctx.fillRect(4, 54, 6, 6);
                ctx.fillRect(54, 54, 6, 6);

            // NEW: Biome-specific wood textures
            } else if (blockType.texture === 'oak_wood') {
                // Oak wood - classic brown with vertical grain
                ctx.strokeStyle = '#654321';
                ctx.lineWidth = 1;
                for (let i = 0; i < 10; i++) {
                    ctx.beginPath();
                    ctx.moveTo(i * 6 + Math.random() * 3, 0);
                    ctx.lineTo(i * 6 + Math.random() * 3, 64);
                    ctx.stroke();
                }
                // Oak rings
                ctx.strokeStyle = '#5D4037';
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    ctx.arc(32, 32, 10 + i * 8, 0, Math.PI * 2);
                    ctx.stroke();
                }
            } else if (blockType.texture === 'pine_wood') {
                // Pine wood - darker with tight grain
                ctx.strokeStyle = '#4A2C17';
                ctx.lineWidth = 1;
                for (let i = 0; i < 12; i++) {
                    ctx.beginPath();
                    ctx.moveTo(i * 5 + Math.random() * 2, 0);
                    ctx.lineTo(i * 5 + Math.random() * 2, 64);
                    ctx.stroke();
                }
                // Resin marks
                ctx.fillStyle = '#8B4513';
                for (let i = 0; i < 5; i++) {
                    ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 4);
                }
            } else if (blockType.texture === 'palm_wood') {
                // Palm wood - light with horizontal rings
                ctx.strokeStyle = '#BC9A6A';
                ctx.lineWidth = 1;
                for (let i = 0; i < 8; i++) {
                    ctx.beginPath();
                    ctx.moveTo(0, 8 + i * 6 + Math.random() * 2);
                    ctx.lineTo(64, 8 + i * 6 + Math.random() * 2);
                    ctx.stroke();
                }
                // Fiber texture
                ctx.strokeStyle = '#A0826D';
                for (let i = 0; i < 6; i++) {
                    ctx.beginPath();
                    ctx.moveTo(i * 10, 0);
                    ctx.lineTo(i * 10 + 2, 64);
                    ctx.stroke();
                }
            } else if (blockType.texture === 'birch_wood') {
                // Birch wood - light with dark horizontal marks
                ctx.strokeStyle = '#2F4F4F';
                ctx.lineWidth = 2;
                for (let i = 0; i < 6; i++) {
                    ctx.beginPath();
                    ctx.moveTo(0, Math.random() * 64);
                    ctx.lineTo(64, Math.random() * 64);
                    ctx.stroke();
                }
                // Birch spots
                ctx.fillStyle = '#696969';
                for (let i = 0; i < 8; i++) {
                    ctx.fillRect(Math.random() * 64, Math.random() * 64, 3, 2);
                }

            // NEW: Biome-specific leaf textures
            } else if (blockType.texture === 'forest_leaves') {
                // Forest leaves - bright green with leaf patterns
                ctx.fillStyle = '#32CD32';
                for (let i = 0; i < 15; i++) {
                    const x = Math.random() * 64;
                    const y = Math.random() * 64;
                    ctx.fillRect(x, y, 3, 2);
                    ctx.fillRect(x + 1, y - 1, 1, 4);
                }
            } else if (blockType.texture === 'mountain_leaves') {
                // Mountain leaves - dark green needles
                ctx.strokeStyle = '#228B22';
                ctx.lineWidth = 1;
                for (let i = 0; i < 25; i++) {
                    ctx.beginPath();
                    ctx.moveTo(Math.random() * 64, Math.random() * 64);
                    ctx.lineTo(Math.random() * 64, Math.random() * 64);
                    ctx.stroke();
                }
            } else if (blockType.texture === 'desert_leaves') {
                // Desert leaves - yellow-green fronds
                ctx.strokeStyle = '#ADFF2F';
                ctx.lineWidth = 2;
                for (let i = 0; i < 8; i++) {
                    const centerX = 32;
                    const centerY = 32;
                    ctx.beginPath();
                    ctx.moveTo(centerX, centerY);
                    ctx.lineTo(centerX + Math.cos(i * Math.PI / 4) * 20, centerY + Math.sin(i * Math.PI / 4) * 20);
                    ctx.stroke();
                }
            } else if (blockType.texture === 'plains_leaves') {
                // Plains leaves - light green with soft texture
                ctx.fillStyle = '#98FB98';
                for (let i = 0; i < 20; i++) {
                    ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
                }
            } else if (blockType.texture === 'tundra_leaves') {
                // Tundra leaves - gray-green hardy leaves
                ctx.fillStyle = '#8FBC8F';
                for (let i = 0; i < 12; i++) {
                    ctx.fillRect(Math.random() * 64, Math.random() * 64, 4, 1);
                }
                // Frost effect
                ctx.fillStyle = '#F0F8FF';
                ctx.globalAlpha = 0.2;
                for (let i = 0; i < 8; i++) {
                    ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
                }
            }

            const texture = new THREE.CanvasTexture(canvas);
            texture.magFilter = THREE.NearestFilter; // Pixelated look
            texture.generateMipmaps = true;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.anisotropy = 4;

            // Create material based on block type
            if (blockType.texture === 'glass') {
                return new THREE.MeshLambertMaterial({
                    map: texture,
                    transparent: true,
                    opacity: 0.6
                });
            } else if (blockType.texture === 'water') {
                // 🌊 Water material - transparent blue
                return new THREE.MeshLambertMaterial({
                    map: texture,
                    transparent: true,
                    opacity: 0.5,
                    color: new THREE.Color(0x1E90FF)
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
            // Normal materials - pass Enhanced Graphics instance
            this.materials[type] = createBlockMaterial(this.blockTypes[type], this.enhancedGraphics);

            // Pre-create darker materials for player-placed blocks (performance optimization)
            const darkerColor = new THREE.Color(this.blockTypes[type].color).multiplyScalar(0.7);
            this.playerMaterials[type] = new THREE.MeshLambertMaterial({
                map: this.materials[type].map,
                color: darkerColor
            });

            // Register materials in resource pool for reuse
            this.resourcePool.registerMaterial(type, this.materials[type]);
            this.resourcePool.registerMaterial(`${type}_player`, this.playerMaterials[type]);
        });

        console.log(`📦 Registered ${Object.keys(this.blockTypes).length * 2} materials in resource pool`);

        // 🎨 Method to recreate all materials when Enhanced Graphics becomes ready
        this.recreateAllMaterials = () => {
            console.log('🎨 Recreating all materials with Enhanced Graphics...');
            Object.keys(this.blockTypes).forEach(type => {
                // Dispose old material to prevent memory leaks
                if (this.materials[type].map) {
                    this.materials[type].map.dispose();
                }
                this.materials[type].dispose();

                // Create new enhanced material
                this.materials[type] = createBlockMaterial(this.blockTypes[type], this.enhancedGraphics);

                // Update player material with new texture
                const darkerColor = new THREE.Color(this.blockTypes[type].color).multiplyScalar(0.7);
                if (this.playerMaterials[type].map) {
                    this.playerMaterials[type].map.dispose();
                }
                this.playerMaterials[type].dispose();
                this.playerMaterials[type] = new THREE.MeshLambertMaterial({
                    map: this.materials[type].map,
                    color: darkerColor
                });
            });

            // Force update all existing blocks in the world (only if chunks are initialized)
            if (this.chunks && typeof this.chunks === 'object') {
                Object.values(this.chunks).forEach(chunk => {
                    if (chunk && chunk.mesh) {
                        chunk.needsRebuild = true;
                    }
                });
                console.log('🎨 Existing chunks marked for rebuild');
            } else {
                console.log('🎨 No chunks to rebuild yet (chunks not initialized)');
            }

            console.log('🎨 Material recreation complete - chunks marked for rebuild');
        };

        // Three.js setup
        this.scene = new THREE.Scene();

        // 🌫️ Helper function to update fog (reuses one fog object to prevent memory leaks)
        this.updateFog = (fogColor = null) => {
            const chunkSize = this.chunkSize; // Use actual chunk size (8 blocks), not hardcoded 64
            let fogStart, fogEnd;

            if (this.useHardFog) {
                // Hard fog (Silent Hill style): Ends at render distance - 1 chunk (hard wall effect)
                // This creates a fog wall just inside the render boundary
                fogStart = (this.renderDistance - 0.5) * chunkSize; // Start close to edge
                fogEnd = this.renderDistance * chunkSize; // End exactly at render distance
            } else {
                // Soft fog: Gradual fade over LOD range (if LOD manager exists)
                const visualDist = this.lodManager ? this.lodManager.visualDistance : 3;
                fogStart = (this.renderDistance - 1) * chunkSize; // Start 1 chunk before render distance
                fogEnd = (this.renderDistance + visualDist) * chunkSize; // Extend to LOD visual distance
            }

            const color = fogColor !== null ? fogColor : (this.scene.background ? this.scene.background.getHex() : 0x87CEEB);

            // Create fog object ONCE, then reuse it (prevents memory leak from creating new objects every frame)
            if (!this.scene.fog) {
                this.scene.fog = new THREE.Fog(color, fogStart, fogEnd);
            } else {
                // Update existing fog object properties instead of creating new one
                this.scene.fog.color.setHex(color);
                this.scene.fog.near = fogStart;
                this.scene.fog.far = fogEnd;
            }

            // console.log(`🌫️ Fog updated: ${this.useHardFog ? 'HARD' : 'SOFT'} (start: ${fogStart.toFixed(1)}, end: ${fogEnd.toFixed(1)}, renderDist: ${this.renderDistance}, chunkSize: ${chunkSize}, visualDist: ${this.lodManager ? this.lodManager.visualDistance : 3})`);
        };

        // 🌫️ Toggle fog type (for scary areas)
        this.toggleHardFog = (enable) => {
            this.useHardFog = enable;
            this.updateFog();
            console.log(`🌫️ Fog mode: ${this.useHardFog ? 'HARD (Silent Hill)' : 'SOFT (gradual)'}`);
        };

        // 🌫️ Initialize fog based on render distance
        this.updateFog(0x87CEEB); // Sky blue fog
        console.log(`🌫️ Fog initialized (render distance: ${this.renderDistance})`);

        // 👻 Initialize Ghost System now that scene is ready
        this.ghostSystem = new GhostSystem(this.scene, this.enhancedGraphics);

        // ⚔️ Initialize Battle System now that scene is ready
        this.battleSystem = new BattleSystem(this);

        // 🏟️ Initialize Battle Arena now that scene is ready
        this.battleArena = new BattleArena(this);

        // 💀 Initialize Angry Ghost System now that scene is ready
        this.angryGhostSystem = new AngryGhostSystem(this.scene, this.enhancedGraphics, this.battleSystem);

        // 🎄 Initialize Christmas System now that scene is ready
        this.christmasSystem = new ChristmasSystem(this);

        // 🎲 Initialize RPG System now that scene is ready
        this.rpgIntegration = new RPGIntegration(this);
        this.rpgIntegration.loadStats(); // Load existing stats if any

        // � Initialize LOD System for extended visual horizon (TEST VERSION)
        // This will render simplified colored chunks beyond renderDistance
        this.lodManager = null; // Will be initialized after scene and camera are fully ready

        // �🎯 PHASE 1.2: Physics World Setup
        this.physicsWorld = new CANNON.World();
        this.physicsWorld.gravity.set(0, -9.82, 0); // Earth gravity
        this.physicsWorld.broadphase = new CANNON.NaiveBroadphase(); // Simple collision detection
        this.physicsWorld.solver.iterations = 10; // Solver precision

        // 🎯 PHASE 2.3: Enhanced physics materials with realistic properties
        this.physicsMaterials = {
            ground: new CANNON.Material('ground'),
            wood: new CANNON.Material('wood'),
            stone: new CANNON.Material('stone'),
            iron: new CANNON.Material('iron'),
            glass: new CANNON.Material('glass'),
            brick: new CANNON.Material('brick'),
            sand: new CANNON.Material('sand'),
            grass: new CANNON.Material('grass'),
            glowstone: new CANNON.Material('glowstone'),
            coal: new CANNON.Material('coal'),

            // NEW: Biome-specific wood materials (all behave like wood)
            oak_wood: new CANNON.Material('oak_wood'),
            pine_wood: new CANNON.Material('pine_wood'),
            palm_wood: new CANNON.Material('palm_wood'),
            birch_wood: new CANNON.Material('birch_wood'),

            // NEW: Leaf materials (lighter than wood)
            forest_leaves: new CANNON.Material('forest_leaves'),
            mountain_leaves: new CANNON.Material('mountain_leaves'),
            desert_leaves: new CANNON.Material('desert_leaves'),
            plains_leaves: new CANNON.Material('plains_leaves'),
            tundra_leaves: new CANNON.Material('tundra_leaves')
        };

        // 🎯 PHASE 2.3: Enhanced material contact properties for realistic behavior
        const materialContacts = [
            // Wood contacts - moderate friction, some bounce
            { mat1: 'ground', mat2: 'wood', friction: 0.4, restitution: 0.3 },
            { mat1: 'wood', mat2: 'wood', friction: 0.6, restitution: 0.2 },

            // Stone contacts - high friction, low bounce (heavy/stable)
            { mat1: 'ground', mat2: 'stone', friction: 0.8, restitution: 0.1 },
            { mat1: 'stone', mat2: 'stone', friction: 0.9, restitution: 0.05 },

            // Iron contacts - very high friction, almost no bounce (very heavy)
            { mat1: 'ground', mat2: 'iron', friction: 0.9, restitution: 0.05 },
            { mat1: 'iron', mat2: 'iron', friction: 0.95, restitution: 0.02 },

            // Glass contacts - low friction, high bounce (slippery, brittle)
            { mat1: 'ground', mat2: 'glass', friction: 0.2, restitution: 0.7 },
            { mat1: 'glass', mat2: 'glass', friction: 0.1, restitution: 0.8 },

            // Brick contacts - similar to stone but slightly less friction
            { mat1: 'ground', mat2: 'brick', friction: 0.7, restitution: 0.15 },
            { mat1: 'brick', mat2: 'brick', friction: 0.8, restitution: 0.1 },

            // Sand contacts - medium friction, absorbs energy
            { mat1: 'ground', mat2: 'sand', friction: 0.6, restitution: 0.2 },
            { mat1: 'sand', mat2: 'sand', friction: 0.7, restitution: 0.1 },

            // Grass contacts - low friction, springy
            { mat1: 'ground', mat2: 'grass', friction: 0.3, restitution: 0.4 },
            { mat1: 'grass', mat2: 'grass', friction: 0.4, restitution: 0.5 },

            // Glowstone contacts - magical properties, medium bounce
            { mat1: 'ground', mat2: 'glowstone', friction: 0.5, restitution: 0.4 },
            { mat1: 'glowstone', mat2: 'glowstone', friction: 0.6, restitution: 0.3 },

            // Coal contacts - similar to stone but slightly grittier
            { mat1: 'ground', mat2: 'coal', friction: 0.7, restitution: 0.1 },
            { mat1: 'coal', mat2: 'coal', friction: 0.8, restitution: 0.05 },

            // Cross-material interactions
            { mat1: 'wood', mat2: 'stone', friction: 0.6, restitution: 0.2 },
            { mat1: 'wood', mat2: 'iron', friction: 0.5, restitution: 0.15 },
            { mat1: 'wood', mat2: 'glass', friction: 0.3, restitution: 0.4 },
            { mat1: 'stone', mat2: 'iron', friction: 0.8, restitution: 0.08 },
            { mat1: 'stone', mat2: 'glass', friction: 0.4, restitution: 0.3 },
            { mat1: 'iron', mat2: 'glass', friction: 0.2, restitution: 0.5 }
        ];

        // Create and add all contact materials
        materialContacts.forEach(contact => {
            const material1 = this.physicsMaterials[contact.mat1];
            const material2 = this.physicsMaterials[contact.mat2];
            if (material1 && material2) {
                const contactMaterial = new CANNON.ContactMaterial(material1, material2, {
                    friction: contact.friction,
                    restitution: contact.restitution
                });
                this.physicsWorld.addContactMaterial(contactMaterial);
            }
        });

        console.log(`✅ Created ${materialContacts.length} material contact interactions`);

        console.log('✅ Physics world initialized with gravity and materials');

        // Physics objects tracking
        this.physicsObjects = new Map(); // Maps Three.js objects to Cannon.js bodies

        const width = window.innerWidth;
        const height = window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.01, 1000); // Near-plane: 0.01 (was 0.1) to prevent sprite clipping
        this.camera.position.set(0, 10, 20);

        // � Initialize LOD Manager now that camera is ready
        this.lodManager = new ChunkLODManager(this);
        console.log('🎨 LOD Manager initialized - Visual Horizon enabled!');

        // 🔍 Initialize LOD Debug Overlay (toggle with 'L' key)
        this.lodDebugOverlay = new LODDebugOverlay(this);

        // 🧊 Initialize Greedy Meshing System
        this.useGreedyMeshing = true; // ENABLED - texture atlas now implemented!
        this.chunkMeshManager = this.useGreedyMeshing ? new ChunkMeshManager(this) : null;
        if (this.useGreedyMeshing) {
            console.log('🧊 Greedy Meshing ENABLED - Optimized chunk rendering active');
        } else {
            console.log('🧊 Greedy Meshing DISABLED - Using traditional textured blocks');
        }

        // 🌫️ Update fog now that LOD manager exists (fixes fog distance calculation)
        this.updateFog();
        // �🎮 Get user's GPU preference (default to low-power for broader compatibility)
        const gpuPreference = localStorage.getItem('voxelWorld_gpuPreference') || 'low-power';

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: gpuPreference // 🎮 User-selected GPU preference
        });
        this.renderer.setSize(width, height);

        // 🎮 Detect and log GPU information
        const gl = this.renderer.getContext();
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
            const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

            // Store detected GPU info for display in menu
            this.detectedGPU = { vendor, renderer, preference: gpuPreference };
            
            // 🔍 Enhanced GPU detection logging
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🎮 GPU DETECTION REPORT:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`📝 Requested Preference: "${gpuPreference}"`);
            console.log(`🏭 GPU Vendor: ${vendor}`);
            console.log(`🎨 GPU Renderer: ${renderer}`);
            console.log('');
            
            // Detect if iGPU or dGPU based on renderer string
            const isIntegrated = renderer.toLowerCase().includes('intel') || 
                                 renderer.toLowerCase().includes('integrated') ||
                                 renderer.toLowerCase().includes('uhd') ||
                                 renderer.toLowerCase().includes('iris');
            const isDedicated = renderer.toLowerCase().includes('nvidia') || 
                               renderer.toLowerCase().includes('geforce') ||
                               renderer.toLowerCase().includes('rtx') ||
                               renderer.toLowerCase().includes('gtx') ||
                               renderer.toLowerCase().includes('radeon') ||
                               renderer.toLowerCase().includes('amd');
            
            if (isDedicated) {
                console.log('✅ DETECTED: Dedicated GPU (dGPU)');
                if (gpuPreference === 'high-performance') {
                    console.log('✅ STATUS: dGPU requested and dGPU detected - MATCH! 🎯');
                } else {
                    console.log('⚠️  WARNING: dGPU detected but preference is "' + gpuPreference + '"');
                    console.log('   💡 TIP: Change GPU Mode to "High Performance" for better performance');
                }
            } else if (isIntegrated) {
                console.log('🔋 DETECTED: Integrated GPU (iGPU)');
                if (gpuPreference === 'low-power') {
                    console.log('✅ STATUS: iGPU requested and iGPU detected - MATCH! 🎯');
                } else if (gpuPreference === 'high-performance') {
                    console.log('⚠️  WARNING: Requested dGPU but iGPU detected!');
                    console.log('   ❌ ISSUE: Browser/OS may be ignoring powerPreference hint');
                    console.log('   💡 FIX: Check Windows Graphics Settings or Electron GPU flags');
                }
            } else {
                console.log('❓ UNKNOWN: Could not determine GPU type from renderer string');
            }
            
            console.log('');
            console.log('🔧 TROUBLESHOOTING:');
            console.log('   1. Windows: Settings > System > Display > Graphics Settings');
            console.log('   2. Add electron.exe and set to "High Performance"');
            console.log('   3. Or launch with: --force_high_performance_gpu flag');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        } else {
            this.detectedGPU = { vendor: 'Unknown', renderer: 'Unknown', preference: gpuPreference };
            console.warn('⚠️ WEBGL_debug_renderer_info extension not available - cannot detect GPU');
        }

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
            cycleDuration: 1200, // 20 minutes for full day cycle (3 days per real hour)
            timeScale: 1.0,
            isActive: true,
            lastUpdate: Date.now(),
            directionalLight: directionalLight,
            ambientLight: ambientLight,
            currentDay: 0, // Track total days passed for farming
            lastDayTime: 12 // Track when day changed for comparison
        };

        // Biome definitions
        // 🌍 Biome system now handled by BiomeWorldGen module
        // All biome definitions, noise generation, and world generation moved to BiomeWorldGen.js

        // Delegate function for height-based coloring (used by some legacy code)
        this.getHeightBasedColor = (biome, height) => {
            return this.biomeWorldGen.getHeightBasedColor(biome, height);
        };

        // 🌍 SPAWN POSITION FINDER: Find safe spawn position after terrain and tree generation
        this.findAndSetSpawnPosition = () => {
            console.log('🎯 Finding proper spawn position after terrain generation...');

            // Wait a bit for tree generation to complete (since trees are generated with setTimeout)
            setTimeout(() => {
                this.findSafeSpawnPosition();
            }, 50); // Wait longer than tree generation delay (10ms)
        };

        // 🎯 SAFE SPAWN FINDER: Find 4x4 clear area away from trees and terrain
        this.findSafeSpawnPosition = () => {
            console.log('🎯 Searching for 4x4 clear spawn area...');

            let bestSpawnX = 0;
            let bestSpawnZ = 0;
            let bestSpawnY = 12; // fallback height
            let foundSafeArea = false;

            // Search in expanding circles around spawn point
            for (let radius = 0; radius <= 8 && !foundSafeArea; radius++) {
                for (let angle = 0; angle < 360 && !foundSafeArea; angle += 45) {
                    const checkX = Math.round(Math.cos(angle * Math.PI / 180) * radius);
                    const checkZ = Math.round(Math.sin(angle * Math.PI / 180) * radius);

                    // Check if this position has a 4x4 clear area
                    if (this.isAreaClear(checkX, checkZ, 4)) {
                        const surfaceY = this.findSurfaceHeight(checkX, checkZ);
                        if (surfaceY !== null) {
                            bestSpawnX = checkX;
                            bestSpawnZ = checkZ;
                            bestSpawnY = surfaceY + 4; // 4 blocks above surface
                            foundSafeArea = true;
                            console.log(`🎯 Found safe 4x4 area at (${checkX}, ${checkZ}) -> spawn at (${bestSpawnX}, ${bestSpawnY}, ${bestSpawnZ})`);
                        }
                    }
                }
            }

            if (foundSafeArea) {
                this.player.position.x = bestSpawnX;
                this.player.position.y = bestSpawnY;
                this.player.position.z = bestSpawnZ;
                console.log(`🎯 Player spawned in safe area at (${bestSpawnX}, ${bestSpawnY}, ${bestSpawnZ})`);
            } else {
                console.warn('🚨 No safe 4x4 area found - using fallback position');
                this.player.position.y = 15; // Higher fallback
            }
        };

        // 🔍 Check if a 4x4 area is clear of blocks (terrain and trees)
        this.isAreaClear = (centerX, centerZ, size) => {
            const halfSize = Math.floor(size / 2);

            // Check all positions in the area
            for (let dx = -halfSize; dx <= halfSize; dx++) {
                for (let dz = -halfSize; dz <= halfSize; dz++) {
                    const checkX = centerX + dx;
                    const checkZ = centerZ + dz;

                    // 🏔️ Check from MUCH higher now that mountains can be y=60
                    for (let y = 64; y >= 0; y--) {
                        const block = this.getBlock(checkX, y, checkZ);
                        if (block) {
                            // Found surface, now check:
                            // 1. No obstacles above (trees/rocks)
                            // 2. Solid ground below (not hollow mountain)

                            // Check above for obstacles
                            for (let checkY = y + 1; checkY <= y + 6; checkY++) {
                                const aboveBlock = this.getBlock(checkX, checkY, checkZ);
                                if (aboveBlock) {
                                    return false; // Found obstacle above surface
                                }
                            }

                            // 🏔️ NEW: Check below for solid ground (prevent spawning on hollow mountains)
                            let solidBlocksBelow = 0;
                            for (let checkY = y - 1; checkY >= Math.max(0, y - 5); checkY--) {
                                const belowBlock = this.getBlock(checkX, checkY, checkZ);
                                if (belowBlock) {
                                    solidBlocksBelow++;
                                }
                            }

                            // Need at least 3 solid blocks below to be safe spawn
                            if (solidBlocksBelow < 3) {
                                return false; // Not enough solid ground below
                            }

                            break; // Surface found, no obstacles above, solid ground below
                        }
                    }
                }
            }
            return true; // Area is clear
        };

        // 🔍 Find surface height at a specific position
        this.findSurfaceHeight = (x, z) => {
            // 🏔️ Search from y=64 down to handle tall mountains
            for (let y = 64; y >= -5; y--) {
                const block = this.getBlock(x, y, z);
                if (block) {
                    return y;
                }
            }
            return null; // No surface found
        };

        // Chunk-based terrain generation functions
        const getChunkKey = (chunkX, chunkZ) => `${chunkX},${chunkZ}`;

        const generateChunk = (chunkX, chunkZ) => {
            // Skip if already loaded
            const chunkKey = `${chunkX},${chunkZ}`;
            if (this.loadedChunks.has(chunkKey)) {
                return;
            }

            // 👷 Use Web Worker if initialized, otherwise fall back to BiomeWorldGen
            if (this.workerInitialized) {
                this.workerManager.requestChunk(chunkX, chunkZ, this.chunkSize, (chunkData) => {
                    this.handleWorkerChunkData(chunkX, chunkZ, chunkData);
                });
            } else {
                // Fallback to main thread generation
                this.biomeWorldGen.generateChunk(
                    chunkX,
                    chunkZ,
                    this.worldSeed,
                    this.addBlock.bind(this),
                    this.loadedChunks,
                    this.chunkSize
                );

                // 🌳 DISABLED: Tree generation now handled by BiomeWorldGen.js during chunk generation
                // setTimeout(() => {
                //     this.generateTreesForChunk(chunkX, chunkZ);
                // }, 10);
            }
        };

        // 👷 WORKER CHUNK DATA HANDLER: Convert worker data to blocks
        // 🌲 Now receives tree data from TreeWorker via WorkerManager pipeline
        this.handleWorkerChunkData = (chunkX, chunkZ, chunkData) => {
            const { blockCount, positions, blockTypes, colors, flags, waterBlockCount, heightMap, waterMap, trees } = chunkData;

            // 🌊 Debug water blocks
            if (waterBlockCount > 0) {
                console.log(`🌊 Chunk (${chunkX}, ${chunkZ}) has ${waterBlockCount} water blocks`);
            }

            // Block type reverse mapping (must match ChunkWorker.js blockTypeMap)
            const blockTypeNames = {
                0: 'bedrock', 1: 'grass', 2: 'sand', 3: 'stone', 4: 'iron', 5: 'snow', 6: 'water', 7: 'dirt', 8: 'pumpkin', 9: 'gold',
                10: 'oak_wood', 11: 'pine_wood', 12: 'birch_wood', 13: 'palm_wood', 14: 'dead_wood',
                20: 'forest_leaves', 21: 'mountain_leaves', 22: 'plains_leaves',
                23: 'desert_leaves', 24: 'tundra_leaves'
            };

            // Add all blocks from worker data
            for (let i = 0; i < blockCount; i++) {
                const x = positions[i * 3];
                const y = positions[i * 3 + 1];
                const z = positions[i * 3 + 2];
                const blockTypeId = blockTypes[i];
                const color = colors[i];
                const isPlayerPlaced = flags[i] === 1;

                const blockType = blockTypeNames[blockTypeId] || 'stone';

                // Convert color from uint32 to THREE.Color
                const r = ((color >> 16) & 0xFF) / 255;
                const g = ((color >> 8) & 0xFF) / 255;
                const b = (color & 0xFF) / 255;
                const blockColor = new THREE.Color(r, g, b);

                this.addBlock(x, y, z, blockType, isPlayerPlaced, blockColor);
            }

            // Mark chunk as loaded
            this.loadedChunks.add(`${chunkX},${chunkZ}`);

            // 🏛️ GENERATE RUINS: After worker chunk generation, generate structures
            // This was missing - ruins only worked in fallback mode!
            if (this.biomeWorldGen && this.biomeWorldGen.structureGenerator) {
                // Get biome for this chunk to pass to structure generator
                const centerX = chunkX * this.chunkSize + this.chunkSize / 2;
                const centerZ = chunkZ * this.chunkSize + this.chunkSize / 2;
                const chunkBiome = this.biomeWorldGen.getBiomeAt(centerX, centerZ, this.worldSeed);

                this.biomeWorldGen.structureGenerator.generateStructuresForChunk(
                    chunkX,
                    chunkZ,
                    this.addBlock.bind(this),
                    (x, z) => this.biomeWorldGen.findGroundHeight(x, z),
                    chunkBiome.name
                );
            }

            // 🌳 RESTORE TREES: Check if we have cached trees for this chunk
            const chunkKey = `${chunkX},${chunkZ}`;

            // 🎨 Remove LOD chunk when full chunk loads (prevent double rendering)
            if (this.lodManager) {
                this.lodManager.unloadLODChunk(chunkKey);
            }

            const cachedTrees = this.treeCache.get(chunkKey);

            if (cachedTrees && cachedTrees.length > 0) {
                // Restore trees from cache instead of regenerating
                for (const tree of cachedTrees) {
                    this.generateTreeForBiome(tree.x, tree.y, tree.z, tree.biome);
                }
            } else if (trees && trees.length > 0) {
                // 🌲 NEW: Generate trees from TreeWorker data (immediate, no delay)
                console.log(`🌲 Generating ${trees.length} trees from TreeWorker for chunk (${chunkX}, ${chunkZ})`);
                for (const tree of trees) {
                    const { x, y, z, treeType, biome, isAncient, isMega, isMegaFir, pumpkin } = tree;

                    // 🏛️🌳 COLLISION DETECTION: Check if a ruin is too close to this tree location
                    // Prevent trees from spawning on top of ruins (especially inside hollow ruins!)
                    let tooCloseToRuin = false;
                    const treeRadius = treeType === 'douglas_fir' ? 8 : 6; // Douglas Firs are bigger

                    for (const ruin of this.ruinPositions) {
                        const dx = x - ruin.x;
                        const dz = z - ruin.z;
                        const distance = Math.sqrt(dx * dx + dz * dz);

                        // Get ruin size-based radius
                        const ruinSizeRadii = { small: 5, medium: 9, large: 15, colossal: 25 };
                        const ruinRadius = (ruinSizeRadii[ruin.size] || 5) / 2 + treeRadius;

                        if (distance < ruinRadius) {
                            console.log(`🚫 Tree at (${x}, ${z}) CANCELLED - ${ruin.size} ruin at (${ruin.x}, ${ruin.z}) is ${Math.floor(distance)} blocks away (min: ${Math.floor(ruinRadius)})`);
                            tooCloseToRuin = true;
                            break;
                        }
                    }

                    // Skip this tree if it's too close to a ruin
                    if (tooCloseToRuin) {
                        continue;
                    }

                    // Get biome object from name
                    const biomeObj = this.biomeWorldGen.getBiomeAt(x, z, this.worldSeed);

                    // 🎄 MEGA DOUGLAS FIR: Special Christmas tree (Dec 24-25 only)
                    if (isMegaFir && this.christmasSystem) {
                        // Check if it's Christmas time
                        if (this.christmasSystem.isChristmasTime()) {
                            this.christmasSystem.generateMegaDouuglasFir(x, y, z);
                        } else {
                            // Not Christmas - just place a regular Douglas Fir as a marker
                            this.generateDouglasFir(x, y, z);
                        }
                    } else if (isAncient) {
                        // Generate ancient tree (regular or mega)
                        this.generateAncientTree(x, y, z, biomeObj, isMega);
                    } else if (treeType === 'douglas_fir') {
                        // Generate regular Douglas Fir (year-round)
                        this.generateDouglasFir(x, y, z);
                    } else {
                        // Generate normal tree
                        this.generateTreeForBiome(x, y, z, biomeObj);
                    }

                    // 🎃 PLACE PUMPKIN near tree if TreeWorker generated one
                    if (pumpkin) {
                        const { x: pumpkinX, y: pumpkinY, z: pumpkinZ } = pumpkin;
                        // Place pumpkin on ground (check if space is available)
                        const groundBlock = this.getBlock(pumpkinX, pumpkinY - 1, pumpkinZ);
                        const airBlock = this.getBlock(pumpkinX, pumpkinY, pumpkinZ);

                        if (groundBlock && groundBlock.type !== 'air' && groundBlock.type !== 'water' &&
                            (!airBlock || airBlock.type === 'air')) {
                            this.addBlock(pumpkinX, pumpkinY, pumpkinZ, 'pumpkin', false);
                            console.log(`🎃 Placed pumpkin near tree at (${pumpkinX}, ${pumpkinY}, ${pumpkinZ})`);
                        }
                    }
                }
            }

            // Silent chunk loading - only log on errors
            // console.log(`✅ Worker chunk (${chunkX}, ${chunkZ}) loaded: ${blockCount} blocks`);
        };

        // 🔍 HELPER: Find actual solid ground below a position (for detecting gaps)
        this.findActualGroundBelow = (x, startY, z) => {
            // Scan downward to find first solid non-tree block
            for (let y = startY; y >= 0; y--) {
                const block = this.getBlock(x, y, z);
                if (block && block.type) {
                    // Found a block - check if it's valid ground
                    const validGroundBlocks = ['grass', 'sand', 'dirt', 'stone', 'snow'];
                    if (validGroundBlocks.includes(block.type)) {
                        return y;
                    }
                }
            }
            return null; // No ground found
        };

        // 🌳 SEPARATED TREE GENERATION: Now a dedicated method for better timing control
        this.generateTreesForChunk = (chunkX, chunkZ, heightMap = null, waterMap = null) => {
            // Minimal logging - only for significant issues
            let treesPlaced = 0;
            let treesAttempted = 0;
            let noSurfaceFound = 0;

            for (let x = 0; x < this.chunkSize; x++) {
                for (let z = 0; z < this.chunkSize; z++) {
                    const worldX = chunkX * this.chunkSize + x;
                    const worldZ = chunkZ * this.chunkSize + z;

                    const biome = this.biomeWorldGen.getBiomeAt(worldX, worldZ, this.worldSeed);

                    // Check if we should generate a tree at this position using BiomeWorldGen's logic
                    const passesNoiseCheck = this.biomeWorldGen.shouldGenerateTree(worldX, worldZ, biome, this.worldSeed);

                    if (passesNoiseCheck) {
                        // 🌲 Check spacing to prevent tree crowding
                        const tooCloseToOtherTree = this.biomeWorldGen.hasNearbyTree(worldX, worldZ, chunkX, chunkZ);

                        if (tooCloseToOtherTree) {
                            continue; // Skip this tree, too close to another
                        }

                        treesAttempted++;

                        // 🗺️ Use heightMap and waterMap from worker (most reliable!)
                        const heightIndex = x * this.chunkSize + z;

                        // 🌊 Check water map first - skip if this position has water
                        if (waterMap && waterMap[heightIndex] === 1) {
                            noSurfaceFound++;
                            continue; // Water position - no trees
                        }

                        // 🗺️ Get ground height from worker's heightMap (exact terrain height)
                        let surfaceY;
                        if (heightMap) {
                            const groundHeight = heightMap[heightIndex];
                            surfaceY = groundHeight + 1; // Tree sits on top of ground block
                        } else {
                            // Fallback: scan for ground (for non-worker chunks like spawn)
                            surfaceY = this.biomeWorldGen.findGroundHeight(worldX, worldZ);
                        }

                        // Only place tree if we found a valid surface
                        if (surfaceY !== null && surfaceY > 1 && surfaceY <= 65) {
                            // 🌳 ANCIENT TREE SPAWN CHANCE
                            // 20% total: 15% regular ancient, 5% mega ancient
                            const ancientChance = this.seededNoise(worldX + 25000, worldZ + 25000, this.worldSeed);

                            if (ancientChance > 0.80) {
                                // 20% of trees are ancient
                                const isMega = ancientChance > 0.95; // Top 5% are mega ancient
                                this.generateAncientTree(worldX, surfaceY, worldZ, biome, isMega);
                            } else {
                                // 80% normal trees
                                this.generateTreeForBiome(worldX, surfaceY, worldZ, biome);
                            }

                            treesPlaced++;

                            // 🗺️ Track tree position for spacing
                            this.biomeWorldGen.trackTreePosition(worldX, worldZ, chunkX, chunkZ);
                        } else {
                            noSurfaceFound++;
                        }
                    }
                }
            }

            // Optionally log tree generation stats (disabled for performance)
            // if (treesPlaced > 0) {
            //     console.log(`🌳 Chunk (${chunkX}, ${chunkZ}): ${treesPlaced} trees placed`);
            // }
        };

        // 🌳 TREE ID SYSTEM: Registry management methods
        this.createTreeRegistry = (treeType, x, y, z) => {
            const treeId = this.nextTreeId++;
            const treeMetadata = {
                treeId: treeId,
                treeType: treeType, // 'oak_wood', 'pine_wood', etc.
                basePosition: { x, y, z },
                trunkBlocks: [],
                leafBlocks: [],
                totalBlocks: 0,
                createdAt: Date.now()
            };

            this.treeRegistry.set(treeId, treeMetadata);
            // console.log(`🌳 Created tree registry: ID ${treeId}, type: ${treeType} at (${x}, ${y}, ${z})`);
            return treeId;
        };

        this.registerTreeBlock = (treeId, x, y, z, blockType, isLeaf = false) => {
            const blockKey = `${x},${y},${z}`;
            const treeMetadata = this.treeRegistry.get(treeId);

            if (!treeMetadata) {
                console.error(`🚨 Cannot register block - Tree ID ${treeId} not found in registry`);
                return;
            }

            // Add to tree metadata
            const blockInfo = { x, y, z, blockType };
            if (isLeaf) {
                treeMetadata.leafBlocks.push(blockInfo);
            } else {
                treeMetadata.trunkBlocks.push(blockInfo);
            }
            treeMetadata.totalBlocks++;

            // Add to fast lookup map
            this.blockToTreeMap.set(blockKey, treeId);

            // console.log(`🌳 Registered ${isLeaf ? 'leaf' : 'trunk'} block for tree ${treeId} at (${x}, ${y}, ${z})`);
        };

        this.getTreeIdFromBlock = (x, y, z) => {
            const blockKey = `${x},${y},${z}`;
            return this.blockToTreeMap.get(blockKey) || null;
        };

        this.getTreeMetadata = (treeId) => {
            return this.treeRegistry.get(treeId) || null;
        };

        this.removeTreeFromRegistry = (treeId) => {
            const treeMetadata = this.treeRegistry.get(treeId);
            if (!treeMetadata) return;

            // Remove all block mappings
            [...treeMetadata.trunkBlocks, ...treeMetadata.leafBlocks].forEach(block => {
                const blockKey = `${block.x},${block.y},${block.z}`;
                this.blockToTreeMap.delete(blockKey);
            });

            // Remove tree registry entry
            this.treeRegistry.delete(treeId);

            // 🗺️ Remove tree from minimap positions
            const initialLength = this.treePositions.length;
            this.treePositions = this.treePositions.filter(tree => tree.treeId !== treeId);
            const removedCount = initialLength - this.treePositions.length;

            console.log(`🗑️ Removed tree ${treeId} from registry (${treeMetadata.totalBlocks} blocks freed)${removedCount > 0 ? ' and minimap' : ''}`);
            if (removedCount > 0) {
                console.log(`🗺️ Tree ${treeId} removed from minimap (${this.treePositions.length} trees remaining)`);
            }
        };

        // 🌳 HELPER: Add block with tree ID registration
        this.addTreeBlock = (treeId, x, y, z, blockType, playerPlaced = false, color = null) => {
            // Determine if this is a leaf block
            const isLeaf = this.isLeafBlock(blockType);

            // Add the block normally
            this.addBlock(x, y, z, blockType, playerPlaced, color);

            // Register with tree system
            this.registerTreeBlock(treeId, x, y, z, blockType, isLeaf);
        };

        // 🏛️ PILLAR TREE FIX: Convert stone pillars under trees to registered trunk blocks
        this.fixTreePillars = (treeId, x, y, z, woodType) => {
            // commented out due to console spam -- brad
            // console.log(`🏛️ Scanning for pillars under tree ${treeId} at (${x}, ${y}, ${z})`);
            let pillarBlocksConverted = 0;

            // Search downward from tree base to find actual ground
            for (let checkY = y - 1; checkY >= 0; checkY--) {
                const block = this.getBlock(x, checkY, z);

                if (!block || block.type === 'air') {
                    // Fill air gap with wood trunk (roots extending down)
                    this.addTreeBlock(treeId, x, checkY, z, woodType, false);
                    pillarBlocksConverted++;
                } else if (['stone', 'sand', 'iron'].includes(block.type)) {
                    // 🏛️ PILLAR BLOCK: Convert stone/sand/iron to wood trunk
                    // Remove the pillar block and replace with registered trunk
                    this.removeBlock(x, checkY, z, false);
                    this.addTreeBlock(treeId, x, checkY, z, woodType, false);
                    pillarBlocksConverted++;
                    // Continue searching downward to convert entire pillar
                } else if (['grass', 'dirt', 'snow'].includes(block.type)) {
                    // Found natural ground (dirt/grass/snow) - this is the real base
                    break; // Stop at natural ground
                } else {
                    // Hit water or another block type - stop here
                    break;
                }
            }

            if (pillarBlocksConverted > 0) {
                console.log(`🏛️✅ Tree ${treeId}: Converted ${pillarBlocksConverted} pillar blocks to ${woodType} (now registered for harvest)`);
            }

            return pillarBlocksConverted;
        };

        // 🌳 TREE GENERATION ALGORITHMS
        // Generate Oak Tree (Forest/Plains biomes) - ENHANCED with Tree ID System
        this.generateOakTree = (x, y, z) => {
            // 🌳 Create unique tree registry
            const treeId = this.createTreeRegistry('oak_wood', x, y, z);

            // 🏛️ Fix any stone pillars under this tree (convert to registered trunk blocks)
            this.fixTreePillars(treeId, x, y, z, 'oak_wood');

            // 🗺️ Track tree position for minimap
            this.treePositions.push({ x, z, type: 'oak', treeId });
            // console.log(`🌳 Generated Oak tree ID ${treeId} at (${x}, ${y}, ${z}) - Total trees: ${this.treePositions.length}`);

            const height = 4 + Math.floor(this.seededNoise(x + 5000, z + 5000, this.worldSeed) * 4); // 4-7 blocks tall

            // Generate trunk with tree ID registration
            for (let h = 0; h < height; h++) {
                this.addTreeBlock(treeId, x, y + h, z, 'oak_wood', false);
            }

            // Generate canopy (3x3 at top, expanding to 5x5 in middle)
            const canopyCenter = y + height;

            // Top layer (3x3)
            for (let dx = -1; dx <= 1; dx++) {
                for (let dz = -1; dz <= 1; dz++) {
                    if (Math.abs(dx) + Math.abs(dz) <= 2) { // Cross pattern
                        this.addTreeBlock(treeId, x + dx, canopyCenter, z + dz, 'oak_wood-leaves', false);
                    }
                }
            }

            // Middle layer (5x5)
            for (let dx = -2; dx <= 2; dx++) {
                for (let dz = -2; dz <= 2; dz++) {
                    if (Math.abs(dx) + Math.abs(dz) <= 3 && !(Math.abs(dx) === 2 && Math.abs(dz) === 2)) {
                        this.addTreeBlock(treeId, x + dx, canopyCenter - 1, z + dz, 'oak_wood-leaves', false);
                    }
                }
            }

            // Bottom layer (3x3)
            for (let dx = -1; dx <= 1; dx++) {
                for (let dz = -1; dz <= 1; dz++) {
                    if (Math.abs(dx) + Math.abs(dz) <= 2) {
                        this.addTreeBlock(treeId, x + dx, canopyCenter - 2, z + dz, 'oak_wood-leaves', false);
                    }
                }
            }

            // console.log(`🌳 Oak tree ${treeId} completed with ${height} trunk blocks and canopy`);
        };

        // Generate Pine Tree (Mountain biome) - ENHANCED with Tree ID System
        this.generatePineTree = (x, y, z) => {
            // 🌳 Create unique tree registry
            const treeId = this.createTreeRegistry('pine_wood', x, y, z);

            // 🏛️ Fix any stone pillars under this tree (convert to registered trunk blocks)
            this.fixTreePillars(treeId, x, y, z, 'pine_wood');

            // 🗺️ Track tree position for minimap
            this.treePositions.push({ x, z, type: 'pine', treeId });
            console.log(`🌲 Generated Pine tree ID ${treeId} at (${x}, ${y}, ${z}) - Total trees: ${this.treePositions.length}`);

            const height = 6 + Math.floor(this.seededNoise(x + 6000, z + 6000, this.worldSeed) * 5); // 6-10 blocks tall

            // Generate trunk with tree ID registration
            for (let h = 0; h < height; h++) {
                this.addTreeBlock(treeId, x, y + h, z, 'pine_wood', false);
            }

            // Generate conical canopy (starts small at top, gets wider)
            const canopyStart = y + height - 1;
            const layers = Math.min(5, height - 2);

            for (let layer = 0; layer < layers; layer++) {
                const layerY = canopyStart - layer;
                const radius = Math.min(layer + 1, 3); // Max radius of 3

                for (let dx = -radius; dx <= radius; dx++) {
                    for (let dz = -radius; dz <= radius; dz++) {
                        const distance = Math.sqrt(dx * dx + dz * dz);
                        if (distance <= radius && !(dx === 0 && dz === 0)) {
                            // Add some randomness to make it less perfect
                            const leafNoise = this.seededNoise(x + dx + 7000, z + dz + 7000, this.worldSeed);
                            if (leafNoise > -0.3) { // 80% chance for each leaf
                                this.addTreeBlock(treeId, x + dx, layerY, z + dz, 'pine_wood-leaves', false);
                            }
                        }
                    }
                }
            }

            console.log(`🌲 Pine tree ${treeId} completed with ${height} trunk blocks and conical canopy`);
        };

        // Generate Palm Tree (Desert biome) - ENHANCED with Tree ID System
        this.generatePalmTree = (x, y, z) => {
            // 🌳 Create unique tree registry
            const treeId = this.createTreeRegistry('palm_wood', x, y, z);

            // 🏛️ Fix any stone pillars under this tree (convert to registered trunk blocks)
            this.fixTreePillars(treeId, x, y, z, 'palm_wood');

            // 🗺️ Track tree position for minimap
            this.treePositions.push({ x, z, type: 'palm', treeId });
            console.log(`🌴 Generated Palm tree ID ${treeId} at (${x}, ${y}, ${z}) - Total trees: ${this.treePositions.length}`);

            const height = 5 + Math.floor(this.seededNoise(x + 8000, z + 8000, this.worldSeed) * 4); // 5-8 blocks tall

            // Generate trunk with tree ID registration
            for (let h = 0; h < height; h++) {
                this.addTreeBlock(treeId, x, y + h, z, 'palm_wood', false);
            }

            // Generate fronds at top (8-directional pattern)
            const topY = y + height;
            const directions = [
                [2, 0], [-2, 0], [0, 2], [0, -2],  // Cardinal directions
                [1, 1], [-1, 1], [1, -1], [-1, -1] // Diagonal directions
            ];

            // Central fronds cluster
            for (let dx = -1; dx <= 1; dx++) {
                for (let dz = -1; dz <= 1; dz++) {
                    if (Math.abs(dx) + Math.abs(dz) === 1) { // Plus pattern
                        this.addTreeBlock(treeId, x + dx, topY, z + dz, 'palm_wood-leaves', false);
                    }
                }
            }

            // Extending fronds
            directions.forEach(([dx, dz]) => {
                this.addTreeBlock(treeId, x + dx, topY, z + dz, 'palm_wood-leaves', false);
                // Sometimes add a second frond block extending outward
                const extendNoise = this.seededNoise(x + dx + 9000, z + dz + 9000, this.worldSeed);
                if (extendNoise > 0.2) {
                    this.addTreeBlock(treeId, x + dx + Math.sign(dx), topY, z + dz + Math.sign(dz), 'palm_wood-leaves', false);
                }
            });

            console.log(`🌴 Palm tree ${treeId} completed with ${height} trunk blocks and radial fronds`);
        };

        // Generate Birch Tree (Tundra biome) - ENHANCED with Tree ID System
        this.generateBirchTree = (x, y, z) => {
            // 🌳 Create unique tree registry
            const treeId = this.createTreeRegistry('birch_wood', x, y, z);

            // 🏛️ Fix any stone pillars under this tree (convert to registered trunk blocks)
            this.fixTreePillars(treeId, x, y, z, 'birch_wood');

            // 🗺️ Track tree position for minimap
            this.treePositions.push({ x, z, type: 'birch', treeId });
            console.log(`🌿 Generated Birch tree ID ${treeId} at (${x}, ${y}, ${z}) - Total trees: ${this.treePositions.length}`);

            const height = 2 + Math.floor(this.seededNoise(x + 10000, z + 10000, this.worldSeed) * 3); // 2-4 blocks tall

            // Generate trunk with tree ID registration
            for (let h = 0; h < height; h++) {
                this.addTreeBlock(treeId, x, y + h, z, 'birch_wood', false);
            }

            // Generate sparse, hardy canopy
            const topY = y + height;

            // Small 3x3 canopy but sparse
            for (let dx = -1; dx <= 1; dx++) {
                for (let dz = -1; dz <= 1; dz++) {
                    // Only place leaves in plus pattern and with randomness
                    if (Math.abs(dx) + Math.abs(dz) === 1) {
                        const leafNoise = this.seededNoise(x + dx + 11000, z + dz + 11000, this.worldSeed);
                        if (leafNoise > 0.1) { // 70% chance for sparse look
                            this.addTreeBlock(treeId, x + dx, topY, z + dz, 'birch_wood-leaves', false);
                        }
                    }
                }
            }

            // Sometimes add a few leaves below
            if (height > 2) {
                const belowNoise = this.seededNoise(x + 12000, z + 12000, this.worldSeed);
                if (belowNoise > 0.3) {
                    this.addTreeBlock(treeId, x + 1, topY - 1, z, 'birch_wood-leaves', false);
                }
                if (belowNoise > 0.6) {
                    this.addTreeBlock(treeId, x - 1, topY - 1, z, 'birch_wood-leaves', false);
                }
            }

            console.log(`🌿 Birch tree ${treeId} completed with ${height} trunk blocks and sparse canopy`);
        };

        // Generate Dead Tree (rare treasure tree) - ENHANCED with Tree ID System
        this.generateDeadTree = (x, y, z) => {
            // 🌳 Create unique tree registry
            const treeId = this.createTreeRegistry('dead_wood', x, y, z);

            // 🏛️ Fix any stone pillars under this tree (convert to registered trunk blocks)
            this.fixTreePillars(treeId, x, y, z, 'dead_wood');

            // 🗺️ Track tree position for minimap (skull icon for dead trees!)
            this.treePositions.push({ x, z, type: 'dead', treeId });
            console.log(`💀 Generated Dead tree ID ${treeId} at (${x}, ${y}, ${z}) - Contains treasure!`);

            // Short stumpy dead tree (1-2 blocks tall only)
            const height = 1 + Math.floor(this.seededNoise(x + 13000, z + 13000, this.worldSeed) * 2); // 1-2 blocks tall

            // Generate dead trunk
            for (let h = 0; h < height; h++) {
                this.addTreeBlock(treeId, x, y + h, z, 'dead_wood', false);
            }

            // Create 3x3 grid of dead leaves on the ground around the tree
            // Leaves are placed at ground level (y) in a grid pattern
            for (let dx = -1; dx <= 1; dx++) {
                for (let dz = -1; dz <= 1; dz++) {
                    // Skip the center block where the trunk is
                    if (dx === 0 && dz === 0) continue;

                    // Place withered leaves on ground around tree
                    this.addTreeBlock(treeId, x + dx, y, z + dz, 'dead_wood-leaves', false);
                }
            }

            // 🎁 Mark this tree as containing treasure (will spawn billboard item on harvest)
            const treeMetadata = this.treeRegistry.get(treeId);
            if (treeMetadata) {
                treeMetadata.hasTreasure = true;
            }

            console.log(`💀 Dead tree ${treeId} completed with ${height} trunk blocks and 3x3 leaf grid on ground - treasure inside!`);
        };

        // 🎄 DOUGLAS FIR TREE - Christmas-themed cone tree (year-round 1% spawn)
        this.generateDouglasFir = (x, y, z) => {
            // 🌳 Create unique tree registry
            const treeId = this.createTreeRegistry('douglas_fir', x, y, z);

            // 🏛️ Fix any stone pillars under this tree (convert to registered trunk blocks)
            this.fixTreePillars(treeId, x, y, z, 'douglas_fir');

            // 🗺️ Track tree position for minimap
            this.treePositions.push({ x, z, type: 'douglas_fir', treeId });
            console.log(`🎄 Generated Douglas Fir tree ID ${treeId} at (${x}, ${y}, ${z})`);

            // 🎄 Regular Douglas Fir: 7x7 → 5x5 → 3x3 → 1 cone (~25 blocks tall, 3/4 of Mega Fir's 34 blocks)
            const layers = [
                { size: 7, height: 3 },   // Wide base (7x7, 3 layers)
                { size: 7, height: 3 },   // Maintain width (7x7, 3 layers)
                { size: 5, height: 4 },   // Middle tier (5x5, 4 layers)
                { size: 5, height: 4 },   // Maintain middle (5x5, 4 layers)
                { size: 3, height: 6 },   // Upper tier (3x3, 6 layers)
                { size: 1, height: 5 }    // Trunk to point (1x1, 5 layers)
            ];

            let currentY = y;
            const woodType = 'douglas_fir';
            const leavesType = 'douglas_fir-leaves';

            // Build cone from bottom to top
            for (const layer of layers) {
                const { size, height } = layer;
                const radius = Math.floor(size / 2);

                for (let h = 0; h < height; h++) {
                    if (size === 1) {
                        // Single trunk block
                        this.addTreeBlock(treeId, x, currentY + h, z, woodType, false);
                    } else {
                        // Square layer with leaves/wood mix
                        for (let dx = -radius; dx <= radius; dx++) {
                            for (let dz = -radius; dz <= radius; dz++) {
                                // Use wood for center column, leaves for outer blocks
                                const isCenter = (dx === 0 && dz === 0);
                                const blockType = isCenter ? woodType : leavesType;
                                this.addTreeBlock(treeId, x + dx, currentY + h, z + dz, blockType, false);
                            }
                        }
                    }
                }

                currentY += height;
            }

            console.log(`🎄 Douglas Fir tree ${treeId} completed (${currentY - y} blocks tall)`);
        };

        // 🌳 ANCIENT TREE SYSTEM - Rare majestic trees with thick trunks
        // Generate ancient tree with 2x2 or 3x3 thick trunk base
        this.generateAncientTree = (worldX, surfaceY, worldZ, biome, isMega = false) => {
            // Determine tree type based on biome
            let treeType = 'oak_wood';
            let leafType = 'oak_wood-leaves';

            switch (biome.name) {
                case 'Forest':
                    treeType = Math.random() < 0.7 ? 'oak_wood' : 'birch_wood';
                    leafType = treeType + '-leaves';
                    break;
                case 'Mountain':
                    treeType = 'pine_wood';
                    leafType = 'pine_wood-leaves';
                    break;
                case 'Desert':
                    treeType = 'palm_wood';
                    leafType = 'palm_wood-leaves';
                    break;
                case 'Tundra':
                    treeType = 'pine_wood';
                    leafType = 'pine_wood-leaves';
                    break;
                case 'Plains':
                    treeType = 'oak_wood';
                    leafType = 'oak_wood-leaves';
                    break;
            }

            // 🌳 Create tree registry
            const treeId = this.createTreeRegistry(treeType, worldX, surfaceY, worldZ);

            // 🏛️ Fix any stone pillars under this tree (convert to registered trunk blocks)
            this.fixTreePillars(treeId, worldX, surfaceY, worldZ, treeType);

            this.treePositions.push({ x: worldX, z: worldZ, type: treeType.replace('_wood', ''), treeId });

            // 🏛️ MEGA ANCIENT TREE: Cone-shaped base (5% chance)
            if (isMega) {
                const baseHeight = 8 + Math.floor(this.seededNoise(worldX + 20000, worldZ + 20000, this.worldSeed) * 6); // 8-13 blocks
                const trunkHeight = 12 + Math.floor(this.seededNoise(worldX + 21000, worldZ + 21000, this.worldSeed) * 8); // 12-19 blocks

                console.log(`🏛️🌳 MEGA ANCIENT TREE spawning! Type: ${treeType}, Base height: ${baseHeight}, Total: ${baseHeight + trunkHeight}`);

                // Cone-shaped base - starts at 5x5, narrows to 3x3, then 2x2
                for (let h = 0; h < baseHeight; h++) {
                    const progress = h / baseHeight; // 0.0 to 1.0
                    let radius;

                    if (progress < 0.4) {
                        radius = 2; // 5x5 base (radius 2 = -2 to +2)
                    } else if (progress < 0.7) {
                        radius = 1; // 3x3 middle (radius 1 = -1 to +1)
                    } else {
                        radius = 0; // 1x1 top transitioning to single trunk
                    }

                    // Place trunk blocks in square pattern
                    for (let dx = -radius; dx <= radius; dx++) {
                        for (let dz = -radius; dz <= radius; dz++) {
                            this.addTreeBlock(treeId, worldX + dx, surfaceY + h, worldZ + dz, treeType, false);
                        }
                    }
                }

                // Single trunk above cone base
                for (let h = baseHeight; h < baseHeight + trunkHeight; h++) {
                    this.addTreeBlock(treeId, worldX, surfaceY + h, worldZ, treeType, false);
                }

                // Massive canopy
                this.generateMassiveCanopy(treeId, worldX, surfaceY + baseHeight + trunkHeight, worldZ, leafType, treeType);

            } else {
                // 🌳 REGULAR ANCIENT TREE: 2x2 or 3x3 thick trunk
                const baseSize = Math.random() < 0.5 ? 1 : 1; // radius 1 = 3x3, always 3x3 for ancient
                const trunkHeight = 10 + Math.floor(this.seededNoise(worldX + 18000, worldZ + 18000, this.worldSeed) * 6); // 10-15 blocks

                console.log(`🌳 Ancient Tree spawning! Type: ${treeType}, Size: ${baseSize === 0 ? '2x2' : '3x3'}, Height: ${trunkHeight}`);

                // Thick trunk base
                for (let h = 0; h < trunkHeight; h++) {
                    for (let dx = -baseSize; dx <= baseSize; dx++) {
                        for (let dz = -baseSize; dz <= baseSize; dz++) {
                            this.addTreeBlock(treeId, worldX + dx, surfaceY + h, worldZ + dz, treeType, false);
                        }
                    }
                }

                // Large canopy
                this.generateLargeCanopy(treeId, worldX, surfaceY + trunkHeight, worldZ, leafType, treeType);
            }
        };

        // 🌿 Generate large canopy for ancient trees
        this.generateLargeCanopy = (treeId, x, y, z, leafType, treeType) => {
            if (treeType.includes('pine')) {
                // Large conical pine canopy
                for (let layer = 0; layer < 8; layer++) {
                    const layerY = y - layer;
                    const radius = Math.min(layer + 2, 5); // Up to radius 5
                    for (let dx = -radius; dx <= radius; dx++) {
                        for (let dz = -radius; dz <= radius; dz++) {
                            const distance = Math.sqrt(dx * dx + dz * dz);
                            if (distance <= radius && !(dx === 0 && dz === 0 && layer > 0)) {
                                this.addTreeBlock(treeId, x + dx, layerY, z + dz, leafType, false);
                            }
                        }
                    }
                }
            } else {
                // Large oak/birch/palm canopy (7x7 base)
                for (let dx = -3; dx <= 3; dx++) {
                    for (let dz = -3; dz <= 3; dz++) {
                        if (Math.abs(dx) + Math.abs(dz) <= 5) {
                            this.addTreeBlock(treeId, x + dx, y, z + dz, leafType, false);
                        }
                    }
                }
                for (let dx = -2; dx <= 2; dx++) {
                    for (let dz = -2; dz <= 2; dz++) {
                        this.addTreeBlock(treeId, x + dx, y + 1, z + dz, leafType, false);
                    }
                }
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dz = -1; dz <= 1; dz++) {
                        this.addTreeBlock(treeId, x + dx, y + 2, z + dz, leafType, false);
                    }
                }
            }
        };

        // 🏛️ Generate massive canopy for mega ancient trees
        this.generateMassiveCanopy = (treeId, x, y, z, leafType, treeType) => {
            if (treeType.includes('pine')) {
                // Massive conical pine canopy
                for (let layer = 0; layer < 12; layer++) {
                    const layerY = y - layer;
                    const radius = Math.min(layer + 2, 7); // Up to radius 7!
                    for (let dx = -radius; dx <= radius; dx++) {
                        for (let dz = -radius; dz <= radius; dz++) {
                            const distance = Math.sqrt(dx * dx + dz * dz);
                            if (distance <= radius) {
                                this.addTreeBlock(treeId, x + dx, layerY, z + dz, leafType, false);
                            }
                        }
                    }
                }
            } else {
                // Massive oak/birch canopy (11x11 base!)
                for (let dx = -5; dx <= 5; dx++) {
                    for (let dz = -5; dz <= 5; dz++) {
                        if (Math.abs(dx) + Math.abs(dz) <= 8) {
                            this.addTreeBlock(treeId, x + dx, y, z + dz, leafType, false);
                        }
                    }
                }
                for (let dx = -4; dx <= 4; dx++) {
                    for (let dz = -4; dz <= 4; dz++) {
                        if (Math.abs(dx) + Math.abs(dz) <= 6) {
                            this.addTreeBlock(treeId, x + dx, y + 1, z + dz, leafType, false);
                        }
                    }
                }
                for (let dx = -3; dx <= 3; dx++) {
                    for (let dz = -3; dz <= 3; dz++) {
                        this.addTreeBlock(treeId, x + dx, y + 2, z + dz, leafType, false);
                    }
                }
                for (let dx = -2; dx <= 2; dx++) {
                    for (let dz = -2; dz <= 2; dz++) {
                        this.addTreeBlock(treeId, x + dx, y + 3, z + dz, leafType, false);
                    }
                }
            }
        };

        // 🌳 TREE GENERATION HELPERS
        // Determine if a tree should be generated at this location
        this.shouldGenerateTree = (worldX, worldZ, biome) => {
            // Use new biome system's treeChance property if available
            if (biome.treeChance !== undefined) {
                const treeNoise = this.seededNoise(worldX + 4000, worldZ + 4000, this.worldSeed);
                
                // Noise is -1 to 1, so we need to adjust the threshold
                // Convert treeChance (0 to 1) to a threshold in the -1 to 1 range
                // Higher treeChance = lower threshold = more trees
                const threshold = 1 - (biome.treeChance * 2);
                return treeNoise > threshold;
            }

            // Fallback: Define tree spawn rates based on biome name
            const treeChances = {
                'Forest': 0.30,
                'Seasonal Forest': 0.35,
                'Rain Forest': 0.50,
                'Mountain': 0.15,
                'Plains': 0.08,
                'Desert': 0.01,
                'Tundra': 0.02,
                'Taiga': 0.25,
                'Shrubland': 0.05,
                'Savanna': 0.12,
                'Swamp': 0.30
            };

            const treeChance = treeChances[biome.name] || 0;
            if (treeChance === 0) return false;

            // Use noise for natural tree distribution
            const treeNoise = this.seededNoise(worldX + 4000, worldZ + 4000, this.worldSeed);

            // For mountains, reduce tree density at higher elevations
            if (biome.name === 'Mountain') {
                const elevationFactor = 1 - ((worldZ * 0.1) % 1); // Simulate elevation
                return treeNoise > (1 - treeChance * elevationFactor);
            }

            return treeNoise > (1 - treeChance * 2); // Convert chance to noise threshold
        };

        // Generate the appropriate tree type for the biome
        this.generateTreeForBiome = (worldX, treeHeight, worldZ, biome) => {
            // 🔍 SEARCH DOWNWARD to find actual ground surface
            let groundY = treeHeight - 1;
            let foundGround = false;

            for (let searchY = treeHeight - 1; searchY >= Math.max(0, treeHeight - 5); searchY--) {
                const block = this.getBlock(worldX, searchY, worldZ);
                if (block && block.type && block.type !== 'air' && block.type !== 'water') {
                    groundY = searchY;
                    foundGround = true;
                    break;
                }
            }

            if (!foundGround) {
                return; // No ground found within search range
            }

            const groundBlock = this.getBlock(worldX, groundY, worldZ);
            if (!groundBlock) {
                return; // No ground block found
            }

            // 🌳 CONVERT STONE/SAND TO DIRT for tree base (go 2 blocks deep for roots!)
            const groundType = groundBlock.type;
            if (['stone', 'iron', 'sand'].includes(groundType)) {
                // 🏛️ PILLAR TREE DETECTION: Check if this is a narrow elevated column
                // Count surrounding blocks at same height
                let solidNeighbors = 0;
                const neighborOffsets = [[1,0], [-1,0], [0,1], [0,-1]];
                for (const [dx, dz] of neighborOffsets) {
                    const neighborBlock = this.getBlock(worldX + dx, groundY, worldZ + dz);
                    if (neighborBlock && neighborBlock.type !== 'air' && neighborBlock.type !== 'water') {
                        solidNeighbors++;
                    }
                }

                // If isolated column (2 or fewer neighbors), it's a Pillar Tree!
                if (solidNeighbors <= 2) {
                    // 🏛️ PILLAR TREE: Convert stone pillar to wood pillar (matches tree type)
                    // Determine wood type based on biome
                    let pillarWoodType = 'oak_wood'; // Default
                    switch (biome.name) {
                        case 'Mountain': pillarWoodType = 'pine_wood'; break;
                        case 'Desert': pillarWoodType = 'palm_wood'; break;
                        case 'Tundra': pillarWoodType = 'birch_wood'; break;
                        default: pillarWoodType = 'oak_wood'; break; // Forest, Plains
                    }

                    // Convert the top block (tree base)
                    this.removeBlock(worldX, groundY, worldZ, false);
                    this.addBlock(worldX, groundY, worldZ, pillarWoodType, false);

                    // 🌲 EXTENDED PILLAR CONVERSION: Search downward and convert ALL stone/iron/sand blocks in the pillar
                    // This ensures the entire visible pillar becomes wood (not just 2 blocks)
                    let blocksConverted = 1; // Already converted top block
                    for (let checkY = groundY - 1; checkY >= groundY - 10; checkY--) {
                        const pillarBlock = this.getBlock(worldX, checkY, worldZ);

                        // Stop if we hit air, water, dirt, grass, or bottom of world
                        if (!pillarBlock || checkY < 1) break;
                        if (!['stone', 'iron', 'sand'].includes(pillarBlock.type)) break;

                        // Convert this stone/iron/sand block to wood
                        this.removeBlock(worldX, checkY, worldZ, false);
                        this.addBlock(worldX, checkY, worldZ, pillarWoodType, false);
                        blocksConverted++;
                    }

                    if (Math.random() < 0.1) { // 10% logging
                        console.log(`🏛️ Pillar Tree spawned at (${worldX}, ${groundY}, ${worldZ}) - ${pillarWoodType} pillar (${blocksConverted} blocks converted)`);
                    }
                } else {
                    // Normal terrain - replace ground with dirt for natural tree placement
                    this.removeBlock(worldX, groundY, worldZ, false);
                    this.addBlock(worldX, groundY, worldZ, 'dirt', new THREE.Color(0x8B4513), false);

                    // Also convert block below for deeper roots
                    const deeperBlock = this.getBlock(worldX, groundY - 1, worldZ);
                    if (deeperBlock && ['stone', 'iron', 'sand'].includes(deeperBlock.type)) {
                        this.removeBlock(worldX, groundY - 1, worldZ, false);
                        this.addBlock(worldX, groundY - 1, worldZ, 'dirt', new THREE.Color(0x8B4513), false);
                    }
                }
            } else if (!['grass', 'dirt'].includes(groundType)) {
                return; // Invalid ground type (e.g., bedrock, leaves, wood)
            }

            // 🔍 SEARCH UPWARD to find first empty air space for tree trunk
            let actualTreeHeight = groundY + 1;
            for (let searchY = groundY + 1; searchY <= groundY + 5; searchY++) {
                const block = this.getBlock(worldX, searchY, worldZ);
                if (!block || block.type === 'air') {
                    actualTreeHeight = searchY;
                    break;
                }
            }

            // ✅ Use the found air position for tree placement
            treeHeight = actualTreeHeight;

            if (Math.random() < 0.01) { // 1% debug logging
                console.log(`🌲 Tree surface search: Ground Y=${groundY} (${groundType}), Tree trunk Y=${treeHeight} at (${worldX}, ${worldZ})`);
            }

            // 🌿 Reduced collision detection - only check immediate trunk position (1x1x3)
            // Old 7x7x3 zone was blocking ALL trees from spawning!
            for (let dy = 0; dy <= 2; dy++) { // Only check trunk height
                const checkY = treeHeight + dy;
                const checkBlock = this.getBlock(worldX, checkY, worldZ);

                if (checkBlock && checkBlock.type !== 'air') {
                    // Only check exact trunk position for obstructions
                    if (checkBlock.type === 'shrub') {
                        console.log(`🚫🌿 Tree BLOCKED by shrub at trunk position (${worldX},${checkY},${worldZ})`);
                        return;
                    }

                    if (this.isWoodBlock(checkBlock.type)) {
                        console.log(`🚫🌳 Tree blocked by existing tree trunk at (${worldX},${checkY},${worldZ})`);
                        return;
                    }

                    const existingTreeId = this.getTreeIdFromBlock(worldX, checkY, worldZ);
                    if (existingTreeId) {
                        console.log(`🚫🆔 Tree blocked by existing tree ID ${existingTreeId} at (${worldX},${checkY},${worldZ})`);
                        return;
                    }
                }
            }

            console.log(`✅ Tree placement approved at (${worldX},${treeHeight},${worldZ}) - no conflicts detected`);

            // 🎲 5% chance to spawn a rare dead tree with treasure!
            const deadTreeNoise = this.seededNoise(worldX + 15000, worldZ + 15000, this.worldSeed);
            const deadTreeChance = (deadTreeNoise + 1) / 2; // Normalize from [-1,1] to [0,1]
            if (deadTreeChance > 0.95) { // 5% spawn rate
                console.log(`💀 RARE SPAWN: Dead tree with treasure at (${worldX},${treeHeight},${worldZ})!`);
                this.generateDeadTree(worldX, treeHeight, worldZ);
                return; // Don't generate normal tree
            }

            // Generate tree based on biome type
            console.log(`🌲 Attempting tree generation - Biome: "${biome.name}" at (${worldX}, ${treeHeight}, ${worldZ})`);

            switch (biome.name) {
                case 'Forest':
                    console.log('🌳 Generating Forest oak tree');
                    this.generateOakTree(worldX, treeHeight, worldZ);
                    break;
                case 'Plains':
                    console.log('🌳 Generating Plains oak tree');
                    this.generateOakTree(worldX, treeHeight, worldZ); // Oak trees in plains too
                    break;
                case 'Mountain':
                    console.log('🌲 Generating Mountain pine tree');
                    this.generatePineTree(worldX, treeHeight, worldZ);
                    break;
                case 'Desert':
                    console.log('🌴 Generating Desert palm tree');
                    this.generatePalmTree(worldX, treeHeight, worldZ);
                    break;
                case 'Tundra':
                    console.log('🌲 Generating Tundra birch tree');
                    this.generateBirchTree(worldX, treeHeight, worldZ);
                    break;
                default:
                    console.log(`⚠️ Unknown biome "${biome.name}" - using fallback oak tree`);
                    this.generateOakTree(worldX, treeHeight, worldZ);
            }
        };

        // 🌳 TREE CACHE: Store tree positions per chunk for persistence
        this.treeCache = new Map(); // Map<chunkKey, Array<{x, y, z, biome}>>

        const unloadChunk = (chunkX, chunkZ) => {
            const chunkKey = getChunkKey(chunkX, chunkZ);
            if (!this.loadedChunks.has(chunkKey)) return;

            // 🌳 SAVE TREES: Scan chunk for trees before unloading
            const trees = [];
            const treeIdsToRemove = new Set();
            
            for (let x = 0; x < this.chunkSize; x++) {
                for (let z = 0; z < this.chunkSize; z++) {
                    const worldX = chunkX * this.chunkSize + x;
                    const worldZ = chunkZ * this.chunkSize + z;
                    
                    // Scan for tree trunks (wood blocks) - check full height range for mega mountains!
                    for (let y = 1; y <= 65; y++) {
                        const block = this.getBlock(worldX, y, worldZ);
                        if (block && (block.type === 'oak_wood' || block.type === 'pine_wood' || 
                                     block.type === 'birch_wood' || block.type === 'palm_wood' || 
                                     block.type === 'dead_wood')) {
                            const biome = this.biomeWorldGen.getBiomeAt(worldX, worldZ, this.worldSeed);
                            // Save tree type, position, and biome for proper restoration
                            trees.push({ 
                                x: worldX, 
                                y, 
                                z: worldZ, 
                                treeType: block.type, // Store wood type for re-registration
                                biome 
                            });
                            
                            // Track tree ID for registry cleanup
                            const treeId = this.getTreeIdFromBlock(worldX, y, worldZ);
                            if (treeId !== null) {
                                treeIdsToRemove.add(treeId);
                            }
                            
                            break; // Found trunk base, move to next column
                        }
                    }
                }
            }
            
            // Store trees in cache
            if (trees.length > 0) {
                this.treeCache.set(chunkKey, trees);
            }
            
            // Clean up tree registries for this chunk
            for (const treeId of treeIdsToRemove) {
                this.removeTreeFromRegistry(treeId);
            }

            // console.log(`Unloading chunk ${chunkKey}`); // Removed for performance

            for (let x = 0; x < this.chunkSize; x++) {
                for (let z = 0; z < this.chunkSize; z++) {
                    const worldX = chunkX * this.chunkSize + x;
                    const worldZ = chunkZ * this.chunkSize + z;

                    // 🌳 ENHANCED: Remove all blocks in full height range to handle trees and leaves
                    // Mountains can be y=60, trees can be y=40+ with canopies even higher
                    for (let y = -10; y <= 70; y++) { // Full range to handle mega mountains and tall trees
                        this.removeBlock(worldX, y, worldZ, false); // 🎯 false = don't give items for despawned blocks
                    }
                }
            }

            this.loadedChunks.delete(chunkKey);
        };

        const updateChunks = async () => {
            const playerChunkX = Math.floor(this.player.position.x / this.chunkSize);
            const playerChunkZ = Math.floor(this.player.position.z / this.chunkSize);

            // 🚨 EMERGENCY CLEANUP: If block count exceeds 10,000, use aggressive cleanup
            const blockCount = Object.keys(this.world).length;
            // renderDistance loads (2*dist+1)² chunks in a square
            // Keep renderDistance chunks (what's visible) to prevent pop-in
            // Only go ultra-aggressive (0) if we're REALLY desperate (>20k blocks)
            let cleanupRadius;
            if (blockCount > 20000) {
                cleanupRadius = 0; // Ultra-aggressive: only current chunk
            } else if (blockCount > 10000) {
                cleanupRadius = this.renderDistance; // Aggressive: keep visible chunks
            } else {
                cleanupRadius = this.chunkCleanupRadius; // Normal: 8 chunks
            }
            
            if (blockCount > 10000) {
                console.warn(`🚨 EMERGENCY: ${blockCount} blocks! Cleanup radius ${cleanupRadius} chunks`);
            }

            // Clean up distant chunk tracking data to prevent memory bloat
            this.cleanupChunkTracking(playerChunkX, playerChunkZ, cleanupRadius);
            
            // 🧹 PERFORMANCE: Clean up distant position arrays
            this.cleanupDistantPositions(this.player.position.x, this.player.position.z, cleanupRadius * this.chunkSize);

            // Load chunks around player
            for (let dx = -this.renderDistance; dx <= this.renderDistance; dx++) {
                for (let dz = -this.renderDistance; dz <= this.renderDistance; dz++) {
                    const chunkX = playerChunkX + dx;
                    const chunkZ = playerChunkZ + dz;
                    generateChunk(chunkX, chunkZ);

                    // 🗺️ Track chunk exploration for world map
                    const chunkKey = `${chunkX},${chunkZ}`;
                    this.exploredChunks.add(chunkKey);

                    // Check for random world item spawning in this chunk
                    this.checkChunkForWorldItems(chunkX, chunkZ);
                }
            }

            // 🧹 PERFORMANCE: Unload distant chunks (disabled old system, using cleanupChunkTracking instead)
            // Old system: unloads at renderDistance + 1 (too aggressive, causes reload thrashing)
            // New system: unloads at chunkCleanupRadius (12 chunks, much better)
            /*
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
            */

            // Clean up worker cache every 60 frames (~1 second)
            if (this.workerInitialized && this.frameCount % 60 === 0) {
                const maxCacheRadius = this.renderDistance * 2; // 2x render distance
                this.workerManager.cleanupDistantChunks(playerChunkX, playerChunkZ, maxCacheRadius);
            }

            // 🎨 Update LOD chunks (visual horizon beyond render distance)
            if (this.lodManager && this.lodManager.enabled) {
                await this.lodManager.updateLODChunks(playerChunkX, playerChunkZ);
            }
        };

        // Make updateChunks available as instance method
        this.updateChunks = updateChunks;

        // Initial chunk loading around spawn
        console.log('Loading initial chunks...');
        updateChunks();
        console.log('✅ Initial chunks loaded');

        // 🌍 ENHANCED: Find proper spawn position after terrain generation
        this.findAndSetSpawnPosition();

        // 🎒 NOTE: Backpack spawning now handled by:
        // 1. App.js tutorial system (spawnStarterBackpack after chat)
        // 2. newGame() function (spawnStartingBackpack for new worlds)
        // Removed duplicate spawn that caused multiple backpacks!

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
                    // NEW: Save inventory state to prevent duplicate backpack spawning
                    hasBackpack: this.hasBackpack,
                    hotbarSlots: this.hotbarSlots,
                    backpackSlots: this.backpackSlots,
                    selectedSlot: this.selectedSlot,
                    player: this.player,
                    worldSeed: this.worldSeed,
                    // NEW: Save explorer journal pins and navigation state
                    explorerPins: this.explorerPins || [],
                    activeNavigation: this.activeNavigation,
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
                        this.removeBlock(x, y, z, false); // Don't give items when clearing saved blocks
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
                                // 🗑️ MEMORY LEAK FIX: Dispose crafted object resources
                                if (objectData.mesh.geometry) {
                                    objectData.mesh.geometry.dispose();
                                }
                                if (objectData.mesh.material) {
                                    if (objectData.mesh.material.map) {
                                        objectData.mesh.material.map.dispose();
                                    }
                                    objectData.mesh.material.dispose();
                                }
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

                // NEW: Restore inventory state to prevent duplicate backpack issues
                if (saveData.hasBackpack !== undefined) {
                    this.hasBackpack = saveData.hasBackpack;
                    console.log(`📦 Restored hasBackpack state: ${this.hasBackpack}`);
                }
                if (saveData.hotbarSlots) {
                    this.hotbarSlots = saveData.hotbarSlots;
                    console.log(`🎯 Restored ${this.hotbarSlots.length} hotbar slots`);
                }
                if (saveData.backpackSlots) {
                    this.backpackSlots = saveData.backpackSlots;
                    console.log(`🎒 Restored ${this.backpackSlots.length} backpack slots`);
                }
                if (saveData.selectedSlot !== undefined) {
                    this.selectedSlot = saveData.selectedSlot;
                }

                // Update UI to reflect restored inventory
                if (this.hasBackpack) {
                    this.showHotbarTutorial(); // Show hotbar since player has backpack
                    this.showToolButtons(); // Show tool menu buttons
                    this.updateHotbarCounts();
                    this.updateBackpackInventoryDisplay();
                }

                // NEW: Restore explorer journal pins and navigation state
                if (saveData.explorerPins) {
                    this.explorerPins = saveData.explorerPins;
                    console.log(`📍 Restored ${this.explorerPins.length} explorer pins`);
                }
                if (saveData.activeNavigation) {
                    this.activeNavigation = saveData.activeNavigation;
                    console.log(`🧭 Restored active navigation to "${this.activeNavigation.name}"`);
                }

                // Restore seed if available, otherwise generate new one
                if (saveData.worldSeed) {
                    this.worldSeed = saveData.worldSeed;
                    this.seededRandom = this.createSeededRandom(this.worldSeed);
            this.biomeWorldGen.setWorldSeed(this.worldSeed);
                } else {
                    // For backwards compatibility with old saves
                    this.worldSeed = this.generateInitialSeed();
                    this.seededRandom = this.createSeededRandom(this.worldSeed);
            this.biomeWorldGen.setWorldSeed(this.worldSeed);
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
                // 🌾 FARMING: Increment day counter when day rolls over
                this.dayNightCycle.currentDay++;
                console.log(`🌅 New day! Day ${this.dayNightCycle.currentDay}`);
            }

            // 🌾 FARMING: Track day changes (also handles initial dawn crossing)
            if (this.dayNightCycle.lastDayTime > this.dayNightCycle.currentTime && this.dayNightCycle.lastDayTime !== 12) {
                // Day has changed (time wrapped around midnight)
                this.dayNightCycle.currentDay++;
            }
            this.dayNightCycle.lastDayTime = this.dayNightCycle.currentTime;

            // Calculate sun position based on time of day
            const sunAngle = ((this.dayNightCycle.currentTime - 6) / 12) * Math.PI; // Sun rises at 6am, peaks at noon, sets at 6pm
            const sunX = Math.cos(sunAngle) * 20;
            const sunY = Math.max(0.1, Math.sin(sunAngle) * 20); // Keep light slightly above horizon
            const sunZ = 0;

            this.dayNightCycle.directionalLight.position.set(sunX, sunY, sunZ);

            // Adjust light intensity and color based on time
            let intensity, color, ambientIntensity, skyColor;

            // 20-minute cycle: Dawn 6-8, Day 8-17, Dusk 17-19, Evening 19-21, Night 21-6
            if (this.dayNightCycle.currentTime >= 6 && this.dayNightCycle.currentTime < 8) {
                // Dawn (6am-8am) - 2 minutes - orange/red light
                const t = (this.dayNightCycle.currentTime - 6) / 2;
                intensity = 0.3 + t * 0.5;
                color = new THREE.Color().lerpColors(new THREE.Color(0xff4500), new THREE.Color(0xffffff), t);
                ambientIntensity = 0.2 + t * 0.3;
                skyColor = new THREE.Color().lerpColors(new THREE.Color(0x2c1810), new THREE.Color(0x87ceeb), t);
            } else if (this.dayNightCycle.currentTime >= 8 && this.dayNightCycle.currentTime < 17) {
                // Day (8am-5pm) - 9 minutes - full white light
                intensity = 0.8;
                color = new THREE.Color(0xffffff);
                ambientIntensity = 0.5;
                skyColor = new THREE.Color(0x87ceeb); // Sky blue
                
                // Reset nightfall tutorial flag for next night
                this.nightfallTutorialShownThisNight = false;
            } else if (this.dayNightCycle.currentTime >= 17 && this.dayNightCycle.currentTime < 19) {
                // Dusk (5pm-7pm) - 2 minutes - orange/red fading
                const t = (this.dayNightCycle.currentTime - 17) / 2;
                intensity = 0.8 - t * 0.5;
                color = new THREE.Color().lerpColors(new THREE.Color(0xffffff), new THREE.Color(0xff4500), t);
                ambientIntensity = 0.5 - t * 0.25;
                skyColor = new THREE.Color().lerpColors(new THREE.Color(0x87ceeb), new THREE.Color(0xff6b35), t);
            } else if (this.dayNightCycle.currentTime >= 19 && this.dayNightCycle.currentTime < 21) {
                // Evening (7pm-9pm) - 2 minutes - deeper orange to blue
                const t = (this.dayNightCycle.currentTime - 19) / 2;
                intensity = 0.3 - t * 0.25;
                color = new THREE.Color().lerpColors(new THREE.Color(0xff4500), new THREE.Color(0x4169e1), t);
                ambientIntensity = 0.25 - t * 0.2;
                skyColor = new THREE.Color().lerpColors(new THREE.Color(0xff6b35), new THREE.Color(0x1a1a2e), t);
            } else {
                // Night (9pm-6am) - 9 minutes - very dim blue
                intensity = 0.05;
                color = new THREE.Color(0x4169e1);
                ambientIntensity = 0.05;
                skyColor = new THREE.Color(0x0a0a0f); // Very dark blue/black

                // 🎓 Trigger nightfall tutorial once when night begins
                if (this.tutorialSystem && this.dayNightCycle.currentTime >= 21 && this.dayNightCycle.currentTime < 21.5) {
                    if (!this.nightfallTutorialShownThisNight) {
                        this.tutorialSystem.onNightfall();
                        this.nightfallTutorialShownThisNight = true;
                    }
                }
            }

            this.dayNightCycle.directionalLight.intensity = intensity;
            this.dayNightCycle.directionalLight.color.copy(color);
            this.dayNightCycle.ambientLight.intensity = ambientIntensity;
            
            // 🎵 Update music based on time of day (crossfade between day/night)
            if (this.musicSystem) {
                this.musicSystem.updateTimeOfDay(this.dayNightCycle.currentTime);
            }
            
            // 🔦 Set torch allowed flag (dusk/night = 5pm-6am)
            const time = this.dayNightCycle.currentTime;
            this.isTorchAllowed = (time >= 17 || time < 6);
            
            // 🌫️ Update fog based on time of day using centralized updateFog()
            const isNight = this.dayNightCycle.currentTime >= 19 || this.dayNightCycle.currentTime < 6;
            const fogColor = isNight ? 0x0a0a0f : skyColor.getHex(); // Dark at night, sky color during day
            this.updateFog(fogColor); // Use centralized fog calculation (prevents memory leak)
            
            this.scene.background = skyColor;

            // Update time indicator icon and color
            this.updateTimeIndicator();
        };

        // Update time indicator based on current time
        this.updateTimeIndicator = () => {
            if (!this.timeIndicator) return;

            const time = this.dayNightCycle.currentTime;
            let icon, color, title;

            let timePeriod;
            if (time >= 6 && time < 8) {
                // Dawn - sunrise
                icon = 'wb_twilight';
                color = '#FF8C00'; // Orange
                title = 'Dawn - Click for menu';
                timePeriod = 'dawn';
            } else if (time >= 8 && time < 17) {
                // Day - sun
                icon = 'wb_sunny';
                color = '#FFD700'; // Gold
                title = 'Daytime - Click for menu';
                timePeriod = 'sun';
            } else if (time >= 17 && time < 19) {
                // Dusk - sunset
                icon = 'wb_twighlight';
                color = '#FF6347'; // Tomato red
                title = 'Sunset - Click for menu';
                timePeriod = 'dusk';
            } else if (time >= 19 && time < 21) {
                // Evening - moon rise
                icon = 'brightness_2';
                color = '#9370DB'; // Medium purple
                title = 'Evening - Click for menu';
                timePeriod = 'moon';
            } else {
                // Night - full moon
                icon = 'brightness_3';
                color = '#C0C0C0'; // Silver
                title = 'Nighttime - Click for menu';
                timePeriod = 'night';
            }

            // Try to get enhanced icon
            const enhancedIcon = this.enhancedGraphics.getTimeIndicatorIcon(timePeriod, icon);

            if (enhancedIcon.type === 'image') {
                // Use enhanced image
                this.timeIndicator.innerHTML = `<img src="${enhancedIcon.content}" style="${enhancedIcon.style} pointer-events: none;" alt="${enhancedIcon.alt}">`;
                // Reset text color for image mode
                this.timeIndicator.style.color = '';
                // Ensure pointer events work on the container
                this.timeIndicator.style.pointerEvents = 'auto';
            } else {
                // Use material icon fallback
                this.timeIndicator.innerHTML = '';
                this.timeIndicator.textContent = enhancedIcon.content;
                this.timeIndicator.style.color = color;
                this.timeIndicator.style.pointerEvents = 'auto';
            }

            this.timeIndicator.title = title;

            // Update tool hotkey label colors for day/night contrast
            this.updateToolHotkeyColors(time);
        };

        // Update tool hotkey label colors for day/night contrast
        this.updateToolHotkeyColors = (time) => {
            let labelColor, shadowColor;

            if (time >= 6 && time < 19) {
                // Day/Dawn/Dusk - use dark text with light shadow for contrast against bright sky
                labelColor = '#000000'; // Black
                shadowColor = 'rgba(255,255,255,0.8)'; // White shadow
            } else {
                // Night/Evening - use light text with dark shadow for contrast against dark sky
                labelColor = '#FFFFFF'; // White
                shadowColor = 'rgba(0,0,0,0.8)'; // Black shadow
            }

            // Update backpack hotkey label
            if (this.backpackHotkeyLabel) {
                this.backpackHotkeyLabel.style.color = labelColor;
                this.backpackHotkeyLabel.style.textShadow = `1px 1px 2px ${shadowColor}`;
            }

            // Update workbench hotkey label
            if (this.workbenchHotkeyLabel) {
                this.workbenchHotkeyLabel.style.color = labelColor;
                this.workbenchHotkeyLabel.style.textShadow = `1px 1px 2px ${shadowColor}`;
            }
        };

        // Update mini-map
        this.updateMiniMap = () => {
            if (!this.miniMap || !this.miniMapContext) return;

            const ctx = this.miniMapContext;
            const size = 100;
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

                    const biome = this.biomeWorldGen.getBiomeAt(worldX, worldZ, this.worldSeed);

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

            // 🌊 Draw water positions (blue dots) FIRST - beneath trees
            this.waterPositions.forEach(water => {
                const relX = water.x - this.player.position.x;
                const relZ = water.z - this.player.position.z;

                // Convert to minimap coordinates
                const waterMapX = size/2 + relX / scale;
                const waterMapZ = size/2 + relZ / scale;

                // Only draw if within minimap bounds
                if (waterMapX >= 0 && waterMapX < size && waterMapZ >= 0 && waterMapZ < size) {
                    ctx.fillStyle = '#1E90FF'; // Dodger blue - same as water block color
                    ctx.fillRect(waterMapX - 1, waterMapZ - 1, 2, 2); // Small 2x2 blue squares
                }
            });

            // 🌳 Draw tree positions (green dots) ON TOP - above water
            this.treePositions.forEach(tree => {
                const relX = tree.x - this.player.position.x;
                const relZ = tree.z - this.player.position.z;

                // Convert to minimap coordinates
                const treeMapX = size/2 + relX / scale;
                const treeMapZ = size/2 + relZ / scale;

                // Only draw if within minimap bounds
                if (treeMapX >= 0 && treeMapX < size && treeMapZ >= 0 && treeMapZ < size) {
                    // Different colors for different tree types
                    ctx.fillStyle = tree.type === 'oak' ? '#00ff00' : '#228B22'; // Bright green for oak, dark green for pine
                    ctx.beginPath();
                    ctx.arc(treeMapX, treeMapZ, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            // 🏛️ Draw ruins positions (gray/brown squares) - ON TOP of terrain
            this.ruinPositions.forEach(ruin => {
                const relX = ruin.x - this.player.position.x;
                const relZ = ruin.z - this.player.position.z;

                // Convert to minimap coordinates
                const ruinMapX = size/2 + relX / scale;
                const ruinMapZ = size/2 + relZ / scale;

                // Only draw if within minimap bounds
                if (ruinMapX >= 0 && ruinMapX < size && ruinMapZ >= 0 && ruinMapZ < size) {
                    // Size-based colors: small=gray, medium=dark gray, large=brown, colossal=dark brown
                    if (ruin.size === 'small') {
                        ctx.fillStyle = '#808080'; // Gray
                        ctx.fillRect(ruinMapX - 1, ruinMapZ - 1, 2, 2); // 2x2 square
                    } else if (ruin.size === 'medium') {
                        ctx.fillStyle = '#606060'; // Dark gray
                        ctx.fillRect(ruinMapX - 1.5, ruinMapZ - 1.5, 3, 3); // 3x3 square
                    } else if (ruin.size === 'large') {
                        ctx.fillStyle = '#8B4513'; // Saddle brown
                        ctx.fillRect(ruinMapX - 2, ruinMapZ - 2, 4, 4); // 4x4 square
                    } else if (ruin.size === 'colossal') {
                        ctx.fillStyle = '#654321'; // Dark brown (rare!)
                        ctx.fillRect(ruinMapX - 2.5, ruinMapZ - 2.5, 5, 5); // 5x5 square
                        // Add glow effect for colossal ruins
                        ctx.fillStyle = 'rgba(101, 67, 33, 0.3)';
                        ctx.fillRect(ruinMapX - 3.5, ruinMapZ - 3.5, 7, 7);
                    }
                }
            });

            // Draw explorer pins on minimap
            if (this.explorerPins && this.explorerPins.length > 0) {
                this.explorerPins.forEach(pin => {
                    const relX = pin.x - this.player.position.x;
                    const relZ = pin.z - this.player.position.z;

                    // Convert to minimap coordinates
                    const pinMapX = size/2 + relX / scale;
                    const pinMapZ = size/2 + relZ / scale;

                    // Only draw if within minimap bounds
                    if (pinMapX >= 0 && pinMapX < size && pinMapZ >= 0 && pinMapZ < size) {
                        ctx.fillStyle = pin.color;
                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.arc(pinMapX, pinMapZ, 4, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();

                        // Add pulse effect for active navigation pin
                        if (this.activeNavigation && this.activeNavigation.id === pin.id) {
                            const pulseRadius = 6 + Math.sin(Date.now() / 150) * 2;
                            ctx.strokeStyle = '#FFD700';
                            ctx.lineWidth = 2;
                            ctx.beginPath();
                            ctx.arc(pinMapX, pinMapZ, pulseRadius, 0, Math.PI * 2);
                            ctx.stroke();
                        }
                    }
                });
            }

            // Draw navigation arrow pointing to active pin
            if (this.activeNavigation) {
                const relX = this.activeNavigation.x - this.player.position.x;
                const relZ = this.activeNavigation.z - this.player.position.z;
                const distance = Math.sqrt(relX * relX + relZ * relZ);

                // If pin is outside minimap range, show directional arrow
                const pinMapX = size/2 + relX / scale;
                const pinMapZ = size/2 + relZ / scale;

                if (pinMapX < 0 || pinMapX >= size || pinMapZ < 0 || pinMapZ >= size || distance > 60) {
                    // Calculate angle to pin
                    const angle = Math.atan2(relX, relZ);

                    // Draw arrow pointing to pin from edge of minimap
                    const arrowDistance = 45; // Distance from center
                    const arrowX = size/2 + Math.sin(angle) * arrowDistance;
                    const arrowZ = size/2 + Math.cos(angle) * arrowDistance;

                    ctx.strokeStyle = '#FFD700';
                    ctx.fillStyle = '#FFD700';
                    ctx.lineWidth = 3;

                    // Arrow shaft
                    ctx.beginPath();
                    ctx.moveTo(size/2 + Math.sin(angle) * 20, size/2 + Math.cos(angle) * 20);
                    ctx.lineTo(arrowX, arrowZ);
                    ctx.stroke();

                    // Arrow head
                    ctx.beginPath();
                    ctx.moveTo(arrowX, arrowZ);
                    ctx.lineTo(arrowX - Math.sin(angle - 0.5) * 8, arrowZ - Math.cos(angle - 0.5) * 8);
                    ctx.lineTo(arrowX - Math.sin(angle + 0.5) * 8, arrowZ - Math.cos(angle + 0.5) * 8);
                    ctx.closePath();
                    ctx.fill();

                    // Distance text
                    ctx.font = 'bold 10px Arial';
                    ctx.fillStyle = '#FFD700';
                    ctx.textAlign = 'center';
                    ctx.fillText(`${Math.floor(distance)}m`, arrowX, arrowZ + 15);
                }

                // Check if player reached the destination
                if (distance < 5) {
                    this.activeNavigation = null;
                    this.updateStatus('🎯 Destination reached!', 'success');
                }
            }

            // 🧭 Draw compass target indicator
            const compassSlot = this.hotbarSystem.getSelectedSlot();
            if (compassSlot && (compassSlot.itemType === 'compass' || compassSlot.itemType === 'compass_upgrade')) {
                const targetType = compassSlot.metadata?.lockedTarget;
                if (targetType) {
                    const nearest = this.findNearestTarget(targetType);
                    if (nearest) {
                        const relX = nearest.x - this.player.position.x;
                        const relZ = nearest.z - this.player.position.z;
                        const targetMapX = size/2 + relX / scale;
                        const targetMapZ = size/2 + relZ / scale;
                        const distance = nearest.distance;

                        // Draw target indicator
                        if (targetMapX >= 0 && targetMapX < size && targetMapZ >= 0 && targetMapZ < size) {
                            // Target is on screen - draw pulsing marker
                            const pulseSize = 4 + Math.sin(Date.now() / 200) * 2;
                            ctx.fillStyle = '#FFD700';
                            ctx.strokeStyle = '#FF6B6B';
                            ctx.lineWidth = 2;
                            ctx.beginPath();
                            ctx.arc(targetMapX, targetMapZ, pulseSize, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.stroke();

                            // Draw distance
                            ctx.font = 'bold 8px Arial';
                            ctx.fillStyle = '#FFD700';
                            ctx.textAlign = 'center';
                            ctx.fillText(`${Math.floor(distance)}m`, targetMapX, targetMapZ - 8);
                        } else {
                            // Target is off screen - draw directional arrow at edge
                            const angle = Math.atan2(relZ, relX);
                            const edgeX = size/2 + Math.cos(angle) * (size/2 - 15);
                            const edgeZ = size/2 + Math.sin(angle) * (size/2 - 15);

                            ctx.fillStyle = '#FFD700';
                            ctx.strokeStyle = '#FF6B6B';
                            ctx.lineWidth = 2;
                            ctx.save();
                            ctx.translate(edgeX, edgeZ);
                            ctx.rotate(angle);
                            ctx.beginPath();
                            ctx.moveTo(8, 0);
                            ctx.lineTo(-4, -6);
                            ctx.lineTo(-4, 6);
                            ctx.closePath();
                            ctx.fill();
                            ctx.stroke();
                            ctx.restore();

                            // Draw distance next to arrow
                            ctx.font = 'bold 8px Arial';
                            ctx.fillStyle = '#FFD700';
                            ctx.textAlign = 'center';
                            ctx.fillText(`${Math.floor(distance)}m`, edgeX, edgeZ + 12);
                        }
                    }
                }
            }

            // 🐕 Draw companion hunt discoveries (purple dots)
            if (this.companionHuntSystem && this.companionHuntSystem.discoveries) {
                this.companionHuntSystem.discoveries.forEach(discovery => {
                    const relX = discovery.position.x - this.player.position.x;
                    const relZ = discovery.position.z - this.player.position.z;

                    const discMapX = size/2 + relX / scale;
                    const discMapZ = size/2 + relZ / scale;

                    if (discMapX >= 0 && discMapX < size && discMapZ >= 0 && discMapZ < size) {
                        ctx.fillStyle = '#a855f7'; // Purple
                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.arc(discMapX, discMapZ, 3, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();
                    }
                });
            }

            // 🐕 Draw companion position (cyan dot) if hunting
            const companionPos = this.companionHuntSystem?.getCompanionMapPosition();
            if (companionPos) {
                const relX = companionPos.x - this.player.position.x;
                const relZ = companionPos.z - this.player.position.z;

                const compMapX = size/2 + relX / scale;
                const compMapZ = size/2 + relZ / scale;

                if (compMapX >= 0 && compMapX < size && compMapZ >= 0 && compMapZ < size) {
                    // Draw companion with pulsing effect
                    const pulseRadius = 4 + Math.sin(Date.now() / 200) * 1;
                    
                    ctx.fillStyle = '#06b6d4'; // Cyan
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(compMapX, compMapZ, pulseRadius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    // Add direction arrow if returning
                    if (companionPos.isReturning) {
                        const angle = Math.atan2(
                            this.player.position.x - companionPos.x,
                            this.player.position.z - companionPos.z
                        );
                        
                        ctx.fillStyle = '#06b6d4';
                        ctx.save();
                        ctx.translate(compMapX, compMapZ);
                        ctx.rotate(angle);
                        ctx.beginPath();
                        ctx.moveTo(6, 0);
                        ctx.lineTo(-3, -4);
                        ctx.lineTo(-3, 4);
                        ctx.closePath();
                        ctx.fill();
                        ctx.restore();
                    }
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
        let lastPerfLog = performance.now(); // 🎯 PERFORMANCE: Initialize to current time to prevent spam
        
        // ⏰ Game time tracking (for companion hunt and other time-based systems)
        if (this.gameTime === undefined) {
            this.gameTime = 0;
        }
        
        const animate = (currentTime = 0) => {
            this.animationId = requestAnimationFrame(animate);
            
            // 📊 FPS Counter: Begin measurement
            if (this.statsEnabled) {
                this.stats.begin();
            }
            
            // Calculate delta time for FPS-independent movement
            const deltaTime = Math.min((currentTime - lastTime) / 1000, 1/30); // Cap at 30 FPS minimum
            lastTime = currentTime;

            // Update game time (accumulate deltaTime for in-game time tracking)
            this.gameTime += deltaTime;

            // 📊 PERFORMANCE: Log array sizes every 10 seconds
            if (currentTime - lastPerfLog > 10000) {
                const distanceFromSpawn = Math.sqrt(
                    this.player.position.x ** 2 + 
                    this.player.position.z ** 2
                ).toFixed(0);
                
                // commented out due to console spam -- brad
                // console.log('📊 Performance Stats:', {
                //     distanceFromSpawn: `${distanceFromSpawn} blocks`,
                //     waterPositions: this.waterPositions.length,
                //     pumpkinPositions: this.pumpkinPositions.length,
                //     worldItemPositions: this.worldItemPositions.length,
                //     treePositions: this.treePositions.length,
                //     activeBillboards: this.activeBillboards.length,
                //     explosionEffects: this.explosionEffects?.length || 0,
                //     ghostBillboards: this.ghostBillboards.size,
                //     worldBlocks: Object.keys(this.world).length
                // });
                lastPerfLog = currentTime;
            }

            // ✨ Update Animation System
            if (this.animationSystem) {
                this.animationSystem.update(deltaTime);
            }

            // 🔦 Update Player Items System (torch lighting, etc.)
            if (this.playerItemsSystem) {
                this.playerItemsSystem.update(deltaTime);
            }

            // 🎯 PHASE 1.3: Physics Update Loop
            if (this.physicsWorld) {
                this.physicsWorld.step(deltaTime);
                this.updatePhysicsObjects();
            }

            // 🔥 Animate particle effects (fire, etc.)
            this.animateParticleEffects(currentTime);

            // 💥 Animate explosion effects from stone hammer
            if (this.explosionEffects && this.explosionEffects.length > 0) {
                for (let i = this.explosionEffects.length - 1; i >= 0; i--) {
                    const explosion = this.explosionEffects[i];
                    explosion.lifetime++;

                    // Update each sprite particle
                    for (let j = 0; j < explosion.particles.length; j++) {
                        const sprite = explosion.particles[j];
                        const velocity = explosion.velocities[j];

                        // Update position
                        sprite.position.x += velocity.x;
                        sprite.position.y += velocity.y;
                        sprite.position.z += velocity.z;

                        // Apply gravity to velocity
                        velocity.y -= 0.01;

                        // Fade out sprite
                        const fadeProgress = explosion.lifetime / explosion.maxLifetime;
                        sprite.material.opacity = 1.0 - fadeProgress;
                    }

                    // Remove expired explosions
                    if (explosion.lifetime >= explosion.maxLifetime) {
                        // Clean up all sprites
                        explosion.particles.forEach(sprite => {
                            this.scene.remove(sprite);
                            sprite.material.dispose();
                        });
                        this.explosionEffects.splice(i, 1);
                    }
                }
            }

            // Animate billboards (even when paused - they should keep floating)
            this.animateBillboards(currentTime);

            // 👻 Update ghost system AI and animations
            if (this.ghostSystem) {
                this.ghostSystem.update(deltaTime, this.player.position, this.pumpkinPositions);
            }

            // 💀 Update angry ghost system - battle triggers
            if (this.angryGhostSystem) {
                this.angryGhostSystem.update(deltaTime, this.player.position);
            }

            // 🏟️ Update battle arena - 3D combat animations
            if (this.battleArena) {
                this.battleArena.update(deltaTime);
            }

            // 🎄 Update Christmas system - Mega Fir proximity alerts and snow melt
            if (this.christmasSystem) {
                this.christmasSystem.update(deltaTime, this.player.position);
            }

            // 🌾 Update farming system - crop growth and tilled soil management
            if (this.farmingSystem) {
                this.farmingSystem.update();
            }

            // 🗡️ Update spear system - check for pickup proximity
            if (this.spearSystem) {
                this.spearSystem.update();
            }

            // Check for nearby workbench (even when paused)
            this.checkWorkbenchProximity();

            // 🌍 Update biome indicator based on player position
            this.updateBiomeIndicator();

            // 🔍 Update LOD debug overlay (ring positions and stats)
            if (this.lodDebugOverlay) {
                this.lodDebugOverlay.update();
            }

            // 🧹 PERFORMANCE: Update chunks every 30 frames (~0.5 seconds)
            // Must run BEFORE pause check so cleanup happens even when paused
            if (++lastChunkUpdate > 30) {
                updateChunks();
                lastChunkUpdate = 0;
            }

            // Always continue animation loop, but skip input processing if paused
            if (this.isPaused) {
                // Still render the scene even when paused
                this.renderer.render(this.scene, this.camera);
                return;
            }

            // Skip movement processing if movement is disabled (e.g., during combat)
            if (!this.movementEnabled) {
                // Still render and allow camera movement
                this.renderer.render(this.scene, this.camera);
                return;
            }

            // Base speed modified by movementSpeed upgrade (1.0 default, 1.5 with speed boots)
            // REDUCED to 60% (2.4) to allow chunk generation time - performance optimization
            const baseSpeed = 2.4 * this.movementSpeed; // Units per second (was 4.0)
            const jumpSpeed = 9.0; // Jump velocity - increased for 2-block obstacles, was 8.0
            const gravity = 20.0; // Gravity acceleration
            
            // Handle movement
            const dir = new THREE.Vector3();

            // Keyboard input (desktop)
            const wPressed = this.keys["w"];
            const sPressed = this.keys["s"];
            const aPressed = this.keys["a"];
            const dPressed = this.keys["d"];
            const shiftPressed = this.keys["shift"] || this.keys["Shift"]; // Sprint key
            
            if (wPressed) dir.z -= 1;
            if (sPressed) dir.z += 1;
            if (aPressed) dir.x -= 1;
            if (dPressed) dir.x += 1;
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

            // ⚡ STAMINA SYSTEM: Update stamina and get speed multiplier
            const isMoving = dir.length() > 0.01;
            const isRunning = shiftPressed && isMoving;
            
            // Check if speed boots are equipped (hotbar slot)
            const currentSlot = this.hotbarSlots[this.selectedSlot];
            const hasSpeedBoots = currentSlot && (
                currentSlot.itemType === 'speed_boots' || 
                currentSlot.itemType === 'crafted_speed_boots'
            );
            this.staminaSystem.setSpeedBoots(hasSpeedBoots);
            
            // Get terrain type from block under player
            const playerBlockY = Math.floor(this.player.position.y - 1);
            const playerBlockX = Math.floor(this.player.position.x);
            const playerBlockZ = Math.floor(this.player.position.z);
            const blockUnderPlayer = this.world[`${playerBlockX},${playerBlockY},${playerBlockZ}`];
            const terrain = this.staminaSystem.getTerrainType(blockUnderPlayer);
            
            // Update stamina (this handles drain, regen, and performance cleanup!)
            this.staminaSystem.update(deltaTime, isMoving, isRunning, terrain);
            
            // Update companion hunt system (movement, discoveries, return logic)
            if (this.companionHuntSystem && this.gameTime !== undefined) {
                this.companionHuntSystem.update(this.gameTime);
            }
            
            // 🐰 Update animal system (AI, movement, animations)
            if (this.animalSystem) {
                this.animalSystem.update(deltaTime);
            }
            
            // 👥 Update NPC system (billboards, interactions)
            if (this.npcManager) {
                this.npcManager.update();
            }
            
            // Get speed multiplier from stamina system
            const staminaSpeedMultiplier = this.staminaSystem.getSpeedMultiplier();
            const speed = baseSpeed * staminaSpeedMultiplier;

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
            // Player hitbox dimensions (reduced width/depth for 1-block passage)
            const PLAYER_WIDTH = 0.3;  // Was 0.6 - now fits through 1-block gaps
            const PLAYER_HEIGHT = 1.8;
            const PLAYER_DEPTH = 0.3;  // Was 0.6 - now fits through 1-block gaps

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
            // Added small epsilon (0.001) to prevent exact edge-touching from registering as collision
            const COLLISION_EPSILON = 0.001;
            const hitboxesCollide = (hitbox1, hitbox2) => {
                return (
                    hitbox1.minX < hitbox2.maxX - COLLISION_EPSILON && hitbox1.maxX > hitbox2.minX + COLLISION_EPSILON &&
                    hitbox1.minY < hitbox2.maxY - COLLISION_EPSILON && hitbox1.maxY > hitbox2.minY + COLLISION_EPSILON &&
                    hitbox1.minZ < hitbox2.maxZ - COLLISION_EPSILON && hitbox1.maxZ > hitbox2.minZ + COLLISION_EPSILON
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

                // 🎯 PHASE 2.1: Check collision with crafted objects
                if (this.craftedObjects) {
                    for (const [key, objectData] of Object.entries(this.craftedObjects)) {
                        const craftedMesh = objectData.mesh;
                        const dimensions = objectData.dimensions;

                        // Create hitbox for crafted object
                        const craftedHitbox = {
                            minX: craftedMesh.position.x - dimensions.length / 2,
                            maxX: craftedMesh.position.x + dimensions.length / 2,
                            minY: craftedMesh.position.y - dimensions.height / 2,
                            maxY: craftedMesh.position.y + dimensions.height / 2,
                            minZ: craftedMesh.position.z - dimensions.width / 2,
                            maxZ: craftedMesh.position.z + dimensions.width / 2
                        };

                        if (hitboxesCollide(playerHitbox, craftedHitbox)) {
                            return {
                                collision: true,
                                craftedObject: true,
                                objectName: objectData.metadata.name,
                                objectId: objectData.itemId
                            };
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

                // Create player hitbox for horizontal collision (full height)
                const createHorizontalHitbox = (x, z) => {
                    return {
                        minX: x - PLAYER_WIDTH / 2,
                        maxX: x + PLAYER_WIDTH / 2,
                        minY: currentPos.y - PLAYER_HEIGHT / 2, // Full height including feet
                        maxY: currentPos.y + PLAYER_HEIGHT / 2,
                        minZ: z - PLAYER_DEPTH / 2,
                        maxZ: z + PLAYER_DEPTH / 2
                    };
                };

                // Test full movement first
                const newHitbox = createHorizontalHitbox(newX, newZ);
                const fullCollision = checkHitboxCollision(newHitbox);

                if (!fullCollision.collision) {
                    // No collision - move freely (but check arena bounds if in battle)
                    let finalX = newX;
                    let finalZ = newZ;

                    // 🏟️ Battle arena movement restriction
                    if (this.inBattleArena && this.battleArena) {
                        const bounds = this.battleArena.movementBounds;
                        finalX = Math.max(bounds.minX, Math.min(bounds.maxX, newX));
                        finalZ = Math.max(bounds.minZ, Math.min(bounds.maxZ, newZ));
                    }

                    this.player.position.x = finalX;
                    this.player.position.z = finalZ;
                } else {
                    // Collision detected - try sliding along walls
                    // Test X movement only
                    const xOnlyHitbox = createHorizontalHitbox(newX, currentPos.z);
                    const xCollision = checkHitboxCollision(xOnlyHitbox);

                    if (!xCollision.collision) {
                        let finalX = newX;

                        // 🏟️ Battle arena X bounds check
                        if (this.inBattleArena && this.battleArena) {
                            const bounds = this.battleArena.movementBounds;
                            finalX = Math.max(bounds.minX, Math.min(bounds.maxX, newX));
                        }

                        this.player.position.x = finalX;
                    }

                    // Test Z movement only
                    const zOnlyHitbox = createHorizontalHitbox(currentPos.x, newZ);
                    const zCollision = checkHitboxCollision(zOnlyHitbox);

                    if (!zCollision.collision) {
                        let finalZ = newZ;

                        // 🏟️ Battle arena Z bounds check
                        if (this.inBattleArena && this.battleArena) {
                            const bounds = this.battleArena.movementBounds;
                            finalZ = Math.max(bounds.minZ, Math.min(bounds.maxZ, newZ));
                        }

                        this.player.position.z = finalZ;
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

            // 🧹 Chunk updates moved to BEFORE pause check (line ~9820)
            // This ensures cleanup runs even when paused/movement disabled

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

            // Update coordinate display
            if (this.coordDisplay) {
                const x = Math.floor(this.player.position.x);
                const y = Math.floor(this.player.position.y);
                const z = Math.floor(this.player.position.z);
                this.coordDisplay.textContent = `X: ${x}, Y: ${y}, Z: ${z}`;
            }

            // Update mini-map
            this.updateMiniMap();

            // Update harvesting progress
            this.updateHarvesting();

            // 🔧 DEBUG: Check for objects with undefined matrices before rendering
            this.scene.traverse((object) => {
                if (object.isMesh || object.isLight || object.isSprite) {
                    if (!object.matrix || !object.matrix.elements) {
                        console.error('🐛 Found object with undefined matrix:', object.type, object.uuid);
                        // Initialize matrix if missing
                        object.matrix = new THREE.Matrix4();
                        object.matrixAutoUpdate = true;
                        object.updateMatrix();
                    }
                    if (!object.matrixWorld || !object.matrixWorld.elements) {
                        console.error('🐛 Found object with undefined matrixWorld:', object.type, object.uuid);
                        // Initialize matrixWorld if missing
                        object.matrixWorld = new THREE.Matrix4();
                        object.updateMatrixWorld(true);
                    }
                }
            });

            this.renderer.render(this.scene, this.camera);
            
            // 📊 FPS Counter: End measurement
            if (this.statsEnabled) {
                this.stats.end();
            }
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
            const key = e.key.toLowerCase();

            // ESC or M key: Close journal if open (handle before controlsEnabled check)
            if ((key === 'escape' || key === 'm') && this.worldMapModal && this.worldMapModal.style.display !== 'none') {
                this.closeWorldMap();
                e.preventDefault();
                return;
            }

            // ESC key: Close workbench if open (handle before controlsEnabled check)
            if (key === 'escape' && this.workbenchSystem && this.workbenchSystem.isOpen) {
                this.workbenchSystem.close();
                // Re-engage pointer lock after closing workbench
                setTimeout(() => {
                    if (this.renderer && this.renderer.domElement) {
                        this.renderer.domElement.requestPointerLock();
                    }
                }, 100);
                e.preventDefault();
                return;
            }

            // ESC key: Close toolbench if open (handle before controlsEnabled check)
            if (key === 'escape' && this.toolBenchSystem && this.toolBenchSystem.isOpen) {
                this.toolBenchSystem.close();
                // Re-engage pointer lock after closing toolbench
                setTimeout(() => {
                    if (this.renderer && this.renderer.domElement) {
                        this.renderer.domElement.requestPointerLock();
                    }
                }, 100);
                e.preventDefault();
                return;
            }

            // ESC key: Close kitchen bench if open
            if (key === 'escape' && this.kitchenBenchSystem && this.kitchenBenchSystem.isOpen) {
                this.kitchenBenchSystem.close();
                // Re-engage pointer lock after closing kitchen bench
                setTimeout(() => {
                    if (this.renderer && this.renderer.domElement) {
                        this.renderer.domElement.requestPointerLock();
                    }
                }, 100);
                e.preventDefault();
                return;
            }

            // ESC key: Close backpack if open (before controlsEnabled check so it works during text input)
            if (key === 'escape' && this.hasBackpack && this.backpackInventoryElement) {
                const isVisible = this.backpackInventoryElement.style.transform.includes('translateY(0px)');
                if (isVisible) {
                    this.toggleBackpackInventory();
                    e.preventDefault();
                    return; // Don't process other keys
                }
            }

            if (!this.controlsEnabled) return;

            // Movement keys (including Shift for sprinting)
            if (['w', 'a', 's', 'd', ' ', 'shift'].includes(key)) {
                this.keys[key] = true;
                e.preventDefault();
            }

            // Hotbar selection (1-5)
            if (key >= '1' && key <= '5') {
                const slot = parseInt(key) - 1;
                if (slot < this.hotbarSlots.length) {
                    // Keys 1-5: Select hotbar slots
                    this.selectedSlot = slot;
                    this.updateHotbarSelection();
                    const slotData = this.hotbarSlots[slot];
                    const displayText = slotData?.itemType ? `${slotData.itemType} (${slotData.quantity})` : 'empty';
                    console.log(`Selected hotbar slot ${slot + 1}: ${displayText}`);
                    e.preventDefault();
                }
            }

            // Q key: Unassigned (hotbar navigation now uses mouse wheel or number keys 1-8)
            // E key: Opens workbench (handled below)

            // 🗺️ M key for world map
            if (key === 'm') {
                this.toggleWorldMap();
                e.preventDefault();
            }
            // 📘 C key for Companion Codex (toggle)
            if (key === 'c') {
                if (this.companionCodex) {
                    // Check if codex is currently open
                    if (this.companionCodex.codexElement) {
                        this.companionCodex.hide(); // Close it (will re-engage pointer lock)
                    } else {
                        this.companionCodex.show(); // Open it
                    }
                }
                e.preventDefault();
            }
            // 🔍 L key for LOD Debug Overlay (toggle)
            if (key === 'l') {
                if (this.lodDebugOverlay) {
                    this.lodDebugOverlay.toggle();
                }
                e.preventDefault();
            }

            // 🎵 Music controls (work regardless of controlsEnabled, but not during text input)
            // + key (or =): Volume up
            if (key === '+' || key === '=') {
                if (this.musicSystem) {
                    this.musicSystem.volumeUp();
                }
                e.preventDefault();
            }
            // - key: Volume down
            if (key === '-') {
                if (this.musicSystem) {
                    this.musicSystem.volumeDown();
                }
                e.preventDefault();
            }
            // 0 key: Toggle mute
            if (key === '0') {
                if (this.musicSystem) {
                    this.musicSystem.toggleMute();
                }
                e.preventDefault();
            }

            // 🔍 I key for Block Inspector (show info about targeted block)
            if (key === 'i') {
                // Use raycaster to find targeted block
                this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
                const intersects = this.raycaster.intersectObjects(this.scene.children.filter(obj => obj.isMesh && obj !== this.targetHighlight));

                if (intersects.length > 0) {
                    const hit = intersects[0];
                    const pos = hit.object.position;
                    const key = `${pos.x},${pos.y},${pos.z}`;
                    const blockData = this.world[key];

                    console.log('╔═══════════════════════════════════════════════════════════');
                    console.log('║ 🔍 BLOCK INSPECTOR');
                    console.log('╠═══════════════════════════════════════════════════════════');
                    console.log('║ Position:', `(${pos.x}, ${pos.y}, ${pos.z})`);
                    console.log('║ Block Type:', blockData?.type || 'UNKNOWN');
                    console.log('║ Player Placed:', blockData?.playerPlaced || false);
                    console.log('║ Has Billboard:', !!blockData?.billboard);
                    console.log('║ Material:', blockData?.mesh?.material?.type || 'UNKNOWN');
                    console.log('║ Material Color:', blockData?.mesh?.material?.color);
                    console.log('║ Expected Material:', this.materials[blockData?.type]?.type || 'UNKNOWN');
                    console.log('║ Material Match:', blockData?.mesh?.material === this.materials[blockData?.type]);
                    console.log('╠═══════════════════════════════════════════════════════════');
                    console.log('║ BlockType Definition:', this.blockTypes[blockData?.type]);
                    console.log('╚═══════════════════════════════════════════════════════════');
                } else {
                    console.log('🔍 No block targeted (aim at a block and press I)');
                }
                e.preventDefault();
            }
            if (key === 'e') {
                // Check if player has backpack (workbench should be available after backpack found)
                if (this.hasBackpack) {
                    // Direct workbench access - player can always craft after finding backpack
                    this.workbenchSystem.open(0, 0, 0);

                    e.preventDefault();
                } else if (this.currentNearbyWorkbench) {
                    // Legacy: placed workbench nearby
                    this.workbenchSystem.open(
                        this.currentNearbyWorkbench.x,
                        this.currentNearbyWorkbench.y,
                        this.currentNearbyWorkbench.z
                    );
                    e.preventDefault();
                } else {
                    // Before backpack found, E navigates hotbar
                    this.selectedSlot = (this.selectedSlot + 1) % 5; // Hotbar has 5 slots
                    this.updateHotbarSelection();
                    e.preventDefault();
                }
            }

            // F key: Open kitchen bench (if near one)
            if (key === 'f' && this.currentNearbyKitchenBench) {
                this.kitchenBenchSystem.open();
                e.preventDefault();
            }

            // B key: Toggle backpack inventory
            if (key === 'b' && this.hasBackpack) {
                this.toggleBackpackInventory();
                e.preventDefault();
            }

            // T key: Open tool bench
            if (key === 't' && this.hasToolBench) {
                this.toolBenchSystem.open();
                e.preventDefault();
            }

            // K key: Open kitchen bench
            if (key === 'k' && this.hasKitchenBench) {
                this.kitchenBenchSystem.open();
                e.preventDefault();
            }
        };
        
        const keyupHandler = (e) => {
            if (!this.controlsEnabled) return;
            
            const key = e.key.toLowerCase();
            if (['w', 'a', 's', 'd', ' ', 'shift'].includes(key)) {
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
            
            // � NPC INTERACTION: Check for nearby NPC on right-click
            if (e.button === 2 && this.npcManager) {
                if (this.npcManager.handleRightClick()) {
                    e.preventDefault();
                    return; // NPC interaction consumed the click
                }
            }
            
            // �🗡️ SPEAR CHARGING: Start charging on right-click with spear
            if (e.button === 2) { // Right click
                const selectedSlot = this.hotbarSystem.getSelectedSlot();
                const selectedItem = selectedSlot?.itemType;
                const isSpear = selectedItem === 'stone_spear' || selectedItem === 'crafted_stone_spear';
                
                if (isSpear && selectedSlot.quantity > 0) {
                    this.spearSystem.startCharging();
                    // Don't return - let it continue to show green highlight
                }
            }
            
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

                // Get position from regular mesh
                const pos = hit.object.position.clone();

                // 🐰 Check if clicked object is a hunted animal
                if (hit.object.userData && hit.object.userData.isAnimal) {
                    const animal = hit.object.userData.animalInstance;
                    if (animal && animal.state === 'hunted') {
                        const loot = this.animalSystem.harvestAnimal(hit.object);
                        // Add loot to inventory
                        loot.forEach(item => {
                            this.inventory.addToInventory(item, 1);
                        });
                        return; // Don't do other click actions
                    } else if (animal) {
                        this.updateStatus(`⚠️ You can't harvest a living ${animal.config.name}!`, 'error');
                        return;
                    }
                }

                // Check if clicked object is a world item billboard
                if (hit.object.userData.type === 'worldItem') {
                    // Harvest world item directly
                    this.harvestWorldItem(hit.object);
                    return;
                }

                if (e.button === 0) { // Left click - harvesting (blocks or crafted objects)
                    // 🧪 HEALING POTION: Smart targeting system
                    const selectedSlot = this.hotbarSystem.getSelectedSlot();
                    if (selectedSlot && (selectedSlot.itemType === 'healing_potion' || selectedSlot.itemType === 'crafted_healing_potion')) {
                        // Check if targeting companion sprite in battle
                        if (this.battleArena && this.battleArena.isActive && this.battleArena.companionSprite) {
                            // Check if raycaster hit the companion sprite
                            if (hit.object === this.battleArena.companionSprite.sprite ||
                                hit.object === this.battleArena.companionSprite.hpBarSprite) {
                                // Heal companion
                                const healAmount = 10; // Heal 10 HP
                                const newHP = Math.min(this.battleArena.companionSprite.maxHP, 
                                                      this.battleArena.companionSprite.currentHP + healAmount);
                                this.battleArena.companionSprite.updateHP(newHP);
                                this.updateStatus(`🧪 Healed ${this.battleArena.companionSprite.name} for ${healAmount} HP!`, 'discovery');
                                console.log(`🧪 Healing potion used on companion: ${healAmount} HP restored`);
                                
                                // Consume charge
                                this.hotbarSystem.removeFromSlot(this.hotbarSystem.selectedSlotIndex, 1);
                                return;
                            }
                        }
                        
                        // Otherwise, heal player (if not at full HP)
                        if (this.playerHP && this.playerHP.currentHP < this.playerHP.maxHP) {
                            this.playerHP.heal(1); // Restore 1 heart
                            this.updateStatus('🧪 Healing potion restored 1 heart!', 'discovery');
                            console.log('🧪 Healing potion used on player');
                            
                            // Consume charge
                            this.hotbarSystem.removeFromSlot(this.hotbarSystem.selectedSlotIndex, 1);
                            return;
                        } else if (this.playerHP) {
                            this.updateStatus('❤️ Already at full health!', 'info');
                            return;
                        }
                    }

                    // 🔧 CRAFTED TOOLS: Check for special left-click tool actions
                    const toolHandled = this.craftedTools.handleLeftClick(selectedSlot, pos);
                    if (toolHandled) {
                        return; // Tool action handled, don't continue
                    }

                    // PHASE 6: Check if clicked object is a crafted object
                    if (hit.object.userData && hit.object.userData.isCraftedObject) {
                        console.log(`🎨 Harvesting crafted object: ${hit.object.userData.originalName}`);
                        this.harvestCraftedObject(hit.object);
                    } else {
                        // Regular block harvesting
                        this.startHarvesting(pos.x, pos.y, pos.z);
                    }
                } else if (e.button === 2) { // Right click - block placement only
                    // Safety check: hit.face can be null when clicking on sky/void
                    if (!hit.face) {
                        return; // No face to place on, abort
                    }

                    const normal = hit.face.normal;
                    const placePos = pos.clone().add(normal);

                    // 🎯 Use HotbarSystem's selectedSlot (not VoxelWorld's old selectedSlot)
                    const selectedSlot = this.hotbarSystem.getSelectedSlot();
                    const selectedBlock = selectedSlot?.itemType;

                    // 🔧 CRAFTED TOOLS: Check for special right-click tool actions (watering can, grappling hook)
                    const toolHandled = this.craftedTools.handleRightClick(selectedSlot, pos, placePos);
                    if (toolHandled) {
                        return; // Tool action handled, don't continue
                    }

                    if (selectedBlock && selectedSlot.quantity > 0) {
                        // 🌾 FARMING: Check for seeds (plantable items)
                        if (this.craftedTools.isSeedItem(selectedBlock)) {
                            const success = this.craftedTools.handleSeedPlanting(pos, selectedBlock);
                            if (success) {
                                return; // Don't continue to block placement
                            }
                        }

                        // 🛡️ NON-PLACEABLE ITEMS: Tools, consumables, and special items cannot be placed as blocks
                        const nonPlaceableItems = [
                            'machete', 'stone_hammer', 'hoe', 'crafted_hoe', 'watering_can', 'crafted_watering_can',
                            'workbench', 'backpack',
                            'grapple_hook', 'grappling_hook', 'crafted_grappling_hook', 'speed_boots', 'crafted_speed_boots',
                            'combat_sword', 'crafted_combat_sword', 'mining_pick', 'crafted_mining_pick',
                            'healing_potion', 'light_orb', 'magic_amulet',
                            'backpack_upgrade_1', 'backpack_upgrade_2', 'machete_upgrade',
                            'compass', 'compass_upgrade',
                            // 🌾 FARMING: Seeds and crops are not placeable
                            'wheat_seeds', 'carrot_seeds', 'pumpkin_seeds', 'berry_seeds',
                            'wheat', 'carrot', 'potato', 'pumpkin', 'berry', 'mushroom', 'rice', 'corn_ear',
                            // 🍖 COMPANION HUNT: Rare ingredients
                            'fish', 'egg', 'honey', 'apple',
                            // 🍳 FOOD: Cooked foods are consumable
                            'bread', 'roasted_wheat', 'baked_potato', 'roasted_corn', 'grilled_fish',
                            'carrot_stew', 'berry_bread', 'mushroom_soup', 'fish_rice',
                            'veggie_medley', 'honey_bread', 'pumpkin_pie', 'super_stew',
                            'berry_honey_snack', 'energy_bar', 'rice_bowl', 'corn_chips',
                            'grain_mix', 'berry_snack', 'potato_chips', 'mushroom_bites',
                            'cooked_egg', 'cookie'
                        ];

                        if (nonPlaceableItems.includes(selectedBlock)) {
                            // 🧭 COMPASS SPECIAL HANDLING: Right-click opens target selection
                            if (selectedBlock === 'compass' || selectedBlock === 'compass_upgrade') {
                                this.openCompassTargetSelector(selectedBlock, selectedSlot);
                                return;
                            }

                            // 🍳 FOOD CONSUMPTION: Right-click to eat food and apply buffs
                            const foodKeys = Object.keys(this.kitchenBenchSystem.foodDatabase);
                            if (foodKeys.includes(selectedBlock)) {
                                console.log(`🍽️ Eating ${selectedBlock}...`);
                                
                                // Apply food buff
                                this.kitchenBenchSystem.applyFoodBuff(selectedBlock);
                                
                                // Consume one food item
                                selectedSlot.quantity--;
                                if (selectedSlot.quantity === 0) {
                                    selectedSlot.itemType = '';
                                }
                                
                                this.hotbar.updateHotbarDisplay();
                                return;
                            }

                            console.log(`🚫 Cannot place ${selectedBlock} - this is a tool/item, not a block!`);
                            this.updateStatus(`🚫 ${selectedBlock} is a tool, not a placeable block!`, 'warning');
                            return;
                        }

                        // 🎯 THE BIG MOMENT: Detect crafted items vs regular blocks
                        if (selectedBlock.startsWith('crafted_')) {
                            // Place crafted 3D object with real dimensions!
                            console.log(`🎨 Placing crafted object: ${selectedBlock}`);
                            this.placeCraftedObject(placePos.x, placePos.y, placePos.z, selectedBlock);
                        } else {
                            // Place regular 1x1x1 block
                            this.addBlock(placePos.x, placePos.y, placePos.z, selectedBlock, true);

                            // 🎓 Trigger workbench placement tutorial
                            if (selectedBlock === 'workbench' && this.tutorialSystem) {
                                this.tutorialSystem.onWorkbenchPlaced();
                            }
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

            // 🗡️ SPEAR RELEASE: Release charged throw on right-click up
            if (e.button === 2 && this.spearSystem.isCharging) {
                // Get target position from raycaster
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
                    
                    // Handle sprites/billboards (animals) which don't have face.normal
                    let placePos;
                    if (hit.face && hit.face.normal) {
                        // Block hit - use normal
                        const normal = hit.face.normal;
                        placePos = pos.clone().add(normal);
                    } else {
                        // Animal/sprite hit - use hit point directly
                        placePos = hit.point ? hit.point.clone() : pos;
                    }
                    
                    const targetPos = {
                        x: Math.floor(placePos.x),
                        y: Math.floor(placePos.y),
                        z: Math.floor(placePos.z)
                    };
                    
                    this.spearSystem.releaseThrow(targetPos);
                }
                return; // Don't continue to other mouseup actions
            }

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

        // Vertical tool menu below time indicator
        this.toolMenu = document.createElement('div');
        this.toolMenu.style.cssText = `
            position: absolute;
            top: 88px;
            left: 16px;
            z-index: 2000;
            display: flex;
            flex-direction: column;
            gap: 8px;
            pointer-events: auto;
        `;
        contentArea.appendChild(this.toolMenu);

        // Backpack tool button (initially hidden)
        this.backpackTool = document.createElement('div');
        this.backpackTool.style.cssText = `
            font-size: 28px;
            cursor: pointer;
            text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
            transition: all 0.3s ease;
            display: none;
            text-align: center;
            width: 32px;
            height: 32px;
            line-height: 32px;
            position: relative;
        `;
        this.updateToolButtonIcon(this.backpackTool, 'backpack', '🎒');
        this.backpackTool.title = 'Open backpack inventory (B key)';

        // Add hotkey label
        const backpackLabel = document.createElement('div');
        backpackLabel.textContent = 'B';
        backpackLabel.style.cssText = `
            position: absolute;
            top: -2px;
            left: -2px;
            font-size: 8px;
            font-weight: bold;
            color: white;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
            pointer-events: none;
            font-family: monospace;
        `;
        this.backpackTool.appendChild(backpackLabel);
        this.backpackHotkeyLabel = backpackLabel; // Store reference for day/night updates

        this.backpackTool.addEventListener('click', () => {
            this.toggleBackpackInventory();
        });
        this.toolMenu.appendChild(this.backpackTool);

        // Workbench tool button (initially hidden)
        this.workbenchTool = document.createElement('div');
        this.workbenchTool.style.cssText = `
            font-size: 28px;
            cursor: pointer;
            text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
            transition: all 0.3s ease;
            display: none;
            text-align: center;
            width: 32px;
            height: 32px;
            line-height: 32px;
            position: relative;
        `;
        this.updateToolButtonIcon(this.workbenchTool, 'workbench', '🔨');
        this.workbenchTool.title = 'Open workbench crafting (E key)';

        // Add hotkey label
        const workbenchLabel = document.createElement('div');
        workbenchLabel.textContent = 'E';
        workbenchLabel.style.cssText = `
            position: absolute;
            top: -2px;
            left: -2px;
            font-size: 8px;
            font-weight: bold;
            color: white;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
            pointer-events: none;
            font-family: monospace;
        `;
        this.workbenchTool.appendChild(workbenchLabel);
        this.workbenchHotkeyLabel = workbenchLabel; // Store reference for day/night updates

        this.workbenchTool.addEventListener('click', () => {
            // Direct workbench access (UI-only tool - no inventory requirement)
            if (this.hasBackpack) {
                this.workbenchSystem.open(0, 0, 0); // Direct access
            } else {
                this.updateStatus('⚠️ Find a backpack first to unlock the workbench!', 'warning');
            }
        });
        this.toolMenu.appendChild(this.workbenchTool);

        // 🔧 Tool Bench button (initially hidden, unlocked when crafted)
        this.toolBenchButton = document.createElement('div');
        this.toolBenchButton.style.cssText = `
            font-size: 28px;
            cursor: pointer;
            text-shadow: 0 0 8px rgba(255, 140, 0, 0.5);
            transition: all 0.3s ease;
            display: none;
            text-align: center;
            width: 32px;
            height: 32px;
            line-height: 32px;
            position: relative;
        `;
        // Add hotkey label first (before setting icon)
        const toolBenchLabel = document.createElement('div');
        toolBenchLabel.textContent = 'T';
        toolBenchLabel.style.cssText = `
            position: absolute;
            top: -2px;
            left: -2px;
            font-size: 8px;
            font-weight: bold;
            color: white;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
            pointer-events: none;
            font-family: monospace;
        `;
        this.toolBenchButton.appendChild(toolBenchLabel);
        this.toolBenchHotkeyLabel = toolBenchLabel; // Store reference for day/night updates

        // Use enhanced graphics icon or emoji fallback (set after label so label stays on top)
        const toolBenchIcon = this.getItemIcon('tool_bench', 'hotbar');
        // Use innerHTML for img tags, textContent for emojis
        if (toolBenchIcon.includes('<img')) {
            // For img tags, prepend before the label
            this.toolBenchButton.insertAdjacentHTML('afterbegin', toolBenchIcon);
        } else {
            this.toolBenchButton.textContent = toolBenchIcon;
            // Re-append label since textContent cleared it
            this.toolBenchButton.appendChild(toolBenchLabel);
        }
        this.toolBenchButton.title = 'Open tool bench crafting (T key)';

        this.toolBenchButton.addEventListener('click', () => {
            // Open tool bench if unlocked
            if (this.hasToolBench) {
                this.toolBenchSystem.open();
            } else {
                this.updateStatus('⚠️ Craft a tool bench first to unlock tool crafting!', 'warning');
            }
        });
        this.toolMenu.appendChild(this.toolBenchButton);

        // 🍳 Kitchen Bench button (initially hidden, unlocked when crafted)
        this.kitchenBenchButton = document.createElement('div');
        this.kitchenBenchButton.style.cssText = `
            font-size: 28px;
            cursor: pointer;
            text-shadow: 0 0 8px rgba(255, 140, 0, 0.5);
            transition: all 0.3s ease;
            display: none;
            text-align: center;
            width: 32px;
            height: 32px;
            line-height: 32px;
            position: relative;
        `;
        // Add hotkey label first (before setting icon)
        const kitchenBenchLabel = document.createElement('div');
        kitchenBenchLabel.textContent = 'K';
        kitchenBenchLabel.style.cssText = `
            position: absolute;
            top: -2px;
            left: -2px;
            font-size: 8px;
            font-weight: bold;
            color: white;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
            pointer-events: none;
            font-family: monospace;
        `;
        this.kitchenBenchButton.appendChild(kitchenBenchLabel);
        this.kitchenBenchHotkeyLabel = kitchenBenchLabel; // Store reference for day/night updates

        // Use enhanced graphics icon or emoji fallback (set after label so label stays on top)
        const kitchenBenchIcon = this.getItemIcon('kitchen_bench', 'hotbar');
        // Use innerHTML for img tags, textContent for emojis
        if (kitchenBenchIcon.includes('<img')) {
            // For img tags, prepend before the label
            this.kitchenBenchButton.insertAdjacentHTML('afterbegin', kitchenBenchIcon);
        } else {
            this.kitchenBenchButton.textContent = kitchenBenchIcon;
            // Re-append label since textContent cleared it
            this.kitchenBenchButton.appendChild(kitchenBenchLabel);
        }
        this.kitchenBenchButton.title = 'Open kitchen bench cooking (K key)';

        this.kitchenBenchButton.addEventListener('click', () => {
            // Open kitchen bench if unlocked
            if (this.hasKitchenBench) {
                this.kitchenBenchSystem.open();
            } else {
                this.updateStatus('⚠️ Craft a kitchen bench first to unlock cooking!', 'warning');
            }
        });
        this.toolMenu.appendChild(this.kitchenBenchButton);

        // Coordinate display (above minimap)
        // 📖 Explorer's Info Panel - Unified coordinates, map, and biome display
        const explorerPanel = document.createElement('div');
        explorerPanel.style.cssText = `
            position: absolute;
            top: 12px;
            right: 12px;
            z-index: 2000;
            background: linear-gradient(180deg, rgba(139, 90, 43, 0.95), rgba(101, 67, 33, 0.95));
            border: 2px solid #654321;
            border-radius: 8px;
            padding: 8px;
            font-family: 'Georgia', serif;
            box-shadow: 0 3px 8px rgba(0, 0, 0, 0.6), inset 0 1px 2px rgba(245, 230, 211, 0.3);
            pointer-events: auto;
            min-width: 110px;
        `;

        // Header with title (more compact)
        const panelTitle = document.createElement('div');
        panelTitle.textContent = '📍 Log';
        panelTitle.style.cssText = `
            color: #F5E6D3;
            font-size: 11px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 6px;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            letter-spacing: 0.5px;
            border-bottom: 1px solid rgba(101, 67, 33, 0.6);
            padding-bottom: 4px;
        `;
        explorerPanel.appendChild(panelTitle);

        // Coordinates display (more compact)
        this.coordDisplay = document.createElement('div');
        this.coordDisplay.style.cssText = `
            color: #FFE4B5;
            font-size: 9px;
            font-family: monospace;
            text-align: center;
            margin-bottom: 6px;
            padding: 3px 6px;
            background: rgba(0, 0, 0, 0.4);
            border-radius: 4px;
            text-shadow: 0 0 3px rgba(255, 228, 181, 0.6);
            border: 1px solid rgba(101, 67, 33, 0.6);
        `;
        this.coordDisplay.textContent = 'X: 0, Y: 0, Z: 0';
        explorerPanel.appendChild(this.coordDisplay);

        // Mini-map with frame (smaller)
        const mapContainer = document.createElement('div');
        mapContainer.style.cssText = `
            background: rgba(0, 0, 0, 0.5);
            border: 2px solid #654321;
            border-radius: 6px;
            padding: 3px;
            margin-bottom: 6px;
            box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.6);
            width: 106px;
        `;

        this.miniMap = document.createElement('canvas');
        this.miniMap.width = 100;
        this.miniMap.height = 100;
        this.miniMap.style.cssText = `
            display: block;
            border-radius: 4px;
            width: 100px;
            height: 100px;
        `;
        this.miniMap.title = 'Mini-map showing biomes and your position';
        mapContainer.appendChild(this.miniMap);
        explorerPanel.appendChild(mapContainer);
        this.miniMapContext = this.miniMap.getContext('2d');

        // Biome information display (more compact)
        this.biomeDisplay = document.createElement('div');
        this.biomeDisplay.id = 'current-biome-display'; // 🎯 Easy to find in DOM
        this.biomeDisplay.className = 'biome-info';
        this.biomeDisplay.style.cssText = `
            color: #F5E6D3;
            font-size: 10px;
            text-align: center;
            padding: 4px 6px;
            background: rgba(0, 0, 0, 0.4);
            border-radius: 4px;
            border: 1px solid rgba(101, 67, 33, 0.6);
            min-height: 16px;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        `;
        this.biomeDisplay.textContent = '🌍 Exploring...';
        explorerPanel.appendChild(this.biomeDisplay);

        contentArea.appendChild(explorerPanel);

        // Add CSS animation for biome changes
        const biomeStyle = document.createElement('style');
        biomeStyle.textContent = `
            @keyframes biomeFade {
                0% { opacity: 0.6; transform: scale(0.98); }
                50% { opacity: 1; transform: scale(1.02); }
                100% { opacity: 1; transform: scale(1); }
            }
        `;
        document.head.appendChild(biomeStyle);

        // Modal menu overlay (centered)
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.6);
            display: none;
            z-index: 50000;
            pointer-events: auto;
        `;
        // Get max render distance from benchmark
        const getMaxRenderDistance = () => {
            const benchmarkKey = 'voxelWorld_performanceBenchmark';
            const storedResult = localStorage.getItem(benchmarkKey);
            if (storedResult) {
                const result = JSON.parse(storedResult);
                return result.renderDistance || 1;
            }
            return 3; // Default max
        };

        // Get current render distance setting (user preference or benchmark)
        const getCurrentRenderDistance = () => {
            const userPref = localStorage.getItem('voxelWorld_renderDistancePref');
            if (userPref !== null) {
                return parseInt(userPref);
            }
            return this.renderDistance;
        };

        // 🎮 Get GPU preference label
        const getGPUPreferenceLabel = () => {
            const pref = localStorage.getItem('voxelWorld_gpuPreference') || 'low-power';
            const labels = {
                'high-performance': '⚡ High Performance (dGPU)',
                'low-power': '🔋 Low Power (iGPU)',
                'default': '🎯 Auto (Browser Choice)'
            };
            return labels[pref] || labels['low-power'];
        };

        // 🎮 Get benchmark mode label
        const getBenchmarkLabel = () => {
            const pref = localStorage.getItem('voxelWorld_gpuPreference') || 'low-power';
            const labels = {
                'high-performance': '⚡ Re-run Benchmark (dGPU)',
                'low-power': '🔋 Re-run Benchmark (iGPU)',
                'default': '⚡ Re-run Benchmark'
            };
            return labels[pref] || labels['low-power'];
        };

        // 🎮 Format GPU info for display
        const getGPUDisplayName = () => {
            if (!this.detectedGPU) return 'Unknown GPU';
            const { vendor, renderer } = this.detectedGPU;

            // Simplify long GPU names
            let name = renderer;
            if (name.includes('NVIDIA')) {
                name = name.replace(/^.*?(GeForce|RTX|GTX|Quadro|Tesla)/, '$1').trim();
            } else if (name.includes('AMD') || name.includes('Radeon')) {
                name = name.replace(/^.*?(Radeon|RX)/, '$1').trim();
            } else if (name.includes('Intel')) {
                name = name.replace(/^.*?(Intel|Iris|UHD|HD Graphics)/, '$1').trim();
            }

            // Limit length
            if (name.length > 30) {
                name = name.substring(0, 27) + '...';
            }

            return name;
        };

        modal.innerHTML = `
            <div style="
                background: linear-gradient(180deg, rgba(139, 90, 43, 0.98), rgba(101, 67, 33, 0.98));
                border: 3px solid #654321;
                border-radius: 12px;
                padding: 0;
                box-shadow: 0 8px 32px rgba(0,0,0,0.8), inset 0 2px 4px rgba(245, 230, 211, 0.2);
                min-width: 600px;
                max-width: 700px;
                font-family: 'Georgia', serif;
                position: relative;
            ">
                <!-- Decorative corner elements -->
                <div style="position: absolute; top: 8px; left: 8px; width: 20px; height: 20px; border-left: 2px solid #D4AF37; border-top: 2px solid #D4AF37; opacity: 0.6;"></div>
                <div style="position: absolute; top: 8px; right: 8px; width: 20px; height: 20px; border-right: 2px solid #D4AF37; border-top: 2px solid #D4AF37; opacity: 0.6;"></div>
                <div style="position: absolute; bottom: 8px; left: 8px; width: 20px; height: 20px; border-left: 2px solid #D4AF37; border-bottom: 2px solid #D4AF37; opacity: 0.6;"></div>
                <div style="position: absolute; bottom: 8px; right: 8px; width: 20px; height: 20px; border-right: 2px solid #D4AF37; border-bottom: 2px solid #D4AF37; opacity: 0.6;"></div>

                <!-- Header -->
                <div style="
                    background: linear-gradient(180deg, rgba(101, 67, 33, 0.9), rgba(80, 54, 27, 0.9));
                    border-bottom: 2px solid #654321;
                    padding: 16px 24px;
                    border-radius: 9px 9px 0 0;
                ">
                    <h2 style="
                        margin: 0;
                        color: #F5E6D3;
                        font-size: 24px;
                        text-align: center;
                        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
                        letter-spacing: 1px;
                    ">📜 Explorer's Menu</h2>
                </div>

                <!-- Tab Navigation -->
                <div style="
                    display: flex;
                    background: rgba(80, 54, 27, 0.6);
                    border-bottom: 2px solid #654321;
                    padding: 0;
                ">
                    <button class="menu-tab" data-tab="world" style="
                        flex: 1;
                        padding: 12px 16px;
                        background: rgba(139, 90, 43, 0.8);
                        border: none;
                        border-right: 1px solid #654321;
                        color: #F5E6D3;
                        font-size: 14px;
                        font-family: 'Georgia', serif;
                        cursor: pointer;
                        transition: all 0.2s;
                        font-weight: bold;
                        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.6);
                    ">🌍 World</button>
                    <button class="menu-tab" data-tab="settings" style="
                        flex: 1;
                        padding: 12px 16px;
                        background: rgba(80, 54, 27, 0.6);
                        border: none;
                        border-right: 1px solid #654321;
                        color: #F5E6D3;
                        font-size: 14px;
                        font-family: 'Georgia', serif;
                        cursor: pointer;
                        transition: all 0.2s;
                        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.6);
                    ">⚙️ Settings</button>
                    <button class="menu-tab" data-tab="graphics" style="
                        flex: 1;
                        padding: 12px 16px;
                        background: rgba(80, 54, 27, 0.6);
                        border: none;
                        border-right: 1px solid #654321;
                        color: #F5E6D3;
                        font-size: 14px;
                        font-family: 'Georgia', serif;
                        cursor: pointer;
                        transition: all 0.2s;
                        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.6);
                    ">🎨 Graphics</button>
                    <button class="menu-tab" data-tab="music" style="
                        flex: 1;
                        padding: 12px 16px;
                        background: rgba(80, 54, 27, 0.6);
                        border: none;
                        border-right: 1px solid #654321;
                        color: #F5E6D3;
                        font-size: 14px;
                        font-family: 'Georgia', serif;
                        cursor: pointer;
                        transition: all 0.2s;
                        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.6);
                    ">🎵 Music</button>
                    <button class="menu-tab" data-tab="help" style="
                        flex: 1;
                        padding: 12px 16px;
                        background: rgba(80, 54, 27, 0.6);
                        border: none;
                        color: #F5E6D3;
                        font-size: 14px;
                        font-family: 'Georgia', serif;
                        cursor: pointer;
                        transition: all 0.2s;
                        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.6);
                    ">📚 Help</button>
                </div>

                <!-- Tab Content Container -->
                <div style="padding: 20px 24px; min-height: 400px;">

                    <!-- WORLD TAB -->
                    <div class="tab-content" data-tab="world" style="display: block;">
                        <div style="text-align: center; margin-bottom: 16px;">
                            <div style="color: #F5E6D3; font-size: 18px; margin-bottom: 8px; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">Current World</div>
                            <div style="color: #FFE4B5; font-size: 12px; font-style: italic;">Seed: ${this.worldSeed || 'Unknown'}</div>
                        </div>

                        <!-- Quick Actions -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
                            <button id="modal-save-btn" style="
                                padding: 12px 16px;
                                background: linear-gradient(180deg, #5a8a4a, #4a7a3a);
                                color: #F5E6D3;
                                border: 2px solid #3d5d2d;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 15px;
                                font-family: 'Georgia', serif;
                                font-weight: bold;
                                text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
                                box-shadow: 0 2px 4px rgba(0,0,0,0.4);
                                transition: all 0.2s;
                            ">💾 Save Game</button>
                            <button id="modal-load-btn" style="
                                padding: 12px 16px;
                                background: linear-gradient(180deg, #4a7a9a, #3a6a8a);
                                color: #F5E6D3;
                                border: 2px solid #2d5d7a;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 15px;
                                font-family: 'Georgia', serif;
                                font-weight: bold;
                                text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
                                box-shadow: 0 2px 4px rgba(0,0,0,0.4);
                                transition: all 0.2s;
                            ">📂 Load Game</button>
                        </div>

                        <!-- World Actions -->
                        <div style="
                            background: rgba(0, 0, 0, 0.3);
                            border: 1px solid #654321;
                            border-radius: 6px;
                            padding: 16px;
                            margin-bottom: 12px;
                        ">
                            <div style="color: #F5E6D3; font-size: 14px; margin-bottom: 12px; font-weight: bold;">World Actions</div>
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                <button id="modal-newgame-btn" style="
                                    padding: 10px 16px;
                                    background: linear-gradient(180deg, #9a7a4a, #8a6a3a);
                                    color: #F5E6D3;
                                    border: 2px solid #6d5d2d;
                                    border-radius: 6px;
                                    cursor: pointer;
                                    font-size: 14px;
                                    font-family: 'Georgia', serif;
                                    text-align: left;
                                    text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
                                    box-shadow: 0 2px 4px rgba(0,0,0,0.4);
                                    transition: all 0.2s;
                                ">� Start New Game</button>
                                <button id="modal-delete-btn" style="
                                    padding: 10px 16px;
                                    background: linear-gradient(180deg, #9a4a4a, #8a3a3a);
                                    color: #F5E6D3;
                                    border: 2px solid #7d2d2d;
                                    border-radius: 6px;
                                    cursor: pointer;
                                    font-size: 14px;
                                    font-family: 'Georgia', serif;
                                    text-align: left;
                                    text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
                                    box-shadow: 0 2px 4px rgba(0,0,0,0.4);
                                    transition: all 0.2s;
                                ">🗑 Delete Save</button>
                            </div>
                        </div>

                        <!-- Info Note -->
                        <div style="
                            background: rgba(212, 175, 55, 0.15);
                            border: 1px solid #D4AF37;
                            border-radius: 6px;
                            padding: 12px;
                            color: #FFE4B5;
                            font-size: 12px;
                            font-style: italic;
                            text-align: center;
                        ">
                            💡 Tip: Save frequently to preserve your progress!
                        </div>
                    </div>

                    <!-- SETTINGS TAB -->
                    <div class="tab-content" data-tab="settings" style="display: none;">
                        <div style="color: #F5E6D3; font-size: 18px; margin-bottom: 16px; text-align: center; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">Performance Settings</div>

                        <!-- Render Distance -->
                        <div style="
                            background: rgba(0, 0, 0, 0.3);
                            border: 1px solid #654321;
                            border-radius: 6px;
                            padding: 16px;
                            margin-bottom: 12px;
                        ">
                            <div style="color: #F5E6D3; font-size: 13px; margin-bottom: 8px; font-weight: bold;">🔭 View Distance</div>
                            <button id="modal-render-distance-btn" style="
                                width: 100%;
                                padding: 12px 16px;
                                background: linear-gradient(180deg, #4a8a9a, #3a7a8a);
                                color: #F5E6D3;
                                border: 2px solid #2d6d7a;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 14px;
                                font-family: 'Georgia', serif;
                                font-weight: bold;
                                text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
                                box-shadow: 0 2px 4px rgba(0,0,0,0.4);
                                transition: all 0.2s;
                            ">Render Distance: ${getCurrentRenderDistance()}</button>
                            <div style="color: #FFE4B5; font-size: 11px; margin-top: 6px; font-style: italic;">Higher = more visible terrain, lower FPS</div>
                        </div>

                        <!-- GPU Preference -->
                        <div style="
                            background: rgba(0, 0, 0, 0.3);
                            border: 1px solid #654321;
                            border-radius: 6px;
                            padding: 16px;
                            margin-bottom: 12px;
                        ">
                            <div style="color: #F5E6D3; font-size: 13px; margin-bottom: 8px; font-weight: bold;">🎮 GPU Mode</div>
                            <div style="color: #4CAF50; font-size: 11px; margin-bottom: 8px; font-family: monospace;">${getGPUDisplayName()}</div>
                            <button id="modal-gpu-btn" style="
                                width: 100%;
                                padding: 12px 16px;
                                background: linear-gradient(180deg, #9a5a4a, #8a4a3a);
                                color: #F5E6D3;
                                border: 2px solid #7d3d2d;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 14px;
                                font-family: 'Georgia', serif;
                                font-weight: bold;
                                text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
                                box-shadow: 0 2px 4px rgba(0,0,0,0.4);
                                transition: all 0.2s;
                            ">${getGPUPreferenceLabel()}</button>
                            <div style="color: #FFE4B5; font-size: 11px; margin-top: 6px; font-style: italic;">Requires page reload (F5)</div>
                        </div>

                        <!-- Benchmark -->
                        <div style="
                            background: rgba(0, 0, 0, 0.3);
                            border: 1px solid #654321;
                            border-radius: 6px;
                            padding: 16px;
                        ">
                            <div style="color: #F5E6D3; font-size: 13px; margin-bottom: 8px; font-weight: bold;">⚡ Performance Test</div>
                            <button id="modal-benchmark-btn" style="
                                width: 100%;
                                padding: 12px 16px;
                                background: linear-gradient(180deg, #7a5a9a, #6a4a8a);
                                color: #F5E6D3;
                                border: 2px solid #5d3d7a;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 14px;
                                font-family: 'Georgia', serif;
                                font-weight: bold;
                                text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
                                box-shadow: 0 2px 4px rgba(0,0,0,0.4);
                                transition: all 0.2s;
                            ">${getBenchmarkLabel()}</button>
                            <div style="color: #FFE4B5; font-size: 11px; margin-top: 6px; font-style: italic;">Tests your system and optimizes settings</div>
                        </div>
                    </div>

                    <!-- GRAPHICS TAB -->
                    <div class="tab-content" data-tab="graphics" style="display: none;">
                        <div style="color: #F5E6D3; font-size: 18px; margin-bottom: 16px; text-align: center; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">Visual Settings</div>

                        <!-- Enhanced Graphics -->
                        <div style="
                            background: rgba(0, 0, 0, 0.3);
                            border: 1px solid #654321;
                            border-radius: 6px;
                            padding: 16px;
                            margin-bottom: 12px;
                        ">
                            <div style="color: #F5E6D3; font-size: 13px; margin-bottom: 8px; font-weight: bold;">🎨 Enhanced Graphics</div>
                            <button id="modal-enhanced-graphics-btn" style="
                                width: 100%;
                                padding: 12px 16px;
                                background: linear-gradient(180deg, ${this.enhancedGraphics.isEnabled ? '#5a8a4a' : '#6a6a6a'}, ${this.enhancedGraphics.isEnabled ? '#4a7a3a' : '#5a5a5a'});
                                color: #F5E6D3;
                                border: 2px solid ${this.enhancedGraphics.isEnabled ? '#3d5d2d' : '#4a4a4a'};
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 14px;
                                font-family: 'Georgia', serif;
                                font-weight: bold;
                                text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
                                box-shadow: 0 2px 4px rgba(0,0,0,0.4);
                                transition: all 0.2s;
                            ">${this.enhancedGraphics.isEnabled ? '✓ Enhanced Graphics ON' : '○ Enhanced Graphics OFF'}</button>
                            <div style="color: #FFE4B5; font-size: 11px; margin-top: 6px; font-style: italic;">Custom textures and detailed graphics</div>
                        </div>

                        <!-- Emoji Style Picker -->
                        <div id="emoji-chooser-container" style="
                            background: rgba(0, 0, 0, 0.3);
                            border: 1px solid #654321;
                            border-radius: 6px;
                            padding: 16px;
                            margin-bottom: 12px;
                        "></div>

                        <!-- Graphics Info -->
                        <div style="
                            background: rgba(212, 175, 55, 0.15);
                            border: 1px solid #D4AF37;
                            border-radius: 6px;
                            padding: 12px;
                            color: #FFE4B5;
                            font-size: 12px;
                            font-style: italic;
                            text-align: center;
                        ">
                            💡 Enhanced graphics loads custom textures for blocks and tools
                        </div>
                    </div>

                    <!-- MUSIC TAB -->
                    <div class="tab-content" data-tab="music" style="display: none;">
                        <div style="color: #F5E6D3; font-size: 18px; margin-bottom: 16px; text-align: center; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">Audio Settings</div>

                        <!-- Volume Control -->
                        <div style="
                            background: rgba(0, 0, 0, 0.3);
                            border: 1px solid #654321;
                            border-radius: 6px;
                            padding: 16px;
                            margin-bottom: 12px;
                        ">
                            <div style="color: #F5E6D3; font-size: 13px; margin-bottom: 12px; font-weight: bold;">🔊 Music Volume</div>
                            <input type="range" id="modal-music-volume" min="0" max="100" value="${this.musicSystem.volume * 100}" style="
                                width: 100%;
                                height: 6px;
                                background: linear-gradient(to right, #4a7a3a, #5a8a4a);
                                border-radius: 3px;
                                outline: none;
                                -webkit-appearance: none;
                            ">
                            <div style="display: flex; justify-content: space-between; margin-top: 8px;">
                                <span style="color: #FFE4B5; font-size: 11px;">0%</span>
                                <span id="modal-volume-display" style="color: #FFE4B5; font-size: 12px; font-weight: bold;">${Math.round(this.musicSystem.volume * 100)}%</span>
                                <span style="color: #FFE4B5; font-size: 11px;">100%</span>
                            </div>
                            <div style="color: #FFE4B5; font-size: 11px; margin-top: 8px; font-style: italic; text-align: center;">Use +/- keys or slider to adjust volume</div>
                        </div>

                        <!-- Mute Toggle -->
                        <div style="
                            background: rgba(0, 0, 0, 0.3);
                            border: 1px solid #654321;
                            border-radius: 6px;
                            padding: 16px;
                            margin-bottom: 12px;
                        ">
                            <div style="color: #F5E6D3; font-size: 13px; margin-bottom: 8px; font-weight: bold;">🔇 Mute Music</div>
                            <button id="modal-music-mute-btn" style="
                                width: 100%;
                                padding: 12px 16px;
                                background: linear-gradient(180deg, ${this.musicSystem.isMuted ? '#9a4a4a' : '#5a8a4a'}, ${this.musicSystem.isMuted ? '#8a3a3a' : '#4a7a3a'});
                                color: #F5E6D3;
                                border: 2px solid ${this.musicSystem.isMuted ? '#7d2d2d' : '#3d5d2d'};
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 14px;
                                font-family: 'Georgia', serif;
                                font-weight: bold;
                                text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
                                box-shadow: 0 2px 4px rgba(0,0,0,0.4);
                                transition: all 0.2s;
                            ">${this.musicSystem.isMuted ? '🔇 Music Muted' : '🔊 Music Playing'}</button>
                            <div style="color: #FFE4B5; font-size: 11px; margin-top: 6px; font-style: italic;">Press 0 key to toggle mute</div>
                        </div>

                        <!-- Autoplay Toggle -->
                        <div style="
                            background: rgba(0, 0, 0, 0.3);
                            border: 1px solid #654321;
                            border-radius: 6px;
                            padding: 16px;
                            margin-bottom: 12px;
                        ">
                            <div style="color: #F5E6D3; font-size: 13px; margin-bottom: 8px; font-weight: bold;">▶️ Autoplay Music</div>
                            <button id="modal-music-autoplay-btn" style="
                                width: 100%;
                                padding: 12px 16px;
                                background: linear-gradient(180deg, ${this.musicSystem.autoplayEnabled ? '#5a8a4a' : '#6a6a6a'}, ${this.musicSystem.autoplayEnabled ? '#4a7a3a' : '#5a5a5a'});
                                color: #F5E6D3;
                                border: 2px solid ${this.musicSystem.autoplayEnabled ? '#3d5d2d' : '#4a4a4a'};
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 14px;
                                font-family: 'Georgia', serif;
                                font-weight: bold;
                                text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
                                box-shadow: 0 2px 4px rgba(0,0,0,0.4);
                                transition: all 0.2s;
                            ">${this.musicSystem.autoplayEnabled ? '✓ Autoplay ON' : '○ Autoplay OFF'}</button>
                            <div style="color: #FFE4B5; font-size: 11px; margin-top: 6px; font-style: italic;">Automatically start music on game load</div>
                        </div>

                        <!-- Music Info -->
                        <div style="
                            background: rgba(212, 175, 55, 0.15);
                            border: 1px solid #D4AF37;
                            border-radius: 6px;
                            padding: 12px;
                            color: #FFE4B5;
                            font-size: 12px;
                            font-style: italic;
                            text-align: center;
                        ">
                            🎼 Music composed by Jason Heaberlin
                        </div>
                    </div>

                    <!-- HELP TAB -->
                    <div class="tab-content" data-tab="help" style="display: none;">
                        <div style="color: #F5E6D3; font-size: 18px; margin-bottom: 16px; text-align: center; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">Help & Documentation</div>

                        <!-- Help Topic Buttons -->
                        <div style="
                            display: flex;
                            gap: 12px;
                            margin-bottom: 20px;
                        ">
                            <button class="help-topic-btn" data-topic="quick-start" style="
                                flex: 1;
                                padding: 12px 16px;
                                background: linear-gradient(180deg, #5a8a9a, #4a7a8a);
                                color: #F5E6D3;
                                border: 2px solid #3d6d7a;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 13px;
                                font-family: 'Georgia', serif;
                                font-weight: bold;
                                text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
                                box-shadow: 0 2px 4px rgba(0,0,0,0.4);
                                transition: all 0.2s;
                            ">🚀 Quick Start</button>
                            <button class="help-topic-btn" data-topic="gpu-setup" style="
                                flex: 1;
                                padding: 12px 16px;
                                background: linear-gradient(180deg, #7a5a9a, #6a4a8a);
                                color: #F5E6D3;
                                border: 2px solid #5d3d7a;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 13px;
                                font-family: 'Georgia', serif;
                                font-weight: bold;
                                text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
                                box-shadow: 0 2px 4px rgba(0,0,0,0.4);
                                transition: all 0.2s;
                            ">🎮 GPU Setup</button>
                            <button class="help-topic-btn" data-topic="command-line" style="
                                flex: 1;
                                padding: 12px 16px;
                                background: linear-gradient(180deg, #9a5a4a, #8a4a3a);
                                color: #F5E6D3;
                                border: 2px solid #7d3d2d;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 13px;
                                font-family: 'Georgia', serif;
                                font-weight: bold;
                                text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
                                box-shadow: 0 2px 4px rgba(0,0,0,0.4);
                                transition: all 0.2s;
                            ">💻 Command Line</button>
                            <button class="help-topic-btn" data-topic="save-system" style="
                                flex: 1;
                                padding: 12px 16px;
                                background: linear-gradient(180deg, #5a9a4a, #4a8a3a);
                                color: #F5E6D3;
                                border: 2px solid #3d7d2d;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 13px;
                                font-family: 'Georgia', serif;
                                font-weight: bold;
                                text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
                                box-shadow: 0 2px 4px rgba(0,0,0,0.4);
                                transition: all 0.2s;
                            ">💾 Save System</button>
                        </div>

                        <!-- Help Content Area -->
                        <div id="help-content-area" style="
                            background: rgba(0, 0, 0, 0.3);
                            border: 1px solid #654321;
                            border-radius: 6px;
                            padding: 20px;
                            min-height: 300px;
                            max-height: 400px;
                            overflow-y: auto;
                            color: #F5E6D3;
                            font-size: 13px;
                            line-height: 1.6;
                        ">
                            <div style="text-align: center; color: #FFE4B5; font-style: italic; padding: 40px 20px;">
                                Select a topic above to view help documentation
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div style="
                    background: linear-gradient(180deg, rgba(80, 54, 27, 0.9), rgba(101, 67, 33, 0.9));
                    border-top: 2px solid #654321;
                    padding: 12px 24px;
                    text-align: center;
                    border-radius: 0 0 9px 9px;
                ">
                    <button id="modal-close-btn" style="
                        padding: 8px 32px;
                        background: linear-gradient(180deg, #6a5a4a, #5a4a3a);
                        color: #F5E6D3;
                        border: 2px solid #4a3a2a;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-family: 'Georgia', serif;
                        font-weight: bold;
                        text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
                        box-shadow: 0 2px 4px rgba(0,0,0,0.4);
                        transition: all 0.2s;
                    ">Close Menu</button>
                </div>
            </div>
        `;
        contentArea.appendChild(modal);

        // 🎨 Inject Emoji Chooser into Graphics tab
        const emojiChooserContainer = modal.querySelector('#emoji-chooser-container');
        if (emojiChooserContainer) {
            const emojiChooser = createEmojiChooser();
            // Apply parchment theme styling to emoji chooser
            emojiChooser.style.cssText = `
                font-family: 'Georgia', serif;
            `;
            
            // Update emoji chooser styles to match Explorer's Menu theme
            const emojiStyle = document.createElement('style');
            emojiStyle.textContent = `
                #emoji-chooser-container .emoji-chooser h3 {
                    color: #F5E6D3 !important;
                    font-family: 'Georgia', serif !important;
                    font-size: 13px !important;
                    margin: 0 0 8px 0 !important;
                    font-weight: bold !important;
                }
                #emoji-chooser-container .emoji-description {
                    color: #FFE4B5 !important;
                    font-family: 'Georgia', serif !important;
                    font-size: 11px !important;
                    font-style: italic !important;
                    margin: 0 0 12px 0 !important;
                }
                #emoji-chooser-container .emoji-sets-grid {
                    display: grid !important;
                    grid-template-columns: repeat(2, 1fr) !important;
                    gap: 8px !important;
                    margin-bottom: 12px !important;
                }
                #emoji-chooser-container .emoji-set-option {
                    background: rgba(80, 54, 27, 0.6) !important;
                    border: 2px solid #654321 !important;
                    border-radius: 6px !important;
                    padding: 10px !important;
                    cursor: pointer !important;
                    transition: all 0.2s !important;
                    text-align: center !important;
                }
                #emoji-chooser-container .emoji-set-option:hover {
                    background: rgba(139, 90, 43, 0.8) !important;
                    transform: translateY(-2px) !important;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.4) !important;
                }
                #emoji-chooser-container .emoji-set-option.active {
                    background: rgba(90, 138, 74, 0.6) !important;
                    border-color: #5a8a4a !important;
                }
                #emoji-chooser-container .emoji-set-icon {
                    font-size: 1.5em !important;
                    margin-bottom: 6px !important;
                    display: block !important;
                }
                #emoji-chooser-container .emoji-set-name {
                    color: #F5E6D3 !important;
                    font-family: 'Georgia', serif !important;
                    font-size: 11px !important;
                    font-weight: normal !important;
                }
                #emoji-chooser-container .emoji-preview {
                    background: rgba(0, 0, 0, 0.3) !important;
                    border: 1px solid #654321 !important;
                    border-radius: 6px !important;
                    padding: 12px !important;
                    text-align: center !important;
                }
                #emoji-chooser-container .emoji-preview p {
                    margin: 0 !important;
                    font-size: 1.5em !important;
                    letter-spacing: 0.2em !important;
                }
            `;
            document.head.appendChild(emojiStyle);
            
            emojiChooserContainer.appendChild(emojiChooser);
        }

        // 🎨 Add hover effects CSS for menu buttons
        const menuStyle = document.createElement('style');
        menuStyle.textContent = `
            .menu-tab:hover {
                background: rgba(139, 90, 43, 0.6) !important;
                transform: translateY(-1px);
            }
            #modal-save-btn:hover, #modal-load-btn:hover,
            #modal-newgame-btn:hover, #modal-delete-btn:hover,
            #modal-render-distance-btn:hover, #modal-gpu-btn:hover,
            #modal-benchmark-btn:hover, #modal-enhanced-graphics-btn:hover,
            #modal-music-mute-btn:hover, #modal-music-autoplay-btn:hover,
            #modal-close-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.6) !important;
                filter: brightness(1.1);
            }
            .help-topic-btn:hover {
                transform: translateY(-2px) scale(1.02);
                box-shadow: 0 4px 8px rgba(0,0,0,0.6) !important;
                filter: brightness(1.15);
            }
            #help-content-area::-webkit-scrollbar {
                width: 8px;
            }
            #help-content-area::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.3);
                border-radius: 4px;
            }
            #help-content-area::-webkit-scrollbar-thumb {
                background: rgba(101, 67, 33, 0.8);
                border-radius: 4px;
            }
            #help-content-area::-webkit-scrollbar-thumb:hover {
                background: rgba(139, 90, 43, 0.9);
            }
        `;
        document.head.appendChild(menuStyle);

        // 📑 TAB SWITCHING LOGIC
        const menuTabs = modal.querySelectorAll('.menu-tab');
        const tabContents = modal.querySelectorAll('.tab-content');

        menuTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.getAttribute('data-tab');

                // Update tab buttons (active state)
                menuTabs.forEach(t => {
                    if (t.getAttribute('data-tab') === targetTab) {
                        t.style.background = 'rgba(139, 90, 43, 0.8)';
                        t.style.fontWeight = 'bold';
                    } else {
                        t.style.background = 'rgba(80, 54, 27, 0.6)';
                        t.style.fontWeight = 'normal';
                    }
                });

                // Show/hide tab content
                tabContents.forEach(content => {
                    if (content.getAttribute('data-tab') === targetTab) {
                        content.style.display = 'block';
                    } else {
                        content.style.display = 'none';
                    }
                });
            });
        });

        // Time indicator click handler (opens menu)
        this.timeIndicator.onclick = () => {
            modal.style.display = 'block';
        };

        const modalSaveBtn = modal.querySelector("#modal-save-btn");
        const modalLoadBtn = modal.querySelector("#modal-load-btn");
        const modalDeleteBtn = modal.querySelector("#modal-delete-btn");
        const modalNewGameBtn = modal.querySelector("#modal-newgame-btn");
        const modalBenchmarkBtn = modal.querySelector("#modal-benchmark-btn");
        const modalRenderDistanceBtn = modal.querySelector("#modal-render-distance-btn");
        const modalEnhancedGraphicsBtn = modal.querySelector("#modal-enhanced-graphics-btn");
        const modalGPUBtn = modal.querySelector("#modal-gpu-btn");
        const modalCloseBtn = modal.querySelector("#modal-close-btn");
        const gpuDisplay = modal.querySelector("#gpu-display");

        // Music controls
        const modalMusicVolumeSlider = modal.querySelector("#modal-music-volume");
        const modalVolumeDisplay = modal.querySelector("#modal-volume-display");
        const modalMusicMuteBtn = modal.querySelector("#modal-music-mute-btn");
        const modalMusicAutoplayBtn = modal.querySelector("#modal-music-autoplay-btn");

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

        const newGame = async () => {
            // ⚠️ Show warning about save deletion
            const confirmed = confirm(
                "⚠️ Warning: This will delete all progress!\n\n" +
                "Starting a new game will erase your current save data.\n" +
                "Continue?"
            );
            
            if (!confirmed) {
                return; // User cancelled
            }
            
            // Clear save data and reload
            localStorage.removeItem('NebulaWorld_playerData');
            location.reload();
        };

        const reRunBenchmark = async () => {
            modal.style.display = 'none';
            // Clear stored benchmark result to force re-run
            localStorage.removeItem('voxelWorld_performanceBenchmark');
            localStorage.removeItem('voxelWorld_renderDistancePref'); // Clear user preference too
            await this.runPerformanceBenchmark();
        };

        const cycleRenderDistance = () => {
            const maxRenderDistance = getMaxRenderDistance();
            const current = getCurrentRenderDistance();

            // Cycle from 0 to max
            const next = current >= maxRenderDistance ? 0 : current + 1;

            // Save user preference
            localStorage.setItem('voxelWorld_renderDistancePref', next.toString());
            this.renderDistance = next;

            // 🌫️ Update fog for new render distance using centralized updateFog()
            const isNight = this.dayNightCycle.currentTime >= 19 || this.dayNightCycle.currentTime < 6;
            const fogColor = isNight ? 0x0a0a0f : this.scene.background.getHex();
            this.updateFog(fogColor);

            // Update button text
            modalRenderDistanceBtn.textContent = `🔭 Render Distance: ${next}`;

            // Update status
            this.updateStatus(`Render distance set to ${next} (max: ${maxRenderDistance})`);

            // Force chunk reload with new render distance
            this.updateChunks();
        };

        // 🎮 GPU Preference Cycling
        const cycleGPUPreference = () => {
            const preferences = ['high-performance', 'low-power', 'default'];
            const current = localStorage.getItem('voxelWorld_gpuPreference') || 'low-power';
            const currentIndex = preferences.indexOf(current);
            const next = preferences[(currentIndex + 1) % preferences.length];

            // Save preference
            localStorage.setItem('voxelWorld_gpuPreference', next);

            // Show message about automatic reload
            this.updateStatus('🎮 GPU preference changed! Reloading game...', 'info', false);

            console.log(`🎮 GPU preference changed from ${current} to ${next}, reloading...`);

            // 🔄 AUTOMATIC RELOAD: GPU can only be changed by recreating the WebGL context
            // This requires a full page reload since powerPreference is set at renderer creation
            setTimeout(() => {
                location.reload();
            }, 1000); // 1 second delay to show the message
        };

        const toggleEnhancedGraphics = async () => {
            const newState = this.enhancedGraphics.toggle();

            // Re-initialize graphics if turned on
            if (newState) {
                this.updateStatus('🎨 Loading enhanced graphics assets...', 'info', false);
                const result = await this.enhancedGraphics.initialize();
                if (result.success) {
                    this.updateStatus(`🎨 Enhanced Graphics enabled! ${result.assetsLoaded} assets loaded`, 'info');
                } else {
                    this.updateStatus('❌ Enhanced Graphics failed to load assets', 'info');
                }
            } else {
                this.updateStatus('🎨 Enhanced Graphics disabled', 'info');
            }

            // Update button appearance
            modalEnhancedGraphicsBtn.style.background = newState ? '#4CAF50' : '#757575';
            modalEnhancedGraphicsBtn.textContent = newState ? '🎨 Enhanced Graphics ON' : '🎨 Enhanced Graphics OFF';

            // Refresh the time indicator to apply/remove enhanced graphics
            if (this.updateTimeIndicator) {
                this.updateTimeIndicator();
            }

            // Refresh hotbar and inventory icons
            if (this.updateHotbarCounts) {
                this.updateHotbarCounts();
            }

            // Refresh backpack inventory display
            if (this.updateBackpackInventoryDisplay) {
                this.updateBackpackInventoryDisplay();
            }

            // Refresh all block textures (including trees) when Enhanced Graphics is toggled
            if (newState && this.refreshAllBlockTextures) {
                this.refreshAllBlockTextures();
            }

            // Refresh all billboards when Enhanced Graphics is toggled
            if (this.refreshAllBillboards) {
                this.refreshAllBillboards();
            }

            // Refresh tool button icons
            if (this.backpackTool) {
                this.updateToolButtonIcon(this.backpackTool, 'backpack', '🎒');
            }
            if (this.workbenchTool) {
                this.updateToolButtonIcon(this.workbenchTool, 'workbench', '🔨');
            }
            if (this.toolBenchButton) {
                this.updateToolButtonIcon(this.toolBenchButton, 'tool_bench', '🔧');
            }
            if (this.kitchenBenchButton) {
                this.updateToolButtonIcon(this.kitchenBenchButton, 'kitchen_bench', '🍳');
            }

            // Refresh existing billboards in the world
            this.refreshAllBillboards();

            console.log(`🔄 Enhanced Graphics UI refresh complete - state: ${newState ? 'ON' : 'OFF'}`);

            modal.style.display = 'none';
        };

        // 🎵 Music control handlers
        const updateVolumeSlider = () => {
            if (modalMusicVolumeSlider) {
                const volumePercent = Math.round(this.musicSystem.volume * 100);
                modalVolumeDisplay.textContent = `${volumePercent}%`;
            }
        };

        const handleVolumeSliderChange = (e) => {
            const newVolume = parseInt(e.target.value) / 100;
            this.musicSystem.volume = newVolume;
            this.musicSystem.updateVolume();
            this.musicSystem.saveVolume();
            updateVolumeSlider();
            console.log(`🎵 Volume: ${Math.round(newVolume * 100)}%`);
        };

        const toggleMusicMute = () => {
            this.musicSystem.toggleMute();

            // Update button appearance
            const isMuted = this.musicSystem.isMuted;
            modalMusicMuteBtn.style.background = isMuted ?
                'linear-gradient(180deg, #9a4a4a, #8a3a3a)' :
                'linear-gradient(180deg, #5a8a4a, #4a7a3a)';
            modalMusicMuteBtn.style.borderColor = isMuted ? '#7d2d2d' : '#3d5d2d';
            modalMusicMuteBtn.textContent = isMuted ? '🔇 Music Muted' : '🔊 Music Playing';
        };

        const toggleMusicAutoplay = () => {
            const newState = this.musicSystem.toggleAutoplay();

            // Update button appearance
            modalMusicAutoplayBtn.style.background = newState ?
                'linear-gradient(180deg, #5a8a4a, #4a7a3a)' :
                'linear-gradient(180deg, #6a6a6a, #5a5a5a)';
            modalMusicAutoplayBtn.style.borderColor = newState ? '#3d5d2d' : '#4a4a4a';
            modalMusicAutoplayBtn.textContent = newState ? '✓ Autoplay ON' : '○ Autoplay OFF';

            this.updateStatus(`🎵 Music autoplay ${newState ? 'enabled' : 'disabled'}`, 'info');
        };

        // 💾 NEW SAVE SYSTEM: Replace old localStorage save/load with SaveSystem
        if (modalSaveBtn) modalSaveBtn.onclick = () => {
            modal.style.display = 'none'; // Close menu
            this.showSaveMenu(); // Open save slot picker
        };
        
        if (modalLoadBtn) modalLoadBtn.onclick = () => {
            modal.style.display = 'none'; // Close menu
            this.showLoadMenu(); // Open load slot picker
        };
        
        if (modalDeleteBtn) modalDeleteBtn.onclick = () => {
            modal.style.display = 'none'; // Close menu
            this.showDeleteMenu(); // Open delete slot picker
        };
        
        if (modalNewGameBtn) modalNewGameBtn.onclick = newGame;
        if (modalBenchmarkBtn) modalBenchmarkBtn.onclick = reRunBenchmark;
        if (modalRenderDistanceBtn) modalRenderDistanceBtn.onclick = cycleRenderDistance;
        if (modalEnhancedGraphicsBtn) modalEnhancedGraphicsBtn.onclick = toggleEnhancedGraphics;
        if (modalGPUBtn) modalGPUBtn.onclick = cycleGPUPreference;
        if (modalCloseBtn) modalCloseBtn.onclick = () => modal.style.display = 'none';

        // 📚 Help system - Load markdown files
        const helpContentArea = modal.querySelector('#help-content-area');
        const helpTopicButtons = modal.querySelectorAll('.help-topic-btn');

        const loadHelpTopic = async (topic) => {
            try {
                helpContentArea.innerHTML = '<div style="text-align: center; padding: 40px;"><div style="font-size: 16px;">⏳ Loading...</div></div>';
                
                let markdown = '';
                
                // Try to load via electronAPI first (for Electron), then fetch (for web)
                if (window.electronAPI && window.electronAPI.readFile) {
                    try {
                        markdown = await window.electronAPI.readFile(`assets/help/${topic}.md`);
                    } catch (e) {
                        console.log('Electron read failed, trying fetch:', e);
                        const response = await fetch(`/assets/help/${topic}.md`);
                        markdown = await response.text();
                    }
                } else {
                    const response = await fetch(`/assets/help/${topic}.md`);
                    markdown = await response.text();
                }
                
                // Convert markdown to HTML using marked
                const html = marked.parse(markdown);
                helpContentArea.innerHTML = html;
                
                // Style the markdown output
                helpContentArea.style.fontSize = '13px';
                helpContentArea.style.lineHeight = '1.6';
                
                // Style headings
                helpContentArea.querySelectorAll('h1').forEach(h => {
                    h.style.color = '#FFD700';
                    h.style.fontSize = '20px';
                    h.style.marginTop = '0';
                    h.style.marginBottom = '16px';
                    h.style.borderBottom = '2px solid #654321';
                    h.style.paddingBottom = '8px';
                });
                
                helpContentArea.querySelectorAll('h2').forEach(h => {
                    h.style.color = '#F5E6D3';
                    h.style.fontSize = '16px';
                    h.style.marginTop = '20px';
                    h.style.marginBottom = '12px';
                });
                
                helpContentArea.querySelectorAll('h3').forEach(h => {
                    h.style.color = '#FFE4B5';
                    h.style.fontSize = '14px';
                    h.style.marginTop = '16px';
                    h.style.marginBottom = '8px';
                });
                
                // Style code blocks
                helpContentArea.querySelectorAll('code').forEach(code => {
                    code.style.background = 'rgba(0, 0, 0, 0.4)';
                    code.style.padding = '2px 6px';
                    code.style.borderRadius = '3px';
                    code.style.color = '#4CAF50';
                    code.style.fontSize = '12px';
                    code.style.fontFamily = 'monospace';
                });
                
                helpContentArea.querySelectorAll('pre code').forEach(code => {
                    code.style.display = 'block';
                    code.style.padding = '12px';
                    code.style.marginTop = '8px';
                    code.style.marginBottom = '8px';
                    code.style.overflowX = 'auto';
                });
                
                // Style lists
                helpContentArea.querySelectorAll('ul, ol').forEach(list => {
                    list.style.marginLeft = '20px';
                    list.style.marginBottom = '12px';
                });
                
                helpContentArea.querySelectorAll('li').forEach(li => {
                    li.style.marginBottom = '6px';
                });
                
                // Style horizontal rules
                helpContentArea.querySelectorAll('hr').forEach(hr => {
                    hr.style.border = 'none';
                    hr.style.borderTop = '1px solid #654321';
                    hr.style.margin = '20px 0';
                });
                
                console.log(`📚 Loaded help topic: ${topic}`);
            } catch (error) {
                console.error('Failed to load help topic:', error);
                helpContentArea.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #F44336;">
                        <div style="font-size: 24px; margin-bottom: 12px;">❌</div>
                        <div style="font-size: 14px;">Failed to load help documentation</div>
                        <div style="font-size: 12px; margin-top: 8px; opacity: 0.7;">${error.message}</div>
                    </div>
                `;
            }
        };

        // Add click handlers for help topic buttons
        helpTopicButtons.forEach(button => {
            button.onclick = () => {
                const topic = button.getAttribute('data-topic');
                
                // Update button states
                helpTopicButtons.forEach(btn => {
                    btn.style.opacity = '0.7';
                    btn.style.transform = 'scale(1)';
                });
                button.style.opacity = '1';
                button.style.transform = 'scale(1.05)';
                
                // Load the topic
                loadHelpTopic(topic);
            };
        });

        // 💾 NEW SAVE SYSTEM: Save/Load/Delete Menu Functions
        this.showSaveMenu = async () => {
            console.log('💾 Opening save menu...');
            try {
                const slots = await this.saveSystem.getSaveSlots();
                this.showSlotPicker(slots, 'save');
            } catch (error) {
                console.error('Failed to load save slots:', error);
                this.updateStatus('❌ Failed to load save slots', 'error');
            }
        };

        this.showLoadMenu = async () => {
            console.log('📂 Opening load menu...');
            try {
                const slots = await this.saveSystem.getSaveSlots();
                this.showSlotPicker(slots, 'load');
            } catch (error) {
                console.error('Failed to load save slots:', error);
                this.updateStatus('❌ Failed to load save slots', 'error');
            }
        };

        this.showDeleteMenu = async () => {
            console.log('🗑️ Opening delete menu...');
            try {
                const slots = await this.saveSystem.getSaveSlots();
                this.showSlotPicker(slots, 'delete');
            } catch (error) {
                console.error('Failed to load save slots:', error);
                this.updateStatus('❌ Failed to load save slots', 'error');
            }
        };

        this.showSlotPicker = (slots, mode) => {
            const modal = document.createElement('div');
            modal.id = 'slot-picker-modal';
            modal.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #2a1810 0%, #1a0f08 100%);
                border: 3px solid #8B4513;
                border-radius: 12px;
                padding: 30px;
                max-width: 900px;
                max-height: 80vh;
                overflow-y: auto;
                z-index: 10001;
                box-shadow: 0 0 50px rgba(0,0,0,0.9);
            `;

            // Title
            const title = document.createElement('h2');
            const titleText = mode === 'save' ? '💾 Save Game' : 
                            mode === 'load' ? '📂 Load Game' : 
                            '🗑️ Delete Save';
            title.textContent = titleText;
            title.style.cssText = `
                color: #FFD700;
                font-size: 28px;
                margin: 0 0 20px 0;
                text-align: center;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            `;
            modal.appendChild(title);

            // Slots grid
            const slotsGrid = document.createElement('div');
            slotsGrid.style.cssText = `
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 15px;
                margin-bottom: 20px;
            `;

            for (const slot of slots) {
                const slotCard = document.createElement('div');
                slotCard.style.cssText = `
                    background: rgba(0,0,0,0.6);
                    border: 2px solid ${slot.exists ? '#4CAF50' : '#555'};
                    border-radius: 8px;
                    padding: 15px;
                    cursor: pointer;
                    transition: all 0.3s;
                `;

                // Thumbnail
                if (slot.thumbnail) {
                    const thumbnail = document.createElement('img');
                    thumbnail.src = slot.thumbnail;
                    thumbnail.style.cssText = `
                        width: 100%;
                        height: auto;
                        border-radius: 4px;
                        margin-bottom: 10px;
                    `;
                    slotCard.appendChild(thumbnail);
                } else {
                    const placeholder = document.createElement('div');
                    placeholder.style.cssText = `
                        width: 100%;
                        height: 140px;
                        background: linear-gradient(135deg, #333 0%, #222 100%);
                        border-radius: 4px;
                        margin-bottom: 10px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 48px;
                    `;
                    placeholder.textContent = '📂';
                    slotCard.appendChild(placeholder);
                }

                // Slot info
                const info = document.createElement('div');
                info.style.cssText = `color: #F5E6D3; font-size: 14px;`;
                info.innerHTML = `
                    <div style="font-weight: bold; margin-bottom: 5px;">${slot.name}</div>
                    ${slot.exists ? `
                        <div>⏰ ${new Date(slot.timestamp).toLocaleString()}</div>
                        <div>🎮 ${Math.floor(slot.playtime / 3600)}h ${Math.floor((slot.playtime % 3600) / 60)}m</div>
                        <div>📊 ${slot.stats ? slot.stats.blocksPlaced : 0} blocks • ${slot.stats ? slot.stats.objectsCrafted : 0} objects</div>
                    ` : '<div style="color: #999;">Empty Slot</div>'}
                `;
                slotCard.appendChild(info);

                // Click handler based on mode
                slotCard.addEventListener('click', async () => {
                    try {
                        if (mode === 'save') {
                            await this.saveSystem.saveToSlot(slot.slot, `Save Slot ${slot.slot}`);
                            this.updateStatus(`✅ Game saved to slot ${slot.slot}!`, 'success');
                            document.body.removeChild(modal);
                        } else if (mode === 'load') {
                            if (!slot.exists) {
                                this.updateStatus('❌ Slot is empty', 'error');
                                return;
                            }
                            await this.saveSystem.loadFromSlot(slot.slot);
                            this.updateStatus(`✅ Game loaded from slot ${slot.slot}!`, 'success');
                            document.body.removeChild(modal);
                            
                            // Refresh the world view
                            this.updateChunks();
                        } else if (mode === 'delete') {
                            if (!slot.exists) {
                                this.updateStatus('❌ Slot is empty', 'error');
                                return;
                            }
                            if (confirm(`Delete save slot ${slot.slot}?\n\n${slot.name}\n${new Date(slot.timestamp).toLocaleString()}\n\nThis cannot be undone!`)) {
                                await this.saveSystem.deleteSlot(slot.slot);
                                this.updateStatus(`✅ Deleted save slot ${slot.slot}`, 'success');
                                document.body.removeChild(modal);
                            }
                        }
                    } catch (error) {
                        console.error(`${mode} failed:`, error);
                        this.updateStatus(`❌ ${mode} failed: ${error.message}`, 'error');
                    }
                });

                // Hover effect
                slotCard.addEventListener('mouseenter', () => {
                    slotCard.style.borderColor = '#FFD700';
                    slotCard.style.transform = 'scale(1.05)';
                });

                slotCard.addEventListener('mouseleave', () => {
                    slotCard.style.borderColor = slot.exists ? '#4CAF50' : '#555';
                    slotCard.style.transform = 'scale(1)';
                });

                slotsGrid.appendChild(slotCard);
            }

            modal.appendChild(slotsGrid);

            // Close button
            const closeBtn = document.createElement('button');
            closeBtn.textContent = '✖ Close';
            closeBtn.style.cssText = `
                width: 100%;
                padding: 15px;
                background: linear-gradient(180deg, #8B0000, #600000);
                border: 2px solid #A52A2A;
                border-radius: 8px;
                color: white;
                font-size: 16px;
                cursor: pointer;
                font-weight: bold;
            `;
            closeBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
            });
            modal.appendChild(closeBtn);

            document.body.appendChild(modal);
        };

        // Music control event listeners
        if (modalMusicVolumeSlider) modalMusicVolumeSlider.oninput = handleVolumeSliderChange;
        if (modalMusicMuteBtn) modalMusicMuteBtn.onclick = toggleMusicMute;
        if (modalMusicAutoplayBtn) modalMusicAutoplayBtn.onclick = toggleMusicAutoplay;

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
                info: { icon: 'ℹ️', toolType: null, color: '#2196F3', borderColor: '#2196F3' },
                success: { icon: '✅', toolType: null, color: '#4CAF50', borderColor: '#4CAF50' },
                warning: { icon: '⚠️', toolType: null, color: '#FF9800', borderColor: '#FF9800' },
                error: { icon: '❌', toolType: null, color: '#F44336', borderColor: '#F44336' },
                harvest: { icon: '⛏️', toolType: 'machete', color: '#8BC34A', borderColor: '#8BC34A' },
                craft: { icon: '🔨', toolType: 'workbench', color: '#9C27B0', borderColor: '#9C27B0' },
                discovery: { icon: '🎒', toolType: 'backpack', color: '#FF5722', borderColor: '#FF5722' },
                progress: { icon: '⏳', toolType: null, color: '#FFC107', borderColor: '#FFC107' },
                magic: { icon: '✨', toolType: null, color: '#E91E63', borderColor: '#E91E63' }
            };

            const notification = notificationTypes[type] || notificationTypes.info;

            // Update icon - use enhanced graphics if available for tool-related notifications
            if (notification.toolType && this.enhancedGraphics.isReady()) {
                const enhancedIcon = this.enhancedGraphics.getStatusToolIcon(notification.toolType, notification.icon);
                if (enhancedIcon.includes('<img')) {
                    // Enhanced icon is HTML, use innerHTML
                    this.statusIcon.innerHTML = enhancedIcon;
                    // console.log(`🎨 Using enhanced status icon for ${notification.toolType}`);
                } else {
                    // Fall back to emoji
                    this.statusIcon.textContent = enhancedIcon;
                }
            } else {
                // Use default emoji icon
                this.statusIcon.textContent = notification.icon;
            }

            // Use innerHTML if message contains HTML tags (for enhanced graphics icons in message)
            if (message.includes('<img') || message.includes('<span')) {
                this.statusText.innerHTML = message;
            } else {
                this.statusText.textContent = message;
            }

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

        // 🎨 LOD SYSTEM DEBUG COMMANDS (TEST VERSION)
        // Usage in browser console:
        // voxelWorld.toggleLOD() - Enable/disable LOD system
        // voxelWorld.setVisualDistance(5) - Set how far LOD chunks extend
        // voxelWorld.getLODStats() - Get LOD performance stats
        // voxelWorld.openTutorialEditor() - Open tutorial/quest editor
        if (typeof window !== 'undefined') {
            window.voxelWorld = this; // Expose for debugging
            console.log('🎮 Debug commands available:');
            console.log('  voxelWorld.toggleLOD() - Toggle LOD system');
            console.log('  voxelWorld.setVisualDistance(n) - Set LOD distance');
            console.log('  voxelWorld.getLODStats() - Get LOD stats');
            console.log('  voxelWorld.openTutorialEditor() - Open tutorial editor');
        }
    }

    // 🎨 LOD SYSTEM - Debug convenience methods
    toggleLOD() {
        if (!this.lodManager) {
            console.warn('❌ LOD Manager not initialized');
            return false;
        }
        return this.lodManager.toggle();
    }

    setVisualDistance(distance) {
        if (!this.lodManager) {
            console.warn('❌ LOD Manager not initialized');
            return;
        }
        this.lodManager.setVisualDistance(distance);

        // 🌫️ Update fog to match new visual distance using updateFog()
        this.updateFog();
    }

    // 🐈‍⬛ SARGEM QUEST EDITOR - Dev command to open visual node editor
    // Disables game controls while editing, re-enables on close
    openTutorialEditor() {
        if (this.sargemEditor) {
            this.sargemEditor.open();
        } else {
            console.warn('❌ Sargem editor not initialized');
        }
    }

    // � NPC SYSTEM - Cleanup quest NPCs
    cleanupQuestNPCs() {
        if (this.npcManager) {
            this.npcManager.removeAll();
            console.log('🧹 Quest NPCs cleaned up');
        }
    }

    // �🐰 ANIMAL SYSTEM - Helper methods
    getTimeOfDay() {
        if (!this.gameTime) return 'day';
        
        const hour = Math.floor(this.gameTime / 3600) % 24;
        
        if (hour >= 5 && hour < 7) return 'dawn';
        if (hour >= 7 && hour < 17) return 'day';
        if (hour >= 17 && hour < 19) return 'dusk';
        if (hour >= 19 || hour < 5) return 'night';
        return 'day';
    }

    getGroundHeight(x, z) {
        // Check for highest block at x,z
        for (let y = 128; y >= 0; y--) {
            const key = `${Math.floor(x)},${y},${Math.floor(z)}`;
            if (this.world[key]) {
                return y + 1; // Spawn one block above
            }
        }
        return 1; // Default ground level
    }

    getLODStats() {
        if (!this.lodManager) {
            console.warn('❌ LOD Manager not initialized');
            return null;
        }
        const stats = this.lodManager.getStats();
        console.table(stats);
        return stats;
    }

    // 🧊 GREEDY MESHING - Get performance stats
    getGreedyMeshStats() {
        if (!this.chunkMeshManager) {
            console.warn('❌ Greedy Meshing not enabled');
            return null;
        }
        const stats = this.chunkMeshManager.getStats();
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🧊 GREEDY MESHING STATS:');
        console.log(`   Total Chunks: ${stats.totalChunks}`);
        console.log(`   Total Blocks: ${stats.totalBlocks}`);
        console.log(`   Draw Calls: ${stats.totalDrawCalls} (was ${stats.totalBlocks})`);
        console.log(`   Reduction: ${((1 - stats.totalDrawCalls / Math.max(stats.totalBlocks, 1)) * 100).toFixed(1)}%`);
        console.log(`   Avg Mesh Time: ${stats.avgMeshTime}`);
        console.log(`   Total Mesh Time: ${stats.meshGenerationTime.toFixed(2)}ms`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return stats;
    }

    // 🧊 Toggle greedy meshing on/off
    toggleGreedyMeshing() {
        console.warn('⚠️ Toggling greedy meshing requires game restart!');
        console.log(`Current state: ${this.useGreedyMeshing ? 'ENABLED' : 'DISABLED'}`);
        console.log('To toggle: Set this.useGreedyMeshing in VoxelWorld.js line 8204');
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

            // Get position from regular mesh
            const pos = hit.object.position.clone();

            // Start harvesting on mobile touch and hold
            this.startHarvesting(pos.x, pos.y, pos.z);
        }
    }

    /**
     * 🎄 DEBUG: Test regular Douglas Fir tree at target position
     * Usage: window.voxelApp.testDouglas() or testDouglas()
     */
    testDouglas() {
        // Use raycaster to get target block (same as block placement)
        if (!this.raycaster || !this.camera) {
            console.error('❌ Raycaster not initialized!');
            return;
        }

        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const intersects = this.raycaster.intersectObjects(
            this.scene.children.filter(obj => obj.isMesh && obj !== this.targetHighlight)
        );

        if (intersects.length === 0) {
            console.error('❌ No target block found! Look at a block first.');
            return;
        }

        const hit = intersects[0];
        const x = Math.floor(hit.object.position.x);
        const y = Math.floor(hit.object.position.y);
        const z = Math.floor(hit.object.position.z);

        console.log(`🎄 Spawning Douglas Fir at target position (${x}, ${y + 1}, ${z})`);

        // Generate tree one block above target
        this.generateDouglasFir(x, y + 1, z);

        console.log('✅ Douglas Fir spawned successfully!');
    }

    /**
     * 🎄 DEBUG: Test Mega Christmas tree at target position (with player safety check)
     * Usage: window.voxelApp.testChristmas() or testChristmas()
     */
    testChristmas() {
        // Use raycaster to get target block (same as block placement)
        if (!this.raycaster || !this.camera) {
            console.error('❌ Raycaster not initialized!');
            return;
        }

        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const intersects = this.raycaster.intersectObjects(
            this.scene.children.filter(obj => obj.isMesh && obj !== this.targetHighlight)
        );

        if (intersects.length === 0) {
            console.error('❌ No target block found! Look at a block first.');
            return;
        }

        const hit = intersects[0];
        let x = Math.floor(hit.object.position.x);
        let y = Math.floor(hit.object.position.y);
        let z = Math.floor(hit.object.position.z);

        // Safety check: If player is too close, move tree away
        const playerX = Math.floor(this.player.position.x);
        const playerZ = Math.floor(this.player.position.z);
        const distance = Math.sqrt((x - playerX) ** 2 + (z - playerZ) ** 2);

        if (distance < 15) {
            // Move tree 20 blocks away from player in target direction
            const dx = x - playerX;
            const dz = z - playerZ;
            const length = Math.sqrt(dx * dx + dz * dz);

            if (length > 0) {
                x = Math.floor(playerX + (dx / length) * 20);
                z = Math.floor(playerZ + (dz / length) * 20);
            } else {
                // Player is exactly at target, move 20 blocks north
                z += 20;
            }

            console.log(`⚠️ Player too close! Moving Mega Fir to safe distance (${x}, ${z})`);
        }

        console.log(`🎄✨ Spawning MEGA CHRISTMAS TREE at (${x}, ${y + 1}, ${z})`);

        // Generate mega tree one block above surface
        if (this.christmasSystem) {
            this.christmasSystem.generateMegaDouuglasFir(x, y + 1, z);
            console.log('✅ Mega Christmas Tree spawned successfully!');
        } else {
            console.error('❌ ChristmasSystem not initialized!');
        }
    }

    /**
     * 🎮 DEBUG: Test combat system
     * Usage: window.voxelApp.testCombat('angry_ghost') or testCombat()
     * @param {string} enemyId - Enemy ID from entities.json (default: 'angry_ghost')
     */
    testCombat(enemyId = 'angry_ghost') {
        if (!this.battleSystem) {
            console.error('❌ BattleSystem not initialized!');
            return;
        }

        // Calculate enemy position 4 blocks ahead of player at their Y level
        const playerPos = this.player.position;
        const playerRotation = this.player.rotation.y;

        // Calculate forward direction vector
        const forwardX = -Math.sin(playerRotation);
        const forwardZ = -Math.cos(playerRotation);

        // Spawn enemy 4 blocks ahead at player's Y level
        const enemyPosition = {
            x: playerPos.x + (forwardX * 4),
            y: playerPos.y,
            z: playerPos.z + (forwardZ * 4)
        };

        console.log(`🎮 TEST COMBAT: Starting battle with ${enemyId} at (${enemyPosition.x.toFixed(1)}, ${enemyPosition.y.toFixed(1)}, ${enemyPosition.z.toFixed(1)})`);

        // Start battle
        this.battleSystem.startBattle(enemyId, enemyPosition);
    }

    // NPC SYSTEM - Spawn helper for console
    spawnNPC(emoji = '🐈‍⬛', name = 'Sargem', distance = 3) {
        if (!this.npcManager) {
            console.error('NPC Manager not ready');
            return;
        }

        // Get player position and camera direction
        const playerPos = this.player.position;
        const cameraDir = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDir);
        
        // Calculate spawn X/Z position
        const spawnX = Math.floor(playerPos.x + cameraDir.x * distance);
        const spawnZ = Math.floor(playerPos.z + cameraDir.z * distance);
        
        // Find ground height (search down from player Y)
        let groundY = Math.floor(playerPos.y);
        for (let y = groundY; y > 0; y--) {
            const block = this.getBlock(spawnX, y, spawnZ);
            if (block && block.type !== 0) { // Found solid block
                groundY = y + 1; // Spawn on top of block
                break;
            }
        }
        
        const spawnPos = new THREE.Vector3(spawnX, groundY, spawnZ);

        return this.npcManager.spawn({
            name: name,
            emoji: emoji,
            position: spawnPos,
            onInteract: (npc) => alert(`${npc.name} says: Meow!`)
        });
    }
}

export async function initVoxelWorld(container, splashScreen = null) {
    console.log('🔧 initVoxelWorld called with container:', container);

    try {
        if (splashScreen) {
            splashScreen.setInitializing();
        }

        const app = new NebulaVoxelApp(container);
        console.log('📱 NebulaVoxelApp created');

        // Pass splash screen to enhanced graphics
        if (splashScreen) {
            app.enhancedGraphics.splashScreen = splashScreen;
        }

        // Initialize workbench system
        app.workbenchSystem.init();
        console.log('🔨 WorkbenchSystem initialized');

        if (splashScreen) {
            splashScreen.updateProgress(30, 'Loading enhanced graphics...');
        }

        // Initialize enhanced graphics system
        const graphicsResult = await app.enhancedGraphics.initialize();
        console.log('🎨 EnhancedGraphics initialized:', graphicsResult);

        // Initialize Web Worker for chunk generation
        if (splashScreen) {
            splashScreen.updateProgress(40, 'Initializing world generator...');
        }

        try {
            await app.workerManager.initialize(
                app.worldSeed,
                app.biomeWorldGen.biomes,
                app.biomeWorldGen.noiseParams
            );
            app.workerInitialized = true;
            console.log('👷 WorkerManager initialized successfully');
        } catch (error) {
            console.error('🚨 Failed to initialize WorkerManager:', error);
            console.warn('⚠️ Falling back to main thread chunk generation');
            app.workerInitialized = false;
        }

        // Initialize ModificationTracker now that worldSeed is set
        const isElectron = typeof window !== 'undefined' && window.process && window.process.type === 'renderer';
        app.modificationTracker = new ModificationTracker(app.worldSeed, isElectron);
        console.log('💾 ModificationTracker initialized');

        if (splashScreen) {
            splashScreen.setGeneratingWorld();
        }

        // Refresh tool button icons now that enhanced graphics are loaded (only if backpack found)
        if (app.hasBackpack) {
            if (app.backpackTool) {
                app.updateToolButtonIcon(app.backpackTool, 'backpack', '🎒');
            }
            if (app.workbenchTool) {
                app.updateToolButtonIcon(app.workbenchTool, 'workbench', '🔨');
            }
            if (app.toolBenchButton && app.hasToolBench) {
                app.updateToolButtonIcon(app.toolBenchButton, 'tool_bench', '🔧');
            }
            if (app.kitchenBenchButton && app.hasKitchenBench) {
                app.updateToolButtonIcon(app.kitchenBenchButton, 'kitchen_bench', '🍳');
            }
            console.log('🔄 Tool button icons refreshed after Enhanced Graphics initialization');
        }

        // Refresh all billboards now that enhanced graphics are loaded
        app.refreshAllBillboards();
        console.log('🔄 All billboards refreshed after Enhanced Graphics initialization');

        if (splashScreen) {
            splashScreen.setLoadingChunks();
        }

        // Refresh all existing blocks with enhanced graphics
        app.refreshAllBlockTextures();
        console.log('🔄 All block textures refreshed after Enhanced Graphics initialization');

        console.log('✅ VoxelWorld initialization completed');

        // Note: First-time tutorial is handled by App.js intro sequence with companion selection
        // Returning players will get contextual tutorials as they play

        // Hide splash screen after everything is loaded
        if (splashScreen) {
            splashScreen.setComplete();
        }

        return app;
    } catch (error) {
        console.error('❌ Error in initVoxelWorld:', error);
        throw error;
    }
}
