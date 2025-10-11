const { contextBridge } = require('electron');
const fs = require('fs');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  // List files in a directory (for asset discovery)
  listAssetFiles: async (category) => {
    try {
      const path = require('path');
      const isDev = process.env.NODE_ENV === 'development';

      let basePath;
      if (isDev) {
        // Development: assets are in project root
        basePath = path.join(__dirname, 'assets', 'art', category);
      } else {
        // Production: Vite copies assets/ contents into dist/
        // electron-builder then packages dist/ as the app root
        basePath = path.join(__dirname, 'art', category);
      }

      if (!fs.existsSync(basePath)) {
        console.warn(`Asset directory not found: ${basePath}`);
        return [];
      }

      const files = fs.readdirSync(basePath);
      console.log(`📁 Found ${files.length} files in ${category}:`, files);
      return files;
    } catch (error) {
      console.error(`Error listing asset files for ${category}:`, error);
      return [];
    }
  }
});
