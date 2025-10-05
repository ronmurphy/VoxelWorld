/**
 * StructureGen        // Current available blocks (more can be added when textures available)
        this.BLOCK_PALETTE = {
            wall: 'stone',
            floor: 'dirt',
            rubble: 'dirt',
            treasure: 'skull' // Billboard treasure item
        };
        
        // Billboard treasure items (all world items from spawnRandomWorldItems)
        this.TREASURE_ITEMS = [
            // Desert items
            'skull',           // 💀
            
            // Forest items
            'mushroom',        // 🍄
            'flower',          // 🌸
            'berry',           // 🍓
            'leaf',            // 🍃
            
            // Mountain items
            'crystal',         // 💎
            'oreNugget',       // ⛰️
            
            // Plains items
            'wheat',           // 🌾
            'feather',         // 🪶
            'bone',            // 🦴
            
            // Tundra items
            'shell',           // 🐚
            'fur',             // 🐻‍❄️
            'iceShard',        // ❄️
            
            // Rare equipment (very exciting finds!)
            'rustySword',      // ⚔️
            'oldPickaxe',      // ⛏️
            'ancientAmulet'    // 📿
        ];ral ruins and structure generation
 * Generates small/medium/large/colossal ruins with hollow interiors
 * Minimal integration with BiomeWorldGen, no cache/worker modifications
 */
export class StructureGenerator {
    constructor(seed = 12345) {
        this.seed = seed;
        this.STRUCTURE_FREQUENCY = 0.008; // Tuned for exciting finds, not littered
        this.MIN_STRUCTURE_DISTANCE = 80; // Minimum blocks between structures
        
        // Structure size definitions
        this.SIZES = {
            small: { width: 5, height: 5, depth: 5, weight: 0.5 },
            medium: { width: 9, height: 7, depth: 9, weight: 0.3 },
            large: { width: 15, height: 10, depth: 15, weight: 0.15 },
            colossal: { width: 25, height: 15, depth: 25, weight: 0.05 }
        };
        
        // Current available blocks (more can be added when textures available)
        this.BLOCK_PALETTE = {
            wall: 'stone',
            floor: 'dirt',
            rubble: 'dirt',
            treasure: 'skull' // Billboard treasure item
        };
        
        // Billboard treasure items (world items that can spawn in ruins)
        this.TREASURE_ITEMS = [
            'skull',       // 💀 Desert item
            'mushroom',    // 🍄 Forest item
            'flower',      // � Forest item
            'berry',       // � Forest item
            'leaf'         // � Forest item (common)
        ];
        
        // Biome-specific blocks (for future expansion)
        this.BIOME_BLOCKS = {
            desert: ['sand', 'dirt', 'stone'], // sandstone when available
            mountain: ['stone', 'stone', 'dirt'],
            tundra: ['stone', 'dirt', 'snow'],
            default: ['stone', 'dirt', 'grass']
        };
    }
    
    /**
     * Main entry point - called from BiomeWorldGen after terrain generation
     * @param {number} chunkX - Chunk X coordinate
     * @param {number} chunkZ - Chunk Z coordinate
     * @param {Function} addBlockFn - Function to place blocks
     * @param {Function} getHeightFn - Function to get ground height at position
     * @param {string} biome - Current biome name (optional, for future biome-specific ruins)
     */
    generateStructuresForChunk(chunkX, chunkZ, addBlockFn, getHeightFn, biome = 'default') {
        // Check if this chunk should have a structure origin point
        const structureData = this.checkForStructure(chunkX, chunkZ);
        
        if (structureData) {
            const { worldX, worldZ, size, buried } = structureData;
            this.generateStructure(worldX, worldZ, size, buried, addBlockFn, getHeightFn, biome);
        }
        
        // Check nearby chunks for structures that might extend into this chunk
        for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
                if (dx === 0 && dz === 0) continue;
                
                const nearbyData = this.checkForStructure(chunkX + dx, chunkZ + dz);
                if (nearbyData) {
                    const { worldX, worldZ, size, buried } = nearbyData;
                    const sizeData = this.SIZES[size];
                    
                    // Check if structure extends into current chunk
                    const currentChunkWorldX = chunkX * 16;
                    const currentChunkWorldZ = chunkZ * 16;
                    
                    if (Math.abs(worldX - currentChunkWorldX) < sizeData.width + 16 &&
                        Math.abs(worldZ - currentChunkWorldZ) < sizeData.depth + 16) {
                        this.generateStructure(worldX, worldZ, size, buried, addBlockFn, getHeightFn, biome);
                    }
                }
            }
        }
    }
    
    /**
     * Deterministic check if a chunk should have a structure
     * Uses seed-based noise for consistent placement across sessions
     */
    checkForStructure(chunkX, chunkZ) {
        // Use noise-based generation for structure placement
        const noise = this.seededNoise(chunkX, chunkZ);
        
        // Only generate if noise exceeds threshold
        if (noise < 1.0 - this.STRUCTURE_FREQUENCY) {
            return null;
        }
        
        // Determine structure size based on noise value
        const sizeNoise = this.seededNoise(chunkX * 2, chunkZ * 2);
        let size = 'small';
        let cumulative = 0;
        
        for (const [sizeName, data] of Object.entries(this.SIZES)) {
            cumulative += data.weight;
            if (sizeNoise < cumulative) {
                size = sizeName;
                break;
            }
        }
        
        // Determine if structure should be buried (25% chance)
        const burialNoise = this.seededNoise(chunkX * 3, chunkZ * 3);
        const buried = burialNoise > 0.75;
        
        // Calculate world position (center of chunk with some variation)
        const offsetX = Math.floor(this.seededNoise(chunkX * 4, chunkZ * 4) * 16);
        const offsetZ = Math.floor(this.seededNoise(chunkX * 5, chunkZ * 5) * 16);
        
        return {
            worldX: chunkX * 16 + offsetX,
            worldZ: chunkZ * 16 + offsetZ,
            size,
            buried
        };
    }
    
    /**
     * Generate a structure at the specified world position
     * @param {number} playerY - Optional player Y position for debug mode
     */
    generateStructure(worldX, worldZ, size, buried, addBlockFn, getHeightFn, biome, playerY = null) {
        const sizeData = this.SIZES[size];
        const { width, height, depth } = sizeData;
        
        // Get ground level at structure center
        let groundHeight;
        if (playerY !== null) {
            // Debug mode - use player Y as reference for more accurate placement
            groundHeight = Math.floor(playerY);
            console.log(`🔧 Debug mode: Using player Y (${groundHeight}) for structure placement`);
        } else {
            // Normal mode - detect ground height
            groundHeight = getHeightFn(worldX, worldZ);
            
            // Safety check: if ground detection failed or returned weird value, use safe default
            if (groundHeight === null || groundHeight === undefined || groundHeight < 0 || groundHeight > 64) {
                console.warn(`⚠️ Invalid ground height (${groundHeight}) at (${worldX}, ${worldZ}), using default y=5`);
                groundHeight = 5; // Safe default above bedrock
            }
        }
        
        // Calculate base Y position
        let baseY = groundHeight;
        if (buried) {
            // Bury 3/4 of the structure, but never go below y=1 (bedrock is y=0)
            const burialDepth = Math.floor(height * 0.75);
            baseY = Math.max(1, groundHeight - burialDepth);
        } else {
            // Not buried - place 1-2 blocks lower than ground for better integration
            // This makes ruins look like they're partially sunken/settled into terrain
            const settlementDepth = Math.floor(Math.random() * 2) + 1; // 1-2 blocks
            baseY = Math.max(1, groundHeight - settlementDepth);
        }
        
        // Final safety check: ensure structure doesn't go below bedrock
        // If structure base + height would go below y=1, adjust upward
        if (baseY < 1) {
            baseY = 1;
            console.warn(`⚠️ Structure adjusted to y=1 to avoid bedrock`);
        }
        
        // Generate structure blocks
        const halfWidth = Math.floor(width / 2);
        const halfDepth = Math.floor(depth / 2);
        
        // Determine block types based on biome (future expansion)
        const palette = this.BIOME_BLOCKS[biome] || this.BIOME_BLOCKS.default;
        
        for (let x = -halfWidth; x <= halfWidth; x++) {
            for (let z = -halfDepth; z <= halfDepth; z++) {
                for (let y = 0; y < height; y++) {
                    const worldPosX = worldX + x;
                    const worldPosZ = worldZ + z;
                    const worldPosY = baseY + y;
                    
                    // Don't place blocks at or below bedrock
                    if (worldPosY <= 0) continue;
                    
                    const isWall = this.isWallBlock(x, y, z, width, height, depth);
                    const isDoorway = this.isDoorway(x, y, z, width, height, depth);
                    
                    // Place wall blocks, but skip doorways
                    if (isWall && !isDoorway) {
                        // Add some variation - occasionally use dirt/grass instead of stone
                        const blockType = this.getBlockType(x, y, z, palette);
                        addBlockFn(worldPosX, worldPosY, worldPosZ, blockType, false);
                    }
                }
            }
        }
        
        // Add interior details (treasure chests)
        this.addInteriorDetails(worldX, worldZ, baseY, width, height, depth, addBlockFn);
    }
    
    /**
     * Determine if a position is a wall block
     */
    isWallBlock(x, y, z, width, height, depth) {
        const halfWidth = Math.floor(width / 2);
        const halfDepth = Math.floor(depth / 2);
        
        // Floor
        if (y === 0) return true;
        
        // Ceiling (partial - ruins have holes)
        if (y === height - 1) {
            // Only 40% of ceiling remains
            return this.seededNoise(x * 7, z * 7) < 0.4;
        }
        
        // Walls
        const isEdgeX = Math.abs(x) === halfWidth;
        const isEdgeZ = Math.abs(z) === halfDepth;
        
        if (isEdgeX || isEdgeZ) {
            // Add some crumbling - 10% of wall blocks missing
            return this.seededNoise(x * 11, y * 13 + z * 17) > 0.1;
        }
        
        return false;
    }
    
    /**
     * Check if position is a doorway (2x2 opening)
     */
    isDoorway(x, y, z, width, height, depth) {
        const halfWidth = Math.floor(width / 2);
        const halfDepth = Math.floor(depth / 2);
        
        // Only at ground level (y = 0, 1, 2 for 2-high + 1 above head)
        if (y > 2) return false;
        
        // Front wall doorway (centered)
        if (z === halfDepth && Math.abs(x) <= 1 && y <= 2) return true;
        
        // For larger structures, add side doorways
        if (width >= 15) {
            if (x === halfWidth && Math.abs(z) <= 1 && y <= 2) return true;
            if (x === -halfWidth && Math.abs(z) <= 1 && y <= 2) return true;
        }
        
        return false;
    }
    
    /**
     * Get block type with some variation
     */
    getBlockType(x, y, z, palette) {
        const noise = this.seededNoise(x * 19, y * 23 + z * 29);
        
        // Mostly stone, some dirt/grass for weathered look
        if (noise < 0.7) return 'stone';
        if (noise < 0.9) return 'dirt';
        return palette[Math.floor(Math.random() * palette.length)];
    }
    
    /**
     * Add interior details - random billboard treasure items
     */
    addInteriorDetails(worldX, worldZ, baseY, width, height, depth, addBlockFn) {
        // Small structures: 1 treasure, Medium: 1-2, Large: 2-3, Colossal: 3-5
        const treasureCount = width < 7 ? 1 : width < 12 ? 2 : width < 20 ? 3 : 4;
        
        for (let i = 0; i < treasureCount; i++) {
            // Random position inside structure (away from walls)
            const x = Math.floor(this.seededNoise(i * 31, worldX) * (width - 4)) - Math.floor(width / 2) + 2;
            const z = Math.floor(this.seededNoise(i * 37, worldZ) * (depth - 4)) - Math.floor(depth / 2) + 2;
            const y = 1; // Place on floor
            
            // Random selection from treasure items
            const randomIndex = Math.floor(this.seededNoise(i * 43, worldZ * 47) * this.TREASURE_ITEMS.length);
            const treasureType = this.TREASURE_ITEMS[randomIndex];
            
            addBlockFn(worldX + x, baseY + y, worldZ + z, treasureType, false);
        }
    }
    
    /**
     * Seeded noise function for deterministic generation
     * Returns value between 0 and 1
     */
    seededNoise(x, z) {
        const n = Math.sin(x * 12.9898 + z * 78.233 + this.seed) * 43758.5453123;
        return n - Math.floor(n);
    }
    
    /**
     * 🔧 DEBUG: Generate a ruin near player position for testing
     * Usage: window.makeRuins("small") or window.makeRuins("medium"), etc.
     * @param {string} size - "small", "medium", "large", or "colossal"
     * @param {number} playerX - Player X position
     * @param {number} playerY - Player Y position (used for accurate placement)
     * @param {number} playerZ - Player Z position
     * @param {Function} addBlockFn - Function to place blocks
     * @param {Function} getHeightFn - Function to get ground height
     * @param {string} biome - Biome name (optional)
     */
    debugGenerateRuin(size, playerX, playerY, playerZ, addBlockFn, getHeightFn, biome = 'default') {
        // Validate size
        if (!this.SIZES[size]) {
            console.error(`❌ Invalid size "${size}". Use: small, medium, large, or colossal`);
            return;
        }
        
        // Place structure 10-20 blocks in front of player (positive Z direction)
        const distance = 15;
        const offsetX = Math.floor((Math.random() - 0.5) * 10); // Random offset ±5 blocks
        const offsetZ = distance + Math.floor(Math.random() * 10); // 15-25 blocks away
        
        const structureX = Math.floor(playerX + offsetX);
        const structureZ = Math.floor(playerZ + offsetZ);
        
        // Don't bury debug structures - place them on surface at player's Y level
        const buried = false;
        
        console.log(`🏛️ Generating ${size} ruin at (${structureX}, ${playerY}, ${structureZ}) near player at (${playerX}, ${playerY}, ${playerZ})`);
        
        // Pass playerY to use player's current height instead of ground detection
        this.generateStructure(structureX, structureZ, size, buried, addBlockFn, getHeightFn, biome, playerY);
        
        console.log(`✅ ${size} ruin generated! Look around position (${structureX}, ${structureZ})`);
    }
}
