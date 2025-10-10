/**
 * BattleArena.js
 *
 * 3D arena-style battle system where companions and enemies face off in the voxel world
 * Features circling animations, attack sequences, and cinematic combat
 */

import * as THREE from 'three';
import { CombatantSprite } from './CombatantSprite.js';
import { ChatOverlay } from './ui/Chat.js';
import { getRandomBattlePattern, getBattlePatternByName } from './BattleAnimationPatterns.js';

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
        this.arenaSize = 8; // 8x8 block arena for player movement
        this.arenaWalls = []; // Visual boundary walls
        this.arenaFloor = null; // Arena floor marker

        // Player movement restriction
        this.playerStartPos = new THREE.Vector3();
        this.movementBounds = {
            minX: 0, maxX: 0,
            minZ: 0, maxZ: 0
        };

        // Combat logic
        this.turnQueue = [];
        this.currentTurnIndex = 0;
        this.turnTimer = 0;
        this.turnDelay = 3.0; // Seconds between turns

        // Animation pattern system
        this.currentPattern = null;

        // Legacy circling animation (kept for compatibility)
        this.companionAngle = 0;
        this.enemyAngle = Math.PI; // Start opposite side
        this.circleSpeed = 0.5; // Radians per second

        // Animation states
        this.isAttacking = false;
        this.attackDuration = 1.5; // Seconds for attack animation
        this.attackTimer = 0;

        // Item targeting
        this.targetingRaycaster = new THREE.Raycaster();
        this.targetingEnabled = false;

        console.log('⚔️ BattleArena initialized');
    }

    /**
     * Start arena battle
     * @param {object} companionData - Companion stats from entities.json
     * @param {string} companionId - Companion ID
     * @param {object} enemyData - Enemy stats from entities.json
     * @param {string} enemyId - Enemy ID
     * @param {object} enemyPosition - {x, y, z} enemy position in world
     * @param {array} companionSpecialEffects - Array of special combat effects
     */
    async startBattle(companionData, companionId, enemyData, enemyId, enemyPosition, companionSpecialEffects = []) {
        if (this.isActive) {
            console.log('⚔️ Battle already active!');
            return;
        }

        console.log(`⚔️ Arena Battle: ${companionData.name} vs ${enemyData.name}`);
        
        // Store special effects for companion
        this.companionSpecialEffects = companionSpecialEffects;

        this.isActive = true;

        // Calculate arena center 4 blocks ahead of player's facing direction
        const playerPos = this.voxelWorld.player.position;
        const playerRotation = this.voxelWorld.player.rotation.y;

        // Calculate forward direction vector (player rotation.y is yaw)
        const forwardX = -Math.sin(playerRotation);
        const forwardZ = -Math.cos(playerRotation);

        // Calculate ground level (player.position.y is at eye level, adjust down to ground)
        const groundOffset = 0.80; // Adjust slightly down to raise combatants a bit
        const footY = playerPos.y - groundOffset;

        // Position arena 4 blocks ahead of player at ground/foot level
        this.arenaCenter.set(
            playerPos.x + (forwardX * 4),
            footY, // Ground level (player's feet)
            playerPos.z + (forwardZ * 4)
        );

        // Store player start position
        this.playerStartPos.copy(playerPos);

        // Calculate 8x8 movement bounds centered on arena
        const halfSize = this.arenaSize / 2;
        this.movementBounds = {
            minX: this.arenaCenter.x - halfSize,
            maxX: this.arenaCenter.x + halfSize,
            minZ: this.arenaCenter.z - halfSize,
            maxZ: this.arenaCenter.z + halfSize
        };

        // Create arena walls and floor
        this.createArenaWalls();

        // Enable player MOVEMENT but restrict to 8x8 area
        this.voxelWorld.movementEnabled = true;
        this.voxelWorld.inBattleArena = true; // Flag for movement restriction

        // Clear any built-up movement input
        this.voxelWorld.keys = {};

        // Store enemy data for loot (before sprite gets destroyed)
        this.enemyData = enemyData;
        this.companionData = companionData;

        // Select random battle animation pattern
        this.currentPattern = getRandomBattlePattern(this.arenaCenter, this.arenaRadius);
        console.log(`🎭 Battle pattern selected: ${this.currentPattern.constructor.name}`);

        // Create combatant sprites (pass voxelWorld to companion for portrait updates)
        this.companionSprite = new CombatantSprite(this.scene, companionData, companionId, true, this.voxelWorld);
        this.enemySprite = new CombatantSprite(this.scene, enemyData, enemyId, false, null);

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
     * Create visual arena walls (8x8 barrier ring)
     */
    createArenaWalls() {
        const wallHeight = 0.5; // Small border just to get attention
        const wallThickness = 0.1;
        const wallColor = 0x8B4513; // Brown/bronze color
        const glowColor = 0xFFD700; // Gold glow

        // Material with emissive glow
        const wallMaterial = new THREE.MeshBasicMaterial({
            color: wallColor,
            emissive: glowColor,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.6
        });

        const halfSize = this.arenaSize / 2;

        // Create 4 wall segments (north, south, east, west)
        const walls = [
            // North wall
            { x: 0, z: halfSize, width: this.arenaSize, depth: wallThickness },
            // South wall
            { x: 0, z: -halfSize, width: this.arenaSize, depth: wallThickness },
            // East wall
            { x: halfSize, z: 0, width: wallThickness, depth: this.arenaSize },
            // West wall
            { x: -halfSize, z: 0, width: wallThickness, depth: this.arenaSize }
        ];

        walls.forEach(wallData => {
            const geometry = new THREE.BoxGeometry(wallData.width, wallHeight, wallData.depth);
            const wall = new THREE.Mesh(geometry, wallMaterial);

            wall.position.set(
                this.arenaCenter.x + wallData.x,
                this.arenaCenter.y + wallHeight / 2, // Just above ground at player's foot level
                this.arenaCenter.z + wallData.z
            );

            this.scene.add(wall);
            this.arenaWalls.push(wall);
        });

        // Create arena floor marker (subtle glowing circle)
        const floorGeometry = new THREE.CircleGeometry(halfSize, 32);
        const floorMaterial = new THREE.MeshBasicMaterial({
            color: 0x444444,
            emissive: glowColor,
            emissiveIntensity: 0.1,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });

        this.arenaFloor = new THREE.Mesh(floorGeometry, floorMaterial);
        this.arenaFloor.rotation.x = -Math.PI / 2; // Lay flat
        this.arenaFloor.position.set(
            this.arenaCenter.x,
            this.arenaCenter.y + 0.01, // Slightly above ground
            this.arenaCenter.z
        );

        this.scene.add(this.arenaFloor);

        console.log('⚔️ Arena walls created (8x8 boundary)');
    }

    /**
     * Calculate position on circle based on angle (legacy - now uses patterns)
     */
    getCirclePosition(angle) {
        return {
            x: this.arenaCenter.x + Math.cos(angle) * this.arenaRadius,
            y: this.arenaCenter.y, // At player's feet level
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
     * Update combat animation (now uses pattern system)
     */
    updateCircling(deltaTime) {
        if (this.currentPattern) {
            // Use selected battle pattern
            this.currentPattern.update(deltaTime, this.companionSprite, this.enemySprite);
        } else {
            // Fallback to legacy circling (shouldn't happen)
            this.companionAngle += this.circleSpeed * deltaTime;
            this.enemyAngle += this.circleSpeed * deltaTime;

            if (this.companionAngle > Math.PI * 2) this.companionAngle -= Math.PI * 2;
            if (this.enemyAngle > Math.PI * 2) this.enemyAngle -= Math.PI * 2;

            const companionPos = this.getCirclePosition(this.companionAngle);
            const enemyPos = this.getCirclePosition(this.enemyAngle);

            this.companionSprite.moveTo(companionPos.x, companionPos.y, companionPos.z);
            this.enemySprite.moveTo(enemyPos.x, enemyPos.y, enemyPos.z);
        }
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

        // Check for critical hit (natural 20)
        const isCritical = attackRoll === 20;

        // Dodge chance based on speed difference
        const speedDiff = defender.data.speed - attacker.data.speed;
        const dodgeChance = Math.max(0, Math.min(0.3, speedDiff * 0.05)); // 0-30% max
        const dodgeRoll = Math.random();

        if (dodgeRoll < dodgeChance && !isCritical) {
            // Dodged!
            defender.sprite.playDodge();
            console.log(`💨 ${defender.data.name} dodged the attack!`);
        } else if (hitCheck >= defender.data.defense) {
            // Hit! Calculate damage
            let damageRoll = Math.floor(Math.random() * 6) + 1;

            // Critical hit doubles damage
            if (isCritical) {
                damageRoll *= 2;
                console.log(`🌟 CRITICAL HIT!`);
            }

            const damage = Math.max(1, damageRoll + Math.floor(attacker.data.attack / 2));
            const oldHP = defender.sprite.currentHP;

            // Apply damage
            const newHP = oldHP - damage;
            defender.sprite.updateHP(newHP);

            // Determine animation based on damage severity
            const hpLostPercent = (damage / defender.data.hp) * 100;

            if (hpLostPercent >= 50 || isCritical) {
                // Heavy damage - play fallback animation
                defender.sprite.playFallback();
                defender.sprite.flashDamageEnhanced(true);
                console.log(`💥 MASSIVE HIT! ${damage} damage! ${defender.data.name}: ${newHP}/${defender.data.hp} HP`);
            } else {
                // Normal damage
                defender.sprite.flashDamageEnhanced(isCritical);
                console.log(`💥 Hit! ${damage} damage! ${defender.data.name}: ${newHP}/${defender.data.hp} HP`);
            }

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

        // Return attacker to pattern position after 500ms
        setTimeout(() => {
            // Pattern handles positioning automatically
            console.log(`↩️ ${attacker.data.name} returns to formation`);
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

            // Reset battle flag so player can enter new battles
            if (this.voxelWorld && this.voxelWorld.battleSystem) {
                this.voxelWorld.battleSystem.inBattle = false;
                console.log('✅ Battle flag reset - ready for new battle');
            }
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
        }, () => {
            // Reset battle flag so player can enter new battles
            if (this.voxelWorld && this.voxelWorld.battleSystem) {
                this.voxelWorld.battleSystem.inBattle = false;
                console.log('✅ Battle flag reset - ready for new battle');
            }
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

        // Destroy arena walls
        this.arenaWalls.forEach(wall => {
            this.scene.remove(wall);
            wall.geometry.dispose();
            wall.material.dispose();
        });
        this.arenaWalls = [];

        // Destroy arena floor
        if (this.arenaFloor) {
            this.scene.remove(this.arenaFloor);
            this.arenaFloor.geometry.dispose();
            this.arenaFloor.material.dispose();
            this.arenaFloor = null;
        }

        // Re-enable player controls (unrestricted)
        setTimeout(() => {
            // Clear any buffered input before re-enabling controls
            this.voxelWorld.keys = {};

            this.voxelWorld.movementEnabled = true;
            this.voxelWorld.inBattleArena = false; // Remove movement restriction

            // Re-engage pointer lock
            if (this.voxelWorld.renderer && this.voxelWorld.renderer.domElement) {
                this.voxelWorld.renderer.domElement.requestPointerLock();
            }
        }, 500);

        // Update companion portrait HP
        if (this.voxelWorld.companionPortrait && this.companionSprite) {
            this.voxelWorld.companionPortrait.updateHP(this.companionSprite.currentHP);
        }

        // Clear pattern
        this.currentPattern = null;

        console.log('⚔️ Arena cleaned up');
    }

    /**
     * Check if player is targeting companion sprite (for item usage)
     * @returns {boolean} - True if reticle is on companion
     */
    isTargetingCompanion() {
        if (!this.isActive || !this.companionSprite || !this.voxelWorld.camera) {
            return false;
        }

        // Raycast from center of screen toward companion
        this.targetingRaycaster.setFromCamera(new THREE.Vector2(0, 0), this.voxelWorld.camera);

        // Check if ray intersects companion sprite
        const intersects = this.targetingRaycaster.intersectObject(this.companionSprite.sprite);

        return intersects.length > 0;
    }

    /**
     * Use an item on the companion (called from VoxelWorld inventory system)
     * @param {string} itemType - Type of item being used (e.g., 'potion', 'buff')
     * @param {number} amount - Effect amount (HP restore, stat boost, etc.)
     */
    useItemOnCompanion(itemType, amount) {
        if (!this.isActive || !this.companionSprite) {
            console.log('❌ Cannot use items - not in battle!');
            return false;
        }

        if (!this.isTargetingCompanion()) {
            console.log('❌ Not targeting companion! Aim at your companion sprite.');
            return false;
        }

        // Handle different item types
        switch (itemType) {
            case 'potion':
            case 'health':
                // Restore HP
                const newHP = Math.min(this.companionSprite.maxHP, this.companionSprite.currentHP + amount);
                this.companionSprite.updateHP(newHP);
                console.log(`💊 ${this.companionSprite.name} restored ${amount} HP! (${newHP}/${this.companionSprite.maxHP})`);

                // Visual feedback (green flash)
                const originalColor = this.companionSprite.sprite.material.color.getHex();
                this.companionSprite.sprite.material.color.setHex(0x00FF00);
                setTimeout(() => {
                    this.companionSprite.sprite.material.color.setHex(originalColor);
                }, 300);

                return true;

            case 'buff':
                // TODO: Implement stat buffs (attack/defense boost)
                console.log(`✨ Buff applied to ${this.companionSprite.name}!`);
                return true;

            default:
                console.log(`❌ Unknown item type: ${itemType}`);
                return false;
        }
    }

    /**
     * Promise-based delay helper
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
