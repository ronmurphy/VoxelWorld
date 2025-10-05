# 🏛️ Structure Generator System

## Overview
The StructureGenerator creates procedurally generated ruins and structures in the VoxelWorld. It generates four sizes of hollow structures with treasure inside.

## Structure Sizes

| Size | Dimensions (W×H×D) | Weight | Description |
|------|-------------------|---------|-------------|
| **Small** | 5×5×5 | 50% | Tiny ruins, single room |
| **Medium** | 9×7×9 | 30% | Medium chambers |
| **Large** | 15×10×15 | 15% | Large ruins with side doors |
| **Colossal** | 25×15×25 | 5% | Massive ancient structures |

## Features

### ✅ Implemented
- **4 size variants** with weighted random selection
- **Hollow interiors** with crumbling walls (10% blocks missing)
- **Partial ceilings** (40% remains for that ruined look)
- **2×2 doorways** for player entry (centered on front, sides for large+)
- **Buried structures** (25% chance, ¾ buried but never below y=1 bedrock)
- **Ground level detection** - structures sit on terrain surface
- **Multi-chunk spanning** - large structures render across chunk boundaries
- **Treasure placement** - `explore_item` and `dead_tree` blocks as placeholder chests
- **Block variety** - Stone (70%), dirt (20%), grass/biome (10%) for weathered appearance
- **Deterministic generation** - Same seed always produces same structures

### 🔄 Future Expansion Ready
- **Biome-specific blocks** - Desert sandstone ruins, mountain stone temples
- **More block types** - When you add mossy stone, cracked blocks, etc.
- **Interior furniture** - When you have tables, chairs, decorations
- **Custom templates** - Maze layouts, colosseum designs, specific room patterns

## Current Block Palette
- **Walls**: Stone (primary), dirt, grass
- **Floor**: Dirt
- **Treasure**: `explore_item` or `dead_tree` (holds random items)

## Frequency Tuning
- `STRUCTURE_FREQUENCY = 0.008` (0.8% of chunks)
- `MIN_STRUCTURE_DISTANCE = 80 blocks` minimum between structures
- Tuned for "exciting to find, not littered"

## Integration

### BiomeWorldGen Changes (Minimal!)
```javascript
// 1. Import added (line 2)
import { StructureGenerator } from './StructureGenerator.js';

// 2. Constructor initialization (line 32)
this.structureGenerator = new StructureGenerator(this.worldSeed);

// 3. Single method call in generateChunk() after decorations (line 1260)
this.structureGenerator.generateStructuresForChunk(
    chunkX,
    chunkZ,
    addBlockFn,
    (x, z) => this.findGroundHeight(x, z),
    biome.name
);
```

**That's it!** No cache modifications, no worker changes, completely isolated system.

## How It Works

### 1. Deterministic Placement
- Each chunk coordinates hashed with seed
- Noise value determines if structure spawns
- Same coordinates + seed = same structure every time

### 2. Size Selection
- Weighted random based on noise
- Small (50%) > Medium (30%) > Large (15%) > Colossal (5%)

### 3. Ground Detection
- Uses `findGroundHeight()` from BiomeWorldGen
- Structure base placed at terrain surface
- Buried structures go down ¾ of height (but never below y=1)

### 4. Multi-Chunk Coordination
- Each chunk checks nearby chunks for overlapping structures
- Structures render complete even when spanning 2-4 chunks
- No duplication, perfect seams

### 5. Interior Details
- Small: 1 treasure
- Medium: 2 treasures
- Large: 3 treasures
- Colossal: 4 treasures
- Alternates `explore_item` and `dead_tree`

## Testing Checklist
- [ ] Structures spawn at expected frequency
- [ ] Ground level detection works correctly
- [ ] Buried structures stay above y=1
- [ ] Doorways are passable (2×2)
- [ ] Treasures appear inside
- [ ] Multi-chunk structures render complete
- [ ] No duplicate structures
- [ ] Ruins look appropriately weathered

## Future Enhancements (When Ready)

### Add Sandstone (Desert Biome)
```javascript
// In BIOME_BLOCKS
desert: ['sandstone', 'sand', 'stone', 'dirt']
```

### Add Mossy Blocks
```javascript
// In getBlockType()
if (noise < 0.5) return 'stone';
if (noise < 0.7) return 'mossy_stone';
if (noise < 0.9) return 'dirt';
```

### Add Interior Furniture
```javascript
// In addInteriorDetails()
addBlockFn(x, y, z, 'table', false);
addBlockFn(x, y, z, 'chair', false);
```

### Custom Templates
```javascript
generateMaze(worldX, worldZ, size, ...);
generateColosseum(worldX, worldZ, size, ...);
generateTemple(worldX, worldZ, size, ...);
```

## Performance
- Minimal overhead - only calculates for chunks that might have structures
- No extra cache or storage needed
- Leverages existing BiomeWorldGen ground detection
- Multi-chunk check only looks at 24 neighbors (5×5 grid minus center)

## Notes
- **No breaking changes** to existing systems
- **Completely modular** - can be disabled by commenting out 3 lines
- **Seed-based** - structures stay consistent across game sessions
- **Expandable** - easy to add new structure types and blocks later
