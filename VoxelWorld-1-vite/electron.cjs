const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const isDev = process.env.NODE_ENV === 'development';

// 🎮 Force high-performance GPU (dGPU) for better performance
// This helps on laptops with both integrated and dedicated GPUs
app.commandLine.appendSwitch('force_high_performance_gpu');

// 🔧 Additional GPU-related flags for better performance
app.commandLine.appendSwitch('disable-gpu-vsync'); // Disable V-Sync for uncapped FPS
app.commandLine.appendSwitch('ignore-gpu-blacklist'); // Ignore GPU blacklist
app.commandLine.appendSwitch('enable-gpu-rasterization'); // Use GPU for rasterization

console.log('🎮 Electron GPU flags enabled:');
console.log('   - force_high_performance_gpu: true');
console.log('   - disable-gpu-vsync: true');
console.log('   - ignore-gpu-blacklist: true');
console.log('   - enable-gpu-rasterization: true');

// ========================================
// 🎓 TUTORIAL EDITOR IPC HANDLERS
// ========================================

/**
 * Auto-load tutorialScripts.json from data folder
 */
ipcMain.handle('tutorial-editor:auto-load', async () => {
  try {
    const tutorialPath = isDev
      ? path.join(__dirname, 'assets', 'data', 'tutorialScripts.json')
      : path.join(app.getAppPath(), 'assets', 'data', 'tutorialScripts.json');
    
    console.log('📂 Attempting to auto-load from:', tutorialPath);
    
    const fileContent = await fs.readFile(tutorialPath, 'utf8');
    const data = JSON.parse(fileContent);
    
    console.log('✅ Auto-loaded tutorialScripts.json');
    return data;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('ℹ️ No tutorialScripts.json found (first run)');
    } else {
      console.error('❌ Auto-load error:', error);
    }
    return null;
  }
});

/**
 * Show open dialog and load selected file
 */
ipcMain.handle('tutorial-editor:open-dialog', async (event) => {
  try {
    const result = await dialog.showOpenDialog({
      title: 'Open Tutorial Script',
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const filePath = result.filePaths[0];
    console.log('📂 Loading file from:', filePath);
    
    const fileContent = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(fileContent);

    return {
      canceled: false,
      filePath: filePath,
      data: data
    };
  } catch (error) {
    console.error('❌ Open dialog error:', error);
    throw error;
  }
});

/**
 * Show save dialog and save to selected location
 */
ipcMain.handle('tutorial-editor:save-dialog', async (event, { data, defaultPath }) => {
  try {
    const result = await dialog.showSaveDialog({
      title: 'Save Tutorial Script',
      defaultPath: defaultPath || 'tutorialScripts.json',
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    const filePath = result.filePath;
    console.log('💾 Saving file to:', filePath);

    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');

    return {
      canceled: false,
      filePath: filePath
    };
  } catch (error) {
    console.error('❌ Save dialog error:', error);
    throw error;
  }
});

/**
 * Save to default location (data folder)
 */
ipcMain.handle('tutorial-editor:save-default', async (event, data) => {
  try {
    const tutorialPath = isDev
      ? path.join(__dirname, 'assets', 'data', 'tutorialScripts.json')
      : path.join(app.getAppPath(), 'assets', 'data', 'tutorialScripts.json');

    console.log('💾 Saving to default location:', tutorialPath);

    // Ensure data directory exists
    const dataDir = path.dirname(tutorialPath);
    await fs.mkdir(dataDir, { recursive: true });

    await fs.writeFile(tutorialPath, JSON.stringify(data, null, 2), 'utf8');

    console.log('✅ Saved to default location');
    return { success: true };
  } catch (error) {
    console.error('❌ Default save error:', error);
    throw error;
  }
});

// ========================================
// 🐈‍⬛ Sargem Quest Editor - Image File Picker
// ========================================

/**
 * Copy image file to quest-images folder
 */
ipcMain.handle('sargem:copy-image', async (event, { sourcePath, fileName }) => {
  try {
    // In production (Electron), copy to dist/assets/quest-images
    // In dev, copy to assets/quest-images
    const destDir = isDev
      ? path.join(__dirname, 'assets', 'quest-images')
      : path.join(__dirname, 'dist', 'assets', 'quest-images');

    // Ensure quest-images directory exists
    await fs.mkdir(destDir, { recursive: true });

    const destPath = path.join(destDir, fileName);
    
    console.log('📸 Copying image:', sourcePath, '→', destPath);

    // Copy file
    await fs.copyFile(sourcePath, destPath);

    // Return relative path for use in quest (always assets/quest-images)
    const relativePath = `assets/quest-images/${fileName}`;
    console.log('✅ Image copied, relative path:', relativePath);
    
    return { success: true, path: relativePath };
  } catch (error) {
    console.error('❌ Image copy error:', error);
    throw error;
  }
});

/**
 * Open file dialog for image selection
 */
ipcMain.handle('sargem:pick-image', async (event) => {
  try {
    const result = await dialog.showOpenDialog({
      title: 'Select Quest Image',
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }
      ],
      properties: ['openFile']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const sourcePath = result.filePaths[0];
    const fileName = path.basename(sourcePath);

    console.log('🖼️ Selected image:', fileName);
    
    return { 
      success: true, 
      sourcePath, 
      fileName 
    };
  } catch (error) {
    console.error('❌ Image picker error:', error);
    throw error;
  }
});

// ========================================

function createWindow() {
  // Use app.getAppPath() to work with asar packaging
  const preloadPath = path.join(app.getAppPath(), 'electron-preload.cjs');
  
  console.log('🔧 Preload script path:', preloadPath);
  console.log('🔧 app.getAppPath():', app.getAppPath());

  // Create the browser window
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: false, // Allow loading local assets
      sandbox: false, // Disable sandbox to allow preload script access to Node.js
      preload: preloadPath
    },
    icon: path.join(__dirname, 'build/icon.png'), // Add icon later
    title: 'VoxelWorld',
    show: false, // Don't show until ready
  });

  // Create application menu
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Game',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.executeJavaScript('window.playerNewGameClean && window.playerNewGameClean()');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Fullscreen',
          accelerator: 'F11',
          click: () => {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
          }
        },
        { type: 'separator' },
        {
          label: 'Dev Controls',
          accelerator: 'CmdOrCtrl+D',
          click: () => {
            mainWindow.webContents.executeJavaScript(`
              if (window.voxelWorld && window.voxelWorld.openDevControlPanel) {
                window.voxelWorld.openDevControlPanel();
              }
            `);
          }
        },
        {
          label: 'FPS Counter',
          type: 'checkbox',
          checked: false,
          click: (menuItem) => {
            mainWindow.webContents.executeJavaScript(`
              if (window.voxelWorld && window.voxelWorld.toggleFPS) {
                window.voxelWorld.toggleFPS();
              }
            `);
          }
        },
        { type: 'separator' },
        {
          label: 'Developer Tools',
          accelerator: 'F12',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About VoxelWorld',
          click: () => {
            mainWindow.webContents.executeJavaScript(`
              (async function() {
                // Fetch version info
                let versionText = 'v0.0.0';
                let buildDate = 'October 2025';
                try {
                  const response = await fetch('version.json');
                  const version = await response.json();
                  versionText = \`v\${version.major}.\${version.minor}.\${version.revision}\`;
                  if (version.buildDate) {
                    const date = new Date(version.buildDate);
                    buildDate = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                  }
                } catch (e) {
                  console.warn('Failed to load version:', e);
                }

                const modal = document.createElement('div');
                modal.className = 'voxel-modal-overlay';
                modal.style.zIndex = '10000';

                modal.innerHTML = \`
                  <div class="voxel-modal character-creation-modal" style="max-width: 600px;">
                    <div class="modal-header">
                      <h2>🎮 VoxelWorld</h2>
                      <p class="subtitle">A Voxel-Based Adventure Game</p>
                    </div>

                    <div class="modal-body">
                      <div class="info-box" style="background: #e7f3ff; border-color: #0066cc;">
                        <p style="text-align: center; font-size: 14px; margin-bottom: 20px;">
                          <strong>Development Build \${versionText}</strong><br>
                          <span style="font-size: 12px; opacity: 0.8;">\${buildDate}</span>
                        </p>

                        <div style="margin: 20px 0;">
                          <h4 style="margin: 15px 0 8px 0; color: #333;">💻 Development</h4>
                          <p style="margin: 5px 0; padding-left: 15px;"><strong>Original Code:</strong> Ron Murphy (<a href="https://github.com/ronmurphy/VoxelWorld" target="_blank" style="color: #0066cc;">solo.dev</a>)</p>
                          <p style="margin: 5px 0; padding-left: 15px;"><strong>Code Refinements:</strong> Claude (Anthropic)</p>
                        </div>

                        <div style="margin: 20px 0;">
                          <h4 style="margin: 15px 0 8px 0; color: #333;">🎨 Art & Audio</h4>
                          <p style="margin: 5px 0; padding-left: 15px;"><strong>Artwork:</strong> m0use</p>
                          <p style="margin: 5px 0; padding-left: 15px;"><strong>Music:</strong> Jason Heaberlin</p>
                          <p style="margin: 5px 0; padding-left: 15px;"><strong>Sfx:</strong> Connor Allen</p>
                        </div>

                        <div style="margin: 20px 0;">
                          <h4 style="margin: 15px 0 8px 0; color: #333;">🧪 Testing Team</h4>
                          <p style="margin: 5px 0; padding-left: 15px;">Michelle Smith</p>
                          <p style="margin: 5px 0; padding-left: 15px;">David Daniels</p>
                          <p style="margin: 5px 0; padding-left: 15px;">Chris Mahan</p>
                          <p style="margin: 5px 0; padding-left: 15px;">Connor Allen</p>
                        </div>

                        <div style="margin-top: 5px; padding-top: 5px; border-top: 1px solid #0066cc;">
                          <p style="text-align: center; font-size: 12px; opacity: 0.7; margin: 0;">
                            Built with Three.js • Vite • Electron<br>
                            <em>Thank you for playtesting!</em> 🎮
                          </p>
                        </div>
                      </div>
                    </div>

                    <div class="modal-footer" style="justify-content: center;">
                      <button class="btn btn-primary" id="about-close">Close</button>
                    </div>
                  </div>
                \`;

                document.body.appendChild(modal);

                // Handle close button
                modal.querySelector('#about-close').addEventListener('click', () => {
                  modal.remove();
                });

                // Close on overlay click
                modal.addEventListener('click', (e) => {
                  if (e.target === modal) {
                    modal.remove();
                  }
                });
              })();
            `);
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    // Dereference the window object
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});