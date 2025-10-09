import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.VITE_BASE || './',
  // Copy assets folder to dist during build
  publicDir: 'assets',
  build: {
    crossorigin: false,
    // Ensure assets are copied with original structure
    assetsInlineLimit: 0 // Don't inline any assets
  }
})