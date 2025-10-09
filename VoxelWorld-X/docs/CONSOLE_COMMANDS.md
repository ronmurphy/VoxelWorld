# 🎮 VoxelWorld Console Commands Reference

Complete list of all available browser console commands for VoxelWorld debugging and testing.

## 📋 Quick Reference

Type `showCommands()` in the browser console to see this help anytime!

---

## 📦 Item & Block Commands

### `giveItem(itemName, quantity)`
Add items to your inventory.

**Parameters:**
- `itemName` (string) - Name of the item
- `quantity` (number, optional) - Amount to give (default: 1)

**Valid Items:**
- **Tools**: `stone_hammer`, `machete`, `stick`, `compass`, `compass_upgrade`
- **Workbenches**: `workbench`, `backpack`, `tool_bench`
- **Crafted items**: Any item starting with `crafted_*`

**Examples:**
```javascript
giveItem("stone_hammer")           // Give 1 stone hammer
giveItem("workbench", 5)           // Give 5 workbenches
giveItem("crafted_sword")          // Give crafted sword
```

### `giveBlock(blockName, quantity)`
Add blocks to your inventory.

**Parameters:**
- `blockName` (string) - Name of the block type
- `quantity` (number, optional) - Amount to give (default: 1)

**Valid Blocks:**
All block types from `this.blockTypes` including:
- `stone`, `dirt`, `grass`, `sand`, `snow`, `water`, etc.

**Examples:**
```javascript
giveBlock("stone", 64)             // Give 64 stone blocks
giveBlock("dirt", 100)             // Give 100 dirt
giveBlock("grass")                 // Give 1 grass block
```

---

## 🏛️ World Generation Commands

### `makeRuins(size)`
Generate a test ruin structure near the player's current position.

**Parameters:**
- `size` (string) - Size of the ruin

**Valid Sizes:**
- `"small"` - 5×5×5 ruin
- `"medium"` - 9×9×7 ruin
- `"large"` - 15×15×10 ruin (with side doorways)
- `"colossal"` - 25×25×25 massive structure

**Behavior:**
- Spawns 15-25 blocks in front of player (positive Z direction)
- Random offset of ±5 blocks left/right
- Uses player's Y position (spawns at your height level)
- Never buried (always visible for testing)
- Logs coordinates to console

**Examples:**
```javascript
makeRuins("small")                 // Small test ruin
makeRuins("large")                 // Large ruin with side doors
makeRuins("colossal")              // Massive ancient structure
```

---

## 🌍 Seed Commands

### `setSeed(number)`
Set a specific world seed. Requires page refresh to take effect.

**Parameters:**
- `number` (integer) - The seed value

**Use Cases:**
- Test specific world generation
- Share interesting worlds with others
- Reproduce bugs in specific terrain

**Examples:**
```javascript
setSeed(12345)                     // Set seed to 12345
setSeed(99999)                     // Different world
setSeed(0)                         // Seed zero is valid
```

### `clearSeed()`
Clear the saved seed and generate a new random world on next refresh.

**Use Cases:**
- Exit debug mode and get random worlds
- Start fresh exploration
- Test random generation

**Examples:**
```javascript
clearSeed()                        // Clear seed, refresh for random world
```

**Debug Mode Behavior:**
- When `USE_DEBUG_SEED = true` in code:
  - Default seed is 12345
  - Persists across refreshes
  - Can be changed with `setSeed()`
  - Can be cleared with `clearSeed()`

---

## 🧹 Cleanup Commands

### `clearCaches()`
Clear all caches but preserve saved games.

**What it clears:**
- ✅ SessionStorage
- ✅ RAM chunk cache
- ✅ BiomeWorldGen cache
- ✅ Web Worker cache
- ✅ ChunkPersistence IndexedDB (terrain cache)
- ✅ Performance benchmarks
- ✅ Tutorial flags

**What it keeps:**
- 💾 Saved games (VoxelWorld IndexedDB)
- 💾 Player inventory
- 💾 World modifications

**Safe for:**
- Fixing terrain generation bugs
- Clearing memory leaks
- Testing fresh chunk generation
- Seeing tutorials again

**Example:**
```javascript
clearCaches()                      // Safe cleanup, keeps saved games
```

### `clearAllData()`
Clear localStorage and IndexedDB, then reload page.

**⚠️ WARNING: Deletes saved games!**

**What it clears:**
- ❌ All localStorage
- ❌ All IndexedDB databases
- ❌ **Saved games will be lost!**

**Use Cases:**
- Complete fresh start
- Testing initial load behavior
- Removing corrupted data

**Example:**
```javascript
clearAllData()                     // DELETES EVERYTHING, use with caution!
```

### `nuclearClear()`
Ultimate cleanup - wipe everything and hard reload.

**☢️ NUCLEAR OPTION - Use as last resort!**

**What it clears:**
- 🧨 All localStorage
- 🧨 All sessionStorage
- 🧨 RAM chunk cache
- 🧨 BiomeWorldGen cache
- 🧨 Web Worker cache
- 🧨 All IndexedDB databases
- 🧨 In-memory world data
- 🧨 Tree/pumpkin/item caches
- 🧨 Browser cache (hard reload)

**Use Cases:**
- Complete system reset
- Fixing severe corruption
- Testing from absolute zero state

**Example:**
```javascript
nuclearClear()                     // ☢️ WIPES EVERYTHING, HARD RELOAD
```

---

## 📋 Help Commands

### `showCommands()`
Display this help information in the console with color formatting.

**Example:**
```javascript
showCommands()                     // Show all commands with descriptions
```

---

## 💡 Usage Tips

### Opening Console
- **Chrome/Edge**: F12 or Ctrl+Shift+J (Cmd+Option+J on Mac)
- **Firefox**: F12 or Ctrl+Shift+K (Cmd+Option+K on Mac)
- **Safari**: Cmd+Option+C (enable in Preferences → Advanced first)

### Command Syntax
- Commands are **case-sensitive**: `giveItem` not `giveitem`
- String parameters need **quotes**: `"stone_hammer"` not `stone_hammer`
- Numbers don't need quotes: `setSeed(12345)` not `setSeed("12345")`

### Finding Current Seed
Check console at page load for:
```
🌍 Loaded persistent world seed: 12345 (DEBUG MODE)
```
or
```
🌍 Generated new world seed: 67890
```

### Testing Workflow

**Test specific seed:**
```javascript
setSeed(12345)                     // Set seed
// Refresh browser (F5)
// World generates with seed 12345
```

**Test ruins at different heights:**
```javascript
// 1. Go to hilltop
makeRuins("medium")                // Spawns at hilltop height

// 2. Go underground
makeRuins("small")                 // Spawns at underground height
```

**Clean reset:**
```javascript
clearCaches()                      // Clear caches, keep save
// or
clearAllData()                     // Delete everything
```

---

## 🔧 Debug Mode Settings

Located in `VoxelWorld.js`:

```javascript
const USE_DEBUG_SEED = true;       // Set false for production
const DEBUG_SEED = 12345;          // Default debug seed
```

**Debug Mode ON** (`true`):
- Uses fixed seed (12345)
- Saves to `localStorage.voxelWorld_debugSeed`
- Persists across refreshes
- Can override with `setSeed()`

**Debug Mode OFF** (`false`):
- Generates random seed
- Saves to `localStorage.voxelWorld_seed`
- Production behavior

---

## 🐛 Troubleshooting

### "Command not found"
- Check spelling (case-sensitive)
- Make sure page fully loaded
- Try `showCommands()` to verify commands available

### Seed not changing
- Did you refresh the page? (F5)
- Check console for confirmation message
- Use `clearSeed()` then `setSeed(newNumber)`

### Ruins spawning underground
- Stand at desired height before running `makeRuins()`
- Debug ruins use your Y position
- Natural ruins use ground detection (may vary)

### Can't find spawned items/ruins
- Check console for coordinates
- Items spawn at player position or nearby
- Ruins spawn 15-25 blocks away in +Z direction

---

## 📝 Command Summary Table

| Command | Purpose | Requires Refresh |
|---------|---------|------------------|
| `giveItem(name, qty)` | Add item to inventory | No |
| `giveBlock(name, qty)` | Add blocks to inventory | No |
| `makeRuins(size)` | Spawn test ruin | No |
| `setSeed(number)` | Set world seed | **Yes** |
| `clearSeed()` | Clear saved seed | **Yes** |
| `clearCaches()` | Clear caches, keep saves | **Yes** (auto) |
| `clearAllData()` | Delete everything | **Yes** (auto) |
| `nuclearClear()` | Nuclear cleanup | **Yes** (auto) |
| `showCommands()` | Show this help | No |

---

## 🚀 For Production

Before release, remove or disable debug commands:

```javascript
// Option 1: Comment out command definitions
// window.giveItem = ...
// window.giveBlock = ...
// window.makeRuins = ...

// Option 2: Wrap in debug check
if (DEBUG_MODE) {
    window.giveItem = ...
    window.giveBlock = ...
    // etc.
}

// Option 3: Set flag
const USE_DEBUG_SEED = false;      // Disable debug seed
```

Keep `clearCaches()` and `showCommands()` - useful for users!
