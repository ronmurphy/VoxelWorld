/**
 * 🌊 Physics.js - Player Physics and Movement System
 *
 * Handles:
 * - Gravity and jumping
 * - Water physics and swimming
 * - Collision detection
 * - Ground/water state tracking
 */

import * as THREE from 'three';

export class PhysicsEngine {
    constructor(voxelWorld) {
        this.world = voxelWorld;

        // Player hitbox dimensions
        this.PLAYER_WIDTH = 0.6;
        this.PLAYER_HEIGHT = 1.8;
        this.PLAYER_DEPTH = 0.6;

        // Physics constants
        this.GRAVITY = 20.0;
        this.JUMP_SPEED = 9.0;
        this.SWIM_SPEED = 6.0;        // Upward swimming speed
        this.SWIM_DRAG = 0.92;        // Water resistance (slows movement)
        this.WATER_BUOYANCY = 8.0;    // Upward force when in water
        this.CLIMB_SPEED = 5.0;       // Climbing speed (up/down)
        this.CLIMB_DRAG = 0.85;       // Ladder grip (slows falling)

        // Player state
        this.isInWater = false;
        this.isUnderwater = false;
        this.waterDepth = 0;
        this.isOnLadder = false;
    }

    /**
     * 🌊 Check if player is in water and how deep
     */
    checkWaterState(playerPos) {
        const playerFeetY = Math.floor(playerPos.y - this.PLAYER_HEIGHT / 2);
        const playerHeadY = Math.floor(playerPos.y + this.PLAYER_HEIGHT / 2);
        const playerX = Math.floor(playerPos.x);
        const playerZ = Math.floor(playerPos.z);

        // Check blocks around player vertically
        let waterBlocksFound = 0;
        let lowestWaterY = Infinity;
        let highestWaterY = -Infinity;

        for (let y = playerFeetY; y <= playerHeadY + 1; y++) {
            const block = this.world.getBlockAtPosition(playerX, y, playerZ);
            if (block && block.type === 'water') {
                waterBlocksFound++;
                lowestWaterY = Math.min(lowestWaterY, y);
                highestWaterY = Math.max(highestWaterY, y);
            }
        }

        this.isInWater = waterBlocksFound > 0;
        this.isUnderwater = waterBlocksFound >= 2; // Head is submerged
        this.waterDepth = this.isInWater ? (highestWaterY - playerFeetY) : 0;

        return {
            inWater: this.isInWater,
            underwater: this.isUnderwater,
            depth: this.waterDepth,
            waterSurfaceY: this.isInWater ? highestWaterY : null
        };
    }

    /**
     * 🪜 Check if player is touching a ladder
     */
    checkLadderState(playerPos) {
        const playerX = Math.floor(playerPos.x);
        const playerY = Math.floor(playerPos.y);
        const playerZ = Math.floor(playerPos.z);

        // Check block at player center and feet
        const centerBlock = this.world.getBlockAtPosition(playerX, playerY, playerZ);
        const feetBlock = this.world.getBlockAtPosition(playerX, Math.floor(playerPos.y - this.PLAYER_HEIGHT / 2), playerZ);

        // Player is on ladder if either center or feet are touching a ladder block
        this.isOnLadder = (centerBlock && centerBlock.id && centerBlock.id.includes('ladder')) ||
                          (feetBlock && feetBlock.id && feetBlock.id.includes('ladder'));

        return {
            onLadder: this.isOnLadder
        };
    }

    /**
     * 🏊 Apply swimming physics
     */
    applySwimmingPhysics(player, keys, deltaTime) {
        if (!this.isInWater) return false;

        // 🌊 Swimming mode activated!
        // Apply reduced gravity in water (sink slower than in air)
        if (!player.velocity) player.velocity = 0;

        // Reduced gravity in water (sink at 30% of normal gravity speed)
        const WATER_GRAVITY = this.GRAVITY * 0.3;
        player.velocity -= WATER_GRAVITY * deltaTime;

        // Apply water drag to slow down sinking
        player.velocity *= this.SWIM_DRAG;

        // Spacebar to swim up (actively fight against sinking)
        if (keys[" "]) {
            player.velocity = this.SWIM_SPEED;
        }

        // WASD for directional swimming (handled by normal movement, just slower)
        // Movement speed is reduced automatically by water drag

        return true; // Swimming active
    }

    /**
     * 🪜 Apply ladder climbing physics
     */
    applyClimbingPhysics(player, keys, deltaTime) {
        if (!this.isOnLadder) return false;

        // 🪜 Climbing mode activated!
        if (!player.velocity) player.velocity = 0;

        // Apply ladder grip - slow falling drastically
        player.velocity *= this.CLIMB_DRAG;

        // Spacebar to climb up
        if (keys[" "]) {
            player.velocity = this.CLIMB_SPEED;
        }

        // S key to climb down (controlled descent)
        if (keys["s"] || keys["S"]) {
            player.velocity = -this.CLIMB_SPEED * 0.6; // Slower descent
        }

        // If no input, stick to ladder (zero velocity)
        if (!keys[" "] && !keys["s"] && !keys["S"]) {
            player.velocity *= 0.5; // Rapidly slow to stop
        }

        return true; // Climbing active
    }

    /**
     * 🪂 Apply normal gravity and jumping
     */
    applyGravityPhysics(player, keys, deltaTime) {
        if (this.isInWater) return false; // Use swimming physics instead

        // Normal gravity
        if (!player.velocity) player.velocity = 0;
        player.velocity -= this.GRAVITY * deltaTime;

        // Jump (only when on ground)
        if (keys[" "] && this.world.isOnGround) {
            player.velocity = this.JUMP_SPEED;
        }

        return true; // Gravity active
    }

    /**
     * 🎯 Create player hitbox at given position
     */
    createPlayerHitbox(x, y, z) {
        const halfWidth = this.PLAYER_WIDTH / 2;
        const halfHeight = this.PLAYER_HEIGHT / 2;
        const halfDepth = this.PLAYER_DEPTH / 2;

        return {
            minX: x - halfWidth,
            maxX: x + halfWidth,
            minY: y - halfHeight,
            maxY: y + halfHeight,
            minZ: z - halfDepth,
            maxZ: z + halfDepth
        };
    }

    /**
     * 🧱 Create block hitbox at given block coordinates
     */
    createBlockHitbox(blockX, blockY, blockZ) {
        return {
            minX: blockX,
            maxX: blockX + 1,
            minY: blockY,
            maxY: blockY + 1,
            minZ: blockZ,
            maxZ: blockZ + 1
        };
    }

    /**
     * 🔲 AABB collision detection between two hitboxes
     */
    hitboxesCollide(hitbox1, hitbox2) {
        return (
            hitbox1.minX <= hitbox2.maxX && hitbox1.maxX >= hitbox2.minX &&
            hitbox1.minY <= hitbox2.maxY && hitbox1.maxY >= hitbox2.minY &&
            hitbox1.minZ <= hitbox2.maxZ && hitbox1.maxZ >= hitbox2.minZ
        );
    }

    /**
     * 🔍 Check if player hitbox collides with solid blocks
     * (Water blocks are NOT solid for collision)
     */
    checkHitboxCollision(playerHitbox) {
        const minBlockX = Math.floor(playerHitbox.minX);
        const maxBlockX = Math.floor(playerHitbox.maxX);
        const minBlockY = Math.floor(playerHitbox.minY);
        const maxBlockY = Math.floor(playerHitbox.maxY);
        const minBlockZ = Math.floor(playerHitbox.minZ);
        const maxBlockZ = Math.floor(playerHitbox.maxZ);

        // Check all blocks in the range
        for (let x = minBlockX; x <= maxBlockX; x++) {
            for (let y = minBlockY; y <= maxBlockY; y++) {
                for (let z = minBlockZ; z <= maxBlockZ; z++) {
                    const block = this.world.getBlockAtPosition(x, y, z);

                    // 🌊 KEY CHANGE: Ignore water blocks for collision
                    if (block && block.type !== 'water') {
                        const blockHitbox = this.createBlockHitbox(x, y, z);
                        if (this.hitboxesCollide(playerHitbox, blockHitbox)) {
                            return { collision: true, blockX: x, blockY: y, blockZ: z };
                        }
                    }
                }
            }
        }

        return { collision: false };
    }

    /**
     * 🚶 Update vertical physics (gravity, jumping, swimming, climbing)
     */
    updateVerticalPhysics(player, keys, deltaTime) {
        const currentPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z);

        // Check ladder state first (highest priority)
        const ladderState = this.checkLadderState(currentPos);

        // 🌊 Check water state
        const waterState = this.checkWaterState(currentPos);

        // Apply appropriate physics (priority: ladder > water > gravity)
        if (ladderState.onLadder) {
            this.applyClimbingPhysics(player, keys, deltaTime);
        } else if (waterState.inWater) {
            this.applySwimmingPhysics(player, keys, deltaTime);
        } else {
            this.applyGravityPhysics(player, keys, deltaTime);
        }

        // Calculate new Y position
        const newY = player.position.y + (player.velocity * deltaTime);

        if (player.velocity <= 0) {
            // Falling or sinking - check for ground collision using full hitbox
            const testHitbox = this.createPlayerHitbox(currentPos.x, newY, currentPos.z);
            const collision = this.checkHitboxCollision(testHitbox);

            if (collision.collision) {
                // Found collision - place player on top of the colliding block
                const groundLevel = collision.blockY + 1;
                player.position.y = groundLevel + this.PLAYER_HEIGHT / 2;
                player.velocity = 0;
                this.world.isOnGround = true;
            } else {
                // No collision - continue falling/sinking
                player.position.y = newY;
                this.world.isOnGround = false;
            }
        } else {
            // Jumping/swimming/climbing upward - check for ceiling collision using full hitbox
            const testHitbox = this.createPlayerHitbox(currentPos.x, newY, currentPos.z);
            const collision = this.checkHitboxCollision(testHitbox);

            if (collision.collision) {
                // Hit ceiling - stop upward movement
                player.velocity = 0;
            } else {
                // No ceiling collision - continue jumping/swimming/climbing
                player.position.y = newY;
                this.world.isOnGround = false;
            }
        }

        return { ...waterState, ...ladderState };
    }

    /**
     * 🚶 Update horizontal movement with collision detection
     */
    updateHorizontalMovement(player, moveX, moveZ, deltaTime) {
        const currentPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z);

        // 🌊 Check water state for this movement frame
        const waterState = this.checkWaterState(currentPos);
        const speedMultiplier = waterState.inWater ? 0.5 : 1.0; // Slower movement in water

        // Move distance already includes deltaTime from VoxelWorld calculation
        const newX = player.position.x + moveX * speedMultiplier;
        const newZ = player.position.z + moveZ * speedMultiplier;

        // Create player hitbox excluding bottom to avoid ground collision
        const createHorizontalHitbox = (x, z) => {
            return {
                minX: x - this.PLAYER_WIDTH / 2,
                maxX: x + this.PLAYER_WIDTH / 2,
                minY: currentPos.y - this.PLAYER_HEIGHT / 2 + 0.1,
                maxY: currentPos.y + this.PLAYER_HEIGHT / 2,
                minZ: z - this.PLAYER_DEPTH / 2,
                maxZ: z + this.PLAYER_DEPTH / 2
            };
        };

        // Test full movement first
        const newHitbox = createHorizontalHitbox(newX, newZ);
        const fullCollision = this.checkHitboxCollision(newHitbox);

        if (!fullCollision.collision) {
            // No collision - move freely
            player.position.x = newX;
            player.position.z = newZ;
        } else {
            // Collision detected - try sliding along walls
            // Test X movement only
            const xOnlyHitbox = createHorizontalHitbox(newX, currentPos.z);
            const xCollision = this.checkHitboxCollision(xOnlyHitbox);

            if (!xCollision.collision) {
                player.position.x = newX;
            }

            // Test Z movement only
            const zOnlyHitbox = createHorizontalHitbox(currentPos.x, newZ);
            const zCollision = this.checkHitboxCollision(zOnlyHitbox);

            if (!zCollision.collision) {
                player.position.z = newZ;
            }
        }
    }
}
