/**
 * PlayerItemsSystem.js
 * 
 * Manages active item effects for equipped/held items in the hotbar
 * Handles dynamic effects that trigger based on what the player is holding
 * 
 * Active Items:
 * - 🔦 Torch: Dynamic lighting (3x3 area) at night only
 * - 🔪 Machete: Leaf harvesting bonus
 * - 🔨 Stone Hammer: Mining bonus
 * - 🧭 Compass: Biome detection
 * - 👢 Speed Boots: Movement speed boost
 * 
 * Performance: Checks active slot each frame, only applies effects when item is held
 */

import * as THREE from 'three';

export class PlayerItemsSystem {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;
        
        // Torch lighting
        this.torchLight = null;  // PointLight instance
        this.isTorchActive = false;
        this.lastTorchCheck = 0;
        
        // Item effect state
        this.activeItem = null;
        this.lastActiveSlot = -1;
        
        console.log('🔦 PlayerItemsSystem initialized');
    }

    /**
     * Main update loop - called every frame
     * Checks EQUIPMENT SLOTS (5, 6, 7) for active items and applies effects
     * NOTE: Only the 3 equipment slots are auto-active, not inventory slots (0-4)
     */
    update(deltaTime) {
        // Check ONLY the 3 equipment slots (5, 6, 7) for active items
        let hasTorch = false;
        
        for (let i = 5; i < 8; i++) {  // Slots 5, 6, 7 only
            const slot = this.voxelWorld.hotbarSystem?.getSlot(i);
            if (slot && slot.itemType) {
                const itemType = slot.itemType;
                
                // Check for torch
                if (itemType === 'crafted_torch' || itemType === 'torch') {
                    hasTorch = true;
                }
            }
        }
        
        // Apply torch effect if player has torch in equipment slots
        if (hasTorch) {
            this.updateTorchEffect(deltaTime);
        } else {
            // Deactivate torch if not in equipment slots
            if (this.isTorchActive) {
                this.deactivateTorch();
            }
        }

        // Other item effects are passive (checked when harvesting/mining)
    }

    /**
     * 🔦 TORCH: Dynamic lighting effect (3x3 chunk area)
     * Only active during dusk/night (controlled by VoxelWorld.isTorchAllowed flag)
     */
    updateTorchEffect(deltaTime) {
        // Check if torches are allowed (flag set by day/night cycle)
        if (!this.voxelWorld.isTorchAllowed) {
            // Daytime - deactivate torch
            if (this.isTorchActive) {
                this.deactivateTorch();
            }
            return;
        }

        // Night time - activate torch lighting
        if (!this.isTorchActive) {
            this.activateTorch();
        }

        // Update torch position to follow player
        if (this.torchLight) {
            const playerPos = this.voxelWorld.player.position;
            // Position light slightly above and in front of player
            this.torchLight.position.set(
                playerPos.x,
                playerPos.y + 1.5,  // Above player's head
                playerPos.z
            );
        }
    }

    /**
     * Activate torch lighting effect
     */
    activateTorch() {
        if (this.torchLight) return;  // Already active

        // Create PointLight for torch effect
        // 3x3 chunk area = 24 blocks (3 chunks * 8 blocks per chunk)
        // Distance of ~20 gives good coverage for 3x3 area
        this.torchLight = new THREE.PointLight(
            0xFFAA33,    // Warm torch color (orange-yellow)
            1.5,         // Intensity (bright enough to see)
            20,          // Distance (3x3 chunk coverage)
            1.5          // Decay (realistic falloff)
        );

        // Position at player location
        const playerPos = this.voxelWorld.player.position;
        this.torchLight.position.set(
            playerPos.x,
            playerPos.y + 1.5,
            playerPos.z
        );

        // Add to scene
        this.voxelWorld.scene.add(this.torchLight);
        this.isTorchActive = true;

        console.log('🔦 Torch activated - lighting 3x3 area');
    }

    /**
     * Deactivate torch lighting effect
     */
    deactivateTorch() {
        if (!this.torchLight) return;

        this.voxelWorld.scene.remove(this.torchLight);
        this.torchLight.dispose();
        this.torchLight = null;
        this.isTorchActive = false;

        console.log('🔦 Torch deactivated');
    }

    /**
     * Called when player switches items
     */
    onItemChanged(newItem, oldItem) {
        if (newItem === oldItem) return;

        // Handle item-specific activation/deactivation
        if (oldItem === 'crafted_torch' && newItem !== 'crafted_torch') {
            this.deactivateTorch();
        }
    }

    /**
     * Deactivate all active effects (when no item equipped)
     */
    deactivateAllEffects() {
        if (this.isTorchActive) {
            this.deactivateTorch();
        }
        this.activeItem = null;
        this.lastActiveSlot = -1;
    }

    /**
     * 🔪 MACHETE: Check if player has machete for leaf harvesting
     * Called from tree harvesting code
     */
    hasMachete() {
        return this.voxelWorld.hasTool?.('machete') || 
               this.voxelWorld.hasTool?.('crafted_machete') || false;
    }

    /**
     * 🔨 STONE HAMMER: Check if player has stone hammer for mining bonus
     * Called from mining code
     */
    hasStoneHammer() {
        return this.voxelWorld.hasTool?.('stone_hammer') ||
               this.voxelWorld.hasTool?.('crafted_stone_hammer') || false;
    }

    /**
     * 🧭 COMPASS: Check if player has compass for biome detection
     */
    hasCompass() {
        return this.voxelWorld.hasTool?.('compass') ||
               this.voxelWorld.hasTool?.('crafted_compass') ||
               this.voxelWorld.hasTool?.('compass_upgrade') ||
               this.voxelWorld.hasTool?.('crafted_compass_upgrade') || false;
    }

    /**
     * 👢 SPEED BOOTS: Check if player has speed boots
     */
    hasSpeedBoots() {
        return this.voxelWorld.hasTool?.('speed_boots') ||
               this.voxelWorld.hasTool?.('crafted_speed_boots') || false;
    }

    /**
     * Get movement speed multiplier based on equipped items
     */
    getMovementSpeedMultiplier() {
        if (this.hasSpeedBoots()) {
            return 1.5;  // 50% speed boost
        }
        return 1.0;
    }

    /**
     * Cleanup when system is destroyed
     */
    destroy() {
        this.deactivateAllEffects();
        console.log('🔦 PlayerItemsSystem destroyed');
    }
}
