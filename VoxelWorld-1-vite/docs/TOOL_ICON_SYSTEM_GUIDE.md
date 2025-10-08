# 🔧 Tool Icon System - Complete Analysis & Recommendations

## Your Questions Answered:

### Q1: Do we need to update the enhanced items list for assets that don't exist in-game yet?
**Answer: NO, not yet.** Wait until you implement them. Here's why:

The enhanced graphics system **automatically discovers** assets in the `/art/tools/` folder at runtime. You don't need to manually list them unless:
1. The item name in code differs from the filename (needs alias)
2. The item needs special handling (like `crafted_` prefix)

### Q2: Do we need `crafted_` prefix for tool and EnhancedGraphics mapping?
**Answer: YES, IF the tool is created by ToolBenchSystem.**

## Current Status Analysis

### Assets You Have (in `/art/tools/`):
```
✅ backpack.png           - Used (starting item)
✅ compass.png            - Used (ToolBench blueprint)
✅ grapple.png            - Used (ToolBench blueprint - NOW FIXED)
✅ machete.png            - Used (starting tool)
✅ pickaxe.png            - Used (ToolBench: mining_pick)
✅ stone_hammer.png       - Used (ToolBench blueprint)
✅ sword.png              - Used (ToolBench: combat_sword)
✅ toolbench.png          - Used (UI icon)
✅ workbench.png          - Used (UI icon)
✅ boots_speed.png        - Used (ToolBench: speed_boots)

❓ club.png               - NOT USED YET
❓ pumpkin.png            - NOT USED YET (pumpkin is a block, not tool)
❓ stick.png              - USED (in CompanionCodex as equipment)
❓ stick_2.png            - NOT USED
❓ stone_spear.png        - NOT USED YET
❓ torch.png              - NOT USED YET
❓ wood_shield.png        - NOT USED YET
❓ backpack_2.png         - NOT USED YET (upgrade variant?)
❓ machete_2.png          - NOT USED YET (upgrade variant?)
❓ cryatal.png            - Used (typo? should be crystal.png for magic_amulet)
```

### ToolBench Blueprints (What Gets `crafted_` Prefix):
```javascript
✅ grappling_hook         → crafted_grappling_hook
✅ speed_boots            → crafted_speed_boots
✅ backpack_upgrade_1     → crafted_backpack_upgrade_1
✅ backpack_upgrade_2     → crafted_backpack_upgrade_2
✅ combat_sword           → crafted_combat_sword
✅ mining_pick            → crafted_mining_pick
✅ stone_hammer           → stone_hammer (special: uses toolType)
✅ machete_upgrade        → crafted_machete_upgrade
✅ healing_potion         → crafted_healing_potion
✅ light_orb              → crafted_light_orb
✅ magic_amulet           → crafted_magic_amulet
✅ compass                → compass (special: uses blueprint ID)
✅ compass_upgrade        → compass_upgrade (special: uses blueprint ID)
```

### Companion Equipment (from CompanionCodex):
Items that companions can equip:
```javascript
✅ stick, wood, stone, leaves          - Basic items
✅ rustySword, oldPickaxe, ancientAmulet - World items
✅ combat_sword, mining_pick, stone_hammer - Crafted tools (needs crafted_ prefix)
✅ magic_amulet, compass, speed_boots  - Crafted tools (needs crafted_ prefix)
✅ grappling_hook, machete             - Tools (needs crafted_ prefix if from ToolBench)
```

## What Needs To Be Done Now:

### 1. ✅ Already Fixed (Grappling Hook):
- Added to VoxelWorld.js enhanced graphics check
- Added texture aliases in EnhancedGraphics.js
- Both `grappling_hook` and `crafted_grappling_hook` work

### 2. ⚠️ Items That Need `crafted_` Aliases:

Add these to **EnhancedGraphics.js textureAliases**:
```javascript
this.textureAliases = {
    tool_bench: 'toolbench',
    grappling_hook: 'grapple',
    crafted_grappling_hook: 'grapple',
    
    // ADD THESE:
    crafted_combat_sword: 'sword',
    crafted_mining_pick: 'pickaxe',
    crafted_speed_boots: 'boots_speed',
    crafted_magic_amulet: 'cryatal',  // Note: typo in filename
    crafted_machete_upgrade: 'machete_2',  // If using variant
    
    // Future items (when implemented):
    // crafted_wood_spear: 'stone_spear',  // If spear blueprint created
    // crafted_torch: 'torch',              // If torch blueprint created
    // crafted_wood_shield: 'wood_shield',  // If shield blueprint created
};
```

Add to **VoxelWorld.js** enhanced graphics tool check (line ~2225):
```javascript
if (['machete', 'workbench', 'backpack', 'stone_hammer', 'stick', 
     'compass', 'compass_upgrade', 'tool_bench', 
     'grappling_hook', 'crafted_grappling_hook',
     
     // ADD THESE:
     'combat_sword', 'crafted_combat_sword',
     'mining_pick', 'crafted_mining_pick', 
     'speed_boots', 'crafted_speed_boots',
     'magic_amulet', 'crafted_magic_amulet',
     'machete_upgrade', 'crafted_machete_upgrade'
     
].includes(itemType)) {
```

### 3. 📋 Future Items (DO LATER):

**When you create new ToolBench blueprints:**

**Option A: Simple weapons/tools (no art yet)**
- Create blueprint in ToolBenchSystem.js
- Add icon to CompanionCodex (for companion equipment)
- Add to enhanced graphics lists (when PNG exists)

**Option B: Items with existing PNG but no blueprint**
```
wood_spear (stone_spear.png exists)
torch (torch.png exists)  
wood_shield (wood_shield.png exists)
club (club.png exists)
```

Create blueprints like:
```javascript
// In ToolBenchSystem.js
wood_spear: {
    name: '🗡️ Wood Spear',
    items: { stick: 2, stone: 1 },
    description: 'Basic throwing weapon',
    category: 'combat',
    isTool: true
},

torch: {
    name: '🔥 Torch',
    items: { stick: 1, coal: 1 },
    description: 'Portable light source',
    category: 'utility',
    isConsumable: true,
    charges: 20
}
```

Then add aliases and tool list entries as shown above.

## Companion Equipment Integration

Items in CompanionCodex already have both versions:
```javascript
combat_sword: { attack: 4, label: '⚔️ Combat Sword', icon: 'art/tools/sword.png' },
crafted_combat_sword: { attack: 4, label: '⚔️ Combat Sword', icon: 'art/tools/sword.png' }
```

This means companions can equip:
- Items found in world (`rustySword`, `oldPickaxe`)
- Items crafted by player (`crafted_combat_sword`, `crafted_grappling_hook`)
- Basic materials (`stick`, `stone`, `leaves`)

## Summary Recommendations:

### ✅ DO NOW (Before Testing):
1. Add `crafted_` aliases for existing ToolBench items
2. Add crafted tool variants to VoxelWorld.js enhanced graphics check
3. Test that all ToolBench items show icons correctly

### ⏳ DO LATER (After Testing):
1. Create ToolBench blueprints for unused PNGs (spear, torch, shield, club)
2. Add those to enhanced graphics system
3. Add to CompanionCodex equipment list
4. Fix typo: rename `cryatal.png` → `crystal.png`

### 📝 Pattern to Follow for New Tools:
1. Create blueprint in `ToolBenchSystem.js`
2. Add PNG to `/art/tools/` folder
3. Add alias to `EnhancedGraphics.js` (if code name ≠ filename)
4. Add `crafted_` version to enhanced graphics tool check in `VoxelWorld.js`
5. Add both versions to `CompanionCodex.js` equipment bonuses
6. Test crafting → icon appears → companions can equip

## The `crafted_` Prefix Rule:

**WHY:** ToolBenchSystem creates items with `crafted_` prefix to distinguish them from base materials:
```javascript
// In ToolBenchSystem.js createConsumable():
const itemId = `crafted_${this.selectedBlueprint}`;
// Result: "crafted_grappling_hook"
```

**WHERE NEEDED:**
- ✅ EnhancedGraphics.js textureAliases
- ✅ VoxelWorld.js enhanced graphics tool check  
- ✅ CompanionCodex.js equipment bonuses (for companion equipping)
- ✅ Any system that handles both base and crafted versions

**WHERE NOT NEEDED:**
- ❌ Actual PNG filenames (use base name: `grapple.png`, not `crafted_grapple.png`)
- ❌ ToolBench blueprint keys (blueprint is `grappling_hook`, system adds `crafted_`)
