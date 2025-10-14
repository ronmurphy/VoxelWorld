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
import { PlayerHP } from './PlayerHP.js';

export class BattleArena {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;
        this.scene = voxelWorld.scene;

        // Battle state
        this.isActive = false;
        this.companionSprite = null;
        this.enemySprite = null;

        // Arena settings (configurable per battle)
        this.arenaCenter = new THREE.Vector3();
        this.arenaSize = 10; // Outer arena boundary (gold walls) - player movement limit
        this.defaultArenaSize = 10; // Base size for normal battles
        this.dangerZoneSize = 7; // Inner danger zone (red walls) - entering = risk damage from enemies
        this.defaultDangerZoneSize = 7; // Default danger zone (visual warning only)
        this.battleRadius = 3.5; // Inner circle where combatants orbit (independent of arena size)
        this.defaultBattleRadius = 3.5; // Default battle radius (keeps sprites away from camera)
        this.arenaWalls = []; // Outer boundary walls (gold) - hard limit
        this.dangerZoneWalls = []; // Inner danger zone walls (red) - visual warning, player can enter at risk
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

        // 👻 Arena transparency (blocks in arena become see-through during battle)
        this.transparentBlocks = []; // Store original materials/opacity

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

        // 🎯 Configure arena sizes and battle radius based on enemy data
        // arenaSize: Outer player boundary (default 10x10, gold walls) - HARD LIMIT
        // dangerZoneSize: Inner danger zone (default 7x7, red walls) - VISUAL WARNING, player can enter at risk
        // battleRadius: Where sprites orbit (default 3.5)
        this.arenaSize = enemyData.arenaSize || this.defaultArenaSize;
        this.dangerZoneSize = enemyData.dangerZoneSize || this.defaultDangerZoneSize;
        this.battleRadius = enemyData.battleRadius || this.defaultBattleRadius;

        console.log(`⚔️ Arena configured: ${this.arenaSize}x${this.arenaSize} boundary, ${this.dangerZoneSize}x${this.dangerZoneSize} danger zone, battle radius: ${this.battleRadius}`);

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

        // Position arena ahead of player at ground/foot level
        // Arena center is (arenaSize/2 + 2) blocks ahead so player starts at back edge with 2 block buffer
        const arenaDistance = (this.arenaSize / 2) + 2;
        this.arenaCenter.set(
            playerPos.x + (forwardX * arenaDistance),
            footY, // Ground level (player's feet)
            playerPos.z + (forwardZ * arenaDistance)
        );

        // Store player start position
        this.playerStartPos.copy(playerPos);

        // Calculate movement bounds: only restrict to outer arena (gold walls)
        // Player can move freely in entire arena, including danger zone (red walls = visual warning only)
        const halfArena = this.arenaSize / 2;
        this.movementBounds = {
            minX: this.arenaCenter.x - halfArena,
            maxX: this.arenaCenter.x + halfArena,
            minZ: this.arenaCenter.z - halfArena,
            maxZ: this.arenaCenter.z + halfArena
        };

        // Store danger zone bounds for future damage detection
        const halfDanger = this.dangerZoneSize / 2;
        this.dangerZoneBounds = {
            minX: this.arenaCenter.x - halfDanger,
            maxX: this.arenaCenter.x + halfDanger,
            minZ: this.arenaCenter.z - halfDanger,
            maxZ: this.arenaCenter.z + halfDanger
        };

        // Create arena walls (outer, gold) and danger zone walls (inner, red)
        this.createArenaWalls();
        this.createDangerZoneWalls();

        // 👻 Make arena blocks transparent for better visibility
        this.makeArenaBlocksTransparent();

        // Initialize player HP system (show hearts HUD)
        if (!this.voxelWorld.playerHP) {
            this.voxelWorld.playerHP = new PlayerHP(this.voxelWorld);
        }
        this.voxelWorld.playerHP.show();
        this.voxelWorld.playerHP.reset(); // Reset to 3 hearts at battle start

        // Enable player MOVEMENT but restrict to arena boundaries
        this.voxelWorld.movementEnabled = true;
        this.voxelWorld.inBattleArena = true; // Flag for movement restriction

        // Clear any built-up movement input
        this.voxelWorld.keys = {};

        // Store enemy data for loot (before sprite gets destroyed)
        this.enemyData = enemyData;
        this.companionData = companionData;

        // Select random battle animation pattern (uses battleRadius for inner circle)
        this.currentPattern = getRandomBattlePattern(this.arenaCenter, this.battleRadius);
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

        // Material with emissive glow (use MeshLambertMaterial for emissive support)
        const wallMaterial = new THREE.MeshLambertMaterial({
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

        // Create arena floor marker (invisible - just for reference/future use)
        const floorGeometry = new THREE.CircleGeometry(halfSize, 32);
        const floorMaterial = new THREE.MeshLambertMaterial({
            color: 0x444444,
            emissive: glowColor,
            emissiveIntensity: 0.1,
            transparent: true,
            opacity: 0.0, // Made invisible (was 0.3)
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

        console.log(`⚔️ Arena walls created (${this.arenaSize}x${this.arenaSize} boundary)`);
    }

    /**
     * Create danger zone walls (visual warning - player can enter at risk)
     */
    createDangerZoneWalls() {
        const wallHeight = 0.8; // Taller than outer walls for visibility
        const wallThickness = 0.15; // Slightly thicker
        const wallColor = 0xFF4444; // Red/danger color
        const glowColor = 0xFF0000; // Red glow

        // Material with bright emissive glow (highly visible warning)
        const wallMaterial = new THREE.MeshLambertMaterial({
            color: wallColor,
            emissive: glowColor,
            emissiveIntensity: 0.5, // Brighter glow than outer walls
            transparent: true,
            opacity: 0.7
        });

        const halfSize = this.dangerZoneSize / 2;

        // Create 4 wall segments (north, south, east, west)
        const walls = [
            // North wall
            { x: 0, z: halfSize, width: this.dangerZoneSize, depth: wallThickness },
            // South wall
            { x: 0, z: -halfSize, width: this.dangerZoneSize, depth: wallThickness },
            // East wall
            { x: halfSize, z: 0, width: wallThickness, depth: this.dangerZoneSize },
            // West wall
            { x: -halfSize, z: 0, width: wallThickness, depth: this.dangerZoneSize }
        ];

        walls.forEach(wallData => {
            const geometry = new THREE.BoxGeometry(wallData.width, wallHeight, wallData.depth);
            const wall = new THREE.Mesh(geometry, wallMaterial);

            wall.position.set(
                this.arenaCenter.x + wallData.x,
                this.arenaCenter.y + wallHeight / 2, // Just above ground
                this.arenaCenter.z + wallData.z
            );

            this.scene.add(wall);
            this.dangerZoneWalls.push(wall);
        });

        console.log(`⚔️ Danger zone walls created (${this.dangerZoneSize}x${this.dangerZoneSize} - visual warning, enter at risk!)`);
    }

    /**
     * Calculate position on circle based on angle (legacy - now uses patterns)
     */
    getCirclePosition(angle) {
        return {
            x: this.arenaCenter.x + Math.cos(angle) * this.battleRadius,
            y: this.arenaCenter.y + 2.5, // Lifted 2.5 blocks above ground (prevents terrain clipping)
            z: this.arenaCenter.z + Math.sin(angle) * this.battleRadius
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

        // Check player collision with enemy in danger zone
        if (this.voxelWorld.playerHP && this.enemySprite) {
            this.voxelWorld.playerHP.checkDangerZoneCollision(this.dangerZoneBounds, this.enemySprite);
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

        // Lunge forward (but not too close to camera)
        const attackerPos = attacker.sprite.position;
        const defenderPos = defender.sprite.position;
        const direction = new THREE.Vector3()
            .subVectors(defenderPos, attackerPos)
            .normalize();

        // Calculate lunge position
        const lungeDistance = 0.5;
        const lungePos = attackerPos.clone().add(direction.multiplyScalar(lungeDistance));

        // Prevent sprites from getting too close to camera (min 1.5 blocks)
        const cameraPos = this.voxelWorld.camera.position;
        const distanceToCamera = lungePos.distanceTo(cameraPos);
        if (distanceToCamera < 1.5) {
            // Push sprite away from camera slightly
            const awayFromCamera = new THREE.Vector3()
                .subVectors(lungePos, cameraPos)
                .normalize()
                .multiplyScalar(1.5 - distanceToCamera);
            lungePos.add(awayFromCamera);
        }

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
     * Show defeat dialogue (companion loses)
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
     * Show player defeat dialogue (player HP reaches 0)
     */
    async showPlayerDefeatDialogue() {
        const playerData = JSON.parse(localStorage.getItem('NebulaWorld_playerData') || '{}');
        const companionId = playerData.activeCompanion || playerData.starterMonster || 'rat';
        const companionData = await ChatOverlay.loadCompanionData(companionId);
        const companionName = companionData ? companionData.name : companionId;

        // 🔥 Context-aware dialogue based on campfire respawn
        const hasCampfire = !!this.voxelWorld.respawnCampfire;
        const followUpText = hasCampfire
            ? `Good thing we set up that campfire! Let's head back there and rest.`
            : `We need to get you back to spawn. Please be more careful next time!`;

        const chat = new ChatOverlay();
        chat.showMessage({
            character: companionId,
            name: companionName,
            text: `No! You're hurt! Hold on, I'll get you to safety!`
        }, async () => {
            // Wait a moment
            await this.delay(500);

            // Show context-aware follow-up message
            const chat2 = new ChatOverlay();
            chat2.showMessage({
                character: companionId,
                name: companionName,
                text: followUpText
            }, () => {
                // Respawn player at campfire or spawn with 1 heart
                this.respawnPlayer();
            });
        });
    }

    /**
     * Respawn player at spawn point with 1 heart and heal companion
     */
    respawnPlayer() {
        console.log('🏥 Respawning player...');

        // End battle
        this.isActive = false;

        // Immediately clear movement restrictions before cleanup
        this.voxelWorld.movementEnabled = true;
        this.voxelWorld.inBattleArena = false;
        this.voxelWorld.keys = {}; // Clear any stuck keys

        // Clean up arena (will hide hearts temporarily)
        this.cleanup();

        // 🔥 Check for campfire respawn point first, fallback to world spawn
        let spawnPos;
        if (this.voxelWorld.respawnCampfire) {
            const campfire = this.voxelWorld.respawnCampfire;
            spawnPos = {
                x: campfire.x + 2, // Offset 2 blocks to avoid campfire
                y: campfire.y + 1, // Spawn 1 block above ground
                z: campfire.z + 2  // Offset 2 blocks
            };
            console.log(`🔥 Respawning at campfire (${campfire.x}, ${campfire.y}, ${campfire.z})`);
        } else {
            spawnPos = this.voxelWorld.spawnPosition;
            console.log(`🏔️ No campfire found, respawning at world spawn (${spawnPos.x}, ${spawnPos.y}, ${spawnPos.z})`);
        }

        // Teleport player
        this.voxelWorld.player.position.x = spawnPos.x;
        this.voxelWorld.player.position.y = spawnPos.y;
        this.voxelWorld.player.position.z = spawnPos.z;

        // Reset player to 1 heart and show hearts (damaged state)
        if (this.voxelWorld.playerHP) {
            this.voxelWorld.playerHP.setHP(1);
            this.voxelWorld.playerHP.show(); // Show hearts since player is damaged
        }

        // Note: Companion sprite was already destroyed in cleanup()
        // Update companion portrait to full HP for next battle
        if (this.voxelWorld.companionPortrait) {
            // Get companion max HP from stored data
            const maxHP = this.companionData?.hp || 15;
            this.voxelWorld.companionPortrait.updateHP(maxHP);
        }

        // Reset battle system
        if (this.voxelWorld.battleSystem) {
            this.voxelWorld.battleSystem.inBattle = false;
            console.log('✅ Battle flag reset - ready for new battle');
        }

        console.log('🏥 Player respawned with 1 heart - movement enabled');
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

        // Destroy arena walls (outer)
        this.arenaWalls.forEach(wall => {
            this.scene.remove(wall);
            wall.geometry.dispose();
            wall.material.dispose();
        });
        this.arenaWalls = [];

        // Destroy danger zone walls (inner)
        this.dangerZoneWalls.forEach(wall => {
            this.scene.remove(wall);
            wall.geometry.dispose();
            wall.material.dispose();
        });
        this.dangerZoneWalls = [];

        // Destroy arena floor
        if (this.arenaFloor) {
            this.scene.remove(this.arenaFloor);
            this.arenaFloor.geometry.dispose();
            this.arenaFloor.material.dispose();
            this.arenaFloor = null;
        }

        // 👻 Restore arena blocks to normal opacity
        this.restoreArenaBlocksOpacity();

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

        // Keep player HP hearts visible at all times (don't hide them)
        // Player can always see their health status
        // (Hearts are shown from game start now)

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

    /**
     * 👻 Make all blocks in arena transparent for better combat visibility
     */
    makeArenaBlocksTransparent() {
        console.log('👻 Making arena blocks transparent...');
        
        const halfArena = this.arenaSize / 2;
        const minX = Math.floor(this.arenaCenter.x - halfArena);
        const maxX = Math.ceil(this.arenaCenter.x + halfArena);
        const minZ = Math.floor(this.arenaCenter.z - halfArena);
        const maxZ = Math.ceil(this.arenaCenter.z + halfArena);
        const minY = Math.floor(this.arenaCenter.y - 2);
        const maxY = Math.ceil(this.arenaCenter.y + 10); // Check up to 10 blocks high

        let count = 0;

        // Scan arena volume for blocks
        for (let x = minX; x <= maxX; x++) {
            for (let z = minZ; z <= maxZ; z++) {
                for (let y = minY; y <= maxY; y++) {
                    const key = `${x},${y},${z}`;
                    const block = this.voxelWorld.world[key];
                    
                    if (block && block.mesh && block.mesh.material) {
                        const material = block.mesh.material;
                        
                        // Store original opacity and transparency state
                        this.transparentBlocks.push({
                            mesh: block.mesh,
                            originalOpacity: material.opacity !== undefined ? material.opacity : 1.0,
                            originalTransparent: material.transparent || false
                        });
                        
                        // Make transparent
                        material.transparent = true;
                        material.opacity = 0.15; // Very see-through
                        material.needsUpdate = true;
                        
                        count++;
                    }
                }
            }
        }

        console.log(`👻 Made ${count} blocks transparent in arena`);
    }

    /**
     * 👻 Restore all arena blocks to original opacity after battle
     */
    restoreArenaBlocksOpacity() {
        console.log('👻 Restoring arena blocks to normal...');
        
        for (const blockData of this.transparentBlocks) {
            if (blockData.mesh && blockData.mesh.material) {
                const material = blockData.mesh.material;
                material.transparent = blockData.originalTransparent;
                material.opacity = blockData.originalOpacity;
                material.needsUpdate = true;
            }
        }

        console.log(`👻 Restored ${this.transparentBlocks.length} blocks to normal opacity`);
        this.transparentBlocks = []; // Clear array
    }
}
