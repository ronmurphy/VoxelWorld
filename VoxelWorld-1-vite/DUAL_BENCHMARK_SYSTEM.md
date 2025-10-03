# 🎮 Dual Benchmark System - Technical Overview

## Philosophy

**"Power users tinker. Casual users just want it to work."**

This dual-benchmark system is designed with this principle in mind:
- Users with **iGPU only** get smooth performance right away (no tweaking needed)
- Users with **dGPU** are likely to explore settings and optimize performance
- Each GPU mode gets **optimized benchmarks** with appropriate thresholds

## Default Behavior

### 🔋 Low-Power Mode (Default)
- **Target:** Integrated GPUs (Intel UHD, AMD Radeon Vega/780M, etc.)
- **Philosophy:** Conservative, guaranteed smooth experience
- **Test Scene:** 6x6x6 blocks (324 total)
- **Thresholds:**
  - 45+ FPS → Render Distance 3 (very smooth iGPU)
  - 30+ FPS → Render Distance 2 (most common, smooth)
  - 20+ FPS → Render Distance 1 (playable)
  - <20 FPS → Render Distance 1 (minimum)

### ⚡ High-Performance Mode (Opt-In)
- **Target:** Dedicated GPUs (RTX, GTX, Radeon RX)
- **Philosophy:** Aggressive, push hardware to limits
- **Test Scene:** 10x10x10 blocks (500 total)
- **Thresholds:**
  - 55+ FPS → Render Distance 4 (ultra high-end)
  - 45+ FPS → Render Distance 3 (high-end)
  - 30+ FPS → Render Distance 2 (mid-range)
  - 15+ FPS → Render Distance 1 (low-end)

## How It Works

### 1. GPU Preference Detection
```javascript
const gpuPreference = localStorage.getItem('voxelWorld_gpuPreference') || 'low-power';
```
- **First launch:** Defaults to `low-power` for broad compatibility
- **User changes:** Saved in localStorage, persists across sessions
- **Auto re-benchmark:** If GPU mode changes, benchmark automatically re-runs

### 2. Benchmark Selection
```javascript
if (gpuPreference === 'high-performance') {
    return await this.runHighPerformanceBenchmark();
} else {
    return await this.runLowPowerBenchmark();
}
```

### 3. Result Caching with Mode Tracking
```javascript
const result = {
    avgFPS: Math.round(finalAvgFPS),
    renderDistance: renderDistance,
    gpuMode: 'low-power', // or 'high-performance'
    timestamp: Date.now()
};
```
- Cached results include which mode they were tested on
- Changing GPU mode invalidates cache and triggers re-benchmark
- User always gets appropriate test for current GPU setting

## Benchmark Comparison

| Aspect | Low-Power (iGPU) | High-Performance (dGPU) |
|--------|------------------|-------------------------|
| **Test Size** | 6×6×6 (324 blocks) | 10×10×10 (500 blocks) |
| **Vertical Layers** | 3 | 5 |
| **Test Duration** | 2 seconds | 2 seconds |
| **Max Render Distance** | 3 | 4 |
| **Min FPS for RD=3** | 45 | 45 |
| **Min FPS for RD=2** | 30 | 30 |
| **Philosophy** | Conservative | Aggressive |

## User Flow Examples

### Scenario 1: iGPU User (First Launch)
```
1. Launch game → Defaults to low-power mode
2. Auto-runs low-power benchmark (6x6x6, conservative)
3. Gets RD=2 at 35 FPS → Smooth gameplay ✓
4. User never touches settings → Just enjoys game
```

### Scenario 2: dGPU User (Enthusiast)
```
1. Launch game → Defaults to low-power mode
2. Auto-runs low-power benchmark → Gets RD=2
3. User thinks "this could be better"
4. Opens menu (ESC) → Changes to High Performance
5. Reloads page (F5)
6. Auto-runs high-performance benchmark (10x10x10)
7. Gets RD=4 at 60 FPS → Maximum performance ✓
```

### Scenario 3: Laptop User (Switching Contexts)
```
On Battery:
1. Set to Low Power mode
2. Gets RD=2, saves battery
3. Smooth gameplay at 30 FPS

Plugged In:
1. Switch to High Performance mode
2. Reload → Re-benchmark
3. Gets RD=4, maximum visuals
4. Smooth gameplay at 60 FPS
```

## Why This Approach Works

### 1. **No Configuration Paralysis**
- Casual users get optimal settings immediately
- No need to understand "render distance" or "GPU modes"
- Game just works out of the box

### 2. **Power Users Get Control**
- Menu clearly shows GPU options
- Can experiment with different modes
- Benchmark results tailored to each mode

### 3. **Appropriate Testing**
- iGPU test: Smaller scene, won't overwhelm
- dGPU test: Larger scene, properly stresses hardware
- Different thresholds: Account for different capabilities

### 4. **Automatic Invalidation**
- Change GPU mode → Benchmark invalidates
- Forces re-test with appropriate method
- No stale results from wrong GPU mode

## Menu Integration

The benchmark button shows which mode is active:

```
Low-Power Mode:   🔋 Re-run Benchmark (iGPU)
High-Performance: ⚡ Re-run Benchmark (dGPU)
Auto Mode:        ⚡ Re-run Benchmark
```

This gives users transparency about what will be tested.

## Console Logging

### Low-Power Benchmark
```
🔋 iGPU Benchmark Result: {
  avgFPS: 35,
  renderDistance: 2,
  gpuMode: 'low-power',
  timestamp: 1696348800000
}
```

### High-Performance Benchmark
```
⚡ dGPU Benchmark Result: {
  avgFPS: 60,
  renderDistance: 4,
  gpuMode: 'high-performance',
  timestamp: 1696348900000
}
```

## Migration Strategy

### Existing Users
- Old benchmark results lack `gpuMode` property
- System detects this and re-runs appropriate benchmark
- Seamless upgrade experience

### New Users
- Start with conservative low-power mode
- Optimal experience on iGPU
- Can upgrade to high-performance if hardware allows

## Performance Expectations

### iGPU Systems (Low-Power Mode)
| GPU | Expected FPS | Render Distance | Experience |
|-----|--------------|-----------------|------------|
| Intel UHD 620 | 25-35 | 1-2 | Smooth |
| AMD Radeon Vega 8 | 30-40 | 2 | Very Smooth |
| Intel Iris Xe | 35-45 | 2-3 | Very Smooth |
| AMD Radeon 780M | 40-50 | 3 | Excellent |

### dGPU Systems (High-Performance Mode)
| GPU | Expected FPS | Render Distance | Experience |
|-----|--------------|-----------------|------------|
| GTX 1650 | 45-55 | 3 | High |
| RTX 3050 | 50-60 | 3-4 | Very High |
| RTX 4060 | 55-65+ | 4 | Ultra |
| RTX 4070+ | 60+ | 4 | Ultra |

## Best Practices

### For Users
1. **Start with default** - Low-power mode works for everyone
2. **Have dGPU?** - Switch to High Performance and re-benchmark
3. **On laptop?** - Use Low Power on battery, High Performance plugged in
4. **Game feels slow?** - Don't lower settings, check GPU mode first

### For Developers
1. **Conservative defaults** - Start low, let users upgrade
2. **Clear labeling** - Show which mode is active
3. **Auto-invalidation** - Re-test when GPU mode changes
4. **Different tests** - Tailor benchmark to expected hardware

## Future Enhancements

### Potential Additions
- **Auto-detection:** Detect dGPU presence and suggest mode
- **Hybrid mode:** Switch based on power state (battery/plugged)
- **Benchmark history:** Track results over time
- **Per-GPU profiles:** Remember settings for specific hardware

### Advanced Features
- **Custom thresholds:** Let power users set their own FPS targets
- **Stress test mode:** Extended benchmark for stability testing
- **Comparison mode:** Test both modes and show difference

---

This dual-benchmark system ensures **everyone gets optimal performance** - casual users without thinking, power users by choice. 🎮🚀
