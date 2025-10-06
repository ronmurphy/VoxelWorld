/**
 * RPGIntegration.js
 *
 * Integration point for VoxelWorld RPG systems
 * Connects PlayerStats, CombatSystem, and UI to VoxelWorld
 */

import { PlayerStats } from './PlayerStats.js';
import { CombatSystem } from './CombatSystem.js';
import { UIModals } from '../ui/UI-Modals.js';

export class RPGIntegration {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;

        // Initialize systems
        this.playerStats = new PlayerStats();
        this.combatSystem = new CombatSystem();
        this.uiModals = new UIModals(voxelWorld);

        console.log('🎲 RPG Integration initialized');
    }

    /**
     * Show character creation modal (for new games)
     */
    startCharacterCreation() {
        return new Promise((resolve) => {
            this.uiModals.showCharacterCreation((charData) => {
                // Apply character data to playerStats
                this.playerStats.attributes = { ...charData.attributes };
                this.playerStats.updateDerivedStats();

                console.log('✅ Character created:', charData.name, charData.attributes);

                // Store character name somewhere (future)
                this.playerName = charData.name;

                resolve(charData);
            });
        });
    }

    /**
     * Check if player should create a character (new game detection)
     */
    needsCharacterCreation() {
        // Check if stats exist in save data
        const savedStats = localStorage.getItem('voxelWorld_playerStats');
        return !savedStats;
    }

    /**
     * Save player stats to localStorage
     */
    saveStats() {
        const data = this.playerStats.serialize();
        localStorage.setItem('voxelWorld_playerStats', JSON.stringify(data));
        console.log('💾 Player stats saved');
    }

    /**
     * Load player stats from localStorage
     */
    loadStats() {
        try {
            const saved = localStorage.getItem('voxelWorld_playerStats');
            if (saved) {
                const data = JSON.parse(saved);
                this.playerStats.deserialize(data);
                console.log('📂 Player stats loaded');
                return true;
            }
        } catch (error) {
            console.error('❌ Failed to load stats:', error);
        }
        return false;
    }

    /**
     * Update HUD with current HP/MP (call from animation loop)
     */
    updateHUD() {
        // This will be expanded when we add the HUD display
        // For now, just expose stats for debugging
        if (window.voxelApp) {
            window.voxelApp.rpgStats = this.playerStats.getSummary();
        }
    }

    /**
     * Handle player taking damage
     */
    playerTakeDamage(damage, source = 'unknown') {
        const result = this.playerStats.takeDamage(damage);

        console.log(`💔 Player took ${damage} damage from ${source} (${this.playerStats.currentHP}/${this.playerStats.maxHP})`);

        if (!result.alive) {
            this.handlePlayerDeath();
        }

        return result;
    }

    /**
     * Handle player death
     */
    handlePlayerDeath() {
        console.log('💀 Player has died!');

        // TODO: Show death screen
        // TODO: Respawn logic
        // TODO: Item drop/penalty

        // For now, just respawn with full health
        setTimeout(() => {
            this.playerStats.currentHP = this.playerStats.maxHP;
            console.log('✨ Player respawned');
        }, 2000);
    }

    /**
     * Award XP to player
     */
    awardXP(amount, source = '') {
        const levelUpInfo = this.playerStats.gainExperience(amount);

        if (levelUpInfo) {
            this.handleLevelUp(levelUpInfo);
        }

        this.saveStats();
    }

    /**
     * Handle level up
     */
    handleLevelUp(levelUpInfo) {
        console.log(`⭐ LEVEL UP! Now level ${levelUpInfo.newLevel}`);

        // TODO: Show level up modal
        // TODO: Allow attribute point allocation
        // TODO: Achievement selection

        this.saveStats();
    }

    /**
     * Track mining for XP
     */
    onBlockMined(blockType) {
        this.playerStats.trackMining(blockType);

        // Award small XP for mining
        const xpValues = {
            stone: 1,
            iron: 3,
            gold: 5,
            dirt: 0.5,
            grass: 0.5
        };

        const xp = xpValues[blockType] || 1;
        this.awardXP(xp, `mining ${blockType}`);
    }

    /**
     * Get player's current weapon stats (from inventory)
     */
    getPlayerWeapon() {
        // For now, return based on equipped tool
        // TODO: Connect to inventory system

        const defaultWeapon = {
            name: 'Fist',
            bonus: 0,
            damageDice: 'd4',
            ranged: false
        };

        return defaultWeapon;
    }
}
