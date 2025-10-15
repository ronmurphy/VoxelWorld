/**
 * NPC System - Billboard-based characters
 * Used for companions, quest givers, and interactive characters
 */

import * as THREE from 'three';

export class NPC {
    constructor(voxelWorld, config = {}) {
        this.voxelWorld = voxelWorld;
        this.id = config.id || `npc_${Date.now()}`;
        this.name = config.name || 'Companion';
        this.emoji = config.emoji || '🐈‍⬛'; // Default: Sargem!
        this.position = config.position || new THREE.Vector3(0, 1, 5);
        this.scale = config.scale || 2;
        this.interactionDistance = config.interactionDistance || 2.5; // Increased for easier interaction
        
        // NPC state
        this.isPlayerNearby = false;
        this.billboard = null;
        this.notificationShown = false;
        
        // Callbacks
        this.onInteract = config.onInteract || (() => {});
        
        this.create();
    }

    /**
     * Create the billboard sprite
     */
    create() {
        // Create canvas for emoji
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Draw emoji
        ctx.font = '100px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, 64, 64);

        // Create texture
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        // Create billboard material
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
            sizeAttenuation: true  // NPCs get smaller with distance (normal perspective)
        });

        // Create sprite
        this.billboard = new THREE.Sprite(material);
        this.billboard.scale.set(this.scale, this.scale, 1);
        this.billboard.position.copy(this.position);
        this.billboard.userData.isNPC = true;
        this.billboard.userData.npcId = this.id;
        this.billboard.userData.npcInstance = this;

        // Create invisible hitbox for easier clicking (like discovery items)
        const hitboxSize = 1.5;
        this.hitbox = new THREE.Mesh(
            new THREE.BoxGeometry(hitboxSize, hitboxSize, hitboxSize),
            new THREE.MeshBasicMaterial({
                transparent: true,
                opacity: 0, // Completely invisible
                depthWrite: false
            })
        );
        this.hitbox.position.copy(this.position);
        this.hitbox.userData.isNPC = true;
        this.hitbox.userData.npcId = this.id;
        this.hitbox.userData.npcInstance = this;

        // Add both to scene
        this.voxelWorld.scene.add(this.billboard);
        this.voxelWorld.scene.add(this.hitbox);

        console.log(`👋 Spawned NPC: ${this.name} at`, this.position);
    }

    /**
     * Update NPC (called every frame)
     */
    update() {
        if (!this.billboard) return;

        // Always face camera (billboard behavior)
        const camera = this.voxelWorld.camera;
        if (camera) {
            this.billboard.lookAt(camera.position);
        }

        // Check distance to player
        const playerPos = this.voxelWorld.player.position;
        const distance = this.position.distanceTo(
            new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z)
        );

        if (distance <= this.interactionDistance) {
            if (!this.isPlayerNearby) {
                this.isPlayerNearby = true;
                this.showInteractionPrompt();
                console.log(`📍 Player near ${this.name} (distance: ${distance.toFixed(2)})`);
            }
        } else {
            if (this.isPlayerNearby) {
                this.isPlayerNearby = false;
                this.hideInteractionPrompt();
                console.log(`📍 Player left ${this.name} (distance: ${distance.toFixed(2)})`);
            }
        }
    }

    /**
     * Show "Right-click to talk" notification
     */
    showInteractionPrompt() {
        if (this.notificationShown) return;
        
        const notification = document.getElementById('notification');
        if (notification) {
            notification.textContent = `Right-click to talk to ${this.name}`;
            notification.style.display = 'block';
            this.notificationShown = true;
        }
    }

    /**
     * Hide interaction prompt
     */
    hideInteractionPrompt() {
        if (!this.notificationShown) return;

        const notification = document.getElementById('notification');
        if (notification && notification.textContent.includes('Right-click to talk')) {
            notification.style.display = 'none';
            this.notificationShown = false;
        }
    }

    /**
     * Handle right-click interaction (called when player right-clicks nearby NPC)
     */
    handleRightClick() {
        if (!this.isPlayerNearby) return false;

        console.log(`💬 Right-clicked ${this.name}`);
        this.hideInteractionPrompt();
        this.onInteract(this);
        return true; // Consumed the click
    }

    /**
     * Interact with NPC (for programmatic triggers)
     */
    interact() {
        console.log(`💬 Interacting with ${this.name}`);
        this.hideInteractionPrompt();
        this.onInteract(this);
    }

    /**
     * Remove NPC from scene
     */
    destroy() {
        if (this.billboard) {
            this.hideInteractionPrompt();
            this.voxelWorld.scene.remove(this.billboard);
            
            // Dispose texture and material
            if (this.billboard.material.map) {
                this.billboard.material.map.dispose();
            }
            this.billboard.material.dispose();
            
            this.billboard = null;
        }

        // Remove hitbox
        if (this.hitbox) {
            this.voxelWorld.scene.remove(this.hitbox);
            this.hitbox.geometry.dispose();
            this.hitbox.material.dispose();
            this.hitbox = null;
        }

        console.log(`👋 Removed NPC: ${this.name}`);
    }

    /**
     * Update position
     */
    setPosition(x, y, z) {
        this.position.set(x, y, z);
        if (this.billboard) {
            this.billboard.position.copy(this.position);
        }
    }

    /**
     * Change emoji
     */
    setEmoji(emoji) {
        this.emoji = emoji;
        
        // Recreate billboard with new emoji
        if (this.billboard) {
            this.destroy();
            this.create();
        }
    }
}

/**
 * NPC Manager - handles multiple NPCs
 */
export class NPCManager {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;
        this.npcs = new Map();
        this.enabled = true;
    }

    /**
     * Spawn an NPC
     */
    spawn(config) {
        const npc = new NPC(this.voxelWorld, config);
        this.npcs.set(npc.id, npc);
        return npc;
    }

    /**
     * Remove an NPC
     */
    remove(npcId) {
        const npc = this.npcs.get(npcId);
        if (npc) {
            npc.destroy();
            this.npcs.delete(npcId);
        }
    }

    /**
     * Remove all NPCs
     */
    removeAll() {
        for (const npc of this.npcs.values()) {
            npc.destroy();
        }
        this.npcs.clear();
        console.log('🧹 All NPCs removed');
    }

    /**
     * Update all NPCs
     */
    update() {
        if (!this.enabled) return;

        for (const npc of this.npcs.values()) {
            npc.update();
        }
    }

    /**
     * Handle right-click - check if clicking on nearby NPC
     */
    handleRightClick() {
        for (const npc of this.npcs.values()) {
            if (npc.isPlayerNearby) {
                return npc.handleRightClick();
            }
        }
        return false; // No NPC nearby
    }

    /**
     * Handle E key press - interact with nearby NPC (legacy/alternate method)
     */
    handleInteraction() {
        for (const npc of this.npcs.values()) {
            if (npc.isPlayerNearby) {
                npc.interact();
                return true; // Handled
            }
        }
        return false; // No NPC nearby
    }

    /**
     * Get NPC by ID
     */
    get(npcId) {
        return this.npcs.get(npcId);
    }

    /**
     * Get all NPCs
     */
    getAll() {
        return Array.from(this.npcs.values());
    }
}
