// App.js - Entry point for unified VoxelWorld + ShapeForge app (Vite version)
import './style.css';
import { initVoxelWorld } from './VoxelWorld.js';
import { SplashScreen } from './SplashScreen.js';
import { GameIntroOverlay } from './ui/GameIntroOverlay.js';
import { ChatOverlay } from './ui/Chat.js';
// import { initWorkbench } from './ShapeForgeWorkbench.js'; // To be created

window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing app...');

  const gameContainer = document.getElementById('gameContainer');
  const workbenchContainer = document.getElementById('workbenchContainer');
  const playModeBtn = document.getElementById('playModeBtn');
  const workbenchBtn = document.getElementById('workbenchBtn');

  console.log('Elements found:', { gameContainer, playModeBtn, workbenchBtn });

  // Initialize splash screen
  const splashScreen = new SplashScreen();

  // Check if this is a first-time player (no saved game)
  const hasPlayerData = localStorage.getItem('NebulaWorld_playerData') !== null;

  function showGame() {
    console.log('showGame() called');
    gameContainer.style.display = 'block';
    workbenchContainer.style.display = 'none';
    // Hide header for fullscreen game experience
    document.querySelector('header').style.display = 'none';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
  }

  function showWorkbench() {
    console.log('showWorkbench() called');
    gameContainer.style.display = 'none';
    workbenchContainer.style.display = 'block';
    // Show header for workbench mode
    document.querySelector('header').style.display = 'flex';
    document.body.style.margin = '';
    document.body.style.padding = '';
    document.body.style.overflow = '';
  }

  // Show Play Mode before initializing VoxelWorld
  console.log('Calling showGame() initially');
  showGame();

  console.log('Calling initVoxelWorld...');
  initVoxelWorld(gameContainer, splashScreen).then((app) => {
    console.log('✅ VoxelWorld initialized successfully');
    // Expose app to window for debugging
    window['voxelApp'] = app;
    console.log('🐛 voxelApp exposed to window for debugging');

    // Helper function to get companion info for tutorials
    const getCompanionInfo = async () => {
      const playerData = JSON.parse(localStorage.getItem('NebulaWorld_playerData') || '{}');
      const companionId = playerData.starterMonster || 'rat';
      const companionData = await ChatOverlay.loadCompanionData(companionId);
      const companionName = companionData ? companionData.name : companionId;
      return { companionId, companionName };
    };

    // Add journal tutorial method for post-backpack discovery
    app.showJournalTutorial = async () => {
      const playerData = JSON.parse(localStorage.getItem('NebulaWorld_playerData') || '{}');

      // Only show if haven't seen it before
      if (playerData.tutorialsSeen?.journal) return;

      const { companionId, companionName } = await getCompanionInfo();

      const chat = new ChatOverlay();
      chat.showSequence([
        {
          character: companionId,
          name: companionName,
          text: `Great job finding the backpack! Press M to open your World Map, or press C to open the Companion Codex where you can view your companions and set your active battle partner!`
        },
        {
          character: companionId,
          name: companionName,
          text: `Oh, and see that sun icon in the top-left? That shows the time of day - the image changes as time passes! Click on it to open the Explorer's Menu where you can save your game, adjust settings, and more.`
        }
      ], () => {
        // Mark tutorial as seen
        playerData.tutorialsSeen = playerData.tutorialsSeen || {};
        playerData.tutorialsSeen.journal = true;
        localStorage.setItem('NebulaWorld_playerData', JSON.stringify(playerData));
      });
    };

    // Add machete tutorial for first-time selection
    app.showMacheteTutorial = async () => {
      const playerData = JSON.parse(localStorage.getItem('NebulaWorld_playerData') || '{}');

      // Only show if haven't seen it before
      if (playerData.tutorialsSeen?.machete) return;

      const { companionId, companionName } = await getCompanionInfo();

      const chat = new ChatOverlay();
      chat.showMessage({
        character: companionId,
        name: companionName,
        text: `Oh! That machete belonged to Uncle Beastly! He used to chop down trees with it by holding left-click on the trunk. It works on grass, leaves, dirt, even stone... and it never dulls! Pretty handy tool!`
      }, () => {
        // Mark tutorial as seen
        playerData.tutorialsSeen = playerData.tutorialsSeen || {};
        playerData.tutorialsSeen.machete = true;
        localStorage.setItem('NebulaWorld_playerData', JSON.stringify(playerData));
      });
    };

    // Add workbench tutorial
    app.showWorkbenchTutorial = async () => {
      const playerData = JSON.parse(localStorage.getItem('NebulaWorld_playerData') || '{}');

      // Only show if haven't seen it before
      if (playerData.tutorialsSeen?.workbench) return;

      const { companionId, companionName } = await getCompanionInfo();

      const chat = new ChatOverlay();
      chat.showMessage({
        character: companionId,
        name: companionName,
        text: `That Workbench is really useful! Press E to open it and craft things with interesting shapes. Some blocks can make lots of different shapes, while others... well, maybe they'll be useful later. Experiment and see what you can create!`
      }, () => {
        // Mark tutorial as seen
        playerData.tutorialsSeen = playerData.tutorialsSeen || {};
        playerData.tutorialsSeen.workbench = true;
        localStorage.setItem('NebulaWorld_playerData', JSON.stringify(playerData));
      });
    };

    // If first-time player, show intro overlay AFTER world loads
    if (!hasPlayerData) {
      console.log('👋 First-time player detected! Showing intro overlay...');
      const introOverlay = new GameIntroOverlay();

      introOverlay.setCompletionCallback(async (selectedCompanion) => {
        console.log(`🎮 Player selected starter companion: ${selectedCompanion}`);

        // Save player data with starter companion
        const playerData = {
          starterMonster: selectedCompanion,
          monsterCollection: [selectedCompanion],
          firstPlayTime: Date.now()
        };
        localStorage.setItem('NebulaWorld_playerData', JSON.stringify(playerData));
        console.log('✅ Player data saved!');

        // Load companion data for chat
        const companionData = await ChatOverlay.loadCompanionData(selectedCompanion);
        const companionName = companionData ? companionData.name : selectedCompanion;

        // Show tutorial chat sequence
        const chat = new ChatOverlay();
        chat.showSequence([
          {
            character: selectedCompanion,
            name: companionName,
            text: `Hey there! I'm your new companion. Let's get you set up for exploring!`
          },
          {
            character: selectedCompanion,
            name: companionName,
            text: `See that red dot on your minimap in the top-right? That's your Explorer's Pack with all your tools!`
          },
          {
            character: selectedCompanion,
            name: companionName,
            text: `Use WASD to move and your mouse to look around. If you spawn in a tree, just punch the leaves to break free!`
          },
          {
            character: selectedCompanion,
            name: companionName,
            text: `Walk up to the backpack (🎒) and hold left-click to pick it up. That'll unlock your inventory and tools. Good luck, explorer!`
          }
        ], () => {
          // After chat sequence completes, spawn backpack in front of player
          console.log('💬 Tutorial chat complete, spawning starter backpack...');
          if (window.voxelApp && window.voxelApp.spawnStarterBackpack) {
            window.voxelApp.spawnStarterBackpack();
          }
        });
      });

      // Show overlay after a short delay (let world finish loading)
      setTimeout(() => {
        introOverlay.show();
      }, 500);
    }
  }).catch(error => {
    console.error('❌ Failed to initialize VoxelWorld:', error);
    console.error('Error stack:', error.stack);
    // Hide splash on error
    if (splashScreen) {
      splashScreen.updateProgress(100, 'Error loading game');
      setTimeout(() => splashScreen.hide(), 2000);
    }
  });

  playModeBtn.addEventListener('click', () => {
    console.log('Play Mode button clicked');
    showGame();
  });
  
  workbenchBtn.addEventListener('click', () => {
    console.log('Workbench button clicked');
    showWorkbench();
  });

  // Placeholder: Initialize ShapeForgeWorkbench in workbenchContainer
  // initWorkbench(workbenchContainer);
});
