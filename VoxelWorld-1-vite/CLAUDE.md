# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

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
- **VoxelWorld.js** - Complete 3D voxel world implementation (9200+ lines - needs refactoring)
- **BiomeWorldGen.js** - Climate-based terrain generation with temperature/moisture maps
- **InventorySystem.js** - Hotbar and backpack management
- **WorkbenchSystem.js** - Workbench UI and crafting logic
- **ToolBenchSystem.js** - Tool crafting system
- **EnhancedGraphics.js** - Optional enhanced texture system
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
- **Combat System**: Pokemon-inspired crafted monster battles (in development)
  - Craft monsters from gathered materials at special workbench
  - Deploy monsters via throwable containers
  - AI vs AI auto-battles with player providing real-time support (healing, buffs, additional monsters)
  - Material-based monster types: desert monsters from sand, forest monsters from wood, etc.
  - Strategic team building and resource management gameplay loop
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

### Mobile Controls
- **Left Joystick** - Movement
- **Right Joystick** - Look around
- **Touch Hotbar** - Select items

## Current Architecture Issues

### VoxelWorld.js (9200+ lines - TOO LARGE)

**Still needs extraction:**
- Physics system (collision, movement, gravity)
- BlockTypes definitions and materials
- Player controller (input, camera)
- UI systems (notifications, minimap, mobile joysticks)
- Save/load system
- Main game loop and orchestration

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

### Critical Bugs
1. **Dead Tree Crash**: `treeRegistry[treeId]` undefined error in VoxelWorld.js:7689
2. **Player Hitbox Too Wide**: Needs 2-block gap instead of 1, can walk into blocks

### High Priority Features
1. **Greedy Meshing**: Required for ocean biome (10,000 water blocks = 10,000 draw calls currently)
2. **3D Cave Systems**: Perlin worms to carve natural caves in hollow mountains
3. **Ruins Generation**: Not spawning (check BiomeWorldGen spawn rates)

### Medium Priority
1. **Biome Labeling Bug**: Shows "Plains" when on mountains (height-based detection issue)
2. **Terrain Smoothing**: Reduce "Borg cube" artifacts at chunk boundaries
3. **Drag & Drop Inventory**: Currently only right-click transfer works
4. **Continue VoxelWorld.js Refactoring**: Extract Physics, PlayerController, UI, SaveLoad

### Optional Enhancements
1. **Halloween Ghost Following**: Ruin ghosts and night forest ghosts with cumulative spawn chance
2. **Floating Islands**: Add special loot, quest markers, visual effects
3. **Farming System**: Stardew Valley-inspired agriculture (see CHANGELOG.md)

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
