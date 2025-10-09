/**
 * CombatantSprite.js
 *
 * 3D sprite wrapper for battle companions and enemies
 * Manages sprite animations, HP display, and battle behaviors
 */

import * as THREE from 'three';

export class CombatantSprite {
    constructor(scene, entityData, entityId, isPlayer = false) {
        this.scene = scene;
        this.entityData = entityData;
        this.entityId = entityId;
        this.isPlayer = isPlayer;

        // Sprite objects
        this.sprite = null;
        this.hpBarSprite = null;

        // Combat stats
        this.currentHP = entityData.hp;
        this.maxHP = entityData.hp;
        this.name = entityData.name;

        // Position and movement
        this.position = new THREE.Vector3();
        this.targetPosition = new THREE.Vector3();
        this.rotation = 0;

        // Animation state
        this.currentPose = 'ready'; // 'ready' or 'attack'
        this.isAnimating = false;

        console.log(`🎭 CombatantSprite created: ${this.name} (HP: ${this.currentHP}/${this.maxHP})`);
    }

    /**
     * Create the sprite and add to scene
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} z - Z position
     */
    createSprite(x, y, z) {
        // Load ready pose texture
        const readyTexture = new THREE.TextureLoader().load(`art/entities/${this.entityData.sprite_ready}`);
        readyTexture.magFilter = THREE.LinearFilter;
        readyTexture.minFilter = THREE.LinearFilter;

        // Create sprite material
        const material = new THREE.SpriteMaterial({
            map: readyTexture,
            transparent: true,
            opacity: 1.0,
        });

        // Create sprite (2 blocks tall for visibility)
        this.sprite = new THREE.Sprite(material);
        this.sprite.scale.set(2.0, 2.0, 1);
        this.sprite.position.set(x, y, z);

        this.position.copy(this.sprite.position);
        this.scene.add(this.sprite);

        // Create HP bar above sprite
        this.createHPBar();

        console.log(`🎭 Sprite spawned at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})`);
    }

    /**
     * Create HP bar billboard above sprite
     */
    createHPBar() {
        // Create canvas for HP bar
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // Draw HP bar background
        ctx.fillStyle = '#4A3728';
        ctx.fillRect(0, 0, 256, 64);

        // Draw HP bar border
        ctx.strokeStyle = '#8B7355';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, 256, 64);

        // Draw HP fill
        const hpPercent = (this.currentHP / this.maxHP);
        const fillWidth = 246 * hpPercent;
        ctx.fillStyle = this.getHPColor(hpPercent * 100);
        ctx.fillRect(5, 5, fillWidth, 54);

        // Draw name label
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 20px Georgia';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.name, 128, 20);

        // Draw HP text
        ctx.font = '16px Georgia';
        ctx.fillText(`${this.currentHP}/${this.maxHP}`, 128, 45);

        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;

        // Create HP bar sprite
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
        });

        this.hpBarSprite = new THREE.Sprite(material);
        this.hpBarSprite.scale.set(1.5, 0.4, 1);

        // Position above main sprite
        this.hpBarSprite.position.copy(this.sprite.position);
        this.hpBarSprite.position.y += 1.5;

        this.scene.add(this.hpBarSprite);
    }

    /**
     * Get HP bar color based on percentage
     */
    getHPColor(hpPercent) {
        if (hpPercent > 50) {
            return '#4CAF50'; // Green
        } else if (hpPercent > 25) {
            return '#FFC107'; // Yellow
        } else {
            return '#F44336'; // Red
        }
    }

    /**
     * Update HP and refresh HP bar
     */
    updateHP(newHP) {
        this.currentHP = Math.max(0, Math.min(newHP, this.maxHP));

        // Redraw HP bar
        if (this.hpBarSprite) {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');

            // Draw HP bar background
            ctx.fillStyle = '#4A3728';
            ctx.fillRect(0, 0, 256, 64);

            // Draw HP bar border
            ctx.strokeStyle = '#8B7355';
            ctx.lineWidth = 4;
            ctx.strokeRect(0, 0, 256, 64);

            // Draw HP fill
            const hpPercent = (this.currentHP / this.maxHP);
            const fillWidth = 246 * hpPercent;
            ctx.fillStyle = this.getHPColor(hpPercent * 100);
            ctx.fillRect(5, 5, fillWidth, 54);

            // Draw name label
            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 20px Georgia';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.name, 128, 20);

            // Draw HP text
            ctx.font = '16px Georgia';
            ctx.fillText(`${this.currentHP}/${this.maxHP}`, 128, 45);

            // Update texture
            const oldTexture = this.hpBarSprite.material.map;
            this.hpBarSprite.material.map = new THREE.CanvasTexture(canvas);
            this.hpBarSprite.material.needsUpdate = true;

            if (oldTexture) {
                oldTexture.dispose();
            }
        }
    }

    /**
     * Switch to attack pose
     */
    showAttackPose() {
        if (!this.entityData.sprite_attack) return;

        const attackTexture = new THREE.TextureLoader().load(`art/entities/${this.entityData.sprite_attack}`);
        attackTexture.magFilter = THREE.LinearFilter;
        attackTexture.minFilter = THREE.LinearFilter;

        const oldTexture = this.sprite.material.map;
        this.sprite.material.map = attackTexture;
        this.sprite.material.needsUpdate = true;

        if (oldTexture) {
            oldTexture.dispose();
        }

        this.currentPose = 'attack';
    }

    /**
     * Switch to ready pose
     */
    showReadyPose() {
        const readyTexture = new THREE.TextureLoader().load(`art/entities/${this.entityData.sprite_ready}`);
        readyTexture.magFilter = THREE.LinearFilter;
        readyTexture.minFilter = THREE.LinearFilter;

        const oldTexture = this.sprite.material.map;
        this.sprite.material.map = readyTexture;
        this.sprite.material.needsUpdate = true;

        if (oldTexture) {
            oldTexture.dispose();
        }

        this.currentPose = 'ready';
    }

    /**
     * Move sprite to target position over time
     */
    moveTo(x, y, z) {
        this.targetPosition.set(x, y, z);
    }

    /**
     * Update sprite position (lerp toward target)
     */
    update(deltaTime) {
        // Smooth movement toward target
        this.sprite.position.lerp(this.targetPosition, deltaTime * 5);
        this.position.copy(this.sprite.position);

        // Update HP bar position to follow sprite
        if (this.hpBarSprite) {
            this.hpBarSprite.position.copy(this.sprite.position);
            this.hpBarSprite.position.y += 1.5;
        }
    }

    /**
     * Flash red when hit
     */
    flashDamage() {
        // Store original color
        const originalColor = this.sprite.material.color.getHex();

        // Flash red
        this.sprite.material.color.setHex(0xFF0000);

        // Return to normal after 200ms
        setTimeout(() => {
            this.sprite.material.color.setHex(originalColor);
        }, 200);
    }

    /**
     * Play victory animation
     */
    playVictory() {
        // Bounce animation
        const originalY = this.sprite.position.y;
        let bounceTime = 0;
        const bounceInterval = setInterval(() => {
            bounceTime += 0.05;
            this.sprite.position.y = originalY + Math.sin(bounceTime * 10) * 0.3;

            if (bounceTime > 1) {
                clearInterval(bounceInterval);
                this.sprite.position.y = originalY;
            }
        }, 50);

        // Scale up slightly
        this.sprite.scale.set(2.2, 2.2, 1);
    }

    /**
     * Play defeat animation (fade out)
     */
    playDefeat() {
        let opacity = 1.0;
        const fadeInterval = setInterval(() => {
            opacity -= 0.05;
            this.sprite.material.opacity = opacity;

            if (opacity <= 0) {
                clearInterval(fadeInterval);
                this.destroy();
            }
        }, 50);
    }

    /**
     * Remove sprite from scene
     */
    destroy() {
        if (this.sprite) {
            this.scene.remove(this.sprite);
            this.sprite.material.dispose();
            this.sprite.material.map.dispose();
            this.sprite = null;
        }

        if (this.hpBarSprite) {
            this.scene.remove(this.hpBarSprite);
            this.hpBarSprite.material.dispose();
            this.hpBarSprite.material.map.dispose();
            this.hpBarSprite = null;
        }

        console.log(`🎭 CombatantSprite destroyed: ${this.name}`);
    }
}
