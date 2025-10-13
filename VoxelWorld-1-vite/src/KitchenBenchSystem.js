/**
 * 🍳 KitchenBenchSystem - Food Crafting & Buff System
 *
 * Features:
 * - Mix-and-match ingredient cooking (not fixed recipes!)
 * - Ingredient-based food discovery
 * - Food buffs (stamina restore, speed boost, reduced drain, etc.)
 * - Interactive UI like Toolbench/Workbench
 * - Uses harvested crops from FarmingSystem
 */

import * as THREE from 'three';

export class KitchenBenchSystem {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;

        // State management
        this.isOpen = false;
        this.selectedIngredients = new Set();  // Multi-select ingredients
        this.selectedIngredient = null;        // Single ingredient for preview
        this.discoveredFoods = new Set();      // Foods player has made

        // UI elements
        this.kitchenModal = null;
        this.ingredientsListElement = null;
        this.foodsListElement = null;

        // Define all food combinations
        this.foodDatabase = this.defineFoods();

        // Define ingredient properties
        this.ingredientData = this.defineIngredients();

        console.log('🍳 KitchenBenchSystem initialized with', Object.keys(this.foodDatabase).length, 'food types');
        
        // Load discovered foods from previous sessions
        this.loadDiscoveredFoods();
    }

    /**
     * Define ingredient properties (effects, categories)
     */
    defineIngredients() {
        return {
            // 🌾 GRAINS
            wheat: { 
                name: '🌾 Wheat', 
                category: 'grain',
                effects: ['filling', 'energy'],
                baseStamina: 10
            },
            rice: { 
                name: '🍚 Rice', 
                category: 'grain',
                effects: ['filling', 'energy'],
                baseStamina: 12
            },
            corn_ear: { 
                name: '🌽 Corn', 
                category: 'grain',
                effects: ['filling', 'sweet'],
                baseStamina: 8
            },

            // 🥕 VEGETABLES
            carrot: { 
                name: '🥕 Carrot', 
                category: 'vegetable',
                effects: ['healthy', 'speed'],
                baseStamina: 5
            },
            potato: { 
                name: '🥔 Potato', 
                category: 'vegetable',
                effects: ['filling', 'energy'],
                baseStamina: 15
            },
            pumpkin: { 
                name: '🎃 Pumpkin', 
                category: 'vegetable',
                effects: ['filling', 'sweet'],
                baseStamina: 20
            },

            // 🍓 FRUITS
            berry: { 
                name: '🍓 Berry', 
                category: 'fruit',
                effects: ['sweet', 'quick'],
                baseStamina: 3
            },
            apple: { 
                name: '🍎 Apple', 
                category: 'fruit',
                effects: ['sweet', 'healthy'],
                baseStamina: 5
            },

            // 🍖 PROTEINS (obtained via CompanionHunt system)
            fish: { 
                name: '🐟 Fish', 
                category: 'protein',
                effects: ['protein', 'filling'],
                baseStamina: 25
            },
            egg: { 
                name: '🥚 Egg', 
                category: 'protein',
                effects: ['protein', 'energy'],
                baseStamina: 10
            },

            // 🍄 SPECIAL
            mushroom: { 
                name: '🍄 Mushroom', 
                category: 'special',
                effects: ['savory', 'speed'],
                baseStamina: 8
            },
            honey: { 
                name: '🍯 Honey', 
                category: 'special',
                effects: ['sweet', 'energy', 'healing'],
                baseStamina: 15
            }
        };
    }

    /**
     * Define food combinations and their buffs
     * Each food has ingredient combos that create it
     */
    defineFoods() {
        return {
            // 🍞 BASIC FOODS (1 ingredient)
            roasted_wheat: {
                name: '🍞 Bread',
                ingredients: { wheat: 3 },
                buffs: {
                    stamina: 30,
                    duration: 60,  // seconds
                    effects: ['Well Fed: +30 stamina']
                },
                emoji: '🍞',
                description: 'Simple bread, restores stamina'
            },

            baked_potato: {
                name: '🥔 Baked Potato',
                ingredients: { potato: 1 },
                buffs: {
                    stamina: 45,
                    staminaDrainReduction: 0.2,  // 20% less drain
                    duration: 90
                },
                emoji: '🥔',
                description: 'Filling! Reduces stamina drain by 20%'
            },

            roasted_corn: {
                name: '🌽 Roasted Corn',
                ingredients: { corn_ear: 1 },
                buffs: {
                    stamina: 25,
                    duration: 45
                },
                emoji: '🌽',
                description: 'Sweet and energizing'
            },

            grilled_fish: {
                name: '🍣 Grilled Fish',
                ingredients: { fish: 1 },
                buffs: {
                    stamina: 75,
                    speedBoost: 1.2,  // 20% faster
                    duration: 60
                },
                emoji: '🍣',
                description: 'Protein-rich! +20% movement speed'
            },

            // 🥗 COMBINATIONS (2 ingredients)
            carrot_stew: {
                name: '🥕🍲 Carrot Stew',
                ingredients: { carrot: 3, potato: 1 },
                buffs: {
                    stamina: 60,
                    speedBoost: 1.15,  // 15% faster
                    duration: 120
                },
                emoji: '🍲',
                description: 'Healthy stew! +15% speed for 2min'
            },

            berry_bread: {
                name: '🍓🍞 Berry Bread',
                ingredients: { wheat: 2, berry: 4 },
                buffs: {
                    stamina: 50,
                    regenBoost: 2.0,  // 2x regen rate
                    duration: 90
                },
                emoji: '🫓',
                description: 'Sweet! Doubles stamina regen'
            },

            mushroom_soup: {
                name: '🍄🍲 Mushroom Soup',
                ingredients: { mushroom: 3, potato: 1 },
                buffs: {
                    stamina: 55,
                    speedBoost: 1.25,  // 25% faster
                    staminaDrainReduction: 0.15,
                    duration: 120
                },
                emoji: '🥣',
                description: 'Energizing! +25% speed, -15% drain'
            },

            fish_rice: {
                name: '🐟🍚 Fish & Rice',
                ingredients: { fish: 1, rice: 2 },
                buffs: {
                    stamina: 100,
                    staminaDrainReduction: 0.3,  // 30% less drain
                    duration: 180
                },
                emoji: '🍱',
                description: 'Hearty meal! -30% stamina drain for 3min'
            },

            // 🍰 ADVANCED (3+ ingredients)
            veggie_medley: {
                name: '🥗 Veggie Medley',
                ingredients: { carrot: 2, potato: 1, mushroom: 1 },
                buffs: {
                    stamina: 80,
                    speedBoost: 1.3,  // 30% faster
                    regenBoost: 1.5,  // 50% more regen
                    duration: 150
                },
                emoji: '🥗',
                description: 'Power salad! +30% speed, +50% regen'
            },

            honey_bread: {
                name: '🍯🍞 Honey Bread',
                ingredients: { wheat: 2, honey: 1 },
                buffs: {
                    stamina: 70,
                    healing: 20,  // Restore 20 HP
                    regenBoost: 3.0,  // 3x regen
                    duration: 120
                },
                emoji: '🥖',
                description: 'Healing! +20 HP, 3x stamina regen'
            },

            pumpkin_pie: {
                name: '🎃🥧 Pumpkin Pie',
                ingredients: { pumpkin: 1, wheat: 2, honey: 1 },
                buffs: {
                    stamina: 120,
                    staminaDrainReduction: 0.4,  // 40% less drain
                    speedBoost: 1.2,
                    duration: 240
                },
                emoji: '🥧',
                description: 'Legendary! -40% drain, +20% speed for 4min!'
            },

            super_stew: {
                name: '🍲 Super Stew',
                ingredients: { fish: 1, potato: 2, carrot: 1, mushroom: 1 },
                buffs: {
                    stamina: 150,
                    speedBoost: 1.4,  // 40% faster
                    staminaDrainReduction: 0.5,  // 50% less drain
                    regenBoost: 2.0,
                    healing: 30,
                    duration: 300
                },
                emoji: '🍜',
                description: 'ULTIMATE! All buffs for 5 minutes!'
            },

            // 🍪 QUICK SNACKS
            berry_honey_snack: {
                name: '🍓🍯 Berry-Honey Snack',
                ingredients: { berry: 3, honey: 1 },
                buffs: {
                    stamina: 40,
                    regenBoost: 4.0,  // 4x regen!
                    duration: 60
                },
                emoji: '🍪',
                description: 'Quick energy! 4x stamina regen'
            },

            energy_bar: {
                name: '⚡ Energy Bar',
                ingredients: { wheat: 1, honey: 1, berry: 2 },
                buffs: {
                    stamina: 60,
                    speedBoost: 1.5,  // 50% faster!
                    duration: 90
                },
                emoji: '🍫',
                description: 'Speed burst! +50% movement speed'
            },

            // 🍪 QUICK SNACKS (continued)
            rice_bowl: {
                name: '🍯🍞 Honey Bread',
                ingredients: { wheat: 2, honey: 1 },
                buffs: {
                    stamina: 70,
                    healing: 20,  // Restore 20 HP
                    regenBoost: 3.0,  // 3x regen
                    duration: 120
                },
                emoji: '🥖',
                description: 'Healing! +20 HP, 3x stamina regen'
            },

            pumpkin_pie: {
                name: '🎃🥧 Pumpkin Pie',
                ingredients: { pumpkin: 1, wheat: 2, honey: 1 },
                buffs: {
                    stamina: 120,
                    staminaDrainReduction: 0.4,  // 40% less drain
                    speedBoost: 1.2,
                    duration: 240
                },
                emoji: '🥧',
                description: 'Legendary! -40% drain, +20% speed for 4min!'
            },

            super_stew: {
                name: '🍲 Super Stew',
                ingredients: { fish: 1, potato: 2, carrot: 1, mushroom: 1 },
                buffs: {
                    stamina: 150,
                    speedBoost: 1.4,  // 40% faster
                    staminaDrainReduction: 0.5,  // 50% less drain
                    regenBoost: 2.0,
                    healing: 30,
                    duration: 300
                },
                emoji: '🍜',
                description: 'ULTIMATE! All buffs for 5 minutes!'
            },

            // 🍪 QUICK SNACKS
            berry_honey_snack: {
                name: '🍓🍯 Berry-Honey Snack',
                ingredients: { berry: 3, honey: 1 },
                buffs: {
                    stamina: 40,
                    regenBoost: 4.0,  // 4x regen!
                    duration: 60
                },
                emoji: '🍪',
                description: 'Quick energy! 4x stamina regen'
            },

            energy_bar: {
                name: '⚡ Energy Bar',
                ingredients: { wheat: 1, honey: 1, berry: 2 },
                buffs: {
                    stamina: 60,
                    speedBoost: 1.5,  // 50% faster!
                    duration: 90
                },
                emoji: '🍫',
                description: 'Speed burst! +50% movement speed'
            },

            // 🍳 EGG DISHES (CompanionHunt ingredient)
            cooked_egg: {
                name: '🍳 Cooked Egg',
                ingredients: { egg: 1 },
                buffs: {
                    stamina: 30,
                    speedBoost: 1.1,  // 10% faster
                    duration: 45
                },
                emoji: '🍳',
                description: 'Protein boost! +10% movement speed'
            },

            // 🍪 TREATS
            cookie: {
                name: '🍪 Cookie',
                ingredients: { wheat: 1, honey: 1 },
                buffs: {
                    stamina: 35,
                    regenBoost: 2.5,  // 2.5x regen
                    duration: 60
                },
                emoji: '🍪',
                description: 'Sweet treat! 2.5x stamina regen'
            }
        };
    }

    /**
     * Open the Kitchen Bench UI
     */
    open() {
        if (this.isOpen) return;
        this.isOpen = true;

        // Pause game
        this.voxelWorld.isPaused = true;

        // Release pointer lock
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }

        // Disable controls
        this.voxelWorld.controlsEnabled = false;

        // Create modal
        this.createKitchenModal();

        // Populate ingredients list
        this.updateIngredientsDisplay();

        // Populate foods list
        this.updateFoodsDisplay();

        console.log('🍳 Kitchen Bench opened');
    }

    /**
     * Close the Kitchen Bench UI
     */
    close() {
        if (!this.isOpen) return;

        this.isOpen = false;
        this.voxelWorld.isPaused = false;

        // Re-enable controls
        this.voxelWorld.controlsEnabled = true;

        // Re-request pointer lock
        setTimeout(() => {
            this.voxelWorld.renderer.domElement.requestPointerLock();
        }, 100);

        if (this.kitchenModal) {
            this.kitchenModal.remove();
            this.kitchenModal = null;
        }

        // Clear selections
        this.selectedIngredients.clear();
        this.selectedIngredient = null;

        console.log('🍳 Kitchen Bench closed');
    }

    /**
     * Create the Kitchen Bench modal UI
     */
    createKitchenModal() {
        this.kitchenModal = document.createElement('div');
        this.kitchenModal.className = 'kitchen-modal';
        this.kitchenModal.innerHTML = `
            <div class="kitchen-container">
                <div class="kitchen-header">
                    <h2>🍳 Kitchen Bench</h2>
                    <button class="close-btn">✕</button>
                </div>
                
                <div class="kitchen-content">
                    <!-- Left: Ingredients -->
                    <div class="kitchen-panel ingredients-panel">
                        <h3>📦 Ingredients</h3>
                        <div class="ingredients-list"></div>
                    </div>
                    
                    <!-- Middle: Preview & Cook -->
                    <div class="kitchen-panel preview-panel">
                        <h3>🔥 Cooking</h3>
                        <div class="selected-ingredients">
                            <p style="color: #888; text-align: center;">Select ingredients to cook</p>
                        </div>
                        <div class="cook-info">
                            <p id="ingredient-count">0 ingredients selected</p>
                        </div>
                        <button class="cook-btn" disabled>🍳 Cook!</button>
                        <button class="clear-btn">🗑️ Clear</button>
                    </div>
                    
                    <!-- Right: Recipe Book -->
                    <div class="kitchen-panel foods-panel">
                        <h3>📖 Recipe Book</h3>
                        <div class="foods-list"></div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.kitchenModal);

        // Get element references
        this.ingredientsListElement = this.kitchenModal.querySelector('.ingredients-list');
        this.foodsListElement = this.kitchenModal.querySelector('.foods-list');

        // Event listeners
        this.kitchenModal.querySelector('.close-btn').addEventListener('click', () => this.close());
        this.kitchenModal.querySelector('.cook-btn').addEventListener('click', () => this.attemptCook());
        this.kitchenModal.querySelector('.clear-btn').addEventListener('click', () => this.clearSelection());

        // ESC to close
        const handleEsc = (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }

    /**
     * Update ingredients display
     */
    updateIngredientsDisplay() {
        if (!this.ingredientsListElement) return;

        // Get inventory using the correct method
        const inventory = this.voxelWorld.getAllMaterialsFromSlots?.() || {};
        this.ingredientsListElement.innerHTML = '';

        // Get all available ingredients
        const availableIngredients = Object.entries(this.ingredientData)
            .filter(([key]) => inventory[key] && inventory[key] > 0)
            .sort((a, b) => a[1].name.localeCompare(b[1].name));

        console.log(`🍳 Kitchen Bench: Found ${availableIngredients.length} ingredients in inventory`, inventory);

        if (availableIngredients.length === 0) {
            this.ingredientsListElement.innerHTML = `
                <div style="padding: 20px; color: #888; text-align: center;">
                    <p>No ingredients!</p>
                    <p style="font-size: 0.9em;">Harvest crops to get ingredients</p>
                </div>
            `;
            return;
        }

        availableIngredients.forEach(([key, data]) => {
            const quantity = inventory[key] || 0;
            const isSelected = this.selectedIngredients.has(key);

            const item = document.createElement('div');
            item.className = `ingredient-item ${isSelected ? 'selected' : ''}`;
            item.innerHTML = `
                <span class="ingredient-emoji">${data.name.split(' ')[0]}</span>
                <div class="ingredient-info">
                    <div class="ingredient-name">${data.name}</div>
                    <div class="ingredient-quantity">x${quantity}</div>
                </div>
            `;

            item.addEventListener('click', () => this.toggleIngredient(key));
            this.ingredientsListElement.appendChild(item);
        });
    }

    /**
     * Update foods/recipe book display
     */
    updateFoodsDisplay() {
        if (!this.foodsListElement) return;

        this.foodsListElement.innerHTML = '';

        Object.entries(this.foodDatabase).forEach(([key, food]) => {
            const isDiscovered = this.discoveredFoods.has(key);

            const foodCard = document.createElement('div');
            foodCard.className = `food-card ${isDiscovered ? 'discovered' : 'undiscovered'}`;

            if (isDiscovered) {
                // Show full recipe
                const ingredients = Object.entries(food.ingredients)
                    .map(([ing, qty]) => `${qty}x ${this.ingredientData[ing]?.name || ing}`)
                    .join(', ');

                const buffsText = food.buffs.effects?.join(', ') || 
                    Object.entries(food.buffs)
                        .filter(([k]) => k !== 'duration' && k !== 'effects')
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(', ');

                foodCard.innerHTML = `
                    <div class="food-emoji">${food.emoji}</div>
                    <div class="food-info">
                        <div class="food-name">${food.name}</div>
                        <div class="food-ingredients">${ingredients}</div>
                        <div class="food-description">${food.description}</div>
                    </div>
                `;
            } else {
                // Show mystery
                foodCard.innerHTML = `
                    <div class="food-emoji">❓</div>
                    <div class="food-info">
                        <div class="food-name">Unknown Recipe</div>
                        <div class="food-description" style="font-style: italic;">
                            Experiment with ingredients to discover!
                        </div>
                    </div>
                `;
            }

            this.foodsListElement.appendChild(foodCard);
        });
    }

    /**
     * Toggle ingredient selection
     */
    toggleIngredient(ingredientKey) {
        if (this.selectedIngredients.has(ingredientKey)) {
            this.selectedIngredients.delete(ingredientKey);
        } else {
            this.selectedIngredients.add(ingredientKey);
        }

        this.updateIngredientsDisplay();
        this.updateCookingPreview();
    }

    /**
     * Clear all selections
     */
    clearSelection() {
        this.selectedIngredients.clear();
        this.updateIngredientsDisplay();
        this.updateCookingPreview();
    }

    /**
     * Update cooking preview panel
     */
    updateCookingPreview() {
        const previewContainer = this.kitchenModal.querySelector('.selected-ingredients');
        const countElement = this.kitchenModal.querySelector('#ingredient-count');
        const cookBtn = this.kitchenModal.querySelector('.cook-btn');

        if (this.selectedIngredients.size === 0) {
            previewContainer.innerHTML = '<p style="color: #888; text-align: center;">Select ingredients to cook</p>';
            countElement.textContent = '0 ingredients selected';
            cookBtn.disabled = true;
            return;
        }

        // Show selected ingredients
        const inventory = this.voxelWorld.inventory?.items || {};
        let html = '<div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">';
        
        this.selectedIngredients.forEach(key => {
            const data = this.ingredientData[key];
            const quantity = inventory[key] || 0;
            html += `
                <div style="text-align: center;">
                    <div style="font-size: 2em;">${data.name.split(' ')[0]}</div>
                    <div style="font-size: 0.8em;">x1/${quantity}</div>
                </div>
            `;
        });
        html += '</div>';

        previewContainer.innerHTML = html;
        countElement.textContent = `${this.selectedIngredients.size} ingredients selected`;
        cookBtn.disabled = false;
    }

    /**
     * Attempt to cook with selected ingredients
     */
    attemptCook() {
        if (this.selectedIngredients.size === 0) return;

        // Build ingredient count map
        const selectedCounts = {};
        this.selectedIngredients.forEach(key => {
            selectedCounts[key] = 1;  // Each selected = 1 unit
        });

        // Find matching recipe
        let matchedFood = null;
        for (const [key, food] of Object.entries(this.foodDatabase)) {
            if (this.ingredientsMatch(selectedCounts, food.ingredients)) {
                matchedFood = { key, ...food };
                break;
            }
        }

        if (matchedFood) {
            this.cookFood(matchedFood);
        } else {
            // Failed - random discovery hint
            this.voxelWorld.updateStatus('🤔 Hmm... this combination doesn\'t work. Try different ingredients!', 'error');
            this.showCookingFailEffect();
        }
    }

    /**
     * Check if ingredients match a recipe
     */
    ingredientsMatch(selected, required) {
        const selectedKeys = Object.keys(selected);
        const requiredKeys = Object.keys(required);

        // Must have exact same ingredients
        if (selectedKeys.length !== requiredKeys.length) return false;

        for (const key of requiredKeys) {
            if (!selected[key] || selected[key] < required[key]) {
                return false;
            }
        }

        return true;
    }

    /**
     * Cook the food!
     */
    cookFood(food) {
        // Check inventory has enough
        const inventory = this.voxelWorld.inventory?.items || {};
        for (const [ing, qty] of Object.entries(food.ingredients)) {
            if (!inventory[ing] || inventory[ing] < qty) {
                this.voxelWorld.updateStatus(`❌ Not enough ${ing}!`, 'error');
                return;
            }
        }

        // Consume ingredients
        for (const [ing, qty] of Object.entries(food.ingredients)) {
            this.voxelWorld.inventory.removeItem(ing, qty);
        }

        // Add food to inventory
        this.voxelWorld.addToInventory(food.key, 1);

        // Mark as discovered
        const wasDiscovered = this.discoveredFoods.has(food.key);
        this.discoveredFoods.add(food.key);
        this.saveDiscoveredFoods();

        // Success message
        if (!wasDiscovered) {
            this.voxelWorld.updateStatus(`🎉 DISCOVERED: ${food.name}!`, 'discovery');
            this.showDiscoveryEffect();
        } else {
            this.voxelWorld.updateStatus(`🍳 Cooked: ${food.name}`, 'success');
        }

        // Update displays
        this.clearSelection();
        this.updateIngredientsDisplay();
        this.updateFoodsDisplay();

        console.log('🍳 Cooked:', food.name);
    }

    /**
     * Show cooking fail effect
     */
    showCookingFailEffect() {
        const effect = document.createElement('div');
        effect.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 4em;
            animation: failShake 0.5s ease;
            pointer-events: none;
            z-index: 100000;
        `;
        effect.textContent = '💨';
        document.body.appendChild(effect);

        setTimeout(() => effect.remove(), 500);
    }

    /**
     * Show discovery effect
     */
    showDiscoveryEffect() {
        const effect = document.createElement('div');
        effect.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 5em;
            animation: discoveryPop 1s ease;
            pointer-events: none;
            z-index: 100000;
        `;
        effect.textContent = '✨';
        document.body.appendChild(effect);

        setTimeout(() => effect.remove(), 1000);
    }

    /**
     * Apply food buff when eaten
     */
    applyFoodBuff(foodKey) {
        const food = this.foodDatabase[foodKey];
        if (!food) return;

        const buffs = food.buffs;

        // Restore stamina
        if (buffs.stamina && this.voxelWorld.staminaSystem) {
            this.voxelWorld.staminaSystem.restoreStamina(buffs.stamina);
        }

        // Restore HP
        if (buffs.healing && this.voxelWorld.playerHP) {
            this.voxelWorld.playerHP.heal(buffs.healing);
        }

        // Apply timed buffs
        if (buffs.speedBoost || buffs.staminaDrainReduction || buffs.regenBoost) {
            this.applyTimedBuff(foodKey, buffs);
        }

        console.log('🍽️ Ate:', food.name, 'Buffs:', buffs);
    }

    /**
     * Apply timed buff effects
     */
    applyTimedBuff(foodKey, buffs) {
        const duration = buffs.duration || 60;
        const buffData = {
            foodKey,
            startTime: Date.now(),
            endTime: Date.now() + (duration * 1000),
            ...buffs
        };

        // Store active buff
        if (!this.voxelWorld.activeBuffs) {
            this.voxelWorld.activeBuffs = [];
        }
        this.voxelWorld.activeBuffs.push(buffData);

        // Apply to stamina system
        if (this.voxelWorld.staminaSystem) {
            if (buffs.speedBoost) {
                this.voxelWorld.staminaSystem.speedMultiplier = buffs.speedBoost;
            }
            if (buffs.staminaDrainReduction) {
                this.voxelWorld.staminaSystem.drainReduction = buffs.staminaDrainReduction;
            }
            if (buffs.regenBoost) {
                this.voxelWorld.staminaSystem.regenMultiplier = buffs.regenBoost;
            }
        }

        // Show buff notification
        this.showBuffNotification(foodKey, buffs, duration);

        // Set timeout to remove buff
        setTimeout(() => {
            this.removeTimedBuff(buffData);
        }, duration * 1000);
    }

    /**
     * Remove timed buff
     */
    removeTimedBuff(buffData) {
        if (!this.voxelWorld.activeBuffs) return;

        const index = this.voxelWorld.activeBuffs.indexOf(buffData);
        if (index > -1) {
            this.voxelWorld.activeBuffs.splice(index, 1);
        }

        // Reset stamina system multipliers
        if (this.voxelWorld.staminaSystem) {
            this.voxelWorld.staminaSystem.speedMultiplier = 1.0;
            this.voxelWorld.staminaSystem.drainReduction = 0;
            this.voxelWorld.staminaSystem.regenMultiplier = 1.0;
        }

        console.log('⏱️ Buff expired:', buffData.foodKey);
    }

    /**
     * Show buff notification
     */
    showBuffNotification(foodKey, buffs, duration) {
        const food = this.foodDatabase[foodKey];
        const notification = document.createElement('div');
        notification.className = 'buff-notification';
        notification.innerHTML = `
            <div style="font-size: 2em;">${food.emoji}</div>
            <div>${food.name} buff active!</div>
            <div style="font-size: 0.9em; opacity: 0.8;">${duration}s</div>
        `;
        notification.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 20px;
            background: rgba(0, 200, 100, 0.9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            animation: slideInRight 0.3s ease;
            z-index: 1000;
            text-align: center;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Save discovered foods to localStorage
     */
    saveDiscoveredFoods() {
        const discovered = Array.from(this.discoveredFoods);
        localStorage.setItem('voxelworld_discovered_foods', JSON.stringify(discovered));
    }

    /**
     * Load discovered foods from localStorage
     */
    loadDiscoveredFoods() {
        const saved = localStorage.getItem('voxelworld_discovered_foods');
        if (saved) {
            try {
                const discovered = JSON.parse(saved);
                this.discoveredFoods = new Set(discovered);
                console.log('📖 Loaded', discovered.length, 'discovered foods');
            } catch (e) {
                console.error('Failed to load discovered foods:', e);
            }
        }
    }
}
