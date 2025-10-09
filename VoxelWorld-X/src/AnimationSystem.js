/**
 * AnimationSystem.js
 * 
 * Centralized animation management system for VoxelWorld
 * Handles trajectory animations, particle effects, and other visual effects
 * 
 * Phase 1: Grappling Hook Trajectory (Bezier curve with apex calculation)
 * Future: Billboard floats, explosions, particles, tree falling, etc.
 */

import * as THREE from 'three';

export class AnimationSystem {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;
        this.activeAnimations = new Map();
        this.animationId = 0;
        
        console.log('✨ AnimationSystem initialized');
    }

    /**
     * Main update loop - called every frame from VoxelWorld
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        // Update all active animations
        for (const [id, animation] of this.activeAnimations.entries()) {
            animation.progress += deltaTime / animation.duration;

            if (animation.progress >= 1.0) {
                // Animation complete
                animation.progress = 1.0;
                animation.onUpdate(animation.progress);
                
                if (animation.onComplete) {
                    animation.onComplete();
                }
                
                this.activeAnimations.delete(id);
                console.log(`✅ Animation ${id} completed`);
            } else {
                // Animation in progress
                animation.onUpdate(animation.progress);
            }
        }
    }

    /**
     * 🕸️ GRAPPLING HOOK: Trajectory animation with bezier curve
     * @param {Object} startPos - Starting position {x, y, z}
     * @param {Object} endPos - Target position {x, y, z}
     * @param {number} duration - Animation duration in seconds (default: 0.8)
     * @param {function} onComplete - Callback when animation completes
     */
    animateGrapplingHook(startPos, endPos, duration = 0.8, onComplete = null) {
        // Calculate apex (highest point of arc)
        const distance = Math.sqrt(
            Math.pow(endPos.x - startPos.x, 2) + 
            Math.pow(endPos.z - startPos.z, 2)
        );
        
        // Apex height: higher for longer distances, minimum 5 blocks above start
        const apexHeight = Math.max(
            Math.max(startPos.y, endPos.y) + 5,
            Math.max(startPos.y, endPos.y) + (distance * 0.3)
        );

        // Bezier curve control point (apex position)
        const apexPos = {
            x: (startPos.x + endPos.x) / 2,
            y: apexHeight,
            z: (startPos.z + endPos.z) / 2
        };

        console.log(`🕸️ Grappling trajectory: Start(${startPos.x.toFixed(1)}, ${startPos.y.toFixed(1)}, ${startPos.z.toFixed(1)}) → Apex(${apexPos.x.toFixed(1)}, ${apexPos.y.toFixed(1)}, ${apexPos.z.toFixed(1)}) → End(${endPos.x.toFixed(1)}, ${endPos.y.toFixed(1)}, ${endPos.z.toFixed(1)})`);

        // 🎨 CREATE TRAJECTORY LINE
        // Generate curve points for smooth line
        const curvePoints = [];
        const segments = 30; // Number of line segments
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const invT = 1 - t;
            const invT2 = invT * invT;
            const t2 = t * t;
            const blend = 2 * invT * t;

            curvePoints.push(new THREE.Vector3(
                invT2 * startPos.x + blend * apexPos.x + t2 * endPos.x,
                invT2 * startPos.y + blend * apexPos.y + t2 * endPos.y,
                invT2 * startPos.z + blend * apexPos.z + t2 * endPos.z
            ));
        }

        const lineGeometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0xaaaaaa,  // Light gray
            linewidth: 2,
            opacity: 0.8,
            transparent: true
        });
        const trajectoryLine = new THREE.Line(lineGeometry, lineMaterial);
        this.voxelWorld.scene.add(trajectoryLine);

        // Create animation
        const animId = this.animationId++;
        this.activeAnimations.set(animId, {
            type: 'grappling_hook',
            progress: 0,
            duration: duration,
            startPos: startPos,
            apexPos: apexPos,
            endPos: endPos,
            trajectoryLine: trajectoryLine,  // Store reference to clean up later
            onUpdate: (progress) => {
                // Quadratic Bezier curve interpolation
                // B(t) = (1-t)² * P0 + 2(1-t)t * P1 + t² * P2
                const t = progress;
                const invT = 1 - t;
                const invT2 = invT * invT;
                const t2 = t * t;
                const blend = 2 * invT * t;

                const currentPos = {
                    x: invT2 * startPos.x + blend * apexPos.x + t2 * endPos.x,
                    y: invT2 * startPos.y + blend * apexPos.y + t2 * endPos.y,
                    z: invT2 * startPos.z + blend * apexPos.z + t2 * endPos.z
                };

                // Update player position
                this.voxelWorld.player.position.x = currentPos.x;
                this.voxelWorld.player.position.y = currentPos.y;
                this.voxelWorld.player.position.z = currentPos.z;

                // Reset velocity to prevent physics interference
                this.voxelWorld.player.velocity = 0;

                // Fade out the line as we approach the target
                trajectoryLine.material.opacity = 0.8 * (1 - progress);

                // Optional: Add camera tilt effect based on trajectory angle
                // TODO: Calculate velocity vector and tilt camera accordingly
            },
            onComplete: () => {
                // Ensure final position is exact
                this.voxelWorld.player.position.x = endPos.x;
                this.voxelWorld.player.position.y = endPos.y;
                this.voxelWorld.player.position.z = endPos.z;
                this.voxelWorld.player.velocity = 0;

                // Clean up trajectory line
                this.voxelWorld.scene.remove(trajectoryLine);
                lineGeometry.dispose();
                lineMaterial.dispose();

                console.log(`🕸️ Grapple complete! Final position: (${endPos.x}, ${endPos.y}, ${endPos.z})`);

                if (onComplete) {
                    onComplete();
                }
            }
        });

        return animId;
    }

    /**
     * Cancel a specific animation
     * @param {number} animationId - Animation ID to cancel
     */
    cancelAnimation(animationId) {
        if (this.activeAnimations.has(animationId)) {
            this.activeAnimations.delete(animationId);
            console.log(`❌ Animation ${animationId} cancelled`);
        }
    }

    /**
     * Cancel all animations
     */
    cancelAllAnimations() {
        this.activeAnimations.clear();
        console.log('❌ All animations cancelled');
    }

    /**
     * Check if any animations are active
     */
    hasActiveAnimations() {
        return this.activeAnimations.size > 0;
    }

    // ============================================
    // FUTURE ANIMATIONS (to be implemented)
    // ============================================

    /**
     * 💥 EXPLOSION: Particle explosion effect
     * TODO: Extract from VoxelWorld.js createExplosionEffect()
     */
    // animateExplosion(position, radius, particleCount) { }

    /**
     * 🎈 BILLBOARD: Floating damage numbers / item pickups
     * TODO: Extract from VoxelWorld.js animateBillboards()
     */
    // animateBillboard(position, text, color, duration) { }

    /**
     * ✨ PARTICLES: Particle effects (mining, crafting, etc.)
     * TODO: Extract from VoxelWorld.js animateParticleEffects()
     */
    // animateParticles(position, type, count) { }

    /**
     * 🌲 TREE FALL: Tree falling animation with physics
     * TODO: Extract from VoxelWorld.js (search for "TIMBER")
     */
    // animateTreeFall(treeBlocks, direction) { }
}
