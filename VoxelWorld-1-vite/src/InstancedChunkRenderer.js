import * as THREE from 'three';

/**
 * InstancedChunkRenderer - High-performance rendering using THREE.InstancedMesh
 *
 * ✅ FIX #1: Material Cloning - Uses getMaterialClone() to prevent texture corruption
 * ✅ FIX #2: Lazy Initialization - Creates InstancedMesh on-demand when first block is added
 * ✅ FIX #3: Smaller Capacity - 10,000 instances per type (was 50,000)
 * ✅ FIX #4: Skip Pre-Hiding - No expensive initialization loop
 * ✅ FIX #5: Feature Flag - Only initialized if PHASE_2_ENABLED is true
 *
 * Performance: 1 draw call per block type instead of 1 per block
 * Example: 10,000 blocks = 5-8 draw calls instead of 10,000
 */
export class InstancedChunkRenderer {
    constructor(scene, resourcePool, enhancedGraphics) {
        this.scene = scene;
        this.resourcePool = resourcePool;
        this.enhancedGraphics = enhancedGraphics;

        // Map<blockType, InstancedMesh>
        this.instancedMeshes = new Map();

        // Map<blockType, nextAvailableIndex>
        this.nextInstanceIndex = new Map();

        // Map<blockType, Set<availableIndices>> - for recycling
        this.recycledIndices = new Map();

        // Map<"x,y,z", {type, instanceIndex}>
        this.blockToInstance = new Map();

        // Map<"chunkX,chunkZ", Set<"x,y,z">>
        this.chunkBlocks = new Map();

        // FIX #3: Smaller capacity (was 50,000)
        this.maxInstancesPerType = 10000;

        // Hide position for removed instances
        this.hidePosition = new THREE.Vector3(0, -10000, 0);
        this.hideMatrix = new THREE.Matrix4().setPosition(this.hidePosition);

        console.log('🚀 Phase 2: InstancedChunkRenderer initialized (lazy mode)');
    }

    /**
     * FIX #2: Lazy initialization - only called when first block of type is added
     * FIX #1: Uses getMaterialClone() to prevent shared state issues
     * FIX #4: Skip pre-hiding loop for instant creation
     */
    createInstancedMesh(blockType) {
        if (this.instancedMeshes.has(blockType)) {
            return; // Already exists
        }

        const geometry = this.resourcePool.getGeometry('cube');

        // FIX #1: Clone material to avoid texture corruption
        const baseMaterial = this.resourcePool.getMaterialClone(blockType);

        if (!baseMaterial) {
            console.error(`❌ Cannot create InstancedMesh for '${blockType}' - material not found`);
            return;
        }

        // Apply EnhancedGraphics to get proper textures
        let enhancedMaterial = this.enhancedGraphics.getEnhancedBlockMaterial(blockType, baseMaterial);

        // ⚠️ FIX: InstancedMesh cannot use material arrays (multi-face textures)
        // Use first material if array, or fall back to base material
        let material;
        if (Array.isArray(enhancedMaterial)) {
            console.warn(`⚠️ Block '${blockType}' has multi-face texture - using base material for InstancedMesh`);
            material = baseMaterial; // Use cloned material without enhancement
        } else {
            material = enhancedMaterial;
        }

        // Create instanced mesh
        const instancedMesh = new THREE.InstancedMesh(
            geometry,
            material,
            this.maxInstancesPerType
        );

        // Enable per-instance colors
        instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(
            new Float32Array(this.maxInstancesPerType * 3),
            3
        );

        // ⚠️ CRITICAL FIX: Disable frustum culling to prevent vanishing terrain
        // InstancedMesh bounding box calculation is expensive and inaccurate with dynamic instances
        // Disabling culling ensures blocks are always rendered when in view
        instancedMesh.frustumCulled = false;

        // FIX #4: Skip pre-hiding loop (was 10,000 operations!)
        // Instances start at origin but won't be rendered until setMatrixAt()

        this.scene.add(instancedMesh);

        // Initialize tracking
        this.instancedMeshes.set(blockType, instancedMesh);
        this.nextInstanceIndex.set(blockType, 0);
        this.recycledIndices.set(blockType, new Set());

        console.log(`✅ Created InstancedMesh: '${blockType}' (capacity: ${this.maxInstancesPerType})`);
    }

    /**
     * Add a block instance at world position
     * FIX #2: Lazy init - creates InstancedMesh on first use
     */
    addInstance(x, y, z, blockType, color = null) {
        // FIX #2: Lazy initialization
        if (!this.instancedMeshes.has(blockType)) {
            this.createInstancedMesh(blockType);
        }

        const instancedMesh = this.instancedMeshes.get(blockType);
        if (!instancedMesh) {
            return -1; // Failed to create
        }

        // Get instance index - reuse recycled if available
        const recycled = this.recycledIndices.get(blockType);
        let instanceIndex;

        if (recycled.size > 0) {
            const recycledArray = Array.from(recycled);
            instanceIndex = recycledArray[0];
            recycled.delete(instanceIndex);
        } else {
            instanceIndex = this.nextInstanceIndex.get(blockType);
            this.nextInstanceIndex.set(blockType, instanceIndex + 1);

            if (instanceIndex >= this.maxInstancesPerType) {
                console.warn(`⚠️ Capacity exceeded for '${blockType}'`);
                return -1;
            }
        }

        // Set position matrix
        const matrix = new THREE.Matrix4();
        matrix.setPosition(x, y, z);
        instancedMesh.setMatrixAt(instanceIndex, matrix);

        // Set per-instance color if provided
        if (color && instancedMesh.instanceColor) {
            instancedMesh.setColorAt(instanceIndex, color);
            instancedMesh.instanceColor.needsUpdate = true;
        }

        instancedMesh.instanceMatrix.needsUpdate = true;

        // Track this instance
        const key = `${x},${y},${z}`;
        this.blockToInstance.set(key, {
            type: blockType,
            instanceIndex: instanceIndex
        });

        // Track by chunk
        const chunkX = Math.floor(x / 8);
        const chunkZ = Math.floor(z / 8);
        const chunkKey = `${chunkX},${chunkZ}`;

        if (!this.chunkBlocks.has(chunkKey)) {
            this.chunkBlocks.set(chunkKey, new Set());
        }
        this.chunkBlocks.get(chunkKey).add(key);

        return instanceIndex;
    }

    /**
     * Remove a block instance (hides for recycling)
     */
    removeInstance(x, y, z) {
        const key = `${x},${y},${z}`;
        const instanceData = this.blockToInstance.get(key);

        if (!instanceData) {
            return false;
        }

        const { type, instanceIndex } = instanceData;
        const instancedMesh = this.instancedMeshes.get(type);

        if (!instancedMesh) {
            return false;
        }

        // Hide instance
        instancedMesh.setMatrixAt(instanceIndex, this.hideMatrix);
        instancedMesh.instanceMatrix.needsUpdate = true;

        // Mark as recycled
        this.recycledIndices.get(type).add(instanceIndex);

        // Remove from tracking
        this.blockToInstance.delete(key);

        // Remove from chunk tracking
        const chunkX = Math.floor(x / 8);
        const chunkZ = Math.floor(z / 8);
        const chunkKey = `${chunkX},${chunkZ}`;
        if (this.chunkBlocks.has(chunkKey)) {
            this.chunkBlocks.get(chunkKey).delete(key);
        }

        return true;
    }

    /**
     * Hide all instances in a chunk (when unloading)
     */
    hideChunk(chunkX, chunkZ) {
        const chunkKey = `${chunkX},${chunkZ}`;
        const blocks = this.chunkBlocks.get(chunkKey);

        if (!blocks || blocks.size === 0) {
            return;
        }

        let hiddenCount = 0;
        for (const blockKey of blocks) {
            const [x, y, z] = blockKey.split(',').map(Number);
            if (this.removeInstance(x, y, z)) {
                hiddenCount++;
            }
        }

        this.chunkBlocks.delete(chunkKey);
        console.log(`🌫️ Hidden ${hiddenCount} instances in chunk (${chunkX}, ${chunkZ})`);
    }

    /**
     * Update instance color
     */
    updateInstanceColor(x, y, z, color) {
        const key = `${x},${y},${z}`;
        const instanceData = this.blockToInstance.get(key);

        if (!instanceData) {
            return false;
        }

        const { type, instanceIndex } = instanceData;
        const instancedMesh = this.instancedMeshes.get(type);

        if (instancedMesh && instancedMesh.instanceColor) {
            instancedMesh.setColorAt(instanceIndex, color);
            instancedMesh.instanceColor.needsUpdate = true;
            return true;
        }

        return false;
    }

    /**
     * Get rendering statistics
     */
    getStats() {
        const stats = {
            blockTypes: this.instancedMeshes.size,
            totalBlocks: this.blockToInstance.size,
            drawCalls: this.instancedMeshes.size,
            instancesByType: {},
            recycledByType: {},
            chunks: this.chunkBlocks.size
        };

        for (const [type, mesh] of this.instancedMeshes) {
            const activeCount = this.nextInstanceIndex.get(type) - this.recycledIndices.get(type).size;
            stats.instancesByType[type] = activeCount;
            stats.recycledByType[type] = this.recycledIndices.get(type).size;
        }

        return stats;
    }

    /**
     * Cleanup (call on shutdown)
     */
    dispose() {
        for (const [type, mesh] of this.instancedMeshes) {
            this.scene.remove(mesh);
            // Material was cloned, so dispose it
            if (mesh.material) {
                mesh.material.dispose();
            }
        }

        this.instancedMeshes.clear();
        this.nextInstanceIndex.clear();
        this.recycledIndices.clear();
        this.blockToInstance.clear();
        this.chunkBlocks.clear();

        console.log('✅ InstancedChunkRenderer disposed');
    }
}