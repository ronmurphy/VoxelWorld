# 🔧 Debug Command: makeRuins()

## Quick Start
Open browser console (F12) and type:

```javascript
makeRuins("small")    // Small 5x5x5 ruin
makeRuins("medium")   // Medium 9x9x7 ruin
makeRuins("large")    // Large 15x15x10 ruin
makeRuins("colossal") // Colossal 25x25x25 ruin
```

## What It Does
- Generates a test ruin **near your current position**
- Places it 15-25 blocks in front of you (positive Z direction)
- Random offset of ±5 blocks left/right for variety
- Always places on surface (never buried for easy testing)
- Logs coordinates to console so you know where to look

## Example Output
```
🏛️ Generating medium ruin at (123, ?, 456) near player at (120, 10, 440)
✅ medium ruin generated! Look around position (123, 456)
```

## Testing Tips

### 1. Test All Sizes
```javascript
makeRuins("small")
makeRuins("medium")
makeRuins("large")
makeRuins("colossal")
```

### 2. Test Multiple Ruins
Just call the command multiple times - each generates in a slightly different spot.

### 3. Check Features
- **Doorways**: Should be 2×2 blocks wide (passable)
- **Hollow interior**: Walk inside, should be empty
- **Crumbling walls**: ~10% of wall blocks missing
- **Partial ceiling**: Only ~40% remains
- **Treasure**: Look for `explore_item` or `dead_tree` blocks inside
- **Block variety**: Mix of stone (70%), dirt (20%), grass (10%)

### 4. Visual Inspection
- Ruins should look weathered/ancient
- Walls should have gaps
- Ceiling should be partially collapsed
- Interior should be accessible through doorway

### 5. Compare to Natural Generation
Natural ruins (from the procedural system):
- Spawn at ~0.8% chunk frequency
- Can be buried ¾ deep (but debug command doesn't bury)
- Same structure quality as debug-spawned ones

## Debug vs Production

| Feature | Debug Command | Natural Generation |
|---------|--------------|-------------------|
| Location | Near player | Procedural placement |
| Burial | Never buried | 25% chance ¾ buried |
| Frequency | On demand | ~0.8% of chunks |
| Purpose | Testing | Gameplay |

## Troubleshooting

**❌ "Structure generator not available"**
- Make sure the world has loaded
- BiomeWorldGen must be initialized

**Can't find the ruin:**
- Check console for coordinates
- Look 15-25 blocks in positive Z direction
- It's on the surface, not underground

**Ruin looks wrong:**
- Small ruins are 5×5, might be hard to spot
- Try a larger size: `makeRuins("colossal")`
- Check if you're standing inside it

## Related Commands

```javascript
giveItem("stone_hammer")     // Get tools
giveBlock("stone", 64)       // Get blocks
makeRuins("medium")          // Generate test ruin
```

## Technical Details

The debug command:
1. Gets your current position (x, y, z)
2. Calculates spawn point 15-25 blocks away
3. Calls `StructureGenerator.debugGenerateRuin()`
4. Uses same generation code as natural ruins
5. Forces `buried = false` for easy testing
6. Logs everything to console

This ensures debug ruins are **identical** to naturally generated ones, just positioned conveniently for testing!
