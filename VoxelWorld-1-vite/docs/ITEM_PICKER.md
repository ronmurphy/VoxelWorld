# 🎯 ItemPicker Component

## Overview
Compact, reusable item selection component for Sargem Quest Editor.

## Features
- ✅ **Singleton Pattern** - One instance, shared across app
- ✅ **Memory Efficient** - Event delegation, proper cleanup
- ✅ **Searchable** - Filter items by name/ID (300ms debounce)
- ✅ **Categorized** - Tools, Food, Materials, World Items, Blocks, Seeds
- ✅ **Collapsible** - Categories expand/collapse for space efficiency
- ✅ **Visual** - Emoji icons + item names
- ✅ **Compact** - Max 600px height, scrollable

## Usage

### In Sargem Quest Editor:
```javascript
import { itemPicker } from './ui/ItemPicker.js';

// Show picker with callback
itemPicker.show(currentItemId, (selectedItem) => {
    console.log('Selected:', selectedItem);
    // { id: 'pickaxe', name: 'Pickaxe', emoji: '⛏️' }
});
```

### Currently Used In:
- **Item Node** → Choose item for give/take/check actions
- **Condition Node** → Choose item when checkType is 'hasItem'

## Item Categories

### Tools (8 items)
⛏️ Pickaxe, 🪓 Axe, 🏔️ Shovel, 🔪 Machete, 🎣 Fishing Rod, 🏹 Bow, ⚔️ Sword, 🔨 Hammer

### Food (13 items)
🍞 Bread, 🍯 Honey, 🐟 Fish, 🍣 Cooked Fish, 🫐 Berry, 🍎 Apple, 🥕 Carrot, 🌾 Wheat, 🌽 Corn, 🎃 Pumpkin, 🍯 Honey Bread, 🍲 Super Stew, 🍫 Energy Bar

### Materials (9 items)
🪵 Wood, 🪨 Stone, ⚙️ Iron, 🏆 Gold, 🦴 Stick, 🧵 String, 🪶 Feather, 🦴 Bone, 👜 Leather

### World Items (6 items)
🔦 Torch, 🔥 Campfire, 💡 Light Orb, 📦 Chest, 🚪 Door, 🪜 Ladder

### Blocks (6 items)
🟫 Dirt, 🟩 Grass, 🟨 Sand, ⬜ Gravel, 🧱 Clay, ⬜ Snow

### Seeds (5 items)
🌾 Wheat Seeds, 🥕 Carrot Seeds, 🫐 Berry Seeds, 🎃 Pumpkin Seeds, 🌽 Corn Seeds

## Memory Management

### Singleton Pattern:
```javascript
export class ItemPicker {
    constructor() {
        if (ItemPicker.instance) {
            return ItemPicker.instance; // Reuse existing
        }
        ItemPicker.instance = this;
    }
}
```

### Cleanup on Hide:
```javascript
hide() {
    if (this.overlay) {
        this.overlay.remove();  // Remove DOM
        this.overlay = null;     // Clear reference
    }
    this.currentCallback = null; // Clear callback
    this.expandedCategories.clear(); // Reset state
}
```

### Event Delegation:
- Single click listener on container
- Uses `data-item-id` and `data-category` attributes
- No individual item listeners (prevents memory leaks)

## UI States

### Collapsed (Default):
```
┌───────────────────────┐
│ 📦 Choose Item...    │
└───────────────────────┘
```

### Picker Open:
```
┌────────────────────────────┐
│ 🎯 Select Item         ✕  │
├────────────────────────────┤
│ 🔍 [Search items...]       │
├────────────────────────────┤
│ ⚒️  Tools          ▶ 8    │
│ 🍎 Food           ▼ 13    │
│   🍞 Bread                 │
│   🍯 Honey                 │
│   🐟 Fish                  │
│ 🪨 Materials       ▶ 9    │
│ 🌍 World Items     ▶ 6    │
└────────────────────────────┘
```

### Search Active:
```
┌────────────────────────────┐
│ 🔍 [pick____________]      │
├────────────────────────────┤
│ ⚒️  Tools          ▼ 1    │
│   ⛏️  Pickaxe      ✓       │
└────────────────────────────┘
```

## Future Enhancements

### Phase 2 (Optional):
- [ ] Virtual scrolling (if >100 items)
- [ ] Recent items shortcut
- [ ] Favorite/pinned items
- [ ] Item images (PNG) alongside emoji
- [ ] Multi-select mode (for recipes)

### Integration Ideas:
- [ ] Use in WorkbenchSystem material picker
- [ ] Use in KitchenBenchSystem ingredient picker
- [ ] Use in ToolBenchSystem blueprint materials

## Performance

- **Items Cached** - Built once on init (47 items total)
- **Search Debounced** - 300ms delay prevents lag
- **Lazy Rendering** - Categories only render when expanded
- **Memory Footprint** - ~5KB (items list + minimal state)

## Testing

### To Test in Sargem:
1. Open Sargem Quest Editor
2. Add Item node
3. Click "Choose Item..." button
4. Search/browse/select
5. Verify selection updates node
6. Repeat - should reuse same picker instance

### To Test Cleanup:
```javascript
// In browser console:
window.itemPickerTest = () => {
    console.log('Picker instance:', window.ItemPicker?.instance);
    // Should show same instance each time
};
```
