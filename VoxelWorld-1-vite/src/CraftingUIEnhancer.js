/**
 * CraftingUIEnhancer.js
 * 
 * Enhances crafting UI with status indicators and emoji fallbacks
 * Shows players which items are complete vs in-progress
 */

import { itemRegistry } from './ItemRegistry.js';
import { getEmojiImageUrl } from './EmojiRenderer.js';

export class CraftingUIEnhancer {
    constructor() {
        this.statusStyles = {
            complete: {
                borderColor: '#4CAF50',
                badgeColor: '#4CAF50',
                badgeText: '✅ Ready'
            },
            partial: {
                borderColor: '#FFA500',
                badgeColor: '#FFA500',
                badgeText: '🚧 WIP'
            },
            planned: {
                borderColor: '#666',
                badgeColor: '#666',
                badgeText: '📋 Soon'
            }
        };

                // Art strategy configuration
        this.artStrategy = {
            // Items that MUST use PNG (no emoji fallback)
            // - All blocks (need texture consistency)
            // - Items with no emoji equivalent (machete, complex tools)
            requirePNG: [
                // Blocks - need PNG textures
                'stone', 'dirt', 'grass', 'wood', 'sand', 'gravel',
                'coal_ore', 'iron_ore', 'gold_ore', 'diamond_ore',
                'leaves', 'glass', 'brick', 'planks',
                
                // Tools with no emoji equivalent
                'machete',
                'grappling_hook',
                
                // Complex items that need specific look
                'compass',
                'map',
                'telescope'
            ],
            
            // Items that should prefer emoji even if PNG exists
            // (Override the default PNG-first behavior)
            preferEmoji: [
                'skull',
                'bone',
                'feather',
                'mushroom',
                'flower',
                'crystal',
                'bread',
                'fish',
                'carrot',
                'pumpkin',
                'shell',
                'ice'
            ],
            
            // Auto-detection rules:
            // 1. If item in requirePNG → PNG only (error if missing)
            // 2. If item in preferEmoji → Use emoji (even if PNG exists)
            // 3. Otherwise → Try emoji by name, fallback to PNG if no emoji found
        };
    }

    /**
     * Enhance a blueprint/recipe element with status indicator
     * @param {HTMLElement} element - The crafting UI element
     * @param {string} itemId - The item being crafted
     * @param {boolean} canCraft - Whether player can craft it
     */
    enhanceElement(element, itemId, canCraft) {
        const item = itemRegistry.getItem(itemId);
        if (!item) return element;

        const status = item.status || 'planned';
        const style = this.statusStyles[status];

        // Add status border
        element.style.borderLeft = `4px solid ${style.borderColor}`;
        element.style.paddingLeft = '8px';

        // Create status badge
        const badge = document.createElement('div');
        badge.style.cssText = `
            display: inline-block;
            padding: 2px 6px;
            background: ${style.badgeColor};
            color: white;
            font-size: 9px;
            font-weight: bold;
            border-radius: 3px;
            margin-left: 5px;
            opacity: 0.8;
        `;
        badge.textContent = style.badgeText;
        badge.title = itemRegistry.getStatusText(itemId);

        // Add badge to title
        const titleElement = element.querySelector('div');
        if (titleElement) {
            titleElement.appendChild(badge);
        }

        // Add hover effect for partial/planned items
        if (status !== 'complete') {
            element.addEventListener('mouseenter', () => {
                element.style.opacity = '0.8';
            });
            element.addEventListener('mouseleave', () => {
                element.style.opacity = '1';
            });
        }

        return element;
    }

    /**
     * Get icon for an item, respecting art strategy
     * 
     * Smart Strategy:
     * 1. If item in requirePNG list → PNG only (error if missing)
     * 2. If item in preferEmoji list → Use emoji (even if PNG exists)
     * 3. Otherwise → Auto-detect: Try emoji by name, fallback to PNG if no emoji found
     * 
     * This means:
     * - Blocks always use PNG (in requirePNG)
     * - Items like "machete" (no emoji) will try emoji, fail, use PNG
     * - Items like "skull" 💀 will use emoji automatically
     * - You only need to update requirePNG/preferEmoji for special cases
     * 
     * @param {string} itemId - Item identifier
     * @returns {string|HTMLImageElement} Icon (emoji string or PNG image element)
     */
    getItemIcon(itemId) {
        const requiresPNG = this.artStrategy.requirePNG.includes(itemId);
        const prefersEmoji = this.artStrategy.preferEmoji.includes(itemId);
        
        // Rule 1: Must use PNG (blocks, machete, etc.)
        if (requiresPNG) {
            return this.tryPNGOnly(itemId);
        }
        
        // Rule 2: Prefer emoji even if PNG exists
        if (prefersEmoji) {
            return this.tryEmojiFirst(itemId);
        }
        
        // Rule 3: Auto-detect - try emoji by name, fallback to PNG
        return this.tryEmojiAutoDetect(itemId);
    }

    /**
     * PNG only strategy (for blocks, items with no emoji equivalent)
     * Returns PNG or error placeholder
     */
    tryPNGOnly(itemId) {
        // Try getting PNG from enhancedGraphics
        if (window.voxelWorld?.enhancedGraphics) {
            const toolImages = window.voxelWorld.enhancedGraphics.toolImages;
            if (toolImages && toolImages.has(itemId)) {
                const imgData = toolImages.get(itemId);
                return imgData.image || imgData.path;
            }
        }
        
        // PNG required but missing - return error indicator
        console.warn(`[CraftingUI] PNG required for "${itemId}" but not found`);
        return '🚫'; // Error indicator
    }

    /**
     * Emoji-first strategy (for items we explicitly want as emoji)
     * Returns emoji or PNG fallback
     */
    tryEmojiFirst(itemId) {
        // Try emoji by name
        const emojiResult = this.tryEmojiByName(itemId);
        if (emojiResult !== '❓') {
            return emojiResult;
        }
        
        // Fallback to PNG if emoji not found
        return this.tryPNGOnly(itemId);
    }

    /**
     * Auto-detect strategy (default for most items)
     * Try emoji by name, if not found try PNG, final fallback to placeholder
     */
    tryEmojiAutoDetect(itemId) {
        // First, try to find emoji by item name
        const emojiResult = this.tryEmojiByName(itemId);
        if (emojiResult !== '❓') {
            return emojiResult; // Found emoji! Use it
        }
        
        // No emoji found, try PNG
        if (window.voxelWorld?.enhancedGraphics) {
            const toolImages = window.voxelWorld.enhancedGraphics.toolImages;
            if (toolImages && toolImages.has(itemId)) {
                const imgData = toolImages.get(itemId);
                return imgData.image || imgData.path;
            }
        }
        
        // Neither emoji nor PNG found
        console.warn(`[CraftingUI] No emoji or PNG found for "${itemId}"`);
        return '❓'; // Placeholder
    }

    /**
     * Try to find emoji by item name using EmojiRenderer
     * Returns emoji URL or '❓' if not found
     */
    tryEmojiByName(itemId) {
        if (!window.voxelWorld?.emojiRenderer) {
            return '❓';
        }
        
        // Convert item_id to search term (remove underscores, try as-is)
        const searchTerm = itemId.replace(/_/g, ' ');
        
        try {
            // Try to get emoji URL - if emoji exists for this name, we'll get a URL
            // getEmojiImageUrl returns themed PNG URL from emoji-mart
            const emojiUrl = window.voxelWorld.emojiRenderer.getEmojiImageUrl(searchTerm);
            if (emojiUrl) {
                return emojiUrl;
            }
        } catch (e) {
            // Emoji not found by name
        }
        
        return '❓'; // No emoji found
    }

    /**
     * Create info tooltip for item
     * @param {string} itemId - Item identifier
     * @returns {HTMLElement} Tooltip element
     */
    createItemTooltip(itemId) {
        const item = itemRegistry.getItem(itemId);
        if (!item) return null;

        const tooltip = document.createElement('div');
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.95);
            border: 2px solid ${this.statusStyles[item.status].borderColor};
            border-radius: 5px;
            padding: 10px;
            color: white;
            font-size: 12px;
            z-index: 10000;
            pointer-events: none;
            max-width: 250px;
            display: none;
        `;

        tooltip.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">
                ${item.emoji} ${item.name}
            </div>
            <div style="color: #aaa; margin-bottom: 5px;">
                ${item.description || 'No description'}
            </div>
            <div style="color: ${this.statusStyles[item.status].borderColor}; font-size: 10px;">
                ${this.statusStyles[item.status].badgeText} - ${itemRegistry.getStatusText(itemId)}
            </div>
        `;

        return tooltip;
    }

    /**
     * Add console commands for debugging
     */
    static registerDebugCommands(voxelWorld) {
        // List all items by status
        window.listItemsByStatus = (status = 'all') => {
            const stats = itemRegistry.getStats();
            
            console.log('━'.repeat(60));
            console.log('📋 CRAFTING ITEMS STATUS REPORT');
            console.log('━'.repeat(60));
            console.log(`Total Items: ${stats.total}`);
            console.log(`✅ Complete: ${stats.complete} (${Math.round(stats.complete/stats.total*100)}%)`);
            console.log(`🚧 Partial: ${stats.partial} (${Math.round(stats.partial/stats.total*100)}%)`);
            console.log(`📋 Planned: ${stats.planned} (${Math.round(stats.planned/stats.total*100)}%)`);
            console.log(`Implementation: ${stats.implementedPercent}%`);
            console.log('━'.repeat(60));

            if (status === 'all') {
                ['complete', 'partial', 'planned'].forEach(s => {
                    const items = itemRegistry.getItemsByStatus(s);
                    console.log(`\n${s.toUpperCase()}:`);
                    items.forEach(item => {
                        console.log(`  ${item.emoji} ${item.name} (${item.id})`);
                    });
                });
            } else {
                const items = itemRegistry.getItemsByStatus(status);
                console.log(`\n${status.toUpperCase()} ITEMS:`);
                items.forEach(item => {
                    console.log(`  ${item.emoji} ${item.name} (${item.id})`);
                });
            }
        };

        // Test item functionality
        window.testItem = (itemId, quantity = 1) => {
            giveItem(itemId, quantity);
            
            const item = itemRegistry.getItem(itemId);
            if (!item) {
                console.error(`❌ Item not found: ${itemId}`);
                return;
            }

            console.log('━'.repeat(60));
            console.log(`🧪 TESTING: ${item.emoji} ${item.name}`);
            console.log('━'.repeat(60));
            console.log(`Status: ${itemRegistry.getStatusText(itemId)} ${itemRegistry.getStatusIndicator(itemId)}`);
            console.log(`Category: ${item.category}`);
            console.log(`Description: ${item.description}`);
            
            if (item.status === 'complete') {
                console.log('✅ This item is fully implemented and should work!');
            } else if (item.status === 'partial') {
                console.log('🚧 This item is partially implemented. It may:');
                console.log('   - Work but use emoji instead of custom graphics');
                console.log('   - Have functionality but need polish');
                console.log('   - Need additional features to be complete');
            } else {
                console.log('📋 This item is planned but not yet implemented.');
                console.log('   It exists in JSON but has no game functionality yet.');
            }
            console.log('━'.repeat(60));
        };

        console.log('🛠️ Debug commands registered:');
        console.log('  listItemsByStatus("complete") - Show all complete items');
        console.log('  listItemsByStatus("partial")  - Show items in progress');
        console.log('  listItemsByStatus("planned")  - Show planned items');
        console.log('  listItemsByStatus("all")      - Show everything');
        console.log('  testItem("stone_pickaxe", 1)  - Test an item');
    }
}

// Create singleton
export const craftingUIEnhancer = new CraftingUIEnhancer();
