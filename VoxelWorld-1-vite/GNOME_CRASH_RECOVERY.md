# GNOME Crash Recovery - Quick Briefing for Claude

## Current Situation (2025-10-09)

GNOME keeps crashing when testing VoxelWorld-1. Suspected causes:
- Memory leaks in the application
- Vite dev server issues
- Electron (VSCode) compatibility issues with GNOME
- Moving around too much/loading too many chunks causes unresponsiveness → crash → login screen after ~30 seconds

## Project Structure

Two project versions exist in `/home/brad/Documents/VoxelWorld-1/`:

1. **VoxelWorld-1-vite/** - Main development (has memory leaks, crashes GNOME)
   - Commit: `02e06f5` (main branch)
   - Features: Silent Hill fog, miniChunks texture system, advanced LOD
   - Problem: Memory leaks, causes GNOME crashes
   - Visual: Smooth fog, seamless chunk loading

2. **VoxelWorld-X/** - Older stable build
   - Commit: `d78e191`
   - Features: Basic LOD with visible chunk boundaries (desirable!)
   - Status: More stable, nice visual chunk loading feedback
   - Visual: Visible chunk LOD system, no fog

## What We Did

Created a new stable branch to test without the problematic features:

```bash
cd /home/brad/Documents/VoxelWorld-1/VoxelWorld-1-vite
git checkout voxelworld-stable  # Branch based on d78e191 (VoxelWorld-X)
```

### Branch: `voxelworld-stable`
- **Based on**: commit `d78e191` (VoxelWorld-X)
- **Goal**: Test if this version is stable without memory leaks
- **Has**: Visual LOD chunk loading, proper geometry disposal
- **Does NOT have**: Fog system, miniChunks, Vite texture plugin, extra rendering managers

## Dev Server Status

Should be running at http://localhost:5173/ (started with `npm run dev`)

If not running:
```bash
cd /home/brad/Documents/VoxelWorld-1/VoxelWorld-1-vite
git checkout voxelworld-stable
npm run dev
```

## Testing Plan

1. **Test voxelworld-stable branch** - Move around aggressively, load chunks
2. **If stable**: This becomes our new base branch
3. **If still crashes**: Need to investigate deeper (possibly hardware/driver issues)
4. **If stable**: Add features back incrementally to identify leak source

## Key Commits to Know

- `d78e191` - VoxelWorld-X base (stable, visible chunk loading)
- `2607976` - "sort of working lod system part 2"
- `ee6c7c6` - miniChunks added
- `091cf51` - "lot of fog"
- `95c318c` - "definitely silent hill fog, ram leak somewhere..." ⚠️
- `02e06f5` - "fix trees from blocking main process" (current main)

## Changes Between d78e191 (stable) and main

```
56 files changed, 2994 insertions(+), 160 deletions(-)
```

Major additions:
- Fog system (SILENT_HILL_FOG.md)
- MiniTextureLoader.js, MiniTextureCache.js
- ChunkRenderManager.js
- LODDebugOverlay.js
- vite-plugin-mini-textures.js
- 44 miniChunk texture images in assets/art/chunkMinis/
- Multiple performance documentation files

## Memory Leak Sources (CONFIRMED & FIXED)

### Fixed in voxelworld-stable branch:

1. **Billboard disposal** ✅ FIXED
   - `removeBlock()` at line ~1186: Removed billboards from scene but never disposed geometry/material/textures
   - `refreshAllBillboards()` at line ~1897: Same issue when refreshing graphics
   - Fix: Added proper `.dispose()` calls for geometry, material, and textures

2. **Falling tree block disposal** ✅ FIXED
   - `createFallingLeafBlock()` at line ~5014: Leaves removed after timeout but geometry/material leaked
   - `createFallingLeafBlock()` at line ~5125: Second leaf cleanup also missing disposal
   - `createFallingWoodBlock()` at line ~5214: Wood blocks auto-cleanup missing disposal
   - Fix: Added disposal for geometry and materials in all setTimeout cleanup functions

### Still present in main branch (untested):

3. **Fog system** - Added in commit 95c318c (commit message says "ram leak somewhere")
4. **miniChunks texture system** - Complex Vite plugin + texture caching
5. **ChunkRenderManager** - Additional rendering layer

## Quick Recovery Commands

```bash
# Check current branch
git branch

# Switch to stable test branch
git checkout voxelworld-stable

# Switch back to main
git checkout main

# Start dev server
npm run dev

# Check git status
git status

# See what changed since stable
git diff d78e191..HEAD --stat
```

## File Locations

- Main code: `/home/brad/Documents/VoxelWorld-1/VoxelWorld-1-vite/src/VoxelWorld.js`
- LOD Manager: `src/rendering/ChunkLODManager.js`
- Worker: `src/workers/ChunkWorker.js`

## Next Steps After Crash

1. Read this file to get context
2. Ask user if they want to continue testing stable branch
3. If stable branch also crashes, investigate:
   - Chrome DevTools memory profiler
   - Three.js dispose() calls
   - Worker memory management
   - Consider non-Vite build (plain dev server)

## Notes

- User prefers visible chunk LOD loading (VoxelWorld-X style) over seamless fog
- Memory leaks likely introduced between d78e191 and main
- Vite might be contributing to instability
- VSCode (Electron) + GNOME has known compatibility issues
