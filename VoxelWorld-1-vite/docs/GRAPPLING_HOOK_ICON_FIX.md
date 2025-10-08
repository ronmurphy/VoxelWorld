# 🕸️ Grappling Hook Icon Display Fix

## Problem
The grappling hook icon (`grapple.png`) wasn't showing up in the hotbar or inventory, even though the file was correctly named and in the right location (`/assets/art/tools/grapple.png`).

## Root Cause
The enhanced graphics system needed two things configured:

1. **Item types needed to be registered** in the enhanced graphics check
2. **Texture aliases needed mapping** from code names to file names

## Solution - Two Files Updated

### 1. VoxelWorld.js - Added Grappling Hook to Tool List
**Line ~2225** - Added `grappling_hook` and `crafted_grappling_hook` to the enhanced graphics tool check:

```javascript
// Before:
if (['machete', 'workbench', 'backpack', 'stone_hammer', 'stick', 'compass', 'compass_upgrade', 'tool_bench'].includes(itemType)) {

// After:
if (['machete', 'workbench', 'backpack', 'stone_hammer', 'stick', 'compass', 'compass_upgrade', 'tool_bench', 'grappling_hook', 'crafted_grappling_hook'].includes(itemType)) {
```

### 2. EnhancedGraphics.js - Added Texture Aliases
**Line ~47** - Added mappings so both item IDs point to the same `grapple.png` file:

```javascript
this.textureAliases = {
    tool_bench: 'toolbench',              // Code uses tool_bench, file is toolbench.png
    grappling_hook: 'grapple',            // Code uses grappling_hook, file is grapple.png
    crafted_grappling_hook: 'grapple'     // Crafted version also maps to grapple.png
};
```

## How It Works

### Icon Loading Flow:
1. Player crafts grappling hook → gets `crafted_grappling_hook` item
2. Inventory displays the item → calls `getItemIcon('crafted_grappling_hook', 'hotbar')`
3. VoxelWorld checks if it's in the enhanced graphics tool list → **YES** ✅
4. Calls `enhancedGraphics.getHotbarToolIcon('crafted_grappling_hook', '❓')`
5. EnhancedGraphics checks textureAliases → maps to `'grapple'`
6. Loads image from `art/tools/grapple.png`
7. Creates HTML image tag with proper sizing for hotbar (16x16px)
8. Returns formatted icon HTML

### Why Two Aliases?
- `grappling_hook` - For when item is directly added (testing, commands, etc.)
- `crafted_grappling_hook` - For when crafted at Tool Bench (normal gameplay)

Both point to the same physical file: `grapple.png`

## Verification
The icon should now display correctly in:
- ✅ Hotbar slots (16x16 pixels)
- ✅ Backpack inventory (20x20 pixels)
- ✅ Status messages (24x24 pixels)
- ✅ Tool Bench crafting UI (28x28 pixels)

## File Locations
- Asset file: `/assets/art/tools/grapple.png` ✅
- Code check: `VoxelWorld.js` line ~2225
- Alias map: `EnhancedGraphics.js` line ~47
- Icon definitions: `CompanionCodex.js` line 59, 66

## Future Tool Icons
To add new tool icons, you need:

1. **Place PNG file** in `/assets/art/tools/`
2. **Add to tool list** in VoxelWorld.js `getItemIcon()` function
3. **Add texture alias** (if code name ≠ filename) in EnhancedGraphics.js
4. **Define in CompanionCodex** (if used for companion stats)

Example for a new "magic_wand" tool with file "wand.png":

```javascript
// VoxelWorld.js - line ~2225
if (['machete', ..., 'magic_wand'].includes(itemType)) {

// EnhancedGraphics.js - line ~47
this.textureAliases = {
    ...,
    magic_wand: 'wand'  // Code uses magic_wand, file is wand.png
};
```
