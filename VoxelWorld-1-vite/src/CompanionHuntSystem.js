/**
 * CompanionHuntSystem.js
 * 
 * Revolutionary companion hunting/gathering system where companions:
 * - Travel 2 chunks per in-game minute
 * - Search for rare ingredients (fish, egg, honey, apple)
 * - Mark discoveries on minimap AND journal map (purple dots)
 * - Drop billboard items at discovery locations
 * - Turn around at halfway point to return to player
 * - Show as cyan dot on maps during expedition
 */

export class CompanionHuntSystem {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;
        
        // Expedition state
        this.isActive = false;
        this.companion = null;  // Which companion is hunting
        this.startTime = 0;
        this.duration = 0;  // Total duration in in-game minutes
        this.currentPosition = { x: 0, y: 0, z: 0 };
        this.startPosition = { x: 0, y: 0, z: 0 };
        this.discoveries = [];  // Array of {position, item, biome, timestamp}
        this.pathTrail = [];  // For visual trail on map
        
        // Movement parameters
        this.chunksPerMinute = 2;  // 2 chunks per in-game minute
        this.blocksPerChunk = 16;
        this.lastMoveTime = 0;
        this.lastCheckTime = 0;
        this.isReturning = false;
        this.explorationDirection = { x: 0, z: 0 };  // Direction companion is traveling
        
        // Loot tables by biome
        this.lootTables = this.defineLootTables();
        
        // Mini hunt indicator UI (below stamina bar)
        this.miniIndicator = null;
        this.miniPortrait = null;
        this.miniTimer = null;
        
        console.log('🐕 CompanionHuntSystem initialized');
    }

    /**
     * Define what items can be found in each biome
     */
    defineLootTables() {
        return {
            // 🌊 WATER BIOMES (Ocean, River)
            ocean: {
                fish: 0.7,      // 70% chance
                egg: 0.2,       // 20% chance (seabird nests)
                apple: 0.05,    // 5% chance
                honey: 0.05     // 5% chance
            },
            
            // 🌲 FOREST BIOMES
            forest: {
                apple: 0.5,     // 50% chance (apple trees)
                honey: 0.3,     // 30% chance (beehives)
                egg: 0.15,      // 15% chance (bird nests)
                fish: 0.05      // 5% chance (streams)
            },
            
            // 🌾 PLAINS BIOMES
            plains: {
                honey: 0.4,     // 40% chance (flower fields)
                apple: 0.3,     // 30% chance (scattered trees)
                egg: 0.2,       // 20% chance (ground nests)
                fish: 0.1       // 10% chance (ponds)
            },
            
            // 🏔️ MOUNTAIN BIOMES
            mountains: {
                egg: 0.5,       // 50% chance (cliff nests)
                fish: 0.25,     // 25% chance (mountain streams)
                honey: 0.15,    // 15% chance (rare)
                apple: 0.1      // 10% chance (hardy trees)
            },
            
            // 🏜️ DESERT BIOMES
            desert: {
                egg: 0.4,       // 40% chance (desert birds)
                honey: 0.3,     // 30% chance (desert flowers)
                apple: 0.2,     // 20% chance (oasis)
                fish: 0.1       // 10% chance (rare oasis)
            },
            
            // ❄️ TUNDRA BIOMES
            tundra: {
                fish: 0.5,      // 50% chance (ice fishing)
                egg: 0.3,       // 30% chance (arctic birds)
                honey: 0.1,     // 10% chance (rare)
                apple: 0.1      // 10% chance (hardy berries instead)
            },
            
            // 🌿 JUNGLE BIOMES
            jungle: {
                apple: 0.4,     // 40% chance (tropical fruit)
                honey: 0.35,    // 35% chance (many bees)
                egg: 0.2,       // 20% chance (exotic birds)
                fish: 0.05      // 5% chance (rivers)
            }
        };
    }

    /**
     * Start a companion hunt expedition
     * @param {Object} companion - The companion object
     * @param {number} durationDays - Duration in game-days (0.5, 1, or 2)
     */
    startHunt(companion, durationDays) {
        if (this.isActive) {
            this.voxelWorld.updateStatus('⚠️ A companion is already on an expedition!', 'warning');
            return false;
        }

        // Store expedition data
        this.companion = companion;
        this.duration = durationDays * 20 * 60;  // Convert days to in-game seconds (1 day = 20 real minutes = 1200 in-game seconds)
        this.startTime = this.voxelWorld.gameTime || 0;
        this.startPosition = {
            x: this.voxelWorld.camera.position.x,
            y: this.voxelWorld.camera.position.y,
            z: this.voxelWorld.camera.position.z
        };
        this.currentPosition = { ...this.startPosition };
        this.discoveries = [];
        this.pathTrail = [{ ...this.startPosition }];
        this.isActive = true;
        this.isReturning = false;
        this.lastMoveTime = this.startTime;
        this.lastCheckTime = this.startTime;

        // Calculate random exploration direction (normalized)
        const randomAngle = Math.random() * Math.PI * 2;
        this.explorationDirection = {
            x: Math.cos(randomAngle),
            z: Math.sin(randomAngle)
        };

        // Visual feedback
        this.voxelWorld.updateStatus(
            `🐕 ${companion.name || 'Companion'} is setting out to hunt for ${durationDays} day${durationDays > 1 ? 's' : ''}!`,
            'discovery'
        );

        // Update companion portrait (if exists) - handled in CompanionPortrait.startHunt()
        // (No need to modify portrait here, it's done in the UI layer)

        console.log(`🐕 Hunt started at gameTime=${this.startTime}:`);
        console.log(`   Duration: ${durationDays} days = ${this.duration} seconds`);
        console.log(`   Will turn around at: ${this.duration / 2} seconds`);
        console.log(`   Start position: (${Math.floor(this.startPosition.x)}, ${Math.floor(this.startPosition.z)})`);
        console.log(`   Exploration direction: (${this.explorationDirection.x}, ${this.explorationDirection.z})`);
        
        // Create mini hunt indicator below stamina bar
        this.createMiniHuntIndicator();
        
        return true;
    }

    /**
     * Create mini hunt indicator below stamina bar
     */
    createMiniHuntIndicator() {
        if (this.miniIndicator) {
            this.miniIndicator.style.display = 'flex';
            return;
        }

        // Create container matching hotbar style
        this.miniIndicator = document.createElement('div');
        this.miniIndicator.id = 'mini-hunt-indicator';
        this.miniIndicator.style.cssText = `
            position: fixed;
            top: 82px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(245, 230, 211, 0.9);
            border: 3px solid #8B4513;
            border-radius: 12px;
            padding: 8px 12px;
            z-index: 1000;
            pointer-events: none;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5), inset 0 2px 5px rgba(255, 255, 255, 0.3);
            font-family: Georgia, serif;
        `;

        // Create mini portrait - clone from main portrait image
        const mainPortraitImg = document.getElementById('companion-portrait-img');
        if (mainPortraitImg) {
            this.miniPortrait = document.createElement('img');
            this.miniPortrait.src = mainPortraitImg.src;
            this.miniPortrait.style.cssText = `
                width: 32px;
                height: 32px;
                border-radius: 6px;
                border: 2px solid #8B4513;
                object-fit: cover;
                background: #2C1810;
                box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
            `;
        } else {
            // Fallback to div if image not found
            this.miniPortrait = document.createElement('div');
            this.miniPortrait.style.cssText = `
                width: 32px;
                height: 32px;
                background: #2C1810;
                border-radius: 6px;
                border: 2px solid #8B4513;
                box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
            `;
        }

        // Create timer text matching hotbar font style
        this.miniTimer = document.createElement('div');
        this.miniTimer.style.cssText = `
            color: #4A2511;
            font-family: Georgia, serif;
            font-size: 14px;
            font-weight: bold;
            white-space: nowrap;
            text-shadow: 1px 1px 1px rgba(255, 255, 255, 0.5);
        `;
        this.miniTimer.textContent = 'Starting...';

        this.miniIndicator.appendChild(this.miniPortrait);
        this.miniIndicator.appendChild(this.miniTimer);
        document.body.appendChild(this.miniIndicator);

        console.log('✨ Created mini hunt indicator with hotbar styling');

        console.log('🎯 Mini hunt indicator created');
    }

    /**
     * Hide/remove mini hunt indicator
     */
    hideMiniHuntIndicator() {
        if (this.miniIndicator) {
            this.miniIndicator.style.display = 'none';
        }
    }

    /**
     * Update companion position and check for discoveries
     * Called every frame in game loop
     */
    update(currentTime) {
        if (!this.isActive) return;

        const elapsedTime = currentTime - this.startTime;
        const halfwayPoint = this.duration / 2;

        // Check if expedition is complete
        if (elapsedTime >= this.duration) {
            console.log('⏰ Hunt duration reached, ending hunt');
            this.endHunt();
            return;
        }

        // Update portrait tooltip with remaining time
        this.updatePortraitTimer(currentTime);

        // Check if companion should turn around
        if (!this.isReturning && elapsedTime >= halfwayPoint) {
            this.isReturning = true;
            this.voxelWorld.updateStatus(
                `🔄 ${this.companion.name || 'Companion'} is heading back!`,
                'info'
            );
            console.log(`🔄 Companion turning around at halfway point (${Math.floor(elapsedTime)}s / ${this.duration}s)`);
        }

        // Move companion (every in-game minute = 60 in-game seconds)
        const minutesPassed = Math.floor(elapsedTime / 60);
        const lastMinutesPassed = Math.floor((this.lastMoveTime - this.startTime) / 60);
        
        if (minutesPassed > lastMinutesPassed) {
            console.log(`⏱️ Game minute ${minutesPassed} - Moving companion (elapsed: ${Math.floor(elapsedTime)}s, returning: ${this.isReturning})`);
            this.moveCompanion();
            this.lastMoveTime = currentTime;
            
            // Check for discoveries (only when moving outward, not returning)
            if (!this.isReturning) {
                this.checkForDiscovery();
            }
        }
    }

    /**
     * Move companion 2 chunks in a direction
     */
    moveCompanion() {
        const chunkSize = 16;
        const moveDistance = 2 * chunkSize; // Move 2 chunks

        if (this.isReturning) {
            // Move back toward start position
            const dx = this.startPosition.x - this.currentPosition.x;
            const dz = this.startPosition.z - this.currentPosition.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            console.log(`🔙 Returning: distance to start = ${Math.floor(distance)} blocks`);
            
            if (distance <= moveDistance) {
                // Close enough to start, snap to start position
                this.currentPosition = { ...this.startPosition };
                console.log(`🏠 Companion reached start position (${Math.floor(this.currentPosition.x)}, ${Math.floor(this.currentPosition.z)})`);
            } else {
                // Move toward start
                const normalizedX = dx / distance;
                const normalizedZ = dz / distance;
                this.currentPosition.x += normalizedX * moveDistance;
                this.currentPosition.z += normalizedZ * moveDistance;
                console.log(`🔙 Companion moving toward start: (${Math.floor(this.currentPosition.x)}, ${Math.floor(this.currentPosition.z)})`);
            }
        } else {
            // Move in exploration direction
            this.currentPosition.x += this.explorationDirection.x * moveDistance;
            this.currentPosition.z += this.explorationDirection.z * moveDistance;
            console.log(`🚶 Companion exploring: moved to (${Math.floor(this.currentPosition.x)}, ${Math.floor(this.currentPosition.z)}) - direction: (${this.explorationDirection.x}, ${this.explorationDirection.z})`);
        }

        // Update path trail
        this.pathTrail.push({ ...this.currentPosition });
        
        // Limit trail length
        if (this.pathTrail.length > 100) {
            this.pathTrail.shift();
        }

        console.log(`🐕 Companion at (${Math.floor(this.currentPosition.x)}, ${Math.floor(this.currentPosition.z)}) - Trail length: ${this.pathTrail.length}`);
    }    /**
     * Check if companion found something at current location
     */
    checkForDiscovery() {
        const biome = this.getBiomeAtPosition(this.currentPosition);
        const lootTable = this.lootTables[biome] || this.lootTables.plains;

        // Roll for discovery
        const roll = Math.random();
        let cumulativeChance = 0;
        let foundItem = null;

        for (const [item, chance] of Object.entries(lootTable)) {
            cumulativeChance += chance;
            if (roll < cumulativeChance) {
                foundItem = item;
                break;
            }
        }

        if (foundItem) {
            // Discovery made!
            const discovery = {
                position: { ...this.currentPosition },
                item: foundItem,
                biome: biome,
                timestamp: this.voxelWorld.gameTime || 0,
                id: `discovery_${Date.now()}_${Math.random()}`
            };

            this.discoveries.push(discovery);

            // Spawn billboard item in world
            this.spawnBillboardItem(discovery);

            // Add purple marker to minimap and journal
            this.addDiscoveryMarker(discovery);

            // Notify player
            const itemEmoji = this.getItemEmoji(foundItem);
            this.voxelWorld.updateStatus(
                `🎯 ${this.companion.name || 'Companion'} found ${itemEmoji} ${foundItem} in ${biome}!`,
                'discovery'
            );

            console.log(`🎯 Discovery: ${foundItem} at (${Math.floor(discovery.position.x)}, ${Math.floor(discovery.position.z)})`);
        }
    }

    /**
     * Get biome at a position
     */
    getBiomeAtPosition(position) {
        // Use VoxelWorld's biome detection
        if (this.voxelWorld.getBiomeAt) {
            return this.voxelWorld.getBiomeAt(position.x, position.z);
        }

        // Fallback: simple biome detection based on position
        const chunkX = Math.floor(position.x / 16);
        const chunkZ = Math.floor(position.z / 16);
        
        // Simple noise-based biome (placeholder - use real biome system)
        const noise = (Math.sin(chunkX * 0.1) + Math.cos(chunkZ * 0.1)) / 2;
        
        if (noise > 0.5) return 'mountains';
        if (noise > 0.2) return 'forest';
        if (noise > -0.2) return 'plains';
        if (noise > -0.5) return 'desert';
        return 'ocean';
    }

    /**
     * Spawn a billboard item at discovery location
     */
    spawnBillboardItem(discovery) {
        const { position, item } = discovery;

        // Get terrain height at position
        const terrainY = this.voxelWorld.getTerrainHeight?.(position.x, position.z) || position.y;

        // Get emoji from BILLBOARD_ITEMS or fallback
        const emoji = this.voxelWorld.BILLBOARD_ITEMS?.[item]?.emoji || this.getItemEmoji(item);

        // Spawn billboard item using createWorldItem (same as world item spawning)
        this.voxelWorld.createWorldItem(
            Math.floor(position.x),
            terrainY + 1,
            Math.floor(position.z),
            item,
            emoji
        );

        // Store discovery ID for tracking
        const key = `${Math.floor(position.x)},${terrainY + 1},${Math.floor(position.z)}`;
        const worldItem = this.voxelWorld.worldItemPositions.find(wi => 
            wi.x === Math.floor(position.x) && 
            wi.y === terrainY + 1 && 
            wi.z === Math.floor(position.z)
        );
        
        if (worldItem) {
            worldItem.discoveryId = discovery.id;
            worldItem.isCompanionDiscovery = true;
            console.log(`📍 Spawned companion discovery: ${emoji} ${item} at (${Math.floor(position.x)}, ${terrainY + 1}, ${Math.floor(position.z)})`);
        }
    }

    /**
     * Add purple discovery marker to maps
     */
    addDiscoveryMarker(discovery) {
        const { position, item } = discovery;

        // Add to minimap (purple dot)
        if (this.voxelWorld.minimap) {
            this.voxelWorld.minimap.addMarker({
                x: position.x,
                z: position.z,
                color: '#a855f7',  // Purple
                label: `${this.getItemEmoji(item)} ${item}`,
                type: 'companion_discovery',
                id: discovery.id
            });
        }

        // Add to journal map (purple dot)
        if (this.voxelWorld.journal) {
            this.voxelWorld.journal.addPOI({
                x: position.x,
                z: position.z,
                name: `${this.getItemEmoji(item)} ${item}`,
                type: 'companion_discovery',
                color: '#a855f7',  // Purple
                id: discovery.id
            });
        }

        console.log(`🟣 Purple marker added for ${item}`);
    }

    /**
     * Handle item collection - remove markers and billboard
     */
    onItemCollected(discoveryId) {
        // Remove from discoveries list
        this.discoveries = this.discoveries.filter(d => d.id !== discoveryId);

        // Remove minimap marker
        if (this.voxelWorld.minimap) {
            this.voxelWorld.minimap.removeMarker(discoveryId);
        }

        // Remove journal POI
        if (this.voxelWorld.journal) {
            this.voxelWorld.journal.removePOI(discoveryId);
        }

        console.log(`🗑️ Removed markers for discovery: ${discoveryId}`);
    }

    /**
     * End the hunt expedition
     */
    endHunt() {
        this.isActive = false;

        const itemCount = this.discoveries.length;
        const itemList = this.discoveries
            .map(d => this.getItemEmoji(d.item))
            .join(' ');

        // Give items to player's inventory
        if (itemCount > 0) {
            console.log(`🎁 Giving ${itemCount} items to player:`, this.discoveries.map(d => d.item));
            this.discoveries.forEach(discovery => {
                const success = this.voxelWorld.addItemToInventory(discovery.item, 1);
                if (success) {
                    console.log(`✅ Added ${discovery.item} to inventory`);
                } else {
                    console.warn(`❌ Failed to add ${discovery.item} to inventory`);
                }
            });
        }

        // Update companion portrait (remove hunting indicator)
        if (this.voxelWorld.companionPortrait?.portraitElement) {
            this.voxelWorld.companionPortrait.portraitElement.style.border = '4px solid #4A3728'; // Original border
            this.voxelWorld.companionPortrait.portraitElement.style.opacity = '1'; // Restore full opacity
            this.voxelWorld.companionPortrait.portraitElement.title = `${this.companion.name} - Click to interact`;
        }

        // Hide mini hunt indicator
        this.hideMiniHuntIndicator();

        // Notify player
        if (itemCount > 0) {
            this.voxelWorld.updateStatus(
                `🎉 ${this.companion.name || 'Companion'} returned! Found: ${itemList} - Added to inventory!`,
                'discovery'
            );
        } else {
            this.voxelWorld.updateStatus(
                `😔 ${this.companion.name || 'Companion'} returned empty-handed. Try a longer expedition!`,
                'warning'
            );
        }

        console.log(`🏁 Hunt ended: ${itemCount} discoveries made`);
    }

    /**
     * Get emoji for item type
     */
    getItemEmoji(item) {
        const emojis = {
            fish: '🐟',
            egg: '🥚',
            honey: '🍯',
            apple: '🍎'
        };
        return emojis[item] || '❓';
    }

    /**
     * Get companion position for minimap rendering
     */
    getCompanionMapPosition() {
        if (!this.isActive) {
            return null;
        }
        
        const position = {
            x: this.currentPosition.x,
            z: this.currentPosition.z,
            color: '#06b6d4',  // Cyan
            label: this.companion.name || 'Companion',
            isReturning: this.isReturning
        };
        
        // Debug log every 5 seconds to avoid spam
        const now = Date.now();
        if (!this.lastMinimapLog || now - this.lastMinimapLog > 5000) {
            console.log(`🗺️ Minimap companion position: (${Math.floor(position.x)}, ${Math.floor(position.z)}) returning=${position.isReturning}`);
            this.lastMinimapLog = now;
        }
        
        return position;
    }

    /**
     * Update portrait tooltip with remaining time
     */
    updatePortraitTimer(currentTime) {
        if (!this.voxelWorld.companionPortrait?.portraitElement) return;

        const remainingTime = this.duration - (currentTime - this.startTime);
        const timeString = this.formatHuntTime(remainingTime);
        const itemsFound = this.discoveries.length;
        
        const status = this.isReturning ? 'returning' : 'exploring';
        this.voxelWorld.companionPortrait.portraitElement.title = 
            `${this.companion.name} (${status}) - ${timeString}\nItems found: ${itemsFound}`;

        // Update mini hunt indicator timer
        if (this.miniTimer) {
            this.miniTimer.textContent = `${timeString} (${itemsFound} items)`;
        }
    }

    /**
     * Format hunt time in game-time units
     */
    formatHuntTime(seconds) {
        if (seconds <= 0) return 'Arriving soon...';
        
        const gameDays = Math.floor(seconds / 1200); // 1 game day = 20 minutes = 1200 seconds
        const gameMinutes = Math.floor((seconds % 1200) / 60); // 1 game minute = 60 seconds
        
        if (gameDays > 0) {
            return `${gameDays}d ${gameMinutes}m remaining`;
        } else if (gameMinutes > 0) {
            return `${gameMinutes}m remaining`;
        } else {
            return `${Math.floor(seconds)}s remaining`;
        }
    }

    /**
     * Get path trail for map visualization
     */
    getPathTrail() {
        if (!this.isActive) return [];
        return this.pathTrail;
    }

    /**
     * Cancel active hunt
     */
    cancelHunt() {
        if (!this.isActive) {
            console.log('⚠️ Cannot recall: no active hunt');
            return;
        }

        const itemsFound = this.discoveries.length;
        const currentTime = this.voxelWorld.gameTime || 0;
        const elapsedTime = currentTime - this.startTime;

        console.log(`📢 Companion recalled!`);
        console.log(`   Elapsed time: ${Math.floor(elapsedTime)}s`);
        console.log(`   Items found: ${itemsFound}`);
        console.log(`   Current position: (${Math.floor(this.currentPosition.x)}, ${Math.floor(this.currentPosition.z)})`);

        this.voxelWorld.updateStatus(
            `📢 ${this.companion.name || 'Companion'} recalled! They're heading back.`,
            'info'
        );

        // Force companion to return
        this.isReturning = true;
        this.duration = (this.voxelWorld.gameTime - this.startTime) + 60;  // Return in 1 minute
        
        console.log(`   New duration set to: ${this.duration}s (will arrive in ~60s)`);
    }

    /**
     * Check if companion is currently hunting (for combat system)
     * @returns {boolean} true if companion is away hunting, false if with player
     */
    get isCompanionHunting() {
        return this.isActive;
    }
}
