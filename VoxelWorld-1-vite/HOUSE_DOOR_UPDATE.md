# 🚪 Simple House - Door Size Update

## ✅ Door Changed: 1×2 → 2×2

### Problem
- Original door: **1 block wide × 2 blocks tall**
- Player hitbox: **0.3 blocks wide × 1.8 blocks tall × 0.3 blocks deep**
- Result: **Very tight fit** - players could get stuck or have difficulty entering

### Options Considered

#### Option 1: Reduce Player Hitbox (NOT recommended)
- Current: 0.3 blocks wide (already reduced from 0.6)
- Smaller would be: 0.2 or 0.1 blocks
- **Issues**:
  - Already very small
  - Might cause clipping through blocks
  - Unrealistic collision
  - Could break other gameplay mechanics

#### Option 2: Make Door 2×2 (CHOSEN) ✅
- New door: **2 blocks wide × 2 blocks tall**
- **Benefits**:
  - Easy to navigate
  - More realistic (real doors are wider than people)
  - Better UX - no getting stuck
  - Keeps player hitbox at reasonable size

### Implementation

**File Modified**: `src/StructureGenerator.js` (line 664-665)

```javascript
// BEFORE:
const doorWidth = 1;   // 1 block wide
const doorHeight = 2;  // 2 blocks tall

// AFTER:
const doorWidth = 2;   // 2 blocks wide ✅
const doorHeight = 2;  // 2 blocks tall
```

### Door Placement Logic

The door is **centered on the wall** that faces the player:

```javascript
// For 4×4 interior house (6×6 exterior):
// Wall is 6 blocks wide
// Door is 2 blocks wide
// Centered: leaves 2 blocks on each side

// For 6×6 interior house (8×8 exterior):
// Wall is 8 blocks wide  
// Door is 2 blocks wide
// Centered: leaves 3 blocks on each side
```

### Visual Comparison

#### 1×2 Door (Old - Tight):
```
Wall: ████████████
Door:     ██
      (1 block)
```

#### 2×2 Door (New - Easy):
```
Wall: ████████████
Door:    ████
     (2 blocks)
```

### Player Hitbox Details

Current dimensions (optimized for 1-block passages):
```javascript
PLAYER_WIDTH = 0.3;   // Reduced from 0.6
PLAYER_HEIGHT = 1.8;  // Standard height
PLAYER_DEPTH = 0.3;   // Reduced from 0.6
```

**With 2×2 door**:
- Door width: 2.0 blocks
- Player width: 0.3 blocks
- **Clearance**: 1.7 blocks on each side! ✅
- **Result**: Plenty of room to navigate

### Testing

**Test the new door**:
1. Build a simple house (any size)
2. Door will be **2 blocks wide × 2 blocks tall**
3. Walk through easily - no getting stuck! ✅

**Compare sizes**:
- **Old 1×2 door**: Player (0.3 wide) fits through 1.0 block opening = **0.7 block clearance total**
- **New 2×2 door**: Player (0.3 wide) fits through 2.0 block opening = **1.7 block clearance total** ✅

### Future Considerations

If we add different house styles, we could offer:
- **Small Door**: 1×2 (tight fit, cottages)
- **Normal Door**: 2×2 (easy fit, default) ✅
- **Large Door**: 3×2 (grand entrance, mansions)
- **Double Door**: 4×2 (barn, warehouse)

For now, all simple houses use the **2×2 easy-access door**.

---

**Status**: ✅ Complete
**Build**: Successful (1.82s)
**Door Size**: 2 blocks wide × 2 blocks tall
**Player Experience**: Easy navigation, no getting stuck!
