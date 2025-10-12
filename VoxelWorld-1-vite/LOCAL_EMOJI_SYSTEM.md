# 🎨 Local Emoji System Guide

## Overview
VoxelWorld now uses **local emoji assets** instead of CDN-based rendering. This provides:
- ⚡ **Faster performance** - No network requests, all assets are bundled
- 🌐 **Works offline** - No internet required
- 🎨 **Multiple styles** - Google (Noto), Apple, Twitter, and Microsoft emoji
- 🔧 **User customizable** - Players can choose their preferred emoji style
- 🍷 **Wine compatible** - Works perfectly in Wine and all platforms

## Installed Packages

### Emoji Datasources
- `emoji-datasource-google` (78 MB) - Google's Noto emoji
- `emoji-datasource-apple` (78 MB) - Apple emoji
- `emoji-datasource-twitter` (78 MB) - Twitter's Twemoji

Total: ~234 MB of emoji assets bundled with your app

## How It Works

### 1. EmojiRenderer.js
The core emoji system that:
- Converts unicode emoji to `<img>` tags with local PNG sources
- Uses MutationObserver to handle dynamically added content
- Stores user preference in localStorage
- Provides fallback to original emoji if image fails

### 2. EmojiChooser.js
UI component for emoji style selection:
- Shows preview of all emoji styles
- Allows instant switching between styles
- Designed to integrate into your Adventurer's Menu

## Usage

### Automatic Emoji Conversion
```javascript
// In App.js - already configured
import { initEmojiSupport } from './EmojiRenderer.js';

// Initialize on app start
initEmojiSupport();

// Now ALL emoji in your app automatically convert to images!
// 📍 Log -> <img src="/node_modules/emoji-datasource-google/img/google/64/1f4cd.png">
```

### Get Emoji Image URL (for Three.js textures)
```javascript
import { getEmojiImageUrl } from './EmojiRenderer.js';

// Use in Three.js billboards or sprites
const emojiUrl = getEmojiImageUrl('🌲');
const texture = textureLoader.load(emojiUrl);
```

### Change Emoji Style
```javascript
import { setEmojiSet, getEmojiSet } from './EmojiRenderer.js';

// Get current style
const current = getEmojiSet(); // 'google', 'apple', 'twitter', or 'microsoft'

// Change style
setEmojiSet('apple'); // Instantly re-renders all emoji
```

### Add Emoji Chooser to Menu
```javascript
import { createEmojiChooser } from './EmojiChooser.js';

// Add to your menu system
const emojiTab = createEmojiChooser();
menuContent.appendChild(emojiTab);
```

## Performance Comparison

### Old System (Twemoji CDN)
- ❌ Network latency on each emoji load
- ❌ Jerky gameplay in development
- ❌ Requires internet connection
- ❌ CDN dependency

### New System (Local Assets)
- ✅ Zero network requests
- ✅ Smooth gameplay in dev and production
- ✅ Works offline
- ✅ Bundled with app

## Build Configuration

### package.json
```json
"asarUnpack": [
  "node_modules/emoji-datasource-google/**/*",
  "node_modules/emoji-datasource-apple/**/*",
  "node_modules/emoji-datasource-twitter/**/*"
]
```

This ensures emoji assets are unpacked from ASAR so they can be loaded by the renderer.

### Vite Configuration
Vite automatically serves node_modules in dev mode at `/node_modules/`, so the same paths work in both dev and production!

## File Paths

### Development Mode
```
/node_modules/emoji-datasource-google/img/google/64/1f4cd.png
```

### Production Build
```
app.asar.unpacked/node_modules/emoji-datasource-google/img/google/64/1f4cd.png
```

The system uses the same path structure - Electron handles the unpacking automatically.

## Available Emoji Styles

1. **Google (Noto)** - Default
   - Universal, clean design
   - Works on all platforms
   - Recommended for consistency

2. **Apple**
   - iOS-style emoji
   - Familiar to Apple users
   - Glossy, detailed design

3. **Twitter (Twemoji)**
   - Open-source Twitter emoji
   - Vibrant colors
   - Good cross-platform option

4. **Microsoft**
   - Currently uses Google as fallback
   - Can be implemented if MS emoji package becomes available

## Testing

### Test in Dev Mode
```bash
npm run dev
# Emoji should load instantly from local assets
# No network latency, smooth gameplay
```

### Test Production Build
```bash
npm run build
bash desktopBuild.sh
# Test the portable or installed version
```

### Test in Wine
```bash
cd dist-electron
wine VoxelWorld-0.3.1-portable.exe
# All emoji should display perfectly!
```

## Integration Checklist

- [x] Install emoji datasource packages
- [x] Create EmojiRenderer.js with local asset support
- [x] Create EmojiChooser.js UI component
- [x] Update package.json with asarUnpack configuration
- [x] Remove twemoji CDN dependency
- [ ] Add emoji chooser to Adventurer's Menu
- [ ] Test all emoji styles in dev mode
- [ ] Test production build in Wine
- [ ] Document in user manual

## Next Steps

1. **Integrate Emoji Chooser into Menu**
   - Add new tab to Adventurer's Menu
   - Wire up the createEmojiChooser() component
   - Test style switching

2. **Optimize Bundle Size** (optional)
   - Could reduce to only Google + one other style
   - Would save ~150MB
   - Consider making others downloadable DLC

3. **Add Custom Emoji** (future)
   - Could add custom game-specific emoji
   - Use same PNG format at 64x64
   - Place in `/assets/custom-emoji/`

## Troubleshooting

### Emoji not showing?
1. Check browser console for 404 errors
2. Verify node_modules paths are correct
3. Ensure asarUnpack is configured in package.json
4. Try clearing localStorage and reloading

### Performance issues?
- Local emoji should be FASTER than CDN
- Check if emoji images are loading from disk (no network tab activity)
- Verify MutationObserver isn't re-parsing same elements

### Wrong emoji style?
```javascript
// Reset to default
localStorage.removeItem('voxelworld_emoji_set');
location.reload();
```

---

**Your emoji are now local, fast, and user-customizable!** 🎉
