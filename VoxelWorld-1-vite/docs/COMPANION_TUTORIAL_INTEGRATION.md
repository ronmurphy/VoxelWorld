# Companion Tutorial System - Integration Guide

**Dynamic, personality-driven tutorials that adapt to player context!**

---

## 🎯 What This Does

The `CompanionTutorialSystem` makes your companion feel alive by:
- ✅ **Dynamically finding which hotbar slot items are in** (no more hardcoded slots!)
- ✅ **Explaining UI AFTER it opens** (so player can see what companion is talking about)
- ✅ **Contextual suggestions** (mentions Tool Bench for light orbs if available)
- ✅ **Personality-driven** (companion speaks naturally, not like a manual)
- ✅ **One-time only** (tracks what's been shown via localStorage)
- ✅ **Works with your existing Chat.js system!**

---

## 📦 Integration Steps

### Step 1: Initialize the System

**File: `src/App.js`**

```javascript
// Add import at top
import { CompanionTutorialSystem } from './ui/CompanionTutorialSystem.js';

// In your App.js initialization (where you create voxelApp)
// AFTER VoxelWorld is created:
window.voxelApp = app;

// NEW: Initialize companion tutorial system
app.tutorialSystem = new CompanionTutorialSystem(app);
console.log('🎓 CompanionTutorialSystem initialized');
```

---

### Step 2: Hook Machete Selection

**File: `src/VoxelWorld.js`**

Find where machete is selected (search for `showMacheteTutorial`):

```javascript
// FIND THIS (around line 2254 or in your hotbar selection code):
if (this.showMacheteTutorial) {
    this.showMacheteTutorial();
}

// REPLACE WITH:
if (this.tutorialSystem) {
    this.tutorialSystem.onMacheteSelected();
}
```

**Alternative:** If machete selection is in hotbar code:

```javascript
// In your hotbar selection handler
selectHotbarSlot(index) {
    const slot = this.getHotbarSlot(index);
    
    // Check if machete just selected
    if (slot && slot.itemType === 'machete' && this.tutorialSystem) {
        this.tutorialSystem.onMacheteSelected();
    }
    
    // ...rest of selection code
}
```

---

### Step 3: Hook Workbench Opening

**File: `src/WorkbenchSystem.js`**

In the `open()` method:

```javascript
open(x, y, z) {
    if (this.isOpen) return;
    
    // ...existing open code...
    
    // NEW: Trigger tutorial AFTER UI is visible
    if (this.voxelWorld.tutorialSystem) {
        this.voxelWorld.tutorialSystem.onWorkbenchOpened();
    }
    
    console.log('Workbench opened at', x, y, z);
}
```

---

### Step 4: Hook Tool Bench Opening

**File: `src/ToolBenchSystem.js`**

In the `open()` method:

```javascript
open() {
    if (this.isOpen) return;
    this.isOpen = true;
    
    // ...existing open code (pause game, create modal, etc.)...
    
    // NEW: Trigger tutorial AFTER UI is visible
    if (this.voxelWorld.tutorialSystem) {
        this.voxelWorld.tutorialSystem.onToolBenchOpened();
    }
    
    console.log('🔧 Tool Bench opened');
}
```

---

### Step 5: Hook Kitchen Bench Opening

**File: `src/KitchenBenchSystem.js`**

In the `open()` method:

```javascript
open() {
    if (this.isOpen) return;
    this.isOpen = true;
    
    // ...existing open code (pause game, create modal, etc.)...
    
    // NEW: Trigger tutorial AFTER UI is visible
    if (this.voxelWorld.tutorialSystem) {
        this.voxelWorld.tutorialSystem.onKitchenBenchOpened();
    }
    
    console.log('🍳 Kitchen Bench opened');
}
```

---

### Step 6: Hook Item Crafting

**File: `src/ToolBenchSystem.js`**

In your crafting success code (wherever items are added to inventory):

```javascript
// After successful craft
craftItem(blueprintId) {
    // ...existing craft logic...
    
    // Add crafted item to inventory
    const itemId = 'crafted_' + blueprintId; // or however you name it
    this.voxelWorld.inventory.addToInventory(itemId, 1);
    
    // NEW: Trigger tutorial for first-time crafts
    if (this.voxelWorld.tutorialSystem) {
        this.voxelWorld.tutorialSystem.onItemCrafted(itemId);
    }
    
    this.voxelWorld.updateStatus(`✨ Crafted ${blueprint.name}!`, 'craft');
}
```

**Also add for Workbench-crafted items:**

**File: `src/WorkbenchSystem.js`**

```javascript
// When crafting tool_bench, kitchen_bench, campfire, hoe, etc.
craftItem(recipeId) {
    // ...existing craft logic...
    
    this.voxelWorld.inventory.addToInventory(recipeId, quantity);
    
    // NEW: Trigger tutorial
    if (this.voxelWorld.tutorialSystem) {
        this.voxelWorld.tutorialSystem.onItemCrafted(recipeId);
    }
}
```

---

### Step 7: Hook Campfire Placement

**File: `src/VoxelWorld.js`**

Find where campfire sets respawn point (search for `respawnCampfire =`):

```javascript
// FIND THIS (around line where campfire is placed):
if (isCampfire) {
    this.respawnCampfire = {
        x: Math.floor(x),
        y: Math.floor(y),
        z: Math.floor(z),
        timestamp: Date.now()
    };
    this.saveRespawnPoint();
    console.log(`🔥 Respawn point set at campfire...`);
    
    // NEW: Trigger tutorial
    if (this.tutorialSystem) {
        this.tutorialSystem.onCampfirePlaced();
    }
    
    // ...rest of campfire code...
}
```

---

### Step 8: Hook Nightfall

**File: `src/DayNightCycle.js` (or wherever day/night is managed)**

Find where time transitions to night:

```javascript
// When time passes threshold for night
updateTime() {
    // ...existing time update code...
    
    // Check if just became night
    if (this.timeOfDay >= this.duskTime && !this.wasNight) {
        this.wasNight = true;
        
        // NEW: Trigger night tutorial
        if (this.voxelWorld.tutorialSystem) {
            this.voxelWorld.tutorialSystem.onNightfall();
        }
    }
    
    // Reset flag during day
    if (this.timeOfDay < this.duskTime) {
        this.wasNight = false;
    }
}
```

---

## 🎨 Customization

### Add More Tutorials

```javascript
// In CompanionTutorialSystem.js, add new methods:

async showMyNewTutorial() {
    if (this.hasSeen('myNewTutorial')) return;

    this.chat.showMessage({
        character: this.companionId,
        name: this.companionName,
        text: `Your companion says something helpful here!`
    }, () => {
        this.markSeen('myNewTutorial');
    });
}

// Then call from your code:
if (this.tutorialSystem) {
    this.tutorialSystem.showMyNewTutorial();
}
```

### Multi-Message Sequences

```javascript
async showComplexTutorial() {
    if (this.hasSeen('complexTutorial')) return;

    this.chat.showSequence([
        {
            character: this.companionId,
            name: this.companionName,
            text: `First message explaining feature...`
        },
        {
            character: this.companionId,
            name: this.companionName,
            text: `Second message with more details...`
        },
        {
            character: this.companionId,
            name: this.companionName,
            text: `Third message with tips!`
        }
    ], () => {
        this.markSeen('complexTutorial');
    });
}
```

---

## 🔍 Testing

### Reset Tutorials

Open browser console:

```javascript
// Clear all tutorial progress
let playerData = JSON.parse(localStorage.getItem('NebulaWorld_playerData'));
playerData.tutorialsSeen = {};
localStorage.setItem('NebulaWorld_playerData', JSON.stringify(playerData));
console.log('✅ All tutorials reset!');
location.reload(); // Reload game
```

### Test Specific Tutorial

```javascript
// Force a tutorial to show again
let playerData = JSON.parse(localStorage.getItem('NebulaWorld_playerData'));
delete playerData.tutorialsSeen.machete; // or 'workbench', 'toolBench', etc.
localStorage.setItem('NebulaWorld_playerData', JSON.stringify(playerData));
console.log('✅ Machete tutorial reset!');
```

### Manually Trigger Tutorial

```javascript
// From browser console
window.voxelApp.tutorialSystem.showMacheteTutorial();
window.voxelApp.tutorialSystem.showWorkbenchTutorial();
window.voxelApp.tutorialSystem.showGrapplingHookTutorial();
// etc...
```

---

## 📋 Complete Tutorial List

| Tutorial | Trigger | Shows |
|----------|---------|-------|
| `machete` | First time machete selected | How to use machete, which slot it's in |
| `workbench` | Workbench opened (after backpack) | UI explanation, columns, slider |
| `toolBench` | Tool Bench opened first time | Blueprints vs recipes, discovery items |
| `kitchenBench` | Kitchen Bench opened first time | Cooking UI, buffs, recipe book |
| `grapplingHook` | Crafted grappling hook | How to use, durability warning |
| `speedBoots` | Crafted speed boots | Movement buff, stamina boost |
| `compass` | Crafted compass | How to target and track |
| `healingPotion` | Crafted healing potion | Emergency use, consumable |
| `lightOrb` | Crafted light orb | Throw mechanic, lighting areas |
| `stoneHammer` | Crafted stone hammer | Resource drops, explosions |
| `hoe` | Crafted hoe | Tilling soil, farming basics |
| `campfire` | Placed campfire | Respawn point mechanic |
| `firstNight` | First nightfall | Safety tips, suggests crafting |

---

## 🐛 Troubleshooting

### Tutorials not showing?

1. **Check initialization:**
   ```javascript
   console.log(window.voxelApp.tutorialSystem); // Should be object, not undefined
   ```

2. **Check tutorial state:**
   ```javascript
   console.log(window.voxelApp.tutorialSystem.tutorialsSeen);
   // Shows which tutorials have been seen
   ```

3. **Check hooks are called:**
   ```javascript
   // Add console.log in your hook code:
   if (this.tutorialSystem) {
       console.log('🎓 Triggering machete tutorial...');
       this.tutorialSystem.onMacheteSelected();
   }
   ```

### Machete tutorial shows wrong slot?

- Check that hotbar/equipment slots are properly synced
- Verify `findItemSlot()` is searching correct arrays
- Add debug log:
  ```javascript
  const macheteSlot = this.findItemSlot('machete');
  console.log('Machete found in:', macheteSlot);
  ```

### Workbench tutorial shows before UI visible?

- Increase delay in `onWorkbenchOpened()`:
  ```javascript
  setTimeout(() => {
      this.showWorkbenchTutorial();
  }, 1000); // Increase from 500ms to 1000ms
  ```

---

## ✅ Done!

Your companion will now dynamically explain features as players encounter them, adapting to their current situation and speaking with personality!

**Next:** Test each tutorial by playing through the game naturally. Reset tutorials as needed to verify they work correctly.
