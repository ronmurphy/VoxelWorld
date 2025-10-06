# VoxelWorld-1 Changelog

Detailed history of features, fixes, and improvements.

---

## 2025-10-05 Evening - Halloween Ghost Billboards & Pumpkin System

**Status: FULLY IMPLEMENTED**

### 🎃 Pumpkin Spawn System Fixes

**Bug Fixed:**
- **Noise Range Issue**: `multiOctaveNoise` returns `-1 to 1`, but pumpkin spawn check expected `0 to 1`
- **Old Rates**: 1.5% normal (actually 0.75%), 6% Halloween (actually 3%)
- **Fix**: Added noise normalization: `(pumpkinNoise + 1) / 2`
- **New Rates**: 3% normal, 15% on Halloween (Oct 31st)

**Code Location:**
- BiomeWorldGen.js:1256-1274 - Pumpkin spawn logic with fixed noise normalization

**Result:** Pumpkins are now **4x easier to find** (3% vs old buggy 0.75%)!

### 👻 Halloween Ghost Billboard System

**Features:**
1. **Oct 31st Only**: Ghost billboards only spawn on October 31st (or with debug mode)
2. **One Per Chunk**: First pumpkin in each chunk gets a floating ghost above it
3. **Floating Animation**: Ghosts bob up and down slowly (floatSpeed: 1.5, floatAmount: 0.2)
4. **Auto-Remove**: When ANY pumpkin in the chunk is harvested, the ghost disappears
5. **Transparent PNG Support**: Uses THREE.SpriteMaterial with proper alpha transparency

**Implementation:**
- VoxelWorld.js:68-69 - Ghost billboard tracking Map and debug flag
- VoxelWorld.js:276-302 - Auto-spawn ghost on first pumpkin per chunk
- VoxelWorld.js:741-787 - `createGhostBillboard()` function
- VoxelWorld.js:813-827 - Ghost animation in `animateBillboards()`
- VoxelWorld.js:1114-1133 - Remove ghost when pumpkin harvested
- App.js:47-51 - Expose `window['voxelApp']` for debugging

**Debug Command:**
```javascript
window.voxelApp.debugHalloween = true;
window.voxelApp.clearCaches();
```

---

## 2025-10-05 - Ancient Trees & Pillar Trees

**Status: FULLY IMPLEMENTED**

### 🌳 Ancient Tree System

**1. Regular Ancient Trees (15% spawn chance)**:
- **Thick 3x3 trunk** (9 blocks per layer vs normal 1x1)
- **Height**: 10-15 blocks tall (vs normal 5-8 blocks)
- **Large canopy**: 7x7 base for oak/birch/palm, conical radius-5 for pine
- **Biome-specific wood**: oak_wood, pine_wood, birch_wood, palm_wood
- **Massive loot**: ~117 wood blocks + 100+ leaf blocks when harvested
- **Code**: VoxelWorld.js:7609-7696

**2. Mega Ancient Trees (5% of ancient spawns = 1% overall)**:
- **Cone-shaped base**: 5x5 → 3x3 → 1x1 (8-13 blocks tall base)
- **Single trunk above**: 12-19 blocks tall
- **Total height**: 20-32 blocks (TWICE as tall as regular ancient!)
- **Massive canopy**: 11x11 base for oak/birch, radius-7 conical for pine
- **Visual landmark**: Visible from far away due to extreme height
- **Code**: VoxelWorld.js:7641-7676

**3. Spawn Logic** (VoxelWorld.js:7247-7254):
- 20% of all trees become ancient trees
- Top 25% of those (5% overall) become mega ancient
- Uses seeded noise for consistent placement
- Works with all biome tree types

### 🏛️ Pillar Trees (Quirky Bug Turned Feature)

**Origin Story:**
- Stone pillars were generated under trees to prevent floating appearance
- Created weird elevated trees on stone columns
- Bug was so aesthetically interesting we kept it as an intentional feature!

**Detection System** (VoxelWorld.js:7852-7879):
- Detects isolated stone/iron/sand columns (≤2 solid neighbors)
- Preserves stone pillar instead of converting to dirt
- Creates unique ancient ruins aesthetic

### 🏛️🌴 Mega Ancient Palm Trees (Another Happy Bug!)

**Origin Story:**
- Palm tree frond fix caused mega ancient palms to generate with inverted canopies
- Created bizarre alien monument structures in the desert
- Bug was so visually striking we kept it as an intentional feature!

**Visual Characteristics:**
- Massive 5x5 → 3x3 → 1x1 cone-shaped base
- 20-32 blocks tall
- Inverted tiered canopy (looks like alien architecture)
- Extremely rare (1% overall spawn rate)
- Desert biome landmarks

**Code Location:**
- VoxelWorld.js:7847-7890 - `generateMassiveCanopy()` creates the inverted effect
- **Intentionally NOT fixed** - unique aesthetic kept as feature

### 🐛 Bug Fixes

**Inverted Palm Tree Bug** (VoxelWorld.js:7493):
- **Problem**: Extended fronds placed at `topY - 1` (hanging down into ground)
- **Fix**: Changed to `topY` for proper horizontal extension
- **Result**: Palm fronds now extend outward correctly

---

## 2025-10-05 - Tree Generation System Overhaul

**Status: FULLY IMPLEMENTED**

### 🐛 Six Critical Bugs Fixed

1. **Tree Density Multipliers Too Low** (BiomeWorldGen.js:1285-1295):
   - **Problem**: Multipliers were reduced from 2-12 down to 0.03-0.20, making trees virtually impossible to spawn
   - **Fix**: Doubled all multipliers back to proper values
     - Forest: 0.15 → 16 (100x increase!)
     - Plains: 0.08 → 20 (250x increase!)
     - Mountains: 0.12 → 20
     - Desert: 0.03 → 4
     - Tundra: 0.05 → 6

2. **Tree Placement Height Search Too Low** (VoxelWorld.js:7204):
   - **Problem**: Surface search only checked up to y=15, but mountains go to y=30 (mega mountains y=60!)
   - **Fix**: Extended search range from y=15 → y=64
   - Added check for 'air' blocks to properly detect surface

3. **Tree Save/Load Scan Range Too Low** (VoxelWorld.js:7718):
   - **Problem**: When unloading chunks, only scanned y=1-20 for tree trunks
   - **Fix**: Extended scan range from y=20 → y=65 for tree trunk detection

4. **Chunk Unload Cleanup Range Too Low** (VoxelWorld.js:7764):
   - **Problem**: Only removed blocks up to y=20 when unloading chunks
   - **Fix**: Extended cleanup range from y=20 → y=70 to remove ALL tree blocks

5. **Implemented Chunk-Based Tree Counter System** (BiomeWorldGen.js:33-41, 1023-1048, 1206-1248):
   - **Solution**: Added guaranteed minimum tree density system
   - **Guaranteed Tree Intervals**:
     - Forest: 1 tree per chunk (every chunk gets a tree!)
     - Plains: 1 tree per 3 chunks (~35 trees in 105-chunk walk)
     - Mountains: 1 tree per 2 chunks
     - Desert: 1 tree per 5 chunks (sparse)
     - Tundra: 1 tree per 4 chunks

6. **Fixed Variable Redeclaration Bug** (BiomeWorldGen.js:1299):
   - **Problem**: `centerX`, `centerZ`, `chunkBiome` declared twice in same scope
   - **Fix**: Removed duplicate declaration, reused variables from chunk counter logic

### 🌳 How the Dual Tree System Works

The new system uses TWO complementary methods:

1. **Noise-Based Trees** (Enhanced):
   - Random, natural placement using Perlin noise
   - 2x more likely to spawn than before
   - Creates organic, varied tree clusters
   - Respects biome-specific multipliers

2. **Guaranteed Trees** (New):
   - Forces 1 tree in chunk center every N chunks (based on biome)
   - Ensures minimum coverage even if noise check fails
   - Skips spacing restrictions to ensure placement
   - Tracks per-biome counters for proper distribution

---

## 2025-10-04 Evening - Gold Ore, Compass System, and Adventurer's Menu Redesign

**Status: FULLY IMPLEMENTED**

### Gold Ore Implementation

- Added `gold` block type with texture support (`gold-sides.png`)
- Spawns every 13 blocks underground (rarer than iron's every 7 blocks)
- Base harvest time: 3500ms (harder than iron's 3000ms)
- Stone hammer efficiency: 0.6 (2100ms harvest time)
- 12% drop chance with stone hammer (vs iron's 15%)
- Requires stone_hammer or iron tool to harvest
- Gold ore has golden color (0xFFD700)
- Block type ID: 9

### Iron Ore Texture Support

- Added `iron-sides.png` texture support
- Fixed bug where stone hammer couldn't harvest iron (checked for 'stone' instead of 'stone_hammer')
- Iron ore now properly textured with multi-face block system

### Compass Recipe Overhaul

- Basic Compass: Changed from 3 iron + 1 stick → **3 gold + 1 stick**
- Makes compass more valuable and end-game worthy
- Gold is rarer resource, appropriate for navigation tool
- Crystal Compass upgrade still uses compass + 2 crystals

### Cache Management Utilities (VoxelWorld.js:5705-5859)

- **clearAllData()** - Original function (clears localStorage + IndexedDB)
- **clearCaches()** - NEW! Cache-only clear that preserves saved games
  - Clears sessionStorage, RAM cache, BiomeWorldGen cache, Web Worker cache
  - Deletes ChunkPersistence database (terrain cache)
  - Clears performance benchmarks and tutorial flags
  - **Preserves NebulaWorld localStorage** (saved game data)
- **nuclearClear()** - Nuclear option (wipes EVERYTHING)
  - Clears all storage, all caches, all memory
  - Hard reload with cache bypass

### 🎨 Adventurer's Menu Redesign (VoxelWorld.js:9306-9644)

- Complete visual overhaul matching Adventurer's Journal aesthetic
- **Parchment Theme**: Brown leather gradients, golden corner decorations, Georgia serif font
- **Tabbed Interface**: 3 organized tabs
  - 🌍 World: Save/Load/New Game/Delete Save
  - ⚙️ Settings: Render Distance, GPU Mode, Benchmark
  - 🎨 Graphics: Enhanced Graphics toggle
- **Better Organization**: Grouped related settings, clear section headers
- **Visual Polish**: Hover effects, active tab highlighting, smooth transitions

---

## Earlier - Textured Crafted Objects with Subtle Color Tinting

**Status: FULLY IMPLEMENTED**

Successfully fixed textured crafted objects that were causing THREE.js r180 shader errors:

1. **Fixed Material Array Handling** (VoxelWorld.js:319-360):
   - Discovered `this.materials[material]` returns array of 6 materials (cube faces)
   - Extract first material with `Array.isArray()` check
   - Prevents JavaScript `.map` method confusion with THREE.js texture map

2. **Fresh Texture Creation**:
   - Create new `CanvasTexture` for each crafted object instead of reusing shared references
   - Proper texture configuration (NearestFilter, mipmaps, anisotropy)
   - Eliminates `uvundefined` shader errors caused by shared texture instances

3. **Subtle Color Tinting** (VoxelWorld.js:345-348):
   - Interpolate selected color 70% toward white (30% tint, 70% texture visibility)
   - Uses `tintColor.clone().lerp(white, 0.7)` for lighter tint
   - Textures now clearly visible with subtle color overlay
   - Adjustable tint strength for future ArtBench feature

4. **MeshBasicMaterial Usage**:
   - Switched from MeshLambertMaterial to MeshBasicMaterial for crafted objects
   - Simpler shader without lighting calculations
   - More stable with fresh texture instances

---

## Earlier - Dead Trees, Wood Types, and Campfire System

### Dead Trees with Treasure Loot

- 5% spawn chance in any biome during tree generation
- 1-3 blocks tall with 1-2 withered dead_wood-leaves
- Drops treasure loot: 2-4 dead_wood + optional exotic wood from other biomes + optional stone
- Integrated with tree registry and harvesting system

### Specific Wood Types Throughout Codebase

- Replaced all legacy 'wood' references with specific types (oak_wood, pine_wood, birch_wood, palm_wood, dead_wood)
- Fixed backpack loot generation to give random wood type instead of generic 'wood'
- Updated workbench recipes to accept any wood type with flexible material matching

### Campfire Crafting System

- Recipe: 3x any wood type → campfire with glow effect
- Creates cylinder mesh with orange/red emissive material
- THREE.PointLight provides warm flickering glow (1.5 intensity, 10 unit range)
- **Fire particles disabled**: THREE.Points particle system caused shader errors in THREE.js r180
- Effect metadata stored in crafted items for future extensibility

---

## Earlier - Advanced Workbench System

### 3D Preview System
- Fully functional 3D shape preview with orbit controls
- Fixed recipe shape extraction from `recipe.shapes[0].type`
- Fixed renderer sizing issues (0x0 → proper container dimensions)
- Fixed JavaScript crashes in THREE.js getSize() calls
- Interactive 3D preview with mouse drag/zoom/pan controls

### Smart Material Filtering
- Dynamic recipe filtering based on material selection
- Visual selection indicators (golden borders) for selected materials
- Recipe book filters to show only craftable items with selected materials
- Reset button to clear selections and show all recipes
- Multi-material selection support with Set-based state management

### Complete Recipe System
- Basic shapes: Cube, Sphere, Cylinder, Pyramid, Stairs, Wall, Hollow Cube
- Complex structures: Castle Wall, Tower Turret, Simple House
- Material requirements system with inventory integration
- Shape size scaling based on available material quantities

---

## Earlier - Web Workers & Caching System

**Status: FULLY IMPLEMENTED**

### Web Worker Chunk Generation
- `/src/workers/ChunkWorker.js` - Background terrain generation worker
- `/src/worldgen/WorkerManager.js` - Worker pool and message handling
- `/src/worldgen/RegionNoiseCache.js` - Noise caching optimization
- Transferable objects for zero-copy data transfer
- Non-blocking chunk generation on worker thread

### Hybrid RAM + Disk Chunk Caching
- `/src/cache/ChunkCache.js` - LRU RAM cache (256 chunk limit)
- `/src/serialization/ChunkPersistence.js` - Disk/IndexedDB persistence
- `/src/serialization/ChunkSerializer.js` - Binary chunk format (Uint8Array)
- `/src/serialization/ModificationTracker.js` - Dirty chunk tracking
- Three-tier loading: RAM → Disk → Generate (worker)

**Result:** Smooth gameplay with render distance 3+, instant world loading from disk cache.

---

## Earlier - Workbench Crafting System

**Status: FULLY IMPLEMENTED**

### Craft Button & Material Consumption
- `WorkbenchSystem.js:1871` - `craftItem()` method
- Material validation and consumption
- Inventory integration for placing crafted items
- Error handling for insufficient materials

### Crafted Item Types
- Metadata system for tracking crafted object properties (material, shape, size)
- Recipe book with basic shapes and complex structures
- 3D preview with orbit controls

**Result:** Players can craft items, consume materials, and add crafted objects to inventory.

---

## Earlier - 3D Object Placement System

**Status: FULLY IMPLEMENTED**

### Object Placement & Collision
- `VoxelWorld.js:246` - `placeCraftedObject()` method
- Real dimensions based on crafted item metadata
- Collision detection for placed objects
- Object harvesting to recover materials

### Save/Load System
- Custom meshes saved with world data
- Automatic recreation on world load
- Metadata persistence for crafted properties

**Result:** Full lifecycle support for crafted 3D objects in the voxel world.

---

## Earlier - Climate-Based Biome Generation & Terrain Height System

**Status: FULLY IMPLEMENTED**

### Climate-Based Biome Generation (BiomeWorldGen.js lines 712-780)

- **Temperature Map**: North-south gradient (-1 cold to +1 hot) with noise variation
- **Moisture Map**: Perlin noise for wet/dry regions (-1 dry to +1 wet)
- **Biome Selection Grid**: Climate zones determine biome placement
  - Cold + Dry = Tundra
  - Cold + Wet = Forest
  - Hot + Dry = Desert
  - Temperate + Wet = Forest
  - Temperate + Moderate = Plains/Mountain
- **Result**: Geographic biome placement - no more snow next to deserts!

### Increased Terrain Heights (BiomeWorldGen.js lines 39-122)

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

### Water System Improvements (ChunkWorker.js lines 140-150)

- **Water Level**: Lowered from y=4 to y=3 to reduce floating water blocks
- **Water Fill**: Fills empty space from terrain height to y=3
- **Biome Integration**: Water level stays below biome ground level

### Spawn Point Safety System (VoxelWorld.js lines 6266-6324)

- **Height Search**: Changed from y=15 to y=64 to detect tall mountains
- **Solid Ground Check**: Requires 3+ solid blocks below spawn point
- **Clear Space Above**: 6-block vertical clearance for player
- **Result**: No more spawning inside hollow mountains!

### Noise Parameter Tuning (BiomeWorldGen.js lines 170-175)

- **Problem**: "Borg cube" artifacts - perfect 8×8 cubes at chunk boundaries
- **Iteration 1**: scale: 0.012 (original) - TOO sharp, created vertical cliffs
- **Iteration 2**: scale: 0.003 - TOO smooth, created flat plateaus
- **Final Balance**: scale: 0.008, octaves: 5, persistence: 0.55
- **Result**: Natural slopes with some remaining artifacts (user accepted)

---

## Earlier - Advanced BiomeWorldGen System

**Status: FULLY IMPLEMENTED**

### Terrain Safety System

- MINIMUM_GROUND_LEVEL (-1) prevents players from falling through terrain
- Emergency ground fill for problematic height calculations
- Comprehensive biome object validation
- Safe biome variant height modifications with bounds checking

### Advanced Noise System

- Multi-octave noise with 5 octaves for detailed terrain
- Fine-tuned noise parameters (scale: 0.012, persistence: 0.65)
- Clamped noise values to prevent out-of-range calculations
- Enhanced noise patterns for natural terrain variation

### Sophisticated Biome Transitions

- Voronoi-like biome cells with 90-block territories
- Smooth 25-50% transition zones between biomes
- Natural boundary noise for organic biome edges
- Gradient color blending across biome boundaries
- Height interpolation for seamless elevation changes

### Enhanced Biome Variants

- Multiple variants per biome (dense_forest, rocky_desert, oasis, etc.)
- Dynamic property modifications (tree density, shrub chance, surface blocks)
- Safe height range enforcement for all variants
- Biome-specific tree clustering and distribution

### Production-Ready Logging

- Debug mode flag (DEBUG_MODE = false for production)
- Statistical tracking without verbose logging
- Reduced log frequency (every 10th chunk, 128th block)
- Emergency alerts for critical issues only
- Performance monitoring with chunk generation stats

### Debug & Control Methods

- `enableDebugMode()` / `disableDebugMode()` for development
- `getStats()` for performance monitoring
- `resetStats()` for clean testing sessions
- Statistical summaries every 20 chunks

---

## Future Ideas & Requests

### 🌾 Farming & Agriculture System (Michelle's Request - Stardew Valley Inspired!)

**Prerequisites:** Fix pumpkin generation first!

**Basic Farming Mechanics:**
- **Tilled Soil**: Use tool to till grass/dirt into farmland
- **Seed Planting**: Plant pumpkin seeds, wheat, carrots, etc.
- **Growth Stages**: Visual progression from sprout → full grown
- **Watering System**: Water bucket or rain mechanics
- **Seasons**: Different crops for different times (if we add seasons)
- **Harvest**: Right-click fully grown crops to harvest

**Crop Ideas:**
- Pumpkins 🎃 (already have the block!)
- Wheat 🌾 (craft bread, feed animals)
- Carrots 🥕 (food, animal feed)
- Berries 🫐 (quick snack, crafting)
- Flowers 🌸 (decorative, bee farming?)

**Advanced Features:**
- **Scarecrows**: Protect crops from birds/pests
- **Greenhouse**: Indoor farming (year-round crops)
- **Crop Quality**: Perfect/Good/Normal based on care
- **Fertilizer**: Use compost to boost growth/quality
- **Irrigation**: Auto-watering with sprinkler systems

**Animal Farming (Stardew-style):**
- **Chickens** 🐔: Eggs for cooking
- **Cows** 🐄: Milk for crafting
- **Sheep** 🐑: Wool for textiles
- **Barns & Coops**: Build shelters for animals
- **Animal Care**: Feed daily, collect products

**Cooking System:**
- Craft **Cooking Station** from campfire upgrade
- Combine ingredients into meals (bread, soup, pie)
- Meals provide buffs (speed, jump height, mining efficiency)
- Recipe discovery through experimentation

---

### Core Gameplay Enhancements

- **Block Variants**: Add stone bricks, wooden planks, glass, metal blocks for building variety
- **Multi-Block Structures**: Doors, windows, stairs, slabs for detailed construction
- **Water/Liquid System**: Flowing water, lakes, rivers with realistic physics
- **Lighting System**: Torches, lanterns, dynamic shadows, proper day/night lighting
- **Weather**: Rain, snow, fog effects that affect visibility and gameplay
- **Sound System**: Ambient sounds, block placement/breaking sounds, footsteps, music

### Advanced Crafting & Progression

- **Recipe Discovery**: Unlock recipes by finding/combining materials
- **Tool Durability**: Tools wear out and need repair/replacement
- **Advanced Workbench**: Multi-step recipes, furnaces for smelting
- **Automation**: Conveyor belts, automated mining, item sorters
- **Redstone-like System**: Wires, switches, logic gates for contraptions

### World Features

- **Caves & Dungeons**: Underground exploration with rare materials
- **Structures**: Villages, ruins, towers with loot and NPCs
- **Biome-Specific Resources**: Unique materials only found in certain biomes
- **Vertical World**: Much taller worlds with sky islands and deep caverns
- **World Borders**: Defined playable area with visual boundaries

### Technical Improvements

- **Save/Load Optimization**: Compress world data, faster loading
- **Multiplayer Foundation**: Client-server architecture for future multiplayer
- **Mod System**: Plugin architecture for custom blocks/items/features
- **Performance**: Level-of-detail for distant chunks, occlusion culling
- **Mobile Optimization**: Better touch controls, UI scaling, performance

### Player Experience

- **Minecraft-Compatible Avatars**: Support MC skin format (64x64 PNG textures)
  - Players provide skin URL (only store URL, fetch on load)
  - Standard Steve/Alex box model with Three.js geometry
  - Animated arms/legs for walking, tool swinging
  - Familiar avatar system for instant personalization
- **Material Icons for Tools**: Replace emoji with Google Material Icons
  - Better scaling and recognition for tool indicators
  - Professional look: ⛏️ pickaxe, 🔨 hammer, ⚒️ engineering tools
  - Consistent UI design with scalable vector graphics

### Quality of Life

- **Creative Mode**: Unlimited resources, flying, instant block placement
- **Spectator Mode**: Fly through blocks, observe without interaction
- **Screenshots**: Built-in screenshot system with metadata
- **World Export**: Export builds as 3D models or images
- **Undo System**: Ctrl+Z for recent block changes
- **Copy/Paste**: Select and duplicate sections of builds
