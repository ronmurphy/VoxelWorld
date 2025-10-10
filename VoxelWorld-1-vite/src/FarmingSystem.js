/**
 * 🌾 FarmingSystem - Core Farming Mechanics
 * 
 * Handles:
 * - Tilling soil with hoe (grass/dirt → tilled_soil)
 * - Planting seeds on tilled soil
 * - Watering crops (future: water bucket item)
 * - Harvesting mature crops
 * - Integration with inventory and block placement
 */

import { farmingBlockTypes, getCropFromSeed, getCropMetadata } from './FarmingBlockTypes.js';
import { CropGrowthManager } from './CropGrowthManager.js';

export class FarmingSystem {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;
        this.cropGrowthManager = new CropGrowthManager(voxelWorld);
        
        // Tillable blocks
        this.tillableBlocks = ['grass', 'dirt'];
        
        // Seed items
        this.seedItems = ['wheat_seeds', 'carrot_seeds', 'pumpkin_seeds', 'berry_seeds'];
        
        console.log('🌾 FarmingSystem initialized');
    }

    /**
     * Use hoe to till soil
     * Converts grass/dirt → tilled_soil
     */
    tillSoil(x, y, z) {
        const blockData = this.voxelWorld.getBlock(x, y, z);
        const blockType = blockData?.type || blockData; // Handle both object and string
        
        // Check if block is tillable
        if (!this.tillableBlocks.includes(blockType)) {
            console.log('Cannot till this block type:', blockType);
            return false;
        }

        // Check if there's air above (can't till if something is on top)
        // Note: Skip this check for now - player collision might interfere
        // const blockAboveData = this.voxelWorld.getBlock(x, y + 1, z);
        // const blockAbove = blockAboveData?.type || blockAboveData;
        // console.log('🌾 Block above check:', { blockAboveData, blockAbove, position: { x, y: y + 1, z } });
        
        // If blockAboveData is null/undefined, it means air (no block exists)
        // Only block tilling if there's an actual block (not null/undefined/air)
        // if (blockAboveData && blockAbove && blockAbove !== 'air') {
        //     this.voxelWorld.updateStatus('❌ Clear the space above before tilling!', 'warning');
        //     return false;
        // }

        // Till the soil
        this.voxelWorld.setBlock(x, y, z, 'tilled_soil');
        this.cropGrowthManager.registerTilledSoil(x, y, z);
        
        this.voxelWorld.updateStatus('🟫 Soil tilled! Plant seeds here.', 'craft');
        console.log(`Tilled soil at (${x}, ${y}, ${z})`);
        
        return true;
    }

    /**
     * Plant seeds on tilled soil
     */
    plantSeed(x, y, z, seedItem) {
        const blockData = this.voxelWorld.getBlock(x, y, z);
        const blockType = blockData?.type || blockData; // Handle both object and string
        
        // Check if block is tilled soil
        if (blockType !== 'tilled_soil') {
            this.voxelWorld.updateStatus('❌ Can only plant on tilled soil!', 'warning');
            return false;
        }

        // Get crop type from seed
        const cropType = getCropFromSeed(seedItem);
        if (!cropType) {
            console.warn('Unknown seed type:', seedItem);
            return false;
        }

        const metadata = getCropMetadata(cropType);
        if (!metadata) return false;

        // Place first growth stage block
        const firstStageBlock = metadata.stages[0];
        this.voxelWorld.setBlock(x, y, z, firstStageBlock);
        
        // Register crop with growth manager
        this.cropGrowthManager.plantCrop(x, y, z, seedItem);
        
        // Remove seed from inventory
        this.voxelWorld.removeFromInventory(seedItem, 1);
        
        this.voxelWorld.updateStatus(`🌱 Planted ${cropType} seeds!`, 'craft');
        console.log(`Planted ${seedItem} at (${x}, ${y}, ${z})`);
        
        return true;
    }

    /**
     * Water a crop (future: water bucket item)
     */
    waterCrop(x, y, z) {
        const blockType = this.voxelWorld.getBlock(x, y, z);
        const blockData = farmingBlockTypes[blockType];
        
        if (!blockData || !blockData.isCrop) {
            this.voxelWorld.updateStatus('❌ This is not a crop!', 'warning');
            return false;
        }

        const success = this.cropGrowthManager.waterCrop(x, y, z);
        
        if (success) {
            this.voxelWorld.updateStatus('💧 Crop watered! Growth speed: 2x', 'craft');
            // TODO: Visual effect - darker soil color or sparkles
        }
        
        return success;
    }

    /**
     * Harvest a mature crop
     */
    harvestCrop(x, y, z) {
        const blockType = this.voxelWorld.getBlock(x, y, z);
        const blockData = farmingBlockTypes[blockType];
        
        if (!blockData || !blockData.harvestable) {
            console.log('Block not harvestable:', blockType);
            return false;
        }

        // Get harvest yield from crop growth manager
        const harvestYield = this.cropGrowthManager.harvestCrop(x, y, z);
        
        if (!harvestYield) {
            console.warn('Failed to harvest crop');
            return false;
        }

        // Remove the crop block (revert to tilled soil)
        this.voxelWorld.setBlock(x, y, z, 'tilled_soil');
        this.cropGrowthManager.registerTilledSoil(x, y, z);

        // Add harvested items to inventory
        let message = '🌾 Harvested: ';
        for (const [item, quantity] of Object.entries(harvestYield)) {
            this.voxelWorld.addToInventory(item, quantity);
            message += `${quantity}x ${item} `;
        }
        
        this.voxelWorld.updateStatus(message, 'harvest');
        console.log('Harvest yield:', harvestYield);
        
        return true;
    }

    /**
     * Handle right-click with hoe
     */
    handleHoeUse(targetBlock) {
        if (!targetBlock) return false;
        
        const { x, y, z } = targetBlock;
        return this.tillSoil(x, y, z);
    }

    /**
     * Handle right-click with seeds
     */
    handleSeedUse(targetBlock, seedItem) {
        if (!targetBlock) return false;
        
        const { x, y, z } = targetBlock;
        return this.plantSeed(x, y, z, seedItem);
    }

    /**
     * Check if player is holding a farming tool/item
     */
    isFarmingItem(itemName) {
        return itemName === 'hoe' || this.seedItems.includes(itemName);
    }

    /**
     * Check if player is holding seeds
     */
    isSeedItem(itemName) {
        return this.seedItems.includes(itemName);
    }

    /**
     * Update farming system (called each frame)
     */
    update() {
        // Update crop growth (checks day changes internally)
        this.cropGrowthManager.update();
    }

    /**
     * Handle block destruction (cleanup crop tracking)
     */
    onBlockDestroyed(x, y, z, blockType) {
        // Clean up crop tracking if a crop was destroyed
        const blockData = farmingBlockTypes[blockType];
        if (blockData && blockData.isCrop) {
            this.cropGrowthManager.removeCrop(x, y, z);
        }
        
        // Clean up tilled soil tracking
        if (blockType === 'tilled_soil') {
            this.cropGrowthManager.removeCrop(x, y, z);
        }
    }

    /**
     * Get farming block types for VoxelWorld integration
     */
    getFarmingBlockTypes() {
        return farmingBlockTypes;
    }

    /**
     * Save/Load farming data
     */
    serialize() {
        return {
            cropGrowthManager: this.cropGrowthManager.serialize()
        };
    }

    deserialize(data) {
        if (!data) return;
        
        if (data.cropGrowthManager) {
            this.cropGrowthManager.deserialize(data.cropGrowthManager);
        }
    }
}
