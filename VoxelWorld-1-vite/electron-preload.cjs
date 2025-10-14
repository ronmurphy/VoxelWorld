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
        // they're unpacked to dist/art/ (via asarUnpack in package.json)
        const distPath = path.join(__dirname, 'dist', 'art', category);
        const rootPath = path.join(__dirname, 'art', category); // Fallback for older builds

        if (fs.existsSync(distPath)) {
          basePath = distPath;
          console.log(`✅ Using dist/art/${category} path:`, distPath);
        } else if (fs.existsSync(rootPath)) {
          basePath = rootPath;
          console.log(`✅ Using art/${category} path (legacy):`, rootPath);
        } else {
          console.warn(`❌ Asset directory not found in either location:`);
          console.warn(`  - ${distPath}`);
          console.warn(`  - ${rootPath}`);
          console.warn(`  - Current __dirname:`, __dirname);
          return [];
        }
      }

      if (!fs.existsSync(basePath)) {
        console.warn(`Asset directory not found: ${basePath}`);
        return [];
      }

      const files = fs.readdirSync(basePath);
      console.log(`📁 Found ${files.length} files in ${category} (${basePath})`);
      if (category === 'blocks') {
        // Show first 10 block files for debugging
        console.log(`   First 10 blocks:`, files.slice(0, 10));
      }
      return files;
    } catch (error) {
      console.error(`Error listing asset files for ${category}:`, error);
      return [];
    }
  },

  // Read a file from the dist folder (for help files, etc.)
  readFile: async (relativePath) => {
    try {
      const path = require('path');
      const isDev = process.env.NODE_ENV === 'development';

      let filePath;
      if (isDev) {
        // Development: read from project root
        filePath = path.join(__dirname, relativePath);
      } else {
        // Production: read from dist/
        filePath = path.join(__dirname, 'dist', relativePath);
      }

      console.log(`📖 Reading file: ${filePath}`);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const content = fs.readFileSync(filePath, 'utf8');
      console.log(`✅ Read ${content.length} bytes from ${relativePath}`);
      return content;
    } catch (error) {
      console.error(`❌ Error reading file ${relativePath}:`, error);
      throw error;
    }
  }
});

// Also expose a simple isElectron flag at top level for convenience
contextBridge.exposeInMainWorld('isElectron', {
  platform: process.platform
});
