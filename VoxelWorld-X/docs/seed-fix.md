# 🌍 World Seed Persistence - Debug System

## What We Did

**Problem:** During development, every code change triggers a hot reload, which generated a new random world seed. This made it impossible to test chunk persistence because each reload created a completely different world.

**Solution:** Added a persistent seed system with a debug mode flag.

## Changes Made

### File: `src/VoxelWorld.js` (around line 5157)

Added persistent seed system with debug mode:

```javascript
// 🧪 DEBUG MODE: Set to true during development to persist seed across reloads
const USE_DEBUG_SEED = true;
const DEBUG_SEED = 12345; // Fixed seed for consistent testing

// Initialize seed system
let storedSeed = null;
if (USE_DEBUG_SEED) {
    storedSeed = localStorage.getItem('voxelWorld_debugSeed');
} else {
    storedSeed = localStorage.getItem('voxelWorld_seed');
}

if (storedSeed) {
    this.worldSeed = parseInt(storedSeed, 10);
    console.log(`🌍 Loaded persistent world seed: ${this.worldSeed}`);
} else {
    if (USE_DEBUG_SEED) {
        this.worldSeed = DEBUG_SEED;
        localStorage.setItem('voxelWorld_debugSeed', this.worldSeed.toString());
        console.log(`🧪 DEBUG MODE: Using fixed seed: ${this.worldSeed}`);
    } else {
        this.worldSeed = this.generateInitialSeed();
        localStorage.setItem('voxelWorld_seed', this.worldSeed.toString());
        console.log(`🌍 Generated new world seed: ${this.worldSeed}`);
    }
}
```

## How to Use

### During Development (Testing Chunk Persistence)

1. **Enable Debug Mode:**
   ```javascript
   const USE_DEBUG_SEED = true;
   const DEBUG_SEED = 12345; // Use any number you want
   ```

2. **Benefits:**
   - Same world every reload
   - Can test block placement and persistence
   - Can test chunk modifications
   - Predictable world generation for debugging

3. **To Reset the Debug World:**
   - Open browser console (F12)
   - Run: `localStorage.removeItem('voxelWorld_debugSeed')`
   - Reload page

### For Production Release

1. **Disable Debug Mode:**
   ```javascript
   const USE_DEBUG_SEED = false;
   const DEBUG_SEED = 12345; // Value doesn't matter when disabled
   ```

2. **Behavior:**
   - New random seed generated on first load
   - Seed persists across page reloads (normal gameplay)
   - Each new game generates a new seed
   - Players get unique worlds

## Testing Checklist

### ✅ With Debug Mode ON (Development)
- [ ] Place blocks in world
- [ ] Reload page (code changes)
- [ ] Verify same world loads
- [ ] Verify placed blocks are still there
- [ ] Walk away and come back
- [ ] Verify chunks persist correctly

### ✅ With Debug Mode OFF (Production)
- [ ] Start new game
- [ ] Check that seed is random
- [ ] Place blocks
- [ ] Reload page normally
- [ ] Verify world persists
- [ ] Click "New Game" button
- [ ] Verify new seed is generated

## Related Systems

### Chunk Persistence
- Chunks are saved to IndexedDB (browser) or filesystem (Electron)
- File format: `{worldSeed}_chunk_{x}_{z}.dat`
- Modifications: `{worldSeed}_chunk_{x}_{z}.mod`
- **Seed MUST be consistent for chunks to load correctly**

### New Game Button
When implementing "New Game", make sure to:
```javascript
// Clear old seed
if (USE_DEBUG_SEED) {
    localStorage.removeItem('voxelWorld_debugSeed');
} else {
    localStorage.removeItem('voxelWorld_seed');
}

// Generate new seed
this.worldSeed = this.generateInitialSeed();
localStorage.setItem('voxelWorld_seed', this.worldSeed.toString());

// Clear all chunks for old world
await this.persistence.clearAllChunks();
await this.modificationTracker.clearAllModifications();
```

## Known Issues to Address

1. **Tree Regeneration:** Trees are procedurally generated and not saved with chunks. On reload, trees may appear in different positions even with persistent seed. Consider:
   - Saving tree positions with chunk data
   - Using deterministic tree placement based on chunk coordinates + seed

2. **Spawn Point Variation:** Spawn area chunks may regenerate slightly differently. Consider:
   - Saving spawn chunk modifications
   - Preventing procedural generation in spawn chunks after first visit

## Before Release

**CRITICAL:** Set `USE_DEBUG_SEED = false` before production build!

Add to build checklist:
- [ ] Verify `USE_DEBUG_SEED = false` in VoxelWorld.js
- [ ] Test new game generation
- [ ] Test world persistence
- [ ] Test save/load system
- [ ] Clear development localStorage data

---

**Last Updated:** 2025-10-03
**Related Files:** src/VoxelWorld.js, src/serialization/ChunkPersistence.js, src/serialization/ModificationTracker.js
