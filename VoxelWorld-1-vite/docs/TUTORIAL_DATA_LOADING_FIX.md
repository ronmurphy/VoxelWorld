# Tutorial Data Loading Fix - October 14, 2025

## Problem
The tutorial system was failing to load with error:
```
🎓 Failed to load tutorial scripts: TypeError: Failed to fetch
```

## Root Cause
The `/data/tutorialScripts.json` file was not being copied to the `dist/` folder during the build process. Vite's `publicDir` was set to `'assets'`, which only copied the assets folder.

## Solution

### Created New Vite Plugin: `vite-plugin-copy-data.js`
This plugin copies all files from the `data/` folder to `dist/data/` during build.

**Files copied:**
- `data/README.md`
- `data/blueprints.json`
- `data/plans.json`
- `data/recipes.json`
- `data/tutorialScripts.json`

### Updated `vite.config.js`
Added the new plugin to the build pipeline:
```javascript
import copyDataFiles from './vite-plugin-copy-data.js';

export default defineConfig({
  plugins: [
    assetManifest(),
    miniTexturesPlugin(),
    copyHelpFiles(),
    copyDataFiles()  // ← NEW
  ],
  // ...
});
```

## How It Works

### Development Mode (`npm run dev`)
- Files are served directly from `/data/tutorialScripts.json`
- Vite dev server handles the routing

### Production Build (`npm run build`)
- The plugin copies all data files to `dist/data/`
- Tutorial system loads from `/data/tutorialScripts.json` in the built app
- Electron app serves from the `dist/` folder

## Testing

### To test the fix:
```bash
# 1. Build the app
npm run build

# 2. Verify files were copied
ls -la dist/data/

# 3. Run the built version
npm start
```

### Expected console output:
```
🎓 Loaded 15 tutorial scripts
```

## Files Modified

1. **Created**: `/vite-plugin-copy-data.js` - New plugin
2. **Modified**: `/vite.config.js` - Added plugin import and usage
3. **Already Fixed**: 
   - `/src/ui/TutorialScriptSystem.js` - Loads from `/data/tutorialScripts.json`
   - `/src/GhostSystem.js` - Added safety check for tutorialSystem
   - `/src/AnimalSystem.js` - Added safety check for tutorialSystem

## Other Data Files

The plugin also ensures these important JSON files are available in production:
- `blueprints.json` - Tool bench blueprints
- `plans.json` - Workbench plans (if used)
- `recipes.json` - Kitchen bench recipes

## Build Output
```
📋 Copied: data/README.md → dist/data/README.md
📋 Copied: data/blueprints.json → dist/data/blueprints.json
📋 Copied: data/plans.json → dist/data/plans.json
📋 Copied: data/recipes.json → dist/data/recipes.json
📋 Copied: data/tutorialScripts.json → dist/data/tutorialScripts.json
✅ Data files copied to dist/
```

---

**Result**: Tutorial scripts now load correctly in production builds! 🎯
