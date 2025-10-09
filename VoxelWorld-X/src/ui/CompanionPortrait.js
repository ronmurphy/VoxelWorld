/**
 * CompanionPortrait.js
 *
 * Persistent HUD element showing active companion portrait and HP
 * Displayed in bottom-left corner near hotbar
 */

export class CompanionPortrait {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;
        this.portraitElement = null;
        this.currentCompanionId = null;
        this.currentHP = null;
        this.maxHP = null;
        this.entityData = null;

        console.log('🖼️ CompanionPortrait initialized');
    }

    /**
     * Load entity data from entities.json
     */
    async loadEntityData() {
        if (this.entityData) return this.entityData;

        try {
            const response = await fetch('art/entities/entities.json');
            this.entityData = await response.json();
            return this.entityData;
        } catch (error) {
            console.error('❌ Failed to load entity data:', error);
            return null;
        }
    }

    /**
     * Create the companion portrait HUD element
     */
    async create() {
        // Get active companion
        const playerData = JSON.parse(localStorage.getItem('NebulaWorld_playerData') || '{}');
        const companionId = playerData.activeCompanion || playerData.starterMonster || 'rat';

        // Load entity data
        const data = await this.loadEntityData();
        if (!data || !data.monsters[companionId]) {
            console.error('❌ Cannot create portrait without entity data');
            return;
        }

        const companionStats = data.monsters[companionId];
        this.currentCompanionId = companionId;
        this.maxHP = companionStats.hp;
        this.currentHP = playerData.companionHP?.[companionId] || this.maxHP;

        // Main container
        this.portraitElement = document.createElement('div');
        this.portraitElement.id = 'companion-portrait';
        this.portraitElement.style.cssText = `
            position: fixed;
            bottom: 120px;
            left: 20px;
            width: 120px;
            background: linear-gradient(135deg, #8B7355 0%, #A0826D 50%, #8B7355 100%);
            border: 4px solid #4A3728;
            border-radius: 12px;
            padding: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.6);
            font-family: 'Georgia', serif;
            z-index: 1000;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        `;

        // Hover effects
        this.portraitElement.addEventListener('mouseover', () => {
            this.portraitElement.style.transform = 'scale(1.05)';
            this.portraitElement.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.8)';
        });

        this.portraitElement.addEventListener('mouseout', () => {
            this.portraitElement.style.transform = 'scale(1)';
            this.portraitElement.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.6)';
        });

        // Click to open Codex
        this.portraitElement.addEventListener('click', () => {
            if (this.voxelWorld.companionCodex) {
                this.voxelWorld.companionCodex.show();
            }
        });

        // Portrait image
        const portrait = document.createElement('img');
        portrait.id = 'companion-portrait-img';
        portrait.src = `art/entities/${companionStats.sprite_portrait || companionId + '.jpeg'}`;
        portrait.style.cssText = `
            width: 100%;
            height: 100px;
            border-radius: 8px;
            border: 3px solid #D4AF37;
            object-fit: cover;
            background: #2C1810;
            margin-bottom: 8px;
        `;

        // Name label
        const nameLabel = document.createElement('div');
        nameLabel.id = 'companion-portrait-name';
        nameLabel.textContent = companionStats.name;
        nameLabel.style.cssText = `
            font-size: 14px;
            font-weight: bold;
            color: #2C1810;
            text-align: center;
            margin-bottom: 6px;
            text-shadow: 1px 1px 2px rgba(212, 175, 55, 0.3);
        `;

        // HP bar container
        const hpBarContainer = document.createElement('div');
        hpBarContainer.style.cssText = `
            width: 100%;
            height: 20px;
            background: #4A3728;
            border: 2px solid #8B7355;
            border-radius: 4px;
            overflow: hidden;
            position: relative;
        `;

        // HP fill (current HP)
        const hpFill = document.createElement('div');
        hpFill.id = 'companion-portrait-hp-fill';
        const hpPercent = (this.currentHP / this.maxHP) * 100;
        hpFill.style.cssText = `
            height: 100%;
            width: ${hpPercent}%;
            background: ${this.getHPColor(hpPercent)};
            transition: width 0.3s ease, background 0.3s ease;
        `;

        // HP text overlay
        const hpText = document.createElement('div');
        hpText.id = 'companion-portrait-hp-text';
        hpText.textContent = `${this.currentHP}/${this.maxHP}`;
        hpText.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 12px;
            font-weight: bold;
            color: #FFF;
            text-shadow: 1px 1px 2px #000;
            pointer-events: none;
        `;

        hpBarContainer.appendChild(hpFill);
        hpBarContainer.appendChild(hpText);

        // Assemble portrait
        this.portraitElement.appendChild(portrait);
        this.portraitElement.appendChild(nameLabel);
        this.portraitElement.appendChild(hpBarContainer);

        document.body.appendChild(this.portraitElement);

        console.log(`🖼️ Companion portrait created: ${companionStats.name} (${this.currentHP}/${this.maxHP} HP)`);
    }

    /**
     * Get HP bar color based on percentage
     */
    getHPColor(hpPercent) {
        if (hpPercent > 50) {
            return 'linear-gradient(90deg, #4CAF50 0%, #8BC34A 100%)'; // Green
        } else if (hpPercent > 25) {
            return 'linear-gradient(90deg, #FFC107 0%, #FFD54F 100%)'; // Yellow
        } else {
            return 'linear-gradient(90deg, #F44336 0%, #EF5350 100%)'; // Red
        }
    }

    /**
     * Update HP (called after battles or healing)
     */
    async updateHP(newHP) {
        this.currentHP = Math.max(0, Math.min(newHP, this.maxHP));

        // Update localStorage
        const playerData = JSON.parse(localStorage.getItem('NebulaWorld_playerData') || '{}');
        playerData.companionHP = playerData.companionHP || {};
        playerData.companionHP[this.currentCompanionId] = this.currentHP;
        localStorage.setItem('NebulaWorld_playerData', JSON.stringify(playerData));

        // Update UI
        const hpFill = document.getElementById('companion-portrait-hp-fill');
        const hpText = document.getElementById('companion-portrait-hp-text');

        if (hpFill && hpText) {
            const hpPercent = (this.currentHP / this.maxHP) * 100;
            hpFill.style.width = `${hpPercent}%`;
            hpFill.style.background = this.getHPColor(hpPercent);
            hpText.textContent = `${this.currentHP}/${this.maxHP}`;
        }
    }

    /**
     * Refresh portrait when active companion changes
     */
    async refresh() {
        // Remove old portrait
        if (this.portraitElement && this.portraitElement.parentNode) {
            this.portraitElement.parentNode.removeChild(this.portraitElement);
            this.portraitElement = null;
        }

        // Create new portrait
        await this.create();
    }

    /**
     * Show the portrait
     */
    show() {
        if (this.portraitElement) {
            this.portraitElement.style.display = 'block';
        }
    }

    /**
     * Hide the portrait
     */
    hide() {
        if (this.portraitElement) {
            this.portraitElement.style.display = 'none';
        }
    }

    /**
     * Remove portrait from DOM
     */
    destroy() {
        if (this.portraitElement && this.portraitElement.parentNode) {
            this.portraitElement.parentNode.removeChild(this.portraitElement);
            this.portraitElement = null;
        }
    }
}
