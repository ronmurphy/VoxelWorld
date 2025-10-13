/**
 * CompanionCodex.js
 *
 * Companion Registry / Pokedex system for VoxelWorld
 * Shows discovered companions, stats, and allows setting active companion
 * Styled to match Explorer's Journal aesthetic (open book layout)
 */

export class CompanionCodex {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;
        this.codexElement = null;
        this.discoveredCompanions = [];
        this.selectedCompanion = null;
        this.activeCompanion = null;
        this.allCompanions = null;
        this.companionEquipment = {}; // { companionId: { head: null, body: null, weapon: null, accessory: null } }

        // Equipment stat bonuses
        this.equipmentBonuses = {
            // Basic starter items (easy to find, low bonuses)
            stick: { attack: 1, label: 'Stick', icon: 'art/tools/stick.png' },
            oak_wood: { defense: 1, label: 'Wood Plank', icon: 'art/tools/wood_plank.png' },
            pine_wood: { defense: 1, label: 'Wood Plank', icon: 'art/tools/wood_plank.png' },
            birch_wood: { defense: 1, label: 'Wood Plank', icon: 'art/tools/wood_plank.png' },
            palm_wood: { defense: 1, label: 'Wood Plank', icon: 'art/tools/wood_plank.png' },
            dead_wood: { defense: 1, label: 'Wood Plank', icon: 'art/tools/wood_plank.png' },
            stone: { defense: 1, hp: 2, label: 'Stone', icon: 'art/tools/stone_block.png' },
            leaf: { speed: 1, label: 'Leaf', icon: 'art/tools/leaf.png' },
            'oak_wood-leaves': { speed: 1, label: 'Leaves', icon: 'art/tools/leaves.png' },
            'pine_wood-leaves': { speed: 1, label: 'Leaves', icon: 'art/tools/leaves.png' },
            'birch_wood-leaves': { speed: 1, label: 'Leaves', icon: 'art/tools/leaves.png' },
            'palm_wood-leaves': { speed: 1, label: 'Leaves', icon: 'art/tools/leaves.png' },
            'dead_wood-leaves': { speed: 1, label: 'Leaves', icon: 'art/tools/leaves.png' },
            sand: { defense: 1, label: 'Sand Block', icon: 'art/tools/sand_block.png' },

            // World discovery items (medium rarity)
            rustySword: { attack: 2, label: '⚔️ Rusty Sword' },
            oldPickaxe: { attack: 1, defense: 1, label: '⛏️ Old Pickaxe' },
            ancientAmulet: { defense: 2, hp: 3, label: '📿 Ancient Amulet' },
            skull: { attack: 1, label: '💀 Skull' },
            crystal: { speed: 1, defense: 1, label: '💎 Crystal' },
            feather: { speed: 2, label: '🪶 Feather' },
            bone: { defense: 1, label: '🦴 Bone' },
            fur: { hp: 5, defense: 1, label: '🐻‍❄️ Fur' },
            iceShard: { attack: 1, speed: 1, label: '❄️ Ice Shard' },
            mushroom: { hp: 3, label: '🍄 Mushroom' },
            berry: { hp: 2, label: '🍓 Berry' },
            flower: { defense: 1, label: '🌸 Flower' },

            // Crafted tools (from ToolBench)
            combat_sword: { attack: 4, label: '⚔️ Combat Sword', icon: 'art/tools/sword.png' },
            mining_pick: { attack: 2, defense: 2, label: '⛏️ Mining Pick', icon: 'art/tools/pickaxe.png' },
            stone_hammer: { attack: 3, defense: 1, label: '🔨 Stone Hammer', icon: 'art/tools/stone_hammer.png' },
            magic_amulet: { defense: 3, hp: 8, speed: 1, label: '📿 Magic Amulet', icon: 'art/tools/cryatal.png' },
            compass: { speed: 1, label: '🧭 Compass', icon: 'art/tools/compass.png' },
            compass_upgrade: { speed: 2, label: '🧭 Crystal Compass', icon: 'art/tools/compass.png' },
            speed_boots: { speed: 3, label: '👢 Speed Boots', icon: 'art/tools/boots_speed.png' },
            grappling_hook: { speed: 2, label: '🕸️ Grappling Hook', icon: 'art/tools/grapple.png' },
            machete: { attack: 2, label: '🔪 Machete', icon: 'art/tools/machete.png' },
            
            // New tools
            club: { attack: 3, label: '🏏 Wooden Club', icon: 'art/tools/club.png' },
            stone_spear: { attack: 4, speed: 1, label: '🗡️ Stone Spear', icon: 'art/tools/stone_spear.png' },
            torch: { speed: 1, label: '🔥 Torch', icon: 'art/tools/torch.png' },
            wood_shield: { defense: 3, label: '🛡️ Wooden Shield', icon: 'art/tools/wood_shield.png' },

            // Prefixed versions from ToolBench crafting system
            crafted_combat_sword: { attack: 4, label: '⚔️ Combat Sword', icon: 'art/tools/sword.png' },
            crafted_mining_pick: { attack: 2, defense: 2, label: '⛏️ Mining Pick', icon: 'art/tools/pickaxe.png' },
            crafted_magic_amulet: { defense: 3, hp: 8, speed: 1, label: '📿 Magic Amulet', icon: 'art/tools/cryatal.png' },
            crafted_grappling_hook: { speed: 2, label: '🕸️ Grappling Hook', icon: 'art/tools/grapple.png' },
            crafted_club: { attack: 3, label: '🏏 Wooden Club', icon: 'art/tools/club.png' },
            crafted_stone_spear: { attack: 4, speed: 1, label: '🗡️ Stone Spear', icon: 'art/tools/stone_spear.png' },
            crafted_torch: { speed: 1, label: '🔥 Torch', icon: 'art/tools/torch.png' },
            crafted_wood_shield: { defense: 3, label: '🛡️ Wooden Shield', icon: 'art/tools/wood_shield.png' }
        };

        // ⚔️ Special combat effects for equipment
        // These provide unique battle mechanics beyond stat bonuses
        this.specialCombatEffects = {
            // Speed-based effects
            speed_boots: { effect: 'double_attack', description: 'Attack twice per turn' },
            crafted_speed_boots: { effect: 'double_attack', description: 'Attack twice per turn' },
            
            feather: { effect: 'extra_turn', chance: 0.25, description: '25% chance for extra turn' },
            
            // Defense effects
            wood_shield: { effect: 'block', chance: 0.30, description: '30% chance to block attack' },
            crafted_wood_shield: { effect: 'block', chance: 0.30, description: '30% chance to block attack' },
            
            // Attack effects
            combat_sword: { effect: 'critical', chance: 0.20, description: '20% critical hit (2x damage)' },
            crafted_combat_sword: { effect: 'critical', chance: 0.20, description: '20% critical hit (2x damage)' },
            
            stone_spear: { effect: 'pierce', description: 'Ignore 50% of enemy defense' },
            crafted_stone_spear: { effect: 'pierce', description: 'Ignore 50% of enemy defense' },
            
            club: { effect: 'stun', chance: 0.15, description: '15% chance to stun (skip enemy turn)' },
            crafted_club: { effect: 'stun', chance: 0.15, description: '15% chance to stun (skip enemy turn)' },
            
            // Magic effects
            magic_amulet: { effect: 'heal', value: 3, description: 'Heal 3 HP each turn' },
            crafted_magic_amulet: { effect: 'heal', value: 3, description: 'Heal 3 HP each turn' },
            
            torch: { effect: 'burn', chance: 0.20, description: '20% chance to burn (damage over time)' },
            crafted_torch: { effect: 'burn', chance: 0.20, description: '20% chance to burn (damage over time)' },
            
            // Ice effects
            iceShard: { effect: 'freeze', chance: 0.15, description: '15% chance to freeze (skip turn)' },
            
            // Ancient items
            ancientAmulet: { effect: 'dodge', chance: 0.20, description: '20% chance to dodge attacks' }
        };

        console.log('📘 CompanionCodex system initialized');
    }

    /**
     * Load companion data from entities.json
     */
    async loadCompanionData() {
        try {
            const response = await fetch('art/entities/entities.json');
            const data = await response.json();
            this.allCompanions = data.monsters;
            return this.allCompanions;
        } catch (error) {
            console.error('Failed to load companion data:', error);
            return null;
        }
    }

    /**
     * Load discovered companions from localStorage
     */
    loadDiscoveredCompanions() {
        const playerData = localStorage.getItem('NebulaWorld_playerData');
        if (playerData) {
            const data = JSON.parse(playerData);
            this.discoveredCompanions = data.monsterCollection || [];
            this.activeCompanion = data.activeCompanion || data.starterMonster || null;
            this.companionEquipment = data.companionEquipment || {};
        }
    }

    /**
     * Save companion equipment to localStorage
     */
    saveEquipment() {
        const playerData = JSON.parse(localStorage.getItem('NebulaWorld_playerData') || '{}');
        playerData.companionEquipment = this.companionEquipment;
        localStorage.setItem('NebulaWorld_playerData', JSON.stringify(playerData));
    }

    /**
     * Show the Companion Codex modal (full-screen book layout)
     */
    async show() {
        // Load data
        await this.loadCompanionData();
        this.loadDiscoveredCompanions();

        // Remove existing codex if any
        if (this.codexElement) {
            this.codexElement.remove();
        }

        // Release pointer lock when opening codex
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }

        // Disable VoxelWorld input controls while codex is open
        if (this.voxelWorld) {
            this.voxelWorld.controlsEnabled = false;
            console.log('🔒 Disabled input controls for Companion Codex');

            // 🎨 Hide hotbar and companion portrait for clean codex view
            if (this.voxelWorld.hotbarElement) {
                this.voxelWorld.hotbarElement.style.display = 'none';
            }
            if (this.voxelWorld.companionPortrait && this.voxelWorld.companionPortrait.portraitElement) {
                this.voxelWorld.companionPortrait.portraitElement.style.display = 'none';
            }
        }

        // Create codex overlay
        this.codexElement = document.createElement('div');
        this.codexElement.id = 'companion-codex-modal';
        this.codexElement.style.cssText = `
            position: fixed;
            top: 5%;
            left: 5%;
            width: 90%;
            height: 90%;
            background: linear-gradient(135deg, rgba(101, 67, 33, 0.98), rgba(139, 90, 43, 0.98));
            border: 10px ridge #654321;
            border-radius: 20px;
            z-index: 50000;
            display: flex;
            flex-direction: column;
            box-shadow: 0 0 40px rgba(0, 0, 0, 0.9), inset 0 0 20px rgba(101, 67, 33, 0.4);
            backdrop-filter: blur(2px);
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        // Create bookmark tabs container (on the left edge)
        const bookmarkTabs = document.createElement('div');
        bookmarkTabs.style.cssText = `
            position: absolute;
            left: -40px;
            top: 150px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            z-index: 1001;
        `;

        // Map bookmark tab
        const mapTab = document.createElement('div');
        mapTab.className = 'bookmark-tab';
        mapTab.title = 'World Map (M)';
        mapTab.style.cssText = `
            width: 40px;
            height: 80px;
            background: linear-gradient(90deg, #8B4513, #A0522D);
            border: 3px solid #654321;
            border-right: none;
            border-radius: 8px 0 0 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 24px;
            transition: all 0.2s ease;
            box-shadow: -2px 2px 8px rgba(0, 0, 0, 0.5);
        `;
        mapTab.textContent = '🗺️';

        mapTab.addEventListener('mouseover', () => {
            mapTab.style.left = '5px';
            mapTab.style.background = 'linear-gradient(90deg, #A0522D, #CD853F)';
        });

        mapTab.addEventListener('mouseout', () => {
            mapTab.style.left = '0';
            mapTab.style.background = 'linear-gradient(90deg, #8B4513, #A0522D)';
        });

        mapTab.addEventListener('click', () => {
            this.hide(false); // Don't re-engage pointer lock, we're switching tabs
            // Open world map
            if (this.voxelWorld && this.voxelWorld.toggleWorldMap) {
                setTimeout(() => this.voxelWorld.toggleWorldMap(), 100);
            }
        });

        // Codex bookmark tab (active)
        const codexTab = document.createElement('div');
        codexTab.className = 'bookmark-tab active';
        codexTab.title = 'Companion Codex (C)';
        codexTab.style.cssText = `
            width: 40px;
            height: 80px;
            background: linear-gradient(90deg, #D4AF37, #F4E4A6);
            border: 3px solid #654321;
            border-right: none;
            border-radius: 8px 0 0 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: default;
            font-size: 24px;
            box-shadow: -2px 2px 8px rgba(0, 0, 0, 0.5), inset 0 0 10px rgba(212, 175, 55, 0.5);
        `;
        codexTab.textContent = '📘';

        bookmarkTabs.appendChild(mapTab);
        bookmarkTabs.appendChild(codexTab);
        this.codexElement.appendChild(bookmarkTabs);

        // Header with title and close button
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 20px;
            text-align: center;
            color: #F5E6D3;
            font-family: 'Georgia', serif;
            border-bottom: 3px solid #8B4513;
        `;
        header.innerHTML = `
            <h1 style="margin: 0; font-size: 36px; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);">📘 Companion Codex</h1>
            <p style="margin: 5px 0 0 0; font-size: 16px; color: #E8D5B7;">Your companion registry and battle team</p>
        `;

        // Book container (left + spine + right)
        const bookContainer = document.createElement('div');
        bookContainer.style.cssText = `
            flex: 1;
            display: flex;
            padding: 20px;
            gap: 20px;
            overflow: hidden;
        `;

        // Left page - Companion list
        const leftPage = document.createElement('div');
        leftPage.id = 'codex-left-page';
        leftPage.style.cssText = `
            width: 48%;
            height: 100%;
            background: linear-gradient(45deg, #F5E6D3, #E8D5B7);
            border: 3px solid #8B4513;
            border-radius: 15px 5px 5px 15px;
            padding: 20px;
            box-shadow: inset 2px 0 10px rgba(139, 69, 19, 0.3);
            overflow-y: auto;
            font-family: 'Georgia', serif;
        `;

        // Book spine separator
        const bookSpine = document.createElement('div');
        bookSpine.style.cssText = `
            width: 4%;
            height: 100%;
            background: linear-gradient(180deg, #654321, #8B4513, #654321);
            border-radius: 5px;
            box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
        `;

        // Add decorative spine elements
        for (let i = 0; i < 5; i++) {
            const spineDecor = document.createElement('div');
            spineDecor.style.cssText = `
                width: 60%;
                height: 3px;
                background: #8B4513;
                margin: 20px 0;
                border-radius: 2px;
            `;
            bookSpine.appendChild(spineDecor);
        }

        // Right page - Companion details
        const rightPage = document.createElement('div');
        rightPage.id = 'codex-right-page';
        rightPage.style.cssText = `
            width: 48%;
            height: 100%;
            background: linear-gradient(45deg, #E8D5B7, #F5E6D3);
            border: 3px solid #8B4513;
            border-radius: 5px 15px 15px 5px;
            padding: 20px;
            box-shadow: inset -2px 0 10px rgba(139, 69, 19, 0.3);
            overflow-y: auto;
            font-family: 'Georgia', serif;
        `;

        // Footer with close button
        const footer = document.createElement('div');
        footer.style.cssText = `
            padding: 15px 20px;
            text-align: center;
            border-top: 3px solid #8B4513;
        `;

        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close Codex';
        closeButton.style.cssText = `
            padding: 12px 40px;
            font-size: 18px;
            font-family: 'Georgia', serif;
            background: linear-gradient(135deg, #D4AF37 0%, #F4E4A6 50%, #D4AF37 100%);
            color: #2C1810;
            border: 3px solid #8B7355;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            transition: all 0.2s ease;
        `;

        closeButton.addEventListener('mouseover', () => {
            closeButton.style.transform = 'scale(1.05)';
        });

        closeButton.addEventListener('mouseout', () => {
            closeButton.style.transform = 'scale(1)';
        });

        closeButton.addEventListener('click', () => {
            this.hide();
        });

        footer.appendChild(closeButton);

        // Assemble the codex
        bookContainer.appendChild(leftPage);
        bookContainer.appendChild(bookSpine);
        bookContainer.appendChild(rightPage);

        this.codexElement.appendChild(header);
        this.codexElement.appendChild(bookContainer);
        this.codexElement.appendChild(footer);

        document.body.appendChild(this.codexElement);

        // Populate pages
        this.renderCompanionList(leftPage);
        this.renderCompanionDetails(rightPage, this.activeCompanion || this.discoveredCompanions[0]);

        // Fade in
        setTimeout(() => {
            this.codexElement.style.opacity = '1';
        }, 10);

        // Disable VoxelWorld controls
        if (this.voxelWorld) {
            this.voxelWorld.controlsEnabled = false;
        }
    }

    /**
     * Render the companion list on the left page
     */
    renderCompanionList(leftPage) {
        leftPage.innerHTML = `
            <h2 style="margin: 0 0 20px 0; color: #4A3728; text-align: center; font-size: 24px; border-bottom: 2px solid #D4AF37; padding-bottom: 10px;">
                Discovered Companions
            </h2>
            <p style="text-align: center; color: #666; margin-bottom: 20px;">
                ${this.discoveredCompanions.length} / ${Object.keys(this.allCompanions).length} Found
            </p>
        `;

        const companionListContainer = document.createElement('div');
        companionListContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;

        this.discoveredCompanions.forEach(companionId => {
            const companion = this.allCompanions[companionId];
            if (!companion) return;

            const isActive = companionId === this.activeCompanion;
            const listItem = document.createElement('div');
            listItem.style.cssText = `
                display: flex;
                align-items: center;
                padding: 10px;
                background: ${isActive ? 'rgba(212, 175, 55, 0.3)' : 'rgba(255, 255, 255, 0.4)'};
                border: 2px solid ${isActive ? '#D4AF37' : '#8B7355'};
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
            `;

            listItem.addEventListener('mouseover', () => {
                if (!isActive) {
                    listItem.style.background = 'rgba(212, 175, 55, 0.2)';
                    listItem.style.borderColor = '#D4AF37';
                }
            });

            listItem.addEventListener('mouseout', () => {
                if (!isActive) {
                    listItem.style.background = 'rgba(255, 255, 255, 0.4)';
                    listItem.style.borderColor = '#8B7355';
                }
            });

            listItem.addEventListener('click', () => {
                this.selectedCompanion = companionId;
                const rightPage = document.getElementById('codex-right-page');
                this.renderCompanionDetails(rightPage, companionId);
            });

            listItem.innerHTML = `
                <img src="art/entities/${companion.sprite_portrait}" alt="${companion.name}" style="
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: 2px solid #4A3728;
                    margin-right: 10px;
                    object-fit: cover;
                    background: #4A3728;
                ">
                <div style="flex: 1;">
                    <div style="font-weight: bold; color: #2C1810; font-size: 16px;">${companion.name}</div>
                    <div style="font-size: 12px; color: #666;">Tier ${companion.tier}</div>
                </div>
                ${isActive ? '<div style="color: #D4AF37; font-size: 18px;">⭐</div>' : ''}
            `;

            companionListContainer.appendChild(listItem);
        });

        leftPage.appendChild(companionListContainer);
    }

    /**
     * Calculate total stats including equipment bonuses
     * @param {string} companionId - Companion ID
     * @returns {object} Stats object with hp, attack, defense, speed
     */
    calculateStats(companionId) {
        const companion = this.allCompanions[companionId];
        if (!companion) return null;

        const equipment = this.companionEquipment[companionId] || { head: null, body: null, weapon: null, accessory: null };
        const stats = {
            hp: companion.hp,
            attack: companion.attack,
            defense: companion.defense,
            speed: companion.speed
        };

        // Apply equipment bonuses
        Object.values(equipment).forEach(item => {
            if (item && this.equipmentBonuses[item]) {
                const bonuses = this.equipmentBonuses[item];
                stats.hp += bonuses.hp || 0;
                stats.attack += bonuses.attack || 0;
                stats.defense += bonuses.defense || 0;
                stats.speed += bonuses.speed || 0;
            }
        });

        return stats;
    }

    /**
     * Get companion stats with equipment bonuses (for combat system)
     * @param {string} companionId - Companion ID
     * @returns {object} Stats object with hp, attack, defense, speed
     */
    async getCompanionStats(companionId) {
        // Ensure data is loaded
        if (!this.allCompanions) {
            console.warn('⚠️ Companion data not loaded, loading now...');
            const loadedData = await this.loadCompanionData();

            if (!loadedData) {
                console.error('❌ Failed to load companion data from entities.json');
                return null;
            }

            // Load equipment data from localStorage
            const playerData = JSON.parse(localStorage.getItem('NebulaWorld_playerData') || '{}');
            this.companionEquipment = playerData.companionEquipment || {};

            console.log('✅ Companion data loaded successfully:', Object.keys(this.allCompanions));
        }

        return this.calculateStats(companionId);
    }

    /**
     * Get special combat effects for a companion
     * @param {string} companionId - Companion ID
     * @returns {array} Array of special effects from equipped items
     */
    getSpecialCombatEffects(companionId) {
        const equipment = this.companionEquipment[companionId] || { head: null, body: null, weapon: null, accessory: null };
        const effects = [];

        // Check each equipped item for special effects
        Object.values(equipment).forEach(item => {
            if (item && this.specialCombatEffects[item]) {
                effects.push({
                    item: item,
                    ...this.specialCombatEffects[item]
                });
            }
        });

        return effects;
    }

    /**
     * Render companion details on the right page
     */
    renderCompanionDetails(rightPage, companionId) {
        if (!companionId || !this.allCompanions[companionId]) {
            rightPage.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <p style="font-size: 18px;">Select a companion to view details</p>
                </div>
            `;
            return;
        }

        const companion = this.allCompanions[companionId];
        const isActive = companionId === this.activeCompanion;
        const stats = this.calculateStats(companionId);
        const equipment = this.companionEquipment[companionId] || { head: null, body: null, weapon: null, accessory: null };

        rightPage.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <img src="art/entities/${companion.sprite_portrait}" alt="${companion.name}" style="
                    width: 150px;
                    height: 150px;
                    border-radius: 12px;
                    border: 4px solid #D4AF37;
                    object-fit: cover;
                    background: #4A3728;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                ">
                <h2 style="margin: 15px 0 5px 0; color: #2C1810; font-size: 28px;">${companion.name}</h2>
                <p style="margin: 0; color: #666; font-size: 14px; font-style: italic;">${companion.description}</p>
            </div>

            <div style="background: rgba(255, 255, 255, 0.3); border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                <h3 style="margin: 0 0 10px 0; color: #4A3728; font-size: 18px; border-bottom: 1px solid #D4AF37; padding-bottom: 5px;">
                    ⚔️ Combat Stats
                </h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px; color: #2C1810;">
                    <div><strong>❤️ HP:</strong> ${stats.hp}${stats.hp > companion.hp ? ` <span style="color: #4CAF50;">(+${stats.hp - companion.hp})</span>` : ''}</div>
                    <div><strong>⚔️ Attack:</strong> ${stats.attack}${stats.attack > companion.attack ? ` <span style="color: #4CAF50;">(+${stats.attack - companion.attack})</span>` : ''}</div>
                    <div><strong>🛡️ Defense:</strong> ${stats.defense}${stats.defense > companion.defense ? ` <span style="color: #4CAF50;">(+${stats.defense - companion.defense})</span>` : ''}</div>
                    <div><strong>⚡ Speed:</strong> ${stats.speed}${stats.speed > companion.speed ? ` <span style="color: #4CAF50;">(+${stats.speed - companion.speed})</span>` : ''}</div>
                    <div style="grid-column: 1 / -1;"><strong>🌟 Tier:</strong> ${companion.tier}</div>
                </div>
            </div>

            <div style="background: rgba(255, 255, 255, 0.3); border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                <h3 style="margin: 0 0 10px 0; color: #4A3728; font-size: 18px; border-bottom: 1px solid #D4AF37; padding-bottom: 5px;">
                    🎒 Equipment
                </h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    ${this.renderEquipmentSlot('head', equipment.head, '🎩')}
                    ${this.renderEquipmentSlot('body', equipment.body, '👕')}
                    ${this.renderEquipmentSlot('weapon', equipment.weapon, '⚔️')}
                    ${this.renderEquipmentSlot('accessory', equipment.accessory, '💍')}
                </div>
            </div>

            <div style="background: rgba(255, 255, 255, 0.3); border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                <h3 style="margin: 0 0 10px 0; color: #4A3728; font-size: 18px; border-bottom: 1px solid #D4AF37; padding-bottom: 5px;">
                    ✨ Abilities
                </h3>
                <div style="font-size: 14px; color: #2C1810;">
                    ${companion.abilities.map(ability => `<div style="padding: 5px 0;">• ${ability}</div>`).join('')}
                </div>
            </div>

            ${companion.craftable ? `
                <div style="background: rgba(255, 255, 255, 0.3); border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                    <h3 style="margin: 0 0 10px 0; color: #4A3728; font-size: 18px; border-bottom: 1px solid #D4AF37; padding-bottom: 5px;">
                        🔨 Crafting Materials
                    </h3>
                    <div style="font-size: 14px; color: #2C1810;">
                        ${Object.entries(companion.craft_materials).map(([mat, count]) =>
                            `<div style="padding: 5px 0;">• ${mat.replace('_', ' ')}: ${count}</div>`
                        ).join('')}
                    </div>
                </div>
            ` : ''}

            <div style="text-align: center; margin-top: 20px;">
                <button id="set-active-btn" style="
                    padding: 12px 30px;
                    font-size: 16px;
                    font-family: 'Georgia', serif;
                    background: ${isActive ? 'linear-gradient(135deg, #90EE90 0%, #98FB98 50%, #90EE90 100%)' : 'linear-gradient(135deg, #D4AF37 0%, #F4E4A6 50%, #D4AF37 100%)'};
                    color: #2C1810;
                    border: 3px solid #8B7355;
                    border-radius: 8px;
                    cursor: ${isActive ? 'default' : 'pointer'};
                    font-weight: bold;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                    transition: all 0.2s ease;
                    ${isActive ? 'opacity: 0.7;' : ''}
                " ${isActive ? 'disabled' : ''}>
                    ${isActive ? '⭐ Active Companion' : 'Set as Active'}
                </button>
            </div>
        `;

        // Wire up Set Active button
        const setActiveBtn = rightPage.querySelector('#set-active-btn');
        if (setActiveBtn && !isActive) {
            setActiveBtn.addEventListener('mouseover', () => {
                setActiveBtn.style.transform = 'scale(1.05)';
            });

            setActiveBtn.addEventListener('mouseout', () => {
                setActiveBtn.style.transform = 'scale(1)';
            });

            setActiveBtn.addEventListener('click', () => {
                this.setActiveCompanion(companionId);
            });
        }

        // Wire up equipment slot clicks
        const equipmentSlots = rightPage.querySelectorAll('.equipment-slot');
        equipmentSlots.forEach(slot => {
            slot.addEventListener('click', (e) => {
                // Don't trigger if clicking unequip button
                if (e.target.classList.contains('unequip-btn')) return;

                const slotName = slot.dataset.slot;
                this.openEquipmentSelector(companionId, slotName);
            });
        });

        // Wire up unequip buttons
        const unequipBtns = rightPage.querySelectorAll('.unequip-btn');
        unequipBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const slotName = btn.dataset.slot;
                this.unequipItem(companionId, slotName);
                this.renderCompanionDetails(rightPage, companionId);
                this.voxelWorld.updateHotbarCounts();
            });
        });
    }

    /**
     * Open item selector to equip items from inventory
     */
    openEquipmentSelector(companionId, slotName) {
        // Get all equippable items from player inventory
        const equippableItems = [];

        // Check hotbar
        for (let i = 0; i < 5; i++) {
            const slot = this.voxelWorld.getHotbarSlot(i);
            if (slot && slot.itemType && this.equipmentBonuses[slot.itemType]) {
                equippableItems.push({ location: 'hotbar', index: i, itemType: slot.itemType, quantity: slot.quantity });
            }
        }

        // Check backpack
        for (let i = 0; i < 25; i++) {
            const slot = this.voxelWorld.getBackpackSlot(i);
            if (slot && slot.itemType && this.equipmentBonuses[slot.itemType]) {
                equippableItems.push({ location: 'backpack', index: i, itemType: slot.itemType, quantity: slot.quantity });
            }
        }

        if (equippableItems.length === 0) {
            alert('No equippable items in inventory! Find items like skulls 💀, crystals 💎, or equipment ⚔️ in the world.');
            return;
        }

        // Create selection modal
        const selector = document.createElement('div');
        selector.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #E8D5B7, #F5E6D3);
            border: 4px solid #8B4513;
            border-radius: 12px;
            padding: 20px;
            z-index: 10000;
            max-width: 400px;
            max-height: 500px;
            overflow-y: auto;
            box-shadow: 0 0 30px rgba(0, 0, 0, 0.8);
        `;

        selector.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #4A3728; text-align: center; font-family: Georgia, serif;">
                Select Item for ${slotName} Slot
            </h3>
            <div id="item-list" style="display: flex; flex-direction: column; gap: 8px;"></div>
            <button id="cancel-btn" style="
                width: 100%;
                padding: 10px;
                margin-top: 15px;
                font-size: 14px;
                font-family: Georgia, serif;
                background: #ccc;
                border: 2px solid #999;
                border-radius: 6px;
                cursor: pointer;
            ">Cancel</button>
        `;

        document.body.appendChild(selector);

        const itemList = selector.querySelector('#item-list');
        equippableItems.forEach(item => {
            const itemBtn = document.createElement('button');
            const bonuses = this.equipmentBonuses[item.itemType];
            const bonusText = [];
            if (bonuses.hp) bonusText.push(`+${bonuses.hp} HP`);
            if (bonuses.attack) bonusText.push(`+${bonuses.attack} ATK`);
            if (bonuses.defense) bonusText.push(`+${bonuses.defense} DEF`);
            if (bonuses.speed) bonusText.push(`+${bonuses.speed} SPD`);

            itemBtn.style.cssText = `
                padding: 12px;
                font-size: 14px;
                text-align: left;
                background: rgba(212, 175, 55, 0.2);
                border: 2px solid #D4AF37;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 8px;
            `;

            // Show icon for crafted tools with ❓ fallback
            let itemIconHtml = '';
            if (bonuses.icon) {
                itemIconHtml = `
                    <img src="${bonuses.icon}" alt="${bonuses.label}"
                        onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';"
                        style="width: 32px; height: 32px; image-rendering: pixelated;">
                    <span style="display: none; font-size: 24px;">❓</span>
                `;
            }

            itemBtn.innerHTML = `
                ${itemIconHtml}
                <div style="flex: 1;">
                    <div style="font-weight: bold; color: #2C1810; margin-bottom: 4px;">${bonuses.label}</div>
                    <div style="font-size: 12px; color: #666;">${bonusText.join(', ')}</div>
                </div>
            `;

            itemBtn.addEventListener('mouseover', () => {
                itemBtn.style.background = 'rgba(212, 175, 55, 0.4)';
            });

            itemBtn.addEventListener('mouseout', () => {
                itemBtn.style.background = 'rgba(212, 175, 55, 0.2)';
            });

            itemBtn.addEventListener('click', () => {
                // Remove item from inventory
                if (item.location === 'hotbar') {
                    const slot = this.voxelWorld.getHotbarSlot(item.index);
                    this.voxelWorld.setHotbarSlot(item.index, slot.quantity > 1 ? slot.itemType : null, slot.quantity - 1);
                } else {
                    const slot = this.voxelWorld.getBackpackSlot(item.index);
                    this.voxelWorld.setBackpackSlot(item.index, slot.quantity > 1 ? slot.itemType : null, slot.quantity - 1);
                }

                // Equip item
                this.equipItem(companionId, slotName, item.itemType);

                // Update UI
                const rightPage = document.getElementById('codex-right-page');
                this.renderCompanionDetails(rightPage, companionId);
                this.voxelWorld.updateHotbarCounts();

                // Close selector
                selector.remove();
            });

            itemList.appendChild(itemBtn);
        });

        // Cancel button
        selector.querySelector('#cancel-btn').addEventListener('click', () => {
            selector.remove();
        });
    }

    /**
     * Render a single equipment slot
     */
    renderEquipmentSlot(slotName, itemType, slotIcon) {
        const itemData = itemType ? this.equipmentBonuses[itemType] : null;
        const itemLabel = itemData?.label || (itemType || 'Empty');
        const isEmpty = !itemType;

        // Show item icon if it exists (for crafted tools), otherwise show ❓ emoji fallback
        let itemIconHtml = '';
        if (itemData?.icon && !isEmpty) {
            // Use ❓ emoji as fallback if image fails to load
            itemIconHtml = `<img src="${itemData.icon}" alt="${itemLabel}"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';"
                style="width: 32px; height: 32px; vertical-align: middle; margin-right: 4px; image-rendering: pixelated;">
                <span style="display: none; font-size: 24px; margin-right: 4px;">❓</span>`;
        }

        return `
            <div class="equipment-slot" data-slot="${slotName}" style="
                background: ${isEmpty ? 'rgba(0, 0, 0, 0.2)' : 'rgba(212, 175, 55, 0.2)'};
                border: 2px ${isEmpty ? 'dashed' : 'solid'} ${isEmpty ? '#999' : '#D4AF37'};
                border-radius: 6px;
                padding: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                position: relative;
            ">
                <div style="font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 4px;">
                    ${slotIcon} ${slotName}
                </div>
                <div style="font-size: 13px; color: #2C1810; font-weight: ${isEmpty ? 'normal' : 'bold'}; display: flex; align-items: center;">
                    ${itemIconHtml}
                    <span>${itemLabel.replace(/^[⚔️⛏️🔨📿🧭💀💎🪶🦴🐻‍❄️❄️🍄🍓🌸]\s*/, '')}</span>
                </div>
                ${!isEmpty ? `<div style="position: absolute; top: 4px; right: 4px; font-size: 10px; cursor: pointer; color: #c0392b;" class="unequip-btn" data-slot="${slotName}">✖</div>` : ''}
            </div>
        `;
    }

    /**
     * Equip an item to a companion
     */
    equipItem(companionId, slotName, itemType) {
        if (!this.companionEquipment[companionId]) {
            this.companionEquipment[companionId] = { head: null, body: null, weapon: null, accessory: null };
        }

        // Return old item if replacing
        const oldItem = this.companionEquipment[companionId][slotName];
        if (oldItem) {
            this.voxelWorld.inventory.addToInventory(oldItem, 1);
        }

        // Equip new item
        this.companionEquipment[companionId][slotName] = itemType;
        this.saveEquipment();

        console.log(`✅ Equipped ${itemType} to ${companionId}'s ${slotName} slot`);
        return oldItem;
    }

    /**
     * Unequip an item from a companion
     */
    unequipItem(companionId, slotName) {
        if (!this.companionEquipment[companionId]) return null;

        const item = this.companionEquipment[companionId][slotName];
        if (item) {
            this.companionEquipment[companionId][slotName] = null;
            this.saveEquipment();
            this.voxelWorld.inventory.addToInventory(item, 1);
            console.log(`✅ Unequipped ${item} from ${companionId}'s ${slotName} slot`);
        }

        return item;
    }

    /**
     * Set a companion as the active companion
     */
    setActiveCompanion(companionId) {
        this.activeCompanion = companionId;

        // Save to localStorage
        const playerData = JSON.parse(localStorage.getItem('NebulaWorld_playerData') || '{}');
        playerData.activeCompanion = companionId;
        localStorage.setItem('NebulaWorld_playerData', JSON.stringify(playerData));

        console.log(`⭐ Set active companion: ${companionId}`);

        // Re-render pages to update UI
        const leftPage = document.getElementById('codex-left-page');
        const rightPage = document.getElementById('codex-right-page');
        this.renderCompanionList(leftPage);
        this.renderCompanionDetails(rightPage, companionId);

        // 🖼️ Refresh companion portrait to show new active companion
        if (this.voxelWorld.companionPortrait) {
            this.voxelWorld.companionPortrait.refresh();
        }
    }

    /**
     * Hide the codex
     * @param {boolean} reEngagePointerLock - Whether to re-engage pointer lock (default true)
     */
    hide(reEngagePointerLock = true) {
        if (!this.codexElement) return;

        this.codexElement.style.opacity = '0';
        setTimeout(() => {
            if (this.codexElement && this.codexElement.parentNode) {
                this.codexElement.parentNode.removeChild(this.codexElement);
                this.codexElement = null;
            }

            // Re-enable VoxelWorld controls
            if (this.voxelWorld) {
                this.voxelWorld.controlsEnabled = true;
                console.log('✅ Re-enabled input controls after closing Companion Codex');

                // 🎨 Show hotbar and companion portrait again
                if (this.voxelWorld.hotbarElement) {
                    this.voxelWorld.hotbarElement.style.display = 'flex';
                }
                if (this.voxelWorld.companionPortrait && this.voxelWorld.companionPortrait.portraitElement) {
                    this.voxelWorld.companionPortrait.portraitElement.style.display = 'block';
                }

                // Only re-request pointer lock if closing completely (not switching tabs)
                if (reEngagePointerLock) {
                    setTimeout(() => {
                        if (this.voxelWorld.renderer && this.voxelWorld.renderer.domElement) {
                            this.voxelWorld.renderer.domElement.requestPointerLock();
                        }
                    }, 100);
                }
            }
        }, 300);
    }
}
