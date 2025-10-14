# 🎮 Command-Line Switches - Visual Guide

```
┌─────────────────────────────────────────────────────────────────────┐
│                    WINDOWS COMMAND-LINE SYNTAX                      │
└─────────────────────────────────────────────────────────────────────┘

Method 1: Shortcut Target Field
┌─────────────────────────────────────────────────────────────────────┐
│  "C:\Path\To\VoxelWorld.exe" --force_high_performance_gpu          │
│   └──────┬──────────────────┘  └────────────┬─────────────────┘    │
│          │                                   │                       │
│       Path to EXE                       Command Switch              │
│    (must be in quotes)                (outside quotes!)             │
└─────────────────────────────────────────────────────────────────────┘

Multiple Switches:
┌─────────────────────────────────────────────────────────────────────┐
│  "C:\Path\To\VoxelWorld.exe" --switch1 --switch2 --switch3          │
│   └──────┬──────────────────┘  └───┬────┘ └───┬────┘ └───┬────┘    │
│          │                         │          │          │           │
│       Path to EXE               Switch1    Switch2    Switch3       │
│                                (space-separated)                     │
└─────────────────────────────────────────────────────────────────────┘

Method 2: Command Prompt
┌─────────────────────────────────────────────────────────────────────┐
│  cd C:\Path\To\VoxelWorld                                           │
│  VoxelWorld.exe --force_high_performance_gpu                        │
└─────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│                     LINUX COMMAND-LINE SYNTAX                       │
└─────────────────────────────────────────────────────────────────────┘

Method 1: Terminal
┌─────────────────────────────────────────────────────────────────────┐
│  cd /path/to/VoxelWorld                                             │
│  ./VoxelWorld --force_high_performance_gpu                          │
│  └─┬─────────┘ └────────────┬─────────────────┘                    │
│    │                         │                                       │
│  Execute            Command Switch                                  │
│  (dot-slash)                                                         │
└─────────────────────────────────────────────────────────────────────┘

Multiple Switches:
┌─────────────────────────────────────────────────────────────────────┐
│  ./VoxelWorld --switch1 --switch2 --switch3                         │
│  └─┬─────────┘ └───┬────┘ └───┬────┘ └───┬────┘                    │
│    │               │          │          │                           │
│  Execute        Switch1    Switch2    Switch3                       │
│             (space-separated)                                        │
└─────────────────────────────────────────────────────────────────────┘

Method 2: Shell Script
┌─────────────────────────────────────────────────────────────────────┐
│  #!/bin/bash                                                        │
│  cd /path/to/VoxelWorld                                             │
│  ./VoxelWorld --force_high_performance_gpu                          │
└─────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│                      AVAILABLE SWITCHES                             │
└─────────────────────────────────────────────────────────────────────┘

GPU Performance:
  --force_high_performance_gpu    ← Forces dGPU (dedicated GPU)
  --disable-gpu-vsync             ← Uncaps FPS (disables V-Sync)
  --ignore-gpu-blacklist          ← Uses GPU even if blacklisted
  --enable-gpu-rasterization      ← GPU-accelerated 2D rendering

Debugging:
  --enable-logging                ← Shows detailed console logs
  --disable-gpu                   ← Software rendering only
  --remote-debugging-port=9222    ← Chrome DevTools debugging


┌─────────────────────────────────────────────────────────────────────┐
│                    COMMON COMBINATIONS                              │
└─────────────────────────────────────────────────────────────────────┘

For Gaming Laptops (Recommended):
  --force_high_performance_gpu --disable-gpu-vsync

Maximum Performance:
  --force_high_performance_gpu --disable-gpu-vsync --enable-gpu-rasterization

Troubleshooting GPU Issues:
  --force_high_performance_gpu --ignore-gpu-blacklist --enable-logging


┌─────────────────────────────────────────────────────────────────────┐
│                        REAL EXAMPLES                                │
└─────────────────────────────────────────────────────────────────────┘

WINDOWS Shortcut Target:
✅ CORRECT:
  "C:\Games\VoxelWorld\VoxelWorld.exe" --force_high_performance_gpu

❌ WRONG (switches inside quotes):
  "C:\Games\VoxelWorld\VoxelWorld.exe --force_high_performance_gpu"

❌ WRONG (single dash):
  "C:\Games\VoxelWorld\VoxelWorld.exe" -force_high_performance_gpu


LINUX Terminal:
✅ CORRECT:
  ./VoxelWorld --force_high_performance_gpu

❌ WRONG (no dot-slash):
  VoxelWorld --force_high_performance_gpu

❌ WRONG (single dash):
  ./VoxelWorld -force_high_performance_gpu


┌─────────────────────────────────────────────────────────────────────┐
│                    VERIFY IT WORKED                                 │
└─────────────────────────────────────────────────────────────────────┘

1. Launch game with switches
2. Press F12 (Developer Tools)
3. Look for this in console:

    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    🎮 GPU DETECTION REPORT:
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    📝 Requested Preference: "high-performance"
    🏭 GPU Vendor: NVIDIA Corporation
    🎨 GPU Renderer: NVIDIA GeForce RTX 4060
    ✅ DETECTED: Dedicated GPU (dGPU)
    ✅ STATUS: dGPU requested and dGPU detected - MATCH! 🎯
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ If you see "MATCH! 🎯" - SUCCESS! dGPU is being used
⚠️ If you see "WARNING: mismatch" - Need Windows Graphics Settings


┌─────────────────────────────────────────────────────────────────────┐
│                    TROUBLESHOOTING                                  │
└─────────────────────────────────────────────────────────────────────┘

"Command not found" (Linux):
  → Use full path: /full/path/to/VoxelWorld --switches
  → Or navigate first: cd /path/to/VoxelWorld

"Access denied" (Windows):
  → Right-click exe > Properties > Unblock > Apply

Switches don't work:
  → Check Windows Graphics Settings (overrides switches)
  → Make sure using double dash: --switch not -switch
  → Verify switches are outside quotes in shortcut

Wrong GPU still used:
  → Windows Graphics Settings takes priority
  → Settings > System > Display > Graphics Settings
  → Add VoxelWorld.exe, set to "High Performance"


┌─────────────────────────────────────────────────────────────────────┐
│                    QUICK COPY-PASTE                                 │
└─────────────────────────────────────────────────────────────────────┘

Windows Shortcut Target (adjust path):
"C:\Users\YourName\Downloads\VoxelWorld\VoxelWorld.exe" --force_high_performance_gpu --disable-gpu-vsync

Linux Terminal (adjust path):
cd ~/Downloads/VoxelWorld && ./VoxelWorld --force_high_performance_gpu --disable-gpu-vsync

Linux Shell Script:
#!/bin/bash
cd ~/Downloads/VoxelWorld
./VoxelWorld --force_high_performance_gpu --disable-gpu-vsync
```

---

**Remember**: 
- Windows: Use **double quotes** around path, switches **outside** quotes
- Linux: Use **./VoxelWorld** (dot-slash), not just **VoxelWorld**
- Both: Use **double dash** (--) not single dash (-)
- Both: Switches are **space-separated**
