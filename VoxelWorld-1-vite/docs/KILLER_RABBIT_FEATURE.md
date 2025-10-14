# 🐰⚔️ The Killer Rabbit of Caerbannog

## Overview
A Monty Python easter egg where 5% of rabbits spawn as dangerous "Killer Rabbits" that can climb trees and attack players!

## Feature Details

### Two Rabbit Types:

#### 1. **Normal Rabbits (95%)**
- Spawn on the ground at dawn (5:00-7:00)
- Flee from players at 15 blocks distance
- Health: 1 HP (one-shot with spear)
- Drop: 1 raw meat
- **Cannot climb trees** - blocked by solid blocks

#### 2. **Killer Rabbits (5%)** 🐰⚔️
- Spawn during dawn (same as normal)
- **Can climb trees once** (gets stuck in branches)
- **Aggressive behavior:**
  - Aggro distance: 20 blocks
  - Charges at player
  - Deals 10 damage per attack
  - Faster movement speed
- Health: 1 HP (same as normal)
- Drop: 1 raw meat (same loot)

### Monty Python References

#### Attack Messages (random):
- "🐰💀 Look at the bones!"
- "🐰⚔️ That's no ordinary rabbit!"
- "🐰💀 It's got a vicious streak a mile wide!"
- "🐰⚔️ Run away! Run away!"

#### Kill Messages:
- Console: `⚔️🏆 You've defeated the Killer Rabbit of Caerbannog!`
- In-game: "🏆 You've defeated the Killer Rabbit of Caerbannog!"

#### Spawn Message:
- Console: `⚔️🐰 KILLER RABBIT OF CAERBANNOG SPAWNED! "Run away!"`

## Technical Implementation

### Files Modified:
- **src/animals/Animal.js**
  - Line 19-33: Constructor checks for 5% killer rabbit chance
  - Line 36-37: Flags: `isKillerRabbit`, `climbedTree`
  - Line 225-240: Physics allows tree climbing for killer rabbits
  - Line 345-358: Attack messages displayed randomly
  - Line 454-465: Special victory message on death

### Key Mechanics:

```javascript
// 5% spawn chance
if (type === 'rabbit' && Math.random() < 0.05) {
    this.isKillerRabbit = true;
    this.config.aggressive = true;
    this.config.aggroDistance = 20;
    this.config.chargeSpeed = 0.4;
    this.config.damage = 10;
}
```

```javascript
// Tree climbing (one-time)
if (this.isKillerRabbit && !this.climbedTree) {
    this.climbedTree = true;
    // Allow movement into block
}
```

### Memory Safety
✅ **Despawn Distance:** 150 blocks from player
✅ **Proper Cleanup:** 
- Scene removal
- Material disposal
- Texture disposal  
- Reference nullification
- Array removal

✅ **Garbage Collection:** Automatic after cleanup

## Testing

### Force Spawn for Testing:
In browser console:
```javascript
// Spawn 20 rabbits (should get ~1 killer)
for(let i = 0; i < 20; i++) {
  game.animalSystem.spawnAnimal('rabbit', 
    game.player.position.clone().add(new THREE.Vector3(
      Math.random()*10-5, 0, Math.random()*10-5
    ))
  );
}
```

### Expected Behavior:
1. Most rabbits flee immediately
2. ~1 in 20 charges at player instead
3. Killer rabbits may climb nearby trees
4. Attack messages appear when killer rabbit attacks
5. Victory message when killed

## Statistics
- **Build Size:** 1,447.97 KB (unchanged)
- **Version:** 0.5.0
- **Feature Addition:** +0 KB (pure logic, no assets)

## Future Enhancements
- Achievement: "Run Away!" (killed by Killer Rabbit)
- Achievement: "Holy Hand Grenade" (kill 10 Killer Rabbits)
- Special loot from Killer Rabbits (rare item)
- Sound effects for Killer Rabbit attacks
- Red eyes texture variant for Killer Rabbits

---

*"That rabbit's got a vicious streak a mile wide! It's a killer!"*
