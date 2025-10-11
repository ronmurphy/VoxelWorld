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
        // Production: When running 'npm run electron' (not packaged),
        // assets are in dist/art/. When packaged by electron-builder,
        // they're in the app root at art/.
        // Try dist/art/ first, fallback to art/
        const distPath = path.join(__dirname, 'dist', 'art', category);
        const rootPath = path.join(__dirname, 'art', category);

        if (fs.existsSync(distPath)) {
          basePath = distPath;
        } else if (fs.existsSync(rootPath)) {
          basePath = rootPath;
        } else {
          console.warn(`Asset directory not found in either location:`);
          console.warn(`  - ${distPath}`);
          console.warn(`  - ${rootPath}`);
          return [];
        }
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
