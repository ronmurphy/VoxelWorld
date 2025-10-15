# 👾 EntityPicker Component

Reusable entity selection component for Sargem Quest Editor. Loads entities from `art/entities/entities.json` for accurate game data.

## Features

- **Dynamic Entity Loading**:
  - Loads enemies from `entities.json` (rat, goblin_grunt, zombie_crawler, etc.)
  - Includes animals (cat, sheep, cow, chicken, birds)
  - Includes NPCs (villager, trader, blacksmith, guard, etc.)
  - Falls back to hardcoded list if JSON fails

- **Smart UI**:
  - Collapsible categories (Enemies expanded by default)
  - Real-time search with 300ms debounce
  - Visual selection indicator (checkmark + highlight)
  - Emoji + name display

- **Memory Efficient**:
  - Singleton pattern (one instance)
  - Event delegation (single listener per container)
  - Auto-cleanup on hide

## Entity Node (formerly Combat)

The **Entity** node replaces the old Combat node with enhanced functionality:

### Combat Checkbox ⚔️
- **Checked (true)**: Combat encounter - entity is hostile
- **Unchecked (false)**: Peaceful spawn - entity is friendly

### Node Preview
- Combat: `Fight 🧟 Zombie Crawler`
- Peaceful: `Spawn 🐱 Cat`

### Data Structure
```javascript
{
  entityId: 'zombie_crawler',
  combat: true,  // true = fight, false = peaceful spawn
  level: 5       // only used when combat = true
}
```

## Entities from JSON

The picker dynamically loads from `art/entities/entities.json`:

### Current Enemies
- **rat** (Rat) 🐀 - Tier 1
- **goblin_grunt** (Goblin Grunt) 👺 - Tier 1  
- **troglodyte** (Troglodyte) 🦧 - Tier 1
- **angry_ghost** (Angry Ghost) 👻 - Tier 2
- **vine_creeper** (Vine Creeper) 🌿 - Tier 2
- **zombie_crawler** (Zombie Crawler) 🧟 - Tier 2
- **skeleton_archer** (Skeleton Archer) 💀 - Tier 2

### Animals
- **cat** (Cat) 🐱 - New! With sit/walk animations
- **birdA** (Sparrow/Brown) 🐦 - New! Wings up/down
- **birdB** (Bluebird) 🐦 - New! Wings up/down
- sheep, cow, pig, chicken, fish

### NPCs
- villager, trader, blacksmith, guard, farmer, miner

## New Animal Sprites

### Cat 🐱
- `cat_sit.png` - Sitting pose
- `cat_walk_1.png` - Walk frame 1
- `cat_walk_2.png` - Walk frame 2

### Birds 🐦
**Sparrow (Brown)** - `birdA`
- `birdA_1.png` - Wings up (flying/upward flap)
- `birdA_2.png` - Wings down (sitting/landing/downward flap)

**Bluebird** - `birdB`
- `birdB_1.png` - Wings up (flying/upward flap)
- `birdB_2.png` - Wings down (sitting/landing/downward flap)

## Usage

```javascript
import { entityPicker } from './EntityPicker.js';

// Show picker
entityPicker.show(currentEntityId, (selectedEntity) => {
    console.log('Selected:', selectedEntity);
    // selectedEntity = { id: 'zombie_crawler', name: 'Zombie Crawler', emoji: '🧟', type: 'enemy' }
});
```

## Implementation Benefits

1. **Data-Driven**: Entities come from JSON - easy to add new ones
2. **Type Safety**: Distinguishes enemies, animals, NPCs
3. **Flexible**: Combat checkbox enables both hostile and peaceful encounters
4. **Scalable**: Add entities to JSON, picker updates automatically

## Future Enhancements
- Load NPCs from JSON (currently hardcoded)
- Load animals from JSON with sprite data
- Filter by entity type (enemies only, animals only, etc.)
- Show entity stats in picker tooltip

