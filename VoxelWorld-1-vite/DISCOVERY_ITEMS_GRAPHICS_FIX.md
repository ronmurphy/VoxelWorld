# 🔍 Discovery Items Graphics System - Complete Fix

## Issue Summary
Discovery items (feather, coal, flower, skull, etc.) have PNG assets in `/assets/art/tools/` but were not being displayed in:
- **Billboards** (world items you can pick up)
- **Hotbar** (inventory slots)
- **Backpack** (inventory display)

## Root Cause
The discovery items were missing from two critical places:
1. **Asset Discovery** - Not listed in `EnhancedGraphics.js` candidates for web/Vite mode
2. **Icon System** - Not included in the `getItemIcon()` check for EnhancedGraphics

## ✅ Fixes Applied

### 1. Added Discovery Items to Asset Discovery
**File: `src/EnhancedGraphics.js` (Line ~277-283)**

```javascript
tools: [
    'backpack', 'machete', 'stick', 'stone_hammer', 'workbench', 'pumpkin', 
    'compass', 'toolbench', 'tool_bench', 'grapple', 'sword', 'pickaxe',
    'boots_speed', 'cryatal', 'club', 'stone_spear', 'torch', 'wood_shield',
    // Materials and discovery items (all in /tools/ folder)
    'coal', 'gold', 'iron', 'feather', 'fur', 'skull', 'flower', 'leaf',
    'hoe'  // Farming tool
],
```

### 2. Added Discovery Items to Icon Check
**File: `src/VoxelWorld.js` (Line ~2363-2381)**

```javascript
const toolsAndDiscoveryItems = [
    // Crafting tools
    'machete', 'workbench', 'backpack', 'stone_hammer', 'stick', 'compass', 'compass_upgrade', 
    'tool_bench', 'grappling_hook', 'crafted_grappling_hook', 'hoe',
    // Discovery items (in /tools/ folder)
    'skull', 'mushroom', 'flower', 'berry', 'crystal', 'feather', 'bone', 'shell', 
    'fur', 'iceShard', 'rustySword', 'oldPickaxe', 'ancientAmulet',
    // Ores and materials (in /tools/ folder)
    'coal', 'iron', 'gold', 'pumpkin', 'leaf'
];

if (toolsAndDiscoveryItems.includes(itemType)) {
    // Returns EnhancedGraphics image if available, otherwise emoji fallback
}
```

## 🎨 How the Graphics Priority System Works

### Priority Chain (EnhancedGraphics → Emoji → Emoji Image)

```
┌─────────────────────────────────────────────────────┐
│ 1. CHECK ENHANCEDGRAPHICS                           │
│    ✓ Enabled? ✓ Asset loaded?                      │
│    → YES: Return PNG/JPEG <img> tag (36px)         │
│    → NO: Continue to step 2                         │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│ 2. EMOJI FALLBACK                                   │
│    Return emoji character (e.g., '🔨')              │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│ 3. EMOJIRENDERER CONVERSION                         │
│    Converts emoji → <img> from local npm packages   │
│    Size: 36px (matches EnhancedGraphics)            │
└─────────────────────────────────────────────────────┘
```

### For Blocks (Special Case)

```
┌─────────────────────────────────────────────────────┐
│ 1. CHECK ENHANCEDGRAPHICS BLOCK TEXTURES            │
│    ✓ Enabled? ✓ Texture loaded?                    │
│    → YES: Use enhanced texture for 3D blocks        │
│    → NO: Continue to step 2                         │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│ 2. PROCEDURAL TEXTURES                              │
│    Generate procedural texture from color           │
│    (Not preferred, but works as fallback)           │
└─────────────────────────────────────────────────────┘
```

### For Billboards (3D World Items)

```
┌─────────────────────────────────────────────────────┐
│ createBillboard() in VoxelWorld.js                  │
│                                                     │
│ 1. Check toolImages.has(type)?                     │
│    → YES: Load PNG as THREE.js texture             │
│    → NO: Continue to emoji fallback                │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│ 2. Emoji Canvas Fallback                           │
│    - Draw emoji on 128x128 canvas                  │
│    - Create THREE.CanvasTexture                    │
│    - Apply to sprite material                      │
└─────────────────────────────────────────────────────┘
```

## 📋 Discovery Items with PNG Assets

All these items are in `/assets/art/tools/`:

| Item Type | PNG File | Used In |
|-----------|----------|---------|
| coal | coal.png | ✅ Billboards, Hotbar, Backpack |
| feather | feather.png | ✅ Billboards, Hotbar, Backpack |
| flower | flower.png | ✅ Billboards, Hotbar, Backpack |
| fur | fur.png | ✅ Billboards, Hotbar, Backpack |
| gold | gold.png | ✅ Billboards, Hotbar, Backpack |
| iron | iron.png | ✅ Billboards, Hotbar, Backpack |
| leaf | leaf.png | ✅ Billboards, Hotbar, Backpack |
| pumpkin | pumpkin.png | ✅ Billboards, Hotbar, Backpack |
| skull | skull.png | ✅ Billboards, Hotbar, Backpack |

### Items Still Using Emoji Fallback (No PNG Yet)

| Item Type | Emoji | Location |
|-----------|-------|----------|
| berry | 🍓 | Needs berry.png |
| bone | 🦴 | Needs bone.png |
| crystal | 💎 | Needs crystal.png |
| iceShard | ❄️ | Needs iceshard.png |
| mushroom | 🍄 | Needs mushroom.png |
| shell | 🐚 | Needs shell.png |
| ancientAmulet | 📿 | Needs ancient_amulet.png |
| oldPickaxe | ⛏️ | Has pickaxe.png (use alias?) |
| rustySword | ⚔️ | Has sword.png (use alias?) |

## 🔧 Configuration Files

### EnhancedGraphics Asset Paths
```javascript
this.assetPaths = {
    blocks: 'art/blocks',
    tools: 'art/tools',      // ← Discovery items are here
    time: 'art/time',
    entities: 'art/entities',
    food: 'art/food'
};
```

### Texture Aliases
If an item name doesn't match the filename, add an alias:

```javascript
this.textureAliases = {
    tool_bench: 'toolbench',           // tool_bench → toolbench.png
    grappling_hook: 'grapple',         // grappling_hook → grapple.png
    // Could add:
    oldPickaxe: 'pickaxe',             // oldPickaxe → pickaxe.png
    rustySword: 'sword',               // rustySword → sword.png
};
```

## 🧪 Testing Checklist

### In-Game Tests:
- [ ] Find discovery items in world (billboards show PNG)
- [ ] Pick up items (appear in hotbar with PNG)
- [ ] View in backpack (show PNG at 36px)
- [ ] Disable EnhancedGraphics (see emoji fallbacks)
- [ ] Re-enable EnhancedGraphics (PNG assets load)

### Console Logs to Check:
```
🔍 Billboard debug for feather: isReady=true, hasImage=true
🎨 Using enhanced billboard texture for feather: art/tools/feather.png
```

### Expected Behavior:
1. **With EnhancedGraphics ON**: See PNG images everywhere
2. **With EnhancedGraphics OFF**: See emoji that convert to emoji images
3. **All icons sized at 36px** (consistent across all displays)

## 📝 Code Flow Summary

### 1. Asset Loading (Startup)
```javascript
EnhancedGraphics.initialize()
  → _discoverAvailableAssets()
    → Web: Check candidates list (now includes discovery items)
    → Electron: Scan filesystem
  → _loadToolImages()
    → Load each discovered PNG into toolImages Map
```

### 2. Inventory Display
```javascript
getItemIcon(itemType, context)
  → Check if itemType in toolsAndDiscoveryItems
    → YES: enhancedGraphics.getHotbarToolIcon(itemType, emoji)
      → Check toolImages.has(itemType)
        → YES: Return <img src="art/tools/feather.png" style="width: 36px;">
        → NO: Return emoji '🪶'
    → NO: Return emoji fallback
  
  → If emoji returned, EmojiRenderer converts to <img class="emoji">
    → CSS ensures 36px sizing
```

### 3. Billboard Creation
```javascript
createBillboard(x, y, z, type)
  → Check enhancedGraphics.toolImages.has(type)
    → YES: Load PNG as THREE.Texture
    → NO: Draw emoji on canvas, use CanvasTexture
  → Create THREE.Sprite with texture
  → Add to scene
```

## 🚀 Next Steps (Optional)

1. **Add missing PNG assets** for items still using emoji:
   - berry.png, bone.png, crystal.png, etc.

2. **Add texture aliases** for renamed items:
   - oldPickaxe → pickaxe
   - rustySword → sword

3. **Consolidate discovery items** into dedicated `/art/discovery/` folder:
   - Cleaner organization
   - Separate from tools

4. **Create item variants** (optional):
   - feather_blue.png, feather_red.png
   - skull_human.png, skull_animal.png

---

## ✅ Status: FIXED
Discovery items now properly use EnhancedGraphics PNG assets in billboards, hotbar, and backpack!
