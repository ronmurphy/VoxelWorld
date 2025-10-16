/**
 * ChunkMeshManager.js
 *
 * Manages greedy-meshed chunk rendering for VoxelWorld
 * Replaces individual block meshes with optimized merged meshes per chunk
 *
 * Performance Impact:
 * - Before: 512 blocks = 512 meshes = 512 draw calls
 * - After: 512 blocks = 1 mesh = 1 draw call per chunk
 * - 99%+ reduction in draw calls!
 */

import * as THREE from 'three';
import { GreedyMesher } from '../meshing/GreedyMesher.js';
import { RuntimeAtlasGenerator } from '../meshing/RuntimeAtlasGenerator.js';

export class ChunkMeshManager {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;
        this.chunkSize = voxelWorld.chunkSize || 8;

        // Map of chunk meshes: Map<"chunkX,chunkZ", {mesh, blocks}>
        this.chunkMeshes = new Map();

        // Pending chunk updates (batch regeneration)
        this.pendingChunkUpdates = new Set();
        this.updateTimer = null;

        // Atlas texture and material
        this.atlasTexture = null;
        this.atlasMaterial = null;
        this.atlasReady = false; // Flag to prevent mesh generation before atlas loads

        // Performance stats
        this.stats = {
            totalChunks: 0,
            totalBlocks: 0,
            totalDrawCalls: 0,
            meshGenerationTime: 0
        };

        console.log('🧊 ChunkMeshManager initialized (greedy meshing enabled)');

        // Load atlas texture and key (async, sets atlasReady when done)
        this.loadAtlas();
    }

    /**
     * Load atlas texture and key file
     * Now uses runtime atlas generation to avoid Electron file:// issues
     */
    async loadAtlas() {
        console.log('🎨 loadAtlas() called - starting...');
        try {
            console.log('🎨 Starting runtime atlas generation...');

            // Create runtime atlas generator
            const generator = new RuntimeAtlasGenerator();
            console.log('🎨 RuntimeAtlasGenerator created');

            // Get list of texture files
            console.log('🎨 Getting texture file list...');
            const textureFiles = await generator.getTextureFileList();
            console.log(`🎨 Found ${textureFiles.length} texture files to load`);

            // Generate atlas from individual textures
            const { texture, key } = await generator.generateAtlas(textureFiles);

            // Store atlas texture and load key into GreedyMesher
            this.atlasTexture = texture;
            GreedyMesher.loadAtlasKey({ textures: key }); // Wrap key in {textures: ...} format

            console.log('✅ Runtime atlas generated:', {
                width: this.atlasTexture.image.width,
                height: this.atlasTexture.image.height,
                textures: Object.keys(key).length
            });

            // Create shared material for all chunks
            this.atlasMaterial = new THREE.MeshLambertMaterial({
                map: this.atlasTexture,
                vertexColors: false, // Use texture, not vertex colors
                side: THREE.FrontSide,
                transparent: false,  // No transparency
                opacity: 1.0,       // Fully opaque
                alphaTest: 0.5      // Discard pixels below 50% alpha
            });

            // Force material to update
            this.atlasMaterial.needsUpdate = true;

            console.log('🎨 Atlas material created:', {
                hasMap: !!this.atlasMaterial.map,
                transparent: this.atlasMaterial.transparent,
                opacity: this.atlasMaterial.opacity,
                side: this.atlasMaterial.side,
                mapImage: this.atlasMaterial.map?.image ? `${this.atlasMaterial.map.image.width}x${this.atlasMaterial.map.image.height}` : 'NO IMAGE'
            });

            // Mark atlas as ready
            this.atlasReady = true;
            console.log('✅ Atlas texture and key loaded successfully - ready for meshing!');

            // Regenerate any pending chunks now that atlas is ready
            if (this.pendingChunkUpdates.size > 0) {
                console.log(`🔄 Regenerating ${this.pendingChunkUpdates.size} chunks with atlas textures...`);
                this.processChunkUpdates();
            }

        } catch (error) {
            console.error('❌ Failed to load atlas:', error);
            console.warn('⚠️  Falling back to vertex colors for chunk rendering');
            this.atlasReady = true; // Allow rendering with fallback
        }
    }

    /**
     * Get chunk coordinates from world position
     */
    getChunkCoords(x, z) {
        return {
            chunkX: Math.floor(x / this.chunkSize),
            chunkZ: Math.floor(z / this.chunkSize)
        };
    }

    /**
     * Get chunk key from coordinates
     */
    getChunkKey(chunkX, chunkZ) {
        return `${chunkX},${chunkZ}`;
    }

    /**
     * Add a block to the chunk mesh system
     * @param {number} x - World X position
     * @param {number} y - World Y position
     * @param {number} z - World Z position
     * @param {string} type - Block type
     * @param {number} color - Block color (hex)
     */
    addBlock(x, y, z, type, color) {
        const { chunkX, chunkZ } = this.getChunkCoords(x, z);
        const chunkKey = this.getChunkKey(chunkX, chunkZ);

        // Get or create chunk data
        let chunkData = this.chunkMeshes.get(chunkKey);
        if (!chunkData) {
            chunkData = {
                mesh: null,
                blocks: []
            };
            this.chunkMeshes.set(chunkKey, chunkData);
            this.stats.totalChunks++;
        }

        // Add block to chunk
        chunkData.blocks.push({ x, y, z, blockType: type, color });
        this.stats.totalBlocks++;

        // Mark chunk for regeneration
        this.markChunkForUpdate(chunkX, chunkZ);
    }

    /**
     * Remove a block from the chunk mesh system
     */
    removeBlock(x, y, z) {
        const { chunkX, chunkZ } = this.getChunkCoords(x, z);
        const chunkKey = this.getChunkKey(chunkX, chunkZ);

        const chunkData = this.chunkMeshes.get(chunkKey);
        if (!chunkData) return;

        // Remove block from chunk data
        chunkData.blocks = chunkData.blocks.filter(
            block => !(block.x === x && block.y === y && block.z === z)
        );
        this.stats.totalBlocks--;

        // Mark chunk for regeneration
        this.markChunkForUpdate(chunkX, chunkZ);
    }

    /**
     * Mark chunk for mesh regeneration (batched)
     */
    markChunkForUpdate(chunkX, chunkZ) {
        const chunkKey = this.getChunkKey(chunkX, chunkZ);
        this.pendingChunkUpdates.add(chunkKey);

        // Don't process updates until atlas is loaded
        if (!this.atlasReady) {
            // commented out due to console spam - brad
            // console.log(`⏳ Chunk ${chunkKey} queued - waiting for atlas to load...`);
            return;
        }

        // Batch updates to avoid regenerating same chunk multiple times
        if (this.updateTimer) {
            clearTimeout(this.updateTimer);
        }

        this.updateTimer = setTimeout(() => {
            this.processChunkUpdates();
        }, 50); // 50ms debounce
    }

    /**
     * Process all pending chunk updates
     */
    processChunkUpdates() {
        for (const chunkKey of this.pendingChunkUpdates) {
            this.regenerateChunkMesh(chunkKey);
        }
        this.pendingChunkUpdates.clear();
    }

    /**
     * Regenerate mesh for a chunk
     */
    regenerateChunkMesh(chunkKey) {
        const chunkData = this.chunkMeshes.get(chunkKey);
        if (!chunkData) return;

        const startTime = performance.now();

        // Remove old mesh if exists
        if (chunkData.mesh) {
            this.voxelWorld.scene.remove(chunkData.mesh);
            if (chunkData.mesh.geometry) {
                chunkData.mesh.geometry.dispose();
            }
            if (chunkData.mesh.material) {
                chunkData.mesh.material.dispose();
            }
        }

        // If no blocks, remove chunk data
        if (chunkData.blocks.length === 0) {
            this.chunkMeshes.delete(chunkKey);
            this.stats.totalChunks--;
            return;
        }

        // Generate greedy mesh
        const meshData = GreedyMesher.generateMesh(chunkData.blocks, this.chunkSize * 4);

        // Create Three.js mesh
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(meshData.positions, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(meshData.normals, 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(meshData.uvs, 2));

        // Keep colors for potential tinting (even though we're using textures now)
        geometry.setAttribute('color', new THREE.BufferAttribute(meshData.colors, 3));

        // Compute bounds for frustum culling
        geometry.computeBoundingSphere();
        geometry.computeBoundingBox();

        // Use atlas material if loaded, fallback to vertex colors
        const material = this.atlasMaterial || new THREE.MeshLambertMaterial({
            vertexColors: true,
            side: THREE.FrontSide
        });

        // Debug: Check if atlas material is being used (only log first chunk)
        if (!this.atlasMaterial) {
            console.warn('⚠️ Atlas material not available, using vertex colors fallback');
        } else if (chunkKey === '0,0' || chunkKey === '1,1') {
            // Only log for first few chunks to avoid spam
            console.log(`✅ Chunk ${chunkKey} using atlas material:`, {
                hasTexture: !!this.atlasMaterial.map,
                textureLoaded: this.atlasMaterial.map?.image ? 'yes' : 'no',
                uvCount: meshData.uvs.length / 2,
                vertexCount: meshData.vertexCount,
                firstUV: meshData.uvs.length > 0 ? `[${meshData.uvs[0].toFixed(3)}, ${meshData.uvs[1].toFixed(3)}]` : 'none',
                blocksInChunk: chunkData.blocks.length
            });
        }

        // Create mesh
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.chunkKey = chunkKey;
        mesh.userData.isChunkMesh = true;

        // Add to scene
        this.voxelWorld.scene.add(mesh);
        chunkData.mesh = mesh;

        const endTime = performance.now();
        this.stats.meshGenerationTime += (endTime - startTime);
        this.stats.totalDrawCalls = this.chunkMeshes.size;

        console.log(`🧊 Regenerated chunk ${chunkKey}: ${chunkData.blocks.length} blocks → ${meshData.vertexCount / 6} quads in ${(endTime - startTime).toFixed(2)}ms`);
    }

    /**
     * Get performance stats
     */
    getStats() {
        return {
            ...this.stats,
            avgMeshTime: this.stats.totalChunks > 0
                ? (this.stats.meshGenerationTime / this.stats.totalChunks).toFixed(2) + 'ms'
                : '0ms'
        };
    }

    /**
     * Clear all chunk meshes
     */
    clear() {
        for (const [chunkKey, chunkData] of this.chunkMeshes) {
            if (chunkData.mesh) {
                this.voxelWorld.scene.remove(chunkData.mesh);
                if (chunkData.mesh.geometry) {
                    chunkData.mesh.geometry.dispose();
                }
                if (chunkData.mesh.material) {
                    chunkData.mesh.material.dispose();
                }
            }
        }

        this.chunkMeshes.clear();
        this.stats = {
            totalChunks: 0,
            totalBlocks: 0,
            totalDrawCalls: 0,
            meshGenerationTime: 0
        };

        console.log('🧊 ChunkMeshManager cleared');
    }
}
