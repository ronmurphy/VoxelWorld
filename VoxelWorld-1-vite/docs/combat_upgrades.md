# Combat Upgrades System - Equipment & Buffs

## Overview

Add an equipment/buff system to the Companion Codex where players can equip items to their active companion. Equipped items provide stat bonuses, special abilities, and unique animations during combat.

**Core Concept:**
- Players can equip crafted tools or explorer items to their active companion
- Equipment provides stat buffs (attack, defense, speed, HP)
- Special equipment unlocks unique abilities (evasion, critical hits, status effects)
- Visual feedback through special animations (shake, jump, glow, particles)

---

## Data Structure

### localStorage Extensions

**Current Structure:**
```javascript
{
  "starterMonster": "rat",
  "monsterCollection": ["rat", "goblin_grunt"],
  "activeCompanion": "rat",
  "firstPlayTime": 1234567890,
  "tutorialsSeen": { ... }
}
```

**Add Equipment Fields:**
```javascript
{
  // ... existing fields ...
  "companionEquipment": {
    "rat": {
      "weapon": "stick",      // Item ID or null
      "accessory": "leaf",    // Item ID or null
      "equipped": ["stick", "leaf"]  // Array for easy lookup
    },
    "goblin_grunt": {
      "weapon": null,
      "accessory": null,
      "equipped": []
    }
  }
}
```

### Equipment Definitions (New File)

**File:** `src/data/equipment.json`

```json
{
  "stick": {
    "name": "Wooden Stick",
    "type": "weapon",
    "stats": {
      "attack": 2,
      "speed": 0,
      "defense": 0,
      "hp": 0
    },
    "description": "A sturdy stick that increases attack power.",
    "icon": "🪵"
  },
  "leaf": {
    "name": "Lucky Leaf",
    "type": "accessory",
    "stats": {
      "attack": 0,
      "speed": 1,
      "defense": 0,
      "hp": 0
    },
    "abilities": ["evasion"],
    "evasionChance": 0.15,
    "description": "A magical leaf that grants a chance to evade attacks.",
    "icon": "🍃"
  },
  "stone": {
    "name": "Stone Shield",
    "type": "accessory",
    "stats": {
      "attack": 0,
      "speed": -1,
      "defense": 3,
      "hp": 5
    },
    "description": "Heavy stone that boosts defense but reduces speed.",
    "icon": "🪨"
  },
  "iron_ore": {
    "name": "Iron Gauntlet",
    "type": "weapon",
    "stats": {
      "attack": 4,
      "speed": 0,
      "defense": 1,
      "hp": 0
    },
    "abilities": ["critical"],
    "criticalChance": 0.20,
    "criticalMultiplier": 1.5,
    "description": "Iron ore forged into a powerful gauntlet with critical hit chance.",
    "icon": "⚙️"
  },
  "machete": {
    "name": "Uncle Beastly's Machete",
    "type": "weapon",
    "stats": {
      "attack": 5,
      "speed": 2,
      "defense": 0,
      "hp": 0
    },
    "abilities": ["bleed"],
    "bleedDamage": 2,
    "bleedDuration": 3,
    "description": "A legendary blade that causes enemies to bleed over time.",
    "icon": "🔪"
  },
  "pumpkin": {
    "name": "Pumpkin Charm",
    "type": "accessory",
    "stats": {
      "attack": 0,
      "speed": 0,
      "defense": 0,
      "hp": 10
    },
    "abilities": ["regen"],
    "regenAmount": 1,
    "regenInterval": 2,
    "description": "A spooky pumpkin that slowly regenerates HP during battle.",
    "icon": "🎃"
  }
}
```

---

## Implementation Files & Locations

### 1. Equipment Manager (NEW FILE)

**File:** `src/EquipmentSystem.js`

**Purpose:** Central system for managing companion equipment

**Key Methods:**
```javascript
export class EquipmentSystem {
    constructor() {
        this.equipment = null; // Loaded from equipment.json
    }

    async loadEquipment() {
        // Load equipment.json
        const response = await fetch('src/data/equipment.json');
        this.equipment = await response.json();
    }

    // Get equipment for a specific companion
    getEquippedItems(companionId) {
        const playerData = JSON.parse(localStorage.getItem('NebulaWorld_playerData') || '{}');
        if (!playerData.companionEquipment || !playerData.companionEquipment[companionId]) {
            return { weapon: null, accessory: null };
        }
        return playerData.companionEquipment[companionId];
    }

    // Equip an item to a companion
    equipItem(companionId, itemId, slot) {
        const playerData = JSON.parse(localStorage.getItem('NebulaWorld_playerData') || '{}');

        if (!playerData.companionEquipment) {
            playerData.companionEquipment = {};
        }

        if (!playerData.companionEquipment[companionId]) {
            playerData.companionEquipment[companionId] = {
                weapon: null,
                accessory: null,
                equipped: []
            };
        }

        // Equip item
        playerData.companionEquipment[companionId][slot] = itemId;

        // Update equipped array
        const equipped = playerData.companionEquipment[companionId].equipped || [];
        if (!equipped.includes(itemId)) {
            equipped.push(itemId);
        }
        playerData.companionEquipment[companionId].equipped = equipped;

        localStorage.setItem('NebulaWorld_playerData', JSON.stringify(playerData));
    }

    // Calculate total stats with equipment bonuses
    calculateStats(companionData, companionId) {
        const equipped = this.getEquippedItems(companionId);
        const stats = {
            hp: companionData.hp,
            attack: companionData.attack,
            defense: companionData.defense,
            speed: companionData.speed,
            abilities: []
        };

        // Add weapon bonuses
        if (equipped.weapon && this.equipment[equipped.weapon]) {
            const weapon = this.equipment[equipped.weapon];
            stats.attack += weapon.stats.attack;
            stats.defense += weapon.stats.defense;
            stats.speed += weapon.stats.speed;
            stats.hp += weapon.stats.hp;

            if (weapon.abilities) {
                stats.abilities.push(...weapon.abilities);
            }
        }

        // Add accessory bonuses
        if (equipped.accessory && this.equipment[equipped.accessory]) {
            const accessory = this.equipment[equipped.accessory];
            stats.attack += accessory.stats.attack;
            stats.defense += accessory.stats.defense;
            stats.speed += accessory.stats.speed;
            stats.hp += accessory.stats.hp;

            if (accessory.abilities) {
                stats.abilities.push(...accessory.abilities);
            }
        }

        return stats;
    }

    // Get ability data for equipped items
    getAbilityData(itemId) {
        if (!this.equipment[itemId]) return null;
        return this.equipment[itemId];
    }
}
```

**Integration:**
- Import in `VoxelWorld.js`: `import { EquipmentSystem } from './EquipmentSystem.js';`
- Initialize: `this.equipmentSystem = new EquipmentSystem();`
- Load in init: `await this.equipmentSystem.loadEquipment();`

---

### 2. Companion Codex UI Extensions

**File:** `src/ui/CompanionCodex.js`

**Location:** Around line 400-500 (after stats display)

**Add Equipment Section:**
```javascript
// After the stats section, add equipment UI
const equipmentSection = document.createElement('div');
equipmentSection.style.cssText = `
    margin-top: 20px;
    padding: 15px;
    border: 2px solid #8B7355;
    background: rgba(255, 248, 220, 0.3);
    border-radius: 8px;
`;

const equipmentTitle = document.createElement('h3');
equipmentTitle.textContent = 'Equipment';
equipmentTitle.style.cssText = `
    font-family: 'Georgia', serif;
    color: #5C4033;
    margin-bottom: 10px;
`;
equipmentSection.appendChild(equipmentTitle);

// Get equipped items
const equipped = this.voxelWorld.equipmentSystem.getEquippedItems(companion.id);

// Weapon slot
const weaponSlot = this.createEquipmentSlot('Weapon', equipped.weapon, companion.id, 'weapon');
equipmentSection.appendChild(weaponSlot);

// Accessory slot
const accessorySlot = this.createEquipmentSlot('Accessory', equipped.accessory, companion.id, 'accessory');
equipmentSection.appendChild(accessorySlot);

detailsPage.appendChild(equipmentSection);
```

**Add Equipment Slot Creator Method:**
```javascript
createEquipmentSlot(slotName, equippedItemId, companionId, slot) {
    const slotDiv = document.createElement('div');
    slotDiv.style.cssText = `
        margin: 10px 0;
        display: flex;
        align-items: center;
        gap: 10px;
    `;

    const slotLabel = document.createElement('span');
    slotLabel.textContent = `${slotName}:`;
    slotLabel.style.cssText = `
        font-family: 'Georgia', serif;
        color: #5C4033;
        font-weight: bold;
        min-width: 100px;
    `;
    slotDiv.appendChild(slotLabel);

    // Current item display
    const itemDisplay = document.createElement('div');
    itemDisplay.style.cssText = `
        padding: 5px 10px;
        background: rgba(255, 255, 255, 0.5);
        border: 1px solid #8B7355;
        border-radius: 4px;
        flex: 1;
    `;

    if (equippedItemId) {
        const itemData = this.voxelWorld.equipmentSystem.equipment[equippedItemId];
        itemDisplay.textContent = `${itemData.icon} ${itemData.name}`;
    } else {
        itemDisplay.textContent = '- Empty -';
        itemDisplay.style.fontStyle = 'italic';
        itemDisplay.style.color = '#999';
    }
    slotDiv.appendChild(itemDisplay);

    // Change button
    const changeBtn = document.createElement('button');
    changeBtn.textContent = '⚙️ Equip';
    changeBtn.style.cssText = `
        padding: 5px 15px;
        background: #C9A961;
        border: 2px solid #8B7355;
        border-radius: 4px;
        color: #5C4033;
        font-family: 'Georgia', serif;
        font-weight: bold;
        cursor: pointer;
    `;
    changeBtn.addEventListener('click', () => {
        this.openEquipmentSelector(companionId, slot, itemDisplay);
    });
    slotDiv.appendChild(changeBtn);

    return slotDiv;
}

openEquipmentSelector(companionId, slot, itemDisplay) {
    // Create modal to select equipment from inventory
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #FFF8DC;
        border: 3px solid #8B7355;
        border-radius: 10px;
        padding: 20px;
        z-index: 10001;
        max-width: 400px;
        max-height: 500px;
        overflow-y: auto;
    `;

    const title = document.createElement('h3');
    title.textContent = `Select ${slot === 'weapon' ? 'Weapon' : 'Accessory'}`;
    title.style.cssText = `
        font-family: 'Georgia', serif;
        color: #5C4033;
        margin-bottom: 15px;
    `;
    modal.appendChild(title);

    // Get player inventory
    const inventory = this.voxelWorld.inventory || [];
    const equipmentData = this.voxelWorld.equipmentSystem.equipment;

    // Filter items based on slot type
    const availableItems = Object.keys(equipmentData).filter(itemId => {
        const item = equipmentData[itemId];
        return item.type === slot && inventory.some(invItem => invItem.id === itemId && invItem.count > 0);
    });

    if (availableItems.length === 0) {
        const noItems = document.createElement('p');
        noItems.textContent = 'No compatible items in inventory.';
        noItems.style.fontStyle = 'italic';
        modal.appendChild(noItems);
    } else {
        availableItems.forEach(itemId => {
            const itemData = equipmentData[itemId];
            const itemBtn = document.createElement('button');
            itemBtn.textContent = `${itemData.icon} ${itemData.name}`;
            itemBtn.style.cssText = `
                display: block;
                width: 100%;
                padding: 10px;
                margin: 5px 0;
                background: rgba(255, 255, 255, 0.5);
                border: 2px solid #8B7355;
                border-radius: 4px;
                cursor: pointer;
                font-family: 'Georgia', serif;
                text-align: left;
            `;

            itemBtn.addEventListener('click', () => {
                // Equip item
                this.voxelWorld.equipmentSystem.equipItem(companionId, itemId, slot);

                // Update display
                itemDisplay.textContent = `${itemData.icon} ${itemData.name}`;
                itemDisplay.style.fontStyle = 'normal';
                itemDisplay.style.color = '#000';

                // Close modal
                document.body.removeChild(modal);
                document.body.removeChild(overlay);

                // Refresh stats display
                this.showCompanionDetails(companionId);
            });

            modal.appendChild(itemBtn);
        });
    }

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Cancel';
    closeBtn.style.cssText = `
        margin-top: 15px;
        padding: 8px 20px;
        background: #999;
        border: 2px solid #666;
        border-radius: 4px;
        cursor: pointer;
        font-family: 'Georgia', serif;
    `;
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
        document.body.removeChild(overlay);
    });
    modal.appendChild(closeBtn);

    // Overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(modal);
}
```

---

### 3. Battle System Integration

**File:** `src/BattleArena.js`

**Location 1:** Line 78-79 (after storing enemy data)

**Apply Equipment Bonuses:**
```javascript
// Store enemy data for loot (before sprite gets destroyed)
this.enemyData = enemyData;
this.companionData = companionData;

// Apply equipment bonuses to companion stats
if (this.voxelWorld.equipmentSystem) {
    const buffedStats = this.voxelWorld.equipmentSystem.calculateStats(companionData, companionId);
    this.companionData = { ...companionData, ...buffedStats };
    this.companionAbilities = buffedStats.abilities || [];

    console.log(`⚔️ Companion stats with equipment:`, this.companionData);
    console.log(`⚔️ Companion abilities:`, this.companionAbilities);
} else {
    this.companionAbilities = [];
}
```

**Location 2:** Line 236-266 (resolveCombat method)

**Add Evasion Check:**
```javascript
resolveCombat(attacker, defender) {
    // Check for evasion ability (before hit calculation)
    if (defender.isPlayer && this.companionAbilities.includes('evasion')) {
        const equipped = this.voxelWorld.equipmentSystem.getEquippedItems(this.companionData.id);
        const leafData = this.voxelWorld.equipmentSystem.getAbilityData(equipped.accessory);

        if (leafData && Math.random() < leafData.evasionChance) {
            console.log(`✨ ${defender.data.name} evaded the attack!`);

            // Play evasion animation
            this.playEvasionAnimation(defender.sprite);

            return; // Skip damage
        }
    }

    // Calculate hit chance: d20 + attack vs defense
    const attackRoll = Math.floor(Math.random() * 20) + 1;
    const hitCheck = attackRoll + attacker.data.attack;

    if (hitCheck >= defender.data.defense) {
        // Hit! Calculate damage
        let damageRoll = Math.floor(Math.random() * 6) + 1;
        let damage = Math.max(1, damageRoll + Math.floor(attacker.data.attack / 2));

        // Check for critical hit
        if (attacker.isPlayer && this.companionAbilities.includes('critical')) {
            const equipped = this.voxelWorld.equipmentSystem.getEquippedItems(this.companionData.id);
            const weaponData = this.voxelWorld.equipmentSystem.getAbilityData(equipped.weapon);

            if (weaponData && Math.random() < weaponData.criticalChance) {
                damage = Math.floor(damage * weaponData.criticalMultiplier);
                console.log(`💥 CRITICAL HIT! ${damage} damage!`);

                // Play critical animation
                this.playCriticalAnimation(attacker.sprite);
            }
        }

        // Apply damage
        const newHP = defender.sprite.currentHP - damage;
        defender.sprite.updateHP(newHP);

        // Flash damage
        defender.sprite.flashDamage();

        console.log(`💥 Hit! ${damage} damage! ${defender.data.name}: ${newHP}/${defender.data.hp} HP`);

        // Check for knockout
        if (newHP <= 0) {
            setTimeout(() => {
                this.endBattle(attacker.isPlayer);
            }, 1000);
            return;
        }
    } else {
        // Miss!
        console.log(`💨 ${attacker.data.name} missed!`);
    }

    // Return attacker to circling position after 500ms
    setTimeout(() => {
        const attackerAngle = attacker.isPlayer ? this.companionAngle : this.enemyAngle;
        const returnPos = this.getCirclePosition(attackerAngle);
        attacker.sprite.moveTo(returnPos.x, returnPos.y, returnPos.z);
    }, 500);
}
```

**Location 3:** Add new animation methods at end of class (before closing brace)

**Special Ability Animations:**
```javascript
/**
 * Play evasion animation (shake/dodge)
 */
playEvasionAnimation(sprite) {
    const originalX = sprite.position.x;
    const originalZ = sprite.position.z;
    let shakeTime = 0;

    const shakeInterval = setInterval(() => {
        shakeTime += 0.05;

        // Quick side-to-side shake
        sprite.position.x = originalX + Math.sin(shakeTime * 30) * 0.3;
        sprite.position.z = originalZ + Math.cos(shakeTime * 30) * 0.3;

        if (shakeTime > 0.5) {
            clearInterval(shakeInterval);
            sprite.position.x = originalX;
            sprite.position.z = originalZ;
        }
    }, 16);
}

/**
 * Play critical hit animation (scale pulse + glow)
 */
playCriticalAnimation(sprite) {
    // Scale pulse
    const originalScale = sprite.scale.clone();
    let pulseTime = 0;

    const pulseInterval = setInterval(() => {
        pulseTime += 0.05;

        const scale = 2.0 + Math.sin(pulseTime * 20) * 0.3;
        sprite.scale.set(scale, scale, 1);

        if (pulseTime > 0.6) {
            clearInterval(pulseInterval);
            sprite.scale.copy(originalScale);
        }
    }, 16);

    // Flash yellow
    const originalColor = sprite.material.color.getHex();
    sprite.material.color.setHex(0xFFFF00);

    setTimeout(() => {
        sprite.material.color.setHex(originalColor);
    }, 300);
}
```

---

### 4. CombatantSprite Extensions

**File:** `src/CombatantSprite.js`

**Location:** After line 35 (in constructor)

**Add Ability Tracking:**
```javascript
// Animation state
this.currentPose = 'ready'; // 'ready' or 'attack'
this.isAnimating = false;

// Equipment abilities
this.abilities = [];
```

**Location:** Add method at end of class (before closing brace)

**Jump Animation for Evasion:**
```javascript
/**
 * Play jump animation (alternative to shake)
 */
playJumpAnimation() {
    const originalY = this.sprite.position.y;
    let jumpTime = 0;

    const jumpInterval = setInterval(() => {
        jumpTime += 0.05;

        // Parabolic jump
        this.sprite.position.y = originalY + Math.sin(jumpTime * 10) * 0.8;

        if (jumpTime > 0.6) {
            clearInterval(jumpInterval);
            this.sprite.position.y = originalY;
        }
    }, 16);
}
```

---

## Testing Plan

### Phase 1: Basic Equipment
1. Add `equipment.json` with stick and leaf
2. Implement `EquipmentSystem.js`
3. Add equipment UI to CompanionCodex
4. Test equipping/unequipping in codex

### Phase 2: Stat Bonuses
1. Apply equipment bonuses in BattleArena
2. Test with testCombat() - verify attack/defense changes
3. Add console logs to confirm stat calculations

### Phase 3: Evasion Ability
1. Implement evasion check in resolveCombat
2. Add shake animation
3. Test with leaf equipped vs unequipped

### Phase 4: Critical Hits
1. Implement critical check in resolveCombat
2. Add pulse + glow animation
3. Test with iron_ore equipped

### Phase 5: Advanced Abilities
1. Bleed damage over time (track in BattleArena.update)
2. Regeneration (track in BattleArena.update)
3. Status effect icons above HP bars

---

## Future Enhancements

### Equipment Tiers
- Common (stick, leaf, stone)
- Uncommon (iron_ore, machete)
- Rare (pumpkin, special crafts)
- Legendary (quest rewards)

### Visual Indicators
- Equipment icons displayed on companion sprite during battle
- Particle effects for equipped items (sparkles for leaf, flames for iron)
- Different sprite tints based on equipment

### Equipment Sets
- Bonus for equipping matching items
- "Forester Set" (stick + leaf) = +2 speed
- "Guardian Set" (stone + iron) = +5 defense

### Durability System
- Equipment degrades after battles
- Repair at workbench with materials
- Adds resource management strategy

### Equipment Crafting
- Special recipes at ToolBench
- Combine items to create unique equipment
- Stick + Iron Ore = Iron Sword (+6 attack)

---

## Code Integration Checklist

- [ ] Create `src/data/equipment.json`
- [ ] Create `src/EquipmentSystem.js`
- [ ] Import EquipmentSystem in `VoxelWorld.js`
- [ ] Initialize and load equipment in `VoxelWorld.init()`
- [ ] Add equipment UI section to `CompanionCodex.js`
- [ ] Add `createEquipmentSlot()` method to CompanionCodex
- [ ] Add `openEquipmentSelector()` method to CompanionCodex
- [ ] Apply equipment bonuses in `BattleArena.startBattle()`
- [ ] Add evasion check in `BattleArena.resolveCombat()`
- [ ] Add critical hit check in `BattleArena.resolveCombat()`
- [ ] Add `playEvasionAnimation()` to BattleArena
- [ ] Add `playCriticalAnimation()` to BattleArena
- [ ] Add `playJumpAnimation()` to CombatantSprite
- [ ] Test basic equipment/unequip flow
- [ ] Test stat bonuses in combat
- [ ] Test evasion animation
- [ ] Test critical hit animation

---

## Notes for Future Development

**Performance Considerations:**
- Cache equipment lookups to avoid repeated localStorage access
- Pre-calculate stats when opening Codex, not during combat
- Limit animation intervals to 60fps max

**Save Compatibility:**
- Old saves without `companionEquipment` should default to empty
- Migration script if changing equipment structure

**Balance:**
- Start with conservative bonuses (+2 attack, 15% evasion)
- Track combat win rates and adjust equipment power
- Consider companion tier balance (Tier 1 with epic gear vs Tier 3 base)

**UX Polish:**
- Add tooltip hover for equipment stats in Codex
- Visual feedback when equipping (flash, sound effect)
- Confirmation dialog before unequipping
- "Recommended" tag for best equipment per companion
