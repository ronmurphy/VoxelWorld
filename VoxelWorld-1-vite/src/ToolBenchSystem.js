/**
 * 🔧 ToolBenchSystem - Tool Crafting & Upgrade System
 *
 * Features:
 * - Craft tools from discovery items (mushrooms, crystals, treasures)
 * - Permanent upgrades (backpack stack size, movement speed, etc.)
 * - Consumable tools (grappling hook, healing potions, light orbs)
 * - Blueprint-based crafting (not recipes)
 * - One tool at a time (no quantity sliders)
 */

import * as THREE from 'three';

export class ToolBenchSystem {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;

        // State management
        this.isOpen = false;
        this.selectedItems = new Set();  // Multi-select items
        this.selectedItem = null;        // Single item for preview
        this.selectedBlueprint = null;

        // UI elements
        this.toolBenchModal = null;
        this.itemsListElement = null;
        this.blueprintsListElement = null;

        // Define all tool blueprints
        this.blueprints = this.defineBlueprints();

        console.log('🔧 ToolBenchSystem initialized with', Object.keys(this.blueprints).length, 'blueprints');
    }

    /**
     * Define all tool blueprints
     */
    defineBlueprints() {
        return {
            // 🕸️ MOVEMENT TOOLS
            grappling_hook: {
                name: '🕸️ Grappling Hook',
                items: { leaves: 3, feather: 1 },
                description: 'Teleport to targeted blocks. 10 charges.',
                clues: {
                    leaves: 'Something that falls gently when released...',
                    feather: 'Something associated with being in the sky...'
                },
                category: 'movement',
                isConsumable: true,
                charges: 10,
                isGrapplingHook: true
            },

            speed_boots: {
                name: '👢 Speed Boots',
                items: { feather: 4, fur: 2 },
                description: 'Permanent +50% movement speed upgrade',
                clues: {
                    feather: 'Something associated with being in the sky...',
                    fur: 'Something warm from cold places...'
                },
                category: 'movement',
                isUpgrade: true,
                upgradeType: 'movementSpeed',
                upgradeValue: 1.5
            },

            // 🎒 BACKPACK UPGRADES
            backpack_upgrade_1: {
                name: '🎒 Backpack Upgrade I',
                items: { fur: 4, ancientAmulet: 1 },
                description: 'Increase stack size from 50 to 75',
                category: 'upgrade',
                isUpgrade: true,
                upgradeType: 'backpackStackSize',
                upgradeValue: 75,
                requiresUpgrade: null  // No prerequisite
            },

            backpack_upgrade_2: {
                name: '🎒 Backpack Upgrade II',
                items: { fur: 4, ancientAmulet: 2, crystal: 3 },
                description: 'Increase stack size from 75 to 100',
                category: 'upgrade',
                isUpgrade: true,
                upgradeType: 'backpackStackSize',
                upgradeValue: 100,
                requiresUpgrade: 75  // Must have tier 1 first
            },

            // ⚔️ COMBAT TOOLS
            combat_sword: {
                name: '⚔️ Combat Sword',
                items: { rustySword: 1, bone: 2, crystal: 1 },
                description: 'Functional combat weapon',
                category: 'combat',
                isTool: true
            },

            mining_pick: {
                name: '⛏️ Mining Pick',
                items: { oldPickaxe: 1, oreNugget: 3, crystal: 1 },
                description: 'Mine blocks faster',
                category: 'combat',
                isTool: true
            },

            // 🔨 HARVESTING TOOLS
            stone_hammer: {
                name: '🔨 Stone Hammer',
                items: { stone: 3, stick: 2 },
                description: 'Smash stone for iron or coal! Breaks iron blocks.',
                clues: {
                    stone: 'Three pieces of the earth, hard and grey...',
                    stick: 'Two handles from leaves, crafted today...'
                },
                category: 'harvesting',
                isTool: true,
                isHarvestTool: true,
                toolType: 'stone_hammer',
                canHarvest: ['stone', 'iron'],
                harvestEffects: {
                    stone: {
                        animation: 'explosion',
                        drops: [
                            { item: 'iron', chance: 0.20, message: '⛏️ Iron ore discovered!' },
                            { item: 'coal', chance: 0.10, message: '⛏️ Coal found!' }
                        ]
                    },
                    iron: {
                        animation: 'explosion',
                        drops: [
                            { item: 'iron', chance: 0.15, message: '⛏️ Iron extracted!' }
                        ]
                    }
                }
            },

            machete_upgrade: {
                name: '🔪 Enhanced Machete',
                items: { machete: 1, crystal: 2, skull: 1 },
                description: 'Faster leaf harvesting (+50% speed)',
                category: 'upgrade',
                isUpgrade: true,
                upgradeType: 'harvestSpeed',
                upgradeValue: 1.5
            },

            // 🧪 CONSUMABLES
            healing_potion: {
                name: '🧪 Healing Potion',
                items: { mushroom: 2, berry: 1, wheat: 1 },
                description: 'Restore health. 5 charges.',
                category: 'consumable',
                isConsumable: true,
                charges: 5
            },

            light_orb: {
                name: '💡 Light Orb',
                items: { crystal: 3, iceShard: 2 },
                description: 'Portable light source. 10 charges.',
                category: 'consumable',
                isConsumable: true,
                charges: 10
            },

            magic_amulet: {
                name: '📿 Magic Amulet',
                items: { ancientAmulet: 1, crystal: 3, iceShard: 2 },
                description: 'Mysterious powers (TBD)',
                category: 'special',
                isTool: true
            },

            // 🧭 NAVIGATION TOOLS
            compass: {
                name: '🧭 Compass',
                items: { iron: 3, stick: 1 },
                description: 'Track one item type forever. Right-click to set target.',
                clues: {
                    iron: 'Three pieces of metal, forged with care...',
                    stick: 'A handle to hold, to point you there...'
                },
                category: 'navigation',
                isTool: true,
                isCompass: true,
                canReassign: false
            },

            compass_upgrade: {
                name: '🧭 Crystal Compass',
                items: { compass: 1, crystal: 2 },
                description: 'Reassign target anytime. Right-click to change.',
                clues: {
                    compass: 'Your trusty guide, now worn and old...',
                    crystal: 'Two shards of sight, to break the hold...'
                },
                category: 'navigation',
                isTool: true,
                isCompass: true,
                canReassign: true,
                isUpgrade: true
            }
        };
    }

    /**
     * Open the tool bench interface
     */
    open() {
        if (this.isOpen) return;

        this.isOpen = true;
        this.createToolBenchUI();

        // Release pointer lock
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }

        // Disable VoxelWorld controls
        if (this.voxelWorld) {
            this.voxelWorld.controlsEnabled = false;
            console.log('🔒 Disabled VoxelWorld controls for tool bench');
        }

        console.log('🔧 Tool Bench opened');
    }

    /**
     * Close the tool bench interface
     */
    close() {
        if (!this.isOpen) return;

        this.isOpen = false;

        if (this.toolBenchModal && this.toolBenchModal.parentNode) {
            this.toolBenchModal.parentNode.removeChild(this.toolBenchModal);
            this.toolBenchModal = null;
        }

        // Re-enable VoxelWorld controls
        if (this.voxelWorld) {
            this.voxelWorld.controlsEnabled = true;
            console.log('🔓 Re-enabled VoxelWorld controls');
        }

        // Re-acquire pointer lock for game
        setTimeout(() => {
            this.voxelWorld.renderer.domElement.requestPointerLock();
        }, 100);

        // Reset selections
        this.selectedItems.clear();
        this.selectedItem = null;
        this.selectedBlueprint = null;

        console.log('🔧 Tool Bench closed');
    }

    /**
     * Create the tool bench UI
     */
    createToolBenchUI() {
        // Main modal container with blueprint grid background
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            max-width: 1200px;
            height: 80%;
            background:
                linear-gradient(0deg, transparent 24%, rgba(100, 150, 200, 0.05) 25%, rgba(100, 150, 200, 0.05) 26%, transparent 27%, transparent 74%, rgba(100, 150, 200, 0.05) 75%, rgba(100, 150, 200, 0.05) 76%, transparent 77%, transparent),
                linear-gradient(90deg, transparent 24%, rgba(100, 150, 200, 0.05) 25%, rgba(100, 150, 200, 0.05) 26%, transparent 27%, transparent 74%, rgba(100, 150, 200, 0.05) 75%, rgba(100, 150, 200, 0.05) 76%, transparent 77%, transparent),
                linear-gradient(135deg, #0a1628 0%, #1a2842 50%, #0f1f3a 100%);
            background-size: 50px 50px, 50px 50px, 100% 100%;
            background-position: 0 0, 0 0, 0 0;
            border: 3px solid #FFD700;
            border-radius: 15px;
            box-shadow: 0 0 50px rgba(255, 215, 0, 0.5);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            font-family: 'Courier New', monospace;
        `;

        // Header with close button
        const header = document.createElement('div');
        header.style.cssText = `
            background: linear-gradient(90deg, #FFD700 0%, #FFA500 100%);
            color: #1a1a1a;
            padding: 15px;
            border-radius: 12px 12px 0 0;
            font-size: 24px;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        const title = document.createElement('span');
        title.textContent = '🔧 Tool Bench - Craft Tools & Upgrades';

        const closeButton = document.createElement('button');
        closeButton.textContent = '✕';
        closeButton.style.cssText = `
            background: #8B0000;
            color: white;
            border: none;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            font-size: 18px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.2s ease;
        `;
        closeButton.addEventListener('click', () => this.close());
        closeButton.addEventListener('mouseenter', () => {
            closeButton.style.background = '#CD0000';
            closeButton.style.transform = 'scale(1.1)';
        });
        closeButton.addEventListener('mouseleave', () => {
            closeButton.style.background = '#8B0000';
            closeButton.style.transform = 'scale(1)';
        });

        header.appendChild(title);
        header.appendChild(closeButton);

        // Main content area (two panels)
        const mainContent = document.createElement('div');
        mainContent.style.cssText = `
            display: flex;
            flex: 1;
            overflow: hidden;
            padding: 20px;
            gap: 20px;
        `;

        // Left panel: Items
        const itemsPanel = this.createItemsPanel();

        // Right panel: Blueprints
        const blueprintsPanel = this.createBlueprintsPanel();

        mainContent.appendChild(itemsPanel);
        mainContent.appendChild(blueprintsPanel);

        // Footer with craft button
        const footer = this.createFooter();

        modal.appendChild(header);
        modal.appendChild(mainContent);
        modal.appendChild(footer);

        document.body.appendChild(modal);
        this.toolBenchModal = modal;

        // ESC key to close
        const escHandler = (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    /**
     * Create items panel (left side)
     */
    createItemsPanel() {
        const panel = document.createElement('div');
        panel.style.cssText = `
            flex: 1;
            display: flex;
            flex-direction: column;
            background: rgba(0, 0, 0, 0.3);
            border: 2px solid #444;
            border-radius: 10px;
            padding: 15px;
            overflow-y: auto;
        `;

        const header = document.createElement('h3');
        header.style.color = '#FFD700';
        header.textContent = '📦 Discovery Items';

        const itemsList = document.createElement('div');
        itemsList.style.cssText = `
            display: grid;
            grid-template-columns: 1fr;
            gap: 5px;
            margin-bottom: 20px;
        `;

        this.itemsListElement = itemsList;

        // Get all discovery items from inventory
        const allItems = this.voxelWorld.getAllMaterialsFromSlots();
        Object.entries(allItems).forEach(([item, count]) => {
            if (count > 0 && this.isToolingItem(item)) {
                const itemElement = this.createItemElement(item, count);
                itemsList.appendChild(itemElement);
            }
        });

        // Info text
        const infoText = document.createElement('div');
        infoText.style.cssText = `
            color: #ccc;
            font-size: 12px;
            margin-top: 10px;
            padding: 10px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 5px;
        `;
        infoText.textContent = 'Select items here, then choose a blueprint from the right panel.';

        panel.appendChild(header);
        panel.appendChild(itemsList);
        panel.appendChild(infoText);

        return panel;
    }

    /**
     * Create blueprints panel (right side)
     */
    createBlueprintsPanel() {
        const panel = document.createElement('div');
        panel.style.cssText = `
            flex: 1;
            display: flex;
            flex-direction: column;
            background: rgba(0, 0, 0, 0.3);
            border: 2px solid #444;
            border-radius: 10px;
            padding: 15px;
            overflow-y: auto;
        `;

        const header = document.createElement('h3');
        header.style.color = '#FFD700';
        header.textContent = '📜 Blueprints';

        const blueprintsList = document.createElement('div');
        blueprintsList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;

        this.blueprintsListElement = blueprintsList;

        // Display all blueprints by category
        this.updateBlueprintDisplay();

        panel.appendChild(header);
        panel.appendChild(blueprintsList);

        return panel;
    }

    /**
     * Create footer with craft button
     */
    createFooter() {
        const footer = document.createElement('div');
        footer.style.cssText = `
            padding: 15px;
            border-top: 2px solid #444;
            display: flex;
            justify-content: center;
            gap: 15px;
        `;

        const craftButton = document.createElement('button');
        craftButton.textContent = '🔨 CRAFT TOOL';
        craftButton.style.cssText = `
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            border: none;
            padding: 15px 40px;
            font-size: 18px;
            font-weight: bold;
            border-radius: 8px;
            cursor: pointer;
            font-family: 'Courier New', monospace;
        `;

        craftButton.addEventListener('click', () => this.craftTool());

        footer.appendChild(craftButton);

        return footer;
    }

    /**
     * Check if item is a tooling/discovery item
     */
    isToolingItem(item) {
        const toolingItems = [
            // Leaves (all types)
            'oak_wood-leaves', 'pine_wood-leaves', 'birch_wood-leaves', 'palm_wood-leaves', 'dead_wood-leaves',
            'forest_leaves', 'mountain_leaves', 'desert_leaves', 'plains_leaves', 'tundra_leaves',
            // Discovery items
            'mushroom', 'flower', 'berry', 'leaf',
            'crystal', 'oreNugget',
            'wheat', 'feather', 'bone',
            'shell', 'fur', 'iceShard',
            // Equipment
            'rustySword', 'oldPickaxe', 'ancientAmulet',
            'skull',
            // Crafted materials
            'stick',
            // Existing tools
            'machete'
        ];
        return toolingItems.includes(item);
    }

    /**
     * Create item element
     */
    createItemElement(item, count) {
        const element = document.createElement('div');
        element.dataset.item = item;
        element.style.cssText = `
            display: flex;
            flex-direction: column;
            padding: 8px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 5px;
            border: 2px solid transparent;
            transition: all 0.2s ease;
            cursor: pointer;
        `;

        const emoji = this.voxelWorld.getItemIcon(item);
        const name = item.charAt(0).toUpperCase() + item.slice(1).replace('_', ' ');

        element.innerHTML = `
            <span style="color: white; display: flex; justify-content: space-between; align-items: center;">
                <span>
                    <span style="font-size: 20px;">${emoji}</span>
                    <span style="margin-left: 8px;">${name}</span>
                </span>
                <span style="color: #FFD700; font-weight: bold;">x${count}</span>
            </span>
        `;

        element.addEventListener('click', () => this.toggleItemSelection(item));

        return element;
    }

    /**
     * Toggle item selection
     */
    toggleItemSelection(item) {
        if (this.selectedItems.has(item)) {
            this.selectedItems.delete(item);
            this.selectedItem = null;
        } else {
            this.selectedItems.add(item);
            this.selectedItem = item;
        }

        this.updateItemVisuals();
        this.updateBlueprintDisplay();
    }

    /**
     * Update item visual selection
     */
    updateItemVisuals() {
        if (!this.itemsListElement) return;

        Array.from(this.itemsListElement.children).forEach(element => {
            const item = element.dataset.item;
            if (this.selectedItems.has(item)) {
                element.style.borderColor = '#FFD700';
                element.style.backgroundColor = 'rgba(255, 215, 0, 0.2)';
            } else {
                element.style.borderColor = 'transparent';
                element.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }
        });
    }

    /**
     * Update blueprint display (filter by selected items)
     */
    updateBlueprintDisplay() {
        if (!this.blueprintsListElement) return;

        this.blueprintsListElement.innerHTML = '';

        // Group blueprints by category
        const categories = {
            movement: [],
            navigation: [],
            upgrade: [],
            combat: [],
            harvesting: [],
            consumable: [],
            special: []
        };

        Object.entries(this.blueprints).forEach(([id, blueprint]) => {
            categories[blueprint.category].push({ id, ...blueprint });
        });

        // Display each category
        Object.entries(categories).forEach(([category, blueprints]) => {
            if (blueprints.length === 0) return;

            const categoryHeader = document.createElement('div');
            categoryHeader.style.cssText = `
                color: #FFD700;
                font-weight: bold;
                margin-top: 10px;
                margin-bottom: 5px;
                text-transform: uppercase;
                font-size: 12px;
            `;
            categoryHeader.textContent = `[${category}]`;
            this.blueprintsListElement.appendChild(categoryHeader);

            blueprints.forEach(blueprint => {
                const blueprintElement = this.createBlueprintElement(blueprint);
                this.blueprintsListElement.appendChild(blueprintElement);
            });
        });
    }

    /**
     * Create blueprint element
     */
    createBlueprintElement(blueprint) {
        const element = document.createElement('div');
        element.style.cssText = `
            padding: 10px;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid #444;
            border-radius: 5px;
            margin-bottom: 5px;
            cursor: pointer;
            transition: all 0.2s ease;
        `;

        // Check if craftable
        const canCraft = this.canCraftBlueprint(blueprint.id);

        // Show requirements with unlocked icons
        const requirementsList = Object.entries(blueprint.items)
            .map(([item, qty]) => {
                const have = this.countItemWithMatching(item);
                const hasEnough = have >= qty;
                const hasAny = have > 0;
                const color = hasEnough ? '#4CAF50' : '#f44336';

                // Show icon if player has discovered this item, otherwise show ?
                // Use the actual item they have if it's a generic type
                let displayIcon = '❓';
                if (hasAny) {
                    // Find the first matching item they actually have
                    const allItems = this.voxelWorld.getAllMaterialsFromSlots();
                    for (const [playerItem, count] of Object.entries(allItems)) {
                        if (count > 0 && this.itemMatches(item, playerItem)) {
                            displayIcon = this.voxelWorld.getItemIcon(playerItem);
                            break;
                        }
                    }
                }

                return `<span style="color: ${color};">${displayIcon} ${qty} (${have})</span>`;
            })
            .join(', ');

        // Show clues for missing items
        let cluesHtml = '';
        if (blueprint.clues) {
            const missingClues = Object.entries(blueprint.items)
                .filter(([item]) => this.countItemWithMatching(item) === 0)
                .map(([item]) => blueprint.clues[item])
                .filter(clue => clue);

            if (missingClues.length > 0) {
                cluesHtml = `
                    <div style="color: #FFD700; font-size: 10px; font-style: italic; margin-top: 5px; padding: 5px; background: rgba(0,0,0,0.3); border-radius: 3px;">
                        💡 ${missingClues.join(' • ')}
                    </div>
                `;
            }
        }

        element.innerHTML = `
            <div style="color: white; font-weight: bold; margin-bottom: 5px;">${blueprint.name}</div>
            <div style="color: #ccc; font-size: 12px; margin-bottom: 5px;">${blueprint.description}</div>
            <div style="color: #999; font-size: 11px;">Requires: ${requirementsList}</div>
            ${cluesHtml}
        `;

        if (canCraft) {
            element.style.borderColor = '#4CAF50';
        }

        element.addEventListener('click', () => {
            this.selectedBlueprint = blueprint.id;
            this.highlightSelectedBlueprint();
        });

        return element;
    }

    /**
     * Highlight selected blueprint
     */
    highlightSelectedBlueprint() {
        if (!this.blueprintsListElement) return;

        Array.from(this.blueprintsListElement.querySelectorAll('div[style*="padding"]')).forEach(el => {
            if (el.textContent.includes(this.blueprints[this.selectedBlueprint]?.name)) {
                el.style.backgroundColor = 'rgba(255, 215, 0, 0.2)';
            } else {
                el.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            }
        });
    }

    /**
     * Check if item type matches (handles generic types like "leaves")
     */
    itemMatches(blueprintItem, playerItem) {
        // Direct match
        if (blueprintItem === playerItem) {
            return true;
        }

        // "leaves" in blueprint matches any specific leaf type
        if (blueprintItem === 'leaves') {
            const leafTypes = [
                // Wood-based leaf types
                'oak_wood-leaves', 'pine_wood-leaves', 'birch_wood-leaves', 'palm_wood-leaves', 'dead_wood-leaves',
                // Biome-based leaf types
                'forest_leaves', 'mountain_leaves', 'desert_leaves', 'plains_leaves', 'tundra_leaves'
            ];
            return leafTypes.includes(playerItem);
        }

        // "wood" in blueprint matches any wood type
        if (blueprintItem === 'wood') {
            const woodTypes = ['oak_wood', 'pine_wood', 'birch_wood', 'palm_wood', 'dead_wood'];
            return woodTypes.includes(playerItem);
        }

        return false;
    }

    /**
     * Count how many of a specific item type the player has (with matching)
     */
    countItemWithMatching(blueprintItem) {
        let total = 0;

        // Get all items from inventory
        const allItems = this.voxelWorld.getAllMaterialsFromSlots();

        // Count items that match
        for (const [playerItem, count] of Object.entries(allItems)) {
            if (this.itemMatches(blueprintItem, playerItem)) {
                total += count;
            }
        }

        return total;
    }

    /**
     * Check if blueprint can be crafted
     */
    canCraftBlueprint(blueprintId) {
        const blueprint = this.blueprints[blueprintId];
        if (!blueprint) return false;

        // Check upgrade prerequisites
        if (blueprint.requiresUpgrade !== undefined && blueprint.requiresUpgrade !== null) {
            const currentValue = this.voxelWorld[blueprint.upgradeType] || 50;
            if (currentValue < blueprint.requiresUpgrade) {
                return false;
            }
        }

        // Check all item requirements (with matching)
        for (const [item, qty] of Object.entries(blueprint.items)) {
            const have = this.countItemWithMatching(item);
            if (have < qty) {
                return false;
            }
        }

        return true;
    }

    /**
     * Consume items with matching (e.g., consume oak_wood-leaves for "leaves" requirement)
     */
    consumeItemsWithMatching(blueprintItem, qtyNeeded) {
        let remaining = qtyNeeded;

        // Get all items from inventory
        const allItems = this.voxelWorld.getAllMaterialsFromSlots();

        // Remove matching items until we've consumed enough
        for (const [playerItem, count] of Object.entries(allItems)) {
            if (remaining <= 0) break;

            if (this.itemMatches(blueprintItem, playerItem)) {
                const toRemove = Math.min(remaining, count);
                this.voxelWorld.removeFromInventory(playerItem, toRemove);
                remaining -= toRemove;
            }
        }
    }

    /**
     * Craft the selected tool
     */
    craftTool() {
        if (!this.selectedBlueprint) {
            this.voxelWorld.updateStatus('⚠️ Select a blueprint first!', 'error');
            return;
        }

        const blueprint = this.blueprints[this.selectedBlueprint];

        if (!this.canCraftBlueprint(this.selectedBlueprint)) {
            this.voxelWorld.updateStatus('⚠️ Not enough items!', 'error');
            return;
        }

        // Consume items (with matching for generic types like "leaves")
        for (const [item, qty] of Object.entries(blueprint.items)) {
            this.consumeItemsWithMatching(item, qty);
        }

        // Apply based on type
        if (blueprint.isUpgrade) {
            this.applyUpgrade(blueprint);
        } else if (blueprint.isConsumable) {
            this.createConsumable(blueprint);
        } else if (blueprint.isTool) {
            this.createTool(blueprint);
        }

        // Update UI
        this.voxelWorld.updateHotbarCounts();
        this.voxelWorld.updateBackpackInventoryDisplay();
        this.updateItemsPanel();
        this.updateBlueprintDisplay();

        this.voxelWorld.updateStatus(`🔨 Crafted ${blueprint.name}!`, 'discovery');
    }

    /**
     * Apply upgrade to player
     */
    applyUpgrade(blueprint) {
        this.voxelWorld[blueprint.upgradeType] = blueprint.upgradeValue;
        console.log(`✅ Upgraded ${blueprint.upgradeType} to ${blueprint.upgradeValue}`);

        // Special handling for backpack stack size
        if (blueprint.upgradeType === 'backpackStackSize') {
            this.voxelWorld.inventory.STACK_LIMIT = blueprint.upgradeValue;
        }
    }

    /**
     * Create consumable tool
     */
    createConsumable(blueprint) {
        const itemId = `crafted_${this.selectedBlueprint}`;
        const metadata = {
            name: blueprint.name,
            type: 'crafted_tool',
            category: 'consumable',
            charges: blueprint.charges,
            isGrapplingHook: blueprint.isGrapplingHook || false
        };

        if (!this.voxelWorld.inventoryMetadata) {
            this.voxelWorld.inventoryMetadata = {};
        }
        this.voxelWorld.inventoryMetadata[itemId] = metadata;

        this.voxelWorld.addToInventory(itemId, 1);
    }

    /**
     * Create tool
     */
    createTool(blueprint) {
        // For tools with specific toolType (like stone_hammer), use that as itemId
        // For compass tools, use the blueprint ID directly (compass/compass_upgrade)
        // This allows game systems to recognize them properly
        const itemId = blueprint.toolType || (blueprint.isCompass ? this.selectedBlueprint : `crafted_${this.selectedBlueprint}`);
        
        // Store metadata for tools with special properties
        if (blueprint.toolType) {
            if (!this.voxelWorld.inventoryMetadata) {
                this.voxelWorld.inventoryMetadata = {};
            }
            this.voxelWorld.inventoryMetadata[itemId] = {
                name: blueprint.name,
                type: 'crafted_tool',
                toolType: blueprint.toolType,
                isHarvestTool: blueprint.isHarvestTool || false,
                canHarvest: blueprint.canHarvest || [],
                harvestEffects: blueprint.harvestEffects || {}
            };
        }
        
        this.voxelWorld.addToInventory(itemId, 1);
    }

    /**
     * Update items panel
     */
    updateItemsPanel() {
        if (!this.itemsListElement) return;

        this.itemsListElement.innerHTML = '';

        const allItems = this.voxelWorld.getAllMaterialsFromSlots();
        Object.entries(allItems).forEach(([item, count]) => {
            if (count > 0 && this.isToolingItem(item)) {
                const itemElement = this.createItemElement(item, count);
                this.itemsListElement.appendChild(itemElement);
            }
        });

        this.updateItemVisuals();
    }
}
