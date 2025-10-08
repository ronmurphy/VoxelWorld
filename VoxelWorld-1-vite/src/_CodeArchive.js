/**
 * _CodeArchive.js
 * 
 * Archive of useful code snippets, experimental features, and backup implementations
 * that may be needed for future features or debugging.
 * 
 * ⚠️ NOTE: This file is NOT imported or used in the active codebase.
 * It serves as a reference library for:
 * - Backup implementations that were replaced
 * - Experimental features for future consideration
 * - Alternative approaches that may be useful later
 * 
 * Prefix with underscore (_) to indicate it's not part of the main build.
 */

// ============================================================================
// GRAPPLING HOOK: Instant Teleport (Backup)
// ============================================================================
// Original instant teleport implementation before smooth animation was added
// Could be useful for:
// - Performance mode toggle (instant vs animated)
// - Ender pearl item (instant teleport item)
// - Debug/creative mode teleportation
// ============================================================================

/**
 * Instant teleport player to target position (like Minecraft ender pearl)
 * Alternative to the smooth grappling hook animation
 * 
 * @param {VoxelWorld} voxelWorld - Reference to main game instance
 * @param {number} targetX - Target X coordinate
 * @param {number} targetY - Target Y coordinate  
 * @param {number} targetZ - Target Z coordinate
 * @param {string} message - Optional status message to display
 */
function instantTeleport(voxelWorld, targetX, targetY, targetZ, message = null) {
    // Instant teleport (no animation)
    voxelWorld.player.position.x = targetX;
    voxelWorld.player.position.y = targetY;
    voxelWorld.player.position.z = targetZ;
    
    // Reset velocity to prevent fall damage (velocity is a number, not an object!)
    voxelWorld.player.velocity = 0;
    
    // Display message
    if (message) {
        voxelWorld.updateStatus(message, 'craft');
    } else {
        voxelWorld.updateStatus(`⚡ Teleported to (${targetX}, ${targetY}, ${targetZ})!`, 'craft');
    }
}

// ============================================================================
// Usage Example (if re-enabled):
// ============================================================================
// Instead of: this.animationSystem.animateGrapplingHook(startPos, endPos, 0.8, callback);
// Use: instantTeleport(this, targetX, targetY, targetZ, `🕸️ Grappled to (${targetX}, ${targetY}, ${targetZ})!`);
// ============================================================================

export { instantTeleport };
