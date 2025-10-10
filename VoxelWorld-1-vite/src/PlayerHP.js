/**
 * PlayerHP.js
 *
 * Player health system for battle arena
 * Displays hearts on HUD, handles damage, and respawn on defeat
 */

export class PlayerHP {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;

        // Health settings
        this.maxHP = 3; // 3 hearts
        this.currentHP = 3;

        // Damage cooldown (prevent rapid damage)
        this.invulnerable = false;
        this.invulnerabilityDuration = 1000; // 1 second

        // HUD elements
        this.heartContainer = null;
        this.hearts = [];

        // Create HUD
        this.createHeartDisplay();

        console.log('❤️ PlayerHP system initialized: 3/3 hearts');
    }

    /**
     * Create heart HUD display
     */
    createHeartDisplay() {
        // Create container div
        this.heartContainer = document.createElement('div');
        this.heartContainer.id = 'player-hearts';
        this.heartContainer.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 8px;
            font-size: 32px;
            z-index: 1000;
            filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.5));
            pointer-events: none;
        `;

        // Create 3 heart elements
        for (let i = 0; i < this.maxHP; i++) {
            const heart = document.createElement('span');
            heart.textContent = '❤️'; // Red heart emoji
            heart.style.cssText = `
                display: inline-block;
                transition: transform 0.2s ease;
            `;
            this.heartContainer.appendChild(heart);
            this.hearts.push(heart);
        }

        document.body.appendChild(this.heartContainer);
        console.log('❤️ Heart HUD created');
    }

    /**
     * Update heart display
     */
    updateHeartDisplay() {
        this.hearts.forEach((heart, index) => {
            if (index < this.currentHP) {
                // Full heart
                heart.textContent = '❤️';
                heart.style.transform = 'scale(1)';
            } else {
                // Broken heart
                heart.textContent = '💔';
                heart.style.transform = 'scale(0.9)';
            }
        });
    }

    /**
     * Take damage
     * @param {number} amount - Amount of damage (default 1)
     * @returns {boolean} - True if damage was applied, false if invulnerable
     */
    takeDamage(amount = 1) {
        if (this.invulnerable || this.currentHP <= 0) {
            return false;
        }

        // Apply damage
        this.currentHP = Math.max(0, this.currentHP - amount);
        console.log(`💔 Player took ${amount} damage! HP: ${this.currentHP}/${this.maxHP}`);

        // Update display
        this.updateHeartDisplay();

        // Flash screen red
        this.flashDamage();

        // Enable invulnerability
        this.invulnerable = true;
        setTimeout(() => {
            this.invulnerable = false;
        }, this.invulnerabilityDuration);

        // Pulse damaged heart
        if (this.currentHP < this.maxHP) {
            const damagedHeart = this.hearts[this.currentHP];
            damagedHeart.style.animation = 'heartPulse 0.5s ease';
            setTimeout(() => {
                damagedHeart.style.animation = '';
            }, 500);
        }

        // Check for death
        if (this.currentHP <= 0) {
            this.onDeath();
        }

        return true;
    }

    /**
     * Heal player
     * @param {number} amount - Amount to heal (default 1)
     */
    heal(amount = 1) {
        if (this.currentHP >= this.maxHP) {
            console.log('❤️ Player already at full health');
            return;
        }

        const oldHP = this.currentHP;
        this.currentHP = Math.min(this.maxHP, this.currentHP + amount);
        console.log(`💚 Player healed ${this.currentHP - oldHP} HP! HP: ${this.currentHP}/${this.maxHP}`);

        // Update display
        this.updateHeartDisplay();

        // Pulse healed heart
        const healedHeart = this.hearts[oldHP];
        if (healedHeart) {
            healedHeart.style.animation = 'heartHeal 0.5s ease';
            setTimeout(() => {
                healedHeart.style.animation = '';
            }, 500);
        }

        // Auto-hide hearts when fully healed
        if (this.currentHP >= this.maxHP) {
            setTimeout(() => {
                this.hide();
                console.log('❤️ Fully healed - hearts hidden');
            }, 1000); // Wait 1 second so player sees the full heal
        }
    }

    /**
     * Flash red damage indicator
     */
    flashDamage() {
        // Create red overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(255, 0, 0, 0.3);
            pointer-events: none;
            z-index: 999;
            animation: damageFlash 0.3s ease;
        `;

        document.body.appendChild(overlay);
        setTimeout(() => {
            document.body.removeChild(overlay);
        }, 300);
    }

    /**
     * Handle player death
     */
    onDeath() {
        console.log('💀 Player defeated!');

        // End battle immediately
        if (this.voxelWorld.battleArena && this.voxelWorld.battleArena.isActive) {
            // Show defeat dialogue
            this.voxelWorld.battleArena.showPlayerDefeatDialogue();
        }
    }

    /**
     * Reset HP to full (for respawn)
     */
    reset() {
        this.currentHP = this.maxHP;
        this.invulnerable = false;
        this.updateHeartDisplay();
        console.log('❤️ Player HP reset: 3/3 hearts');
    }

    /**
     * Set HP to specific amount (for respawn with 1 heart)
     */
    setHP(amount) {
        this.currentHP = Math.max(0, Math.min(this.maxHP, amount));
        this.updateHeartDisplay();
        console.log(`❤️ Player HP set to: ${this.currentHP}/${this.maxHP}`);
    }

    /**
     * Check if player is in danger zone and near enemy
     * Called from BattleArena update loop
     */
    checkDangerZoneCollision(dangerZoneBounds, enemySprite) {
        if (!enemySprite || this.currentHP <= 0) return;

        const playerPos = this.voxelWorld.player.position;

        // Check if player is in danger zone
        const inDangerZone = (
            playerPos.x >= dangerZoneBounds.minX &&
            playerPos.x <= dangerZoneBounds.maxX &&
            playerPos.z >= dangerZoneBounds.minZ &&
            playerPos.z <= dangerZoneBounds.maxZ
        );

        if (!inDangerZone) return;

        // Check distance to enemy sprite
        const enemyPos = enemySprite.position;
        const distance = Math.sqrt(
            Math.pow(playerPos.x - enemyPos.x, 2) +
            Math.pow(playerPos.z - enemyPos.z, 2)
        );

        // Collision threshold (player hitbox radius + sprite radius)
        const collisionDistance = 1.0; // Adjust based on testing

        if (distance < collisionDistance) {
            console.log('💥 Player collided with enemy!');
            this.takeDamage(1);
        }
    }

    /**
     * Check if player is damaged (for UI display logic)
     */
    isDamaged() {
        return this.currentHP < this.maxHP;
    }

    /**
     * Get current HP percentage
     */
    getHPPercent() {
        return (this.currentHP / this.maxHP) * 100;
    }

    /**
     * Show/hide heart display
     */
    show() {
        if (this.heartContainer) {
            this.heartContainer.style.display = 'flex';
        }
    }

    hide() {
        if (this.heartContainer) {
            this.heartContainer.style.display = 'none';
        }
    }

    /**
     * Clean up
     */
    destroy() {
        if (this.heartContainer && this.heartContainer.parentElement) {
            document.body.removeChild(this.heartContainer);
            this.heartContainer = null;
            this.hearts = [];
        }
        console.log('❤️ PlayerHP destroyed');
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes damageFlash {
        0% { opacity: 0; }
        50% { opacity: 1; }
        100% { opacity: 0; }
    }

    @keyframes heartPulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.3); }
        100% { transform: scale(0.9); }
    }

    @keyframes heartHeal {
        0% { transform: scale(0.9); }
        50% { transform: scale(1.3); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);
