# 🥕 Kitchen Bench - EXISTING INGREDIENTS ONLY

## ✅ **Currently Available in Game:**

### 🌾 **Grains/Crops:**
- **wheat** - Harvested from wheat_stage3
- **rice** - Harvested from rice crops  
- **corn_ear** - Harvested from corn crops

### 🥕 **Vegetables:**
- **carrot** - Harvested from carrot_stage3
- **potato** - Found in world (existing item)
- **pumpkin** - Harvested from pumpkin_stage3

### 🍓 **Fruits/Berries:**
- **berry** - Found in world (discovery item)

### 🍄 **Special Items:**
- **mushroom** - Found in world (discovery item)

---

## ❌ **NOT YET IN GAME** (Remove from recipes):
- ~~fish~~ - No fishing system yet
- ~~egg~~ - No chickens/animals yet
- ~~honey~~ - No beehives yet
- ~~apple~~ - No apple trees yet

---

## 🍳 **REVISED Kitchen Bench Recipes** (Only using existing ingredients)

### 🍞 **Basic Foods** (1 ingredient):
| Food | Ingredients | Buff |
|------|-------------|------|
| 🍞 Bread | 3x wheat | +30 stamina, 60s |
| 🥔 Baked Potato | 1x potato | +45 stamina, -20% drain, 90s |
| 🌽 Roasted Corn | 1x corn_ear | +25 stamina, 45s |
| 🎃 Pumpkin Soup | 1x pumpkin | +50 stamina, -15% drain, 75s |

### 🥗 **Combinations** (2 ingredients):
| Food | Ingredients | Buff |
|------|-------------|------|
| 🍲 Carrot Stew | 3x carrot + 1x potato | +60 stamina, +15% speed, 120s |
| 🫓 Berry Bread | 2x wheat + 4x berry | +50 stamina, 2x regen, 90s |
| 🥣 Mushroom Soup | 3x mushroom + 1x potato | +55 stamina, +25% speed, -15% drain, 120s |
| 🍚 Rice Bowl | 2x rice + 1x carrot | +40 stamina, +10% speed, 60s |
| 🍿 Corn Chips | 2x corn_ear + 1x wheat | +35 stamina, quick energy, 45s |

### 🍰 **Advanced** (3+ ingredients):
| Food | Ingredients | Buff |
|------|-------------|------|
| 🥗 Veggie Medley | 2x carrot + 1x potato + 1x mushroom | +80 stamina, +30% speed, 1.5x regen, 150s |
| 🥧 Pumpkin Pie | 1x pumpkin + 2x wheat + 3x berry | +100 stamina, -30% drain, +20% speed, 180s |
| 🍜 Super Stew | 2x potato + 2x carrot + 1x mushroom + 2x wheat | +120 stamina, +35% speed, -40% drain, 2x regen, 240s |
| 🌾 Grain Mix | 1x wheat + 1x rice + 1x corn_ear | +70 stamina, -25% drain, 120s |

### 🍪 **Quick Snacks**:
| Food | Ingredients | Buff |
|------|-------------|------|
| 🍓 Berry Snack | 5x berry | +20 stamina, 3x regen, 45s |
| 🥔 Potato Chips | 2x potato | +30 stamina, quick energy, 30s |
| 🍄 Mushroom Bites | 3x mushroom | +25 stamina, +20% speed, 60s |

---

## 🎨 **Brad's Idea for Missing Ingredients?**

Brad mentioned: *"i have an idea, and i can make some graphics... we can solve this 'need cooking items that dont exist in the game yet' easily with this idea"*

**Possibilities:**
1. **Treasure Chests** drop cooking ingredients?
2. **Special Blocks** that give food items when harvested?
3. **Quest Rewards** give rare ingredients?
4. **Merchant/Trading** system for ingredients?

**What's your solution, Brad?** 🤔

---

## 📦 **Current Ingredient Availability:**

```javascript
// What players can get RIGHT NOW:
✅ wheat (farming)
✅ carrot (farming) 
✅ potato (world discovery)
✅ pumpkin (farming)
✅ rice (farming)
✅ corn_ear (farming)
✅ berry (world discovery)
✅ mushroom (world discovery)

// What we'll add with Brad's idea:
❓ [Brad's solution here]
```

---

**Next Steps:**
1. Update KitchenBenchSystem.js to remove fish/egg/honey/apple recipes
2. Keep only the 15+ recipes using existing ingredients
3. Implement Brad's idea for rare/special ingredients
