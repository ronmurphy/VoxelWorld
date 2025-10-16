# Tutorial Editor - File System Guide

## 🎓 Tutorial Editor with Electron File System Integration

The tutorial editor now has full file system support with native dialogs for saving and loading!

### Features

#### ✅ Auto-Load on Startup
- Automatically loads `data/tutorialScripts.json` when editor opens
- Works seamlessly in both Electron and web browser modes

#### 💾 Quick Save (Ctrl+S)
- Saves directly to `data/tutorialScripts.json`
- No dialog - instant save to default location
- Perfect for quick iterations

#### 💾 Save As... (Ctrl+Shift+S)
- Shows native save dialog
- Choose any location on your filesystem
- **Perfect for modders!** Save custom scripts anywhere
- Supports both formats:
  - Tutorial JSON (for game)
  - Drawflow JSON (for editor backup)

#### 📂 Open File (Ctrl+O)
- Native open dialog
- Load from anywhere on filesystem
- Automatically detects and converts formats

#### 📄 New File
- Clear canvas and start fresh
- Prompts for confirmation to prevent data loss

### Usage

#### In-Game
```javascript
// Open the editor modal
voxelWorld.openTutorialEditor()

// Editor opens with auto-loaded tutorialScripts.json
// Press ESC to close
```

#### Standalone (Web Browser)
```bash
# Open tutorial-editor.html in browser
open tutorial-editor.html

# Works with web-based file pickers
```

### File Formats

#### Tutorial JSON (Game Format)
```json
{
  "tutorials": {
    "welcome": {
      "trigger": "onGameStart",
      "once": true,
      "messages": [...]
    }
  }
}
```

#### Drawflow JSON (Editor Backup)
```json
{
  "drawflow": {
    "Home": {
      "data": {
        "1": { node data... }
      }
    }
  }
}
```

### Modder Workflow

1. **Open Editor**: `voxelWorld.openTutorialEditor()`
2. **Auto-loads** existing `tutorialScripts.json`
3. **Edit visually** using node graph
4. **Quick Save** (Ctrl+S) to update game
5. **Save As** (Ctrl+Shift+S) to export custom version
   - Choose folder for your mod
   - Select Tutorial JSON format
   - Name it uniquely (e.g., `myModTutorials.json`)
6. **Distribute** your custom tutorial file with mod

### Keyboard Shortcuts

- `Ctrl/Cmd + S` - Quick Save (to data folder)
- `Ctrl/Cmd + Shift + S` - Save As (with dialog)
- `Ctrl/Cmd + O` - Open File
- `Ctrl/Cmd + N` - New File
- `ESC` - Close editor modal (in-game only)

### Technical Details

#### Electron IPC Handlers
- `tutorial-editor:auto-load` - Auto-load from data folder
- `tutorial-editor:open-dialog` - Show native open dialog
- `tutorial-editor:save-dialog` - Show native save dialog
- `tutorial-editor:save-default` - Save to default location

#### File Locations

**Development:**
```
/data/tutorialScripts.json
```

**Production (Electron packaged):**
```
[app.getAppPath()]/data/tutorialScripts.json
```

**Modder Custom:**
```
Anywhere the user chooses!
```

### Converter System

The `TutorialConverter` handles bidirectional conversion:

**Drawflow → Tutorial JSON:**
```javascript
const tutorialData = TutorialConverter.drawflowToTutorial(drawflowData);
```

**Tutorial JSON → Drawflow:**
```javascript
const drawflowData = TutorialConverter.tutorialToDrawflow(tutorialData);
```

### Fallback (Web Mode)

When not in Electron:
- Auto-load uses `fetch()` to load from `./data/tutorialScripts.json`
- Open uses `<input type="file">` dialog
- Save uses blob download

### Next Steps

Future enhancements could include:
- [ ] Multi-file project support
- [ ] Import/export individual tutorials
- [ ] Version control integration
- [ ] Template library
- [ ] Validation and linting
- [ ] Hot reload when editing

---

Made with ❤️ for VoxelWorld modders!
