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

        // Click to open Companion Menu
        this.portraitElement.addEventListener('click', () => {
            this.openCompanionMenu(companionStats);
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

    /**
     * Open companion menu (Hunt, Codex, Stats, etc.)
     */
    openCompanionMenu(companionStats) {
        // Close existing menu if open
        this.closeCompanionMenu();

        // Pause game
        this.voxelWorld.isPaused = true;

        // Create menu modal
        const menu = document.createElement('div');
        menu.id = 'companion-menu-modal';
        menu.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 50000;
            animation: fadeIn 0.3s ease;
        `;

        // Menu container
        const container = document.createElement('div');
        container.style.cssText = `
            background: linear-gradient(135deg, #8B7355 0%, #A0826D 50%, #8B7355 100%);
            border: 6px solid #4A3728;
            border-radius: 16px;
            padding: 30px;
            min-width: 400px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
            font-family: 'Georgia', serif;
        `;

        // Title
        const title = document.createElement('h2');
        title.textContent = `${companionStats.name} 🐕`;
        title.style.cssText = `
            margin: 0 0 20px 0;
            color: #2C1810;
            text-align: center;
            font-size: 24px;
            text-shadow: 1px 1px 2px rgba(212, 175, 55, 0.3);
        `;

        // HP Display
        const hpDisplay = document.createElement('div');
        hpDisplay.textContent = `❤️ HP: ${this.currentHP}/${this.maxHP}`;
        hpDisplay.style.cssText = `
            text-align: center;
            font-size: 16px;
            color: #2C1810;
            margin-bottom: 20px;
        `;

        // Check if companion is currently exploring
        const isExploring = this.voxelWorld.companionHuntSystem?.isActive;

        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 12px;
        `;

        // SEND TO HUNT button (or RECALL if exploring)
        if (isExploring) {
            const itemsFound = this.voxelWorld.companionHuntSystem.discoveries?.length || 0;
            const recallBtn = this.createMenuButton(
                `📢 Recall Companion (${itemsFound} items found)`, 
                '#F44336'
            );
            recallBtn.addEventListener('click', () => {
                this.voxelWorld.companionHuntSystem.cancelHunt();
                this.closeCompanionMenu();
            });
            buttonContainer.appendChild(recallBtn);
        } else {
            const huntBtn = this.createMenuButton('🎯 Send to Hunt', '#4CAF50');
            huntBtn.addEventListener('click', () => {
                this.closeCompanionMenu();
                this.openHuntDurationPicker(companionStats);
            });
            buttonContainer.appendChild(huntBtn);
        }

        // CODEX button
        const codexBtn = this.createMenuButton('📖 Open Codex', '#2196F3');
        codexBtn.addEventListener('click', () => {
            this.closeCompanionMenu();
            if (this.voxelWorld.companionCodex) {
                this.voxelWorld.companionCodex.show();
            }
        });
        buttonContainer.appendChild(codexBtn);

        // CLOSE button
        const closeBtn = this.createMenuButton('❌ Close', '#757575');
        closeBtn.addEventListener('click', () => {
            this.closeCompanionMenu();
        });
        buttonContainer.appendChild(closeBtn);

        // Assemble menu
        container.appendChild(title);
        container.appendChild(hpDisplay);
        container.appendChild(buttonContainer);
        menu.appendChild(container);
        document.body.appendChild(menu);

        // Close on ESC
        this.menuEscHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeCompanionMenu();
            }
        };
        document.addEventListener('keydown', this.menuEscHandler);

        console.log('📋 Companion menu opened');
    }

    /**
     * Create a styled menu button
     */
    createMenuButton(text, color) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = `
            background: ${color};
            color: white;
            border: 3px solid #2C1810;
            border-radius: 8px;
            padding: 12px 20px;
            font-size: 16px;
            font-weight: bold;
            font-family: 'Georgia', serif;
            cursor: pointer;
            transition: all 0.2s ease;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        `;

        btn.addEventListener('mouseover', () => {
            btn.style.transform = 'scale(1.05)';
            btn.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.6)';
        });

        btn.addEventListener('mouseout', () => {
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = 'none';
        });

        return btn;
    }

    /**
     * Open hunt duration picker
     */
    openHuntDurationPicker(companionStats) {
        // Create duration picker modal
        const modal = document.createElement('div');
        modal.id = 'hunt-duration-picker';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 50001;
            animation: fadeIn 0.3s ease;
        `;

        const container = document.createElement('div');
        container.style.cssText = `
            background: linear-gradient(135deg, #8B7355 0%, #A0826D 50%, #8B7355 100%);
            border: 6px solid #4A3728;
            border-radius: 16px;
            padding: 30px;
            min-width: 400px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
            font-family: 'Georgia', serif;
        `;

        const title = document.createElement('h2');
        title.textContent = '🎯 Choose Hunt Duration';
        title.style.cssText = `
            margin: 0 0 20px 0;
            color: #2C1810;
            text-align: center;
            font-size: 24px;
        `;

        const description = document.createElement('p');
        description.textContent = 'Longer expeditions travel farther and find rarer items!';
        description.style.cssText = `
            text-align: center;
            color: #2C1810;
            margin-bottom: 20px;
            font-size: 14px;
        `;

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 12px;
        `;

        // Duration options
        const durations = [
            { days: 0.5, label: '½ Day (10 min)', color: '#4CAF50', distance: 'Short' },
            { days: 1, label: '1 Day (20 min)', color: '#FF9800', distance: 'Medium' },
            { days: 2, label: '2 Days (40 min)', color: '#F44336', distance: 'Far' }
        ];

        durations.forEach(({ days, label, color, distance }) => {
            const btn = this.createMenuButton(`${label} - ${distance} Range`, color);
            btn.addEventListener('click', () => {
                this.startHunt(companionStats, days);
                modal.remove();
            });
            buttonContainer.appendChild(btn);
        });

        // Cancel button
        const cancelBtn = this.createMenuButton('❌ Cancel', '#757575');
        cancelBtn.addEventListener('click', () => {
            modal.remove();
            this.voxelWorld.isPaused = false;
        });
        buttonContainer.appendChild(cancelBtn);

        container.appendChild(title);
        container.appendChild(description);
        container.appendChild(buttonContainer);
        modal.appendChild(container);
        document.body.appendChild(modal);
    }

    /**
     * Start a hunt expedition
     */
    startHunt(companionStats, durationDays) {
        const companion = {
            id: this.currentCompanionId,
            name: companionStats.name,
            hp: this.currentHP,
            maxHP: this.maxHP
        };

        if (this.voxelWorld.companionHuntSystem) {
            const success = this.voxelWorld.companionHuntSystem.startHunt(companion, durationDays);
            if (success) {
                // Add visual indicator to portrait
                if (this.portraitElement) {
                    this.portraitElement.style.border = '4px solid #06b6d4'; // Cyan border
                    this.portraitElement.style.opacity = '0.6'; // Alpha layer while hunting
                    this.portraitElement.title = `${companion.name} is exploring...`;
                }
            }
        }

        this.voxelWorld.isPaused = false;
    }

    /**
     * Close companion menu
     */
    closeCompanionMenu() {
        const menu = document.getElementById('companion-menu-modal');
        if (menu) {
            menu.remove();
        }

        if (this.menuEscHandler) {
            document.removeEventListener('keydown', this.menuEscHandler);
            this.menuEscHandler = null;
        }

        this.voxelWorld.isPaused = false;
    }
}

