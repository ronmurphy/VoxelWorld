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
  },

  // 💾 SAVE SYSTEM: Write save file to user data directory
  writeSaveFile: async (relativePath, data) => {
    try {
      const path = require('path');
      
      // In preload, __dirname points to the app location
      // For Electron, we'll save in a 'saves' folder next to the app
      const appPath = __dirname;
      const userDataPath = path.join(appPath, 'user-data');
      const filePath = path.join(userDataPath, relativePath);
      const dirPath = path.dirname(filePath);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`📁 Created directory: ${dirPath}`);
      }
      
      fs.writeFileSync(filePath, data, 'utf8');
      console.log(`💾 Saved file: ${filePath} (${(data.length / 1024).toFixed(2)} KB)`);
      return { success: true, path: filePath };
    } catch (error) {
      console.error(`❌ Error writing save file ${relativePath}:`, error);
      throw error;
    }
  },

  // 📂 SAVE SYSTEM: Read save file from user data directory
  readSaveFile: async (relativePath) => {
    try {
      const path = require('path');
      
      // In preload, __dirname points to the app location
      const appPath = __dirname;
      const userDataPath = path.join(appPath, 'user-data');
      const filePath = path.join(userDataPath, relativePath);
      
      if (!fs.existsSync(filePath)) {
        console.log(`📂 Save file not found: ${filePath}`);
        return null;
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      console.log(`📂 Loaded save file: ${filePath} (${(content.length / 1024).toFixed(2)} KB)`);
      return content;
    } catch (error) {
      console.error(`❌ Error reading save file ${relativePath}:`, error);
      throw error;
    }
  },

  // 🗑️ SAVE SYSTEM: Delete save file
  deleteSaveFile: async (relativePath) => {
    try {
      const path = require('path');
      
      // In preload, __dirname points to the app location
      const appPath = __dirname;
      const userDataPath = path.join(appPath, 'user-data');
      const filePath = path.join(userDataPath, relativePath);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Deleted save file: ${filePath}`);
        return { success: true };
      } else {
        console.log(`📂 Save file not found (already deleted?): ${filePath}`);
        return { success: true };
      }
    } catch (error) {
      console.error(`❌ Error deleting save file ${relativePath}:`, error);
      throw error;
    }
  },

  // 📁 SAVE SYSTEM: Get user data path (for debugging)
  getUserDataPath: () => {
    try {
      const path = require('path');
      const appPath = __dirname;
      return path.join(appPath, 'user-data');
    } catch (error) {
      console.error('❌ Error getting user data path:', error);
      return null;
    }
  }
});

// Also expose a simple isElectron flag at top level for convenience
contextBridge.exposeInMainWorld('isElectron', {
  platform: process.platform
});
