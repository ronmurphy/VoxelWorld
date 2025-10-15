# Voxel-Based Simple House System

**Implementation Date:** October 15, 2025  
**Status:** ✅ Fully Implemented

---

## Overview

The Simple House system has been completely redesigned to use **actual voxel blocks** instead of THREE.js mesh objects. This revolutionary approach provides better world integration, proper collision detection, and a more authentic block-building experience similar to Minecraft.

### Key Benefits

1. **True Voxel Integration**: Houses are built with the same blocks used in terrain generation
2. **Proper Physics**: Full collision detection and physics interactions
3. **Better Code Organization**: Structure generation consolidated in StructureGenerator.js
4. **Smaller Codebase**: Removed 200+ lines of THREE.js mesh creation code
5. **Expandable Architecture**: Easy to add new structure types using the same system

---

## Architecture

### Design Specifications

**Minimum Dimensions:** 4×4×4 interior (walkable space)

**Structure Components:**
- **Foundation**: Stone blocks forming the floor perimeter
- **Walls**: Wood blocks (1 block thick) with player-facing door
- **Roof**: Stone blocks in sloped design (opposite wall is taller)
- **Door**: 2×2 cutout automatically placed on side closest to player

### Sloped Roof Design

The house features an innovative sloped roof:
- **Front wall** (with door): Standard height (H)
- **Back wall** (opposite door): Height + 2 blocks (H+2)
- **Roof blocks**: Connect at 45° angle from tall to short wall
- **Result**: Classic house silhouette with angled roof

```
Side View:
    /\        <- Sloped roof (stone)
   /  \
  /    \
 |  🚪  |     <- Door on player-facing side
 |______|     <- Stone floor
```

---

## Implementation Details

### File Structure

#### 1. **StructureGenerator.js** (Lines 623-762)

**Method:** `generateHouse(worldX, worldZ, interiorLength, interiorWidth, interiorHeight, wallMaterial, floorMaterial, doorSide, addBlockFn, getHeightFn)`

**Parameters:**
- `worldX, worldZ`: Center position in world coordinates
- `interiorLength, interiorWidth, interiorHeight`: Walkable interior dimensions
- `wallMaterial`: Wood type for walls (oak, birch, pine, etc.)
- `floorMaterial`: Block type for floor/roof (typically 'stone')
- `doorSide`: 'north', 'south', 'east', or 'west' (calculated by player position)
- `addBlockFn`: Callback to place blocks in world
- `getHeightFn`: Function to get ground height at position

**Construction Logic:**
```javascript
// Calculate total dimensions (interior + walls)
const totalLength = interiorLength + 2;
const totalWidth = interiorWidth + 2;

// Build layers from bottom to top:
// 1. Stone floor (edges only - hollow interior)
// 2. Wood walls with door cutout
// 3. Sloped stone roof
```

#### 2. **VoxelWorld.js** (Lines 609-645)

**Integration Code:**
```javascript
case 'simple_house':
    // Validate minimum dimensions
    if (dimensions.length < 4 || dimensions.width < 4 || dimensions.height < 4) {
        console.error(`❌ Simple House requires minimum 4x4x4`);
        return;
    }

    // Calculate door placement
    const doorSide = this.getClosestSideToPlayer(x, z);

    // Build with StructureGenerator
    this.biomeWorldGen.structureGenerator.generateHouse(
        x, z,
        dimensions.length,  // Interior length
        dimensions.width,   // Interior width  
        dimensions.height,  // Interior height
        material,           // Wall material
        'stone',           // Floor/roof material
        doorSide,          // Door placement
        this.addBlock.bind(this),
        (wx, wz) => this.getGroundHeight(wx, wz)
    );

    // Consume materials
    const materialCost = dimensions.length * dimensions.width * dimensions.height * 2;
    this.inventory.removeFromInventory(material, materialCost);
    
    return; // Exit early - no mesh creation
```

#### 3. **WorkbenchSystem.js** (Lines 151-158, 1213-1231)

**Plan Configuration:**
```javascript
house: {
    name: '🏠 Simple House',
    materials: { wood: 25, stone: 5 },
    description: 'A basic dwelling structure (min 4x4x4, door faces player)',
    shapes: [
        { type: 'simple_house', position: { x: 0, y: 0, z: 0 }, size: { x: 4, y: 4, z: 4 } }
    ]
}
```

**Auto-Dimension Logic:**
```javascript
// When simple_house selected, auto-set to minimum dimensions
if (this.selectedPlan === 'house') {
    this.shapeLength = 4;
    this.shapeWidth = 4;
    this.shapeHeight = 4;
    // Update slider UI
    console.log('🏠 Auto-set house to minimum 4×4×4 interior dimensions');
}
```

---

## Helper Functions

### getClosestSideToPlayer(buildingX, buildingZ)

**Location:** VoxelWorld.js (Lines 533-551)

**Purpose:** Determines which wall should have the door based on player position

**Logic:**
```javascript
const dx = playerPos.x - buildingX;
const dz = playerPos.z - buildingZ;

if (Math.abs(dx) > Math.abs(dz)) {
    return dx > 0 ? 'east' : 'west';
} else {
    return dz > 0 ? 'south' : 'north';
}
```

**Returns:** `'north' | 'south' | 'east' | 'west'`

---

## Usage Guide

### Crafting a House

1. **Open Workbench** (E key)
2. **Select Materials**: Click wood and stone from inventory
3. **Choose Plan**: Select "🏠 Simple House" from right panel
4. **Adjust Dimensions** (optional):
   - Length slider: 4-20 blocks
   - Width slider: 4-20 blocks  
   - Height slider: 4-20 blocks
   - Note: These are **interior** dimensions (walkable space)
5. **Craft**: Click craft button, name your house
6. **Place**: Select from hotbar, click to place in world

### Door Placement

The door automatically faces the side **closest to the player** when placing:
- Stand on the side where you want the entrance
- Place the house
- Door will be cut out on the wall nearest you

### Material Costs

**Formula:** `Interior Length × Interior Width × Interior Height × 2`

**Examples:**
- 4×4×4 house = 4 × 4 × 4 × 2 = **128 blocks**
- 6×6×5 house = 6 × 6 × 5 × 2 = **360 blocks**
- 8×10×6 house = 8 × 10 × 6 × 2 = **960 blocks**

### Using giveItem()

Debug command support with default dimensions:

```javascript
// Console command
giveItem("simple_house")
// Auto-converts to: crafted_simple_house
// Default metadata: 4×4×4 interior, oak wood, brown color
```

---

## Technical Architecture

### Block Placement Strategy

**Floor Layer:**
```javascript
// Only place stones on perimeter (hollow interior)
for (let dx = 0; dx < totalLength; dx++) {
    for (let dz = 0; dz < totalWidth; dz++) {
        if (dx === 0 || dx === totalLength - 1 || 
            dz === 0 || dz === totalWidth - 1) {
            addBlockFn(worldX + dx, groundY, worldZ + dz, floorMaterial, true);
        }
    }
}
```

**Wall Layer with Door:**
```javascript
// 2×2 door cutout centered on player-facing wall
const isDoorBlock = (side === doorSide) && 
    (dx === doorDx || dx === doorDx + 1) && 
    (dy === 0 || dy === 1);

if (!isDoorBlock) {
    addBlockFn(x, y, z, wallMaterial, true);
}
```

**Sloped Roof:**
```javascript
// Front wall height: interiorHeight
// Back wall height: interiorHeight + 2
// Roof slopes between them at 45°

for (let step = 0; step <= interiorHeight + 2; step++) {
    const roofY = groundY + 1 + step;
    const progressRatio = step / (interiorHeight + 2);
    
    // Calculate roof span based on progress
    const currentSpan = Math.floor(totalWidth * (1 - progressRatio));
    
    // Place roof blocks
    for (let dz = centerZ - halfSpan; dz <= centerZ + halfSpan; dz++) {
        addBlockFn(worldX, roofY, worldZ + dz, floorMaterial, true);
    }
}
```

### Coordinate System

**Interior Space Mapping:**
```
User specifies: 4×4×4 (length × width × height)
                 ↓
Total structure: 6×6×6 (adds 1 block walls on all sides)
                 ↓
Floor:  6×6 perimeter at groundY
Walls:  6×6 hollow frame from groundY+1 to groundY+4
Roof:   6×6 sloped from groundY+5 to groundY+7
Door:   2×2 cutout at groundY+1 and groundY+2
```

---

## Comparison: Old vs New System

### Old System (THREE.js Meshes)

**Problems:**
- ❌ Used THREE.js Group with separate wall/floor/ceiling meshes
- ❌ ~200 lines of mesh creation code in VoxelWorld.js
- ❌ Inconsistent with voxel world (not real blocks)
- ❌ Complex collision detection setup
- ❌ Difficult to modify or extend
- ❌ Code scattered across multiple locations

### New System (Voxel Blocks)

**Advantages:**
- ✅ Uses actual game blocks via addBlock()
- ✅ Simple function call to StructureGenerator
- ✅ Consistent with terrain/ruins generation
- ✅ Automatic collision via existing block physics
- ✅ Easy to add new structure types
- ✅ Centralized in StructureGenerator.js

---

## Future Enhancements

### Potential Additions

1. **Multi-Story Houses**
   - Add staircase blocks between floors
   - Interior floor platforms
   - Multiple door entrances

2. **Window Cutouts**
   - Glass block windows on sides
   - Configurable window placement
   - Shutters or decorative frames

3. **Interior Furnishing**
   - Auto-place crafting table inside
   - Bed placement option
   - Chest/storage integration

4. **Roof Variations**
   - Flat roof option
   - Pyramid roof
   - Hip roof design
   - Chimney addon

5. **Material Variations**
   - Stone houses (castle-style)
   - Mixed materials (stone base, wood upper)
   - Decorative block options
   - Custom color tinting

6. **Size Presets**
   - Small (4×4×4): Shelter
   - Medium (6×6×5): House
   - Large (10×10×6): Manor
   - Huge (16×16×8): Mansion

---

## Debugging

### Console Logs

**House Generation:**
```
🚪 Door will be on south side (closest to player)
🏠 Built house with 4×4×4 interior!
✅ House placed using 128 oak_wood blocks
```

**Error Handling:**
```
❌ Simple House requires minimum 4x4x4 dimensions (got 3x3x2)
⚠️ Simple House needs at least 4x4x4 size!
❌ StructureGenerator not available
```

### Validation Checks

**Dimension Validation:**
```javascript
if (dimensions.length < 4 || dimensions.width < 4 || dimensions.height < 4) {
    console.error(`❌ Minimum 4×4×4 required`);
    this.updateStatus(`⚠️ House too small!`, 'error');
    return; // Cancel placement
}
```

**StructureGenerator Availability:**
```javascript
if (this.biomeWorldGen && this.biomeWorldGen.structureGenerator) {
    // Proceed with house generation
} else {
    console.error('❌ StructureGenerator not available');
}
```

---

## Related Systems

### Dependencies

- **BiomeWorldGen.js**: Provides StructureGenerator instance
- **StructureGenerator.js**: Core house generation logic
- **VoxelWorld.js**: Block placement and world integration
- **WorkbenchSystem.js**: Crafting UI and dimension controls
- **Inventory.js**: Material consumption and item management

### Similar Systems

- **Ruins Generation**: Uses same voxel block approach
- **Tree Generation**: Similar structure building pattern
- **Terrain Generation**: Shared block placement methodology

---

## Migration Notes

### Breaking Changes

- Simple houses crafted with **old system will still work** (backward compatible)
- New houses use voxel blocks instead of meshes
- Door placement now **automatic** based on player position
- Interior dimensions now match **actual walkable space**

### Code Cleanup

**Removed from VoxelWorld.js:**
- ~200 lines of THREE.js Group mesh creation
- Complex wall/floor/ceiling geometry code
- Manual collision body setup
- Mesh material creation logic

**Added to StructureGenerator.js:**
- Single `generateHouse()` method (140 lines)
- Reusable for other structure types
- Consistent with existing ruins generation

---

## Performance Considerations

### Block Count

**Structure Size Impact:**
- 4×4×4 house ≈ 96 blocks total
- 8×8×6 house ≈ 320 blocks total
- Hollow interior reduces block count significantly

### Optimization

- **Hollow Design**: Only walls/floor/roof have blocks (interior empty)
- **Door Cutout**: Reduces unnecessary blocks
- **Efficient Placement**: Single pass through structure
- **Ground Detection**: Caches height lookups

### World Impact

- Houses integrate with chunk system naturally
- Blocks saved in chunk persistence automatically
- No special rendering or physics needed
- Works with existing LOD and cleanup systems

---

## Credits & History

**Original System:** THREE.js mesh-based houses (pre-October 2025)  
**Redesign:** October 15, 2025 - Voxel block architecture  
**Inspiration:** Minecraft structure generation, ruins system  
**Architecture:** Based on user-provided sloped roof concept sketch

---

## See Also

- [StructureGenerator.js](../src/StructureGenerator.js) - House generation implementation
- [WorkbenchSystem.js](../src/WorkbenchSystem.js) - Crafting interface
- [CHANGELOG2.md](../CHANGELOG2.md) - Development history
- [Chunk Persistence System](./1.CHUNK_PERSISTENCE_SYSTEM.md) - Save/load integration
