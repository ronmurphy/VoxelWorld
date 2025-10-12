/**
 * EmojiChooser.js
 * UI component for selecting emoji rendering style
 * Adds a tab to the Adventurer's Menu
 */

import { getEmojiSet, setEmojiSet, getAvailableEmojiSets } from './EmojiRenderer.js';

/**
 * Create the emoji chooser UI
 * @returns {HTMLElement} The emoji chooser container
 */
export function createEmojiChooser() {
  const container = document.createElement('div');
  container.className = 'emoji-chooser-container';
  container.innerHTML = `
    <div class="emoji-chooser">
      <h3>🎨 Emoji Style</h3>
      <p class="emoji-description">Choose how emoji appear throughout the game:</p>
      <div class="emoji-sets-grid" id="emojiSetsGrid"></div>
      <div class="emoji-preview">
        <p>Preview: 📍🌲⛰️🏠💎⚔️❤️🛡️🎒</p>
      </div>
    </div>
  `;

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .emoji-chooser-container {
      padding: 20px;
      max-width: 600px;
    }
    
    .emoji-chooser h3 {
      margin: 0 0 10px 0;
      color: #fff;
      font-size: 1.5em;
    }
    
    .emoji-description {
      margin: 0 0 20px 0;
      color: #aaa;
      font-size: 0.9em;
    }
    
    .emoji-sets-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 10px;
      margin-bottom: 20px;
    }
    
    .emoji-set-option {
      background: rgba(255, 255, 255, 0.1);
      border: 2px solid transparent;
      border-radius: 8px;
      padding: 15px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }
    
    .emoji-set-option:hover {
      background: rgba(255, 255, 255, 0.15);
      transform: translateY(-2px);
    }
    
    .emoji-set-option.active {
      background: rgba(76, 175, 80, 0.3);
      border-color: #4CAF50;
    }
    
    .emoji-set-icon {
      font-size: 2em;
      margin-bottom: 8px;
      display: block;
    }
    
    .emoji-set-name {
      color: #fff;
      font-size: 0.9em;
      font-weight: 500;
    }
    
    .emoji-preview {
      background: rgba(0, 0, 0, 0.3);
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }
    
    .emoji-preview p {
      margin: 0;
      font-size: 2em;
      letter-spacing: 0.2em;
    }
  `;
  document.head.appendChild(style);

  // Populate emoji sets
  const grid = container.querySelector('#emojiSetsGrid');
  const currentSet = getEmojiSet();
  const sets = getAvailableEmojiSets();

  sets.forEach(set => {
    const option = document.createElement('div');
    option.className = `emoji-set-option ${set.id === currentSet ? 'active' : ''}`;
    option.innerHTML = `
      <span class="emoji-set-icon">${set.icon}</span>
      <div class="emoji-set-name">${set.name}</div>
    `;
    
    option.addEventListener('click', () => {
      // Update active state
      grid.querySelectorAll('.emoji-set-option').forEach(opt => {
        opt.classList.remove('active');
      });
      option.classList.add('active');
      
      // Set emoji style
      setEmojiSet(set.id);
      
      // Show confirmation
      console.log(`✨ Emoji style changed to ${set.name}`);
    });
    
    grid.appendChild(option);
  });

  return container;
}

/**
 * Add emoji chooser to Adventurer's Menu
 * Call this when the menu system is initialized
 */
export function addEmojiChooserToMenu() {
  // This function should be called by your menu system
  // It will add a new tab to the Adventurer's Menu
  
  // Example integration (adjust based on your menu system):
  /*
  const menuTabs = document.querySelector('.menu-tabs');
  const emojiTab = document.createElement('button');
  emojiTab.className = 'menu-tab';
  emojiTab.textContent = '🎨 Emoji';
  emojiTab.onclick = () => {
    const menuContent = document.querySelector('.menu-content');
    menuContent.innerHTML = '';
    menuContent.appendChild(createEmojiChooser());
  };
  menuTabs.appendChild(emojiTab);
  */
  
  console.log('📋 Emoji chooser ready to be added to menu');
}

export default {
  createEmojiChooser,
  addEmojiChooserToMenu
};
