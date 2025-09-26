// App.js - Entry point for unified VoxelWorld + ShapeForge app

import { initVoxelWorld } from './VoxelWorld.js';
// import { initWorkbench } from './ShapeForgeWorkbench.js'; // To be created

const gameContainer = document.getElementById('gameContainer');
const workbenchContainer = document.getElementById('workbenchContainer');
const playModeBtn = document.getElementById('playModeBtn');
const workbenchBtn = document.getElementById('workbenchBtn');

function showGame() {
  gameContainer.style.display = 'block';
  workbenchContainer.style.display = 'none';
}

function showWorkbench() {
  gameContainer.style.display = 'none';
  workbenchContainer.style.display = 'block';
}

playModeBtn.addEventListener('click', showGame);
workbenchBtn.addEventListener('click', showWorkbench);

// Initialize VoxelWorld in gameContainer
initVoxelWorld(gameContainer);

// Placeholder: Initialize ShapeForgeWorkbench in workbenchContainer
// initWorkbench(workbenchContainer);
