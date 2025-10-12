# ⚡ Performance Fix for Twemoji in Development

## Issue
Twemoji loads emoji as images from CDN, which can cause:
- Network latency
- Jerky gameplay in `npm run dev`
- Slower rendering

## Quick Fixes

### Option 1: Disable Twemoji in Development (Recommended)
Update `src/App.js`:

```javascript
// Only enable Twemoji in production (Electron build)
if (!import.meta.env.DEV) {
  initEmojiSupport();
}
```

In development, emoji will show as system fonts (which is fine for testing on Linux).

### Option 2: Use Local Twemoji Assets
Install local twemoji assets:

```bash
npm install @twemoji/api
```

Then update `EmojiRenderer.js` to use local files instead of CDN.

### Option 3: Lazy Load Twemoji
Only initialize Twemoji when needed (e.g., when opening file browser or UI with emoji).

## Recommended Solution

**For now**: Disable Twemoji in dev mode, enable only for production builds.

This way:
- ✅ Development is fast (uses system emoji)
- ✅ Production/Wine builds work perfectly (uses Twemoji images)

## Quick Fix Code

```javascript
// In src/App.js, replace:
initEmojiSupport();

// With:
if (import.meta.env.PROD) {
  initEmojiSupport();
  console.log('✅ Twemoji enabled for production build');
} else {
  console.log('ℹ️ Twemoji disabled in dev mode (using system emoji)');
}
```

This will make dev mode fast again while keeping the Wine build working perfectly!

---
**Note**: The 74 console errors you mentioned might also be related. Check the browser console to see what they are.
