/**
 * 🎄 ChristmasSystem.js - Self-Contained Christmas Event System
 *
 * Handles Christmas-themed features:
 * - Regular Douglas Fir trees (year-round, 1% spawn)
 * - Mega Douglas Fir (Dec 24-25 ONLY, 0.1% ultra-rare spawn)
 * - Gift-wrapped blocks with random ToolBench loot
 * - Snow circle conversion around Mega Firs
 * - 3-day snow melt timer after Christmas
 * - Companion proximity alerts for Mega Firs
 */

export default class ChristmasSystem {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;

        // Track Mega Douglas Fir positions
        this.megaFirPositions = []; // { x, y, z, chunkX, chunkZ, spawnDate }

        // Track indestructible Mega Fir blocks
        this.megaFirBlocks = new Set(); // Set of "x,y,z" keys for indestructible blocks

        // Track snow circles with melt timers
        this.snowCircles = new Map(); // key: "x,z" -> { blocks: [{x,y,z,originalType}], meltTimer: days }

        // Game time tracking for snow melt
        this.gameTime = 0; // Total elapsed game time in seconds
        this.lastMeltCheck = 0; // Last time we checked for snow melting

        console.log('🎄 ChristmasSystem initialized');
    }

    /**
     * Check if it's currently Christmas time (Dec 24-25)
     */
    isChristmasTime() {
        const now = new Date();
        const month = now.getMonth(); // 0-11 (11 = December)
        const day = now.getDate(); // 1-31

        return (month === 11 && day >= 24 && day <= 25); // Dec 24-25
    }

    /**
     * Check if a block is part of an indestructible Mega Douglas Fir
     */
    isMegaFirBlock(x, y, z) {
        const key = `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
        return this.megaFirBlocks.has(key);
    }

    /**
     * Check if a chunk should spawn a Mega Douglas Fir
     * Only during Dec 24-25, 0.1% chance (1 in 1000 chunks)
     */
    shouldSpawnMegaFir(chunkX, chunkZ) {
        if (!this.isChristmasTime()) {
            return false;
        }

        // Use chunk coordinates + world seed for deterministic spawn
        const seed = this.voxelWorld.worldSeed + 70000;
        let hash = seed;
        hash = ((hash << 5) + hash) + chunkX;
        hash = ((hash << 5) + hash) + chunkZ;
        hash = (hash * 16807) % 2147483647;
        const roll = Math.abs(Math.sin(hash));

        return roll < 0.001; // 0.1% chance
    }

    /**
     * Generate a Mega Douglas Fir (Dec 24-25 only)
     * Massive 11x11 → 9x9 → 7x7 → 5x5 → 3x3 → 1 cone
     * Height: 30-40 blocks
     */
    generateMegaDouuglasFir(x, y, z) {
        console.log(`🎄✨ MEGA DOUGLAS FIR spawning at (${x}, ${y}, ${z})!`);

        // Cone structure: 11x11 base → single point top
        const layers = [
            { size: 11, height: 3 },  // Wide base (3 layers)
            { size: 9, height: 3 },   // Second tier
            { size: 7, height: 4 },   // Middle tier
            { size: 5, height: 6 },   // Upper tier
            { size: 3, height: 8 },   // Narrow tier
            { size: 1, height: 10 }   // Tall trunk to point
        ];

        let currentY = y;
        const woodType = 'douglas_fir'; // Will need to add this block type
        const leavesType = 'douglas_fir-leaves';

        // Build cone from bottom to top
        for (const layer of layers) {
            const { size, height } = layer;
            const radius = Math.floor(size / 2);

            for (let h = 0; h < height; h++) {
                if (size === 1) {
                    // Single trunk block
                    const blockX = x;
                    const blockY = currentY + h;
                    const blockZ = z;
                    this.voxelWorld.addBlock(blockX, blockY, blockZ, woodType, false);
                    // Mark as indestructible
                    this.megaFirBlocks.add(`${blockX},${blockY},${blockZ}`);
                } else {
                    // Square layer with leaves/wood mix
                    for (let dx = -radius; dx <= radius; dx++) {
                        for (let dz = -radius; dz <= radius; dz++) {
                            const blockX = x + dx;
                            const blockY = currentY + h;
                            const blockZ = z + dz;

                            // Use wood for center column, leaves for outer blocks
                            const isCenter = (dx === 0 && dz === 0);
                            const blockType = isCenter ? woodType : leavesType;

                            // Mix in snow blocks in upper layers (size 5 and smaller)
                            let finalBlockType = blockType;
                            if (size <= 5 && !isCenter) {
                                const snowChance = Math.random();
                                if (snowChance < 0.3) { // 30% snow in upper canopy
                                    finalBlockType = 'snow';
                                }
                            }

                            this.voxelWorld.addBlock(blockX, blockY, blockZ, finalBlockType, false);
                            // Mark douglas_fir and douglas_fir-leaves as indestructible (not snow)
                            if (finalBlockType === woodType || finalBlockType === leavesType) {
                                this.megaFirBlocks.add(`${blockX},${blockY},${blockZ}`);
                            }
                        }
                    }
                }
            }

            currentY += height;
        }

        // 🌟 Place GOLD STAR on top (harvestable keepsake!)
        this.voxelWorld.addBlock(x, currentY, z, 'gold', false);
        console.log(`🌟 Gold star placed at top (${x}, ${currentY}, ${z})`);

        // 🎁 Place 5-10 gift-wrapped blocks randomly in canopy
        this.placeGiftBoxes(x, y, z, layers);

        // ❄️ Convert ground to snow in 15x15 radius
        this.createSnowCircle(x, y - 1, z, 15);

        // Track this Mega Fir
        const chunkX = Math.floor(x / this.voxelWorld.chunkSize);
        const chunkZ = Math.floor(z / this.voxelWorld.chunkSize);
        this.megaFirPositions.push({
            x, y, z,
            chunkX, chunkZ,
            spawnDate: new Date()
        });

        console.log(`🎄 Mega Douglas Fir complete! ${this.megaFirPositions.length} total spawned.`);
    }

    /**
     * Place 5-10 gift-wrapped blocks randomly in tree canopy
     */
    placeGiftBoxes(treeX, treeY, treeZ, layers) {
        const giftCount = 5 + Math.floor(Math.random() * 6); // 5-10 gifts
        console.log(`🎁 Placing ${giftCount} gift boxes in tree...`);

        for (let i = 0; i < giftCount; i++) {
            // Pick a random layer (avoid top single block and bottom 2 layers)
            const layerIndex = 2 + Math.floor(Math.random() * (layers.length - 3));
            const layer = layers[layerIndex];

            // Calculate Y position within this layer
            let layerY = treeY;
            for (let j = 0; j < layerIndex; j++) {
                layerY += layers[j].height;
            }
            const yOffset = Math.floor(Math.random() * layer.height);

            // Random position within layer bounds
            const radius = Math.floor(layer.size / 2);
            const dx = Math.floor(Math.random() * layer.size) - radius;
            const dz = Math.floor(Math.random() * layer.size) - radius;

            const giftX = treeX + dx;
            const giftY = layerY + yOffset;
            const giftZ = treeZ + dz;

            // Place gift block
            this.voxelWorld.addBlock(giftX, giftY, giftZ, 'gift_wrapped', false);
            console.log(`🎁 Gift placed at (${giftX}, ${giftY}, ${giftZ})`);
        }
    }

    /**
     * Create snow circle around Mega Fir
     * Converts grass/dirt/stone/sand to snow in specified radius
     */
    createSnowCircle(centerX, centerY, centerZ, radius) {
        const snowBlocks = [];

        console.log(`❄️ Creating ${radius}x${radius} snow circle at (${centerX}, ${centerZ})...`);

        for (let dx = -radius; dx <= radius; dx++) {
            for (let dz = -radius; dz <= radius; dz++) {
                const distance = Math.sqrt(dx * dx + dz * dz);
                if (distance <= radius) {
                    const x = centerX + dx;
                    const z = centerZ + dz;

                    // Find surface block at this position
                    for (let y = centerY + 5; y >= centerY - 5; y--) {
                        const block = this.voxelWorld.getBlock(x, y, z);
                        if (block && ['grass', 'dirt', 'stone', 'sand'].includes(block.type)) {
                            // Convert to snow
                            const originalType = block.type;
                            this.voxelWorld.removeBlock(x, y, z, false);
                            this.voxelWorld.addBlock(x, y, z, 'snow', false);

                            snowBlocks.push({ x, y, z, originalType });
                            break; // Only convert surface block
                        }
                    }
                }
            }
        }

        // Track snow circle for melting (3 in-game days after Dec 26)
        const key = `${centerX},${centerZ}`;
        this.snowCircles.set(key, {
            blocks: snowBlocks,
            meltTimer: 3, // 3 in-game days
            createdDate: new Date()
        });

        console.log(`❄️ Snow circle created: ${snowBlocks.length} blocks converted`);
    }

    /**
     * Check player proximity to Mega Firs and trigger companion alerts
     */
    checkProximityAlerts(playerX, playerZ) {
        if (!this.voxelWorld.chat) return; // Chat system not available
        if (!this.isChristmasTime()) return; // Only during Christmas

        const playerChunkX = Math.floor(playerX / (this.voxelWorld.chunkSize * 8));
        const playerChunkZ = Math.floor(playerZ / (this.voxelWorld.chunkSize * 8));

        for (const megaFir of this.megaFirPositions) {
            const dx = playerX - megaFir.x;
            const dz = playerZ - megaFir.z;
            const distance = Math.sqrt(dx * dx + dz * dz);

            // 20 chunk distance (~160 blocks)
            if (distance < 160 && distance > 155) {
                this.showDistantAlert();
            }

            // 5 chunk distance (~40 blocks)
            if (distance < 40 && distance > 35) {
                this.showNearbyAlert();
            }
        }
    }

    showDistantAlert() {
        if (this._lastDistantAlert && Date.now() - this._lastDistantAlert < 60000) return; // Cooldown
        this._lastDistantAlert = Date.now();

        const messages = [
            "Wait... do you feel that? There's something magical in the air...",
            "I sense something special nearby... something that doesn't belong to this world...",
            "By the stars! There's an ancient power emanating from somewhere... we should investigate!"
        ];

        const message = messages[Math.floor(Math.random() * messages.length)];

        // Get active companion
        const companionId = localStorage.getItem('activeCompanion') || 'rat';
        this.voxelWorld.chat.showMessage({
            character: companionId,
            text: message
        });
    }

    showNearbyAlert() {
        if (this._lastNearbyAlert && Date.now() - this._lastNearbyAlert < 60000) return; // Cooldown
        this._lastNearbyAlert = Date.now();

        const messages = [
            "There! Do you see it?! That massive tree... it's magnificent!",
            "A Christmas miracle! I've only heard legends of these trees...",
            "Look at the size of that Douglas Fir! And are those... presents?!"
        ];

        const message = messages[Math.floor(Math.random() * messages.length)];

        const companionId = localStorage.getItem('activeCompanion') || 'rat';
        this.voxelWorld.chat.showMessage({
            character: companionId,
            text: message
        });
    }

    /**
     * Update system (called from main game loop)
     */
    update(deltaTime, playerPosition) {
        // Track game time
        this.gameTime += deltaTime;

        // Check proximity alerts every frame (throttled internally)
        if (playerPosition && this.isChristmasTime()) {
            this.checkProximityAlerts(playerPosition.x, playerPosition.z);
        }

        // Check for Mega Fir despawning (after Dec 25)
        if (!this.isChristmasTime() && this.megaFirPositions.length > 0) {
            this.despawnChristmasTrees();
        }

        // Handle snow melting (after Dec 26)
        if (!this.isChristmasTime()) {
            this.updateSnowMelt(deltaTime);
        }
    }

    /**
     * Despawn Mega Douglas Firs after Christmas (Dec 26+)
     */
    despawnChristmasTrees() {
        console.log(`🎄 Christmas is over - despawning ${this.megaFirPositions.length} Mega Douglas Firs...`);

        for (const megaFir of this.megaFirPositions) {
            // TODO: Remove tree blocks (need to track which blocks belong to the tree)
            // For now, trees will remain until chunk is regenerated
            console.log(`🎄 Mega Fir at (${megaFir.x}, ${megaFir.z}) marked for removal`);
        }

        this.megaFirPositions = [];
    }

    /**
     * Update snow melt timers (3 in-game days after Christmas)
     * In-game day = 10 minutes real time
     */
    updateSnowMelt(deltaTime) {
        const DAY_LENGTH = 600; // 10 minutes in seconds

        // Check every in-game day
        if (this.gameTime - this.lastMeltCheck >= DAY_LENGTH) {
            this.lastMeltCheck = this.gameTime;

            console.log(`❄️ Checking snow melt... ${this.snowCircles.size} circles tracked`);

            for (const [key, circle] of this.snowCircles.entries()) {
                circle.meltTimer -= 1;

                if (circle.meltTimer <= 0) {
                    // Melt this snow circle
                    console.log(`❄️ Melting snow circle at ${key}...`);

                    for (const snowBlock of circle.blocks) {
                        const { x, y, z, originalType } = snowBlock;
                        const block = this.voxelWorld.getBlock(x, y, z);

                        // Only melt if it's still snow (player might have modified it)
                        if (block && block.type === 'snow') {
                            this.voxelWorld.removeBlock(x, y, z, false);
                            this.voxelWorld.addBlock(x, y, z, originalType, false);
                        }
                    }

                    this.snowCircles.delete(key);
                    console.log(`❄️ Snow circle melted. ${this.snowCircles.size} remaining.`);
                }
            }
        }
    }

    /**
     * Get random ToolBench item for gift loot
     */
    getRandomGiftLoot() {
        const toolBenchItems = [
            'crafted_combat_sword',
            'crafted_mining_pick',
            'crafted_stone_hammer',
            'crafted_magic_amulet',
            'crafted_compass',
            'crafted_compass_upgrade',
            'crafted_speed_boots',
            'crafted_grappling_hook',
            'crafted_machete'
        ];

        return toolBenchItems[Math.floor(Math.random() * toolBenchItems.length)];
    }
}
