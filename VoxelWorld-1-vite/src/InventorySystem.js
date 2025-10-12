/**
 * 🎒 InventorySystem - Complete Inventory Management Module
 *
 * Features:
 * - Hotbar management (5 slots)
 * - Backpack management (25 slots)
 * - Item stacking with configurable limits
 * - Smart inventory addition with overflow handling
 * - UI updates and visual feedback
 * - Item transfer between hotbar and backpack
 * - Slot-based pure inventory system
 */
export class InventorySystem {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;

        // Stack limit for items per slot (now dynamic - reads from voxelWorld.backpackStackSize)
        // this.voxelWorld.backpackStackSize = 50;  // OLD: Static value

        // Initialize inventory slots
        this.initializeInventory();

        // UI elements (will be set when UI is created)
        this.hotbarElement = null;
        this.backpackInventoryElement = null;
        this.backpackSlots = [];
    }

    // 🏗️ Initialize Inventory System
    initializeInventory() {
        // Hotbar slots (5 pure item slots)
        this.hotbarSlots = [
            { itemType: null, quantity: 0 },
            { itemType: null, quantity: 0 },
            { itemType: null, quantity: 0 },
            { itemType: null, quantity: 0 },
            { itemType: null, quantity: 0 }
        ];

        // Backpack slots (20 slots total - 4x5 grid, reduced from 25 to balance 50 stack size)
        this.backpackSlots = [];
        for (let i = 0; i < 20; i++) {
            this.backpackSlots.push({ itemType: null, quantity: 0 });
        }
    }

    // 🎯 HOTBAR MANAGEMENT
    getHotbarSlot(index) {
        return this.hotbarSlots[index] || null;
    }

    setHotbarSlot(index, itemType, quantity) {
        if (index >= 0 && index < this.hotbarSlots.length) {
            this.hotbarSlots[index] = { itemType, quantity: Math.min(quantity, this.voxelWorld.backpackStackSize) };
        }
    }

    findEmptyHotbarSlot() {
        for (let i = 0; i < this.hotbarSlots.length; i++) {
            if (!this.hotbarSlots[i].itemType || this.hotbarSlots[i].quantity === 0) {
                return i;
            }
        }
        return -1;
    }

    // 🎒 BACKPACK MANAGEMENT
    getBackpackSlot(index) {
        return this.backpackSlots[index] || null;
    }

    setBackpackSlot(index, itemType, quantity) {
        if (index >= 0 && index < this.backpackSlots.length) {
            const existingElement = this.backpackSlots[index].element;
            this.backpackSlots[index] = {
                itemType,
                quantity: Math.min(quantity, this.voxelWorld.backpackStackSize),
                element: existingElement
            };
        }
    }

    findEmptyBackpackSlot() {
        for (let i = 0; i < this.backpackSlots.length; i++) {
            if (!this.backpackSlots[i].itemType || this.backpackSlots[i].quantity === 0) {
                return i;
            }
        }
        return -1;
    }

    // 🔍 INVENTORY SEARCH & COUNTING
    findItemInSlots(itemType) {
        // Check hotbar first (all 5 slots are item slots)
        for (let i = 0; i < this.hotbarSlots.length; i++) {
            if (this.hotbarSlots[i].itemType === itemType && this.hotbarSlots[i].quantity < this.voxelWorld.backpackStackSize) {
                return { location: 'hotbar', index: i };
            }
        }
        // Then check backpack
        for (let i = 0; i < this.backpackSlots.length; i++) {
            if (this.backpackSlots[i].itemType === itemType && this.backpackSlots[i].quantity < this.voxelWorld.backpackStackSize) {
                return { location: 'backpack', index: i };
            }
        }
        return null; // Item not found or all stacks are full
    }

    countItemInSlots(itemType) {
        let total = 0;
        // Count in hotbar (all 5 slots are item slots)
        for (let i = 0; i < this.hotbarSlots.length; i++) {
            if (this.hotbarSlots[i].itemType === itemType) {
                total += this.hotbarSlots[i].quantity;
            }
        }
        // Count in backpack
        for (let i = 0; i < this.backpackSlots.length; i++) {
            if (this.backpackSlots[i].itemType === itemType) {
                total += this.backpackSlots[i].quantity;
            }
        }
        return total;
    }

    getAllMaterialsFromSlots() {
        const materials = {};
        // Check hotbar (all 5 slots are item slots)
        for (let i = 0; i < this.hotbarSlots.length; i++) {
            if (this.hotbarSlots[i].itemType && this.hotbarSlots[i].quantity > 0) {
                materials[this.hotbarSlots[i].itemType] = (materials[this.hotbarSlots[i].itemType] || 0) + this.hotbarSlots[i].quantity;
            }
        }
        // Check backpack
        for (let i = 0; i < this.backpackSlots.length; i++) {
            if (this.backpackSlots[i].itemType && this.backpackSlots[i].quantity > 0) {
                materials[this.backpackSlots[i].itemType] = (materials[this.backpackSlots[i].itemType] || 0) + this.backpackSlots[i].quantity;
            }
        }
        return materials;
    }

    // ➖ REMOVE ITEMS FROM INVENTORY
    removeFromInventory(itemType, quantity = 1) {
        let remaining = quantity;

        // First check hotbar (all 5 slots are item slots)
        for (let i = 0; i < this.hotbarSlots.length && remaining > 0; i++) {
            if (this.hotbarSlots[i].itemType === itemType) {
                const canRemove = Math.min(remaining, this.hotbarSlots[i].quantity);
                this.hotbarSlots[i].quantity -= canRemove;
                remaining -= canRemove;
                // Clear slot if empty
                if (this.hotbarSlots[i].quantity === 0) {
                    this.hotbarSlots[i].itemType = '';
                }
            }
        }
        // Then check backpack
        for (let i = 0; i < this.backpackSlots.length && remaining > 0; i++) {
            if (this.backpackSlots[i].itemType === itemType) {
                const canRemove = Math.min(remaining, this.backpackSlots[i].quantity);
                this.backpackSlots[i].quantity -= canRemove;
                remaining -= canRemove;
                // Clear slot if empty
                if (this.backpackSlots[i].quantity === 0) {
                    this.backpackSlots[i].itemType = '';
                }
            }
        }

        // Update UI
        this.updateHotbarCounts();
        this.updateBackpackInventoryDisplay();

        return quantity - remaining; // Return how many were actually removed
    }

    // ➕ SMART INVENTORY ADDITION
    addToInventory(itemType, quantity = 1) {
        let remaining = quantity;

        // First, try to add to existing stacks
        while (remaining > 0) {
            const existingStack = this.findItemInSlots(itemType);
            if (existingStack) {
                const slot = existingStack.location === 'hotbar' ?
                    this.hotbarSlots[existingStack.index] :
                    this.backpackSlots[existingStack.index];

                const canAdd = Math.min(remaining, this.voxelWorld.backpackStackSize - slot.quantity);
                slot.quantity += canAdd;
                remaining -= canAdd;
            } else {
                // No existing stack with space, find empty slot
                const emptyHotbar = this.findEmptyHotbarSlot();
                if (emptyHotbar !== -1) {
                    const canAdd = Math.min(remaining, this.voxelWorld.backpackStackSize);
                    this.setHotbarSlot(emptyHotbar, itemType, canAdd);
                    remaining -= canAdd;
                } else {
                    const emptyBackpack = this.findEmptyBackpackSlot();
                    if (emptyBackpack !== -1) {
                        const canAdd = Math.min(remaining, this.voxelWorld.backpackStackSize);
                        this.setBackpackSlot(emptyBackpack, itemType, canAdd);
                        remaining -= canAdd;
                    } else {
                        // No space left
                        console.warn(`No space for ${remaining} ${itemType} items`);
                        break;
                    }
                }
            }
        }

        // Update UI
        this.updateHotbarCounts();
        this.updateBackpackInventoryDisplay();

        return quantity - remaining; // Return how many were actually added
    }

    // 🔄 ITEM TRANSFER FUNCTIONS
    transferItemToBackpack(hotbarIndex) {
        const hotbarSlot = this.hotbarSlots[hotbarIndex];
        if (hotbarSlot && hotbarSlot.itemType && hotbarSlot.quantity > 0) {
            const itemType = hotbarSlot.itemType;
            const transferAmount = hotbarSlot.quantity; // Transfer entire stack

            // Find available space in backpack - try stacking first, then empty slot
            let targetSlotIndex = -1;

            // First, try to find existing slot with same item type that has space
            for (let i = 0; i < this.backpackSlots.length; i++) {
                const slot = this.backpackSlots[i];
                if (slot.itemType === itemType && slot.quantity < this.voxelWorld.backpackStackSize) {
                    // Check if there's enough space for the full transfer
                    if (slot.quantity + transferAmount <= this.voxelWorld.backpackStackSize) {
                        targetSlotIndex = i;
                        break;
                    }
                }
            }

            // If no stackable slot found, find empty slot
            if (targetSlotIndex === -1) {
                targetSlotIndex = this.findEmptyBackpackSlot();
            }

            if (targetSlotIndex !== -1) {
                // Remove from hotbar
                hotbarSlot.quantity -= transferAmount;
                if (hotbarSlot.quantity === 0) {
                    hotbarSlot.itemType = '';
                }

                // Add to backpack
                if (this.backpackSlots[targetSlotIndex].itemType === itemType) {
                    this.backpackSlots[targetSlotIndex].quantity += transferAmount;
                } else {
                    this.setBackpackSlot(targetSlotIndex, itemType, transferAmount);
                }

                this.updateHotbarCounts();
                this.voxelWorld.updateBackpackInventoryDisplay();
                console.log(`Transferred ${transferAmount} ${itemType} from hotbar to backpack`);

                if (this.voxelWorld.updateStatus) {
                    this.voxelWorld.updateStatus(`📦 Moved ${itemType} to backpack`, 'success');
                }
            } else {
                if (this.voxelWorld.updateStatus) {
                    this.voxelWorld.updateStatus(`Backpack is full!`, 'warning');
                }
            }
        }
    }

    transferItemToHotbar(backpackIndex) {
        const backpackSlot = this.backpackSlots[backpackIndex];
        if (backpackSlot && backpackSlot.itemType && backpackSlot.quantity > 0) {
            const itemType = backpackSlot.itemType;
            const transferAmount = backpackSlot.quantity; // Transfer entire stack

            // Find available space in hotbar - try stacking first, then empty slot
            let targetSlotIndex = -1;

            // First, try to find existing slot with same item type that has space
            for (let i = 0; i < this.hotbarSlots.length; i++) {
                const slot = this.hotbarSlots[i];
                if (slot.itemType === itemType && slot.quantity < this.voxelWorld.backpackStackSize) {
                    // Check if there's enough space for the full transfer
                    if (slot.quantity + transferAmount <= this.voxelWorld.backpackStackSize) {
                        targetSlotIndex = i;
                        break;
                    }
                }
            }

            // If no stackable slot found, find empty slot
            if (targetSlotIndex === -1) {
                targetSlotIndex = this.findEmptyHotbarSlot();
            }

            if (targetSlotIndex !== -1) {
                // Remove from backpack
                backpackSlot.quantity -= transferAmount;
                if (backpackSlot.quantity === 0) {
                    backpackSlot.itemType = '';
                }

                // Add to hotbar
                if (this.hotbarSlots[targetSlotIndex].itemType === itemType) {
                    this.hotbarSlots[targetSlotIndex].quantity += transferAmount;
                } else {
                    this.setHotbarSlot(targetSlotIndex, itemType, transferAmount);
                }

                this.updateHotbarCounts();
                this.voxelWorld.updateBackpackInventoryDisplay();
                console.log(`Transferred ${transferAmount} ${itemType} from backpack to hotbar`);

                if (this.voxelWorld.updateStatus) {
                    this.voxelWorld.updateStatus(`🔧 Moved ${itemType} to hotbar`, 'success');
                }
            } else {
                if (this.voxelWorld.updateStatus) {
                    this.voxelWorld.updateStatus(`Hotbar is full!`, 'warning');
                }
            }
        }
    }

    // 🖼️ UI UPDATE FUNCTIONS
    // Helper function to format item names for display
    formatItemName(itemType) {
        // Replace underscores with spaces and capitalize each word
        return itemType
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    updateHotbarCounts() {
        // 🎯 DELEGATED: Hotbar UI now managed by HotbarSystem
        if (this.voxelWorld && this.voxelWorld.hotbarSystem) {
            this.voxelWorld.hotbarSystem.updateUI();
            return;
        }

        // Legacy fallback (for old system compatibility)
        if (!this.hotbarElement) return;

        const slots = this.hotbarElement.querySelectorAll('.hotbar-slot');
        slots.forEach((slot, index) => {
            // Safety check: only update if slot data exists
            if (index >= this.hotbarSlots.length) return;
            
            const slotData = this.hotbarSlots[index];
            if (!slotData) return;

            // Clear current content
            slot.innerHTML = '';

            if (slotData.itemType && slotData.quantity > 0) {
                const iconContent = this.voxelWorld.getItemIcon ?
                    this.voxelWorld.getItemIcon(slotData.itemType, 'hotbar') : '❓';
                const name = this.formatItemName(slotData.itemType);

                // Create item icon
                const itemIcon = document.createElement('div');
                itemIcon.classList.add('hotbar-icon-container'); // Add context class for emoji sizing
                if (iconContent.includes('<span') || iconContent.includes('<img')) {
                    itemIcon.innerHTML = iconContent;
                } else {
                    itemIcon.textContent = iconContent;
                }
                itemIcon.style.cssText = `
                    font-size: 36px;
                    text-align: center;
                    margin-bottom: 2px;
                `;
                slot.appendChild(itemIcon);

                // Create quantity display
                const quantityDisplay = document.createElement('div');
                quantityDisplay.textContent = slotData.quantity;
                quantityDisplay.style.cssText = `
                    font-size: 10px;
                    font-weight: bold;
                    text-align: center;
                    color: white;
                    text-shadow: 1px 1px 1px black;
                `;
                slot.appendChild(quantityDisplay);

                // Set title for tooltip
                slot.title = `${name}: ${slotData.quantity}`;
            }
        });
    }

    // 🔄 DELEGATED: Backpack UI updates now handled by VoxelWorld's beautiful restored UI
    updateBackpackInventoryDisplay() {
        // Delegate to VoxelWorld's polished UI system
        if (this.voxelWorld && this.voxelWorld.updateBackpackInventoryDisplay) {
            this.voxelWorld.updateBackpackInventoryDisplay();
            return;
        }

        // Legacy fallback (should not be used in hybrid system)
        if (!this.backpackSlots) return;

        // Update each backpack slot using new slot system
        let filledSlots = 0;

        // Update each backpack slot
        for (let i = 0; i < this.backpackSlots.length; i++) {
            const slotData = this.backpackSlots[i];

            // Skip if slot data doesn't exist
            if (!slotData) continue;

            const slot = slotData.element;

            // Skip if slot element doesn't exist yet
            if (!slot) continue;

            // Clear current content
            slot.innerHTML = '';

            if (slotData.itemType && slotData.quantity > 0) {
                // Has an item
                filledSlots++;
                const iconContent = this.voxelWorld.getItemIcon ?
                    this.voxelWorld.getItemIcon(slotData.itemType) : '❓';
                const name = this.formatItemName(slotData.itemType);

                // Store item type for transfers
                slot.dataset.itemType = slotData.itemType;

                // Create slot content wrapper
                const slotContent = document.createElement('div');
                slotContent.className = 'slot-content';
                slotContent.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    height: 100%;
                `;

                // Create item icon with larger size (36px like hotbar)
                const itemIcon = document.createElement('div');
                // Use innerHTML for crafted items (HTML icons), textContent for emojis
                if (iconContent.includes('<span') || iconContent.includes('<img')) {
                    itemIcon.innerHTML = iconContent;
                    // Force img tags to be 36px
                    const imgTag = itemIcon.querySelector('img');
                    if (imgTag) {
                        imgTag.style.width = '36px';
                        imgTag.style.height = '36px';
                    }
                } else {
                    itemIcon.textContent = iconContent;
                }
                itemIcon.style.cssText = `
                    font-size: 36px;
                    text-align: center;
                    margin-bottom: 4px;
                    line-height: 1;
                `;
                slotContent.appendChild(itemIcon);

                // Create quantity display
                const quantityDisplay = document.createElement('div');
                quantityDisplay.textContent = slotData.quantity;
                quantityDisplay.style.cssText = `
                    font-size: 11px;
                    font-weight: bold;
                    text-align: center;
                    color: #4a2511;
                    background: rgba(245, 230, 211, 0.9);
                    padding: 2px 6px;
                    border-radius: 10px;
                    border: 1px solid #8B4513;
                    min-width: 20px;
                `;
                slotContent.appendChild(quantityDisplay);

                slot.appendChild(slotContent);

                // Set title for tooltip with formatted name
                slot.title = `${name}\nQuantity: ${slotData.quantity}\n\nRight-click: Move to hotbar\nDrag: Move to hotbar/equipment`;
            } else {
                // Empty slot
                slot.title = 'Empty Slot\n\nDrag items here to store';
                slot.dataset.itemType = '';
            }
        }

        console.log(`🎒 Backpack UI updated: ${filledSlots}/20 slots filled`);
    }

    // 🎨 CREATE BACKPACK UI (Modern Adventurer's Theme)
    createBackpackInventory() {
        if (!this.voxelWorld.container) {
            console.warn('🎒 Container not ready for backpack UI creation');
            return;
        }

        // Ensure all backpack slots are properly initialized
        if (this.backpackSlots.length < 20) {
            console.log('🔧 Re-initializing backpack slots...');
            this.initializeInventory();
        }

        // Main backpack container with parchment theme
        this.backpackInventoryElement = document.createElement('div');
        this.backpackInventoryElement.style.cssText = `
            position: absolute;
            top: 80px;
            left: 50%;
            transform: translateX(-50%) translateY(-100vh);
            background: rgba(245, 230, 211, 0.95);
            border: 3px solid #8B4513;
            border-radius: 12px;
            padding: 20px;
            z-index: 1500;
            transition: transform 0.3s ease-in-out;
            min-width: 380px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3),
                        inset 0 1px 0 rgba(255, 255, 255, 0.3);
        `;

        // Title with adventurer's style
        const title = document.createElement('div');
        title.textContent = '🎒 Adventurer\'s Backpack';
        title.style.cssText = `
            color: #4a2511;
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 15px;
            text-align: center;
            font-family: 'Georgia', serif;
            text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.5);
            letter-spacing: 1px;
        `;
        this.backpackInventoryElement.appendChild(title);

        // Subtitle with stack info
        const subtitle = document.createElement('div');
        subtitle.textContent = '20 Slots • 50 Items per Stack';
        subtitle.style.cssText = `
            color: #8B4513;
            font-size: 12px;
            margin-bottom: 15px;
            text-align: center;
            font-family: 'Georgia', serif;
            opacity: 0.8;
        `;
        this.backpackInventoryElement.appendChild(subtitle);

        // Grid container (4x5 grid with larger slots)
        const gridContainer = document.createElement('div');
        gridContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(4, 70px);
            grid-template-rows: repeat(5, 70px);
            gap: 8px;
            justify-content: center;
        `;

        // Create 20 slots (4x5 grid)
        for (let i = 0; i < 20; i++) {
            const slot = document.createElement('div');
            slot.dataset.backpackSlotIndex = i;
            slot.draggable = true; // Enable dragging
            slot.style.cssText = `
                width: 70px;
                height: 70px;
                border: 2px solid #8B4513;
                border-radius: 6px;
                background: rgba(218, 165, 32, 0.15);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                cursor: grab;
                transition: all 0.2s;
                box-sizing: border-box;
                position: relative;
            `;

            // Hover effects
            slot.addEventListener('mouseenter', () => {
                slot.style.background = 'rgba(218, 165, 32, 0.25)';
                slot.style.borderColor = '#DAA520';
                slot.style.transform = 'scale(1.05)';
            });

            slot.addEventListener('mouseleave', () => {
                slot.style.background = 'rgba(218, 165, 32, 0.15)';
                slot.style.borderColor = '#8B4513';
                slot.style.transform = 'scale(1)';
            });

            // Right-click to transfer to hotbar (existing functionality)
            slot.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.transferItemToHotbar(i);
            });

            // Store DOM element reference
            if (this.backpackSlots[i]) {
                this.backpackSlots[i].element = slot;
            } else {
                this.backpackSlots[i] = { itemType: null, quantity: 0, element: slot };
            }
            gridContainer.appendChild(slot);
        }

        this.backpackInventoryElement.appendChild(gridContainer);
        this.voxelWorld.container.appendChild(this.backpackInventoryElement);
        
        // Initialize drag & drop after UI is created
        this.setupBackpackDragAndDrop();
    }

    // 🔧 SAVE/LOAD FUNCTIONALITY
    getSaveData() {
        return {
            hotbarSlots: this.hotbarSlots,
            backpackSlots: this.backpackSlots.map(slot => ({
                itemType: slot.itemType,
                quantity: slot.quantity
                // Don't save DOM element reference
            }))
        };
    }

    loadSaveData(saveData) {
        if (saveData.hotbarSlots) {
            this.hotbarSlots = saveData.hotbarSlots;
            console.log(`🎯 Restored ${this.hotbarSlots.length} hotbar slots`);
        }

        if (saveData.backpackSlots) {
            // Restore data but preserve DOM element references
            saveData.backpackSlots.forEach((slotData, index) => {
                if (index < this.backpackSlots.length) {
                    const existingElement = this.backpackSlots[index].element;
                    this.backpackSlots[index] = {
                        itemType: slotData.itemType,
                        quantity: slotData.quantity,
                        element: existingElement
                    };
                }
            });
            console.log(`🎒 Restored ${saveData.backpackSlots.length} backpack slots`);
        }
    }

    // 🧹 UTILITY FUNCTIONS
    setUIElements(hotbarElement, backpackInventoryElement) {
        this.hotbarElement = hotbarElement;
        this.backpackInventoryElement = backpackInventoryElement;
    }

    clearInventory() {
        this.initializeInventory();
        this.updateHotbarCounts();
        this.updateBackpackInventoryDisplay();
    }

    debugInventory() {
        console.log('🔍 INVENTORY DEBUG:');
        console.log('🎯 HOTBAR CONTENTS:');
        this.hotbarSlots.forEach((slot, index) => {
            if (slot.itemType && slot.quantity > 0) {
                console.log(`  Hotbar slot ${index}: ${slot.itemType} x${slot.quantity}`);
            }
        });

        console.log('🎒 BACKPACK CONTENTS:');
        let backpackHasItems = false;
        this.backpackSlots.forEach((slot, index) => {
            if (slot.itemType && slot.quantity > 0) {
                console.log(`  Backpack slot ${index}: ${slot.itemType} x${slot.quantity}`);
                backpackHasItems = true;
            }
        });

        if (!backpackHasItems) {
            console.log('  Backpack is empty');
        }
    }

    // 🎨 DRAG & DROP SYSTEM FOR BACKPACK
    setupBackpackDragAndDrop() {
        this.backpackSlots.forEach((slotData, index) => {
            const slot = slotData.element;
            if (!slot) return;

            // Drag start - item being dragged FROM backpack
            slot.addEventListener('dragstart', (e) => this.handleBackpackDragStart(e, index));
            
            // Drag over - hovering over backpack slot
            slot.addEventListener('dragover', (e) => this.handleBackpackDragOver(e, index));
            
            // Drop - item dropped ON backpack slot
            slot.addEventListener('drop', (e) => this.handleBackpackDrop(e, index));
            
            // Drag end - cleanup
            slot.addEventListener('dragend', (e) => this.handleBackpackDragEnd(e));
            
            // Drag leave - remove hover effects
            slot.addEventListener('dragleave', (e) => this.handleBackpackDragLeave(e));
        });
    }

    handleBackpackDragStart(e, sourceIndex) {
        const sourceSlot = this.backpackSlots[sourceIndex];
        
        // Only allow dragging if slot has an item
        if (!sourceSlot.itemType || sourceSlot.quantity === 0) {
            e.preventDefault();
            return;
        }

        // Store source info in dataTransfer with 'backpack' prefix
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify({
            source: 'backpack',
            sourceIndex: sourceIndex,
            itemType: sourceSlot.itemType,
            quantity: sourceSlot.quantity
        }));

        // Create custom drag image
        const dragIcon = e.target.querySelector('.slot-content');
        if (dragIcon) {
            const clone = dragIcon.cloneNode(true);
            clone.style.position = 'absolute';
            clone.style.top = '-1000px';
            clone.style.opacity = '0.8';
            clone.style.width = '70px';
            clone.style.height = '70px';
            document.body.appendChild(clone);
            e.dataTransfer.setDragImage(clone, 35, 35);
            
            // Clean up clone after drag starts
            setTimeout(() => document.body.removeChild(clone), 0);
        }

        // Visual feedback - dim source slot
        e.target.style.opacity = '0.5';
        console.log(`📦 Drag started from backpack slot ${sourceIndex}: ${sourceSlot.itemType}`);
    }

    handleBackpackDragOver(e, targetIndex) {
        e.preventDefault(); // Allow drop
        e.dataTransfer.dropEffect = 'move';

        // Visual feedback - highlight valid drop target
        const slot = this.backpackSlots[targetIndex].element;
        slot.style.background = 'rgba(144, 238, 144, 0.3)'; // Light green
        slot.style.borderColor = '#90EE90';
    }

    handleBackpackDrop(e, targetIndex) {
        e.preventDefault();
        e.stopPropagation();

        // Parse drag data
        let dragData;
        try {
            dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
        } catch (err) {
            console.error('❌ Failed to parse drag data:', err);
            return;
        }

        console.log(`📦 Drop on backpack slot ${targetIndex} from ${dragData.source} slot ${dragData.sourceIndex}`);

        if (dragData.source === 'backpack') {
            // Backpack to backpack - swap slots
            this.swapBackpackSlots(dragData.sourceIndex, targetIndex);
        } else if (dragData.source === 'hotbar') {
            // Hotbar to backpack - transfer item
            this.transferFromHotbarToBackpack(dragData.sourceIndex, targetIndex);
        }

        // Reset visual
        const slot = this.backpackSlots[targetIndex].element;
        slot.style.background = 'rgba(218, 165, 32, 0.15)';
        slot.style.borderColor = '#8B4513';
    }

    handleBackpackDragEnd(e) {
        // Reset opacity
        e.target.style.opacity = '1';
        
        // Reset all backpack slots to default colors
        this.backpackSlots.forEach(slotData => {
            if (slotData.element) {
                slotData.element.style.background = 'rgba(218, 165, 32, 0.15)';
                slotData.element.style.borderColor = '#8B4513';
            }
        });
        
        console.log('📦 Backpack drag ended');
    }

    handleBackpackDragLeave(e) {
        // Reset to default colors when mouse leaves
        if (e.target.classList?.contains || e.target.dataset?.backpackSlotIndex !== undefined) {
            e.target.style.background = 'rgba(218, 165, 32, 0.15)';
            e.target.style.borderColor = '#8B4513';
        }
    }

    swapBackpackSlots(sourceIndex, targetIndex) {
        if (sourceIndex === targetIndex) return;

        // Get both slots
        const sourceSlot = { ...this.backpackSlots[sourceIndex] };
        const targetSlot = { ...this.backpackSlots[targetIndex] };

        // Swap the data (preserve element references)
        this.backpackSlots[sourceIndex].itemType = targetSlot.itemType;
        this.backpackSlots[sourceIndex].quantity = targetSlot.quantity;

        this.backpackSlots[targetIndex].itemType = sourceSlot.itemType;
        this.backpackSlots[targetIndex].quantity = sourceSlot.quantity;

        // Update UI
        this.updateBackpackInventoryDisplay();
        
        console.log(`🔄 Swapped backpack slots ${sourceIndex} ↔ ${targetIndex}`);
    }

    transferFromHotbarToBackpack(hotbarIndex, backpackIndex) {
        // Get hotbar system reference
        const hotbarSystem = this.voxelWorld.hotbarSystem;
        if (!hotbarSystem) {
            console.error('❌ HotbarSystem not found');
            return;
        }

        const hotbarSlot = hotbarSystem.slots[hotbarIndex];
        const backpackSlot = this.backpackSlots[backpackIndex];

        if (!hotbarSlot.itemType || hotbarSlot.quantity === 0) {
            console.log('⚠️ Source hotbar slot is empty');
            return;
        }

        // Swap the items
        const tempItem = { ...hotbarSlot };
        
        hotbarSlot.itemType = backpackSlot.itemType;
        hotbarSlot.quantity = backpackSlot.quantity;
        
        backpackSlot.itemType = tempItem.itemType;
        backpackSlot.quantity = tempItem.quantity;

        // Sync hotbar slots 0-4 back to InventorySystem if needed
        if (hotbarIndex < 5) {
            this.hotbarSlots[hotbarIndex].itemType = hotbarSlot.itemType;
            this.hotbarSlots[hotbarIndex].quantity = hotbarSlot.quantity;
        }

        // Update both UIs
        hotbarSystem.updateUI();
        this.updateBackpackInventoryDisplay();
        
        console.log(`🔄 Transferred from hotbar ${hotbarIndex} to backpack ${backpackIndex}`);
    }
}