/**
 * 🎒 BackpackSystem - Backpack UI and Management (Adventurer's Theme)
 * 
 * Extracted from VoxelWorld.js to separate concerns
 * Features:
 * - Modern parchment theme matching Explorer's Journal
 * - 70px slots with 36px icons
 * - 20 slots (4x5 grid) to balance 50-stack size
 * - Drag & drop integration with HotbarSystem
 */
export class BackpackSystem {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;
        this.backpackInventoryElement = null;
    }

    /**
     * Create the backpack UI with Adventurer's theme
     */
    createBackpackInventory() {
        this.backpackInventoryElement = document.createElement('div');
        this.backpackInventoryElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 50%;
            transform: translateX(-50%) translateY(-100%);
            width: 420px;
            background: rgba(245, 230, 211, 0.95);
            border: 3px solid #8B4513;
            border-radius: 0 0 16px 16px;
            padding: 20px;
            z-index: 3000;
            transition: transform 0.3s ease-out;
            backdrop-filter: blur(8px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3),
                        inset 0 1px 0 rgba(255, 255, 255, 0.3);
        `;

        // Title header with adventurer's style
        const header = document.createElement('div');
        header.textContent = '🎒 Adventurer\'s Backpack';
        header.style.cssText = `
            color: #4a2511;
            font-family: 'Georgia', serif;
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 10px;
            text-align: center;
            text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.5);
            letter-spacing: 1px;
        `;
        this.backpackInventoryElement.appendChild(header);

        // Subtitle with storage info
        const subtitle = document.createElement('div');
        subtitle.textContent = '20 Slots • 50 Items per Stack';
        subtitle.style.cssText = `
            color: #8B4513;
            font-family: 'Georgia', serif;
            font-size: 12px;
            margin-bottom: 15px;
            text-align: center;
            opacity: 0.8;
        `;
        this.backpackInventoryElement.appendChild(subtitle);

        // 4x5 grid container (reduced from 5x5)
        const gridContainer = document.createElement('div');
        gridContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(4, 70px);
            grid-template-rows: repeat(5, 70px);
            gap: 8px;
            justify-content: center;
            margin-bottom: 15px;
        `;

        // Create 20 inventory slots (4x5) - connect to InventorySystem backend
        for (let i = 0; i < 20; i++) {
            const slot = document.createElement('div');
            slot.className = `backpack-slot slot-${i}`;
            slot.dataset.backpackSlotIndex = i;
            slot.draggable = true;
            slot.style.cssText = `
                width: 70px;
                height: 70px;
                background: rgba(218, 165, 32, 0.15);
                border: 2px solid #8B4513;
                border-radius: 6px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-family: 'Georgia', serif;
                font-size: 10px;
                color: #4a2511;
                cursor: grab;
                position: relative;
                transition: all 0.2s;
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

            // Right-click handler for item transfer (Ctrl+Right for equipment, normal for hotbar)
            slot.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                
                // Ctrl+Right-click = send to equipment slot (if it's a tool)
                if (e.ctrlKey) {
                    const backpackSlot = this.voxelWorld.inventory.backpackSlots[i];
                    if (backpackSlot && backpackSlot.itemType && backpackSlot.quantity > 0) {
                        if (this.voxelWorld.hotbarSystem && this.voxelWorld.hotbarSystem.isToolItem(backpackSlot.itemType)) {
                            const success = this.voxelWorld.hotbarSystem.addToolToEquipment(backpackSlot.itemType, backpackSlot.quantity);
                            if (success) {
                                // Remove from backpack
                                backpackSlot.itemType = '';
                                backpackSlot.quantity = 0;
                                this.updateBackpackInventoryDisplay();
                                this.voxelWorld.updateStatus(`Equipped tool`, 'info');
                            }
                        } else {
                            this.voxelWorld.updateStatus(`Only tools can be equipped!`, 'warning');
                        }
                    }
                } else {
                    // Normal right-click = send to hotbar
                    this.voxelWorld.inventory.transferItemToHotbar(i);
                }
            });

            // Store slot reference in InventorySystem
            if (this.voxelWorld.inventory.backpackSlots[i]) {
                this.voxelWorld.inventory.backpackSlots[i].element = slot;
            } else {
                this.voxelWorld.inventory.backpackSlots[i] = { itemType: null, quantity: 0, element: slot };
            }

            gridContainer.appendChild(slot);
        }
        this.backpackInventoryElement.appendChild(gridContainer);

        // Info footer with adventurer's style
        const footer = document.createElement('div');
        footer.innerHTML = `
            <div style="
                color: #8B4513;
                font-family: 'Georgia', serif;
                font-size: 11px;
                text-align: center;
                border-top: 2px solid #8B4513;
                padding-top: 10px;
            ">
                <div style="margin-bottom: 4px;">🖱️ Right-click: Transfer to hotbar</div>
                <div style="opacity: 0.8;">⚔️ Ctrl+Right-click: Equip tool</div>
                <div style="opacity: 0.8; margin-top: 4px;">🎯 Drag & drop: Move items</div>
            </div>
        `;
        this.backpackInventoryElement.appendChild(footer);

        // Close button with adventurer's style
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 8px;
            right: 12px;
            background: none;
            border: none;
            color: #8B4513;
            font-size: 24px;
            cursor: pointer;
            opacity: 0.7;
            font-weight: bold;
        `;
        closeBtn.addEventListener('click', () => {
            this.voxelWorld.toggleBackpackInventory();
        });
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.opacity = '1';
            closeBtn.style.color = '#4a2511';
        });
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.opacity = '0.7';
            closeBtn.style.color = '#8B4513';
        });
        this.backpackInventoryElement.appendChild(closeBtn);

        // Add to container
        this.voxelWorld.container.appendChild(this.backpackInventoryElement);
        
        // Initialize drag & drop (to be added next)
        this.setupBackpackDragAndDrop();
    }

    /**
     * Update the backpack display with current inventory data (modernized)
     */
    updateBackpackInventoryDisplay() {
        // Ensure backpack UI is created before updating
        if (!this.backpackInventoryElement) {
            this.createBackpackInventory();
        }

        // Update each backpack slot using InventorySystem data
        let filledSlots = 0;

        // Update each backpack slot from InventorySystem
        for (let i = 0; i < this.voxelWorld.inventory.backpackSlots.length; i++) {
            const slotData = this.voxelWorld.inventory.backpackSlots[i];
            const slot = slotData.element;

            // Skip if slot element doesn't exist yet
            if (!slot) continue;

            // Clear current content
            slot.innerHTML = '';

            if (slotData.itemType && slotData.quantity > 0) {
                // Has an item
                filledSlots++;
                const iconContent = this.voxelWorld.getItemIcon(slotData.itemType, 'inventory');
                const name = this.voxelWorld.formatItemName(slotData.itemType);

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

                // Create item icon with larger size (36px)
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

                // Create quantity display with parchment style
                const itemCount = document.createElement('div');
                itemCount.textContent = slotData.quantity;
                itemCount.style.cssText = `
                    font-size: 11px;
                    font-weight: bold;
                    color: #4a2511;
                    background: rgba(245, 230, 211, 0.9);
                    padding: 2px 6px;
                    border-radius: 10px;
                    border: 1px solid #8B4513;
                    min-width: 20px;
                    text-align: center;
                `;
                slotContent.appendChild(itemCount);

                slot.appendChild(slotContent);

                // Add tooltip on hover with formatted name
                slot.title = `${name}\nQuantity: ${slotData.quantity}\n\nRight-click: Move to hotbar\nDrag: Move to hotbar/equipment`;

                // Update slot styling for filled slot
                slot.style.background = 'rgba(218, 165, 32, 0.25)';
                slot.style.borderColor = '#DAA520';
            } else {
                // Empty slot
                slot.dataset.itemType = '';

                const emptyIcon = document.createElement('div');
                emptyIcon.textContent = '📦';
                emptyIcon.style.cssText = `
                    font-size: 24px;
                    opacity: 0.3;
                `;
                slot.appendChild(emptyIcon);

                // Reset slot styling for empty slot
                slot.style.background = 'rgba(218, 165, 32, 0.15)';
                slot.style.borderColor = '#8B4513';
                slot.title = 'Empty Slot\n\nDrag items here to store';
            }
        }

        // Silent backpack updates - UI shows the state
        // console.log(`🎒 Backpack updated: ${filledSlots} filled slots out of ${this.voxelWorld.inventory.backpackSlots.length} total`);
    }

    /**
     * Setup drag & drop for backpack slots
     */
    setupBackpackDragAndDrop() {
        this.voxelWorld.inventory.backpackSlots.forEach((slotData, index) => {
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
        
        // Drag & drop enabled for backpack slots
    }

    handleBackpackDragStart(e, sourceIndex) {
        const sourceSlot = this.voxelWorld.inventory.backpackSlots[sourceIndex];
        
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
            setTimeout(() => {
                if (document.body.contains(clone)) {
                    document.body.removeChild(clone);
                }
            }, 0);
        }

        // Visual feedback - dim source slot
        e.target.style.opacity = '0.5';
        e.target.style.cursor = 'grabbing';
    }

    handleBackpackDragOver(e, targetIndex) {
        e.preventDefault(); // Allow drop
        e.dataTransfer.dropEffect = 'move';

        // Visual feedback - highlight valid drop target
        const slot = this.voxelWorld.inventory.backpackSlots[targetIndex].element;
        if (slot) {
            slot.style.background = 'rgba(144, 238, 144, 0.3)'; // Light green
            slot.style.borderColor = '#90EE90';
        }
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

        if (dragData.source === 'backpack') {
            // Backpack to backpack - swap slots
            this.swapBackpackSlots(dragData.sourceIndex, targetIndex);
        } else if (dragData.source === 'hotbar') {
            // Hotbar to backpack - transfer item
            this.transferFromHotbarToBackpack(dragData.sourceIndex, targetIndex);
        }

        // Reset visual
        const slot = this.voxelWorld.inventory.backpackSlots[targetIndex].element;
        if (slot) {
            slot.style.background = 'rgba(218, 165, 32, 0.15)';
            slot.style.borderColor = '#8B4513';
        }
    }

    handleBackpackDragEnd(e) {
        // Reset opacity and cursor
        e.target.style.opacity = '1';
        e.target.style.cursor = 'grab';
        
        // Reset all backpack slots to default colors
        this.voxelWorld.inventory.backpackSlots.forEach(slotData => {
            if (slotData.element) {
                slotData.element.style.background = 'rgba(218, 165, 32, 0.15)';
                slotData.element.style.borderColor = '#8B4513';
            }
        });
    }

    handleBackpackDragLeave(e) {
        // Reset to default colors when mouse leaves
        if (e.target.dataset?.backpackSlotIndex !== undefined) {
            e.target.style.background = 'rgba(218, 165, 32, 0.15)';
            e.target.style.borderColor = '#8B4513';
        }
    }

    swapBackpackSlots(sourceIndex, targetIndex) {
        if (sourceIndex === targetIndex) return;

        // Get both slots
        const sourceSlot = { ...this.voxelWorld.inventory.backpackSlots[sourceIndex] };
        const targetSlot = { ...this.voxelWorld.inventory.backpackSlots[targetIndex] };

        // Swap the data (preserve element references)
        this.voxelWorld.inventory.backpackSlots[sourceIndex].itemType = targetSlot.itemType;
        this.voxelWorld.inventory.backpackSlots[sourceIndex].quantity = targetSlot.quantity;

        this.voxelWorld.inventory.backpackSlots[targetIndex].itemType = sourceSlot.itemType;
        this.voxelWorld.inventory.backpackSlots[targetIndex].quantity = sourceSlot.quantity;

        // Update UI
        this.updateBackpackInventoryDisplay();
    }

    transferFromHotbarToBackpack(hotbarIndex, backpackIndex) {
        // Get hotbar system reference
        const hotbarSystem = this.voxelWorld.hotbarSystem;
        if (!hotbarSystem) {
            console.error('❌ HotbarSystem not found');
            return;
        }

        const hotbarSlot = hotbarSystem.slots[hotbarIndex];
        const backpackSlot = this.voxelWorld.inventory.backpackSlots[backpackIndex];

        if (!hotbarSlot.itemType || hotbarSlot.quantity === 0) {
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
            this.voxelWorld.inventory.hotbarSlots[hotbarIndex].itemType = hotbarSlot.itemType;
            this.voxelWorld.inventory.hotbarSlots[hotbarIndex].quantity = hotbarSlot.quantity;
        }

        // Update both UIs
        hotbarSystem.updateUI();
        this.updateBackpackInventoryDisplay();
    }
}
