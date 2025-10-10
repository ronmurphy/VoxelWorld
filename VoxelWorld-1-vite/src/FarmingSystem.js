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

        // Track 3D crop meshes for disposal (prevent memory leaks)
        this.crop3DModels = new Map(); // Map<"x,y,z", {mesh, leafIndicators[]}>

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
     * 💧 Water a crop with watering can
     * Triggers particle effect and speeds up growth (2x)
     */
    waterCrop(x, y, z) {
        const blockData = this.voxelWorld.getBlock(x, y, z);
        const blockType = blockData?.type || blockData;

        // Check if block is a crop
        const cropMetadata = farmingBlockTypes[blockType];
        if (!cropMetadata || !cropMetadata.isCrop) {
            this.voxelWorld.updateStatus('❌ Can only water crops!', 'warning');
            return false;
        }

        // Check if crop is already watered
        if (this.cropGrowthManager.isWatered(x, y, z)) {
            this.voxelWorld.updateStatus('💧 Crop is already watered!', 'craft');
            return false;
        }

        // Water the crop (2x growth speed)
        this.cropGrowthManager.waterCrop(x, y, z);

        // Trigger watering particle effect
        if (this.voxelWorld.animationSystem) {
            this.voxelWorld.animationSystem.animateWateringEffect(x, y, z);
        }

        this.voxelWorld.updateStatus('💧 Crop watered! Growth speed doubled.', 'craft');
        console.log(`💧 Watered crop at (${x}, ${y}, ${z})`);

        return true;
    }

    /**
     * Get farming block types for VoxelWorld integration
     */
    getFarmingBlockTypes() {
        return farmingBlockTypes;
    }

    /**
     * 🌱 Create 3D crop model with growth stage visualization
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @param {number} z - World Z coordinate
     * @param {string} cropType - Type of crop (wheat, carrot, pumpkin, berry)
     * @param {number} growthStage - Growth stage (1-3)
     */
    create3DCropModel(x, y, z, cropType, growthStage) {
        const key = `${x},${y},${z}`;

        // Remove existing model if present (growth stage changed)
        this.remove3DCropModel(x, y, z);

        const THREE = this.voxelWorld.THREE;

        // Create crop mesh based on type and stage
        const cropMesh = this.createCropMesh(cropType, growthStage, THREE);
        cropMesh.position.set(x + 0.5, y, z + 0.5);
        this.voxelWorld.scene.add(cropMesh);

        // Create leaf indicators (1-3 leaves floating above crop)
        const leafIndicators = this.createLeafIndicators(x, y, z, growthStage, THREE);

        // Store for cleanup
        this.crop3DModels.set(key, { mesh: cropMesh, leafIndicators });

        console.log(`🌱 Created 3D crop model: ${cropType} stage ${growthStage} at (${x}, ${y}, ${z})`);
    }

    /**
     * 🌿 Create crop mesh based on type and growth stage
     */
    createCropMesh(cropType, growthStage, THREE) {
        const cropColors = {
            wheat: [0x90EE90, 0xF0E68C, 0xDAA520],     // Light green → Khaki → Goldenrod
            carrot: [0x90EE90, 0xFF8C00, 0xFF6347],    // Light green → Dark orange → Tomato
            pumpkin: [0x90EE90, 0xFFD700, 0xFF8C00],   // Light green → Gold → Dark orange
            berry: [0x228B22, 0x32CD32, 0xFF1493]      // Forest green → Lime green → Deep pink
        };

        const color = cropColors[cropType][growthStage - 1];

        // Height increases with growth stage
        const height = 0.2 + (growthStage * 0.15); // 0.35, 0.50, 0.65

        const geometry = new THREE.BoxGeometry(0.3, height, 0.3);
        const material = new THREE.MeshLambertMaterial({ color });
        const mesh = new THREE.Mesh(geometry, material);

        // Position mesh so it sits on top of tilled soil
        mesh.position.y = height / 2;

        return mesh;
    }

    /**
     * 🍃 Create leaf indicators (1-3 leaves) floating above crop
     */
    createLeafIndicators(x, y, z, growthStage, THREE) {
        const indicators = [];
        const leafCount = growthStage; // 1 leaf = stage 1, 2 leaves = stage 2, 3 leaves = stage 3

        for (let i = 0; i < leafCount; i++) {
            // Create simple leaf sprite using canvas
            const canvas = document.createElement('canvas');
            canvas.width = 32;
            canvas.height = 32;
            const ctx = canvas.getContext('2d');

            // Draw leaf emoji (fallback if image doesn't load)
            ctx.font = '28px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🍃', 16, 16);

            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
            const sprite = new THREE.Sprite(material);

            // Position leaves in a circle above the crop
            const angle = (i / leafCount) * Math.PI * 2;
            const radius = 0.3;
            sprite.position.set(
                x + 0.5 + Math.cos(angle) * radius,
                y + 1.2, // Float above crop
                z + 0.5 + Math.sin(angle) * radius
            );
            sprite.scale.set(0.2, 0.2, 0.2);

            this.voxelWorld.scene.add(sprite);
            indicators.push(sprite);
        }

        return indicators;
    }

    /**
     * 🗑️ Remove 3D crop model and dispose resources
     */
    remove3DCropModel(x, y, z) {
        const key = `${x},${y},${z}`;
        const model = this.crop3DModels.get(key);

        if (model) {
            // Remove and dispose crop mesh
            if (model.mesh) {
                this.voxelWorld.scene.remove(model.mesh);
                if (model.mesh.geometry) model.mesh.geometry.dispose();
                if (model.mesh.material) model.mesh.material.dispose();
            }

            // Remove and dispose leaf indicators
            if (model.leafIndicators) {
                model.leafIndicators.forEach(sprite => {
                    this.voxelWorld.scene.remove(sprite);
                    if (sprite.material && sprite.material.map) {
                        sprite.material.map.dispose();
                    }
                    if (sprite.material) sprite.material.dispose();
                });
            }

            this.crop3DModels.delete(key);
            console.log(`🗑️ Disposed 3D crop model at (${x}, ${y}, ${z})`);
        }
    }

    /**
     * 🧹 Cleanup all crop models (called on chunk unload or game shutdown)
     */
    disposeAllCropModels() {
        console.log(`🧹 Disposing ${this.crop3DModels.size} crop models...`);

        for (const [key, model] of this.crop3DModels.entries()) {
            const [x, y, z] = key.split(',').map(Number);
            this.remove3DCropModel(x, y, z);
        }

        console.log('✅ All crop models disposed');
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
