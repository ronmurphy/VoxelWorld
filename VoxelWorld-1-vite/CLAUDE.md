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

### ✅ COMPLETED: Advanced Workbench System (Latest Session)
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

1. **Complete Workbench Crafting System** (HIGH PRIORITY):
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


-- last ares before he time limit plan hit...
ok, before i try it, i did forget to mention something, when naming the custom crafted 
  item, when the name modal shows up, the "E" keyhandler is still enabled, and as such, you 
  can't use the letter 'e' in your name, same thing for numbers maybe, not sure, so, we need 
  to temporarily disable the input handlers when the Name modal is up, only let the Enter 
  keypress register, and then when the modal is done with, re-enable all of the input key 
  handlers again, can we do that?   and after that, let's go behind and look for any 
  potential code errors, ok?  for the request i just made and anything in general. becausei 
  foumd this error ...  Uncaught TypeError: can't access property "wood", this.inventory is 
  undefined
      removeBlock VoxelWorld.js:517
      unloadChunk VoxelWorld.js:3404
      updateChunks VoxelWorld.js:3440
      updateChunks VoxelWorld.js:3432
      animate VoxelWorld.js:4009
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
      animate VoxelWorld.js:3760
  VoxelWorld.js:517:21

● Excellent catch! Two critical issues to fix:

  1. Modal input conflict - E key handler interfering with typing "e" in names
  2. Legacy inventory error - this.inventory is undefined in removeBlock

  Let me fix both issues:

  Issue 1: Modal Input Conflict

  First, let me find where the naming modal is created in WorkbenchSystem:

● Search(pattern: "showItemNamingModal", path: "src/WorkbenchSystem.js", output_mode:
        "content")
  ⎿  Found 40 lines (ctrl+o to expand)

● Perfect! Now I need to find where the modal is shown and add control disabling. Let me
  look for the modal event handlers:

● Search(pattern: "closeModal.*addEventListener|finalizeCrafting.*addEventListener", path:
        "src/WorkbenchSystem.js", output_mode: "content")
  ⎿  Found 0 lines 

● Let me search for the modal button handlers:

● Search(pattern: "cancelButton.*addEventListener|craftButton.*addEventListener", path:
        "src/WorkbenchSystem.js", output_mode: "content")
  ⎿  Found 28 lines (ctrl+o to expand)

● Great! Now I need to find the closeModal function and add control disabling/enabling
  there. Let me also find where VoxelWorld controls are enabled:

● Search(pattern: "const closeModal.*=", path: "src/WorkbenchSystem.js", output_mode:
        "content")
  ⎿  Found 10 lines (ctrl+o to expand)

● Perfect! Now let me check if VoxelWorld has a property to control inputs:

● Search(pattern: "this\.controlsEnabled", path: "src/VoxelWorld.js", output_mode: "content")
  ⎿  Found 63 lines (ctrl+o to expand)

● Perfect! VoxelWorld already has this.controlsEnabled to disable input. Now I'll fix the
  modal to disable/enable controls:

● Update(src/WorkbenchSystem.js)
  ⎿  Updated src/WorkbenchSystem.js with 5 additions                                  
       1625            // Event handlers
       1626            const closeModal = () => {
       1627                document.body.removeChild(namingModal);
       1628 +              // Re-enable VoxelWorld input controls when modal closes
       1629 +              if (this.voxelWorld) {
       1630 +                  this.voxelWorld.controlsEnabled = true;
       1631 +                  console.log('✅ Re-enabled VoxelWorld input controls');
       1632 +              }
       1633            };
       1634    
       1635            const finalizeCrafting = () => {

● Now I need to disable controls when the modal opens. Let me find the end of the
  showItemNamingModal function:

● Search(pattern: "document\.body\.appendChild.*namingModal", path: "src/WorkbenchSystem.js",
        output_mode: "content")
  ⎿  Found 5 lines (ctrl+o to expand)

● Perfect! Now I'll add the control disabling when modal opens:

● Update(src/WorkbenchSystem.js)
  ⎿  Updated src/WorkbenchSystem.js with 6 additions                                    
       1679    
       1680            namingModal.appendChild(container);
       1681            document.body.appendChild(namingModal);
       1682 +  
       1683 +          // Disable VoxelWorld input controls while modal is open
       1684 +          if (this.voxelWorld) {
       1685 +              this.voxelWorld.controlsEnabled = false;
       1686 +              console.log('🔒 Disabled VoxelWorld input controls for naming
            +  modal');
       1687 +          }
       1688        }
       1689    
       1690        /**

● Great! Now let me fix the second issue - the legacy inventory error. I need to find where
   removeBlock is trying to access this.inventory:

● Search(pattern: "this\.inventory\[.*\].*shrub|this\.inventory\.wood", path:
        "src/VoxelWorld.js", output_mode: "content")
  ⎿  Found 12 lines (ctrl+o to expand)

● Found it! Line 517 in the removeBlock function still uses legacy inventory. I need to
  convert it to the slot system:

● Update(src/VoxelWorld.js)
  ⎿  Updated src/VoxelWorld.js with 5 additions and 4 removals                        
       514    
       515                    // Check if it's a shrub for harvesting
       516                    if (blockData.type === 'shrub') {
       517 -                      this.inventory.wood += 1; // Add 1 wood to inventory
       518 -                      console.log(`Harvested shrub! Wood: 
           - ${this.inventory.wood}`);
       519 -                      this.updateStatus(`Harvested shrub! Wood: ${
           -  this.inventory.wood}`);
       520 -                      this.updateHotbarCounts(); // Update hotbar display
       517 +                      this.addToInventory('wood', 1)
           +  ; // Add 1 wood to inventory using slot system
       518 +                      const totalWood = this.countItemInSlots('wood');
       519 +                      console.log(`Harvested shrub! Wood: ${totalWood}`);
       520 +                      this.updateStatus(`Harvested shrub! Wood: 
           + ${totalWood}`);
       521 +                      // addToInventory already handles UI updates
       522                    }
       523                    // Check if it's a backpack for pickup
       524                    else if (blockData.type === 'backpack' && 
             !this.hasBackpack) {

● Perfect! Now let me check if there are any other legacy inventory references that could
  cause issues:

● Search(pattern: "this\.inventory\[|this\.inventory\.", path: "src/VoxelWorld.js",
        output_mode: "content")
  ⎿  Found 0 lines 
  ⎿  Found 8 new diagnostic issues in 1 file (ctrl-o to expand)
  ⎿  Session limit reached ∙ resets 8pm
     /upgrade to increase your usage limit.