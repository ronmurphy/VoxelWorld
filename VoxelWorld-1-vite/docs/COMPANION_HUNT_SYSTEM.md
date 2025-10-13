# 🐕 CompanionHunt System - Revolutionary Exploration Mechanic

## Overview
The **CompanionHunt System** is a groundbreaking feature that transforms companions from passive followers into active explorers. Companions venture out into the world, discover rare ingredients, and mark their findings on your maps for you to collect!

## 🎮 Core Mechanics

### **Expedition System**
- **Send companion** on hunting/gathering expeditions
- **Choose duration**: 0.5, 1, or 2 game-days
- **Real-time tracking**: Watch companion as cyan dot on minimap
- **Discovery notifications**: Get alerts when items are found
- **Collection gameplay**: Travel to marked locations to collect loot

### **Movement & Pathfinding**
- **Speed**: 2 chunks per in-game minute (32 blocks/minute)
- **Smart pathing**: Random walk biased outward from start
- **Halfway turn**: Companion returns at 50% expedition time
- **Always returns**: Companion reaches home by expedition end
- **Visual trail**: Path shows on minimap (fading line)

### **Discovery Mechanics**
- **Check every minute**: Roll for discoveries at each position
- **Biome-based loot**: Different items per terrain type
- **Purple markers**: Discoveries marked on minimap + journal
- **Billboard items**: Physical world items at discovery locations
- **One-time collection**: Items despawn after pickup

## 🗺️ Visual System

### **Map Markers**
1. **Cyan Dot** 🔵 - Active companion location (real-time)
2. **Purple Dot** 🟣 - Discovered item location (persistent)
3. **Fading Trail** - Companion's path (visual history)

### **Map Integration**
- **Minimap**: Real-time companion position + discoveries
- **Journal Map**: Persistent purple markers for planning
- **Clickable markers**: Show item type and biome info

## 🎯 Loot Tables by Biome

### 🌊 **Ocean/Water**
- 🐟 Fish: 70% chance
- 🥚 Egg: 20% chance (seabird nests)
- 🍎 Apple: 5% chance
- 🍯 Honey: 5% chance

### 🌲 **Forest**
- 🍎 Apple: 50% chance (apple trees)
- 🍯 Honey: 30% chance (beehives)
- 🥚 Egg: 15% chance (bird nests)
- 🐟 Fish: 5% chance (streams)

### 🌾 **Plains**
- 🍯 Honey: 40% chance (flower fields)
- 🍎 Apple: 30% chance (scattered trees)
- 🥚 Egg: 20% chance (ground nests)
- 🐟 Fish: 10% chance (ponds)

### 🏔️ **Mountains**
- 🥚 Egg: 50% chance (cliff nests)
- 🐟 Fish: 25% chance (mountain streams)
- 🍯 Honey: 15% chance (rare)
- 🍎 Apple: 10% chance (hardy trees)

### 🏜️ **Desert**
- 🥚 Egg: 40% chance (desert birds)
- 🍯 Honey: 30% chance (desert flowers)
- 🍎 Apple: 20% chance (oasis)
- 🐟 Fish: 10% chance (rare oasis)

### ❄️ **Tundra**
- 🐟 Fish: 50% chance (ice fishing)
- 🥚 Egg: 30% chance (arctic birds)
- 🍯 Honey: 10% chance (rare)
- 🍎 Apple: 10% chance (hardy berries)

### 🌿 **Jungle**
- 🍎 Apple: 40% chance (tropical fruit)
- 🍯 Honey: 35% chance (many bees)
- 🥚 Egg: 20% chance (exotic birds)
- 🐟 Fish: 5% chance (rivers)

## 📊 Strategic Depth

### **Duration Planning**
- **0.5 days (10 min)**: Short radius, safe exploration
- **1 day (20 min)**: Medium radius, balanced risk/reward
- **2 days (40 min)**: Large radius, dangerous but rewarding

### **Risk vs Reward**
- **Longer expeditions** = farther travel = better loot chances
- **Dangerous biomes** (mountains, jungle) = rare items
- **Safe biomes** (plains) = common items
- **Player must survive** journey to collect items

### **Tactical Considerations**
- Send companions to biomes with desired items
- Plan multiple expeditions for different ingredients
- Balance expedition length with danger level
- Coordinate collection trips with other quests

## 🎬 Player Experience Flow

### **1. Preparation Phase**
```
- Open companion menu
- Select companion
- Choose expedition duration (0.5/1/2 days)
- Confirm send-off
```

### **2. Exploration Phase**
```
- Watch cyan dot on minimap
- See companion wandering outward
- Receive discovery notifications
- Purple markers appear on maps
- Companion turns around at halfway point
```

### **3. Return Phase**
```
- Companion walks back to player
- Expedition complete notification
- Review discovered items on map
- Plan collection route
```

### **4. Collection Phase**
```
- Travel to purple marker locations
- Find billboard items in world
- Collect rare ingredients
- Markers disappear after collection
- Use ingredients in kitchen bench
```

## 🔧 Technical Implementation

### **Core Systems**
- **CompanionHuntSystem.js** - Main expedition logic
- **Movement**: 2 chunks/minute calculation
- **Discovery checks**: Every in-game minute
- **Biome detection**: VoxelWorld.getBiomeAt()
- **Billboard spawning**: addBillboardItem()
- **Map markers**: Minimap + Journal integration

### **Update Loop** (runs every frame)
```javascript
companionHuntSystem.update(gameTime);
- Check elapsed time
- Move companion every in-game minute
- Roll for discoveries (outward only)
- Update position trail
- Check halfway turn
- End expedition when complete
```

### **Event Hooks**
- `startHunt(companion, duration)` - Begin expedition
- `onItemCollected(discoveryId)` - Handle pickup
- `cancelHunt()` - Emergency recall
- `getCompanionMapPosition()` - For rendering
- `getPathTrail()` - For visual trail

## 🎨 UI Elements Needed

### **Send-Off Interface**
- [ ] Companion selection menu
- [ ] Duration slider (0.5/1/2 days)
- [ ] Biome preference option (future)
- [ ] Start expedition button
- [ ] Estimated range display

### **Active Hunt Display**
- [ ] Companion portrait with "Hunting..." status
- [ ] Timer showing time remaining
- [ ] Distance from home display
- [ ] Discovery counter

### **Minimap Enhancements**
- [ ] Cyan dot for companion position
- [ ] Purple dots for discoveries
- [ ] Fading path trail
- [ ] Hover tooltips for markers

### **Journal Map Enhancements**
- [ ] Purple POI dots for discoveries
- [ ] Item type labels
- [ ] Biome information
- [ ] Collection status

## 🧪 Testing Checklist

- [ ] Send companion on 0.5 day expedition
- [ ] Verify companion moves 2 chunks/minute
- [ ] Confirm halfway turn happens
- [ ] Check discovery rolls (biome-based)
- [ ] Verify purple markers appear
- [ ] Test billboard item spawning
- [ ] Collect item and verify marker removal
- [ ] Test 1 day and 2 day expeditions
- [ ] Verify different biome loot tables
- [ ] Test expedition cancellation
- [ ] Check multiple concurrent expeditions (blocked)

## 🚀 Future Enhancements

### **Phase 2 Features**
- [ ] Multiple companions on simultaneous expeditions
- [ ] Companion skill levels (better at certain biomes)
- [ ] Equipment for companions (increase success rate)
- [ ] Danger encounters (companion can get injured)
- [ ] Rare "jackpot" discoveries (double items)

### **Phase 3 Features**
- [ ] Companion AI preferences (favorite biomes)
- [ ] Learning system (companions get better over time)
- [ ] Special companion abilities (tracker, fisher, etc.)
- [ ] Expedition party system (send multiple together)
- [ ] Discovery trading (between players in multiplayer)

## 📝 Related Systems

- **Kitchen Bench**: Uses discovered ingredients for cooking
- **Companion System**: Existing companion management
- **Minimap**: Displays companion + discoveries
- **Journal**: Logs discovered locations
- **Billboard Items**: Physical world collectables
- **Biome System**: Determines loot tables

## 🎉 Why This is Revolutionary

1. **Active vs Passive**: Companions DO something, not just follow
2. **Exploration Incentive**: Discover new areas through companions
3. **Risk/Reward**: Longer expeditions = farther = better loot
4. **Visual Engagement**: Watch companions move on map
5. **Strategic Depth**: Choose when/where to send companions
6. **Replayability**: Different paths/discoveries each time
7. **Integration**: Works with existing systems (maps, items, biomes)
8. **Scalability**: Easy to add new items, biomes, mechanics

## 📚 Developer Notes

### **Key Files**
- `/src/CompanionHuntSystem.js` - Main system (550+ lines)
- `/src/VoxelWorld.js` - Integration + update loop
- `/docs/COMPANION_HUNT_SYSTEM.md` - This file

### **Constants**
- `chunksPerMinute = 2` - Movement speed
- `blocksPerChunk = 16` - Chunk size
- `gameDay = 20 minutes` - Real time duration
- `inGameMinute = 60 seconds` - Game time unit

### **Persistence** (Future)
- Save active expeditions to localStorage
- Restore on game reload
- Track historical discoveries
- Companion expedition stats

---

**Status**: Core system complete ✅  
**Next Steps**: UI integration, minimap rendering, testing  
**Author**: Claude + Brad's brilliant design  
**Version**: 1.0.0 - "The Best CompanionHunt Ever Made"
