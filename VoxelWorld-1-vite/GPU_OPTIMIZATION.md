# 🎮 GPU Optimization Guide

## Problem Solved
Your VoxelWorld app was not utilizing the dedicated NVIDIA RTX 4060 GPU, instead defaulting to the integrated Radeon 780M graphics. This resulted in the same render distance (3) as your lower-spec laptop.

## NEW: In-Game GPU Selection! 🎮

You can now select your preferred GPU directly from the game menu without editing code or system settings!

### How to Change GPU (Easy Method)

1. **Launch the game**
2. **Press ESC** or **click the time indicator** to open the menu
3. **Look for the GPU section** at the top showing:
   - Current GPU detected (e.g., "RTX 4060" or "Radeon 780M")
   - GPU preference button with current mode
4. **Click the GPU button** to cycle through options:
   - ⚡ **High Performance (dGPU)** - Uses dedicated GPU (recommended for gaming)
   - 🔋 **Low Power (iGPU)** - Uses integrated GPU (battery saving)
   - 🎯 **Auto (Browser Choice)** - Lets browser decide
5. **Reload the page (F5)** to apply changes
6. **Re-run benchmark** to get optimal render distance for selected GPU

### GPU Options Explained

| Option | Icon | When to Use | Performance |
|--------|------|-------------|-------------|
| **High Performance** | ⚡ | Gaming on dedicated GPU (RTX, GTX, Radeon RX) | Maximum FPS |
| **Low Power** | 🔋 | Battery saving, using integrated GPU | Lower FPS, longer battery |
| **Auto** | 🎯 | Let browser choose based on power state | Variable |

## Changes Made

### 1. In-Game GPU Selector (NEW!)
Added a user-friendly GPU selection menu accessible during gameplay:

```javascript
// GPU preference is now user-selectable with 3 options:
const gpuPreference = localStorage.getItem('voxelWorld_gpuPreference') || 'high-performance';
```

**Options available:**
- `high-performance` - Dedicated GPU (RTX 4060, etc.)
- `low-power` - Integrated GPU (Radeon 780M, Intel Iris, etc.)
- `default` - Browser auto-selection

### 2. GPU Detection & Display
Shows detected GPU in menu and console:

```javascript
const gl = this.renderer.getContext();
const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
if (debugInfo) {
    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    this.detectedGPU = { vendor, renderer, preference: gpuPreference };
    console.log('🎮 GPU INFO:', this.detectedGPU);
}
```

Menu displays simplified GPU name (e.g., "RTX 4060" instead of full technical string).

### 3. Enhanced Performance Thresholds
Updated benchmark thresholds to support render distance level 4:

**Old:**
- 50+ FPS → Render Distance 3
- 30+ FPS → Render Distance 2
- 15+ FPS → Render Distance 1

**New:**
- 55+ FPS → Render Distance 4 (Ultra high-end)
- 45+ FPS → Render Distance 3 (High-end)
- 30+ FPS → Render Distance 2 (Mid-range)
- 15+ FPS → Render Distance 1 (Low-end)

## How to Test

### Step 1: Select Your GPU (NEW - Easiest Method!)
1. Launch VoxelWorld
2. Press **ESC** or click the **time indicator**
3. Look at the **GPU section** at top of menu
4. Click the **GPU button** to cycle through:
   - ⚡ High Performance (dedicated GPU)
   - 🔋 Low Power (integrated GPU)  
   - 🎯 Auto (browser decides)
5. **Press F5** to reload with new GPU
6. Click **"Re-run Performance Benchmark"** in menu

### Step 2: Verify GPU Selection
Open browser DevTools (F12) and check the console for:
```
🎮 GPU INFO: { 
    vendor: "NVIDIA Corporation", 
    renderer: "NVIDIA GeForce RTX 4060..." 
}
```

**Expected Results:**
- **Vendor:** Should say "NVIDIA Corporation" (not "AMD")
- **Renderer:** Should include "RTX 4060" or similar

### Step 3: Verify Render Distance
After the benchmark completes, check:
```
📊 Benchmark complete: XX FPS, Render distance: 4
```

With your RTX 4060, you should see:
- **FPS:** 55+ 
- **Render Distance:** 4 (new maximum)

## Additional System-Level Checks

### Windows Graphics Settings
Even with `powerPreference: 'high-performance'`, Windows may override this. To ensure your browser uses the RTX 4060:

1. Open **Settings** → **System** → **Display** → **Graphics settings**
2. Click **"Browse"** and add your browser executable:
   - Chrome: `C:\Program Files\Google\Chrome\Application\chrome.exe`
   - Firefox: `C:\Program Files\Mozilla Firefox\firefox.exe`
   - Edge: Pre-configured usually
3. Click **Options** and select **"High performance"**
4. Restart browser

### NVIDIA Control Panel (Alternative)
1. Open **NVIDIA Control Panel**
2. Go to **"Manage 3D Settings"** → **"Program Settings"**
3. Add your browser
4. Set **"Preferred graphics processor"** to **"High-performance NVIDIA processor"**
5. Restart browser

### Linux (if applicable)
Use `DRI_PRIME=1` environment variable:
```bash
DRI_PRIME=1 google-chrome
```

## Verification Commands

### Browser Console Check
```javascript
// Run this in browser console (F12)
const canvas = document.querySelector('canvas');
const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
console.log({
    vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
    renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
});
```

## Performance Expectations

### With RTX 4060 (Dedicated GPU)
- **Render Distance:** 4
- **FPS:** 60+ (smooth gameplay)
- **Chunk Loading:** Fast, minimal stuttering

### With Radeon 780M (Integrated GPU)
- **Render Distance:** 2-3
- **FPS:** 30-45
- **Chunk Loading:** May have stuttering

## Troubleshooting

### Issue: Still showing integrated GPU
**Solutions:**
1. Configure Windows Graphics Settings (see above)
2. Update NVIDIA drivers
3. Check NVIDIA Control Panel settings
4. Try different browser (Chrome handles GPU selection better)
5. Add `--force-high-performance-gpu` to browser launch flags

### Issue: Performance still low
**Check:**
1. NVIDIA drivers are up to date
2. Power plan set to "High Performance" (Windows)
3. Laptop is plugged in (not on battery)
4. Background apps aren't using GPU
5. Monitor GPU usage in Task Manager → Performance → GPU

### Browser Flags (Chrome/Edge)
Enable hardware acceleration:
1. Go to `chrome://flags`
2. Search for "hardware"
3. Enable:
   - `#enable-gpu-rasterization`
   - `#enable-webgl2-compute-context`
4. Restart browser

## Expected Performance Comparison

| Component | Old Laptop (Ryzen 5/Radeon 610M) | New Laptop (iGPU) | New Laptop (RTX 4060) |
|-----------|----------------------------------|-------------------|----------------------|
| Render Distance | 3 | 3 | **4** |
| Avg FPS | 30-40 | 35-45 | **60+** |
| Chunk Gen Speed | Slow | Medium | **Fast** |
| Visual Quality | Medium | Medium | **Ultra** |

## Next Steps

After verifying the RTX 4060 is active:
1. Clear benchmark: Menu → "Re-run Performance Benchmark"
2. Watch console for GPU info
3. Enjoy improved render distance!

The game should now fully utilize your dedicated GPU and achieve render distance 4 with smooth 60+ FPS! 🚀
