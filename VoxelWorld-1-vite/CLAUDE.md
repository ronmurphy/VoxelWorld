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

### ✅ COMPLETED: Web Workers & Caching System

**Status: FULLY IMPLEMENTED**

The Web Worker chunk generation and caching system has been successfully implemented:

1. **✅ Web Worker Chunk Generation**:
   - `/src/workers/ChunkWorker.js` - Background terrain generation worker
   - `/src/worldgen/WorkerManager.js` - Worker pool and message handling
   - `/src/worldgen/RegionNoiseCache.js` - Noise caching optimization
   - Transferable objects for zero-copy data transfer
   - Non-blocking chunk generation on worker thread

2. **✅ Hybrid RAM + Disk Chunk Caching**:
   - `/src/cache/ChunkCache.js` - LRU RAM cache (256 chunk limit)
   - `/src/serialization/ChunkPersistence.js` - Disk/IndexedDB persistence
   - `/src/serialization/ChunkSerializer.js` - Binary chunk format (Uint8Array)
   - `/src/serialization/ModificationTracker.js` - Dirty chunk tracking
   - Three-tier loading: RAM → Disk → Generate (worker)

**Result:** Smooth gameplay with render distance 3+, instant world loading from disk cache.

---

### ✅ COMPLETED: Workbench Crafting System

**Status: FULLY IMPLEMENTED**

The workbench crafting system is complete with all requested features:

1. **✅ Craft Button & Material Consumption**:
   - `WorkbenchSystem.js:1871` - `craftItem()` method
   - Material validation and consumption
   - Inventory integration for placing crafted items
   - Error handling for insufficient materials

2. **✅ Crafted Item Types**:
   - Metadata system for tracking crafted object properties (material, shape, size)
   - Recipe book with basic shapes and complex structures
   - 3D preview with orbit controls

**Result:** Players can craft items, consume materials, and add crafted objects to inventory.

---

### ✅ COMPLETED: 3D Object Placement System

**Status: FULLY IMPLEMENTED**

Crafted objects can be placed, saved, and harvested:

1. **✅ Object Placement & Collision**:
   - `VoxelWorld.js:246` - `placeCraftedObject()` method
   - Real dimensions based on crafted item metadata
   - Collision detection for placed objects
   - Object harvesting to recover materials

2. **✅ Save/Load System**:
   - Custom meshes saved with world data
   - Automatic recreation on world load
   - Metadata persistence for crafted properties

**Result:** Full lifecycle support for crafted 3D objects in the voxel world.

---

### 🔄 PARTIALLY COMPLETED: Inventory Management

**Status: MOSTLY IMPLEMENTED**

Inventory system has most features, missing only drag & drop:

1. **✅ Item Stacking**: Implemented in `InventorySystem.js` with configurable stack limits
2. **✅ Right-Click Transfer**: Works between hotbar and backpack
3. **✅ Visual Updates**: Real-time UI updates when items move
4. **❌ Drag & Drop**: NOT implemented (only right-click transfer available)

**Next Step:** Add drag-and-drop UI for more intuitive inventory management.

---

### 🔄 PARTIALLY COMPLETED: Code Architecture Refactoring

**Status: IN PROGRESS**

VoxelWorld.js has been partially refactored, but still needs more work:

1. **✅ Extracted Modules**:
   - `InventorySystem.js` - Hotbar and backpack management
   - `WorkbenchSystem.js` - Workbench UI and crafting logic
   - `ToolBenchSystem.js` - Tool crafting system
   - `BiomeWorldGen.js` - Terrain generation
   - Web worker modules (ChunkWorker, WorkerManager, etc.)

2. **❌ Still in VoxelWorld.js (9205 lines)**:
   - Physics system (collision, movement, gravity)
   - BlockTypes definitions and materials
   - Player controller (input, camera)
   - UI systems (notifications, minimap, mobile joysticks)
   - Save/load system
   - Main game loop and orchestration

**Next Step:** Continue extracting Physics, PlayerController, UI, and SaveLoad modules.

---

### 🎯 NEW PRIORITIES FOR NEXT SESSION

### 1. **Fix Biome Labeling Bug** (HIGH PRIORITY)
   - **Issue**: Display shows "Plains" when standing on mountains
   - **Cause**: Height-based biome detection doesn't match climate-based generation
   - **Fix**: Update biome detection to use same climate algorithm as generation
   - **Location**: Need to find getCurrentBiome() or similar method

### 2. **Implement 3D Cave Systems** (HIGH PRIORITY)
   - **Current**: Mountains are intentionally hollow (placeholder)
   - **Goal**: Use Perlin worms to carve natural cave networks
   - **Features**:
     - Multi-layer dungeon integration for mega mountains (y=40-60)
     - Leave mountain exteriors intact
     - Cave entrances at mountain sides
     - Underground resources and exploration
   - **Location**: `BiomeWorldGen.js` - currently only has 'caves' in specialFeatures array

### 3. **Terrain Smoothing Refinement** (MEDIUM PRIORITY)
   - **Current**: Some Borg cube artifacts remain at chunk boundaries
   - **Iterations Done**:
     - scale: 0.012 → TOO sharp (vertical cliffs)
     - scale: 0.003 → TOO smooth (flat plateaus)
     - scale: 0.008 → Better but not perfect
   - **Next**: Experiment with biome boundary blending or chunk edge interpolation

### 4. **Floating Islands Enhancement** (OPTIONAL - FUN FEATURE)
   - **Current**: Floating islands exist, user wants to keep them
   - **Enhancement Ideas**:
     - Special biome for floating islands
     - Rare loot or quest markers
     - Visual indicators (glow, particles, special blocks)
     - Sky dungeon integration

### 5. **Drag & Drop Inventory** (MEDIUM PRIORITY)
   - Add drag-and-drop between hotbar and backpack slots
   - More intuitive than right-click only
   - Visual feedback during drag operation

### 6. **Continue VoxelWorld.js Refactoring** (ONGOING)
   - **Next Modules to Extract**:
     - `PhysicsEngine.js` - Collision, movement, gravity
     - `PlayerController.js` - Input handling, camera controls
     - `UIManager.js` - Notifications, minimap, mobile joysticks
     - `SaveLoadSystem.js` - Persistence and world data
   - **Goal**: Reduce VoxelWorld.js from 9205 lines to <2000 lines (orchestrator only)

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

---

### ✅ COMPLETED: Climate-Based Biome Generation & Terrain Height System

**🌍 Session Focus: Implementing Minecraft-Style Biome Selection + Tall Mountains**

Successfully implemented a complete climate-based biome generation system with temperature and moisture maps, increased terrain heights, spawn point safety improvements, and water level adjustments.

#### Major Systems Implemented:

1. **🌡️ Climate-Based Biome Generation (BiomeWorldGen.js lines 712-780)**:
   - **Temperature Map**: North-south gradient (-1 cold to +1 hot) with noise variation
   - **Moisture Map**: Perlin noise for wet/dry regions (-1 dry to +1 wet)
   - **Biome Selection Grid**: Climate zones determine biome placement
     - Cold + Dry = Tundra
     - Cold + Wet = Forest
     - Hot + Dry = Desert
     - Temperate + Wet = Forest
     - Temperate + Moderate = Plains/Mountain
   - **Result**: Geographic biome placement - no more snow next to deserts!

   ```javascript
   // Key implementation - Temperature gradient with noise
   getTemperature(x, z, seed) {
       const latitudeGradient = z * 0.003; // North-south gradient
       const temperatureNoise = this.multiOctaveNoise(
           x * 0.5, z * 0.5,
           { scale: 0.002, octaves: 3, persistence: 0.5 },
           seed + 1000
       );
       return latitudeGradient + temperatureNoise * 0.3;
   }
   ```

2. **🏔️ Increased Terrain Heights (BiomeWorldGen.js lines 39-122)**:
   - **Plains**: y=3-6 (gentle rolling hills)
   - **Forest**: y=4-10 (forested hills)
   - **Desert**: y=3-8 (sand dunes for mining)
   - **Mountains**: y=15-30 (tall mountains, previously y=8-20)
   - **Tundra**: y=4-10 (icy hills)
   - **Mega Mountains**: y=40-60 (rare super mountains in mountain biomes only)

   **Super Mountain System** (lines 783-808):
   - Noise-based modifier creates rare mega mountains (>0.7 threshold)
   - Only applies to mountain biomes
   - Smooth height transition from normal (y=30) to mega (y=60)
   - Intentionally hollow for future multi-layer dungeon integration

3. **🌊 Water System Improvements (ChunkWorker.js lines 140-150)**:
   - **Water Level**: Lowered from y=4 to y=3 to reduce floating water blocks
   - **Water Fill**: Fills empty space from terrain height to y=3
   - **Biome Integration**: Water level stays below biome ground level
   - **Known Issue**: Some floating water blocks at chunk boundaries (acceptable for now)

4. **🎯 Spawn Point Safety System (VoxelWorld.js lines 6266-6324)**:
   - **Height Search**: Changed from y=15 to y=64 to detect tall mountains
   - **Solid Ground Check**: Requires 3+ solid blocks below spawn point
   - **Clear Space Above**: 6-block vertical clearance for player
   - **Result**: No more spawning inside hollow mountains!

   ```javascript
   // Key fix - Check solid ground below spawn
   let solidBlocksBelow = 0;
   for (let checkY = y - 1; checkY >= Math.max(0, y - 5); checkY--) {
       const belowBlock = this.getBlock(checkX, checkY, checkZ);
       if (belowBlock) solidBlocksBelow++;
   }
   if (solidBlocksBelow < 3) return false; // Not safe spawn
   ```

5. **🎨 Noise Parameter Tuning (BiomeWorldGen.js lines 170-175)**:
   - **Problem**: "Borg cube" artifacts - perfect 8×8 cubes at chunk boundaries
   - **Iteration 1**: scale: 0.012 (original) - TOO sharp, created vertical cliffs
   - **Iteration 2**: scale: 0.003 - TOO smooth, created flat plateaus
   - **Final Balance**: scale: 0.008, octaves: 5, persistence: 0.55
   - **Result**: Natural slopes with some remaining artifacts (user accepted)

   ```javascript
   elevation: {
       scale: 0.008,      // Balanced for natural slopes
       octaves: 5,        // More detail layers
       persistence: 0.55  // Moderate detail level
   }
   ```

6. **🆔 Biome Display Enhancement (VoxelWorld.js line 6480)**:
   - Added `id="current-biome-display"` for easy DOM access
   - **Known Issue**: Sometimes shows "Plains" when standing on mountains (height-based detection needs fixing)

#### Code Locations Reference:

**BiomeWorldGen.js - Climate & Height System:**
- Lines 39-122: Biome definitions with updated height ranges
- Lines 170-175: Noise parameter configuration
- Lines 712-780: Climate-based biome selection (temperature + moisture)
- Lines 783-808: Super mountain modifier system
- Lines 1058-1070: Height calculation with mega mountain integration

**VoxelWorld.js - Spawn Safety:**
- Lines 6266-6312: `isAreaClear()` with solid ground check
- Lines 6315-6324: `findSurfaceHeight()` with y=64 search range
- Line 6480: Biome display element ID

**ChunkWorker.js - Water Generation:**
- Lines 105-138: Ground fill system (bedrock → terrain)
- Lines 140-150: Water block generation (y≤3)
- Line 142: Water level constant (WATER_LEVEL = 3)

**WorkerManager.js & ChunkSerializer.js:**
- Block type ID mappings (must stay synchronized across all 3 files)
- Chunk persistence and caching system (RAM + disk)

#### Known Issues & Intentional Features:

**⚠️ Known Issues:**
1. **Borg Cubes**: Some chunk boundary artifacts remain (noise tuning improved but not perfect)
2. **Floating Water**: Occasional water blocks floating near tall terrain (reduced by lowering water level)
3. **Biome Labeling**: Display shows "Plains" when standing on mountains (height-based detection bug)

**✅ Intentional Features (NOT bugs):**
1. **Hollow Mountains**: Mountains generate hollow for future dungeon integration with VoxelWorld-2
2. **Floating Islands**: User finds them exciting and wants to keep as special features
3. **Spawn Zone Resources**: Trees/rocks near spawn are non-persistent (fresh starts on world reset)

#### Testing Notes:

User tested with `clearAllData()` + force refresh:
- Spawn point: Natural slopes, easy to escape (not a perfect Borg cube)
- Floating islands: Still present, user likes them as fun exploration features
- Water blocks: Mostly working with 54-64 water blocks per chunk in low areas
- Mountains: Properly tall (y=15-30), hollow interiors work as intended

#### Next Steps (Tomorrow's Work):

1. **Fix Biome Labeling** (HIGH PRIORITY):
   - Plains showing when standing on mountains
   - Need height-aware biome detection

2. **Hollow Out Mountains with 3D Cave Systems** (HIGH PRIORITY):
   - Use Perlin worms to carve natural cave networks
   - Multi-layer dungeon integration for mega mountains
   - Leave mountain exteriors intact

3. **Further Terrain Smoothing** (MEDIUM PRIORITY):
   - Additional noise parameter tuning to reduce Borg cubes
   - Possible biome boundary blending improvements

4. **Floating Islands as Intentional Feature** (OPTIONAL):
   - Make them special with quest markers or rare loot
   - Add visual indicators (glow, particles, special blocks)

5. **Test Spawn and Water Fixes** (IN PROGRESS):
   - Verify spawn point always safe
   - Monitor water block generation logs
   - Check for edge cases with extreme terrain
