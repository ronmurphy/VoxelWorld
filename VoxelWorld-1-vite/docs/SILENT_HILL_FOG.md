# Silent Hill Fog System - Implementation Notes

## 🌫️ Overview
The fog system now properly creates a Silent Hill-style fog wall that:
- Ends exactly at the render distance boundary
- Moves with the player as chunks load/unload  
- Respects the saved render distance from benchmark
- Works with day/night cycle (dark fog at night, sky-colored during day)

## 📐 Fog Calculations

**Important:** Chunk size is **8 blocks** (not 64). Fog distance = renderDistance × chunkSize.

### Hard Fog (Silent Hill Mode)
```javascript
fogStart = (renderDistance - 0.5) * chunkSize  // Half chunk before render limit
fogEnd = renderDistance * chunkSize            // Exactly at render limit
```

**Example with renderDistance = 1, chunkSize = 8:**
- fogStart = 0.5 × 8 = **4 blocks**
- fogEnd = 1 × 8 = **8 blocks**
- Creates a **4-block fog wall** at the edge of vision

**Example with renderDistance = 3, chunkSize = 8:**
- fogStart = 2.5 × 8 = **20 blocks**
- fogEnd = 3 × 8 = **24 blocks**
- Creates a **4-block fog wall** at the edge of vision

### Soft Fog (Normal Mode)
```javascript
fogStart = (renderDistance + 1) * chunkSize   // 1 chunk beyond render distance
fogEnd = (renderDistance + 3) * chunkSize     // 3 chunks beyond render distance
```

**Example with renderDistance = 1, chunkSize = 8:**
- fogStart = 2 × 8 = **16 blocks**
- fogEnd = 4 × 8 = **32 blocks**
- Creates a **16-block gradual fade** beyond vision

**Example with renderDistance = 3, chunkSize = 8:**
- fogStart = 4 × 8 = **32 blocks**
- fogEnd = 6 × 8 = **48 blocks**
- Creates a **16-block gradual fade** beyond vision

## 🎮 Console Commands

### Enable Silent Hill Fog
```javascript
voxelWorld.toggleHardFog(true);
```

### Disable Silent Hill Fog
```javascript
voxelWorld.toggleHardFog(false);
```

### Check Current Fog State
```javascript
console.log('Hard Fog:', voxelWorld.useHardFog);
console.log('Render Distance:', voxelWorld.renderDistance);
```

## 🔧 How It Works

### 1. Fog Updates on Day/Night Cycle
The day/night cycle (lines 8433-8451) updates fog every frame:
- Checks `useHardFog` flag
- Sets fog color based on time (dark 0x0a0a0f at night, sky color during day)
- Calculates fog distances based on mode

### 2. Fog Updates on Render Distance Change
When render distance changes (e.g., settings menu):
- `updateFog()` is called with new distances
- Fog wall moves to new boundary
- Maintains hard/soft mode setting

### 3. Fog Moves With Player
- Fog distances are camera-relative (THREE.Fog is camera-space)
- As player moves and chunks load/unload, fog boundary stays consistent
- No need for manual fog position updates

## 🎨 Visual Effect

**Hard Fog (Silent Hill):**
```
Player → [Clear View] → [Fog Wall] ← Render Boundary
         ←--- 2.5 chunks ---→ ← 0.5 chunk fog →
```

**Soft Fog (Normal):**
```
Player → [Clear View] → [Gradual Fade...............] ← Beyond Render
         ←--- renderDist+1 ---→ ←-- 2 chunks fade --→
```

## 🐛 Previous Issues (Now Fixed)

### Problem: Fog Started Beyond Render Distance
- **Old**: fogStart = (renderDistance + 1) * 64
- **Issue**: Chunks at render boundary were fully visible, then disappeared abruptly
- **Fix**: Hard fog now ends AT render distance, creating proper wall

### Problem: Hard Fog Too Close
- **Old**: fogEnd = (renderDistance + 0.5) * 64  
- **Issue**: Fog wall was inside visible area
- **Fix**: fogEnd = renderDistance * 64 (exactly at boundary)

## 📊 Render Distance Examples

| Render Dist | Hard Fog Start | Hard Fog End | Soft Fog Start | Soft Fog End |
|-------------|----------------|--------------|----------------|--------------|
| 1           | 32 blocks      | 64 blocks    | 128 blocks     | 256 blocks   |
| 2           | 96 blocks      | 128 blocks   | 192 blocks     | 320 blocks   |
| 3           | 160 blocks     | 192 blocks   | 256 blocks     | 384 blocks   |
| 4           | 224 blocks     | 256 blocks   | 320 blocks     | 448 blocks   |

## 🎯 Use Cases

### Hard Fog (Silent Hill)
- ✅ Horror/survival atmosphere
- ✅ Performance optimization (hide far chunks)
- ✅ Dungeon/cave exploration
- ✅ Creating tension/claustrophobia

### Soft Fog (Normal)
- ✅ Open world exploration
- ✅ Natural looking atmosphere
- ✅ Scenic views
- ✅ Relaxed gameplay

## 🔮 Future Enhancements
- [ ] Fog color customization (green fog, red fog, etc.)
- [ ] Fog density animation (pulsing effect)
- [ ] Biome-specific fog (swamp fog, mountain mist)
- [ ] Weather system integration (rain reduces fog visibility)
