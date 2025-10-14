/**
 * AnimalSystem.js - Main system for managing all animals
 * 
 * Handles:
 * - Spawning animals based on time/biome/season
 * - Updating all animals each frame
 * - Collision detection (spear hits, player contact)
 * - Harvesting loot
 * - Respawn timers
 */

import * as THREE from 'three';
import { Animal } from './animals/Animal.js';
import { animalConfigs } from './animals/configs.js';

export class AnimalSystem {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;
        
        // Active animals in world
        this.animals = []; // Array of Animal instances
        
        // Spawn tracking (per chunk)
        this.chunkAnimalCounts = new Map(); // Map<chunkKey, Map<animalType, count>>
        
        // Respawn queue
        this.respawnQueue = []; // { type, position, spawnTime }
        
        // Time tracking
        this.lastSpawnCheck = 0;
        this.spawnCheckInterval = 5; // Check every 5 seconds
        
        console.log('🐰 AnimalSystem initialized');
    }
    
    /**
     * Update all animals (call every frame)
     */
    update(delta) {
        const playerPosition = new THREE.Vector3(
            this.voxelWorld.player.position.x,
            this.voxelWorld.player.position.y,
            this.voxelWorld.player.position.z
        );
        
        // Update each animal
        for (let i = this.animals.length - 1; i >= 0; i--) {
            const animal = this.animals[i];
            
            // Remove if too far from player
            const distance = animal.position.distanceTo(playerPosition);
            if (distance > 150) {
                console.log(`🚫 Despawning ${animal.type} (too far: ${distance.toFixed(0)} blocks)`);
                animal.destroy();
                this.animals.splice(i, 1);
                continue;
            }
            
            // Update animal
            animal.update(delta, playerPosition);
            
            // Check for aggressive animal contact with player
            if (animal.config.aggressive && animal.state === 'attack' && animal.stateTimer < 0.1) {
                // Only deal damage once per attack
                if (distance < 2) {
                    // Use PlayerHP system to deal damage
                    if (this.voxelWorld.playerHP) {
                        this.voxelWorld.playerHP.takeDamage(animal.config.damage);
                    }
                    this.voxelWorld.updateStatus(`💥 ${animal.config.name} attacked you! -${animal.config.damage} HP`, 'error');
                }
            }
        }
        
        // Check for spawning
        this.lastSpawnCheck += delta;
        if (this.lastSpawnCheck >= this.spawnCheckInterval) {
            this.lastSpawnCheck = 0;
            this.checkSpawning();
        }
        
        // Check respawn queue
        this.checkRespawnQueue();
    }
    
    /**
     * Check if animals should spawn in nearby chunks
     */
    checkSpawning() {
        const playerChunkX = Math.floor(this.voxelWorld.player.position.x / 8);
        const playerChunkZ = Math.floor(this.voxelWorld.player.position.z / 8);
        const currentTime = this.voxelWorld.getTimeOfDay();
        const currentSeason = this.voxelWorld.currentSeason || 'spring';
        
        // Check chunks around player
        const chunkRadius = 3; // Check 3 chunks around player
        for (let dx = -chunkRadius; dx <= chunkRadius; dx++) {
            for (let dz = -chunkRadius; dz <= chunkRadius; dz++) {
                const chunkX = playerChunkX + dx;
                const chunkZ = playerChunkZ + dz;
                
                // Try spawning each animal type
                Object.values(animalConfigs).forEach(config => {
                    this.trySpawnAnimal(config, chunkX, chunkZ, currentTime, currentSeason);
                });
            }
        }
    }
    
    /**
     * Try to spawn an animal in a chunk
     */
    trySpawnAnimal(config, chunkX, chunkZ, currentTime, currentSeason) {
        // Check time of day
        if (!config.spawnTimeOfDay.includes(currentTime)) {
            return;
        }
        
        // Check chunk limit
        const chunkKey = `${chunkX},${chunkZ}`;
        if (!this.chunkAnimalCounts.has(chunkKey)) {
            this.chunkAnimalCounts.set(chunkKey, new Map());
        }
        
        const chunkCounts = this.chunkAnimalCounts.get(chunkKey);
        const currentCount = chunkCounts.get(config.id) || 0;
        
        if (currentCount >= config.maxPerChunk) {
            return; // Already at limit
        }
        
        // Apply seasonal multiplier to spawn chance
        const seasonalMult = config.seasonalMultiplier[currentSeason] || 1.0;
        const spawnChance = 0.1 * seasonalMult; // 10% base chance * seasonal
        
        if (Math.random() > spawnChance) {
            return; // Failed spawn roll
        }
        
        // Find valid spawn position in chunk
        const worldX = chunkX * 8 + Math.floor(Math.random() * 8);
        const worldZ = chunkZ * 8 + Math.floor(Math.random() * 8);
        
        // Get ground height
        const groundY = this.voxelWorld.getGroundHeight(worldX, worldZ);
        
        if (groundY === null || groundY < 0) {
            return; // Invalid spawn location
        }
        
        // Check biome (simplified - you may want to add biome detection)
        // For now, assume all biomes are valid
        
        // Spawn the animal!
        this.spawnAnimal(config.id, new THREE.Vector3(worldX, groundY, worldZ), chunkKey);
    }
    
    /**
     * Spawn an animal at a specific position
     */
    spawnAnimal(type, position, chunkKey = null) {
        const config = animalConfigs[type];
        if (!config) {
            console.warn(`⚠️ Unknown animal type: ${type}`);
            return null;
        }
        
        // Convert plain object to Vector3 if needed
        let vec3Position;
        if (position.x !== undefined && position.y !== undefined && position.z !== undefined) {
            if (position.clone) {
                // Already a Vector3
                vec3Position = position;
            } else {
                // Plain object, convert to Vector3
                vec3Position = new THREE.Vector3(position.x, position.y, position.z);
            }
        } else {
            console.warn(`⚠️ Invalid position for animal spawn:`, position);
            return null;
        }
        
        // 🌍 Adjust Y position to ground level
        const groundY = this.voxelWorld.getGroundHeight(
            Math.floor(vec3Position.x),
            Math.floor(vec3Position.z)
        );
        if (groundY !== null && groundY > 0) {
            vec3Position.y = groundY;
        }
        
        // Create animal instance
        const animal = new Animal(type, config, vec3Position, this.voxelWorld);
        this.animals.push(animal);
        
        // Update chunk count
        if (chunkKey) {
            if (!this.chunkAnimalCounts.has(chunkKey)) {
                this.chunkAnimalCounts.set(chunkKey, new Map());
            }
            const chunkCounts = this.chunkAnimalCounts.get(chunkKey);
            chunkCounts.set(type, (chunkCounts.get(type) || 0) + 1);
        }
        
        console.log(`🐰 Spawned ${type} at (${position.x.toFixed(0)}, ${position.y.toFixed(0)}, ${position.z.toFixed(0)})`);
        
        // Tutorial hook - first animal spawn (especially rabbits)
        if (this.voxelWorld.tutorialSystem) {
            this.voxelWorld.tutorialSystem.onAnimalSpawn(type);
        }
        
        return animal;
    }
    
    /**
     * Check respawn queue for animals ready to respawn
     */
    checkRespawnQueue() {
        const currentTime = Date.now();
        
        for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
            const entry = this.respawnQueue[i];
            
            if (currentTime >= entry.spawnTime) {
                // Respawn the animal
                this.spawnAnimal(entry.type, entry.position);
                this.respawnQueue.splice(i, 1);
            }
        }
    }
    
    /**
     * Handle spear hitting an animal
     */
    hitAnimal(animal, damage = 1) {
        if (!animal || !animal.userData.isAnimal) {
            return;
        }
        
        const animalInstance = animal.userData.animalInstance;
        if (!animalInstance) {
            return;
        }
        
        animalInstance.takeDamage(damage);
        
        if (animalInstance.state === 'hunted') {
            this.voxelWorld.showMessage(`💀 You hunted a ${animalInstance.config.name}!`);
            
            // Queue respawn
            this.queueRespawn(animalInstance);
        } else {
            this.voxelWorld.showMessage(`🎯 Hit ${animalInstance.config.name}! (${animalInstance.health} HP left)`);
        }
    }
    
    /**
     * Harvest a hunted animal (left-click)
     */
    harvestAnimal(animal) {
        if (!animal || !animal.userData.isAnimal) {
            return [];
        }
        
        const animalInstance = animal.userData.animalInstance;
        if (!animalInstance) {
            return [];
        }
        
        if (animalInstance.state !== 'hunted') {
            this.voxelWorld.showMessage(`⚠️ You can't harvest a living ${animalInstance.config.name}!`);
            return [];
        }
        
        // Get loot
        const loot = animalInstance.harvest();
        
        // Remove from active animals
        const index = this.animals.indexOf(animalInstance);
        if (index !== -1) {
            this.animals.splice(index, 1);
        }
        
        // Show message
        if (loot.length > 0) {
            const lootText = loot.map(item => item.replace(/_/g, ' ')).join(', ');
            this.voxelWorld.showMessage(`🎁 Harvested: ${lootText}`);
        }
        
        return loot;
    }
    
    /**
     * Queue an animal for respawn
     */
    queueRespawn(animalInstance) {
        const respawnTime = Date.now() + (animalInstance.config.respawnInterval * 1000);
        
        this.respawnQueue.push({
            type: animalInstance.type,
            position: animalInstance.position.clone(),
            spawnTime: respawnTime
        });
        
        console.log(`⏰ ${animalInstance.type} will respawn in ${animalInstance.config.respawnInterval}s`);
    }
    
    /**
     * Get all animals (for debugging)
     */
    getAnimals() {
        return this.animals;
    }
    
    /**
     * Clear all animals (for cleanup)
     */
    clearAll() {
        this.animals.forEach(animal => animal.destroy());
        this.animals = [];
        this.chunkAnimalCounts.clear();
        this.respawnQueue = [];
        
        console.log('🧹 All animals cleared');
    }
}
