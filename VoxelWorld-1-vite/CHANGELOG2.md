# VoxelWorld-1 Changelog (Continued)

Continuation of CHANGELOG.md for new development sessions.

---

## 2025-10-10 (Late Evening) - 🌾 Complete Farming System Polish & Visual Feedback

**Status: FULLY IMPLEMENTED ✅**

### 🎯 Session Overview

Polished the farming system with 3D crop models, proper harvesting mechanics, visual watering indicators, and full integration with the inventory system. The farming cycle is now complete: till → plant → water → harvest → replant!

---

### 🛠️ Tool System Refactoring

**Created CraftedTools.js Module** - Extracted crafted tool logic from VoxelWorld.js

**New File:**
- `src/CraftedTools.js` (161 lines) - Handles hoe, watering_can, grappling_hook, seed planting

**Key Methods:**
- `handleLeftClick(selectedSlot, pos)` - Hoe tilling on grass/dirt
- `handleRightClick(selectedSlot, pos, placePos)` - Grappling hook, watering can, seed planting
- `isSeedItem(selectedBlock)` - Check if item is a plantable seed
- `handleSeedPlanting(pos, selectedBlock)` - Plant seeds on tilled soil

**Integration:**
- VoxelWorld.js:10071-10076 - Left-click tool handling
- VoxelWorld.js:10121-10128 - Right-click tool handling with null safety

**Critical Fix - Tool Selection:**
- **Problem**: Hoe and watering_can were checking `hasEquippedTool()` which looked for tool ANYWHERE in playerbar, causing all right-clicks to be intercepted
- **Solution**: Changed to check only selected slot: `selectedItem === 'hoe' || selectedItem === 'crafted_hoe'`
- **Result**: Minecraft-style tool system - only highlighted item is active

**Critical Fix - HotbarSystem Synchronization:**
- **Problem**: `this.selectedSlot` (old) and `this.hotbarSystem.selectedSlot` were out of sync
- **Solution**: Changed all references to use `this.hotbarSystem.getSelectedSlot()`
- **Result**: Correct slot always selected, no more wrong items being used

**Critical Fix - crafted_ Prefix:**
- **Problem**: Hoe and watering_can had `toolType` property that bypassed "crafted_" prefix
- **Solution**: Removed `toolType` from blueprints, added auto-conversion in `giveItem()` command
- **Result**: All craftable tools now get "crafted_" prefix consistently

---

### 🌱 3D Crop Model System

**Visual Growth Indicators** - Crops now have 3D colored boxes + floating leaf sprites

**Implementation:**
- FarmingSystem.js:276-407 - Complete 3D model system with memory management

**Core Methods:**
- `create3DCropModel(x, y, z, cropType, growthStage)` - Create crop mesh + leaf indicators
- `createCropMesh(cropType, growthStage)` - BoxGeometry with stage-based colors and heights
- `createLeafIndicators(x, y, z, cropType, growthStage)` - 1-3 floating leaf sprites
- `remove3DCropModel(x, y, z)` - Dispose geometry, material, textures
- `disposeAllCropModels()` - Cleanup all models (chunk unload/shutdown)

**Crop Colors:**
- **Wheat**: Light green → Khaki → Goldenrod
- **Carrot**: Light green → Dark orange → Tomato red
- **Pumpkin**: Light green → Gold → Dark orange
- **Berry**: Forest green → Lime green → Deep pink

**Height Scaling:**
- Stage 1: 0.35 blocks tall
- Stage 2: 0.50 blocks tall
- Stage 3: 0.65 blocks tall

**Leaf Indicators:**
- Stage 1: 1 leaf 🍃
- Stage 2: 2 leaves 🍃🍃
- Stage 3: 3 leaves 🍃🍃🍃
- Float in circle above crop, emoji rendered on canvas texture

**Positioning Fix:**
- **Problem**: Crops were buried inside blocks
- **Solution**: Position at `y + 1 + (height/2)` to sit on top of blocks
- **Result**: Crops visible on top of tilled soil with proper clearance

**Wiring:**
- CropGrowthManager.js:58-61 - Create 3D model when planting seeds
- CropGrowthManager.js:176-178 - Update 3D model when crop grows
- CropGrowthManager.js:256-259 - Remove 3D model when crop destroyed
- FarmingSystem.js:157 - Remove 3D model when harvesting

---

### 🎮 Debug Command - growCrop()

**Bonemeal-like Instant Growth** - Test crop growth without waiting for day cycle

**Implementation:**
- VoxelWorld.js:6292-6341 - growCrop() function

**Features:**
- Uses same raycaster as "I" key (block inspector) for precise targeting
- Advances crop to next stage (1→2, 2→3)
- Updates block type and 3D model
- Shows status message with current stage
- Console logs crop details

**Targeting Fix:**
- **Problem**: Custom raycaster was "a bit off" compared to block inspector
- **Solution**: Use `this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera)` same as "I" key
- **Result**: Pixel-perfect targeting matching block inspector accuracy

**Usage:**
```javascript
// Aim at crop, then run in console:
growCrop()
// Output: 🌱 Crop grew to stage 2/3!
```

**Added to Debug Utilities:**
- VoxelWorld.js:6347 - Listed in console.log help

---

### 🌾 Crop Harvesting Integration

**Left-Click Mining System** - Harvesting mature crops works with standard mining mechanics

**Implementation:**
- VoxelWorld.js:5904-5916 - Crop detection in completeHarvesting()

**Flow:**
1. Check if block is harvestable using `farmingBlockTypes[blockType].harvestable`
2. Call `FarmingSystem.harvestCrop()` which:
   - Gets yield from CropGrowthManager (accounts for watering bonus)
   - Replaces crop with tilled_soil
   - Removes 3D crop model
   - Adds items to inventory
   - Shows status message
3. Early return prevents normal block harvesting

**Critical Fix - Block Type Handling:**
- **Problem**: `getBlock()` returns object `{type: "pumpkin_stage3"}`, but code used it directly as string
- **Solution**: Extract `.type` property: `const blockType = blockData?.type || blockData`
- **Result**: Harvesting works, proper crop detection

**Harvest Yields:**
- 🌾 Wheat: 1 wheat + 2 wheat_seeds
- 🥕 Carrot: 1 carrot + 2 carrot_seeds
- 🎃 Pumpkin: 1 pumpkin block + 3 pumpkin_seeds
- 🫐 Berry: 2 berries + 1 berry_seeds
- **Watered Bonus**: 2x yield if crop was watered before harvest!

**User Experience:**
```
1. Till soil with hoe (left-click)
2. Plant seeds (right-click tilled soil)
3. Water crops (right-click with watering_can)
4. Watch crops grow with 3D models
5. Hold left-click on mature crops
6. Harvest timer appears
7. Get crop blocks + seeds for replanting
8. Tilled soil remains for next crop
```

---

### 💧 Watered Soil Visual Indicator

**Darker Soil Color for Watered Crops** - Instant visual feedback for which crops are watered

**Implementation:**
- CropGrowthManager.js:105 - Call `updateSoilColor(x, y, z, true)` when watering
- CropGrowthManager.js:118-133 - `updateSoilColor()` method changes block mesh color
- CropGrowthManager.js:186 - Reset color when water expires (after 1 day)

**Color System:**
- **Dry Soil**: 0x6B4423 (normal brown)
- **Wet Soil**: 0x4A2F1A (darker brown)

**How It Works:**
1. When crop is watered → soil block mesh color changes to darker brown
2. Color persists for 1 in-game day
3. After day expires → soil automatically returns to normal brown
4. No texture files needed - just color manipulation

**Benefits:**
- Instant visual feedback (no waiting for animation)
- Easy to scan your farm and see which crops need watering
- Performant (just changing existing material color)
- Works with existing tilled_soil block

**User Decision:**
- User preferred color system over creating `tilled_soil_watered-all.png` texture
- Color change is clear, simple, and performs well
- Textures can be added later if requested

---

### 🎃 Bonus Feature - Ghost Pumpkin Attraction

**User Report:** "that one pumpkin that we grew together has 4 ghosts on it, and they dont move away from it :D"

**Existing Mechanic (From Previous Session):**
- Ghosts are attracted to pumpkins (holding or placed)
- When pumpkin placed as block → ghosts orbit around it
- Creates spooky ambient decoration
- Ghosts stay near pumpkin until it's removed

**Result:** Fun emergent gameplay where farming pumpkins creates ghost gathering spots! 👻🎃

---

### 📝 Files Modified

**New File:**
- `src/CraftedTools.js` (161 lines) - Tool handler extraction

**Modified Files:**
- `src/FarmingSystem.js`:
  - Line 12: Added THREE.js import
  - Lines 134-142: Fixed harvestCrop() block type extraction
  - Lines 157: Remove 3D model when harvesting
  - Lines 276-407: Complete 3D crop model system
- `src/CropGrowthManager.js`:
  - Lines 58-61: Create 3D model on planting
  - Lines 105: Update soil color on watering
  - Lines 118-133: updateSoilColor() method
  - Lines 176-178: Update 3D model on growth
  - Lines 186: Reset soil color when water expires
  - Lines 256-259: Remove 3D model on destruction
- `src/VoxelWorld.js`:
  - Line 27: Import CraftedTools
  - Lines 179-181: Initialize craftedTools
  - Lines 5904-5916: Crop harvesting in completeHarvesting()
  - Lines 6292-6341: growCrop() debug command
  - Line 6347: Added growCrop to debug utilities list
  - Lines 10071-10076: Left-click tool handling
  - Lines 10121-10128: Right-click tool handling
- `src/ToolBenchSystem.js`:
  - Lines 144-170: Removed toolType from hoe/watering_can blueprints

---

### 🐛 Bug Fixes

1. **Tool Selection Overlap** ✅
   - Hoe/watering_can no longer block grappling hook
   - Only highlighted item is active (Minecraft-style)

2. **HotbarSystem Synchronization** ✅
   - Fixed selectedSlot out of sync issue
   - All tools now use correct slot

3. **crafted_ Prefix Missing** ✅
   - All craftable tools now get prefix
   - Proper equipping to tool slots

4. **3D Models Buried** ✅
   - Crops now sit on top of blocks
   - Proper Y positioning with height offset

5. **growCrop() Targeting** ✅
   - Now uses block inspector raycaster
   - Pixel-perfect targeting

6. **Harvest Block Type** ✅
   - Fixed getBlock() object vs string handling
   - Crops harvest correctly with proper yields

7. **3D Models Not Removed** ✅
   - Models properly disposed when harvesting
   - No floating models after harvest

---

### 🎯 Complete Farming Cycle

**Fully Functional System:**
1. ✅ **Tilling** - Hoe on grass/dirt → tilled_soil
2. ✅ **Planting** - Seeds on tilled_soil → stage 1 crop + 3D model
3. ✅ **Growth** - Crops progress through 3 stages with visual 3D models
4. ✅ **Watering** - Watering can → darker soil + 2x growth speed
5. ✅ **Harvesting** - Left-click → harvest timer → crop + seeds + 3D model removed
6. ✅ **Replanting** - Soil remains tilled for next crop

**4 Crop Types Available:**
- 🌾 Wheat (10 days/stage, 1 wheat + 2 seeds)
- 🥕 Carrot (10 days/stage, 1 carrot + 2 seeds)
- 🎃 Pumpkin (15 days/stage, 1 pumpkin + 3 seeds)
- 🫐 Berry (12 days/stage, 2 berries + 1 seed)

**Visual Feedback:**
- 3D colored boxes show crop type and growth stage
- Floating leaf indicators show stage (1-3 leaves)
- Darker soil shows which crops are watered
- All visuals clean up properly on harvest

---

### 📋 Next Steps (TODO)

**Crop Expansion:**
- 🌽 Add corn crop (art ready: corn_ear.png)
- 🍚 Add rice crop with rice paddy mechanics (water-based farming)
- 🍅 Add tomato, potato, or other varieties
- Design rice paddy water interaction system

**Use Existing Art Assets:**
- `/assets/art/food/` has corn_ear.png and rice.png ready
- Current crops should also use food folder art assets
- Berry, wheat, carrot, pumpkin all have existing graphics

**Future Enhancements:**
- More crop varieties (tomato, corn, rice, potato)
- Rice paddies (water-based farming mechanic)
- Crop-specific 3D models instead of colored boxes
- Seasonal crops
- Fertilizer system

---

### 🎉 Session Success

The farming system is now feature-complete and polished! All core mechanics work smoothly:
- Clean tool system with proper Minecraft-style selection
- Beautiful 3D crop models with proper positioning
- Visual watering indicators with color feedback
- Full harvest cycle with proper yields
- Ghost pumpkin attraction creates fun emergent gameplay

The foundation is solid and ready for expansion with more crop types! 🌾

---
