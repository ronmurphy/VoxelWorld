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
        // Initialize ResourceManager exactly like maped3d does
        if (window.ResourceManager) {
            resourceManager = new window.ResourceManager();
            window.resourceManager = resourceManager;
            console.log("✅ ResourceManager initialized and set globally");
            
            // Test ResourceManager capabilities
            console.log("🧪 Testing ResourceManager capabilities:");
            console.log("  - Resources structure:", Object.keys(resourceManager.resources));
            console.log("  - Loaded packs:", resourceManager.loadedPacks.size);
            console.log("  - Methods available:", typeof resourceManager.loadResourcePack, typeof resourceManager.saveResourcePack);
            console.log("  - IndexedDB ready for:", resourceManager.resources.textures ? "✅ textures" : "❌ textures");
            console.log("  - Sound system ready:", resourceManager.resources.sounds ? "✅ sounds" : "❌ sounds");
            console.log("  - Bestiary ready:", resourceManager.resources.bestiary ? "✅ bestiary" : "❌ bestiary");
        } else {
            console.error("❌ ResourceManager class not available!");
        }

        // Set up event listeners
        setupEventListeners();
        
        // Calculate and set proper container heights
        setTimeout(() => {
            calculateAndSetContainerHeights();
        }, 100); // Small delay to ensure DOM is fully rendered
        
        // Add window resize handler to recalculate heights
        window.addEventListener('resize', () => {
            console.log("🔄 Window resized, recalculating container heights...");
            calculateAndSetContainerHeights();
        });
        
        console.log("🎉 ShapeForge Standalone ready!");
        
    } catch (error) {
        console.error("❌ Failed to initialize ShapeForge:", error);
    }
});

function setupEventListeners() {
    // Load Object button (exists in multiple places)
    const loadObjectBtns = document.querySelectorAll('#loadObjectBtn');
    loadObjectBtns.forEach(btn => {
        if (btn) btn.addEventListener('click', loadObject);
    });

    // Save Object button (exists in multiple places)
    const saveObjectBtns = document.querySelectorAll('#saveObjectBtn');
    saveObjectBtns.forEach(btn => {
        if (btn) btn.addEventListener('click', saveObject);
    });
    
    // ResourceManager buttons
    setupResourceManagerListeners();
    
    console.log("🔗 Event listeners set up for tabbed interface");
}

function setupResourceManagerListeners() {
    // Open Resource Manager Drawer (using the proper maped3d approach)
    const openResourceDrawerBtn = document.getElementById('openResourceDrawerBtn');
    if (openResourceDrawerBtn) {
        openResourceDrawerBtn.addEventListener('click', () => {
            if (resourceManager) {
                console.log("🎨 Opening ResourceManager drawer...");
                const drawer = resourceManager.createResourceManagerUI();
                drawer.show();
            } else {
                console.error("ResourceManager not available");
            }
        });
    }
    
    console.log("🎮 ResourceManager event listeners set up");
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
        shapeForge.show();
        
    } catch (error) {
        console.error("❌ Failed to open ShapeForge:", error);
        alert("Failed to open ShapeForge. Check console for details.");
    }
}

function initializeShapeForgeWorkspace() {
    console.log("🎨 Initializing ShapeForge workspace...");
    
    try {
        const welcomeDiv = document.getElementById('shapeforge-welcome');
        const editorDiv = document.getElementById('shapeforge-editor');
        
        if (!welcomeDiv || !editorDiv) {
            console.error("❌ ShapeForge workspace containers not found!");
            return;
        }
        
        // Hide welcome, show editor
        welcomeDiv.style.display = 'none';
        editorDiv.style.display = 'block';
        
        if (!shapeForge) {
            // Initialize ShapeForge with the editor container directly
            console.log("🎯 Creating ShapeForge directly in tab container...");
            shapeForge = new ShapeForge(resourceManager, shaderEffectsManager, null, editorDiv);
            window.shapeForge = shapeForge;
        }
        
        // Show ShapeForge in the tab container (no drawer!)
        shapeForge.show(editorDiv);
        
        // Ensure proper container heights
        calculateAndSetContainerHeights();
        
        console.log("✅ ShapeForge initialized directly in workspace tab");
        
    } catch (error) {
        console.error("❌ Failed to initialize ShapeForge workspace:", error);
        alert("Failed to initialize ShapeForge. Check console for details.");
    }
}

// Add a function to calculate and set proper container heights
function calculateAndSetContainerHeights() {
    console.log("📏 Calculating proper container heights...");
    
    // Get viewport height
    const viewportHeight = window.innerHeight;
    console.log("🖥️ Viewport height:", viewportHeight);
    
    // Calculate heights of fixed elements
    const header = document.querySelector('.app-header') || document.querySelector('header');
    const headerHeight = header ? header.offsetHeight : 0;
    console.log("📋 Header height:", headerHeight);
    
    // Get tab navigation height (the actual tab buttons)
    const tabGroup = document.querySelector('sl-tab-group');
    const tabNav = tabGroup ? tabGroup.shadowRoot?.querySelector('.tab-group__nav') : null;
    const tabNavHeight = tabNav ? tabNav.offsetHeight : 50; // Fallback to estimated height
    console.log("🏷️ Tab navigation height:", tabNavHeight);
    
    // Calculate available height for content
    const availableHeight = viewportHeight - headerHeight - tabNavHeight;
    console.log("✅ Available height for content:", availableHeight);
    
    // Apply to all tab panels
    const tabPanels = document.querySelectorAll('sl-tab-panel');
    tabPanels.forEach((panel, index) => {
        panel.style.height = `${availableHeight}px`;
        console.log(`📐 Set tab panel ${index + 1} height to:`, availableHeight);
        
        // For panels with flex column layout, ensure the content area gets proper height
        const flexColumnDiv = panel.querySelector('div[style*="flex-direction: column"]');
        if (flexColumnDiv) {
            flexColumnDiv.style.height = `${availableHeight}px`;
            
            // Find toolbar and content areas
            const toolbar = flexColumnDiv.querySelector('div[style*="padding"][style*="background: white"]');
            const toolbarHeight = toolbar ? toolbar.offsetHeight : 0;
            
            // Calculate height for content area (flex: 1 element)
            const contentHeight = availableHeight - toolbarHeight;
            const contentArea = flexColumnDiv.querySelector('div[style*="flex: 1"]');
            if (contentArea) {
                contentArea.style.height = `${contentHeight}px`;
                contentArea.style.minHeight = `${contentHeight}px`;
                console.log(`📦 Set content area height to: ${contentHeight}px (available: ${availableHeight} - toolbar: ${toolbarHeight})`);
            }
        }
    });
    
    return availableHeight;
}

// Open 3D Viewer for testing objects
async function open3DViewer() {
    console.log("👁️ Opening 3D Viewer...");
    
    try {
        if (!scene3DController) {
            console.log("🔧 Initializing Scene3DController...");
            
            // Initialize Scene3D
            const viewer3d = document.getElementById('viewer3d');
            if (!viewer3d) {
                console.error("❌ viewer3d element not found!");
                return;
            }
            
            // Debug: Verify we have the correct container
            console.log("🎯 Found viewer3d container:", {
                element: viewer3d,
                id: viewer3d.id,
                parentElement: viewer3d.parentElement,
                boundingRect: viewer3d.getBoundingClientRect(),
                computedStyle: {
                    position: window.getComputedStyle(viewer3d).position,
                    top: window.getComputedStyle(viewer3d).top,
                    left: window.getComputedStyle(viewer3d).left,
                    width: window.getComputedStyle(viewer3d).width,
                    height: window.getComputedStyle(viewer3d).height
                }
            });
            
            scene3DController = new Scene3DController();
            
            // Connect ResourceManager BEFORE initialization (like maped3d does)
            if (resourceManager) {
                scene3DController.resourceManager = resourceManager;
                console.log("🔗 Connected ResourceManager to Scene3DController");
            } else {
                console.warn("⚠️ ResourceManager not available for Scene3DController");
            }
            
            // Initialize the 3D scene in the viewer container
            console.log("🎬 Initializing 3D scene...");
            
            // Get container dimensions, with fallbacks if container is hidden
            let width = viewer3d.clientWidth || viewer3d.offsetWidth;
            let height = viewer3d.clientHeight || viewer3d.offsetHeight;
            
            // If container is hidden (display: none), use reasonable defaults
            if (width === 0 || !width) width = 800;
            if (height === 0 || !height) height = 600;
            
            console.log("Initializing Scene3D with dimensions:", { width, height });
            scene3DController.initialize(viewer3d, width, height);
            
            // Debug: Check if canvas was created and attached
            console.log("🎨 Post-initialization canvas check:");
            if (scene3DController.renderer) {
                const canvas = scene3DController.renderer.domElement;
                console.log("  Canvas exists:", !!canvas);
                console.log("  Canvas parent:", canvas ? canvas.parentElement : null);
                console.log("  Canvas parent ID:", canvas && canvas.parentElement ? canvas.parentElement.id : 'none');
                console.log("  Canvas in viewer3d:", viewer3d.contains(canvas));
                console.log("  Canvas dimensions:", canvas ? { width: canvas.width, height: canvas.height } : null);
                console.log("  Canvas style:", canvas ? canvas.style.cssText : null);
                
                // If canvas isn't in the right place, move it
                if (canvas && canvas.parentElement !== viewer3d) {
                    console.log("🚚 Moving canvas from", canvas.parentElement?.id || 'unknown', "to viewer3d");
                    // Remove from current location
                    if (canvas.parentElement) {
                        canvas.parentElement.removeChild(canvas);
                    }
                    // Add to correct location
                    viewer3d.appendChild(canvas);
                    console.log("✅ Canvas moved to correct container");
                }
            } else {
                console.log("  ❌ No renderer found after initialization");
            }
            
            // Provide minimal data that Scene3DController expects
            scene3DController.markers = [];
            scene3DController.rooms = [];
            scene3DController.textures = [];
            scene3DController.tokens = [];
            scene3DController.props = [];
            scene3DController.dayNightCycle = null;
            
            console.log("📋 Preparing scene data...");
            
            // Create base image for mini-map
            const baseImage = new Image();
            baseImage.src = 'assets/grid-texture.png';
            
            // Initialize with minimal scene data (like the original maped3d)
            await scene3DController.initializeWithData({
                rooms: [],
                textures: {},
                tokens: [],
                cellSize: 50,
                playerStart: { x: 0, y: 0 },
                baseImage: baseImage, // Use actual image for mini-map
                markers: [],
                textureManager: null,
                props: []
            });
            
            console.log("✅ Scene data initialized");
            
            // Initialize the 3D scene (this creates the camera, lights, controls)
            await scene3DController.init3DScene(() => {
                console.log("📈 3D scene initialization progress...");
            });
            
            console.log("✅ 3D scene initialized");
            console.log("📷 Camera:", scene3DController.camera ? "✅ Ready" : "❌ Missing");
            console.log("🎬 Scene:", scene3DController.scene ? "✅ Ready" : "❌ Missing");
            console.log("🎮 Renderer:", scene3DController.renderer ? "✅ Ready" : "❌ Missing");
            
            // PhysicsController should be automatically created by Scene3DController.initializeWithData
            if (scene3DController.physics) {
                console.log("✅ PhysicsController initialized by Scene3DController");
            } else {
                console.warn("⚠️ PhysicsController not initialized by Scene3DController");
            }
            
            // Initialize Storyboard through ResourceManager (requires scene3D)
            if (resourceManager && scene3DController.scene) {
                resourceManager.scene3D = scene3DController.scene;
                const storyboard = resourceManager.initStoryboard();
                if (storyboard) {
                    console.log("✅ Storyboard initialized and connected to ResourceManager");
                    window.storyboard = storyboard; // Make globally available
                } else {
                    console.warn("⚠️ Storyboard initialization failed");
                }
            } else {
                console.warn("⚠️ Cannot initialize Storyboard - ResourceManager or Scene3D not available");
            }
            
            // Initialize shader effects manager with scene3D
            if (scene3DController && !shaderEffectsManager) {
                shaderEffectsManager = new ShaderEffectsManager(scene3DController);
                window.shaderEffectsManager = shaderEffectsManager;
                console.log("✅ ShaderEffectsManager initialized");
            }
            
            // Set up exit controls
            setupViewerControls();
            console.log("🎮 Viewer controls setup complete");
        }
        
        // Show the 3D viewer
        const viewerWelcome = document.getElementById('viewerWelcome');
        const viewer3d = document.getElementById('viewer3d');
        
        if (!viewerWelcome || !viewer3d) {
            console.error("❌ UI elements not found!");
            return;
        }
        
        console.log("🎭 Switching to 3D viewer interface...");
        viewerWelcome.style.display = 'none';
        viewer3d.style.display = 'block';
        viewer3d.classList.add('active');
        
        // Calculate proper container heights before applying any fixes
        const availableHeight = calculateAndSetContainerHeights();
        
        // Debug: Add temporary styling to make the container visible
        viewer3d.style.backgroundColor = '#1a1a1a';
        viewer3d.style.border = '2px solid red'; // Temporary debug border
        viewer3d.style.position = 'absolute'; // Ensure proper positioning
        viewer3d.style.top = '0';
        viewer3d.style.left = '0';
        viewer3d.style.width = '100%';
        viewer3d.style.height = '100%';
        viewer3d.style.zIndex = '1'; // Ensure it's above other content
        
        console.log("🐛 Applied debug styling to viewer3d container");
        
        // Important: Resize the renderer now that the container is visible and has actual dimensions
        setTimeout(() => {
            if (scene3DController && scene3DController.renderer) {
                // Debug the container and all its parent elements
                console.log("🔍 Analyzing container hierarchy:");
                let element = viewer3d;
                let level = 0;
                while (element && level < 5) {
                    const rect = element.getBoundingClientRect();
                    const computed = window.getComputedStyle(element);
                    console.log(`  Level ${level} (${element.tagName}${element.id ? '#' + element.id : ''}${element.className ? '.' + element.className.replace(/\s+/g, '.') : ''}):`, {
                        clientSize: { width: element.clientWidth, height: element.clientHeight },
                        offsetSize: { width: element.offsetWidth, height: element.offsetHeight },
                        boundingRect: { width: rect.width, height: rect.height },
                        computed: { 
                            width: computed.width, 
                            height: computed.height, 
                            display: computed.display,
                            position: computed.position,
                            flex: computed.flex,
                            flexDirection: computed.flexDirection
                        }
                    });
                    element = element.parentElement;
                    level++;
                }
                
                // Get container dimensions with detailed debugging
                const computedStyle = window.getComputedStyle(viewer3d);
                const actualWidth = viewer3d.clientWidth;
                const actualHeight = viewer3d.clientHeight;
                const offsetWidth = viewer3d.offsetWidth;
                const offsetHeight = viewer3d.offsetHeight;
                const boundingRect = viewer3d.getBoundingClientRect();
                
                console.log("🔧 Container dimension analysis:", {
                    clientWidth: actualWidth,
                    clientHeight: actualHeight,
                    offsetWidth: offsetWidth,
                    offsetHeight: offsetHeight,
                    boundingRect: { width: boundingRect.width, height: boundingRect.height },
                    computedWidth: computedStyle.width,
                    computedHeight: computedStyle.height,
                    display: computedStyle.display,
                    position: computedStyle.position
                });
                
                // Try to get parent container dimensions as fallback
                const parentContainer = viewer3d.parentElement;
                const parentWidth = parentContainer ? parentContainer.clientWidth : 0;
                const parentHeight = parentContainer ? parentContainer.clientHeight : 0;
                console.log("📦 Parent container dimensions:", { parentWidth, parentHeight });
                
                // Use the best available dimensions
                let finalWidth = actualWidth || offsetWidth || boundingRect.width || parentWidth;
                let finalHeight = actualHeight || offsetHeight || boundingRect.height || parentHeight;
                
                // If still zero, force reasonable defaults
                if (finalWidth <= 0) finalWidth = 800;
                if (finalHeight <= 0) finalHeight = 600;
                
                console.log("🎯 Final dimensions to use:", { finalWidth, finalHeight });
                
                // Resize the renderer
                scene3DController.renderer.setSize(finalWidth, finalHeight);
                
                if (scene3DController.camera) {
                    scene3DController.camera.aspect = finalWidth / finalHeight;
                    scene3DController.camera.updateProjectionMatrix();
                }
                
                console.log("✅ Renderer resized to:", finalWidth, "x", finalHeight);
                
                // Verify the canvas size after resize
                const canvas = scene3DController.renderer.domElement;
                console.log("🎨 Canvas after resize:", {
                    width: canvas.width,
                    height: canvas.height,
                    style: { width: canvas.style.width, height: canvas.style.height },
                    parentElement: canvas.parentElement ? canvas.parentElement.tagName : 'none',
                    isConnected: canvas.isConnected
                });
                
                // Ensure canvas is properly attached to the container
                if (!canvas.parentElement || canvas.parentElement !== viewer3d) {
                    console.log("🔧 Re-attaching canvas to viewer3d container");
                    // Clear any existing canvas from viewer3d first
                    const existingCanvases = viewer3d.querySelectorAll('canvas');
                    existingCanvases.forEach(c => c.remove());
                    // Attach the new canvas
                    viewer3d.appendChild(canvas);
                }
                
                // Make sure canvas is properly styled and positioned within its container
                canvas.style.display = 'block';
                canvas.style.position = 'absolute';
                canvas.style.top = '0';
                canvas.style.left = '0';
                canvas.style.width = '100%';
                canvas.style.height = '100%';
                canvas.style.pointerEvents = 'auto';
                canvas.style.zIndex = '0'; // Behind controls
                console.log("✅ Canvas visibility and positioning ensured");
                
                // Debug: Check where the canvas actually ended up
                console.log("🎯 Canvas final location check:", {
                    parentId: canvas.parentElement ? canvas.parentElement.id : 'none',
                    parentClassName: canvas.parentElement ? canvas.parentElement.className : 'none',
                    canvasRect: canvas.getBoundingClientRect(),
                    containerRect: viewer3d.getBoundingClientRect()
                });
            }
        }, 100); // Small delay to ensure container is fully visible
        
        // Start continuous animation loop like maped3d does
        scene3DController.isActive = true;
        
        const animate = () => {
            if (scene3DController.isActive && viewer3d.classList.contains('active')) {
                requestAnimationFrame(animate);
                scene3DController.animate();
            }
        };
        animate();
        console.log("🎬 3D scene animation loop started");
        
        // Add window resize handler like maped3d - more robust version
        const handleResize = () => {
            const viewer = document.getElementById('viewer3d');
            if (viewer && scene3DController.renderer && scene3DController.camera) {
                // Try multiple methods to get dimensions
                let width = viewer.clientWidth || viewer.offsetWidth || viewer.getBoundingClientRect().width;
                let height = viewer.clientHeight || viewer.offsetHeight || viewer.getBoundingClientRect().height;
                
                // If still zero, try parent dimensions
                if (width <= 0 || height <= 0) {
                    const parent = viewer.parentElement;
                    if (parent) {
                        width = width || parent.clientWidth || parent.offsetWidth;
                        height = height || parent.clientHeight || parent.offsetHeight;
                    }
                }
                
                // Final fallback to reasonable defaults
                if (width <= 0) width = 800;
                if (height <= 0) height = 600;
                
                console.log("📐 Resize handler using dimensions:", { width, height });
                
                scene3DController.renderer.setSize(width, height);
                scene3DController.camera.aspect = width / height;
                scene3DController.camera.updateProjectionMatrix();
            }
        };
        window.addEventListener('resize', handleResize);
        
        // Also trigger resize when tab becomes active (important for tab-based layouts)
        const tabObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
                    const tabPanel = document.getElementById('sl-tab-panel-2'); // 3D Viewer tab panel
                    if (tabPanel && !tabPanel.hasAttribute('aria-hidden')) {
                        console.log("🎯 3D Viewer tab became active, triggering resize...");
                        setTimeout(handleResize, 100);
                    }
                }
            });
        });
        
        const tabPanel = document.getElementById('sl-tab-panel-2');
        if (tabPanel) {
            tabObserver.observe(tabPanel, { attributes: true });
        }
        
        // Trigger initial resize to ensure proper sizing - multiple attempts
        setTimeout(handleResize, 100);
        setTimeout(handleResize, 250);
        setTimeout(handleResize, 500); // Extra attempts to ensure sizing works
        
        // If we have a current object, load it
        if (currentObject) {
            console.log("📦 Loading current object into viewer...");
            setTimeout(() => {
                loadObjectIntoViewer(currentObject);
            }, 500); // Give scene time to fully initialize
        } else {
            console.log("ℹ️ No current object to load");
        }
        
    } catch (error) {
        console.error("❌ Failed to open 3D Viewer:", error);
        console.error("Stack trace:", error.stack);
        alert("Failed to open 3D Viewer. Check console for details.");
    }
}

function setupViewerControls() {
    // Listen for 'E' key to exit 3D mode
    document.addEventListener('keydown', (event) => {
        if (event.key.toLowerCase() === 'e' && scene3DController && scene3DController.isActive) {
            exit3DViewer();
        }
    });
}

function exit3DViewer() {
    console.log("🚪 Exiting 3D Viewer...");
    
    if (scene3DController) {
        scene3DController.isActive = false;
        scene3DController.cleanup();
    }
    
    // Hide the 3D viewer and show viewer welcome screen
    const viewerWelcome = document.getElementById('viewerWelcome');
    const viewer3d = document.getElementById('viewer3d');
    
    viewer3d.style.display = 'none';
    viewer3d.classList.remove('active');
    if (viewerWelcome) {
        viewerWelcome.style.display = 'flex';
    }
}

// Show sample objects browser using shared module
function showSampleObjects() {
    console.log("📦 Showing sample objects browser...");
    
    // Try to use ShapeForgeBrowser if available, otherwise fall back to custom implementation
    if (typeof ShapeForgeBrowser !== 'undefined') {
        console.log("🎯 Using ShapeForgeBrowser module");
        const browser = new ShapeForgeBrowser({
            basePath: 'assets/sampleObjects/ShapeForge/',
            title: 'Browse Sample Objects',
            onSelect: (data, filename) => {
                console.log(`🎯 User selected: ${filename}`);
                loadShapeForgeObject(data, filename);
            },
            onLoad: (data, filename) => {
                console.log(`📄 Loaded: ${filename} - ${data.name || 'Untitled'}`);
            }
        });
        browser.show();
        return;
    }
    
    // Fallback to custom implementation
    console.log("🔧 Using fallback custom implementation");
    
    // Create modal dialog
    const dialog = document.createElement('sl-dialog');
    dialog.label = 'Browse Sample Objects';
    dialog.style.cssText = '--width: 85vw; --height: 75vh;';
    
    dialog.innerHTML = `
        <div style="height: 65vh; overflow: hidden;">
            <div id="shapeforge-grid" style="height: 100%; overflow-y: auto; padding: 16px;">
                <div style="text-align: center; padding: 20px; color: #666;">Discovering sample objects...</div>
            </div>
        </div>
        <sl-button slot="footer" variant="neutral" onclick="this.closest('sl-dialog').hide()">
            <span slot="prefix" class="material-icons">close</span>
            Close
        </sl-button>
    `;
    
    document.body.appendChild(dialog);
    dialog.show();
    
    // Load sample objects dynamically
    loadSampleObjectsGrid(dialog.querySelector('#shapeforge-grid'));
    
    // Cleanup on close
    dialog.addEventListener('sl-hide', () => {
        setTimeout(() => {
            if (dialog.parentNode) {
                dialog.parentNode.removeChild(dialog);
            }
        }, 100);
    });
}

// Load sample objects into grid
async function loadSampleObjectsGrid(container) {
    console.log("📂 Dynamically discovering ShapeForge files...");
    
    let sampleFiles = [];
    
    try {
        // Method 1: Try directory listing (works with Live Server)
        const dirResponse = await fetch('assets/sampleObjects/ShapeForge/');
        if (dirResponse.ok) {
            const dirText = await dirResponse.text();
            const fileMatches = dirText.match(/href="([^"]*\.shapeforge\.json)"/g);
            if (fileMatches) {
                // Extract just the filenames, not full paths
                sampleFiles = fileMatches
                    .map(match => match.match(/href="([^"]*)"/)[1])
                    .filter(filename => !filename.includes('/')) // Only get actual filenames, not paths
                    .map(filename => filename.replace(/^.*\//, '')); // Remove any path prefixes
                console.log(`📂 Found ${sampleFiles.length} files via directory listing:`, sampleFiles);
            }
        }
    } catch (error) {
        console.log("📂 Directory listing not available, using fallback method");
    }
    
    // Method 2: Fallback - test known files from your directory
    if (sampleFiles.length === 0) {
        const knownFiles = [
            'Chest.shapeforge.json',
            'Dungeon Entrance.shapeforge.json',
            'Exit.shapeforge.json',
            'FireMarker.shapeforge.json',
            'Fireball_d20.shapeforge.json',
            'Grass Patch.shapeforge.json',
            'Not-Statue.shapeforge.json',
            'Pillar.shapeforge.json',
            'Statue.shapeforge.json',
            'TexturedPillar2.shapeforge.json',
            'TexturedStatue.shapeforge.json',
            'TexturedStatue2.shapeforge.json',
            'grass.shapeforge.json',
            'magic_d20.shapeforge.json',
            'mountain.shapeforge.json',
            'woodBlock.shapeforge.json'
        ];
        
        console.log("🧪 Testing file existence...");
        const existenceTests = knownFiles.map(async filename => {
            try {
                const testResponse = await fetch(`assets/sampleObjects/ShapeForge/${filename}`, { method: 'HEAD' });
                return testResponse.ok ? filename : null;
            } catch (error) {
                return null;
            }
        });
        
        const results = await Promise.all(existenceTests);
        sampleFiles = results.filter(filename => filename !== null);
        console.log(`📂 Discovered ${sampleFiles.length} files via existence testing`);
    }
    
    if (sampleFiles.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">No ShapeForge files found</div>';
        return;
    }
    
    // Create grid container
    const grid = document.createElement('div');
    grid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 16px;
        padding: 0;
    `;
    
    container.innerHTML = '';
    container.appendChild(grid);
    
    // Load and display files
    let loadedCount = 0;
    for (const filename of sampleFiles) {
        try {
            const response = await fetch(`assets/sampleObjects/ShapeForge/${filename}`);
            if (!response.ok) continue;
            
            const data = await response.json();
            const card = createSampleObjectCard(filename, data);
            grid.appendChild(card);
            loadedCount++;
        } catch (error) {
            console.warn(`⚠️ Skipping ${filename}:`, error);
        }
    }
    
    console.log(`✅ Rendered ${loadedCount}/${sampleFiles.length} sample objects in grid`);
}

// Create a sample object card
function createSampleObjectCard(filename, data) {
    const displayName = (data.name && data.name !== 'Untitled Project') ? data.name : filename.replace('.shapeforge.json', '');
    
    const card = document.createElement('div');
    card.style.cssText = `
        border: 1px solid #e1e5e9;
        border-radius: 12px;
        padding: 12px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
        background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        min-height: 160px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
        overflow: hidden;
    `;
    
    // Check for effects badge
    const hasEffects = data.objects && data.objects.some(obj => obj.effect);
    const effectsBadge = hasEffects ? 
        `<div style="position: absolute; top: 8px; right: 8px; background: linear-gradient(135deg, #ff6b35, #ff8c42); color: white; font-size: 10px; padding: 3px 8px; border-radius: 12px; font-weight: bold; box-shadow: 0 2px 4px rgba(255,107,53,0.3);">FX</div>` : '';
    
    // Default thumbnail
    const defaultThumbnail = `data:image/svg+xml;base64,${btoa(`
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="80" height="80" fill="url(#grad)"/>
            <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
                </linearGradient>
            </defs>
            <g transform="translate(20, 20)">
                <path d="M10 10h20v20h-20z" stroke="white" stroke-width="2" fill="none" opacity="0.7"/>
                <path d="M15 15h15v15h-15z" stroke="white" stroke-width="2" fill="none" opacity="0.5"/>
                <path d="M20 20h10v10h-10z" stroke="white" stroke-width="2" fill="none" opacity="0.3"/>
            </g>
        </svg>
    `)}`;

    card.innerHTML = `
        ${effectsBadge}
        <div>
            <img src="${data.thumbnail || defaultThumbnail}" 
                 style="width: 80px; height: 80px; margin: 0 auto 12px auto; object-fit: cover; border-radius: 8px; display: block;" 
                 alt="${displayName}">
        </div>
        <div>
            <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px; color: #2c3e50; line-height: 1.3; min-height: 32px; display: flex; align-items: center; justify-content: center;">${displayName}</div>
            <div style="font-size: 11px; color: #7f8c8d; opacity: 0.8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${filename}</div>
        </div>
    `;
    
    // Hover effects
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-4px) scale(1.02)';
        card.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.15)';
        card.style.borderColor = '#667eea';
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0) scale(1)';
        card.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        card.style.borderColor = '#e1e5e9';
    });
    
    // Click handler
    card.addEventListener('click', () => {
        loadShapeForgeObject(data, filename);
        card.closest('sl-dialog').hide();
    });
    
    return card;
}

// Load selected ShapeForge object into editor
function loadShapeForgeObject(data, filename) {
    console.log(`🔄 Loading ${filename} into editor...`);
    
    try {
        // Set as current object
        currentObject = data;
        
        console.log(`✅ Successfully loaded ${filename} into current object`);
        
        // Initialize ShapeForge workspace if needed
        if (!shapeForge) {
            console.log("🎨 Initializing ShapeForge workspace...");
            initializeShapeForgeWorkspace();
        }
        
        // Load the object into ShapeForge after a short delay to ensure initialization
        setTimeout(() => {
            if (shapeForge && shapeForge.loadProjectFromJson) {
                console.log("📦 Loading object into ShapeForge...");
                shapeForge.loadProjectFromJson(data);
            } else {
                console.log("🔄 ShapeForge not ready, retrying...");
                // Retry after another delay
                setTimeout(() => {
                    if (shapeForge && shapeForge.loadProjectFromJson) {
                        shapeForge.loadProjectFromJson(data);
                    }
                }, 1000);
            }
        }, 500);
        
        // Show success notification
        showNotification(`Loaded: ${data.name || filename}`, 'success');
        
    } catch (error) {
        console.error(`❌ Failed to load ${filename}:`, error);
        showNotification(`Failed to load ${filename}: ${error.message}`, 'error');
    }
}

// Show notification helper
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 16px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        transition: all 0.3s ease;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// File operations
function newObject() {
    currentObject = {
        name: "New Object",
        objects: []
    };
    
    // Clear editor
    if (window.editor3D) {
        window.editor3D.clearScene();
    }
    
    console.log("📝 Created new object");
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
    // Append to DOM, trigger click, then clean up and revoke URL to avoid leaks
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    try { URL.revokeObjectURL(link.href); } catch (e) { /* ignore */ }

    console.log(`💾 Saved object: ${currentObject.name}`);
}

// Make functions globally available
window.openShapeForge = openShapeForge;
window.showSampleObjects = showSampleObjects;