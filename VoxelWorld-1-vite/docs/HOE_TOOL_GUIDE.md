# 🌾 Hoe Tool Usage Guide

## Overview
The **hoe** is a farming tool that works from the **player bar** (right sidebar) - just like the machete and other "always on" tools.

## How It Works

### **Equipment Slot (Player Bar)**
- Place the hoe in one of the **3 equipment slots** on the right side of the hotbar
- The hoe is now "always active" - no need to select it
- It works automatically when you target tillable blocks

### **Tilling Soil**
1. **Equip the hoe** in your player bar (right sidebar slots)
2. **Look at grass or dirt** blocks
3. **Left-click QUICKLY** - instant tilling (no harvest delay!)
4. Block converts to **tilled_soil** (brown farmland)

⚠️ **Important:** 
- **Quick tap = Till** (instant action)
- **Hold = Harvest** (breaks the block after timer)
- Must have **air above** the block to till

## Crafting
**ToolBench Recipe:**
- 2 wood + 1 stick = hoe

## Debug Commands
```javascript
giveItem('hoe')              // Get a hoe
giveItem('wheat_seeds', 10)  // Get seeds to plant
```

## Integration with Other Systems

### Works With:
- ✅ **Equipment slots** (player bar) - "always on" mode
- ✅ **Instant tilling** - no harvest timer
- ✅ **Farming system** - integrates with seed planting

### Doesn't Work:
- ❌ Cannot be placed as a block (it's a tool)
- ❌ Cannot till from hotbar slots (must be in equipment/player bar)
- ❌ No right-click action (left-click only)

## Comparison: Machete vs Hoe

| Feature | Machete | Hoe |
|---------|---------|-----|
| **Location** | Equipment slots (player bar) | Equipment slots (player bar) |
| **Action** | Harvest leaves instantly | Till grass/dirt instantly |
| **Click** | Left-click (always active) | Left-click (always active) |
| **Effect** | Collects leaves | Converts to tilled_soil |

## Farming Workflow

1. **Craft hoe** (2 wood + 1 stick)
2. **Place in equipment slot** (right sidebar)
3. **Find grass or dirt**
4. **Quick left-click** to till
5. **Switch to seeds** in hotbar
6. **Right-click tilled soil** to plant
7. **Wait for crops to grow**
8. **Harvest when mature!** 🌾

---
**Last Updated:** Farming System v1.0
