# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VoxelWorld-1-vite is a 3D voxel-based world building game built with JavaScript, Three.js, and Vite. The application supports both web and Electron desktop deployment with mobile touch controls.

## Build Commands

- `npm run dev` - Start development server (Vite)
- `npm run build` - Build for web production
- `npm run preview` - Preview production build
- `npm run electron` - Run Electron app (requires build first)
- `npm run electron-dev` - Run Electron in development mode with hot reload
- `npm run build-web` - Build for web deployment with specific base path
- `npm run build-electron-win` - Build Windows Electron executable
- `npm run build-electron-linux` - Build Linux Electron executable
- `npm run build-electron-mac` - Build macOS Electron executable
- `npm run build-all` - Build Electron executables for all platforms

## Architecture

### Core Components

- **App.js** - Main entry point that handles mode switching between game and workbench
- **VoxelWorld.js** - Complete 3D voxel world implementation with:
  - Procedural terrain generation using seeded random
  - Chunk-based world loading/unloading
  - Biome system (forest, desert, mountain, plains, tundra)
  - Day/night cycle with dynamic lighting
  - Mobile touch controls with virtual joysticks
  - Save/load system using localStorage
  - Performance benchmarking system
- **main.js** - Legacy Vite template entry point (not used)
- **electron.cjs** - Electron main process configuration

### Key Features

- **Chunk System**: 8x8 block chunks with configurable render distance
- **Biome Generation**: Height-based terrain with biome-specific materials and colors
- **Resource Gathering**: Shrub spawning system with biome-specific spawn rates
- **Billboard System**: Floating emoji sprites for collectibles (backpack 🎒, shrubs 🌿)
- **Discovery-Based Progression**: Backpack must be found to unlock inventory system
- **Inventory Management**: 5x5 backpack grid with slide-down UI animation
- **Tool-Based Harvesting**: Minecraft-style punch-to-harvest with tool efficiency
- **Mobile Support**: Automatic device detection with virtual joysticks
- **Performance Scaling**: Automatic render distance adjustment based on device performance
- **Material System**: Procedural textures for different block types with normal/player-placed variants

### Technologies

- **Three.js** - 3D rendering engine
- **Vite** - Build tool and development server
- **Electron** - Desktop application wrapper
- **Capacitor** - Mobile app framework (configured but not actively used)

## Game Controls

### Keyboard Controls
- **WASD** - Movement
- **Space** - Jump
- **Mouse** - Look around (requires pointer lock)
- **Left Click** - Hold to harvest blocks (tool-based efficiency)
- **Right Click** - Place blocks from inventory
- **Keys 1-4** - Select hotbar slots
- **Key 5** - Toggle backpack inventory (releases/captures mouse pointer)
- **Q/E** - Navigate hotbar slots

### Mobile Controls
- **Left Joystick** - Movement
- **Right Joystick** - Look around
- **Touch Hotbar** - Select items

### Game Progression
1. **Find the Backpack** - Red dot on minimap shows location
2. **Harvest Resources** - Different tools have different efficiency
3. **Manage Inventory** - 4-slot hotbar + 25-slot backpack storage
4. **Tool Requirements** - Some blocks require specific tools (iron needs iron/stone tools)

## Development Notes

The project uses ES modules throughout. The main application initializes VoxelWorld in fullscreen mode by default. A workbench mode is planned but not yet implemented (ShapeForgeWorkbench.js).

The VoxelWorld class is fully self-contained with its own event handlers, save system, and UI elements. Performance is automatically optimized through chunk culling and device-specific render distance settings.

### Recent Updates
- Billboard system for collectibles with floating animations
- Tool-based harvesting with efficiency calculations
- Backpack discovery system with random loot generation
- Keyboard hotbar selection with visual feedback
- Pointer lock management for inventory interaction
- **Workbench System**: Interactive workbench modal with material selection, shape builder, and 3D preview area
- **Full Inventory Management**: Right-click transfers between hotbar and backpack storage
- **Item Placement/Harvesting**: Items properly removed from inventory when placed, harvestable back
- **Smart Notifications**: Enhanced notification system with icons and auto-dismiss
- **Proximity Interaction**: Press E near workbench to open crafting interface
- **Dead Trees**: Rare treasure trees (5% spawn rate) that drop dead_wood + exotic wood from other biomes
- **Specific Wood Types**: Replaced legacy 'wood' with oak_wood, pine_wood, birch_wood, palm_wood, dead_wood
- **Campfire Recipe**: Crafted from 3x any wood type, creates glowing light source (particles disabled due to THREE.js r180 compatibility)

### Latest Session - Dead Trees, Wood Types, and Campfire System
1. **Dead Trees with Treasure Loot**:
   - 5% spawn chance in any biome during tree generation
   - 1-3 blocks tall with 1-2 withered dead_wood-leaves
   - Drops treasure loot: 2-4 dead_wood + optional exotic wood from other biomes + optional stone
   - Integrated with tree registry and harvesting system

2. **Specific Wood Types Throughout Codebase**:
   - Replaced all legacy 'wood' references with specific types (oak_wood, pine_wood, birch_wood, palm_wood, dead_wood)
   - Fixed backpack loot generation to give random wood type instead of generic 'wood'
   - Updated workbench recipes to accept any wood type with flexible material matching

3. **Campfire Crafting System**:
   - Recipe: 3x any wood type → campfire with glow effect
   - Creates cylinder mesh with orange/red emissive material
   - THREE.PointLight provides warm flickering glow (1.5 intensity, 10 unit range)
   - **Fire particles disabled**: THREE.Points particle system caused shader errors in THREE.js r180
   - Effect metadata stored in crafted items for future extensibility

4. **THREE.js r180 Compatibility Issues Identified**:
   - THREE.Points particles cause "can't access property 'elements' of undefined" shader error
   - Error originates from `refreshTransformUniform` in THREE.js render pipeline
   - Particles disabled in campfire but glow light works perfectly
   - Billboard system (enhanced PNG textures) works fine - not the cause of shader errors

### ✅ COMPLETED: Advanced Workbench System
1. **3D Preview System**: Fully functional 3D shape preview with orbit controls
   - Fixed recipe shape extraction from `recipe.shapes[0].type`
   - Fixed renderer sizing issues (0x0 → proper container dimensions)
   - Fixed JavaScript crashes in THREE.js getSize() calls
   - Interactive 3D preview with mouse drag/zoom/pan controls

2. **Smart Material Filtering**: Dynamic recipe filtering based on material selection
   - Visual selection indicators (golden borders) for selected materials
   - Recipe book filters to show only craftable items with selected materials
   - Reset button to clear selections and show all recipes
   - Multi-material selection support with Set-based state management

3. **Complete Recipe System**: Full recipe book with basic shapes and complex structures
   - Basic shapes: Cube, Sphere, Cylinder, Pyramid, Stairs, Wall, Hollow Cube
   - Complex structures: Castle Wall, Tower Turret, Simple House
   - Material requirements system with inventory integration
   - Shape size scaling based on available material quantities

### Next Session TODO

### 🚀 PRIORITY: Performance Optimization with Web Workers & Caching (NEW!)

**Background Context:**
- Object pooling optimization improved render distance: 1 → 2
- Electron desktop wrapper improved render distance: 2 → 3
- At render distance 3, Electron version is playable but jerky due to chunk generation blocking main thread
- Friend suggested Web Workers for background chunk generation to eliminate stuttering

**Implementation Plan:**

1. **Web Worker Chunk Generation** (HIGH PRIORITY):
   - Create `ChunkWorker.js` to handle background terrain generation
   - Move `BiomeWorldGen` noise calculations to worker thread
   - Generate raw vertex data (positions, normals, UVs, indices) in worker
   - Use **transferable objects** (ArrayBuffer) for zero-copy data transfer
   - Main thread creates THREE.Mesh from worker-generated vertex data
   - Expected result: Smooth gameplay at render distance 3-4+ without frame drops

   **Key Architecture:**
   ```javascript
   // Worker generates raw geometry data
   Worker: BiomeWorldGen → vertices/indices (Float32Array/Uint16Array)
   Worker → Main: postMessage(data, [transferable buffers])
   Main: Receives data → Creates THREE.BufferGeometry → Adds to scene
   ```

2. **Hybrid RAM + Disk Chunk Caching** (HIGH PRIORITY):
   - Implement `CacheChunk.js` template (already created in repo)
   - **RAM Cache**: LRU eviction with 256 chunk limit, instant access for active chunks
   - **Disk Cache**:
     - **Electron**: Use `fs.promises` for async file I/O to `userData/chunks/`
     - **Web**: Use IndexedDB for browser persistence
   - **Block Data Format**: Use `Uint8Array` (1 byte per block) instead of JSON objects
   - **Lazy Persistence**: Only write dirty chunks to disk when evicted from RAM
   - **Three-tier loading**: RAM → Disk → Generate (worker)
   - Expected result: Instant world loading on subsequent sessions, massive memory savings

   **Key Benefits:**
   - Compact binary format saves 90%+ memory vs JSON
   - Pre-generated chunks load from disk in milliseconds
   - LRU cache keeps frequently accessed chunks hot
   - Transferable objects enable zero-copy between worker and main thread

3. **Integration Strategy**:
   - Phase 1: Implement Web Worker chunk generation (eliminates stuttering)
   - Phase 2: Add RAM cache with LRU eviction
   - Phase 3: Add disk persistence (Electron fs.promises, Web IndexedDB)
   - Phase 4: Test and tune cache sizes and render distance limits

**Technical Research Needed:**
- THREE.js BufferGeometry creation from worker-generated vertex data
- Transferable object patterns for ArrayBuffer/TypedArray
- fs.promises best practices for Electron chunk caching
- IndexedDB patterns for browser chunk persistence

---

1. **Complete Workbench Crafting System** (MEDIUM PRIORITY - deferred):
   - **Craft Button**: Add "Craft" button to workbench that consumes materials and creates the crafted object
   - **Inventory Integration**: Place crafted items into player inventory (hotbar or backpack)
   - **Material Consumption**: Subtract required materials from inventory when crafting
   - **Error Handling**: Check if player has enough materials before allowing craft
   - **Crafted Item Types**: Create new item types for crafted objects (e.g., "wooden_cube", "stone_tower")

2. **Enhanced Inventory Management** (HIGH PRIORITY):
   - **Drag & Drop**: Implement drag-and-drop between backpack and hotbar slots
   - **Right-Click Transfer**: Already exists but needs refinement for crafted items
   - **Item Stacking**: Allow multiple of same item type in single slot (show count)
   - **Hotbar Integration**: Ensure crafted items can be selected and placed in world
   - **Visual Updates**: Real-time inventory UI updates when items are moved/consumed

3. **3D Object Placement System** (HIGH PRIORITY):
   - **Crafted Item Placement**: Allow placing crafted 3D objects in the voxel world
   - **Object Collision**: Crafted objects should have proper collision detection
   - **Object Harvesting**: Allow breaking placed crafted objects to get materials back
   - **Object Storage**: Save/load placed 3D objects with world data
   - **Object Interaction**: Different interaction methods for complex objects vs simple blocks

### Implementation Plan for Crafting:

```javascript
// Workbench crafting flow:
1. Player selects material (wood) → Visual feedback
2. Player selects recipe (cube) → 3D preview shows
3. Player clicks "Craft" button → Check materials
4. If sufficient materials → Consume materials, create item
5. Add "wooden_cube" to inventory → Update hotbar/backpack UI
6. Player can select crafted item from hotbar
7. Player can place "wooden_cube" in world as 3D object
```

### Technical Approach:

**Crafted Item System:**
- Extend inventory to support crafted object types
- Add item metadata (material, shape, size) to track crafted properties
- Create placement system that handles both blocks and 3D objects
- Implement object-specific collision volumes and interaction

**Inventory Enhancements:**
- Add item categories (blocks, tools, crafted_objects)
- Implement item transferring with proper validation
- Add visual indicators for different item types
- Support item metadata display in tooltips

4. **Code Architecture Refactoring** (CRITICAL PRIORITY):
   **VoxelWorld.js has grown too large and needs logical separation into modular files**

   Current issues:
   - Single file approaching 4000+ lines
   - Multiple responsibilities mixed together
   - Difficult to maintain and debug
   - Poor separation of concerns

   **Refactoring Plan:**
   - **Physics.js**: Extract collision system, movement, gravity, and physics utilities
   - **BlockTypes.js**: Extract block definitions, properties, material systems
   - **WorldGeneration.js**: Extract chunk system, biome generation, terrain generation
   - **PlayerController.js**: Extract player movement, input handling, camera controls
   - **InventorySystem.js**: Extract backpack, hotbar, item management
   - **SaveLoadSystem.js**: Extract save/load with LocalStorage → IndexedDB migration for large worlds
   - **UI.js**: Extract notifications, minimap, status bar, mobile joysticks
   - **Workbench.js**: Extract workbench modal and crafting system
   - Keep VoxelWorld.js as main orchestrator class

   **Implementation Strategy:**
   1. **Create modular ES6 classes** with clear interfaces
   2. **Use dependency injection** - pass VoxelWorld instance to modules that need it
   3. **Maintain existing API** - no breaking changes to external interfaces
   4. **Extract incrementally** - one module at a time to avoid breaking everything
   5. **Add proper imports/exports** for clean module boundaries

   **Example Structure:**
   ```javascript
   // Physics.js
   export class PhysicsEngine {
     constructor(voxelWorld) { this.world = voxelWorld; }
     checkCollision(position, hitbox) { /* ... */ }
     updateMovement(player, deltaTime) { /* ... */ }
   }

   // VoxelWorld.js (orchestrator)
   import { PhysicsEngine } from './Physics.js';
   import { WorldGenerator } from './WorldGeneration.js';

   class VoxelWorld {
     constructor(container) {
       this.physics = new PhysicsEngine(this);
       this.worldGen = new WorldGenerator(this);
       // ...
     }
   }
   ```

   **Benefits:**
   - **Maintainable**: Each file has single responsibility
   - **Testable**: Modules can be tested independently
   - **Debuggable**: Easier to locate and fix issues
   - **Scalable**: New features can be added as separate modules
   - **Reusable**: Modules can be reused in other projects

3. **Collision System Refinement** (OPTIONAL):
   - Current hitbox system still allows clipping through multi-block structures
   - Consider swept AABB or continuous collision detection for better accuracy
   - May need to implement collision response with proper separation resolution

4. **UI Updates for Item Transfers**:
   - Emoji icons don't update when items move between hotbar/backpack
   - Need real-time visual feedback for inventory changes
   - Ensure correct items are displayed after transfers

### Future Feature Ideas

#### **Core Gameplay Enhancements**
- **Block Variants**: Add stone bricks, wooden planks, glass, metal blocks for building variety
- **Multi-Block Structures**: Doors, windows, stairs, slabs for detailed construction
- **Water/Liquid System**: Flowing water, lakes, rivers with realistic physics
- **Lighting System**: Torches, lanterns, dynamic shadows, proper day/night lighting
- **Weather**: Rain, snow, fog effects that affect visibility and gameplay
- **Sound System**: Ambient sounds, block placement/breaking sounds, footsteps, music

#### **Advanced Crafting & Progression**
- **Recipe Discovery**: Unlock recipes by finding/combining materials
- **Tool Durability**: Tools wear out and need repair/replacement
- **Advanced Workbench**: Multi-step recipes, furnaces for smelting
- **Automation**: Conveyor belts, automated mining, item sorters
- **Redstone-like System**: Wires, switches, logic gates for contraptions

#### **World Features**
- **Caves & Dungeons**: Underground exploration with rare materials
- **Structures**: Villages, ruins, towers with loot and NPCs
- **Biome-Specific Resources**: Unique materials only found in certain biomes
- **Vertical World**: Much taller worlds with sky islands and deep caverns
- **World Borders**: Defined playable area with visual boundaries

#### **Technical Improvements**
- **Save/Load Optimization**: Compress world data, faster loading
- **Multiplayer Foundation**: Client-server architecture for future multiplayer
- **Mod System**: Plugin architecture for custom blocks/items/features
- **Performance**: Level-of-detail for distant chunks, occlusion culling
- **Mobile Optimization**: Better touch controls, UI scaling, performance

#### **Player Experience**
- **Minecraft-Compatible Avatars**: Support MC skin format (64x64 PNG textures)
  - Players provide skin URL (only store URL, fetch on load)
  - Standard Steve/Alex box model with Three.js geometry
  - Animated arms/legs for walking, tool swinging
  - Familiar avatar system for instant personalization
- **Material Icons for Tools**: Replace emoji with Google Material Icons
  - Better scaling and recognition for tool indicators
  - Professional look: ⛏️ pickaxe, 🔨 hammer, ⚒️ engineering tools
  - Consistent UI design with scalable vector graphics

#### **Quality of Life**
- **Creative Mode**: Unlimited resources, flying, instant block placement
- **Spectator Mode**: Fly through blocks, observe without interaction
- **Screenshots**: Built-in screenshot system with metadata
- **World Export**: Export builds as 3D models or images
- **Undo System**: Ctrl+Z for recent block changes
- **Copy/Paste**: Select and duplicate sections of builds



### ✅ COMPLETED: Advanced BiomeWorldGen System

**🌍 BiomeWorldGen.js - Complete Terrain Generation Overhaul**

Successfully implemented and debugged an advanced multi-layer biome generation system with comprehensive safety measures and performance optimizations.

#### Key Features Implemented:

1. **🛡️ Terrain Safety System**:
   - MINIMUM_GROUND_LEVEL (-1) prevents players from falling through terrain
   - Emergency ground fill for problematic height calculations
   - Comprehensive biome object validation
   - Safe biome variant height modifications with bounds checking

2. **🌊 Advanced Noise System**:
   - Multi-octave noise with 5 octaves for detailed terrain
   - Fine-tuned noise parameters (scale: 0.012, persistence: 0.65)
   - Clamped noise values to prevent out-of-range calculations
   - Enhanced noise patterns for natural terrain variation

3. **🗺️ Sophisticated Biome Transitions**:
   - Voronoi-like biome cells with 90-block territories
   - Smooth 25-50% transition zones between biomes
   - Natural boundary noise for organic biome edges
   - Gradient color blending across biome boundaries
   - Height interpolation for seamless elevation changes

4. **🎨 Enhanced Biome Variants**:
   - Multiple variants per biome (dense_forest, rocky_desert, oasis, etc.)
   - Dynamic property modifications (tree density, shrub chance, surface blocks)
   - Safe height range enforcement for all variants
   - Biome-specific tree clustering and distribution

5. **📊 Production-Ready Logging**:
   - Debug mode flag (DEBUG_MODE = false for production)
   - Statistical tracking without verbose logging
   - Reduced log frequency (every 10th chunk, 128th block)
   - Emergency alerts for critical issues only
   - Performance monitoring with chunk generation stats

6. **🔧 Debug & Control Methods**:
   - `enableDebugMode()` / `disableDebugMode()` for development
   - `getStats()` for performance monitoring
   - `resetStats()` for clean testing sessions
   - Statistical summaries every 20 chunks

#### Technical Improvements:

- **Height Calculation**: Robust height generation with multiple safety checks
- **Biome Validation**: Ensures all biomes have valid minHeight/maxHeight properties
- **Transition Algorithm**: Mathematically sound biome blending with distance-based interpolation
- **Performance**: Optimized logging reduces console spam by 90%
- **Safety**: Multiple failsafes prevent terrain generation failures

#### Resolution of Critical Issues:

✅ **Fall-Through Bug Fixed**: Players can no longer fall through terrain in any biome
✅ **Biome Transitions Working**: Smooth gradients between all biome types
✅ **Height Validation Complete**: All terrain generates within safe bounds
✅ **Performance Optimized**: Reduced logging overhead for production use
✅ **Enhanced Noise Patterns**: More natural and varied terrain generation

The BiomeWorldGen system is now production-ready with advanced features while maintaining rock-solid stability and performance.
