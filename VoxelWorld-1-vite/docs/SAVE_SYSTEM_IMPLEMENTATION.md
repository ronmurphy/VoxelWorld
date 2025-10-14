# 💾 Save System Implementation Plan

## Phase 1: Setup Dependencies ✅

```bash
npm install msgpack-lite pako
```

**Why these libraries?**
- `msgpack-lite`: Binary serialization (~50% smaller than JSON)
- `pako`: Gzip compression (~60-70% additional reduction)
- Combined: **~80-85% smaller** than raw JSON saves

## Phase 2: Add Electron File System Support

### Update `electron-preload.cjs`

Add these functions to the `electronAPI`:

```javascript
// Add to electron-preload.cjs
contextBridge.exposeInMainWorld('electronAPI', {
  // ... existing functions ...

  // 💾 SAVE SYSTEM: File operations
  writeFile: async (relativePath, data) => {
    try {
      const path = require('path');
      const { app } = require('@electron/remote'); // Need to install: npm install @electron/remote
      
      const userDataPath = app.getPath('userData');
      const filePath = path.join(userDataPath, relativePath);
      const dirPath = path.dirname(filePath);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      fs.writeFileSync(filePath, data, 'utf8');
      console.log(`✅ Wrote file: ${filePath}`);
      return true;
    } catch (error) {
      console.error(`❌ Error writing file ${relativePath}:`, error);
      throw error;
    }
  },

  deleteFile: async (relativePath) => {
    try {
      const path = require('path');
      const { app } = require('@electron/remote');
      
      const userDataPath = app.getPath('userData');
      const filePath = path.join(userDataPath, relativePath);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`✅ Deleted file: ${filePath}`);
      }
      return true;
    } catch (error) {
      console.error(`❌ Error deleting file ${relativePath}:`, error);
      throw error;
    }
  }
});
```

### Update `electron.cjs`

```javascript
// Add to electron.cjs
const remoteMain = require('@electron/remote/main');
remoteMain.initialize();

function createWindow() {
  const mainWindow = new BrowserWindow({
    // ... existing config ...
  });
  
  // Enable @electron/remote for this window
  remoteMain.enable(mainWindow.webContents);
  
  // ... rest of createWindow ...
}
```

## Phase 3: Integrate SaveSystem into VoxelWorld.js

### Import SaveSystem

```javascript
// Add to top of VoxelWorld.js
import { SaveSystem } from './SaveSystem.js';
```

### Initialize in Constructor

```javascript
// In NebulaVoxelApp constructor, after this.worldSeed setup:
this.saveSystem = new SaveSystem(
  this, 
  window.electronAPI || null
);

// Track total playtime
this.gameTime = 0; // seconds
this.gameTimeInterval = setInterval(() => {
  this.gameTime++;
}, 1000);
```

### Update campfire interaction

```javascript
// In campfire interaction code (search for "Place Campfire" or campfire click handler):
if (campfireClicked) {
  // Show save menu
  this.showSaveMenu();
}
```

### Add Save/Load Menu Functions

```javascript
// Add these methods to VoxelWorld.js:

this.showSaveMenu = async () => {
  // Get all save slots
  const slots = await this.saveSystem.getSaveSlots();
  
  // Create modal UI
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #2a1810 0%, #1a0f08 100%);
    border: 3px solid #8B4513;
    border-radius: 12px;
    padding: 30px;
    max-width: 900px;
    max-height: 80vh;
    overflow-y: auto;
    z-index: 10000;
    box-shadow: 0 0 50px rgba(0,0,0,0.9);
  `;
  
  // Title
  const title = document.createElement('h2');
  title.textContent = '💾 Save Game';
  title.style.cssText = `
    color: #FFD700;
    font-size: 28px;
    margin: 0 0 20px 0;
    text-align: center;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
  `;
  modal.appendChild(title);
  
  // Save slots grid
  const slotsGrid = document.createElement('div');
  slotsGrid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 15px;
    margin-bottom: 20px;
  `;
  
  // Create slot cards
  for (const slot of slots) {
    const slotCard = document.createElement('div');
    slotCard.style.cssText = `
      background: rgba(0,0,0,0.6);
      border: 2px solid ${slot.exists ? '#4CAF50' : '#555'};
      border-radius: 8px;
      padding: 15px;
      cursor: pointer;
      transition: all 0.3s;
    `;
    
    // Thumbnail
    if (slot.thumbnail) {
      const thumbnail = document.createElement('img');
      thumbnail.src = slot.thumbnail;
      thumbnail.style.cssText = `
        width: 100%;
        height: auto;
        border-radius: 4px;
        margin-bottom: 10px;
      `;
      slotCard.appendChild(thumbnail);
    } else {
      const placeholder = document.createElement('div');
      placeholder.style.cssText = `
        width: 100%;
        height: 140px;
        background: linear-gradient(135deg, #333 0%, #222 100%);
        border-radius: 4px;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 48px;
      `;
      placeholder.textContent = '📂';
      slotCard.appendChild(placeholder);
    }
    
    // Slot info
    const info = document.createElement('div');
    info.style.cssText = `color: #F5E6D3; font-size: 14px;`;
    info.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">${slot.name}</div>
      ${slot.exists ? `
        <div>⏰ ${new Date(slot.timestamp).toLocaleString()}</div>
        <div>🎮 ${Math.floor(slot.playtime / 3600)}h ${Math.floor((slot.playtime % 3600) / 60)}m</div>
        <div>📊 ${slot.stats.blocksPlaced} blocks • ${slot.stats.objectsCrafted} objects</div>
      ` : '<div style="color: #999;">Empty Slot</div>'}
    `;
    slotCard.appendChild(info);
    
    // Click to save
    slotCard.addEventListener('click', async () => {
      try {
        await this.saveSystem.saveToSlot(slot.slot, `Save Slot ${slot.slot}`);
        this.updateStatus(`✅ Game saved to slot ${slot.slot}!`);
        document.body.removeChild(modal);
      } catch (error) {
        console.error('Save failed:', error);
        this.updateStatus(`❌ Save failed: ${error.message}`);
      }
    });
    
    // Hover effect
    slotCard.addEventListener('mouseenter', () => {
      slotCard.style.borderColor = '#FFD700';
      slotCard.style.transform = 'scale(1.05)';
    });
    
    slotCard.addEventListener('mouseleave', () => {
      slotCard.style.borderColor = slot.exists ? '#4CAF50' : '#555';
      slotCard.style.transform = 'scale(1)';
    });
    
    slotsGrid.appendChild(slotCard);
  }
  
  modal.appendChild(slotsGrid);
  
  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✖ Close';
  closeBtn.style.cssText = `
    width: 100%;
    padding: 15px;
    background: linear-gradient(180deg, #8B0000, #600000);
    border: 2px solid #A52A2A;
    border-radius: 8px;
    color: white;
    font-size: 16px;
    cursor: pointer;
    font-weight: bold;
  `;
  closeBtn.addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  modal.appendChild(closeBtn);
  
  document.body.appendChild(modal);
};

// Similar function for loading
this.showLoadMenu = async () => {
  // Same structure, but clicking loads instead of saves
  // Add "Delete" button for each slot
};
```

## Phase 4: Update World Tab UI

Replace the current World tab content with save/load buttons:

```javascript
// In the World tab section of VoxelWorld.js:
const worldContent = modal.querySelector('#world-content');
worldContent.innerHTML = `
  <div style="padding: 20px;">
    <h3 style="color: #FFD700; margin-top: 0;">🗺️ World Management</h3>
    
    <button id="save-game-btn" style="
      width: 100%;
      padding: 20px;
      background: linear-gradient(180deg, #4CAF50, #2d6b2f);
      border: 2px solid #3d7c3f;
      border-radius: 8px;
      color: white;
      font-size: 18px;
      cursor: pointer;
      margin-bottom: 15px;
      font-weight: bold;
    ">
      💾 Save Game
    </button>
    
    <button id="load-game-btn" style="
      width: 100%;
      padding: 20px;
      background: linear-gradient(180deg, #2196F3, #1565C0);
      border: 2px solid #1976D2;
      border-radius: 8px;
      color: white;
      font-size: 18px;
      cursor: pointer;
      margin-bottom: 15px;
      font-weight: bold;
    ">
      📂 Load Game
    </button>
    
    <div style="
      background: rgba(0,0,0,0.4);
      padding: 15px;
      border-radius: 8px;
      color: #F5E6D3;
      font-size: 14px;
      line-height: 1.6;
    ">
      <p><strong>💡 Tip:</strong> Save at campfires for a lore-friendly experience!</p>
      <p>Each save captures your position, inventory, and all blocks you've placed.</p>
      <p>🎮 5 save slots available</p>
      <p>📸 Screenshots auto-captured for each save</p>
    </div>
  </div>
`;

// Add event listeners
modal.querySelector('#save-game-btn').addEventListener('click', () => {
  this.showSaveMenu();
});

modal.querySelector('#load-game-btn').addEventListener('click', () => {
  this.showLoadMenu();
});
```

## Phase 5: Testing Checklist

- [ ] Install dependencies: `npm install msgpack-lite pako @electron/remote`
- [ ] Update electron-preload.cjs with file operations
- [ ] Update electron.cjs with @electron/remote
- [ ] Import SaveSystem into VoxelWorld.js
- [ ] Initialize SaveSystem in constructor
- [ ] Add save/load menu functions
- [ ] Update World tab UI
- [ ] Test screenshot capture
- [ ] Test save to all 5 slots
- [ ] Test load from each slot
- [ ] Test delete slot
- [ ] Test web vs Electron builds
- [ ] Test save file size (should be <100KB for typical game)
- [ ] Test campfire interaction trigger

## Expected Results

**Save File Sizes (typical world with 1000 blocks modified):**
- Raw JSON: ~500 KB
- Msgpack: ~250 KB  
- Msgpack + Gzip: **~80 KB** ✅

**Features:**
- ✅ 5 save slots with thumbnails
- ✅ Fast save/load (<1 second)
- ✅ Works offline (no cloud required)
- ✅ Cross-platform (Windows, Linux)
- ✅ Compatible with existing localStorage saves (migration path)

## Future Enhancements

1. **Auto-save** on campfire placement
2. **Quick save** (F5 key)
3. **Save file export/import** for sharing worlds
4. **Cloud save sync** (optional Steam/itch.io integration)
5. **Save file encryption** for anti-cheat
6. **Save versioning** (rollback to previous saves)
