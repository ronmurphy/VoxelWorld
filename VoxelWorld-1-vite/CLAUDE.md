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

### Latest Session - Collision System Overhaul
- **Removed Auto-Jump System**: Eliminated problematic auto-jump that caused continuous jumping bugs
- **Implemented Hitbox Collision**: Replaced point-based collision with industry-standard AABB hitbox system
- **Player Hitbox**: 0.6w × 1.8h × 0.6d units with full volume coverage
- **Block Hitboxes**: Perfect 1×1×1 cube collision detection
- **Wall Sliding Preserved**: Maintains smooth movement along obstacles
- **Issues Remaining**: Still has collision bypasses with multi-block structures (2+ stacked blocks)

### Next Session TODO
1. **Fix 3D Preview**: Investigate `../mapgate/` ShapeForge system for working 3D preview implementation
   - Study how the 3D preview renders materials and shapes
   - Adapt/salvage code for workbench 3D preview area
   - Current issue: 3D preview not showing when selecting wood + cube

2. **Code Architecture Refactoring** (HIGH PRIORITY):
   VoxelWorld.js has grown too large (~3700+ lines) and needs logical separation:
   - **Physics.js**: Extract collision system, movement, gravity, and physics utilities
   - **BlockTypes.js**: Extract block definitions, properties, material systems
   - **WorldGeneration.js**: Extract chunk system, biome generation, terrain generation
   - **PlayerController.js**: Extract player movement, input handling, camera controls
   - **InventorySystem.js**: Extract backpack, hotbar, item management
   - **SaveLoadSystem.js**: Extract save/load with LocalStorage → IndexedDB migration for large worlds
   - **UI.js**: Extract notifications, minimap, status bar, mobile joysticks
   - **Workbench.js**: Extract workbench modal and crafting system
   - Keep VoxelWorld.js as main orchestrator class

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