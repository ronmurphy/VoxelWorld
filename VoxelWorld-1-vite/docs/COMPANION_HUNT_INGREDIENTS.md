# 🎯 CompanionHunt System - Required Graphics

## Overview
The CompanionHunt system will allow players to send companions on hunting/gathering expeditions to obtain rare ingredients that don't exist as blocks in the world.

## 🎨 Graphics Needed

### Rare Ingredients (Obtainable via CompanionHunt)

1. **🐟 Fish**
   - Category: Protein
   - Effects: protein, filling
   - Base Stamina: 25
   - Used in:
     - Grilled Fish (🍣)
     - Fish & Rice (🍱)
     - Super Stew (🍜)

2. **🥚 Egg**
   - Category: Protein
   - Effects: protein, energy
   - Base Stamina: 10
   - Currently not used in any recipes (future expansion)

3. **🍯 Honey**
   - Category: Special
   - Effects: sweet, energy, healing
   - Base Stamina: 15
   - Used in:
     - Honey Bread (🥖)
     - Pumpkin Pie (🥧)
     - Berry-Honey Snack (🍪)
     - Energy Bar (🍫)

4. **🍎 Apple**
   - Category: Fruit
   - Effects: sweet, healthy
   - Base Stamina: 5
   - Currently not used in any recipes (future expansion)

## 📊 Recipe Impact

### Recipes Unlocked by CompanionHunt:

#### Simple (1 ingredient):
- **Grilled Fish** 🍣 - fish × 1
  - +75 stamina, +20% speed for 1min

#### Medium (2 ingredients):
- **Fish & Rice** 🍱 - fish × 1, rice × 2
  - +100 stamina, -30% drain for 3min

- **Honey Bread** 🥖 - wheat × 2, honey × 1
  - +70 stamina, +20 HP, 3x regen for 2min

#### Advanced (3+ ingredients):
- **Pumpkin Pie** 🥧 - pumpkin × 1, wheat × 2, honey × 1
  - +120 stamina, -40% drain, +20% speed for 4min (LEGENDARY!)

- **Super Stew** 🍜 - fish × 1, potato × 2, carrot × 1, mushroom × 1
  - +150 stamina, +40% speed, -50% drain, 2x regen, +30 HP for 5min (ULTIMATE!)

#### Quick Snacks:
- **Berry-Honey Snack** 🍪 - berry × 3, honey × 1
  - +40 stamina, 4x regen for 1min

- **Energy Bar** 🍫 - wheat × 1, honey × 1, berry × 2
  - +60 stamina, +50% speed for 1.5min

## 🎮 CompanionHunt Mechanics (To Be Implemented)

### System Design:
- Send companion away for **0.5, 1, or 2 game-days**
- Companion portrait vanishes during hunt
- Success/fail probability based on duration (longer = better odds)
- Returns with rare ingredients + occasional discovery items
- Gives companions purpose beyond combat

### Success Rate Formula (suggested):
- 0.5 days: 30% success rate
- 1.0 days: 60% success rate
- 2.0 days: 90% success rate

### Potential Returns:
- **Common**: fish, apple (easier to find)
- **Uncommon**: egg (requires finding nests)
- **Rare**: honey (requires finding beehives)
- **Bonus**: Random discovery items (skull, feather, crystal, etc.)

## 📝 Graphics Checklist

### CompanionHunt Ingredients (PNG format for /assets/art/food/ folder):
- [ ] `fish.png` - 🐟 Fish icon
- [ ] `egg.png` - 🥚 Egg icon
- [ ] `honey.png` - 🍯 Honey icon (honey jar or beehive?)
- [ ] `apple.png` - 🍎 Apple icon

### Optional: Harvested Ingredient Icons (if you want to replace emojis):
- [ ] `wheat.png` - 🌾 Wheat
- [ ] `carrot.png` - 🥕 Carrot (already have carrot_seeds.png)
- [ ] `potato.png` - 🥔 Potato
- [ ] `pumpkin.png` - 🎃 Pumpkin (already have pumpkin_seeds.png)
- [ ] `berry.png` - 🫐 Berry (already have berry_seeds.png)
- [ ] `mushroom.png` - 🍄 Mushroom

### Optional: Cooked Food Icons (if you want fancy graphics):
- [ ] `bread.png` / `roasted_wheat.png` - 🍞 Bread
- [ ] `baked_potato.png` - 🥔 Baked Potato
- [ ] `grilled_fish.png` - 🍣 Grilled Fish
- [ ] `carrot_stew.png` - 🍲 Carrot Stew
- [ ] `mushroom_soup.png` - 🥣 Mushroom Soup
- [ ] `fish_rice.png` - 🍱 Fish & Rice
- [ ] `honey_bread.png` - 🥖 Honey Bread
- [ ] `pumpkin_pie.png` - 🥧 Pumpkin Pie
- [ ] `super_stew.png` - 🍜 Super Stew
- [ ] (and more...)

**Location**: Place in `/assets/art/food/` folder

**Fallback**: Emojis are already configured for all items, so graphics are optional enhancements!

### Suggested Style:
- Match existing ingredient style (clean, voxel-friendly)
- 64x64 or 128x128 resolution
- Transparent background
- Bold colors for visibility in hotbar
- Your trained Lora art style! 🎨

## 🔄 Current Status

✅ **Kitchen Bench System**: Complete
✅ **All recipes defined**: Including CompanionHunt ingredient recipes
✅ **Buff system**: Working (stamina, speed, drain reduction, regen, healing)
✅ **UI button (K key)**: Implemented
✅ **Icon support**: kitchenbench.png wired up

⏳ **Awaiting CompanionHunt Implementation**: Task 7
⏳ **Awaiting Graphics**: fish.png, egg.png, honey.png, apple.png

## 💡 Future Recipe Ideas (Using Eggs)

Once eggs are obtainable:
- **Fried Egg** 🍳 - egg × 1 (quick breakfast)
- **Veggie Omelet** 🥚 - egg × 2, carrot × 1, mushroom × 1
- **Rice & Egg Bowl** 🍚 - rice × 2, egg × 1
- **Apple Pie** 🍎 - apple × 2, wheat × 2, honey × 1

## 📂 Related Files
- `/src/KitchenBenchSystem.js` - Full recipe definitions
- `/src/VoxelWorld.js` - Kitchen bench integration
- `/src/WorkbenchSystem.js` - Kitchen bench crafting (2 oak_wood + 2 pine_wood + iron + coal)
- `/docs/KITCHEN_BENCH_SYSTEM.md` - Complete system documentation
