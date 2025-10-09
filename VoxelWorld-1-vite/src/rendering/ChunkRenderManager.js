/**
 * ChunkRenderManager.js - Clean LOD and Visibility System
 *
 * Responsibilities:
 * - Pull cached chunks from storage
 * - Apply LOD rules based on distance
 * - Manage frustum culling and visibility
 * - Prepare chunks for rendering based on player position and GPU tier
 *
 * Architecture:
 * - Tier 0: Full detail (interactive chunks) - 0 to renderDistance
 * - Tier 1: Simplified geometry (LOD chunks) - renderDistance+1 to renderDistance+visualDistance
 * - Tier 2: Billboards (far chunks) - beyond visualDistance (future)
 */

import * as THREE from 'three';

export class ChunkRenderManager {
    constructor(app) {
        this.app = app;
        this.scene = app.scene;
        this.camera = app.camera;

        // Visible chunk tracking
        this.visibleChunks = new Map(); // Tier 0: Full detail chunks
        this.lodChunks = new Map();     // Tier 1: Simplified chunks
        this.billboardChunks = new Map(); // Tier 2: Far billboards (future)

        // Render settings
        this.maxRenderDistance = 3;     // Full detail distance
        this.maxVisualDistance = 1;     // LOD distance beyond render
        this.maxBillboardDistance = 2;  // Billboard distance (future)

        // GPU tier settings (auto-detected)
        this.gpuTier = 'medium'; // 'low', 'medium', 'high'
        this.applyGPUTierSettings();

        // Frustum for culling
        this.frustum = new THREE.Frustum();
        this.frustumMatrix = new THREE.Matrix4();

        // Performance tracking
        this.stats = {
            tier0Chunks: 0,
            tier1Chunks: 0,
            tier2Chunks: 0,
            culledChunks: 0
        };

        console.log('🎨 ChunkRenderManager initialized');
    }

    /**
     * Apply GPU-specific settings
     */
    applyGPUTierSettings() {
        switch (this.gpuTier) {
            case 'low':
                this.maxRenderDistance = 1;
                this.maxVisualDistance = 1;
                this.maxBillboardDistance = 0;
                break;
            case 'medium':
                this.maxRenderDistance = 2;
                this.maxVisualDistance = 1;
                this.maxBillboardDistance = 1;
                break;
            case 'high':
                this.maxRenderDistance = 3;
                this.maxVisualDistance = 2;
                this.maxBillboardDistance = 2;
                break;
        }
        console.log(`🎮 GPU Tier: ${this.gpuTier} - Render: ${this.maxRenderDistance}, LOD: ${this.maxVisualDistance}`);
    }

    /**
     * Main update loop - called every frame
     */
    update(playerChunkX, playerChunkZ) {
        // Update frustum for culling
        this.frustumMatrix.multiplyMatrices(
            this.camera.projectionMatrix,
            this.camera.matrixWorldInverse
        );
        this.frustum.setFromProjectionMatrix(this.frustumMatrix);

        // Get camera direction for directional culling
        const cameraForward = new THREE.Vector3();
        this.camera.getWorldDirection(cameraForward);
        cameraForward.y = 0;
        cameraForward.normalize();

        // Reset stats
        this.stats = { tier0Chunks: 0, tier1Chunks: 0, tier2Chunks: 0, culledChunks: 0 };

        // Track which chunks should exist at each tier
        const shouldExist = {
            tier0: new Set(),
            tier1: new Set(),
            tier2: new Set()
        };

        // Scan area around player
        const maxDist = this.maxRenderDistance + this.maxVisualDistance + this.maxBillboardDistance;

        for (let cx = playerChunkX - maxDist; cx <= playerChunkX + maxDist; cx++) {
            for (let cz = playerChunkZ - maxDist; cz <= playerChunkZ + maxDist; cz++) {
                const dist = Math.max(Math.abs(cx - playerChunkX), Math.abs(cz - playerChunkZ));

                // Determine LOD tier based on distance
                const lod = this.determineLOD(dist);

                if (lod === -1) continue; // Too far, skip

                // Directional culling (skip chunks behind camera)
                const chunkDir = new THREE.Vector3(
                    (cx - playerChunkX),
                    0,
                    (cz - playerChunkZ)
                ).normalize();

                const dot = chunkDir.dot(cameraForward);

                // Skip chunks behind camera (but be less aggressive than before)
                if (dot < -0.3) {
                    this.stats.culledChunks++;
                    continue;
                }

                const chunkKey = `${cx},${cz}`;

                // Add to appropriate tier
                if (lod === 0) {
                    shouldExist.tier0.add(chunkKey);
                } else if (lod === 1) {
                    shouldExist.tier1.add(chunkKey);
                } else if (lod === 2) {
                    shouldExist.tier2.add(chunkKey);
                }
            }
        }

        // Update Tier 0 (full detail) - handled by main VoxelWorld
        this.stats.tier0Chunks = shouldExist.tier0.size;

        // Update Tier 1 (LOD chunks) - use existing LOD manager
        if (this.app.lodManager) {
            // Let LOD manager handle tier 1
            this.stats.tier1Chunks = this.app.lodManager.lodChunks.size;
        }

        // Update Tier 2 (billboards) - future implementation
        this.stats.tier2Chunks = shouldExist.tier2.size;
    }

    /**
     * Determine LOD tier based on distance
     * @returns {number} -1 = too far, 0 = full detail, 1 = simplified, 2 = billboard
     */
    determineLOD(distance) {
        if (distance <= this.maxRenderDistance) {
            return 0; // Tier 0: Full detail
        } else if (distance <= this.maxRenderDistance + this.maxVisualDistance) {
            return 1; // Tier 1: Simplified LOD
        } else if (distance <= this.maxRenderDistance + this.maxVisualDistance + this.maxBillboardDistance) {
            return 2; // Tier 2: Billboard (future)
        } else {
            return -1; // Too far
        }
    }

    /**
     * Check if chunk is visible in frustum
     */
    isChunkVisible(chunkX, chunkZ) {
        const chunkSize = this.app.chunkSize;
        const worldX = chunkX * chunkSize;
        const worldZ = chunkZ * chunkSize;

        // Create bounding box for chunk
        const box = new THREE.Box3(
            new THREE.Vector3(worldX, 0, worldZ),
            new THREE.Vector3(worldX + chunkSize, 32, worldZ + chunkSize)
        );

        return this.frustum.intersectsBox(box);
    }

    /**
     * Set GPU tier (adjusts quality settings)
     */
    setGPUTier(tier) {
        this.gpuTier = tier;
        this.applyGPUTierSettings();
    }

    /**
     * Get render stats
     */
    getStats() {
        return {
            ...this.stats,
            gpuTier: this.gpuTier,
            maxRenderDistance: this.maxRenderDistance,
            maxVisualDistance: this.maxVisualDistance
        };
    }
}
