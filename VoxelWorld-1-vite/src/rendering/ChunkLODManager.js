/**
 * ChunkLODManager.js - Level of Detail System for Extended Visual Horizon
 *
 * Renders distant chunks using simplified textured blocks beyond fog
 * Uses existing chunk cache data for zero-cost visual extension
 *
 * LOD Tiers:
 * - Tier 0 (renderDistance): Full detail, interactive chunks
 * - Tier 1 (visualDistance): Textured surface blocks from cache (this system)
 * - Tier 2 (future): Billboards/flat terrain
 *
 * Performance Strategy:
 * - 32x32 mini textures (64x smaller than full res)
 * - InstancedMesh for each block type (1 mesh = many blocks)
 * - Frustum culling (only render visible chunks)
 * - Occlusion culling (skip chunks behind other chunks)
 * - Surface-only rendering (no interior blocks)
 */

import * as THREE from 'three';
import { MiniTextureLoader } from './MiniTextureLoader.js';

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

        // Progressive loading
        this.loadQueue = []; // Queue of chunks to load progressively
        this.chunksPerFrame = 1; // Load 1 chunk per frame (reduced from 2 for performance)
        this.maxActiveLODChunks = 12; // Hard limit to prevent slowdown

        // Mini texture loader (environment-aware)
        this.miniTextureLoader = new MiniTextureLoader();
        this.preloadCommonTextures(); // Background load common block types

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

        // Get camera forward direction for directional filtering
        const cameraForward = new THREE.Vector3();
        this.camera.getWorldDirection(cameraForward);
        cameraForward.y = 0; // Flatten to horizontal plane
        cameraForward.normalize();

        // Track which LOD chunks should exist
        const shouldExist = new Set();

        // DEBUG: Log when player moves to new chunk
        const playerKey = `${playerChunkX},${playerChunkZ}`;
        if (!this.lastPlayerChunk || this.lastPlayerChunk !== playerKey) {
            console.log(`🎨 Player moved to chunk (${playerChunkX}, ${playerChunkZ}) - updating LOD`);
            this.lastPlayerChunk = playerKey;
        }

        // 🎯 PROGRESSIVE LOADING: Collect chunks to load, sort by distance, load gradually
        const chunksToLoad = [];

        // Collect LOD chunks in ring around player (beyond renderDistance)
        for (let cx = playerChunkX - visualDist; cx <= playerChunkX + visualDist; cx++) {
            for (let cz = playerChunkZ - visualDist; cz <= playerChunkZ + visualDist; cz++) {
                const dist = Math.max(Math.abs(cx - playerChunkX), Math.abs(cz - playerChunkZ));

                // Only LOD chunks beyond interactive render distance
                if (dist <= renderDist) continue;
                if (dist > visualDist) continue;

                // 🎯 DIRECTION-BASED FILTERING: Only load chunks in front of camera (180° arc)
                const chunkDir = new THREE.Vector3(
                    (cx - playerChunkX),
                    0,
                    (cz - playerChunkZ)
                ).normalize();

                const dot = chunkDir.dot(cameraForward);

                // Skip chunks behind camera (dot < -0.2 gives ~200° field of view)
                if (dot < -0.2) {
                    this.stats.culledChunks++;
                    continue;
                }

                const chunkKey = `${cx},${cz}`;
                shouldExist.add(chunkKey);

                // Skip if already loaded
                if (this.lodChunks.has(chunkKey)) continue;

                // 🚨 HARD LIMIT: Stop if we've hit max active chunks (performance!)
                if (this.lodChunks.size >= this.maxActiveLODChunks) {
                    continue; // Don't load more chunks
                }

                // Add to load queue with distance priority
                chunksToLoad.push({ cx, cz, dist });
            }
        }

        // Sort by distance (closest first) for progressive loading
        chunksToLoad.sort((a, b) => a.dist - b.dist);

        // Add sorted chunks to load queue (replace old queue)
        this.loadQueue = chunksToLoad;

        // Process a few chunks this frame (DON'T AWAIT - let it run in background!)
        this.processLoadQueue(); // Fire and forget - worker handles async
        
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
     * Process load queue progressively (load a few chunks per frame)
     */
    processLoadQueue() {
        const chunksToProcess = this.loadQueue.splice(0, this.chunksPerFrame);

        // Fire off requests without blocking (worker handles async)
        for (const { cx, cz } of chunksToProcess) {
            this.loadLODChunk(cx, cz); // Don't await - let worker handle it
        }
    }

    /**
     * Load a single LOD chunk (using worker for background generation)
     * NON-BLOCKING - worker callback handles completion
     */
    loadLODChunk(chunkX, chunkZ) {
        const chunkKey = `${chunkX},${chunkZ}`;

        // ⚠️ CRITICAL: Don't load if already loaded (prevents infinite re-render loop!)
        if (this.lodChunks.has(chunkKey)) {
            return;
        }

        // 🚀 Use worker-based generation (non-blocking!)
        if (this.app.workerManager && this.app.workerInitialized) {
            this.app.workerManager.requestLODChunk(chunkX, chunkZ, this.app.chunkSize, (lodData) => {
                // Worker returned LOD data with actual block colors
                const { colorBlocks } = lodData;

                // Double-check not already loaded (worker callback might be delayed)
                if (this.lodChunks.has(chunkKey)) {
                    return;
                }

                if (colorBlocks && colorBlocks.length > 0) {
                    // Create LOD mesh group from worker data (PASS colorBlocks!)
                    const lodMeshGroup = this.createLODMeshFromWorkerData(chunkX, chunkZ, colorBlocks);

                    if (lodMeshGroup) {
                        this.lodChunks.set(chunkKey, lodMeshGroup);
                        this.scene.add(lodMeshGroup);

                        // 🎨 FADE-IN ANIMATION: DISABLED (was causing issues)
                        // this.animateFadeIn(lodMeshGroup);

                        // console.log(`🎨 LOD chunk loaded at (${chunkX}, ${chunkZ}) with ${colorBlocks.length} blocks, meshes: ${lodMeshGroup.children.length}`);
                    }
                }
            });
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
                // console.log(`🎨 LOD chunk loaded at (${chunkX}, ${chunkZ}) with ${blocks.length} blocks`);
            }
        } catch (error) {
            console.error(`❌ Failed to load LOD chunk (${chunkX}, ${chunkZ}):`, error);
        }
    }
    
    // ❌ REMOVED: Duplicate function that was ignoring worker data
    // The real createLODMeshFromWorkerData is below (line ~276)
    
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
     * Now uses 32x32 mini textures instead of solid colors!
     */
    createLODMeshFromWorkerData(chunkX, chunkZ, colorBlocks) {
        if (!colorBlocks || colorBlocks.length === 0) return null;

        const group = new THREE.Group();
        group.userData = {
            type: 'lodChunk',
            chunkX: chunkX,
            chunkZ: chunkZ
        };

        // Group blocks by BLOCK TYPE (not color) for textured instancing
        const blockTypeGroups = new Map();

        for (const block of colorBlocks) {
            const blockType = block.blockType || 'grass'; // Fallback to grass

            if (!blockTypeGroups.has(blockType)) {
                blockTypeGroups.set(blockType, []);
            }

            // Worker data already has world coordinates
            blockTypeGroups.get(blockType).push({
                x: block.x,
                y: block.y,
                z: block.z
            });
        }

        // 🎯 USE OBJECT POOL for geometry (like regular blocks do!)
        const geometry = this.app.resourcePool.getGeometry('cube');

        for (const [blockType, positions] of blockTypeGroups.entries()) {
            // 🎨 Try to load mini texture (async, may return null if not loaded yet)
            const texture = this.miniTextureLoader.get(blockType);

            let material;
            if (texture) {
                // ✨ TEXTURED material (32x32 mini texture)
                material = new THREE.MeshLambertMaterial({
                    map: texture,
                    side: THREE.FrontSide
                });
            } else {
                // Fallback to color-only (texture not loaded yet)
                const color = colorBlocks.find(b => b.blockType === blockType)?.color || 0x808080;
                material = this.app.resourcePool.getLODMaterial(color);
            }

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
        
        // 🎯 USE OBJECT POOL for geometry and materials (eliminates allocation overhead!)
        const geometry = this.app.resourcePool.getGeometry('cube');

        for (const [color, positions] of colorGroups.entries()) {
            // 🎨 USE POOLED MATERIAL (eliminates material creation overhead!)
            const material = this.app.resourcePool.getLODMaterial(color);

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
     * Animate fade-in for LOD chunk (eliminates pop-in)
     * @param {THREE.Group} lodMeshGroup - LOD chunk group to animate
     */
    animateFadeIn(lodMeshGroup) {
        // Set all materials to transparent and start at opacity 0
        lodMeshGroup.traverse((obj) => {
            if (obj.material) {
                obj.material.transparent = true;
                obj.material.opacity = 0;
            }
        });

        // Fade in over 0.5 seconds
        const fadeInDuration = 500; // ms
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / fadeInDuration, 1);

            lodMeshGroup.traverse((obj) => {
                if (obj.material) {
                    obj.material.opacity = progress;
                }
            });

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Disable transparency after fade-in completes (performance optimization)
                lodMeshGroup.traverse((obj) => {
                    if (obj.material) {
                        obj.material.transparent = false;
                        obj.material.opacity = 1;
                    }
                });
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * Unload LOD chunk
     */
    unloadLODChunk(chunkKey) {
        const lodChunk = this.lodChunks.get(chunkKey);
        if (!lodChunk) return;

        // 🎯 DON'T DISPOSE ANYTHING - geometry and materials are from object pool!
        // The resourcePool manages their lifecycle, not individual chunks

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
        // Count actual meshes and blocks from loaded chunks
        let meshCount = 0;
        let blockCount = 0;

        for (const lodChunk of this.lodChunks.values()) {
            meshCount += lodChunk.children.length;
            for (const mesh of lodChunk.children) {
                if (mesh.isInstancedMesh) {
                    blockCount += mesh.count;
                }
            }
        }

        return {
            lodChunksActive: this.lodChunks.size,
            blocksRendered: blockCount,
            instancedMeshes: meshCount,
            culledChunks: this.stats.culledChunks,
            visualDistance: this.visualDistance,
            enabled: this.enabled
        };
    }

    /**
     * Preload common block type textures in background
     */
    async preloadCommonTextures() {
        const commonBlocks = [
            'grass', 'dirt', 'stone', 'sand', 'snow',
            'oak_wood', 'pine_wood', 'birch_wood',
            'bedrock', 'iron', 'gold'
        ];

        console.log('🔄 Preloading mini textures for common blocks...');
        await this.miniTextureLoader.preload(commonBlocks);
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
