# 🔧 Tool Bench System Documentation

## Overview

The **Tool Bench System** is a separate crafting interface from the Workbench, designed specifically for crafting tools, consumables, and permanent upgrades using discovery items found throughout the world.

## Key Differences: Tool Bench vs Workbench

| Feature | Workbench | Tool Bench |
|---------|-----------|------------|
| **Purpose** | Building blocks & shapes | Tools, upgrades, consumables |
| **Items Used** | Materials (wood, stone, iron) | Discovery items (leaves, feathers, crystals) |
| **Terminology** | Recipes | Blueprints |
| **Quantities** | Slider (1-10) | Fixed (craft exactly 1) |
| **Preview** | 3D shape preview | None (tools are items) |
| **Unlock** | Available from start | Must craft tool_bench in workbench first |

## How to Unlock the Tool Bench

1. **Gather Materials**: Collect 3 wood + 3 stone
2. **Open Workbench**: Press `W` key
3. **Craft Tool Bench**: Find "🔧 Tool Bench" in Special category
4. **Unlock UI**: Tool bench button appears in toolbar
5. **Access**: Press `T` key or click 🔧 button

### Tool Bench Recipe (Workbench)
```
Materials: 3 wood + 3 stone
Output: Unlocks Tool Bench UI (not a placeable item)
Category: Special
```

## Using the Tool Bench

### Opening the Interface
- **Keyboard**: Press `T` key
- **Mouse**: Click 🔧 button in top menu bar
- **Pointer Lock**: Automatically released when opened

### Interface Layout

```
┌─────────────────────────────────────────┐
│  🔧 Tool Bench Crafting            [✕]  │
├──────────────┬──────────────────────────┤
│              │                          │
│  Discovery   │   Blueprints             │
│  Items       │                          │
│              │   [Blueprint cards with  │
│  [Item list  │    icons, descriptions,  │
│   with       │    requirements, and     │
│   counts]    │    cryptic clues]        │
│              │                          │
│              │                          │
│              │                          │
│              │   [Craft Button]         │
└──────────────┴──────────────────────────┘
```

### Closing the Interface
- **Keyboard**: Press `ESC` key
- **Mouse**: Click `✕` close button
- **Pointer Lock**: Automatically re-acquired for gameplay

## Discovery System (Mystery Unlocking)

The Tool Bench uses a **progressive discovery system** to make blueprints mysterious until you find the required items.

### Icon Unlocking
- **Before Discovery**: Shows ❓ for items you haven't found yet
- **After Discovery**: Shows actual item icon (e.g., 🌿 for oak_wood-leaves)
- **Mechanism**: Icon reveals when you have at least 1 of a matching item in inventory

### Cryptic Clues
- **Purpose**: Hint at missing items without revealing them directly
- **Display**: Shows when you're missing required items
- **Example Clues**:
  - Feather: *"Something associated with being in the sky..."*
  - Leaves: *"Something that falls gently when released..."*

### Visual Design
- **Blueprint Grid Background**: Classic blue/grey engineering blueprint aesthetic
- **Golden Accents**: Requirements and clues in gold (#FFD700)
- **Color Coding**:
  - 🟢 Green: Have enough of this item
  - 🔴 Red: Need more of this item

## Generic Item Matching

The Tool Bench supports **generic item types** that match multiple variants.

### "leaves" Matches Any Leaf Type
```javascript
Generic "leaves" requirement matches:
- oak_wood-leaves
- pine_wood-leaves
- birch_wood-leaves
- palm_wood-leaves
- dead_wood-leaves
- forest_leaves
- mountain_leaves
- desert_leaves
- plains_leaves
- tundra_leaves
```

### "wood" Matches Any Wood Type
```javascript
Generic "wood" requirement matches:
- oak_wood
- pine_wood
- birch_wood
- palm_wood
- dead_wood
```

This allows flexible crafting - you can use any leaf type or wood type to satisfy generic requirements.

## Available Blueprints

### 🌿 Movement Tools

#### 🕸️ Grappling Hook
- **Items Required**: 3 leaves + 1 feather
- **Type**: Consumable (10 charges)
- **Effect**: Teleport to targeted blocks
- **Clues**:
  - Leaves: *"Something that falls gently when released..."*
  - Feather: *"Something associated with being in the sky..."*

#### 👢 Speed Boots
- **Items Required**: 2 fur + 1 feather
- **Type**: Permanent upgrade
- **Effect**: Movement speed 1.0 → 1.5
- **Clues**:
  - Fur: *"Something soft and warm from creatures..."*
  - Feather: *"Something associated with being in the sky..."*

### ⚒️ Harvesting Tools

#### 🔪 Machete (Upgrade)
- **Items Required**: 3 bone + 2 iron
- **Type**: Permanent upgrade
- **Effect**: Harvest speed 1.0 → 1.5
- **Clues**:
  - Bone: *"Something left behind by creatures..."*
  - Iron: *"A strong material found underground..."*

#### ⛏️ Reinforced Pickaxe
- **Items Required**: 4 iron + 1 crystal
- **Type**: Tool
- **Effect**: Enhanced mining capabilities
- **Clues**:
  - Iron: *"A strong material found underground..."*
  - Crystal: *"Something that sparkles in the depths..."*

### 🎒 Inventory Upgrades

#### 🎒 Backpack Upgrade I
- **Items Required**: 5 leaves + 2 fur
- **Type**: Permanent upgrade
- **Effect**: Stack size 50 → 75
- **Clues**:
  - Leaves: *"Something that falls gently when released..."*
  - Fur: *"Something soft and warm from creatures..."*

#### 🎒 Backpack Upgrade II
- **Items Required**: 8 leaves + 4 fur + 2 crystal
- **Type**: Permanent upgrade
- **Effect**: Stack size 75 → 100
- **Requirements**: Must craft Backpack Upgrade I first
- **Clues**:
  - Leaves: *"Something that falls gently when released..."*
  - Fur: *"Something soft and warm from creatures..."*
  - Crystal: *"Something that sparkles in the depths..."*

### 🗡️ Combat Tools

#### ⚔️ Iron Sword
- **Items Required**: 4 iron + 1 bone
- **Type**: Tool
- **Effect**: Combat weapon
- **Clues**:
  - Iron: *"A strong material found underground..."*
  - Bone: *"Something left behind by creatures..."*

#### 🛡️ Wooden Shield
- **Items Required**: 6 wood + 2 fur
- **Type**: Tool
- **Effect**: Defensive equipment
- **Clues**:
  - Wood: *"Something from trees..."*
  - Fur: *"Something soft and warm from creatures..."*

### 🔮 Mystical Items

#### 🔮 Crystal Lantern
- **Items Required**: 3 crystal + 2 iron + 1 glowstone
- **Type**: Tool
- **Effect**: Portable light source
- **Clues**:
  - Crystal: *"Something that sparkles in the depths..."*
  - Iron: *"A strong material found underground..."*
  - Glowstone: *"Something that glows in the dark..."*

#### 🧭 Compass
- **Items Required**: 4 iron + 1 crystal
- **Type**: Tool
- **Effect**: Navigation aid (points to spawn)
- **Clues**:
  - Iron: *"A strong material found underground..."*
  - Crystal: *"Something that sparkles in the depths..."*

## Discovery Items (Tooling Materials)

### Wood-Based
- `oak_wood-leaves`, `pine_wood-leaves`, `birch_wood-leaves`, `palm_wood-leaves`, `dead_wood-leaves`
- `forest_leaves`, `mountain_leaves`, `desert_leaves`, `plains_leaves`, `tundra_leaves`

### Nature Items
- `mushroom` - Found in forests
- `flower` - Found in plains/forests
- `berry` - Found on shrubs
- `leaf` - Single leaf items

### Precious Materials
- `crystal` - Found in caves/mountains
- `oreNugget` - Mining byproduct
- `glowstone` - Rare luminescent material

### Organic Items
- `wheat` - Harvested from fields
- `feather` - Dropped by birds
- `bone` - Found from skeletons
- `fur` - Harvested from animals
- `shell` - Found near water
- `iceShard` - Found in tundra biome

### Equipment Finds
- `rustySword` - Ancient weapon
- `oldPickaxe` - Worn tool
- `ancientAmulet` - Mystical artifact
- `skull` - Rare treasure

### Existing Tools
- `machete` - Starting tool

## Technical Implementation

### File: `src/ToolBenchSystem.js`

#### Key Classes and Methods

**Constructor**
```javascript
constructor(voxelWorld)
```
Initializes the tool bench system with reference to VoxelWorld instance.

**UI Management**
```javascript
open()          // Opens tool bench UI, releases pointer lock
close()         // Closes UI, re-acquires pointer lock
createToolBenchUI()  // Builds entire modal interface
```

**Item Matching**
```javascript
itemMatches(blueprintItem, playerItem)
```
Handles generic type matching (e.g., "leaves" → "oak_wood-leaves")

**Counting System**
```javascript
countItemWithMatching(blueprintItem)
```
Counts total quantity of items including matching variants

**Blueprint Display**
```javascript
createBlueprintElement(blueprint)
```
Generates blueprint card with:
- Icon discovery system (❓ → actual icon)
- Cryptic clues for missing items
- Color-coded requirements
- Craft button (if available)

**Crafting**
```javascript
craftSelectedBlueprint()
```
Handles:
- Material consumption
- Permanent upgrades (backpack size, movement speed, harvest speed)
- Consumable items (grappling hook with charges)
- Tool creation

### Integration with VoxelWorld

#### Properties Added to VoxelWorld
```javascript
// Upgrade tracking
this.backpackStackSize = 50;   // Upgradable: 50 → 75 → 100
this.movementSpeed = 1.0;      // Upgradable: 1.0 → 1.5
this.harvestSpeed = 1.0;       // Upgradable: 1.0 → 1.5

// UI state
this.hasToolBench = false;     // Unlocked when tool_bench crafted
this.toolBenchButton = ...;    // UI button reference
this.toolBenchSystem = ...;    // System instance
```

#### Key Bindings
```javascript
// In VoxelWorld.js keydown handler
if (key === 't' && this.hasToolBench) {
    this.toolBenchSystem.open();
}

// ESC key closes any open modal
if (key === 'Escape') {
    if (this.toolBenchSystem?.isOpen) {
        this.toolBenchSystem.close();
    }
}
```

### Inventory Integration

The Tool Bench uses the same inventory system as the Workbench:

**Getting Materials**
```javascript
this.voxelWorld.getAllMaterialsFromSlots()
```
Returns object with all items and quantities from hotbar + backpack

**Removing Materials**
```javascript
this.voxelWorld.removeFromInventory(itemType, quantity)
```
Consumes items when crafting

**Adding Items**
```javascript
this.voxelWorld.addToInventory(itemType, quantity)
```
Adds crafted items to inventory

**Icon Lookup**
```javascript
this.voxelWorld.getItemIcon(itemType)
```
Gets emoji icon for any item type

## Upgrade System Details

### Backpack Stack Size
- **Default**: 50 items per slot
- **Upgrade I**: 50 → 75 (+25)
- **Upgrade II**: 75 → 100 (+25)
- **Total Gain**: +50 items per slot (100% increase)
- **Implementation**: Modifies `voxelWorld.backpackStackSize`

### Movement Speed
- **Default**: 1.0 (base speed)
- **Speed Boots**: 1.0 → 1.5 (+50%)
- **Implementation**: Modifies `voxelWorld.movementSpeed`

### Harvest Speed
- **Default**: 1.0 (base speed)
- **Machete Upgrade**: 1.0 → 1.5 (+50%)
- **Implementation**: Modifies `voxelWorld.harvestSpeed`

### Upgrade Persistence
Upgrades are **permanent** and persist across:
- Game sessions (if save system implemented)
- Backpack opens/closes
- Tool bench opens/closes

## Consumable Items

### Grappling Hook
- **Charges**: 10 uses
- **Behavior**: Single-use teleportation
- **Item Metadata**: `{ isGrapplingHook: true, charges: 10 }`
- **Future Enhancement**: Charge tracking and depletion

### Future Consumables
The blueprint system supports:
```javascript
{
    isConsumable: true,
    charges: <number>
}
```
Any blueprint can be made consumable with limited uses.

## UI/UX Features

### Pointer Lock Management
- **On Open**: `document.exitPointerLock()` - releases mouse for UI interaction
- **On Close**: `renderer.domElement.requestPointerLock()` - re-locks for gameplay
- **Delay**: 100ms timeout prevents race conditions

### Close Button
- **Icon**: ✕ (multiplication sign)
- **Position**: Top-right corner of modal
- **Hover Effects**:
  - Background: #8B0000 → #CD0000
  - Scale: 1.0 → 1.1
- **Keyboard Alternative**: ESC key

### Blueprint Grid Background
Classic engineering blueprint aesthetic using CSS gradients:
```css
background:
    linear-gradient(0deg, transparent 24%, rgba(100, 150, 200, 0.05) 25%, ...),
    linear-gradient(90deg, transparent 24%, rgba(100, 150, 200, 0.05) 25%, ...),
    linear-gradient(135deg, #0a1628 0%, #1a2842 50%, #0f1f3a 100%);
background-size: 50px 50px, 50px 50px, 100% 100%;
```

### Color Scheme
- **Gold (#FFD700)**: Headers, selected items, clues
- **Green (#4CAF50)**: Sufficient quantities, craftable
- **Red (#f44336)**: Insufficient quantities, missing items
- **Blue gradient**: Blueprint background
- **Semi-transparent overlays**: Panels and sections

## Future Enhancements

### Planned Features
1. **Charge Tracking**: Consumable items show remaining charges
2. **Blueprint Discovery**: Find blueprint scrolls to unlock new recipes
3. **Tool Durability**: Tools wear out and need repair/replacement
4. **Combo Blueprints**: Require previous tools to craft advanced versions
5. **Category Filtering**: Filter blueprints by movement/combat/mystical/etc.
6. **Search Function**: Search blueprints by name or required items
7. **Favorite System**: Pin frequently used blueprints to top

### Integration Ideas
1. **Quest System**: Unlock blueprints by completing quests
2. **NPC Trading**: Trade discovery items for rare blueprints
3. **Achievements**: Track total tools crafted, upgrades unlocked
4. **Statistics**: Show crafting history and most-used tools

## Troubleshooting

### Tool Bench Button Not Appearing
- **Cause**: Tool bench not crafted yet
- **Solution**: Craft tool_bench in workbench (3 wood + 3 stone)

### Icons Showing ❓ Despite Having Items
- **Cause**: Generic type mismatch (blueprint wants "leaves", you have "oak_wood-leaves")
- **Solution**: System automatically handles this - icon should reveal on next blueprint refresh
- **Debug**: Check `itemMatches()` function includes your item type

### Can't Craft Blueprint
- **Cause 1**: Missing required items (red text)
- **Solution**: Gather items shown in requirements list
- **Cause 2**: Not enough quantity (have 2, need 3)
- **Solution**: Gather more of the required items

### Pointer Lock Not Working
- **Cause**: Browser permissions or UI state conflict
- **Solution**: Click on game canvas, then try opening tool bench again
- **Alternative**: Use ESC to close, then click canvas

## Performance Notes

- **Lazy Loading**: Blueprint UI only created when opened (not on game start)
- **Event Listeners**: Cleaned up when modal closes to prevent memory leaks
- **Item Counting**: Optimized to count once per blueprint, not per item type
- **Icon Caching**: Uses VoxelWorld's `getItemIcon()` which caches emoji lookups

## Code Example: Adding a New Blueprint

```javascript
// In ToolBenchSystem.js blueprints object
my_new_tool: {
    id: 'my_new_tool',
    name: '⚡ Lightning Rod',
    items: {
        iron: 4,
        crystal: 2,
        feather: 1
    },
    description: 'Calls down lightning strikes. 5 charges.',
    clues: {
        iron: 'A strong material found underground...',
        crystal: 'Something that sparkles in the depths...',
        feather: 'Something associated with being in the sky...'
    },
    category: 'mystical',
    isConsumable: true,
    charges: 5,
    isLightningRod: true  // Custom property for game logic
}
```

Then in `craftSelectedBlueprint()`, add handling:
```javascript
if (blueprint.isLightningRod) {
    // Add lightning rod to inventory with charges metadata
    this.voxelWorld.addToInventory('lightning_rod', 1, {
        charges: blueprint.charges
    });
    this.voxelWorld.updateStatus('⚡ Lightning Rod crafted!', 'discovery');
}
```

---

**Last Updated**: 2025-10-02
**System Version**: VoxelWorld-1-vite
**File Location**: `src/ToolBenchSystem.js`
