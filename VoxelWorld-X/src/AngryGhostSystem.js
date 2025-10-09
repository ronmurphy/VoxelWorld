/**
 * AngryGhostSystem.js
 *
 * Manages hostile angry ghost entities that spawn at ruins and trigger battles
 * These are distinct from the friendly ghosts in GhostSystem.js
 */

import * as THREE from 'three';

export class AngryGhostSystem {
    constructor(scene, enhancedGraphics, battleSystem) {
        this.scene = scene;
        this.enhancedGraphics = enhancedGraphics;
        this.battleSystem = battleSystem;

        // Angry ghost registry - Map<ghostId, ghostData>
        this.angryGhosts = new Map();
        this.nextGhostId = 0;

        // Animation timing
        this.time = 0;

        // Angry ghost config
        this.config = {
            // Visual
            spriteSize: 1.5,           // Slightly larger than friendly ghosts
            opacity: 0.9,              // More opaque (angrier!)
            color: 0xFFFFFF,           // No tint - they look like friendly ghosts!

            // Animation
            floatSpeed: 2.0,           // Faster floating (aggressive)
            floatAmount: 0.4,          // More dramatic bobbing
            rotateSpeed: 1.0,          // Faster rotation

            // Spawn
            ruinSpawnChance: 0.6,      // 60% chance per ruin
            spawnHeight: 2.5,          // Slightly higher spawn

            // Battle trigger
            battleTriggerRange: 3.0,   // Distance at which battle starts
        };

        console.log('💀 AngryGhostSystem initialized');
    }

    /**
     * Reload all angry ghost textures (called when enhanced graphics assets finish loading)
     * Note: Not needed anymore - we load ready pose directly in spawnAngryGhost()
     */
    reloadGhostTextures() {
        console.log('💀 Angry ghost textures loaded directly from ready pose - no reload needed');
    }

    /**
     * Create an angry ghost billboard sprite
     * @param {number} x - World X position
     * @param {number} y - World Y position
     * @param {number} z - World Z position
     * @returns {string} Ghost ID
     */
    spawnAngryGhost(x, y, z) {
        let texture;

        // Try to load ready pose directly (no base sprite exists)
        const readyPath = 'art/entities/angry_ghost_ready_pose_enhanced.png';

        try {
            texture = new THREE.TextureLoader().load(readyPath);
            texture.magFilter = THREE.LinearFilter;
            texture.minFilter = THREE.LinearFilter;
            console.log(`💀 Using angry ghost ready pose: ${readyPath}`);
        } catch (error) {
            // Fall back to emoji on canvas
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');

            // Draw emoji ghost (no red tint - stealth!)
            ctx.font = '100px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('👻', 64, 64);

            texture = new THREE.CanvasTexture(canvas);
            texture.magFilter = THREE.LinearFilter;
            texture.minFilter = THREE.LinearFilter;
            console.log('💀 Using emoji fallback for angry ghost');
        }

        // Create sprite material with transparency and red tint
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: this.config.opacity,
            depthWrite: false,
            color: this.config.color, // Red tint
        });

        // Create sprite
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(this.config.spriteSize, this.config.spriteSize, 1);
        sprite.position.set(x, y + this.config.spawnHeight, z);

        // Add to scene
        this.scene.add(sprite);

        // Create ghost data
        const ghostId = `angry_ghost_${this.nextGhostId++}`;
        const ghostData = {
            id: ghostId,
            sprite: sprite,
            spawnPosition: { x, y, z },
            baseY: y + this.config.spawnHeight,
            floatOffset: Math.random() * Math.PI * 2,
            battleTriggered: false, // Track if this ghost started a battle
        };

        this.angryGhosts.set(ghostId, ghostData);

        console.log(`💀 Angry Ghost spawned at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}) - ID: ${ghostId}`);

        return ghostId;
    }

    /**
     * Remove an angry ghost from the system
     * @param {string} ghostId - ID of ghost to remove
     */
    removeAngryGhost(ghostId) {
        const ghost = this.angryGhosts.get(ghostId);
        if (ghost) {
            this.scene.remove(ghost.sprite);
            ghost.sprite.material.dispose();
            ghost.sprite.material.map.dispose();
            this.angryGhosts.delete(ghostId);
            console.log(`💀 Angry Ghost removed: ${ghostId}`);
        }
    }

    /**
     * Update all angry ghosts - handle animation and battle triggers
     * @param {number} deltaTime - Time since last frame (seconds)
     * @param {object} playerPosition - {x, y, z} player position
     */
    update(deltaTime, playerPosition) {
        this.time += deltaTime;

        this.angryGhosts.forEach((ghost) => {
            // FLOATING ANIMATION - Aggressive bobbing
            const floatPhase = this.time * this.config.floatSpeed + ghost.floatOffset;
            const floatY = Math.sin(floatPhase) * this.config.floatAmount;

            ghost.sprite.position.y = ghost.baseY + floatY;

            // BATTLE TRIGGER - Check distance to player
            if (!ghost.battleTriggered && this.battleSystem && !this.battleSystem.inBattle) {
                const dx = playerPosition.x - ghost.sprite.position.x;
                const dz = playerPosition.z - ghost.sprite.position.z;
                const distanceToPlayer = Math.sqrt(dx * dx + dz * dz);

                if (distanceToPlayer < this.config.battleTriggerRange) {
                    console.log(`💀 Battle triggered by ${ghost.id} at distance ${distanceToPlayer.toFixed(2)}`);
                    ghost.battleTriggered = true;

                    // Start battle
                    this.battleSystem.startBattle('angry_ghost', ghost.spawnPosition);

                    // Remove this ghost from world (it's now in battle)
                    setTimeout(() => {
                        this.removeAngryGhost(ghost.id);
                    }, 500);
                }
            }
        });
    }

    /**
     * Attempt to spawn an angry ghost at a ruin location
     * @param {number} x - Ruin X position
     * @param {number} y - Ruin Y position
     * @param {number} z - Ruin Z position
     * @returns {string|null} Ghost ID if spawned, null otherwise
     */
    trySpawnAtRuin(x, y, z) {
        if (Math.random() < this.config.ruinSpawnChance) {
            return this.spawnAngryGhost(x, y, z);
        }
        return null;
    }

    /**
     * Remove all angry ghosts (cleanup)
     */
    removeAllAngryGhosts() {
        const ghostIds = Array.from(this.angryGhosts.keys());
        ghostIds.forEach(id => this.removeAngryGhost(id));
        console.log('💀 All angry ghosts removed');
    }

    /**
     * Get angry ghost count
     * @returns {number} Number of active angry ghosts
     */
    getAngryGhostCount() {
        return this.angryGhosts.size;
    }

    /**
     * Get all angry ghost positions (for debugging/minimap)
     * @returns {Array<{x, y, z, id}>}
     */
    getAngryGhostPositions() {
        const positions = [];
        this.angryGhosts.forEach((ghost) => {
            positions.push({
                x: ghost.sprite.position.x,
                y: ghost.sprite.position.y,
                z: ghost.sprite.position.z,
                id: ghost.id
            });
        });
        return positions;
    }
}
