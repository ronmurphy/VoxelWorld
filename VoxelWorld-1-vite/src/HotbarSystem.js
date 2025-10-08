/**
 * 🎯 HotbarSystem - Player Hotbar & Equipment Management
 *
 * Features:
 * - 5 inventory slots (items/blocks)
 * - 3 equipment slots (active tools only)
 * - Visual separator between inventory and equipment
 * - Drag & drop support for rearranging
 * - Right-click quick transfer (hotbar ↔ backpack)
 * - Ctrl+Right-click to equipment slots
 * - Equipment slot validation (tools only)
 */

export class HotbarSystem {
    constructor(voxelWorld, inventorySystem) {
        this.voxelWorld = voxelWorld;
        this.inventorySystem = inventorySystem;

        // Hotbar configuration
        this.INVENTORY_SLOTS = 5;     // Left side: general inventory
        this.EQUIPMENT_SLOTS = 3;      // Right side: active tools only
        this.TOTAL_SLOTS = this.INVENTORY_SLOTS + this.EQUIPMENT_SLOTS; // 8 total

        // Slot data
        this.slots = [];
        this.initializeSlots();

        // Selected slot index
        this.selectedSlot = 0;

        // UI elements
        this.hotbarElement = null;

        console.log('🎯 HotbarSystem initialized: 5 inventory + 3 equipment slots');
    }

    /**
     * Initialize all hotbar slots
     */
    initializeSlots() {
        this.slots = [];
        for (let i = 0; i < this.TOTAL_SLOTS; i++) {
            this.slots.push({ itemType: null, quantity: 0 });
        }
    }

    /**
     * Check if a slot is an equipment slot
     */
    isEquipmentSlot(index) {
        return index >= this.INVENTORY_SLOTS;
    }

    /**
     * Check if an item is a tool (can go in equipment slots)
     */
    isToolItem(itemType) {
        if (!itemType) return false;
        
        // Tools are crafted items or specific tool types
        const toolIdentifiers = [
            'crafted_', 'grappling_hook', 'speed_boots', 'combat_sword',
            'mining_pick', 'stone_hammer', 'magic_amulet', 'compass',
            'machete', 'club', 'stone_spear', 'torch', 'wood_shield'
        ];

        return toolIdentifiers.some(id => itemType.includes(id));
    }

    /**
     * Get slot data
     */
    getSlot(index) {
        return this.slots[index] || null;
    }

    /**
     * Set slot data with validation
     */
    setSlot(index, itemType, quantity) {
        if (index < 0 || index >= this.TOTAL_SLOTS) return false;

        // Validate equipment slots only accept tools
        if (this.isEquipmentSlot(index) && itemType && !this.isToolItem(itemType)) {
            console.warn(`⚠️ Equipment slot ${index} only accepts tools! Rejected: ${itemType}`);
            return false;
        }

        this.slots[index] = { itemType, quantity: Math.min(quantity, this.voxelWorld.backpackStackSize) };
        return true;
    }

    /**
     * Find first empty slot in inventory section
     */
    findEmptyInventorySlot() {
        for (let i = 0; i < this.INVENTORY_SLOTS; i++) {
            if (!this.slots[i].itemType || this.slots[i].quantity === 0) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Find first empty equipment slot
     */
    findEmptyEquipmentSlot() {
        for (let i = this.INVENTORY_SLOTS; i < this.TOTAL_SLOTS; i++) {
            if (!this.slots[i].itemType || this.slots[i].quantity === 0) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Create hotbar UI
     */
    createUI() {
        // Main hotbar container - EXPLORER'S JOURNAL THEME
        this.hotbarElement = document.createElement('div');
        this.hotbarElement.id = 'hotbar';
        this.hotbarElement.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            align-items: center;
            gap: 0;
            background: rgba(245, 230, 211, 0.9);
            padding: 12px;
            border-radius: 12px;
            border: 3px solid #8B4513;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5), inset 0 2px 5px rgba(255, 255, 255, 0.3);
            z-index: 1000;
            font-family: Georgia, serif;
        `;

        // Create inventory slots (1-5)
        for (let i = 0; i < this.INVENTORY_SLOTS; i++) {
            const slot = this.createSlotElement(i, false);
            this.hotbarElement.appendChild(slot);
        }

        // Visual separator - GOLDEN ORNATE DIVIDER
        const separator = document.createElement('div');
        separator.style.cssText = `
            width: 3px;
            height: 60px;
            background: linear-gradient(to bottom, 
                transparent 0%, 
                #8B4513 20%, 
                #DAA520 50%, 
                #8B4513 80%, 
                transparent 100%
            );
            margin: 0 12px;
            border-radius: 2px;
            box-shadow: 0 0 5px rgba(218, 165, 32, 0.5);
        `;
        this.hotbarElement.appendChild(separator);

        // Create equipment slots (6-8)
        for (let i = this.INVENTORY_SLOTS; i < this.TOTAL_SLOTS; i++) {
            const slot = this.createSlotElement(i, true);
            this.hotbarElement.appendChild(slot);
        }

        document.body.appendChild(this.hotbarElement);
        
        // 🖱️ Add mouse wheel navigation
        this.setupMouseWheelNavigation();
        
        // ⌨️ Add number key selection (1-8)
        this.setupNumberKeySelection();
        
        this.updateUI();
    }

    /**
     * Setup mouse wheel navigation for slot selection
     */
    setupMouseWheelNavigation() {
        document.addEventListener('wheel', (e) => {
            // Only handle wheel when hotbar is visible and game is active
            if (!this.hotbarElement || this.hotbarElement.style.display === 'none') return;
            if (this.voxelWorld.isPaused) return;

            // Prevent page scroll when using wheel for hotbar
            if (e.deltaY !== 0) {
                e.preventDefault();
                
                // Scroll up = previous slot, scroll down = next slot
                const direction = e.deltaY > 0 ? 1 : -1;
                this.navigateSlot(direction);
            }
        }, { passive: false });
    }

    /**
     * Setup number key selection (1-8)
     */
    setupNumberKeySelection() {
        document.addEventListener('keydown', (e) => {
            // Only handle when hotbar is visible and game is active
            if (!this.hotbarElement || this.hotbarElement.style.display === 'none') return;
            if (this.voxelWorld.isPaused) return;

            // Keys 1-8 select slots
            const num = parseInt(e.key);
            if (num >= 1 && num <= 8) {
                e.preventDefault();
                this.selectSlot(num - 1); // Convert to 0-based index
            }
        });
    }

    /**
     * Create individual slot element
     */
    createSlotElement(index, isEquipment) {
        const slot = document.createElement('div');
        slot.className = `hotbar-slot ${isEquipment ? 'equipment-slot' : ''}`;
        slot.dataset.slotIndex = index;
        slot.style.cssText = `
            width: 70px;
            height: 70px;
            background: ${isEquipment ? 'rgba(139, 69, 19, 0.3)' : 'rgba(218, 165, 32, 0.15)'};
            border: 2px solid ${isEquipment ? '#8B4513' : '#654321'};
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            position: relative;
            transition: all 0.2s ease;
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
        `;

        // Add slot number label for inventory slots
        if (!isEquipment) {
            const label = document.createElement('div');
            label.textContent = index + 1;
            label.style.cssText = `
                position: absolute;
                top: 3px;
                left: 5px;
                font-size: 11px;
                color: #654321;
                font-family: Georgia, serif;
                font-weight: bold;
                text-shadow: 1px 1px 1px rgba(255, 255, 255, 0.5);
            `;
            slot.appendChild(label);
        }

        // Add equipment icon for equipment slots
        if (isEquipment) {
            const icon = document.createElement('div');
            icon.textContent = '⚔️';
            icon.style.cssText = `
                position: absolute;
                top: 3px;
                right: 5px;
                font-size: 14px;
                opacity: 0.6;
                filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
            `;
            slot.appendChild(icon);
        }

        // Click to select
        slot.addEventListener('click', () => {
            this.selectSlot(index);
        });

        // Right-click to transfer items
        slot.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Prevent Firefox/browser context menu
            this.handleSlotRightClick(index);
        });

        // 🎨 Drag & Drop: Make slot draggable
        slot.draggable = true;
        
        slot.addEventListener('dragstart', (e) => {
            this.handleDragStart(e, index);
        });

        slot.addEventListener('dragover', (e) => {
            this.handleDragOver(e, index);
        });

        slot.addEventListener('drop', (e) => {
            this.handleDrop(e, index);
        });

        slot.addEventListener('dragend', (e) => {
            this.handleDragEnd(e);
        });

        slot.addEventListener('dragleave', (e) => {
            this.handleDragLeave(e, index);
        });

        return slot;
    }

    /**
     * Update hotbar UI
     */
    updateUI() {
        if (!this.hotbarElement) return;

        // IMPORTANT: Sync from InventorySystem's hotbarSlots first!
        // The first 5 slots come from inventorySystem.hotbarSlots
        for (let i = 0; i < this.INVENTORY_SLOTS; i++) {
            const inventorySlot = this.inventorySystem.hotbarSlots[i];
            if (inventorySlot) {
                this.slots[i] = {
                    itemType: inventorySlot.itemType,
                    quantity: inventorySlot.quantity
                };
            } else {
                this.slots[i] = { itemType: null, quantity: 0 };
            }
        }
        // Equipment slots (5-7) remain independent in this.slots

        const slotElements = this.hotbarElement.querySelectorAll('.hotbar-slot');
        slotElements.forEach((slotEl, index) => {
            const slotData = this.slots[index];

            // Clear slot content (except labels)
            const existingContent = slotEl.querySelector('.slot-content');
            if (existingContent) existingContent.remove();

            if (slotData.itemType && slotData.quantity > 0) {
                const iconContent = this.voxelWorld.getItemIcon(slotData.itemType, 'hotbar');

                // Create content container
                const contentDiv = document.createElement('div');
                contentDiv.className = 'slot-content';
                contentDiv.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    height: 100%;
                `;

                // Item icon - LARGER, main focus
                const itemIcon = document.createElement('div');
                if (iconContent.includes('<span') || iconContent.includes('<img')) {
                    itemIcon.innerHTML = iconContent;
                } else {
                    itemIcon.textContent = iconContent;
                }
                itemIcon.style.cssText = `
                    font-size: 36px;
                    text-align: center;
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                
                // Ensure images inside are properly sized
                const img = itemIcon.querySelector('img');
                if (img) {
                    img.style.width = '36px';
                    img.style.height = '36px';
                    img.style.objectFit = 'contain';
                }
                
                contentDiv.appendChild(itemIcon);

                // Quantity display - smaller, bottom corner
                const quantityDisplay = document.createElement('div');
                quantityDisplay.textContent = slotData.quantity;
                quantityDisplay.style.cssText = `
                    position: absolute;
                    bottom: 4px;
                    left: 4px;
                    font-size: 11px;
                    font-weight: bold;
                    text-align: center;
                    color: #2F1B14;
                    font-family: Georgia, serif;
                    text-shadow: 1px 1px 2px rgba(245, 230, 211, 0.8), 
                                 -1px -1px 1px rgba(255, 255, 255, 0.5);
                    background: rgba(245, 230, 211, 0.6);
                    padding: 1px 4px;
                    border-radius: 3px;
                `;
                contentDiv.appendChild(quantityDisplay);

                slotEl.appendChild(contentDiv);
                
                // Add tooltip on hover
                const itemName = this.formatItemName(slotData.itemType);
                const isEquipment = this.isEquipmentSlot(index);
                const slotType = isEquipment ? '⚔️ Equipment' : '📦 Inventory';
                slotEl.title = `${itemName}\n${slotType}\nQuantity: ${slotData.quantity}`;
            }

            // Clear active star indicator first
            const existingStar = slotEl.querySelector('.active-star');
            if (existingStar) existingStar.remove();

            // Add active slot indicator (star) - GOLDEN SELECTION
            if (index === this.selectedSlot) {
                slotEl.style.borderColor = '#DAA520';
                slotEl.style.borderWidth = '3px';
                slotEl.style.boxShadow = '0 0 15px rgba(218, 165, 32, 0.8), inset 0 0 10px rgba(255, 215, 0, 0.3)';
                
                // Add star indicator in bottom-right corner
                const star = document.createElement('div');
                star.className = 'active-star';
                star.textContent = '⭐';
                star.style.cssText = `
                    position: absolute;
                    bottom: 2px;
                    right: 2px;
                    font-size: 14px;
                    filter: drop-shadow(0 0 3px rgba(255, 215, 0, 0.8));
                    pointer-events: none;
                    animation: pulse 1.5s ease-in-out infinite;
                `;
                slotEl.appendChild(star);
            } else {
                const isEquipment = this.isEquipmentSlot(index);
                slotEl.style.borderColor = isEquipment ? '#8B4513' : '#654321';
                slotEl.style.borderWidth = '2px';
                slotEl.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.2)';
            }
        });
        
        // Add pulse animation if not already added
        if (!document.getElementById('hotbar-star-pulse')) {
            const style = document.createElement('style');
            style.id = 'hotbar-star-pulse';
            style.textContent = `
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.2); opacity: 0.8; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Format item name for display
     */
    formatItemName(itemType) {
        if (!itemType) return 'Empty';
        
        // Remove crafted_ prefix
        let name = itemType.replace('crafted_', '');
        
        // Replace underscores with spaces and capitalize
        name = name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        
        return name;
    }

    /**
     * Select a slot
     */
    selectSlot(index) {
        if (index < 0 || index >= this.TOTAL_SLOTS) return;
        
        this.selectedSlot = index;
        this.updateUI();
        
        console.log(`🎯 Selected slot ${index + 1}:`, this.slots[index]);
    }

    /**
     * Get selected slot data
     */
    getSelectedSlot() {
        return this.slots[this.selectedSlot];
    }

    /**
     * Navigate slots (mouse wheel, was Q/E keys)
     */
    navigateSlot(direction) {
        // Navigate all 8 slots (0-7)
        if (direction === -1) { // Scroll up / Previous
            this.selectedSlot = this.selectedSlot > 0 ? this.selectedSlot - 1 : this.TOTAL_SLOTS - 1;
        } else if (direction === 1) { // Scroll down / Next
            this.selectedSlot = (this.selectedSlot + 1) % this.TOTAL_SLOTS;
        }
        this.updateUI();
    }

    /**
     * Handle right-click on a slot to transfer items
     */
    handleSlotRightClick(slotIndex) {
        const slotData = this.slots[slotIndex];
        
        // If slot is empty, do nothing
        if (!slotData || !slotData.itemType || slotData.quantity <= 0) {
            return;
        }

        const isEquipmentSlot = this.isEquipmentSlot(slotIndex);

        if (isEquipmentSlot) {
            // Equipment slot → try to move to inventory first, then backpack
            console.log(`🎯 Moving ${slotData.itemType} from equipment to inventory/backpack`);
            
            // Try to add to inventory (hotbar slots 0-4)
            const added = this.inventorySystem.addToInventory(slotData.itemType, slotData.quantity);
            
            if (added) {
                // Clear equipment slot
                this.setSlot(slotIndex, null, 0);
                this.updateUI();
                this.voxelWorld.updateStatus(`Moved ${slotData.itemType} to inventory`, 'info');
            }
        } else {
            // Inventory slot → try to move to backpack
            console.log(`🎒 Moving ${slotData.itemType} from hotbar to backpack`);
            
            // Use InventorySystem's transfer method
            this.inventorySystem.transferItemToBackpack(slotIndex);
        }
    }

    /**
     * Get active equipment tools
     */
    getActiveTools() {
        const tools = [];
        for (let i = this.INVENTORY_SLOTS; i < this.TOTAL_SLOTS; i++) {
            const slot = this.slots[i];
            if (slot.itemType && slot.quantity > 0) {
                tools.push({
                    slotIndex: i,
                    itemType: slot.itemType,
                    quantity: slot.quantity
                });
            }
        }
        return tools;
    }

    // ==================== DRAG & DROP SYSTEM ====================

    /**
     * Handle drag start
     */
    handleDragStart(e, slotIndex) {
        const slotData = this.slots[slotIndex];
        
        // Only allow dragging if slot has an item
        if (!slotData || !slotData.itemType || slotData.quantity <= 0) {
            e.preventDefault();
            return;
        }

        // Store drag source info
        this.dragSourceIndex = slotIndex;
        this.dragSourceType = 'hotbar';

        // Set drag data
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/json', JSON.stringify({
            sourceIndex: slotIndex,
            sourceType: 'hotbar',
            itemType: slotData.itemType,
            quantity: slotData.quantity
        }));

        // Create custom drag image (icon at full opacity)
        const dragIcon = e.target.querySelector('.slot-content');
        if (dragIcon) {
            const clone = dragIcon.cloneNode(true);
            clone.style.position = 'absolute';
            clone.style.top = '-1000px';
            clone.style.opacity = '0.8';
            clone.style.width = '70px';
            clone.style.height = '70px';
            document.body.appendChild(clone);
            // Center the drag image under cursor (half of 70px slot = 35px offset)
            e.dataTransfer.setDragImage(clone, 35, 35);
            setTimeout(() => document.body.removeChild(clone), 0);
        }

        // Add visual feedback to source slot
        e.target.style.opacity = '0.5';
        
        console.log(`🎨 Drag started from slot ${slotIndex}:`, slotData.itemType);
    }

    /**
     * Handle drag over (allow drop)
     */
    handleDragOver(e, slotIndex) {
        e.preventDefault(); // Required to allow drop
        
        // Check if this is a valid drop target
        const dragData = this.dragSourceIndex !== undefined ? {
            sourceIndex: this.dragSourceIndex,
            sourceType: this.dragSourceType
        } : null;

        if (!dragData) return;

        const sourceSlot = this.slots[dragData.sourceIndex];
        const isEquipmentTarget = this.isEquipmentSlot(slotIndex);

        // Validate equipment slot drops
        if (isEquipmentTarget && !this.isToolItem(sourceSlot?.itemType)) {
            e.dataTransfer.dropEffect = 'none';
            e.target.closest('.hotbar-slot').style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
            return;
        }

        // Valid drop zone - highlight
        e.dataTransfer.dropEffect = 'move';
        e.target.closest('.hotbar-slot').style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
    }

    /**
     * Handle drag leave (remove highlight)
     */
    handleDragLeave(e, slotIndex) {
        const slot = e.target.closest('.hotbar-slot');
        if (slot) {
            const isEquipment = this.isEquipmentSlot(slotIndex);
            slot.style.backgroundColor = isEquipment ? 'rgba(139, 69, 19, 0.3)' : 'rgba(218, 165, 32, 0.15)';
        }
    }

    /**
     * Handle drop
     */
    handleDrop(e, targetIndex) {
        e.preventDefault();
        
        const slot = e.target.closest('.hotbar-slot');
        if (slot) {
            const isEquipment = this.isEquipmentSlot(targetIndex);
            slot.style.backgroundColor = isEquipment ? 'rgba(139, 69, 19, 0.3)' : 'rgba(218, 165, 32, 0.15)';
        }

        // Get drag data
        let dragData;
        try {
            const jsonData = e.dataTransfer.getData('application/json');
            dragData = jsonData ? JSON.parse(jsonData) : {
                sourceIndex: this.dragSourceIndex,
                sourceType: this.dragSourceType
            };
        } catch (err) {
            console.error('Failed to parse drag data:', err);
            return;
        }

        if (!dragData || dragData.sourceIndex === undefined) {
            console.warn('No drag data available');
            return;
        }

        const sourceIndex = dragData.sourceIndex;
        
        // Don't do anything if dropping on same slot
        if (sourceIndex === targetIndex && dragData.sourceType === 'hotbar') {
            console.log('Dropped on same slot, ignoring');
            return;
        }

        // Validate equipment slot
        const sourceSlot = this.slots[sourceIndex];
        if (this.isEquipmentSlot(targetIndex) && !this.isToolItem(sourceSlot?.itemType)) {
            this.voxelWorld.updateStatus('⚠️ Only tools can go in equipment slots!', 'warning');
            return;
        }

        // Perform the swap/move
        this.swapSlots(sourceIndex, targetIndex);
        
        console.log(`✅ Dropped item from slot ${sourceIndex} to ${targetIndex}`);
    }

    /**
     * Handle drag end (cleanup)
     */
    handleDragEnd(e) {
        // Reset opacity
        e.target.style.opacity = '1';
        
        // Clear drag source
        this.dragSourceIndex = undefined;
        this.dragSourceType = undefined;

        // Reset all slot backgrounds
        const slots = this.hotbarElement.querySelectorAll('.hotbar-slot');
        slots.forEach((slot, index) => {
            const isEquipment = this.isEquipmentSlot(index);
            slot.style.backgroundColor = isEquipment ? 'rgba(139, 69, 19, 0.3)' : 'rgba(218, 165, 32, 0.15)';
        });

        console.log('🎨 Drag ended');
    }

    /**
     * Swap two slots
     * 
     * ⚠️ KNOWN ISSUE - Equipment Slot Validation:
     * Currently, blocks can be moved OUT of equipment slots and blocks can be swapped
     * INTO equipment slots via drag & drop. This bypasses the isToolItem() validation.
     * 
     * FUTURE FIX NEEDED in swapSlots() method:
     * - Add validation before swap: check if targetIndex is equipment slot
     * - If target is equipment (>= this.INVENTORY_SLOTS), validate sourceSlot.itemType
     * - If invalid, prevent swap and show warning message
     * - Example fix location: Line ~722 (before performing swap)
     * 
     * Related methods to update:
     * - swapSlots() - Main swap logic (this method)
     * - handleDrop() - Already has validation but may need strengthening
     * - setSlot() - Could add secondary validation check
     */
    swapSlots(sourceIndex, targetIndex) {
        // Get both slots
        const sourceSlot = { ...this.slots[sourceIndex] };
        const targetSlot = { ...this.slots[targetIndex] };

        // Swap the data
        this.slots[sourceIndex] = targetSlot;
        this.slots[targetIndex] = sourceSlot;

        // Sync back to InventorySystem for inventory slots (0-4)
        if (sourceIndex < this.INVENTORY_SLOTS) {
            this.inventorySystem.hotbarSlots[sourceIndex] = targetSlot;
        }
        if (targetIndex < this.INVENTORY_SLOTS) {
            this.inventorySystem.hotbarSlots[targetIndex] = sourceSlot;
        }

        // Update UI
        this.updateUI();
        this.voxelWorld.updateStatus(`Swapped items`, 'info');
    }

    /**
     * Add a tool to the first available equipment slot
     * Returns true if successful, false if all equipment slots are full
     */
    addToolToEquipment(itemType, quantity = 1) {
        if (!this.isToolItem(itemType)) {
            console.warn(`⚠️ ${itemType} is not a tool, cannot add to equipment`);
            return false;
        }

        const emptySlot = this.findEmptyEquipmentSlot();
        if (emptySlot === -1) {
            console.warn('⚠️ All equipment slots are full!');
            return false;
        }

        this.setSlot(emptySlot, itemType, quantity);
        console.log(`🎯 Added ${itemType} to equipment slot ${emptySlot}`);
        this.updateUI();
        return true;
    }
}
