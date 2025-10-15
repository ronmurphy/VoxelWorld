const { contextBridge } = require('electron');
const fs = require('fs');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  // List files in a directory (for asset discovery)
  listAssetFiles: async (category) => {
    try {
      const isDev = process.env.NODE_ENV === 'development';
      // Build path manually without path.join
      const basePath = isDev
        ? `${__dirname}/assets/art/${category}`
        : `${__dirname}/dist/art/${category}`;

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
