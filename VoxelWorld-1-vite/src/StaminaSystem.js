/**
 * StaminaSystem.js
 * 
 * Player stamina system for movement management
 * PRIMARY PURPOSE: Natural performance optimization through gameplay pacing
 * 
 * Key Features:
 * - Stamina drains during movement (walking/running)
 * - Regenerates when idle
 * - Terrain-based multipliers (snow/sand = slower)
 * - Triggers aggressive chunk cleanup during regen (PERFORMANCE!)
 * - Speed Boots integration for upgrades
 */

export class StaminaSystem {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;

        // Stamina settings
        this.maxStamina = 100;
        this.currentStamina = 100;

        // Drain rates (per second) - INCREASED for more frequent rest
        this.walkingDrain = 2.0;      // 50 seconds of walking (was 200s)
        this.runningDrain = 8.0;      // 12.5 seconds of sprinting (was 20s)
        this.idleDrain = 0;            // No drain when standing still

        // Regen rates (per second) - SLOWER recovery = longer cleanup time
        this.idleRegen = 3.0;          // 33 seconds to full from empty (was 20s)
        this.slowWalkRegen = 1.0;      // 100 seconds to full while moving slow (was 50s)

        // Speed multipliers
        this.normalSpeedMultiplier = 1.0;
        this.runSpeedMultiplier = 1.5;       // 50% faster when running
        this.depletedSpeedMultiplier = 0.5;  // 50% slower when exhausted

        // Terrain multipliers (applied to drain rates)
        this.terrainMultipliers = {
            snow: 1.5,        // 50% more drain on snow
            sand: 1.5,        // 50% more drain on sand
            normal: 1.0       // Normal drain
        };

        // Speed Boots bonuses (when equipped)
        this.bootsActive = false;
        this.bootsStaminaMultiplier = 2.0;   // 2x capacity
        this.bootsRegenMultiplier = 2.0;     // 2x regen
        this.bootsRunSpeedMultiplier = 2.0;  // 2x run speed (3x normal speed!)

        // Movement state tracking
        this.isMoving = false;
        this.isRunning = false;
        this.isIdle = true;
        this.currentTerrain = 'normal';

        // Performance optimization tracking
        this.wasMovingLastFrame = false;
        this.idleStartTime = 0;
        this.cleanupTriggered = false;

        // UI elements
        this.staminaContainer = null;
        this.staminaBar = null;
        this.staminaFill = null;

        // Create stamina UI
        this.createStaminaDisplay();

        console.log('⚡ StaminaSystem initialized: 100/100 stamina (Performance optimization active)');
        this.logInitialData();
    }

    /**
     * Log initial stamina system configuration
     */
    logInitialData() {
        console.log('━'.repeat(60));
        console.log('📊 STAMINA SYSTEM CONFIGURATION');
        console.log('━'.repeat(60));
        console.log('');
        console.log('⚡ Current Stats:');
        console.log(`  Stamina: ${this.currentStamina}/${this.maxStamina}`);
        console.log('');
        console.log('🏃 Movement Drain (per second):');
        console.log(`  Walking: -${this.walkingDrain}/s → ${(this.maxStamina / this.walkingDrain).toFixed(0)}s to empty`);
        console.log(`  Running: -${this.runningDrain}/s → ${(this.maxStamina / this.runningDrain).toFixed(0)}s to empty`);
        console.log('');
        console.log('💚 Regeneration (per second):');
        console.log(`  Full Rest: +${this.idleRegen}/s → ${(this.maxStamina / this.idleRegen).toFixed(0)}s to full`);
        console.log(`  Slow Walk: +${this.slowWalkRegen}/s → ${(this.maxStamina / this.slowWalkRegen).toFixed(0)}s to full`);
        console.log('');
        console.log('🏔️ Terrain Drain Multipliers:');
        console.log(`  Snow/Ice: ${this.terrainMultipliers.snow}x drain`);
        console.log(`  Sand: ${this.terrainMultipliers.sand}x drain`);
        console.log(`  Normal: 1.0x drain`);
        console.log('');
        console.log('👢 Speed Boots Bonuses (when equipped):');
        console.log(`  Max Stamina: ${this.bootsStaminaMultiplier}x (${this.maxStamina * this.bootsStaminaMultiplier} total)`);
        console.log(`  Regen Rate: ${this.bootsRegenMultiplier}x faster`);
        console.log(`  Run Speed: ${this.bootsRunSpeedMultiplier}x faster`);
        console.log('');
        console.log('🚀 Speed Multipliers:');
        console.log(`  Normal: ${this.normalSpeedMultiplier}x (100% speed)`);
        console.log(`  Running: ${this.runSpeedMultiplier}x (150% speed)`);
        console.log(`  Depleted: ${this.depletedSpeedMultiplier}x (50% speed - exhausted!)`);
        console.log('');
        console.log('🧹 Performance Optimizations:');
        console.log(`  Cleanup Trigger: 30s of idle`);
        console.log(`  Emergency Mode: 10,000+ blocks (5 chunk radius)`);
        console.log(`  Normal Cleanup: 8 chunk radius`);
        console.log('');
        console.log('⌨️ Controls:');
        console.log('  Hold SHIFT while moving = Sprint (faster but drains stamina)');
        console.log('  Stand still = Regenerate stamina quickly');
        console.log('  Slow walk = Regenerate stamina slowly');
        console.log('');
        console.log('━'.repeat(60));
    }

    /**
     * Create stamina bar HUD display
     * Positioned directly under the hearts
     */
    createStaminaDisplay() {
        // Create container div
        this.staminaContainer = document.createElement('div');
        this.staminaContainer.id = 'player-stamina';
        this.staminaContainer.style.cssText = `
            position: fixed;
            top: 60px;
            left: 50%;
            transform: translateX(-50%);
            width: 200px;
            height: 16px;
            background: rgba(0, 0, 0, 0.6);
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 8px;
            overflow: hidden;
            z-index: 1000;
            pointer-events: none;
            filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.5));
        `;

        // Create fill bar
        this.staminaFill = document.createElement('div');
        this.staminaFill.style.cssText = `
            width: 100%;
            height: 100%;
            background: linear-gradient(to right, #4ade80, #22c55e);
            transition: width 0.1s ease, background 0.3s ease;
        `;

        this.staminaContainer.appendChild(this.staminaFill);
        document.body.appendChild(this.staminaContainer);

        // 🗡️ Create charge indicator (hidden by default)
        this.chargeContainer = document.createElement('div');
        this.chargeContainer.id = 'spear-charge';
        this.chargeContainer.style.cssText = `
            position: fixed;
            top: 82px;
            left: 50%;
            transform: translateX(-50%);
            width: 200px;
            height: 12px;
            background: rgba(0, 0, 0, 0.6);
            border: 2px solid rgba(255, 165, 0, 0.5);
            border-radius: 6px;
            overflow: hidden;
            z-index: 1000;
            pointer-events: none;
            filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.5));
            display: none;
        `;

        // Create charge fill bar
        this.chargeFill = document.createElement('div');
        this.chargeFill.style.cssText = `
            width: 0%;
            height: 100%;
            background: linear-gradient(to right, #f59e0b, #ef4444);
            transition: width 0.05s linear;
        `;

        // Create charge label
        this.chargeLabel = document.createElement('div');
        this.chargeLabel.style.cssText = `
            position: absolute;
            top: -1px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 10px;
            font-weight: bold;
            color: #fff;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
            white-space: nowrap;
        `;
        this.chargeLabel.textContent = '🗡️ CHARGING';

        this.chargeContainer.appendChild(this.chargeFill);
        this.chargeContainer.appendChild(this.chargeLabel);
        document.body.appendChild(this.chargeContainer);

        console.log('⚡ Stamina UI created');
    }

    /**
     * Update stamina based on movement state
     * @param {number} deltaTime - Time since last frame (seconds)
     * @param {boolean} isMoving - Is player moving?
     * @param {boolean} isRunning - Is player holding sprint key?
     * @param {string} terrain - Current terrain type ('snow', 'sand', 'normal')
     */
    update(deltaTime, isMoving, isRunning, terrain = 'normal') {
        this.isMoving = isMoving;
        this.isRunning = isRunning;
        this.currentTerrain = terrain;
        this.isIdle = !isMoving;

        // Get terrain multiplier
        const terrainMult = this.terrainMultipliers[terrain] || 1.0;

        // Calculate stamina change
        let staminaChange = 0;

        if (isMoving && isRunning && this.currentStamina > 0) {
            // Running - fast drain with terrain penalty
            staminaChange = -this.runningDrain * terrainMult * deltaTime;
        } else if (isMoving && this.currentStamina > 0) {
            // Walking - slow drain with terrain penalty
            staminaChange = -this.walkingDrain * terrainMult * deltaTime;
        } else if (!isMoving) {
            // Idle - regenerate stamina
            const regenRate = this.bootsActive 
                ? this.idleRegen * this.bootsRegenMultiplier 
                : this.idleRegen;
            staminaChange = regenRate * deltaTime;
        }

        // Apply stamina change
        this.currentStamina = Math.max(0, Math.min(this.maxStamina, this.currentStamina + staminaChange));

        // 🧹 PERFORMANCE: Trigger cleanup when player stops moving
        this.checkCleanupTrigger();

        // Update UI
        this.updateStaminaDisplay();

        // Track movement state for next frame
        this.wasMovingLastFrame = isMoving;
    }

    /**
     * 🧹 PERFORMANCE OPTIMIZATION: Trigger chunk cleanup when player idles
     * This is the REAL reason for the stamina system!
     */
    checkCleanupTrigger() {
        // Player just stopped moving
        if (this.wasMovingLastFrame && this.isIdle) {
            this.idleStartTime = Date.now();
            this.cleanupTriggered = false;
        }

        // Player has been idle for 1 second - trigger cleanup
        const idleDuration = Date.now() - this.idleStartTime;
        if (this.isIdle && idleDuration > 1000 && !this.cleanupTriggered) {
            this.triggerPerformanceCleanup();
            this.cleanupTriggered = true;
        }
    }

    /**
     * 🧹 AGGRESSIVE CLEANUP: Called when player is idle and stamina regening
     * This prevents the 48k block buildup issue
     */
    triggerPerformanceCleanup() {
        if (!this.voxelWorld.updateChunks) return;

        // 🎯 PERFORMANCE: Use cached block count instead of Object.keys()
        const blockCount = this.voxelWorld.blockCount || Object.keys(this.voxelWorld.world).length;
        
        // Only trigger if blocks are accumulating
        if (blockCount > 8000) {
            const playerChunkX = Math.floor(this.voxelWorld.player.position.x / this.voxelWorld.chunkSize);
            const playerChunkZ = Math.floor(this.voxelWorld.player.position.z / this.voxelWorld.chunkSize);
            
            const totalChunks = this.voxelWorld.visitedChunks.size;
            
            console.log(`🧹⚡ STAMINA CLEANUP: ${totalChunks} chunks visited, ${blockCount} blocks`);
            
            // SMART CLEANUP: Keep visible chunks to prevent pop-in
            // Use renderDistance (keeps what you see) NOT renderDistance-1
            const cleanupRadius = this.voxelWorld.renderDistance;
            this.voxelWorld.cleanupChunkTracking(playerChunkX, playerChunkZ, cleanupRadius);
            
            const newBlockCount = Object.keys(this.voxelWorld.world).length;
            const newChunkCount = this.voxelWorld.visitedChunks.size;
            console.log(`🧹✅ Cleanup: ${blockCount} → ${newBlockCount} blocks (-${blockCount - newBlockCount}), ${totalChunks} → ${newChunkCount} chunks (radius ${cleanupRadius})`);
        }
    }

    /**
     * Update stamina bar visual display
     */
    updateStaminaDisplay() {
        const percentage = (this.currentStamina / this.maxStamina) * 100;
        
        // Update width
        this.staminaFill.style.width = `${percentage}%`;

        // Update color based on stamina level
        let color;
        if (this.isIdle && this.currentStamina < this.maxStamina) {
            // Regening - blue pulse
            color = 'linear-gradient(to right, #60a5fa, #3b82f6)';
        } else if (percentage > 50) {
            // Good - green
            color = 'linear-gradient(to right, #4ade80, #22c55e)';
        } else if (percentage > 25) {
            // Low - yellow
            color = 'linear-gradient(to right, #fbbf24, #f59e0b)';
        } else {
            // Critical - red
            color = 'linear-gradient(to right, #f87171, #ef4444)';
        }

        this.staminaFill.style.background = color;

        // Flash when depleted
        if (this.currentStamina === 0) {
            this.staminaFill.style.animation = 'staminaFlash 0.5s ease-in-out infinite';
        } else {
            this.staminaFill.style.animation = 'none';
        }
    }

    /**
     * Get current movement speed multiplier
     * @returns {number} Speed multiplier (0.5 to 2.0)
     */
    getSpeedMultiplier() {
        // Depleted - very slow
        if (this.currentStamina === 0) {
            return this.depletedSpeedMultiplier;
        }

        // Running with stamina
        if (this.isRunning && this.currentStamina > 0) {
            const runSpeed = this.bootsActive 
                ? this.runSpeedMultiplier * this.bootsRunSpeedMultiplier 
                : this.runSpeedMultiplier;
            return runSpeed;
        }

        // Normal walking
        return this.normalSpeedMultiplier;
    }

    /**
     * Check if player can run (has stamina)
     * @returns {boolean}
     */
    canRun() {
        return this.currentStamina > 0;
    }

    /**
     * Set Speed Boots active state
     * @param {boolean} active - Are speed boots equipped?
     */
    setSpeedBoots(active) {
        // 🔇 PERFORMANCE FIX: Only update and log when state actually changes
        if (this.bootsActive === active) {
            return; // No change, skip update
        }
        
        this.bootsActive = active;
        
        if (active) {
            // Double stamina capacity
            const staminaPercentage = this.currentStamina / this.maxStamina;
            this.maxStamina = 100 * this.bootsStaminaMultiplier;
            this.currentStamina = this.maxStamina * staminaPercentage;
            
            console.log('👢⚡ Speed Boots activated: 2x stamina, 2x regen, 2x run speed!');
        } else {
            // Revert to normal
            const staminaPercentage = this.currentStamina / this.maxStamina;
            this.maxStamina = 100;
            this.currentStamina = this.maxStamina * staminaPercentage;
            
            console.log('👢 Speed Boots deactivated: Normal stamina');
        }

        this.updateStaminaDisplay();
    }

    /**
     * Get current terrain type based on block under player
     * @param {object} blockData - Block data from this.world
     * @returns {string} 'snow', 'sand', or 'normal'
     */
    getTerrainType(blockData) {
        if (!blockData) return 'normal';
        
        const blockType = blockData.type;
        
        if (blockType === 'snow') return 'snow';
        if (blockType === 'sand') return 'sand';
        
        return 'normal';
    }

    /**
     * 🗡️ Show spear charge indicator
     */
    showChargeIndicator() {
        if (this.chargeContainer) {
            this.chargeContainer.style.display = 'block';
        }
    }

    /**
     * 🗡️ Hide spear charge indicator
     */
    hideChargeIndicator() {
        if (this.chargeContainer) {
            this.chargeContainer.style.display = 'none';
        }
    }

    /**
     * 🗡️ Update spear charge visual
     * @param {number} chargePercent - Charge percentage (0.0 to 1.0)
     * @param {number} power - Power multiplier (0.5 to 2.0)
     * @param {number} staminaCost - Stamina cost
     */
    updateChargeIndicator(chargePercent, power, staminaCost) {
        if (!this.chargeFill || !this.chargeLabel) return;

        // Update fill width
        this.chargeFill.style.width = `${chargePercent * 100}%`;

        // Update label text
        this.chargeLabel.textContent = `🗡️ ${(chargePercent * 100).toFixed(0)}% (${power.toFixed(1)}x, -${staminaCost}⚡)`;

        // Change color based on power
        if (chargePercent < 0.33) {
            this.chargeFill.style.background = 'linear-gradient(to right, #fbbf24, #f59e0b)'; // Yellow
        } else if (chargePercent < 0.66) {
            this.chargeFill.style.background = 'linear-gradient(to right, #f59e0b, #f97316)'; // Orange
        } else {
            this.chargeFill.style.background = 'linear-gradient(to right, #f97316, #ef4444)'; // Red
        }
    }

    /**
     * Cleanup and remove UI
     */
    dispose() {
        if (this.staminaContainer && this.staminaContainer.parentNode) {
            this.staminaContainer.parentNode.removeChild(this.staminaContainer);
        }
        if (this.chargeContainer && this.chargeContainer.parentNode) {
            this.chargeContainer.parentNode.removeChild(this.chargeContainer);
        }
        console.log('⚡ StaminaSystem disposed');
    }
}

// Add CSS animation for stamina flash
const style = document.createElement('style');
style.textContent = `
    @keyframes staminaFlash {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
    }
`;
document.head.appendChild(style);
