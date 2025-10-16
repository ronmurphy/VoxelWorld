# 🎮 VoxelWorld - Updated Game Direction & Roadmap

**Date:** October 15, 2025  
**Status:** Phase 1 - Core Survival Systems

---

## 🎯 Game Vision: Survival Defense with Progression

A **survival-focused voxel game** where players must defend against increasingly difficult threats while building, crafting, and exploring.

### Core Pillars:
1. **⚔️ Survival Combat** - Fight to stay alive during blood moon cycles
2. **🏗️ Base Building** - Construct defenses and shelters
3. **📈 Progression** - Unlock better gear, companions, and abilities
4. **🌍 Exploration** - Discover ruins, resources, and secrets

---

## 🔴 Blood Moon Cycle System

### 7-Day Cycle
- **Days 1-6:** Peaceful exploration, gathering, building
- **Day 7:** Blood Moon - **massive enemy spawns**
- **Progressive Difficulty:** Each cycle gets harder

### Blood Moon Mechanics
- Enemies spawn in waves throughout the night
- Increased enemy count each cycle (Week 1: 10 enemies → Week 10: 100+ enemies)
- Enemies target player base/defenses
- Survive until sunrise to complete the cycle

### Player Preparation
- Days 1-6: Gather resources, craft weapons, build walls
- Strategic base placement near resources but defensible
- Crafting system for better tools, weapons, armor
- Light sources to prevent spawns near base

---

## 🏃 Stamina Rebalance (PRIORITY)

### Current Issues:
- Movement drains stamina too fast
- Resource gathering feels punishing
- Combat becomes stamina-starved quickly

### New Stamina Design:

#### Movement (REDUCED)
- **Walking:** ~0.5-1 stamina/second (down from current)
- **Sprinting:** 5 stamina/second
- **Jumping:** 2 stamina per jump
- Goal: Allow free exploration without constant stamina anxiety

#### Gathering (NEARLY FREE)
- **Basic gathering:** 0-1 stamina per action
  - Picking flowers, berries, mushrooms: FREE
  - Breaking grass, leaves: FREE
  - Mining stone/wood: 1-2 stamina
- **Power tools (later):** 0 stamina (uses tool durability instead)
- Goal: Encourage gathering without tedium

#### Combat (SAME)
- **Sword swing:** 10 stamina
- **Bow shot:** 15 stamina
- **Blocking:** 5 stamina/hit
- Combat should be strategic and resource-intensive

#### Stamina Recovery
- **Standing still:** 20 stamina/second
- **Walking slowly:** 10 stamina/second
- **After combat:** Brief recovery period with boosted regen
- **Food buffs:** Certain foods increase max stamina or regen rate

---

## 🏠 Structure System (StructureGenerator)

### Simple House (4×4×4)
**Player-Placeable Shelter**

Dimensions:
- **Interior:** 4×4×4 blocks (walkable space)
- **Walls:** 1 block thick (wood)
- **Floor:** 1 block thick (stone)
- **Roof:** Sloped (2 block rise from door side to back)

Features:
- Door facing player on placement
- Sloped roof for rain runoff
- Quick shelter for early game
- Costs: ~16 wood blocks + ~20 stone blocks

Door Side:
```
ROOF (sloped)
   /|
  / |
 /  | ← 4 blocks tall + 2 roof slope
|   |
|___|
DOOR
```

### Procedural Ruins (Exploration)
- Small/Medium/Large/Colossal sizes
- Various shapes (square, L-shape, T-shape, circle, etc.)
- Biome-specific materials
- Treasure spawns inside
- Discoveries tracked on minimap

---

## 🐱 Companion System (Sargem Integration)

### Companion Features
- **Cats** - New graphics ready (sit, walk_1, walk_2)
- **Birds** - Sparrow & Bluebird (wing up/down animations)
- **Dialogue** - Context-aware tips and story
- **Combat Support** - Companions can fight (unlockable)

### Quest System (Sargem Editor)
- Visual node-based editor
- Quest types:
  - **Dialogue** - Story and tutorials
  - **Choice** - Branching decisions
  - **Entity** - Combat or peaceful spawns
  - **Item** - Give/take/check items
  - **Condition** - Check inventory/state
  - **Trigger** - Fire game events
  - **Image** - Show pictures

### Entity Node (Combat Toggle)
- ☑️ **Combat:** True = fight enemy
- ☐ **Peaceful:** False = friendly spawn
- Loads enemies from `entities.json`
- Current enemies: rat, goblin_grunt, zombie_crawler, skeleton_archer, etc.

---

## 📦 Crafting & Items (ItemPicker)

### Tool Categories
- **Tools:** Pickaxe, Axe, Shovel, Machete, Fishing Rod, Bow, Sword, Hammer
- **Food:** Bread, Honey, Fish, Berries, Apples, Carrots, Wheat, Super Stew
- **Materials:** Wood, Stone, Iron, Gold, Stick, String, Feather, Bone
- **World Items:** Torch, Campfire, Light Orb, Chest, Door, Ladder
- **Blocks:** Dirt, Grass, Sand, Gravel, Clay, Snow
- **Seeds:** Wheat, Carrot, Berry, Pumpkin, Corn

### Crafting Recipes (To Implement)
- **Simple House:** 16 oak_wood + 20 stone
- **Wooden Sword:** 2 stick + 4 oak_wood
- **Torch:** 1 stick + 1 coal
- **Campfire:** 4 oak_wood + 1 stone

---

## 🗺️ World & Exploration

### Biomes (Enhanced Graphics)
- **Desert** - Sandstone ruins, cacti
- **Mountain** - Stone structures, ore deposits
- **Tundra** - Snow-covered ruins, ice
- **Forest** - Wood-accent ruins, dense trees
- **Plains** - Grass/dirt ruins, open spaces

### Discovery System
- Ruins appear on minimap when discovered
- Track exploration progress
- Hidden treasures and lore items
- Rare enemy spawns in distant ruins

---

## 🎮 Game Loop

### Early Game (Cycles 1-3)
1. **Day 1-2:** Gather basic resources (wood, stone, food)
2. **Day 3-4:** Build simple house, craft tools
3. **Day 5-6:** Explore nearby, find ruins, gather iron
4. **Day 7:** Survive first blood moon (10-15 enemies)

### Mid Game (Cycles 4-7)
1. Build stone walls around base
2. Craft better weapons (iron sword, bow)
3. Unlock companion combat abilities
4. Explore mountain biomes for rare ores
5. Blood moons get harder (20-40 enemies)

### Late Game (Cycles 8+)
1. Colossal bases with multiple defense layers
2. Legendary weapons and armor
3. Companion evolution/upgrades
4. Blood moons become epic battles (50-100+ enemies)
5. Boss enemies appear

---

## 🚀 Implementation Priorities

### Phase 1: Core Survival (Current)
- [x] Sargem Quest Editor polish (Entity picker, Item picker, Debug refresh)
- [x] Entity system (enemies from JSON, combat toggle)
- [ ] **Stamina rebalance** (reduce movement cost, free gathering)
- [ ] **Simple house fix** (4×4×4 correct dimensions)
- [ ] Blood moon cycle system (7-day timer)
- [ ] Enemy wave spawning

### Phase 2: Combat & Defense
- [ ] Combat mechanics refinement
- [ ] Blocking/dodging system
- [ ] Base defense mechanics (walls, traps)
- [ ] Enemy AI improvements (target base, break blocks)

### Phase 3: Progression
- [ ] Crafting system UI
- [ ] Item unlocks and progression
- [ ] Companion leveling/evolution
- [ ] Skill tree or perk system

### Phase 4: Content & Polish
- [ ] More enemies and bosses
- [ ] Advanced structures (castles, towers)
- [ ] Story/lore through quests
- [ ] Biome-specific challenges

---

## 🐈‍⬛ Sargem Quest Editor - Complete Features

### Node Types ✅
- **Dialogue** - NPC/companion speech
- **Choice** - Branching decisions
- **Image** - Visual storytelling
- **Entity** - Spawn enemies/NPCs/animals (combat toggle)
- **Item** - Inventory management
- **Condition** - State checking
- **Trigger** - Game events

### Pickers ✅
- **ItemPicker** - 47 items, 6 categories, search
- **EntityPicker** - Loads from entities.json, 3 categories
- **FilePicker** - Browse art/pictures for Image nodes

### UX Polish ✅
- Visual node connections
- Live preview updates
- Debug JSON with refresh button
- Auto-save to localStorage
- Export/Import .json files
- Test runner integration

---

## 📝 Technical Notes

### Performance
- Chunk-based loading (16×16)
- LOD system for distant terrain
- Worker threads for generation
- Minimap tracking with discovery system

### Save System
- Persistent world state
- Inventory and progression
- Quest/tutorial completion tracking
- Blood moon cycle progress

### Asset Pipeline
- Dynamic entity loading from JSON
- Manifest system for textures
- Emoji fallbacks for UI
- Sprite animation system ready (cat, birds)

---

**Next Steps:**
1. Fix simple house dimensions (4×4×4)
2. Implement stamina rebalance
3. Build blood moon cycle timer
4. Create enemy wave spawning system
5. Add crafting UI for simple house placement

**Goal:** Playable survival loop with blood moon by end of week! 🎮
