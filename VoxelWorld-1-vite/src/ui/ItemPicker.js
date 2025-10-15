/**
 * 🎯 ItemPicker - Compact, Reusable Item Selection Component
 * 
 * Singleton pattern - one instance shared across the app
 * Memory efficient with proper cleanup
 * Used by Sargem Quest Editor for item/condition nodes
 */

export class ItemPicker {
    constructor() {
        // Singleton pattern
        if (ItemPicker.instance) {
            return ItemPicker.instance;
        }

        this.overlay = null;
        this.currentCallback = null;
        this.items = this.gatherAllItems();
        this.expandedCategories = new Set(); // Track which categories are open
        
        ItemPicker.instance = this;
        console.log('🎯 ItemPicker initialized with', this.getTotalItemCount(), 'items');
    }

    /**
     * Gather all items from game systems
     * Run once on initialization
     */
    gatherAllItems() {
        return {
            'Tools': [
                { id: 'pickaxe', name: 'Pickaxe', emoji: '⛏️' },
                { id: 'axe', name: 'Axe', emoji: '🪓' },
                { id: 'shovel', name: 'Shovel', emoji: '🏔️' },
                { id: 'machete', name: 'Machete', emoji: '🔪' },
                { id: 'fishing_rod', name: 'Fishing Rod', emoji: '🎣' },
                { id: 'bow', name: 'Bow', emoji: '🏹' },
                { id: 'sword', name: 'Sword', emoji: '⚔️' },
                { id: 'hammer', name: 'Hammer', emoji: '🔨' },
            ],
            'Food': [
                { id: 'bread', name: 'Bread', emoji: '🍞' },
                { id: 'honey', name: 'Honey', emoji: '🍯' },
                { id: 'fish', name: 'Fish', emoji: '🐟' },
                { id: 'cooked_fish', name: 'Cooked Fish', emoji: '🍣' },
                { id: 'berry', name: 'Berry', emoji: '🫐' },
                { id: 'apple', name: 'Apple', emoji: '🍎' },
                { id: 'carrot', name: 'Carrot', emoji: '🥕' },
                { id: 'wheat', name: 'Wheat', emoji: '🌾' },
                { id: 'corn', name: 'Corn', emoji: '🌽' },
                { id: 'pumpkin', name: 'Pumpkin', emoji: '🎃' },
                { id: 'honey_bread', name: 'Honey Bread', emoji: '🍯' },
                { id: 'super_stew', name: 'Super Stew', emoji: '🍲' },
                { id: 'energy_bar', name: 'Energy Bar', emoji: '🍫' },
            ],
            'Materials': [
                { id: 'wood', name: 'Wood', emoji: '🪵' },
                { id: 'stone', name: 'Stone', emoji: '🪨' },
                { id: 'iron', name: 'Iron', emoji: '⚙️' },
                { id: 'gold', name: 'Gold', emoji: '🏆' },
                { id: 'stick', name: 'Stick', emoji: '🦴' },
                { id: 'string', name: 'String', emoji: '🧵' },
                { id: 'feather', name: 'Feather', emoji: '🪶' },
                { id: 'bone', name: 'Bone', emoji: '🦴' },
                { id: 'leather', name: 'Leather', emoji: '👜' },
            ],
            'World Items': [
                { id: 'torch', name: 'Torch', emoji: '🔦' },
                { id: 'campfire', name: 'Campfire', emoji: '🔥' },
                { id: 'light_orb', name: 'Light Orb', emoji: '💡' },
                { id: 'chest', name: 'Chest', emoji: '📦' },
                { id: 'door', name: 'Door', emoji: '🚪' },
                { id: 'ladder', name: 'Ladder', emoji: '🪜' },
            ],
            'Blocks': [
                { id: 'dirt', name: 'Dirt', emoji: '🟫' },
                { id: 'grass', name: 'Grass', emoji: '🟩' },
                { id: 'sand', name: 'Sand', emoji: '🟨' },
                { id: 'gravel', name: 'Gravel', emoji: '⬜' },
                { id: 'clay', name: 'Clay', emoji: '🧱' },
                { id: 'snow', name: 'Snow', emoji: '⬜' },
            ],
            'Seeds': [
                { id: 'wheat_seeds', name: 'Wheat Seeds', emoji: '🌾' },
                { id: 'carrot_seeds', name: 'Carrot Seeds', emoji: '🥕' },
                { id: 'berry_seeds', name: 'Berry Seeds', emoji: '🫐' },
                { id: 'pumpkin_seeds', name: 'Pumpkin Seeds', emoji: '🎃' },
                { id: 'corn_seeds', name: 'Corn Seeds', emoji: '🌽' },
            ]
        };
    }

    /**
     * Get total item count across all categories
     */
    getTotalItemCount() {
        return Object.values(this.items).reduce((sum, items) => sum + items.length, 0);
    }

    /**
     * Show the item picker
     * @param {string} currentValue - Currently selected item ID
     * @param {function} onSelect - Callback when item is selected (receives item object)
     */
    show(currentValue, onSelect) {
        console.log('🎯 ItemPicker.show() called with callback:', typeof onSelect, this);
        this.currentCallback = onSelect;
        console.log('🎯 Callback stored, this.currentCallback:', typeof this.currentCallback);
        this.createOverlay(currentValue);
    }

    /**
     * Hide and cleanup
     */
    hide() {
        console.log('🎯 ItemPicker.hide() called - stack trace:');
        console.trace();
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        this.currentCallback = null;
        this.expandedCategories.clear();
    }

    /**
     * Create the picker overlay UI
     */
    createOverlay(currentValue) {
        // Remove any existing overlay (but don't clear callback)
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }

        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 70000;
        `;

        // Create picker container
        const picker = document.createElement('div');
        picker.style.cssText = `
            background: #2d2d30;
            border-radius: 8px;
            width: 400px;
            max-height: 600px;
            display: flex;
            flex-direction: column;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        `;

        // Header with close button
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            border-bottom: 1px solid #3e3e42;
        `;
        header.innerHTML = `
            <h3 style="margin: 0; color: #cccccc; font-size: 16px;">🎯 Select Item</h3>
            <button style="
                background: none;
                border: none;
                color: #cccccc;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
            ">✕</button>
        `;

        const closeBtn = header.querySelector('button');
        closeBtn.onclick = () => this.hide();

        // Search box
        const searchBox = document.createElement('input');
        searchBox.type = 'text';
        searchBox.placeholder = '🔍 Search items...';
        searchBox.style.cssText = `
            margin: 10px 15px;
            padding: 8px;
            background: #3c3c3c;
            border: 1px solid #3e3e42;
            border-radius: 4px;
            color: #cccccc;
            font-size: 13px;
        `;

        // Items container (scrollable)
        const itemsContainer = document.createElement('div');
        itemsContainer.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 0 15px 15px 15px;
        `;

        // Render categories with event delegation
        this.renderCategories(itemsContainer, currentValue, '');

        // Search functionality (debounced)
        let searchTimeout;
        searchBox.oninput = (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.renderCategories(itemsContainer, currentValue, e.target.value);
            }, 300);
        };

        // Assemble UI
        picker.appendChild(header);
        picker.appendChild(searchBox);
        picker.appendChild(itemsContainer);
        this.overlay.appendChild(picker);

        // Stop event propagation from picker to overlay
        picker.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Store self reference for closure
        const self = this;

        // Event delegation for item clicks
        itemsContainer.addEventListener('click', (e) => {
            const itemEl = e.target.closest('[data-item-id]');
            if (itemEl) {
                const itemId = itemEl.dataset.itemId;
                const category = itemEl.dataset.category;
                const item = self.items[category].find(i => i.id === itemId);
                console.log('🎯 Item selected:', item);
                console.log('🎯 self.currentCallback:', self.currentCallback);
                console.log('🎯 this.currentCallback:', this.currentCallback);
                if (item && self.currentCallback) {
                    self.currentCallback(item);
                    self.hide();
                    console.log('✅ Picker dismissed');
                } else {
                    console.warn('⚠️ No callback or item not found', { 
                        item, 
                        hasSelfCallback: !!self.currentCallback,
                        hasThisCallback: !!this.currentCallback 
                    });
                }
            }

            // Category toggle
            const categoryHeader = e.target.closest('[data-category]');
            if (categoryHeader && !categoryHeader.dataset.itemId) {
                const category = categoryHeader.dataset.category;
                if (self.expandedCategories.has(category)) {
                    self.expandedCategories.delete(category);
                } else {
                    self.expandedCategories.add(category);
                }
                self.renderCategories(itemsContainer, currentValue, searchBox.value);
            }
        });

        // Close on overlay click (but not on picker itself)
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                console.log('🎯 Overlay clicked, closing picker');
                this.hide();
            }
        });

        document.body.appendChild(this.overlay);
        searchBox.focus();
    }

    /**
     * Render categories and items
     */
    renderCategories(container, currentValue, searchTerm) {
        container.innerHTML = '';
        const search = searchTerm.toLowerCase();

        Object.entries(this.items).forEach(([category, items]) => {
            // Filter items by search
            const filteredItems = search
                ? items.filter(item =>
                    item.name.toLowerCase().includes(search) ||
                    item.id.toLowerCase().includes(search)
                )
                : items;

            if (filteredItems.length === 0) return;

            // Auto-expand if searching
            const isExpanded = search || this.expandedCategories.has(category);

            // Category header
            const categoryHeader = document.createElement('div');
            categoryHeader.dataset.category = category;
            categoryHeader.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px;
                margin-top: 8px;
                background: #3c3c3c;
                border-radius: 4px;
                cursor: pointer;
                color: #cccccc;
                font-weight: 600;
                font-size: 13px;
            `;
            categoryHeader.innerHTML = `
                <span>${this.getCategoryIcon(category)} ${category}</span>
                <span style="font-size: 11px; opacity: 0.7;">${isExpanded ? '▼' : '▶'} ${filteredItems.length}</span>
            `;

            container.appendChild(categoryHeader);

            // Items list (only if expanded)
            if (isExpanded) {
                filteredItems.forEach(item => {
                    const itemEl = document.createElement('div');
                    itemEl.dataset.itemId = item.id;
                    itemEl.dataset.category = category;
                    const isSelected = item.id === currentValue;

                    itemEl.style.cssText = `
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 6px 12px;
                        margin: 2px 0;
                        background: ${isSelected ? '#0e639c' : '#252526'};
                        border-radius: 4px;
                        cursor: pointer;
                        color: #cccccc;
                        font-size: 13px;
                        transition: background 0.2s;
                    `;

                    itemEl.innerHTML = `
                        <span style="font-size: 16px;">${item.emoji}</span>
                        <span>${item.name}</span>
                        ${isSelected ? '<span style="margin-left: auto; font-size: 11px;">✓</span>' : ''}
                    `;

                    itemEl.onmouseenter = () => {
                        if (!isSelected) itemEl.style.background = '#37373d';
                    };
                    itemEl.onmouseleave = () => {
                        if (!isSelected) itemEl.style.background = '#252526';
                    };

                    container.appendChild(itemEl);
                });
            }
        });
    }

    /**
     * Get category icon
     */
    getCategoryIcon(category) {
        const icons = {
            'Tools': '⚒️',
            'Food': '🍎',
            'Materials': '🪨',
            'World Items': '🌍',
            'Blocks': '🟫',
            'Seeds': '🌱'
        };
        return icons[category] || '📦';
    }
}

// Export singleton instance
export const itemPicker = new ItemPicker();
