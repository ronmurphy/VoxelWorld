# Art TODO List

**What PNG art you actually need to make.**

---

## 🎨 Must Make PNG (Required)

### Blocks (~15 items) - PRIORITY 1
These **must** have PNG textures for the voxel world:

- [ ] `stone` - Stone block texture
- [ ] `dirt` - Dirt block texture
- [ ] `grass` - Grass block texture (top/sides)
- [ ] `wood` - Wood/log block texture
- [ ] `sand` - Sand block texture
- [ ] `gravel` - Gravel block texture
- [ ] `coal_ore` - Coal ore texture
- [ ] `iron_ore` - Iron ore texture
- [ ] `gold_ore` - Gold ore texture
- [ ] `diamond_ore` - Diamond ore texture
- [ ] `leaves` - Leaf block texture
- [ ] `glass` - Glass block texture
- [ ] `brick` - Brick block texture
- [ ] `planks` - Wooden planks texture

**Estimated time:** 2-3 hours (if using procedural generation or existing assets)

---

### Tools/Items with No Emoji (~5 items) - PRIORITY 2
These items don't have emoji equivalents by name:

- [ ] `machete` - No "machete" emoji (🔪 is just "knife")
- [ ] `grappling_hook` - No grappling hook emoji (🪝 is generic "hook")
- [ ] `compass` - Optional (🧭 exists but you might want custom)
- [ ] `map` - Optional (🗺️ exists but you might want custom)
- [ ] `telescope` - Optional (🔭 exists but you might want custom)

**Estimated time:** 1-2 hours

---

## ✅ Auto-Detected (NO WORK NEEDED!)

These items **automatically work** because emoji exists:

### Discovery Items
✅ `skull` → 💀 (auto-detected)
✅ `bone` → 🦴 (auto-detected)
✅ `feather` → 🪶 (auto-detected)
✅ `mushroom` → 🍄 (auto-detected)
✅ `flower` → 🌸 (auto-detected)
✅ `crystal` → 💎 (auto-detected)
✅ `shell` → 🐚 (auto-detected)

### Food Items
✅ `bread` → 🍞 (auto-detected)
✅ `fish` → 🐟 (auto-detected)
✅ `carrot` → 🥕 (auto-detected)
✅ `pumpkin` → 🎃 (auto-detected)
✅ `apple` → 🍎 (auto-detected)
✅ `berry` → 🫐 (auto-detected)

### Tools (if emoji exists for name)
✅ `pickaxe` → ⛏️ (auto-detected)
✅ `axe` → 🪓 (auto-detected)
✅ `hammer` → 🔨 (auto-detected)
✅ `wrench` → 🔧 (auto-detected)
✅ `sword` → ⚔️ (auto-detected)
✅ `bow` → 🏹 (auto-detected)
✅ `shield` → 🛡️ (auto-detected)

**Total auto-detected: ~30+ items with ZERO work!**

---

## 🎯 Optional Custom Art

You can **optionally** make PNG for these if you want a unique look:

### Tools (have emoji but you might want custom)
- `stone_pickaxe` - ⛏️ works, but custom stone texture might be cool
- `iron_pickaxe` - ⛏️ works, but custom iron look might be cool
- `diamond_pickaxe` - ⛏️ works, but custom diamond sparkle might be cool
- `speed_boots` - 👢 works, but custom glowing boots might be cooler

### Signature Items (if these define your game)
- `grappling_hook` - Make it YOUR unique design
- `magic_amulet` - Make it fit your game's magic style

**Only do these if:**
1. You're excited about making the art
2. You want brand consistency
3. Players are asking for it

---

## 📊 Priority Summary

```
MUST MAKE (Required):
┌─────────────────────────────┐
│ 15 Blocks                   │  ← Do these first!
│ 5 No-emoji items            │     Can't ship without
│ Total: ~20 items            │
│ Time: 3-5 hours             │
└─────────────────────────────┘

AUTO-DETECTED (Zero work):
┌─────────────────────────────┐
│ 30+ Items                   │  ← Already works!
│ Time: 0 minutes             │     Nothing to do
└─────────────────────────────┘

OPTIONAL (Nice to have):
┌─────────────────────────────┐
│ 5-10 Custom items           │  ← Only if you want
│ Time: 2-5 hours             │     Not required
└─────────────────────────────┘
```

---

## 🚀 Recommended Order

### Week 1: Minimum Viable Art
1. **Block textures** (15 items, required)
   - Use procedural generation or find CC0 textures
   - These are essential for the voxel world

2. **No-emoji tools** (5 items, required)
   - machete, grappling_hook
   - These can't use emoji fallback

**Ship with this! Everything else uses emoji automatically.**

### Week 2+: Optional Polish
3. **Custom tool variants** (optional)
   - stone_pickaxe, iron_pickaxe, diamond_pickaxe
   - Only if you want unique look per material

4. **Signature items** (optional)
   - Make YOUR grappling hook iconic
   - Add YOUR game's magic style

---

## 💡 Pro Tips

### Finding/Making Block Textures Fast
- **Use procedural generation** (code generates textures)
- **CC0 texture packs** (OpenGameArt, Kenney.nl)
- **Blender procedural materials** (quick texture generation)
- **Simple patterns** (stone = gray noise, grass = green gradient)

### Tools/Items Art
- **Keep it simple** - 32x32 or 64x64 is fine
- **Silhouette matters** - Should be recognizable at small size
- **Consistent style** - Emoji + custom PNG can mix well if style matches

### Testing
```javascript
// Browser console
window.craftingUI.getItemIcon('skull')      // Should return emoji
window.craftingUI.getItemIcon('machete')    // Should return PNG or 🚫
window.craftingUI.getItemIcon('stone')      // Should return PNG or 🚫
```

---

## ✅ Completion Checklist

**Can ship when:**
- [ ] All block textures done (15 PNG)
- [ ] machete PNG done (1 PNG)
- [ ] grappling_hook PNG done (1 PNG)
- [ ] All other items use auto-detected emoji ✅

**That's it! ~17 PNG total, instead of 50+!** 🎉

---

**Next Steps:**
1. Make block textures (highest priority)
2. Make machete + grappling_hook PNG
3. Test in game with emoji for everything else
4. Ship! 🚀
5. Add optional custom art later based on feedback
