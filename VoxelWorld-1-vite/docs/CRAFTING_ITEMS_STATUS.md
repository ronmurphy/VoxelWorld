# Crafting Items Implementation Status

**Last Updated:** October 13, 2025

This document tracks which items from the three benches (ToolBench, KitchenBench, Workbench) are fully implemented vs need work.

---

## 🔧 TOOLBENCH ITEMS (`data/blueprints.json`)

### ✅ Fully Implemented (Works + Has Art/Emoji)

| Item | ID | Status | Notes |
|------|-----|--------|-------|
| Stone Pickaxe | `stone_pickaxe` | ✅ | Basic mining tool |
| Stone Axe | `stone_axe` | ✅ | Tree chopping |
| Stone Hoe | `stone_hoe` | ✅ | Farming tool, auto-works |
| Stone Spear | `stone_spear` | ✅ | Basic weapon, throwable |
| Watering Can | `watering_can` | ✅ | Waters crops (2x growth), has animation |

### 🚧 Partially Implemented (Code exists but needs testing/assets)

| Item | ID | Status | Missing |
|------|-----|--------|---------|
| Machete | `machete` | 🚧 | Better than axe but needs differentiation code |
| Speed Boots | `speed_boots` | 🚧 | Crafting works, equip/buff system needs hook-up |
| Backpack | `backpack` | 🚧 | Placeable system works, may need inventory UI polish |

### 📋 Planned (JSON exists but no code implementation)

| Item | ID | Status | Needs |
|------|-----|--------|-------|
| Iron Pickaxe | `iron_pickaxe` | 📋 | Same as stone but faster mining speed |
| Iron Sword | `iron_sword` | 📋 | Combat damage implementation |
| Fishing Rod | `fishing_rod` | 📋 | Fishing mechanic not implemented |
| Leather Armor | `leather_armor` | 📋 | Armor/defense system not implemented |

---

## 🍳 KITCHEN BENCH ITEMS (`data/recipes.json`)

### ✅ Fully Implemented

| Food | ID | Status | Buff Effect |
|------|-----|--------|-------------|
| Bread | `roasted_wheat` | ✅ | +30 stamina |
| Grilled Fish | `grilled_fish` | ✅ | +75 stamina, +20% speed |
| Berry Bread | `berry_bread` | ✅ | +50 stamina, +10% speed |

### 🚧 Partially Implemented

| Food | ID | Status | Issue |
|------|-----|--------|-------|
| Carrot Stew | `carrot_stew` | 🚧 | Works but needs better visual feedback |

### 📋 Planned

| Food | ID | Status | Blocker |
|------|-----|--------|---------|
| Baked Potato | `baked_potato` | 📋 | Potato crop not in game yet |
| Fruit Salad | `fruit_salad` | 📋 | Multiple fruit types needed |

---

## 🔨 WORKBENCH ITEMS (`data/plans.json`)

### ✅ Fully Implemented

| Structure | ID | Status | Notes |
|-----------|-----|--------|-------|
| Toolbench | `toolbench` | ✅ | Placeable crafting station |
| Kitchen Bench | `kitchen_bench` | ✅ | Placeable cooking station |
| Campfire | `campfire` | ✅ | Light source (if implemented) |
| Chest | `chest` | ✅ | Storage (if implemented) |

### 🚧 Partially Implemented

| Structure | ID | Status | Issue |
|-----------|-----|--------|-------|
| Bed | `bed` | 🚧 | Placeable but sleep mechanic may need work |
| Fence | `fence` | 🚧 | Placeable but collision needs testing |

---

## 🎨 ASSET STATUS

### PNG Assets Available (in `assets/art/tools/`)
- ✅ stone_spear.png
- ✅ pickaxe.png
- ✅ boots_speed.png
- ✅ machete.png
- ✅ sword.png
- ✅ stick.png (used as hoe temporary)

### Missing PNG Assets (Will Use Emoji Fallback)
- ❌ watering_can.png (uses 💧 emoji)
- ❌ stone_axe.png (uses 🪓 emoji)
- ❌ hoe.png (currently using stick.png, should use 🔨 emoji)
- ❌ backpack.png (uses 🎒 emoji)
- ❌ fishing_rod.png (uses 🎣 emoji)

---

## 🔍 HOW TO CHECK ITEM STATUS

### In Browser Console:
```javascript
// List all available items
window.debugListItems()

// Give yourself an item to test
giveItem("stone_pickaxe", 1)
giveItem("speed_boots", 1)
giveItem("roasted_wheat", 5)

// Check what's in your inventory
console.log(voxelWorld.playerItems)
```

### Visual Indicators in Crafting Menus:
- 🟢 **Green border** = Fully working + has assets
- 🟡 **Yellow border** = Partially working (missing assets or mechanics)
- 🔴 **Red border** = Planned only (not implemented)

---

## 🛠️ NEXT STEPS FOR COMPLETION

### Priority 1: Hook up existing items
1. Speed Boots - Connect `speed_boots` to stamina system multipliers
2. Machete - Make it meaningfully different from stone axe
3. Iron tools - Copy stone tool code, just change speed values

### Priority 2: Add missing mechanics
1. Armor system - Track armor items, reduce damage
2. Fishing system - Raycasting water blocks, catch fish items
3. Better buff visual feedback - Show active buffs in UI

### Priority 3: Asset creation
1. Create missing PNG files (watering_can, hoe, etc)
2. Or embrace emoji fallbacks permanently (they look good!)
3. Add animated icons for active buffs

---

## 💡 IMPLEMENTATION PATTERN

When adding a new craftable item:

### 1. Add to JSON file
```json
"my_item": {
  "id": "my_item",
  "name": "🎯 My Item",
  "emoji": "🎯",
  "ingredients": { "wood": 5, "stone": 3 },
  "result": { "itemType": "my_item", "durability": 100 },
  "description": "Does cool stuff",
  "unlocked": true
}
```

### 2. Add to EnhancedGraphics aliases (if PNG exists)
```javascript
this.textureAliases = {
  crafted_my_item: 'my_item',
  my_item: 'my_item'
};
```

### 3. Add functionality in VoxelWorld.js
```javascript
// In appropriate handler (onMouseDown for tools, etc)
if (activeItem === 'my_item' || activeItem === 'crafted_my_item') {
  // Do something cool
  this.updateStatus('🎯 Item activated!');
}
```

### 4. Test in console
```javascript
giveItem("crafted_my_item", 1)
// Equip it and try using it
```

---

## 📊 SUMMARY STATS

- **Total Items Defined:** ~30+
- **Fully Working:** ~15 (50%)
- **Partially Working:** ~8 (27%)
- **Planned/Not Implemented:** ~7 (23%)

**Goal:** Get to 80%+ fully working by adding simple implementations for tools/weapons/consumables.
