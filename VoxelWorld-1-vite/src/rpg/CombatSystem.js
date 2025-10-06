/**
 * CombatSystem.js
 *
 * DCC TTRPG combat mechanics for VoxelWorld
 * Opposed rolls, luck-based scaling, +3 margin to hit
 */

export class CombatSystem {
    constructor() {
        // Combat timing (real-time adaptation)
        this.attackCooldowns = new Map(); // Map<entityId, cooldownEndTime>

        console.log('⚔️ CombatSystem initialized');
    }

    // 🎲 CORE DICE ROLLING
    d20() {
        return Math.floor(Math.random() * 20) + 1;
    }

    d10() {
        return Math.floor(Math.random() * 10) + 1;
    }

    d8() {
        return Math.floor(Math.random() * 8) + 1;
    }

    d6() {
        return Math.floor(Math.random() * 6) + 1;
    }

    d4() {
        return Math.floor(Math.random() * 4) + 1;
    }

    // 🍀 LUCK DICE (scales with level)
    rollLuck(diceCount) {
        let total = 0;
        for (let i = 0; i < diceCount; i++) {
            total += this.d10();
        }
        return total;
    }

    // 💥 DAMAGE DICE
    rollDamage(damageDice) {
        // damageDice format: 'd4', 'd6', 'd8', '2d6', etc.
        const match = damageDice.match(/^(\d*)d(\d+)$/);
        if (!match) {
            console.error(`❌ Invalid damage dice format: ${damageDice}`);
            return 0;
        }

        const count = parseInt(match[1]) || 1;
        const size = parseInt(match[2]);

        let total = 0;
        for (let i = 0; i < count; i++) {
            total += Math.floor(Math.random() * size) + 1;
        }

        return total;
    }

    // ⚔️ ATTACK RESOLUTION (Opposed Rolls)
    /**
     * Resolve an attack between attacker and defender
     * @param {object} attacker - Entity with stats and weapon
     * @param {object} defender - Entity with stats and armor
     * @returns {object} Combat result with hit/miss, damage, rolls
     */
    resolveAttack(attacker, defender) {
        // Get weapon info
        const weapon = attacker.weapon || { bonus: 0, damageDice: 'd4' };
        const attackAttribute = weapon.ranged ? attacker.stats.attributes.dex : attacker.stats.attributes.str;

        // ATTACKER ROLL: d20 + attribute + weapon bonus + luck
        const attackRoll = this.d20();
        const attackLuck = this.rollLuck(attacker.stats.getLuckDice());
        const attackTotal = attackRoll + attackAttribute + weapon.bonus + attackLuck + (attacker.stats.attackBonus || 0);

        // DEFENDER ROLL: d20 + DEX + armor bonus + luck
        const defenseRoll = this.d20();
        const defenseLuck = this.rollLuck(defender.stats.getLuckDice());
        const defenseTotal = defenseRoll + defender.stats.attributes.dex + defender.stats.armor + defenseLuck + (defender.stats.defenseBonus || 0);

        // HIT DETERMINATION: Margin of +3 or more = HIT
        const margin = attackTotal - defenseTotal;
        const hit = margin >= 3;

        let damage = 0;
        let critical = false;

        if (hit) {
            // Roll weapon damage + attribute modifier
            damage = this.rollDamage(weapon.damageDice) + attackAttribute;

            // CRITICAL HIT: Margin of 10+ doubles damage
            if (margin >= 10) {
                damage *= 2;
                critical = true;
            }

            // Track damage dealt
            if (attacker.stats) {
                attacker.stats.totalDamageDealt += damage;
            }
        }

        return {
            hit,
            damage,
            critical,
            margin,
            attackRoll: {
                d20: attackRoll,
                attribute: attackAttribute,
                weapon: weapon.bonus,
                luck: attackLuck,
                total: attackTotal
            },
            defenseRoll: {
                d20: defenseRoll,
                dex: defender.stats.attributes.dex,
                armor: defender.stats.armor,
                luck: defenseLuck,
                total: defenseTotal
            }
        };
    }

    // 🕐 COOLDOWN MANAGEMENT (Real-time adaptation)
    canAttack(entityId, currentTime, cooldownSeconds = 1.0) {
        const cooldownEnd = this.attackCooldowns.get(entityId);

        if (!cooldownEnd || currentTime >= cooldownEnd) {
            return true;
        }

        return false;
    }

    startAttackCooldown(entityId, currentTime, cooldownSeconds = 1.0) {
        this.attackCooldowns.set(entityId, currentTime + cooldownSeconds);
    }

    getRemainingCooldown(entityId, currentTime) {
        const cooldownEnd = this.attackCooldowns.get(entityId);

        if (!cooldownEnd || currentTime >= cooldownEnd) {
            return 0;
        }

        return cooldownEnd - currentTime;
    }

    // 💔 APPLY DAMAGE
    /**
     * Apply damage to an entity and check for death
     * @param {object} entity - Entity receiving damage
     * @param {number} damage - Amount of damage
     * @returns {object} Result with alive status
     */
    applyDamage(entity, damage) {
        if (!entity.stats) {
            console.error('❌ Entity has no stats!', entity);
            return { alive: true };
        }

        const result = entity.stats.takeDamage(damage);

        // Check for death
        if (!result.alive) {
            console.log(`💀 ${entity.name || 'Entity'} has been defeated!`);
            return { alive: false, overkill: result.overkill };
        }

        return { alive: true, remainingHP: result.remainingHP };
    }

    // 🎯 FULL COMBAT ROUND (convenience method)
    /**
     * Execute a full attack with cooldown check and damage application
     * @param {object} attacker - Attacking entity
     * @param {object} defender - Defending entity
     * @param {number} currentTime - Current game time
     * @returns {object} Full combat result or null if on cooldown
     */
    executeAttack(attacker, defender, currentTime) {
        // Check cooldown
        const cooldownTime = attacker.attackCooldown || 1.0;

        if (!this.canAttack(attacker.id, currentTime, cooldownTime)) {
            return {
                onCooldown: true,
                remainingCooldown: this.getRemainingCooldown(attacker.id, currentTime)
            };
        }

        // Resolve attack
        const result = this.resolveAttack(attacker, defender);

        // Apply damage if hit
        if (result.hit) {
            const damageResult = this.applyDamage(defender, result.damage);
            result.targetAlive = damageResult.alive;
            result.targetRemainingHP = damageResult.remainingHP;
        }

        // Start cooldown
        this.startAttackCooldown(attacker.id, currentTime, cooldownTime);

        return result;
    }

    // 📊 COMBAT LOG (for debugging/display)
    formatCombatResult(result, attackerName, defenderName) {
        if (result.onCooldown) {
            return `⏱️ ${attackerName} is on cooldown (${result.remainingCooldown.toFixed(1)}s)`;
        }

        if (!result.hit) {
            return `❌ ${attackerName} misses ${defenderName}! (Margin: ${result.margin})`;
        }

        const critText = result.critical ? '💥 CRITICAL HIT! ' : '';
        const aliveText = result.targetAlive ? '' : ' 💀 DEFEATED!';

        return `${critText}${attackerName} hits ${defenderName} for ${result.damage} damage!${aliveText} (Margin: ${result.margin})`;
    }

    // 🎲 INITIATIVE (for turn-based sections, future use)
    rollInitiative(entity) {
        const roll = this.d20();
        const luck = this.rollLuck(entity.stats.getLuckDice());
        const total = roll + entity.stats.attributes.dex + luck;

        return {
            entity,
            roll,
            dex: entity.stats.attributes.dex,
            luck,
            total
        };
    }

    // 🎲 SKILL CHECK (generic d20 + attribute + luck)
    skillCheck(entity, attribute, difficulty = 10) {
        const roll = this.d20();
        const luck = this.rollLuck(entity.stats.getLuckDice());
        const total = roll + entity.stats.attributes[attribute] + luck;

        return {
            success: total >= difficulty,
            roll,
            attribute: entity.stats.attributes[attribute],
            luck,
            total,
            difficulty
        };
    }

    // 🎲 SAVING THROW (resist effects)
    savingThrow(entity, attribute, difficulty = 10) {
        return this.skillCheck(entity, attribute, difficulty);
    }
}
