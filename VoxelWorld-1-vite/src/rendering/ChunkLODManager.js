/**
 * ChunkLODManager.js - Level of Detail System for Extended Visual Horizon
 * 
 * Renders distant chunks using simplified colored blocks beyond fog
 * Uses existing chunk cache data for zero-cost visual extension
 * 
 * LOD Tiers:
 * - Tier 0 (renderDistance): Full detail, interactive chunks
 * - Tier 1 (visualDistance): Simple colored blocks from cache (this system)
 * - Tier 2 (future): Billboards/flat terrain
 * 
 * Performance Strategy:
 * - InstancedMesh for each color (1 mesh = many blocks)
 * - Frustum culling (only render visible chunks)
 * - Occlusion culling (skip chunks behind other chunks)
 * - Simple geometry (BoxGeometry without textures)
 */

import * as THREE from 'three';

export class ChunkLODManager {
    constructor(app) {
        this.app = app;
        this.scene = app.scene;
        this.camera = app.camera;
        
        // LOD Settings
        this.visualDistance = 2; // Chunks beyond renderDistance to show (reduced for fog compatibility)
        this.enabled = true;
        
        // Rendering
        this.lodChunks = new Map(); // Map<chunkKey, LODChunkMesh>
        this.instancedMeshes = new Map(); // Map<color, InstancedMesh>
        this.frustum = new THREE.Frustum();
        this.frustumMatrix = new THREE.Matrix4();
        
        // Stats
        this.stats = {
            lodChunksActive: 0,
            blocksRendered: 0,
            instancedMeshes: 0,
            culledChunks: 0
        };
        
        console.log('🎨 ChunkLODManager initialized - Visual Horizon System ready!');
    }
    
    /**
     * Update LOD chunks based on player position
     * Called from updateChunks() after regular chunks are loaded
     */
    async updateLODChunks(playerChunkX, playerChunkZ) {
        if (!this.enabled) return;
        
        const renderDist = this.app.renderDistance;
        const visualDist = renderDist + this.visualDistance;
        
        // Update frustum for culling
        this.frustumMatrix.multiplyMatrices(
            this.camera.projectionMatrix,
            this.camera.matrixWorldInverse
        );
        this.frustum.setFromProjectionMatrix(this.frustumMatrix);
        
        // Track which LOD chunks should exist
        const shouldExist = new Set();
        
        // DEBUG: Log when player moves to new chunk
        const playerKey = `${playerChunkX},${playerChunkZ}`;
        if (!this.lastPlayerChunk || this.lastPlayerChunk !== playerKey) {
            console.log(`🎨 Player moved to chunk (${playerChunkX}, ${playerChunkZ}) - updating LOD`);
            this.lastPlayerChunk = playerKey;
        }
        
        // Load LOD chunks in ring around player (beyond renderDistance)
        for (let cx = playerChunkX - visualDist; cx <= playerChunkX + visualDist; cx++) {
            for (let cz = playerChunkZ - visualDist; cz <= playerChunkZ + visualDist; cz++) {
                const dist = Math.max(Math.abs(cx - playerChunkX), Math.abs(cz - playerChunkZ));
                
                // Only LOD chunks beyond interactive render distance
                if (dist <= renderDist) continue;
                if (dist > visualDist) continue;
                
                const chunkKey = `${cx},${cz}`;
                shouldExist.add(chunkKey);
                
                // Skip if already loaded
                if (this.lodChunks.has(chunkKey)) continue;
                
                // Try to load from cache
                await this.loadLODChunk(cx, cz);
            }
        }
        
        // Unload distant LOD chunks
        for (const [chunkKey, lodChunk] of this.lodChunks.entries()) {
            if (!shouldExist.has(chunkKey)) {
                this.unloadLODChunk(chunkKey);
            }
        }
        
        // Update stats
        this.stats.lodChunksActive = this.lodChunks.size;
    }
    
    /**
     * Load a single LOD chunk (using worker for background generation)
     */
    async loadLODChunk(chunkX, chunkZ) {
        const chunkKey = `${chunkX},${chunkZ}`;
        
        // 🚀 Use worker-based generation (non-blocking!)
        if (this.app.workerManager && this.app.workerInitialized) {
            this.app.workerManager.requestLODChunk(chunkX, chunkZ, this.app.chunkSize, (lodData) => {
                // Worker returned LOD data
                const { colorBlocks } = lodData;
                
                if (colorBlocks && colorBlocks.length > 0) {
                    // Create LOD mesh group from worker data
                    const lodMeshGroup = this.createLODMeshFromWorkerData(chunkX, chunkZ, colorBlocks);
                    
                    if (lodMeshGroup) {
                        this.lodChunks.set(chunkKey, lodMeshGroup);
                        this.scene.add(lodMeshGroup);
                        // console.log(`🎨 LOD chunk loaded at (${chunkX}, ${chunkZ}) with ${colorBlocks.length} blocks`);
                    }
                }
            });
        } else {
            // Worker not ready - skip LOD for this chunk (will retry next frame)
            // console.log(`⏳ Worker not ready for LOD chunk (${chunkX}, ${chunkZ}), skipping...`);
        }
    }
    
    /**
     * Fallback: Load LOD chunk synchronously (original method)
     */
    async loadLODChunkSync(chunkX, chunkZ) {
        const chunkKey = `${chunkX},${chunkZ}`;
        
        try {
            // Try to load from ModificationTracker cache
            let blocks = null;
            
            if (this.app.modificationTracker) {
                const mods = await this.app.modificationTracker.loadModifications(chunkX, chunkZ);
                if (mods && mods.size > 0) {
                    blocks = Array.from(mods.values()).filter(b => b !== null);
                }
            }
            
            // If no cache, generate simple chunk data from biome
            if (!blocks || blocks.length === 0) {
                blocks = this.generateSimpleChunkData(chunkX, chunkZ);
            }
            
            // Create LOD mesh group
            const lodMeshGroup = this.createLODMeshGroup(chunkX, chunkZ, blocks);
            
            if (lodMeshGroup) {
                this.lodChunks.set(chunkKey, lodMeshGroup);
                this.scene.add(lodMeshGroup);
                console.log(`🎨 LOD chunk loaded at (${chunkX}, ${chunkZ}) with ${blocks.length} blocks`);
            }
        } catch (error) {
            console.error(`❌ Failed to load LOD chunk (${chunkX}, ${chunkZ}):`, error);
        }
    }
    
    /**
     * Create LOD mesh from worker data (world coordinates)
     */
    createLODMeshFromWorkerData(chunkX, chunkZ, colorBlocks) {
        const blocks = [];
        const chunkSize = this.app.chunkSize;
        
        for (let x = 0; x < chunkSize; x++) {
            for (let z = 0; z < chunkSize; z++) {
                const worldX = chunkX * chunkSize + x;
                const worldZ = chunkZ * chunkSize + z;
                
                // Get biome and surface height
                const biome = this.app.biomeWorldGen.getBiomeAt(worldX, worldZ, this.app.worldSeed);
                const terrainData = this.app.biomeWorldGen.generateMultiNoiseTerrain(worldX, worldZ, this.app.worldSeed);
                const height = Math.floor(terrainData.height);
                
                // Only store surface block with biome color
                blocks.push({
                    x: x,
                    y: height,
                    z: z,
                    type: biome.surfaceBlock,
                    color: this.getBlockColor(biome.surfaceBlock, height),
                    flags: 0
                });
            }
        }
        
        return blocks;
    }
    
    /**
     * Get block color from material or biome
     */
    getBlockColor(blockType, height) {
        // Try to get from existing materials
        if (this.app.materials && this.app.materials[blockType]) {
            const mat = this.app.materials[blockType];
            if (mat.color) return mat.color.getHex();
        }
        
        // Fallback to height-based color
        const heightFactor = (height + 5) / 20;
        const r = Math.floor(100 + heightFactor * 100);
        const g = Math.floor(100 + heightFactor * 100);
        const b = Math.floor(80 + heightFactor * 80);
        return (r << 16) | (g << 8) | b;
    }
    
    /**
     * Create LOD mesh from worker data (world coordinates)
     */
    createLODMeshFromWorkerData(chunkX, chunkZ, colorBlocks) {
        if (!colorBlocks || colorBlocks.length === 0) return null;
        
        const group = new THREE.Group();
        group.userData = {
            type: 'lodChunk',
            chunkX: chunkX,
            chunkZ: chunkZ
        };
        
        // Group blocks by color for instancing
        const colorGroups = new Map();
        
        for (const block of colorBlocks) {
            const color = block.color || 0x808080;
            
            if (!colorGroups.has(color)) {
                colorGroups.set(color, []);
            }
            
            // Worker data already has world coordinates
            colorGroups.get(color).push({
                x: block.x,
                y: block.y,
                z: block.z
            });
        }
        
        // 🎯 USE OBJECT POOL for geometry (like regular blocks do!)
        const geometry = this.app.resourcePool.getGeometry('cube');
        
        for (const [color, positions] of colorGroups.entries()) {
            // 🎨 FIX: Convert hex number to THREE.Color for Chrome/Edge compatibility
            // Firefox is forgiving, but Chrome needs explicit Color object
            const material = new THREE.MeshLambertMaterial({
                color: new THREE.Color(color),
                fog: true // Respect fog
            });
            
            const instancedMesh = new THREE.InstancedMesh(
                geometry,
                material,
                positions.length
            );
            
            // Set instance transforms
            const matrix = new THREE.Matrix4();
            for (let i = 0; i < positions.length; i++) {
                const pos = positions[i];
                matrix.setPosition(pos.x, pos.y, pos.z);
                instancedMesh.setMatrixAt(i, matrix);
            }
            
            instancedMesh.instanceMatrix.needsUpdate = true;
            group.add(instancedMesh);
        }
        
        return group;
    }
    
    /**
     * Create LOD mesh group for chunk (simple colored cubes)
     */
    createLODMeshGroup(chunkX, chunkZ, blocks) {
        if (!blocks || blocks.length === 0) return null;
        
        const chunkSize = this.app.chunkSize;
        const group = new THREE.Group();
        group.userData = {
            type: 'lodChunk',
            chunkX: chunkX,
            chunkZ: chunkZ
        };
        
        // Group blocks by color for instancing
        const colorGroups = new Map();
        
        for (const block of blocks) {
            const color = block.color || 0x808080;
            
            if (!colorGroups.has(color)) {
                colorGroups.set(color, []);
            }
            
            colorGroups.get(color).push({
                x: chunkX * chunkSize + block.x,
                y: block.y,
                z: chunkZ * chunkSize + block.z
            });
        }
        
        // Create instanced mesh for each color
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        
        for (const [color, positions] of colorGroups.entries()) {
            const material = new THREE.MeshLambertMaterial({
                color: color,
                fog: true // Respect fog
            });
            
            const instancedMesh = new THREE.InstancedMesh(
                geometry,
                material,
                positions.length
            );
            
            // Set instance transforms
            const matrix = new THREE.Matrix4();
            for (let i = 0; i < positions.length; i++) {
                const pos = positions[i];
                matrix.setPosition(pos.x, pos.y, pos.z);
                instancedMesh.setMatrixAt(i, matrix);
            }
            
            instancedMesh.instanceMatrix.needsUpdate = true;
            group.add(instancedMesh);
        }
        
        return group;
    }
    
    /**
     * Unload LOD chunk
     */
    unloadLODChunk(chunkKey) {
        const lodChunk = this.lodChunks.get(chunkKey);
        if (!lodChunk) return;
        
        // Dispose materials (but NOT geometry - it's from object pool!)
        lodChunk.traverse((obj) => {
            // DON'T dispose geometry - it's from resourcePool!
            // if (obj.geometry) obj.geometry.dispose(); // ❌ REMOVED
            
            // Only dispose materials
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
        
        this.scene.remove(lodChunk);
        this.lodChunks.delete(chunkKey);
    }
    
    /**
     * Toggle LOD system on/off
     */
    toggle() {
        this.enabled = !this.enabled;
        
        if (!this.enabled) {
            // Clear all LOD chunks
            for (const chunkKey of this.lodChunks.keys()) {
                this.unloadLODChunk(chunkKey);
            }
        }
        
        console.log(`🎨 LOD System ${this.enabled ? 'ENABLED' : 'DISABLED'}`);
        return this.enabled;
    }
    
    /**
     * Set visual distance
     */
    setVisualDistance(distance) {
        this.visualDistance = Math.max(1, Math.floor(distance));
        console.log(`🎨 LOD Visual Distance set to ${this.visualDistance} chunks`);
    }
    
    /**
     * Get stats for debug UI
     */
    getStats() {
        return {
            ...this.stats,
            visualDistance: this.visualDistance,
            enabled: this.enabled
        };
    }
    
    /**
     * Cleanup
     */
    dispose() {
        for (const chunkKey of this.lodChunks.keys()) {
            this.unloadLODChunk(chunkKey);
        }
        this.lodChunks.clear();
        this.instancedMeshes.clear();
    }
}
