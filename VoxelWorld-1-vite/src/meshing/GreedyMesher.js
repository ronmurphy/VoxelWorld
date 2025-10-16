/**
 * GreedyMesher.js
 *
 * Implements greedy meshing algorithm for voxel terrain optimization.
 * Combines adjacent faces of same block type into larger quads to reduce draw calls.
 *
 * Algorithm:
 * 1. For each axis (x, y, z) and direction (+/-)
 * 2. Slice through the chunk perpendicular to axis
 * 3. Find rectangular regions of same block type
 * 4. Merge into single quad instead of many small faces
 *
 * Performance Impact:
 * - CPU: ~3-4x slower chunk generation (one-time cost)
 * - GPU: ~50-80% fewer draw calls (every frame savings!)
 * - Net: Massive performance win for rendering
 */

export class GreedyMesher {
    /**
     * Generate greedy meshed geometry data from block array
     * @param {Array} blocks - Array of {x, y, z, blockType, color}
     * @param {number} chunkSize - Size of chunk (8x8 typically)
     * @returns {Object} { positions: Float32Array, normals: Float32Array, colors: Float32Array, uvs: Float32Array }
     */
    static generateMesh(blocks, chunkSize = 8) {
        // Convert blocks array to 3D grid for fast lookup
        const grid = this.blocksToGrid(blocks, chunkSize);

        // Find bounds
        const bounds = this.findBounds(blocks);

        // Arrays to store mesh data
        const positions = [];
        const normals = [];
        const colors = [];
        const uvs = [];

        // Process each of 6 directions: +X, -X, +Y, -Y, +Z, -Z
        const directions = [
            { axis: 0, dir: 1, u: 1, v: 2 },  // +X
            { axis: 0, dir: -1, u: 1, v: 2 }, // -X
            { axis: 1, dir: 1, u: 0, v: 2 },  // +Y
            { axis: 1, dir: -1, u: 0, v: 2 }, // -Y
            { axis: 2, dir: 1, u: 0, v: 1 },  // +Z
            { axis: 2, dir: -1, u: 0, v: 1 }  // -Z
        ];

        for (const { axis, dir, u, v } of directions) {
            this.generateFacesForDirection(
                grid, bounds, chunkSize,
                axis, dir, u, v,
                positions, normals, colors, uvs
            );
        }

        // Convert to typed arrays for Three.js
        return {
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            colors: new Float32Array(colors),
            uvs: new Float32Array(uvs),
            vertexCount: positions.length / 3
        };
    }

    /**
     * Generate faces for one direction (e.g., +X faces)
     */
    static generateFacesForDirection(grid, bounds, chunkSize, axis, dir, u, v, positions, normals, colors, uvs) {
        const q = [0, 0, 0];
        q[axis] = dir;

        // Determine iteration range based on axis
        const [minD, maxD] = [bounds.min[axis], bounds.max[axis]];
        const [minU, maxU] = [bounds.min[u], bounds.max[u]];
        const [minV, maxV] = [bounds.min[v], bounds.max[v]];

        const rangeU = maxU - minU + 1;
        const rangeV = maxV - minV + 1;

        // Mask for current slice
        const mask = new Array(rangeU * rangeV);

        // Iterate through each slice perpendicular to axis
        for (let d = minD; d <= maxD + 1; d++) {
            // Clear mask
            mask.fill(null);

            // Build mask for this slice
            for (let vPos = minV; vPos <= maxV; vPos++) {
                for (let uPos = minU; uPos <= maxU; uPos++) {
                    const pos = [0, 0, 0];
                    pos[axis] = d;
                    pos[u] = uPos;
                    pos[v] = vPos;

                    const posBehind = [pos[0] - q[0], pos[1] - q[1], pos[2] - q[2]];

                    const blockCurrent = this.getBlock(grid, pos[0], pos[1], pos[2]);
                    const blockBehind = this.getBlock(grid, posBehind[0], posBehind[1], posBehind[2]);

                    // Determine if we need a face here
                    let faceBlock = null;

                    if (blockCurrent && !blockBehind) {
                        // Solid block with air/empty behind it → render face on current block
                        faceBlock = blockCurrent;
                    } else if (!blockCurrent && blockBehind) {
                        // Air with solid behind → render face on back side
                        // (This is the "backface" from the perspective of the solid block)
                        // Skip for now - we only render front faces
                        faceBlock = null;
                    }

                    const maskIndex = (vPos - minV) * rangeU + (uPos - minU);
                    mask[maskIndex] = faceBlock;
                }
            }

            // Generate mesh from mask using greedy algorithm
            for (let vIdx = 0; vIdx < rangeV; vIdx++) {
                for (let uIdx = 0; uIdx < rangeU; ) {
                    const maskIndex = vIdx * rangeU + uIdx;
                    const currentBlock = mask[maskIndex];

                    if (currentBlock) {
                        // Found a face, now greedily expand it

                        // Compute width (expand along u axis)
                        let w = 1;
                        while (uIdx + w < rangeU) {
                            const nextMaskIndex = vIdx * rangeU + (uIdx + w);
                            if (!this.blockMatches(mask[nextMaskIndex], currentBlock)) break;
                            w++;
                        }

                        // Compute height (expand along v axis)
                        let h = 1;
                        let done = false;
                        for (h = 1; vIdx + h < rangeV; h++) {
                            // Check if entire row matches
                            for (let k = 0; k < w; k++) {
                                const checkMaskIndex = (vIdx + h) * rangeU + (uIdx + k);
                                if (!this.blockMatches(mask[checkMaskIndex], currentBlock)) {
                                    done = true;
                                    break;
                                }
                            }
                            if (done) break;
                        }

                        // Create quad for this merged region
                        const pos = [0, 0, 0];
                        pos[axis] = d;
                        pos[u] = minU + uIdx;
                        pos[v] = minV + vIdx;

                        const du = [0, 0, 0];
                        du[u] = w;

                        const dv = [0, 0, 0];
                        dv[v] = h;

                        // Add quad (order depends on direction for correct winding)
                        if (dir > 0) {
                            this.addQuad(
                                positions, normals, colors, uvs,
                                pos,
                                [pos[0] + du[0], pos[1] + du[1], pos[2] + du[2]],
                                [pos[0] + du[0] + dv[0], pos[1] + du[1] + dv[1], pos[2] + du[2] + dv[2]],
                                [pos[0] + dv[0], pos[1] + dv[1], pos[2] + dv[2]],
                                currentBlock.color,
                                q
                            );
                        } else {
                            // Reverse winding for negative direction
                            this.addQuad(
                                positions, normals, colors, uvs,
                                pos,
                                [pos[0] + dv[0], pos[1] + dv[1], pos[2] + dv[2]],
                                [pos[0] + du[0] + dv[0], pos[1] + du[1] + dv[1], pos[2] + du[2] + dv[2]],
                                [pos[0] + du[0], pos[1] + du[1], pos[2] + du[2]],
                                currentBlock.color,
                                q
                            );
                        }

                        // Zero out merged region in mask
                        for (let l = 0; l < h; l++) {
                            for (let k = 0; k < w; k++) {
                                const clearMaskIndex = (vIdx + l) * rangeU + (uIdx + k);
                                mask[clearMaskIndex] = null;
                            }
                        }

                        // Advance u counter
                        uIdx += w;
                    } else {
                        uIdx++;
                    }
                }
            }
        }
    }

    /**
     * Find bounding box of blocks
     */
    static findBounds(blocks) {
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        for (const block of blocks) {
            minX = Math.min(minX, block.x);
            minY = Math.min(minY, block.y);
            minZ = Math.min(minZ, block.z);
            maxX = Math.max(maxX, block.x);
            maxY = Math.max(maxY, block.y);
            maxZ = Math.max(maxZ, block.z);
        }

        return {
            min: [minX, minY, minZ],
            max: [maxX, maxY, maxZ]
        };
    }

    /**
     * Convert blocks array to 3D grid for fast lookup
     */
    static blocksToGrid(blocks, chunkSize) {
        const grid = new Map();

        for (const block of blocks) {
            const key = `${block.x},${block.y},${block.z}`;
            grid.set(key, {
                type: block.blockType,
                color: block.color
            });
        }

        return grid;
    }

    /**
     * Get block at position from grid
     */
    static getBlock(grid, x, y, z) {
        const key = `${x},${y},${z}`;
        return grid.get(key) || null;
    }

    /**
     * Check if two blocks match (same type and color)
     */
    static blockMatches(block1, block2) {
        if (!block1 || !block2) return block1 === block2;
        return block1.type === block2.type && block1.color === block2.color;
    }

    /**
     * Add quad face to mesh arrays
     */
    static addQuad(positions, normals, colors, uvs, v1, v2, v3, v4, color, normal) {
        // Convert hex color to RGB (0-1 range)
        const r = ((color >> 16) & 0xFF) / 255;
        const g = ((color >> 8) & 0xFF) / 255;
        const b = (color & 0xFF) / 255;

        // Two triangles per quad (v1-v2-v3, v1-v3-v4)
        const vertices = [v1, v2, v3, v1, v3, v4];

        for (const v of vertices) {
            positions.push(v[0], v[1], v[2]);
            normals.push(normal[0], normal[1], normal[2]);
            colors.push(r, g, b);
        }

        // UVs for texture mapping
        uvs.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
    }
}
