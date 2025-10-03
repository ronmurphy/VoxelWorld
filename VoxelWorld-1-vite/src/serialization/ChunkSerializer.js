/**
 * ChunkSerializer.js
 *
 * Binary chunk serialization for VoxelWorld chunk persistence system.
 *
 * File Format:
 * - Header (32 bytes)
 * - Block Data (variable size, ~14KB typical)
 * - Tree Data (variable size)
 *
 * Header Structure (32 bytes):
 * - Version (4 bytes) - uint32
 * - Chunk X (4 bytes) - int32
 * - Chunk Z (4 bytes) - int32
 * - Block Count (4 bytes) - uint32
 * - Tree Count (4 bytes) - uint32
 * - Timestamp (8 bytes) - uint64 (stored as 2x uint32)
 * - Reserved (8 bytes) - for future use
 *
 * Block Data Format (per block):
 * - X position (1 byte) - uint8 (0-7)
 * - Y position (1 byte) - uint8 (0-255)
 * - Z position (1 byte) - uint8 (0-7)
 * - Block Type (1 byte) - uint8 (enum index)
 * - Color (3 bytes) - RGB uint8 values
 * - Flags (1 byte) - uint8 bitmask
 * Total: 8 bytes per block
 *
 * Tree Data Format (per tree):
 * - Position (3 bytes) - x, y, z uint8
 * - Type ID (1 byte) - uint8
 * - Reserved (4 bytes) - for future tree metadata
 * Total: 8 bytes per tree
 */

export class ChunkSerializer {
    static VERSION = 1;
    static HEADER_SIZE = 32;
    static BYTES_PER_BLOCK = 8;
    static BYTES_PER_TREE = 8;

    /**
     * Block type to numeric ID mapping
     * Must match the game's block type system
     */
    static BLOCK_TYPE_IDS = {
        'air': 0,
        'grass': 1,
        'dirt': 2,
        'stone': 3,
        'sand': 4,
        'iron': 5,
        'oak_wood': 6,
        'pine_wood': 7,
        'birch_wood': 8,
        'palm_wood': 9,
        'dead_wood': 10,
        'oak_wood-leaves': 11,
        'pine_wood-leaves': 12,
        'birch_wood-leaves': 13,
        'palm_wood-leaves': 14,
        'dead_wood-leaves': 15,
        'water': 16,
        'bedrock': 17
    };

    static ID_TO_BLOCK_TYPE = Object.fromEntries(
        Object.entries(ChunkSerializer.BLOCK_TYPE_IDS).map(([k, v]) => [v, k])
    );

    /**
     * Serialize chunk data to binary ArrayBuffer
     *
     * @param {Object} chunkData - Chunk data from ChunkWorker
     * @param {number} chunkX - Chunk X coordinate
     * @param {number} chunkZ - Chunk Z coordinate
     * @returns {ArrayBuffer} Binary chunk data
     */
    static serializeChunk(chunkData, chunkX, chunkZ) {
        const { blocks, trees } = chunkData;
        const blockCount = blocks.length;
        const treeCount = trees ? trees.length : 0;

        // Calculate total size
        const headerSize = ChunkSerializer.HEADER_SIZE;
        const blockDataSize = blockCount * ChunkSerializer.BYTES_PER_BLOCK;
        const treeDataSize = treeCount * ChunkSerializer.BYTES_PER_TREE;
        const totalSize = headerSize + blockDataSize + treeDataSize;

        // Create buffer and views
        const buffer = new ArrayBuffer(totalSize);
        const view = new DataView(buffer);
        const uint8View = new Uint8Array(buffer);

        let offset = 0;

        // Write header
        view.setUint32(offset, ChunkSerializer.VERSION, true); offset += 4;
        view.setInt32(offset, chunkX, true); offset += 4;
        view.setInt32(offset, chunkZ, true); offset += 4;
        view.setUint32(offset, blockCount, true); offset += 4;
        view.setUint32(offset, treeCount, true); offset += 4;

        // Timestamp (8 bytes as 2x uint32)
        const timestamp = Date.now();
        view.setUint32(offset, Math.floor(timestamp / 0x100000000), true); offset += 4;
        view.setUint32(offset, timestamp & 0xFFFFFFFF, true); offset += 4;

        // Reserved (8 bytes)
        offset += 8;

        // Write block data
        for (const block of blocks) {
            const { x, y, z, type, color, flags } = block;

            // Position (3 bytes)
            uint8View[offset++] = x & 0xFF;
            uint8View[offset++] = y & 0xFF;
            uint8View[offset++] = z & 0xFF;

            // Block type (1 byte)
            const typeId = ChunkSerializer.BLOCK_TYPE_IDS[type] ?? 0;
            uint8View[offset++] = typeId;

            // Color (3 bytes RGB)
            const r = ((color >> 16) & 0xFF);
            const g = ((color >> 8) & 0xFF);
            const b = (color & 0xFF);
            uint8View[offset++] = r;
            uint8View[offset++] = g;
            uint8View[offset++] = b;

            // Flags (1 byte)
            uint8View[offset++] = flags || 0;
        }

        // Write tree data
        if (trees && trees.length > 0) {
            for (const tree of trees) {
                const { position, typeId } = tree;

                // Position (3 bytes)
                uint8View[offset++] = position.x & 0xFF;
                uint8View[offset++] = position.y & 0xFF;
                uint8View[offset++] = position.z & 0xFF;

                // Type ID (1 byte)
                uint8View[offset++] = typeId || 0;

                // Reserved (4 bytes)
                offset += 4;
            }
        }

        return buffer;
    }

    /**
     * Deserialize binary chunk data to chunk object
     *
     * @param {ArrayBuffer} buffer - Binary chunk data
     * @returns {Object} Deserialized chunk data
     */
    static deserializeChunk(buffer) {
        const view = new DataView(buffer);
        const uint8View = new Uint8Array(buffer);

        let offset = 0;

        // Read header
        const version = view.getUint32(offset, true); offset += 4;
        const chunkX = view.getInt32(offset, true); offset += 4;
        const chunkZ = view.getInt32(offset, true); offset += 4;
        const blockCount = view.getUint32(offset, true); offset += 4;
        const treeCount = view.getUint32(offset, true); offset += 4;

        // Timestamp (8 bytes as 2x uint32)
        const timestampHigh = view.getUint32(offset, true); offset += 4;
        const timestampLow = view.getUint32(offset, true); offset += 4;
        const timestamp = timestampHigh * 0x100000000 + timestampLow;

        // Skip reserved (8 bytes)
        offset += 8;

        // Validate version
        if (version !== ChunkSerializer.VERSION) {
            console.warn(`⚠️ Chunk version mismatch: expected ${ChunkSerializer.VERSION}, got ${version}`);
        }

        // Read block data
        const blocks = [];
        for (let i = 0; i < blockCount; i++) {
            // Position (3 bytes)
            const x = uint8View[offset++];
            const y = uint8View[offset++];
            const z = uint8View[offset++];

            // Block type (1 byte)
            const typeId = uint8View[offset++];
            const type = ChunkSerializer.ID_TO_BLOCK_TYPE[typeId] || 'air';

            // Color (3 bytes RGB)
            const r = uint8View[offset++];
            const g = uint8View[offset++];
            const b = uint8View[offset++];
            const color = (r << 16) | (g << 8) | b;

            // Flags (1 byte)
            const flags = uint8View[offset++];

            blocks.push({ x, y, z, type, color, flags });
        }

        // Read tree data
        const trees = [];
        for (let i = 0; i < treeCount; i++) {
            // Position (3 bytes)
            const x = uint8View[offset++];
            const y = uint8View[offset++];
            const z = uint8View[offset++];

            // Type ID (1 byte)
            const typeId = uint8View[offset++];

            // Skip reserved (4 bytes)
            offset += 4;

            trees.push({
                position: { x, y, z },
                typeId
            });
        }

        return {
            version,
            chunkX,
            chunkZ,
            timestamp,
            blocks,
            trees
        };
    }

    /**
     * Generate filename for chunk file
     *
     * @param {number} chunkX - Chunk X coordinate
     * @param {number} chunkZ - Chunk Z coordinate
     * @returns {string} Chunk filename (e.g., "chunk_12_-5.dat")
     */
    static getChunkFilename(chunkX, chunkZ) {
        return `chunk_${chunkX}_${chunkZ}.dat`;
    }

    /**
     * Generate filename for modification file
     *
     * @param {number} chunkX - Chunk X coordinate
     * @param {number} chunkZ - Chunk Z coordinate
     * @returns {string} Modification filename (e.g., "chunk_12_-5.mod")
     */
    static getModFilename(chunkX, chunkZ) {
        return `chunk_${chunkX}_${chunkZ}.mod`;
    }

    /**
     * Parse chunk coordinates from filename
     *
     * @param {string} filename - Chunk filename
     * @returns {Object|null} {x, z} or null if invalid
     */
    static parseChunkFilename(filename) {
        const match = filename.match(/^chunk_(-?\d+)_(-?\d+)\.(dat|mod)$/);
        if (!match) return null;

        return {
            x: parseInt(match[1], 10),
            z: parseInt(match[2], 10),
            type: match[3] // 'dat' or 'mod'
        };
    }
}
