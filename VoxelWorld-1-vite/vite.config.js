import { defineConfig } from 'vite';
import { miniTexturesPlugin } from './vite-plugin-mini-textures.js';

export default defineConfig({
  base: process.env.VITE_BASE || './',
  // Copy assets folder to dist during build
  publicDir: 'assets',
  plugins: [
    miniTexturesPlugin() // 🎨 Generate 32x32 mini textures at build time
  ],
  build: {
    crossorigin: false,
    // Ensure assets are copied with original structure
    assetsInlineLimit: 0 // Don't inline any assets
  }
})