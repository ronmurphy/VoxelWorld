const { contextBridge } = require('electron');
const path = require('path');
const fs = require('fs');

contextBridge.exposeInMainWorld('electronAPI', {
  getResourcesPath: () => process.resourcesPath,
  getAppPath: () => path.dirname(process.resourcesPath),
  platform: process.platform,

  // List files in a directory (for asset discovery)
  listAssetFiles: async (category) => {
    try {
      const isDev = process.env.NODE_ENV === 'development';
      const basePath = isDev
        ? path.join(__dirname, 'assets', 'art', category)
        : path.join(__dirname, 'dist', 'art', category);

      if (!fs.existsSync(basePath)) {
        console.warn(`Asset directory not found: ${basePath}`);
        return [];
      }

      const files = fs.readdirSync(basePath);
      console.log(`=� Found ${files.length} files in ${category}:`, files);
      return files;
    } catch (error) {
      console.error(`Error listing asset files for ${category}:`, error);
      return [];
    }
  }
});
