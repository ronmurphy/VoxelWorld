/**
 * 🎒 BackpackSystem - Backpack UI and Management
 * 
 * Extracted from VoxelWorld.js to separate concerns
 * Handles backpack UI creation, display updates, and item interactions
 */
export class BackpackSystem {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;
        this.backpackInventoryElement = null;
    }

    /**
     * Create the backpack UI
     */
    createBackpackInventory() {
        this.backpackInventoryElement = document.createElement('div');
        this.backpackInventoryElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 50%;
            transform: translateX(-50%) translateY(-100%);
            width: 400px;
            background: rgba(40, 40, 40, 0.95);
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 0 0 12px 12px;
            padding: 20px;
            z-index: 3000;
            transition: transform 0.3s ease-out;
            backdrop-filter: blur(8px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        `;

        // Title header
        const header = document.createElement('div');
        header.textContent = '🎒 Backpack Storage (5x5 Grid)';
        header.style.cssText = `
            color: white;
            font-family: monospace;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 15px;
            text-align: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            padding-bottom: 10px;
        `;
        this.backpackInventoryElement.appendChild(header);

        // 5x5 grid container
        const gridContainer = document.createElement('div');
        gridContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 8px;
            margin-bottom: 15px;
        `;

        // Create 25 inventory slots (5x5) - connect to InventorySystem backend
        for (let i = 0; i < 25; i++) {
            const slot = document.createElement('div');
            slot.className = `backpack-slot slot-${i}`;
            slot.style.cssText = `
                width: 60px;
                height: 60px;
                background: rgba(60, 60, 60, 0.8);
                border: 2px solid #555;
                border-radius: 6px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-family: monospace;
                font-size: 10px;
                color: white;
                cursor: pointer;
                position: relative;
            `;

            // Empty slot content
            const slotIcon = document.createElement('div');
            slotIcon.textContent = '📦';
            slotIcon.style.cssText = `
                font-size: 16px;
                opacity: 0.3;
            `;
            slot.appendChild(slotIcon);

            const slotLabel = document.createElement('div');
            slotLabel.textContent = 'Empty';
            slotLabel.style.cssText = `
                font-size: 8px;
                opacity: 0.5;
                margin-top: 2px;
            `;
            slot.appendChild(slotLabel);

            // Hover effects
            slot.addEventListener('mouseenter', () => {
                slot.style.background = 'rgba(80, 80, 80, 0.9)';
                slot.style.borderColor = '#777';
            });

            slot.addEventListener('mouseleave', () => {
                slot.style.background = 'rgba(64, 64, 64, 0.8)';
                slot.style.borderColor = '#444';
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
                                this.voxelWorld.updateStatus(`Equipped ${backpackSlot.itemType}`, 'info');
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

        // Info footer
        const footer = document.createElement('div');
        footer.innerHTML = `
            <div style="
                color: rgba(255, 255, 255, 0.6);
                font-family: Georgia, serif;
                font-size: 11px;
                text-align: center;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                padding-top: 10px;
            ">
                <div style="margin-bottom: 4px;">Right-click: Transfer to hotbar</div>
                <div style="opacity: 0.8;">Ctrl+Right-click: Equip tool (⚔️ slots)</div>
            </div>
        `;
        this.backpackInventoryElement.appendChild(footer);

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 8px;
            right: 12px;
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            opacity: 0.7;
        `;
        closeBtn.addEventListener('click', () => {
            this.voxelWorld.toggleBackpack();
        });
        closeBtn.addEventListener('mouseenter', () => closeBtn.style.opacity = '1');
        closeBtn.addEventListener('mouseleave', () => closeBtn.style.opacity = '0.7');
        this.backpackInventoryElement.appendChild(closeBtn);

        // Add to container
        this.voxelWorld.container.appendChild(this.backpackInventoryElement);
    }

    /**
     * Update the backpack display with current inventory data
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
                    margin-bottom: 2px;
                `;
                slot.appendChild(itemIcon);

                // Create item count
                const itemCount = document.createElement('div');
                itemCount.textContent = slotData.quantity;
                itemCount.style.cssText = `
                    font-size: 10px;
                    font-weight: bold;
                    color: #4CAF50;
                `;
                slot.appendChild(itemCount);

                // Create item name (smaller)
                const itemName = document.createElement('div');
                itemName.textContent = name.substring(0, 6); // Truncate long names
                itemName.style.cssText = `
                    font-size: 7px;
                    opacity: 0.8;
                    margin-top: 1px;
                `;
                slot.appendChild(itemName);

                // Add tooltip on hover
                slot.title = `${name}: ${slotData.quantity}`;

                // Update slot styling for filled slot
                slot.style.background = 'rgba(40, 80, 40, 0.8)';
                slot.style.borderColor = '#4CAF50';
            } else {
                // Empty slot
                slot.dataset.itemType = '';

                const emptyIcon = document.createElement('div');
                emptyIcon.textContent = '📦';
                emptyIcon.style.cssText = `
                    font-size: 16px;
                    opacity: 0.3;
                `;
                slot.appendChild(emptyIcon);

                const emptyLabel = document.createElement('div');
                emptyLabel.textContent = 'Empty';
                emptyLabel.style.cssText = `
                    font-size: 8px;
                    opacity: 0.5;
                    margin-top: 2px;
                `;
                slot.appendChild(emptyLabel);

                // Reset slot styling for empty slot
                slot.style.background = 'rgba(60, 60, 60, 0.8)';
                slot.style.borderColor = '#555';
                slot.title = 'Empty slot';
            }
        }

        // Silent backpack updates - UI shows the state
        // console.log(`🎒 Backpack updated: ${filledSlots} filled slots out of ${this.voxelWorld.inventory.backpackSlots.length} total`);
    }
}
