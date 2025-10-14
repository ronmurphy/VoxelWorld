/**
 * configs.js - Animal type configurations
 * 
 * Add new animals here - just provide stats and art filenames!
 */

export const animalConfigs = {
    rabbit: {
        id: 'rabbit',
        name: 'Rabbit',
        health: 1,
        speed: 0.15,
        fleeDistance: 15,
        fleeSpeed: 0.25,
        
        // Spawn rules
        spawnBiomes: ['grassland', 'plains', 'forest'],
        spawnTimeOfDay: ['dawn'], // 5:00-7:00
        maxPerChunk: 2,
        respawnInterval: 300, // 5 minutes
        seasonalMultiplier: {
            spring: 1.5,
            summer: 1.2,
            fall: 0.8,
            winter: 0.3
        },
        
        // Loot
        drops: [
            { item: 'raw_rabbit_meat', chance: 1.0, amount: [1, 2] },
            { item: 'rabbit_hide', chance: 0.5, amount: 1 }
        ],
        
        // Animations (files in assets/art/animals/)
        animations: {
            rest: 'rabbit_rest.png',
            move: ['rabbit_move_1.png', 'rabbit_move_2.png'],
            hunted: 'rabbit_hunted.png'
        },
        animSpeed: 0.3 // Seconds per frame
    }
    
    // 🚧 COMING SOON: Deer, Boar, Bear
    // Uncomment when you have the art files ready!
    
    /*
    deer: {
        id: 'deer',
        name: 'Deer',
        health: 2,
        speed: 0.18,
        fleeDistance: 20,
        fleeSpeed: 0.3,
        
        spawnBiomes: ['forest', 'meadow'],
        spawnTimeOfDay: ['dawn', 'dusk'],
        maxPerChunk: 1,
        respawnInterval: 600,
        seasonalMultiplier: {
            spring: 1.3,
            summer: 1.0,
            fall: 0.9,
            winter: 0.4
        },
        
        drops: [
            { item: 'venison', chance: 1.0, amount: [2, 4] },
            { item: 'antler', chance: 0.3, amount: 1 },
            { item: 'deer_hide', chance: 0.8, amount: [1, 2] }
        ],
        
        animations: {
            rest: 'deer_rest.png',
            move: ['deer_move_1.png', 'deer_move_2.png'],
            hunted: 'deer_hunted.png'
        },
        animSpeed: 0.25
    },
    
    boar: {
        id: 'boar',
        name: 'Boar',
        health: 3,
        speed: 0.12,
        aggressive: true,
        aggroDistance: 8,
        chargeSpeed: 0.35,
        damage: 15,
        
        spawnBiomes: ['forest', 'jungle'],
        spawnTimeOfDay: ['day', 'dusk'],
        maxPerChunk: 1,
        respawnInterval: 900,
        seasonalMultiplier: {
            spring: 1.0,
            summer: 1.2,
            fall: 1.5,
            winter: 0.2
        },
        
        drops: [
            { item: 'pork', chance: 1.0, amount: [2, 3] },
            { item: 'boar_tusk', chance: 0.4, amount: 1 },
            { item: 'boar_hide', chance: 0.7, amount: 1 }
        ],
        
        animations: {
            rest: 'boar_rest.png',
            move: ['boar_move_1.png', 'boar_move_2.png'],
            charge: ['boar_charge_1.png', 'boar_charge_2.png'],
            hunted: 'boar_hunted.png'
        },
        animSpeed: 0.2
    },
    
    bear: {
        id: 'bear',
        name: 'Bear',
        health: 5,
        speed: 0.15,
        aggressive: true,
        aggroDistance: 12,
        chargeSpeed: 0.4,
        damage: 30,
        
        spawnBiomes: ['forest', 'mountain', 'snow'],
        spawnTimeOfDay: ['day', 'dusk', 'night'],
        maxPerChunk: 1,
        respawnInterval: 1800, // 30 minutes!
        seasonalMultiplier: {
            spring: 0.5,
            summer: 0.7,
            fall: 1.5,
            winter: 0.1 // Hibernating!
        },
        
        drops: [
            { item: 'bear_meat', chance: 1.0, amount: [4, 6] },
            { item: 'bear_pelt', chance: 0.9, amount: 1 },
            { item: 'bear_claw', chance: 0.6, amount: [1, 2] }
        ],
        
        animations: {
            rest: 'bear_rest.png',
            move: ['bear_move_1.png', 'bear_move_2.png'],
            charge: ['bear_charge_1.png', 'bear_charge_2.png'],
            attack: 'bear_attack.png',
            hunted: 'bear_hunted.png'
        },
        animSpeed: 0.25
    }
    */
};
