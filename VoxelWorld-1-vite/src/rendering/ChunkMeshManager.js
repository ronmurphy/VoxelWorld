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

        // Performance stats
        this.stats = {
            totalChunks: 0,
            totalBlocks: 0,
            totalDrawCalls: 0,
            meshGenerationTime: 0
        };

        console.log('🧊 ChunkMeshManager initialized (greedy meshing enabled)');

        // Load atlas texture and key
        this.loadAtlas();
    }

    /**
     * Load atlas texture and key file
     */
    async loadAtlas() {
        try {
            const isElectron = typeof window !== 'undefined' && window.electronAPI;

            // Load atlas key (JSON)
            let atlasKey;
            if (isElectron && window.electronAPI.readFile) {
                // Electron: Use preload API to read file from filesystem
                console.log('🎨 Loading atlas in Electron mode...');
                const keyContent = await window.electronAPI.readFile('art/atlas-key.json');
                atlasKey = JSON.parse(keyContent);
            } else {
                // Browser: Use fetch
                const keyResponse = await fetch('/art/atlas-key.json');
                atlasKey = await keyResponse.json();
            }
            GreedyMesher.loadAtlasKey(atlasKey);

            // Load atlas texture
            const textureLoader = new THREE.TextureLoader();
            // In Electron, assets are served from the file system at root level
            const atlasPath = '/art/atlas.png';
            this.atlasTexture = await textureLoader.loadAsync(atlasPath);
            this.atlasTexture.magFilter = THREE.NearestFilter; // Pixelated look
            this.atlasTexture.minFilter = THREE.NearestFilter;

            // Create shared material for all chunks
            this.atlasMaterial = new THREE.MeshLambertMaterial({
                map: this.atlasTexture,
                vertexColors: false, // Use texture, not vertex colors
                side: THREE.FrontSide
            });

            console.log('🎨 Atlas texture and key loaded successfully');
        } catch (error) {
            console.error('❌ Failed to load atlas:', error);
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
