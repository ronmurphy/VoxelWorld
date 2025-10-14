# 🎮 GPU Selection Fix & Verification (v0.4.10)

## Problem Identified

The GPU selection button in the Adventurer's Menu was **not actually switching GPUs**. Here's what was wrong:

### ❌ **Previous Behavior:**
1. User clicks "GPU Mode" button
2. Preference saved to `localStorage`
3. Button text updates
4. Message says "Reload page (F5) to apply changes"
5. **BUT USER HAD TO MANUALLY PRESS F5** - nothing happened!
6. **Even worse:** No way to verify if GPU actually switched

### 🔍 **Root Cause:**
- **WebGL `powerPreference` limitation**: Can only be set when renderer is created
- **No automatic reload**: User forgets to press F5, thinks GPU switched but it didn't
- **No verification**: No way to tell if browser/OS respected the GPU hint
- **Browser/OS override**: `powerPreference` is just a **HINT**, not a command

## ✅ **Solution Implemented**

### 1. **Automatic Page Reload** (VoxelWorld.js ~line 12407)
```javascript
const cycleGPUPreference = () => {
    const preferences = ['high-performance', 'low-power', 'default'];
    const current = localStorage.getItem('voxelWorld_gpuPreference') || 'low-power';
    const currentIndex = preferences.indexOf(current);
    const next = preferences[(currentIndex + 1) % preferences.length];

    localStorage.setItem('voxelWorld_gpuPreference', next);
    this.updateStatus('🎮 GPU preference changed! Reloading game...', 'info', false);

    // 🔄 AUTOMATIC RELOAD - GPU can only be changed by recreating WebGL context
    setTimeout(() => {
        location.reload();
    }, 1000); // 1 second delay to show the message
};
```

**Now when you click the GPU button:**
- ✅ Preference saved
- ✅ Message shown: "GPU preference changed! Reloading game..."
- ✅ **Game automatically reloads after 1 second**
- ✅ New GPU setting applied on reload

### 2. **Enhanced GPU Detection & Verification** (VoxelWorld.js ~line 8085)

Added comprehensive GPU detection logging to **verify** which GPU is actually being used:

```javascript
// 🔍 Enhanced GPU detection logging
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🎮 GPU DETECTION REPORT:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📝 Requested Preference: "${gpuPreference}"`);
console.log(`🏭 GPU Vendor: ${vendor}`);
console.log(`🎨 GPU Renderer: ${renderer}`);

// Detect if iGPU or dGPU based on renderer string
const isIntegrated = renderer.toLowerCase().includes('intel') || 
                     renderer.toLowerCase().includes('integrated') ||
                     renderer.toLowerCase().includes('uhd') ||
                     renderer.toLowerCase().includes('iris');
const isDedicated = renderer.toLowerCase().includes('nvidia') || 
                   renderer.toLowerCase().includes('geforce') ||
                   renderer.toLowerCase().includes('rtx') ||
                   renderer.toLowerCase().includes('gtx') ||
                   renderer.toLowerCase().includes('radeon') ||
                   renderer.toLowerCase().includes('amd');

if (isDedicated) {
    console.log('✅ DETECTED: Dedicated GPU (dGPU)');
    if (gpuPreference === 'high-performance') {
        console.log('✅ STATUS: dGPU requested and dGPU detected - MATCH! 🎯');
    } else {
        console.log('⚠️  WARNING: dGPU detected but preference is "' + gpuPreference + '"');
        console.log('   💡 TIP: Change GPU Mode to "High Performance" for better performance');
    }
} else if (isIntegrated) {
    console.log('🔋 DETECTED: Integrated GPU (iGPU)');
    if (gpuPreference === 'low-power') {
        console.log('✅ STATUS: iGPU requested and iGPU detected - MATCH! 🎯');
    } else if (gpuPreference === 'high-performance') {
        console.log('⚠️  WARNING: Requested dGPU but iGPU detected!');
        console.log('   ❌ ISSUE: Browser/OS may be ignoring powerPreference hint');
        console.log('   💡 FIX: Check Windows Graphics Settings or Electron GPU flags');
    }
}
```

**What you'll see in console:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎮 GPU DETECTION REPORT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Requested Preference: "high-performance"
🏭 GPU Vendor: NVIDIA Corporation
🎨 GPU Renderer: NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2
✅ DETECTED: Dedicated GPU (dGPU)
✅ STATUS: dGPU requested and dGPU detected - MATCH! 🎯
```

### 3. **Electron GPU Flags** (electron.cjs ~line 4)

Added command-line flags to **force** Electron to use the dGPU:

```javascript
// 🎮 Force high-performance GPU (dGPU) for better performance
app.commandLine.appendSwitch('force_high_performance_gpu');

// 🔧 Additional GPU-related flags for better performance
app.commandLine.appendSwitch('disable-gpu-vsync'); // Disable V-Sync for uncapped FPS
app.commandLine.appendSwitch('ignore-gpu-blacklist'); // Ignore GPU blacklist
app.commandLine.appendSwitch('enable-gpu-rasterization'); // Use GPU for rasterization
```

**What this does:**
- ✅ Forces Electron to prefer dGPU over iGPU
- ✅ Disables V-Sync for higher FPS
- ✅ Ignores GPU blacklist (uses GPU even if flagged as problematic)
- ✅ Enables GPU rasterization for better performance

## 🧪 **How to Test GPU Selection**

### Step 1: Check Current GPU
1. Open Developer Tools (F12)
2. Look for the GPU Detection Report in console
3. Note which GPU is currently active

### Step 2: Change GPU Mode
1. Open Adventurer's Menu (ESC key)
2. Go to "Performance" tab
3. Click "GPU Mode" button
4. Game will show: "🎮 GPU preference changed! Reloading game..."
5. **Game automatically reloads after 1 second**

### Step 3: Verify GPU Changed
1. Check console again for GPU Detection Report
2. Look for:
   - **"✅ STATUS: dGPU requested and dGPU detected - MATCH! 🎯"** ← Success!
   - **"⚠️ WARNING: Requested dGPU but iGPU detected!"** ← Need Windows fix (see below)

## 🚨 **If GPU Doesn't Switch (Windows)**

If you see "⚠️ WARNING: Requested dGPU but iGPU detected!", the browser/OS is ignoring the hint.

### Windows Graphics Settings Fix:

1. **Open Windows Settings**
2. Go to: **System > Display > Graphics Settings**
3. Click "**Browse**"
4. Navigate to your Electron app:
   - Dev: `node_modules/electron/dist/electron.exe`
   - Production: `dist-electron/VoxelWorld.exe` (or similar)
5. Select the app and click "**Options**"
6. Choose "**High Performance**"
7. Click "**Save**"
8. Restart the game

### Alternative: Command Line Flag

The Electron GPU flags we added should help, but Windows may still override. If issues persist, you can also:

1. Create a shortcut to the game
2. Right-click > Properties
3. In "Target", add: `--force_high_performance_gpu`
4. Example: `"C:\...\VoxelWorld.exe" --force_high_performance_gpu`

## 📊 **Expected Performance Differences**

### iGPU (Integrated GPU):
- **Example**: Intel UHD Graphics, Intel Iris Xe
- **Expected FPS**: 30-45 FPS (with BVH optimization)
- **Best for**: Battery life, casual play, lower render distances

### dGPU (Dedicated GPU):
- **Example**: NVIDIA RTX 4060, AMD Radeon RX 6600
- **Expected FPS**: 60-120+ FPS (with BVH optimization)
- **Best for**: Performance, higher render distances, smoother gameplay

## 🔧 **Technical Details**

### WebGL powerPreference Options:
- **`'high-performance'`**: Request dGPU (dedicated GPU)
- **`'low-power'`**: Request iGPU (integrated GPU, battery saving)
- **`'default'`**: Let browser decide

### Limitations:
1. **Hint, not command**: Browser/OS can ignore the preference
2. **Runtime switching impossible**: Must reload to change GPU
3. **OS override**: Windows Graphics Settings takes priority
4. **Browser-dependent**: Different browsers may handle differently

### Why Automatic Reload:
- WebGL context is created with GPU at renderer creation
- Cannot change GPU after creation
- Must destroy and recreate renderer (= full page reload)
- Automatic reload ensures GPU change actually happens

## 📝 **Files Modified**

1. **src/VoxelWorld.js**:
   - Line ~12407: Automatic reload on GPU change
   - Line ~8085: Enhanced GPU detection and verification logging

2. **electron.cjs**:
   - Line ~4: Added GPU command-line flags

## 🎯 **Summary**

### Before:
- ❌ Manual reload required (user forgets)
- ❌ No verification if GPU actually changed
- ❌ No Electron GPU flags
- ❌ Confusing UX (button changes but nothing happens)

### After:
- ✅ Automatic reload (1 second delay)
- ✅ Comprehensive GPU detection logging
- ✅ Electron GPU flags for dGPU preference
- ✅ Clear console messages with troubleshooting tips
- ✅ Verifies if GPU request was honored

---

**Version**: 0.4.10  
**Date**: October 13, 2025  
**Author**: Ron Murphy (with Claude assistance)
