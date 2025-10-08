# 🕸️ Grappling Hook Fix - Ender Pearl Style Teleportation

## Problem
The grappling hook was trying to be placed as a crafted object, causing the error:
```
Uncaught TypeError: can't access property "type", metadata.shape is undefined
```

This happened because grappling hooks don't have `shape` metadata - they're consumable tools, not placeable objects.

## Solution
Added special handling for grappling hooks **before** the placement logic checks:

### How It Works Now (Like Minecraft Ender Pearl):

1. **Right-click with grappling hook selected**
2. **Checks for `metadata.isGrapplingHook` flag** (set in ToolBenchSystem.js)
3. **Teleports player** to target position + 2 blocks up (to avoid collision)
4. **Resets velocity** to prevent fall damage
5. **Consumes one charge** from the stack
6. **Early return** prevents trying to place it as a block

### Code Location
**VoxelWorld.js** - Right-click handler (around line 9640):
```javascript
// 🕸️ GRAPPLING HOOK: Check if item is a grappling hook (ender pearl style teleport)
const metadata = this.inventoryMetadata?.[selectedBlock];
if (metadata?.isGrapplingHook) {
    // Teleport player to target block + 2Y (like ender pearl)
    const targetX = placePos.x;
    const targetY = placePos.y + 2;  // +2 blocks above target to avoid collision
    const targetZ = placePos.z;
    
    // Instant teleport
    this.player.position.set(targetX, targetY, targetZ);
    this.player.velocity = 0;  // Reset velocity
    
    // Consume one charge
    selectedSlot.quantity--;
    // ... update UI and return
}
```

### Metadata Setup
**ToolBenchSystem.js** (line 41-52):
```javascript
grappling_hook: {
    name: '🕸️ Grappling Hook',
    items: { leaves: 3, feather: 1 },
    description: 'Teleport to targeted blocks. 10 charges.',
    category: 'movement',
    isConsumable: true,
    charges: 10,
    isGrapplingHook: true  // ← This flag enables teleportation
}
```

When crafted, metadata is stored as:
```javascript
{
    name: '🕸️ Grappling Hook',
    type: 'crafted_tool',
    category: 'consumable',
    charges: 10,
    isGrapplingHook: true  // ← Critical flag
}
```

## Usage
1. **Craft** grappling hook at Tool Bench (3 leaves + 1 feather = 10 charges)
2. **Select** in hotbar (1-5 keys)
3. **Right-click** on any block you can see
4. **Teleport** instantly to that location + 2 blocks up
5. **No limits** to usage (for now) - just consumes charges

## Future Enhancements
- [ ] Add cooldown timer between uses
- [ ] Add particle trail effect during teleport
- [ ] Add sound effect on teleport
- [ ] Add smooth camera animation instead of instant jump
- [ ] Limit max teleport distance
- [ ] Add durability instead of charges
- [ ] Prevent teleporting through walls (line-of-sight check)

## Testing
To test the fix:
1. Start game and find/craft Tool Bench
2. Craft grappling hook (3 leaves + 1 feather)
3. Select grappling hook in hotbar
4. Right-click on distant block
5. Should teleport instantly without errors!

## Related Files
- `VoxelWorld.js` - Main game logic with teleport handler
- `ToolBenchSystem.js` - Grappling hook blueprint and metadata
- `CompanionCodex.js` - Grappling hook UI icons
