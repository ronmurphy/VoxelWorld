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
- **Web Workers**: Background chunk generation with WorkerManager and ChunkWorker
- **Caching**: Hybrid RAM (ChunkCache) + Disk (ChunkPersistence/IndexedDB) system
- **Tree System**: Dual noise-based + guaranteed placement for consistent density
  - Ancient trees (20% spawn) with 3x3 trunks and large canopies
  - Mega ancient trees (5% of ancient) with 20-32 block height
  - Dead trees (5% spawn) with treasure loot
- **Resource Gathering**: Biome-specific shrubs, ores (iron, gold), and collectibles
- **Billboard System**: Floating emoji sprites (backpack 🎒, ghosts 👻, shrubs 🌿)
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
- **Combat System**: Pokemon-style auto-battler (in development)
  - Turn-based battles with companion monsters
  - Ruin encounters and wandering enemies
  - Battle interface integration pending
- **Mobile Support**: Virtual joysticks with automatic device detection
- **Performance Scaling**: Automatic render distance adjustment

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

## Current Priorities (2025-10-06)

### Critical Features
1. **Auto-Battler Combat System**: Pokemon-style companion battles (NEXT PRIORITY)
   - Battle UI overlay when encountering enemies
   - Turn-based combat with companion stats (HP, Attack, Defense, Speed)
   - Player commands (Fight, Items, Switch, Run)
   - Victory/defeat outcomes with rewards/consequences

### High Priority Features
1. **Greedy Meshing**: Required for ocean biome (10,000 water blocks = 10,000 draw calls currently)
2. **3D Cave Systems**: Perlin worms to carve natural caves in hollow mountains
3. **Ruins Generation**: Not spawning consistently (check BiomeWorldGen spawn rates)

### Medium Priority Bugs
1. **Player Hitbox Too Wide**: Needs 2-block gap instead of 1, can walk into blocks
2. **Biome Labeling Bug**: Shows "Plains" when on mountains (height-based detection issue)
3. **Terrain Smoothing**: Reduce "Borg cube" artifacts at chunk boundaries
4. **Drag & Drop Inventory**: Currently only right-click transfer works

### Long-Term Refactoring
1. **Continue VoxelWorld.js Refactoring**: Extract Physics, PlayerController, UI, SaveLoad (reduce from 10,900+ lines to <2000)

### Optional Enhancements
1. **Companion Portrait UI**: Clickable companion portrait near hotbar
   - Click to open chat with active companion
   - Re-read tutorials, get hints, friendly interactions
   - Show HP/status during battles
2. **Halloween Ghost Following**: Ruin ghosts and night forest ghosts with cumulative spawn chance
3. **Floating Islands**: Add special loot, quest markers, visual effects
4. **Farming System**: Stardew Valley-inspired agriculture (see CHANGELOG.md)

## Debug Commands

```javascript
// Enable Halloween mode year-round
window.voxelApp.debugHalloween = true;

// Clear caches (preserves saves)
window.voxelApp.clearCaches();

// Nuclear clear (wipe everything)
window.voxelApp.nuclearClear();

// BiomeWorldGen debug mode
window.voxelApp.worldGen.enableDebugMode();
window.voxelApp.worldGen.getStats();
```

## Development Notes

- Project uses ES modules throughout
- VoxelWorld initializes in fullscreen mode by default
- Performance auto-optimized through chunk culling and device-specific settings
- See CHANGELOG.md for detailed feature implementation history
