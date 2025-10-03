/**
 * ModificationTracker.js
 *
 * Tracks player modifications to chunks (place/break blocks).
 * Stores delta changes in .mod files separate from generated terrain.
 *
 * Purpose:
 * - Track player-placed and player-removed blocks
 * - Store modifications in separate .mod files
 * - Merge modifications with generated terrain on load
 * - Optimize storage (only store changed blocks)
 *
 * Architecture:
 * - Modifications stored as sparse arrays (only changed positions)
 * - .mod files use same binary format as .dat files
 * - On load: Generated terrain + Modifications = Final chunk
 */

import { ChunkPersistence } from './ChunkPersistence.js';

export class ModificationTracker {
    constructor(worldSeed, isElectron = false) {
        this.persistence = new ChunkPersistence(worldSeed, isElectron);
        this.dirtyChunks = new Map(); // Map<chunkKey, modifications>
        this.saveInterval = 5000; // Auto-save every 5 seconds
        this.saveTimer = null;

        this.stats = {
            modificationsTracked: 0,
            chunksSaved: 0,
            chunksLoaded: 0
        };

        this.startAutoSave();
    }

    /**
     * Start auto-save timer
     */
    startAutoSave() {
        this.saveTimer = setInterval(() => {
            this.flushDirtyChunks();
        }, this.saveInterval);
    }

    /**
     * Stop auto-save timer
     */
    stopAutoSave() {
        if (this.saveTimer) {
            clearInterval(this.saveTimer);
            this.saveTimer = null;
        }
    }

    /**
     * Get chunk key
     */
    getChunkKey(chunkX, chunkZ) {
        return `${chunkX},${chunkZ}`;
    }

    /**
     * Track a block modification (place or break)
     *
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @param {number} worldZ - World Z coordinate
     * @param {string|null} blockType - Block type (null = removed)
     * @param {number} color - Block color
     * @param {boolean} isPlayerPlaced - Is this player-placed?
     */
    trackModification(worldX, worldY, worldZ, blockType, color, isPlayerPlaced = true) {
        // Calculate chunk coordinates
        const chunkX = Math.floor(worldX / 8);
        const chunkZ = Math.floor(worldZ / 8);
        const key = this.getChunkKey(chunkX, chunkZ);

        // Get or create modification map for this chunk
        if (!this.dirtyChunks.has(key)) {
            this.dirtyChunks.set(key, {
                chunkX,
                chunkZ,
                modifications: new Map() // Map<positionKey, block>
            });
        }

        const chunkMods = this.dirtyChunks.get(key);

        // Convert to chunk-relative coordinates
        const localX = worldX - chunkX * 8;
        const localZ = worldZ - chunkZ * 8;
        const posKey = `${localX},${worldY},${localZ}`;

        if (blockType === null || blockType === 'air') {
            // Block removed - store as null
            chunkMods.modifications.set(posKey, null);
            // console.log(`💾 Tracked block removal at (${worldX}, ${worldY}, ${worldZ}) in chunk (${chunkX}, ${chunkZ})`);
        } else {
            // Block placed/modified
            chunkMods.modifications.set(posKey, {
                x: localX,
                y: worldY,
                z: localZ,
                type: blockType,
                color: color,
                flags: isPlayerPlaced ? 1 : 0
            });
            // Only log wood blocks and player-placed blocks for easier debugging
            if (blockType.includes('wood') || blockType === 'birch_wood') {
                console.log(`💾 Tracked WOOD block: ${blockType} at (${worldX}, ${worldY}, ${worldZ}) in chunk (${chunkX}, ${chunkZ})`);
            }
        }

        this.stats.modificationsTracked++;
    }

    /**
     * Load modifications for a chunk
     *
     * @param {number} chunkX - Chunk X coordinate
     * @param {number} chunkZ - Chunk Z coordinate
     * @returns {Promise<Map|null>} Map of modifications or null if none
     */
    async loadModifications(chunkX, chunkZ) {
        try {
            const modData = await this.persistence.loadChunk(chunkX, chunkZ, true);
            if (!modData) return null;

            this.stats.chunksLoaded++;

            // Convert block array to Map
            const modifications = new Map();
            for (const block of modData.blocks) {
                const posKey = `${block.x},${block.y},${block.z}`;
                if (block.type === 'air' || block.flags === 255) {
                    // Flags === 255 is special "removed" marker
                    modifications.set(posKey, null);
                } else {
                    modifications.set(posKey, block);
                }
            }

            return modifications;
        } catch (error) {
            console.error(`❌ Failed to load modifications for chunk (${chunkX}, ${chunkZ}):`, error);
            return null;
        }
    }

    /**
     * Apply modifications to chunk block array
     *
     * @param {Array} blocks - Original block array
     * @param {Map} modifications - Modification map
     * @returns {Array} Modified block array
     */
    applyModifications(blocks, modifications) {
        if (!modifications || modifications.size === 0) {
            return blocks;
        }

        // Create map of original blocks by position
        const blockMap = new Map();
        for (const block of blocks) {
            const posKey = `${block.x},${block.y},${block.z}`;
            blockMap.set(posKey, block);
        }

        // Apply modifications
        for (const [posKey, modBlock] of modifications.entries()) {
            if (modBlock === null) {
                // Block removed
                blockMap.delete(posKey);
            } else {
                // Block placed/modified
                blockMap.set(posKey, modBlock);
            }
        }

        // Convert back to array
        return Array.from(blockMap.values());
    }

    /**
     * Flush dirty chunks to disk
     */
    async flushDirtyChunks() {
        if (this.dirtyChunks.size === 0) return;

        // console.log(`💾 Flushing ${this.dirtyChunks.size} dirty chunks to disk...`);
        const chunksToSave = Array.from(this.dirtyChunks.values());
        this.dirtyChunks.clear();

        for (const chunkMods of chunksToSave) {
            await this.saveModifications(chunkMods.chunkX, chunkMods.chunkZ, chunkMods.modifications);
        }
        // console.log(`✅ Flush complete`);
    }

    /**
     * Save modifications for a chunk
     */
    async saveModifications(chunkX, chunkZ, modifications) {
        try {
            // Convert modifications map to block array
            const blocks = [];
            for (const [posKey, block] of modifications.entries()) {
                if (block === null) {
                    // Removed block - store with special flag
                    const [x, y, z] = posKey.split(',').map(Number);
                    blocks.push({
                        x, y, z,
                        type: 'air',
                        color: 0,
                        flags: 255 // Special "removed" flag
                    });
                } else {
                    blocks.push(block);
                }
            }

            // Save to disk as .mod file
            const chunkObject = { blocks, trees: [] };
            await this.persistence.saveChunk(chunkX, chunkZ, chunkObject, true);
            this.stats.chunksSaved++;

            // console.log(`💾 Saved ${blocks.length} modifications for chunk (${chunkX}, ${chunkZ})`);
        } catch (error) {
            console.error(`❌ Failed to save modifications for chunk (${chunkX}, ${chunkZ}):`, error);
        }
    }

    /**
     * Mark chunk as dirty (has unsaved modifications)
     */
    markDirty(chunkX, chunkZ) {
        const key = this.getChunkKey(chunkX, chunkZ);
        if (!this.dirtyChunks.has(key)) {
            this.dirtyChunks.set(key, {
                chunkX,
                chunkZ,
                modifications: new Map()
            });
        }
    }

    /**
     * Check if chunk has unsaved modifications
     */
    isDirty(chunkX, chunkZ) {
        return this.dirtyChunks.has(this.getChunkKey(chunkX, chunkZ));
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            dirtyChunks: this.dirtyChunks.size
        };
    }

    /**
     * Cleanup
     */
    async cleanup() {
        this.stopAutoSave();
        await this.flushDirtyChunks();
    }
}
