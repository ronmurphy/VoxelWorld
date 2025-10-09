/**
 * Storyboard.js - Node-based story and event management system for the game
 * Handles creation, editing, and execution of narrative flows and game events
 */

// Check if Storyboard already exists to prevent redeclaration
if (typeof window.Storyboard === "undefined") {
  window.Storyboard = class Storyboard {
    constructor(scene3D, resourceManager) {
      // Core dependencies
      this.scene3D = scene3D;
      this.resourceManager = resourceManager;
      this.in3DMode = false;

      // Story data - persistent between sessions
      this.storyGraphs = new Map(); // Map of story IDs to story graph objects
      this.activeStories = new Map(); // Currently active story executions
      this.triggeredStories = new Set(); // IDs of stories that have been triggered

      // Current working graph data - persists between editor sessions
      this.currentGraph = {
        id: "graph_default",
        nodes: new Map(), // Persistent node data
        connections: [], // Persistent connection data
        dirty: false // Whether data has changed since last save
      };

      // UI references - temporary, only valid when editor is open
      this.editor = null; // Reference to editor drawer
      this.currentOverlay = null; // Current story overlay (dialogs etc)

      // Editor UI state - temporary, reset each time editor opens
      this.editorState = {
        active: false,
        selectedNode: null,
        draggingNode: null,
        draggingOffset: { x: 0, y: 0 },
        connectingFrom: null,
        canvasElement: null,
        propertiesElement: null
      };

      // Try to load existing data
      this.loadFromStorage();

      // Initialize styles
      this.initStyles();

      // Register world trigger check with scene3D if available
      if (
        this.scene3D &&
        typeof this.scene3D.registerUpdateCallback === "function"
      ) {
        this.scene3D.registerUpdateCallback(this.checkTriggers.bind(this));
      }

      console.log("Storyboard system initialized with persistent data");
    }

    connectToResourceManager(resourceManager) {
      if (!resourceManager) {
        console.error("Storyboard - Invalid ResourceManager provided");
        return false;
      }

      this.resourceManager = resourceManager;
      console.log("Storyboard is Connected to ResourceManager");
      return true;
    }

    /**
     * Initialize CSS styles for story displays
     */
    // .storyboard-drawer::part(header) {
    //   background: #333;
    //   padding: 16px;
    //   border-bottom: 1px solid #444;
    // }

    initStyles() {
      const styles = document.createElement("style");
      styles.textContent = `
      /* Drawer styling overrides */
  .storyboard-drawer::part(panel) {
    padding: 0;
    border: none;
    background: #242424;
    color: #e0e0e0;
  }
  
.storyboard-drawer::part(header) {
  background: #333;
  border-bottom: 1px solid #444;
  height: 48px;
  padding: 0 16px; /* Reduce padding */
  display: flex;
  align-items: center; /* Vertically center content */
}

/* Target the title specifically */
.storyboard-drawer::part(title) {
  font-size: 1rem; /* Slightly smaller font */
  white-space: nowrap; /* Prevent wrapping */
  overflow: hidden;
  text-overflow: ellipsis; /* Add ellipsis for long titles */
}

/* Adjust the close button */
.storyboard-drawer::part(close-button) {
  margin-left: 8px; /* Less margin */
  padding: 8px; /* Smaller click target but still usable */
}
  
  .storyboard-drawer::part(body) {
    padding: 0;
  }
  
  .storyboard-drawer::part(footer) {
    background: #333;
    border-top: 1px solid #444;
    padding: 12px;
  }
      
      /* Story overlay styling */
  .story-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
      
      .story-content {
        background: #242424;
        max-width: 800px;
        width: 80vw;
        max-height: 80vh;
        border-radius: 8px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        transform: scale(0.95);
        transition: transform 0.3s ease;
      }
      
      .story-header {
        padding: 16px;
        background: linear-gradient(135deg, #673ab7, #9c27b0);
        color: white;
        font-weight: bold;
        font-size: 1.2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .story-body {
        padding: 24px;
        overflow-y: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      
      .story-image {
        width: 100%;
        border-radius: 4px;
        overflow: hidden;
      }
      
      .story-image img {
        width: 100%;
        height: auto;
        display: block;
      }
      
      .story-text {
        font-size: 1.1rem;
        line-height: 1.6;
        color: #e0e0e0;
      }
      
      .story-choices {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 16px;
      }
      
      .story-choice {
        padding: 12px 16px;
        background: #333;
        border-radius: 4px;
        cursor: pointer;
        transition: background 0.2s;
        color: #e0e0e0;
      }
      
      .story-choice:hover {
        background: #444;
      }
      
      .story-footer {
        padding: 16px;
        background: #333;
        border-top: 1px solid #444;
        display: flex;
        justify-content: flex-end;
      }
      
      /* Node Editor Styles */
      .storyboard-editor {
        display: flex;
        height: 100%;
        overflow: hidden;
      }
      
      .storyboard-canvas {
        flex: 1;
        background: #1e1e1e;
        background-image: 
          linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
        background-size: 20px 20px;
        position: relative;
        overflow: auto;
      }
      
      .storyboard-sidebar {
        width: 300px;
        background: #242424;
        border-left: 1px solid #444;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      
      .storyboard-node {
        position: absolute;
        background: #333;
        border-radius: 6px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        min-width: 200px;
        display: flex;
        flex-direction: column;
        user-select: none;
        cursor: move;
        z-index: 1;
      }
      
      .storyboard-node-header {
        padding: 8px 12px;
        background: #673ab7;
        color: white;
        font-weight: bold;
        border-radius: 6px 6px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .storyboard-node-body {
        padding: 12px;
        color: #e0e0e0;
      }
      
      .storyboard-node-footer {
        padding: 8px 12px;
        display: flex;
        justify-content: space-between;
        border-top: 1px solid #444;
      }
      
      .storyboard-connection {
        position: absolute;
        pointer-events: none;
        z-index: 0;
      }
      
      .storyboard-port {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #aaa;
        border: 2px solid #333;
        position: absolute;
        cursor: pointer;
        z-index: 2;
      }
      
      .storyboard-port.input {
        top: -7px;
        left: 50%;
        transform: translateX(-50%);
      }
      
      .storyboard-port.output {
        bottom: -7px;
        left: 50%;
        transform: translateX(-50%);
      }

      // Add these lines in your initStyles method
.storyboard-node[data-type="condition"] .storyboard-port.output.true-port {
  bottom: -7px;
  left: 30%; /* Position to the left */
  transform: translateX(-50%);
}

.storyboard-node[data-type="condition"] .storyboard-port.output.false-port {
  bottom: -7px;
  left: 70%; /* Position to the right */
  transform: translateX(-50%);
}

.storyboard-node[data-type="combat"] .storyboard-port.output.win-port {
  bottom: -7px;
  left: 30%; /* Position to the left */
  transform: translateX(-50%);
}

.storyboard-node[data-type="combat"] .storyboard-port.output.lose-port {
  bottom: -7px;
  left: 70%; /* Position to the right */
  transform: translateX(-50%);
}
      
      .storyboard-toolbox {
        padding: 12px;
        border-bottom: 1px solid #444;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      
      .storyboard-tool {
        padding: 6px 12px;
        background: #673ab7;
        color: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
      }
      
      .storyboard-tool:hover {
        background: #7e57c2;
      }
      
      .storyboard-tool:active {
        background: #5e35b1;
      }
      
      .storyboard-properties {
        flex: 1;
        padding: 12px;
        overflow-y: auto;
        color: #e0e0e0;
      }
      
      .storyboard-property-group {
        margin-bottom: 16px;
      }
      
      .storyboard-property-label {
        font-weight: bold;
        margin-bottom: 4px;
        color: #aaa;
      }
      
      .storyboard-property-field {
        margin-bottom: 8px;
      }
      
      /* Make node buttons more visible */
      .storyboard-node-close {
        display: inline-block;
        width: 18px;
        height: 18px;
        line-height: 16px;
        text-align: center;
        border-radius: 50%;
        background: rgba(128, 5, 5, 0.91);
        cursor: pointer;
        font-weight: bold;
      }
      
      .storyboard-node-close:hover {
        background: rgba(255,0,0,0.5);
      }
      
      /* Selected node styling */
      .storyboard-node.selected {
        outline: 2px solid #fff;
        box-shadow: 0 0 10px rgba(255,255,255,0.3);
      }

    `;

      document.head.appendChild(styles);
    }

    /**
     * Opens the storyboard editor in an sl-drawer
     */
    openEditor() {
      console.log("Opening storyboard editor");

      if (this.editor) {
        console.log("Editor already open");
        return;
      }

      try {
        // Reset UI state but keep data
        this.editorState.active = true;
        this.editorState.selectedNode = null;
        this.editorState.draggingNode = null;
        this.editorState.connectingFrom = null;
        this.editorState.canvasElement = null;
        this.editorState.propertiesElement = null;

        // Create editor drawer
        const drawer = document.createElement("sl-drawer");
        drawer.label = "Storyboard Editor";
        drawer.placement = "end";

        // Add the storyboard-drawer class
        drawer.classList.add("storyboard-drawer");

        // Set size to leave room for sidebar
        drawer.style.cssText = "--size: calc(100vw - 280px);";

        // Create editor content - IMPORTANT: We add unique IDs to make debugging easier
        drawer.innerHTML = `
      <div class="storyboard-editor" id="sb-editor">
        <div class="storyboard-canvas" id="storyboard-canvas">
          <!-- Nodes will be added here dynamically -->
        </div>
        <div class="storyboard-sidebar" id="sb-sidebar">
          <div class="storyboard-toolbox" id="sb-toolbox">
            <div title="Dialog" class="storyboard-tool" id="sb-tool-dialog" data-type="dialog"><i class="material-icons">chat</i></div>
            <div title="Choice" class="storyboard-tool" id="sb-tool-choice" data-type="choice"><i class="material-icons">check_circle</i></div>
            <div title="Trigger" class="storyboard-tool" id="sb-tool-trigger" data-type="trigger"><i class="material-icons">flash_on</i></div>
            <div title="Event" class="storyboard-tool" id="sb-tool-event" data-type="event"><i class="material-icons">event</i></div>
            <div title="Condition" class="storyboard-tool" id="sb-tool-condition" data-type="condition"><i class="material-icons">rule</i></div>
            <div title="Combat" class="storyboard-tool" id="sb-tool-combat" data-type="combat"><i class="material-icons">sports_martial_arts</i></div>
            <div title="Reward" class="storyboard-tool" id="sb-tool-reward" data-type="reward"><i class="material-icons">card_giftcard</i></div>
          </div>
          <div class="storyboard-properties" id="storyboard-properties">
            <div class="story-no-selection">
              <p>Select a node to edit its properties.</p>
            </div>
          </div>
          <div style="padding: 12px; border-top: 1px solid #ddd; text-align:center;">
            <sl-button variant="success" id="test-storyboard" style="width: 45%;"><span class="material-icons" style="margin-right: 4px; font-size: 16px;">play_arrow</span>Test Story</sl-button>
            <sl-button variant="primary" id="save-storyboard" style="width: 45%;">Save Storyboard</sl-button>
          </div>
        </div>
      </div>
      
        <!-- Footer container instead of just a button -->
  <div slot="footer" id="footer-container">
    <div id="footer-left" style="display: inline-flex; gap: 8px;">
      <!-- Items will be inserted here -->
    </div>
    <sl-button variant="primary" id="sb-close-btn">Close</sl-button>
  </div>
    `;

      // <sl-button slot="footer" variant="primary" id="sb-close-btn">Close</sl-button>

    this.addZoomPanControls();
    
        // Add to DOM
        document.body.appendChild(drawer);

        // Store reference to editor before showing
        this.editor = drawer;

        // Add explicit close handler
        const closeBtn = drawer.querySelector("#sb-close-btn");
        if (closeBtn) {
          closeBtn.addEventListener("click", () => {
            console.log("Close button clicked");

            // Make sure to save any unsaved changes when closing
            if (this.currentGraph.dirty) {
              this.saveCurrentGraph();
            }

            this.editorState.active = false; // Update UI state first
            drawer.hide();
            this.editor = null;
          });
        }

        // Handle hide event
        drawer.addEventListener("sl-after-hide", () => {
          console.log("Drawer closed, cleaning up");

          // Just reset UI state, not data
          this.editorState.active = false;
          this.editor = null;
        });

        // Show the drawer
        console.log("Showing storyboard drawer");
        drawer.show();

        // Initialize functionality after a small delay
        console.log("Setting up initialization timer");
        setTimeout(() => {
          console.log("Initialization timer fired, initializing editor");
          this.directInitEditor();
        }, 500);
      } catch (error) {
        console.error("Error opening storyboard editor:", error);
        this.editorState.active = false;
      }
    }

    /**
     * New saveCurrentGraph method to persist the current graph
     */
    saveCurrentGraph() {
      if (!this.currentGraph.id) {
        this.currentGraph.id = "graph_" + Date.now();
      }

      // Create clean graph data without DOM references
      const cleanGraph = {
        nodes: [],
        connections: []
      };

      // Convert nodes to clean format
      this.currentGraph.nodes.forEach((nodeData, nodeId) => {
        // Extract position from DOM if available
        let position = { x: 0, y: 0 };
        if (nodeData.element) {
          position = {
            x: parseInt(nodeData.element.style.left) || 0,
            y: parseInt(nodeData.element.style.top) || 0
          };
        } else if (nodeData.position) {
          position = nodeData.position;
        }

        // Create clean node data
        cleanGraph.nodes.push({
          id: nodeId,
          type: nodeData.type,
          position: position,
          data: nodeData.data
        });
      });

      // Add connections
      this.currentGraph.connections.forEach((conn) => {
        cleanGraph.connections.push({
          from: conn.from,
          to: conn.to
        });
      });

      // Store in storyGraphs
      this.storyGraphs.set(this.currentGraph.id, cleanGraph);

      // Mark as clean
      this.currentGraph.dirty = false;

      // Save to localStorage
      this.saveToStorage();

      console.log("Current graph saved:", this.currentGraph.id);
    }

    /**
     * New method for direct initialization without relying on the sl-after-show event
     */
    directInitEditor() {
      if (!this.editor) {
        console.error("Editor not found in directInitEditor");
        this.editorState.active = false;
        return;
      }

      console.log("Starting direct editor initialization");

      try {
        const canvas = this.editor.querySelector("#storyboard-canvas");
        const properties = this.editor.querySelector("#storyboard-properties");

        if (!canvas || !properties) {
          console.error("Canvas or properties element not found in editor");
          return;
        }

        // Store references in UI state
        this.editorState.canvasElement = canvas;
        this.editorState.propertiesElement = properties;

        console.log("Found canvas and properties elements");

        // Set up tool buttons
        this.setupToolButtons();

        // Set up canvas interactions
        this.setupCanvasInteractions(canvas, properties);

            // Add zoom and pan controls
    this.addZoomPanControls(canvas);

        // Set up save button
        const saveButton = this.editor.querySelector("#save-storyboard");
        if (saveButton) {
          console.log("Setting up save button");
          saveButton.addEventListener("click", () => {
            console.log("Save button clicked");
            this.saveCurrentGraph();

            // Show confirmation toast
            const toast = document.createElement("sl-alert");
            toast.variant = "success";
            toast.closable = true;
            toast.duration = 3000;
            toast.innerHTML = `
          <sl-icon slot="icon" name="check-circle"></sl-icon>
          Storyboard saved successfully!
        `;
            document.body.appendChild(toast);
            toast.toast();
          });
        }

        // Set up test button
// const saveButton = this.editor.querySelector('#save-storyboard');
// if (saveButton) {
//   // Set up a container for the buttons
//   const buttonsContainer = saveButton.parentElement;
  
//   // Create test button
//   const testButton = document.createElement('sl-button');
//   testButton.id = 'test-storyboard';
//   testButton.variant = 'success';
//   testButton.innerHTML = `
//     <span class="material-icons" style="margin-right: 4px; font-size: 16px;">play_arrow</span>
//     Test Story
//   `;
//   testButton.style.marginRight = '8px';
  
//   // Insert before save button
//   buttonsContainer.insertBefore(testButton, saveButton);
  


  const testButton = this.editor.querySelector("#test-storyboard");
    // Add click handler
  testButton.addEventListener('click', () => {
    this.testStoryboard();
  });

  // });
// }

        // Restore nodes from persistent data
        this.restoreNodesFromData(canvas);

        console.log("Editor initialization complete");
      } catch (error) {
        console.error("Error in directInitEditor:", error);
        this.editorState.active = false;
      }
    }

    /**
     * New method to set up tool buttons
     */
    setupToolButtons() {
      if (!this.editor) return;

      const toolIds = [
        "sb-tool-dialog",
        "sb-tool-choice",
        "sb-tool-trigger",
        "sb-tool-event",
        "sb-tool-condition",
        "sb-tool-combat",
        "sb-tool-reward"
      ];

      toolIds.forEach((id) => {
        const tool = this.editor.querySelector(`#${id}`);
        if (tool) {
          console.log(`Setting up tool button: ${id}`);
          tool.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const nodeType = tool.getAttribute("data-type");
            console.log(`Tool clicked: ${nodeType}`);
            this.createNewNode(this.editorState.canvasElement, nodeType);
          });
        } else {
          console.error(`Tool button not found: ${id}`);
        }
      });


    }

    /**
     * New method to restore nodes from persistent data
     */
    restoreNodesFromData(canvas) {
      if (!canvas) return;

      // Clear the canvas first
      const existingNodes = canvas.querySelectorAll(".storyboard-node");
      existingNodes.forEach((node) => node.remove());

      // Check if we have existing nodes in the current graph
      if (this.currentGraph.nodes.size === 0) {
        // If empty, add a sample node
        console.log("No existing nodes, creating sample node");
        this.createSampleNode(canvas);
        return;
      }

      console.log(
        `Restoring ${this.currentGraph.nodes.size} nodes from persistent data`
      );

      // Restore all nodes
      this.currentGraph.nodes.forEach((nodeData, nodeId) => {
        this.restoreSingleNode(canvas, nodeData, nodeId);
      });

      // Restore connections after all nodes are created
      setTimeout(() => {
        this.restoreConnections(canvas);
      }, 100);
    }

    /**
     * New method to restore a single node
     */
    /**
     * Generates the HTML for special node types with multiple ports
     */
    /**
     * Generates the HTML for special node types with multiple ports
     */
    generateNodeHTML(nodeType, title, body, nodeData) {
      // Base structure with input port at the top
  //     const baseTemplate = `
  //   <div class="storyboard-port input" style="position: absolute; top: -7px; left: 50%; transform: translateX(-50%);"></div>
  //   <div class="storyboard-node-header">
  //     ${title}
  //     <span class="storyboard-node-close">×</span>
  //   </div>
  //   <div class="storyboard-node-body">
  //     ${body}
  //   </div>
  // `;


  const iconMap = {
    "Dialog": "chat",
    "Choice": "check_circle",
    "Trigger": "flash_on",
    "Event": "event",
    "Condition": "rule",
    "Combat": "sports_martial_arts",
    "Reward": "card_giftcard"
};

const getIconForTitle = (title) => {
    return iconMap[title] || "help"; // Default to "help" if no match
};

const baseTemplate = `
    <div class="storyboard-port input" style="position: absolute; top: -7px; left: 50%; transform: translateX(-50%);"></div>
    <div class="storyboard-node-header">
      <i class="material-icons">${getIconForTitle(title)}</i> ${title}
      <span class="storyboard-node-close">×</span>
    </div>
    <div class="storyboard-node-body">
      ${body}
    </div>
`;


      // Add the footer with appropriate output ports based on node type
      switch (nodeType) {
        case "condition":
          return `
        ${baseTemplate}
        <div class="storyboard-node-footer" style="position: relative; height: 20px; margin-top: 10px;">
          <div class="storyboard-port output true-port" data-path="true" style="background: #2196F3; position: absolute; bottom: -7px; left: 30%; transform: translateX(-50%);"></div>
          <div class="storyboard-port output false-port" data-path="false" style="background: #F44336; position: absolute; bottom: -7px; left: 70%; transform: translateX(-50%);"></div>
        </div>
      `;

      //   case "choice":
      //     // Get number of options (limit to 5)
      //     const options = nodeData?.data?.options || [];
      //     const numOptions = Math.min(options.length, 5);

      //     // Generate option ports
      //     let portsHTML = "";
      //     const colors = [
      //       "#4CAF50",
      //       "#2196F3",
      //       "#FF9800",
      //       "#9C27B0",
      //       "#607D8B"
      //     ];

      //     // Position the ports evenly
      //     for (let i = 0; i < numOptions; i++) {
      //       const percentage =
      //         numOptions <= 1 ? 50 : i * (100 / (numOptions - 1));
      //       const color = colors[i % colors.length];

      //       portsHTML += `
      //     <div class="storyboard-port output option-port" 
      //          data-option="${i}" 
      //          style="background: ${color}; position: absolute; bottom: -7px; left: ${percentage}%; transform: translateX(-50%);"
      //          title="Option ${i + 1}"></div>
      //   `;
      //     }

      //     return `
      //   ${baseTemplate}
      //   <div class="storyboard-node-footer" style="position: relative; height: 20px; margin-top: 10px;">
      //     ${portsHTML}
      //   </div>
      // `;

case 'choice':
  // Get number of options (limit to 5)
  const options = nodeData?.data?.options || [];
  const numOptions = Math.min(options.length, 5);
  
  // Generate option ports
  let portsHTML = '';
  const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#607D8B'];
  
  // Position the ports evenly
  for (let i = 0; i < numOptions; i++) {
    const percentage = numOptions <= 1 ? 50 : i * (100 / (numOptions - 1));
    const color = colors[i % colors.length];
    
    portsHTML += `
      <div class="storyboard-port output option-port" 
           data-option="${i}" 
           style="background: ${color}; position: absolute; bottom: -7px; left: ${percentage}%; transform: translateX(-50%);"
           title="Option ${i + 1}"></div>
    `;
  }
  
  return `
    ${baseTemplate}
    <div class="storyboard-node-footer" style="position: relative; height: 20px; margin-top: 10px;">
      ${portsHTML}
    </div>
  `;

        case "combat":
          return `
        ${baseTemplate}
        <div class="storyboard-node-footer" style="position: relative; height: 20px; margin-top: 10px;">
          <div class="storyboard-port output win-port" data-path="victory" style="background: #4CAF50; position: absolute; bottom: -7px; left: 30%; transform: translateX(-50%);"></div>
          <div class="storyboard-port output lose-port" data-path="defeat" style="background: #F44336; position: absolute; bottom: -7px; left: 70%; transform: translateX(-50%);"></div>
        </div>
      `;

        default:
          return `
        ${baseTemplate}
        <div class="storyboard-node-footer">
          <div class="storyboard-port output" style="position: absolute; bottom: -7px; left: 50%; transform: translateX(-50%);"></div>
        </div>
      `;
      }
    }


    restoreSingleNode(canvas, nodeData, nodeId) {
      // Create node element
      const node = document.createElement("div");
      node.className = "storyboard-node";
      node.setAttribute("data-type", nodeData.type);
      node.setAttribute("data-id", nodeId);

      // Set position
      if (nodeData.position) {
        node.style.left = `${nodeData.position.x}px`;
        node.style.top = `${nodeData.position.y}px`;
      } else {
        node.style.left = "100px";
        node.style.top = "100px";
      }

      // Set content based on node type
      const title =
        nodeData.data.title ||
        nodeData.type.charAt(0).toUpperCase() + nodeData.type.slice(1);
      let body = "";

      switch (nodeData.type) {
        case "dialog":
          body = `<div>${nodeData.data.text || ""}</div>`;
          break;
        case "choice":
          body = `
            <div>${nodeData.data.text || ""}</div>
            <div style="color:#777;font-size:0.9em;">${
              nodeData.data.options?.length || 0
            } options</div>
          `;
          break;
        case "trigger":
          body = `<div>X: ${nodeData.data.x || 0}, Y: ${
            nodeData.data.y || 0
          }, Radius: ${nodeData.data.radius || 1}</div>`;
          break;
        case "event":
          body = `<div>Event: ${nodeData.data.eventType || "none"}</div>`;
          break;
        case "condition":
          body = `<div>Condition: ${nodeData.data.condition || "none"}</div>`;
          break;
        case "combat":
          body = `<div>Combat with ${
            nodeData.data.enemies?.length || 0
          } enemies</div>`;
          break;
        case "reward":
          body = `<div>Rewards: ${
            nodeData.data.items?.length || 0
          } items</div>`;
          break;
        default:
          body = "<div>Configure node</div>";
      }

      // Use the helper method to generate HTML based on node type
      node.innerHTML = this.generateNodeHTML(
        nodeData.type,
        title,
        body,
        nodeData
      );

      // Add to canvas
      canvas.appendChild(node);

      // Update the stored node data to include element reference
      nodeData.element = node;

      // Set up delete handler
      const closeBtn = node.querySelector(".storyboard-node-close");
      if (closeBtn) {
        closeBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("Delete node clicked");
          this.deleteNode(node);
        });
      }
    }

    /**
     * New method to restore connections
     */
    restoreConnections(canvas) {
      if (!canvas) return;

      console.log(
        `Restoring ${this.currentGraph.connections.length} connections`
      );

      // Clear existing connection elements
      const existingConnections = canvas.querySelectorAll(
        ".storyboard-connection:not(.temp-connection)"
      );
      existingConnections.forEach((conn) => conn.remove());

      // Recreate all connections
      this.currentGraph.connections.forEach((conn) => {
        // Find source and target nodes
        const fromNode = canvas.querySelector(
          `.storyboard-node[data-id="${conn.from}"]`
        );
        const toNode = canvas.querySelector(
          `.storyboard-node[data-id="${conn.to}"]`
        );

        if (fromNode && toNode) {
          // Get the ports
          const fromPort = fromNode.querySelector(".storyboard-port.output");
          const toPort = toNode.querySelector(".storyboard-port.input");

          if (fromPort && toPort) {
            this.createConnection(canvas, {
              from: {
                node: fromNode,
                port: fromPort
              },
              to: {
                node: toNode,
                port: toPort
              }
            });
          }
        }
      });
    }

    setupCanvasInteractions(canvas, properties) {
      if (!canvas || !properties) return;

      // Store references in case they're needed
      const editorState = this.editorState;

      // Add canvas state for zoom and pan
      editorState.canvasScale = 1;
      editorState.canvasPan = { x: 0, y: 0 };
      editorState.isPanning = false;
      editorState.lastX = 0;
      editorState.lastY = 0;

      // Create a container for all nodes
      let nodesContainer = canvas.querySelector(".nodes-container");
      if (!nodesContainer) {
        nodesContainer = document.createElement("div");
        nodesContainer.className = "nodes-container";
        nodesContainer.style.position = "absolute";
        nodesContainer.style.width = "100%";
        nodesContainer.style.height = "100%";
        nodesContainer.style.transformOrigin = "0 0";
        nodesContainer.style.transform = "scale(1)";
        nodesContainer.style.transition = "transform 0.1s";

        // Move any existing nodes into the container
        const existingNodes = Array.from(
          canvas.querySelectorAll(".storyboard-node")
        );
        existingNodes.forEach((node) => nodesContainer.appendChild(node));

        canvas.appendChild(nodesContainer);
        editorState.nodesContainer = nodesContainer;
      }

    canvas.addEventListener('mousedown', (e) => {
      // Check if middle button
      if (e.button === 1) {
        e.preventDefault();
        editorState.isPanning = true;
        editorState.lastX = e.clientX;
        editorState.lastY = e.clientY;
        canvas.style.cursor = 'grabbing';
      }
  
      // Check if we clicked on a node
      let nodeEl = e.target.closest('.storyboard-node');
  
      if (nodeEl) {
        console.log('Node clicked:', nodeEl.getAttribute('data-id'));
        // Handle node selection
        this.selectNode(nodeEl);
  
        // Handle node dragging
        if (e.target.closest('.storyboard-node-header')) {
          const rect = nodeEl.getBoundingClientRect();
          editorState.draggingNode = nodeEl;
          editorState.draggingOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
          };
        }
  
        // Handle connection creation
        if (e.target.closest('.storyboard-port')) {
          const port = e.target.closest('.storyboard-port');
          if (port.classList.contains('output') || 
              port.classList.contains('true-port') || 
              port.classList.contains('false-port') ||
              port.classList.contains('win-port') || 
              port.classList.contains('lose-port') ||
              port.classList.contains('option-port')) {
            
            editorState.connectingFrom = {
              node: nodeEl,
              port: port
            };
  
            // Get port position for connection drawing
            const portRect = port.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();
            
            const x1 = portRect.left + portRect.width / 2 - canvasRect.left;
            const y1 = portRect.top + portRect.height / 2 - canvasRect.top;
  
            // Create temporary connection line with color based on port type
            let lineColor = '#673ab7'; // Default purple
            
            const nodeType = nodeEl.getAttribute('data-type');
            const pathType = port.getAttribute('data-path');
            const optionIndex = port.getAttribute('data-option');
            
            if (nodeType === 'condition' && pathType) {
              lineColor = pathType === 'true' ? '#2196F3' : '#F44336';
            } else if (nodeType === 'combat' && pathType) {
              lineColor = pathType === 'victory' ? '#4CAF50' : '#F44336';
            } else if (nodeType === 'choice' && optionIndex !== null) {
              const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#607D8B'];
              lineColor = colors[parseInt(optionIndex) % colors.length];
            }
            
            // Create temporary connection
            const conn = document.createElement('div');
            conn.className = 'storyboard-connection temp-connection';
            conn.style.cssText = `
              position: absolute;
              height: 2px;
              background: ${lineColor};
              transform-origin: left center;
              left: ${x1}px;
              top: ${y1}px;
            `;
  
            canvas.appendChild(conn);
            editorState.connectingFrom.tempConnection = conn;
          }
        }
      } else {
        // Clicked on empty canvas
        this.deselectNode();
      }
    });



      canvas.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
          e.preventDefault();
    
          // Calculate zoom factor (smaller increment for smoother zoom)
          const factor = e.deltaY > 0 ? 0.9 : 1.1;
          editorState.canvasScale = Math.max(0.1, Math.min(2.0, editorState.canvasScale * factor));
    
          // Apply zoom
          canvas.style.transform = `scale(${editorState.canvasScale})`;
          canvas.style.transformOrigin = '0 0';
    
          // Update connections after zoom
          this.updateConnections();
        }
      });

      canvas.addEventListener('mousemove', (e) => {
        if (editorState.isPanning) {
          e.preventDefault();
    
          // Calculate delta
          const dx = e.clientX - editorState.lastX;
          const dy = e.clientY - editorState.lastY;
    
          // Update scroll position
          canvas.scrollLeft -= dx;
          canvas.scrollTop -= dy;
    
          // Update last position
          editorState.lastX = e.clientX;
          editorState.lastY = e.clientY;
        }
    
        // Handle node dragging
        if (editorState.draggingNode) {
          const canvasRect = canvas.getBoundingClientRect();
          const x = e.clientX - canvasRect.left - editorState.draggingOffset.x;
          const y = e.clientY - canvasRect.top - editorState.draggingOffset.y;
    
          editorState.draggingNode.style.left = `${x}px`;
          editorState.draggingNode.style.top = `${y}px`;
    
          // Update node position in persistent data
          const nodeId = editorState.draggingNode.getAttribute('data-id');
          const nodeData = this.currentGraph.nodes.get(nodeId);
          if (nodeData) {
            nodeData.position = { x, y };
            this.currentGraph.dirty = true;
          }
    
          // Update any connections attached to this node
          this.updateConnections();
        }
    
        // Handle connection creation
        if (editorState.connectingFrom) {
          const canvasRect = canvas.getBoundingClientRect();
          const fromRect = editorState.connectingFrom.port.getBoundingClientRect();
    
          const x1 = fromRect.left + fromRect.width / 2 - canvasRect.left;
          const y1 = fromRect.top + fromRect.height / 2 - canvasRect.top;
          const x2 = e.clientX - canvasRect.left;
          const y2 = e.clientY - canvasRect.top;
    
          const dx = x2 - x1;
          const dy = y2 - y1;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    
          const conn = editorState.connectingFrom.tempConnection;
          if (conn) {
            conn.style.width = `${length}px`;
            conn.style.transform = `rotate(${angle}deg)`;
          }
        }
      });


      canvas.addEventListener('mouseup', (e) => {
        if (editorState.isPanning) {
          editorState.isPanning = false;
          canvas.style.cursor = 'default';
        }
    
        // Handle node dragging end
        if (editorState.draggingNode) {
          editorState.draggingNode = null;
        }
    
        // Handle connection creation end
        if (editorState.connectingFrom) {
          const targetPort = e.target.closest('.storyboard-port');
    
          if (targetPort && targetPort.classList.contains('input')) {
            const fromNode = editorState.connectingFrom.node;
            const toNode = targetPort.closest('.storyboard-node');
    
            // Don't connect to self
            if (fromNode !== toNode) {
              this.createConnection(canvas, {
                from: {
                  node: fromNode,
                  port: editorState.connectingFrom.port
                },
                to: {
                  node: toNode,
                  port: targetPort
                }
              });
            }
          }
    
          // Remove temporary connection
          if (editorState.connectingFrom.tempConnection) {
            editorState.connectingFrom.tempConnection.remove();
          }
    
          editorState.connectingFrom = null;
        }
      });

        // Add keyboard shortcuts for zoom
  document.addEventListener('keydown', (e) => {
    if (!editorState.active) return;

    // Ctrl/Cmd + 0: Reset zoom
    if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      editorState.canvasScale = 1;
      canvas.style.transform = `scale(${editorState.canvasScale})`;
      this.updateConnections();
    }

    // Ctrl/Cmd + -: Zoom out
    if ((e.key === '-' || e.key === '_') && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      editorState.canvasScale = Math.max(0.3, editorState.canvasScale - 0.1);
      canvas.style.transform = `scale(${editorState.canvasScale})`;
      this.updateConnections();
    }

    // Ctrl/Cmd + +: Zoom in
    if ((e.key === '=' || e.key === '+') && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      editorState.canvasScale = Math.min(2, editorState.canvasScale + 0.1);
      canvas.style.transform = `scale(${editorState.canvasScale})`;
      this.updateConnections();
    }
  });

      function updateCanvasTransform(state, container) {
        container.style.transform = `scale(${state.canvasScale}) translate(${state.canvasPan.x}px, ${state.canvasPan.y}px)`;
      }
    }

    /**
 * Export the current storyboard to a JSON file
 */
exportToJSON() {
  // Get the current graph
  const storyGraph = this.currentGraph;
  if (!storyGraph) {
    console.error('No story available to export');
    return;
  }
  
  // Create a JSON-safe copy of the data
  const graphData = {
    id: this.currentGraphId,
    timestamp: new Date().toISOString(),
    nodes: {},
    connections: []
  };
  
  // Handle nodes (which should be a Map in your case)
  if (storyGraph.nodes instanceof Map) {
    // Convert Map to object
    for (const [nodeId, nodeData] of storyGraph.nodes) {
      // Create a clean copy without DOM elements
      const cleanNode = {...nodeData};
      delete cleanNode.element; // Remove DOM element references
      
      // For data that's complex, ensure it's properly copied
      if (cleanNode.data) {
        cleanNode.data = {...cleanNode.data};
      }
      
      graphData.nodes[nodeId] = cleanNode;
    }
  }
  
  // Copy connections array
  if (Array.isArray(storyGraph.connections)) {
    // Deep copy without any DOM elements
    graphData.connections = storyGraph.connections.map(conn => {
      const cleanConn = {...conn};
      if (cleanConn.element) delete cleanConn.element;
      return cleanConn;
    });
  }
  
  // Convert to pretty-printed JSON
  const jsonString = JSON.stringify(graphData, null, 2);
  
  // Create a downloadable link
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonString);
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", `storyboard_${this.currentGraphId || 'default'}_${new Date().getTime()}.json`);
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
  
  console.log('Exported storyboard to JSON file');
}

/**
 * Import storyboard from a JSON file
 */
importFromJSON() {
  // Create file input element
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  
  // Handle file selection
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) {
      fileInput.remove();
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonData = JSON.parse(event.target.result);
        this.loadGraphFromJSON(jsonData);
        console.log('Successfully imported storyboard from JSON');
        
        // Show confirmation toast
        const toast = document.createElement("sl-alert");
        toast.variant = "success";
        toast.closable = true;
        toast.duration = 3000;
        toast.innerHTML = `
          <sl-icon slot="icon" name="check-circle"></sl-icon>
          Storyboard imported successfully!
        `;
        document.body.appendChild(toast);
        toast.toast();
      } catch (error) {
        console.error('Error importing storyboard:', error);
        
        // Show error toast
        const toast = document.createElement("sl-alert");
        toast.variant = "danger";
        toast.closable = true;
        toast.duration = 3000;
        toast.innerHTML = `
          <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
          Error importing storyboard: ${error.message}
        `;
        document.body.appendChild(toast);
        toast.toast();
      }
      
      // Clean up
      fileInput.remove();
    };
    
    reader.readAsText(file);
  });
  
  // Trigger file input
  fileInput.click();
}

/**
 * Load a story graph from JSON data
 * @param {Object} jsonData - The parsed JSON data
 */
loadGraphFromJSON(jsonData) {
  if (!jsonData.nodes || !jsonData.connections) {
    throw new Error('Invalid storyboard JSON format');
  }
  
  // Create a new graph
  const graphId = jsonData.id || `graph_${Date.now()}`;
  const newGraph = {
    id: graphId,
    nodes: new Map(),
    connections: [],
    dirty: false
  };
  
  // Process nodes
  if (typeof jsonData.nodes === 'object') {
    // Handle nodes object (like the format we exported)
    Object.entries(jsonData.nodes).forEach(([nodeId, nodeData]) => {
      newGraph.nodes.set(nodeId, {
        type: nodeData.type,
        position: nodeData.position,
        data: nodeData.data,
        element: null // Will be set when displayed
      });
    });
  }
  
  // Process connections
  if (Array.isArray(jsonData.connections)) {
    newGraph.connections = jsonData.connections.map(conn => ({
      from: conn.from,
      to: conn.to,
      path: conn.path || null,
      option: conn.option || null
    }));
  }
  
  // Set as current graph
  this.currentGraph = newGraph;
  
  // Save to storyGraphs collection
  this.storyGraphs.set(graphId, newGraph);
  
  // Save to localStorage
  this.saveToStorage();
  console.log(`Imported storyboard saved as: ${graphId}`);
  
  // Refresh the editor if it's open
  if (this.editor && this.editorState.canvasElement) {
    this.restoreNodesFromData(this.editorState.canvasElement);
  }
  
  return newGraph;
}

/**
 * Add zoom and pan controls to the editor footer
 */
addZoomPanControls() {
  if (!this.editor) return;
  
  // Get the footer slot
  // const footerSlot = this.editor.querySelector('[slot="footer"]');
  const footerSlot = this.editor.querySelector('#footer-left');

  if (!footerSlot) return;
  
  // Create a container for our controls that will sit alongside the close button
  const controlsContainer = document.createElement('div');
  controlsContainer.className = 'storyboard-footer-controls';
  controlsContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    margin-right: auto; /* Push close button to the right */
  `;
  
  // Create navigation controls
  const navControls = document.createElement('div');
  navControls.style.cssText = `
    display: flex;
    align-items: center;
    gap: 4px;
    margin-right: 12px;
    border-right: 1px solid #444;
    padding-right: 12px;
  `;
  
  // Navigation buttons
  const directions = [
    { key: 'left', icon: '←' },
    { key: 'up', icon: '↑' },
    { key: 'down', icon: '↓' },
    { key: 'right', icon: '→' },
    { key: 'center', icon: '⦿' }
  ];
  
  for (const dir of directions) {
    const btn = document.createElement('button');
    btn.textContent = dir.icon;
    btn.dataset.direction = dir.key;
    btn.style.cssText = `
      width: 30px;
      height: 30px;
      border: none;
      background: #444;
      color: white;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    `;
    navControls.appendChild(btn);
  }
  
  // Create zoom controls
  const zoomControls = document.createElement('div');
  zoomControls.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  
  // Zoom out button
  const zoomOutBtn = document.createElement('button');
  zoomOutBtn.innerHTML = '<span style="font-size: 18px;">−</span>';
  zoomOutBtn.style.cssText = `
    width: 30px;
    height: 30px;
    border: none;
    background: #444;
    color: white;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  // Zoom slider
  const zoomSlider = document.createElement('input');
  zoomSlider.type = 'range';
  zoomSlider.min = '0.2';
  zoomSlider.max = '2';
  zoomSlider.step = '0.1';
  zoomSlider.value = '1';
  zoomSlider.style.cssText = `
    width: 100px;
  `;
  
  // Zoom in button
  const zoomInBtn = document.createElement('button');
  zoomInBtn.innerHTML = '<span style="font-size: 18px;">+</span>';
  zoomInBtn.style.cssText = `
    width: 30px;
    height: 30px;
    border: none;
    background: #444;
    color: white;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  // Zoom reset button
  const zoomResetBtn = document.createElement('button');
  zoomResetBtn.textContent = '1:1';
  zoomResetBtn.style.cssText = `
    border: none;
    background: #555;
    color: white;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    cursor: pointer;
  `;
  
  // Zoom display
  const zoomDisplay = document.createElement('div');
  zoomDisplay.textContent = '100%';
  zoomDisplay.style.cssText = `
    min-width: 50px;
    text-align: center;
    font-size: 12px;
    color: #ccc;
  `;
  


// Add Export JSON button
const exportBtn = document.createElement("button");
exportBtn.textContent = "Export JSON";
exportBtn.className = "storyboard-button export-json-btn";

exportBtn.style.cssText = `
  background-color: #4caf50;
  margin-right: 8px;
  padding: 4px;
height: 36px;
border: none;
color: white;
border-radius: 4px;
cursor: pointer;
display: flex;
align-items: center;
justify-content: center;
`;




exportBtn.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  this.exportToJSON();
});


// Add Load JSON button
const importBtn = document.createElement("button");
importBtn.textContent = "Load JSON";
importBtn.className = "storyboard-button load-json-btn";
importBtn.style.cssText = `
  background-color: #2196F3;
  margin-right: 8px;
  padding: 4px;
height: 36px;
border: none;
color: white;
border-radius: 4px;
cursor: pointer;
display: flex;
align-items: center;
justify-content: center;
`;
importBtn.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  this.importFromJSON();
});

const clearAllBtn = document.createElement("button");
clearAllBtn.textContent = "Clear All Stories";
clearAllBtn.className = "storyboard-button clear-all-btn";
clearAllBtn.style.cssText = `
  background-color: #F44336;
  margin-right: 8px;
  padding: 4px;
height: 36px;
border: none;
color: white;
border-radius: 4px;
cursor: pointer;
display: flex;
align-items: center;
justify-content: center;
`;
clearAllBtn.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  this.clearAllStoryboards();
});

// Add to UI





  zoomControls.appendChild(zoomOutBtn);
  zoomControls.appendChild(zoomSlider);
  zoomControls.appendChild(zoomInBtn);
  zoomControls.appendChild(zoomDisplay);
  zoomControls.appendChild(zoomResetBtn);
  zoomControls.appendChild(clearAllBtn);
  zoomControls.appendChild(importBtn);
  zoomControls.appendChild(exportBtn);
  
  // Add all controls to container
  controlsContainer.appendChild(navControls);
  controlsContainer.appendChild(zoomControls);
  
  // Insert before the close button
  footerSlot.insertBefore(controlsContainer, footerSlot.firstChild);
  
  // Get the canvas for transformation
  const canvas = this.editorState.canvasElement;
  
  // Add event handlers
  const editorState = this.editorState;
  
  // Zoom controls
  zoomOutBtn.addEventListener('click', () => {
    editorState.canvasScale = Math.max(0.2, editorState.canvasScale - 0.1);
    zoomSlider.value = editorState.canvasScale;
    zoomDisplay.textContent = `${Math.round(editorState.canvasScale * 100)}%`;
    this.applyCanvasTransform(canvas);
  });
  
  zoomInBtn.addEventListener('click', () => {
    editorState.canvasScale = Math.min(2, editorState.canvasScale + 0.1);
    zoomSlider.value = editorState.canvasScale;
    zoomDisplay.textContent = `${Math.round(editorState.canvasScale * 100)}%`;
    this.applyCanvasTransform(canvas);
  });
  
  zoomSlider.addEventListener('input', () => {
    editorState.canvasScale = parseFloat(zoomSlider.value);
    zoomDisplay.textContent = `${Math.round(editorState.canvasScale * 100)}%`;
    this.applyCanvasTransform(canvas);
  });
  
  zoomResetBtn.addEventListener('click', () => {
    editorState.canvasScale = 1;
    editorState.canvasPan = { x: 0, y: 0 };
    zoomSlider.value = 1;
    zoomDisplay.textContent = '100%';
    this.applyCanvasTransform(canvas);
  });
  
  // Navigation controls
  const panAmount = 50; // Pixels to pan per click
  
  navControls.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const direction = btn.dataset.direction;
      
      if (direction === 'center') {
        // Center view - reset pan but keep zoom
        editorState.canvasPan = { x: 0, y: 0 };
      } else if (direction === 'up') {
        editorState.canvasPan.y += panAmount / editorState.canvasScale;
      } else if (direction === 'down') {
        editorState.canvasPan.y -= panAmount / editorState.canvasScale;
      } else if (direction === 'left') {
        editorState.canvasPan.x += panAmount / editorState.canvasScale;
      } else if (direction === 'right') {
        editorState.canvasPan.x -= panAmount / editorState.canvasScale;
      }
      
      this.applyCanvasTransform(canvas);
    });
  });
}

// Add this method to Storyboard class
clearAllStoryboards() {
  // Confirm with user
  if (confirm('Are you sure you want to delete ALL storyboards? This cannot be undone.')) {
    console.log('Clearing all storyboards');
    
    // Clear collections
    this.storyGraphs.clear();
    this.triggeredStories.clear();
    
    // Reset current graph to empty state
    this.currentGraph = {
      id: "graph_default",
      nodes: new Map(),
      connections: [],
      dirty: false
    };
    
    // Save empty state to localStorage
    this.saveToStorage();
    
    // Refresh UI if editor is open
    if (this.editor && this.editorState.canvasElement) {
      this.restoreNodesFromData(this.editorState.canvasElement);
    }
    
    // Show confirmation
    const toast = document.createElement("sl-alert");
    toast.variant = "success";
    toast.closable = true;
    toast.duration = 3000;
    toast.innerHTML = `
      <sl-icon slot="icon" name="trash"></sl-icon>
      All storyboards cleared!
    `;
    document.body.appendChild(toast);
    toast.toast();
  }
}

/**
 * Apply canvas transform based on current scale and pan
 */
applyCanvasTransform(canvas) {
  if (!canvas) return;
  
  const state = this.editorState;
  
  // Apply transform to the canvas
  canvas.style.transform = `scale(${state.canvasScale}) translate(${state.canvasPan.x}px, ${state.canvasPan.y}px)`;
  
  // Adjust grid scale to ensure it covers the visible area
  const gridSize = 20; // Base grid size in pixels
  const scaledGridSize = gridSize * state.canvasScale;
  
  // Update the grid background
  canvas.style.backgroundSize = `${scaledGridSize}px ${scaledGridSize}px`;
  
  // Update connections
  this.updateConnections();
}

    /**
     * sees if the editor is avaliable after being closed
     * @returns true / false
     */
    isEditorAvailable() {
      // First check persistent state
      if (!this.editorState.active) {
        console.warn("Editor is not active according to persistent state");
        return false;
      }

      // Then check actual editor element
      if (!this.editor) {
        console.warn(
          "Editor element is null but state is active - fixing inconsistency"
        );
        this.editorState.active = false;
        return false;
      }

      // Check if canvas is accessible
      if (!this.editorState.canvasElement) {
        console.warn("Canvas element not available in editor state");
        return false;
      }

      return true;
    }

    /**
     * Update the createSampleNode method to be more reliable
     */
    createSampleNode(canvas, editorState) {
      console.log("Creating sample node at 100,100");

      // Create the node element
      const node = document.createElement("div");
      node.className = "storyboard-node";
      node.setAttribute("data-type", "dialog");
      node.setAttribute("data-id", "node_" + Date.now());
      node.style.left = "100px";
      node.style.top = "100px";

      // Set HTML content
      node.innerHTML = `
    <div class="storyboard-node-header">
      Dialog Node
      <span class="storyboard-node-close">×</span>
    </div>
    <div class="storyboard-node-body">
      <div>Welcome to the game!</div>
    </div>
    <div class="storyboard-node-footer">
      <div class="storyboard-port input"></div>
      <div class="storyboard-port output"></div>
    </div>
  `;

      // Add to canvas
      canvas.appendChild(node);
      console.log("Sample node added to canvas");

      // Add to nodes collection
      editorState.nodes.set(node.getAttribute("data-id"), {
        element: node,
        type: "dialog",
        data: {
          title: "Dialog Node",
          text: "Welcome to the game!",
          image: null
        }
      });

      // Set up delete handler with proper event handling
      const closeBtn = node.querySelector(".storyboard-node-close");
      if (closeBtn) {
        closeBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("Delete node clicked");
          this.deleteNode(node, editorState);
        });
      }

      return node;
    }

    /**
     * Initialize the functionality of the storyboard editor
     */
    initEditorFunctionality() {
      if (!this.editor) {
        console.error("Editor not found");
        return;
      }

      console.log("Initializing editor functionality");

      // Ensure the drawer is fully rendered before setting up editor
      setTimeout(() => {
        try {
          const canvas = this.editor.querySelector("#storyboard-canvas");
          const properties = this.editor.querySelector(
            "#storyboard-properties"
          );
          const tools = this.editor.querySelectorAll(".storyboard-tool");

          if (!canvas) {
            console.error("Canvas element not found in editor");
            return;
          }

          console.log("Found canvas element:", canvas);
          console.log("Found tool buttons:", tools.length);

          // Track editor state
          const editorState = {
            selectedNode: null,
            draggingNode: null,
            draggingOffset: { x: 0, y: 0 },
            connectingFrom: null,
            nodes: new Map(),
            connections: []
          };

          // Load any existing story graphs
          // For now just create a sample node for testing
          this.createSampleNode(canvas, editorState);

          // Set up tool buttons with direct event handlers
          tools.forEach((tool) => {
            console.log("Setting up tool:", tool.getAttribute("data-type"));

            tool.addEventListener("click", (e) => {
              e.preventDefault();
              e.stopPropagation();

              const nodeType = tool.getAttribute("data-type");
              console.log("Tool clicked:", nodeType);

              this.createNewNode(canvas, editorState, nodeType);
            });
          });

          // Set up canvas interactions with proper event delegation
          canvas.addEventListener("mousedown", (e) => {
            // Check if we clicked on a node
            let nodeEl = e.target.closest(".storyboard-node");

            if (nodeEl) {
              // Handle node selection
              this.selectNode(nodeEl, editorState, properties);

              // Handle node dragging
              if (e.target.closest(".storyboard-node-header")) {
                const rect = nodeEl.getBoundingClientRect();
                editorState.draggingNode = nodeEl;
                editorState.draggingOffset = {
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top
                };
              }

              // Handle connection creation
              if (e.target.closest(".storyboard-port")) {
                const port = e.target.closest(".storyboard-port");
                if (port.classList.contains("output")) {
                  editorState.connectingFrom = {
                    node: nodeEl,
                    port: port
                  };

                  // Create temporary connection line
                  const conn = document.createElement("div");
                  conn.className = "storyboard-connection temp-connection";
                  conn.style.cssText = `
                  position: absolute;
                  height: 2px;
                  background: #673ab7;
                  transform-origin: left center;
                `;

                  const fromRect = port.getBoundingClientRect();
                  const canvasRect = canvas.getBoundingClientRect();

                  const x1 =
                    fromRect.left + fromRect.width / 2 - canvasRect.left;
                  const y1 =
                    fromRect.top + fromRect.height / 2 - canvasRect.top;

                  conn.style.left = `${x1}px`;
                  conn.style.top = `${y1}px`;

                  canvas.appendChild(conn);
                  editorState.connectingFrom.tempConnection = conn;
                }
              }
            } else {
              // Clicked on empty canvas
              this.deselectNode(editorState, properties);
            }
          });

          canvas.addEventListener("mousemove", (e) => {
            // Handle node dragging
            if (editorState.draggingNode) {
              const canvasRect = canvas.getBoundingClientRect();
              const x =
                e.clientX - canvasRect.left - editorState.draggingOffset.x;
              const y =
                e.clientY - canvasRect.top - editorState.draggingOffset.y;

              editorState.draggingNode.style.left = `${x}px`;
              editorState.draggingNode.style.top = `${y}px`;

              // Update any connections attached to this node
              this.updateConnections(editorState);
            }

            // Handle connection creation
            if (editorState.connectingFrom) {
              const canvasRect = canvas.getBoundingClientRect();
              const fromRect =
                editorState.connectingFrom.port.getBoundingClientRect();

              const x1 = fromRect.left + fromRect.width / 2 - canvasRect.left;
              const y1 = fromRect.top + fromRect.height / 2 - canvasRect.top;
              const x2 = e.clientX - canvasRect.left;
              const y2 = e.clientY - canvasRect.top;

              const dx = x2 - x1;
              const dy = y2 - y1;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

              const conn = editorState.connectingFrom.tempConnection;
              conn.style.width = `${length}px`;
              conn.style.transform = `rotate(${angle}deg)`;
            }
          });

          canvas.addEventListener("mouseup", (e) => {
            // Handle node dragging end
            if (editorState.draggingNode) {
              editorState.draggingNode = null;
            }

            // Handle connection creation end
            if (editorState.connectingFrom) {
              const targetPort = e.target.closest(".storyboard-port");

              if (targetPort && targetPort.classList.contains("input")) {
                const fromNode = editorState.connectingFrom.node;
                const toNode = targetPort.closest(".storyboard-node");

                // Don't connect to self
                if (fromNode !== toNode) {
                  this.createConnection(canvas, editorState, {
                    from: {
                      node: fromNode,
                      port: editorState.connectingFrom.port
                    },
                    to: {
                      node: toNode,
                      port: targetPort
                    }
                  });
                }
              }

              // Remove temporary connection
              if (editorState.connectingFrom.tempConnection) {
                editorState.connectingFrom.tempConnection.remove();
              }

              editorState.connectingFrom = null;
            }
          });

          // Save button with explicit handler
          const saveButton = this.editor.querySelector("#save-storyboard");
          if (saveButton) {
            console.log("Found save button");
            saveButton.addEventListener("click", (e) => {
              console.log("Save button clicked");
              this.saveStoryboard(editorState);
            });
          } else {
            console.error("Save button not found");
          }

          // Close button with explicit handler
          const closeButton = this.editor.querySelector(
            'sl-button[slot="footer"]'
          );
          if (closeButton) {
            console.log("Found close button");
            closeButton.addEventListener("click", (e) => {
              console.log("Close button clicked");
              this.editor.hide();
            });
          } else {
            console.error("Close button not found");
          }

          console.log("Editor functionality initialized successfully");
        } catch (error) {
          console.error("Error initializing editor functionality:", error);
        }
      }, 300); // Add a small delay to ensure components are ready
    }

    /**
     * Create a sample node for testing
     */
    createSampleNode(canvas) {
      console.log("Creating sample node at 100,100");

      // Create unique ID
      const nodeId = "node_sample_" + Date.now();

      // Create sample node data
      const nodeData = {
        type: "dialog",
        position: { x: 100, y: 100 },
        data: {
          title: "Dialog Node",
          text: "Welcome to the game!",
          image: null
        },
        element: null // Will be set after DOM creation
      };

      // Add to persistent graph
      this.currentGraph.nodes.set(nodeId, nodeData);
      this.currentGraph.dirty = true;

      // Create DOM element
      this.restoreSingleNode(canvas, nodeData, nodeId);

      return nodeData.element;
    }

    /**
     * Create a new node of the specified type
     */

    createNewNode(canvas, nodeType) {
      if (!this.isEditorAvailable() || !canvas) {
        console.error("Cannot create node - editor or canvas not available");
        return null;
      }

      console.log("Creating new node of type:", nodeType);

      // Create unique ID
      const nodeId = "node_" + Date.now();

      // Create default data for this node type
      let data = {};

      switch (nodeType) {
        case "dialog":
          data = { title: "Dialog", text: "New dialog text", image: null };
          break;
        case "choice":
          data = {
            text: "What would you like to do?",
            options: [
              { text: "Option 1", targetId: null },
              { text: "Option 2", targetId: null }
            ]
          };
          break;
        case "trigger":
          data = { x: 0, y: 0, radius: 1, once: true };
          break;
        case "event":
          data = { eventType: "none", params: {} };
          break;
        case "condition":
          data = { condition: "none", params: {} };
          break;
        case "combat":
          data = { enemies: [], background: null };
          break;
        case "reward":
          data = { items: [], experience: 0 };
          break;
        default:
          data = {};
      }

      // Position in center of visible canvas
      const canvasRect = canvas.getBoundingClientRect();
      const scrollLeft = canvas.scrollLeft;
      const scrollTop = canvas.scrollTop;
      const centerX = scrollLeft + canvasRect.width / 2 - 100;
      const centerY = scrollTop + canvasRect.height / 2 - 50;

      // Create persistent node data
      const nodeData = {
        type: nodeType,
        position: { x: centerX, y: centerY },
        data: data,
        element: null // Will be set after DOM creation
      };

      // Add to persistent graph
      this.currentGraph.nodes.set(nodeId, nodeData);
      this.currentGraph.dirty = true;

      // Create DOM element - use our new generateNodeHTML method
      const node = document.createElement("div");
      node.className = "storyboard-node";
      node.setAttribute("data-type", nodeType);
      node.setAttribute("data-id", nodeId);
      node.style.left = `${centerX}px`;
      node.style.top = `${centerY}px`;

      // Get title and default body content
      const title =
        data.title || nodeType.charAt(0).toUpperCase() + nodeType.slice(1);
      let body = "";

      switch (nodeType) {
        case "dialog":
          body = `<div>${data.text || ""}</div>`;
          break;
        case "choice":
          body = `
            <div>${data.text || ""}</div>
            <div style="color:#777;font-size:0.9em;">${
              data.options?.length || 0
            } options</div>
          `;
          break;
        case "trigger":
          body = `<div>X: ${data.x || 0}, Y: ${data.y || 0}, Radius: ${
            data.radius || 1
          }</div>`;
          break;
        case "event":
          body = `<div>Event: ${data.eventType || "none"}</div>`;
          break;
        case "condition":
          body = `<div>Condition: ${data.condition || "none"}</div>`;
          break;
        case "combat":
          body = `<div>Combat with ${data.enemies?.length || 0} enemies</div>`;
          break;
        case "reward":
          body = `<div>Rewards: ${data.items?.length || 0} items</div>`;
          break;
        default:
          body = "<div>Configure node</div>";
      }

      // Use our helper to generate the proper HTML
      node.innerHTML = this.generateNodeHTML(nodeType, title, body, nodeData);
      canvas.appendChild(node);

      // Store the element reference
      nodeData.element = node;

      // Set up delete handler
      const closeBtn = node.querySelector(".storyboard-node-close");
      if (closeBtn) {
        closeBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("Delete node clicked");
          this.deleteNode(node);
        });
      }

      // Select the new node
      this.selectNode(node);

      return node;
    }

    /**
     * Create a connection between two nodes
     */
    createConnection(canvas, connection) {
      if (!canvas || !connection.from || !connection.to) {
        console.error("Invalid connection data");
        return null;
      }

      const fromNode = connection.from.node;
      const toNode = connection.to.node;
      const fromId = fromNode.getAttribute("data-id");
      const toId = toNode.getAttribute("data-id");

      

      // Check if this is a condition node connection and which port was used
      const fromNodeType = fromNode.getAttribute("data-type");
      const pathType = connection.from.port.getAttribute("data-path"); // 'true', 'false', 'victory', 'defeat'
      const optionIndex = connection.from.port.getAttribute('data-option');

      console.log(
        `Creating connection from ${fromId} to ${toId}${
          pathType ? ` (${pathType} path)` : ""
        }`
      );

      // Create connection element
      const conn = document.createElement("div");
      conn.className = "storyboard-connection";
      conn.setAttribute("data-from", fromId);
      conn.setAttribute("data-to", toId);

      // Set path attribute if available
      if (pathType) {
        conn.setAttribute("data-path", pathType);
      }

      // Set line color based on node type and path
      let lineColor = "#673ab7"; // Default purple


  if (this.isConditionConnection(fromNode, pathType)) {
    conn.setAttribute('data-path', pathType);
    lineColor = pathType === 'true' ? '#2196F3' : '#F44336';
  } else if (fromNodeType === 'choice' && optionIndex !== null) {
    conn.setAttribute('data-option', optionIndex);
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#607D8B'];
    lineColor = colors[parseInt(optionIndex) % colors.length];
  } else if (fromNodeType === 'combat' && pathType) {
    conn.setAttribute('data-path', pathType);
    lineColor = pathType === 'victory' ? '#4CAF50' : '#F44336';
  }

      conn.style.cssText = `
        position: absolute;
        height: 2px;
        background: ${lineColor};
        transform-origin: left center;
        z-index: 0;
      `;

      canvas.appendChild(conn);

       // Add to persistent connections with path/option info
  this.currentGraph.connections.push({
    from: fromId,
    to: toId,
    path: pathType || null,
    option: optionIndex !== null ? parseInt(optionIndex) : null,
    element: conn
  });

      this.currentGraph.dirty = true;

      // Update connection position
      this.updateConnection(conn, fromNode, toNode, canvas);

      return conn;
    }

    /**
 * Determines if a connection is from a condition node
 * @param {HTMLElement} fromNode - The source node element
 * @param {String} pathType - The path type attribute value ("true" or "false")
 * @returns {Boolean} - Whether this is a condition-type connection
 */
isConditionConnection(fromNode, pathType) {
  if (!fromNode) return false;
  
  // Check if the source node is a condition node
  const fromNodeType = fromNode.getAttribute("data-type");
  
  // It's a condition connection if:
  // 1. The node is of type 'condition'
  // 2. The path type is either 'true' or 'false'
  return fromNodeType === "condition" && 
         pathType && 
         (pathType === "true" || pathType === "false");
}

    /**
     * Update a single connection's position
     */
    updateConnection(connectionEl, fromNode, toNode, canvas) {
      if (!this.isEditorAvailable()) return;

      // Get the nodesContainer for scale and offset
      const nodesContainer = this.editorState.nodesContainer || canvas;
      const scale = this.editorState.canvasScale || 1;

      // Find the correct output port based on the connection's path
      let fromPort;
      const fromNodeType = fromNode.getAttribute("data-type");
      const connectionPath = connectionEl.getAttribute("data-path");
      const optionIndex = connectionEl.getAttribute("data-option");

      if (fromNodeType === "condition" && connectionPath) {
        // Find specific port for condition nodes
        if (connectionPath === "true") {
          fromPort = fromNode.querySelector(
            ".storyboard-port.output.true-port"
          );
        } else {
          fromPort = fromNode.querySelector(
            ".storyboard-port.output.false-port"
          );
        }
      } else if (fromNodeType === "combat" && connectionPath) {
        // Find specific port for combat nodes
        if (connectionPath === "victory") {
          fromPort = fromNode.querySelector(".storyboard-port.output.win-port");
        } else {
          fromPort = fromNode.querySelector(
            ".storyboard-port.output.lose-port"
          );
        }
      } else if (fromNodeType === "choice" && optionIndex !== null) {
        // Find specific option port for choice nodes
        // fromPort = fromNode.querySelector(
        //   `.storyboard-port.output.option-port[data-option="${optionIndex}"]`
        // );
        fromPort = fromNode.querySelector(`.storyboard-port.output.option-port[data-option="${optionIndex}"]`);
      } else {
        // Default output port
        fromPort = fromNode.querySelector(".storyboard-port.output");
      }

      const toPort = toNode.querySelector(".storyboard-port.input");

      if (!fromPort || !toPort) {
        console.error("Could not find ports for connection");
        return;
      }

      // Get positions relative to scaled container
      const fromRect = fromPort.getBoundingClientRect();
      const toRect = toPort.getBoundingClientRect();
      const containerRect = nodesContainer.getBoundingClientRect();

      // Calculate positions in the scaled/panned space
      const x1 =
        (fromRect.left + fromRect.width / 2 - containerRect.left) / scale;
      const y1 =
        (fromRect.top + fromRect.height / 2 - containerRect.top) / scale;
      const x2 = (toRect.left + toRect.width / 2 - containerRect.left) / scale;
      const y2 = (toRect.top + toRect.height / 2 - containerRect.top) / scale;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

      // Position the connection in the scaled space
      connectionEl.style.left = `${x1}px`;
      connectionEl.style.top = `${y1}px`;
      connectionEl.style.width = `${length}px`;
      connectionEl.style.transform = `rotate(${angle}deg)`;
      connectionEl.style.transformOrigin = "left center";
    }

    /**
     * Update all connections in the editor
     */
    updateConnections() {
      if (!this.isEditorAvailable()) return;

      const canvas = this.editorState.canvasElement;
      if (!canvas) return;

      this.currentGraph.connections.forEach((connection) => {
        if (!connection.element) return;

        const fromNode = canvas.querySelector(
          `.storyboard-node[data-id="${connection.from}"]`
        );
        const toNode = canvas.querySelector(
          `.storyboard-node[data-id="${connection.to}"]`
        );

        if (fromNode && toNode) {
          this.updateConnection(connection.element, fromNode, toNode, canvas);
        }
      });
    }

    /**
     * Delete a node and its connections
     */
    deleteNode(nodeEl) {
      if (!nodeEl) return;

      const nodeId = nodeEl.getAttribute("data-id");
      console.log("Deleting node:", nodeId);

      // Remove associated connections
      const canvas = nodeEl.parentElement;
      if (canvas) {
        this.currentGraph.connections = this.currentGraph.connections.filter(
          (conn) => {
            if (conn.from === nodeId || conn.to === nodeId) {
              if (conn.element) {
                conn.element.remove();
              }
              return false;
            }
            return true;
          }
        );
      }

      // Remove node element
      nodeEl.remove();

      // Remove from persistent graph
      this.currentGraph.nodes.delete(nodeId);
      this.currentGraph.dirty = true;

      // Deselect if this was the selected node
      if (this.editorState.selectedNode === nodeEl) {
        this.deselectNode();
      }
    }

    getImageName(imageData) {
      if (!imageData || !this.resourceManager) return "";
      try {
        const { id, category } = imageData;
        const art = this.resourceManager.resources.splashArt[category]?.get(id);
        return art?.name || "";
      } catch (error) {
        console.error("Error getting image name:", error);
        return "";
      }
    }

    /**
     * Select a node and show its properties
     */
    selectNode(nodeEl) {
      if (!this.isEditorAvailable() || !nodeEl) return;

      // Deselect previous node
      if (this.editorState.selectedNode) {
        this.editorState.selectedNode.classList.remove("selected");
      }

      // Select this node
      nodeEl.classList.add("selected");
      this.editorState.selectedNode = nodeEl;

      // Show properties
      const properties = this.editorState.propertiesElement;
      if (!properties) return;

      // Get the node data
      const nodeId = nodeEl.getAttribute("data-id");
      const nodeData = this.currentGraph.nodes.get(nodeId);

      let propertiesHtml = "";
      let paramsHtml = "";
      let optionsHtml = "";
      let eventOptionsHtml = "";
      let conditionOptionsHtml = "";

      if (nodeData) {
        switch (nodeData.type) {
          case "dialog":
            propertiesHtml = `
              <div class="storyboard-property-group">
                <div class="storyboard-property-label">Dialog Title</div>
                <div class="storyboard-property-field">
                  <sl-input id="dialog-title-input" name="title" value="${
                    nodeData.data.title || ""
                  }"></sl-input>
                </div>
              </div>
              
              <div class="storyboard-property-group">
                <div class="storyboard-property-label">Dialog Text</div>
                <div class="storyboard-property-field">
                  <!-- Regular HTML textarea that will always work -->
                  <textarea 
                    id="dialog-text-area" 
                    style="width: 100%; min-height: 120px; padding: 8px; border: 2px solid #6200ee; 
                           background: #333; color: white; border-radius: 4px; font-family: inherit;
                           font-size: 1em; resize: vertical; margin-bottom: 8px;"
                    rows="6"
                  >${nodeData.data.text || ""}</textarea>
                  
                  <div class="text-status" style="margin-top: 4px; font-size: 0.8em; color: #aaa;">
                    <span class="char-count">0</span> characters
                  </div>
                </div>
              </div>
              
              <div class="storyboard-property-group">
                <div class="storyboard-property-label">Image</div>
                <div class="storyboard-property-field">
                  <sl-button id="select-image-btn" size="small">Select Image</sl-button>
                  ${
                    nodeData.data.image
                      ? `
                    <div class="selected-image-preview" style="margin-top: 12px; border: 1px solid #444; padding: 8px; border-radius: 4px; background: #333;">
                      <img src="${this.getSplashArtUrl(nodeData.data.image)}" 
                           style="max-width: 100%; max-height: 150px; display: block; margin: 0 auto; border-radius: 4px;">
                      <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #aaa; font-size: 0.9em;">${
                          this.getImageName(nodeData.data.image) ||
                          "Selected Image"
                        }</span>
                        <sl-button size="small" class="remove-image-btn" variant="danger">
                          <span class="material-icons" style="font-size: 16px;">close</span>
                        </sl-button>
                      </div>
                    </div>
                  `
                      : '<div style="margin-top: 8px; font-size: 0.9em; color: #888;">No image selected</div>'
                  }
                </div>
              </div>
              
              <div class="storyboard-property-actions" style="margin-top: 16px; display: flex; justify-content: flex-end;">
                <sl-button id="apply-dialog-changes" variant="primary">Apply Changes</sl-button>
              </div>
            `;
            break;

          case "choice":
            // Initialize options array if it doesn't exist
            if (
              !nodeData.data.options ||
              !Array.isArray(nodeData.data.options)
            ) {
              nodeData.data.options = [
                { text: "Option 1", targetId: null },
                { text: "Option 2", targetId: null }
              ];
            }

            // Generate options HTML dynamically
            optionsHtml = "";
            nodeData.data.options.forEach((option, index) => {
              optionsHtml += `
      <div class="option-row" style="display: flex; gap: 8px; margin-bottom: 12px; align-items: start;">
        <div style="flex: 1;">
          <textarea 
            class="option-text" 
            data-index="${index}"
            style="width: 100%; min-height: 60px; padding: 8px; border: 1px solid #666; background: #333; color: white; border-radius: 4px;"
            rows="2">${option.text || ""}</textarea>
        </div>
        <sl-button size="small" class="delete-option-btn" data-index="${index}" style="flex-shrink: 0;">
          <span class="material-icons" style="font-size: 16px;">delete</span>
        </sl-button>
      </div>
    `;
            });

            propertiesHtml = `
    <div class="storyboard-property-group">
      <div class="storyboard-property-label">Question Text</div>
      <div class="storyboard-property-field">
        <textarea 
          id="choice-text-area" 
          style="width: 100%; min-height: 100px; padding: 8px; border: 2px solid #6200ee; 
                 background: #333; color: white; border-radius: 4px; font-family: inherit;
                 font-size: 1em; resize: vertical; margin-bottom: 8px;"
          rows="4"
        >${nodeData.data.text || "What would you like to do?"}</textarea>
      </div>
    </div>
    
    <div class="storyboard-property-group">
      <div class="storyboard-property-label">Options</div>
      <div class="storyboard-property-field options-container">
        ${optionsHtml}
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 12px;">
        <sl-button id="add-option-btn" size="small" variant="primary">
          <span class="material-icons" style="font-size: 16px; margin-right: 4px;">add</span>
          Add Option
        </sl-button>
        <span style="color: #aaa; font-size: 0.9em; align-self: center;">
          ${nodeData.data.options.length} options
        </span>
      </div>
    </div>
    
    <div class="storyboard-property-actions" style="margin-top: 16px; display: flex; justify-content: flex-end;">
      <sl-button id="apply-choice-changes" variant="primary">Apply Changes</sl-button>
    </div>
  `;
            break;

          // For the selectNode method in Storyboard.js - add this case for trigger nodes
          case "trigger":
            // Ensure default values exist
            if (!nodeData.data.x) nodeData.data.x = 0;
            if (!nodeData.data.y) nodeData.data.y = 0;
            if (!nodeData.data.radius) nodeData.data.radius = 1;
            if (nodeData.data.once === undefined) nodeData.data.once = true;

            propertiesHtml = `
    <div class="storyboard-property-group">
      <div class="storyboard-property-label">Trigger Position</div>
      <div class="storyboard-property-field" style="display: flex; gap: 12px; margin-bottom: 16px;">
        <div style="flex: 1;">
          <label style="display: block; margin-bottom: 4px; color: #aaa; font-size: 0.9em;">X Coordinate</label>
          <input 
            type="number" 
            id="trigger-x-input" 
            value="${nodeData.data.x}"
            step="0.1"
            style="width: 100%; padding: 8px; border: 1px solid #666; background: #333; color: white; border-radius: 4px;"
          >
        </div>
        <div style="flex: 1;">
          <label style="display: block; margin-bottom: 4px; color: #aaa; font-size: 0.9em;">Y Coordinate</label>
          <input 
            type="number" 
            id="trigger-y-input" 
            value="${nodeData.data.y}"
            step="0.1"
            style="width: 100%; padding: 8px; border: 1px solid #666; background: #333; color: white; border-radius: 4px;"
          >
        </div>
      </div>
    </div>
    
    <div class="storyboard-property-group">
      <div class="storyboard-property-label">Trigger Radius</div>
      <div class="storyboard-property-field" style="margin-bottom: 16px;">
        <input 
          type="range" 
          id="trigger-radius-input" 
          min="0.1" 
          max="10" 
          step="0.1" 
          value="${nodeData.data.radius}"
          style="width: 100%; margin-bottom: 8px;"
        >
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #aaa; font-size: 0.9em;">0.1</span>
          <span id="radius-value" style="color: white; font-weight: bold;">${
            nodeData.data.radius
          }</span>
          <span style="color: #aaa; font-size: 0.9em;">10</span>
        </div>
      </div>
    </div>
    
    <div class="storyboard-property-group">
      <div class="storyboard-property-field" style="margin-bottom: 16px;">
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input 
            type="checkbox" 
            id="trigger-once-input" 
            ${nodeData.data.once ? "checked" : ""}
            style="margin-right: 8px;"
          >
          <span>Trigger only once</span>
        </label>
        <div style="margin-top: 4px; color: #aaa; font-size: 0.9em; margin-left: 24px;">
          If checked, this trigger will only activate once per game session.
        </div>
      </div>
    </div>
    
    <div class="storyboard-property-group">
      <sl-button id="pick-location-btn" size="small" variant="primary">
        <span class="material-icons" style="font-size: 16px; margin-right: 4px;">location_on</span>
        Pick Location In-Game
      </sl-button>
      <div style="margin-top: 8px; color: #aaa; font-size: 0.9em;">
        This will allow you to place the trigger by clicking on the map.
      </div>
    </div>
    
    <div class="storyboard-property-actions" style="margin-top: 16px; display: flex; justify-content: flex-end;">
      <sl-button id="apply-trigger-changes" variant="primary">Apply Changes</sl-button>
    </div>
  `;
            break;

          // For the selectNode method in Storyboard.js - add this case for event nodes
          case "event":
            // Define available event types
            const eventTypes = [
              { value: "offerStarter", label: "Offer Starter Monster" },
              { value: "showPartyManager", label: "Show Party Manager" },
              { value: "giveItem", label: "Give Item to Player" },
              { value: "setFlag", label: "Set Game Flag" },
              { value: "teleport", label: "Teleport Player" }
            ];

            // Set default if not set
            if (!nodeData.data.eventType) {
              nodeData.data.eventType = "offerStarter";
            }

            // Initialize params if they don't exist
            if (!nodeData.data.params) {
              nodeData.data.params = {};
            }

            // Generate event options
            eventOptionsHtml = eventTypes
              .map(
                (event) => `
    <option value="${event.value}" ${
                  nodeData.data.eventType === event.value ? "selected" : ""
                }>
      ${event.label}
    </option>
  `
              )
              .join("");

            // Generate parameter form based on event type
            paramsHtml = "";
            switch (nodeData.data.eventType) {
              case "giveItem":
                // Get item name if available
                const itemName =
                  nodeData.data.params?.itemName || "No item selected";

                paramsHtml = `
                  <div class="param-group" style="margin-top: 16px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                      <label style="color: #aaa; font-size: 0.9em;">Selected Item</label>
                      <sl-button id="select-item-btn" size="small">
                        <span class="material-icons" style="font-size: 16px; margin-right: 4px;">search</span>
                        Browse Items
                      </sl-button>
                    </div>
                    
                    ${
                      nodeData.data.params?.itemId
                        ? `
                      <div class="selected-item-preview" style="margin-bottom: 16px; border: 1px solid #444; padding: 12px; border-radius: 4px; background: #333; display: flex; align-items: center; gap: 12px;">
                        <div style="flex-shrink: 0; width: 50px; height: 50px; overflow: hidden; border-radius: 4px;">
                          <img src="${
                            this.resourceManager.resources.textures.props.get(
                              nodeData.data.params.itemId
                            )?.thumbnail || ""
                          }" 
                               style="width: 100%; height: 100%; object-fit: contain;">
                        </div>
                        <div style="flex: 1;">
                          <div style="font-weight: 500;">${itemName}</div>
                          <div style="font-size: 0.9em; color: #aaa;">ID: ${
                            nodeData.data.params.itemId
                          }</div>
                        </div>
                      </div>
                    `
                        : `
                      <div style="border: 1px dashed #666; padding: 16px; text-align: center; color: #888; margin-bottom: 16px; border-radius: 4px;">
                        No item selected yet. Click "Browse Items" to choose one.
                      </div>
                    `
                    }
                  </div>
                  
                  <div class="param-group" style="margin-top: 16px;">
                    <label style="display: block; margin-bottom: 4px; color: #aaa; font-size: 0.9em;">Quantity</label>
                    <input 
                      type="number" 
                      id="item-quantity-input" 
                      value="${nodeData.data.params?.quantity || 1}"
                      min="1"
                      style="width: 100%; padding: 8px; border: 1px solid #666; background: #333; color: white; border-radius: 4px;"
                    >
                  </div>
                  
                  <div class="param-group" style="margin-top: 16px;">
                    <label style="display: flex; align-items: center; cursor: pointer;">
                      <input 
                        type="checkbox" 
                        id="item-horizontal-input" 
                        ${nodeData.data.params?.isHorizontal ? "checked" : ""}
                        style="margin-right: 8px;"
                      >
                      <span>Place horizontally (flat on ground)</span>
                    </label>
                    <div style="margin-top: 4px; margin-left: 24px; color: #aaa; font-size: 0.9em;">
                      When checked, item will be placed flat on the ground instead of standing upright.
                    </div>
                  </div>
                `;
                break;

              case "setFlag":
                paramsHtml = `
        <div class="param-group" style="margin-top: 16px;">
          <label style="display: block; margin-bottom: 4px; color: #aaa; font-size: 0.9em;">Flag Name</label>
          <input 
            type="text" 
            id="flag-name-input" 
            value="${nodeData.data.params.flag || ""}"
            style="width: 100%; padding: 8px; border: 1px solid #666; background: #333; color: white; border-radius: 4px;"
            placeholder="Enter flag name"
          >
        </div>
        <div class="param-group" style="margin-top: 16px;">
          <label style="display: block; margin-bottom: 4px; color: #aaa; font-size: 0.9em;">Flag Value</label>
          <select 
            id="flag-value-input"
            style="width: 100%; padding: 8px; border: 1px solid #666; background: #333; color: white; border-radius: 4px;"
          >
            <option value="true" ${
              nodeData.data.params.value === true ? "selected" : ""
            }>True</option>
            <option value="false" ${
              nodeData.data.params.value === false ? "selected" : ""
            }>False</option>
          </select>
        </div>
      `;
                break;

              case "teleport":
                paramsHtml = `
        <div class="param-group" style="margin-top: 16px; display: flex; gap: 12px;">
          <div style="flex: 1;">
            <label style="display: block; margin-bottom: 4px; color: #aaa; font-size: 0.9em;">X Coordinate</label>
            <input 
              type="number" 
              id="teleport-x-input" 
              value="${nodeData.data.params.x || 0}"
              step="0.1"
              style="width: 100%; padding: 8px; border: 1px solid #666; background: #333; color: white; border-radius: 4px;"
            >
          </div>
          <div style="flex: 1;">
            <label style="display: block; margin-bottom: 4px; color: #aaa; font-size: 0.9em;">Y Coordinate</label>
            <input 
              type="number" 
              id="teleport-y-input" 
              value="${nodeData.data.params.y || 0}"
              step="0.1"
              style="width: 100%; padding: 8px; border: 1px solid #666; background: #333; color: white; border-radius: 4px;"
            >
          </div>
          <div style="flex: 1;">
            <label style="display: block; margin-bottom: 4px; color: #aaa; font-size: 0.9em;">Z Coordinate</label>
            <input 
              type="number" 
              id="teleport-z-input" 
              value="${nodeData.data.params.z || 0}"
              step="0.1"
              style="width: 100%; padding: 8px; border: 1px solid #666; background: #333; color: white; border-radius: 4px;"
            >
          </div>
        </div>
        <div style="margin-top: 12px;">
          <sl-button id="pick-teleport-location-btn" size="small">
            <span class="material-icons" style="font-size: 16px; margin-right: 4px;">location_on</span>
            Pick Location In-Game
          </sl-button>
        </div>
      `;
                break;

              // For offerStarter and showPartyManager, no additional parameters needed
              default:
                paramsHtml = `
        <div style="margin-top: 16px; padding: 12px; background: #383838; border-radius: 4px;">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span class="material-icons" style="font-size: 20px; margin-right: 8px; color: #aaa;">info</span>
            <span>No additional parameters required for this event type.</span>
          </div>
        </div>
      `;
            }

            propertiesHtml = `
    <div class="storyboard-property-group">
      <div class="storyboard-property-label">Event Type</div>
      <div class="storyboard-property-field">
        <select 
          id="event-type-select" 
          style="width: 100%; padding: 8px; border: 1px solid #666; background: #333; color: white; border-radius: 4px;"
        >
          ${eventOptionsHtml}
        </select>
      </div>
    </div>
    
    <div class="storyboard-property-group">
      <div class="storyboard-property-label">Event Parameters</div>
      <div class="storyboard-property-field event-params-container">
        ${paramsHtml}
      </div>
    </div>
    
    <div class="storyboard-property-actions" style="margin-top: 16px; display: flex; justify-content: flex-end;">
      <sl-button id="apply-event-changes" variant="primary">Apply Changes</sl-button>
    </div>
  `;
            break;

          case "combat":
            propertiesHtml = `
              <div class="storyboard-property-group">
                <div class="storyboard-property-label">Enemies</div>
                <div class="storyboard-property-field">
                  <sl-button size="small">Select Enemies</sl-button>
                </div>
                <div style="font-size:0.9em; color:#777; margin-top:8px;">
                  Selected: ${nodeData.data.enemies?.length || "None"}
                </div>
              </div>
              
              <div class="storyboard-property-group">
                <div class="storyboard-property-label">Background</div>
                <div class="storyboard-property-field">
                  <sl-button size="small">Select Background</sl-button>
                </div>
              </div>
            `;
            break;

            case 'reward':
              // Generate item list HTML
              let itemsHtml = '';
              if (nodeData.data.items && nodeData.data.items.length > 0) {
                itemsHtml = `
                  <div style="margin-top: 12px;">
                    <div style="font-weight: 500; margin-bottom: 8px;">Reward Items</div>
                    <div class="reward-items-list" style="display: flex; flex-direction: column; gap: 8px;">
                `;
                
                nodeData.data.items.forEach((item, index) => {
                  itemsHtml += `
                    <div class="reward-item" style="display: flex; align-items: center; gap: 8px; background: #333; padding: 8px; border-radius: 4px;">
                      <div style="width: 36px; height: 36px; overflow: hidden; border-radius: 4px; flex-shrink: 0;">
                        <img src="${this.resourceManager?.resources?.textures?.props?.get(item.id)?.thumbnail || ''}" style="width: 100%; height: 100%; object-fit: contain;">
                      </div>
                      <div style="flex: 1; overflow: hidden;">
                        <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</div>
                        <div style="font-size: 0.8em; color: #aaa;">Quantity: ${item.quantity}</div>
                      </div>
                      <sl-button class="remove-reward-item" size="small" variant="danger" data-index="${index}">
                        <span class="material-icons" style="font-size: 16px;">close</span>
                      </sl-button>
                    </div>
                  `;
                });
                
                itemsHtml += `
                    </div>
                  </div>
                `;
              }
              
              propertiesHtml = `
                <div class="storyboard-property-group">
                  <div class="storyboard-property-label">Experience Points</div>
                  <div class="storyboard-property-field">
                    <sl-input id="reward-exp-input" type="number" min="0" value="${nodeData.data.experience || 0}"></sl-input>
                  </div>
                </div>
                
                <div class="storyboard-property-group">
                  <div class="storyboard-property-label">Items</div>
                  <div class="storyboard-property-field">
                    ${itemsHtml}
                    <sl-button id="browse-items-btn" size="small" style="margin-top: 8px;">
                      <span class="material-icons" style="font-size: 16px; margin-right: 4px;">add</span>
                      Add Item
                    </sl-button>
                  </div>
                </div>
                
                <div class="storyboard-property-actions" style="margin-top: 16px; display: flex; justify-content: flex-end;">
                  <sl-button id="apply-reward-changes" variant="primary">Apply Changes</sl-button>
                </div>
              `;
              break;

          case "condition":
            // Define available condition types
            const conditionTypes = [
              { value: "hasMonster", label: "Has Monster" },
              { value: "hasItem", label: "Has Item" },
              { value: "hasFlag", label: "Has Game Flag" },
              { value: "monsterLevel", label: "Monster Level Check" }
              // Removed playerLevel as you suggested
            ];

            // Set default if not set
            if (!nodeData.data.condition) {
              nodeData.data.condition = "hasFlag";
            }

            // Initialize params if they don't exist
            if (!nodeData.data.params) {
              nodeData.data.params = {};
            }

            // Generate condition options
            conditionOptionsHtml = conditionTypes
              .map(
                (cond) => `
                <option value="${cond.value}" ${
                  nodeData.data.condition === cond.value ? "selected" : ""
                }>
                  ${cond.label}
                </option>
              `
              )
              .join("");

            // Generate parameter form based on condition type
            paramsHtml = "";
            switch (nodeData.data.condition) {
              case "hasMonster":
                paramsHtml = `
                    <div class="param-group" style="margin-top: 16px;">
                      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                        <label style="color: #aaa; font-size: 0.9em;">Selected Monster</label>
                        <sl-button id="select-monster-btn" size="small">
                          <span class="material-icons" style="font-size: 16px; margin-right: 4px;">search</span>
                          Browse Monsters
                        </sl-button>
                      </div>
                      
                      ${
                        nodeData.data.params?.monsterId
                          ? `
                        <div class="selected-monster-preview" style="margin-bottom: 16px; border: 1px solid #444; padding: 12px; border-radius: 4px; background: #333; display: flex; align-items: center; gap: 12px;">
                          <div style="flex-shrink: 0; width: 50px; height: 50px; overflow: hidden; border-radius: 4px;">
                            <img src="${
                              this.resourceManager.resources.bestiary.get(
                                nodeData.data.params.monsterId
                              )?.thumbnail || ""
                            }" 
                                 style="width: 100%; height: 100%; object-fit: contain;">
                          </div>
                          <div style="flex: 1;">
                            <div style="font-weight: 500;">${
                              nodeData.data.params.monsterName ||
                              "Unknown Monster"
                            }</div>
                            <div style="font-size: 0.9em; color: #aaa;">ID: ${
                              nodeData.data.params.monsterId
                            }</div>
                          </div>
                        </div>
                      `
                          : `
                        <div style="border: 1px dashed #666; padding: 16px; text-align: center; color: #888; margin-bottom: 16px; border-radius: 4px;">
                          No monster selected yet. Click "Browse Monsters" to choose one.
                        </div>
                      `
                      }
                    </div>
                  `;
                break;

              case "hasItem":
                paramsHtml = `
                    <div class="param-group" style="margin-top: 16px;">
                      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                        <label style="color: #aaa; font-size: 0.9em;">Selected Item</label>
                        <sl-button id="select-item-btn" size="small">
                          <span class="material-icons" style="font-size: 16px; margin-right: 4px;">search</span>
                          Browse Items
                        </sl-button>
                      </div>
                      
                      ${
                        nodeData.data.params?.itemId
                          ? `
                        <div class="selected-item-preview" style="margin-bottom: 16px; border: 1px solid #444; padding: 12px; border-radius: 4px; background: #333; display: flex; align-items: center; gap: 12px;">
                          <div style="flex-shrink: 0; width: 50px; height: 50px; overflow: hidden; border-radius: 4px;">
                            <img src="${
                              this.resourceManager.resources.textures.props.get(
                                nodeData.data.params.itemId
                              )?.thumbnail || ""
                            }" 
                                 style="width: 100%; height: 100%; object-fit: contain;">
                          </div>
                          <div style="flex: 1;">
                            <div style="font-weight: 500;">${
                              nodeData.data.params.itemName || "Unknown Item"
                            }</div>
                            <div style="font-size: 0.9em; color: #aaa;">ID: ${
                              nodeData.data.params.itemId
                            }</div>
                          </div>
                        </div>
                      `
                          : `
                        <div style="border: 1px dashed #666; padding: 16px; text-align: center; color: #888; margin-bottom: 16px; border-radius: 4px;">
                          No item selected yet. Click "Browse Items" to choose one.
                        </div>
                      `
                      }
                      
                      <div style="margin-top: 12px;">
                        <label style="display: block; margin-bottom: 4px; color: #aaa; font-size: 0.9em;">Minimum Quantity</label>
                        <input 
                          type="number" 
                          id="item-quantity-input" 
                          value="${nodeData.data.params?.quantity || 1}"
                          min="1"
                          style="width: 100%; padding: 8px; border: 1px solid #666; background: #333; color: white; border-radius: 4px;"
                        >
                      </div>
                    </div>
                  `;
                break;

              case "hasFlag":
                paramsHtml = `
                    <div class="param-group" style="margin-top: 16px;">
                      <label style="display: block; margin-bottom: 4px; color: #aaa; font-size: 0.9em;">Flag Name</label>
                      <input 
                        type="text" 
                        id="flag-name-input" 
                        value="${nodeData.data.params?.flag || ""}"
                        style="width: 100%; padding: 8px; border: 1px solid #666; background: #333; color: white; border-radius: 4px;"
                        placeholder="Enter flag name"
                      >
                    </div>
                    <div class="param-group" style="margin-top: 16px;">
                      <label style="display: block; margin-bottom: 4px; color: #aaa; font-size: 0.9em;">Required Value</label>
                      <select 
                        id="flag-value-input"
                        style="width: 100%; padding: 8px; border: 1px solid #666; background: #333; color: white; border-radius: 4px;"
                      >
                        <option value="true" ${
                          nodeData.data.params?.value === true ? "selected" : ""
                        }>True</option>
                        <option value="false" ${
                          nodeData.data.params?.value === false
                            ? "selected"
                            : ""
                        }>False</option>
                      </select>
                    </div>
                  `;
                break;

              case "monsterLevel":
                paramsHtml = `
                    <div class="param-group" style="margin-top: 16px;">
                      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                        <label style="color: #aaa; font-size: 0.9em;">Selected Monster</label>
                        <sl-button id="select-monster-btn" size="small">
                          <span class="material-icons" style="font-size: 16px; margin-right: 4px;">search</span>
                          Browse Monsters
                        </sl-button>
                      </div>
                      
                      ${
                        nodeData.data.params?.monsterId
                          ? `
                        <div class="selected-monster-preview" style="margin-bottom: 16px; border: 1px solid #444; padding: 12px; border-radius: 4px; background: #333; display: flex; align-items: center; gap: 12px;">
                          <div style="flex-shrink: 0; width: 50px; height: 50px; overflow: hidden; border-radius: 4px;">
                            <img src="${
                              this.resourceManager.resources.bestiary.get(
                                nodeData.data.params.monsterId
                              )?.thumbnail || ""
                            }" 
                                 style="width: 100%; height: 100%; object-fit: contain;">
                          </div>
                          <div style="flex: 1;">
                            <div style="font-weight: 500;">${
                              nodeData.data.params.monsterName ||
                              "Unknown Monster"
                            }</div>
                            <div style="font-size: 0.9em; color: #aaa;">ID: ${
                              nodeData.data.params.monsterId
                            }</div>
                          </div>
                        </div>
                      `
                          : `
                        <div style="border: 1px dashed #666; padding: 16px; text-align: center; color: #888; margin-bottom: 16px; border-radius: 4px;">
                          No monster selected yet. Click "Browse Monsters" to choose one.
                        </div>
                      `
                      }
                      
                      <div style="margin-top: 12px;">
                        <label style="display: block; margin-bottom: 4px; color: #aaa; font-size: 0.9em;">Minimum Level</label>
                        <input 
                          type="number" 
                          id="monster-level-input" 
                          value="${nodeData.data.params?.level || 1}"
                          min="1"
                          style="width: 100%; padding: 8px; border: 1px solid #666; background: #333; color: white; border-radius: 4px;"
                        >
                      </div>
                    </div>
                  `;
                break;
            }

            propertiesHtml = `
                <div class="storyboard-property-group">
                  <div class="storyboard-property-label">Condition Type</div>
                  <div class="storyboard-property-field">
                    <select 
                      id="condition-type-select" 
                      style="width: 100%; padding: 8px; border: 1px solid #666; background: #333; color: white; border-radius: 4px;"
                    >
                      ${conditionOptionsHtml}
                    </select>
                  </div>
                </div>
                
                <div class="storyboard-property-group">
                  <div class="storyboard-property-label">Condition Parameters</div>
                  <div class="storyboard-property-field condition-params-container">
                    ${paramsHtml}
                  </div>
                </div>
                
                <div class="storyboard-property-group">
                  <div style="background: #383838; padding: 12px; border-radius: 4px;">
                    <div style="display: flex; align-items: flex-start; margin-bottom: 8px;">
                      <span class="material-icons" style="font-size: 20px; margin-right: 8px; color: #aaa; margin-top: 2px;">info</span>
                      <span>Connect the output of this condition node to two different nodes. The first connection is followed if the condition is true, the second if the condition is false.</span>
                    </div>
                  </div>
                </div>
                
                <div class="storyboard-property-actions" style="margin-top: 16px; display: flex; justify-content: flex-end;">
                  <sl-button id="apply-condition-changes" variant="primary">Apply Changes</sl-button>
                </div>
              `;
            break;

          default:
            propertiesHtml = `
                <div class="storyboard-property-group">
                  <p>Properties for ${nodeData.type} node</p>
                </div>
              `;
        }

        properties.innerHTML = `
        <div class="storyboard-properties-content" data-node-id="${nodeId}">
          <h3 style="margin-top:0;">${
            nodeData.type.charAt(0).toUpperCase() + nodeData.type.slice(1)
          } Node</h3>
          ${propertiesHtml}
        </div>
      `;

        // Add a small delay to ensure custom elements are upgraded
        setTimeout(() => {
          this.setupNodePropertyHandlers(nodeData, nodeId, properties);
        }, 50);
      }
    }

    /**
     * New method to set up property handlers for different node types
     */
    setupNodePropertyHandlers(nodeData, nodeId, properties) {
      if (!properties || !nodeData) return;

      // Handle dialog node properties
      if (nodeData.type === "dialog") {
        // Set up character counter
        const textArea = properties.querySelector("#dialog-text-area");
        const charCount = properties.querySelector(".char-count");

        if (textArea && charCount) {
          // Update initial count
          charCount.textContent = textArea.value.length;

          // Update count on input
          textArea.addEventListener("input", () => {
            charCount.textContent = textArea.value.length;
          });
        }

        // Apply button handler
        const applyBtn = properties.querySelector("#apply-dialog-changes");
        if (applyBtn) {
          applyBtn.addEventListener("click", () => {
            try {
              // Get current values from inputs
              const titleInput = properties.querySelector(
                "#dialog-title-input"
              );
              const textArea = properties.querySelector("#dialog-text-area");

              // Safer value retrieval
              const title = titleInput?.value?.trim() || "";
              const text = textArea?.value?.trim() || "";

              // Update node data
              nodeData.data.title = title;
              nodeData.data.text = text;

              // Mark as dirty
              this.currentGraph.dirty = true;

              // Update visual representation
              this.updateNodeVisual(nodeData);

              // Visual feedback
              if (textArea) textArea.style.borderColor = "#22c55e"; // Success green

              setTimeout(() => {
                if (textArea) textArea.style.borderColor = "#6200ee"; // Return to purple
              }, 1000);

              // Show confirmation
              this.showToast("Node updated", "success");
            } catch (error) {
              console.error("Error updating node data:", error);
              this.showToast("Error updating node", "error");
            }
          });
        }

        const selectImageBtn = properties.querySelector("#select-image-btn");
        if (selectImageBtn) {
          selectImageBtn.addEventListener("click", () => {
            // Use the unified resource selector
            this.showResourceSelector(
              nodeData,
              "splashArt",
              "title",
              (resourceId, resource) => {
                // Update node data with selected image
                nodeData.data.image = {
                  id: resourceId,
                  category: "title"
                };

                // Mark as dirty
                this.currentGraph.dirty = true;

                // Update visual representation
                this.updateNodeVisual(nodeData);

                // Refresh properties panel
                this.selectNode(nodeData.element);

                // Show confirmation
                this.showToast(`Image "${resource.name}" selected`, "success");
              }
            );
          });
        }

        // Handle remove image button if it exists
        const removeImageBtn = properties.querySelector(".remove-image-btn");
        if (removeImageBtn) {
          removeImageBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Remove image reference
            nodeData.data.image = null;

            // Mark as dirty
            this.currentGraph.dirty = true;

            // Refresh properties panel
            this.selectNode(nodeData.element);
          });
        }
      }

      if (nodeData.type === "choice") {
        // Apply button handler
        const applyBtn = properties.querySelector("#apply-choice-changes");
        if (applyBtn) {
          applyBtn.addEventListener("click", () => {
            try {
              // Get main question text
              const textArea = properties.querySelector("#choice-text-area");
              const text = textArea?.value?.trim() || "";

              // Get all option texts
              const optionTextareas =
                properties.querySelectorAll(".option-text");
              const options = [];

              optionTextareas.forEach((textarea) => {
                const index = parseInt(textarea.getAttribute("data-index"));
                const text = textarea.value.trim();

                // Preserve existing targetId if available
                const existingOption = nodeData.data.options[index];
                const targetId = existingOption
                  ? existingOption.targetId
                  : null;

                options.push({ text, targetId });
              });

              // Update node data
              nodeData.data.text = text;
              nodeData.data.options = options;

              // Mark as dirty
              this.currentGraph.dirty = true;

              // Regenerate the node HTML to update ports
              if (nodeData.element) {
                const title =
                  nodeData.data.title ||
                  nodeData.type.charAt(0).toUpperCase() +
                    nodeData.type.slice(1);
                const body = `
                  <div>${text || ""}</div>
                  <div style="color:#777;font-size:0.9em;">${
                    options.length || 0
                  } options</div>
                `;

                nodeData.element.innerHTML = this.generateNodeHTML(
                  nodeData.type,
                  title,
                  body,
                  nodeData
                );

                // Reset event handlers
                const closeBtn = nodeData.element.querySelector(
                  ".storyboard-node-close"
                );
                if (closeBtn) {
                  closeBtn.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.deleteNode(nodeData.element);
                  });
                }
              }

              // Update visual representation
              this.updateNodeVisual(nodeData);

              // Update connections
              this.updateConnections();

              // Show confirmation
              this.showToast("Choice options updated", "success");
            } catch (error) {
              console.error("Error updating choice node:", error);
              this.showToast("Error updating choice node", "error");
            }
          });
        }

        // Add option button
        const addOptionBtn = properties.querySelector("#add-option-btn");
        if (addOptionBtn) {
          addOptionBtn.addEventListener("click", () => {
            // Add new option to data
            nodeData.data.options.push({ text: "New option", targetId: null });

            // Refresh properties panel to show new option
            this.selectNode(nodeData.element);

            // Show confirmation
            this.showToast("Option added", "success");
          });
        }

        // Delete option buttons
        const deleteButtons = properties.querySelectorAll(".delete-option-btn");
        deleteButtons.forEach((button) => {
          button.addEventListener("click", () => {
            const index = parseInt(button.getAttribute("data-index"));

            // Need at least one option
            if (nodeData.data.options.length <= 1) {
              this.showToast("Cannot delete last option", "error");
              return;
            }

            // Remove the option
            nodeData.data.options.splice(index, 1);

            // Refresh properties panel
            this.selectNode(nodeData.element);

            // Show confirmation
            this.showToast("Option deleted", "success");
          });
        });
      }

      // In setupNodePropertyHandlers method, add this for trigger nodes
      if (nodeData.type === "trigger") {
        // Set up radius range slider
        const radiusInput = properties.querySelector("#trigger-radius-input");
        const radiusValue = properties.querySelector("#radius-value");

        if (radiusInput && radiusValue) {
          // Update value display when slider changes
          radiusInput.addEventListener("input", () => {
            radiusValue.textContent = radiusInput.value;
          });
        }

        // Apply button handler
        const applyBtn = properties.querySelector("#apply-trigger-changes");
        if (applyBtn) {
          applyBtn.addEventListener("click", () => {
            try {
              // Get values from inputs
              const xInput = properties.querySelector("#trigger-x-input");
              const yInput = properties.querySelector("#trigger-y-input");
              const radiusInput = properties.querySelector(
                "#trigger-radius-input"
              );
              const onceInput = properties.querySelector("#trigger-once-input");

              // Parse values (with validation)
              const x = parseFloat(xInput.value) || 0;
              const y = parseFloat(yInput.value) || 0;
              const radius = parseFloat(radiusInput.value) || 1;
              const once = onceInput.checked;

              // Update node data
              nodeData.data.x = x;
              nodeData.data.y = y;
              nodeData.data.radius = radius;
              nodeData.data.once = once;

              // Mark as dirty
              this.currentGraph.dirty = true;

              // Update visual representation
              this.updateNodeVisual(nodeData);

              // Show confirmation
              this.showToast("Trigger updated", "success");
            } catch (error) {
              console.error("Error updating trigger node:", error);
              this.showToast("Error updating trigger node", "error");
            }
          });
        }

        // Pick location button
        const pickLocationBtn = properties.querySelector("#pick-location-btn");
        if (pickLocationBtn) {
          pickLocationBtn.addEventListener("click", () => {
            // If we have a 3D scene, enable location picking mode
            if (this.scene3D) {
              this.showToast("Location picking mode enabled", "info");

              // Close the editor drawer temporarily
              if (this.editor) {
                this.editor.hide();
              }

              // Here you'd connect to your scene's click handler
              // For now, we'll just show a toast with instructions
              this.showToast(
                "Click on the map to place trigger (not implemented yet)",
                "info",
                5000
              );

              // In a real implementation, you'd have code like:
              /*
              this.scene3D.enablePickingMode((position) => {
                // Update node data with picked position
                nodeData.data.x = position.x;
                nodeData.data.y = position.z; // Assuming Y is up in your world
                
                // Re-open editor and refresh
                this.openEditor();
                this.selectNode(nodeData.element);
                
                this.showToast('Location set', 'success');
              });
              */
            } else {
              this.showToast("3D scene not available for picking", "error");
            }
          });
        }
      }

      // In setupNodePropertyHandlers method, add this for event nodes
      if (nodeData.type === "event") {
        // Event type change handler
        const eventTypeSelect = properties.querySelector("#event-type-select");
        if (eventTypeSelect) {
          eventTypeSelect.addEventListener("change", () => {
            // Update event type
            nodeData.data.eventType = eventTypeSelect.value;

            // Reset parameters for new event type
            nodeData.data.params = {};

            // Refresh panel to show appropriate parameters
            this.selectNode(nodeData.element);
          });
        }

        // Apply button handler
        const applyBtn = properties.querySelector("#apply-event-changes");
        if (applyBtn) {
          applyBtn.addEventListener("click", () => {
            try {
              // Get event type value
              const eventType = eventTypeSelect
                ? eventTypeSelect.value
                : nodeData.data.eventType;

              // Get parameters based on event type
              const params = {};

              switch (eventType) {
                case "giveItem":
                  const selectItemBtn =
                    properties.querySelector("#select-item-btn");
                  if (selectItemBtn) {
                    selectItemBtn.addEventListener("click", () => {
                      this.showPropsSelector(nodeData);
                    });
                  }

                  // Make sure we capture the horizontal flag for our item
                  const applyBtn = properties.querySelector(
                    "#apply-event-changes"
                  );
                  if (applyBtn) {
                    // We'll enhance the existing apply handler by adding the horizontal flag
                    applyBtn.addEventListener("click", () => {
                      // Make sure we save the current horizontal flag state when updating
                      if (nodeData.data.eventType === "giveItem") {
                        const horizontalCheckbox = properties.querySelector(
                          "#item-horizontal-input"
                        );
                        if (horizontalCheckbox && nodeData.data.params) {
                          nodeData.data.params.isHorizontal =
                            horizontalCheckbox.checked;
                        }
                      }
                    });
                  }
                  break;

                case "setFlag":
                  const flagNameInput =
                    properties.querySelector("#flag-name-input");
                  const flagValueInput =
                    properties.querySelector("#flag-value-input");

                  params.flag = flagNameInput ? flagNameInput.value.trim() : "";
                  params.value = flagValueInput
                    ? flagValueInput.value === "true"
                    : true;
                  break;

                case "teleport":
                  const xInput = properties.querySelector("#teleport-x-input");
                  const yInput = properties.querySelector("#teleport-y-input");
                  const zInput = properties.querySelector("#teleport-z-input");

                  params.x = xInput ? parseFloat(xInput.value) || 0 : 0;
                  params.y = yInput ? parseFloat(yInput.value) || 0 : 0;
                  params.z = zInput ? parseFloat(zInput.value) || 0 : 0;
                  break;
              }

              // Update node data
              nodeData.data.eventType = eventType;
              nodeData.data.params = params;

              // Mark as dirty
              this.currentGraph.dirty = true;

              // Update visual representation
              this.updateNodeVisual(nodeData);

              // Show confirmation
              this.showToast("Event updated", "success");
            } catch (error) {
              console.error("Error updating event node:", error);
              this.showToast("Error updating event node", "error");
            }
          });
        }

        // Special event type specific handlers
        switch (nodeData.data.eventType) {
          case "teleport":
            const pickLocationBtn = properties.querySelector(
              "#pick-teleport-location-btn"
            );
            if (pickLocationBtn) {
              pickLocationBtn.addEventListener("click", () => {
                this.showToast("Location picking not implemented yet", "info");
                // Similar to trigger location picking
              });
            }
            break;

          case "giveItem":
            const selectItemBtn = properties.querySelector("#select-item-btn");
            if (selectItemBtn) {
              selectItemBtn.addEventListener("click", () => {
                this.showResourceSelector(
                  nodeData,
                  "textures",
                  "props",
                  (resourceId, resource) => {
                    // Update node data with selected item
                    if (!nodeData.data.params) {
                      nodeData.data.params = {};
                    }

                    nodeData.data.params.itemId = resourceId;
                    nodeData.data.params.itemName = resource.name;
                    nodeData.data.params.y = 0; // Set default y to 0 for ground placement
                    nodeData.data.params.isHorizontal = true; // Default to horizontal orientation

                    // Mark as dirty
                    this.currentGraph.dirty = true;

                    // Refresh properties panel
                    this.selectNode(nodeData.element);

                    // Show confirmation
                    this.showToast(
                      `Item "${resource.name}" selected`,
                      "success"
                    );
                  }
                );
              });
            }
            break;
        }
      }


      if (nodeData.type === "condition") {
        // Condition type change handler
        const conditionTypeSelect = properties.querySelector(
          "#condition-type-select"
        );
        if (conditionTypeSelect) {
          conditionTypeSelect.addEventListener("change", () => {
            // Update condition type
            nodeData.data.condition = conditionTypeSelect.value;

            // Reset parameters for new condition type
            nodeData.data.params = {};

            // Refresh panel to show appropriate parameters
            this.selectNode(nodeData.element);
          });
        }

        // Apply button handler
        const applyBtn = properties.querySelector("#apply-condition-changes");
        if (applyBtn) {
          applyBtn.addEventListener("click", () => {
            try {
              // Get condition type value
              const condition = conditionTypeSelect
                ? conditionTypeSelect.value
                : nodeData.data.condition;

              // Get parameters based on condition type
              const params = {};

              switch (condition) {
                case "hasMonster":
                  // Keep existing monster data
                  if (nodeData.data.params?.monsterId) {
                    params.monsterId = nodeData.data.params.monsterId;
                    params.monsterName = nodeData.data.params.monsterName;
                  }
                  break;

                case "hasItem":
                  // Keep existing item data, update quantity
                  if (nodeData.data.params?.itemId) {
                    params.itemId = nodeData.data.params.itemId;
                    params.itemName = nodeData.data.params.itemName;
                  }

                  const quantityInput = properties.querySelector(
                    "#item-quantity-input"
                  );
                  params.quantity = quantityInput
                    ? parseInt(quantityInput.value) || 1
                    : 1;
                  break;

                case "hasFlag":
                  const flagNameInput =
                    properties.querySelector("#flag-name-input");
                  const flagValueInput =
                    properties.querySelector("#flag-value-input");

                  params.flag = flagNameInput ? flagNameInput.value.trim() : "";
                  params.value = flagValueInput
                    ? flagValueInput.value === "true"
                    : true;
                  break;

                case "monsterLevel":
                  // Keep existing monster data, update level
                  if (nodeData.data.params?.monsterId) {
                    params.monsterId = nodeData.data.params.monsterId;
                    params.monsterName = nodeData.data.params.monsterName;
                  }

                  const levelInput = properties.querySelector(
                    "#monster-level-input"
                  );
                  params.level = levelInput
                    ? parseInt(levelInput.value) || 1
                    : 1;
                  break;

                case "playerLevel":
                  // Note: This will be replaced later with something more fitting
                  const playerLevelInput = properties.querySelector(
                    "#player-level-input"
                  );
                  params.level = playerLevelInput
                    ? parseInt(playerLevelInput.value) || 1
                    : 1;
                  break;
              }

              // Update node data
              nodeData.data.condition = condition;
              nodeData.data.params = params;

              // Mark as dirty
              this.currentGraph.dirty = true;

              // Update visual representation
              this.updateNodeVisual(nodeData);

              // Show confirmation
              this.showToast("Condition updated", "success");
            } catch (error) {
              console.error("Error updating condition node:", error);
              this.showToast("Error updating condition node", "error");
            }
          });
        }

        // Resource selection handlers based on condition type
        switch (nodeData.data.condition) {
          case "hasMonster":
          case "monsterLevel":
            const selectMonsterBtn = properties.querySelector(
              "#select-monster-btn"
            );
            if (selectMonsterBtn) {
              selectMonsterBtn.addEventListener("click", () => {
                this.showResourceSelector(
                  nodeData,
                  "bestiary",
                  "",
                  (monsterId, monster) => {
                    // Update node data with selected monster
                    if (!nodeData.data.params) {
                      nodeData.data.params = {};
                    }

                    nodeData.data.params.monsterId = monsterId;
                    nodeData.data.params.monsterName = monster.name;

                    // Mark as dirty
                    this.currentGraph.dirty = true;

                    // Refresh properties panel
                    this.selectNode(nodeData.element);

                    // Show confirmation
                    this.showToast(
                      `Monster "${monster.name}" selected`,
                      "success"
                    );
                  }
                );
              });
            }
            break;

          case "hasItem":
            const selectItemBtn = properties.querySelector("#select-item-btn");
            if (selectItemBtn) {
              selectItemBtn.addEventListener("click", () => {
                this.showResourceSelector(
                  nodeData,
                  "textures",
                  "props",
                  (itemId, item) => {
                    // Update node data with selected item
                    if (!nodeData.data.params) {
                      nodeData.data.params = {};
                    }

                    nodeData.data.params.itemId = itemId;
                    nodeData.data.params.itemName = item.name;

                    // Mark as dirty
                    this.currentGraph.dirty = true;

                    // Refresh properties panel
                    this.selectNode(nodeData.element);

                    // Show confirmation
                    this.showToast(`Item "${item.name}" selected`, "success");
                  }
                );
              });
            }
            break;
        }
      }

      // In setupNodePropertyHandlers, add case for reward node:
if (nodeData.type === 'reward') {
  // Apply button handler
  const applyBtn = properties.querySelector('#apply-reward-changes');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      try {
        // Get experience value
        const expInput = properties.querySelector('#reward-exp-input');
        const experience = expInput ? parseInt(expInput.value) || 0 : 0;
        
        // Update node data 
        nodeData.data.experience = experience;
        
        // Mark as dirty
        this.currentGraph.dirty = true;
        
        // Update visual representation
        this.updateNodeVisual(nodeData);
        
        // Show confirmation
        this.showToast('Reward updated', 'success');
      } catch (error) {
        console.error('Error updating reward node:', error);
        this.showToast('Error updating reward', 'error');
      }
    });
  }
  
  // Browse items button
  const browseItemsBtn = properties.querySelector('#browse-items-btn');
  if (browseItemsBtn) {
    browseItemsBtn.addEventListener('click', () => {
      this.showResourceSelector(nodeData, 'textures', 'props', (itemId, item) => {
        // Add item to rewards list
        if (!nodeData.data.items) {
          nodeData.data.items = [];
        }
        
        nodeData.data.items.push({
          id: itemId,
          name: item.name,
          quantity: 1
        });
        
        // Mark as dirty
        this.currentGraph.dirty = true;
        
        // Refresh properties panel
        this.selectNode(nodeData.element);
        
        // Show confirmation
        this.showToast(`Item "${item.name}" added to rewards`, 'success');
      });
    });
  }
  
  // Remove item buttons
  const removeItemBtns = properties.querySelectorAll('.remove-reward-item');
  removeItemBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.getAttribute('data-index'));
      
      // Remove item from list
      nodeData.data.items.splice(index, 1);
      
      // Mark as dirty
      this.currentGraph.dirty = true;
      
      // Refresh properties panel
      this.selectNode(nodeData.element);
      
      // Show confirmation
      this.showToast('Item removed from rewards', 'success');
    });
  });
}





      // Add handlers for other node types as needed...
    }

    /**
     * method to update a node's visual appearance based on its data
     */
    updateNodeVisual(nodeData) {
      if (!nodeData || !nodeData.element) return;

      const element = nodeData.element;

      // Update title in header
      const header = element.querySelector(".storyboard-node-header");


      if (header) {
        // Instead of trying to update a text node, replace the entire header content
        const nodeType = nodeData.type;
        const title = nodeData.data.title || nodeData.type.charAt(0).toUpperCase() + nodeData.type.slice(1);
        
        // Get the appropriate icon for this node type
        const iconMap = {
          "dialog": "chat",
          "choice": "check_circle",
          "trigger": "flash_on",
          "event": "event",
          "condition": "rule",
          "combat": "sports_martial_arts",
          "reward": "card_giftcard"
        };
        
        const iconName = iconMap[nodeType] || "help";
        
        // Update the header content (preserving the close button)
        const closeButton = header.querySelector('.storyboard-node-close');
        header.innerHTML = `<i class="material-icons">${iconName}</i> ${title}`;
        
        // Re-append the close button
        if (closeButton) {
          header.appendChild(closeButton);
          
          // Reattach event listener to close button
          closeButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.deleteNode(element);
          });
        }
      }

      const body = element.querySelector(".storyboard-node-body");
      if (body) {
        // Declare variables once at the top level
        let description = "";
        let eventTypeName = "";
        let conditionName = "";
        let itemName = "";
        let quantity = 0;
        let orientation = "";
        let x, y, z;

        switch (nodeData.type) {
          case "dialog":
            body.innerHTML = `<div>${nodeData.data.text || ""}</div>`;
            if (nodeData.data.image) {
              body.innerHTML += `
              <div style="margin-top: 4px; font-size: 0.8em; color: #888;">
                <span class="material-icons" style="font-size: 14px; vertical-align: middle;">image</span>
                Image attached
              </div>
            `;
            }
            break;


case 'choice':
  // Get the options to show in the description
  const optionTexts = nodeData.data.options?.map(opt => opt.text) || [];
  const limitedOptions = optionTexts.slice(0, 3); // Show first 3 options
  
  body.innerHTML = `
    <div>${nodeData.data.text || 'What would you like to do?'}</div>
    <div style="margin-top: 4px; color: #aaa; font-size: 0.9em;">
      ${nodeData.data.options?.length || 0} options
    </div>
    ${limitedOptions.length > 0 ? `
      <div style="margin-top: 6px; font-size: 0.8em;">
        ${limitedOptions.map((text, i) => {
          const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#607D8B'];
          const color = colors[i % colors.length];
          return `<div style="display: flex; align-items: center; margin-top: 2px;">
            <span style="display: inline-block; width: 8px; height: 8px; background: ${color}; border-radius: 50%; margin-right: 6px;"></span>
            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">${text}</span>
          </div>`;
        }).join('')}
        ${optionTexts.length > 3 ? `<div style="margin-top: 2px; color: #777;">+${optionTexts.length - 3} more...</div>` : ''}
      </div>
    ` : ''}
  `;
  break;

          // In the updateNodeVisual method, update the case for event nodes
          case "event":
            // Get a human-readable event type name - reuse variables from above
            eventTypeName = "";
            switch (nodeData.data.eventType) {
              case "offerStarter":
                eventTypeName = "Offer Starter Monster";
                break;
              case "showPartyManager":
                eventTypeName = "Show Party Manager";
                break;
              case "giveItem":
                eventTypeName = "Give Item";
                break;
              case "setFlag":
                eventTypeName = "Set Flag";
                break;
              case "teleport":
                eventTypeName = "Teleport Player";
                break;
              default:
                eventTypeName = nodeData.data.eventType || "Unknown";
            }

            // Build description based on event type - reuse variables from above
            description = "";
            switch (nodeData.data.eventType) {
              case "giveItem":
                itemName =
                  nodeData.data.params?.itemName ||
                  nodeData.data.params?.itemId ||
                  "Not set";
                quantity = nodeData.data.params?.quantity || 1;
                orientation = nodeData.data.params?.isHorizontal
                  ? "Horizontal"
                  : "Vertical";
                description = `Item: ${itemName}, Qty: ${quantity}, ${orientation}`;
                break;
              case "setFlag":
                description = `Flag: ${
                  nodeData.data.params?.flag || "Not set"
                } = ${nodeData.data.params?.value ? "True" : "False"}`;
                break;
              case "teleport":
                x = nodeData.data.params?.x || 0;
                y = nodeData.data.params?.y || 0;
                z = nodeData.data.params?.z || 0;
                description = `Position: ${x.toFixed(1)}, ${y.toFixed(
                  1
                )}, ${z.toFixed(1)}`;
                break;
            }

            body.innerHTML = `
<div>${eventTypeName}</div>
${
  description
    ? `<div style="margin-top: 4px; font-size: 0.9em; color: #aaa;">${description}</div>`
    : ""
}
`;
            break;

          case "condition":
            // Get a human-readable condition type name
            conditionName = "";
            switch (nodeData.data.condition) {
              case "hasMonster":
                conditionName = "Has Monster";
                break;
              case "hasItem":
                conditionName = "Has Item";
                break;
              case "hasFlag":
                conditionName = "Has Flag";
                break;
              case "monsterLevel":
                conditionName = "Monster Level";
                break;
              default:
                conditionName = nodeData.data.condition || "Unknown";
            }

            // Build description based on condition type
            description = "";
            switch (nodeData.data.condition) {
              case "hasMonster":
                description = `Monster: ${
                  nodeData.data.params?.monsterName || "Not set"
                }`;
                break;
              case "hasItem":
                description = `Item: ${
                  nodeData.data.params?.itemName || "Not set"
                }, Qty: ${nodeData.data.params?.quantity || 1}`;
                break;
              case "hasFlag":
                description = `Flag: ${
                  nodeData.data.params?.flag || "Not set"
                } = ${nodeData.data.params?.value ? "True" : "False"}`;
                break;
              case "monsterLevel":
                description = `Monster: ${
                  nodeData.data.params?.monsterName || "Not set"
                }, Level: ${nodeData.data.params?.level || 1}+`;
                break;
            }

            body.innerHTML = `
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span class="material-icons" style="font-size: 18px; color: #FFC107;">help</span>
                  <span>${conditionName}</span>
                </div>
                ${
                  description
                    ? `<div style="margin-top: 4px; font-size: 0.9em; color: #aaa;">${description}</div>`
                    : ""
                }
                <div style="margin-top: 8px; font-size: 0.8em; color: #2196F3;">
                  <span style="display: inline-block; width: 10px; height: 10px; background: #2196F3; border-radius: 50%; margin-right: 6px;"></span>
                  Blue: If condition is true
                </div>
                <div style="font-size: 0.8em; color: #F44336;">
                  <span style="display: inline-block; width: 10px; height: 10px; background: #F44336; border-radius: 50%; margin-right: 6px;"></span>
                  Red: If condition is false
                </div>
              `;
            break;
          // Other node types...

case 'combat':
  body.innerHTML = `
    <div>Combat Encounter</div>
    <div style="margin-top: 4px; font-size: 0.9em; color: #aaa;">
      ${nodeData.data.enemies?.length || 0} enemies
    </div>
    <div style="margin-top: 8px; font-size: 0.8em; color: #4CAF50;">
      <span style="display: inline-block; width: 10px; height: 10px; background: #4CAF50; border-radius: 50%; margin-right: 6px;"></span>
      Green: Victory path
    </div>
    <div style="font-size: 0.8em; color: #F44336;">
      <span style="display: inline-block; width: 10px; height: 10px; background: #F44336; border-radius: 50%; margin-right: 6px;"></span>
      Red: Defeat path
    </div>
  `;
  break;

  // In updateNodeVisual method:
case 'reward':
  body.innerHTML = `
    <div>Rewards</div>
    <div style="margin-top: 4px; font-size: 0.9em; color: #aaa;">
      ${nodeData.data.items?.length || 0} items, ${nodeData.data.experience || 0} XP
    </div>
  `;
  break;

          default:
            body.innerHTML = "<div>Configure node</div>";
        }
      }
    }

    /**
     * Show a unified resource selector for various resource types
     * @param {Object} nodeData - The node data to update with selection
     * @param {string} resourceType - Main resource type: 'textures', 'sounds', 'splashArt', 'bestiary'
     * @param {string} category - Subcategory within the resource type: 'props', 'walls', 'ambient', 'title', etc.
     * @param {Function} onSelect - Callback function when item is selected (receives resourceId and resource)
     */
    showResourceSelector(nodeData, resourceType, category, onSelect) {
      if (!this.resourceManager || !nodeData) {
        console.error("ResourceManager not available for resource selection");
        this.showToast("Resource Manager not available", "error");
        return;
      }

      // Create drawer for resource selection
      const drawer = document.createElement("sl-drawer");
      drawer.label = `Select ${
        category.charAt(0).toUpperCase() + category.slice(1)
      }`;
      drawer.placement = "bottom";
      drawer.style.cssText = "--size: 70vh;";

      // Add classes for styling
      drawer.classList.add("storyboard-drawer");
      drawer.classList.add("resource-selector-drawer");

      // Add styles for this specific drawer
      const selectorStyles = document.createElement("style");
      selectorStyles.textContent = `
    .resource-selector-drawer::part(overlay) {
      left: 280px !important;
      width: calc(100% - 280px) !important;
    }
    
    .resource-selector-drawer::part(panel) {
      background: #242424;
      color: #e0e0e0;
      left: 280px !important;
      width: calc(100% - 280px) !important;
      max-width: none !important;
      margin-left: 0 !important;
      border-radius: 8px 0 0 0 !important;
    }
    
.resource-selector-drawer::part(header) {
  background: #333;
  border-bottom: 1px solid #444;
  height: 48px;
  padding: 0 16px; /* Reduce padding */
  display: flex;
  align-items: center; /* Vertically center content */
}

/* Target the title specifically */
.resource-selector-drawer::part(title) {
  font-size: 1rem; /* Slightly smaller font */
  white-space: nowrap; /* Prevent wrapping */
  overflow: hidden;
  text-overflow: ellipsis; /* Add ellipsis for long titles */
}

/* Adjust the close button */
.resource-selector-drawer::part(close-button) {
  margin-left: 8px; /* Less margin */
  padding: 8px; /* Smaller click target but still usable */
}
    
    .resource-selector-drawer::part(body) {
      padding: 0;
    }
    
    .resource-selector-drawer::part(footer) {
      background: #333;
      border-top: 1px solid #444;
    }
    
    .resource-selector-drawer .resource-item {
      cursor: pointer;
      border: 1px solid #444;
      border-radius: 8px;
      overflow: hidden;
      transition: all 0.2s ease;
      background: #333;
    }
    
    .resource-selector-drawer .resource-item:hover {
      border-color: #673ab7;
      transform: translateY(-2px);
    }
  `;
      document.head.appendChild(selectorStyles);

      // Get resources from resource manager
      let resources = [];

      if (resourceType === "textures") {
        const resourceMap = this.resourceManager.resources.textures[category];
        if (resourceMap && resourceMap.size > 0) {
          resources = Array.from(resourceMap.entries()).map(
            ([id, resource]) => ({
              id,
              name: resource.name || "Unnamed",
              thumbnail: resource.thumbnail,
              data: resource
            })
          );
        }
      } else if (resourceType === "sounds") {
        const resourceMap = this.resourceManager.resources.sounds[category];
        if (resourceMap && resourceMap.size > 0) {
          resources = Array.from(resourceMap.entries()).map(
            ([id, resource]) => ({
              id,
              name: resource.name || "Unnamed",
              duration: resource.duration || 0,
              data: resource
            })
          );
        }
      } else if (resourceType === "splashArt") {
        const resourceMap = this.resourceManager.resources.splashArt[category];
        if (resourceMap && resourceMap.size > 0) {
          resources = Array.from(resourceMap.entries()).map(
            ([id, resource]) => ({
              id,
              name: resource.name || "Unnamed",
              thumbnail: resource.thumbnail,
              data: resource
            })
          );
        }
      } else if (resourceType === "bestiary") {
        const resourceMap = this.resourceManager.resources.bestiary;
        if (resourceMap && resourceMap.size > 0) {
          resources = Array.from(resourceMap.entries()).map(
            ([id, resource]) => ({
              id,
              name: resource.name || "Unnamed",
              thumbnail: resource.thumbnail,
              cr: resource.cr,
              type: resource.type,
              data: resource
            })
          );
        }
      }

      // Customize item rendering based on resource type
      let itemRenderer;

      if (resourceType === "textures" || resourceType === "splashArt") {
        // For visual resources
        itemRenderer = (resource) => `
      <div class="resource-item" data-id="${resource.id}" style="height: 100%;">
        <div style="height: 120px; overflow: hidden;">
          <img src="${resource.thumbnail}" style="width: 100%; height: 100%; object-fit: contain;">
        </div>
        <div style="padding: 8px;">
          <div style="font-weight: 500; word-break: break-word;">${resource.name}</div>
        </div>
      </div>
    `;
      } else if (resourceType === "sounds") {
        // For sound resources
        itemRenderer = (resource) => `
      <div class="resource-item" data-id="${
        resource.id
      }" style="height: 100%; display: flex; flex-direction: column;">
        <div style="flex: 1; padding: 12px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
          <div class="material-icons" style="font-size: 32px; margin-bottom: 8px; color: #673ab7;">music_note</div>
          <div style="margin-bottom: 4px; text-align: center;">${
            resource.name
          }</div>
          <div style="font-size: 0.8em; color: #aaa;">${this.formatDuration(
            resource.duration
          )}</div>
        </div>
        <div style="padding: 8px; border-top: 1px solid #444; text-align: center;">
          <sl-button size="small" class="play-sound-btn" data-id="${
            resource.id
          }">
            <span class="material-icons" style="font-size: 16px;">play_arrow</span>
            Play
          </sl-button>
        </div>
      </div>
    `;
      } else if (resourceType === "bestiary") {
        // For bestiary resources
        itemRenderer = (resource) => `
      <div class="resource-item" data-id="${resource.id}" style="height: 100%;">
        <div style="height: 120px; overflow: hidden;">
          <img src="${
            resource.thumbnail
          }" style="width: 100%; height: 100%; object-fit: contain;">
        </div>
        <div style="padding: 8px;">
          <div style="font-weight: 500; word-break: break-word;">${
            resource.name
          }</div>
          <div style="display: flex; justify-content: space-between; font-size: 0.8em; color: #aaa; margin-top: 4px;">
            <span>CR ${resource.cr || "?"}</span>
            <span>${resource.type || "Monster"}</span>
          </div>
        </div>
      </div>
    `;
      }

      // Add drawer content
      drawer.innerHTML = `
    <div style="padding: 16px;">
      <div style="margin-bottom: 16px;">
        <sl-input placeholder="Search..." clearable id="resource-search"></sl-input>
      </div>
      
      <div class="resources-grid" style="
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 16px;
        max-height: calc(70vh - 140px);
        overflow-y: auto;
        padding-right: 8px;
      ">
        ${
          resources.length > 0
            ? resources.map((resource) => itemRenderer(resource)).join("")
            : `<div style="grid-column: 1/-1; text-align: center; padding: 24px; color: #888;">
            No ${category} available. Add some in the Resource Manager.
          </div>`
        }
      </div>
    </div>
    
    <div slot="footer" style="display: flex; justify-content: space-between; align-items: center;">
      <sl-button variant="text">Cancel</sl-button>
      <div style="color: #aaa; font-size: 0.9em;">
        ${resources.length} items available
      </div>
    </div>
  `;

      document.body.appendChild(drawer);
      drawer.show();

      // Set up search functionality
      const searchInput = drawer.querySelector("#resource-search");
      if (searchInput) {
        searchInput.addEventListener("input", (e) => {
          const searchTerm = e.target.value.toLowerCase();

          drawer.querySelectorAll(".resource-item").forEach((item) => {
            const nameElement = item.querySelector("div > div");
            if (!nameElement) return;

            const name = nameElement.textContent.toLowerCase();

            // Show/hide based on search term
            if (name.includes(searchTerm)) {
              item.style.display = "block";
            } else {
              item.style.display = "none";
            }
          });
        });
      }

      // Set up sound play buttons if needed
      if (resourceType === "sounds") {
        drawer.querySelectorAll(".play-sound-btn").forEach((button) => {
          button.addEventListener("click", (e) => {
            e.stopPropagation(); // Don't select when just playing
            const soundId = button.getAttribute("data-id");
            this.resourceManager.playSound(soundId, category);
          });
        });
      }

      // Set up item selection
      drawer.querySelectorAll(".resource-item").forEach((item) => {
        item.addEventListener("click", () => {
          const resourceId = item.getAttribute("data-id");
          let resource;

          // Get the selected resource based on resource type
          if (resourceType === "textures") {
            resource =
              this.resourceManager.resources.textures[category].get(resourceId);
          } else if (resourceType === "sounds") {
            resource =
              this.resourceManager.resources.sounds[category].get(resourceId);
          } else if (resourceType === "splashArt") {
            resource =
              this.resourceManager.resources.splashArt[category].get(
                resourceId
              );
          } else if (resourceType === "bestiary") {
            resource = this.resourceManager.resources.bestiary.get(resourceId);
          }

          if (resource) {
            // Use callback for selection if provided
            if (typeof onSelect === "function") {
              onSelect(resourceId, resource);
            }

            // Close drawer
            drawer.hide();
          }
        });
      });

      // Set up cancel button
      const cancelBtn = drawer.querySelector('sl-button[variant="text"]');
      if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
          drawer.hide();
        });
      }

      // Clean up when drawer is closed
      drawer.addEventListener("sl-after-hide", () => {
        drawer.remove();
        selectorStyles.remove();
      });
    }

    // Helper method to format sound duration
    formatDuration(seconds) {
      if (!seconds) return "0:00";

      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60)
        .toString()
        .padStart(2, "0");
      return `${mins}:${secs}`;
    }

    /**
     * Simplified toast notification method
     */
    showToast(message, type = "info", duration = 3000) {
      // Create toast element
      const toast = document.createElement("div");
      toast.className = "storyboard-toast";
      toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: ${
      type === "success" ? "#4CAF50" : type === "error" ? "#F44336" : "#2196F3"
    };
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    z-index: 10000;
    font-size: 14px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    opacity: 0;
    transition: opacity 0.3s;
  `;

      toast.textContent = message;
      document.body.appendChild(toast);

      // Animate in
      setTimeout(() => {
        toast.style.opacity = "1";
      }, 10);

      // Remove after duration
      setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 300);
      }, duration);
    }

    /**
     * Helper method to get splash art URL
     */
    getSplashArtUrl(imageData) {
      if (!imageData || !this.resourceManager) return "";

      try {
        const { id, category } = imageData;
        const art = this.resourceManager.resources.splashArt[category]?.get(id);

        return art?.thumbnail || "";
      } catch (error) {
        console.error("Error getting splash art URL:", error);
        return "";
      }
    }

    /**
     * Deselect the current node
     */
    deselectNode() {
      if (!this.isEditorAvailable()) return;

      if (this.editorState.selectedNode) {
        this.editorState.selectedNode.classList.remove("selected");
        this.editorState.selectedNode = null;
      }

      const properties = this.editorState.propertiesElement;
      if (properties) {
        properties.innerHTML = `
          <div class="story-no-selection">
            <p>Select a node to edit its properties.</p>
          </div>
        `;
      }
    }

    /**
     * Update a node's property based on input change
     */
    updateNodeProperty(nodeData, input) {
      if (!nodeData || !input) return;

      const name = input.getAttribute("name");
      let value;

      // Get value based on input type
      if (input.tagName.toLowerCase() === "sl-checkbox") {
        value = input.checked;
      } else {
        value = input.value;
      }

      // Handle special property cases
      if (name.startsWith("option_")) {
        const index = parseInt(name.split("_")[1]);
        nodeData.data.options[index].text = value;
      } else {
        // Regular property
        nodeData.data[name] = value;
      }

      // Mark as dirty
      this.currentGraph.dirty = true;

      // Update node display if element exists
      if (nodeData.element) {
        // Update body content based on node type
        const body = nodeData.element.querySelector(".storyboard-node-body");
        if (!body) return;

        if (nodeData.type === "dialog") {
          body.textContent = nodeData.data.text || "";
        } else if (nodeData.type === "choice") {
          body.innerHTML = `
            <div>${nodeData.data.text || ""}</div>
            <div style="color:#777;font-size:0.9em;">${
              nodeData.data.options?.length || 0
            } options</div>
          `;
        } else if (nodeData.type === "trigger") {
          body.textContent = `X: ${nodeData.data.x || 0}, Y: ${
            nodeData.data.y || 0
          }, Radius: ${nodeData.data.radius || 1}`;
        }
      }
    }

    /**
     * Save the current storyboard
     */
    saveStoryboard(editorState) {
      if (!this.isEditorAvailable()) {
        console.error("Editor not available in saveStoryboard");
        return;
      }

      // Convert editor state to story graph data
      const storyGraph = {
        nodes: [],
        connections: []
      };

      // Add nodes from persistent state
      editorState.nodes.forEach((nodeData, nodeId) => {
        storyGraph.nodes.push({
          id: nodeId,
          type: nodeData.type,
          position: {
            x: parseInt(nodeData.element.style.left),
            y: parseInt(nodeData.element.style.top)
          },
          data: nodeData.data
        });
      });

      // Add connections from persistent state
      editorState.connections.forEach((conn) => {
        storyGraph.connections.push({
          from: conn.from,
          to: conn.to
        });
      });

      // Create unique ID for this story
      const storyId = "story_" + Date.now();

      // Add to storyGraphs collection
      this.storyGraphs.set(storyId, storyGraph);

      // Save to localStorage for persistence
      this.saveToStorage();

      // Show confirmation
      const toast = document.createElement("sl-alert");
      toast.variant = "success";
      toast.closable = true;
      toast.duration = 3000;
      toast.innerHTML = `
        <sl-icon slot="icon" name="check-circle"></sl-icon>
        Storyboard saved successfully!
      `;

      document.body.appendChild(toast);
      toast.toast();
    }

    /**
     * Save all story graphs to localStorage
     */
    saveToStorage() {
      const storageData = {
        storyGraphs: Array.from(this.storyGraphs.entries()),
        triggeredStories: Array.from(this.triggeredStories)
      };

      try {
        localStorage.setItem("storyboardData", JSON.stringify(storageData));
        console.log("Storyboard data saved to localStorage");
      } catch (error) {
        console.error("Error saving storyboard data:", error);
      }
    }

    /**
     * Load story graphs from localStorage
     */
    loadFromStorage() {
      try {
        const storageData = localStorage.getItem("storyboardData");

        if (storageData) {
          const data = JSON.parse(storageData);

          if (data.storyGraphs) {
            this.storyGraphs = new Map(data.storyGraphs);
          }

          if (data.triggeredStories) {
            this.triggeredStories = new Set(data.triggeredStories);
          }

          console.log("Storyboard data loaded from localStorage");
        }
      } catch (error) {
        console.error("Error loading storyboard data:", error);
      }
    }

    /**
     * Check for story triggers based on player position
     */
    checkTriggers() {
      // Only check if we have the scene3D reference
      if (!this.scene3D || !this.scene3D.player) return;

      // Get player position
      const playerPosition = this.scene3D.player.position;

      // Check all story graphs for trigger nodes
      this.storyGraphs.forEach((storyGraph, storyId) => {
        // Skip if already triggered and completed
        if (this.triggeredStories.has(storyId)) return;

        // Look for trigger nodes
        const triggerNodes = storyGraph.nodes.filter(
          (node) => node.type === "trigger" && !node.triggered
        );

        // Check each trigger node
        for (const triggerNode of triggerNodes) {
          const { x, y, radius } = triggerNode.data;

          // Calculate distance (2D for now)
          const dx = playerPosition.x - x;
          const dy = playerPosition.z - y; // Using z as the ground plane
          const distance = Math.sqrt(dx * dx + dy * dy);

          // If player is within trigger radius
          if (distance <= radius) {
            console.log(`Triggered story node: ${triggerNode.id}`);

            // Mark as triggered
            triggerNode.triggered = true;

            // Execute the story flow starting from this node
            this.executeStoryNode(storyId, triggerNode.id);

            // Only trigger one node at a time
            break;
          }
        }
      });
    }

    /**
     * Execute a story node and follow the flow
     */
    executeStoryNode(storyId, nodeId) {
      const storyGraph = this.storyGraphs.get(storyId);
      if (!storyGraph) return;

      // Find the node
      const node = storyGraph.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      console.log(`Executing story node: ${node.type}`);

      // Process based on node type
      switch (node.type) {
        case "dialog":
          this.showDialog(node.data, () => {
            // Find next node
            const connection = storyGraph.connections.find(
              (c) => c.from === nodeId
            );
            if (connection) {
              this.executeStoryNode(storyId, connection.to);
            } else {
              // End of flow
              this.completeStory(storyId);
            }
          });
          break;

        case "choice":
          this.showChoice(node.data, (optionIndex) => {
            // Find the connection for this option
            const selectedOption = node.data.options[optionIndex];

            if (selectedOption && selectedOption.targetId) {
              this.executeStoryNode(storyId, selectedOption.targetId);
            } else {
              // Try to find a connection based on index
              const connections = storyGraph.connections.filter(
                (c) => c.from === nodeId
              );

              if (connections.length > optionIndex) {
                this.executeStoryNode(storyId, connections[optionIndex].to);
              } else {
                // End of flow
                this.completeStory(storyId);
              }
            }
          });
          break;

        case "event":
          this.executeEvent(node.data, () => {
            // Find next node
            const connection = storyGraph.connections.find(
              (c) => c.from === nodeId
            );
            if (connection) {
              this.executeStoryNode(storyId, connection.to);
            } else {
              // End of flow
              this.completeStory(storyId);
            }
          });
          break;

        case "combat":
          this.startCombat(node.data, (result) => {
            // Find appropriate connection based on result
            const connections = storyGraph.connections.filter(
              (c) => c.from === nodeId
            );

            if (connections.length > 0) {
              if (connections.length === 1) {
                // Just one path
                this.executeStoryNode(storyId, connections[0].to);
              } else if (connections.length >= 2) {
                // Victory or defeat paths
                const nextNodeId =
                  result === "victory" ? connections[0].to : connections[1].to;
                this.executeStoryNode(storyId, nextNodeId);
              }
            } else {
              // End of flow
              this.completeStory(storyId);
            }
          });
          break;

        case "condition":
          this.evaluateCondition(node.data, (result) => {
            // Find appropriate connection based on result
            // We need to find connections from this node that have the right path attribute
            const connections = storyGraph.connections.filter(
              (c) => c.from === nodeId
            );

            if (connections.length === 0) {
              // No connections, end of flow
              this.completeStory(storyId);
              return;
            }

            // Look for connection with matching path
            const pathToFollow = result ? "true" : "false";
            const matchingConnection = connections.find(
              (c) => c.path === pathToFollow
            );

            if (matchingConnection) {
              // Follow the matching path
              this.executeStoryNode(storyId, matchingConnection.to);
            } else if (connections.length > 0) {
              // Fallback: If we can't find a connection with exact path match, use first (true) for true result,
              // second (false) for false result
              const connectionIndex = result
                ? 0
                : Math.min(1, connections.length - 1);
              this.executeStoryNode(storyId, connections[connectionIndex].to);
            } else {
              // End of flow
              this.completeStory(storyId);
            }
          });
          break;

        default:
          console.log(`Unhandled node type: ${node.type}`);
          // Continue to next node
          const connection = storyGraph.connections.find(
            (c) => c.from === nodeId
          );
          if (connection) {
            this.executeStoryNode(storyId, connection.to);
          } else {
            // End of flow
            this.completeStory(storyId);
          }
      }
    }

    /**
     * Mark a story as completed
     */
    completeStory(storyId) {
      console.log(`Story completed: ${storyId}`);
      this.triggeredStories.add(storyId);
      this.saveToStorage();
    }

    /**
     * Show a dialog overlay with the given data
     */
    showDialog(dialogData, onClose) {
      if (this.currentOverlay) {
        this.closeOverlay();
      }

      const overlay = document.createElement("div");
      overlay.className = "story-overlay";

      let imageHtml = "";
      if (dialogData.image) {
        // Get image URL from resource manager if available
        const imageUrl = this.resourceManager
          ? this.resourceManager.getSplashArtUrl(dialogData.image)
          : dialogData.image;

        imageHtml = `
          <div class="story-image">
            <img src="${imageUrl}" alt="Story Image">
          </div>
        `;
      }

      overlay.innerHTML = `
        <div class="story-content">
          <div class="story-header">
            ${dialogData.title || "Dialog"}
          </div>
          
          <div class="story-body">
            ${imageHtml}
            <div class="story-text">${dialogData.text || ""}</div>
          </div>
          
          <div class="story-footer">
            <sl-button variant="primary" class="story-continue-btn">Continue</sl-button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      this.currentOverlay = overlay;

      // Set up continue button
      overlay
        .querySelector(".story-continue-btn")
        .addEventListener("click", () => {
          this.closeOverlay();
          if (typeof onClose === "function") {
            onClose();
          }
        });

      // Animate in
      setTimeout(() => {
        overlay.style.opacity = "1";
        overlay.querySelector(".story-content").style.transform = "scale(1)";
      }, 10);

      // If we have scene3D, pause controls
      if (this.scene3D && typeof this.scene3D.pauseControls === "function") {
        this.scene3D.pauseControls();
      }
    }

    /**
     * Show a choice dialog with options
     */
    showChoice(choiceData, onSelect) {
      if (this.currentOverlay) {
        this.closeOverlay();
      }

      const overlay = document.createElement("div");
      overlay.className = "story-overlay";

      let optionsHtml = "";
      if (choiceData.options && choiceData.options.length) {
        optionsHtml = '<div class="story-choices">';

        choiceData.options.forEach((option, index) => {
          optionsHtml += `
            <div class="story-choice" data-index="${index}">
              ${option.text}
            </div>
          `;
        });

        optionsHtml += "</div>";
      }

      overlay.innerHTML = `
        <div class="story-content">
          <div class="story-header">
            Choice
          </div>
          
          <div class="story-body">
            <div class="story-text">${choiceData.text || ""}</div>
            ${optionsHtml}
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      this.currentOverlay = overlay;

      // Set up option buttons
      const optionButtons = overlay.querySelectorAll(".story-choice");
      optionButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const index = parseInt(button.getAttribute("data-index"));
          this.closeOverlay();
          if (typeof onSelect === "function") {
            onSelect(index);
          }
        });
      });

      // Animate in
      setTimeout(() => {
        overlay.style.opacity = "1";
        overlay.querySelector(".story-content").style.transform = "scale(1)";
      }, 10);

      // If we have scene3D, pause controls
      if (this.scene3D && typeof this.scene3D.pauseControls === "function") {
        this.scene3D.pauseControls();
      }
    }

    /**
     * Execute a game event
     */
    executeEvent(eventData, onComplete) {
      console.log(`Executing game event: ${eventData.eventType}`);

      switch (eventData.eventType) {
        case "offerStarter":
          // Show starter monster selection
          if (window.partyManager) {
            window.partyManager
              .checkForStarterMonster()
              .then(() => {
                if (typeof onComplete === "function") {
                  onComplete();
                }
              })
              .catch((error) => {
                console.error("Error in starter monster selection:", error);
                if (typeof onComplete === "function") {
                  onComplete();
                }
              });
          } else {
            console.error("PartyManager not available");
            if (typeof onComplete === "function") {
              onComplete();
            }
          }
          break;

        case "showPartyManager":
          // Show party manager
          if (window.partyManager) {
            window.partyManager.showPartyManager();

            // Check when dialog closes
            const checkForDialog = setInterval(() => {
              const dialog = document.querySelector(
                'sl-dialog[label="Monster Party"]'
              );
              if (!dialog) {
                clearInterval(checkForDialog);
                if (typeof onComplete === "function") {
                  onComplete();
                }
              }
            }, 100);
          } else {
            console.error("PartyManager not available");
            if (typeof onComplete === "function") {
              onComplete();
            }
          }
          break;

        case "teleport":
          // Teleport player
          if (this.scene3D && this.scene3D.player) {
            const { x, y, z } = eventData.params || {};
            if (x !== undefined && z !== undefined) {
              // Y is height, often want to keep the player on the ground
              const targetY =
                y !== undefined ? y : this.scene3D.player.position.y;

              // Teleport
              this.scene3D.player.position.set(x, targetY, z);
              console.log(`Teleported player to: ${x}, ${targetY}, ${z}`);
            }
          }

          if (typeof onComplete === "function") {
            onComplete();
          }
          break;

        case "giveItem":
          // Give item to player
          console.log("Give item event - not implemented yet");

          if (typeof onComplete === "function") {
            onComplete();
          }
          break;

        case "setFlag":
          // Set game flag
          if (window.gameFlags) {
            const { flag, value } = eventData.params || {};
            if (flag) {
              window.gameFlags[flag] = value !== undefined ? value : true;
              console.log(`Set game flag: ${flag} = ${window.gameFlags[flag]}`);
            }
          }

          if (typeof onComplete === "function") {
            onComplete();
          }
          break;

        default:
          console.log(`Unknown event type: ${eventData.eventType}`);
          if (typeof onComplete === "function") {
            onComplete();
          }
      }
    }

    /**
     * Start a combat encounter
     */
    startCombat(combatData, onComplete) {
      if (window.combatSystem) {
        // Start combat with specified enemies
        const enemies = combatData.enemies || [];

        // Set background if specified
        if (combatData.background && window.combatSystem.setCombatBackground) {
          window.combatSystem.setBattleBackground(combatData.background);
        }

        // Initialize combat
        window.combatSystem
          .initiateCombat(enemies)
          .then((result) => {
            if (typeof onComplete === "function") {
              onComplete(result);
            }
          })
          .catch((error) => {
            console.error("Error in combat:", error);
            if (typeof onComplete === "function") {
              onComplete("defeat");
            }
          });
      } else {
        console.error("CombatSystem not available");
        if (typeof onComplete === "function") {
          onComplete("victory"); // Default to victory if combat not available
        }
      }
    }

    /**
     * Close the current overlay
     */
    closeOverlay() {
      if (this.currentOverlay) {
        // Animate out
        this.currentOverlay.style.opacity = "0";
        const content = this.currentOverlay.querySelector(".story-content");
        if (content) {
          content.style.transform = "scale(0.95)";
        }

        // Remove after animation
        setTimeout(() => {
          this.currentOverlay.remove();
          this.currentOverlay = null;

          // If we have scene3D, resume controls
          if (
            this.scene3D &&
            typeof this.scene3D.resumeControls === "function"
          ) {
            this.scene3D.resumeControls();
          }
        }, 300);
      }
    }

    /**
     * Add a position-based story trigger point (backward compatibility)
     */
    addStoryPoint(x, y, splashArtId, text) {
      const id = `story_${Date.now()}`;

      // Create simple story graph with dialog node
      const storyGraph = {
        nodes: [
          {
            id: "trigger_1",
            type: "trigger",
            position: { x: 0, y: 0 },
            data: { x, y, radius: 1, once: true }
          },
          {
            id: "dialog_1",
            type: "dialog",
            position: { x: 200, y: 0 },
            data: { text, image: splashArtId }
          }
        ],
        connections: [{ from: "trigger_1", to: "dialog_1" }]
      };

      this.storyGraphs.set(id, storyGraph);
      return id;
    }

    /**
     * Check if player is on a trigger (backward compatibility)
     */
    isPlayerOnTrigger(playerX, playerY, triggerPos) {
      // Add some tolerance for trigger area
      const tolerance = 1; // One unit tolerance
      return (
        Math.abs(playerX - triggerPos.x) <= tolerance &&
        Math.abs(playerY - triggerPos.y) <= tolerance
      );
    }

    /**
     * Get splash art URL (backward compatibility)
     */
    getSplashArtUrl(splashArtId) {
      return this.resourceManager
        ? this.resourceManager.getSplashArtUrl(splashArtId)
        : "";
    }

    /**
     * Serialize storyboard data for saving
     */
    serialize() {
      return {
        storyGraphs: Array.from(this.storyGraphs.entries()),
        triggeredStories: Array.from(this.triggeredStories)
      };
    }

    /**
     * Deserialize storyboard data from saved state
     */
    deserialize(data) {
      if (data.storyGraphs) {
        this.storyGraphs = new Map(data.storyGraphs);
      }

      if (data.triggeredStories) {
        this.triggeredStories = new Set(data.triggeredStories);
      }
    }



////// Storyboard Testing Script //////
////// Storyboard Testing Script //////
////// Storyboard Testing Script //////
////// Storyboard Testing Script //////
////// Storyboard Testing Script //////
////// Storyboard Testing Script //////


/**
 * Test the current storyboard flow
 */ // original code collapsed VV
// testStoryboard() {
//   // Save any unsaved changes first
//   if (this.currentGraph.dirty) {
//     this.saveCurrentGraph();
//   }
  
//   // Find the starting node (look for trigger nodes first, then fall back to any node)
//   let startNodeId = null;
//   let startNode = null;
  
//   // Look for trigger nodes first
//   for (const [nodeId, nodeData] of this.currentGraph.nodes) {
//     if (nodeData.type === 'trigger') {
//       startNodeId = nodeId;
//       startNode = nodeData;
//       break;
//     }
//   }
  
//   // If no trigger nodes, use the first node
//   if (!startNodeId && this.currentGraph.nodes.size > 0) {
//     const firstNode = this.currentGraph.nodes.entries().next().value;
//     startNodeId = firstNode[0];
//     startNode = firstNode[1];
//   }
  
//   if (!startNodeId) {
//     this.showToast('No nodes found in the storyboard.', 'error');
//     return;
//   }
  
//   // Start executing the story from the start node
//   this.showTestingDialog(`Starting test from: ${startNode.type} node`, () => {
//     this.executeTestNode(startNodeId);
//   });
// }

/**
 * Test the current storyboard flow with 3d support
 * @param {Object|string} storyGraphOrId - The story graph object or ID to test
 */
testStoryboard(storyGraphOrId = null) {

  if (this.editor) {
    // If we're in the editor, ensure we're not in 3D mode
    this.in3DMode = false;
    console.log("Editor detected, disabling 3D mode for testing");
  }
  
  // Save any unsaved changes first
  if (this.currentGraph.dirty) {
    this.saveCurrentGraph();
  }
  
  // Determine what story to use
  let storyGraph = null;
  
  if (typeof storyGraphOrId === 'string') {
    // Use the specified story ID
    if (this.storyGraphs.has(storyGraphOrId)) {
      storyGraph = this.storyGraphs.get(storyGraphOrId);
      console.log(`Testing story with ID: ${storyGraphOrId}`);
    } else {
      console.warn(`Story ID not found: ${storyGraphOrId}, using default`);
    }
  } else if (storyGraphOrId !== null && typeof storyGraphOrId === 'object') {
    // Use the provided story graph object
    storyGraph = storyGraphOrId;
  }
  
  // If no valid story provided, use current graph
  if (!storyGraph) {
    storyGraph = this.currentGraph;
  }
  
  // Find the starting node (look for trigger nodes first, then fall back to any node)
  let startNodeId = null;
  let startNode = null;
  
  // Look for trigger nodes first
  for (const [nodeId, nodeData] of storyGraph.nodes) {
    if (nodeData.type === 'trigger') {
      startNodeId = nodeId;
      startNode = nodeData;
      break;
    }
  }
  
  // If no trigger nodes, use the first node
  if (!startNodeId && storyGraph.nodes.size > 0) {
    const firstNode = storyGraph.nodes.entries().next().value;
    startNodeId = firstNode[0];
    startNode = firstNode[1];
  }
  
  if (!startNodeId) {
    this.showTestingDialog('No nodes found in the storyboard.', () => {});
    return;
  }
  
  // Start executing the story from the start node
  this.showTestingDialog(`Starting test from: ${startNode.type} node`, () => {
    this.executeTestNode(startNodeId);
  });
}

/**
 * Run a storyboard in 3D environment
 * @param {Object} scene3D - The Scene3DController instance
 * @param {String} storyId - ID of the story to run (optional)
 */  //  -- original code inthe collapse.
// runInScene3D(scene3D, storyId = null) {
//   console.log(`Running storyboard in 3D mode, story ID: ${storyId || 'default'}`);
  
//   // Store reference to scene3D
//   this.scene3D = scene3D;
  
//   // Get story graph to test
//   let storyGraph = null;
//   if (storyId && this.storyGraphs.has(storyId)) {
//     storyGraph = this.storyGraphs.get(storyId);
//   } else if (this.currentGraph) {
//     storyGraph = this.currentGraph;
//   } else if (this.storyGraphs.size > 0) {
//     // Fallback to first available story
//     const storyId = Array.from(this.storyGraphs.keys())[0];
//     storyGraph = this.storyGraphs.get(storyId);
//   }
  
//   if (!storyGraph) {
//     console.error('No valid story found to run');
//     return;
//   }
  
//   // Start the story flow - using existing test functionality
//   // this.startTesting(storyGraph);
//   this.testStoryboard();
// }

runInScene3D(scene3D, storyId = null) {
  console.log(`Running storyboard in 3D mode, story ID: ${storyId || 'default'}`);
  
  // Store reference to scene3D and explicitly set 3D mode flag
  this.scene3D = scene3D;
  this.in3DMode = true; // Explicitly set flag
  
  console.log("3D mode enabled for storyboard");
  
  // Start the story flow
  this.testStoryboard(storyId);
}

/**
 * Execute a node in test mode
 */
// executeTestNode(nodeId) {
//   // Get the node data
//   const nodeData = this.currentGraph.nodes.get(nodeId);
//   if (!nodeData) {
//     this.showTestingDialog('Error: Node not found', () => {});
//     return;
//   }
  
//   // Process the node based on its type
//   switch (nodeData.type) {
//     case 'dialog':
//       this.executeTestDialog(nodeData, nodeId);
//       break;
      
//     case 'choice':
//       this.executeTestChoice(nodeData, nodeId);
//       break;
      
//     case 'condition':
//       this.executeTestCondition(nodeData, nodeId);
//       break;
      
//     case 'event':
//       this.executeTestEvent(nodeData, nodeId);
//       break;
      
//     case 'combat':
//       this.executeTestCombat(nodeData, nodeId);
//       break;
      
//     case 'reward':
//       this.executeTestReward(nodeData, nodeId);
//       break;
      
//     default:
//       this.showTestingDialog(`Unsupported node type: ${nodeData.type}`, () => {
//         this.findAndExecuteNextNode(nodeId);
//       });
//   }
// }



/**
 * Execute a node in test mode
 */
executeTestNode(nodeId) {
  console.log(`Executing node: ${nodeId}`);
  
  // IMPORTANT CHECK: If we still have an active UI element, don't proceed yet
  if (this.currentDialog || this.currentOverlay) {
    console.log('Previous UI still active, waiting before executing next node');
    
    // Wait until current UI is closed before continuing
    const checkForClear = () => {
      if (this.currentDialog || this.currentOverlay) {
        // Still showing UI, check again in a bit
        setTimeout(checkForClear, 100);
      } else {
        // UI clear, now safe to proceed
        console.log('UI now clear, continuing to next node');
        this._executeNodeInternal(nodeId);
      }
    };
    
    setTimeout(checkForClear, 100);
    return;
  }
  
  // No active UI, safe to proceed immediately
  this._executeNodeInternal(nodeId);
}


/**
 * Internal method to execute a node once UI is clear
 * @private
 */
_executeNodeInternal(nodeId) {
  // Get the node data
  const nodeData = this.currentGraph.nodes.get(nodeId); // this.getNode(nodeId);
  if (!nodeData) {
    this.showTestingDialog('Error: Node not found', () => {});
    return;
  }
  
  // Process the node based on its type
  switch (nodeData.type) {
    case 'dialog':
      this.executeTestDialog(nodeData, nodeId);
      break;
      
    case 'choice':
      this.executeTestChoice(nodeData, nodeId);
      break;
      
    case 'condition':
      this.executeTestCondition(nodeData, nodeId);
      break;
      
    case 'event':
      this.executeTestEvent(nodeData, nodeId);
      break;
      
    case 'combat':
      this.executeTestCombat(nodeData, nodeId);
      break;
      
    case 'reward':
      this.executeTestReward(nodeData, nodeId);
      break;
      
    default:
      this.showTestingDialog(`Unsupported node type: ${nodeData.type}`, () => {
        this.findAndExecuteNextNode(nodeId);
      });
  }
}

/**
 * Show a simple dialog during testing
 */ // - original code in the collapse
// showTestingDialog(message, onClose) {
//   // Create dialog
//   const dialog = document.createElement('sl-dialog');
//   dialog.label = 'Story Preview';
//   dialog.style.cssText = '--width: 500px;';
  
//   // Set content
//   dialog.innerHTML = `
//     <div style="padding: 16px;">${message}</div>
//     <div slot="footer">
//       <sl-button variant="primary" class="continue-btn">Continue</sl-button>
//     </div>
//   `;
  
//   // Add to DOM
//   document.body.appendChild(dialog);
  
//   // Add continue button handler
//   const continueBtn = dialog.querySelector('.continue-btn');
//   if (continueBtn) {
//     continueBtn.addEventListener('click', () => {
//       dialog.hide();
//     });
//   }
  
//   // Add close handler
//   dialog.addEventListener('sl-after-hide', () => {
//     dialog.remove();
//     if (typeof onClose === 'function') {
//       onClose();
//     }
//   });
  
//   // Show dialog
//   dialog.show();
// }

/**
 * Show a simple dialog during testing
 */
showTestingDialog(message, onClose) {
  console.log(`Show testing dialog: ${message}`);
  console.log(`In 3D mode: ${this.in3DMode}`);
  
  // Only use immersive UI when explicitly set in 3D mode
  if (this.in3DMode) {
    console.log("Using immersive UI for testing dialog");
    return this.showImmersiveOverlay(`<div>${message}</div>`, {
      title: 'Story Preview',
      onContinue: onClose
    });
  } else {
    console.log("Using standard dialog UI for testing");
    // Use standard dialog in editor mode - keep original code
    // Create dialog
    const dialog = document.createElement('sl-dialog');
    dialog.label = 'Story Preview';
    dialog.style.cssText = '--width: 500px;';
    
    // Set content
    dialog.innerHTML = `
      <div style="padding: 16px;">${message}</div>
      <div slot="footer">
        <sl-button variant="primary" class="continue-btn">Continue</sl-button>
      </div>
    `;
    
    // Add to DOM
    document.body.appendChild(dialog);
    
    // Add continue button handler
    const continueBtn = dialog.querySelector('.continue-btn');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        dialog.hide();
      });
    }
    
    // Add close handler
    dialog.addEventListener('sl-after-hide', () => {
      dialog.remove();
      if (typeof onClose === 'function') {
        onClose();
      }
    });
    
    // Show dialog
    dialog.show();
    return dialog;
  }
}

/**
 * Test a dialog node
 */
executeTestDialog(nodeData, nodeId) {
  console.log(`Executing test dialog for node ID: ${nodeId}`);
  console.log(`In 3D mode: ${this.in3DMode}`);
  
  // Get the dialog data
  const title = nodeData.data.title || 'Dialog';
  const text = nodeData.data.text || '';
  const image = nodeData.data.image;
  
  // Create content for both dialog and immersive modes
  let contentHtml = `<div>${text}</div>`;
  
  if (image) {
    const imageUrl = this.getSplashArtUrl(image);
    if (imageUrl) {
      contentHtml = `
        <div style="margin-bottom: 16px; text-align: center;">
          <img src="${imageUrl}" style="max-width: 100%; max-height: 300px; border-radius: 8px;">
        </div>
        <div>${text}</div>
      `;
    }
  }

  // Only use immersive UI when explicitly in 3D mode
  if (this.in3DMode) {
    console.log("Using immersive UI for dialog");
    return this.showImmersiveOverlay(contentHtml, {
      title: title,
      onContinue: () => {
        console.log(`Dialog node ${nodeId} completed, moving to next node`);
        this.findAndExecuteNextNode(nodeId);
      }
    });
  } else {
    console.log("Using standard dialog UI");
    // Create dialog
    const dialog = document.createElement('sl-dialog');
    dialog.label = title;
    dialog.style.cssText = '--width: 600px;';
    
    dialog.innerHTML = `
      <div style="padding: 16px;">${contentHtml}</div>
      <div slot="footer">
        <sl-button variant="primary" class="continue-btn">Continue</sl-button>
      </div>
    `;
    
    // Add to DOM
    document.body.appendChild(dialog);
    
    // Add continue button handler
    const continueBtn = dialog.querySelector('.continue-btn');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        dialog.hide();
      });
    }
    
    // Add close handler
    dialog.addEventListener('sl-after-hide', () => {
      dialog.remove();
      console.log(`Dialog node ${nodeId} completed, moving to next node`);
      this.findAndExecuteNextNode(nodeId);
    });
    
    // Show dialog
    dialog.show();
    return dialog;
  }
}


/**
 * Test a choice node
 */
executeTestChoice(nodeData, nodeId) {
  // Get the choice data
  const text = nodeData.data.text || 'What would you like to do?';
  const options = nodeData.data.options || [];
  
  // Create dialog
  const dialog = document.createElement('sl-dialog');
  dialog.label = 'Choice';
  dialog.style.cssText = '--width: 500px;';
  
  // Create options HTML
  let optionsHtml = '';
  if (options.length > 0) {
    optionsHtml = '<div class="choice-options" style="display: flex; flex-direction: column; gap: 8px; margin-top: 16px;">';
    options.forEach((option, index) => {
      optionsHtml += `
        <sl-button class="option-btn" data-index="${index}" style="text-align: left;">
          ${option.text}
        </sl-button>
      `;
    });
    optionsHtml += '</div>';
  } else {
    optionsHtml = '<div style="color: #888; margin-top: 16px;">No options available</div>';
  }
  
  dialog.innerHTML = `
    <div style="padding: 16px;">
      <div>${text}</div>
      ${optionsHtml}
    </div>
  `;
  
  // Add to DOM
  document.body.appendChild(dialog);
  
  // Add option button handlers
  const optionBtns = dialog.querySelectorAll('.option-btn');
  optionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.getAttribute('data-index'));
      dialog.hide();
      
      // Find the next node for this option
      // First try explicit targetId from the option
      if (options[index].targetId) {
        this.executeTestNode(options[index].targetId);
        return;
      }
      
      // If no explicit targetId, find connections by option index
      const connections = this.currentGraph.connections.filter(c => c.from === nodeId);
      
      if (connections.length > index) {
        this.executeTestNode(connections[index].to);
      } else if (connections.length > 0) {
        // Fall back to the first connection
        this.executeTestNode(connections[0].to);
      } else {
        this.showTestingDialog('End of story branch reached.', () => {});
      }
    });
  });
  
  // Add close handler for manually closing
  dialog.addEventListener('sl-after-hide', () => {
    dialog.remove();
  });
  
  // Show dialog
  dialog.show();
}

/**
 * Test a condition node
 */
executeTestCondition(nodeData, nodeId) {
  // Get the condition data
  const conditionType = nodeData.data.condition || 'unknown';
  let conditionText = '';
  
  switch (conditionType) {
    case 'hasMonster':
      conditionText = `Check if player has monster: ${nodeData.data.params?.monsterName || 'Unknown monster'}`;
      break;
    case 'hasItem':
      conditionText = `Check if player has item: ${nodeData.data.params?.itemName || 'Unknown item'} (Quantity: ${nodeData.data.params?.quantity || 1})`;
      break;
    case 'hasFlag':
      conditionText = `Check if game flag "${nodeData.data.params?.flag || 'Unknown'}" is ${nodeData.data.params?.value ? 'true' : 'false'}`;
      break;
    case 'monsterLevel':
      conditionText = `Check if monster ${nodeData.data.params?.monsterName || 'Unknown'} level is at least ${nodeData.data.params?.level || 1}`;
      break;
    default:
      conditionText = `Condition: ${conditionType}`;
  }
  
  // Create dialog
  const dialog = document.createElement('sl-dialog');
  dialog.label = 'Condition Check';
  dialog.style.cssText = '--width: 500px;';
  
  dialog.innerHTML = `
    <div style="padding: 16px;">
      <div style="font-weight: bold; margin-bottom: 8px;">Testing condition:</div>
      <div style="padding: 8px; background: #333; border-radius: 4px;">
        ${conditionText}
      </div>
      
      <div style="margin-top: 16px; font-style: italic; color: #aaa;">
        For testing purposes, choose which path to follow:
      </div>
      
      <div style="display: flex; gap: 8px; margin-top: 12px;">
        <sl-button class="true-btn" variant="primary" style="--sl-color-primary-600: #2196F3;">
          <span style="display: inline-block; width: 10px; height: 10px; background: #2196F3; border-radius: 50%; margin-right: 8px;"></span>
          True Path
        </sl-button>
        
        <sl-button class="false-btn" variant="primary" style="--sl-color-primary-600: #F44336;">
          <span style="display: inline-block; width: 10px; height: 10px; background: #F44336; border-radius: 50%; margin-right: 8px;"></span>
          False Path
        </sl-button>
      </div>
    </div>
  `;
  
  // Add to DOM
  document.body.appendChild(dialog);
  
  // Add button handlers
  const trueBtn = dialog.querySelector('.true-btn');
  const falseBtn = dialog.querySelector('.false-btn');
  
  if (trueBtn) {
    trueBtn.addEventListener('click', () => {
      dialog.hide();
      this.followConditionPath(nodeId, true);
    });
  }
  
  if (falseBtn) {
    falseBtn.addEventListener('click', () => {
      dialog.hide();
      this.followConditionPath(nodeId, false);
    });
  }
  
  // Add close handler for manually closing
  dialog.addEventListener('sl-after-hide', () => {
    dialog.remove();
  });
  
  // Show dialog
  dialog.show();
}

/**
 * Follow a specific condition path
 */
followConditionPath(nodeId, isTrue) {
  // Find connection with matching path attribute
  const connections = this.currentGraph.connections.filter(c => c.from === nodeId);
  
  // Find connection with matching path type
  const pathToFollow = isTrue ? 'true' : 'false';
  const matchingConnection = connections.find(c => c.path === pathToFollow);
  
  if (matchingConnection) {
    // Follow the matching path
    this.executeTestNode(matchingConnection.to);
  } else if (connections.length > 0) {
    // Fallback: If we can't find a connection with exact path match, use first (true) for true result, 
    // second (false) for false result
    const connectionIndex = isTrue ? 0 : Math.min(1, connections.length - 1);
    this.executeTestNode(connections[connectionIndex].to);
  } else {
    this.showTestingDialog('End of story branch reached.', () => {});
  }
}

/**
 * Test an event node
 */
executeTestEvent(nodeData, nodeId) {
  // Get the event data
  const eventType = nodeData.data.eventType || 'unknown';
  let eventText = '';
  let imageHtml = '';
  
  switch (eventType) {
    case 'offerStarter':
      eventText = 'Offer starter monster to the player';
      imageHtml = '<div style="font-size: 48px; text-align: center; margin: 20px 0; color: #673ab7;">🐲</div>';
      break;
    case 'showPartyManager':
      eventText = 'Show the party manager to the player';
      imageHtml = '<div style="font-size: 48px; text-align: center; margin: 20px 0; color: #673ab7;">📋</div>';
      break;
    case 'giveItem':
      const itemName = nodeData.data.params?.itemName || 'Unknown item';
      const quantity = nodeData.data.params?.quantity || 1;
      eventText = `Give item to player: ${itemName} (Quantity: ${quantity})`;
      
      // Try to get item image
      if (nodeData.data.params?.itemId && this.resourceManager) {
        const item = this.resourceManager.resources.textures.props.get(nodeData.data.params.itemId);
        if (item && item.thumbnail) {
          imageHtml = `
            <div style="text-align: center; margin: 20px 0;">
              <img src="${item.thumbnail}" style="max-width: 100px; max-height: 100px; border: 2px solid #444; border-radius: 8px; padding: 4px;">
            </div>
          `;
        }
      }
      
      if (!imageHtml) {
        imageHtml = '<div style="font-size: 48px; text-align: center; margin: 20px 0; color: #673ab7;">🎁</div>';
      }
      break;
    case 'setFlag':
      const flag = nodeData.data.params?.flag || 'Unknown flag';
      const value = nodeData.data.params?.value ? 'true' : 'false';
      eventText = `Set game flag: ${flag} = ${value}`;
      imageHtml = '<div style="font-size: 48px; text-align: center; margin: 20px 0; color: #673ab7;">🚩</div>';
      break;
    case 'teleport':
      const x = nodeData.data.params?.x || 0;
      const y = nodeData.data.params?.y || 0;
      const z = nodeData.data.params?.z || 0;
      eventText = `Teleport player to position: X=${x}, Y=${y}, Z=${z}`;
      imageHtml = '<div style="font-size: 48px; text-align: center; margin: 20px 0; color: #673ab7;">✨</div>';
      break;
    default:
      eventText = `Event: ${eventType}`;
  }
  
  // Create dialog
  const dialog = document.createElement('sl-dialog');
  dialog.label = 'Game Event';
  dialog.style.cssText = '--width: 500px;';
  
  dialog.innerHTML = `
    <div style="padding: 16px;">
      ${imageHtml}
      <div style="font-weight: bold; margin-bottom: 8px;">Event triggered:</div>
      <div style="padding: 8px; background: #333; border-radius: 4px;">
        ${eventText}
      </div>
    </div>
    <div slot="footer">
      <sl-button variant="primary" class="continue-btn">Continue</sl-button>
    </div>
  `;
  
  // Add to DOM
  document.body.appendChild(dialog);
  
  // Add continue button handler
  const continueBtn = dialog.querySelector('.continue-btn');
  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      dialog.hide();
    });
  }
  
  // Add close handler
  dialog.addEventListener('sl-after-hide', () => {
    dialog.remove();
    // Continue to next node
    this.findAndExecuteNextNode(nodeId);
  });
  
  // Show dialog
  dialog.show();
}

/**
 * Test a combat node
 */
executeTestCombat(nodeData, nodeId) {
  // Create dialog
  const dialog = document.createElement('sl-dialog');
  dialog.label = 'Combat Encounter';
  dialog.style.cssText = '--width: 500px;';
  
  dialog.innerHTML = `
    <div style="padding: 16px;">
      <div style="font-size: 48px; text-align: center; margin: 20px 0; color: #F44336;">⚔️</div>
      
      <div style="font-weight: bold; margin-bottom: 8px;">Combat encountered:</div>
      <div style="padding: 8px; background: #333; border-radius: 4px;">
        ${nodeData.data.enemies?.length || 0} enemies
      </div>
      
      <div style="margin-top: 16px; font-style: italic; color: #aaa;">
        For testing purposes, choose battle outcome:
      </div>
      
      <div style="display: flex; gap: 8px; margin-top: 12px;">
        <sl-button class="victory-btn" variant="success">
          Victory
        </sl-button>
        
        <sl-button class="defeat-btn" variant="danger">
          Defeat
        </sl-button>
      </div>
    </div>
  `;
  
  // Add to DOM
  document.body.appendChild(dialog);
  
  // Add button handlers
  const victoryBtn = dialog.querySelector('.victory-btn');
  const defeatBtn = dialog.querySelector('.defeat-btn');
  
  if (victoryBtn) {
    victoryBtn.addEventListener('click', () => {
      dialog.hide();
      this.followCombatPath(nodeId, true);
    });
  }
  
  if (defeatBtn) {
    defeatBtn.addEventListener('click', () => {
      dialog.hide();
      this.followCombatPath(nodeId, false);
    });
  }
  
  // Add close handler for manually closing
  dialog.addEventListener('sl-after-hide', () => {
    dialog.remove();
  });
  
  // Show dialog
  dialog.show();
}

/**
 * Follow a specific combat outcome path
 */
followCombatPath(nodeId, isVictory) {
  // Find connection with matching path attribute
  const connections = this.currentGraph.connections.filter(c => c.from === nodeId);
  
  // Find connection with matching path type
  const pathToFollow = isVictory ? 'victory' : 'defeat';
  const matchingConnection = connections.find(c => c.path === pathToFollow);
  
  if (matchingConnection) {
    // Follow the matching path
    this.executeTestNode(matchingConnection.to);
  } else if (connections.length > 0) {
    // Fallback: Use first for victory, second for defeat
    const connectionIndex = isVictory ? 0 : Math.min(1, connections.length - 1);
    this.executeTestNode(connections[connectionIndex].to);
  } else {
    this.showTestingDialog('End of story branch reached.', () => {});
  }
}

/**
 * Test a reward node
 */
executeTestReward(nodeData, nodeId) {
  // Create dialog
  const dialog = document.createElement('sl-dialog');
  dialog.label = 'Rewards';
  dialog.style.cssText = '--width: 500px;';
  
  dialog.innerHTML = `
    <div style="padding: 16px;">
      <div style="font-size: 48px; text-align: center; margin: 20px 0; color: #FFD700;">🏆</div>
      
      <div style="font-weight: bold; margin-bottom: 8px;">Rewards received:</div>
      <div style="padding: 8px; background: #333; border-radius: 4px;">
        <div>Items: ${nodeData.data.items?.length || 0}</div>
        <div>Experience: ${nodeData.data.experience || 0}</div>
      </div>
    </div>
    <div slot="footer">
      <sl-button variant="primary" class="continue-btn">Continue</sl-button>
    </div>
  `;
  
  // Add to DOM
  document.body.appendChild(dialog);
  
  // Add continue button handler
  const continueBtn = dialog.querySelector('.continue-btn');
  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      dialog.hide();
    });
  }
  
  // Add close handler
  dialog.addEventListener('sl-after-hide', () => {
    dialog.remove();
    // Continue to next node
    this.findAndExecuteNextNode(nodeId);
  });
  
  // Show dialog
  dialog.show();
}

/**
 * Find and execute the next node in sequence
 */
findAndExecuteNextNode(currentNodeId) {
  // Find outgoing connections
  const connections = this.currentGraph.connections.filter(c => c.from === currentNodeId);
  
  if (connections.length > 0) {
    // Follow the first connection
    this.executeTestNode(connections[0].to);
  } else {
    // End of story
    this.showTestingDialog('End of story reached.', () => {});
  }
}


/**
 * Show an immersive overlay for story content in 3D mode
 */
showImmersiveOverlay(content, options = {}) {
  console.log("Showing immersive overlay");
  
  // Only pause controls if we're in 3D mode
  if (this.in3DMode && this.scene3D && typeof this.scene3D.pauseControls === 'function') {
    console.log('Pausing controls for immersive UI');
    this.scene3D.pauseControls();
  }
  
  // Close any existing overlay
  this.closeCurrentOverlay();
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'story-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;
  
  overlay.innerHTML = `
    <div class="story-content" style="
      background: #242424;
      max-width: 800px;
      width: 80vw;
      max-height: 80vh;
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      transform: scale(0.95);
      transition: transform 0.3s ease;
    ">
      ${options.title ? `
        <div class="story-header" style="
          padding: 16px;
          background: linear-gradient(135deg, #673ab7, #9c27b0);
          color: white;
          font-weight: bold;
          font-size: 1.2rem;
        ">
          ${options.title}
        </div>
      ` : ''}
      
      <div class="story-body" style="
        padding: 24px;
        overflow-y: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 20px;
        color: #e0e0e0;
      ">
        ${content}
      </div>
      
      ${options.showFooter !== false ? `
        <div class="story-footer" style="
          padding: 16px;
          background: #333;
          border-top: 1px solid #444;
          display: flex;
          justify-content: flex-end;
        ">
          <button class="story-continue-btn" style="
            padding: 8px 16px;
            background: #673ab7;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
          ">Continue</button>
        </div>
      ` : ''}
    </div>
  `;
  
  document.body.appendChild(overlay);
  this.currentOverlay = overlay;
  
  // Set up continue button with fixed execution order
  const continueBtn = overlay.querySelector('.story-continue-btn');
  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      // Store callback first
      const callback = options.onContinue;
      
      // Close overlay
      this.closeCurrentOverlay();
      
      // Call callback after a short delay
      if (callback) {
        setTimeout(() => {
          callback();
        }, 50);
      }
    });
  }
  
  // Animate in
  setTimeout(() => {
    overlay.style.opacity = '1';
    const content = overlay.querySelector('.story-content');
    if (content) {
      content.style.transform = 'scale(1)';
    }
  }, 10);
  
  return overlay;
}


/**
 * Close the current overlay if one exists
 */
closeCurrentOverlay() {
  if (this.currentOverlay) {
    // Animate out
    this.currentOverlay.style.opacity = '0';
    const content = this.currentOverlay.querySelector('.story-content');
    if (content) {
      content.style.transform = 'scale(0.95)';
    }

    // Remove after animation
    setTimeout(() => {
      if (document.body.contains(this.currentOverlay)) {
        document.body.removeChild(this.currentOverlay);
      }
      this.currentOverlay = null;

      // Only resume controls if we're in 3D mode
      if (this.in3DMode && this.scene3D && typeof this.scene3D.resumeControls === 'function') {
        console.log('Resuming controls after immersive UI');
        this.scene3D.resumeControls();
      }
    }, 300);
  }
}
// ^^
// add more code in here before the curly brace



// VV
  };
// do not add code in here
}


// this area is for globals

// Create global instance when script loads
window.initStoryboard = (scene3D, resourceManager) => {
  window.storyboard = new window.Storyboard(scene3D, resourceManager);
  return window.storyboard;
};