/**
 * BattleArena.js
 *
 * 3D arena-style battle system where companions and enemies face off in the voxel world
 * Features circling animations, attack sequences, and cinematic combat
 */

import * as THREE from 'three';
import { CombatantSprite } from './CombatantSprite.js';
import { ChatOverlay } from './ui/Chat.js';

export class BattleArena {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;
        this.scene = voxelWorld.scene;

        // Battle state
        this.isActive = false;
        this.companionSprite = null;
        this.enemySprite = null;

        // Arena settings
        this.arenaCenter = new THREE.Vector3();
        this.arenaRadius = 2.0; // How far combatants orbit from center

        // Combat logic
        this.turnQueue = [];
        this.currentTurnIndex = 0;
        this.turnTimer = 0;
        this.turnDelay = 3.0; // Seconds between turns

        // Circling animation
        this.companionAngle = 0;
        this.enemyAngle = Math.PI; // Start opposite side
        this.circleSpeed = 0.5; // Radians per second

        // Animation states
        this.isAttacking = false;
        this.attackDuration = 1.5; // Seconds for attack animation
        this.attackTimer = 0;

        console.log('⚔️ BattleArena initialized');
    }

    /**
     * Start arena battle
     * @param {object} companionData - Companion stats from entities.json
     * @param {string} companionId - Companion ID
     * @param {object} enemyData - Enemy stats from entities.json
     * @param {string} enemyId - Enemy ID
     * @param {object} enemyPosition - {x, y, z} enemy position in world
     */
    async startBattle(companionData, companionId, enemyData, enemyId, enemyPosition) {
        if (this.isActive) {
            console.log('⚔️ Battle already active!');
            return;
        }

        console.log(`⚔️ Arena Battle: ${companionData.name} vs ${enemyData.name}`);

        this.isActive = true;

        // Calculate arena center between player and enemy at player's Y level
        const playerPos = this.voxelWorld.player.position;
        this.arenaCenter.set(
            (playerPos.x + enemyPosition.x) / 2,
            playerPos.y, // Use player's Y level for better visibility
            (playerPos.z + enemyPosition.z) / 2
        );

        // Disable player MOVEMENT but keep camera controls active
        this.voxelWorld.controlsEnabled = false;

        // Clear any built-up movement input
        this.voxelWorld.keys = {};

        // Store enemy data for loot (before sprite gets destroyed)
        this.enemyData = enemyData;
        this.companionData = companionData;

        // Create combatant sprites
        this.companionSprite = new CombatantSprite(this.scene, companionData, companionId, true);
        this.enemySprite = new CombatantSprite(this.scene, enemyData, enemyId, false);

        // Position combatants on opposite sides of arena
        const companionPos = this.getCirclePosition(this.companionAngle);
        const enemyPos = this.getCirclePosition(this.enemyAngle);

        this.companionSprite.createSprite(companionPos.x, companionPos.y, companionPos.z);
        this.enemySprite.createSprite(enemyPos.x, enemyPos.y, enemyPos.z);

        // Set initial target positions for circling
        this.companionSprite.moveTo(companionPos.x, companionPos.y, companionPos.z);
        this.enemySprite.moveTo(enemyPos.x, enemyPos.y, enemyPos.z);

        // Determine turn order based on speed
        this.buildTurnQueue(companionData, enemyData);

        // Start battle loop
        this.turnTimer = 0;
    }

    /**
     * Calculate position on circle based on angle
     */
    getCirclePosition(angle) {
        return {
            x: this.arenaCenter.x + Math.cos(angle) * this.arenaRadius,
            y: this.arenaCenter.y + 1.0, // 1 block above ground
            z: this.arenaCenter.z + Math.sin(angle) * this.arenaRadius
        };
    }

    /**
     * Build turn queue based on speed stat
     */
    buildTurnQueue(companionData, enemyData) {
        const companionInitiative = companionData.speed + Math.floor(Math.random() * 6) + 1;
        const enemyInitiative = enemyData.speed + Math.floor(Math.random() * 6) + 1;

        if (companionInitiative >= enemyInitiative) {
            this.turnQueue = [
                { sprite: this.companionSprite, data: companionData, isPlayer: true },
                { sprite: this.enemySprite, data: enemyData, isPlayer: false }
            ];
        } else {
            this.turnQueue = [
                { sprite: this.enemySprite, data: enemyData, isPlayer: false },
                { sprite: this.companionSprite, data: companionData, isPlayer: true }
            ];
        }

        console.log(`⚔️ Turn order: ${this.turnQueue.map(t => t.data.name).join(' → ')}`);
    }

    /**
     * Update battle (called every frame from VoxelWorld)
     */
    update(deltaTime) {
        if (!this.isActive) return;

        // Update combatant sprites
        if (this.companionSprite) {
            this.companionSprite.update(deltaTime);
        }
        if (this.enemySprite) {
            this.enemySprite.update(deltaTime);
        }

        // Handle attack animation
        if (this.isAttacking) {
            this.attackTimer += deltaTime;

            if (this.attackTimer >= this.attackDuration) {
                // Attack animation complete, return to circling
                this.isAttacking = false;
                this.attackTimer = 0;

                // Return attacker to ready pose
                const attacker = this.turnQueue[this.currentTurnIndex];
                attacker.sprite.showReadyPose();

                // Advance turn
                this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnQueue.length;
                this.turnTimer = 0;
            }
        } else {
            // Circling animation
            this.updateCircling(deltaTime);

            // Turn timer
            this.turnTimer += deltaTime;

            if (this.turnTimer >= this.turnDelay) {
                this.executeTurn();
            }
        }
    }

    /**
     * Update circling motion around arena center
     */
    updateCircling(deltaTime) {
        // Increment angles
        this.companionAngle += this.circleSpeed * deltaTime;
        this.enemyAngle += this.circleSpeed * deltaTime;

        // Keep angles in 0-2π range
        if (this.companionAngle > Math.PI * 2) this.companionAngle -= Math.PI * 2;
        if (this.enemyAngle > Math.PI * 2) this.enemyAngle -= Math.PI * 2;

        // Update target positions
        const companionPos = this.getCirclePosition(this.companionAngle);
        const enemyPos = this.getCirclePosition(this.enemyAngle);

        this.companionSprite.moveTo(companionPos.x, companionPos.y, companionPos.z);
        this.enemySprite.moveTo(enemyPos.x, enemyPos.y, enemyPos.z);
    }

    /**
     * Execute combat turn
     */
    executeTurn() {
        const attacker = this.turnQueue[this.currentTurnIndex];
        const defenderIndex = (this.currentTurnIndex + 1) % this.turnQueue.length;
        const defender = this.turnQueue[defenderIndex];

        console.log(`⚔️ ${attacker.data.name} attacks ${defender.data.name}!`);

        // Start attack animation
        this.isAttacking = true;
        this.attackTimer = 0;

        // Show attack pose
        attacker.sprite.showAttackPose();

        // Lunge forward
        const attackerPos = attacker.sprite.position;
        const defenderPos = defender.sprite.position;
        const direction = new THREE.Vector3()
            .subVectors(defenderPos, attackerPos)
            .normalize();

        const lungePos = attackerPos.clone().add(direction.multiplyScalar(0.5));
        attacker.sprite.moveTo(lungePos.x, lungePos.y, lungePos.z);

        // Calculate hit/damage
        setTimeout(() => {
            this.resolveCombat(attacker, defender);
        }, 500); // Half-second delay for attack animation
    }

    /**
     * Resolve combat (hit/miss, damage calculation)
     */
    resolveCombat(attacker, defender) {
        // Calculate hit chance: d20 + attack vs defense
        const attackRoll = Math.floor(Math.random() * 20) + 1;
        const hitCheck = attackRoll + attacker.data.attack;

        if (hitCheck >= defender.data.defense) {
            // Hit! Calculate damage
            const damageRoll = Math.floor(Math.random() * 6) + 1;
            const damage = Math.max(1, damageRoll + Math.floor(attacker.data.attack / 2));

            // Apply damage
            const newHP = defender.sprite.currentHP - damage;
            defender.sprite.updateHP(newHP);

            // Flash damage
            defender.sprite.flashDamage();

            // Show damage number (TODO: floating text)
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

    /**
     * End battle with victory or defeat
     * @param {boolean} playerWon - true if player won, false if lost
     */
    async endBattle(playerWon) {
        console.log(`⚔️ Battle ended! ${playerWon ? 'Victory!' : 'Defeat!'}`);

        this.isActive = false;

        // Play victory/defeat animations
        if (playerWon) {
            this.companionSprite.playVictory();
            this.enemySprite.playDefeat();
        } else {
            this.enemySprite.playVictory();
            this.companionSprite.playDefeat();
        }

        // Wait for animations
        await this.delay(2000);

        // Show victory dialogue
        if (playerWon) {
            await this.showVictoryDialogue();
        } else {
            await this.showDefeatDialogue();
        }

        // Clean up arena
        this.cleanup();
    }

    /**
     * Show context-aware victory dialogue
     */
    async showVictoryDialogue() {
        const hpPercent = (this.companionSprite.currentHP / this.companionSprite.maxHP) * 100;
        let message = '';

        if (hpPercent >= 95) {
            message = `Hah! That was barely a warm-up! Easy pickings!`;
        } else if (hpPercent >= 50) {
            message = `Whew! We did it! Not too shabby, right?`;
        } else if (hpPercent >= 25) {
            message = `That... was tough. We barely made it!`;
        } else {
            message = `I can't believe we survived that! That was INTENSE!`;
        }

        // Get loot drops
        const lootMessage = this.getLootMessage();

        // Show chat
        const playerData = JSON.parse(localStorage.getItem('NebulaWorld_playerData') || '{}');
        const companionId = playerData.activeCompanion || playerData.starterMonster || 'rat';
        const companionData = await ChatOverlay.loadCompanionData(companionId);
        const companionName = companionData ? companionData.name : companionId;

        const chat = new ChatOverlay();
        chat.showSequence([
            {
                character: companionId,
                name: companionName,
                text: message
            },
            {
                character: companionId,
                name: companionName,
                text: lootMessage
            }
        ], () => {
            // Add loot to inventory
            this.addLootToInventory();
        });
    }

    /**
     * Show defeat dialogue
     */
    async showDefeatDialogue() {
        const playerData = JSON.parse(localStorage.getItem('NebulaWorld_playerData') || '{}');
        const companionId = playerData.activeCompanion || playerData.starterMonster || 'rat';
        const companionData = await ChatOverlay.loadCompanionData(companionId);
        const companionName = companionData ? companionData.name : companionId;

        const chat = new ChatOverlay();
        chat.showMessage({
            character: companionId,
            name: companionName,
            text: `We... we lost. I'm sorry. Let's rest up and try again!`
        });
    }

    /**
     * Get loot message with item list
     */
    getLootMessage() {
        if (this.enemyData && this.enemyData.drops && this.enemyData.drops.length > 0) {
            const drops = this.enemyData.drops;
            const dropList = drops.map(item => `${item}`).join(', ');
            return `We found some loot! Received: ${dropList}. Click Continue to collect!`;
        } else {
            return `Good fight! Let's keep exploring!`;
        }
    }

    /**
     * Add loot drops to player inventory
     */
    addLootToInventory() {
        // Store enemy data before sprite is destroyed
        if (this.enemyData && this.enemyData.drops && this.voxelWorld.addToInventory) {
            this.enemyData.drops.forEach(item => {
                this.voxelWorld.addToInventory(item, 1);
                console.log(`📦 Looted: ${item}`);
            });
        }
    }

    /**
     * Clean up arena and restore player control
     */
    cleanup() {
        // Destroy sprites
        if (this.companionSprite) {
            this.companionSprite.destroy();
            this.companionSprite = null;
        }

        if (this.enemySprite) {
            this.enemySprite.destroy();
            this.enemySprite = null;
        }

        // Re-enable player controls
        setTimeout(() => {
            // Clear any buffered input before re-enabling controls
            this.voxelWorld.keys = {};

            this.voxelWorld.controlsEnabled = true;

            // Re-engage pointer lock
            if (this.voxelWorld.renderer && this.voxelWorld.renderer.domElement) {
                this.voxelWorld.renderer.domElement.requestPointerLock();
            }
        }, 500);

        // Update companion portrait HP
        if (this.voxelWorld.companionPortrait && this.companionSprite) {
            this.voxelWorld.companionPortrait.updateHP(this.companionSprite.currentHP);
        }

        console.log('⚔️ Arena cleaned up');
    }

    /**
     * Promise-based delay helper
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
