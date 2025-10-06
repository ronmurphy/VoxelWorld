/**
 * PlayerStats.js
 *
 * DCC TTRPG character stats system for VoxelWorld
 * Small numbers (2-15), fast math, luck-based scaling
 */

export class PlayerStats {
    constructor() {
        // 🎲 Core Attributes (start at 2, range 2-15)
        this.attributes = {
            str: 2,  // Strength - Melee damage, mining speed, carrying
            dex: 2,  // Dexterity - Movement, ranged damage, defense
            con: 2,  // Constitution - Health, stamina, hunger resistance
            int: 2,  // Intelligence - Crafting quality, XP gain, magic (future)
            wis: 2,  // Wisdom - Perception, magic points, awareness
            cha: 2   // Charisma - Trading, NPC relations (future)
        };

        // 📈 Character Progression
        this.level = 1;
        this.experience = 0;
        this.experienceToNextLevel = 100; // 100 XP per level

        // ❤️ Health & Magic Points
        this.maxHP = this.getMaxHP();
        this.currentHP = this.maxHP;
        this.maxMP = this.getMaxMP();
        this.currentMP = this.maxMP;

        // 🎯 Derived Stats
        this.armor = 0; // Armor bonus to defense rolls
        this.attackBonus = 0; // Weapon/achievement bonuses
        this.defenseBonus = 0; // Shield/achievement bonuses

        // 📊 Tracking
        this.totalDamageDealt = 0;
        this.totalDamageTaken = 0;
        this.blocksMinedByType = {}; // Track mining stats
        this.mobsKilledByType = {}; // Track kills

        console.log('🎲 PlayerStats initialized:', this.getSummary());
    }

    // ❤️ HEALTH & MAGIC
    getMaxHP() {
        return this.attributes.con + this.level;
    }

    getMaxMP() {
        return this.attributes.wis + this.attributes.int;
    }

    updateDerivedStats() {
        this.maxHP = this.getMaxHP();
        this.maxMP = this.getMaxMP();

        // Clamp current values to new maximums
        this.currentHP = Math.min(this.currentHP, this.maxHP);
        this.currentMP = Math.min(this.currentMP, this.maxMP);
    }

    // 🎲 LUCK SYSTEM (scales with level)
    getLuckDice() {
        // 1d10 per 10 levels
        // Level 1-9: 1d10
        // Level 10-19: 2d10
        // Level 20-29: 3d10, etc.
        return Math.floor(this.level / 10) + 1;
    }

    rollLuck() {
        const diceCount = this.getLuckDice();
        let total = 0;
        for (let i = 0; i < diceCount; i++) {
            total += Math.floor(Math.random() * 10) + 1; // d10
        }
        return total;
    }

    // 📈 LEVELING & XP
    gainExperience(amount) {
        this.experience += amount;
        console.log(`📈 Gained ${amount} XP (${this.experience}/${this.experienceToNextLevel})`);

        // Check for level up
        while (this.experience >= this.experienceToNextLevel) {
            this.levelUp();
        }
    }

    levelUp() {
        this.level++;
        this.experience -= this.experienceToNextLevel;
        this.experienceToNextLevel = this.level * 100; // 100 XP per level

        // Full heal on level up
        this.currentHP = this.getMaxHP();
        this.currentMP = this.getMaxMP();

        console.log(`⭐ LEVEL UP! Now level ${this.level}`);

        // TODO: Show level up modal with attribute point allocation
        // TODO: Show achievement selection
        return {
            newLevel: this.level,
            attributePoints: 3, // Player gets 3 points to distribute
            nextLevelXP: this.experienceToNextLevel
        };
    }

    // 🎯 ATTRIBUTE MANAGEMENT
    increaseAttribute(attr, amount = 1) {
        if (!this.attributes.hasOwnProperty(attr)) {
            console.error(`❌ Invalid attribute: ${attr}`);
            return false;
        }

        const newValue = this.attributes[attr] + amount;
        const maxValue = 15; // Standard max (some races can go to 20)

        if (newValue > maxValue) {
            console.warn(`⚠️ Cannot increase ${attr} beyond ${maxValue}`);
            return false;
        }

        this.attributes[attr] = newValue;
        this.updateDerivedStats();

        console.log(`📊 ${attr.toUpperCase()} increased to ${newValue}`);
        return true;
    }

    // 💔 DAMAGE & HEALING
    takeDamage(amount) {
        this.currentHP -= amount;
        this.totalDamageTaken += amount;

        if (this.currentHP <= 0) {
            this.currentHP = 0;
            return { alive: false, overkill: Math.abs(this.currentHP) };
        }

        return { alive: true, remainingHP: this.currentHP };
    }

    heal(amount) {
        const oldHP = this.currentHP;
        this.currentHP = Math.min(this.currentHP + amount, this.maxHP);
        const actualHealing = this.currentHP - oldHP;

        if (actualHealing > 0) {
            console.log(`💚 Healed ${actualHealing} HP (${this.currentHP}/${this.maxHP})`);
        }

        return actualHealing;
    }

    // 🔮 MAGIC POINTS
    spendMP(amount) {
        if (this.currentMP < amount) {
            console.warn(`⚠️ Not enough MP (need ${amount}, have ${this.currentMP})`);
            return false;
        }

        this.currentMP -= amount;
        return true;
    }

    restoreMP(amount) {
        const oldMP = this.currentMP;
        this.currentMP = Math.min(this.currentMP + amount, this.maxMP);
        const actualRestore = this.currentMP - oldMP;

        if (actualRestore > 0) {
            console.log(`💙 Restored ${actualRestore} MP (${this.currentMP}/${this.maxMP})`);
        }

        return actualRestore;
    }

    // 📊 STATISTICS
    trackMining(blockType) {
        if (!this.blocksMinedByType[blockType]) {
            this.blocksMinedByType[blockType] = 0;
        }
        this.blocksMinedByType[blockType]++;
    }

    trackKill(mobType) {
        if (!this.mobsKilledByType[mobType]) {
            this.mobsKilledByType[mobType] = 0;
        }
        this.mobsKilledByType[mobType]++;
    }

    // 💾 SAVE/LOAD
    serialize() {
        return {
            attributes: { ...this.attributes },
            level: this.level,
            experience: this.experience,
            experienceToNextLevel: this.experienceToNextLevel,
            currentHP: this.currentHP,
            currentMP: this.currentMP,
            armor: this.armor,
            attackBonus: this.attackBonus,
            defenseBonus: this.defenseBonus,
            totalDamageDealt: this.totalDamageDealt,
            totalDamageTaken: this.totalDamageTaken,
            blocksMinedByType: { ...this.blocksMinedByType },
            mobsKilledByType: { ...this.mobsKilledByType }
        };
    }

    deserialize(data) {
        if (!data) return;

        Object.assign(this.attributes, data.attributes || {});
        this.level = data.level || 1;
        this.experience = data.experience || 0;
        this.experienceToNextLevel = data.experienceToNextLevel || 100;
        this.currentHP = data.currentHP ?? this.getMaxHP();
        this.currentMP = data.currentMP ?? this.getMaxMP();
        this.armor = data.armor || 0;
        this.attackBonus = data.attackBonus || 0;
        this.defenseBonus = data.defenseBonus || 0;
        this.totalDamageDealt = data.totalDamageDealt || 0;
        this.totalDamageTaken = data.totalDamageTaken || 0;
        this.blocksMinedByType = data.blocksMinedByType || {};
        this.mobsKilledByType = data.mobsKilledByType || {};

        this.updateDerivedStats();

        console.log('💾 PlayerStats loaded:', this.getSummary());
    }

    // 📄 DEBUG & DISPLAY
    getSummary() {
        return {
            level: this.level,
            hp: `${this.currentHP}/${this.maxHP}`,
            mp: `${this.currentMP}/${this.maxMP}`,
            luck: `${this.getLuckDice()}d10`,
            attributes: { ...this.attributes },
            xp: `${this.experience}/${this.experienceToNextLevel}`
        };
    }

    // 🎮 HELPER: Get attribute modifier (for display/tooltips)
    getAttributeModifier(attr) {
        // Simple modifier: (attribute - 2) = modifier
        // STR 2 = +0, STR 5 = +3, STR 10 = +8
        return this.attributes[attr] - 2;
    }

    // 🎮 HELPER: Get health percentage (for visual bars)
    getHealthPercent() {
        return (this.currentHP / this.maxHP) * 100;
    }

    getMagicPercent() {
        return (this.currentMP / this.maxMP) * 100;
    }

    // 🎮 HELPER: Check if player can afford attribute increase
    canAffordAttributeIncrease(attr, points) {
        const newValue = this.attributes[attr] + points;
        return newValue <= 15; // Max 15 for humans
    }
}
