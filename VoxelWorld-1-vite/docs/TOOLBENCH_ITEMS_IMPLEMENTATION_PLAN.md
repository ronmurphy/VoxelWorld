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
- **Status**: ⚠️ In CompanionCodex but needs enhancement
- **Current Stats**: Defense +3, HP +8, Speed +1, Heal 3 HP/turn ✅ KEEP THESE
- **Additional Effect to Add**: 
  - **Randomly chooses ONE stat on craft/equip**
  - **Permanently boosts that stat by +2** (stacks with existing bonuses)
  - **Boost is saved to that specific item instance**
- **Graphics**: `/art/tools/ancientAmulet.png`
- **Blueprint Clues**: ❌ Needs riddles (currently "Mysterious powers TBD")
- **Location**: CompanionCodex.js lines 55, 71, 103-104
- **Implementation Notes**:
  - Keep all existing stats (def+3, hp+8, spd+1, heal 3HP/turn)
  - ADD random +2 bonus to one stat (attack, defense, hp, or speed)
  - Random selection happens on craft, saved to item metadata
  - Display bonus in item tooltip/description

---

## 📋 PLANNED IMPLEMENTATION

### 🧪 Healing Potion
- **Status**: ⏳ Needs Implementation
- **Purpose**: **Smart healing item with auto-targeting**
- **Functionality**:
  1. **In Combat - Target Companion**: 
     - If companion is targeted during battle
     - Harvest click (left-click) heals companion
  2. **Out of Combat OR No Target**:
     - Restore 1 heart to player (PlayerHP system)
     - No overflow - max 3 hearts
  3. **Stamina**: NOT restored (simplified from original plan)
- **System**: BattleArena targeting, PlayerHP
- **Blueprint**: 5 charges, mushroom+berry+wheat
- **Blueprint Clues**: ❌ Needs creative riddles
- **Implementation**:
  - Check if companion sprite is targeted (raycaster)
  - If yes + in battle → heal companion
  - Otherwise → heal player (+1 heart, max 3)

### 💡 Light Orb
- **Status**: ⏳ Simplified Implementation
- **Purpose**: **Ceiling-mounted light source (like Minecraft lamp)**
- **Simplified Design**:
  - **Always attaches to bottom of block above**
  - Player targets any block, light orb places underneath it
  - No complex face detection needed
  - Light + particles (similar to campfire)
  - Persistent in save system
- **Graphics**: TBD (create simple glowing orb sprite)
- **System**: Simpler placement system, lighting, particles
- **Blueprint**: 10 charges, crystal+iceShard
- **Blueprint Clues**: ❌ Needs creative riddles
- **Implementation Notes**:
  - Right-click block → place light orb below it (hanging from ceiling)
  - Much simpler than full surface attachment
  - Similar to torch/campfire lighting system
  - **Can implement earlier now** (no longer "do last")

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

### Phase 1: Add Creative Blueprint Riddles (Quick Win)
1. **Combat Sword** - "A blade once rusted, now reborn..." / "Sharpened with bones of the fallen..."
2. **Healing Potion** - "Two sweet berries, one bitter fungus..." / "Golden grain to bind the brew..."
3. **Light Orb** - "Three shards of earth's frozen tears..." / "Two crystals bright, to pierce the night..."
4. **Magic Amulet** - "One ancient relic, power untold..." / "Three crystals pure..." / "Two shards of ice, to seal the spell..."
5. **Backpack Upgrades** - "Warm pelts from the frozen north..." / "Ancient wisdom in amulet form..."

### Phase 2: Healing Potion Smart Targeting (Medium Priority)
1. Add healing_potion to ToolBenchSystem blueprint (already exists)
2. Modify VoxelWorld.js harvest click handler:
   - Check if healing_potion is selected
   - Raycast for companion sprite
   - If companion targeted + in battle → heal companion
   - Otherwise → heal player (PlayerHP.heal, +1 heart max 3)
3. Add charge consumption (5 uses per potion)

### Phase 3: Magic Amulet Random Bonus (Medium Priority)
1. Modify ToolBenchSystem crafting for magic_amulet
2. On craft: Randomly select stat (attack/defense/hp/speed)
3. Store in item metadata: `{ randomBonus: { stat: 'attack', value: 2 } }`
4. Update CompanionCodex to read and apply bonus
5. Display in tooltip: "Magic Amulet (+2 ATK)" or "+2 DEF" etc.

### Phase 4: Light Orb Ceiling Placement (Low Priority)
1. Add light_orb as consumable tool
2. Right-click block handler:
   - Place light orb sprite at block position - Vector3(0, -0.5, 0)
   - Add point light (similar to campfire)
   - Add particle effect (glowing particles)
3. Save system integration
4. 10 charges per light orb

---

## 📊 Summary

**Total Items**: 18
- ✅ **Complete**: 9 items (Machete, Hoe, Watering Can, Stone Spear, Stone Hammer, Compass, Grappling Hook, Speed Boots, Backpack Upgrades)
- ✅ **In CompanionCodex**: 4 items (Club, Combat Sword, Wooden Shield, Magic Amulet)
- ⏳ **Simple Implementations**: 3 items (Magic Amulet +2 bonus, Healing Potion, Light Orb)
- ❓ **Uncertain**: 1 item (Mining Pick - redundant with Stone Hammer)

**Simplified Changes**:
- ✅ Magic Amulet: Keep existing stats, ADD random +2 bonus (not replace)
- ✅ Healing Potion: Target companion OR heal player (no stamina)
- ✅ Light Orb: Simple ceiling-only attachment (like Minecraft lamp)

**All items are now easy to implement!** 🎉

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
