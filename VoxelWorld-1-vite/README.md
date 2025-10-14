# 🎮 VoxelWorld

A voxel-based adventure game built with Three.js, featuring procedural world generation, crafting systems, and companion creatures.

## 🚀 Quick Start

### Playing the Game

**Windows:**
- Double-click `VoxelWorld.exe`
- Or create shortcut with GPU switches (see below)

**Linux:**
```bash
chmod +x VoxelWorld
./VoxelWorld
```

### Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run Electron app
npm start

# Build desktop app (auto-bumps version)
./desktopBuild.sh
```

## 🎮 GPU Performance (Important!)

### For Gaming Laptops with Dedicated GPU:

If you have both integrated (iGPU) and dedicated (dGPU) graphics, force use of the dGPU for better performance:

**Windows - Create Shortcut with Switches:**
1. Right-click `VoxelWorld.exe` → "Create shortcut"
2. Right-click shortcut → "Properties"
3. In "Target" field add:
   ```
   --force_high_performance_gpu --disable-gpu-vsync
   ```
4. Full example:
   ```
   "C:\Games\VoxelWorld.exe" --force_high_performance_gpu --disable-gpu-vsync
   ```

**Linux - Launch with Switches:**
```bash
./VoxelWorld --force_high_performance_gpu --disable-gpu-vsync
```

### Verify GPU Usage:
1. Launch game
2. Press **F12** (Developer Tools)
3. Look for "**🎮 GPU DETECTION REPORT**"
4. Should show: "**✅ STATUS: dGPU requested and dGPU detected - MATCH! 🎯**"

**See `docs/GPU_QUICK_START.md` for detailed instructions**

## 📊 Performance Monitoring

### FPS Counter:
- Enable: **View > FPS Counter** (menu bar)
- Or console: `window.voxelWorld.toggleFPS()`
- Shows real-time FPS in top-left corner

### Expected Performance:
- **iGPU** (Intel/AMD integrated): 30-45 FPS
- **dGPU** (NVIDIA/AMD dedicated): 60-120+ FPS

## ✨ Features

### World Generation
- **Procedural terrain** with biomes
- **Chunk-based** loading for infinite worlds
- **BVH acceleration** for 100x faster raycasting
- **Day/night cycle** with music transitions

### Gameplay
- **Mining & Building** - Harvest resources, build structures
- **Crafting System** - Create tools, weapons, and items
- **Companion Creatures** - Collect and adventure with monsters
- **Tutorial System** - Companion-guided learning
- **Inventory Management** - Hotbar, backpack, storage

### Graphics
- **Enhanced Graphics** - Custom textures and detailed visuals
- **Emoji Support** - Universal emoji rendering (Wine/Windows/Linux compatible)
- **Particle Effects** - Water, explosions, animations
- **LOD System** - Level-of-detail optimization

### Audio
- **Howler.js Integration** - Professional audio library
- **Day/Night Music** - Automatic crossfading between tracks
- **Volume Controls** - Adjustable music volume and mute

## 🎯 Controls

### Movement
- **W/A/S/D** - Move forward/left/backward/right
- **Space** - Jump
- **Shift** - Sprint
- **Mouse** - Look around

### Actions
- **Left Click** - Mine/Attack
- **Right Click** - Place block/Use item
- **E** - Open workbench
- **M** - Open world map
- **C** - Open companion codex
- **ESC** - Open menu/Close UI

### Inventory
- **1-5** - Select hotbar slot
- **Mouse Wheel** - Cycle hotbar
- **Q** - (Currently unassigned)

### Debug
- **F12** - Developer Tools
- **F11** - Fullscreen toggle
- **View > FPS Counter** - Toggle FPS display

## 🛠️ Technical Details

### Built With
- **Three.js** - 3D rendering engine
- **Vite** - Build tool and dev server
- **Electron** - Desktop app packaging
- **Howler.js** - Audio library
- **stats.js** - FPS monitoring
- **three-mesh-bvh** - Raycasting acceleration

### Architecture
- **Modular systems** - Separate managers for different game systems
- **Worker threads** - Chunk generation offloaded to workers
- **LocalStorage persistence** - Save/load game state
- **Asset manifests** - Build-time asset discovery for Electron

### Performance Optimizations
- **BVH Trees** - 10-100x faster raycasting
- **LOD System** - Distance-based detail levels
- **Chunk pooling** - Reuse geometries and materials
- **GPU acceleration** - Forced high-performance GPU usage

## 📁 Project Structure

```
VoxelWorld-1-vite/
├── src/
│   ├── VoxelWorld.js          # Main game class
│   ├── App.js                 # Entry point
│   ├── MusicSystem.js         # Audio management
│   ├── AnimationSystem.js     # Particle effects
│   ├── ui/                    # UI components
│   ├── workers/               # Web workers
│   └── ...
├── art/                       # Game assets
│   ├── blocks/                # Block textures
│   ├── entities/              # Creature sprites
│   ├── tools/                 # Tool icons
│   └── ...
├── music/                     # Game music
├── docs/                      # Documentation
├── dist/                      # Build output
├── electron.cjs               # Electron main process
├── electron-preload.cjs       # Preload script
├── vite.config.js             # Vite configuration
└── package.json               # Dependencies

```

## 📚 Documentation

### For Players:
- `docs/GPU_QUICK_START.md` - Quick GPU setup guide
- `docs/COMMAND_LINE_SWITCHES.md` - Detailed command-line options
- `GPU_SELECTION_FIX.md` - GPU troubleshooting
- `FPS_COUNTER_INTEGRATION.md` - FPS counter details

### For Developers:
- `CHANGELOG2.md` - Recent changes and features
- `docs/BVH_RAYCASTING_ACCELERATION.md` - BVH implementation
- `docs/DAY_NIGHT_MUSIC_SYSTEM.md` - Music system details
- `docs/DUAL_BENCHMARK_SYSTEM.md` - Performance testing
- `docs/GPU_OPTIMIZATION.md` - GPU detection and optimization

## 🐛 Troubleshooting

### GPU Not Switching
- Use command-line switches (see above)
- Or Windows Graphics Settings: Settings > System > Display > Graphics Settings
- Add VoxelWorld.exe and set to "High Performance"

### Low FPS
- Toggle FPS counter: View > FPS Counter
- Check GPU Detection Report in console (F12)
- Reduce render distance in Adventurer's Menu
- Run performance benchmark in menu

### Game Won't Launch
- Check console for errors (F12)
- Verify all assets loaded correctly
- Try clearing localStorage: `localStorage.clear()`
- Reinstall if necessary

### Save Issues
- Saves are in browser localStorage
- Use "Save World" in Adventurer's Menu
- Backup: Export localStorage data

## 🧪 Testing

### For Testers:
1. **Test both GPU modes** (iGPU and dGPU if available)
2. **Enable FPS counter** (View > FPS Counter)
3. **Run benchmark** (Adventurer's Menu > Performance > Benchmark)
4. **Report performance**:
   - OS and version
   - CPU model
   - GPU models (both iGPU and dGPU)
   - FPS achieved
   - GPU actually used (check console)

### Testing Checklist:
- [ ] Game launches successfully
- [ ] GPU Detection Report shows correct GPU
- [ ] FPS counter displays (View > FPS Counter)
- [ ] World generates correctly
- [ ] Can mine and place blocks
- [ ] Inventory works (hotbar, backpack)
- [ ] Crafting works
- [ ] Music plays and crossfades
- [ ] Day/night cycle works
- [ ] Save/Load works

## 📦 Building

### Development Build:
```bash
npm run build
npm start
```

### Production Build (with version bump):
```bash
./desktopBuild.sh
```
This will:
1. Bump version number
2. Build web assets
3. Package for Windows and Linux
4. Output to `dist-electron/`

### Manual Versioning:
```bash
node bump-version.cjs  # Increment version
npm run build          # Build assets
npm run build-wl       # Build Windows + Linux
npm run build-all      # Build Windows + Linux + macOS
```

## 🔢 Version Info

**Current Version**: 0.4.10 (October 13, 2025)

**Recent Updates:**
- ✅ FPS counter integration (stats.js)
- ✅ GPU selection fix with automatic reload
- ✅ Enhanced GPU detection and verification
- ✅ Electron GPU flags for dGPU preference
- ✅ BVH raycasting acceleration (100x faster)
- ✅ Day/night music crossfading

See `CHANGELOG2.md` for full version history.

## 👥 Credits

- **Original Code**: Ron Murphy ([@ronmurphy](https://github.com/ronmurphy))
- **Code Refinements**: Claude (Anthropic)
- **Artwork**: m0use
- **Music**: Jason Heaberlin
- **Testing Team**:
  - Michelle Smith
  - David Daniels
  - Chris Mahan
  - Connor Allen

## 📄 License

[Add your license here]

## 🔗 Links

- **Repository**: [github.com/ronmurphy/VoxelWorld](https://github.com/ronmurphy/VoxelWorld)
- **Issues**: [Report bugs](https://github.com/ronmurphy/VoxelWorld/issues)

---

**Built with ❤️ using Three.js • Vite • Electron**

*Thank you for playtesting!* 🎮
