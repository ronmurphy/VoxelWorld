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

        // Backpack slots (25 slots total)
        this.backpackSlots = [];
        for (let i = 0; i < 25; i++) {
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
    updateHotbarCounts() {
        if (!this.hotbarElement) return;

        const slots = this.hotbarElement.querySelectorAll('.hotbar-slot');
        slots.forEach((slot, index) => {
            const slotData = this.hotbarSlots[index];

            // Clear current content
            slot.innerHTML = '';

            if (slotData.itemType && slotData.quantity > 0) {
                const iconContent = this.voxelWorld.getItemIcon ?
                    this.voxelWorld.getItemIcon(slotData.itemType) : '❓';
                const name = slotData.itemType.charAt(0).toUpperCase() + slotData.itemType.slice(1);

                // Create item icon
                const itemIcon = document.createElement('div');
                if (iconContent.includes('<span') || iconContent.includes('<img')) {
                    itemIcon.innerHTML = iconContent;
                } else {
                    itemIcon.textContent = iconContent;
                }
                itemIcon.style.cssText = `
                    font-size: 16px;
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
                const name = slotData.itemType.charAt(0).toUpperCase() + slotData.itemType.slice(1);

                // Store item type for transfers
                slot.dataset.itemType = slotData.itemType;

                // Create item icon
                const itemIcon = document.createElement('div');
                // Use innerHTML for crafted items (HTML icons), textContent for emojis
                if (iconContent.includes('<span') || iconContent.includes('<img')) {
                    itemIcon.innerHTML = iconContent;
                } else {
                    itemIcon.textContent = iconContent;
                }
                itemIcon.style.cssText = `
                    font-size: 20px;
                    text-align: center;
                    margin-bottom: 3px;
                `;
                slot.appendChild(itemIcon);

                // Create quantity display
                const quantityDisplay = document.createElement('div');
                quantityDisplay.textContent = slotData.quantity;
                quantityDisplay.style.cssText = `
                    font-size: 12px;
                    font-weight: bold;
                    text-align: center;
                    color: white;
                    text-shadow: 1px 1px 1px black;
                `;
                slot.appendChild(quantityDisplay);

                // Set title for tooltip
                slot.title = `${name}: ${slotData.quantity} (Right-click to move to hotbar)`;
            } else {
                // Empty slot
                slot.title = 'Empty slot';
                slot.dataset.itemType = '';
            }
        }

        console.log(`🎒 Backpack UI updated: ${filledSlots}/25 slots filled`);
    }

    // 🎨 CREATE BACKPACK UI
    createBackpackInventory() {
        if (!this.voxelWorld.container) {
            console.warn('🎒 Container not ready for backpack UI creation');
            return;
        }

        // Ensure all backpack slots are properly initialized
        if (this.backpackSlots.length < 25) {
            console.log('🔧 Re-initializing backpack slots...');
            this.initializeInventory();
        }

        // Main backpack container
        this.backpackInventoryElement = document.createElement('div');
        this.backpackInventoryElement.style.cssText = `
            position: absolute;
            top: 80px;
            left: 50%;
            transform: translateX(-50%) translateY(-100vh);
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #666;
            border-radius: 8px;
            padding: 20px;
            z-index: 1500;
            transition: transform 0.3s ease-in-out;
            min-width: 320px;
        `;

        // Title
        const title = document.createElement('div');
        title.textContent = 'Backpack - 5x5 Storage';
        title.style.cssText = `
            color: white;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 15px;
            text-align: center;
            font-family: monospace;
        `;
        this.backpackInventoryElement.appendChild(title);

        // Grid container (5x5 grid)
        const gridContainer = document.createElement('div');
        gridContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(5, 55px);
            grid-template-rows: repeat(5, 55px);
            gap: 5px;
            justify-content: center;
        `;

        // Create 25 slots (5x5 grid)
        for (let i = 0; i < 25; i++) {
            const slot = document.createElement('div');
            slot.style.cssText = `
                width: 55px;
                height: 55px;
                border: 2px solid #444;
                border-radius: 4px;
                background: rgba(64, 64, 64, 0.8);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s;
                box-sizing: border-box;
            `;

            slot.addEventListener('mouseenter', () => {
                slot.style.background = 'rgba(100, 100, 100, 0.8)';
                slot.style.borderColor = '#888';
            });

            slot.addEventListener('mouseleave', () => {
                slot.style.background = 'rgba(64, 64, 64, 0.8)';
                slot.style.borderColor = '#444';
            });

            // Right-click to transfer to hotbar
            slot.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.transferItemToHotbar(i);
            });

            // Store DOM element reference (data is in this.backpackSlots array)
            if (this.backpackSlots[i]) {
                this.backpackSlots[i].element = slot;
            } else {
                // Initialize slot if it doesn't exist
                this.backpackSlots[i] = { itemType: null, quantity: 0, element: slot };
            }
            gridContainer.appendChild(slot);
        }

        this.backpackInventoryElement.appendChild(gridContainer);
        this.voxelWorld.container.appendChild(this.backpackInventoryElement);
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
}