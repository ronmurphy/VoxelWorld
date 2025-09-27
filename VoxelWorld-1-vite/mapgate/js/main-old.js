// ShapeForge Standalone - Minimal initialization
console.log("🔧 ShapeForge Standalone initializing...");

// Global variables
let resourceManager = null;
let shaderEffectsManager = null;
let scene3DController = null;
let shapeForge = null;
let stats = null;

// Current object data
let currentObject = null;

// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    console.log("📋 DOM loaded, initializing ShapeForge...");
    
    try {
        // Initialize ResourceManager
        if (window.ResourceManager) {
            resourceManager = new window.ResourceManager();
            window.resourceManager = resourceManager;
            console.log("✅ ResourceManager initialized");
        } else {
            console.error("❌ ResourceManager not available!");
        }

        // Initialize ShaderEffectsManager (will be set up with Scene3D later)
        console.log("✅ ShaderEffectsManager ready");

        // Set up event listeners
        setupEventListeners();
        
        console.log("🎉 ShapeForge Standalone ready!");
        
    } catch (error) {
        console.error("❌ Failed to initialize ShapeForge:", error);
    }
});

function setupEventListeners() {
    // ShapeForge button
    const shapeForgeBtn = document.getElementById('shapeForgeBtn');
    if (shapeForgeBtn) {
        shapeForgeBtn.addEventListener('click', openShapeForge);
    }

    // 3D Viewer button
    const view3DBtn = document.getElementById('view3DBtn');
    if (view3DBtn) {
        view3DBtn.addEventListener('click', open3DViewer);
    }

    // Sample Objects button
    const sampleObjectsBtn = document.getElementById('sampleObjectsBtn');
    if (sampleObjectsBtn) {
        sampleObjectsBtn.addEventListener('click', showSampleObjects);
    }

    // Load Object button
    const loadObjectBtn = document.getElementById('loadObjectBtn');
    if (loadObjectBtn) {
        loadObjectBtn.addEventListener('click', loadObject);
    }

    // Save Object button
    const saveObjectBtn = document.getElementById('saveObjectBtn');
    if (saveObjectBtn) {
        saveObjectBtn.addEventListener('click', saveObject);
    }
}

// Open ShapeForge editor
function openShapeForge() {
    console.log("🎨 Opening ShapeForge editor...");
    
    try {
        if (!shapeForge) {
            // Initialize ShapeForge
            shapeForge = new ShapeForge(resourceManager, shaderEffectsManager);
            window.shapeForge = shapeForge;
        }
        
        // Open the ShapeForge interface
        shapeForge.openEditor();
        
    } catch (error) {
        console.error("❌ Failed to open ShapeForge:", error);
        alert("Failed to open ShapeForge. Check console for details.");
    }
}

// Open 3D Viewer for testing objects
function open3DViewer() {
    console.log("👁️ Opening 3D Viewer...");
    
    try {
        if (!scene3DController) {
            // Initialize Scene3D
            const viewer3d = document.getElementById('viewer3d');
            scene3DController = new Scene3DController();
            
            // Initialize the 3D scene in the viewer container
            scene3DController.initialize(viewer3d);
            
            // Initialize shader effects manager with scene3D
            if (scene3DController && !shaderEffectsManager) {
                shaderEffectsManager = new ShaderEffectsManager(scene3DController);
                window.shaderEffectsManager = shaderEffectsManager;
            }
            
            // Set up exit controls
            setupViewerControls();
        }
        
        // Show the 3D viewer
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('viewer3d').style.display = 'block';
        
        // Start the 3D scene
        scene3DController.enter3DMode();
        
        // If we have a current object, load it
        if (currentObject) {
            loadObjectIntoViewer(currentObject);
        }
        
    } catch (error) {
        console.error("❌ Failed to open 3D Viewer:", error);
        alert("Failed to open 3D Viewer. Check console for details.");
    }
}

function setupViewerControls() {
    // Listen for 'E' key to exit 3D mode
    document.addEventListener('keydown', (event) => {
        if (event.key.toLowerCase() === 'e' && scene3DController && scene3DController.is3DMode) {
            exit3DViewer();
        }
    });
}

function exit3DViewer() {
    console.log("🚪 Exiting 3D Viewer...");
    
    if (scene3DController) {
        scene3DController.exit3DMode();
    }
    
    // Hide the 3D viewer and show welcome screen
    document.getElementById('viewer3d').style.display = 'none';
    document.getElementById('welcomeScreen').style.display = 'flex';
}

// Show sample objects browser
function showSampleObjects() {
    console.log("📦 Showing sample objects...");
    
    // Create a dialog to show sample objects
    const dialog = document.createElement('sl-dialog');
    dialog.label = 'Sample Objects';
    dialog.style.setProperty('--width', '800px');
    
    dialog.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; max-height: 60vh; overflow-y: auto;">
            <!-- Sample objects will be loaded here -->
            <div id="sampleObjectsList">Loading sample objects...</div>
        </div>
        
        <div slot="footer">
            <sl-button variant="neutral" onclick="this.closest('sl-dialog').hide()">Close</sl-button>
        </div>
    `;
    
    document.body.appendChild(dialog);
    dialog.show();
    
    // Load sample objects
    loadSampleObjectsList();
}

async function loadSampleObjectsList() {
    const container = document.getElementById('sampleObjectsList');
    
    // Sample object files (based on what you have)
    const sampleFiles = [
        'Chest.shapeforge.json',
        'Pillar.shapeforge.json', 
        'Statue.shapeforge.json',
        'TexturedPillar2.shapeforge.json',
        'TexturedStatue.shapeforge.json',
        'TexturedStatue2.shapeforge.json',
        'woodBlock.shapeforge.json',
        'Fireball_d20.shapeforge.json',
        'magic_d20.shapeforge.json',
        'Dungeon Entrance.shapeforge.json',
        'Exit.shapeforge.json',
        'FireMarker.shapeforge.json',
        'Not-Statue.shapeforge.json'
    ];
    
    container.innerHTML = '';
    
    for (const filename of sampleFiles) {
        try {
            const response = await fetch(`assets/sampleObjects/ShapeForge/${filename}`);
            if (!response.ok) continue;
            
            const objectData = await response.json();
            
            // Create object card
            const card = document.createElement('div');
            card.style.cssText = `
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                background: white;
            `;
            
            card.innerHTML = `
                <div style="text-align: center;">
                    ${objectData.thumbnail ? 
                        `<img src="${objectData.thumbnail}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;" />` :
                        `<div style="width: 100%; height: 120px; background: #f0f0f0; border-radius: 4px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; color: #666;">
                            <span class="material-icons" style="font-size: 48px;">3d_rotation</span>
                        </div>`
                    }
                    <div style="font-weight: bold; margin-bottom: 4px;">${objectData.name}</div>
                    <div style="font-size: 12px; color: #666;">Click to load</div>
                </div>
            `;
            
            card.addEventListener('click', () => {
                loadSampleObject(filename, objectData);
                card.closest('sl-dialog').hide();
            });
            
            card.addEventListener('mouseover', () => {
                card.style.transform = 'translateY(-2px)';
                card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            });
            
            card.addEventListener('mouseout', () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = 'none';
            });
            
            container.appendChild(card);
            
        } catch (error) {
            console.warn(`Could not load sample object: ${filename}`, error);
        }
    }
    
    if (container.children.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">No sample objects found</div>';
    }
}

function loadSampleObject(filename, objectData) {
    console.log(`📦 Loading sample object: ${filename}`);
    currentObject = objectData;
    
    // Show a success message
    const alert = document.createElement('div');
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 16px;
        border-radius: 4px;
        z-index: 10000;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    alert.textContent = `Loaded: ${objectData.name}`;
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 3000);
    
    // If 3D viewer is open, load the object there
    if (scene3DController && scene3DController.is3DMode) {
        loadObjectIntoViewer(objectData);
    }
}

function loadObjectIntoViewer(objectData) {
    if (!scene3DController || !window.ShapeForgeParser) {
        console.warn("Scene3D or ShapeForgeParser not available");
        return;
    }
    
    try {
        // Use ShapeForgeParser to load the object into the scene
        const parser = new ShapeForgeParser();
        const mesh = parser.parseShapeForgeObject(objectData);
        
        if (mesh) {
            // Clear previous objects (optional)
            scene3DController.clearScene();
            
            // Add the new object to the scene
            scene3DController.scene.add(mesh);
            
            console.log(`✅ Object "${objectData.name}" loaded into 3D viewer`);
        }
        
    } catch (error) {
        console.error("Failed to load object into viewer:", error);
    }
}

// Load object from file
function loadObject() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.shapeforge.json,.json';
    
    input.onchange = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const objectData = JSON.parse(e.target.result);
                    currentObject = objectData;
                    console.log(`📁 Loaded object: ${objectData.name}`);
                    
                    // Show success message
                    alert(`Loaded object: ${objectData.name}`);
                    
                } catch (error) {
                    console.error("Failed to load object:", error);
                    alert("Failed to load object. Make sure it's a valid ShapeForge file.");
                }
            };
            reader.readAsText(file);
        }
    };
    
    input.click();
}

// Save current object
function saveObject() {
    if (!currentObject) {
        alert("No object to save. Create or load an object first.");
        return;
    }
    
    const dataStr = JSON.stringify(currentObject, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${currentObject.name || 'object'}.shapeforge.json`;
    link.click();
    
    console.log(`💾 Saved object: ${currentObject.name}`);
}

// Make functions globally available
window.openShapeForge = openShapeForge;
window.showSampleObjects = showSampleObjects;
    // Initialize layers list height
    updateLayersListHeight();
    
    // Initialize map editor
    window.mapEditor = new MapEditor();

    // const resourceManager = window.ResourceManager ? new window.ResourceManager() : null;
  
    // // Initialize party and combat systems
    // if (resourceManager) {
    //   // Create managers
    //   const partyManager = new PartyManager(resourceManager);
    //   const combatSystem = new CombatSystem(partyManager, resourceManager);
      
    //   // Make these available globally for easy access
    //   window.partyManager = partyManager;
    //   window.combatSystem = combatSystem;
      
    //   console.log('Party and Combat systems initialized');
    // } else {
    //   console.warn('Resource manager not found, party and combat systems not initialized');
    // }

    const resourceManager = window.ResourceManager ? new window.ResourceManager() : null;

    // Initialize party and combat systems only if they don't exist
    if (resourceManager && !window.partyManager) {
      const partyManager = new PartyManager(resourceManager);
      const combatSystem = new CombatSystem(partyManager, resourceManager);
      
      window.partyManager = partyManager;
      window.combatSystem = combatSystem;
      
      console.log('Party and Combat systems initialized');
    }


    // help info
    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) {
      helpBtn.addEventListener('click', showHelpDialog);
    }
  
    function showHelpDialog() {
      const dialog = document.createElement('sl-dialog');
      dialog.label = 'Map Editor Help Guide';
      dialog.style.setProperty('--width', '700px');
      
      dialog.innerHTML = `
        <sl-tab-group>
          <sl-tab slot="nav" panel="getting-started">Getting Started</sl-tab>
          <sl-tab slot="nav" panel="map-basics">Map Basics</sl-tab>
          <sl-tab slot="nav" panel="working-with-map">Working with Maps</sl-tab>
          <sl-tab slot="nav" panel="3d-view">3D View</sl-tab>
          <sl-tab slot="nav" panel="saving-loading">Saving & Loading</sl-tab>
          <sl-tab slot="nav" panel="resources">Resources</sl-tab>
          
          <sl-tab-panel name="getting-started">
            <h3>Welcome to Map Editor!</h3>
            <p>This tool allows you to create and edit maps for your D&D campaigns or other tabletop adventures.</p>
            
            <div class="help-section">
              <h4>Quick Start Guide</h4>
              <ol>
                <li>Click the <span class="material-icons inline-icon">map</span> button to create a new map or open an existing one</li>
                <li>Use the tools in the left sidebar to add rooms, walls, and markers to your map</li>
                <li>Save your work using the <span class="material-icons inline-icon">save</span> button</li>
                <li>View your map in 3D with the <span class="material-icons inline-icon">view_in_ar</span> button</li>
              </ol>
            </div>
          </sl-tab-panel>
          
          <sl-tab-panel name="map-basics">
            <h3>Map Basics</h3>
            
            <div class="help-section">
              <h4>Creating a New Map</h4>
              <ol>
                <li>Click the <span class="material-icons inline-icon">map</span> button in the header</li>
                <li>Select "New Map" from the menu</li>
                <li>Choose a background image for your map</li>
                <li>Enter a name for your map when prompted</li>
              </ol>
            </div>
            
            <div class="help-section">
              <h4>Adding Rooms and Walls</h4>
              <ul>
                <li><strong>Rectangle Tool</strong> <span class="material-icons inline-icon">crop_square</span>: Creates rectangular rooms</li>
                <li><strong>Circle Tool</strong> <span class="material-icons inline-icon">circle</span>: Creates circular rooms</li>
                <li><strong>Wall Tool</strong> <span class="material-icons inline-icon">account_tree</span>: Creates custom polygon shapes for walls
                  <ul>
                    <li>Click to place points</li>
                    <li>Click near the first point to close the shape</li>
                  </ul>
                </li>
                <li><strong>Screenshot Tool</strong> <span class="material-icons inline-icon">photo_camera</span>: Takes a screenshot of the map</li>
              </ul>
            </div>
          </sl-tab-panel>
          
          <sl-tab-panel name="working-with-map">
            <h3>Working with Maps</h3>
            
            <div class="help-section">
              <h4>Adding Markers</h4>
              <ul>
                <li><strong>Player Start</strong> <span class="material-icons inline-icon">person_pin_circle</span>: Sets the starting position for the player in 3D view</li>
                <li><strong>Encounter</strong> <span class="material-icons inline-icon">local_fire_department</span>: Adds enemy encounters</li>
                <li><strong>Treasure</strong> <span class="material-icons inline-icon">workspace_premium</span>: Adds treasure locations</li>
                <li><strong>Trap</strong> <span class="material-icons inline-icon">warning</span>: Marks trap locations</li>
                <li><strong>Teleport</strong> <span class="material-icons inline-icon">swap_calls</span>: Creates teleport points (place two to create a pair)</li>
                <li><strong>Door</strong> <span class="material-icons inline-icon">door_front</span>: Adds doors to walls</li>
                <li><strong>Prop</strong> <span class="material-icons inline-icon">category</span>: Adds decorative props</li>
                <li><strong>Splash Art</strong> <span class="material-icons inline-icon">add_photo_alternate</span>: Adds interactive art/images</li>
              </ul>
            </div>
            
            <div class="help-section">
              <h4>Editing Elements</h4>
              <ul>
                <li>Click and drag rooms to move them</li>
                <li>Use the corner handles to resize rooms</li>
                <li>Use the Edit Marker tool <span class="material-icons inline-icon">edit_location</span> to move markers</li>
                <li>Right-click on any element to see additional options</li>
              </ul>
            </div>
            
            <div class="help-section">
              <h4>Layers Panel</h4>
              <p>The Rooms panel at the bottom of the sidebar allows you to:</p>
              <ul>
                <li>Organize rooms into folders</li>
                <li>Lock layers to prevent accidental changes</li>
                <li>Toggle visibility</li>
                <li>Select and edit rooms</li>
              </ul>
            </div>
          </sl-tab-panel>
          
          <sl-tab-panel name="3d-view">
            <h3>3D View</h3>
            
            <div class="help-section">
              <h4>Entering 3D View</h4>
              <p>Click the <span class="material-icons inline-icon">view_in_ar</span> button to enter 3D mode.</p>
              <p><strong>Important:</strong> It's recommended to run Preferences the first time you enter 3D view to optimize performance for your device.</p>
            </div>
            
            <div class="help-section">
              <h4>Navigation Controls</h4>
              <ul>
                <li><strong>WASD or Arrow Keys</strong>: Move forward, left, backward, right</li>
                <li><strong>Mouse</strong>: Look around</li>
                <li><strong>Shift or Right Mouse Button</strong>: Sprint</li>
                <li><strong>E</strong>: Interact with objects (doors, teleporters, props)</li>
                <li><strong>P</strong>: Toggle FPS counter</li>
                <li><strong>\\ (Backslash)</strong>: Open inventory</li>
                <li><strong>ESC</strong>: Exit pointer lock mode</li>
                <li><strong>~ (Backquote)</strong>: Open preferences</li>
              </ul>
            </div>
            
            <div class="help-section">
              <h4>Day/Night Cycle</h4>
              <p>The 3D view includes a day/night cycle system for more immersive scenes.</p>
              <ul>
                <li>Use the <span class="material-icons inline-icon">brightness_4</span> button in 3D view to adjust time of day</li>
                <li>You can set default time and auto-play options in Preferences</li>
              </ul>
            </div>
          </sl-tab-panel>
          
          <sl-tab-panel name="saving-loading">
            <h3>Saving & Loading</h3>
            
            <div class="help-section">
              <h4>Saving Your Work</h4>
              <p>Click the <span class="material-icons inline-icon">save</span> button to save your work. You have several options:</p>
              <ul>
                <li><strong>Save Map Only</strong>: Saves just the map structure (.map.json)</li>
                <li><strong>Save Complete Project</strong>: Saves the map, resources, and project file
                  <ul>
                    <li>This is the recommended option for most cases</li>
                    <li>Creates multiple files that work together</li>
                  </ul>
                </li>
              </ul>
            </div>
            
            <div class="help-section">
              <h4>Loading Maps & Projects</h4>
              <p>Click the <span class="material-icons inline-icon">map</span> button to load existing content:</p>
              <ul>
                <li><strong>Open Project File</strong>: Load a complete project with all resources</li>
                <li><strong>Open Map File</strong>: Load just a map structure</li>
                <li><strong>Open Resource Pack</strong>: Load textures, monsters, and other resources</li>
                <li><strong>Recent Projects</strong>: Quickly access recently saved projects</li>
              </ul>
            </div>
            
            <div class="help-section">
              <h4>Resource Manager</h4>
              <p>Click the <span class="material-icons inline-icon">palette</span> button to access the Resource Manager:</p>
              <ul>
                <li>Manage textures for walls, doors, props, etc.</li>
                <li>Import monster stats and tokens</li>
                <li>Organize resources into packs</li>
                <li>Import bestiary files (.bestiary.json)</li>
              </ul>
            </div>
          </sl-tab-panel>
          
          <sl-tab-panel name="resources">
            <h3>Resources</h3>
            
            <div class="help-section">
              <h4>Performance Settings</h4>
              <p>Click the <span class="material-icons inline-icon">settings</span> button to access Preferences:</p>
              <ul>
                <li>Adjust quality settings based on your device's capabilities</li>
                <li>Enable/disable shadows, anti-aliasing, and other visual effects</li>
                <li>Set FPS limits for better performance on lower-end devices</li>
                <li>Configure day/night cycle settings</li>
              </ul>
              <p><strong>Tip:</strong> For the best experience, run the preferences after entering 3D view for the first time.</p>
            </div>
          </sl-tab-panel>
        </sl-tab-group>
        
        <style>
          .help-section {
            margin-bottom: 20px;
          }
          .inline-icon {
            font-size: 18px;
            vertical-align: middle;
            margin: 0 2px;
          }
          h3 {
            margin-top: 0;
            border-bottom: 1px solid #ddd;
            padding-bottom: 8px;
          }
          h4 {
            margin-top: 16px;
            margin-bottom: 8px;
          }
          ul, ol {
            padding-left: 20px;
          }
          li {
            margin-bottom: 6px;
          }
        </style>
      `;
      
      document.body.appendChild(dialog);
      dialog.show();
    }

    
    
    const editorPrefsBtn = document.getElementById('editorPrefsBtn');
    if (editorPrefsBtn) {
      editorPrefsBtn.addEventListener('click', showEditorPreferencesDialog);
    }

// Updated function in main.js to add freehand stabilizer and background color options
function showEditorPreferencesDialog() {
  const dialog = document.createElement('sl-dialog');
  dialog.label = 'Map Editor Settings';
  dialog.style.setProperty('--width', '500px');
  
  // Get current settings from localStorage or use defaults
  const editorPrefs = JSON.parse(localStorage.getItem('editorPreferences') || '{}');
  const gridSnapping = editorPrefs.gridSnapping || 'soft';
  const showGrid = editorPrefs.showGrid !== undefined ? editorPrefs.showGrid : true;
  const gridOpacity = editorPrefs.gridOpacity !== undefined ? editorPrefs.gridOpacity : 0.1;
  const autoSaveInterval = editorPrefs.autoSaveInterval || 0; // 0 means disabled
  
  // New settings with defaults
  const freehandStabilizer = editorPrefs.freehandStabilizer !== undefined ? editorPrefs.freehandStabilizer : false;
  const freehandSensitivity = editorPrefs.freehandSensitivity || 0.5;
  const floorBackgroundColor = editorPrefs.floorBackgroundColor || '#2e7d32'; // Default to a nice green
  
  dialog.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px; overflow-y: auto; max-height: 70vh;">
      <!-- Grid Settings Section -->
      <div>
        <h3 style="margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Grid Settings</h3>
        
        <div style="margin-bottom: 16px;">
          <sl-switch id="showGrid" ${showGrid ? 'checked' : ''}>
            Show Grid
          </sl-switch>
        </div>
        
        <div style="margin-bottom: 16px;">
          <sl-select id="gridSnapping" label="Grid Snapping" value="${gridSnapping}">
            <sl-option value="soft">Soft Snap (Default)</sl-option>
            <sl-option value="strict">Strict Snap</sl-option>
            <sl-option value="none">No Snap</sl-option>
          </sl-select>
          <div style="font-size: 0.8em; color: #666; margin-top: 4px;">
            Controls how rooms and objects align to the grid
          </div>
        </div>
        
        <div style="margin-bottom: 16px;">
          <sl-range id="gridOpacity" 
                   label="Grid Opacity" 
                   min="0.05" 
                   max="0.5" 
                   step="0.05" 
                   value="${gridOpacity}"
                   tooltip="top">
          </sl-range>
        </div>
      </div>
      
      <!-- Freehand Tool Settings Section -->
      <div>
        <h3 style="margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Freehand Tool</h3>
        
        <div style="margin-bottom: 16px;">
          <sl-switch id="freehandStabilizer" ${freehandStabilizer ? 'checked' : ''}>
            Enable Stabilizer
          </sl-switch>
          <div style="font-size: 0.8em; color: #666; margin-top: 4px;">
            Smooths out hand-drawn lines by reducing jitter
          </div>
        </div>
        
        <div style="margin-bottom: 16px; ${freehandStabilizer ? '' : 'opacity: 0.5; pointer-events: none;'}" id="sensitivityContainer">
          <sl-range id="freehandSensitivity" 
                   label="Stabilizer Strength" 
                   min="0.1" 
                   max="0.9" 
                   step="0.1" 
                   value="${freehandSensitivity}"
                   tooltip="top">
          </sl-range>
          <div style="font-size: 0.8em; color: #666; margin-top: 4px;">
            Higher values create smoother lines but may feel less responsive
          </div>
        </div>
      </div>
      
      <!-- 3D View Settings Section -->
      <div>
        <h3 style="margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 8px;">3D View Settings</h3>
        
        <div style="margin-bottom: 16px;">
          <label for="floorBackgroundColor" style="display: block; margin-bottom: 8px;">Floor Background Color</label>
          <sl-color-picker id="floorBackgroundColor" value="${floorBackgroundColor}"></sl-color-picker>
          <div style="font-size: 0.8em; color: #666; margin-top: 4px;">
            Background color for transparent areas in floor textures
          </div>
        </div>
      </div>
      
      <!-- Auto-Save Section -->
      <div>
        <h3 style="margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Auto-Save</h3>
        
        <div style="margin-bottom: 16px;">
          <sl-select id="autoSaveInterval" label="Auto-Save Interval" value="${autoSaveInterval}">
            <sl-option value="0">Disabled</sl-option>
            <sl-option value="60">Every 1 minute</sl-option>
            <sl-option value="300">Every 5 minutes</sl-option>
            <sl-option value="600">Every 10 minutes</sl-option>
            <sl-option value="1800">Every 30 minutes</sl-option>
          </sl-select>
          <div style="font-size: 0.8em; color: #666; margin-top: 4px;">
            Automatically save your work at regular intervals
          </div>
        </div>
      </div>
      
      <!-- UI Settings Section -->
      <div>
        <h3 style="margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 8px;">UI Settings</h3>
        
        <div style="margin-bottom: 16px;">
          <sl-switch id="showThumbnails" ${editorPrefs.showThumbnails !== false ? 'checked' : ''}>
            Show Room Thumbnails
          </sl-switch>
        </div>
        
        <div style="margin-bottom: 16px;">
          <sl-switch id="confirmLayerDeletion" ${editorPrefs.confirmLayerDeletion !== false ? 'checked' : ''}>
            Confirm Layer Deletion
          </sl-switch>
        </div>
      </div>
    </div>
    
    <div slot="footer">
      <sl-button id="resetEditorDefaults" variant="text">Reset to Defaults</sl-button>
      <sl-button id="cancelEditorPrefs" variant="neutral">Cancel</sl-button>
      <sl-button id="saveEditorPrefs" variant="primary">Save Changes</sl-button>
    </div>
  `;
  
  // Add to document body
  document.body.appendChild(dialog);
  
  // Toggle sensitivity slider based on stabilizer toggle
  const stabilizerToggle = dialog.querySelector('#freehandStabilizer');
  const sensitivityContainer = dialog.querySelector('#sensitivityContainer');
  
  stabilizerToggle.addEventListener('sl-change', (e) => {
    sensitivityContainer.style.opacity = e.target.checked ? '1' : '0.5';
    sensitivityContainer.style.pointerEvents = e.target.checked ? 'auto' : 'none';
  });
  
  // Button handlers
  dialog.querySelector('#resetEditorDefaults').addEventListener('click', () => {
    dialog.querySelector('#gridSnapping').value = 'soft';
    dialog.querySelector('#showGrid').checked = true;
    dialog.querySelector('#gridOpacity').value = 0.1;
    dialog.querySelector('#autoSaveInterval').value = '0';
    dialog.querySelector('#showThumbnails').checked = true;
    dialog.querySelector('#confirmLayerDeletion').checked = true;
    dialog.querySelector('#freehandStabilizer').checked = false;
    dialog.querySelector('#freehandSensitivity').value = 0.5;
    dialog.querySelector('#floorBackgroundColor').value = '#2e7d32';
    sensitivityContainer.style.opacity = '0.5';
    sensitivityContainer.style.pointerEvents = 'none';
  });
  
  dialog.querySelector('#cancelEditorPrefs').addEventListener('click', () => {
    dialog.hide();
  });
  
  dialog.querySelector('#saveEditorPrefs').addEventListener('click', () => {
    // Get values from the form
    const prefs = {
      gridSnapping: dialog.querySelector('#gridSnapping').value,
      showGrid: dialog.querySelector('#showGrid').checked,
      gridOpacity: parseFloat(dialog.querySelector('#gridOpacity').value),
      autoSaveInterval: parseInt(dialog.querySelector('#autoSaveInterval').value),
      showThumbnails: dialog.querySelector('#showThumbnails').checked,
      confirmLayerDeletion: dialog.querySelector('#confirmLayerDeletion').checked,
      freehandStabilizer: dialog.querySelector('#freehandStabilizer').checked,
      freehandSensitivity: parseFloat(dialog.querySelector('#freehandSensitivity').value),
      floorBackgroundColor: dialog.querySelector('#floorBackgroundColor').value
    };
    
    // Save to localStorage
    localStorage.setItem('editorPreferences', JSON.stringify(prefs));
    
    // Apply settings immediately
    window.applyEditorPreferences?.(prefs);
    
    dialog.hide();
  });
  
  dialog.show();
}
  
    // function showEditorPreferencesDialog() {
    //   const dialog = document.createElement('sl-dialog');
    //   dialog.label = 'Map Editor Settings';
    //   dialog.style.setProperty('--width', '500px');
      
    //   // Get current settings from localStorage or use defaults
    //   const editorPrefs = JSON.parse(localStorage.getItem('editorPreferences') || '{}');
    //   const gridSnapping = editorPrefs.gridSnapping || 'soft';
    //   const showGrid = editorPrefs.showGrid !== undefined ? editorPrefs.showGrid : true;
    //   const gridOpacity = editorPrefs.gridOpacity !== undefined ? editorPrefs.gridOpacity : 0.1;
    //   const autoSaveInterval = editorPrefs.autoSaveInterval || 0; // 0 means disabled
      
    //   dialog.innerHTML = `
    //     <div style="display: flex; flex-direction: column; gap: 20px;">
    //       <!-- Grid Settings Section -->
    //       <div>
    //         <h3 style="margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Grid Settings</h3>
            
    //         <div style="margin-bottom: 16px;">
    //           <sl-switch id="showGrid" ${showGrid ? 'checked' : ''}>
    //             Show Grid
    //           </sl-switch>
    //         </div>
            
    //         <div style="margin-bottom: 16px;">
    //           <sl-select id="gridSnapping" label="Grid Snapping" value="${gridSnapping}">
    //             <sl-option value="soft">Soft Snap (Default)</sl-option>
    //             <sl-option value="strict">Strict Snap</sl-option>
    //             <sl-option value="none">No Snap</sl-option>
    //           </sl-select>
    //           <div style="font-size: 0.8em; color: #666; margin-top: 4px;">
    //             Controls how rooms and objects align to the grid
    //           </div>
    //         </div>
            
    //         <div style="margin-bottom: 16px;">
    //           <sl-range id="gridOpacity" 
    //                    label="Grid Opacity" 
    //                    min="0.05" 
    //                    max="0.5" 
    //                    step="0.05" 
    //                    value="${gridOpacity}"
    //                    tooltip="top">
    //           </sl-range>
    //         </div>
    //       </div>
          
    //       <!-- Auto-Save Section -->
    //       <div>
    //         <h3 style="margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Auto-Save</h3>
            
    //         <div style="margin-bottom: 16px;">
    //           <sl-select id="autoSaveInterval" label="Auto-Save Interval" value="${autoSaveInterval}">
    //             <sl-option value="0">Disabled</sl-option>
    //             <sl-option value="60">Every 1 minute</sl-option>
    //             <sl-option value="300">Every 5 minutes</sl-option>
    //             <sl-option value="600">Every 10 minutes</sl-option>
    //             <sl-option value="1800">Every 30 minutes</sl-option>
    //           </sl-select>
    //           <div style="font-size: 0.8em; color: #666; margin-top: 4px;">
    //             Automatically save your work at regular intervals
    //           </div>
    //         </div>
    //       </div>
          
    //       <!-- UI Settings Section -->
    //       <div>
    //         <h3 style="margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 8px;">UI Settings</h3>
            
    //         <div style="margin-bottom: 16px;">
    //           <sl-switch id="showThumbnails" checked>
    //             Show Room Thumbnails
    //           </sl-switch>
    //         </div>
            
    //         <div style="margin-bottom: 16px;">
    //           <sl-switch id="confirmLayerDeletion" checked>
    //             Confirm Layer Deletion
    //           </sl-switch>
    //         </div>
    //       </div>
    //     </div>
        
    //     <div slot="footer">
    //       <sl-button id="resetEditorDefaults" variant="text">Reset to Defaults</sl-button>
    //       <sl-button id="cancelEditorPrefs" variant="neutral">Cancel</sl-button>
    //       <sl-button id="saveEditorPrefs" variant="primary">Save Changes</sl-button>
    //     </div>
    //   `;
      
    //   // Add to document body
    //   document.body.appendChild(dialog);
      
    //   // Button handlers
    //   dialog.querySelector('#resetEditorDefaults').addEventListener('click', () => {
    //     dialog.querySelector('#gridSnapping').value = 'soft';
    //     dialog.querySelector('#showGrid').checked = true;
    //     dialog.querySelector('#gridOpacity').value = 0.1;
    //     dialog.querySelector('#autoSaveInterval').value = '0';
    //     dialog.querySelector('#showThumbnails').checked = true;
    //     dialog.querySelector('#confirmLayerDeletion').checked = true;
    //   });
      
    //   dialog.querySelector('#cancelEditorPrefs').addEventListener('click', () => {
    //     dialog.hide();
    //   });
      
    //   dialog.querySelector('#saveEditorPrefs').addEventListener('click', () => {
    //     // Get values from the form
    //     const prefs = {
    //       gridSnapping: dialog.querySelector('#gridSnapping').value,
    //       showGrid: dialog.querySelector('#showGrid').checked,
    //       gridOpacity: parseFloat(dialog.querySelector('#gridOpacity').value),
    //       autoSaveInterval: parseInt(dialog.querySelector('#autoSaveInterval').value),
    //       showThumbnails: dialog.querySelector('#showThumbnails').checked,
    //       confirmLayerDeletion: dialog.querySelector('#confirmLayerDeletion').checked
    //     };
        
    //     // Save to localStorage
    //     localStorage.setItem('editorPreferences', JSON.stringify(prefs));
        
    //     // Apply settings immediately
    //     window.applyEditorPreferences?.(prefs);
        
    //     dialog.hide();
    //   });
      
    //   dialog.show();
    // }


  });


// Window resize handler
window.addEventListener("resize", updateLayersListHeight);