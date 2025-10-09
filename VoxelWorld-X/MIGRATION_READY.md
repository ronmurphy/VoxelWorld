# PlayerItemsSystem Migration - Ready for Implementation

## ✅ Completed Tasks

### 1. "Start New Game" Button Update
- **Button text changed**: `🎮 Start New Game` (was "🎲 Start New World")
- **Location**: VoxelWorld.js line 10191
- **Added warning dialog**: Confirms save deletion before proceeding
- **Simplified logic**: Removed old ttrpg code, now just clears localStorage and reloads

```javascript
const newGame = async () => {
    const confirmed = confirm(
        "⚠️ Warning: This will delete all progress!\n\n" +
        "Starting a new game will erase your current save data.\n" +
        "Continue?"
    );
    
    if (!confirmed) return;
    
    localStorage.removeItem('NebulaWorld_playerData');
    location.reload();
};
```

## 🔍 Code Located - Ready for Migration

### Machete - Leaf Harvesting
**Location**: VoxelWorld.js lines **4690-4708**
**Functionality**: Collects all leaves when tree is cut down

```javascript
// 🍃 MACHETE LEAF COLLECTION: Check if player has machete (inventory OR equipment)
const hasMachete = this.hasTool('machete');

if (hasMachete && treeMetadata.leafBlocks.length > 0) {
    // Collect all leaf types from this tree
    const leafTypes = {};
    treeMetadata.leafBlocks.forEach(leafBlock => {
        leafTypes[leafBlock.blockType] = (leafTypes[leafBlock.blockType] || 0) + 1;
    });

    // Add all collected leaves to inventory
    Object.entries(leafTypes).forEach(([leafType, count]) => {
        this.inventory.addToInventory(leafType, count);
    });

    const totalLeaves = treeMetadata.leafBlocks.length;
    this.updateStatus(`🔪🍃 Machete collected ${totalLeaves} leaves from tree!`, 'discovery');
    console.log(`🔪 Machete collected ${totalLeaves} leaves from tree ID ${treeId}`);
}
```

**Migration Plan**:
- Add `onTreeHarvested(treeMetadata)` method to PlayerItemsSystem
- Call from VoxelWorld during tree removal
- Moves 19 lines of code

---

### Stone Hammer - Mining Bonuses
**Location**: VoxelWorld.js lines **1089-1158**  
**Functionality**: Enhanced mining for stone/iron/gold blocks

```javascript
const hasStoneHammer = this.hasTool('stone_hammer');

// 🔨 Stone Hammer: Special harvesting for stone blocks
if (hasStoneHammer && blockData.type === 'stone') {
    this.createExplosionEffect(x, y, z, blockData.type);
    
    const roll = Math.random();
    if (roll < 0.20) {
        this.inventory.addToInventory('iron', 1);
        this.updateStatus(`⛏️ Iron ore discovered!`, 'discovery');
    } else if (roll < 0.30) {
        this.inventory.addToInventory('coal', 1);
        this.updateStatus(`⛏️ Coal found!`, 'discovery');
    }
}
// Similar for iron (15% chance) and gold (12% chance)
```

**Migration Plan**:
- Add `onBlockHarvested(blockType, x, y, z)` method to PlayerItemsSystem
- Call from removeBlock() in VoxelWorld
- Returns `{ bonusItems: [{type, count}], createExplosion: boolean }`
- Moves ~70 lines of code

---

### Compass - Biome Detection  
**Location**: VoxelWorld.js lines **5399-5443**
**Functionality**: Updates biome display when player moves

```javascript
this.updateBiomeIndicator = () => {
    const playerX = Math.floor(this.player.position.x);
    const playerZ = Math.floor(this.player.position.z);
    const currentBiome = this.biomeWorldGen.getBiomeAt(playerX, playerZ, this.worldSeed);

    if (this.lastDisplayedBiome !== currentBiome.name) {
        this.lastDisplayedBiome = currentBiome.name;
        const biomeInfo = this.getBiomeDisplayInfo(currentBiome);
        
        // Update status display
        if (this.statusIcon && this.statusText) {
            this.statusIcon.textContent = biomeInfo.icon;
            this.statusText.textContent = `${currentBiome.name} Biome - ${biomeInfo.description}`;
        }
        
        // Update Explorer's Info Panel
        if (this.biomeDisplay) {
            const displayText = currentBiome.isTransition 
                ? `🌐 ${currentBiome.name} (Transition)`
                : `${biomeInfo.icon} ${currentBiome.name}`;
            this.biomeDisplay.textContent = displayText;
        }
    }
};
```

**Migration Plan**:
- Add `updateCompassEffect()` to PlayerItemsSystem  
- Check if compass in equipment slots (5-7)
- If active, call updateBiomeIndicator logic
- If NOT active, hide biome display or show "?" 
- Moves ~45 lines of code

---

## 📋 Next Steps (When User Returns)

### Phase 1: Comment Out Old Code (Safety)
1. Comment lines 4690-4708 (machete)
2. Comment lines 1089-1158 (stone hammer)  
3. Comment lines 5399-5443 (biome detection)
4. Test game still loads without errors

### Phase 2: Implement in PlayerItemsSystem
1. Add `onTreeHarvested(treeMetadata)` method
2. Add `onBlockHarvested(blockType, x, y, z)` method
3. Add `updateCompassEffect()` method (called from update loop)
4. Wire up calls from VoxelWorld

### Phase 3: Test All Effects
- ✅ Torch lighting (already working)
- ⏳ Machete leaf collection
- ⏳ Stone hammer mining bonuses
- ⏳ Compass biome detection
- ⏳ Speed boots (if implemented)

### Phase 4: Clean Up
- Remove commented code from VoxelWorld.js
- Verify file size reduction (11,065 → closer to <2,000 line goal)
- Update CLAUDE.md progress

---

## 🎯 Expected Benefits

- **Code Organization**: Item effects centralized in PlayerItemsSystem
- **File Size**: Remove ~135 lines from VoxelWorld.js  
- **Maintainability**: Easier to add new items (grappling hook, magic amulet, etc.)
- **Performance**: Already optimized with flag-based checks (torch example)
- **Testing**: Isolated system easier to debug

---

## ⚠️ Notes

- hasTool() method checks BOTH inventory AND equipment slots
- Equipment slots 5, 6, 7 are auto-active (no selection needed)
- Inventory slots 0-4 require selection to use
- Stone hammer creates explosion particles via createExplosionEffect()
- Compass biome updates are throttled (only on biome change, not per-frame)

**File Size Progress**: 11,065 lines → Target: <2,000 lines (CLAUDE.md goal)
