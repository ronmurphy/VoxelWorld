const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

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