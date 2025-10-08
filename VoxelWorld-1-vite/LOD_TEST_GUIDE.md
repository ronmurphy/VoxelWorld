# 🎨 LOD System Test Guide - Visual Horizon Beta

## Overview
This is a **lightweight test version** of the Level of Detail (LOD) system that extends visual range beyond interactive chunks using simplified colored blocks.

## How It Works

### Architecture
1. **Tier 0 (Interactive)**: Full detail chunks within `renderDistance` - normal gameplay
2. **Tier 1 (Visual LOD)**: Simplified colored blocks from `renderDistance + 1` to `visualDistance` 
3. **Fog Coverage**: Soft fog covers the transition to hide LOD simplification

### Data Source
- **Primary**: Uses existing chunk data from ModificationTracker (IndexedDB cache)
- **Fallback**: Generates simple biome-colored surface blocks if no cache exists

### Performance Strategy
- **InstancedMesh**: One mesh per color, many block instances (efficient!)
- **Frustum Culling**: Only renders chunks in camera view
- **Simple Geometry**: BoxGeometry without textures (minimal GPU load)

## Testing Instructions

### 1. Start the Game
```bash
npm run dev
# or
npm start
```

### 2. Open Browser Console
Press `F12` or `Ctrl+Shift+I` (Chrome/Firefox)

### 3. Test Commands

#### Enable/Disable LOD System
```javascript
voxelWorld.toggleLOD()
// Returns: true (enabled) or false (disabled)
```

#### Set Visual Distance
```javascript
// Example: Render LOD chunks 3 chunks beyond renderDistance
voxelWorld.setVisualDistance(3)

// With renderDistance = 1:
// - Interactive chunks: 0-8 blocks (1 chunk × 8 blocks)
// - LOD chunks: 8-32 blocks (4 chunks × 8 blocks)
// - Fog: 16-32 blocks (covers transition)
```

#### Get Performance Stats
```javascript
voxelWorld.getLODStats()
```

**Example Output:**
```
┌─────────────────────┬────────┐
│ (index)             │ Values │
├─────────────────────┼────────┤
│ lodChunksActive     │ 24     │
│ blocksRendered      │ 1536   │
│ instancedMeshes     │ 8      │
│ culledChunks        │ 12     │
│ visualDistance      │ 3      │
│ enabled             │ true   │
└─────────────────────┴────────┘
```

### 4. Recommended Test Scenarios

#### Test A: Minimal Setup (Low-End GPU)
```javascript
// Set render distance to 1 (8 blocks)
voxelWorld.renderDistance = 1
voxelWorld.updateChunks()

// Enable LOD with visual distance 2 (16 blocks beyond)
voxelWorld.setVisualDistance(2)
voxelWorld.toggleLOD() // Enable

// Result: Interactive 8 blocks, Visual 24 blocks total
```

#### Test B: Moderate Setup (Mid-Range GPU)
```javascript
// Set render distance to 2 (16 blocks)
voxelWorld.renderDistance = 2
voxelWorld.updateChunks()

// Enable LOD with visual distance 3 (24 blocks beyond)
voxelWorld.setVisualDistance(3)

// Result: Interactive 16 blocks, Visual 40 blocks total
```

#### Test C: Performance Test
```javascript
// Start with LOD disabled
voxelWorld.toggleLOD() // Disable
// Note FPS

// Enable LOD
voxelWorld.toggleLOD() // Enable
voxelWorld.setVisualDistance(3)
// Compare FPS - should be minimal difference!
```

## Visual Indicators

### What You Should See
1. **Near chunks (interactive)**: Full detail with textures
2. **Distant chunks (LOD)**: Simplified colored blocks (no textures)
3. **Fog**: Gradually fades distant LOD chunks for smooth transition

### Fog Settings
- **Soft Fog** (default): Gradual fade from `renderDistance + 1` to `visualDistance`
- **Hard Fog** (Silent Hill mode): Sharp cutoff at `renderDistance`

To test fog:
```javascript
// Switch to soft fog (recommended for LOD)
voxelWorld.toggleHardFog(false)

// Switch to hard fog (blocks LOD visibility)
voxelWorld.toggleHardFog(true)
```

## Expected Performance

### Target Metrics
- **Low-End GPU**: renderDistance=1, visualDistance=2 → 30+ FPS
- **Mid-Range GPU**: renderDistance=2, visualDistance=3 → 60 FPS
- **High-End GPU**: renderDistance=3, visualDistance=5 → 60+ FPS

### Key Performance Factors
1. **InstancedMesh**: Reduces draw calls dramatically (1 per color vs 1000s)
2. **Frustum Culling**: Only renders visible chunks (saves 50%+ GPU)
3. **Simple Materials**: No textures = faster rendering
4. **Cached Data**: No generation cost for visited chunks

## Known Limitations (Test Version)

### Current Issues
1. **No Occlusion Culling**: Renders all chunks in frustum (even behind mountains)
2. **No Tier 2 LOD**: Only has Tier 0 (full) and Tier 1 (simple), no billboards yet
3. **Cache-Dependent**: LOD quality depends on visited chunks
4. **Manual Commands**: No in-game UI for LOD control

### Future Enhancements (Not in Test)
- [ ] Occlusion culling (hide chunks behind terrain)
- [ ] Tier 2 LOD (billboards for very distant chunks)
- [ ] Real-time LOD settings UI
- [ ] Adaptive LOD based on FPS
- [ ] Better cache integration with worker system

## Debugging Tips

### Issue: LOD chunks not appearing
```javascript
// Check if LOD is enabled
voxelWorld.getLODStats()

// Try toggling
voxelWorld.toggleLOD() // Disable
voxelWorld.toggleLOD() // Enable

// Check visual distance
voxelWorld.setVisualDistance(3)
```

### Issue: Low FPS with LOD
```javascript
// Reduce visual distance
voxelWorld.setVisualDistance(1) // Minimal

// Check stats
voxelWorld.getLODStats()
// Look for high instancedMeshes count

// Try disabling LOD
voxelWorld.toggleLOD()
```

### Issue: Can't see LOD chunks (fog too thick)
```javascript
// Switch to soft fog
voxelWorld.toggleHardFog(false)

// Increase visual distance
voxelWorld.setVisualDistance(4)
```

## Success Criteria

### ✅ Test Passes If:
1. FPS remains stable with LOD enabled (within 5 FPS of disabled)
2. Distant chunks visible beyond fog (colored blocks)
3. Smooth transition between interactive and LOD chunks
4. No visual glitches or flickering

### ❌ Test Fails If:
1. FPS drops more than 10 FPS with LOD enabled
2. Memory usage spikes (check DevTools Memory tab)
3. Chunks pop in/out visibly
4. LOD chunks conflict with interactive chunks

## Next Steps After Testing

### If Successful:
1. Add occlusion culling for further optimization
2. Implement Tier 2 LOD (billboards)
3. Create in-game LOD settings UI
4. Integrate with benchmark system for auto-tuning

### If Issues Found:
1. Adjust instance batch sizes
2. Implement chunk priority system
3. Add LOD fade-in animations
4. Optimize geometry pooling

## Report Findings
When reporting test results, include:
- GPU model
- Render distance used
- Visual distance used
- FPS before/after LOD
- Screenshot of visual quality
- Any console errors
