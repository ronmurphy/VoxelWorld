/**
 * BattleSystem.js
 *
 * Pokemon-style auto-battler system for companion vs enemy encounters
 * Features turn-based combat with companion stats, abilities, and player commands
 */

import * as THREE from 'three';

export class BattleSystem {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;
        this.scene = voxelWorld.scene;

        // Battle state
        this.inBattle = false;
        this.battleOverlay = null;
        this.currentEnemy = null;
        this.playerCompanion = null;
        this.turnQueue = [];
        this.currentTurnIndex = 0;
        this.battleLog = [];

        // Entity data cache
        this.entityData = null;

        console.log('⚔️ BattleSystem initialized');
    }

    /**
     * Load entity data from entities.json
     */
    async loadEntityData() {
        if (this.entityData) return this.entityData;

        try {
            const response = await fetch('art/entities/entities.json');
            this.entityData = await response.json();
            console.log('⚔️ Entity data loaded:', this.entityData.monsters);
            return this.entityData;
        } catch (error) {
            console.error('❌ Failed to load entity data:', error);
            return null;
        }
    }

    /**
     * Start a battle encounter
     * @param {string} enemyId - Enemy monster ID (e.g., 'angry_ghost')
     * @param {object} enemyPosition - {x, y, z} position of enemy in world
     */
    async startBattle(enemyId, enemyPosition = null) {
        if (this.inBattle) {
            console.log('⚔️ Already in battle!');
            return;
        }

        // Load entity data
        const data = await this.loadEntityData();
        if (!data) {
            console.error('❌ Cannot start battle without entity data');
            return;
        }

        // Get enemy stats
        const enemyStats = data.monsters[enemyId];
        if (!enemyStats) {
            console.error(`❌ Unknown enemy: ${enemyId}`);
            return;
        }

        // Get player's active companion
        const playerData = JSON.parse(localStorage.getItem('NebulaWorld_playerData') || '{}');
        const companionId = playerData.activeCompanion || playerData.starterMonster || 'rat';
        const companionBaseStats = data.monsters[companionId];

        if (!companionBaseStats) {
            console.error(`❌ Unknown companion: ${companionId}`);
            return;
        }

        // 🎒 Get companion stats WITH equipment bonuses from CompanionCodex
        let companionStats = { ...companionBaseStats }; // Start with base stats
        let companionSpecialEffects = [];

        if (this.voxelWorld.companionCodex) {
            const statsWithEquipment = await this.voxelWorld.companionCodex.getCompanionStats(companionId);
            if (statsWithEquipment) {
                // Merge equipment-enhanced stats, keeping name/description from base
                companionStats = {
                    ...companionBaseStats,
                    hp: statsWithEquipment.hp,
                    attack: statsWithEquipment.attack,
                    defense: statsWithEquipment.defense,
                    speed: statsWithEquipment.speed
                };
                console.log(`⚔️ Equipment bonuses applied! HP: ${companionStats.hp}, ATK: ${companionStats.attack}, DEF: ${companionStats.defense}, SPD: ${companionStats.speed}`);
            }

            // Get special combat effects
            companionSpecialEffects = this.voxelWorld.companionCodex.getSpecialCombatEffects(companionId);
            if (companionSpecialEffects.length > 0) {
                console.log(`✨ Special effects active:`, companionSpecialEffects.map(e => e.description).join(', '));
            }
        }

        console.log(`⚔️ Battle started: ${companionStats.name} vs ${enemyStats.name}`);

        // 🏟️ Use Battle Arena for 3D combat instead of UI overlay
        if (this.voxelWorld.battleArena) {
            this.inBattle = true;
            await this.voxelWorld.battleArena.startBattle(
                companionStats,
                companionId,
                enemyStats,
                enemyId,
                enemyPosition,
                companionSpecialEffects  // Pass special effects to arena
            );
        } else {
            console.error('❌ BattleArena not initialized!');
        }
    }

    /**
     * Build turn order queue based on speed stat + random roll
     */
    buildTurnQueue() {
        const companionInitiative = this.playerCompanion.speed + Math.floor(Math.random() * 6) + 1;
        const enemyInitiative = this.currentEnemy.speed + Math.floor(Math.random() * 6) + 1;

        if (companionInitiative >= enemyInitiative) {
            this.turnQueue = [this.playerCompanion, this.currentEnemy];
        } else {
            this.turnQueue = [this.currentEnemy, this.playerCompanion];
        }

        console.log(`⚔️ Turn order: ${this.turnQueue.map(t => t.name).join(' → ')}`);
    }

    /**
     * Create battle UI overlay
     */
    createBattleUI() {
        // Main overlay container
        this.battleOverlay = document.createElement('div');
        this.battleOverlay.id = 'battle-overlay';
        this.battleOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(180deg, rgba(20, 10, 30, 0.95) 0%, rgba(40, 20, 50, 0.95) 100%);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            z-index: 9999;
            opacity: 0;
            transition: opacity 0.5s ease;
            font-family: 'Georgia', serif;
            color: #E0D0C0;
        `;

        // Battle area (top 60%) - Shows combatants
        const battleArea = document.createElement('div');
        battleArea.id = 'battle-area';
        battleArea.style.cssText = `
            flex: 1;
            width: 100%;
            display: flex;
            justify-content: space-around;
            align-items: center;
            padding: 40px;
        `;

        // Player's companion (left side)
        const companionContainer = this.createCombatantDisplay(this.playerCompanion, 'left');

        // Enemy (right side)
        const enemyContainer = this.createCombatantDisplay(this.currentEnemy, 'right');

        battleArea.appendChild(companionContainer);
        battleArea.appendChild(enemyContainer);

        // Battle log (middle section)
        const battleLogContainer = document.createElement('div');
        battleLogContainer.id = 'battle-log';
        battleLogContainer.style.cssText = `
            width: 80%;
            max-width: 600px;
            min-height: 100px;
            background: rgba(0, 0, 0, 0.6);
            border: 3px solid #8B7355;
            border-radius: 10px;
            padding: 20px;
            font-size: 18px;
            line-height: 1.6;
            overflow-y: auto;
            margin-bottom: 20px;
        `;
        battleLogContainer.textContent = `${this.playerCompanion.name} encountered a wild ${this.currentEnemy.name}!`;

        // Command panel (bottom)
        const commandPanel = document.createElement('div');
        commandPanel.id = 'battle-commands';
        commandPanel.style.cssText = `
            width: 80%;
            max-width: 600px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            padding: 20px;
            margin-bottom: 40px;
        `;

        // Command buttons
        const commands = [
            { label: 'Fight', action: () => this.playerAttack() },
            { label: 'Run', action: () => this.attemptRun() },
        ];

        commands.forEach(cmd => {
            const btn = document.createElement('button');
            btn.textContent = cmd.label;
            btn.style.cssText = `
                padding: 20px;
                font-size: 20px;
                font-family: 'Georgia', serif;
                font-weight: bold;
                background: linear-gradient(135deg, #8B7355 0%, #A0826D 50%, #8B7355 100%);
                color: #2C1810;
                border: 3px solid #4A3728;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
            `;

            btn.addEventListener('mouseover', () => {
                btn.style.transform = 'scale(1.05)';
                btn.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.5)';
            });

            btn.addEventListener('mouseout', () => {
                btn.style.transform = 'scale(1)';
                btn.style.boxShadow = '0 3px 6px rgba(0, 0, 0, 0.3)';
            });

            btn.addEventListener('click', cmd.action);
            commandPanel.appendChild(btn);
        });

        // Assemble overlay
        this.battleOverlay.appendChild(battleArea);
        this.battleOverlay.appendChild(battleLogContainer);
        this.battleOverlay.appendChild(commandPanel);

        document.body.appendChild(this.battleOverlay);

        // Fade in
        setTimeout(() => {
            this.battleOverlay.style.opacity = '1';
        }, 10);
    }

    /**
     * Create a combatant display (portrait + stats)
     */
    createCombatantDisplay(combatant, side) {
        const container = document.createElement('div');
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 15px;
        `;

        // Portrait (use ready pose by default)
        const portrait = document.createElement('img');
        portrait.id = `portrait-${side}`;
        portrait.src = `art/entities/${combatant.sprite_ready || combatant.sprite_portrait || combatant.id + '.jpeg'}`;
        portrait.style.cssText = `
            width: 200px;
            height: 200px;
            border-radius: 10px;
            border: 4px solid ${combatant.isPlayer ? '#D4AF37' : '#8B0000'};
            object-fit: cover;
            background: #2C1810;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
            transition: transform 0.3s ease;
        `;

        // Name label
        const nameLabel = document.createElement('div');
        nameLabel.textContent = combatant.name;
        nameLabel.style.cssText = `
            font-size: 24px;
            font-weight: bold;
            color: ${combatant.isPlayer ? '#D4AF37' : '#FF6B6B'};
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
        `;

        // HP bar
        const hpBar = document.createElement('div');
        hpBar.id = `hp-bar-${side}`;
        hpBar.style.cssText = `
            width: 200px;
            height: 30px;
            background: #4A3728;
            border: 2px solid #8B7355;
            border-radius: 5px;
            overflow: hidden;
            position: relative;
        `;

        const hpFill = document.createElement('div');
        hpFill.id = `hp-fill-${side}`;
        hpFill.style.cssText = `
            height: 100%;
            width: 100%;
            background: linear-gradient(90deg, #4CAF50 0%, #8BC34A 100%);
            transition: width 0.3s ease;
        `;

        const hpText = document.createElement('div');
        hpText.id = `hp-text-${side}`;
        hpText.textContent = `${combatant.currentHP} / ${combatant.hp}`;
        hpText.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 16px;
            font-weight: bold;
            color: #FFF;
            text-shadow: 1px 1px 2px #000;
        `;

        hpBar.appendChild(hpFill);
        hpBar.appendChild(hpText);

        container.appendChild(portrait);
        container.appendChild(nameLabel);
        container.appendChild(hpBar);

        return container;
    }

    /**
     * Update HP display for a combatant
     */
    updateHP(combatant, side) {
        const hpFill = document.getElementById(`hp-fill-${side}`);
        const hpText = document.getElementById(`hp-text-${side}`);

        const hpPercent = (combatant.currentHP / combatant.hp) * 100;
        hpFill.style.width = `${Math.max(0, hpPercent)}%`;
        hpText.textContent = `${Math.max(0, combatant.currentHP)} / ${combatant.hp}`;

        // Color changes based on HP
        if (hpPercent > 50) {
            hpFill.style.background = 'linear-gradient(90deg, #4CAF50 0%, #8BC34A 100%)';
        } else if (hpPercent > 25) {
            hpFill.style.background = 'linear-gradient(90deg, #FFC107 0%, #FFD54F 100%)';
        } else {
            hpFill.style.background = 'linear-gradient(90deg, #F44336 0%, #EF5350 100%)';
        }
    }

    /**
     * Add message to battle log
     */
    logMessage(message) {
        const logContainer = document.getElementById('battle-log');
        if (logContainer) {
            this.battleLog.push(message);
            logContainer.textContent = this.battleLog.join('\n');
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    }

    /**
     * Process next turn in battle
     */
    nextTurn() {
        if (!this.inBattle) return;

        const currentCombatant = this.turnQueue[this.currentTurnIndex];

        if (currentCombatant.isPlayer) {
            // Player's turn - wait for command input
            this.logMessage(`${currentCombatant.name}'s turn!`);
        } else {
            // Enemy's turn - AI attack
            setTimeout(() => {
                this.enemyAttack();
            }, 1000);
        }
    }

    /**
     * Player chooses to attack
     */
    playerAttack() {
        const attacker = this.playerCompanion;
        const defender = this.currentEnemy;

        this.performAttack(attacker, defender, 'left', 'right');
    }

    /**
     * Enemy attacks player's companion
     */
    enemyAttack() {
        const attacker = this.currentEnemy;
        const defender = this.playerCompanion;

        this.performAttack(attacker, defender, 'right', 'left');
    }

    /**
     * Perform an attack action
     */
    performAttack(attacker, defender, attackerSide, defenderSide) {
        // Disable command buttons during animation
        this.setCommandsEnabled(false);

        // 🎬 Show attack sprite animation
        this.showAttackSprite(attacker, attackerSide);

        // Calculate hit chance: d20 + attack vs defense
        const attackRoll = Math.floor(Math.random() * 20) + 1;
        const hitCheck = attackRoll + attacker.attack;

        if (hitCheck >= defender.defense) {
            // Hit! Calculate damage
            const damageRoll = Math.floor(Math.random() * 6) + 1;
            const damage = Math.max(1, damageRoll + Math.floor(attacker.attack / 2));

            defender.currentHP -= damage;

            this.logMessage(`${attacker.name} attacks! Deals ${damage} damage!`);
            this.updateHP(defender, defenderSide);

            // Check for knockout
            if (defender.currentHP <= 0) {
                setTimeout(() => {
                    this.endBattle(attacker.isPlayer);
                }, 1500);
                return;
            }
        } else {
            // Miss!
            this.logMessage(`${attacker.name} attacks! But it missed!`);
        }

        // Advance turn
        setTimeout(() => {
            // 🎬 Return to ready sprite
            this.showReadySprite(attacker, attackerSide);

            this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnQueue.length;
            this.setCommandsEnabled(true);
            this.nextTurn();
        }, 1500);
    }

    /**
     * Show attack sprite animation
     */
    showAttackSprite(combatant, side) {
        const portrait = document.getElementById(`portrait-${side}`);
        if (portrait && combatant.sprite_attack) {
            portrait.src = `art/entities/${combatant.sprite_attack}`;
            // Slight forward animation
            portrait.style.transform = 'scale(1.1) translateX(' + (side === 'left' ? '10px' : '-10px') + ')';
        }
    }

    /**
     * Show ready sprite (default pose)
     */
    showReadySprite(combatant, side) {
        const portrait = document.getElementById(`portrait-${side}`);
        if (portrait) {
            const readySprite = combatant.sprite_ready || combatant.sprite_portrait || combatant.id + '.jpeg';
            portrait.src = `art/entities/${readySprite}`;
            // Reset transform
            portrait.style.transform = 'scale(1) translateX(0)';
        }
    }

    /**
     * Attempt to run from battle
     */
    attemptRun() {
        const speedDiff = this.playerCompanion.speed - this.currentEnemy.speed;
        const runChance = 0.5 + (speedDiff * 0.1); // 50% base + 10% per speed point difference

        if (Math.random() < runChance) {
            this.logMessage(`${this.playerCompanion.name} fled successfully!`);
            setTimeout(() => {
                this.endBattle(null); // No winner
            }, 1000);
        } else {
            this.logMessage(`Couldn't escape!`);

            // Enemy gets free attack
            setTimeout(() => {
                this.enemyAttack();
            }, 1500);
        }
    }

    /**
     * Enable/disable command buttons
     */
    setCommandsEnabled(enabled) {
        const commandPanel = document.getElementById('battle-commands');
        if (commandPanel) {
            const buttons = commandPanel.querySelectorAll('button');
            buttons.forEach(btn => {
                btn.disabled = !enabled;
                btn.style.opacity = enabled ? '1' : '0.5';
                btn.style.cursor = enabled ? 'pointer' : 'not-allowed';
            });
        }
    }

    /**
     * End battle with victory/defeat/flee outcome
     * @param {boolean|null} playerWon - true if player won, false if lost, null if fled
     */
    endBattle(playerWon) {
        if (playerWon === true) {
            this.logMessage(`Victory! ${this.currentEnemy.name} was defeated!`);

            // Award drops if enemy has them
            if (this.currentEnemy.drops && this.currentEnemy.drops.length > 0) {
                // TODO: Add items to inventory
                this.logMessage(`Received: ${this.currentEnemy.drops.join(', ')}`);
            }
        } else if (playerWon === false) {
            this.logMessage(`${this.playerCompanion.name} was defeated!`);
            // TODO: Handle defeat (respawn, lose items, etc.)
        } else {
            this.logMessage(`Got away safely!`);
        }

        setTimeout(() => {
            this.closeBattle();
        }, 2000);
    }

    /**
     * Close battle UI and return to game
     */
    closeBattle() {
        // 🖼️ Update companion portrait HP before closing
        if (this.voxelWorld.companionPortrait && this.playerCompanion) {
            this.voxelWorld.companionPortrait.updateHP(this.playerCompanion.currentHP);
        }

        if (this.battleOverlay) {
            this.battleOverlay.style.opacity = '0';

            setTimeout(() => {
                if (this.battleOverlay && this.battleOverlay.parentNode) {
                    this.battleOverlay.parentNode.removeChild(this.battleOverlay);
                    this.battleOverlay = null;
                }

                // Re-enable controls and pointer lock
                this.voxelWorld.controlsEnabled = true;
                setTimeout(() => {
                    if (this.voxelWorld.renderer && this.voxelWorld.renderer.domElement) {
                        this.voxelWorld.renderer.domElement.requestPointerLock();
                    }
                }, 100);
            }, 500);
        }

        this.inBattle = false;
        this.currentEnemy = null;
        this.playerCompanion = null;
        this.turnQueue = [];
        this.battleLog = [];

        console.log('⚔️ Battle ended');
    }
}
