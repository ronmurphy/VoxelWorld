# 🎮 VoxelWorld Command-Line Switches Guide

## For Testers: How to Force GPU Selection

If the in-game GPU selection isn't working, you can force GPU usage with command-line switches.

---

## 🪟 **Windows Instructions**

### Method 1: Create Desktop Shortcut (Easiest for Testers)

1. **Locate VoxelWorld.exe**:
   - Usually in: `C:\Users\YourName\Downloads\VoxelWorld\` (or wherever you extracted it)
   - Or in: `dist-electron\` folder after building

2. **Right-click on VoxelWorld.exe**
   - Select "**Create shortcut**"

3. **Right-click the new shortcut**
   - Select "**Properties**"

4. **In the "Target" field**, add switches at the END:
   ```
   "C:\Path\To\VoxelWorld.exe" --force_high_performance_gpu --disable-gpu-vsync
   ```

5. **Click "Apply"** and **"OK"**

6. **Rename the shortcut** (optional):
   - "VoxelWorld (High Performance)"

7. **Use this shortcut** to launch the game

### Method 2: Command Prompt (For Advanced Users)

1. **Open Command Prompt**:
   - Press `Win + R`
   - Type `cmd` and press Enter

2. **Navigate to game folder**:
   ```cmd
   cd C:\Path\To\VoxelWorld
   ```

3. **Launch with switches**:
   ```cmd
   VoxelWorld.exe --force_high_performance_gpu --disable-gpu-vsync
   ```

### Method 3: PowerShell (Alternative)

1. **Open PowerShell**:
   - Right-click Start menu
   - Select "Windows PowerShell"

2. **Navigate to game folder**:
   ```powershell
   cd "C:\Path\To\VoxelWorld"
   ```

3. **Launch with switches**:
   ```powershell
   .\VoxelWorld.exe --force_high_performance_gpu --disable-gpu-vsync
   ```

---

## 🐧 **Linux Instructions**

### Method 1: Desktop Launcher (Easiest for Testers)

1. **Create a desktop file**:
   ```bash
   nano ~/.local/share/applications/voxelworld.desktop
   ```

2. **Add this content** (adjust paths):
   ```ini
   [Desktop Entry]
   Type=Application
   Name=VoxelWorld (High Performance)
   Comment=VoxelWorld with GPU flags
   Exec=/path/to/VoxelWorld --force_high_performance_gpu --disable-gpu-vsync
   Icon=/path/to/voxelworld.png
   Terminal=false
   Categories=Game;
   ```

3. **Save and make executable**:
   ```bash
   chmod +x ~/.local/share/applications/voxelworld.desktop
   ```

4. **Launch from Applications menu**

### Method 2: Terminal Command (For Testing)

1. **Open Terminal**:
   - Press `Ctrl + Alt + T`

2. **Navigate to game folder**:
   ```bash
   cd /path/to/VoxelWorld
   ```

3. **Make executable** (first time only):
   ```bash
   chmod +x VoxelWorld
   ```

4. **Launch with switches**:
   ```bash
   ./VoxelWorld --force_high_performance_gpu --disable-gpu-vsync
   ```

### Method 3: Shell Script (For Repeated Use)

1. **Create a launch script**:
   ```bash
   nano ~/launch-voxelworld.sh
   ```

2. **Add this content**:
   ```bash
   #!/bin/bash
   cd /path/to/VoxelWorld
   ./VoxelWorld --force_high_performance_gpu --disable-gpu-vsync
   ```

3. **Make executable**:
   ```bash
   chmod +x ~/launch-voxelworld.sh
   ```

4. **Run the script**:
   ```bash
   ~/launch-voxelworld.sh
   ```

---

## 🎛️ **Available Command-Line Switches**

### GPU Performance Switches:

| Switch | Description | Recommended For |
|--------|-------------|-----------------|
| `--force_high_performance_gpu` | Forces use of dedicated GPU (dGPU) | **All testers with gaming laptops/PCs** |
| `--disable-gpu-vsync` | Disables V-Sync for uncapped FPS | Testing max performance |
| `--ignore-gpu-blacklist` | Uses GPU even if flagged problematic | Older GPUs or driver issues |
| `--enable-gpu-rasterization` | Uses GPU for 2D rendering | Better overall performance |

### Debugging Switches:

| Switch | Description | When to Use |
|--------|-------------|-------------|
| `--enable-logging` | Shows detailed logs | Troubleshooting crashes |
| `--disable-gpu` | Software rendering only | Testing without GPU |
| `--disable-software-rasterizer` | Forces hardware rendering | GPU not being used |
| `--in-process-gpu` | Runs GPU in main process | GPU process crashes |

### Development Switches (Internal Use):

| Switch | Description |
|--------|-------------|
| `--remote-debugging-port=9222` | Chrome DevTools remote debugging |
| `--inspect` | Node.js debugging |
| `--trace-warnings` | Shows Node.js warnings |

---

## 📋 **Recommended Configurations**

### For Gaming Laptops (NVIDIA/AMD dGPU):
```bash
# Windows
VoxelWorld.exe --force_high_performance_gpu --disable-gpu-vsync

# Linux
./VoxelWorld --force_high_performance_gpu --disable-gpu-vsync
```

### For Integrated Graphics (Intel/AMD iGPU):
```bash
# Windows
VoxelWorld.exe --disable-gpu-vsync

# Linux
./VoxelWorld --disable-gpu-vsync
```

### For Troubleshooting GPU Issues:
```bash
# Windows
VoxelWorld.exe --force_high_performance_gpu --ignore-gpu-blacklist --enable-logging

# Linux
./VoxelWorld --force_high_performance_gpu --ignore-gpu-blacklist --enable-logging
```

### For Maximum Performance Testing:
```bash
# Windows
VoxelWorld.exe --force_high_performance_gpu --disable-gpu-vsync --enable-gpu-rasterization --ignore-gpu-blacklist

# Linux
./VoxelWorld --force_high_performance_gpu --disable-gpu-vsync --enable-gpu-rasterization --ignore-gpu-blacklist
```

---

## 🧪 **Testing Procedure for Testers**

### Step 1: Test Default Launch
1. Launch game normally (no switches)
2. Press **F12** to open DevTools
3. Look for "**🎮 GPU DETECTION REPORT**" in console
4. Note which GPU is detected
5. Note FPS (toggle with **View > FPS Counter**)

### Step 2: Test With GPU Switches
1. Close game completely
2. Launch with switches (use method above)
3. Press **F12** again
4. Check GPU DETECTION REPORT - did GPU change?
5. Note new FPS - is it higher?

### Step 3: Report Results
Please report back:
- **System Info**: OS, CPU, GPU models (both iGPU and dGPU)
- **Default GPU**: Which GPU was used without switches?
- **Default FPS**: What FPS did you get?
- **With Switches GPU**: Did GPU change with switches?
- **With Switches FPS**: Did FPS improve?
- **Console Warnings**: Any errors or warnings?

---

## ❓ **Troubleshooting**

### "Command not found" (Linux)
**Problem**: Terminal says `command not found`  
**Solution**: You're not in the right folder. Use full path:
```bash
/full/path/to/VoxelWorld --force_high_performance_gpu
```

### "Access denied" (Windows)
**Problem**: Can't run exe  
**Solution**: Right-click exe > Properties > Unblock > Apply

### Switches Not Working
**Problem**: Switches don't seem to do anything  
**Solution**: 
1. Make sure switches are AFTER the exe name
2. Use double dashes: `--switch` not `-switch`
3. Check Windows Graphics Settings (overrides switches)

### Game Still Uses Wrong GPU
**Problem**: Even with `--force_high_performance_gpu`, iGPU is used  
**Solution**: Windows Graphics Settings takes priority:
1. Windows Settings > System > Display > Graphics Settings
2. Add VoxelWorld.exe
3. Set to "High Performance"
4. Restart computer

### Can't Find VoxelWorld.exe
**Problem**: Don't know where game is installed  
**Windows**: Right-click shortcut > "Open file location"  
**Linux**: Usually in `/opt/VoxelWorld` or `~/Games/VoxelWorld`

---

## 📝 **Quick Reference Card** (For Testers)

### Windows - Copy & Paste This:
```batch
REM Navigate to your VoxelWorld folder first!
cd C:\Path\To\VoxelWorld
VoxelWorld.exe --force_high_performance_gpu --disable-gpu-vsync
```

### Linux - Copy & Paste This:
```bash
# Navigate to your VoxelWorld folder first!
cd /path/to/VoxelWorld
./VoxelWorld --force_high_performance_gpu --disable-gpu-vsync
```

---

## 🎯 **What to Expect**

### If Switches Work:
- ✅ Console shows: "**✅ STATUS: dGPU requested and dGPU detected - MATCH! 🎯**"
- ✅ FPS increases (sometimes 2-3x improvement!)
- ✅ Game feels smoother, less stuttering
- ✅ Can increase render distance without lag

### If Switches Don't Work:
- ⚠️ Console shows: "**⚠️ WARNING: Requested dGPU but iGPU detected!**"
- ⚠️ FPS stays the same
- ⚠️ Need to use Windows Graphics Settings instead
- ⚠️ OS is overriding the switches

---

## 💡 **Tips for Testers**

1. **Always check console** - F12 shows which GPU is actually used
2. **Toggle FPS counter** - View > FPS Counter to see real-time performance
3. **Test in different areas** - FPS varies by location (spawn vs. far away)
4. **Try both modes** - Test with iGPU and dGPU, report differences
5. **Note your specs** - Include your GPU model in feedback
6. **Screenshot console** - If issues occur, screenshot GPU Detection Report

---

## 📞 **Need Help?**

If you're stuck, provide this info:
- Operating System (Windows/Linux version)
- GPU Models (both integrated and dedicated if you have both)
- How you're launching the game (shortcut, command line, etc.)
- Screenshot of console GPU Detection Report
- Any error messages

---

**Version**: 0.4.10  
**Last Updated**: October 13, 2025  
**Author**: Ron Murphy

**Note**: These switches are built into the Electron app by default, but can be added manually for troubleshooting or to override system settings.
