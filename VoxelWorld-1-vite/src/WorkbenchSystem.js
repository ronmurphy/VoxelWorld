import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Advanced 3D Shape Forge Workbench System
 *
 * Features:
 * - Material-based sizing (more materials = larger shapes)
 * - 3D grid workspace for positioning multiple shapes
 * - Shape merging and composition
 * - Recipe book with pre-defined blueprints
 * - Export to placeable voxel world objects
 */
export class WorkbenchSystem {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;
        this.isOpen = false;

        // 3D Scene components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;

        // UI elements
        this.modal = null;
        this.previewContainer = null;

        // Workspace state
        this.workspaceSize = { x: 8, y: 8, z: 8 }; // 8x8x8 grid
        this.placedShapes = new Map(); // Map of positioned shapes
        this.selectedMaterials = new Set(); // Set of selected materials for filtering
        this.selectedMaterial = null; // Single selected material for 3D preview
        this.selectedShape = null;
        this.materialQuantities = {}; // How many of each material to use for crafting
        this.materialHeights = {}; // Height setting for each material (defaults to 1)

        // UI references for updating
        this.materialsListElement = null;
        this.recipesListElement = null;

        // Shape library
        this.shapeLibrary = {
            cube: { name: 'Cube', buildFunction: this.createCube.bind(this) },
            sphere: { name: 'Sphere', buildFunction: this.createSphere.bind(this) },
            cylinder: { name: 'Cylinder', buildFunction: this.createCylinder.bind(this) },
            pyramid: { name: 'Pyramid', buildFunction: this.createPyramid.bind(this) },
            stairs: { name: 'Stairs', buildFunction: this.createStairs.bind(this) },
            wall: { name: 'Wall', buildFunction: this.createWall.bind(this) },
            hollow_cube: { name: 'Hollow Cube', buildFunction: this.createHollowCube.bind(this) }
        };

        // Recipe book - basic shapes and complex structures
        this.recipeBook = {
            // Basic Shapes
            cube: {
                name: '🔷 Cube',
                materials: { wood: 1 },
                description: 'Basic solid cube shape',
                isBasicShape: true,
                shapes: [{ type: 'cube', position: { x: 0, y: 0, z: 0 }, size: { x: 1, y: 1, z: 1 } }]
            },
            sphere: {
                name: '🟢 Sphere',
                materials: { wood: 1 },
                description: 'Basic sphere shape',
                isBasicShape: true,
                shapes: [{ type: 'sphere', position: { x: 0, y: 0, z: 0 }, size: { x: 1, y: 1, z: 1 } }]
            },
            cylinder: {
                name: '🔵 Cylinder',
                materials: { wood: 1 },
                description: 'Basic cylinder shape',
                isBasicShape: true,
                shapes: [{ type: 'cylinder', position: { x: 0, y: 0, z: 0 }, size: { x: 1, y: 2, z: 1 } }]
            },
            pyramid: {
                name: '🔺 Pyramid',
                materials: { stone: 1 },
                description: 'Basic pyramid shape',
                isBasicShape: true,
                shapes: [{ type: 'pyramid', position: { x: 0, y: 0, z: 0 }, size: { x: 1, y: 1, z: 1 } }]
            },
            stairs: {
                name: '🪜 Stairs',
                materials: { wood: 3 },
                description: 'Step stairs for climbing',
                isBasicShape: true,
                shapes: [{ type: 'stairs', position: { x: 0, y: 0, z: 0 }, size: { x: 1, y: 3, z: 3 } }]
            },
            wall: {
                name: '🧱 Wall',
                materials: { stone: 2 },
                description: 'Basic wall section',
                isBasicShape: true,
                shapes: [{ type: 'wall', position: { x: 0, y: 0, z: 0 }, size: { x: 1, y: 2, z: 1 } }]
            },
            hollow_cube: {
                name: '⬜ Hollow Cube',
                materials: { wood: 2 },
                description: 'Hollow cube frame',
                isBasicShape: true,
                shapes: [{ type: 'hollow_cube', position: { x: 0, y: 0, z: 0 }, size: { x: 2, y: 2, z: 2 } }]
            },

            // Complex Structures
            castle_wall: {
                name: '🏰 Castle Wall',
                materials: { stone: 12 },
                description: 'A fortified wall section',
                shapes: [
                    { type: 'wall', position: { x: 0, y: 0, z: 0 }, size: { x: 4, y: 3, z: 1 } },
                    { type: 'cube', position: { x: 0, y: 3, z: 0 }, size: { x: 1, y: 1, z: 1 } },
                    { type: 'cube', position: { x: 3, y: 3, z: 0 }, size: { x: 1, y: 1, z: 1 } }
                ]
            },
            turret: {
                name: '🗼 Tower Turret',
                materials: { stone: 20 },
                description: 'A defensive tower structure',
                shapes: [
                    { type: 'cylinder', position: { x: 0, y: 0, z: 0 }, size: { x: 3, y: 4, z: 3 } },
                    { type: 'cylinder', position: { x: 0, y: 4, z: 0 }, size: { x: 4, y: 1, z: 4 } }
                ]
            },
            house: {
                name: '🏠 Simple House',
                materials: { wood: 25, stone: 5 },
                description: 'A basic dwelling structure',
                shapes: [
                    { type: 'hollow_cube', position: { x: 0, y: 0, z: 0 }, size: { x: 4, y: 3, z: 4 } },
                    { type: 'pyramid', position: { x: 0, y: 3, z: 0 }, size: { x: 4, y: 2, z: 4 } }
                ]
            }
        };
    }

    /**
     * Initialize the workbench system
     */
    init() {
        console.log('🔨 WorkbenchSystem initialized');
    }

    /**
     * Open the workbench at a specific position
     */
    open(x, y, z) {
        console.log(`🔨 Opening workbench at ${x}, ${y}, ${z}`);

        // Store workbench position
        this.workbenchPosition = { x, y, z };

        // Release pointer lock
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }

        // Always recreate UI to get fresh inventory data
        if (this.modal) {
            this.modal.remove();
        }
        this.createUI();

        // Setup 3D scene after UI is created
        this.setupScene();

        this.modal.style.display = 'block';
        this.isOpen = true;

        // Start animation loop
        this.animate();

        // Update status
        this.voxelWorld.updateStatus('🔨 Advanced Workbench - Shape Forge System', 'craft', false);
    }

    /**
     * Close the workbench
     */
    close() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
        this.isOpen = false;

        // Re-acquire pointer lock for game
        if (this.voxelWorld.renderer && this.voxelWorld.renderer.domElement) {
            this.voxelWorld.renderer.domElement.requestPointerLock();
        }

        console.log('🔨 Workbench closed');
    }

    /**
     * Create the workbench UI
     */
    createUI() {
        // Create modal backdrop
        this.modal = document.createElement('div');
        this.modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: none;
            z-index: 1000;
            overflow: auto;
        `;

        // Create main container
        const container = document.createElement('div');
        container.style.cssText = `
            background: linear-gradient(135deg, #2c1810, #1a0f08);
            border: 3px solid #8B4513;
            border-radius: 15px;
            width: 90%;
            max-width: 1200px;
            margin: 2% auto;
            padding: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        `;

        // Title and close button
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #8B4513;
            padding-bottom: 10px;
        `;

        const title = document.createElement('h2');
        title.textContent = '🔨 Shape Forge - Advanced Workbench';
        title.style.cssText = `
            color: #FFD700;
            margin: 0;
            font-size: 24px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        `;

        const closeButton = document.createElement('button');
        closeButton.textContent = '✕';
        closeButton.style.cssText = `
            background: #8B0000;
            color: white;
            border: none;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            font-size: 18px;
            cursor: pointer;
            font-weight: bold;
        `;
        closeButton.addEventListener('click', () => this.close());

        header.appendChild(title);
        header.appendChild(closeButton);

        // Main content area
        const content = document.createElement('div');
        content.style.cssText = `
            display: grid;
            grid-template-columns: 300px 1fr 300px;
            gap: 20px;
            height: 600px;
        `;

        // Left panel - Materials and shapes
        const leftPanel = this.createMaterialsPanel();

        // Center panel - 3D preview
        const centerPanel = this.createPreviewPanel();

        // Right panel - Recipe book and controls
        const rightPanel = this.createRecipePanel();

        content.appendChild(leftPanel);
        content.appendChild(centerPanel);
        content.appendChild(rightPanel);

        container.appendChild(header);
        container.appendChild(content);
        this.modal.appendChild(container);

        // Add to document
        document.body.appendChild(this.modal);
    }

    /**
     * Create materials and shapes selection panel
     */
    createMaterialsPanel() {
        const panel = document.createElement('div');
        panel.style.cssText = `
            background: rgba(0, 0, 0, 0.3);
            border: 2px solid #444;
            border-radius: 10px;
            padding: 15px;
            overflow-y: auto;
        `;

        // Materials section
        const materialsHeader = document.createElement('h3');
        materialsHeader.textContent = '📦 Materials';
        materialsHeader.style.color = '#FFD700';

        const materialsList = document.createElement('div');
        materialsList.style.cssText = `
            display: grid;
            grid-template-columns: 1fr;
            gap: 5px;
            margin-bottom: 20px;
        `;

        // Store reference for updates
        this.materialsListElement = materialsList;

        // Add available materials from inventory
        Object.entries(this.voxelWorld.inventory).forEach(([material, count]) => {
            if (count > 0 && this.isCraftingMaterial(material)) {
                const materialItem = this.createMaterialItem(material, count);
                materialsList.appendChild(materialItem);
            }
        });

        // If no materials found, show helpful message
        if (materialsList.children.length === 0) {
            const noMaterialsMsg = document.createElement('div');
            noMaterialsMsg.style.cssText = `
                color: #ccc;
                font-style: italic;
                text-align: center;
                padding: 20px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 5px;
            `;
            noMaterialsMsg.textContent = 'No crafting materials found. Harvest wood, stone, grass, etc. to get started!';
            materialsList.appendChild(noMaterialsMsg);
        }

        // Add more info about materials
        const infoText = document.createElement('div');
        infoText.style.cssText = `
            color: #ccc;
            font-size: 12px;
            margin-top: 10px;
            padding: 10px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 5px;
        `;
        infoText.textContent = 'Select materials here, then choose shapes from the Recipe Book on the right. More materials = larger shapes!';

        panel.appendChild(materialsHeader);
        panel.appendChild(materialsList);
        panel.appendChild(infoText);

        return panel;
    }

    /**
     * Create 3D preview panel
     */
    createPreviewPanel() {
        const panel = document.createElement('div');
        panel.style.cssText = `
            background: rgba(0, 0, 0, 0.3);
            border: 2px solid #444;
            border-radius: 10px;
            padding: 15px;
            display: flex;
            flex-direction: column;
        `;

        const header = document.createElement('h3');
        header.textContent = '🎨 3D Preview';
        header.style.cssText = `
            color: #FFD700;
            margin: 0 0 10px 0;
        `;

        // Container for 3D preview and height slider
        const previewArea = document.createElement('div');
        previewArea.style.cssText = `
            flex: 1;
            display: flex;
            gap: 10px;
        `;

        // 3D container (takes most space)
        this.previewContainer = document.createElement('div');
        this.previewContainer.style.cssText = `
            flex: 1;
            background: #111;
            border: 2px solid #333;
            border-radius: 5px;
            position: relative;
        `;

        // Height slider container (narrow column on right)
        const heightSliderContainer = document.createElement('div');
        heightSliderContainer.style.cssText = `
            width: 40px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 8px 4px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 5px;
            border: 1px solid #333;
        `;

        // Height label
        const heightLabel = document.createElement('div');
        heightLabel.textContent = 'H';
        heightLabel.style.cssText = `
            color: #FFD700;
            font-weight: bold;
            font-size: 12px;
            writing-mode: horizontal-tb;
        `;

        // Height slider (vertical, bottom to top)
        const heightSlider = document.createElement('input');
        heightSlider.type = 'range';
        heightSlider.min = '1';
        heightSlider.max = '8';
        heightSlider.value = '1';
        heightSlider.style.cssText = `
            writing-mode: bt-lr;
            -webkit-appearance: slider-vertical;
            width: 20px;
            height: 120px;
            background: #333;
            outline: none;
            transform: rotate(180deg);
        `;

        // Height display
        const heightDisplay = document.createElement('div');
        heightDisplay.textContent = '1';
        heightDisplay.style.cssText = `
            color: #4CAF50;
            font-weight: bold;
            font-size: 12px;
            writing-mode: horizontal-tb;
        `;

        // Update height when slider changes
        heightSlider.addEventListener('input', (e) => {
            const newHeight = parseInt(e.target.value);
            heightDisplay.textContent = newHeight;

            // Update height for selected material
            if (this.selectedMaterial) {
                if (!this.materialHeights[this.selectedMaterial]) {
                    this.materialHeights[this.selectedMaterial] = 1;
                }
                this.materialHeights[this.selectedMaterial] = newHeight;
                this.updatePreview();
                console.log(`📏 ${this.selectedMaterial} height set to: ${newHeight}`);
            }
        });

        heightSliderContainer.appendChild(heightLabel);
        heightSliderContainer.appendChild(heightSlider);
        heightSliderContainer.appendChild(heightDisplay);

        previewArea.appendChild(this.previewContainer);
        previewArea.appendChild(heightSliderContainer);

        // Store references to height controls
        this.heightSlider = heightSlider;
        this.heightDisplay = heightDisplay;

        // Craft button
        const craftButton = document.createElement('button');
        craftButton.textContent = '⚡ Craft Item';
        craftButton.style.cssText = `
            width: 100%;
            padding: 12px;
            margin: 10px 0;
            background: linear-gradient(45deg, #4CAF50, #45a049);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        `;

        craftButton.addEventListener('mouseenter', () => {
            craftButton.style.background = 'linear-gradient(45deg, #5CBF60, #4CAF50)';
            craftButton.style.transform = 'translateY(-2px)';
            craftButton.style.boxShadow = '0 6px 12px rgba(0,0,0,0.4)';
        });

        craftButton.addEventListener('mouseleave', () => {
            craftButton.style.background = 'linear-gradient(45deg, #4CAF50, #45a049)';
            craftButton.style.transform = 'translateY(0)';
            craftButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        });

        craftButton.addEventListener('click', () => this.craftItem());

        // Controls info
        const controlsInfo = document.createElement('div');
        controlsInfo.style.cssText = `
            color: #ccc;
            font-size: 12px;
            margin-top: 10px;
            text-align: center;
        `;
        controlsInfo.textContent = 'Drag to rotate • Scroll to zoom • Right-click to pan';

        panel.appendChild(header);
        panel.appendChild(previewArea);
        panel.appendChild(craftButton);
        panel.appendChild(controlsInfo);

        return panel;
    }

    /**
     * Create recipe book panel
     */
    createRecipePanel() {
        const panel = document.createElement('div');
        panel.style.cssText = `
            background: rgba(0, 0, 0, 0.3);
            border: 2px solid #444;
            border-radius: 10px;
            padding: 15px;
            overflow-y: auto;
        `;

        const headerContainer = document.createElement('div');
        headerContainer.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        `;

        const header = document.createElement('h3');
        header.textContent = '📖 Recipe Book';
        header.style.cssText = `
            color: #FFD700;
            margin: 0;
        `;

        const resetButton = document.createElement('button');
        resetButton.textContent = '🔄 Show All';
        resetButton.style.cssText = `
            background: #444;
            color: #FFD700;
            border: 1px solid #666;
            border-radius: 5px;
            padding: 5px 10px;
            font-size: 12px;
            cursor: pointer;
        `;
        resetButton.addEventListener('click', () => this.resetMaterialSelection());

        headerContainer.appendChild(header);
        headerContainer.appendChild(resetButton);

        const recipesList = document.createElement('div');
        recipesList.style.cssText = `
            display: grid;
            grid-template-columns: 1fr;
            gap: 10px;
        `;

        // Store reference for filtering
        this.recipesListElement = recipesList;

        // Add all recipes initially
        this.updateRecipeDisplay();

        panel.appendChild(headerContainer);
        panel.appendChild(recipesList);

        return panel;
    }

    /**
     * Setup the 3D scene
     */
    setupScene() {
        console.log('🔧 setupScene called');
        console.log('🔧 previewContainer exists:', !!this.previewContainer);
        console.log('🔧 voxelWorld hasBackpack:', this.voxelWorld ? this.voxelWorld.hasBackpack : 'NO VOXELWORLD');
        console.log('🔧 voxelWorld backpackPosition:', this.voxelWorld ? this.voxelWorld.backpackPosition : 'NO POSITION');
        console.log('🔧 voxelWorld inventory keys:', this.voxelWorld ? Object.keys(this.voxelWorld.inventory) : 'NO VOXELWORLD');
        console.log('🔧 voxelWorld inventory counts:', this.voxelWorld ? this.voxelWorld.inventory : 'NO INVENTORY');

        if (!this.previewContainer) {
            console.log('❌ setupScene: No preview container found');
            return;
        }

        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111);
        console.log('✅ setupScene: Scene created');

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            60,
            this.previewContainer.clientWidth / this.previewContainer.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(5, 5, 5);
        this.camera.lookAt(0, 0, 0);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(
            this.previewContainer.clientWidth,
            this.previewContainer.clientHeight
        );
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Add lighting (based on working mapgate settings)
        const ambientLight = new THREE.AmbientLight(0x666666, 1.0);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Add grid workspace
        const gridHelper = new THREE.GridHelper(this.workspaceSize.x, this.workspaceSize.x, 0x444444, 0x222222);
        gridHelper.position.y = 0;
        this.scene.add(gridHelper);

        // Add workspace bounds
        const boxHelper = new THREE.BoxHelper(
            new THREE.Mesh(
                new THREE.BoxGeometry(this.workspaceSize.x, this.workspaceSize.y, this.workspaceSize.z),
                new THREE.MeshBasicMaterial({ visible: false })
            ),
            0x888888
        );
        this.scene.add(boxHelper);

        // Add OrbitControls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.25;
        this.controls.enableZoom = true;
        this.controls.enableRotate = true;
        this.controls.enablePan = true;

        // Add canvas to container
        this.previewContainer.appendChild(this.renderer.domElement);

        console.log('🎨 3D scene setup complete');
    }

    /**
     * Animation loop
     */
    animate() {
        if (!this.isOpen) return;

        requestAnimationFrame(() => this.animate());

        if (this.controls) {
            this.controls.update();
        }

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);

            // Debug log every 60 frames (~1 second)
            this.frameCount = (this.frameCount || 0) + 1;
            if (this.frameCount % 60 === 0) {
                console.log(`🎬 Animation frame ${this.frameCount}: Scene children: ${this.scene.children.length}`);
            }
        }
    }

    // Shape creation functions
    createCube(material, size) {
        const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const materialObj = this.getMaterialForType(material);
        return new THREE.Mesh(geometry, materialObj);
    }

    createSphere(material, size) {
        const geometry = new THREE.SphereGeometry(Math.min(size.x, size.y, size.z) / 2, 16, 12);
        const materialObj = this.getMaterialForType(material);
        return new THREE.Mesh(geometry, materialObj);
    }

    createCylinder(material, size) {
        const geometry = new THREE.CylinderGeometry(size.x / 2, size.z / 2, size.y, 16);
        const materialObj = this.getMaterialForType(material);
        return new THREE.Mesh(geometry, materialObj);
    }

    createPyramid(material, size) {
        const geometry = new THREE.ConeGeometry(Math.min(size.x, size.z) / 2, size.y, 4);
        const materialObj = this.getMaterialForType(material);
        return new THREE.Mesh(geometry, materialObj);
    }

    createStairs(material, size) {
        const group = new THREE.Group();
        const stepHeight = size.y / size.z;

        for (let i = 0; i < size.z; i++) {
            const stepGeometry = new THREE.BoxGeometry(size.x, stepHeight, 1);
            const materialObj = this.getMaterialForType(material);
            const step = new THREE.Mesh(stepGeometry, materialObj);
            step.position.set(0, i * stepHeight, i);
            group.add(step);
        }

        return group;
    }

    createWall(material, size) {
        return this.createCube(material, size);
    }

    createHollowCube(material, size) {
        const group = new THREE.Group();
        const thickness = 0.5;

        // Create 6 faces of the hollow cube
        const faces = [
            { pos: [0, 0, size.z/2], rot: [0, 0, 0], scale: [size.x, size.y, thickness] }, // Front
            { pos: [0, 0, -size.z/2], rot: [0, 0, 0], scale: [size.x, size.y, thickness] }, // Back
            { pos: [size.x/2, 0, 0], rot: [0, Math.PI/2, 0], scale: [size.z, size.y, thickness] }, // Right
            { pos: [-size.x/2, 0, 0], rot: [0, Math.PI/2, 0], scale: [size.z, size.y, thickness] }, // Left
            { pos: [0, size.y/2, 0], rot: [Math.PI/2, 0, 0], scale: [size.x, size.z, thickness] }, // Top
            { pos: [0, -size.y/2, 0], rot: [Math.PI/2, 0, 0], scale: [size.x, size.z, thickness] }  // Bottom
        ];

        faces.forEach(face => {
            const geometry = new THREE.BoxGeometry(face.scale[0], face.scale[1], face.scale[2]);
            const materialObj = this.getMaterialForType(material);
            const mesh = new THREE.Mesh(geometry, materialObj);
            mesh.position.set(face.pos[0], face.pos[1], face.pos[2]);
            mesh.rotation.set(face.rot[0], face.rot[1], face.rot[2]);
            group.add(mesh);
        });

        return group;
    }

    /**
     * Get THREE.js material for a material type
     */
    getMaterialForType(materialType) {
        const materials = {
            wood: new THREE.MeshLambertMaterial({ color: 0x8B4513 }),
            stone: new THREE.MeshLambertMaterial({ color: 0x696969 }),
            iron: new THREE.MeshLambertMaterial({ color: 0x708090 }),
            glass: new THREE.MeshLambertMaterial({ color: 0x87CEEB, transparent: true, opacity: 0.7 })
        };

        return materials[materialType] || materials.wood;
    }

    /**
     * Helper functions for UI creation
     */
    createMaterialItem(material, count) {
        // Implementation for material selection UI with quantity slider
        const item = document.createElement('div');
        item.dataset.material = material;
        item.style.cssText = `
            display: flex;
            flex-direction: column;
            padding: 8px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 5px;
            border: 2px solid transparent;
            transition: all 0.2s ease;
        `;

        // Initialize material quantity to 1 by default
        if (!this.materialQuantities[material]) {
            this.materialQuantities[material] = 1;
        }

        const emoji = this.voxelWorld.getItemIcon(material);
        const name = material.charAt(0).toUpperCase() + material.slice(1);

        // Top row: Material name and selection
        const topRow = document.createElement('div');
        topRow.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
        `;

        topRow.innerHTML = `
            <span style="color: white;">
                <span style="font-size: 20px;">${emoji}</span>
                <span style="margin-left: 8px;">${name}</span>
            </span>
            <span style="color: #FFD700; font-weight: bold;">/${count}</span>
        `;

        topRow.addEventListener('click', () => this.toggleMaterialSelection(material));

        // Bottom row: Quantity slider (hidden by default)
        const sliderRow = document.createElement('div');
        sliderRow.style.cssText = `
            display: none;
            margin-top: 8px;
            align-items: center;
            gap: 8px;
        `;

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '1';
        slider.max = count.toString();
        slider.value = this.materialQuantities[material].toString();
        slider.style.cssText = `
            flex: 1;
            height: 6px;
            border-radius: 3px;
            background: #333;
            outline: none;
            -webkit-appearance: none;
        `;

        const quantityDisplay = document.createElement('span');
        quantityDisplay.style.cssText = `
            color: #4CAF50;
            font-weight: bold;
            min-width: 20px;
            text-align: center;
        `;
        quantityDisplay.textContent = this.materialQuantities[material];

        // Update quantity when slider changes
        slider.addEventListener('input', (e) => {
            const newQuantity = parseInt(e.target.value);
            this.materialQuantities[material] = newQuantity;
            quantityDisplay.textContent = newQuantity;

            // Update 3D preview if this material is selected
            if (this.selectedMaterial === material) {
                this.updatePreview();
            }

            console.log(`🎚️ ${material} quantity set to: ${newQuantity}`);
        });

        sliderRow.appendChild(slider);
        sliderRow.appendChild(quantityDisplay);

        item.appendChild(topRow);
        item.appendChild(sliderRow);

        // Store reference to slider row for toggling
        item.sliderRow = sliderRow;

        return item;
    }

    createShapeItem(key, shape) {
        // Implementation for shape selection UI
        const item = document.createElement('div');
        item.style.cssText = `
            padding: 8px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 5px;
            cursor: pointer;
            border: 2px solid transparent;
            color: white;
            text-align: center;
        `;

        item.textContent = shape.name;

        item.addEventListener('click', () => {
            this.selectedShape = key;
            this.updateShapeSelection();
        });

        return item;
    }

    createRecipeItem(key, recipe) {
        // Implementation for recipe book UI
        const item = document.createElement('div');
        item.style.cssText = `
            padding: 10px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 5px;
            cursor: pointer;
            border: 2px solid transparent;
        `;

        const materialsText = Object.entries(recipe.materials)
            .map(([mat, count]) => `${count} ${mat}`)
            .join(', ');

        item.innerHTML = `
            <div style="color: #FFD700; font-weight: bold; margin-bottom: 5px;">${recipe.name}</div>
            <div style="color: #ccc; font-size: 12px; margin-bottom: 5px;">${recipe.description}</div>
            <div style="color: #87CEEB; font-size: 11px;">Requires: ${materialsText}</div>
        `;

        item.addEventListener('click', () => {
            this.loadRecipe(key, recipe);
        });

        return item;
    }


    updateShapeSelection() {
        console.log(`Selected shape: ${this.selectedShape}`);
        this.updatePreview();
    }

    loadRecipe(key, recipe) {
        console.log('🍳 ===== LOAD RECIPE CALLED =====');
        console.log('🍳 Recipe key:', key);
        console.log('🍳 Recipe name:', recipe.name);
        console.log('🍳 Recipe shapes array:', recipe.shapes);
        console.log('🍳 Recipe materials:', recipe.materials);

        // Get the shape from the recipe (use first shape for preview)
        if (recipe.shapes && recipe.shapes.length > 0) {
            this.selectedShape = recipe.shapes[0].type;
            console.log('🍳 Set selectedShape to:', this.selectedShape);
        } else {
            console.log('❌ No shapes found in recipe!');
            this.selectedShape = null;
        }

        // Trigger preview update
        this.updatePreview();
    }

    /**
     * Check if a material can be used for crafting (filter out discovery items)
     */
    isCraftingMaterial(material) {
        const craftingMaterials = [
            'wood', 'stone', 'iron', 'glass', 'sand', 'brick', 'glowstone',
            'grass', 'dirt', 'coal', 'flowers', 'snow'
        ];
        return craftingMaterials.includes(material);
    }

    /**
     * Toggle material selection
     */
    toggleMaterialSelection(material) {
        console.log('🧱 ===== TOGGLE MATERIAL SELECTION =====');
        console.log('🧱 Material:', material);
        console.log('🧱 Currently selected materials:', Array.from(this.selectedMaterials));
        console.log('🧱 Current single selected material:', this.selectedMaterial);

        if (this.selectedMaterials.has(material)) {
            console.log('🧱 Deselecting material:', material);
            this.selectedMaterials.delete(material);
            // If this was the selected material for preview, clear it
            if (this.selectedMaterial === material) {
                this.selectedMaterial = null;
                console.log('🧱 Cleared selectedMaterial for preview');
            }
        } else {
            console.log('🧱 Selecting material:', material);
            this.selectedMaterials.add(material);
            // Set this as the selected material for 3D preview
            this.selectedMaterial = material;
            console.log('🧱 Set selectedMaterial for preview to:', this.selectedMaterial);
        }

        console.log('🧱 Final selected materials Set:', Array.from(this.selectedMaterials));
        console.log('🧱 Final selectedMaterial:', this.selectedMaterial);

        this.updateMaterialVisuals();
        this.updateRecipeDisplay();
        this.updatePreview(); // Trigger 3D preview update
    }

    /**
     * Reset material selection
     */
    resetMaterialSelection() {
        this.selectedMaterials.clear();
        this.selectedMaterial = null; // Clear single selection for preview
        this.updateMaterialVisuals();
        this.updateRecipeDisplay();
        this.updatePreview(); // Update 3D preview
    }

    /**
     * Update visual indicators for selected materials
     */
    updateMaterialVisuals() {
        if (!this.materialsListElement) return;

        // Update all material items
        Array.from(this.materialsListElement.children).forEach(item => {
            const material = item.dataset.material;
            if (material) {
                if (this.selectedMaterials.has(material)) {
                    // Selected state - show golden border and slider
                    item.style.borderColor = '#FFD700';
                    item.style.backgroundColor = 'rgba(255, 215, 0, 0.2)';
                    item.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.3)';

                    // Show quantity slider
                    if (item.sliderRow) {
                        item.sliderRow.style.display = 'flex';
                    }
                } else {
                    // Unselected state - hide slider
                    item.style.borderColor = 'transparent';
                    item.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    item.style.boxShadow = 'none';

                    // Hide quantity slider
                    if (item.sliderRow) {
                        item.sliderRow.style.display = 'none';
                    }
                }
            }
        });
    }

    /**
     * Update recipe display based on selected materials
     */
    updateRecipeDisplay() {
        if (!this.recipesListElement) return;

        // Clear current recipes
        this.recipesListElement.innerHTML = '';

        // Filter recipes based on selected materials
        const filteredRecipes = this.getFilteredRecipes();

        // Add filtered recipes
        Object.entries(filteredRecipes).forEach(([key, recipe]) => {
            const recipeItem = this.createRecipeItem(key, recipe);
            this.recipesListElement.appendChild(recipeItem);
        });

        // Show message if no recipes match
        if (Object.keys(filteredRecipes).length === 0 && this.selectedMaterials.size > 0) {
            const noRecipesMsg = document.createElement('div');
            noRecipesMsg.style.cssText = `
                color: #ccc;
                font-style: italic;
                text-align: center;
                padding: 20px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 5px;
            `;
            noRecipesMsg.textContent = 'No recipes can be made with selected materials. Try selecting different materials or click "Show All".';
            this.recipesListElement.appendChild(noRecipesMsg);
        }
    }

    /**
     * Get recipes that can be made with selected materials
     */
    getFilteredRecipes() {
        // If no materials selected, show all recipes
        if (this.selectedMaterials.size === 0) {
            return this.recipeBook;
        }

        const filtered = {};
        Object.entries(this.recipeBook).forEach(([key, recipe]) => {
            // Check if recipe can be made with selected materials
            const recipeMaterials = Object.keys(recipe.materials);
            const canMake = recipeMaterials.some(material =>
                this.selectedMaterials.has(material)
            );

            if (canMake) {
                filtered[key] = recipe;
            }
        });

        return filtered;
    }

    /**
     * Update the 3D preview based on current selections
     */
    updatePreview() {
        console.log('🎨 ===== UPDATE PREVIEW CALLED =====');
        console.log('🎨 Scene exists:', !!this.scene);
        console.log('🎨 Selected material:', this.selectedMaterial);
        console.log('🎨 Selected shape:', this.selectedShape);
        console.log('🎨 Selected materials Set:', Array.from(this.selectedMaterials));
        console.log('🎨 VoxelWorld inventory:', this.voxelWorld ? this.voxelWorld.inventory : 'NO VOXELWORLD');

        // Check each requirement individually
        if (!this.scene) {
            console.log('❌ Missing: 3D scene not initialized');
            return;
        }

        if (!this.selectedMaterial) {
            console.log('❌ Missing: No material selected');
            console.log('🔍 Tip: Select a material from the left panel first');
            return;
        }

        if (!this.selectedShape) {
            console.log('❌ Missing: No shape selected');
            console.log('🔍 Tip: Click on a recipe/shape from the right panel');
            return;
        }

        if (!this.voxelWorld || !this.voxelWorld.inventory) {
            console.log('❌ Missing: VoxelWorld or inventory not available');
            return;
        }

        console.log('✅ All requirements met, proceeding with preview creation...');

        // Ensure renderer has correct size (fix for 0x0 renderer)
        if (this.previewContainer.clientWidth > 0 && this.previewContainer.clientHeight > 0) {
            this.renderer.setSize(this.previewContainer.clientWidth, this.previewContainer.clientHeight);
            this.camera.aspect = this.previewContainer.clientWidth / this.previewContainer.clientHeight;
            this.camera.updateProjectionMatrix();
            console.log('🔧 Fixed renderer size to:', this.previewContainer.clientWidth, 'x', this.previewContainer.clientHeight);
        }

        // Clear existing preview objects (except grid and lights)
        const objectsToRemove = [];
        this.scene.traverse((object) => {
            if (object.userData.isPreviewObject) {
                objectsToRemove.push(object);
            }
        });
        objectsToRemove.forEach(obj => this.scene.remove(obj));

        // Calculate size based on selected material quantity from slider (1/4 scale like Minecraft)
        const selectedQuantity = this.materialQuantities[this.selectedMaterial] || 1;
        const baseWidth = Math.max(1, Math.ceil(selectedQuantity / 4)); // 4 materials = 1 unit
        const height = this.materialHeights[this.selectedMaterial] || 1; // Default height of 1

        // Calculate total materials needed: width² × height (for cube-like shapes)
        const materialCost = (baseWidth * baseWidth) * height;
        const size = { x: baseWidth, y: height, z: baseWidth };

        console.log(`🎯 Using ${selectedQuantity}/${materialCost} ${this.selectedMaterial} for size ${baseWidth}x${height}x${baseWidth}`);

        // Create the selected shape
        let previewMesh;
        switch (this.selectedShape) {
            case 'cube':
                previewMesh = this.createCube(this.selectedMaterial, size);
                break;
            case 'sphere':
                previewMesh = this.createSphere(this.selectedMaterial, size);
                break;
            case 'cylinder':
                previewMesh = this.createCylinder(this.selectedMaterial, size);
                break;
            case 'pyramid':
                previewMesh = this.createPyramid(this.selectedMaterial, size);
                break;
            case 'stairs':
                previewMesh = this.createStairs(this.selectedMaterial, size);
                break;
            case 'wall':
                previewMesh = this.createCube(this.selectedMaterial, { x: baseSize * 2, y: baseSize, z: 0.5 });
                break;
            case 'hollow':
                previewMesh = this.createHollowCube(this.selectedMaterial, size);
                break;
            default:
                previewMesh = this.createCube(this.selectedMaterial, size);
        }

        if (previewMesh) {
            // Mark as preview object for easy removal
            previewMesh.userData.isPreviewObject = true;

            // Position at center of workspace
            previewMesh.position.set(0, size.y / 2, 0);

            // Add to scene
            this.scene.add(previewMesh);

            console.log(`🎨 Created ${this.selectedShape} preview with ${this.selectedMaterial} material`);
            console.log(`🎨 Mesh position:`, previewMesh.position);
            console.log(`🎨 Scene children count:`, this.scene.children.length);
            console.log(`🎨 Camera position:`, this.camera.position);

            const rendererSize = new THREE.Vector2();
            this.renderer.getSize(rendererSize);
            console.log(`🎨 Renderer size:`, rendererSize.x, 'x', rendererSize.y);
            console.log(`🎨 Preview container size:`, this.previewContainer.clientWidth, 'x', this.previewContainer.clientHeight);
        }
    }

    /**
     * Craft the currently selected item
     */
    craftItem() {
        console.log('⚡ ===== CRAFT ITEM CALLED =====');

        if (!this.selectedMaterial || !this.selectedShape) {
            console.log('❌ Cannot craft: No material or shape selected');
            this.voxelWorld.updateStatus('⚠️ Select a material and recipe first!', 'error');
            return;
        }

        const material = this.selectedMaterial;
        const shape = this.selectedShape;
        const baseWidth = Math.max(1, Math.ceil((this.materialQuantities[material] || 1) / 4));
        const height = this.materialHeights[material] || 1;
        const requiredQuantity = (baseWidth * baseWidth) * height; // Calculate actual material cost
        const availableQuantity = this.voxelWorld.inventory[material] || 0;

        console.log(`🔨 Crafting ${shape} ${baseWidth}x${height}x${baseWidth} using ${requiredQuantity} ${material}`);
        console.log(`📦 Available: ${availableQuantity}, Required: ${requiredQuantity}`);

        // Check if player has enough materials
        if (availableQuantity < requiredQuantity) {
            console.log(`❌ Not enough ${material}! Need ${requiredQuantity}, have ${availableQuantity}`);
            this.voxelWorld.updateStatus(`⚠️ Not enough ${material}! Need ${requiredQuantity}, have ${availableQuantity}`, 'error');
            return;
        }

        // Create crafted item name (e.g., "wood_cube_3x2x3")
        const itemName = `${material}_${shape}_${baseWidth}x${height}x${baseWidth}`;

        // Consume materials from inventory
        this.voxelWorld.inventory[material] -= requiredQuantity;
        console.log(`✅ Consumed ${requiredQuantity} ${material}, ${this.voxelWorld.inventory[material]} remaining`);

        // Add crafted item to inventory
        if (!this.voxelWorld.inventory[itemName]) {
            this.voxelWorld.inventory[itemName] = 0;
        }
        this.voxelWorld.inventory[itemName]++;

        // Update UI displays
        this.voxelWorld.updateHotbarCounts();
        this.voxelWorld.updateBackpackInventoryDisplay();

        // Refresh workbench materials (since quantities changed)
        this.createMaterialsPanel();

        // Success notification
        const emoji = this.voxelWorld.getItemIcon(material);
        this.voxelWorld.updateStatus(`⚡ Crafted ${emoji} ${itemName}! Added to inventory.`, 'discovery');

        console.log(`🎉 Successfully crafted ${itemName}!`);
        console.log(`📦 Updated inventory:`, this.voxelWorld.inventory);
    }
}