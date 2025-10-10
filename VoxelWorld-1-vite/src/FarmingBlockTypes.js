/**
 * 🌾 FarmingBlockTypes - Farming Block Definitions
 * 
 * Defines all farming-related block types:
 * - Tilled soil
 * - Crop growth stages (wheat, carrot, pumpkin, berry bushes)
 * - Harvested crops
 */

export const farmingBlockTypes = {
    // 🟫 TILLED SOIL - Ready for planting
    tilled_soil: { 
        color: 0x6B4423, 
        texture: 'tilled_soil',
        description: 'Tilled farmland ready for planting'
    },

    // 🌾 WHEAT GROWTH STAGES
    wheat_stage1: { 
        color: 0x90EE90, 
        texture: 'wheat_stage1',
        description: 'Wheat sprout (Stage 1/3)',
        isCrop: true,
        cropType: 'wheat',
        growthStage: 1,
        nextStage: 'wheat_stage2',
        growthTime: 10 // in-game days
    },
    wheat_stage2: { 
        color: 0xF0E68C, 
        texture: 'wheat_stage2',
        description: 'Growing wheat (Stage 2/3)',
        isCrop: true,
        cropType: 'wheat',
        growthStage: 2,
        nextStage: 'wheat_stage3',
        growthTime: 10
    },
    wheat_stage3: { 
        color: 0xDAA520, 
        texture: 'wheat_stage3',
        description: 'Mature wheat - Ready to harvest!',
        isCrop: true,
        cropType: 'wheat',
        growthStage: 3,
        nextStage: null, // Fully grown
        harvestable: true,
        harvestYield: { wheat: 1, wheat_seeds: 2 }
    },

    // 🥕 CARROT GROWTH STAGES
    carrot_stage1: { 
        color: 0x90EE90, 
        texture: 'carrot_stage1',
        description: 'Carrot sprout (Stage 1/3)',
        isCrop: true,
        cropType: 'carrot',
        growthStage: 1,
        nextStage: 'carrot_stage2',
        growthTime: 10
    },
    carrot_stage2: { 
        color: 0xFF8C00, 
        texture: 'carrot_stage2',
        description: 'Growing carrot (Stage 2/3)',
        isCrop: true,
        cropType: 'carrot',
        growthStage: 2,
        nextStage: 'carrot_stage3',
        growthTime: 10
    },
    carrot_stage3: { 
        color: 0xFF6347, 
        texture: 'carrot_stage3',
        description: 'Mature carrot - Ready to harvest!',
        isCrop: true,
        cropType: 'carrot',
        growthStage: 3,
        nextStage: null,
        harvestable: true,
        harvestYield: { carrot: 1, carrot_seeds: 2 }
    },

    // 🎃 PUMPKIN GROWTH STAGES
    pumpkin_stage1: { 
        color: 0x90EE90, 
        texture: 'pumpkin_stage1',
        description: 'Pumpkin sprout (Stage 1/3)',
        isCrop: true,
        cropType: 'pumpkin',
        growthStage: 1,
        nextStage: 'pumpkin_stage2',
        growthTime: 15 // Pumpkins take longer
    },
    pumpkin_stage2: { 
        color: 0xFFD700, 
        texture: 'pumpkin_stage2',
        description: 'Growing pumpkin (Stage 2/3)',
        isCrop: true,
        cropType: 'pumpkin',
        growthStage: 2,
        nextStage: 'pumpkin_stage3',
        growthTime: 15
    },
    pumpkin_stage3: { 
        color: 0xFF8C00, 
        texture: 'pumpkin_stage3',
        description: 'Mature pumpkin - Ready to harvest!',
        isCrop: true,
        cropType: 'pumpkin',
        growthStage: 3,
        nextStage: null,
        harvestable: true,
        harvestYield: { pumpkin: 1, pumpkin_seeds: 3 } // More seeds from pumpkins
    },

    // 🫐 BERRY BUSH GROWTH STAGES
    berry_bush_stage1: { 
        color: 0x228B22, 
        texture: 'berry_bush_stage1',
        description: 'Berry bush sprout (Stage 1/3)',
        isCrop: true,
        cropType: 'berry',
        growthStage: 1,
        nextStage: 'berry_bush_stage2',
        growthTime: 12
    },
    berry_bush_stage2: { 
        color: 0x32CD32, 
        texture: 'berry_bush_stage2',
        description: 'Growing berry bush (Stage 2/3)',
        isCrop: true,
        cropType: 'berry',
        growthStage: 2,
        nextStage: 'berry_bush_stage3',
        growthTime: 12
    },
    berry_bush_stage3: { 
        color: 0xFF1493, 
        texture: 'berry_bush_stage3',
        description: 'Mature berry bush - Ready to harvest!',
        isCrop: true,
        cropType: 'berry',
        growthStage: 3,
        nextStage: null,
        harvestable: true,
        harvestYield: { berry: 2, berry_seeds: 1 } // More berries, fewer seeds
    }
};

/**
 * Get crop metadata by type
 */
export function getCropMetadata(cropType) {
    const metadata = {
        wheat: {
            seedItem: 'wheat_seeds',
            stages: ['wheat_stage1', 'wheat_stage2', 'wheat_stage3'],
            totalGrowthTime: 30, // 3 stages × 10 days
            harvestYield: { wheat: 1, wheat_seeds: 2 }
        },
        carrot: {
            seedItem: 'carrot_seeds',
            stages: ['carrot_stage1', 'carrot_stage2', 'carrot_stage3'],
            totalGrowthTime: 30,
            harvestYield: { carrot: 1, carrot_seeds: 2 }
        },
        pumpkin: {
            seedItem: 'pumpkin_seeds',
            stages: ['pumpkin_stage1', 'pumpkin_stage2', 'pumpkin_stage3'],
            totalGrowthTime: 45, // 3 stages × 15 days
            harvestYield: { pumpkin: 1, pumpkin_seeds: 3 }
        },
        berry: {
            seedItem: 'berry_seeds',
            stages: ['berry_bush_stage1', 'berry_bush_stage2', 'berry_bush_stage3'],
            totalGrowthTime: 36, // 3 stages × 12 days
            harvestYield: { berry: 2, berry_seeds: 1 }
        }
    };

    return metadata[cropType] || null;
}

/**
 * Get seed item for a crop type
 */
export function getSeedForCrop(cropType) {
    const metadata = getCropMetadata(cropType);
    return metadata ? metadata.seedItem : null;
}

/**
 * Get crop type from seed item
 */
export function getCropFromSeed(seedItem) {
    const seedToCrop = {
        'wheat_seeds': 'wheat',
        'carrot_seeds': 'carrot',
        'pumpkin_seeds': 'pumpkin',
        'berry_seeds': 'berry'
    };
    return seedToCrop[seedItem] || null;
}
