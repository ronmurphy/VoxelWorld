/**
 * CraftedTools.js
 *
 * Handles special behaviors for crafted tools and equipment
 * Extracted from VoxelWorld.js to improve code organization
 */

export class CraftedTools {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;
    }

    /**
     * Handle left-click actions for crafted tools
     * @param {object} selectedSlot - The currently selected hotbar slot
     * @param {object} pos - Click position {x, y, z}
     * @returns {boolean} - true if tool action was handled, false to continue with default behavior
     */
    handleLeftClick(selectedSlot, pos) {
        const selectedItem = selectedSlot?.itemType;

        // 🌾 HOE TILLING: Only when hoe is SELECTED in hotbar (Minecraft-style)
        const isHoeSelected = selectedItem === 'hoe' || selectedItem === 'crafted_hoe';

        if (isHoeSelected) {
            const blockData = this.voxelWorld.getBlock(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z));
            const blockType = blockData?.type || blockData; // Handle both object and string return

            if (blockType === 'grass' || blockType === 'dirt') {
                // Quick till with hoe - instant action, no harvesting timer
                const success = this.voxelWorld.farmingSystem.handleHoeUse({
                    x: Math.floor(pos.x),
                    y: Math.floor(pos.y),
                    z: Math.floor(pos.z)
                });
                if (success) {
                    this.voxelWorld.updateStatus(`🌾 Soil tilled!`, 'craft');
                }
                return true; // Tool action handled, don't continue to harvesting
            }
        }

        return false; // No tool action, continue with default behavior
    }

    /**
     * Handle right-click actions for crafted tools
     * @param {object} selectedSlot - The currently selected hotbar slot
     * @param {object} pos - Click position {x, y, z}
     * @param {object} placePos - Placement position (pos + normal) {x, y, z}
     * @returns {boolean} - true if tool action was handled, false to continue with default behavior
     */
    handleRightClick(selectedSlot, pos, placePos) {
        const selectedBlock = selectedSlot?.itemType;

        // 🕸️ GRAPPLING HOOK: Check FIRST (before watering can) - consumes on use
        const metadata = this.voxelWorld.inventoryMetadata?.[selectedBlock];
        const isGrapplingHook = metadata?.isGrapplingHook ||
                               selectedBlock === 'grapple_hook' ||
                               selectedBlock === 'grappling_hook' ||
                               selectedBlock === 'crafted_grappling_hook';

        if (isGrapplingHook && selectedSlot.quantity > 0 && placePos) {
            // Calculate target position
            const targetX = Math.floor(placePos.x);
            const targetY = Math.floor(placePos.y) + 2;  // +2 blocks above target to avoid collision
            const targetZ = Math.floor(placePos.z);

            // Get current player position
            const startPos = {
                x: this.voxelWorld.player.position.x,
                y: this.voxelWorld.player.position.y,
                z: this.voxelWorld.player.position.z
            };

            const endPos = {
                x: targetX,
                y: targetY,
                z: targetZ
            };

            console.log(`🕸️ Grappling hook! Animating from (${startPos.x.toFixed(1)}, ${startPos.y.toFixed(1)}, ${startPos.z.toFixed(1)}) to (${endPos.x}, ${endPos.y}, ${endPos.z})`);

            // ✨ TRAJECTORY ANIMATION: Smooth arc animation with bezier curve
            this.voxelWorld.animationSystem.animateGrapplingHook(startPos, endPos, 0.8, () => {
                // Animation complete callback
                this.voxelWorld.updateStatus(`🕸️ Grappled to (${endPos.x}, ${endPos.y}, ${endPos.z})!`, 'craft');
            });

            // Consume one grappling hook charge
            selectedSlot.quantity--;

            // Clear slot if empty
            if (selectedSlot.quantity === 0) {
                selectedSlot.itemType = '';
            }

            this.voxelWorld.updateHotbarCounts();
            this.voxelWorld.updateBackpackInventoryDisplay();
            console.log(`🕸️ Grappling hook used, ${selectedSlot.quantity} charges remaining`);
            return true; // Tool action handled, don't continue to block placement
        }

        // 💧 WATERING CAN: Only when watering can is SELECTED in hotbar (Minecraft-style)
        const isWateringCanSelected = selectedBlock === 'watering_can' || selectedBlock === 'crafted_watering_can';

        if (isWateringCanSelected) {
            const blockData = this.voxelWorld.getBlock(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z));
            const blockType = blockData?.type || blockData; // Handle both object and string return

            // Check if block is a crop (any farming block that is a crop)
            const isCrop = blockType && this.voxelWorld.farmingSystem?.getFarmingBlockTypes()[blockType]?.isCrop;

            if (isCrop) {
                const success = this.voxelWorld.farmingSystem.waterCrop(
                    Math.floor(pos.x),
                    Math.floor(pos.y),
                    Math.floor(pos.z)
                );
                if (success) {
                    this.voxelWorld.updateStatus(`💧 Crop watered!`, 'craft');
                }
                return true; // Tool action handled, don't continue to seed planting or block placement
            }
        }

        return false; // No tool action, continue with default behavior
    }

    /**
     * Check if selected item is a seed (for farming)
     * @param {string} selectedBlock - The selected item type
     * @returns {boolean} - true if item is a seed
     */
    isSeedItem(selectedBlock) {
        return this.voxelWorld.farmingSystem?.isSeedItem(selectedBlock) || false;
    }

    /**
     * Handle seed planting
     * @param {object} pos - Click position {x, y, z}
     * @param {string} selectedBlock - The seed type
     * @returns {boolean} - true if seed was planted
     */
    handleSeedPlanting(pos, selectedBlock) {
        const success = this.voxelWorld.farmingSystem.handleSeedUse({
            x: Math.floor(pos.x),
            y: Math.floor(pos.y),
            z: Math.floor(pos.z)
        }, selectedBlock);

        if (success) {
            // Seed was planted and inventory already updated by farmingSystem
            // Just refresh the UI displays
            this.voxelWorld.updateHotbarCounts();
            this.voxelWorld.updateBackpackInventoryDisplay();
        }

        return success;
    }
}
