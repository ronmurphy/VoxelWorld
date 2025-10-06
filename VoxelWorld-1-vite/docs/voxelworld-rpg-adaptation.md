# 🎮 VoxelWorld RPG System Adaptation

*Adapting DCC TTRPG mechanics to VoxelWorld-1-vite*

**Status**: Planning Phase
**Priority**: Foundation for enemy mobs, progression, combat
**Last Updated**: 2025-10-06

---

## 📋 **System Overview**

VoxelWorld will use the **DCC TTRPG system** as its foundation, adapting the small-number, fast-math approach for real-time voxel gameplay.

### **Core Principles to Preserve**
- ✅ **Attributes start at 2** (not 10) - easier math
- ✅ **Opposed rolls** for combat (attacker vs defender)
- ✅ **Luck dice scaling** (1d10 per 10 levels)
- ✅ **+3 margin to hit** rule
- ✅ **Small damage values** (d4/d6/d8 + mods)
- ✅ **Achievement-based progression**

---

## 🎯 **Phase 1: Player Foundation** (Required First)

### **1.1 Player Stats System**
Implement basic character attributes:

```javascript
// PlayerStats.js
class PlayerStats {
    constructor() {
        // Base attributes (2-15 range)
        this.attributes = {
            str: 2,  // Melee damage, mining speed
            dex: 2,  // Movement speed, ranged damage
            con: 2,  // Max health, hunger resistance
            int: 2,  // Crafting quality, magic (future)
            wis: 2,  // Perception range, XP gain
            cha: 2   // Trading prices, NPC interactions (future)
        };

        // Derived stats
        this.level = 1;
        this.maxHP = this.con + this.level;  // Health = CON + Level
        this.currentHP = this.maxHP;
        this.maxMP = this.wis + this.int;    // Magic = WIS + INT
        this.currentMP = this.maxMP;
    }

    // Luck dice scale with level
    getLuckDice() {
        return Math.floor(this.level / 10) + 1; // 1d10 per 10 levels
    }
}
```

**Files to Create:**
- `src/PlayerStats.js` - Core stat management
- `src/ui/CharacterSheet.js` - UI for viewing/managing stats
- `src/ui/StatsHUD.js` - In-game HP/MP display

---

### **1.2 Combat Resolution System**
Core opposed roll mechanics:

```javascript
// CombatSystem.js
class CombatSystem {
    /**
     * Resolve an attack between attacker and defender
     * @returns {object} {hit: boolean, damage: number, margin: number}
     */
    resolveAttack(attacker, defender, weapon) {
        // Attacker roll: d20 + attribute + weapon bonus + luck
        const attackRoll = this.d20() +
                          attacker.attributes.str +
                          weapon.bonus +
                          this.rollLuck(attacker.getLuckDice());

        // Defender roll: d20 + DEX + armor bonus + luck
        const defenseRoll = this.d20() +
                           defender.attributes.dex +
                           defender.armor.bonus +
                           this.rollLuck(defender.getLuckDice());

        const margin = attackRoll - defenseRoll;
        const hit = margin >= 3;  // DCC rule: +3 to hit

        let damage = 0;
        if (hit) {
            damage = this.rollDamage(weapon.damageDice) + attacker.attributes.str;

            // Critical hit: margin of 10+ = double damage
            if (margin >= 10) {
                damage *= 2;
                console.log('💥 CRITICAL HIT!');
            }
        }

        return { hit, damage, margin, attackRoll, defenseRoll };
    }

    d20() { return Math.floor(Math.random() * 20) + 1; }

    rollLuck(diceCount) {
        let total = 0;
        for (let i = 0; i < diceCount; i++) {
            total += Math.floor(Math.random() * 10) + 1;
        }
        return total;
    }

    rollDamage(damageDice) {
        // damageDice = 'd4', 'd6', 'd8', etc.
        const size = parseInt(damageDice.substring(1));
        return Math.floor(Math.random() * size) + 1;
    }
}
```

**Files to Create:**
- `src/combat/CombatSystem.js` - Core combat math
- `src/combat/DamageIndicator.js` - Visual damage numbers (floating text)

---

### **1.3 Health & Death System**

```javascript
// HealthSystem.js
class HealthSystem {
    takeDamage(entity, damage) {
        entity.currentHP -= damage;

        if (entity.currentHP <= 0) {
            entity.currentHP = 0;
            this.handleDeath(entity);
        }

        // Visual feedback
        this.showDamageIndicator(entity.position, damage);
        this.playHurtSound(entity);
    }

    handleDeath(entity) {
        if (entity.isPlayer) {
            this.playerDeath();
        } else {
            this.mobDeath(entity);
        }
    }

    playerDeath() {
        // Options:
        // 1. Respawn at spawn point (lose items?)
        // 2. Respawn at last bed/checkpoint
        // 3. Spectator mode until rescued
        console.log('💀 Player died!');
    }

    mobDeath(entity) {
        // Drop loot
        // Remove from world
        // Play death animation
        console.log(`👻 ${entity.name} defeated!`);
    }
}
```

**Files to Create:**
- `src/combat/HealthSystem.js` - Damage/death handling
- `src/ui/HealthBar.js` - Visual HP indicator

---

## ⚔️ **Phase 2: Enemy Mobs** (After Phase 1)

### **2.1 Entity Base Class**
Unified system for players and mobs:

```javascript
// Entity.js
class Entity {
    constructor(config) {
        this.name = config.name;
        this.type = config.type; // 'player', 'hostile', 'neutral', 'friendly'

        // Stats (same as player)
        this.attributes = config.attributes || {
            str: 2, dex: 2, con: 2, int: 2, wis: 2, cha: 2
        };

        this.level = config.level || 1;
        this.maxHP = this.attributes.con + this.level;
        this.currentHP = this.maxHP;

        // Combat
        this.weapon = config.weapon || { bonus: 0, damageDice: 'd4' };
        this.armor = config.armor || { bonus: 0 };

        // AI
        this.aiState = 'idle'; // idle, patrol, chase, attack, flee
        this.target = null;
        this.aggroRange = config.aggroRange || 10;
        this.attackRange = config.attackRange || 2;
    }

    getLuckDice() {
        return Math.floor(this.level / 10) + 1;
    }
}
```

### **2.2 Mob Definitions**
Now angry ghosts make sense:

```javascript
// mobs/GhostMob.js
export const GHOST_VARIANTS = {
    neutral: {
        name: 'Friendly Ghost',
        type: 'neutral',
        level: 1,
        attributes: { str: 2, dex: 3, con: 2, int: 2, wis: 3, cha: 4 },
        weapon: { bonus: 0, damageDice: 'd4' },
        aggroRange: 0, // Never attacks
        followSpeed: 0.02,
        texture: 'ghost.png'
    },

    angry: {
        name: 'Angry Ghost',
        type: 'hostile',
        level: 3,
        attributes: { str: 4, dex: 5, con: 3, int: 2, wis: 4, cha: 2 },
        weapon: { bonus: 1, damageDice: 'd6' }, // 1d6+STR damage
        aggroRange: 15,
        attackRange: 2,
        followSpeed: 0.08, // 4x faster than neutral
        attackCooldown: 2.0, // Seconds between attacks
        texture: 'angry_ghost.png'
    }
};
```

---

## 🏗️ **Implementation Roadmap**

### **Step 1: Player Stats Foundation** ⏳
- [ ] Create `PlayerStats.js`
- [ ] Integrate stats into existing VoxelWorld player object
- [ ] Create basic character sheet UI (pause menu)
- [ ] Display HP/MP in HUD
- [ ] Save/load stats with existing save system

**Estimated Time**: 2-4 hours
**Blockers**: None

---

### **Step 2: Combat System** ⏳
- [ ] Create `CombatSystem.js` with opposed roll math
- [ ] Implement `HealthSystem.js`
- [ ] Add damage indicators (floating text)
- [ ] Handle player death (respawn mechanics)
- [ ] Add health regeneration (food/rest?)

**Estimated Time**: 3-5 hours
**Blockers**: Needs Step 1

---

### **Step 3: Entity Refactor** ⏳
- [ ] Create `Entity.js` base class
- [ ] Refactor player to use Entity
- [ ] Create `AIController.js` for mob behavior
- [ ] Implement basic AI states (idle, chase, attack)
- [ ] Test with dummy enemy (cube with health?)

**Estimated Time**: 4-6 hours
**Blockers**: Needs Step 2

---

### **Step 4: Angry Ghosts** ⏳
- [ ] Create angry_ghost.png art
- [ ] Extend GhostSystem to support hostile variants
- [ ] Implement attack behavior
- [ ] Add loot drops (ghost essence?)
- [ ] Balance damage/health/speed

**Estimated Time**: 2-3 hours
**Blockers**: Needs Step 3

---

## 🎲 **DCC Mechanics NOT Needed (Yet)**

These are part of the TTRPG but can wait:

- ❌ **Skills system** - Not critical for basic combat
- ❌ **Achievement system** - Complex, can add later
- ❌ **Level-up system** - Start with fixed level 1
- ❌ **Magic system** - Future feature
- ❌ **Equipment slots** - Tools already work
- ❌ **Initiative system** - Real-time, not turn-based
- ❌ **Race/Class/Background** - Player is just "survivor"

---

## 🔧 **VoxelWorld-Specific Adaptations**

### **Real-Time Combat**
- **Turn-based → Cooldown-based**: Attacks happen every X seconds
- **Opposed rolls still work**: Calculate on each hit attempt
- **Visual feedback crucial**: Damage numbers, hit/miss indicators

### **Tool Integration**
Existing tools become weapons:
- **Fist**: d4 damage, +0 bonus
- **Stick**: d4 damage, +1 bonus (Light weapon)
- **Stone Hammer**: d6 damage, +1 bonus (Medium weapon)
- **Machete**: d8 damage, +2 bonus (Heavy weapon)

### **Hunger → Constitution**
- High CON = slower hunger drain
- Eating = HP regeneration (CON-based speed)

### **Mining → Strength**
- STR affects harvest speed (already partially implemented)
- STR affects block break resistance

---

## 📝 **Design Questions to Answer**

1. **Player death penalty?**
   - Keep inventory? Lose some items? Drop everything?
   - Respawn at spawn? At bed? At last checkpoint?

2. **XP/Leveling?**
   - Gain XP from mining, crafting, killing mobs?
   - Or keep it simple with fixed stats for now?

3. **Mob spawning rules?**
   - Night only? Specific biomes? Near ruins?
   - Spawn limit per chunk?

4. **Loot system?**
   - What do mobs drop? Just resources? Unique items?
   - Tie into crafting system?

5. **Difficulty scaling?**
   - Mobs get stronger farther from spawn?
   - Higher-level mobs in mountains/dungeons?

---

## 🎯 **Immediate Next Steps**

**Before adding angry ghosts:**

1. ✅ **Ghost system working** (DONE!)
2. ⏳ **Create PlayerStats.js**
3. ⏳ **Add HP display to HUD**
4. ⏳ **Implement CombatSystem.js**
5. ⏳ **Test with punching blocks = taking damage**

Once those are working, angry ghosts become a simple variant with:
- Different texture
- Higher stats
- Aggro range > 0
- Attack behavior enabled

---

## 💡 **Why This System is Perfect for VoxelWorld**

1. **Small numbers** = Easy to display in minimal HUD space
2. **Opposed rolls** = Dynamic combat, not "you hit, they hit, repeat"
3. **Luck scaling** = Natural difficulty curve as you level
4. **Simple HP formula** = Easy to understand (CON + Level)
5. **Weapon variety** = Makes finding better tools meaningful
6. **No bloat** = Skip D&D complexity, keep fast action

---

*This doc will evolve as we implement. Focus on Phase 1 first - everything else builds on that foundation.*

---

## ✅ **COMPLETED SO FAR** (2025-10-06)

### **Files Created:**
- ✅ `src/rpg/PlayerStats.js` - Core stat system
- ✅ `src/rpg/CombatSystem.js` - Opposed rolls, dice, damage
- ✅ `src/rpg/RPGIntegration.js` - Integration layer
- ✅ `src/ui/UI-Modals.js` - Character creation modal
- ✅ `src/ui/modals.css` - Modal styling
- ✅ `test-rpg.html` - Standalone test page

### **Integration Done:**
- ✅ Wired character creation to "Start New World" button
- ✅ RPG system initializes with VoxelWorld
- ✅ Stats load/save ready (not connected to save system yet)

### **Test It:**
- http://localhost:5173/test-rpg.html - Standalone test
- Click "Start New World" in game menu - Opens character creation!

---

## 🚧 **TODO NEXT SESSION**

### **Priority 1: Complete Save Integration** ⏰
**Estimated Time: 30-60 min**

1. **Update Save File Format**
   - [ ] Add `playerStats` to save data structure
   - [ ] Modify `saveWorld()` to include `this.rpgIntegration.saveStats()`
   - [ ] Modify `loadWorld()` to call `this.rpgIntegration.loadStats()`
   - [ ] Test: Create character → Save game → Load game → Check stats persist

2. **Save File Location**
   ```javascript
   // In saveWorld() around line ~5800
   const saveData = {
       seed: this.worldSeed,
       player: {...},
       // ADD THIS:
       playerStats: this.rpgIntegration.playerStats.serialize(),
       // ...rest
   };
   ```

---

### **Priority 2: Add HP/MP HUD Display** ⏰
**Estimated Time: 45-90 min**

1. **Create HUD Elements**
   - [ ] Add HP bar (red) to existing HUD
   - [ ] Add MP bar (blue) to existing HUD
   - [ ] Style to match VoxelWorld aesthetic
   - [ ] Position: Top-left below minimap?

2. **Update Loop Integration**
   ```javascript
   // In animation loop, call:
   this.rpgIntegration.updateHUD(); // Update HP/MP bars
   ```

3. **HUD Design Options:**
   - **Option A**: Simple text: `❤️ 5/8  💙 6/6`
   - **Option B**: Progress bars with gradients
   - **Option C**: Heart containers (Zelda-style)

**Preferred**: Option A for now (fastest, clean)

---

### **Priority 3: Connect Mining to XP** ⏰
**Estimated Time: 15-30 min**

1. **Hook into Block Harvesting**
   - [ ] Find where blocks are harvested (search for `removeBlock` or harvest logic)
   - [ ] Call `this.rpgIntegration.onBlockMined(blockType)`
   - [ ] Test: Mine 100 stone → Should gain 100 XP → Level up at XP threshold

2. **XP Values Already Defined:**
   ```javascript
   // In RPGIntegration.js:
   stone: 1 XP
   iron: 3 XP
   gold: 5 XP
   dirt/grass: 0.5 XP
   ```

---

### **Priority 4: Test Character Persistence** ⏰
**Estimated Time: 15 min**

**Test Scenario:**
1. Start new world → Create character (STR=5, DEX=3, etc.)
2. Mine some blocks → Gain XP
3. Save game
4. Refresh page
5. Load game
6. Verify: Stats preserved, XP preserved, level preserved

---

### **Priority 5: Level Up Modal (Optional)** ⏰
**Estimated Time: 60-90 min**

- [ ] Create level-up modal in UI-Modals.js
- [ ] Show when player levels up
- [ ] Allow attribute point distribution
- [ ] Save updated stats

**Can Wait**: This is nice-to-have, not critical

---

## 📝 **KNOWN ISSUES TO FIX**

1. **CSS Not Loaded in Main Game**
   - [ ] Add `<link>` to modals.css in index.html
   - [ ] OR import CSS in VoxelWorld.js

2. **Character Name Not Used**
   - [ ] Store character name somewhere (playerStats? save file?)
   - [ ] Display in journal/stats screen

3. **No Death Penalty**
   - [ ] Decide: Keep inventory? Lose XP? Respawn where?
   - [ ] Implement in `handlePlayerDeath()`

---

## 🎯 **QUICK WINS FOR NEXT SESSION**

**If you have 30 minutes:**
- Add HP/MP text display (Option A)
- Connect mining to XP

**If you have 1 hour:**
- Above + Save integration
- Test full persistence loop

**If you have 2 hours:**
- All of above + Level up modal
- Polish HUD display

---

## 📚 **CODE LOCATIONS REFERENCE**

```javascript
// Save/Load System
VoxelWorld.js:~5800 - saveWorld()
VoxelWorld.js:~5900 - loadWorld()

// Block Harvesting (for XP)
VoxelWorld.js:~search for "removeBlock" or "harvest"

// Animation Loop (for HUD update)
VoxelWorld.js:~8878 - animate() function

// Character Creation Button
VoxelWorld.js:10331 - newGame() function (DONE!)

// Minimap/HUD Area
VoxelWorld.js:~search for "minimap" or "coordDisplay"
```

---

*Next session: Focus on save integration + HUD display for quick visible progress!*
