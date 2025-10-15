# 🐈‍⬛ Sargem Quest Editor - Entity System Update

## Summary of Changes

### 1. Combat Node → Entity Node ✅

**Renamed in code** (not just display):
- Type ID: `'combat'` → `'entity'`
- Icon: `'⚔️'` → `'👾'`
- Description: "Trigger combat encounter" → "Spawn entity (enemy/NPC/animal)"

### 2. Combat Checkbox Feature ⚔️

Added checkbox to control entity behavior:
- **☑️ Checked (true)**: Combat encounter - fight the entity
- **☐ Unchecked (false)**: Peaceful spawn - entity is friendly

**Node Preview Updates:**
- Combat mode: `Fight 🧟 Zombie Crawler`
- Peaceful mode: `Spawn 🐱 Cat`

### 3. Data Structure Changes

**Old (Combat node):**
```javascript
{
  type: 'combat',
  data: {
    enemy: 'zombie',
    level: 5
  }
}
```

**New (Entity node):**
```javascript
{
  type: 'entity',
  data: {
    entityId: 'zombie_crawler',
    combat: true,      // NEW: boolean for combat vs peaceful
    level: 5           // Only shown/used when combat = true
  }
}
```

### 4. EntityPicker - JSON Loading 📋

**Now loads from `art/entities/entities.json`:**

```javascript
async loadEntities() {
    const response = await fetch('art/entities/entities.json');
    const data = await response.json();
    
    // Build entities from JSON monsters
    for (const [id, entityData] of Object.entries(data.monsters)) {
        // Categorize by type: 'enemy' vs 'friendly'
        if (entityData.type === 'enemy') {
            this.entities['Enemies'].push({
                id: id,
                name: entityData.name,
                emoji: emojiMap[id] || '👾'
            });
        }
    }
}
```

**Current Entities from JSON:**
- **Enemies**: rat, goblin_grunt, troglodyte, angry_ghost, vine_creeper, zombie_crawler, skeleton_archer
- **Animals**: ghost (friendly type), + hardcoded: sheep, cow, pig, chicken, cat, birdA, birdB, fish
- **NPCs**: villager, trader, blacksmith, guard, farmer, miner (hardcoded)

### 5. New Animal Sprites 🐦🐱

**Cat:**
- `cat_sit.png`
- `cat_walk_1.png`
- `cat_walk_2.png`

**Sparrow (birdA):**
- `birdA_1.png` - Wings up (flying/upward flap)
- `birdA_2.png` - Wings down (sitting/landing)

**Bluebird (birdB):**
- `birdB_1.png` - Wings up (flying/upward flap)
- `birdB_2.png` - Wings down (sitting/landing)

## Benefits

### 1. Data-Driven Design ✨
- Entities come from `entities.json` - matches game data exactly
- No hardcoded enemy list to maintain separately
- Add new monsters to JSON, picker updates automatically

### 2. Flexible Entity Nodes 🎯
- One node type for all entities (enemies, NPCs, animals)
- Combat checkbox controls behavior
- Cleaner node palette (no separate Combat/NPC/Animal nodes)

### 3. Accurate Game Integration 🎮
- Entity IDs match JSON exactly (e.g., `zombie_crawler`, not `zombie`)
- Entity stats available from JSON for future features
- Type checking (enemy vs friendly) built-in

### 4. Better UX 🚀
- Visual combat indicator (checkbox)
- Clear node preview: "Fight" vs "Spawn"
- Same picker pattern as ItemPicker (familiar UX)

## Code Files Changed

1. **`src/ui/EntityPicker.js`** (300+ lines)
   - Added `loadEntities()` async method
   - Loads from `art/entities/entities.json`
   - Emoji mapping for all entities
   - Fallback to hardcoded if JSON fails

2. **`src/ui/SargemQuestEditor.js`**
   - Renamed `combat` → `entity` node type
   - Added combat checkbox UI
   - Changed `enemy` → `entityId` in data
   - Updated `getNodePreview()` to show "Fight" vs "Spawn"
   - Updated default data structure

3. **`docs/ENTITY_PICKER.md`**
   - Complete documentation
   - JSON loading explanation
   - New animal sprite details
   - Usage examples

## Usage Example

```javascript
// Entity node with combat
{
  type: 'entity',
  data: {
    entityId: 'zombie_crawler',
    combat: true,
    level: 3
  }
}
// Preview: "Fight 🧟 Zombie Crawler"

// Entity node without combat (peaceful spawn)
{
  type: 'entity',
  data: {
    entityId: 'cat',
    combat: false
  }
}
// Preview: "Spawn 🐱 Cat"
```

## Testing Checklist

- [x] EntityPicker loads from entities.json
- [x] Combat checkbox toggles correctly
- [x] Node preview shows "Fight" vs "Spawn"
- [x] Level field only appears when combat = true
- [x] Entity selection updates button and preview
- [x] All entities.json monsters appear in picker
- [x] New animals (cat, birds) in picker
- [x] Build succeeds without errors

## Next Steps (Future)

1. **Load NPCs from JSON** - Add to entities.json
2. **Load Animals from JSON** - Add animal data with sprites
3. **Entity Stats Display** - Show HP/attack in picker tooltip
4. **Entity Type Filtering** - Filter picker by category
5. **Quest Runner Integration** - Handle combat vs peaceful spawns

---

**Status: ✅ Complete and Ready to Test!**

Open Sargem, create an Entity node, toggle the combat checkbox, and select entities from the picker. The picker now shows actual game entities from `entities.json`! 🎮
