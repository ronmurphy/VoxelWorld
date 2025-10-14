/**
 * Animal.js - Base class for all huntable animals
 * 
 * Handles:
 * - State machine (rest, move, flee, hunted)
 * - Animation cycling
 * - Billboard rendering
 * - Movement/pathfinding
 */

import * as THREE from 'three';

export class Animal {
    constructor(type, config, position, voxelWorld) {
        this.type = type;
        this.config = config;
        this.voxelWorld = voxelWorld;
        
        // Position
        this.position = position.clone();
        this.velocity = new THREE.Vector3();
        
        // State
        this.state = 'rest'; // rest, move, flee, charge, attack, hunted
        this.health = config.health;
        this.alive = true;
        
        // 🐰⚔️ KILLER RABBIT OF CAERBANNOG (5% chance for tree rabbits)
        this.isKillerRabbit = false;
        this.climbedTree = false;
        if (type === 'rabbit' && Math.random() < 0.05) {
            this.isKillerRabbit = true;
            // Killer rabbits are aggressive!
            this.config = {...config}; // Clone config
            this.config.aggressive = true;
            this.config.aggroDistance = 20; // Attacks from further away
            this.config.chargeSpeed = 0.4; // Faster charge
            this.config.damage = 10; // Actually dangerous!
            console.log('⚔️🐰 KILLER RABBIT OF CAERBANNOG SPAWNED! "Run away!"');
        }
        
        // Timers
        this.stateTimer = 0;
        this.restDuration = 3 + Math.random() * 4; // 3-7 seconds
        this.moveDuration = 2 + Math.random() * 3; // 2-5 seconds
        this.animationTimer = 0;
        this.animationFrame = 0;
        
        // Movement
        this.moveTarget = null;
        this.moveDirection = new THREE.Vector3();
        
        // Animation
        this.currentAnimations = [];
        this.billboard = null;
        
        // Create initial billboard
        this.createBillboard();
    }
    
    /**
     * Create billboard sprite for this animal
     */
    createBillboard() {
        // Get first animation frame (rest)
        const texturePath = this.getTextureForState();
        
        // Load texture via EnhancedGraphics
        const texture = this.voxelWorld.enhancedGraphics.loadEntityTexture(texturePath);
        
        if (!texture) {
            console.warn(`⚠️ Could not load texture: ${texturePath}`);
            return;
        }
        
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.1,
            sizeAttenuation: true
        });
        
        const sprite = new THREE.Sprite(material);
        sprite.position.copy(this.position);
        sprite.position.y += 0.5; // Float above ground
        sprite.scale.set(1.0, 1.0, 1.0);
        
        // Store reference
        sprite.userData = {
            type: 'animal',
            animalType: this.type,
            animalInstance: this,
            isAnimal: true,
            config: {
                float: false,
                rotate: false
            }
        };
        
        this.billboard = sprite;
        this.voxelWorld.scene.add(sprite);
        
        return sprite;
    }
    
    /**
     * Get texture path for current state
     */
    getTextureForState() {
        const animations = this.config.animations;
        
        switch (this.state) {
            case 'rest':
                return `animals/${animations.rest}`;
                
            case 'move':
            case 'flee':
                // Cycle between move frames
                const moveFrames = animations.move;
                if (Array.isArray(moveFrames)) {
                    const frame = moveFrames[this.animationFrame % moveFrames.length];
                    return `animals/${frame}`;
                }
                return `animals/${animations.move}`;
                
            case 'charge':
                if (animations.charge) {
                    const chargeFrames = animations.charge;
                    if (Array.isArray(chargeFrames)) {
                        const frame = chargeFrames[this.animationFrame % chargeFrames.length];
                        return `animals/${frame}`;
                    }
                    return `animals/${animations.charge}`;
                }
                // Fallback to move animation
                return `animals/${animations.move[0] || animations.move}`;
                
            case 'attack':
                if (animations.attack) {
                    return `animals/${animations.attack}`;
                }
                return `animals/${animations.rest}`;
                
            case 'hunted':
                return `animals/${animations.hunted}`;
                
            default:
                return `animals/${animations.rest}`;
        }
    }
    
    /**
     * Update animal (called every frame)
     */
    update(delta, playerPosition) {
        if (!this.alive || this.state === 'hunted') {
            return;
        }
        
        // Update state timer
        this.stateTimer += delta;
        
        // Update animation
        this.updateAnimation(delta);
        
        // Calculate distance to player
        const distanceToPlayer = this.position.distanceTo(playerPosition);
        
        // State machine
        switch (this.state) {
            case 'rest':
                this.updateRest(delta, distanceToPlayer, playerPosition);
                break;
                
            case 'move':
                this.updateMove(delta, distanceToPlayer, playerPosition);
                break;
                
            case 'flee':
                this.updateFlee(delta, distanceToPlayer, playerPosition);
                break;
                
            case 'charge':
                this.updateCharge(delta, distanceToPlayer, playerPosition);
                break;
                
            case 'attack':
                this.updateAttack(delta);
                break;
        }
        
        // 🌍 Apply gravity and collision detection
        this.applyPhysics(delta);
        
        // Apply velocity
        this.position.add(this.velocity);
        
        // Update billboard position
        if (this.billboard) {
            this.billboard.position.set(
                this.position.x,
                this.position.y + 0.5,
                this.position.z
            );
        }
        
        // Clamp velocity
        this.velocity.multiplyScalar(0.9);
    }
    
    /**
     * Apply gravity and collision detection
     */
    applyPhysics(delta) {
        // Apply gravity
        const gravity = -9.8 * delta;
        this.velocity.y += gravity;
        
        // Check ground collision
        const groundY = this.voxelWorld.getGroundHeight(
            Math.floor(this.position.x),
            Math.floor(this.position.z)
        );
        
        if (this.position.y <= groundY) {
            this.position.y = groundY;
            this.velocity.y = 0; // Stop falling
        }
        
        // Simple collision check with blocks
        const nextX = this.position.x + this.velocity.x;
        const nextZ = this.position.z + this.velocity.z;
        const y = Math.floor(this.position.y);
        
        // Check if next position has a block
        const keyAhead = `${Math.floor(nextX)},${y},${Math.floor(nextZ)}`;
        if (this.voxelWorld.world[keyAhead]) {
            // 🐰⚔️ Killer rabbits can climb trees, normal rabbits cannot
            if (this.isKillerRabbit && !this.climbedTree) {
                // First time climbing - mark it
                this.climbedTree = true;
                // Allow movement into block (tree climbing)
            } else if (!this.isKillerRabbit) {
                // Normal rabbits can't climb - stop movement
                this.velocity.x = 0;
                this.velocity.z = 0;
            }
            // Killer rabbits after first climb also stop (no infinite climbing)
            else if (this.climbedTree) {
                this.velocity.x = 0;
                this.velocity.z = 0;
            }
        }
    }
    
    /**
     * Update rest state
     */
    updateRest(delta, distanceToPlayer, playerPosition) {
        // Check for player approach
        if (this.config.aggressive && distanceToPlayer < this.config.aggroDistance) {
            this.setState('charge');
            return;
        }
        
        if (distanceToPlayer < this.config.fleeDistance) {
            this.setState('flee');
            return;
        }
        
        // Check rest timer
        if (this.stateTimer >= this.restDuration) {
            this.setState('move');
        }
    }
    
    /**
     * Update move state
     */
    updateMove(delta, distanceToPlayer, playerPosition) {
        // Check for player approach
        if (this.config.aggressive && distanceToPlayer < this.config.aggroDistance) {
            this.setState('charge');
            return;
        }
        
        if (distanceToPlayer < this.config.fleeDistance) {
            this.setState('flee');
            return;
        }
        
        // Pick random direction if no target
        if (!this.moveTarget || this.stateTimer >= this.moveDuration) {
            this.setState('rest');
            return;
        }
        
        // Move towards target
        this.moveDirection.copy(this.moveTarget).sub(this.position).normalize();
        this.velocity.add(this.moveDirection.multiplyScalar(this.config.speed * delta));
    }
    
    /**
     * Update flee state
     */
    updateFlee(delta, distanceToPlayer, playerPosition) {
        // Flee away from player
        this.moveDirection.copy(this.position).sub(playerPosition).normalize();
        this.velocity.add(this.moveDirection.multiplyScalar(this.config.fleeSpeed * delta));
        
        // If far enough away, go back to rest
        if (distanceToPlayer > this.config.fleeDistance * 2) {
            this.setState('rest');
        }
    }
    
    /**
     * Update charge state (aggressive animals)
     */
    updateCharge(delta, distanceToPlayer, playerPosition) {
        // Charge towards player
        this.moveDirection.copy(playerPosition).sub(this.position).normalize();
        this.velocity.add(this.moveDirection.multiplyScalar(this.config.chargeSpeed * delta));
        
        // If close enough, attack
        if (distanceToPlayer < 2) {
            this.setState('attack');
        }
        
        // If player escapes, stop charging
        if (distanceToPlayer > this.config.aggroDistance * 2) {
            this.setState('rest');
        }
    }
    
    /**
     * Update attack state
     */
    updateAttack(delta) {
        // Deal damage to player (handled by VoxelWorld)
        if (this.stateTimer < 0.5) {
            // Attack animation playing
            return;
        }
        
        // 🐰⚔️ Killer Rabbit messages
        if (this.isKillerRabbit && this.stateTimer > 0.5) {
            const messages = [
                "🐰💀 Look at the bones!",
                "🐰⚔️ That's no ordinary rabbit!",
                "🐰💀 It's got a vicious streak a mile wide!",
                "🐰⚔️ Run away! Run away!"
            ];
            const msg = messages[Math.floor(Math.random() * messages.length)];
            if (this.voxelWorld.showMessage) {
                this.voxelWorld.showMessage(msg);
            } else {
                console.log(msg);
            }
        }
        
        // After attack, go back to charging
        this.setState('charge');
    }
    
    /**
     * Update animation frames
     */
    updateAnimation(delta) {
        // Only animate in moving states
        if (this.state !== 'move' && this.state !== 'flee' && this.state !== 'charge') {
            return;
        }
        
        this.animationTimer += delta;
        
        if (this.animationTimer >= this.config.animSpeed) {
            this.animationTimer = 0;
            this.animationFrame++;
            
            // Update texture
            this.updateTexture();
        }
    }
    
    /**
     * Update billboard texture
     */
    updateTexture() {
        if (!this.billboard) return;
        
        const texturePath = this.getTextureForState();
        const texture = this.voxelWorld.enhancedGraphics.loadEntityTexture(texturePath);
        
        if (texture) {
            this.billboard.material.map = texture;
            this.billboard.material.needsUpdate = true;
        }
    }
    
    /**
     * Change state
     */
    setState(newState) {
        this.state = newState;
        this.stateTimer = 0;
        this.animationFrame = 0;
        
        // Set new move target when entering move state
        if (newState === 'move') {
            const angle = Math.random() * Math.PI * 2;
            const distance = 5 + Math.random() * 10;
            this.moveTarget = new THREE.Vector3(
                this.position.x + Math.cos(angle) * distance,
                this.position.y,
                this.position.z + Math.sin(angle) * distance
            );
            this.moveDuration = 2 + Math.random() * 3;
        }
        
        // Update texture for new state
        this.updateTexture();
        
        console.log(`🐰 ${this.type} → ${newState}`);
    }
    
    /**
     * Take damage (from spear hit)
     */
    takeDamage(damage) {
        if (this.state === 'hunted' || !this.alive) return;
        
        this.health -= damage;
        
        if (this.health <= 0) {
            this.die();
        } else {
            // Flee if not already fleeing
            if (this.state !== 'flee') {
                this.setState('flee');
            }
        }
    }
    
    /**
     * Animal dies
     */
    die() {
        this.alive = false;
        this.state = 'hunted';
        this.velocity.set(0, 0, 0);
        this.updateTexture();
        
        // 🐰⚔️ Special message for defeating the Killer Rabbit
        if (this.isKillerRabbit) {
            console.log(`⚔️🏆 You've defeated the Killer Rabbit of Caerbannog!`);
            if (this.voxelWorld.showMessage) {
                this.voxelWorld.showMessage("🏆 You've defeated the Killer Rabbit of Caerbannog!");
            }
        } else {
            console.log(`💀 ${this.type} hunted!`);
        }
    }
    
    /**
     * Harvest animal (player left-click)
     * @returns {Array} Loot items
     */
    harvest() {
        if (this.state !== 'hunted') {
            console.warn('⚠️ Cannot harvest living animal!');
            return [];
        }
        
        // Calculate loot
        const loot = [];
        this.config.drops.forEach(drop => {
            if (Math.random() < drop.chance) {
                let amount;
                if (Array.isArray(drop.amount)) {
                    // Random range
                    const [min, max] = drop.amount;
                    amount = Math.floor(min + Math.random() * (max - min + 1));
                } else {
                    amount = drop.amount;
                }
                
                for (let i = 0; i < amount; i++) {
                    loot.push(drop.item);
                }
            }
        });
        
        console.log(`🎁 Harvested ${this.type}:`, loot);
        
        // Remove from world
        this.destroy();
        
        return loot;
    }
    
    /**
     * Remove animal from world
     */
    destroy() {
        if (this.billboard) {
            this.voxelWorld.scene.remove(this.billboard);
            this.billboard.material.dispose();
            if (this.billboard.material.map) {
                this.billboard.material.map.dispose();
            }
            this.billboard = null;
        }
    }
}
