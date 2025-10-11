/**
 * 🌱 CropGrowthManager - Crop Growth & Watering System
 * 
 * Manages:
 * - Crop growth timers and stage progression
 * - Watering mechanics (2x growth speed when watered)
 * - Tilled soil reversion (unused soil turns back to dirt)
 * - Growth tick updates based on in-game day cycle
 */

import { farmingBlockTypes, getCropMetadata } from './FarmingBlockTypes.js';

export class CropGrowthManager {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;
        
        // Track all planted crops: { "x,y,z": { cropType, stage, plantedDay, lastWateredDay, watered } }
        this.crops = new Map();
        
        // Track tilled soil: { "x,y,z": { tilledDay } }
        this.tilledSoil = new Map();
        
        // Growth settings
        this.daysPerStage = 10; // Base: 10 in-game days per growth stage
        this.wateredSpeedMultiplier = 2; // Watered crops grow 2x faster
        this.soilReversionDays = 24; // Unused tilled soil reverts after 24 in-game days
        
        // Track last update day
        this.lastUpdateDay = 0;
        
        console.log('🌱 CropGrowthManager initialized');
    }

    /**
     * Plant a crop at the specified position
     */
    plantCrop(x, y, z, seedItem) {
        const cropType = this.getCropTypeFromSeed(seedItem);
        if (!cropType) {
            console.warn('Unknown seed type:', seedItem);
            return false;
        }

        const key = `${x},${y},${z}`;
        const currentDay = this.voxelWorld.getCurrentDay();

        this.crops.set(key, {
            cropType: cropType,
            stage: 1,
            plantedDay: currentDay,
            lastWateredDay: null,
            watered: false
        });

        // Remove from tilled soil tracker since it's now planted
        this.tilledSoil.delete(key);

        // 🌱 Create 3D crop model for stage 1
        if (this.voxelWorld.farmingSystem) {
            this.voxelWorld.farmingSystem.create3DCropModel(x, y, z, cropType, 1);
        }

        console.log(`🌱 Planted ${cropType} at (${x},${y},${z}) on day ${currentDay}`);
        return true;
    }

    /**
     * Check if a crop is currently watered
     */
    isWatered(x, y, z) {
        const key = `${x},${y},${z}`;
        const crop = this.crops.get(key);

        if (!crop) {
            return false;
        }

        // Check if watered status is still active (water lasts 1 day)
        const currentDay = this.voxelWorld.getCurrentDay();
        if (crop.watered && crop.lastWateredDay !== null && currentDay > crop.lastWateredDay) {
            // Watered status expired
            return false;
        }

        return crop.watered;
    }

    /**
     * Water a crop at the specified position
     */
    waterCrop(x, y, z) {
        const key = `${x},${y},${z}`;
        const crop = this.crops.get(key);

        if (!crop) {
            console.warn('No crop found at position:', x, y, z);
            return false;
        }

        const currentDay = this.voxelWorld.getCurrentDay();
        crop.lastWateredDay = currentDay;
        crop.watered = true;

        // Update soil color to darker brown (watered appearance)
        this.updateSoilColor(x, y, z, true);

        console.log(`💧 Watered ${crop.cropType} at (${x},${y},${z})`);
        return true;
    }

    /**
     * Update soil color based on watered state
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     * @param {boolean} watered - True for wet (dark), false for dry (normal)
     */
    updateSoilColor(x, y, z, watered) {
        const key = `${x},${y},${z}`;
        const blockData = this.voxelWorld.world[key];

        if (!blockData || !blockData.mesh) return;

        // Color values
        const dryColor = 0x6B4423;  // Normal tilled soil brown
        const wetColor = 0x4A2F1A;  // Darker wet soil brown

        const targetColor = watered ? wetColor : dryColor;

        if (blockData.mesh.material && blockData.mesh.material.color) {
            blockData.mesh.material.color.setHex(targetColor);
        }
    }

    /**
     * Register tilled soil
     */
    registerTilledSoil(x, y, z) {
        const key = `${x},${y},${z}`;
        const currentDay = this.voxelWorld.getCurrentDay();
        
        this.tilledSoil.set(key, {
            tilledDay: currentDay
        });

        console.log(`🟫 Tilled soil registered at (${x},${y},${z}) on day ${currentDay}`);
    }

    /**
     * Update crop growth (called each in-game day)
     */
    update() {
        const currentDay = this.voxelWorld.getCurrentDay();
        
        // Only update once per day
        if (currentDay === this.lastUpdateDay) {
            return;
        }
        
        this.lastUpdateDay = currentDay;

        // Update crop growth
        this.updateCropGrowth(currentDay);
        
        // Check tilled soil reversion
        this.updateTilledSoil(currentDay);
    }

    /**
     * Update all crops' growth stages
     */
    updateCropGrowth(currentDay) {
        for (const [posKey, crop] of this.crops.entries()) {
            const [x, y, z] = posKey.split(',').map(Number);
            const metadata = getCropMetadata(crop.cropType);
            
            if (!metadata) continue;

            // Calculate days since planting
            const daysSincePlanting = currentDay - crop.plantedDay;

            // Check if watered status expired (water lasts 1 day)
            if (crop.watered && crop.lastWateredDay !== null && currentDay > crop.lastWateredDay) {
                crop.watered = false;
                // Reset soil color to dry when water expires
                this.updateSoilColor(x, y, z, false);
            }

            // Calculate effective growth rate
            const growthRate = crop.watered ? this.wateredSpeedMultiplier : 1;
            const daysPerStageAdjusted = this.daysPerStage / growthRate;

            // Determine which stage the crop should be at
            const targetStage = Math.min(3, Math.floor(daysSincePlanting / daysPerStageAdjusted) + 1);

            // Update stage if changed
            if (targetStage > crop.stage && targetStage <= 3) {
                crop.stage = targetStage;
                const newBlockType = metadata.stages[targetStage - 1];

                // Update the block in the world
                this.voxelWorld.setBlock(x, y, z, newBlockType);

                // 🌱 Create/update 3D crop model
                if (this.voxelWorld.farmingSystem) {
                    this.voxelWorld.farmingSystem.create3DCropModel(x, y, z, crop.cropType, targetStage);
                }

                console.log(`🌱 ${crop.cropType} grew to stage ${targetStage} at (${x},${y},${z})`);

                // Notify player if crop is ready to harvest
                if (targetStage === 3) {
                    this.voxelWorld.showNotification(`🌾 ${crop.cropType.toUpperCase()} is ready to harvest!`);
                }
            }
        }
    }

    /**
     * Update tilled soil (revert to dirt if unused)
     */
    updateTilledSoil(currentDay) {
        const soilToRevert = [];

        for (const [posKey, soil] of this.tilledSoil.entries()) {
            const daysSinceTilled = currentDay - soil.tilledDay;
            
            if (daysSinceTilled >= this.soilReversionDays) {
                soilToRevert.push(posKey);
            }
        }

        // Revert soil back to dirt
        for (const posKey of soilToRevert) {
            const [x, y, z] = posKey.split(',').map(Number);
            this.voxelWorld.setBlock(x, y, z, 'dirt');
            this.tilledSoil.delete(posKey);
            console.log(`🟫 Tilled soil reverted to dirt at (${x},${y},${z})`);
        }
    }

    /**
     * Harvest a crop
     */
    harvestCrop(x, y, z) {
        const key = `${x},${y},${z}`;
        const crop = this.crops.get(key);
        
        if (!crop) {
            console.warn('No crop to harvest at:', x, y, z);
            return null;
        }

        if (crop.stage !== 3) {
            console.warn('Crop not fully grown yet:', crop);
            return null;
        }

        const metadata = getCropMetadata(crop.cropType);
        if (!metadata) return null;

        // Remove crop from tracking
        this.crops.delete(key);

        // Return harvest yield (modified by watering bonus)
        const yieldMultiplier = crop.watered ? 2 : 1;
        const harvestYield = {};
        
        for (const [item, quantity] of Object.entries(metadata.harvestYield)) {
            harvestYield[item] = quantity * yieldMultiplier;
        }

        console.log(`🌾 Harvested ${crop.cropType} at (${x},${y},${z}):`, harvestYield);
        return harvestYield;
    }

    /**
     * Remove crop tracking when block is destroyed
     */
    removeCrop(x, y, z) {
        const key = `${x},${y},${z}`;
        this.crops.delete(key);
        this.tilledSoil.delete(key);

        // 🗑️ Remove 3D crop model
        if (this.voxelWorld.farmingSystem) {
            this.voxelWorld.farmingSystem.remove3DCropModel(x, y, z);
        }
    }

    /**
     * Helper: Get crop type from seed item
     */
    getCropTypeFromSeed(seedItem) {
        const seedMap = {
            'wheat_seeds': 'wheat',
            'carrot_seeds': 'carrot',
            'pumpkin_seeds': 'pumpkin',
            'berry_seeds': 'berry'
        };
        return seedMap[seedItem] || null;
    }

    /**
     * Get crop info at position (for UI/debugging)
     */
    getCropInfo(x, y, z) {
        const key = `${x},${y},${z}`;
        return this.crops.get(key) || null;
    }

    /**
     * Save/Load crop data
     */
    serialize() {
        return {
            crops: Array.from(this.crops.entries()),
            tilledSoil: Array.from(this.tilledSoil.entries()),
            lastUpdateDay: this.lastUpdateDay
        };
    }

    deserialize(data) {
        if (!data) return;
        
        this.crops = new Map(data.crops || []);
        this.tilledSoil = new Map(data.tilledSoil || []);
        this.lastUpdateDay = data.lastUpdateDay || 0;
        
        console.log(`🌱 Loaded ${this.crops.size} crops and ${this.tilledSoil.size} tilled soil patches`);
    }
}
