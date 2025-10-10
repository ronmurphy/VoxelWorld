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
  - **PlayerHP.js**: 3-heart health system with damage/defeat mechanics
  - Turn-based combat with d20 hit rolls, d6 damage, speed-based initiative
  - Player can move within 8x8 arena during battle
  - Player can enter danger zone (red walls) at risk of damage from enemy collision
  - Item targeting system (aim at companion to use potions/buffs)
  - Dodge/critical/fallback animations based on combat outcomes
  - Context-aware victory dialogue (HP-based companion responses)
  - Equipment bonuses from CompanionCodex integration
  - Player defeat respawns at campfire (or world spawn) with 1 heart
- **Campfire Respawn System**: Save point system using crafted pyramids
  - Craft any wood pyramid in ShapeForge, name it "Campfire"
  - Placing campfire saves respawn point to localStorage
  - Pattern detection: checks for 'campfire', 'Campfire', or '_campfire' suffix
  - Status notification shows "🔥 Game saved! Respawn point updated!"
  - Player respawns at campfire (+2 blocks offset) when defeated in battle
  - Campfire data persists across sessions, cleared by cleanup functions
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

### 🌾 **CURRENT PROJECT: Farming & Agriculture System** (In Progress - 2025-10-09)

**Status: Core Implementation Complete! ✅**

**Implemented Features:**
1. **✅ Tilled Soil System**:
   - Hoe tool crafted from 2 wood + 1 stick (ToolBench)
   - Right-click grass/dirt with hoe to till into farmland
   - Tilled soil reverts to dirt if not planted within 24 in-game days

2. **✅ Seed System**:
   - Seed items: wheat_seeds, carrot_seeds, pumpkin_seeds, berry_seeds
   - Seeds obtained from:
     - Grass blocks: 10% chance wheat_seeds, 8% chance carrot_seeds
     - Pumpkins: Always drop pumpkin_seeds
     - Shrubs: Always drop berry_seeds (re-enabled in TreeWorker)
   - Right-click tilled soil with seeds to plant

3. **✅ Crop Growth Stages**:
   - 3 visual stages per crop: sprout → young → mature
   - Growth rates:
     - Wheat/Carrot: 10 in-game days per stage (30 days total)
     - Pumpkin: 15 in-game days per stage (45 days total)
     - Berry Bush: 12 in-game days per stage (36 days total)
   - Watered crops grow 2x faster
   - Real-time growth tracking with CropGrowthManager

4. **✅ Harvesting System**:
   - Right-click fully grown crop to harvest
   - Returns crop item + seeds for replanting
   - Yield multiplier: Watered crops yield 2x items

**Implementation Files:**
- `src/FarmingSystem.js` - Main farming logic (tilling, planting, harvesting)
- `src/FarmingBlockTypes.js` - Block type definitions for farming
- `src/CropGrowthManager.js` - Growth stage tracking, watering timers
- `src/ToolBenchSystem.js` - Hoe recipe added
- `src/workers/TreeWorker.js` - Shrubs re-enabled for berry seeds
- `src/VoxelWorld.js` - Integrated farming right-click handlers, seed drops, day tracking

**How to Use:**
1. Harvest grass blocks to get wheat/carrot seeds
2. Craft hoe at ToolBench (2 wood + 1 stick)
3. Right-click grass/dirt with hoe to till soil
4. Right-click tilled soil with seeds to plant
5. Wait for crops to grow (check back each in-game day!)
6. Left-click (harvest) mature crops to collect food + seeds

**Next Steps (Phase 2 - Future):**
- Water bucket item for manual watering
- Scarecrows to protect crops
- Fertilizer system (compost)
- Crop quality tiers
- Greenhouse structures
- Irrigation/sprinkler systems

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
2. **Pumpkin Ghost Attraction**: Jack-o'-lantern ghost magnet mechanic
   - Holding pumpkin in hotbar → nearby ghosts follow player peacefully
   - Placing pumpkin → ghosts orbit around placed pumpkin
   - Removing pumpkin → ghosts wander back to original spawn zones
   - Proximity detection (~20 block radius), lerp follow AI, circle orbit animation
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
