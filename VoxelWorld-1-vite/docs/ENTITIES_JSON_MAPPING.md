# 📋 Entities JSON Mapping Guide

**Purpose:** Convert complex `enemies.json` (D&D-style TTRPG stats) into simplified `entities.json` (auto-battler format)

---

## 🎯 Why Simplify?

The original `enemies.json` was designed for a manual D&D-style combat system with:
- D&D attributes (STR, DEX, CON, INT, WIS, CHA)
- Complex attack rolls (d20 + modifiers)
- Spell systems, resistances, vulnerabilities
- AI behavior notes for manual play

The **auto-battler system** needs simpler stats that the game can process automatically:
- **HP** - How much health
- **Attack** - How hard they hit
- **Defense** - How hard to hit
- **Speed** - Turn order priority
- **Abilities** - Special moves (simplified)

---

## 📊 Field Mapping

### Required Fields (Must Have)

| entities.json Field | Source | Conversion Formula | Example |
|---------------------|--------|-------------------|---------|
| `name` | `enemies.json → name` | Direct copy | "Rat" |
| `type` | Manual decision | "enemy" or "friendly" | "enemy" |
| `tier` | `enemies.json → level` | Use level as tier | 2 |
| `hp` | `enemies.json → hp` | Direct copy | 8 |
| `attack` | Derived from stats | `STR + (level / 2)` for melee<br>`DEX + (level / 2)` for ranged | 3 |
| `defense` | `enemies.json → ac` | Direct copy | 13 |
| `speed` | `enemies.json → stats.dex` | Direct copy from DEX | 5 |

### Optional Fields (Nice to Have)

| entities.json Field | Source | Notes |
|---------------------|--------|-------|
| `abilities` | `enemies.json → attacks` | Pick 1-2 attack names, simplify | ["Bite", "Quick Strike"] |
| `sprite_ready` | Manual | PNG filename for idle pose | "rat_ready_pose_enhanced.png" |
| `sprite_attack` | Manual | PNG filename for attack pose | "rat_attack_pose_enhanced.png" |
| `sprite_portrait` | Manual | JPEG filename for portrait | "rat.jpeg" |
| `description` | `enemies.json → ai_notes` | Shorten to 1 sentence | "A scrappy tunnel rat, fast and agile." |
| `craftable` | Manual decision | true/false - can players craft this? | true |
| `craft_materials` | Manual creation | What materials needed to craft | `{"dead_wood": 2, "leaf": 3}` |
| `drops` | `enemies.json → loot` | What this entity drops when defeated | ["rat_tail", "small_bones"] |

---

## 🔄 Conversion Examples

### Example 1: Rat (Simple Enemy)

**enemies.json:**
```json
"rat": {
  "name": "Rat",
  "level": 2,
  "hp": 8,
  "stats": { "str": 1, "dex": 5, "con": 2, "int": 1, "wis": 4, "cha": 1 },
  "attacks": [
    { "name": "Bite", "hit": "+5", "damage": "1d4+1" },
    { "name": "Swarm Attack", "hit": "+3", "damage": "1d6" }
  ],
  "ac": 13,
  "loot": ["rat_tail", "small_bones", "1d4_coins"]
}
```

**entities.json:**
```json
"rat": {
  "name": "Rat",
  "type": "enemy",
  "tier": 2,
  "hp": 8,
  "attack": 3,          // STR(1) + level/2(1) = 2, or DEX(5) for bite = 5, averaged to 3
  "defense": 13,        // Direct copy from ac
  "speed": 5,           // Direct copy from stats.dex
  "abilities": ["Bite", "Swarm Attack"],
  "sprite_ready": "rat_ready_pose_enhanced.png",
  "sprite_attack": "rat_attack_pose_enhanced.png",
  "sprite_portrait": "rat.jpeg",
  "description": "A scrappy tunnel rat, fast and agile.",
  "craftable": true,
  "craft_materials": {
    "dead_wood": 2,
    "leaf": 3
  }
}
```

### Example 2: Goblin Grunt (Basic Melee)

**enemies.json:**
```json
"goblin_grunt": {
  "name": "Goblin Grunt",
  "level": 1,
  "hp": 6,
  "stats": { "str": 2, "dex": 4, "con": 3, "int": 2, "wis": 3, "cha": 2 },
  "attacks": [
    { "name": "Pineapple Club", "hit": "+4", "damage": "1d6+1" },
    { "name": "Thrown Rock", "hit": "+4", "damage": "1d4" }
  ],
  "ac": 12,
  "loot": ["goblin_ear", "pineapple_club"]
}
```

**entities.json:**
```json
"goblin_grunt": {
  "name": "Goblin Grunt",
  "type": "enemy",
  "tier": 1,
  "hp": 6,
  "attack": 4,          // STR(2) + level/2(0.5) ≈ 2, but hit bonus is +4, use that
  "defense": 12,
  "speed": 4,
  "abilities": ["Club Smash", "Thrown Rock"],
  "sprite_ready": "goblin_grunt_ready_pose_enhanced.png",
  "sprite_attack": "goblin_grunt_attack_pose_enhanced.png",
  "sprite_portrait": "goblin_grunt.jpeg",
  "description": "Small green warrior with a pineapple club.",
  "craftable": true,
  "craft_materials": {
    "dead_wood": 3,
    "stone": 2
  }
}
```

### Example 3: Boss (Complex)

**enemies.json:**
```json
"goblin_king_krogg": {
  "name": "Goblin King Krogg",
  "level": 10,
  "hp": 120,
  "stats": { "str": 7, "dex": 5, "con": 8, "int": 5, "wis": 4, "cha": 8 },
  "attacks": [
    { "name": "Crown Smash", "hit": "+12", "damage": "3d8+6" },
    { "name": "Royal Command", "effect": "summon_guards" }
  ],
  "ac": 18,
  "legendary_actions": 3,
  "phases": [...],
  "loot": ["goblin_crown", "royal_weapon", "floor_key"]
}
```

**entities.json:**
```json
"goblin_king_krogg": {
  "name": "Goblin King Krogg",
  "type": "boss",
  "tier": 10,
  "hp": 120,
  "attack": 12,         // Use hit bonus from main attack
  "defense": 18,
  "speed": 5,
  "abilities": ["Crown Smash", "Summon Guards", "Berserker Rage"],
  "sprite_ready": "goblin_king_krogg_ready_pose_enhanced.png",
  "sprite_attack": "goblin_king_krogg_attack_pose_enhanced.png",
  "sprite_portrait": "goblin_king_krogg.jpeg",
  "description": "Mighty goblin ruler with explosive crown.",
  "craftable": false,   // Bosses aren't craftable
  "drops": ["goblin_crown", "royal_weapon"]
}
```

---

## 🎮 Attack Stat Calculation Guidelines

Since `enemies.json` has complex attack formulas, here's how to derive a simple **attack** value:

### Method 1: Use Hit Bonus (Recommended)
- Look at the primary attack's `hit` value (e.g., "+5")
- Remove the "+" sign, use that number as attack
- **Example**: `"hit": "+5"` → `"attack": 5`

### Method 2: Calculate from Stats (If no hit bonus)
For melee fighters:
```
attack = STR + (level / 2)
```

For ranged/agile fighters:
```
attack = DEX + (level / 2)
```

For magic users:
```
attack = INT + (level / 2)
```

### Method 3: Average Multiple Attacks
If entity has multiple attack types, average the hit bonuses:
```
attack = (attack1_hit + attack2_hit) / 2
```

---

## 🛠️ Craft Materials Guidelines

**Tier 1 (Level 1-3):**
- Use common materials: `dead_wood`, `stone`, `leaf`, `dirt`
- Total materials: 3-5 pieces
- Example: `{"dead_wood": 2, "leaf": 3}`

**Tier 2 (Level 4-7):**
- Add uncommon materials: `iron`, `bone`, `crystal`
- Total materials: 5-8 pieces
- Example: `{"stone": 3, "iron": 2, "bone": 1}`

**Tier 3 (Level 8-12):**
- Rare materials: `gold`, `skull`, `ancient_wood`
- Total materials: 8-12 pieces
- Example: `{"gold": 2, "crystal": 3, "skull": 1}`

**Tier 4+ (Level 13+):**
- Very rare materials: special biome items
- May require defeated boss drops
- Total materials: 12+ pieces

---

## 📝 Conversion Checklist

When converting a new entity from `enemies.json`:

- [ ] Copy `name` directly
- [ ] Decide `type` (enemy/friendly/boss)
- [ ] Copy `level` as `tier`
- [ ] Copy `hp` directly
- [ ] Calculate `attack` from hit bonus or stats
- [ ] Copy `ac` as `defense`
- [ ] Copy `stats.dex` as `speed`
- [ ] Simplify `attacks` array to 1-2 ability names
- [ ] Check if sprite files exist in `/assets/art/entities/`
- [ ] Write short 1-sentence `description`
- [ ] Decide if `craftable` (true for most, false for bosses)
- [ ] Create appropriate `craft_materials` for tier
- [ ] Optional: Add `drops` from `loot` array

---

## 🚨 Special Cases

### Entities Without All Sprites
Some entities only have portraits, no ready/attack poses:
```json
"sprite_ready": null,
"sprite_attack": null,
"sprite_portrait": "vine_creeper.jpeg"
```
The game will fall back to portrait or emoji.

### Non-Combatant Entities (Friendly)
```json
"ghost": {
  "type": "friendly",
  "craftable": true,
  "craft_materials": {
    "skull": 1,
    "dead_wood-leaves": 3
  }
}
```

### Boss Encounters
```json
"type": "boss",
"craftable": false,
"drops": ["special_key", "boss_weapon"]
```

---

## 🔮 Future Expansion

When adding new entities:

1. Add full stats to `enemies.json` (for reference/lore)
2. Convert to `entities.json` using this guide
3. Create sprite assets if possible
4. Add crafting recipe if craftable
5. Test in auto-battler system

---

*This guide ensures consistent conversion between the complex D&D system and our streamlined auto-battler format.*
