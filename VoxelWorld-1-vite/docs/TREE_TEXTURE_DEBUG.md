# 🌲 Tree Texture Debug Report

## Issue
Tree trunk blocks (oak_wood, pine_wood, birch_wood, etc.) are not using the enhanced PNG textures in the electron build.

## System Overview

### Multi-Face Texture System
The game supports multi-face block textures with suffixes:
- `-sides` - Applied to 4 side faces of the block
- `-top-bottom` - Applied to top and bottom faces
- `-all` - Same texture on all 6 faces
- `-top` - Top face only
- `-bottom` - Bottom face only

### File Examples
```
oak_wood-sides.jpeg       # Bark texture for sides
oak_wood-top-bottom.jpeg  # Wood rings for top/bottom
pine_wood-sides.jpg
pine_wood-top-bottom.jpeg
birch_wood-sides.jpeg
birch_wood-top-bottom.jpeg
```

## Investigation Steps

### 1. Check Asset Discovery (Electron)
The `electron-preload.cjs` exposes `window.electronAPI.listAssetFiles(category)` to list files in:
- Development: `assets/art/blocks/`
- Production: `dist/art/blocks/` (unpacked via asarUnpack)

**Updated**: Added better logging to show path resolution and first 10 files.

### 2. Check EnhancedGraphics Discovery
`EnhancedGraphics._discoverAvailableAssets()` should:
1. Call `window.electronAPI.listAssetFiles('blocks')`
2. Parse filenames to extract base names (remove `-sides`, `-top-bottom` suffixes)
3. Build `fileExtensionMap` to track which extensions exist
4. Only include blocks that have:
   - A main texture file (e.g., `oak_wood.png`)
   - OR multi-face variants (both `-sides` and `-top-bottom`)

**Potential Issue**: If wood blocks have `-sides.jpeg` and `-top-bottom.jpeg` but NO main `oak_wood.png`, they should still be included (line 225 checks `info.variants.length >= 2`).

**Updated**: Added debug logging to show discovered wood blocks.

### 3. Check Texture Loading
`EnhancedGraphics._loadMultiFaceTextures(blockType)` should:
1. Check if block is in `multiFaceBlocks` array (line 375)
2. Try loading `-sides`, `-top-bottom`, `-all` variants using known extensions
3. Return array of 6 textures for cube faces OR single texture

**Potential Issue**: `oak_wood` IS in the `multiFaceBlocks` array (line 375), so it should load multi-face textures.

### 4. Check Material Application
`getEnhancedBlockMaterial(blockType, defaultMaterial)` should:
1. Check for texture aliases (none for wood blocks currently)
2. Get textures from `blockTextures.get(blockType)`
3. If array, create array of materials for cube faces
4. If single texture, create single material

## Changes Made

### electron-preload.cjs
- ✅ Added better path resolution logging
- ✅ Added debug output for first 10 block files
- ✅ Updated comments to clarify dist/art/ is used in packaged apps

### EnhancedGraphics.js
- ✅ Added debug logging to show discovered wood blocks

### package.json
- ✅ Already updated `asarUnpack` to include `dist/art/**/*`

## Next Steps

1. **Rebuild electron app**: `./desktopBuild.sh`
2. **Open DevTools** in electron app (Ctrl+Shift+I)
3. **Check console logs**:
   - Look for "📁 Found X files in blocks" message
   - Look for "🌲 Wood blocks found:" array
   - Look for "✅ blocks: X assets found" message
4. **Check for errors**:
   - Asset loading failures
   - Path not found warnings
   - Texture loading errors

## Expected Console Output

```
📁 Found 50+ files in blocks (C:\...\dist\art\blocks)
   First 10 blocks: ['birch_wood-leaves.png', 'birch_wood-sides.jpeg', ...]
✅ blocks: 30 assets found (including 0 aliases)
   🌲 Wood blocks found: ['oak_wood', 'pine_wood', 'birch_wood', 'palm_wood', 'dead_wood', 'douglas_fir']
```

## Possible Root Causes

1. **Path Resolution**: Electron not finding `dist/art/blocks/` folder
2. **Extension Detection**: Mixed extensions (.jpeg, .jpg, .png) causing issues
3. **Base Name Parsing**: Suffix removal not working correctly
4. **Variant Detection**: Not recognizing `-sides` and `-top-bottom` as valid pair
5. **Texture Loading**: Failing to load actual texture files after discovery
6. **Material Application**: Not applying multi-face material array correctly

## Testing Commands

```bash
# Rebuild electron app
./desktopBuild.sh

# Test web version (should work)
npm run dev

# Check what files exist in dist
ls -la dist/art/blocks/ | grep wood

# After unpacking electron build, check files
cd dist-electron/<unpacked-folder>/resources/app.asar.unpacked/dist/art/blocks/
ls -la | grep wood
```

## Resolution

Once the debug logs are captured from the electron console, we can identify which step is failing and apply the appropriate fix.
