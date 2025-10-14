# Tutorial System Consolidation - October 14, 2025

## Problem Summary
The game had **THREE overlapping tutorial systems** running simultaneously, causing:
- Blank tutorial messages
- Duplicate messages showing multiple times
- Tutorials not respecting "one-time only" flags
- Confusion about which system was handling which tutorial

## The Three Systems Found

### 1. TutorialScriptSystem.js ✅ (KEPT)
- **Location**: `/src/ui/TutorialScriptSystem.js`
- **Data Source**: `/data/tutorialScripts.json`
- **Initialized in**: `VoxelWorld.js` line 306
- **Type**: JSON-based, event-driven
- **Features**: 
  - Loads companion info dynamically
  - Tracks tutorials in localStorage
  - Supports message sequences with delays
  - Proper "once" flag handling

### 2. CompanionTutorialSystem.js ❌ (REMOVED)
- **Location**: `/src/ui/CompanionTutorialSystem.js` (file still exists but no longer used)
- **Data Source**: Hardcoded in JavaScript
- **Was initialized in**: `App.js` line 66-67 (REMOVED)
- **Problem**: Was overwriting the TutorialScriptSystem instance!

### 3. Old Tutorial Methods in App.js ❌ (REMOVED)
- **Location**: `App.js` lines 90-160 (REMOVED)
- **Methods**: `showJournalTutorial()`, `showMacheteTutorial()`, `showWorkbenchTutorial()`
- **Problem**: Duplicated functionality and used different tracking mechanism

## Changes Made

### 1. App.js
- ✅ Removed `CompanionTutorialSystem` import
- ✅ Removed initialization that was overwriting `app.tutorialSystem`
- ✅ Removed old standalone tutorial methods
- ✅ Kept the first-time player intro sequence (handles companion selection)

### 2. VoxelWorld.js
- ✅ Kept `TutorialScriptSystem` initialization (line 306)
- ✅ Removed old `showWorkbenchTutorial()` function (lines 5945-6036)
- ✅ Updated backpack pickup to call `tutorialSystem.onBackpackOpened()`
- ✅ Removed duplicate workbench tutorial call
- ✅ Removed `onGameStart()` auto-trigger (App.js intro handles first-time players)

### 3. tutorialScripts.json
- ✅ Enhanced `backpack_opened` tutorial with map/codex/menu info
- ✅ All tutorials properly configured with `once: true` flag

## How It Works Now

### Tutorial Flow for New Players:
1. **Companion Selection** → App.js shows intro overlay
2. **After selection** → Chat sequence explains basics and spawns backpack
3. **Find backpack** → `onBackpackOpened()` tutorial shows map/codex/menu tips
4. **Select machete** → `onMacheteSelected()` tutorial
5. **Craft workbench** → `onItemCrafted('workbench')` tutorial
6. **Open workbench** → `onWorkbenchOpened()` tutorial
7. **Etc...** → All other tutorials triggered by events

### Tutorial Flow for Returning Players:
- Skip intro overlay (already have playerData)
- Get contextual tutorials as they encounter new features
- All tutorials respect "already seen" tracking

## Event Hooks Verified

All these are properly connected to `TutorialScriptSystem`:

| Event | Hook Location | Tutorial ID |
|-------|--------------|-------------|
| Game Start | VoxelWorld.js (removed - App.js handles) | `game_start` |
| Machete Selected | VoxelWorld.js:2746 | `machete_selected` |
| Backpack Opened | VoxelWorld.js:1334, 2784, 6710 | `backpack_opened` |
| Item Crafted | WorkbenchSystem.js:2058, ToolBenchSystem.js | Various |
| Workbench Opened | WorkbenchSystem.js:233 | `workbench_opened` |
| Tool Bench Opened | ToolBenchSystem.js:320 | `tool_bench_opened` |
| Kitchen Bench Opened | KitchenBenchSystem.js:440 | `kitchen_bench_opened` |
| Campfire Placed | VoxelWorld.js:739 | `campfire_placed` |
| Nightfall | VoxelWorld.js:9756 | `nightfall` |
| Ghost Spawn | GhostSystem.js:167 | `first_ghost` |
| Animal Spawn | AnimalSystem.js:209 | `first_rabbit` |

## Testing Checklist

- [ ] Start new game → Should see companion selection + intro
- [ ] Find backpack → Should see backpack tutorial with map/codex tips
- [ ] Select machete → Should see machete tutorial
- [ ] Open workbench → Should see workbench tutorial
- [ ] Craft items → Should see item-specific tutorials
- [ ] Night falls → Should see nightfall tutorial
- [ ] Ghost appears → Should see ghost tutorial
- [ ] Close and reopen game → Tutorials should NOT repeat

## Files Modified

1. `/src/App.js` - Removed CompanionTutorialSystem, removed old methods
2. `/src/VoxelWorld.js` - Removed old workbench tutorial, fixed event hooks
3. `/data/tutorialScripts.json` - Enhanced backpack tutorial

## Files to Keep (Don't Delete)

- `/src/ui/TutorialScriptSystem.js` - The main tutorial system
- `/src/ui/Chat.js` - Visual novel dialogue system used by tutorials
- `/data/tutorialScripts.json` - Tutorial content database

## Files No Longer Used (Can Delete Later)

- `/src/ui/CompanionTutorialSystem.js` - Replaced by TutorialScriptSystem

## Future Enhancements

Now that you have a single, clean JSON-based tutorial system, you can easily:
- Add new tutorials by editing `tutorialScripts.json`
- Create branching dialogue with conditions
- Add tutorial categories (beginner, advanced, etc.)
- Implement a tutorial replay system
- Add tutorial achievements/progress tracking

---

**Result**: Single, unified tutorial system that's easy to maintain and extend! 🎓
