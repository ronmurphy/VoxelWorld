# 🎮 GPU Selection Feature - Quick Start Guide

## What's New?

VoxelWorld now has **in-game GPU selection**! You can switch between your dedicated GPU (for maximum performance) and integrated GPU (for battery saving) directly from the menu.

## Default Behavior

**The game defaults to Low-Power mode for broad compatibility.**

This means:
- ✅ Works great on laptops with only iGPU
- ✅ Saves battery on systems with dGPU (until you change it)
- ✅ Smooth experience for casual users who don't tweak settings
- ✅ Power users with dGPU can easily switch to High Performance

### Why Low-Power Default?

**Philosophy:** *"Casual users just want it to work. Power users will tinker anyway."*

- **iGPU-only users** get optimal performance immediately
- **dGPU users** will explore settings and find High Performance mode
- **Everyone** gets a smooth first impression

## How to Use

### 1. Open the Menu
- Press **ESC** key, or
- Click the **time/day indicator** in the top-right corner

### 2. Find the GPU Section
At the top of the menu, you'll see:

```
┌─────────────────────────────┐
│      Current GPU:           │
│    RTX 4060 Mobile          │  ← Shows detected GPU
│                             │
│ ⚡ High Performance (dGPU)   │  ← Click to cycle
└─────────────────────────────┘
```

### 3. Select Your Preference

Click the GPU button to cycle through 3 options:

| Mode | Icon | Description | Best For |
|------|------|-------------|----------|
| **Low Power** (Default) | 🔋 | Uses integrated GPU | iGPU systems, battery saving |
| **High Performance** | ⚡ | Uses dedicated GPU | Gaming, plugged in, dGPU systems |
| **Auto** | 🎯 | Browser chooses | General use |

### 4. Apply Changes

1. **Select your preferred mode** (button changes with each click)
2. **Reload the page** - Press `F5` or `Ctrl+R` (Windows) / `Cmd+R` (Mac)
3. **Re-run benchmark** - Open menu → Click "⚡ Re-run Benchmark"
4. **Enjoy optimized performance!**

## Visual Guide

### Menu Layout
```
╔══════════════════════════════════╗
║     Voxel World Menu            ║
╠══════════════════════════════════╣
║  Current GPU: RTX 4060 Mobile   ║  ← GPU Info
║                                  ║
║  [⚡ High Performance (dGPU)]    ║  ← Click to change
║  [🎲 New Game]                  ║
║  [⚡ Re-run Benchmark]           ║  ← Run after GPU change
║  [🔭 Render Distance: 4]        ║
║  [🎨 Enhanced Graphics ON]      ║
║  [💾 Save Game]                 ║
║  [📂 Load Game]                 ║
║  [🗑 Delete Save]               ║
║  [Close Menu]                    ║
╚══════════════════════════════════╝
```

### GPU Mode Cycling

```
      🔋 Low Power (Default)
           ↓ (click)
      ⚡ High Performance
           ↓ (click)
      🎯 Auto
           ↓ (click)
      🔋 Low Power (loops)
```

## Performance Comparison

### Example: Laptop with RTX 4060 + Radeon 780M

| Setting | GPU Used | Render Distance | FPS | Power Usage |
|---------|----------|-----------------|-----|-------------|
| 🔋 Low Power (Default) | Radeon 780M | 2-3 | 30-45 | Low 🔋 |
| ⚡ High Performance | RTX 4060 | 4 | 60+ | High ⚡⚡⚡ |
| 🎯 Auto | Varies | 2-4 | 30-60 | Medium |

## Troubleshooting

### GPU not changing after reload?
1. Make sure you pressed **F5** to reload
2. Check browser console (F12) for GPU info
3. Try Windows Graphics Settings (see full guide)

### Menu shows "Unknown GPU"?
- Your browser may have GPU detection disabled
- The GPU selection will still work
- Check console with F12 for technical details

### Still getting low performance?
1. Make sure laptop is **plugged in** (not on battery)
2. Select **High Performance** mode
3. **Reload page** (F5)
4. Click **"Re-run Benchmark"** in menu
5. Check Windows Power Plan is "High Performance"

## Advanced: Console Verification

Open browser console (F12) and look for:

```javascript
🎮 GPU INFO: {
  vendor: "NVIDIA Corporation",
  renderer: "NVIDIA GeForce RTX 4060 Laptop GPU",
  preference: "high-performance"
}
```

- **vendor**: Who made the GPU
- **renderer**: Specific GPU model
- **preference**: Current setting (high-performance/low-power/default)

## Tips

### For iGPU Users (Default Experience)
```
1. Launch game
2. Game auto-detects Low Power mode
3. Runs iGPU-optimized benchmark
4. Gets smooth RD 1-2, 30+ FPS
5. Just play and enjoy! ✓
```

### For dGPU Users (Optimize Performance)
```
1. Launch game (starts in Low Power)
2. Press ESC → See GPU menu
3. Click GPU button → Select High Performance
4. Press F5 to reload
5. Click "Re-run Benchmark (dGPU)"
6. Expected: Render Distance 4, 60+ FPS
```

### For Maximum Performance (Gaming)
```
1. Plug in laptop
2. Select: ⚡ High Performance
3. Reload page (F5)
4. Re-run benchmark
5. Expected: Render Distance 4, 60+ FPS
```

### For Battery Life (Working/Browsing)
```
1. On battery power
2. Select: 🔋 Low Power
3. Reload page (F5)
4. Re-run benchmark
5. Expected: Render Distance 1-2, 30+ FPS
```

### For Balanced (General Use)
```
1. Select: 🎯 Auto
2. Reload page (F5)
3. Browser optimizes based on power state
```

## FAQ

**Q: Do I need to reload the page every time?**  
A: Yes, GPU changes require a page reload. WebGL contexts can't switch GPUs on the fly.

**Q: What if I only have one GPU?**  
A: The menu will still work! If you only have integrated graphics, all modes use the same GPU. If you only have dedicated graphics, you're already using the best option.

**Q: Does this work on desktop computers?**  
A: Yes! Though desktop usually have one GPU, this feature still lets you control power preferences.

**Q: Can I set different GPUs for different websites?**  
A: Yes! Each website remembers its own GPU preference via localStorage.

**Q: Will my choice be saved?**  
A: Yes! Your GPU preference is saved and will be remembered next time you launch the game.

## Related Settings

- **Render Distance**: Adjusted after GPU change via benchmark
- **Enhanced Graphics**: Works with any GPU (may affect performance)
- **Power Preference**: Separate from Windows system settings

For complete technical details, see: `GPU_OPTIMIZATION.md`

---

**Enjoy gaming with optimized GPU performance! 🎮🚀**
