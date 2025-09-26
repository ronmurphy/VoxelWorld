// App.js - Entry point for unified VoxelWorld + ShapeForge app (Vite version)
import './style.css';
import { initVoxelWorld } from './VoxelWorld.js';
// import { initWorkbench } from './ShapeForgeWorkbench.js'; // To be created

window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing app...');
  
  const gameContainer = document.getElementById('gameContainer');
  const workbenchContainer = document.getElementById('workbenchContainer');
  const playModeBtn = document.getElementById('playModeBtn');
  const workbenchBtn = document.getElementById('workbenchBtn');

  console.log('Elements found:', { gameContainer, playModeBtn, workbenchBtn });

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
  initVoxelWorld(gameContainer).then(() => {
    console.log('✅ VoxelWorld initialized successfully');
  }).catch(error => {
    console.error('❌ Failed to initialize VoxelWorld:', error);
    console.error('Error stack:', error.stack);
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
