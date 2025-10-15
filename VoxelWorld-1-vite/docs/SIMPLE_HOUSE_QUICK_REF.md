# Simple House - Quick Reference

## TL;DR

The Simple House is now built with **actual voxel blocks** (like Minecraft), not 3D meshes!

---

## How to Build

1. **Open Workbench** (E key)
2. **Select Materials**: Wood + Stone
3. **Choose Plan**: 🏠 Simple House
4. **Set Size**: 4×4×4 minimum (interior dimensions)
5. **Craft & Place**: Door faces you automatically!

---

## Key Features

✅ Built with real game blocks  
✅ Sloped roof design (tall → short)  
✅ Hollow interior (walkable)  
✅ Auto door placement (faces player)  
✅ Wood walls, stone floor/roof  
✅ 2×2 entrance

---

## Material Cost Formula

```
Cost = Length × Width × Height × 2
```

**Examples:**
- 4×4×4 = 128 blocks
- 6×6×5 = 360 blocks
- 8×8×6 = 768 blocks

---

## Dimensions

**User Input = Interior Space** (walkable area)

| Interior | Total Structure | Blocks Used |
|----------|-----------------|-------------|
| 4×4×4    | 6×6×6          | ~96         |
| 6×6×5    | 8×8×7          | ~224        |
| 8×10×6   | 10×12×8        | ~480        |

---

## Debug Commands

```javascript
giveItem("simple_house")  // Gives house with 4×4×4 defaults
```

---

## Technical Details

### Architecture
- **Floor**: Stone perimeter (hollow)
- **Walls**: Wood (1 block thick)
- **Roof**: Stone sloped at 45°
- **Door**: 2×2 cutout on player-facing side

### Code Location
- **Generation**: `StructureGenerator.js` (lines 623-762)
- **Integration**: `VoxelWorld.js` (lines 609-645)
- **UI Config**: `WorkbenchSystem.js` (lines 151-158)

---

## Door Placement

```
Player Position → Auto Door Side

North of house → Door on NORTH wall
South of house → Door on SOUTH wall
East of house  → Door on EAST wall
West of house  → Door on WEST wall
```

---

## Sloped Roof Design

```
     /\      ← Roof slopes 45°
    /  \
   /    \
  |  🚪  |   ← Door (player-facing)
  |______|   ← Stone floor
```

Front wall: Height H  
Back wall: Height H+2  
Roof: Connects at angle

---

## Why Voxel Blocks?

### Old System (Meshes)
❌ Complex THREE.js code  
❌ Separate collision setup  
❌ Inconsistent with world  
❌ Hard to modify

### New System (Voxels)
✅ Real game blocks  
✅ Auto collision  
✅ Matches terrain/ruins  
✅ Easy to extend

---

## Full Documentation

See: `/docs/VOXEL_HOUSE_SYSTEM.md`

---

## Common Issues

**House too small?**
- Minimum: 4×4×4 interior
- Workbench auto-sets this on selection

**Door on wrong side?**
- Stand where you want the door
- Place house while facing that direction

**Not enough materials?**
- Check cost formula: L×W×H×2
- Gather more wood/stone blocks

---

## Future Ideas

🔮 Multi-story houses  
🔮 Window cutouts (glass blocks)  
🔮 Interior furniture  
🔮 Different roof styles  
🔮 Material variations  
🔮 Size presets (shelter → mansion)
