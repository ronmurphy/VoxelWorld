/**
 * ItemRegistry.js
 * 
 * Central registry for all craftable items with their implementation status
 * and in-game behaviors. This bridges the gap between JSON definitions and
 * actual game functionality.
 */

export class ItemRegistry {
    constructor() {
        this.items = new Map();
        this.loadAllItems();
    }

    /**
     * Load item definitions from all crafting systems
     */
    async loadAllItems() {
        try {
            // Load all JSON definition files
            const [blueprints, recipes, plans] = await Promise.all([
                fetch('/data/blueprints.json').then(r => r.json()),
                fetch('/data/recipes.json').then(r => r.json()),
                fetch('/data/plans.json').then(r => r.json())
            ]);

            // Register all items with their categories
            this.registerCategory('tool', blueprints);
            this.registerCategory('food', recipes);
            this.registerCategory('structure', plans);

            console.log(`📋 ItemRegistry loaded: ${this.items.size} items`);
        } catch (err) {
            console.error('❌ Failed to load item definitions:', err);
        }
    }

    /**
     * Register items from a category
     */
    registerCategory(category, items) {
        for (const [id, data] of Object.entries(items)) {
            if (id.startsWith('_')) continue; // Skip comments
            
            this.items.set(id, {
                ...data,
                category,
                status: this.determineStatus(id, category)
            });
        }
    }

    /**
     * Determine implementation status of an item
     * Returns: 'complete' | 'partial' | 'planned'
     */
    determineStatus(itemId, category) {
        // Check if item has defined behavior in game code
        const implementations = {
            // ✅ COMPLETE - Fully working with assets
            complete: [
                'stone_pickaxe', 'stone_axe', 'stone_hoe', 'stone_spear',
                'watering_can', 'crafted_watering_can',
                'roasted_wheat', 'grilled_fish', 'berry_bread',
                'toolbench', 'kitchen_bench', 'workbench'
            ],
            
            // 🚧 PARTIAL - Works but needs assets or polish
            partial: [
                'machete', 'crafted_machete',
                'speed_boots', 'crafted_speed_boots',
                'backpack', 'crafted_backpack',
                'carrot_stew',
                'campfire', 'chest', 'bed', 'fence'
            ]
        };

        if (implementations.complete.includes(itemId)) return 'complete';
        if (implementations.partial.includes(itemId)) return 'partial';
        return 'planned';
    }

    /**
     * Get item info by ID
     */
    getItem(itemId) {
        // Handle crafted_ prefix
        const baseId = itemId.replace(/^crafted_/, '');
        return this.items.get(baseId) || this.items.get(itemId);
    }

    /**
     * Check if item is implemented
     */
    isImplemented(itemId) {
        const item = this.getItem(itemId);
        return item && item.status !== 'planned';
    }

    /**
     * Get visual indicator for item status
     */
    getStatusIndicator(itemId) {
        const item = this.getItem(itemId);
        if (!item) return '❓';
        
        const indicators = {
            complete: '✅',
            partial: '🚧',
            planned: '📋'
        };
        
        return indicators[item.status] || '❓';
    }

    /**
     * Get status text
     */
    getStatusText(itemId) {
        const item = this.getItem(itemId);
        if (!item) return 'Unknown';
        
        const texts = {
            complete: 'Fully Implemented',
            partial: 'Partially Working',
            planned: 'Planned Feature'
        };
        
        return texts[item.status] || 'Unknown';
    }

    /**
     * Get all items in a category
     */
    getItemsByCategory(category) {
        return Array.from(this.items.values())
            .filter(item => item.category === category);
    }

    /**
     * Get all items by status
     */
    getItemsByStatus(status) {
        return Array.from(this.items.values())
            .filter(item => item.status === status);
    }

    /**
     * Get implementation statistics
     */
    getStats() {
        const stats = {
            total: this.items.size,
            complete: 0,
            partial: 0,
            planned: 0
        };

        for (const item of this.items.values()) {
            stats[item.status]++;
        }

        stats.implementedPercent = Math.round(
            ((stats.complete + stats.partial) / stats.total) * 100
        );

        return stats;
    }

    /**
     * Execute item behavior (if implemented)
     * @param {string} itemId - Item to execute
     * @param {object} context - Game context (voxelWorld, player, etc)
     * @returns {boolean} True if behavior executed
     */
    executeItem(itemId, context) {
        const item = this.getItem(itemId);
        if (!item || item.status === 'planned') {
            console.warn(`⚠️ Item ${itemId} not implemented yet`);
            return false;
        }

        // Dispatch to appropriate handler based on category
        switch (item.category) {
            case 'tool':
                return this.executeTool(item, context);
            case 'food':
                return this.executeFood(item, context);
            case 'structure':
                return this.executeStructure(item, context);
            default:
                console.warn(`⚠️ Unknown item category: ${item.category}`);
                return false;
        }
    }

    /**
     * Execute tool behavior
     */
    executeTool(item, context) {
        const { voxelWorld } = context;
        
        // Tools are typically handled by their own systems
        // This is just a notification
        if (item.status === 'partial') {
            voxelWorld.updateStatus(
                `🚧 ${item.name} (Partially implemented - may need polish)`,
                'warning'
            );
        }
        return true;
    }

    /**
     * Execute food consumption
     */
    executeFood(item, context) {
        const { voxelWorld } = context;
        
        if (!item.result) return false;

        // Apply stamina restoration
        if (item.result.stamina && voxelWorld.staminaSystem) {
            voxelWorld.staminaSystem.currentStamina = Math.min(
                voxelWorld.staminaSystem.maxStamina,
                voxelWorld.staminaSystem.currentStamina + item.result.stamina
            );
            voxelWorld.staminaSystem.updateStaminaDisplay();
        }

        // Apply speed boost (if implemented)
        if (item.result.speedBoost) {
            // TODO: Implement temporary speed buff system
            console.log(`🏃 Speed boost: ${item.result.speedBoost}x for ${item.result.duration}s`);
        }

        // Show effects
        const effects = item.result.effects?.join(', ') || 'Consumed';
        voxelWorld.updateStatus(`🍽️ Ate ${item.name}: ${effects}`);
        
        return true;
    }

    /**
     * Execute structure placement
     */
    executeStructure(item, context) {
        const { voxelWorld } = context;
        
        if (!item.result?.placeable) return false;

        voxelWorld.updateStatus(`📦 Place ${item.name} in world`);
        return true;
    }
}

// Create singleton instance
export const itemRegistry = new ItemRegistry();
