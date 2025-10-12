# Performance Issues Analysis

## Summary
Performance scan revealed multiple accumulation issues that worsen with distance from spawn. Arrays grow indefinitely without cleanup, causing slowdown over time.

---

## 🔴 CRITICAL ISSUES

### 1. **Unbounded Position Arrays**
**Location:** VoxelWorld.js lines 85-87, 401, 406, 1869
**Issue:** Arrays grow infinitely as player explores
```javascript
this.waterPositions = [];      // Grows with every water block placed
this.pumpkinPositions = [];    // Grows with every pumpkin placed  
this.worldItemPositions = [];  // Grows with every collectible spawned
```

**Impact:**
- Every frame, compass calls `findNearestTarget()` (line 3445-3485)
- Iterates ALL positions to find nearest, using `Math.sqrt()` distance calculation
- 1000+ water blocks = 1000+ distance calculations **per frame**
- Performance degrades exponentially with exploration distance

**Fix:** Distance-based cleanup system
```javascript
// Clean positions beyond view distance (e.g., 200 blocks)
cleanupDistantPositions(playerPos, maxDistance = 200) {
    this.waterPositions = this.waterPositions.filter(pos => 
        Math.abs(pos.x - playerPos.x) < maxDistance && 
        Math.abs(pos.z - playerPos.z) < maxDistance
    );
    this.pumpkinPositions = this.pumpkinPositions.filter(pos => 
        Math.abs(pos.x - playerPos.x) < maxDistance && 
        Math.abs(pos.z - playerPos.z) < maxDistance
    );
    this.worldItemPositions = this.worldItemPositions.filter(pos => 
        Math.abs(pos.x - playerPos.x) < maxDistance && 
        Math.abs(pos.z - playerPos.z) < maxDistance
    );
}
```

---

### 2. **Per-Frame Billboard Animation Iteration**
**Location:** VoxelWorld.js lines 968-1007
**Issue:** Loops through entire `this.world` object every frame
```javascript
this.animateBillboards = (currentTime) => {
    for (const key in this.world) {  // ❌ Iterates ALL blocks
        const worldItem = this.world[key];
        if (worldItem.billboard) {
            // Animation calculations
        }
    }
}
```

**Impact:**
- `this.world` grows with every block placed/explored
- 10,000+ blocks = 10,000+ checks per frame @ 60fps
- Massive CPU overhead far from spawn

**Fix:** Separate billboards array
```javascript
// Track only billboards that need animation
this.activeBillboards = [];

// When creating billboard
const billboard = createBillboard();
this.activeBillboards.push(billboard);

// Animate only active billboards
this.animateBillboards = (currentTime) => {
    this.activeBillboards.forEach(billboard => {
        // Animation logic
    });
}
```

---

### 3. **Explosion Effects Array Leak**
**Location:** VoxelWorld.js lines 1418-1445, 9585-9620
**Issue:** Explosions added but cleanup only happens if lifetime expires
```javascript
this.explosionEffects.push(explosionData);  // Added
// Cleanup only in animate loop - what if paused?
```

**Impact:**
- Effects may persist if game paused during explosion
- Array grows if cleanup fails
- Each effect has 10+ sprite particles = memory leak

**Fix:** Guaranteed cleanup + bounds check
```javascript
// Set maximum explosions at once
if (this.explosionEffects.length > 50) {
    // Force cleanup oldest
    const oldest = this.explosionEffects.shift();
    oldest.particles.forEach(sprite => {
        this.scene.remove(sprite);
        sprite.material.dispose();
    });
}
```

---

### 4. **Ghost Billboard Array Accumulation**
**Location:** VoxelWorld.js line 996
**Issue:** `ghostBillboards` array iterated every frame
```javascript
this.ghostBillboards.forEach((ghostData) => {
    // Animation calculations per ghost
});
```

**Impact:**
- Array grows with ghost spawns
- No distance-based culling
- Far-away ghosts still animated every frame

**Fix:** Distance culling
```javascript
this.animateGhostBillboards = (playerPos) => {
    this.ghostBillboards.forEach((ghostData, index) => {
        const dist = ghostData.position.distanceTo(playerPos);
        if (dist > 100) {
            // Skip animation for distant ghosts
            return;
        }
        // Animate visible ghosts only
    });
}
```

---

## 🟡 MEDIUM ISSUES

### 5. **Chunk Tracking Cleanup**
**Location:** VoxelWorld.js lines 1653-1677
**Good:** Has cleanup system
**Issue:** Only cleans `visitedChunks` Set and `chunkSpawnTimes`
```javascript
this.cleanupChunkTracking = (playerChunkX, playerChunkZ) => {
    chunksToRemove.forEach(chunkKey => {
        this.visitedChunks.delete(chunkKey);
        this.chunkSpawnTimes.delete(chunkKey);
    });
}
```

**Missing:**
- Doesn't clean up `this.world` object (blocks persist)
- Doesn't clean up position arrays (water, pumpkins, items)
- Should trigger comprehensive cleanup

**Fix:** Extend cleanup
```javascript
chunksToRemove.forEach(chunkKey => {
    this.visitedChunks.delete(chunkKey);
    this.chunkSpawnTimes.delete(chunkKey);
    
    // Also clean block data in chunk
    const [cx, cz] = chunkKey.split(',').map(Number);
    for (let x = cx * this.chunkSize; x < (cx + 1) * this.chunkSize; x++) {
        for (let z = cz * this.chunkSize; z < (cz + 1) * this.chunkSize; z++) {
            for (let y = 0; y < 128; y++) {
                const key = `${x},${y},${z}`;
                if (this.world[key]) {
                    // Dispose geometry/materials
                    // Remove from scene
                    delete this.world[key];
                }
            }
        }
    }
});
```

---

### 6. **THREE.js Material Reuse**
**Location:** Multiple geometry/material creation sites
**Issue:** Materials created per-block instead of shared
```javascript
new THREE.BoxGeometry(0.95, 0.95, 0.95);  // ❌ New geometry each time
new THREE.MeshLambertMaterial({ color });  // ❌ New material each time
```

**Impact:**
- Thousands of duplicate geometries/materials
- GPU memory bloat
- Slower rendering

**Fix:** Material/Geometry caching (already partially exists)
```javascript
// Cache common geometries
this.blockGeometry = new THREE.BoxGeometry(0.95, 0.95, 0.95);
this.blockMaterials = {};

getMaterial(color) {
    if (!this.blockMaterials[color]) {
        this.blockMaterials[color] = new THREE.MeshLambertMaterial({ color });
    }
    return this.blockMaterials[color];
}
```

---

## 🟢 MINOR ISSUES

### 7. **Explorer Pins UI Iteration**
**Location:** VoxelWorld.js line 3005
**Issue:** Loops through all pins every render
```javascript
this.explorerPins.forEach((pin, index) => {
    // Draw pin on map
});
```

**Impact:**
- Low impact (pins are user-created, typically < 50)
- Still iterates even if map closed

**Fix:** Only render when map visible
```javascript
if (mapVisible) {
    this.explorerPins.forEach(pin => {
        // Draw
    });
}
```

---

## 📊 Performance Monitoring Recommendations

### Add Performance Tracking
```javascript
// In animate loop
if (currentTime - this.lastPerfLog > 5000) {  // Every 5 sec
    console.log({
        waterPositions: this.waterPositions.length,
        pumpkinPositions: this.pumpkinPositions.length,
        worldItemPositions: this.worldItemPositions.length,
        worldBlocks: Object.keys(this.world).length,
        activeBillboards: this.activeBillboards?.length || 0,
        explosions: this.explosionEffects.length,
        ghosts: this.ghostBillboards.length
    });
    this.lastPerfLog = currentTime;
}
```

### Add FPS Counter
```javascript
// Track FPS drops
if (this.fps < 30) {
    console.warn('FPS drop detected:', {
        fps: this.fps,
        playerPos: this.player.position,
        distanceFromSpawn: this.player.position.length()
    });
}
```

---

## 🚀 Implementation Priority

1. **HIGH**: Fix unbounded position arrays (water, pumpkins, items)
2. **HIGH**: Separate billboard animation array
3. **MEDIUM**: Extend chunk cleanup to remove blocks
4. **MEDIUM**: Explosion effects bounds check
5. **LOW**: Distance cull ghost animations
6. **LOW**: Conditional UI rendering

---

## Expected Performance Gains

- **Position array cleanup**: 50-80% improvement at 500+ blocks from spawn
- **Billboard separation**: 30-50% improvement with 1000+ blocks
- **Chunk data cleanup**: 20-40% memory reduction
- **Material reuse**: 10-20% GPU memory reduction

---

## Testing Checklist

- [ ] Test at spawn (baseline)
- [ ] Walk 500 blocks away
- [ ] Walk 1000 blocks away  
- [ ] Place 500+ water blocks
- [ ] Monitor FPS and array lengths
- [ ] Verify cleanup triggers correctly
- [ ] Check memory usage in DevTools
