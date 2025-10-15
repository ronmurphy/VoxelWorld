# 🐈‍⬛ Quest System - TODO & Notes

## ✅ Completed (Oct 14, 2025)
- [x] Debug labels with counters ("Dialogue 1", "Choice 2", etc.)
- [x] Pointer lock controls handling
  - Exit pointer lock for choices (to enable cursor)
  - Re-request pointer lock after choice selected
  - Same for image overlay
- [x] Image overlay with dimmed background + [X] button
- [x] Both quest branches tested and working (Yes/No paths)

## 📋 TODO - Image File Browser for Sargem

### Option 1: File Input Button (Simple)
- Add `<input type="file" accept="image/*">` to image node editor
- User picks image from their computer
- Copy image to `assets/quest-images/` folder
- Store relative path in node data

### Option 2: Asset Browser (Better UX)
- Create simple modal with grid of existing quest images
- Show thumbnails from `assets/quest-images/`
- Click to select, or upload new
- Similar to existing asset pickers in editor

### Implementation Notes
```javascript
// In SargemQuestEditor.js, image node edit:
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*';
fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {
        // Copy to assets/quest-images/
        // OR use FileReader to embed as data URL
        // Store path in node.data.path
    }
};
```

### Folder Structure
```
assets/
  quest-images/        # Quest-specific images
    quest1-intro.jpg
    quest2-map.png
    npc-portrait.jpg
```

## 🔧 Future Enhancements
- [ ] Wire up save/load quest files (skeleton exists)
- [ ] NPC wandering behavior (checkbox in dialogue node)
- [ ] Combat node integration
- [ ] Item node integration  
- [ ] Condition node (check inventory, quest flags, etc.)
- [ ] Trigger node (set quest flags, spawn objects, etc.)
- [ ] Quest variables/flags system
- [ ] Multiple quests running concurrently
- [ ] Quest journal/log UI

## 📝 Notes
- Storyboard.js pattern works perfectly
- Connection field names: Sargem uses `fromId/toId`, runner supports both
- Night music confirmed working (17:00 trigger)
- Sargem named after 8yo black cat foster-fail companion 🐈‍⬛
- Image overlay needs file browser for picking images in editor

## 🎮 Controls Pattern
```javascript
// Disable controls (show UI with cursor)
if (document.pointerLockElement) {
    document.exitPointerLock();
}

// Re-enable controls (resume gameplay)
setTimeout(() => {
    if (this.voxelWorld.controlsEnabled && this.voxelWorld.renderer?.domElement) {
        this.voxelWorld.renderer.domElement.requestPointerLock();
    }
}, 100);
```
