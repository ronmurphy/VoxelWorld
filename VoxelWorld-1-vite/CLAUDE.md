# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

**📜 For detailed feature implementation history and changelog, see [CHANGELOG.md](CHANGELOG.md)**

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
- **VoxelWorld.js** - Complete 3D voxel world implementation (10,900+ lines - needs refactoring)
- **BiomeWorldGen.js** - Climate-based terrain generation with temperature/moisture maps
- **InventorySystem.js** - Hotbar and backpack management
- **WorkbenchSystem.js** - Workbench UI and crafting logic
- **ToolBenchSystem.js** - Tool crafting system
- **EnhancedGraphics.js** - Optional enhanced texture system
- **GameIntroOverlay.js** - First-time player companion selection screen
- **ChatOverlay.js** - Visual novel-style dialogue system for tutorials and companion interactions
- **CompanionCodex.js** - Pokedex-style companion registry UI
- **main.js** - Legacy Vite template entry point (not used)
- **electron.cjs** - Electron main process configuration

### Key Systems

- **Chunk System**: 8x8 block chunks with configurable render distance
- **Biome Generation**: Climate-based (temperature + moisture) terrain generation
  - Plains (y=3-6), Forest (y=4-10), Desert (y=3-8), Mountains (y=15-30), Tundra (y=4-10)
  - Mega Mountains (y=40-60) - rare super mountains with hollow interiors for dungeons
- **Web Workers**: Background chunk and tree generation with WorkerManager, ChunkWorker, and TreeWorker
  - **TreeWorker**: Dedicated worker for tree placement (off main thread for smooth performance)
  - **ChunkWorker**: Terrain generation + simple LOD trees for distant chunks
  - **WorkerManager**: Orchestrates ChunkWorker → TreeWorker pipeline
- **Caching**: Hybrid RAM (ChunkCache) + Disk (ChunkPersistence/IndexedDB) system
- **Tree System**: Worker-based procedural tree generation (50% reduced density for performance)
  - **Regular trees**: Noise-based placement with 3-block minimum spacing
  - **Ancient/Mega trees**: 5% chunk-exclusive spawn (one special tree per chunk, no other trees)
    - 50/50 split between regular ancient (3x3 trunk) and mega ancient (20-32 blocks tall)
    - Spawn at chunk center for landmark visibility
  - **Dead trees**: 5% spawn in regular chunks with treasure loot
  - **LOD trees**: Simple colored blocks (brown trunk + green canopy) in distant LOD chunks
  - ⚠️ **Known visual mismatch**: LOD trees visible in distance chunks do NOT match actual trees that generate when full chunks load (LOD uses simplified noise, full chunks use TreeWorker with spacing logic)
- **Resource Gathering**: Biome-specific shrubs, ores (iron, gold), and collectibles
- **Billboard System**: Floating emoji sprites (backpack 🎒, ghosts 👻, shrubs 🌿)
- **Christmas Event System** (ChristmasSystem.js): Self-contained holiday features
  - **Douglas Fir Trees**: Year-round 1% spawn (cone-shaped evergreens)
  - **Mega Douglas Fir**: Dec 24-25 only, 0.1% spawn (massive 30-40 block trees)
  - **Gift Boxes**: Random ToolBench item loot from harvesting gift_wrapped blocks
  - **Snow Circles**: 15x15 radius around Mega Firs, melts over 3 in-game days
  - **Companion Alerts**: Proximity notifications at 160 blocks (distant) and 40 blocks (nearby)
  - Date-based activation with `isChristmasTime()` check
- **Crafting**: Workbench (shapes) and ToolBench (tools) with recipe systems
- **Tutorial System**: Visual novel-style companion dialogue with localStorage tracking
  - ChatOverlay.js for sequential messages with character portraits
  - Tutorials: Intro sequence, backpack discovery, machete usage, workbench crafting
  - One-time tutorials tracked in `localStorage.tutorialsSeen`
- **Companion System**: Pokemon-style companion collection and management
  - Starter companion selection (rat, goblin, goblin_grunt)
  - Companion Codex (C key) - Pokedex-style registry with stats and portraits
  - Entity data system (entities.json) with portraits in `/art/entities/`
  - Equipment system: 4 slots per companion (head, body, weapon, accessory)
  - Equippable items (33 total):
    - **Starter items** (easy to find): stick (+1 ATK), wood blocks (+1 DEF), stone (+1 DEF/+2 HP), leaves (+1 SPD), sand (+1 DEF), leaf (+1 SPD)
    - **World discovery**: rustySword (+2 ATK), oldPickaxe (+1 ATK/DEF), ancientAmulet (+2 DEF/+3 HP), skull (+1 ATK), crystal (+1 SPD/DEF), feather (+2 SPD), bone (+1 DEF), fur (+5 HP/+1 DEF), iceShard (+1 ATK/SPD), mushroom (+3 HP), berry (+2 HP), flower (+1 DEF)
    - **Crafted tools**: combat_sword (+4 ATK), mining_pick (+2 ATK/DEF), stone_hammer (+3 ATK/+1 DEF), magic_amulet (+3 DEF/+8 HP/+1 SPD), compass (+1 SPD), compass_upgrade (+2 SPD), speed_boots (+3 SPD), grappling_hook (+2 SPD), machete (+2 ATK)
  - Equipment stored in localStorage, managed through Codex UI
  - Combat stats automatically calculated with equipment bonuses
  - Crafted tools display pixel art icons from `/art/tools/` with ❓ emoji fallback for missing images
- **UI Systems**: Explorer-themed modals with bookmark tab navigation
  - Explorer's Journal (M key) - World map with minimap, pin placement
  - Companion Codex (C key) - Companion registry and active partner selection
  - Explorer's Menu - Time/day cycle display, settings, save/load
  - Bookmark tabs for seamless navigation between Map ↔ Codex
- **Combat System**: Pokemon-style auto-battler with 3D arena battles
  - **BattleArena.js**: 3D arena combat with visual walls and floor
  - **BattleAnimationPatterns.js**: 6 dynamic movement patterns (randomly selected)
  - **CombatantSprite.js**: Billboard sprites with HP bars and pose swapping
  - Turn-based combat with d20 hit rolls, d6 damage, speed-based initiative
  - Player can move within 8x8 arena during battle
  - Item targeting system (aim at companion to use potions/buffs)
  - Dodge/critical/fallback animations based on combat outcomes
  - Context-aware victory dialogue (HP-based companion responses)
  - Equipment bonuses from CompanionCodex integration
- **Mobile Support**: Virtual joysticks with automatic device detection
- **Performance Scaling**: Automatic render distance adjustment
- **LOD System**: ChunkLODManager renders simplified colored chunks beyond render distance
  - `visualDistance = 2` chunks past render distance (reduced from 3 for fog compatibility)
  - LOD chunks show simplified terrain (biome surface colors only)
  - LOD chunks auto-unload when full chunks load in same position
  - Hard fog ends at render distance, so LOD chunks appear through/past fog wall

### Technologies

- **Three.js r180** - 3D rendering engine
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
- **Key 5** - Toggle backpack inventory
- **Q/E** - Navigate hotbar slots
- **E** - Interact (workbench, toolbench)
- **M** - Toggle World Map (Explorer's Journal)
- **C** - Toggle Companion Codex
- **L** - Toggle LOD Debug Overlay (development tool)
- **ESC** - Close modals (workbench, toolbench, backpack)

### Mobile Controls
- **Left Joystick** - Movement
- **Right Joystick** - Look around
- **Touch Hotbar** - Select items

## Current Architecture Issues

### VoxelWorld.js (10,900+ lines - TOO LARGE)

**Still needs extraction:**
- Physics system (collision, movement, gravity)
- BlockTypes definitions and materials
- Player controller (input, camera)
- UI systems (notifications, minimap, mobile joysticks)
- Save/load system
- Main game loop and orchestration
- Combat system (pending - will be extracted to BattleSystem.js)

**Goal:** Reduce to <2000 lines (orchestrator only)

## Important Technical Notes

### Block Type Synchronization
Block type IDs must stay synchronized across:
- `VoxelWorld.js` - BlockTypes definition
- `ChunkWorker.js` - Worker generation
- `ChunkSerializer.js` - Serialization
- `WorkerManager.js` - Deserialization

### THREE.js r180 Compatibility
- THREE.Points particles cause shader errors - avoid using
- Use Billboard sprites (SpriteMaterial) instead for floating elements
- Fresh CanvasTexture instances required for crafted objects (no shared references)

### Pointer Lock Management
- Pointer lock must be released when opening ANY modal (Map, Codex, Chat, Workbench, ToolBench)
- Only re-engage pointer lock when CLOSING modals completely (Close button, ESC key, toggle key)
- DO NOT re-engage when switching between related modals (bookmark tab navigation)
- Chat.js checks for open workbench/toolbench before re-engaging
- Bookmark clicks pass `reEngagePointerLock: false` to `hide()` methods

### Cache Management
Console utilities (exposed via `window.voxelApp`):
- `clearCaches()` - Clear caches but preserve saved games
- `clearAllData()` - Clear localStorage + IndexedDB
- `nuclearClear()` - Nuclear option (wipe everything + hard reload)

### Intentional "Bugs" (Features)
- **Hollow Mountains**: For future dungeon integration
- **Floating Islands**: Rare occurrence, kept as special exploration feature
- **Pillar Trees**: Trees on stone columns - quirky aesthetic kept intentionally
- **Mega Ancient Palm Trees**: Inverted canopy effect in desert - alien monument aesthetic

## Current Priorities (2025-10-09)

### ✅ Recently Completed

1. **Tree Generation Worker Refactor** ✅ (2025-10-09)
   - Moved tree generation to TreeWorker (background thread)
   - Eliminated main thread blocking during chunk loading
   - Smooth 60fps world generation
   - 50% tree density reduction for performance
   - Ancient/mega tree system (5% chunk-exclusive spawns)

2. **Christmas Event System** ✅ (2025-10-09)
   - ChristmasSystem.js with Douglas Fir trees
   - Mega Douglas Fir (Dec 24-25 only, 0.1% spawn)
   - Gift-wrapped blocks with ToolBench loot
   - Snow circles with 3-day melt timer
   - Companion proximity alerts

3. **Advanced 3D Battle System** ✅ (2025-10-09)
   - 6 dynamic animation patterns (Semi-Orbit, Radial Burst, Circle Strafe, Figure-8, Pendulum, Spiral)
   - 8x8 arena boundaries with visual walls
   - Player movement during battle (restricted to arena)
   - Item targeting system (aim at companion to use potions)
   - Dodge/critical/fallback animations
   - Context-aware sprite poses

---

### 🌾 **NEXT PROJECT: Farming & Agriculture System** (Stardew Valley Inspired!)

**Overview:**
Create a comprehensive farming system inspired by Stardew Valley, allowing players to till soil, plant crops, water plants, and harvest for food/crafting materials. This system will integrate with existing crafting, inventory, and potentially add cooking mechanics.

**Phase 1: Basic Farming Mechanics**
1. **Tilled Soil System**:
   - New block type: `tilled_soil` (brown dirt with furrow texture)
   - Tool: Hoe (craft from 2 wood + 1 stick)
   - Right-click grass/dirt with hoe to till into farmland
   - Tilled soil slowly reverts to dirt if not planted (24-hour real-time timer)

2. **Seed Planting**:
   - Seed items: pumpkin_seeds, wheat_seeds, carrot_seeds, berry_seeds
   - Right-click tilled soil with seeds to plant
   - Seeds obtained from harvesting wild crops or purchasing (future NPC system)

3. **Growth Stages**:
   - 4 visual stages: sprout → young → mature → ready_to_harvest
   - Each stage = 10 in-game days (100 minutes real-time)
   - Different crops have different growth rates (wheat: 30 days, pumpkin: 40 days)
   - Use block variants (pumpkin_stage1, pumpkin_stage2, pumpkin_stage3, pumpkin)

4. **Watering System**:
   - Water bucket item (craft from iron blocks)
   - Right-click on planted crop to water (visual: darker soil color)
   - Watered crops grow 2x faster (5 days per stage instead of 10)
   - Water lasts 1 in-game day, then needs re-watering
   - Rain auto-waters all crops (future weather system integration)

5. **Harvesting**:
   - Right-click fully grown crop to harvest
   - Returns crop item (pumpkin, wheat, carrot, berries) + seeds for replanting
   - Crop quantity based on care (watered crops yield 2x, dry crops yield 1x)

**Phase 2: Advanced Features** (After basic farming works)
1. **Scarecrows**: Protect crops from birds (reduces random crop loss)
2. **Fertilizer**: Use compost (dead leaves + dirt) to boost growth speed
3. **Crop Quality**: Perfect/Good/Normal based on watering consistency
4. **Greenhouse**: Indoor farming structure (year-round crops, no seasons)
5. **Irrigation**: Sprinkler systems for auto-watering (craft from iron + gears)

**Phase 3: Animal Farming** (Long-term)
1. **Chickens**: Eggs for cooking
2. **Cows**: Milk for crafting
3. **Sheep**: Wool for textiles
4. **Barns & Coops**: Build shelters, feed animals daily

**Phase 4: Cooking System** (Pairs with farming)
1. **Cooking Station**: Craft from campfire + iron blocks
2. **Recipes**: Combine crops into meals (bread, soup, pie, salad)
3. **Meal Buffs**: Speed boost, jump height, mining efficiency, health regen
4. **Recipe Discovery**: Experimentation unlocks new recipes

**Implementation Files to Create:**
- `src/FarmingSystem.js` - Main farming logic (tilling, planting, growth, harvesting)
- `src/CropGrowthManager.js` - Growth stage tracking, watering timers
- `src/SeedRegistry.js` - Seed types, growth rates, yield data
- Block types: tilled_soil, pumpkin_stage1-3, wheat_stage1-3, carrot_stage1-3, berry_bush_stage1-3
- Tool: hoe (ToolBench recipe)
- Items: various seeds, harvested crops

**Integration Points:**
- InventorySystem.js - Add seed/crop items
- ToolBenchSystem.js - Add hoe recipe (2 wood + 1 stick → hoe)
- VoxelWorld.js - Right-click handlers for hoe (till soil) and seeds (plant)
- BiomeWorldGen.js - Optional: wild crop spawns (wheat in plains, berries in forest)

**User Inspiration:**
- Michelle's request for Stardew-style farming
- Pumpkins already exist in game (perfect first crop!)
- Natural progression: exploration → crafting → farming → cooking

---

### High Priority Features
1. **Greedy Meshing**: Required for ocean biome (10,000 water blocks = 10,000 draw calls currently)
2. **3D Cave Systems**: Perlin worms to carve natural caves in hollow mountains
3. **Ruins Generation**: Not spawning consistently (check BiomeWorldGen spawn rates)

### Medium Priority Bugs
1. **Biome Labeling Bug**: Shows "Plains" when on mountains (height-based detection issue)
2. **Terrain Smoothing**: Reduce "Borg cube" artifacts at chunk boundaries
3. **Drag & Drop Inventory**: Currently only right-click transfer works

### Long-Term Refactoring
1. **Continue VoxelWorld.js Refactoring**: Extract Physics, PlayerController, UI, SaveLoad (reduce from 10,900+ lines to <2000)

### Optional Enhancements
1. **Companion Portrait UI**: Clickable companion portrait near hotbar (show HP, chat access)
2. **Halloween Ghost Following**: Ruin ghosts and night forest ghosts with cumulative spawn chance
3. **Floating Islands**: Add special loot, quest markers, visual effects
4. **Potions & Consumables**: Healing items for battle system (integrate with farming crops)

## Debug Commands

```javascript
// 🎄 Christmas System
testDouglas()      // Spawn regular Douglas Fir at reticle target
testChristmas()    // Spawn Mega Douglas Fir at reticle (with player safety check)

// ⚔️ Combat System
testCombat()                              // Start battle with angry_ghost
testCombat('rat')                         // Start battle with any enemy ID
window.voxelApp.battleArena.isTargetingCompanion()  // Check if aiming at companion
window.voxelApp.battleArena.useItemOnCompanion('potion', 10)  // Heal companion 10 HP

// 👻 Halloween mode
window.voxelApp.debugHalloween = true;    // Enable year-round ghost spawns

// 🗑️ Cache Management
window.voxelApp.clearCaches();    // Clear caches (preserves saves)
window.voxelApp.clearAllData();   // Clear localStorage + IndexedDB
window.voxelApp.nuclearClear();   // Nuclear option (wipe everything + hard reload)

// 🌍 BiomeWorldGen debug
window.voxelApp.worldGen.enableDebugMode();
window.voxelApp.worldGen.getStats();

// 📊 LOD Debug Overlay (also toggled with 'L' key)
window.voxelApp.lodDebugOverlay.toggle();
window.voxelApp.lodDebugOverlay.enabled; // Check status
```

## Development Notes

- Project uses ES modules throughout
- VoxelWorld initializes in fullscreen mode by default
- Performance auto-optimized through chunk culling and device-specific settings
- See CHANGELOG.md for detailed feature implementation history
