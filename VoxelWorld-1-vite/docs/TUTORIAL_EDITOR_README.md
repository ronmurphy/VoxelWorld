# 🎓 Tutorial/Quest Editor

A visual node-based editor for creating tutorial sequences and quest flows in VoxelWorld.

## 🚀 Quick Start

### Option 1: Standalone Editor
1. Open `tutorial-editor.html` in your browser
2. Drag node types from the left sidebar
3. Connect nodes to create flow
4. Edit properties in the right panel
5. Save as Tutorial JSON format

### Option 2: In-Game Editor (Dev Console)
1. Run the game in Electron
2. Open browser console (F12)
3. Type: `voxelWorld.openTutorialEditor()`
4. Editor opens as modal overlay
5. Press ESC to close

## 📦 Node Types

### 💬 Dialogue Node
- **Purpose**: Show companion or NPC dialogue
- **Inputs**: 1
- **Outputs**: 1
- **Properties**:
  - Speaker (companion/npc/system)
  - Dialogue text

### ❓ Choice Node
- **Purpose**: Present multiple choice to player
- **Inputs**: 1
- **Outputs**: 2-3 (one per choice)
- **Properties**:
  - Question text
  - Option 1, 2, 3 button labels

### 🖼️ Image Node
- **Purpose**: Display image from game assets
- **Inputs**: 1
- **Outputs**: 1
- **Properties**:
  - Image path (e.g., `/art/pictures/map.png`)
  - Duration (seconds)

### ⚔️ Combat Node
- **Purpose**: Trigger battle encounter
- **Inputs**: 1
- **Outputs**: 2 (win/lose)
- **Properties**:
  - Enemy type (ghost, angry_ghost, etc.)
  - Level

### 🎁 Item Node
- **Purpose**: Give or take items from player
- **Inputs**: 1
- **Outputs**: 1
- **Properties**:
  - Action (give/take)
  - Item ID
  - Amount

### 🔀 Condition Node
- **Purpose**: Branch based on game state
- **Inputs**: 1
- **Outputs**: 2 (true/false)
- **Properties**:
  - Check type (hasItem, questComplete, level)
  - Value to check

### ⚡ Trigger Node
- **Purpose**: Fire custom game events
- **Inputs**: 1
- **Outputs**: 1
- **Properties**:
  - Event name
  - Parameters (JSON)

## 🔄 File Formats

### Tutorial JSON Format (Game)
```json
{
  "tutorials": {
    "machete_selected": {
      "id": "machete_selected",
      "title": "Machete Tutorial",
      "trigger": "onMacheteSelected",
      "once": true,
      "messages": [
        {
          "speaker": "companion",
          "text": "That's Uncle Beastly's machete!"
        }
      ]
    }
  }
}
```

### Drawflow Format (Editor)
```json
{
  "drawflow": {
    "Home": {
      "data": {
        "1": {
          "id": 1,
          "name": "dialogue",
          "data": {
            "type": "dialogue",
            "speaker": "companion",
            "text": "Hello!"
          },
          "inputs": {...},
          "outputs": {...}
        }
      }
    }
  }
}
```

## 💾 Save/Load Workflow

### Saving
1. Click "💾 Save JSON"
2. Choose format:
   - **OK** = Tutorial JSON (game format)
   - **Cancel** = Drawflow (editor format)
3. Enter filename
4. File downloads automatically

### Loading
1. Click "📂 Load JSON"
2. Select file (Tutorial or Drawflow format)
3. Editor auto-detects format and converts

## ⚙️ Common Properties (All Nodes)

### Tutorial ID
- Unique identifier for this tutorial
- Auto-generated if left empty
- Used for tracking completion

### Trigger Event
- When should this tutorial fire?
- Examples:
  - `onMacheteSelected`
  - `onBackpackOpened`
  - `onGhostSpawn`
  - `manual` (triggered by code)

### Show Once Only
- **Yes**: Tutorial shows only once (tracked in localStorage)
- **No**: Can be shown multiple times

## ⌨️ Keyboard Shortcuts

- **Ctrl/Cmd + S** - Save JSON
- **Ctrl/Cmd + O** - Open/Load JSON
- **Del** - Delete selected node
- **Right Click** - Node context menu
- **ESC** - Close editor modal (in-game only)

## 🔗 Connecting Nodes

1. Click and drag from **output dot** (right side)
2. Drop on **input dot** (left side)
3. Double-click connection line to add reroute point
4. Double-click reroute point to remove it

## 🎯 Workflow Examples

### Simple Linear Tutorial
```
[Dialogue: Welcome] → [Dialogue: Here's a machete] → [Item: Give Machete]
```

### Choice-Based Quest
```
                    ┌→ [Dialogue: Good choice!]
[Choice: Help NPC?] ┤
                    └→ [Dialogue: Too bad...]
```

### Combat with Rewards
```
                ┌→ [Item: Give reward]
[Combat: Ghost] ┤
                └→ [Dialogue: Try again]
```

## 🐛 Debugging

### Check Console Output
- **Loading**: `📥 Loading tutorial format, converting to Drawflow...`
- **Saving**: `💾 Converting to Tutorial JSON format...`
- **Errors**: Check browser console for conversion issues

### Verify Output
1. Save as Tutorial JSON
2. Open JSON file in text editor
3. Check structure matches game format
4. Copy to `assets/data/tutorialScripts.json`

## 🎮 Integration with Game

### Update Tutorial System
1. Export as Tutorial JSON format
2. Save to `assets/data/tutorialScripts.json`
3. Rebuild game: `npm run build`
4. Tutorials auto-load on game start

### Test in Game
1. Open browser console
2. Check: `🎓 Loaded X tutorial scripts`
3. Trigger events to test tutorials
4. Verify localStorage for "once" flag

## 📝 Best Practices

1. **Use descriptive Tutorial IDs** - Makes debugging easier
2. **Set appropriate triggers** - Match game events
3. **Test both branches** - For choice/condition nodes
4. **Keep dialogue concise** - Better UX
5. **Save Drawflow backup** - Preserve visual layout
6. **Version control JSON** - Track changes over time

## 🚧 Limitations

- Maximum 3 choices per Choice node
- No circular dependencies (will cause infinite loops)
- Image paths must exist in game assets
- Trigger events must match game code

## 🆘 Support

If nodes aren't converting correctly:
1. Check browser console for errors
2. Verify all required properties are filled
3. Ensure connections are valid
4. Try saving as Drawflow format first
5. Manually inspect/fix JSON if needed
