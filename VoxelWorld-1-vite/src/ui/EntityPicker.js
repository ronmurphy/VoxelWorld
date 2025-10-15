/**
 * EntityPicker - Reusable entity (enemies/animals/NPCs) selection component
 * Similar to ItemPicker but for selecting game entities
 * Loads entities from art/entities/entities.json
 */
export class EntityPicker {
    constructor() {
        // Singleton pattern
        if (EntityPicker.instance) {
            return EntityPicker.instance;
        }
        EntityPicker.instance = this;

        this.overlay = null;
        this.currentCallback = null;
        this.expandedCategories = new Set(['Enemies']); // Start with Enemies expanded
        this.entities = null;
        this.entitiesLoaded = false;
        
        // Load entities from JSON
        this.loadEntities();
    }

    /**
     * Load entities from entities.json
     */
    async loadEntities() {
        try {
            const response = await fetch('art/entities/entities.json');
            const data = await response.json();
            
            // Build entities structure from JSON
            this.entities = {
                'Enemies': [],
                'Animals': [],
                'NPCs': []
            };

            // Emoji mappings for entity types
            const emojiMap = {
                'rat': '🐀',
                'goblin_grunt': '👺',
                'troglodyte': '🦧',
                'angry_ghost': '👻',
                'ghost': '👻',
                'vine_creeper': '🌿',
                'zombie_crawler': '🧟',
                'skeleton_archer': '💀',
                // Animals
                'sheep': '🐑',
                'cow': '�',
                'pig': '🐷',
                'chicken': '🐔',
                'cat': '🐱',
                'birdA': '🐦',
                'birdB': '�',
                'fish': '🐟',
                // NPCs
                'villager': '🧑',
                'trader': '🧳',
                'blacksmith': '�',
                'guard': '🛡️',
                'farmer': '🧑‍🌾',
                'miner': '⛏️'
            };

            // Process monsters from entities.json
            if (data.monsters) {
                for (const [id, entityData] of Object.entries(data.monsters)) {
                    const entity = {
                        id: id,
                        name: entityData.name,
                        emoji: emojiMap[id] || '👾',
                        type: entityData.type
                    };

                    // Categorize by type
                    if (entityData.type === 'enemy') {
                        this.entities['Enemies'].push(entity);
                    } else if (entityData.type === 'friendly') {
                        this.entities['Animals'].push(entity);
                    }
                }
            }

            // Add hardcoded animals not in entities.json yet
            const additionalAnimals = [
                { id: 'sheep', name: 'Sheep', emoji: '🐑' },
                { id: 'cow', name: 'Cow', emoji: '🐄' },
                { id: 'pig', name: 'Pig', emoji: '🐷' },
                { id: 'chicken', name: 'Chicken', emoji: '🐔' },
                { id: 'cat', name: 'Cat', emoji: '🐱' },
                { id: 'birdA', name: 'Sparrow (Brown)', emoji: '🐦' },
                { id: 'birdB', name: 'Bluebird', emoji: '🐦' },
                { id: 'fish', name: 'Fish', emoji: '🐟' },
            ];

            for (const animal of additionalAnimals) {
                if (!this.entities['Animals'].find(e => e.id === animal.id)) {
                    this.entities['Animals'].push(animal);
                }
            }

            // Add NPCs (hardcoded for now)
            this.entities['NPCs'] = [
                { id: 'villager', name: 'Villager', emoji: '🧑' },
                { id: 'trader', name: 'Trader', emoji: '🧳' },
                { id: 'blacksmith', name: 'Blacksmith', emoji: '🔨' },
                { id: 'guard', name: 'Guard', emoji: '🛡️' },
                { id: 'farmer', name: 'Farmer', emoji: '🧑‍🌾' },
                { id: 'miner', name: 'Miner', emoji: '⛏️' },
            ];

            this.entitiesLoaded = true;
            console.log('👾 EntityPicker: Loaded entities from JSON:', this.entities);
        } catch (error) {
            console.error('❌ EntityPicker: Failed to load entities.json:', error);
            // Fallback to hardcoded entities
            this.entities = this.getFallbackEntities();
            this.entitiesLoaded = true;
        }
    }

    /**
     * Fallback entities if JSON load fails
     */
    getFallbackEntities() {
        return {
            'Enemies': [
                { id: 'zombie', name: 'Zombie', emoji: '🧟' },
                { id: 'skeleton', name: 'Skeleton', emoji: '💀' },
                { id: 'ghost', name: 'Ghost', emoji: '👻' },
            ],
            'Animals': [
                { id: 'sheep', name: 'Sheep', emoji: '🐑' },
                { id: 'cow', name: 'Cow', emoji: '🐄' },
                { id: 'pig', name: 'Pig', emoji: '🐷' },
                { id: 'chicken', name: 'Chicken', emoji: '🐔' },
                { id: 'cat', name: 'Cat', emoji: '🐱' },
                { id: 'birdA', name: 'Sparrow (Brown)', emoji: '🐦' },
                { id: 'birdB', name: 'Bluebird', emoji: '🐦' },
            ],
            'NPCs': [
                { id: 'villager', name: 'Villager', emoji: '🧑' },
                { id: 'trader', name: 'Trader', emoji: '🧳' },
            ],
        };
    }

    /**
     * Get total entity count across all categories
     */
    getTotalEntityCount() {
        return Object.values(this.entities).reduce((sum, entities) => sum + entities.length, 0);
    }

    /**
     * Show the entity picker
     * @param {string} currentValue - Currently selected entity ID
     * @param {function} onSelect - Callback when entity is selected (receives entity object)
     */
    async show(currentValue, onSelect) {
        console.log('🎯 EntityPicker.show() called with callback:', typeof onSelect);
        
        // Wait for entities to load if not ready
        if (!this.entitiesLoaded) {
            await this.loadEntities();
        }
        
        this.currentCallback = onSelect;
        this.createOverlay(currentValue);
    }

    /**
     * Hide and cleanup
     */
    hide() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        this.currentCallback = null;
        this.expandedCategories.clear();
        this.expandedCategories.add('Enemies'); // Default for next time
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
            <h3 style="margin: 0; color: #cccccc; font-size: 16px;">👾 Select Entity</h3>
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
        searchBox.placeholder = '🔍 Search entities...';
        searchBox.style.cssText = `
            margin: 10px 15px;
            padding: 8px;
            background: #3c3c3c;
            border: 1px solid #3e3e42;
            border-radius: 4px;
            color: #cccccc;
            font-size: 13px;
        `;

        // Entities container (scrollable)
        const entitiesContainer = document.createElement('div');
        entitiesContainer.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 0 15px 15px 15px;
        `;

        // Render categories with event delegation
        this.renderCategories(entitiesContainer, currentValue, '');

        // Search functionality (debounced)
        let searchTimeout;
        searchBox.oninput = (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.renderCategories(entitiesContainer, currentValue, e.target.value);
            }, 300);
        };

        // Assemble UI
        picker.appendChild(header);
        picker.appendChild(searchBox);
        picker.appendChild(entitiesContainer);
        this.overlay.appendChild(picker);

        // Stop event propagation from picker to overlay
        picker.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Store self reference for closure
        const self = this;

        // Event delegation for entity clicks
        entitiesContainer.addEventListener('click', (e) => {
            const entityEl = e.target.closest('[data-entity-id]');
            if (entityEl) {
                const entityId = entityEl.dataset.entityId;
                const category = entityEl.dataset.category;
                const entity = self.entities[category].find(ent => ent.id === entityId);
                console.log('🎯 Entity clicked:', { entityId, category, entity });
                console.log('🎯 Callback exists?', !!self.currentCallback);
                if (entity && self.currentCallback) {
                    console.log('✅ Calling callback with entity:', entity);
                    self.currentCallback(entity);
                    self.hide();
                    console.log('✅ Picker dismissed');
                } else {
                    if (!entity) console.error('❌ Entity not found:', entityId, 'in category:', category);
                    if (!self.currentCallback) console.error('❌ No callback set!');
                }
            }

            // Category header toggle
            const categoryHeader = e.target.closest('[data-category]');
            if (categoryHeader && !categoryHeader.hasAttribute('data-entity-id')) {
                const category = categoryHeader.dataset.category;
                if (self.expandedCategories.has(category)) {
                    self.expandedCategories.delete(category);
                } else {
                    self.expandedCategories.add(category);
                }
                self.renderCategories(entitiesContainer, currentValue, searchBox.value);
            }
        });

        // Click overlay to close
        this.overlay.addEventListener('click', () => this.hide());

        document.body.appendChild(this.overlay);
    }

    /**
     * Render category sections
     */
    renderCategories(container, currentValue, searchTerm) {
        container.innerHTML = '';
        
        // Safety check - entities might not be loaded yet
        if (!this.entities) {
            container.innerHTML = '<div style="color: #858585; padding: 10px;">Loading entities...</div>';
            return;
        }
        
        const search = searchTerm.toLowerCase();

        for (const [category, entities] of Object.entries(this.entities)) {
            // Filter entities based on search
            const filtered = search ? 
                entities.filter(ent => 
                    ent.name.toLowerCase().includes(search) || 
                    ent.id.toLowerCase().includes(search)
                ) : entities;

            if (filtered.length === 0) continue;

            const isExpanded = this.expandedCategories.has(category);

            // Category header
            const categoryHeader = document.createElement('div');
            categoryHeader.dataset.category = category;
            categoryHeader.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 10px;
                margin-top: 10px;
                background: #3c3c3c;
                border-radius: 4px;
                cursor: pointer;
                user-select: none;
            `;
            categoryHeader.innerHTML = `
                <span style="color: #cccccc; font-weight: bold; font-size: 13px;">
                    ${isExpanded ? '▼' : '▶'} ${category}
                </span>
                <span style="color: #858585; font-size: 12px;">${filtered.length}</span>
            `;
            container.appendChild(categoryHeader);

            // Category entities (if expanded)
            if (isExpanded) {
                const entityList = document.createElement('div');
                entityList.style.cssText = 'margin-top: 5px;';

                filtered.forEach(entity => {
                    const entityEl = document.createElement('div');
                    entityEl.dataset.entityId = entity.id;
                    entityEl.dataset.category = category;
                    const isSelected = entity.id === currentValue;
                    entityEl.style.cssText = `
                        display: flex;
                        align-items: center;
                        padding: 8px 10px;
                        margin: 2px 0;
                        background: ${isSelected ? '#0e639c' : '#252526'};
                        border-radius: 4px;
                        cursor: pointer;
                        transition: background 0.2s;
                    `;
                    entityEl.innerHTML = `
                        <span style="font-size: 20px; margin-right: 10px;">${entity.emoji}</span>
                        <span style="color: #cccccc; font-size: 13px;">${entity.name}</span>
                        ${isSelected ? '<span style="margin-left: auto; color: #4ec9b0;">✓</span>' : ''}
                    `;

                    entityEl.onmouseover = () => {
                        if (!isSelected) entityEl.style.background = '#2a2d2e';
                    };
                    entityEl.onmouseout = () => {
                        if (!isSelected) entityEl.style.background = '#252526';
                    };

                    entityList.appendChild(entityEl);
                });

                container.appendChild(entityList);
            }
        }
    }
}

// Export singleton instance
export const entityPicker = new EntityPicker();
