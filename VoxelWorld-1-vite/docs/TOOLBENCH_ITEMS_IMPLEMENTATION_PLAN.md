# 🔧 ToolBench Items - Implementation Status & Plan

## Overview
This document tracks all ToolBench craftable items, their implementation status, and planned functionality.

---

## ✅ FULLY IMPLEMENTED

### 🔪 Machete
- **Status**: ✅ Complete
- **Functionality**: Collects leaves from trees automatically
- **Graphics**: `/art/tools/machete.png`
- **System**: Integrated into VoxelWorld.js tree harvesting

### 🌾 Hoe (`hoe`, `crafted_hoe`)
- **Status**: ✅ Complete
- **Functionality**: Till soil to create farmland (right-click grass/dirt)
- **Graphics**: `/art/tools/hoe.png`
- **System**: FarmingSystem.js
- **Blueprint Clues**: ✅ Has riddles

### 💧 Watering Can (`watering_can`, `crafted_watering_can`)
- **Status**: ✅ Complete
- **Functionality**: Water crops for 2x faster growth (right-click farmland)
- **Graphics**: (using emoji fallback)
- **System**: CraftedTools, FarmingSystem.js
- **Blueprint Clues**: ✅ Has riddles

### 🗡️ Stone Spear (`stone_spear`, `crafted_stone_spear`)
- **Status**: ✅ Complete
- **Functionality**: Throwable weapon with charge mechanic
- **Graphics**: `/art/tools/stone_spear.png`
- **System**: SpearSystem.js (physics, collision, charging)
- **Blueprint Clues**: ✅ Has riddles

### 🔨 Stone Hammer
- **Status**: ✅ Complete
- **Functionality**: Smash stone → iron/coal drops, breaks iron blocks
- **Graphics**: `/art/tools/stone_hammer.png`
- **System**: ToolBenchSystem harvest effects
- **Blueprint Clues**: ✅ Has riddles

### 🧭 Compass & Crystal Compass
- **Status**: ✅ Complete
- **Functionality**: 
  - Compass: Track one item type forever
  - Crystal Compass: Reassign target anytime
- **Graphics**: `/art/tools/compass.png`
- **System**: CompassSystem (presumed)
- **Blueprint Clues**: ✅ Has riddles

### 🕸️ Grappling Hook
- **Status**: ✅ Complete
- **Functionality**: Teleport to targeted blocks, 10 charges
- **Graphics**: `/art/tools/grapple.png`
- **System**: CraftedTools system
- **Blueprint Clues**: ✅ Has riddles

### 👢 Speed Boots
- **Status**: ✅ Complete
- **Functionality**: Permanent +50% movement speed upgrade
- **Graphics**: `/art/tools/boots_speed.png`
- **System**: ToolBenchSystem upgrade system
- **Blueprint Clues**: ✅ Has riddles

### 🎒 Backpack Upgrades (Tier 1 & 2)
- **Status**: ✅ Complete
- **Functionality**: 
  - Tier 1: Stack size 50→75
  - Tier 2: Stack size 75→100
- **System**: ToolBenchSystem upgrade system
- **Blueprint Clues**: Needs riddles (currently plain description)

---

## 🔄 PARTIALLY IMPLEMENTED

### 🔥 Torch (`torch`, `crafted_torch`)
- **Status**: ✅ Already Implemented!
- **Functionality**: Player holds in hotbar, provides light at night
- **Graphics**: `/art/tools/torch.png`
- **System**: Already working in game
- **Blueprint**: 20 charges consumable
- **Blueprint Clues**: ✅ Has riddles
- **Note**: User confirmed this is already done

---

## 📋 EQUIPMENT ITEMS (Already in CompanionCodex!)

### 🏏 Wooden Club (`club`, `crafted_club`)
- **Status**: ✅ Already in CompanionCodex equipment!
- **Companion Stats**: Attack +3
- **Special Effect**: 15% chance to stun (skip enemy turn)
- **Graphics**: `/art/tools/club.png`
- **Blueprint Clues**: ✅ Has riddles
- **Location**: CompanionCodex.js lines 63, 73, 99-100

### ⚔️ Combat Sword (`combat_sword`, `crafted_combat_sword`)
- **Status**: ✅ Already in CompanionCodex equipment!
- **Companion Stats**: Attack +4
- **Special Effect**: 20% critical hit (2x damage)
- **Graphics**: `/art/tools/sword.png`
- **Blueprint Clues**: ❌ Needs riddles added
- **Location**: CompanionCodex.js lines 52, 69, 93-94

### 🛡️ Wooden Shield (`wood_shield`, `crafted_wood_shield`)
- **Status**: ✅ Already in CompanionCodex equipment!
- **Companion Stats**: Defense +3
- **Special Effect**: 30% chance to block attack
- **Graphics**: `/art/tools/wood_shield.png`
- **Blueprint Clues**: ✅ Has riddles
- **Location**: CompanionCodex.js lines 66, 76, 89-90

### 📿 Magic Amulet (`magic_amulet`, `crafted_magic_amulet`)
- **Status**: ⚠️ In CompanionCodex but needs special implementation
- **Current Stats**: Defense +3, HP +8, Speed +1
- **Current Effect**: Heal 3 HP each turn
- **Planned Effect**: 
  - **Randomly chooses ONE stat on equip**
  - **Permanently boosts that stat by +4**
  - **Boost is saved to that specific item instance**
- **Graphics**: `/art/tools/cryatal.png` (note: typo in filename)
- **Blueprint Clues**: ❌ Needs riddles (currently "Mysterious powers TBD")
- **Location**: CompanionCodex.js lines 55, 71, 103-104
- **Implementation Notes**:
  - Current implementation gives fixed stats (def+3, hp+8, spd+1)
  - Need to change to random stat selection system
  - Need item instance metadata storage
  - Keep "heal 3 HP each turn" or make that the random effect?

---

## 📋 PLANNED IMPLEMENTATION

### 🧪 Healing Potion
- **Status**: ⏳ Needs Implementation
- **Purpose**: **Dual-purpose healing item**
- **Functionality**:
  1. **BattleArena Auto-battler**: 
     - Player raycasts/targets fighting companion
     - Click to heal companion during battle
  2. **Player Use**:
     - Restore 1 heart (PlayerHP system)
     - +50% stamina (StaminaSystem - no overflow)
- **System**: BattleArena files, PlayerHP, StaminaSystem
- **Blueprint**: 5 charges, mushroom+berry+wheat
- **Blueprint Clues**: ❌ Needs riddles added
- **Related Files**: "BattleArena" system files

###  Light Orb
- **Status**: ⏳ Complex Implementation (Do Last)
- **Purpose**: **Placeable light source with smart attachment**
- **Functionality**:
  - Place ON block surfaces (not in-world like blocks)
  - **Smart side detection**:
    - Ceiling bottom (attach light to ceiling)
    - 4 wall sides (attach to walls)
    - Top of block (attach to floor/top)
  - Light + particles (similar to campfire)
  - Persistent in save system
- **Graphics**: TBD
- **System**: New placement system, lighting, particles
- **Blueprint**: 10 charges, crystal+iceShard
- **Blueprint Clues**: ❌ Needs riddles added
- **Implementation Notes**:
  - Complex raycasting for surface detection
  - Attachment point calculation per face
  - Similar to campfire but surface-attached
  - **Implement this LAST** (most complex)

---

## ❓ UNCERTAIN / DEPRECATED

### ⛏️ Mining Pick (`mining_pick`, `crafted_mining_pick`)
- **Status**: ⚠️ Possibly Redundant
- **Issue**: Stone Hammer already does what Mining Pick would do
- **Graphics**: `/art/tools/pickaxe.png` or `oldPickaxe.png`
- **Blueprint Clues**: ❌ Needs riddles if kept
- **Decision Needed**: Remove blueprint or repurpose?

---

## 🎯 Implementation Priority

### Phase 1: Magic Amulet Random Stat System (High Priority)
1. Modify Magic Amulet to use random stat boost system
2. Add item instance metadata storage
3. Random stat selection on craft/equip (+4 to one stat)
4. Save/load system for amulet stat data

### Phase 2: Healing Potion System (Medium Priority)
1. Review BattleArena companion targeting
2. Implement raycast targeting for companion healing
3. Add PlayerHP.heal() method (restore 1 heart)
4. Add StaminaSystem.restore() method (+50%, no overflow)
5. Add hotbar right-click handler for potion use

### Phase 3: Light Orb Surface Attachment (Low Priority - Do Last)
1. Implement smart face detection raycasting
2. Surface attachment point calculation
3. Lighting & particle system (similar to campfire)
4. Save system integration for placed light orbs

### Phase 4: Blueprint Riddles (Documentation)
1. Add riddles for Combat Sword
2. Add riddles for Healing Potion  
3. Add riddles for Light Orb
4. Add riddles for Magic Amulet (replace "Mysterious powers TBD")
5. Add riddles for Backpack Upgrades (replace plain descriptions)

---

## 📊 Summary

**Total Items**: 18
- ✅ **Complete**: 9 items (Machete, Hoe, Watering Can, Stone Spear, Stone Hammer, Compass, Grappling Hook, Speed Boots, Backpack Upgrades)
- ✅ **In CompanionCodex**: 4 items (Club, Combat Sword, Wooden Shield, Magic Amulet*)
- ⏳ **Needs Implementation**: 3 items (Magic Amulet* random system, Healing Potion, Light Orb)
- ❓ **Uncertain**: 1 item (Mining Pick - redundant with Stone Hammer)

*Magic Amulet is in CompanionCodex but needs special random stat implementation

**Key Discoveries**:
- ✅ Companion equipment system already exists and working!
- ✅ Club, Sword, Shield already have stats and special effects
- ✅ All battle/HP/stamina systems exist and ready for potion integration
- ⚠️ Magic Amulet needs conversion from fixed stats to random boost system

---

## 📝 Blueprint Clues Status

### ✅ Has Riddles (Good Examples)
- Grappling Hook: "Something that falls gently..." / "Something in the sky..."
- Hoe: "Two pieces of timber..." / "A single handle..."
- Watering Can: "Three metal pieces..." / "A handle to grip..."
- Stone Spear: "Two shafts of wood..." / "Three sharpened rocks..." / "A flight of grace..."
- Stone Hammer: "Three pieces of earth..." / "Two handles from leaves..."
- Compass: "Three pieces of precious metal..." / "A handle to hold..."
- Crystal Compass: "Your trusty guide..." / "Two shards of sight..."
- Torch: "A single branch..." / "Two embers black..."
- Club: "Three branches bound..." / "Two remnants of beasts..."
- Wooden Shield: "Four planks of oak..." / "Four planks of pine..." / "A single metal grip..."
- Speed Boots: "Something in the sky..." / "Something warm from cold places..."

### ❌ Needs Riddles Added
- Combat Sword
- Mining Pick (if kept)
- Healing Potion
- Light Orb
- Magic Amulet (currently "Mysterious powers TBD")
- Backpack Upgrades (currently plain descriptions)

---

## 🔍 Files to Review

### Companion System ✅ FOUND
- **File**: `/src/ui/CompanionCodex.js` (1029 lines)
- **Status**: Active, has equipment system foundation
- **Equipment Storage**: `companionEquipment` object (line 17)
- **Equipment Bonuses**: `equipmentBonuses` object (line 20+)
- **Current Items**: stick, wood planks, stone, leaves, rustySword, oldPickaxe, ancientAmulet, crystal, etc.
- **Related to**: Club, Combat Sword, Magic Amulet, Wooden Shield
- **Key Methods**: Equipment slot management already exists

### Battle System ✅ FOUND
- **File**: `/src/BattleArena.js` (975 lines)
- **Type**: 3D arena auto-battler
- **Features**: Circling animations, attack sequences, cinematic combat
- **Related to**: Healing Potion companion healing
- **Companion Sprite**: `companionSprite` property for targeting
- **Key Classes**: `CombatantSprite` for battle entities

### Player HP System ✅ FOUND
- **File**: `/src/PlayerHP.js` (316 lines)
- **Max HP**: 3 hearts
- **Display**: Heart HUD in top center
- **Methods Needed**: 
  - `heal()` or `restore()` for potion healing (+1 heart)
  - Already has damage cooldown/invulnerability system
- **Related to**: Healing Potion player HP restoration

### Stamina System ✅ FOUND
- **File**: `/src/StaminaSystem.js` (480 lines)
- **Max Stamina**: 100
- **Regen Rate**: 3.0/sec idle, 1.0/sec slow walk
- **Methods Needed**:
  - Restore method for +50% stamina (no overflow)
  - Already has `currentStamina` and `maxStamina` properties
- **Related to**: Healing Potion stamina boost
- **Speed Boots**: Already integrated (2x capacity/regen)

### Light/Placement Systems
- Campfire implementation (reference for Light Orb)
- Block placement/raycasting (for surface attachment)

---

## 📊 Summary

**Total Items**: 18
- ✅ **Complete**: 9 items
- 🔄 **Partial**: 1 item (Torch - actually complete)
- ⏳ **Planned**: 7 items
- ❓ **Uncertain**: 1 item (Mining Pick)

**Next Steps**:
1. ~~Add riddle clues to items missing them~~ (document needed riddles)
2. ~~Locate Companion Codex system~~ ✅ Found! Already has all equipment items
3. ~~Locate BattleArena system~~ ✅ Found! Ready for potion integration
4. Implement Magic Amulet random stat system
5. Implement Healing Potion functionality
6. Plan Light Orb surface attachment system (do last)
