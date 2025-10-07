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
        }
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
            z-index: 1000;
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
                    <div><strong>❤️ HP:</strong> ${companion.hp}</div>
                    <div><strong>⚔️ Attack:</strong> ${companion.attack}</div>
                    <div><strong>🛡️ Defense:</strong> ${companion.defense}</div>
                    <div><strong>⚡ Speed:</strong> ${companion.speed}</div>
                    <div style="grid-column: 1 / -1;"><strong>🌟 Tier:</strong> ${companion.tier}</div>
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
