# 🐰 Animal System Design Document

## Overview
Huntable animal system with AI, animations, and integration with cooking/survival mechanics.

---

## 🎯 Core Features

### Animal Behavior
- **Billboard-based rendering** (like ghosts)
- **State machine AI**: rest → move → flee → hunted
- **Animation cycling**: 4 frames per animal
- **Spear hunting**: Thrown spear collision detection
- **Loot drops**: Raw meat items for cooking
- **Biome-specific spawning**
- **Time-of-day spawning** (dawn for rabbits)
- **Seasonal variation**: More in spring/summer, fewer in winter

### Reusable System
- Easy to add new animals (just add art + config)
- Shared AI logic
- Scalable (50+ animals with no FPS impact)

---

## 🐇 Animal Configurations

### Rabbit (Phase 1)
```javascript
{
  id: 'rabbit',
  health: 1,
  speed: 0.3, // blocks per second
  fleeDistance: 15, // Start fleeing when player within 15 blocks
  fleeSpeed: 0.5,
  
  // Spawn rules
  spawnBiomes: ['grassland', 'plains', 'forest'],
  spawnTimeOfDay: ['dawn'], // 5:00-7:00 game time
  maxPerChunk: 2, // Max 2-3 rabbits per 8x8 chunk
  respawnInterval: 300, // 5 minutes (300 seconds)
  seasonalMultiplier: {
    spring: 1.5,
    summer: 1.2,
    fall: 0.8,
    winter: 0.3
  },
  
  // Loot
  drops: [
    { item: 'raw_rabbit_meat', chance: 1.0, amount: [1, 2] },
    { item: 'rabbit_hide', chance: 0.5, amount: 1 }
  ],
  
  // Animations
  animations: {
    rest: 'rabbit_rest.png',
    move: ['rabbit_move_1.png', 'rabbit_move_2.png'], // Cycle between
    flee: ['rabbit_move_1.png', 'rabbit_move_2.png'], // Same as move
    hunted: 'rabbit_hunted.png'
  },
  animSpeed: 0.2 // Seconds per frame
}
```

### Deer (Phase 2)
```javascript
{
  id: 'deer',
  health: 2, // Takes 2 spear hits
  speed: 0.35,
  fleeDistance: 20,
  fleeSpeed: 0.6,
  
  spawnBiomes: ['forest', 'meadow'],
  spawnTimeOfDay: ['dawn', 'dusk'],
  maxPerChunk: 1,
  respawnInterval: 600, // 10 minutes (rarer)
  
  drops: [
    { item: 'venison', chance: 1.0, amount: [2, 4] },
    { item: 'antler', chance: 0.3, amount: 1 },
    { item: 'deer_hide', chance: 0.8, amount: [1, 2] }
  ],
  
  animations: {
    rest: 'deer_rest.png',
    move: ['deer_move_1.png', 'deer_move_2.png'],
    flee: ['deer_move_1.png', 'deer_move_2.png'],
    hunted: 'deer_hunted.png'
  }
}
```

### Boar (Phase 3 - Aggressive!)
```javascript
{
  id: 'boar',
  health: 3,
  speed: 0.2, // Slower normally
  aggressive: true, // FIGHTS BACK!
  aggroDistance: 8, // Charges if you get within 8 blocks
  chargeSpeed: 0.7, // Fast when charging
  damage: 15, // Damages player on hit
  
  spawnBiomes: ['forest', 'jungle'],
  spawnTimeOfDay: ['day', 'dusk'],
  maxPerChunk: 1,
  respawnInterval: 900, // 15 minutes (dangerous, rare)
  
  drops: [
    { item: 'pork', chance: 1.0, amount: [2, 3] },
    { item: 'boar_tusk', chance: 0.4, amount: 1 },
    { item: 'boar_hide', chance: 0.7, amount: 1 }
  ],
  
  animations: {
    rest: 'boar_rest.png',
    move: ['boar_move_1.png', 'boar_move_2.png'],
    charge: ['boar_charge_1.png', 'boar_charge_2.png'], // New state!
    hunted: 'boar_hunted.png'
  }
}
```

### Bear (Phase 4 - DANGER!)
```javascript
{
  id: 'bear',
  health: 5, // Boss-tier animal!
  speed: 0.25,
  aggressive: true,
  aggroDistance: 12,
  chargeSpeed: 0.8,
  damage: 30, // Can kill you!
  
  spawnBiomes: ['forest', 'mountain', 'snow'],
  spawnTimeOfDay: ['day', 'dusk', 'night'],
  maxPerChunk: 1,
  respawnInterval: 1800, // 30 minutes (RARE!)
  seasonalMultiplier: {
    spring: 0.5, // Rare in spring
    summer: 0.7,
    fall: 1.5, // More active in fall
    winter: 0.1 // Hibernating
  },
  
  drops: [
    { item: 'bear_meat', chance: 1.0, amount: [4, 6] },
    { item: 'bear_pelt', chance: 0.9, amount: 1 }, // Valuable!
    { item: 'bear_claw', chance: 0.6, amount: [1, 2] }
  ],
  
  animations: {
    rest: 'bear_rest.png',
    move: ['bear_move_1.png', 'bear_move_2.png'],
    charge: ['bear_charge_1.png', 'bear_charge_2.png'],
    attack: 'bear_attack.png', // Swipe animation!
    hunted: 'bear_hunted.png'
  }
}
```

---

## 🤖 AI State Machine

```
┌─────────┐
│  SPAWN  │
└────┬────┘
     │
     ▼
┌─────────┐     Timer expires     ┌─────────┐
│  REST   │ ───────────────────> │  MOVE   │
└────┬────┘                       └────┬────┘
     │                                 │
     │ Player within                   │ Player within
     │ fleeDistance                    │ fleeDistance
     │                                 │
     ▼                                 ▼
┌─────────┐     Spear hit!       ┌─────────┐
│  FLEE   │ ───────────────────> │ HUNTED  │
└────┬────┘                       └────┬────┘
     │                                 │
     │ Escaped far enough              │ Player left-click
     │                                 │
     └─────────────────────────────────┘
                    │
                    ▼
              ┌─────────┐
              │ DESPAWN │
              │ DROP    │
              │ LOOT    │
              └─────────┘

AGGRESSIVE ANIMALS (Boar/Bear):
┌─────────┐
│  REST   │
└────┬────┘
     │ Player within aggroDistance
     ▼
┌─────────┐     Spear hit!       ┌─────────┐
│ CHARGE  │ ───────────────────> │ HUNTED  │
└────┬────┘                       └─────────┘
     │
     │ Collision with player
     ▼
┌─────────┐
│ ATTACK  │ (Deal damage)
└─────────┘
```

---

## 📂 File Structure

```
src/
  AnimalSystem.js         # Main system (NEW)
  AnimalAI.js            # AI state machine (NEW)
  animals/               # (NEW FOLDER)
    Animal.js            # Base animal class
    configs.js           # All animal configurations
  VoxelWorld.js          # Integration point

assets/art/animals/      # (NEW FOLDER)
  rabbit_rest.png
  rabbit_move_1.png
  rabbit_move_2.png
  rabbit_hunted.png
  deer_rest.png
  deer_move_1.png
  deer_move_2.png
  deer_hunted.png
  # ... etc
```

---

## 🔌 Integration Points

### 1. Spawning (like trees/pumpkins)
```javascript
// In VoxelWorld.js
if (currentTimeOfDay === 'dawn' && biome === 'grassland') {
  animalSystem.trySpawnAnimal('rabbit', chunkX, chunkZ);
}
```

### 2. Spear Collision (existing thrown item system)
```javascript
// In projectile collision check
if (hitObject.isAnimal) {
  animalSystem.hitAnimal(hitObject, damage);
}
```

### 3. Harvesting (left-click on hunted animal)
```javascript
// In mouse click handler
if (hitObject.isAnimal && hitObject.state === 'hunted') {
  const loot = animalSystem.harvestAnimal(hitObject);
  inventory.addItems(loot);
}
```

### 4. Cooking System (KitchenBench)
```javascript
recipes.push({
  id: 'cooked_rabbit',
  requires: ['raw_rabbit_meat', 'fire'],
  produces: 'cooked_rabbit_meat',
  time: 30,
  effects: { hunger: +30, health: +5 }
});
```

### 5. Companion Integration
```javascript
companion.sendHunting() {
  // Auto-hunt nearest animal after 30 seconds
  const loot = animalSystem.getRandomAnimalLoot();
  companion.returnWithLoot(loot);
  message('🐰 Your companion brought back 2 rabbit meat!');
}
```

---

## 🎨 Art Asset Template

**Each animal needs 4 PNG files:**

1. **{animal}_rest.png** - Sitting/standing idle
2. **{animal}_move_1.png** - Walking frame 1
3. **{animal}_move_2.png** - Walking frame 2 (cycle with move_1)
4. **{animal}_hunted.png** - Dead/fallen over

**Specs:**
- Size: 64x64 or 128x128 (will be scaled to billboard)
- Transparent background
- Pixel art or emoji style (match game aesthetic)
- Side view (facing left or right)

**Optional (for aggressive animals):**
5. **{animal}_charge_1.png** - Charging frame 1
6. **{animal}_charge_2.png** - Charging frame 2
7. **{animal}_attack.png** - Attack animation

---

## ⚡ Performance Considerations

### Memory
- **Per animal**: ~5KB (same as ghost billboard)
- **50 animals**: ~250KB total (negligible)

### CPU
- **Update loop**: O(n) where n = active animals
- **Pathfinding**: Only calculate when state changes
- **Target**: 60 FPS with 50+ animals

### Optimization
- **Despawn distance**: Remove animals 100+ blocks away
- **Update throttling**: Only update visible animals every frame
- **Chunk-based**: Only spawn animals in loaded chunks
- **State caching**: Don't recalculate path every frame

---

## 📊 Gameplay Balance

### Dawn Spawning (Rabbits)
```
Dawn = 5:00-7:00 game time (2 hours)
Spawn chance: 40% per valid chunk
Result: ~2-3 rabbits spawn near player each dawn
```

### Seasonal Multipliers
```
Spring: 1.5x animals (breeding season!)
Summer: 1.2x animals
Fall: 0.8x animals (preparing for winter)
Winter: 0.3x animals (scarce food - survival challenge!)
```

### Respawn Timer
```
Rabbit: 5 minutes (common food source)
Deer: 10 minutes (moderate resource)
Boar: 15 minutes (dangerous but rewarding)
Bear: 30 minutes (rare boss encounter)
```

### Chunk Limits
```
8x8 chunk = 64 blocks
Max 2-3 rabbits per chunk = 1 rabbit per ~25 blocks
Prevents overcrowding, maintains challenge
```

---

## 🚀 Implementation Phases

### Phase 1: Basic Rabbit (2-3 hours)
- ✅ Create 4 rabbit PNG files
- ✅ AnimalSystem.js - spawning, billboard rendering
- ✅ Simple AI: rest → move (random walk)
- ✅ Spear collision detection
- ✅ Harvest → add to inventory
- ✅ Dawn-only spawning
- ✅ 2-3 per chunk limit

### Phase 2: Advanced AI (1-2 hours)
- ✅ Flee behavior when player approaches
- ✅ Pathfinding integration (npm install pathfinding)
- ✅ Seasonal spawning multipliers
- ✅ Respawn timer system

### Phase 3: Cooking Integration (1 hour)
- ✅ Add raw_rabbit_meat item
- ✅ KitchenBench recipe: raw → cooked
- ✅ Food effects (hunger/health restore)

### Phase 4: More Animals (1 hour each)
- ✅ Deer (passive, larger)
- ✅ Boar (aggressive!)
- ✅ Bear (boss-tier danger!)

### Phase 5: Companion Hunting (30 minutes)
- ✅ Send companion to hunt
- ✅ Auto-collect loot after timer
- ✅ Success/failure messages

---

## 🎮 Player Experience

### Early Game
- Dawn: "Oh, rabbits! Let me try to hunt one..."
- Throws spear, misses, rabbit flees
- "They're fast! I need better aim..."
- Success! Gets raw meat
- Cooks at KitchenBench
- "This restored my hunger! Hunting is useful!"

### Mid Game
- Discovers deer, gets more meat per kill
- Companion can now hunt while player explores
- Builds strategy around dawn hunting sessions

### Late Game
- Encounters boar, gets charged, takes damage
- "Holy crap, some animals are dangerous!"
- Hunts bears for rare pelts/crafting materials
- Winter arrives, animals scarce
- "I need to stockpile food before winter!"

---

## 🎯 Success Metrics

- ✅ Animals spawn reliably at dawn
- ✅ 2-3 rabbits per chunk (no overcrowding)
- ✅ AI behaves naturally (rest, move, flee)
- ✅ Spear hunting feels responsive
- ✅ Harvesting is intuitive (left-click)
- ✅ Cooking integration works seamlessly
- ✅ No FPS impact (60 FPS with 50+ animals)
- ✅ Seasonal variation is noticeable
- ✅ Aggressive animals add challenge

---

## 💡 Future Expansion Ideas

### Birds
- Fly in circles overhead
- Need bow & arrow to hunt (new weapon!)
- Drop feathers for arrows

### Fish
- Spawn in water
- Need fishing rod
- Different fish in different biomes

### Predators (Non-Huntable)
- Wolves that hunt rabbits
- Creates dynamic ecosystem
- Player can scare them away

### Taming
- Feed animals to tame
- Tamed rabbits breed
- Start a farm!

### Companion Evolution
- Companion learns to hunt specific animals
- Gets better over time (XP system)
- Can hunt while you're offline

---

## 🐛 Edge Cases to Handle

1. **Animal stuck in wall** → Teleport to safe location
2. **Spear hits 2 animals** → Only first one takes damage
3. **Player dies while animal fleeing** → Animal returns to rest state
4. **Chunk unloads with animals** → Save animal state, respawn on reload
5. **Winter = no spawns** → Show message: "Animals are scarce in winter..."
6. **Bear attacks while in menu** → Pause AI when menu open
7. **Companion hunting same animal** → Companion takes priority, player can't harvest

---

## 📝 Notes

**From Minecraft to Survival Simulator!** 🏕️

This evolution is natural and exciting:
- Started: "Let's build blocks"
- Added: Food/hunger/thirst
- Added: Seasons/weather
- Adding: Hunting/cooking
- Future: Farming? NPCs? Trading?

**You're building a genuine survival experience!** The animal system ties everything together:
- Hunger system → needs food source
- Seasons → affects availability
- Companion → gets a real job
- Exploration → find rare animals
- Crafting → process meat into meals

This is **compelling gameplay** that keeps players engaged! 🎮✨

---

**Ready to start Phase 1?** Let me know and I'll create the `AnimalSystem.js` module! 🐰
