# 📚 Built-in Help System (v0.4.10)

## Overview

Added a comprehensive in-game help system accessible through the Adventurer's Menu (ESC key). Help documentation is loaded dynamically from markdown files in `assets/help/`.

## Features

### Help Tab in Adventurer's Menu
- **5th tab**: "📚 Help" added after Music tab
- **Three help topics**: Quick Start, GPU Setup, Command Line
- **Dynamic loading**: Markdown files fetched and rendered on demand
- **Styled output**: Properly formatted with headings, code blocks, lists, etc.

### Help Topics

1. **🚀 Quick Start** (`quick-start.md`)
   - Basic controls (movement, actions, inventory)
   - Getting started guide (gather, craft, build)
   - Performance tips (FPS counter, settings)
   - Quick reference for new players

2. **🎮 GPU Setup** (`gpu-setup.md`)
   - GPU detection verification
   - Three methods to force high-performance GPU
   - Windows Graphics Settings guide
   - Expected performance benchmarks
   - Platform-specific instructions

3. **💻 Command Line** (`command-line.md`)
   - Windows and Linux syntax
   - Available switches explained
   - Recommended configurations
   - Real examples with correct/wrong syntax
   - Debugging switches

## Implementation

### File Structure
```
assets/help/
├── quick-start.md      # Basic game guide
├── gpu-setup.md        # GPU configuration
└── command-line.md     # Command-line switches
```

### Key Components

#### 1. Markdown Parser Integration
```javascript
import { marked } from 'marked';
```

Uses **marked** library (v12.0.2) for fast markdown parsing.

#### 2. Dynamic File Loading (VoxelWorld.js ~line 12687)
```javascript
const loadHelpTopic = async (topic) => {
    // Try Electron API first (for packaged app)
    if (window.electronAPI && window.electronAPI.readFile) {
        markdown = await window.electronAPI.readFile(`assets/help/${topic}.md`);
    } else {
        // Fallback to fetch (for web/dev)
        const response = await fetch(`/assets/help/${topic}.md`);
        markdown = await response.text();
    }
    
    // Parse and display
    const html = marked.parse(markdown);
    helpContentArea.innerHTML = html;
};
```

#### 3. Styled Markdown Output
- **H1**: Gold color (#FFD700), 20px, bottom border
- **H2**: Light beige (#F5E6D3), 16px
- **H3**: Light yellow (#FFE4B5), 14px
- **Code blocks**: Dark background, green text (#4CAF50), monospace
- **Lists**: Indented, proper spacing
- **Horizontal rules**: Styled dividers

#### 4. Custom Scrollbar
```css
#help-content-area::-webkit-scrollbar {
    width: 8px;
    background: rgba(0, 0, 0, 0.3);
}
#help-content-area::-webkit-scrollbar-thumb {
    background: rgba(101, 67, 33, 0.8);
    border-radius: 4px;
}
```

### UI Layout

```
┌─────────────────────────────────────────────────────┐
│ 🌍 World │ ⚙️ Settings │ 🎨 Graphics │ 🎵 Music │ 📚 Help │
├─────────────────────────────────────────────────────┤
│ Help & Documentation                                │
│                                                     │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐      │
│ │ 🚀 Quick   │ │ 🎮 GPU     │ │ 💻 Command │      │
│ │    Start   │ │    Setup   │ │    Line    │      │
│ └────────────┘ └────────────┘ └────────────┘      │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ [Markdown content rendered here]            │   │
│ │                                             │   │
│ │ • Properly formatted headings               │   │
│ │ • Syntax-highlighted code blocks            │   │
│ │ • Styled lists and paragraphs               │   │
│ │                                             │   │
│ └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Usage

### For Players:
1. Press **ESC** to open Adventurer's Menu
2. Click **📚 Help** tab
3. Click one of three topic buttons:
   - **🚀 Quick Start** - Learn game basics
   - **🎮 GPU Setup** - Optimize graphics performance
   - **💻 Command Line** - Advanced options
4. Content loads and displays with proper formatting
5. Scroll to read full documentation

### For Developers:
Adding new help topics:

1. **Create markdown file** in `assets/help/`:
   ```bash
   touch assets/help/new-topic.md
   ```

2. **Add button** in Help tab (VoxelWorld.js ~line 12140):
   ```html
   <button class="help-topic-btn" data-topic="new-topic" style="...">
       📖 New Topic
   </button>
   ```

3. **Markdown will auto-load** when button is clicked

## Benefits

### Reduced Documentation Burden
- ✅ No need to maintain separate external docs
- ✅ Always available in-game
- ✅ Updated with each game build
- ✅ No internet connection required

### Better User Experience
- ✅ Immediate access to help (no alt-tab)
- ✅ Context-aware (in the game menu)
- ✅ Properly styled and readable
- ✅ Multiple topics organized by category

### Easy Maintenance
- ✅ Edit markdown files directly
- ✅ No HTML/CSS knowledge needed
- ✅ Version controlled with game code
- ✅ Works in both web and Electron builds

## Technical Details

### Dependencies
- **marked**: ^12.0.2 (markdown parser)
- Bundle impact: +48KB (~1.4 MB total)

### File Loading Strategy
1. **Electron (production)**: Uses `electronAPI.readFile()` from preload script
2. **Web/Dev**: Uses `fetch()` to load from public assets
3. **Error handling**: Shows error message if file can't be loaded

### Styling System
- Inline styles applied after markdown parsing
- Consistent with game's medieval theme
- Dark background, light text for readability
- Custom scrollbar for better integration

### Performance
- **Lazy loading**: Files loaded only when topic is clicked
- **Cached in browser**: Subsequent loads are instant
- **No overhead**: Help system only active when menu is open

## Future Enhancements

Potential additions:
- More topics (crafting guide, combat, farming, etc.)
- Search functionality across help docs
- Interactive tooltips linking to help topics
- Context-sensitive help (press F1 in specific screens)
- Community-contributed guides
- Screenshot support in markdown

## Files Modified

1. **src/VoxelWorld.js**:
   - Line ~33: Added `import { marked } from 'marked';`
   - Line ~11858: Added Help tab button
   - Line ~12140: Added Help tab content with buttons
   - Line ~12687: Added `loadHelpTopic()` function
   - Line ~12410: Added CSS for help styling

2. **assets/help/** (new folder):
   - `quick-start.md` - Game basics
   - `gpu-setup.md` - GPU configuration
   - `command-line.md` - Command-line switches

3. **package.json**:
   - Added dependency: `"marked": "^12.0.2"`

## Testing

### Manual Testing:
1. ✅ Build successful (1,423.37 KB bundle)
2. ✅ Help tab appears in menu
3. ✅ Three buttons display correctly
4. ✅ Markdown files load (test all three topics)
5. ✅ Formatting is correct (headings, code, lists)
6. ✅ Scrolling works
7. ✅ Button hover effects work
8. ✅ Tab switching works

### Cross-Platform:
- ✅ Web build: Uses fetch()
- ✅ Electron build: Uses electronAPI
- ✅ Both load markdown files correctly

## Summary

### Before:
- ❌ No in-game help
- ❌ External docs required
- ❌ Users had to alt-tab or search online
- ❌ Documentation scattered across multiple MD files

### After:
- ✅ Built-in help system
- ✅ Three comprehensive topics
- ✅ Beautifully rendered markdown
- ✅ Accessible via ESC menu
- ✅ Works offline
- ✅ Easy to update and expand

---

**Version**: 0.4.10  
**Date**: October 13, 2025  
**Author**: Ron Murphy (with Claude assistance)
