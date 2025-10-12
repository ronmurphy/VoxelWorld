// EmojiRenderer.js - Universal emoji support for all platforms including Wine

import twemoji from 'twemoji';

/**
 * Initialize emoji rendering for the entire app
 * This replaces unicode emoji with SVG/PNG images that work everywhere
 */
export function initEmojiSupport() {
  console.log('🎨 Initializing universal emoji support...');
  
  // Parse the entire document for emoji
  twemoji.parse(document.body, {
    folder: 'svg',
    ext: '.svg',
    base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/'
  });
  
  // Watch for new emoji being added dynamically
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          twemoji.parse(node, {
            folder: 'svg',
            ext: '.svg',
            base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/'
          });
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('✅ Emoji support initialized - all emoji will render as images');
}

/**
 * Render emoji in a specific element
 * @param {HTMLElement|string} element - Element or selector to parse
 */
export function renderEmoji(element) {
  const target = typeof element === 'string' 
    ? document.querySelector(element) 
    : element;
    
  if (target) {
    twemoji.parse(target, {
      folder: 'svg',
      ext: '.svg',
      base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/'
    });
  }
}

/**
 * Get emoji as an image URL (for use in Three.js textures, etc.)
 * @param {string} emoji - The emoji character (e.g., '🌲')
 * @returns {string} URL to the emoji image
 */
export function getEmojiImageUrl(emoji) {
  const codePoint = twemoji.convert.toCodePoint(emoji);
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codePoint}.svg`;
}

/**
 * Create an emoji image element
 * @param {string} emoji - The emoji character
 * @param {Object} options - Size and style options
 * @returns {HTMLImageElement}
 */
export function createEmojiImage(emoji, options = {}) {
  const { width = '1em', height = '1em', className = '' } = options;
  
  const img = document.createElement('img');
  img.src = getEmojiImageUrl(emoji);
  img.alt = emoji;
  img.className = `emoji ${className}`;
  img.style.width = width;
  img.style.height = height;
  img.style.verticalAlign = '-0.1em';
  img.style.display = 'inline-block';
  
  return img;
}

export default {
  init: initEmojiSupport,
  render: renderEmoji,
  getImageUrl: getEmojiImageUrl,
  createImage: createEmojiImage
};
