import { defineConfig } from 'vite';
import { miniTexturesPlugin } from './vite-plugin-mini-textures.js';
import assetManifest from './vite-plugin-asset-manifest.js';
import copyHelpFiles from './vite-plugin-copy-help.js';
import copyTutorialEditor from './vite-plugin-copy-tutorial-editor.js';

export default defineConfig({
  base: process.env.VITE_BASE || './',
  // Copy assets folder to dist during build (now includes data subfolder)
  publicDir: 'assets',
  plugins: [
    assetManifest(),        // 📋 Generate asset manifests (fileList.json) at build time
    miniTexturesPlugin(),   // 🎨 Generate 32x32 mini textures at build time
    copyHelpFiles(),        // 📚 Copy help markdown files to dist
    copyTutorialEditor()    // 🎓 Copy tutorial editor to dist
  ],
  build: {
    crossorigin: false,
    // Ensure assets are copied with original structure
    assetsInlineLimit: 0 // Don't inline any assets
  }
})