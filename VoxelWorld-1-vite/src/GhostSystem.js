/**
 * GhostSystem.js
 *
 * Manages ghost entities - floating billboard sprites that spawn in ruins and forests at night.
 * Features basic AI for following players, atmospheric floating animations, and spawn management.
 */

import * as THREE from 'three';

export class GhostSystem {
    constructor(scene, enhancedGraphics) {
        this.scene = scene;
        this.enhancedGraphics = enhancedGraphics;

        // Ghost registry - Map<ghostId, ghostData>
        this.ghosts = new Map();
        this.nextGhostId = 0;

        // Animation timing
        this.time = 0;

        // Ghost config
        this.config = {
            // Visual
            spriteSize: 1.2,           // Size of ghost sprite
            opacity: 0.7,              // Transparency

            // Animation
            floatSpeed: 1.5,           // Speed of up/down floating
            floatAmount: 0.3,          // How far up/down they bob
            rotateSpeed: 0.5,          // Rotation speed

            // AI behavior
            followRange: 20,           // Distance at which ghost starts following
            followSpeed: 0.02,         // How fast ghost moves toward player
            maxFollowSpeed: 0.05,      // Maximum follow speed
            idleWanderSpeed: 0.01,     // Slow wandering when not following
            personalSpace: 3,          // Minimum distance from player
            pumpkinRange: 15,          // Distance at which ghost detects pumpkins
            pumpkinSpeed: 0.08,        // Speed when moving to pumpkin (faster than player follow)
            pumpkinLingererTime: 2,     // Seconds to stay at pumpkin before returning to player

            // Spawn
            ruinSpawnChance: 0.8,      // 80% chance per ruin
            forestNightSpawnChance: 0.05, // 5% cumulative per chunk at night
            spawnHeight: 2,            // Height above spawn point
        };

        console.log('👻 GhostSystem initialized');
    }

    /**
     * Reload all ghost textures (called when enhanced graphics assets finish loading)
     */
    reloadGhostTextures() {
        const entityData = this.enhancedGraphics.getEnhancedEntityImage('ghost');

        if (!entityData || !entityData.path) {
            console.log('👻 No enhanced ghost texture available for reload');
            return;
        }

        let reloadCount = 0;
        this.ghosts.forEach((ghost) => {
            // Check if this ghost is using emoji fallback (CanvasTexture)
            const currentTexture = ghost.sprite.material.map;
            if (currentTexture instanceof THREE.CanvasTexture) {
                // Load new PNG texture
                const newTexture = new THREE.TextureLoader().load(entityData.path);
                newTexture.magFilter = THREE.LinearFilter;
                newTexture.minFilter = THREE.LinearFilter;

                // Replace texture
                const oldTexture = ghost.sprite.material.map;
                ghost.sprite.material.map = newTexture;
                ghost.sprite.material.needsUpdate = true;

                // Dispose old canvas texture
                oldTexture.dispose();

                reloadCount++;
            }
        });

        if (reloadCount > 0) {
            console.log(`👻 Reloaded ${reloadCount} ghost textures with enhanced graphics`);
        }
    }

    /**
     * Create a ghost billboard sprite
     * @param {number} x - World X position
     * @param {number} y - World Y position
     * @param {number} z - World Z position
     * @param {string} spawnType - 'ruin' or 'forest'
     * @returns {string} Ghost ID
     */
    spawnGhost(x, y, z, spawnType = 'ruin') {
        let texture;

        // Try to load enhanced graphics first
        const entityData = this.enhancedGraphics.getEnhancedEntityImage('ghost');

        if (entityData && entityData.path) {
            // Use PNG texture
            texture = new THREE.TextureLoader().load(entityData.path);
            texture.magFilter = THREE.LinearFilter;
            texture.minFilter = THREE.LinearFilter;
            console.log(`👻 Using enhanced ghost texture: ${entityData.path}`);
        } else {
            // Fall back to emoji on canvas
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');

            // Draw emoji ghost
            ctx.font = '100px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('👻', 64, 64);

            texture = new THREE.CanvasTexture(canvas);
            texture.magFilter = THREE.LinearFilter;
            texture.minFilter = THREE.LinearFilter;
            console.log('👻 Using emoji fallback for ghost');
        }

        // Create sprite material with transparency
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: this.config.opacity,
            depthWrite: false, // Prevents z-fighting
        });

        // Create sprite
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(this.config.spriteSize, this.config.spriteSize, 1);
        sprite.position.set(x, y + this.config.spawnHeight, z);

        // Add to scene
        this.scene.add(sprite);

        // Create ghost data
        const ghostId = `ghost_${this.nextGhostId++}`;
        const ghostData = {
            id: ghostId,
            sprite: sprite,
            spawnType: spawnType,
            spawnPosition: { x, y, z },
            baseY: y + this.config.spawnHeight, // For floating animation
            floatOffset: Math.random() * Math.PI * 2, // Random phase for varied animation
            wanderAngle: Math.random() * Math.PI * 2, // Random wander direction
            wanderChangeTime: 0,
            isFollowing: false,
            targetPumpkin: null, // Current pumpkin being targeted
            pumpkinLingerTime: 0, // Time spent at pumpkin
        };

        this.ghosts.set(ghostId, ghostData);

        console.log(`👻 Ghost spawned at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}) - ${spawnType} - ID: ${ghostId}`);

        // Tutorial hook - first ghost spawn (only if tutorialSystem is initialized)
        if (this.voxelWorld && this.voxelWorld.tutorialSystem) {
            this.voxelWorld.tutorialSystem.onGhostSpawn();
        }

        return ghostId;
    }

    /**
     * Remove a ghost from the system
     * @param {string} ghostId - ID of ghost to remove
     */
    removeGhost(ghostId) {
        const ghost = this.ghosts.get(ghostId);
        if (ghost) {
            this.scene.remove(ghost.sprite);
            ghost.sprite.material.dispose();
            ghost.sprite.material.map.dispose();
            this.ghosts.delete(ghostId);
            console.log(`👻 Ghost removed: ${ghostId}`);
        }
    }

    /**
     * Update all ghosts - handle animation and AI
     * @param {number} deltaTime - Time since last frame (seconds)
     * @param {object} playerPosition - {x, y, z} player position
     * @param {Array<{x, y, z}>} pumpkinPositions - Array of pumpkin block positions
     */
    update(deltaTime, playerPosition, pumpkinPositions = []) {
        this.time += deltaTime;

        this.ghosts.forEach((ghost) => {
            // 1. FLOATING ANIMATION - Sine wave bobbing
            const floatPhase = this.time * this.config.floatSpeed + ghost.floatOffset;
            const floatY = Math.sin(floatPhase) * this.config.floatAmount;

            // 2. PUMPKIN DETECTION - Ghosts love pumpkins! 🎃👻
            let nearestPumpkin = null;
            let nearestPumpkinDist = Infinity;

            for (const pumpkin of pumpkinPositions) {
                const pdx = pumpkin.x - ghost.sprite.position.x;
                const pdz = pumpkin.z - ghost.sprite.position.z;
                const pumpkinDist = Math.sqrt(pdx * pdx + pdz * pdz);

                if (pumpkinDist < this.config.pumpkinRange && pumpkinDist < nearestPumpkinDist) {
                    nearestPumpkin = pumpkin;
                    nearestPumpkinDist = pumpkinDist;
                }
            }

            // 3. AI BEHAVIOR - Priority: Pumpkin > Player > Wander
            const dx = playerPosition.x - ghost.sprite.position.x;
            const dz = playerPosition.z - ghost.sprite.position.z;
            const distanceToPlayer = Math.sqrt(dx * dx + dz * dz);

            // PUMPKIN MODE - Go to pumpkin and linger
            if (nearestPumpkin) {
                const pdx = nearestPumpkin.x - ghost.sprite.position.x;
                const pdz = nearestPumpkin.z - ghost.sprite.position.z;
                const pumpkinDist = Math.sqrt(pdx * pdx + pdz * pdz);

                if (pumpkinDist > 0.5) {
                    // Move toward pumpkin
                    const dirX = pdx / pumpkinDist;
                    const dirZ = pdz / pumpkinDist;

                    ghost.sprite.position.x += dirX * this.config.pumpkinSpeed;
                    ghost.sprite.position.z += dirZ * this.config.pumpkinSpeed;

                    ghost.targetPumpkin = nearestPumpkin;
                    ghost.pumpkinLingerTime = 0; // Reset linger time
                } else {
                    // At pumpkin - linger for a bit
                    ghost.pumpkinLingerTime += deltaTime;

                    if (ghost.pumpkinLingerTime >= this.config.pumpkinLingererTime) {
                        // Done lingering, reset and return to player
                        ghost.targetPumpkin = null;
                        ghost.pumpkinLingerTime = 0;
                    }
                }
            } else if (distanceToPlayer < this.config.followRange && distanceToPlayer > this.config.personalSpace) {
                // FOLLOW MODE - Move toward player
                ghost.isFollowing = true;

                // Normalize direction
                const dirX = dx / distanceToPlayer;
                const dirZ = dz / distanceToPlayer;

                // Calculate speed based on distance (closer = slower)
                const speedFactor = Math.min(distanceToPlayer / this.config.followRange, 1);
                const followSpeed = this.config.followSpeed + (this.config.maxFollowSpeed - this.config.followSpeed) * speedFactor;

                // Move toward player
                ghost.sprite.position.x += dirX * followSpeed;
                ghost.sprite.position.z += dirZ * followSpeed;

            } else if (distanceToPlayer <= this.config.personalSpace) {
                // TOO CLOSE - Back away slowly
                ghost.isFollowing = false;

                const awayDirX = dx / distanceToPlayer;
                const awayDirZ = dz / distanceToPlayer;

                ghost.sprite.position.x -= awayDirX * this.config.idleWanderSpeed * 0.5;
                ghost.sprite.position.z -= awayDirZ * this.config.idleWanderSpeed * 0.5;

            } else {
                // IDLE MODE - Slow wandering around spawn point
                ghost.isFollowing = false;

                // Change wander direction every 3-5 seconds
                ghost.wanderChangeTime += deltaTime;
                if (ghost.wanderChangeTime > 3 + Math.random() * 2) {
                    ghost.wanderAngle = Math.random() * Math.PI * 2;
                    ghost.wanderChangeTime = 0;
                }

                // Wander in current direction
                ghost.sprite.position.x += Math.cos(ghost.wanderAngle) * this.config.idleWanderSpeed;
                ghost.sprite.position.z += Math.sin(ghost.wanderAngle) * this.config.idleWanderSpeed;

                // Stay near spawn point (leash)
                const spawnDx = ghost.sprite.position.x - ghost.spawnPosition.x;
                const spawnDz = ghost.sprite.position.z - ghost.spawnPosition.z;
                const spawnDist = Math.sqrt(spawnDx * spawnDx + spawnDz * spawnDz);

                if (spawnDist > 10) {
                    // Pull back toward spawn
                    ghost.sprite.position.x -= (spawnDx / spawnDist) * this.config.idleWanderSpeed * 2;
                    ghost.sprite.position.z -= (spawnDz / spawnDist) * this.config.idleWanderSpeed * 2;
                }
            }

            // 3. APPLY FLOATING Y POSITION
            ghost.sprite.position.y = ghost.baseY + floatY;
        });
    }

    /**
     * Attempt to spawn a ghost at a ruin location
     * @param {number} x - Ruin X position
     * @param {number} y - Ruin Y position
     * @param {number} z - Ruin Z position
     * @returns {string|null} Ghost ID if spawned, null otherwise
     */
    trySpawnAtRuin(x, y, z) {
        if (Math.random() < this.config.ruinSpawnChance) {
            return this.spawnGhost(x, y, z, 'ruin');
        }
        return null;
    }

    /**
     * Attempt to spawn a ghost in forest at night (cumulative chance)
     * @param {number} x - Forest X position
     * @param {number} y - Forest Y position
     * @param {number} z - Forest Z position
     * @param {number} gameTime - Current game time (0-24)
     * @returns {string|null} Ghost ID if spawned, null otherwise
     */
    trySpawnInForest(x, y, z, gameTime) {
        // Only spawn at night (19:00 - 6:00)
        const isNight = gameTime >= 19 || gameTime < 6;

        if (isNight && Math.random() < this.config.forestNightSpawnChance) {
            return this.spawnGhost(x, y, z, 'forest');
        }
        return null;
    }

    /**
     * Remove all ghosts (cleanup)
     */
    removeAllGhosts() {
        const ghostIds = Array.from(this.ghosts.keys());
        ghostIds.forEach(id => this.removeGhost(id));
        console.log('👻 All ghosts removed');
    }

    /**
     * Get ghost count
     * @returns {number} Number of active ghosts
     */
    getGhostCount() {
        return this.ghosts.size;
    }

    /**
     * Get all ghost positions (for debugging/minimap)
     * @returns {Array<{x, y, z, type}>}
     */
    getGhostPositions() {
        const positions = [];
        this.ghosts.forEach((ghost) => {
            positions.push({
                x: ghost.sprite.position.x,
                y: ghost.sprite.position.y,
                z: ghost.sprite.position.z,
                type: ghost.spawnType,
                id: ghost.id
            });
        });
        return positions;
    }
}
