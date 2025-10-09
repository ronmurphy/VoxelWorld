/**
 * LODDebugOverlay.js - Visual LOD Zone Debugging
 *
 * Renders colored rings showing LOD tier boundaries:
 * - Green ring: Tier 0 boundary (full detail chunks)
 * - Yellow ring: Tier 1 boundary (simplified LOD chunks)
 * - Red ring: Tier 2 boundary (billboards - future)
 *
 * Toggle with 'L' key
 */

import * as THREE from 'three';

export class LODDebugOverlay {
    constructor(app) {
        this.app = app;
        this.scene = app.scene;
        this.camera = app.camera;

        this.enabled = false;
        this.rings = [];
        this.labels = [];

        // Stats display
        this.statsElement = null;

        console.log('🔍 LODDebugOverlay initialized (press L to toggle)');
    }

    /**
     * Toggle debug overlay visibility
     */
    toggle() {
        this.enabled = !this.enabled;

        if (this.enabled) {
            this.createRings();
            this.createStatsDisplay();
            console.log('🟢 LOD Debug Overlay: ON');
        } else {
            this.removeRings();
            this.removeStatsDisplay();
            console.log('🔴 LOD Debug Overlay: OFF');
        }
    }

    /**
     * Create visual rings for each LOD tier boundary
     */
    createRings() {
        const chunkSize = this.app.chunkSize;
        const renderDistance = this.app.renderDistance;
        const visualDistance = this.app.lodManager ? this.app.lodManager.visualDistance : 1;

        // Tier 0: Full detail boundary (green)
        const tier0Radius = renderDistance * chunkSize;
        this.createRing(tier0Radius, 0x00ff00, 'Tier 0: Full Detail');

        // Tier 1: LOD boundary (yellow)
        const tier1Radius = (renderDistance + visualDistance) * chunkSize;
        this.createRing(tier1Radius, 0xffff00, 'Tier 1: Simplified');

        // Tier 2: Billboard boundary (red) - future
        const tier2Radius = (renderDistance + visualDistance + 2) * chunkSize;
        this.createRing(tier2Radius, 0xff0000, 'Tier 2: Billboards (Future)', 0.3);

        console.log(`📊 LOD Zones: Tier0=${tier0Radius}m, Tier1=${tier1Radius}m, Tier2=${tier2Radius}m`);
    }

    /**
     * Create a single colored ring
     */
    createRing(radius, color, label, opacity = 0.6) {
        const geometry = new THREE.RingGeometry(radius - 0.5, radius + 0.5, 64);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: opacity,
            depthWrite: false
        });

        const ring = new THREE.Mesh(geometry, material);
        ring.rotation.x = -Math.PI / 2; // Lay flat on ground
        ring.position.y = 0.1; // Slightly above ground to avoid z-fighting
        ring.userData.label = label;

        this.scene.add(ring);
        this.rings.push(ring);
    }

    /**
     * Create HUD stats display
     */
    createStatsDisplay() {
        this.statsElement = document.createElement('div');
        this.statsElement.id = 'lod-debug-stats';
        this.statsElement.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #00ff00;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            padding: 10px;
            border: 2px solid #00ff00;
            border-radius: 5px;
            z-index: 1000;
            pointer-events: none;
            min-width: 250px;
        `;
        document.body.appendChild(this.statsElement);
    }

    /**
     * Remove all debug visuals
     */
    removeRings() {
        this.rings.forEach(ring => {
            this.scene.remove(ring);
            ring.geometry.dispose();
            ring.material.dispose();
        });
        this.rings = [];
    }

    /**
     * Remove stats display
     */
    removeStatsDisplay() {
        if (this.statsElement) {
            document.body.removeChild(this.statsElement);
            this.statsElement = null;
        }
    }

    /**
     * Update ring positions to follow player
     */
    update() {
        if (!this.enabled) return;

        const playerX = this.camera.position.x;
        const playerZ = this.camera.position.z;

        // Move rings to follow player
        this.rings.forEach(ring => {
            ring.position.x = playerX;
            ring.position.z = playerZ;
        });

        // Update stats display
        this.updateStats();
    }

    /**
     * Update stats display with current LOD metrics
     */
    updateStats() {
        if (!this.statsElement) return;

        const chunkSize = this.app.chunkSize;
        const renderDistance = this.app.renderDistance;
        const visualDistance = this.app.lodManager ? this.app.lodManager.visualDistance : 1;

        // Get LOD manager stats
        const lodStats = this.app.lodManager ? this.app.lodManager.getStats() : {};

        // Get chunk counts
        const fullChunks = this.app.visibleChunks ? this.app.visibleChunks.size : 0;
        const lodChunks = lodStats.lodChunksActive || 0;
        const totalBlocks = lodStats.blocksRendered || 0;
        const totalMeshes = lodStats.instancedMeshes || 0;

        // Calculate distances
        const tier0Dist = renderDistance * chunkSize;
        const tier1Dist = (renderDistance + visualDistance) * chunkSize;

        const html = `
            <div style="color: #00ff00;">🟢 TIER 0 (Full Detail)</div>
            <div style="padding-left: 10px;">
                Distance: 0-${tier0Dist}m<br>
                Chunks: ${fullChunks}<br>
                Blocks: ${totalBlocks.toLocaleString()}<br>
            </div>
            <br>
            <div style="color: #ffff00;">🟡 TIER 1 (Simplified)</div>
            <div style="padding-left: 10px;">
                Distance: ${tier0Dist}-${tier1Dist}m<br>
                Chunks: ${lodChunks}<br>
                Meshes: ${totalMeshes}<br>
            </div>
            <br>
            <div style="color: #ff0000;">🔴 TIER 2 (Billboards)</div>
            <div style="padding-left: 10px;">
                Status: Not Implemented<br>
                Distance: ${tier1Dist}m+<br>
            </div>
            <br>
            <div style="color: #888;">━━━━━━━━━━━━━━━━━━</div>
            <div style="color: #0ff;">
                Render Dist: ${renderDistance} chunks<br>
                Visual Dist: +${visualDistance} chunks<br>
                Chunk Size: ${chunkSize} blocks<br>
            </div>
        `;

        this.statsElement.innerHTML = html;
    }

    /**
     * Cleanup
     */
    dispose() {
        this.removeRings();
        this.removeStatsDisplay();
    }
}
