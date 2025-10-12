/**
 * EmojiRenderer.js
 * Universal emoji rendering solution with local emoji assets
 * Supports multiple emoji sets: Google (Noto), Apple, Twitter, and Microsoft
 */

// Emoji set preferences stored in localStorage
const EMOJI_SET_KEY = 'voxelworld_emoji_set';
const DEFAULT_EMOJI_SET = 'google'; // google, apple, twitter, microsoft

/**
 * Get current emoji set preference
 */
export function getEmojiSet() {
  return localStorage.getItem(EMOJI_SET_KEY) || DEFAULT_EMOJI_SET;
}

/**
 * Set emoji set preference
 * @param {string} set - 'google', 'apple', 'twitter', or 'microsoft'
 */
export function setEmojiSet(set) {
  const validSets = ['google', 'apple', 'twitter', 'microsoft'];
  if (validSets.includes(set)) {
    localStorage.setItem(EMOJI_SET_KEY, set);
    console.log(`✨ Emoji set changed to: ${set}`);
    // Re-render all emoji
    initEmojiSupport();
  }
}

/**
 * Convert emoji character to unified codepoint
 * @param {string} emoji - The emoji character
 * @returns {string} Unified codepoint (e.g., '1f600')
 */
function emojiToCodepoint(emoji) {
  // Convert emoji to codepoint hex string
  const codePoints = [];
  for (const char of emoji) {
    const code = char.codePointAt(0);
    if (code) {
      codePoints.push(code.toString(16).toLowerCase().padStart(4, '0'));
    }
  }
  return codePoints.join('-');
}

/**
 * Get emoji image URL from local assets
 * @param {string} emoji - The emoji character (e.g., '🌲', '📍')
 * @param {string} set - Emoji set to use (google, apple, twitter, microsoft)
 * @returns {string} URL to the emoji PNG image
 */
export function getEmojiImageUrl(emoji, set = null) {
  const emojiSet = set || getEmojiSet();
  const codepoint = emojiToCodepoint(emoji);
  
  // Map set names to package paths
  const setMap = {
    'google': 'emoji-datasource-google',
    'apple': 'emoji-datasource-apple',
    'twitter': 'emoji-datasource-twitter',
    'microsoft': 'emoji-datasource-google' // Fallback to Google for MS
  };
  
  const packageName = setMap[emojiSet] || setMap['google'];
  
  // Use 64px images for better quality
  return `/node_modules/${packageName}/img/${emojiSet}/64/${codepoint}.png`;
}

/**
 * Parse text and replace emoji with images
 * @param {HTMLElement} element - Element to parse
 */
function parseEmoji(element) {
  const emojiSet = getEmojiSet();
  
  // Regex to match emoji (basic unicode emoji range)
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}-\u{2454}\u{20D0}-\u{20FF}]/gu;
  
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  const nodesToReplace = [];
  let node;
  
  while (node = walker.nextNode()) {
    if (emojiRegex.test(node.textContent)) {
      nodesToReplace.push(node);
    }
  }
  
  nodesToReplace.forEach(textNode => {
    const text = textNode.textContent;
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match;
    
    emojiRegex.lastIndex = 0;
    
    while ((match = emojiRegex.exec(text)) !== null) {
      // Add text before emoji
      if (match.index > lastIndex) {
        fragment.appendChild(
          document.createTextNode(text.substring(lastIndex, match.index))
        );
      }
      
      // Add emoji image
      const img = createEmojiImage(match[0]);
      fragment.appendChild(img);
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
    }
    
    textNode.parentNode.replaceChild(fragment, textNode);
  });
}

/**
 * Initialize emoji support globally
 * Converts all emoji in the document to images
 */
export function initEmojiSupport() {
  // Remove any existing emoji images first
  document.querySelectorAll('img.emoji').forEach(img => {
    const emoji = img.alt;
    if (emoji) {
      img.parentNode.replaceChild(document.createTextNode(emoji), img);
    }
  });
  
  // Parse existing content
  parseEmoji(document.body);

  // Watch for dynamic content changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          parseEmoji(node);
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  const emojiSet = getEmojiSet();
  console.log(`✨ Emoji support initialized with ${emojiSet} emoji set (local assets)`);
}

/**
 * Create an emoji image element
 * @param {string} emoji - The emoji character
 * @returns {HTMLImageElement} Image element with emoji
 */
export function createEmojiImage(emoji) {
  const img = document.createElement('img');
  img.className = 'emoji';
  img.draggable = false;
  img.alt = emoji;
  img.src = getEmojiImageUrl(emoji);
  img.onerror = function() {
    // Fallback: show original emoji text if image fails to load
    this.style.display = 'none';
    const text = document.createTextNode(emoji);
    this.parentNode?.replaceChild(text, this);
  };
  return img;
}

/**
 * Get available emoji sets
 * @returns {Array} Array of available emoji set objects
 */
export function getAvailableEmojiSets() {
  return [
    { id: 'google', name: 'Google (Noto)', icon: '🌐' },
    { id: 'apple', name: 'Apple', icon: '🍎' },
    { id: 'twitter', name: 'Twitter (Twemoji)', icon: '🐦' },
    { id: 'microsoft', name: 'Microsoft', icon: '🪟' }
  ];
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
    parseEmoji(target);
  }
}

export default {
  init: initEmojiSupport,
  render: renderEmoji,
  getImageUrl: getEmojiImageUrl,
  createImage: createEmojiImage,
  getEmojiSet,
  setEmojiSet,
  getAvailableEmojiSets
};
