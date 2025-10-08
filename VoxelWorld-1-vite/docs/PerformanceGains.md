│ Here is Claude's plan:                                                                                                              │
│ ╭─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮ │
│ │ VoxelWorld Performance Optimization Implementation Guide                                                                        │ │
│ │                                                                                                                                 │ │
│ │ THREE.js InstancedMesh & Object Pooling Migration                                                                               │ │
│ │                                                                                                                                 │ │
│ │ Goal: Implement object pooling and InstancedMesh rendering for 200-500% FPS improvementApproach: Phased implementation, minimal │ │
│ │  refactoring, hybrid rendering systemRestore Point: Latest git commit (synced before starting)                                  │ │
│ │                                                                                                                                 │ │
│ │ ---                                                                                                                             │ │
│ │ 📋 PHASE 1: Object Pooling (EASY - 2-3 hours)                                                                                   │ │
│ │                                                                                                                                 │ │
│ │ What This Does                                                                                                                  │ │
│ │                                                                                                                                 │ │
│ │ Reuses THREE.js geometries and materials instead of creating new ones for every block. Reduces memory usage by ~30% and         │ │
│ │ eliminates garbage collection pauses.                                                                                           │ │
│ │                                                                                                                                 │ │
│ │ Implementation Steps                                                                                                            │ │
│ │                                                                                                                                 │ │
│ │ Step 1.1: Create BlockResourcePool.js                                                                                           │ │
│ │                                                                                                                                 │ │
│ │ File: src/BlockResourcePool.js (NEW)                                                                                            │ │
│ │ Purpose: Central storage for all reusable THREE.js resources                                                                    │ │
│ │                                                                                                                                 │ │
│ │ Contents:                                                                                                                       │ │
│ │ import * as THREE from 'three';                                                                                                 │ │
│ │                                                                                                                                 │ │
│ │ export class BlockResourcePool {                                                                                                │ │
│ │   constructor() {                                                                                                               │ │
│ │     this.geometries = new Map();                                                                                                │ │
│ │     this.materials = new Map();                                                                                                 │ │
│ │     this.initializeResources();                                                                                                 │ │
│ │   }                                                                                                                             │ │
│ │                                                                                                                                 │ │
│ │   initializeResources() {                                                                                                       │ │
│ │     // Geometries (create once, reuse everywhere)                                                                               │ │
│ │     this.geometries.set('cube', new THREE.BoxGeometry(1, 1, 1));                                                                │ │
│ │     this.geometries.set('sphere', new THREE.SphereGeometry(0.5, 16, 16));                                                       │ │
│ │     // ... all other shapes                                                                                                     │ │
│ │                                                                                                                                 │ │
│ │     // Materials (one per block type)                                                                                           │ │
│ │     // Will be populated with actual textures from VoxelWorld                                                                   │ │
│ │   }                                                                                                                             │ │
│ │                                                                                                                                 │ │
│ │   getGeometry(type) { return this.geometries.get(type); }                                                                       │ │
│ │   getMaterial(type) { return this.materials.get(type); }                                                                        │ │
│ │                                                                                                                                 │ │
│ │   // Called by VoxelWorld to register materials with textures                                                                   │ │
│ │   registerMaterial(blockType, material) {                                                                                       │ │
│ │     this.materials.set(blockType, material);                                                                                    │ │
│ │   }                                                                                                                             │ │
│ │ }                                                                                                                               │ │
│ │                                                                                                                                 │ │
│ │ Step 1.2: Initialize Pool in VoxelWorld                                                                                         │ │
│ │                                                                                                                                 │ │
│ │ File: src/VoxelWorld.js (MODIFY)                                                                                                │ │
│ │ Line: ~10 (in constructor, before anything else)                                                                                │ │
│ │                                                                                                                                 │ │
│ │ Changes:                                                                                                                        │ │
│ │ 1. Import: import { BlockResourcePool } from './BlockResourcePool.js';                                                          │ │
│ │ 2. Initialize: this.resourcePool = new BlockResourcePool();                                                                     │ │
│ │ 3. After materials are created (~line 4800), register them:                                                                     │ │
│ │ // After creating this.materials Map                                                                                            │ │
│ │ for (const [blockType, material] of Object.entries(this.materials)) {                                                           │ │
│ │   this.resourcePool.registerMaterial(blockType, material);                                                                      │ │
│ │ }                                                                                                                               │ │
│ │                                                                                                                                 │ │
│ │ Step 1.3: Update addBlock() to Use Pool                                                                                         │ │
│ │                                                                                                                                 │ │
│ │ File: src/VoxelWorld.js                                                                                                         │ │
│ │ Function: addBlock() (around line 130-180)                                                                                      │ │
│ │                                                                                                                                 │ │
│ │ Change from:                                                                                                                    │ │
│ │ const geo = new THREE.BoxGeometry(1, 1, 1);                                                                                     │ │
│ │ const cube = new THREE.Mesh(geo, mat);                                                                                          │ │
│ │                                                                                                                                 │ │
│ │ Change to:                                                                                                                      │ │
│ │ const geo = this.resourcePool.getGeometry('cube');                                                                              │ │
│ │ const cube = new THREE.Mesh(geo, mat);                                                                                          │ │
│ │                                                                                                                                 │ │
│ │ Step 1.4: Update Crafted Objects (ShapeForge)                                                                                   │ │
│ │                                                                                                                                 │ │
│ │ File: src/VoxelWorld.js                                                                                                         │ │
│ │ Function: placeCraftedObject() (around line 200-260)                                                                            │ │
│ │                                                                                                                                 │ │
│ │ Update all geometry creations:                                                                                                  │ │
│ │ - new THREE.BoxGeometry(...) → this.resourcePool.getGeometry('cube')                                                            │ │
│ │ - new THREE.SphereGeometry(...) → this.resourcePool.getGeometry('sphere')                                                       │ │
│ │ - etc.                                                                                                                          │ │
│ │                                                                                                                                 │ │
│ │ Note: ShapeForge creates custom-sized geometries, so we'll keep those as-is for now. Only pool standard 1x1x1 blocks.           │ │
│ │                                                                                                                                 │ │
│ │ Step 1.5: Testing Phase 1                                                                                                       │ │
│ │                                                                                                                                 │ │
│ │ Test Checklist:                                                                                                                 │ │
│ │ - Game loads without errors                                                                                                     │ │
│ │ - Blocks can be placed and removed                                                                                              │ │
│ │ - Trees generate correctly                                                                                                      │ │
│ │ - ShapeForge items still work                                                                                                   │ │
│ │ - Check console for geometry/material errors                                                                                    │ │
│ │ - F12 → Performance → Memory tab: Should see ~20-30% reduction                                                                  │ │
│ │                                                                                                                                 │ │
│ │ Rollback if needed: git reset --hard HEAD                                                                                       │ │
│ │                                                                                                                                 │ │
│ │ ---                                                                                                                             │ │
│ │ 📋 PHASE 2: InstancedMesh for Terrain (MEDIUM - 10-12 hours)                                                                    │ │
│ │                                                                                                                                 │ │
│ │ What This Does                                                                                                                  │ │
│ │                                                                                                                                 │ │
│ │ Renders all naturally-generated blocks using InstancedMesh (1 draw call per block type instead of 1 per block). Typical gain:   │ │
│ │ 5-10x FPS improvement.                                                                                                          │ │
│ │                                                                                                                                 │ │
│ │ Architecture Overview                                                                                                           │ │
│ │                                                                                                                                 │ │
│ │ ┌─────────────────────────────────────┐                                                                                         │ │
│ │ │       VoxelWorld Rendering          │                                                                                         │ │
│ │ ├─────────────────────────────────────┤                                                                                         │ │
│ │ │                                     │                                                                                         │ │
│ │ │  Natural Terrain (99% of blocks)   │                                                                                          │ │
│ │ │  └→ InstancedChunkRenderer.js      │                                                                                          │ │
│ │ │     ├─ ONE InstancedMesh: grass    │                                                                                          │ │
│ │ │     ├─ ONE InstancedMesh: stone    │                                                                                          │ │
│ │ │     ├─ ONE InstancedMesh: sand     │                                                                                          │ │
│ │ │     └─ ... (5 draw calls total)    │                                                                                          │ │
│ │ │                                     │                                                                                         │ │
│ │ │  Player-Placed (1% of blocks)      │                                                                                          │ │
│ │ │  └→ Existing VoxelWorld.addBlock() │                                                                                          │ │
│ │ │     └─ Individual THREE.Mesh       │                                                                                          │ │
│ │ │        (Easy to add/remove)         │                                                                                         │ │
│ │ │                                     │                                                                                         │ │
│ │ │  ShapeForge Objects                 │                                                                                         │ │
│ │ │  └→ Existing system (unchanged)    │                                                                                          │ │
│ │ └─────────────────────────────────────┘                                                                                         │ │
│ │                                                                                                                                 │ │
│ │ Implementation Steps                                                                                                            │ │
│ │                                                                                                                                 │ │
│ │ Step 2.1: Create InstancedChunkRenderer.js                                                                                      │ │
│ │                                                                                                                                 │ │
│ │ File: src/InstancedChunkRenderer.js (NEW ~400 lines)                                                                            │ │
│ │ Purpose: Manages InstancedMesh for all natural terrain blocks                                                                   │ │
│ │                                                                                                                                 │ │
│ │ Key Features:                                                                                                                   │ │
│ │ - One InstancedMesh per block type (grass, stone, dirt, etc.)                                                                   │ │
│ │ - 50,000 instances per type (adjustable)                                                                                        │ │
│ │ - Instance recycling (hide/show instead of create/destroy)                                                                      │ │
│ │ - Chunk-based tracking (unload instances when chunk unloads)                                                                    │ │
│ │ - Per-instance colors for biome variations                                                                                      │ │
│ │                                                                                                                                 │ │
│ │ Core Methods:                                                                                                                   │ │
│ │ class InstancedChunkRenderer {                                                                                                  │ │
│ │   // Create instanced mesh for block type                                                                                       │ │
│ │   createInstancedMesh(blockType, maxInstances = 50000)                                                                          │ │
│ │                                                                                                                                 │ │
│ │   // Add block instance at position                                                                                             │ │
│ │   addInstance(x, y, z, blockType, color = null) → instanceId                                                                    │ │
│ │                                                                                                                                 │ │
│ │   // Remove block instance                                                                                                      │ │
│ │   removeInstance(x, y, z) → boolean                                                                                             │ │
│ │                                                                                                                                 │ │
│ │   // Hide all instances in chunk (when unloading)                                                                               │ │
│ │   hideChunk(chunkX, chunkZ)                                                                                                     │ │
│ │                                                                                                                                 │ │
│ │   // Show all instances in chunk (when loading)                                                                                 │ │
│ │   showChunk(chunkX, chunkZ)                                                                                                     │ │
│ │                                                                                                                                 │ │
│ │   // Update instance color (for biome transitions)                                                                              │ │
│ │   updateInstanceColor(x, y, z, color)                                                                                           │ │
│ │ }                                                                                                                               │ │
│ │                                                                                                                                 │ │
│ │ Step 2.2: Integrate with VoxelWorld Constructor                                                                                 │ │
│ │                                                                                                                                 │ │
│ │ File: src/VoxelWorld.js                                                                                                         │ │
│ │ Location: Constructor (~line 20)                                                                                                │ │
│ │                                                                                                                                 │ │
│ │ Add:                                                                                                                            │ │
│ │ import { InstancedChunkRenderer } from './InstancedChunkRenderer.js';                                                           │ │
│ │                                                                                                                                 │ │
│ │ // In constructor                                                                                                               │ │
│ │ this.instancedRenderer = new InstancedChunkRenderer(                                                                            │ │
│ │   this.scene,                                                                                                                   │ │
│ │   this.resourcePool                                                                                                             │ │
│ │ );                                                                                                                              │ │
│ │                                                                                                                                 │ │
│ │ Step 2.3: Modify generateChunk() in BiomeWorldGen                                                                               │ │
│ │                                                                                                                                 │ │
│ │ File: src/BiomeWorldGen.js                                                                                                      │ │
│ │ Function: generateChunk() (~line 1050-1100)                                                                                     │ │
│ │                                                                                                                                 │ │
│ │ Current code:                                                                                                                   │ │
│ │ // Creates individual blocks                                                                                                    │ │
│ │ voxelWorld.addBlock(worldX, height, worldZ, biome.surfaceBlock, false);                                                         │ │
│ │                                                                                                                                 │ │
│ │ New code:                                                                                                                       │ │
│ │ // Use instanced rendering for natural terrain                                                                                  │ │
│ │ const instanceId = voxelWorld.instancedRenderer.addInstance(                                                                    │ │
│ │   worldX, height, worldZ,                                                                                                       │ │
│ │   biome.surfaceBlock,                                                                                                           │ │
│ │   biome.surfaceColor // Optional per-instance color                                                                             │ │
│ │ );                                                                                                                              │ │
│ │                                                                                                                                 │ │
│ │ // Still track in world data for collision/interaction                                                                          │ │
│ │ voxelWorld.world[`${worldX},${height},${worldZ}`] = {                                                                           │ │
│ │   type: biome.surfaceBlock,                                                                                                     │ │
│ │   playerPlaced: false,                                                                                                          │ │
│ │   instanced: true,        // NEW FLAG                                                                                           │ │
│ │   instanceId: instanceId  // For removal later                                                                                  │ │
│ │ };                                                                                                                              │ │
│ │                                                                                                                                 │ │
│ │ Step 2.4: Update removeBlock() for Hybrid System                                                                                │ │
│ │                                                                                                                                 │ │
│ │ File: src/VoxelWorld.js                                                                                                         │ │
│ │ Function: removeBlock() (~line 600-650)                                                                                         │ │
│ │                                                                                                                                 │ │
│ │ Add instanced block check:                                                                                                      │ │
│ │ removeBlock(x, y, z, giveItem = true) {                                                                                         │ │
│ │   const key = `${x},${y},${z}`;                                                                                                 │ │
│ │   const block = this.world[key];                                                                                                │ │
│ │                                                                                                                                 │ │
│ │   if (!block) return;                                                                                                           │ │
│ │                                                                                                                                 │ │
│ │   // NEW: Handle instanced blocks                                                                                               │ │
│ │   if (block.instanced) {                                                                                                        │ │
│ │     this.instancedRenderer.removeInstance(x, y, z);                                                                             │ │
│ │   }                                                                                                                             │ │
│ │   // Existing: Handle regular mesh blocks                                                                                       │ │
│ │   else if (block.mesh) {                                                                                                        │ │
│ │     this.scene.remove(block.mesh);                                                                                              │ │
│ │     if (block.mesh.geometry) block.mesh.geometry.dispose();                                                                     │ │
│ │   }                                                                                                                             │ │
│ │                                                                                                                                 │ │
│ │   delete this.world[key];                                                                                                       │ │
│ │                                                                                                                                 │ │
│ │   if (giveItem && block.type) {                                                                                                 │ │
│ │     this.addToInventory(block.type, 1);                                                                                         │ │
│ │   }                                                                                                                             │ │
│ │ }                                                                                                                               │ │
│ │                                                                                                                                 │ │
│ │ Step 2.5: Update addBlock() for Player Placement                                                                                │ │
│ │                                                                                                                                 │ │
│ │ File: src/VoxelWorld.js                                                                                                         │ │
│ │ Function: addBlock() (~line 130-180)                                                                                            │ │
│ │                                                                                                                                 │ │
│ │ Keep player-placed blocks using regular mesh:                                                                                   │ │
│ │ addBlock(x, y, z, type, playerPlaced = false, customColor = null) {                                                             │ │
│ │   const key = `${x},${y},${z}`;                                                                                                 │ │
│ │                                                                                                                                 │ │
│ │   // Player-placed blocks use regular mesh (easy to manipulate)                                                                 │ │
│ │   if (playerPlaced) {                                                                                                           │ │
│ │     const geo = this.resourcePool.getGeometry('cube');                                                                          │ │
│ │     const mat = this.resourcePool.getMaterial(type);                                                                            │ │
│ │     const cube = new THREE.Mesh(geo, mat);                                                                                      │ │
│ │     cube.position.set(x, y, z);                                                                                                 │ │
│ │     this.scene.add(cube);                                                                                                       │ │
│ │                                                                                                                                 │ │
│ │     this.world[key] = {                                                                                                         │ │
│ │       type: type,                                                                                                               │ │
│ │       mesh: cube,                                                                                                               │ │
│ │       playerPlaced: true,                                                                                                       │ │
│ │       instanced: false  // Explicitly not instanced                                                                             │ │
│ │     };                                                                                                                          │ │
│ │   }                                                                                                                             │ │
│ │   // Natural terrain uses instanced rendering                                                                                   │ │
│ │   else {                                                                                                                        │ │
│ │     const instanceId = this.instancedRenderer.addInstance(                                                                      │ │
│ │       x, y, z, type, customColor                                                                                                │ │
│ │     );                                                                                                                          │ │
│ │                                                                                                                                 │ │
│ │     this.world[key] = {                                                                                                         │ │
│ │       type: type,                                                                                                               │ │
│ │       playerPlaced: false,                                                                                                      │ │
│ │       instanced: true,                                                                                                          │ │
│ │       instanceId: instanceId                                                                                                    │ │
│ │     };                                                                                                                          │ │
│ │   }                                                                                                                             │ │
│ │ }                                                                                                                               │ │
│ │                                                                                                                                 │ │
│ │ Step 2.6: Handle Chunk Unloading                                                                                                │ │
│ │                                                                                                                                 │ │
│ │ File: src/VoxelWorld.js                                                                                                         │ │
│ │ Function: updateChunks() (~line 5900-5950)                                                                                      │ │
│ │                                                                                                                                 │ │
│ │ Add instance hiding when chunks unload:                                                                                         │ │
│ │ // When removing chunk                                                                                                          │ │
│ │ this.loadedChunks.delete(chunkKey);                                                                                             │ │
│ │                                                                                                                                 │ │
│ │ // NEW: Hide instanced blocks in this chunk                                                                                     │ │
│ │ this.instancedRenderer.hideChunk(chunkX, chunkZ);                                                                               │ │
│ │                                                                                                                                 │ │
│ │ // Existing: Remove regular mesh blocks                                                                                         │ │
│ │ // ... existing cleanup code                                                                                                    │ │
│ │                                                                                                                                 │ │
│ │ Step 2.7: Save/Load Integration                                                                                                 │ │
│ │                                                                                                                                 │ │
│ │ File: src/VoxelWorld.js                                                                                                         │ │
│ │ Functions: saveWorld() and loadWorld() (~line 5964, 6018)                                                                       │ │
│ │                                                                                                                                 │ │
│ │ No changes needed! The playerPlaced flag already distinguishes:                                                                 │ │
│ │ - Natural terrain (instanced, not saved)                                                                                        │ │
│ │ - Player-placed (regular mesh, saved to file)                                                                                   │ │
│ │                                                                                                                                 │ │
│ │ Step 2.8: Testing Phase 2                                                                                                       │ │
│ │                                                                                                                                 │ │
│ │ Test Checklist:                                                                                                                 │ │
│ │ - Generate new world - check FPS improvement (should be 2-5x)                                                                   │ │
│ │ - F12 → Performance → Frames: Check draw calls (should be ~5-10 instead of thousands)                                           │ │
│ │ - Break blocks - should remove from InstancedMesh correctly                                                                     │ │
│ │ - Place blocks - should use regular mesh                                                                                        │ │
│ │ - Save/load game - player blocks should persist                                                                                 │ │
│ │ - Chunk loading/unloading - no memory leaks                                                                                     │ │
│ │ - Biome colors - verify per-instance colors work                                                                                │ │
│ │                                                                                                                                 │ │
│ │ Performance Metrics:                                                                                                            │ │
│ │ - Before: 10,000 blocks = 10,000 draw calls                                                                                     │ │
│ │ - After: 10,000 blocks = 5-10 draw calls (one per block type)                                                                   │ │
│ │                                                                                                                                 │ │
│ │ Rollback if needed: git reset --hard HEAD^ (back to Phase 1)                                                                    │ │
│ │                                                                                                                                 │ │
│ │ ---                                                                                                                             │ │
│ │ 📋 PHASE 3: Advanced Optimizations (OPTIONAL - 6-8 hours)                                                                       │ │
│ │                                                                                                                                 │ │
│ │ Step 3.1: Tree Instancing                                                                                                       │ │
│ │                                                                                                                                 │ │
│ │ File: src/InstancedChunkRenderer.js                                                                                             │ │
│ │ Extend to handle tree trunks and leaves as instanced meshes                                                                     │ │
│ │                                                                                                                                 │ │
│ │ Step 3.2: LOD (Level of Detail)                                                                                                 │ │
│ │                                                                                                                                 │ │
│ │ Show simplified blocks at distance, full detail up close                                                                        │ │
│ │                                                                                                                                 │ │
│ │ Step 3.3: Frustum Culling                                                                                                       │ │
│ │                                                                                                                                 │ │
│ │ Only render instances visible in camera view                                                                                    │ │
│ │                                                                                                                                 │ │
│ │ ---                                                                                                                             │ │
│ │ 🔧 Technical Details                                                                                                            │ │
│ │                                                                                                                                 │ │
│ │ InstancedMesh Capacity Planning                                                                                                 │ │
│ │                                                                                                                                 │ │
│ │ Blocks per chunk: 8 x 8 x 64 (height) = 4,096 blocks                                                                            │ │
│ │ Render distance 3: ~9 chunks visible = 36,864 blocks                                                                            │ │
│ │ Block types: ~5-8 (grass, stone, dirt, sand, wood)                                                                              │ │
│ │                                                                                                                                 │ │
│ │ Max instances per type: 50,000                                                                                                  │ │
│ │ Total instance slots: 50,000 x 8 types = 400,000 blocks                                                                         │ │
│ │ Memory: ~50MB (negligible compared to textures)                                                                                 │ │
│ │                                                                                                                                 │ │
│ │ Performance Expectations                                                                                                        │ │
│ │                                                                                                                                 │ │
│ │ Current System:                                                                                                                 │ │
│ │ - 5,000 blocks visible = 5,000 draw calls = 30-60 FPS                                                                           │ │
│ │                                                                                                                                 │ │
│ │ After Phase 1 (Object Pooling):                                                                                                 │ │
│ │ - 5,000 blocks visible = 5,000 draw calls = 35-65 FPS                                                                           │ │
│ │ - Memory: -30%, less GC pauses                                                                                                  │ │
│ │                                                                                                                                 │ │
│ │ After Phase 2 (InstancedMesh):                                                                                                  │ │
│ │ - 5,000 blocks visible = 5-8 draw calls = 150-300 FPS                                                                           │ │
│ │ - Can increase render distance 2-3x with same FPS                                                                               │ │
│ │                                                                                                                                 │ │
│ │ Compatibility                                                                                                                   │ │
│ │                                                                                                                                 │ │
│ │ - ShapeForge: ✅ Unaffected (uses separate rendering)                                                                            │ │
│ │ - Trees: ⚠️ Phase 2 keeps individual meshes, Phase 3 will optimize                                                              │ │
│ │ - Player blocks: ✅ Unchanged (regular mesh)                                                                                     │ │
│ │ - Save/Load: ✅ Works as-is                                                                                                      │ │
│ │                                                                                                                                 │ │
│ │ ---                                                                                                                             │ │
│ │ 🚨 Troubleshooting Guide                                                                                                        │ │
│ │                                                                                                                                 │ │
│ │ Issue: Blocks not appearing after Phase 2                                                                                       │ │
│ │                                                                                                                                 │ │
│ │ Cause: InstancedMesh matrix not updatedFix: Check mesh.instanceMatrix.needsUpdate = true                                        │ │
│ │                                                                                                                                 │ │
│ │ Issue: FPS worse after changes                                                                                                  │ │
│ │                                                                                                                                 │ │
│ │ Cause: Creating geometries instead of poolingFix: Verify resourcePool.getGeometry() is used everywhere                          │ │
│ │                                                                                                                                 │ │
│ │ Issue: Blocks at wrong position                                                                                                 │ │
│ │                                                                                                                                 │ │
│ │ Cause: Matrix math error in InstancedChunkRendererFix: Verify matrix.setPosition(x, y, z) uses world coords                     │ │
│ │                                                                                                                                 │ │
│ │ Issue: Memory leak                                                                                                              │ │
│ │                                                                                                                                 │ │
│ │ Cause: Instances not hidden when chunks unloadFix: Ensure hideChunk() is called in updateChunks()                               │ │
│ │                                                                                                                                 │ │
│ │ ---                                                                                                                             │ │
│ │ 📊 Implementation Timeline                                                                                                      │ │
│ │                                                                                                                                 │ │
│ │ | Phase                   | Duration    | Risk   | Gain          |                                                              │ │
│ │ |-------------------------|-------------|--------|---------------|                                                              │ │
│ │ | Phase 1: Object Pooling | 2-3 hours   | Low    | +10-20% FPS   |                                                              │ │
│ │ | Phase 2: InstancedMesh  | 10-12 hours | Medium | +200-500% FPS |                                                              │ │
│ │ | Phase 3: Advanced       | 6-8 hours   | Medium | +50-100% FPS  |                                                              │ │
│ │                                                                                                                                 │ │
│ │ Total: 18-23 hours for Phases 1-2Expected Result: 5-10x FPS improvement                                                         │ │
│ │                                                                                                                                 │ │
│ │ ---                                                                                                                             │ │
│ │ ✅ Success Criteria                                                                                                              │ │
│ │                                                                                                                                 │ │
│ │ Phase 1 Complete:                                                                                                               │ │
│ │ - No new THREE.BoxGeometry() calls in hot paths                                                                                 │ │
│ │ - Memory usage down 20-30%                                                                                                      │ │
│ │ - All existing features work                                                                                                    │ │
│ │                                                                                                                                 │ │
│ │ Phase 2 Complete:                                                                                                               │ │
│ │ - Draw calls reduced from 10,000+ to ~5-10                                                                                      │ │
│ │ - FPS increased 3-5x with same render distance                                                                                  │ │
│ │ - Player blocks work normally                                                                                                   │ │
│ │ - Save/load works correctly                                                                                                     │ │
│ │                                                                                                                                 │ │
│ │ Final Success:                                                                                                                  │ │
│ │ - Can render 50,000+ blocks at 60+ FPS                                                                                          │ │
│ │ - Can increase render distance 2-3x                                                                                             │ │
│ │ - Memory usage stable                                                                                                           │ │
│ │ - No gameplay bugs                                                                                                              │ │
│ │                                                                                                                                 │ │
│ │ ---                                                                                                                             │ │
│ │ 📝 Notes                                                                                                                        │ │
│ │                                                                                                                                 │ │
│ │ - ShapeForge custom objects: Left unchanged, they're rare and don't affect performance                                          │ │
│ │ - Tree optimization: Deferred to Phase 3, not urgent                                                                            │ │
│ │ - Biome color variations: Handled via setColorAt() per instance                                                                 │ │
│ │ - Rollback strategy: Git commits after each phase                                                                               │ │
│ │ - Testing: Test thoroughly after each phase before proceeding                                                                   │ │
│ │                                                                                                                                 │ │
│ │ ---                                                                                                                             │ │
│ │ Ready to begin Phase 1?                                                                                                         │ │
│ ╰─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯ │
│                                                                                                                                     │
│ Would you like to proceed? 