/**
 * 🗡️ SPEAR THROWING SYSTEM
 * 
 * Handles spear projectile mechanics:
 * - Throw spear at target location (uses existing trajectory animation)
 * - Spear sticks in ground as billboard
 * - Player can pick up thrown spears
 * - No durability - spears are reusable
 */

import * as THREE from 'three';

export class SpearSystem {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;
        this.thrownSpears = []; // Array of {mesh, position, chunkKey}
        this.pickupDistance = 2; // Blocks away to pick up
        
        // 🎯 CHARGING MECHANIC
        this.isCharging = false;
        this.chargeStartTime = 0;
        this.maxChargeDuration = 2000; // 2 seconds max charge
        this.chargeIndicator = null; // Visual indicator
        
        console.log('🗡️ SpearSystem initialized');
    }

    /**
     * Start charging a spear throw
     */
    startCharging() {
        const selectedSlot = this.voxelWorld.hotbarSystem.getSelectedSlot();
        const selectedItem = selectedSlot?.itemType;

        // Check if holding a spear
        const isSpear = selectedItem === 'stone_spear' || 
                       selectedItem === 'crafted_stone_spear';

        if (!isSpear || selectedSlot.quantity < 1) {
            return false;
        }

        this.isCharging = true;
        this.chargeStartTime = Date.now();
        
        // Show charge indicator
        if (this.voxelWorld.staminaSystem) {
            this.voxelWorld.staminaSystem.showChargeIndicator();
        }
        
        console.log('🗡️ Started charging spear throw...');
        
        return true;
    }

    /**
     * Release charged throw
     */
    releaseThrow(targetPos) {
        if (!this.isCharging) {
            return false;
        }

        const chargeDuration = Date.now() - this.chargeStartTime;
        const chargePercent = Math.min(chargeDuration / this.maxChargeDuration, 1.0);
        
        // Power scaling: 0.5x to 2.0x distance
        const power = 0.5 + (chargePercent * 1.5);
        
        // Stamina cost: 5 base + (charge% * 15) = 5 to 20 stamina
        const staminaCost = Math.floor(5 + (chargePercent * 15));

        this.isCharging = false;
        
        // Hide charge indicator
        if (this.voxelWorld.staminaSystem) {
            this.voxelWorld.staminaSystem.hideChargeIndicator();
        }
        
        console.log(`🗡️ Released throw: ${(chargePercent * 100).toFixed(0)}% charge, ${power.toFixed(1)}x power, ${staminaCost} stamina`);
        
        // Check stamina
        if (this.voxelWorld.staminaSystem && this.voxelWorld.staminaSystem.currentStamina < staminaCost) {
            this.voxelWorld.updateStatus('❌ Not enough stamina to throw!', 'error');
            return false;
        }

        // Throw with power multiplier
        this.throwSpear(targetPos, power, staminaCost);
        
        return true;
    }

    /**
     * Cancel charging (if player switches items, etc.)
     */
    cancelCharging() {
        if (this.isCharging) {
            this.isCharging = false;
            console.log('🗡️ Spear throw cancelled');
        }
    }

    /**
     * Throw a spear from player position to target
     * @param {Object} targetPos - {x, y, z} target position
     * @param {number} power - Power multiplier (0.5 to 2.0)
     * @param {number} staminaCost - Stamina to consume
     */
    throwSpear(targetPos, power = 1.0, staminaCost = 5) {
        const selectedSlot = this.voxelWorld.hotbarSystem.getSelectedSlot();
        const selectedItem = selectedSlot?.itemType; // FIX: Use itemType not type!

        // Check if holding a spear
        const isSpear = selectedItem === 'stone_spear' || 
                       selectedItem === 'crafted_stone_spear';

        if (!isSpear) {
            this.voxelWorld.updateStatus('❌ No spear equipped!', 'error');
            return false;
        }

        if (selectedSlot.quantity < 1) {
            this.voxelWorld.updateStatus('❌ No spears left!', 'error');
            return false;
        }

        // Get player position (eye level for throwing)
        const startPos = {
            x: this.voxelWorld.camera.position.x,
            y: this.voxelWorld.camera.position.y,
            z: this.voxelWorld.camera.position.z
        };

        // Apply power multiplier to target distance
        const direction = {
            x: targetPos.x - startPos.x,
            y: targetPos.y - startPos.y,
            z: targetPos.z - startPos.z
        };

        // Extend target position based on power
        const poweredTarget = {
            x: startPos.x + (direction.x * power),
            y: startPos.y + (direction.y * power),
            z: startPos.z + (direction.z * power)
        };

        // Create spear projectile billboard
        const spearMesh = this.createSpearProjectile(startPos);

        const distance = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
        console.log(`🗡️ Throwing spear with ${power.toFixed(1)}x power (${distance.toFixed(1)} → ${(distance * power).toFixed(1)} blocks), -${staminaCost} stamina`);

        // Use grappling hook animation for trajectory!
        this.voxelWorld.animationSystem.animateProjectile(
            startPos,
            poweredTarget, // Use powered target instead
            0.6, // Duration (faster than grapple)
            (progress, currentPos) => {
                // Update spear position along curve
                spearMesh.position.set(currentPos.x, currentPos.y, currentPos.z);
                
                // 🐰 Check for animal collision during flight
                if (this.voxelWorld.animalSystem && progress > 0.1) {
                    const spearPos = new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z);
                    const animals = this.voxelWorld.animalSystem.getAnimals();
                    
                    for (const animal of animals) {
                        if (!animal.alive || animal.state === 'hunted') continue;
                        
                        const distance = spearPos.distanceTo(animal.position);
                        if (distance < 1.5) { // Hit detection range
                            // HIT!
                            this.voxelWorld.animalSystem.hitAnimal(animal.billboard, 1);
                            
                            // Stop animation early, spear lands where animal was
                            this.stickSpearInGround(spearMesh, {
                                x: animal.position.x,
                                y: animal.position.y,
                                z: animal.position.z
                            }, selectedItem);
                            
                            console.log(`🎯 Spear hit ${animal.type}!`);
                            return true; // Stop animation callback
                        }
                    }
                }
                
                // Make spear point in direction of travel (optional rotation)
                if (progress > 0.01) {
                    const prevPos = spearMesh.userData.prevPos || startPos;
                    const direction = new THREE.Vector3(
                        currentPos.x - prevPos.x,
                        currentPos.y - prevPos.y,
                        currentPos.z - prevPos.z
                    ).normalize();
                    
                    // Rotate spear to point forward
                    spearMesh.lookAt(
                        spearMesh.position.x + direction.x,
                        spearMesh.position.y + direction.y,
                        spearMesh.position.z + direction.z
                    );
                    spearMesh.rotateX(Math.PI / 2); // Adjust for billboard orientation
                }
                
                spearMesh.userData.prevPos = {...currentPos};
            },
            () => {
                // On complete: Stick spear in ground (use powered target)
                this.stickSpearInGround(spearMesh, poweredTarget, selectedItem);
            }
        );

        // Consume stamina
        if (this.voxelWorld.staminaSystem) {
            this.voxelWorld.staminaSystem.currentStamina = Math.max(
                0, 
                this.voxelWorld.staminaSystem.currentStamina - staminaCost
            );
        }

        // Remove spear from inventory (will be picked up later)
        selectedSlot.quantity--;
        
        // Clear slot if empty
        if (selectedSlot.quantity === 0) {
            selectedSlot.itemType = '';
        }
        
        this.voxelWorld.updateHotbarCounts();
        this.voxelWorld.updateStatus(`🗡️ Spear thrown! (-${staminaCost} stamina)`, 'action');

        return true;
    }

    /**
     * Create a spear billboard projectile
     */
    createSpearProjectile(position) {
        // Use cached texture or create new one
        const textureKey = 'stone_spear';
        let texture;

        // Check if cache exists first (it's initialized in VoxelWorld constructor)
        if (this.voxelWorld.billboardTextureCache && this.voxelWorld.billboardTextureCache.has(textureKey)) {
            texture = this.voxelWorld.billboardTextureCache.get(textureKey);
        } else {
            texture = new THREE.TextureLoader().load('assets/art/tools/stone_spear.png');
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            
            // Cache if possible
            if (this.voxelWorld.billboardTextureCache) {
                this.voxelWorld.billboardTextureCache.set(textureKey, texture);
            }
        }

        // Create billboard (vertical plane)
        const geometry = new THREE.PlaneGeometry(0.4, 1.2); // Thin and tall
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.1,
            side: THREE.DoubleSide
        });

        const spearMesh = new THREE.Mesh(geometry, material);
        spearMesh.position.set(position.x, position.y, position.z);
        spearMesh.userData.isSpear = true;
        spearMesh.userData.prevPos = position;

        this.voxelWorld.scene.add(spearMesh);
        return spearMesh;
    }

    /**
     * Stick spear in ground at target position
     */
    stickSpearInGround(spearMesh, targetPos, spearType) {
        // Position spear at ground level, slightly raised
        const groundY = Math.floor(targetPos.y) + 0.6; // Stick out of ground
        spearMesh.position.set(
            targetPos.x,
            groundY,
            targetPos.z
        );

        // Tilt spear slightly (45 degrees)
        spearMesh.rotation.set(Math.PI / 4, 0, 0);

        // Make it always face camera and harvestable like world items
        spearMesh.userData.isBillboard = true;
        spearMesh.userData.type = 'worldItem'; // Make it harvestable!
        spearMesh.userData.itemType = spearType;
        spearMesh.userData.quantity = 1;

        // Store in thrown spears array for tracking/cleanup
        const chunkX = Math.floor(targetPos.x / 16);
        const chunkZ = Math.floor(targetPos.z / 16);
        const chunkKey = `${chunkX},${chunkZ}`;

        this.thrownSpears.push({
            mesh: spearMesh,
            position: {x: targetPos.x, y: groundY, z: targetPos.z},
            chunkKey: chunkKey,
            spearType: spearType
        });

        console.log(`🗡️ Spear stuck in ground at (${targetPos.x.toFixed(1)}, ${groundY.toFixed(1)}, ${targetPos.z.toFixed(1)}) - Chunk ${chunkKey}`);
    }

    /**
     * Update spear billboards and charge indicator
     * Call this in main update loop
     */
    update() {
        // Update charge indicator
        if (this.isCharging) {
            const chargeDuration = Date.now() - this.chargeStartTime;
            const chargePercent = Math.min(chargeDuration / this.maxChargeDuration, 1.0);
            const power = 0.5 + (chargePercent * 1.5);
            const staminaCost = Math.floor(5 + (chargePercent * 15));
            
            // Update visual charge bar
            if (this.voxelWorld.staminaSystem) {
                this.voxelWorld.staminaSystem.updateChargeIndicator(chargePercent, power, staminaCost);
            }
        }
        
        if (this.thrownSpears.length === 0) return;

        const playerPos = this.voxelWorld.camera.position;

        // Update billboard orientation for all thrown spears
        for (let i = this.thrownSpears.length - 1; i >= 0; i--) {
            const spear = this.thrownSpears[i];

            // Billboard effect - always face camera
            if (spear.mesh.userData.isBillboard) {
                spear.mesh.lookAt(playerPos);
                spear.mesh.rotateX(Math.PI / 4); // Keep the tilt
            }
        }
    }

    /**
     * Remove a spear from tracking when harvested
     * Called by VoxelWorld when spear is harvested like a world item
     */
    removeSpear(spearMesh) {
        const index = this.thrownSpears.findIndex(s => s.mesh === spearMesh);
        if (index !== -1) {
            this.thrownSpears.splice(index, 1);
            console.log(`🗡️ Spear harvested! ${this.thrownSpears.length} spears remaining in world`);
        }
    }

    /**
     * Remove spears from unloaded chunks (cleanup)
     */
    cleanupUnloadedChunks(activeChunks) {
        for (let i = this.thrownSpears.length - 1; i >= 0; i--) {
            const spear = this.thrownSpears[i];
            if (!activeChunks.has(spear.chunkKey)) {
                // Chunk unloaded, remove spear (could save to disk in future)
                this.voxelWorld.scene.remove(spear.mesh);
                spear.mesh.geometry.dispose();
                spear.mesh.material.dispose();
                this.thrownSpears.splice(i, 1);
                console.log(`🗡️ Removed spear from unloaded chunk ${spear.chunkKey}`);
            }
        }
    }
}
