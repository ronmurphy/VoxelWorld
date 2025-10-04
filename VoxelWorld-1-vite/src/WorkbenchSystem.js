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

        // Shape dimensions (new unified system)
        this.shapeLength = 1; // L dimension
        this.shapeWidth = 1;  // W dimension
        this.shapeHeight = 1; // H dimension (from height slider)

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
            tool_bench: {
                name: '🔧 Tool Bench',
                materials: { wood: 3, stone: 3 },
                description: 'Unlocks tool crafting interface (Press T)',
                isBasicShape: true,
                isToolBench: true,  // Special flag for tool bench
                category: 'special',
                shapes: [
                    { type: 'cube', position: { x: 0, y: 0, z: 0 }, size: { x: 1, y: 1, z: 1 } }
                ]
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
            },

            // Light Sources
            campfire: {
                name: '🔥 Campfire',
                materials: { wood: 3 },
                description: 'Warm light source with fire effect',
                isBasicShape: true,
                shapes: [
                    { type: 'pyramid', position: { x: 0, y: 0, z: 0 }, size: { x: 0.8, y: 0.6, z: 0.8 } }
                ],
                effects: ['fire', 'holy']  // Fire particles + golden glow
            },

            // Crafting Materials
            stick: {
                name: '🪵 Stick',
                materials: { leaves: 3 },
                description: 'Crafted from leaves - useful for tools',
                isItem: true,  // This goes into inventory as an item
                itemId: 'stick',
                quantity: 1,  // Crafts 1 stick from 3 leaves
                isBasicShape: true,
                shapes: [
                    { type: 'cylinder', position: { x: 0, y: 0, z: 0 }, size: { x: 0.1, y: 1.0, z: 0.1 } }  // Thin, tall stick
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

        // Disable VoxelWorld input controls while workbench is open
        if (this.voxelWorld) {
            this.voxelWorld.controlsEnabled = false;
            console.log('🔒 Disabled VoxelWorld input controls for workbench');
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

        // Re-enable VoxelWorld input controls when workbench closes
        if (this.voxelWorld) {
            this.voxelWorld.controlsEnabled = true;
            console.log('✅ Re-enabled VoxelWorld input controls');
        }

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

        // Add available materials from slot-based inventory
        Object.entries(this.voxelWorld.getAllMaterialsFromSlots()).forEach(([material, count]) => {
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

        // Header container with title and controls info
        const headerContainer = document.createElement('div');
        headerContainer.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        `;

        const header = document.createElement('h3');
        header.textContent = '🎨 3D Preview';
        header.style.cssText = `
            color: #FFD700;
            margin: 0;
        `;

        // Controls info (moved from bottom)
        const controlsInfo = document.createElement('div');
        controlsInfo.style.cssText = `
            color: #ccc;
            font-size: 11px;
            font-style: italic;
        `;
        controlsInfo.textContent = 'Drag to rotate • Scroll to zoom • Right-click to pan';

        headerContainer.appendChild(header);
        headerContainer.appendChild(controlsInfo);

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
        `;

        // Container for vertical slider (rotated)
        const sliderWrapper = document.createElement('div');
        sliderWrapper.style.cssText = `
            width: 120px;
            height: 20px;
            transform: rotate(-90deg);
            transform-origin: center;
            margin: 50px 0;
        `;

        // Height slider (normal horizontal slider, rotated to appear vertical)
        const heightSlider = document.createElement('input');
        heightSlider.type = 'range';
        heightSlider.min = '1';
        heightSlider.max = '8';
        heightSlider.value = '1';
        heightSlider.style.cssText = `
            width: 120px;
            height: 20px;
            cursor: pointer;
            outline: none;
            background: linear-gradient(to right, #333 0%, #555 100%);
            border-radius: 10px;
            -webkit-appearance: none;
            appearance: none;
        `;

        // Add custom styles for the rotated slider
        if (!document.getElementById('workbench-slider-styles')) {
            const style = document.createElement('style');
            style.id = 'workbench-slider-styles';
            style.textContent = `
                input[type="range"][data-workbench-height]::-webkit-slider-thumb,
                input[type="range"][data-workbench-dimension]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    height: 18px;
                    width: 18px;
                    border-radius: 50%;
                    background: #FFD700;
                    cursor: pointer;
                    border: 2px solid #333;
                    box-shadow: 0 0 5px rgba(255, 215, 0, 0.5);
                }

                input[type="range"][data-workbench-height]::-webkit-slider-track,
                input[type="range"][data-workbench-dimension]::-webkit-slider-track {
                    background: linear-gradient(to right, #333 0%, #555 100%);
                    border-radius: 10px;
                    height: 8px;
                }

                input[type="range"][data-workbench-height]::-moz-range-thumb,
                input[type="range"][data-workbench-dimension]::-moz-range-thumb {
                    height: 18px;
                    width: 18px;
                    border-radius: 50%;
                    background: #FFD700;
                    cursor: pointer;
                    border: 2px solid #333;
                    box-shadow: 0 0 5px rgba(255, 215, 0, 0.5);
                    -moz-appearance: none;
                }

                input[type="range"][data-workbench-height]::-moz-range-track,
                input[type="range"][data-workbench-dimension]::-moz-range-track {
                    background: linear-gradient(to right, #333 0%, #555 100%);
                    border-radius: 10px;
                    height: 8px;
                }
            `;
            document.head.appendChild(style);
        }

        // Mark this as a workbench height slider for styling
        heightSlider.setAttribute('data-workbench-height', 'true');

        // Add slider to wrapper
        sliderWrapper.appendChild(heightSlider);

        // Height display
        const heightDisplay = document.createElement('div');
        heightDisplay.textContent = '1';
        heightDisplay.style.cssText = `
            color: #4CAF50;
            font-weight: bold;
            font-size: 12px;
        `;

        // Update height when slider changes
        heightSlider.addEventListener('input', (e) => {
            const newHeight = parseInt(e.target.value);
            heightDisplay.textContent = newHeight;

            // Update shape height directly
            this.shapeHeight = newHeight;
            this.updateMaterialCostDisplay();
            this.updatePreview();
            console.log(`📏 Height set to: ${newHeight}`);
        });

        // Material emoji display
        const materialEmoji = document.createElement('div');
        materialEmoji.style.cssText = `
            font-size: 24px;
            text-align: center;
            margin: 5px 0;
        `;
        materialEmoji.textContent = '❓'; // Default, will update when material selected

        // Material cost display
        const materialCost = document.createElement('div');
        materialCost.style.cssText = `
            color: #FF6B6B;
            font-weight: bold;
            font-size: 11px;
            text-align: center;
            background: rgba(255, 107, 107, 0.1);
            border: 1px solid #FF6B6B;
            border-radius: 4px;
            padding: 2px 4px;
        `;
        materialCost.textContent = '0';

        heightSliderContainer.appendChild(heightLabel);
        heightSliderContainer.appendChild(sliderWrapper);
        heightSliderContainer.appendChild(heightDisplay);
        heightSliderContainer.appendChild(materialEmoji);
        heightSliderContainer.appendChild(materialCost);

        // Store references for updates
        this.materialEmojiDisplay = materialEmoji;
        this.materialCostDisplay = materialCost;

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

        // Store reference to craft button for enable/disable
        this.craftButton = craftButton;

        // Horizontal dimension controls area (Length and Width)
        const dimensionControls = this.createDimensionControls();

        panel.appendChild(headerContainer);
        panel.appendChild(previewArea);
        panel.appendChild(dimensionControls);
        panel.appendChild(craftButton);

        return panel;
    }

    /**
     * Create dimension controls (Length and Width sliders)
     */
    createDimensionControls() {
        const container = document.createElement('div');
        container.style.cssText = `
            display: flex;
            gap: 20px;
            padding: 10px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 5px;
            border: 1px solid #333;
            margin: 10px 0;
        `;

        // Length controls
        const lengthContainer = this.createDimensionSlider('Length', 'L', 1, 10, 1);

        // Width controls
        const widthContainer = this.createDimensionSlider('Width', 'W', 1, 10, 1);

        container.appendChild(lengthContainer);
        container.appendChild(widthContainer);

        return container;
    }

    /**
     * Create individual dimension slider
     */
    createDimensionSlider(name, label, min, max, defaultValue) {
        const container = document.createElement('div');
        container.style.cssText = `
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 5px;
        `;

        // Label
        const labelElement = document.createElement('div');
        labelElement.textContent = label;
        labelElement.style.cssText = `
            color: #FFD700;
            font-weight: bold;
            font-size: 14px;
        `;

        // Slider
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min.toString();
        slider.max = max.toString();
        slider.value = defaultValue.toString();
        slider.style.cssText = `
            width: 100%;
            height: 20px;
            cursor: pointer;
            outline: none;
            background: linear-gradient(to right, #333 0%, #555 100%);
            border-radius: 10px;
            -webkit-appearance: none;
            appearance: none;
        `;

        // Apply same styling as height slider
        slider.setAttribute('data-workbench-dimension', 'true');

        // Value display
        const valueDisplay = document.createElement('div');
        valueDisplay.textContent = defaultValue.toString();
        valueDisplay.style.cssText = `
            color: #4CAF50;
            font-weight: bold;
            font-size: 12px;
            min-width: 20px;
            text-align: center;
        `;

        // Update display and preview when slider changes
        slider.addEventListener('input', (e) => {
            const newValue = parseInt(e.target.value);
            valueDisplay.textContent = newValue;

            // Store the value
            if (name === 'Length') {
                this.shapeLength = newValue;
            } else if (name === 'Width') {
                this.shapeWidth = newValue;
            }

            // Update cost display and preview
            this.updateMaterialCostDisplay();
            this.updatePreview();
            console.log(`📐 ${name} set to: ${newValue}`);
        });

        container.appendChild(labelElement);
        container.appendChild(slider);
        container.appendChild(valueDisplay);

        // Store references
        if (name === 'Length') {
            this.lengthSlider = slider;
            this.lengthDisplay = valueDisplay;
            this.shapeLength = defaultValue;
        } else if (name === 'Width') {
            this.widthSlider = slider;
            this.widthDisplay = valueDisplay;
            this.shapeWidth = defaultValue;
        }

        return container;
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
        console.log('🔧 voxelWorld slot materials:', this.voxelWorld ? Object.keys(this.voxelWorld.getAllMaterialsFromSlots()) : 'NO VOXELWORLD');
        console.log('🔧 voxelWorld slot counts:', this.voxelWorld ? this.voxelWorld.getAllMaterialsFromSlots() : 'NO SLOTS');

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
    createCube(material, length, width, height) {
        const geometry = new THREE.BoxGeometry(length, height, width);
        const materialObj = this.getMaterialForType(material);
        return new THREE.Mesh(geometry, materialObj);
    }

    createSphere(material, length, width, height) {
        // Create ellipsoid: different radii for each dimension
        const radiusX = length / 2;  // Length controls X radius
        const radiusY = height / 2;  // Height controls Y radius
        const radiusZ = width / 2;   // Width controls Z radius

        // Create sphere and then scale it to make ellipsoid
        const geometry = new THREE.SphereGeometry(1, 16, 12); // Base sphere with radius 1
        const materialObj = this.getMaterialForType(material);
        const mesh = new THREE.Mesh(geometry, materialObj);

        // Scale to create ellipsoid
        mesh.scale.set(radiusX, radiusY, radiusZ);

        return mesh;
    }

    createCylinder(material, length, width, height) {
        // Use length/width for radius, height for cylinder height
        const radiusX = length / 2;
        const radiusZ = width / 2;
        const geometry = new THREE.CylinderGeometry(radiusX, radiusZ, height, 16);
        const materialObj = this.getMaterialForType(material);
        return new THREE.Mesh(geometry, materialObj);
    }

    createPyramid(material, length, width, height) {
        // Use length/width for pyramid base, height for pyramid height
        const baseRadius = Math.min(length, width) / 2; // Use smaller dimension for base
        const geometry = new THREE.ConeGeometry(baseRadius, height, 4);
        const materialObj = this.getMaterialForType(material);
        return new THREE.Mesh(geometry, materialObj);
    }

    createStairs(material, length, width, height) {
        const group = new THREE.Group();
        const numSteps = Math.max(1, Math.floor(width)); // Number of steps based on width
        const stepHeight = height / numSteps;
        const stepDepth = width / numSteps;

        for (let i = 0; i < numSteps; i++) {
            const stepGeometry = new THREE.BoxGeometry(length, stepHeight, stepDepth);
            const materialObj = this.getMaterialForType(material);
            const step = new THREE.Mesh(stepGeometry, materialObj);

            // Position each step: start from ground (y=0), build upward
            const stepY = (i * stepHeight) + (stepHeight / 2); // Bottom of step at i*stepHeight
            const stepZ = (i * stepDepth) - (width / 2) + (stepDepth / 2);
            step.position.set(0, stepY, stepZ);
            group.add(step);
        }

        return group;
    }

    createWall(material, length, width, height) {
        // Wall is just a thin cube (depth = 0.5)
        return this.createCube(material, length, 0.5, height);
    }

    createHollowCube(material, length, width, height) {
        const group = new THREE.Group();
        const thickness = 0.2;

        // Create 6 faces of the hollow cube
        const faces = [
            { pos: [0, 0, width/2], rot: [0, 0, 0], scale: [length, height, thickness] }, // Front
            { pos: [0, 0, -width/2], rot: [0, 0, 0], scale: [length, height, thickness] }, // Back
            { pos: [length/2, 0, 0], rot: [0, Math.PI/2, 0], scale: [width, height, thickness] }, // Right
            { pos: [-length/2, 0, 0], rot: [0, Math.PI/2, 0], scale: [width, height, thickness] }, // Left
            { pos: [0, height/2, 0], rot: [Math.PI/2, 0, 0], scale: [length, width, thickness] }, // Top
            { pos: [0, -height/2, 0], rot: [Math.PI/2, 0, 0], scale: [length, width, thickness] }  // Bottom
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
            oak_wood: new THREE.MeshLambertMaterial({ color: 0x8B6914 }),
            pine_wood: new THREE.MeshLambertMaterial({ color: 0xA0826D }),
            birch_wood: new THREE.MeshLambertMaterial({ color: 0xF5DEB3 }),
            palm_wood: new THREE.MeshLambertMaterial({ color: 0xCD853F }),
            dead_wood: new THREE.MeshLambertMaterial({ color: 0x696969 }),
            stone: new THREE.MeshLambertMaterial({ color: 0x696969 }),
            iron: new THREE.MeshLambertMaterial({ color: 0x708090 }),
            glass: new THREE.MeshLambertMaterial({ color: 0x87CEEB, transparent: true, opacity: 0.7 }),
            sand: new THREE.MeshLambertMaterial({ color: 0xF4A460 }),        // Sandy brown/tan
            brick: new THREE.MeshLambertMaterial({ color: 0xCD853F }),       // Peru/brick color
            grass: new THREE.MeshLambertMaterial({ color: 0x228B22 }),       // Forest green
            dirt: new THREE.MeshLambertMaterial({ color: 0x8B4513 }),        // Saddle brown
            glowstone: new THREE.MeshLambertMaterial({ color: 0xFFFF88, emissive: 0xFFFF44, emissiveIntensity: 0.5 }),  // Glowing yellow
            // Campfire - orange/red with emissive glow
            campfire: new THREE.MeshLambertMaterial({ color: 0xFF6600, emissive: 0xFF4400, emissiveIntensity: 0.8 })
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

        const emoji = this.voxelWorld.getItemIcon(material);
        const name = material.charAt(0).toUpperCase() + material.slice(1);

        // Material item: Just name, icon, and count (no quantity slider)
        item.style.cursor = 'pointer';
        item.innerHTML = `
            <span style="color: white; display: flex; justify-content: space-between; align-items: center;">
                <span>
                    <span style="font-size: 20px;">${emoji}</span>
                    <span style="margin-left: 8px;">${name}</span>
                </span>
                <span style="color: #FFD700; font-weight: bold;">/${count}</span>
            </span>
        `;

        item.addEventListener('click', () => this.toggleMaterialSelection(material));

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

        // Store the current recipe for effect access
        this.currentRecipe = recipe;
        this.currentRecipeKey = key;

        // Get the shape from the recipe (use first shape for preview)
        if (recipe.shapes && recipe.shapes.length > 0) {
            this.selectedShape = recipe.shapes[0].type;
            console.log('🍳 Set selectedShape to:', this.selectedShape);
            
            // 🔥 NEW: Auto-populate sliders with recipe dimensions
            const recipeSize = recipe.shapes[0].size;
            if (recipeSize) {
                // Set dimensions from recipe
                this.shapeLength = recipeSize.x || 1;
                this.shapeWidth = recipeSize.z || 1;
                this.shapeHeight = recipeSize.y || 1;

                // 🪵 LOCK WIDTH/LENGTH for cylinders (sticks) - only height adjustable
                const isCylinder = this.selectedShape === 'cylinder';

                // Update slider UI elements if they exist
                if (this.lengthSlider) {
                    this.lengthSlider.value = this.shapeLength;
                    this.lengthSlider.disabled = isCylinder; // Lock for cylinders
                }
                if (this.widthSlider) {
                    this.widthSlider.value = this.shapeWidth;
                    this.widthSlider.disabled = isCylinder; // Lock for cylinders
                }
                if (this.heightSlider) {
                    this.heightSlider.value = this.shapeHeight;
                }

                // Update slider labels
                if (this.lengthValue) this.lengthValue.textContent = this.shapeLength.toFixed(1);
                if (this.widthValue) this.widthValue.textContent = this.shapeWidth.toFixed(1);
                if (this.heightValue) this.heightValue.textContent = this.shapeHeight.toFixed(1);

                console.log(`📏 Auto-set dimensions to ${this.shapeLength}×${this.shapeWidth}×${this.shapeHeight} from recipe${isCylinder ? ' (width/length locked)' : ''}`);
            }
        } else {
            console.log('❌ No shapes found in recipe!');
            this.selectedShape = null;
        }

        // Trigger preview update
        this.updatePreview();
    }

    /**
     * Update craft button enabled/disabled state
     */
    updateCraftButtonState() {
        if (!this.craftButton) {
            return;
        }

        // Check if we can craft
        const canCraft = this.canCraftCurrentItem();

        if (canCraft) {
            // Enable button
            this.craftButton.disabled = false;
            this.craftButton.style.opacity = '1';
            this.craftButton.style.cursor = 'pointer';
            this.craftButton.style.background = 'linear-gradient(45deg, #4CAF50, #45a049)';
            this.craftButton.textContent = '⚡ Craft Item';
        } else {
            // Disable button
            this.craftButton.disabled = true;
            this.craftButton.style.opacity = '0.5';
            this.craftButton.style.cursor = 'not-allowed';
            this.craftButton.style.background = 'linear-gradient(45deg, #666, #555)';

            // Show reason why disabled
            if (!this.selectedMaterial) {
                this.craftButton.textContent = '❌ Select Material';
            } else if (!this.selectedShape) {
                this.craftButton.textContent = '❌ Select Recipe';
            } else {
                this.craftButton.textContent = '❌ Need More Materials';
            }
        }
    }

    /**
     * Check if current item can be crafted
     */
    canCraftCurrentItem() {
        // Need material and shape selected
        if (!this.selectedMaterial || !this.selectedShape) {
            return false;
        }

        // Check if user has enough materials
        const cost = this.shapeLength * this.shapeWidth * this.shapeHeight * 2;
        const available = this.voxelWorld.countItemInSlots(this.selectedMaterial);

        return available >= cost;
    }

    /**
     * Update material emoji and cost display
     */
    updateMaterialCostDisplay() {
        if (!this.materialEmojiDisplay || !this.materialCostDisplay) {
            return;
        }

        if (this.selectedMaterial) {
            // Update icon (could be emoji or texture image)
            const icon = this.voxelWorld.getItemIcon(this.selectedMaterial);
            this.materialEmojiDisplay.innerHTML = icon;

            // Calculate and update cost
            const length = this.shapeLength;
            const width = this.shapeWidth;
            const height = this.shapeHeight;
            const cost = length * width * height * 2;

            this.materialCostDisplay.textContent = cost.toString();

            // Check if user has enough materials
            const available = this.voxelWorld.countItemInSlots(this.selectedMaterial);
            if (available >= cost) {
                // Enough materials - green
                this.materialCostDisplay.style.color = '#4CAF50';
                this.materialCostDisplay.style.borderColor = '#4CAF50';
                this.materialCostDisplay.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
            } else {
                // Not enough materials - red
                this.materialCostDisplay.style.color = '#FF6B6B';
                this.materialCostDisplay.style.borderColor = '#FF6B6B';
                this.materialCostDisplay.style.backgroundColor = 'rgba(255, 107, 107, 0.1)';
            }
        } else {
            // No material selected
            this.materialEmojiDisplay.textContent = '❓';
            this.materialCostDisplay.textContent = '0';
            this.materialCostDisplay.style.color = '#666';
            this.materialCostDisplay.style.borderColor = '#666';
            this.materialCostDisplay.style.backgroundColor = 'rgba(102, 102, 102, 0.1)';
        }

        // Update craft button state whenever cost display updates
        this.updateCraftButtonState();
    }

    /**
     * Check if a material can be used for crafting (filter out discovery items)
     */
    isCraftingMaterial(material) {
        const craftingMaterials = [
            'wood', 'oak_wood', 'pine_wood', 'birch_wood', 'palm_wood', 'dead_wood',
            'stone', 'iron', 'glass', 'sand', 'brick', 'glowstone',
            'grass', 'dirt', 'coal', 'flowers', 'snow',
            'stick',  // Sticks can be crafted and used in tool bench
            // All leaf types (can be used to craft sticks)
            'oak_wood-leaves', 'pine_wood-leaves', 'birch_wood-leaves', 'palm_wood-leaves', 'dead_wood-leaves',
            'forest_leaves', 'mountain_leaves', 'desert_leaves', 'plains_leaves', 'tundra_leaves'
        ];
        return craftingMaterials.includes(material);
    }

    /**
     * Check if player material matches recipe requirement
     * Handles "any wood type" matching (wood -> oak_wood, pine_wood, etc.)
     * Handles "any leaves type" matching (leaves -> oak_wood-leaves, pine_wood-leaves, etc.)
     */
    materialMatches(recipeMaterial, playerMaterial) {
        // Direct match
        if (recipeMaterial === playerMaterial) {
            return true;
        }

        // "wood" in recipe matches any specific wood type
        if (recipeMaterial === 'wood') {
            const woodTypes = ['oak_wood', 'pine_wood', 'birch_wood', 'palm_wood', 'dead_wood'];
            return woodTypes.includes(playerMaterial);
        }

        // "leaves" in recipe matches any specific leaf type
        if (recipeMaterial === 'leaves') {
            const leafTypes = [
                'oak_wood-leaves', 'pine_wood-leaves', 'birch_wood-leaves', 'palm_wood-leaves', 'dead_wood-leaves',
                'forest_leaves', 'mountain_leaves', 'desert_leaves', 'plains_leaves', 'tundra_leaves'
            ];
            return leafTypes.includes(playerMaterial);
        }

        return false;
    }

    /**
     * Count total available materials that match a recipe requirement
     * Handles "wood" matching any wood type (oak_wood, pine_wood, etc.)
     */
    countAvailableMaterial(recipeMaterial) {
        let totalCount = 0;

        // Get all slots (hotbar + backpack)
        const allSlots = [
            ...this.voxelWorld.inventory.hotbarSlots,
            ...this.voxelWorld.inventory.backpackSlots
        ];

        // Count materials that match the recipe requirement
        for (const slot of allSlots) {
            if (slot && slot.itemType && this.materialMatches(recipeMaterial, slot.itemType)) {
                totalCount += slot.quantity || 0;
            }
        }

        return totalCount;
    }

    /**
     * Remove specified quantity of materials that match a recipe requirement
     * Handles removing from any wood type when recipe needs "wood"
     */
    removeMatchingMaterials(recipeMaterial, quantity) {
        let remaining = quantity;

        // Get all slots (hotbar + backpack)
        const allSlots = [
            ...this.voxelWorld.inventory.hotbarSlots,
            ...this.voxelWorld.inventory.backpackSlots
        ];

        // Remove materials proportionally from matching slots
        for (const slot of allSlots) {
            if (remaining <= 0) break;
            
            if (slot && slot.itemType && this.materialMatches(recipeMaterial, slot.itemType)) {
                const toRemove = Math.min(remaining, slot.quantity);
                slot.quantity -= toRemove;
                remaining -= toRemove;

                // Clean up empty slots
                if (slot.quantity <= 0) {
                    slot.itemType = null;
                    slot.quantity = 0;
                }
            }
        }

        console.log(`🗑️ Removed ${quantity} ${recipeMaterial} (${remaining} remaining debt)`);
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
        this.updateMaterialCostDisplay(); // Update emoji and cost
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
                    // Selected state - show golden border
                    item.style.borderColor = '#FFD700';
                    item.style.backgroundColor = 'rgba(255, 215, 0, 0.2)';
                    item.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.3)';
                } else {
                    // Unselected state
                    item.style.borderColor = 'transparent';
                    item.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    item.style.boxShadow = 'none';
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
            const canMake = recipeMaterials.some(recipeMat =>
                Array.from(this.selectedMaterials).some(playerMat =>
                    this.materialMatches(recipeMat, playerMat)
                )
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
        console.log('🎨 VoxelWorld slot materials:', this.voxelWorld ? this.voxelWorld.getAllMaterialsFromSlots() : 'NO VOXELWORLD');

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

        if (!this.voxelWorld || !this.voxelWorld.getAllMaterialsFromSlots) {
            console.log('❌ Missing: VoxelWorld or slot system not available');
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

        // Use direct Length/Width/Height values
        const length = this.shapeLength;
        const width = this.shapeWidth;
        const height = this.shapeHeight;

        // Calculate total materials needed: length × width × height × 2
        const materialCost = length * width * height * 2;

        console.log(`🎯 Creating ${length}×${width}×${height} shape using ${materialCost} ${this.selectedMaterial}`);

        // Create the selected shape
        let previewMesh;
        switch (this.selectedShape) {
            case 'cube':
                previewMesh = this.createCube(this.selectedMaterial, length, width, height);
                break;
            case 'sphere':
                previewMesh = this.createSphere(this.selectedMaterial, length, width, height);
                break;
            case 'cylinder':
                previewMesh = this.createCylinder(this.selectedMaterial, length, width, height);
                break;
            case 'pyramid':
                previewMesh = this.createPyramid(this.selectedMaterial, length, width, height);
                break;
            case 'stairs':
                previewMesh = this.createStairs(this.selectedMaterial, length, width, height);
                break;
            case 'wall':
                previewMesh = this.createWall(this.selectedMaterial, length, width, height);
                break;
            case 'hollow_cube':
                previewMesh = this.createHollowCube(this.selectedMaterial, length, width, height);
                break;
            default:
                previewMesh = this.createCube(this.selectedMaterial, length, width, height);
        }

        if (previewMesh) {
            // Mark as preview object for easy removal
            previewMesh.userData.isPreviewObject = true;

            // Position shapes to sit ON the ground (not float)
            // Most shapes need their bottom at y=0, so position at height/2
            // But stairs and some complex shapes handle their own positioning
            if (this.selectedShape === 'stairs') {
                previewMesh.position.set(0, 0, 0); // Stairs handle their own positioning
            } else {
                previewMesh.position.set(0, height / 2, 0); // Bottom of shape at y=0
            }

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
     * Show naming modal for crafted item
     */
    showItemNamingModal(itemData) {
        // Create modal backdrop
        const namingModal = document.createElement('div');
        namingModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
        `;

        // Create modal container
        const container = document.createElement('div');
        container.style.cssText = `
            background: linear-gradient(135deg, #2c1810, #1a0f08);
            border: 3px solid #FFD700;
            border-radius: 15px;
            padding: 30px;
            max-width: 500px;
            width: 90%;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
        `;

        // Title with crafted item info
        const title = document.createElement('h2');
        title.textContent = '🎨 Name Your Creation';
        title.style.cssText = `
            color: #FFD700;
            margin: 0 0 20px 0;
            font-size: 24px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        `;

        // Item preview info
        const itemInfo = document.createElement('div');
        itemInfo.style.cssText = `
            color: #ccc;
            margin-bottom: 20px;
            font-size: 16px;
            background: rgba(255, 255, 255, 0.1);
            padding: 15px;
            border-radius: 8px;
            border: 1px solid rgba(255, 215, 0, 0.3);
        `;

        const materialEmoji = this.voxelWorld.getItemIcon(itemData.material);
        itemInfo.innerHTML = `
            <div style="margin-bottom: 10px;">
                <span style="font-size: 24px;">${materialEmoji}</span>
                <strong style="color: #FFD700; margin-left: 10px;">${itemData.shape.toUpperCase()}</strong>
            </div>
            <div style="font-size: 14px; opacity: 0.8;">
                Material: ${itemData.material} • Size: ${itemData.length}×${itemData.width}×${itemData.height}
            </div>
        `;

        // Input field for name
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = 'Enter a name for your creation...';
        nameInput.value = `Custom ${itemData.shape.charAt(0).toUpperCase() + itemData.shape.slice(1)}`;
        nameInput.style.cssText = `
            width: 100%;
            padding: 12px;
            font-size: 16px;
            border: 2px solid #8B4513;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.9);
            color: #333;
            margin-bottom: 20px;
            outline: none;
            box-sizing: border-box;
        `;

        // Focus and select text
        setTimeout(() => {
            nameInput.focus();
            nameInput.select();
        }, 100);

        // Buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.cssText = `
            display: flex;
            gap: 15px;
            justify-content: center;
        `;

        // Cancel button
        const cancelButton = document.createElement('button');
        cancelButton.textContent = '❌ Cancel';
        cancelButton.style.cssText = `
            padding: 12px 24px;
            background: linear-gradient(45deg, #8B0000, #6B0000);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.2s ease;
        `;

        // Craft button
        const craftButton = document.createElement('button');
        craftButton.textContent = '⚡ Craft Item';
        craftButton.style.cssText = `
            padding: 12px 24px;
            background: linear-gradient(45deg, #4CAF50, #45a049);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.2s ease;
            font-weight: bold;
        `;

        // Event handlers
        const closeModal = () => {
            document.body.removeChild(namingModal);
            // Re-enable VoxelWorld input controls when modal closes
            if (this.voxelWorld) {
                this.voxelWorld.controlsEnabled = true;
                console.log('✅ Re-enabled VoxelWorld input controls');
            }
        };

        const finalizeCrafting = () => {
            const itemName = nameInput.value.trim();
            if (!itemName) {
                nameInput.style.borderColor = '#FF6B6B';
                nameInput.focus();
                return;
            }

            closeModal();
            this.finalizeCraftedItem(itemData, itemName);
        };

        cancelButton.addEventListener('click', closeModal);
        craftButton.addEventListener('click', finalizeCrafting);

        // Enter key to craft
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                finalizeCrafting();
            } else if (e.key === 'Escape') {
                closeModal();
            }
        });

        // Hover effects
        [cancelButton, craftButton].forEach(button => {
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'translateY(-2px)';
                button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            });
            button.addEventListener('mouseleave', () => {
                button.style.transform = 'translateY(0)';
                button.style.boxShadow = 'none';
            });
        });

        // Assemble modal
        buttonsContainer.appendChild(cancelButton);
        buttonsContainer.appendChild(craftButton);

        container.appendChild(title);
        container.appendChild(itemInfo);
        container.appendChild(nameInput);
        container.appendChild(buttonsContainer);

        namingModal.appendChild(container);
        document.body.appendChild(namingModal);

        // Disable VoxelWorld input controls while modal is open
        if (this.voxelWorld) {
            this.voxelWorld.controlsEnabled = false;
            console.log('🔒 Disabled VoxelWorld input controls for naming modal');
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
        const length = this.shapeLength;
        const width = this.shapeWidth;
        const height = this.shapeHeight;
        // Formula: 2 materials per block crafted (L×W×H blocks × 2 materials each)
        // Round up to prevent fractional materials (e.g., 0.8×0.6×0.8 = 0.768 → 2 materials)
        const requiredQuantity = Math.ceil(length * width * height * 2);
        const availableQuantity = this.voxelWorld.countItemInSlots(material);

        console.log(`🔨 Preparing to craft ${shape} ${length}×${width}×${height} using ${requiredQuantity} ${material}`);
        console.log(`📦 Available: ${availableQuantity}, Required: ${requiredQuantity}`);

        // 🔧 TOOL BENCH: UI unlock (no inventory item)
        if (this.currentRecipe?.isToolBench) {
            console.log('🔧 Crafting tool bench (UI unlock)');

            // Check materials for tool bench recipe (with wood type matching)
            const recipeMaterials = this.currentRecipe.materials;
            for (const [mat, qty] of Object.entries(recipeMaterials)) {
                const available = this.countAvailableMaterial(mat);  // Uses materialMatches() logic
                if (available < qty) {
                    this.voxelWorld.updateStatus(`⚠️ Not enough ${mat}! Need ${qty}, have ${available}`, 'error');
                    return;
                }
            }

            // Consume materials (using materialMatches to remove from any wood type)
            for (const [mat, qty] of Object.entries(recipeMaterials)) {
                this.removeMatchingMaterials(mat, qty);
            }

            // Unlock tool bench UI
            this.voxelWorld.hasToolBench = true;

            // Show tool bench button
            if (this.voxelWorld.toolBenchButton) {
                this.voxelWorld.toolBenchButton.style.display = 'block';
                console.log('🔧 Tool bench button enabled');
            }

            // Update UI
            this.voxelWorld.updateHotbarCounts();
            this.voxelWorld.updateBackpackInventoryDisplay();
            this.updateMaterialCostDisplay();

            // Success notification
            this.voxelWorld.updateStatus(`🔧 Tool Bench unlocked! Press T to open.`, 'discovery');
            console.log(`🔧 Tool Bench successfully unlocked!`);
            return;
        }

        // 🪵 SIMPLE ITEM: Direct inventory item (like sticks)
        if (this.currentRecipe?.isItem) {
            console.log('🪵 Crafting simple item:', this.currentRecipe.itemId);

            // Check materials for item recipe (with material matching)
            const recipeMaterials = this.currentRecipe.materials;
            for (const [mat, qty] of Object.entries(recipeMaterials)) {
                const available = this.countAvailableMaterial(mat);  // Uses materialMatches() logic
                if (available < qty) {
                    this.voxelWorld.updateStatus(`⚠️ Not enough ${mat}! Need ${qty}, have ${available}`, 'error');
                    return;
                }
            }

            // Consume materials (using materialMatches to remove matching materials)
            for (const [mat, qty] of Object.entries(recipeMaterials)) {
                this.removeMatchingMaterials(mat, qty);
            }

            // Add crafted item(s) to inventory
            const quantity = this.currentRecipe.quantity || 1;
            this.voxelWorld.addToInventory(this.currentRecipe.itemId, quantity);

            // Update UI
            this.voxelWorld.updateHotbarCounts();
            this.voxelWorld.updateBackpackInventoryDisplay();
            this.updateMaterialCostDisplay();

            // Success notification
            this.voxelWorld.updateStatus(`${this.currentRecipe.name} crafted!`, 'success');
            console.log(`✅ Crafted ${quantity}x ${this.currentRecipe.itemId}`);
            return;
        }

        // Check if player has enough materials
        if (availableQuantity < requiredQuantity) {
            console.log(`❌ Not enough ${material}! Need ${requiredQuantity}, have ${availableQuantity}`);
            this.voxelWorld.updateStatus(`⚠️ Not enough ${material}! Need ${requiredQuantity}, have ${availableQuantity}`, 'error');
            return;
        }

        // Create item data for the naming modal
        const itemData = {
            material: material,
            shape: shape,
            length: length,
            width: width,
            height: height,
            requiredQuantity: requiredQuantity,
            timestamp: Date.now(),
            effects: this.currentRecipe?.effects || []  // Include effects from recipe
        };

        // Show naming modal instead of immediately crafting
        this.showItemNamingModal(itemData);
    }

    /**
     * Finalize the crafted item with user-provided name and enhanced data
     */
    finalizeCraftedItem(itemData, itemName) {
        console.log('🎨 ===== FINALIZING CRAFTED ITEM =====');
        console.log('📦 Item Data:', itemData);
        console.log('🏷️ User Name:', itemName);

        // Get material color for the item
        const materialColors = {
            wood: '#8B4513',
            oak_wood: '#8B6914',
            pine_wood: '#A0826D',
            birch_wood: '#F5DEB3',
            palm_wood: '#CD853F',
            dead_wood: '#696969',
            stone: '#696969',
            iron: '#708090',
            glass: '#87CEEB',
            brick: '#CD853F',
            sand: '#F4A460',
            grass: '#228B22',
            dirt: '#8B4513',
            glowstone: '#FFFF88',
            campfire: '#FF6600'  // Orange/red fire color
        };

        const itemColor = materialColors[itemData.material] || '#8B4513';

        // Create comprehensive crafted item data in JSON format
        const enhancedItemData = {
            // Basic info
            name: itemName,
            type: 'crafted_item',
            category: 'shapeforge',

            // Shape properties
            shape: {
                type: itemData.shape,
                dimensions: {
                    length: itemData.length,
                    width: itemData.width,
                    height: itemData.height
                }
            },

            // Material properties
            material: {
                type: itemData.material,
                color: itemColor,
                quantity_used: itemData.requiredQuantity
            },

            // Visual properties
            appearance: {
                color: itemColor,
                skin: null, // Placeholder for future skin system
                icon_type: 'material_web_icon'
            },

            // Effects (fire, holy, etc.)
            effects: itemData.effects || [],

            // Metadata
            metadata: {
                created_timestamp: itemData.timestamp,
                created_by: 'user',
                crafting_system: 'shapeforge_v1',
                version: '1.0'
            }
        };

        // Create item identifier for Material Icons system (no timestamp for icon matching)
        const itemId = `crafted_${itemData.material}_${itemData.shape}_${itemData.length}x${itemData.width}x${itemData.height}`;

        console.log('🎨 Enhanced Item Data:', enhancedItemData);

        // Consume materials from slot-based inventory
        this.voxelWorld.removeFromInventory(itemData.material, itemData.requiredQuantity);
        console.log(`✅ Consumed ${itemData.requiredQuantity} ${itemData.material}, ${this.voxelWorld.countItemInSlots(itemData.material)} remaining`);

        // Add crafted item to slot-based inventory with enhanced data
        this.voxelWorld.addToInventory(itemId, 1);

        // Store enhanced metadata (create inventoryMetadata if it doesn't exist)
        if (!this.voxelWorld.inventoryMetadata) {
            this.voxelWorld.inventoryMetadata = {};
        }
        this.voxelWorld.inventoryMetadata[itemId] = enhancedItemData;

        // Update UI displays
        this.voxelWorld.updateHotbarCounts();
        this.voxelWorld.updateBackpackInventoryDisplay();

        // Update cost display and button state (since materials were consumed)
        this.updateMaterialCostDisplay();

        // Success notification with user's custom name
        const emoji = this.voxelWorld.getItemIcon(itemData.material);
        this.voxelWorld.updateStatus(`⚡ Crafted ${emoji} "${itemName}"! Added to inventory.`, 'discovery');

        console.log(`🎉 Successfully crafted "${itemName}" with ID: ${itemId}!`);
        console.log(`📦 Updated slot materials:`, this.voxelWorld.getAllMaterialsFromSlots());
    }
}