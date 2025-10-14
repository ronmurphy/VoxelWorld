# Tutorial Script System - Complete Implementation

## 🎯 What Changed

### Old System (Removed):
- ❌ `CompanionTutorialSystem.js` - Had hardcoded tutorial logic in code
- ❌ Tutorials in `App.js` - Conflicting with new system
- ❌ Required code changes for each new tutorial

### New System (JSON-Driven):
- ✅ `TutorialScriptSystem.js` - Loads tutorials from JSON
- ✅ `data/tutorialScripts.json` - All tutorial content in one file
- ✅ Event-driven architecture with simple hooks
- ✅ Add new tutorials by editing JSON (no code changes!)

---

## 📋 Current Tutorial Coverage

### ✅ Fully Scripted:
1. **game_start** - Welcome message + backpack + machete intro
2. **machete_selected** - How to use machete
3. **backpack_opened** - Backpack explanation  
4. **workbench_crafted** - Workbench unlocked
5. **workbench_placed** - How to open workbench
6. **workbench_opened** - Workbench interface tour
7. **tool_bench_crafted** - Tool Bench unlocked
8. **tool_bench_opened** - Tool Bench interface tour
9. **kitchen_bench_crafted** - Kitchen Bench unlocked
10. **kitchen_bench_opened** - Kitchen Bench interface tour
11. **torch_crafted** - Torch usage (temporary light)
12. **campfire_crafted** - Campfire as respawn point
13. **campfire_placed** - Respawn confirmation + auto-save
14. **hoe_crafted** - Farming basics
15. **watering_can_crafted** - How to water crops
16. **light_orb_crafted** - Permanent light source
17. **spear_crafted** - Hunting tutorial
18. **nightfall** - Night dangers + ghost warning
19. **first_ghost** - Ghost encounter warning
20. **first_rabbit** - Rabbit hunting tip

---

## 🔌 Integration Hooks Needed

The system is initialized, but needs these hooks added to trigger tutorials:

### 1. App.js - Game Start
```javascript
// FIND: Game initialization (after world loads)
// ADD:
if (app.tutorialSystem && !playerData.tutorialsSeen?.game_start) {
    app.tutorialSystem.onGameStart();
}
```

### 2. VoxelWorld.js - Machete Selection
```javascript
// FIND: Hotbar selection code (around line 2741)
selectHotbarSlot(index) {
    const slot = this.hotbarSystem.getHotbarSlot(index);
    this.selectedSlot = index;
    
    // Tutorial: Machete selected
    if (slot && slot.itemType === 'machete' && this.tutorialSystem) {
        this.tutorialSystem.onMacheteSelected();
    }
    
    // ...rest of selection code
}
```

### 3. BackpackSystem.js - Backpack Opened
```javascript
// FIND: open() method
open() {
    if (this.isOpen) return;
    this.isOpen = true;
    
    // Tutorial: First backpack open
    if (this.voxelWorld.tutorialSystem) {
        this.voxelWorld.tutorialSystem.onBackpackOpened();
    }
    
    // ...rest of open code
}
```

### 4. WorkbenchSystem.js - Workbench Events
```javascript
// FIND: open() method
open(x, y, z) {
    if (this.isOpen) return;
    this.isOpen = true;
    
    // ...existing open code...
    
    // Tutorial: Workbench opened
    if (this.voxelWorld.tutorialSystem) {
        this.voxelWorld.tutorialSystem.onWorkbenchOpened();
    }
}

// FIND: craftItem() method (after adding to inventory)
craftItem(recipeId) {
    // ...craft logic...
    this.voxelWorld.inventory.addToInventory(recipeId, quantity);
    
    // Tutorial: Item crafted
    if (this.voxelWorld.tutorialSystem) {
        this.voxelWorld.tutorialSystem.onItemCrafted(recipeId);
    }
    
    // ...rest of craft code
}
```

### 5. ToolBenchSystem.js - Tool Bench Events
```javascript
// FIND: open() method
open() {
    if (this.isOpen) return;
    this.isOpen = true;
    
    // ...existing open code...
    
    // Tutorial: Tool Bench opened
    if (this.voxelWorld.tutorialSystem) {
        this.voxelWorld.tutorialSystem.onToolBenchOpened();
    }
}

// FIND: craftItem() method (after adding to inventory)
craftItem(blueprintId) {
    // ...craft logic...
    const itemId = 'crafted_' + blueprintId;
    this.voxelWorld.inventory.addToInventory(itemId, 1);
    
    // Tutorial: Item crafted
    if (this.voxelWorld.tutorialSystem) {
        this.voxelWorld.tutorialSystem.onItemCrafted(itemId);
    }
    
    // ...rest of craft code
}
```

### 6. KitchenBenchSystem.js - Kitchen Bench Opened
```javascript
// FIND: open() method
open() {
    if (this.isOpen) return;
    this.isOpen = true;
    
    // ...existing open code...
    
    // Tutorial: Kitchen Bench opened
    if (this.voxelWorld.tutorialSystem) {
        this.voxelWorld.tutorialSystem.onKitchenBenchOpened();
    }
}
```

### 7. VoxelWorld.js - Block Placement
```javascript
// FIND: Block placement code for workbench/campfire
addBlock(x, y, z, type) {
    // ...existing placement code...
    
    // Tutorial: Workbench placed
    if (type === 'workbench' && this.tutorialSystem) {
        this.tutorialSystem.onWorkbenchPlaced();
    }
    
    // Tutorial: Campfire placed (respawn point)
    if (type === 'campfire' && this.tutorialSystem) {
        this.tutorialSystem.onCampfirePlaced();
    }
}
```

### 8. DayNightCycle.js - Nightfall
```javascript
// FIND: Time update method
update(deltaTime) {
    // ...time update code...
    
    // Check for night transition
    if (this.currentTime >= this.nightStart && this.lastTime < this.nightStart) {
        // Tutorial: First night
        if (this.voxelWorld.tutorialSystem) {
            this.voxelWorld.tutorialSystem.onNightfall();
        }
    }
    
    this.lastTime = this.currentTime;
}
```

### 9. GhostSystem.js - Ghost Spawn
```javascript
// FIND: spawnGhost() method
spawnGhost(x, y, z) {
    // ...ghost spawn code...
    
    // Tutorial: First ghost encounter
    if (this.voxelWorld.tutorialSystem) {
        this.voxelWorld.tutorialSystem.onGhostSpawn();
    }
}
```

### 10. AnimalSystem.js - Animal Spawn
```javascript
// FIND: spawnAnimal() method
spawnAnimal(type, position) {
    // ...animal spawn code...
    
    // Tutorial: First animal encounter
    if (this.voxelWorld.tutorialSystem) {
        this.voxelWorld.tutorialSystem.onAnimalSpawn(type);
    }
}
```

---

## 🎨 Adding New Tutorials

Just edit `data/tutorialScripts.json`:

```json
{
  "tutorials": {
    "your_new_tutorial": {
      "id": "your_new_tutorial",
      "title": "Your Tutorial Title",
      "trigger": "onYourEvent",
      "once": true,
      "messages": [
        {
          "text": "First message the companion says",
          "delay": 2000
        },
        {
          "text": "Second message after 2 second delay",
          "delay": 0
        }
      ]
    }
  }
}
```

Then call it from code:
```javascript
if (this.voxelWorld.tutorialSystem) {
    this.voxelWorld.tutorialSystem.showTutorial('your_new_tutorial');
}
```

---

## 🧪 Testing Tutorials

### View All Tutorials:
```javascript
// In browser console:
game.tutorialSystem.scripts.tutorials
```

### Reset All Tutorials:
```javascript
// In browser console:
game.tutorialSystem.resetAllTutorials()
```

### Manually Trigger Tutorial:
```javascript
// In browser console:
game.tutorialSystem.showTutorial('machete_selected')
```

### Check Which Tutorials Seen:
```javascript
// In browser console:
game.tutorialSystem.tutorialsSeen
```

---

## 📊 Benefits

### Old System:
- ❌ Tutorials hardcoded in JavaScript
- ❌ Needed code changes for each tutorial
- ❌ Difficult to test/iterate
- ❌ No centralized content management

### New System:
- ✅ All tutorials in ONE JSON file
- ✅ Easy to add/edit/test content
- ✅ Writers can edit without touching code
- ✅ Simple event hooks (`onMacheteSelected()`, etc.)
- ✅ Automatic localStorage tracking
- ✅ Companion portrait + chat system integration
- ✅ Sequential messages with delays

---

## 🎯 Current Status

- ✅ **System Built** - `TutorialScriptSystem.js` complete
- ✅ **Scripts Written** - 20 tutorials in `tutorialScripts.json`
- ✅ **System Initialized** - VoxelWorld.js line 306
- ✅ **Build Successful** - 1,452.61 KB
- ⚠️ **Needs Hooks** - Add 10 event hooks (see above)

---

## 🚀 Next Steps

1. Add the 10 integration hooks listed above
2. Test each tutorial trigger in-game
3. Adjust message timing/content in JSON as needed
4. Add more tutorials by editing JSON file

**No more conflicts with old system!** 🎉

---

## 📝 Example Flow

**Player starts game:**
1. Loads into world
2. `onGameStart()` triggered → Shows welcome message
3. Player presses 'E' → `onBackpackOpened()` → Shows backpack tutorial
4. Player selects machete → `onMacheteSelected()` → Shows machete tutorial
5. Player crafts workbench → `onItemCrafted('workbench')` → Shows workbench tutorial
6. And so on...

**All tracked automatically in localStorage - each shows only once!**
