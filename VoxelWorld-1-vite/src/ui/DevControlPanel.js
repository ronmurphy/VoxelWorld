/**
 * 🛠️ DEV CONTROL PANEL
 *
 * A developer console/modal that provides buttons for all debug commands.
 * Eliminates the need to type commands in the browser console.
 *
 * Available via Electron menu: View > Dev Controls
 */

export class DevControlPanel {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;
        this.isOpen = false;
        this.modal = null;

        console.log('🛠️ DevControlPanel initialized');
    }

    /**
     * Open the dev control panel modal
     */
    open() {
        if (this.isOpen) {
            console.log('🛠️ Dev Control Panel is already open');
            return;
        }

        this.isOpen = true;
        this.createModal();
        console.log('🛠️ Dev Control Panel opened');
    }

    /**
     * Close the dev control panel modal
     */
    close() {
        if (!this.isOpen || !this.modal) {
            return;
        }

        this.modal.remove();
        this.modal = null;
        this.isOpen = false;
        console.log('🛠️ Dev Control Panel closed');
    }

    /**
     * Create the modal UI
     */
    createModal() {
        // Create modal overlay
        this.modal = document.createElement('div');
        this.modal.className = 'voxel-modal-overlay';
        this.modal.style.zIndex = '9999'; // Below Sargem (10000) but above everything else

        this.modal.innerHTML = `
            <div class="voxel-modal character-creation-modal" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h2>🛠️ Developer Control Panel</h2>
                    <p class="subtitle">Debug Commands & Utilities</p>
                </div>

                <div class="modal-body">
                    <!-- Quest/Tutorial Editor Section -->
                    <div class="dev-section">
                        <h3>🐈‍⬛ Quest & Tutorial Editor</h3>
                        <div class="button-grid">
                            <button class="btn btn-primary" id="dev-open-sargem">
                                Open Sargem Editor
                            </button>
                        </div>
                        <p class="help-text">Visual node editor for creating quests, tutorials, and storylines</p>
                    </div>

                    <!-- LOD System Section -->
                    <div class="dev-section">
                        <h3>🎨 LOD System (Level of Detail)</h3>
                        <div class="button-grid">
                            <button class="btn btn-secondary" id="dev-toggle-lod">
                                Toggle LOD
                            </button>
                            <button class="btn btn-secondary" id="dev-lod-stats">
                                Show LOD Stats
                            </button>
                        </div>
                        <div class="input-group">
                            <label for="dev-lod-distance">Visual Distance:</label>
                            <input type="number" id="dev-lod-distance" min="1" max="20" value="5" class="input-field">
                            <button class="btn btn-secondary" id="dev-set-lod-distance">Set Distance</button>
                        </div>
                        <p class="help-text">Control how far LOD chunks extend from the player</p>
                    </div>

                    <!-- Performance Section -->
                    <div class="dev-section">
                        <h3>📊 Performance & Display</h3>
                        <div class="button-grid">
                            <button class="btn btn-secondary" id="dev-toggle-fps">
                                Toggle FPS Counter
                            </button>
                        </div>
                        <p class="help-text">Show/hide performance metrics overlay</p>
                    </div>

                    <!-- Game State Section -->
                    <div class="dev-section">
                        <h3>🎮 Game State</h3>
                        <div class="button-grid">
                            <button class="btn btn-danger" id="dev-new-game">
                                New Game (Clean)
                            </button>
                        </div>
                        <p class="help-text">⚠️ Warning: Resets all progress</p>
                    </div>

                    <!-- Output Console -->
                    <div class="dev-section">
                        <h3>📟 Command Output</h3>
                        <div id="dev-output" class="dev-output">
                            <p style="opacity: 0.6; font-style: italic;">Command output will appear here...</p>
                        </div>
                    </div>
                </div>

                <div class="modal-footer" style="justify-content: space-between;">
                    <button class="btn btn-secondary" id="dev-clear-output">Clear Output</button>
                    <button class="btn btn-primary" id="dev-close">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);

        // Add custom styles
        this.injectStyles();

        // Wire up event listeners
        this.setupEventListeners();
    }

    /**
     * Inject custom CSS styles for the dev panel
     */
    injectStyles() {
        if (document.getElementById('dev-control-panel-styles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'dev-control-panel-styles';
        style.textContent = `
            .dev-section {
                margin-bottom: 25px;
                padding: 15px;
                background: #f5f5f5;
                border-radius: 8px;
                border-left: 4px solid #0066cc;
            }

            .dev-section h3 {
                margin: 0 0 12px 0;
                color: #333;
                font-size: 16px;
            }

            .button-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 10px;
                margin-bottom: 10px;
            }

            .input-group {
                display: flex;
                gap: 10px;
                align-items: center;
                margin-top: 10px;
            }

            .input-group label {
                font-weight: bold;
                font-size: 14px;
                min-width: 120px;
            }

            .input-group .input-field {
                flex: 1;
                padding: 8px 12px;
                border: 2px solid #ccc;
                border-radius: 4px;
                font-size: 14px;
                max-width: 100px;
            }

            .input-group .input-field:focus {
                outline: none;
                border-color: #0066cc;
            }

            .help-text {
                margin: 8px 0 0 0;
                font-size: 12px;
                color: #666;
                font-style: italic;
            }

            .dev-output {
                background: #1e1e1e;
                color: #d4d4d4;
                padding: 15px;
                border-radius: 4px;
                font-family: 'Courier New', monospace;
                font-size: 13px;
                max-height: 200px;
                overflow-y: auto;
                line-height: 1.5;
            }

            .dev-output p {
                margin: 5px 0;
            }

            .dev-output .success {
                color: #4caf50;
            }

            .dev-output .error {
                color: #f44336;
            }

            .dev-output .info {
                color: #2196f3;
            }

            .dev-output .warning {
                color: #ff9800;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Setup all button event listeners
     */
    setupEventListeners() {
        // Close button
        this.modal.querySelector('#dev-close').addEventListener('click', () => {
            this.close();
        });

        // Clear output button
        this.modal.querySelector('#dev-clear-output').addEventListener('click', () => {
            this.clearOutput();
        });

        // Close on overlay click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // === COMMAND BUTTONS ===

        // Open Sargem Editor
        this.modal.querySelector('#dev-open-sargem').addEventListener('click', () => {
            this.executeCommand('openTutorialEditor', 'Opening Sargem Quest Editor...');
        });

        // Toggle LOD
        this.modal.querySelector('#dev-toggle-lod').addEventListener('click', () => {
            this.executeCommand('toggleLOD', 'Toggling LOD system...');
        });

        // Show LOD Stats
        this.modal.querySelector('#dev-lod-stats').addEventListener('click', () => {
            this.executeCommand('getLODStats', 'Fetching LOD statistics...');
        });

        // Set LOD Distance
        this.modal.querySelector('#dev-set-lod-distance').addEventListener('click', () => {
            const distance = parseInt(this.modal.querySelector('#dev-lod-distance').value);
            if (isNaN(distance) || distance < 1 || distance > 20) {
                this.logOutput('Invalid distance. Must be between 1-20.', 'error');
                return;
            }
            this.executeCommand('setVisualDistance', `Setting LOD distance to ${distance}...`, distance);
        });

        // Toggle FPS
        this.modal.querySelector('#dev-toggle-fps').addEventListener('click', () => {
            this.executeCommand('toggleFPS', 'Toggling FPS counter...');
        });

        // New Game
        this.modal.querySelector('#dev-new-game').addEventListener('click', () => {
            if (confirm('⚠️ This will reset all game progress. Are you sure?')) {
                this.executeCommand('playerNewGameClean', 'Starting new game...', null, true);
            }
        });
    }

    /**
     * Execute a voxelWorld command
     * @param {string} command - Method name to call on voxelWorld
     * @param {string} message - Message to display in output
     * @param {*} arg - Optional argument to pass to the command
     * @param {boolean} isGlobal - If true, call window[command] instead of voxelWorld[command]
     */
    executeCommand(command, message, arg = undefined, isGlobal = false) {
        this.logOutput(message, 'info');

        try {
            let result;
            if (isGlobal) {
                if (typeof window[command] === 'function') {
                    result = arg !== undefined ? window[command](arg) : window[command]();
                } else {
                    throw new Error(`Global function ${command} not found`);
                }
            } else {
                if (typeof this.voxelWorld[command] === 'function') {
                    result = arg !== undefined ? this.voxelWorld[command](arg) : this.voxelWorld[command]();
                } else {
                    throw new Error(`VoxelWorld method ${command} not found`);
                }
            }

            // Log result if it's a value (not undefined)
            if (result !== undefined) {
                if (typeof result === 'object') {
                    this.logOutput(JSON.stringify(result, null, 2), 'success');
                } else {
                    this.logOutput(`Result: ${result}`, 'success');
                }
            } else {
                this.logOutput('✓ Command executed', 'success');
            }
        } catch (error) {
            this.logOutput(`Error: ${error.message}`, 'error');
            console.error('Dev panel command error:', error);
        }
    }

    /**
     * Log output to the console area
     * @param {string} message - Message to display
     * @param {string} type - Type of message (info, success, error, warning)
     */
    logOutput(message, type = 'info') {
        const outputDiv = this.modal.querySelector('#dev-output');

        // Clear "waiting for output" message if present
        const placeholder = outputDiv.querySelector('p[style*="opacity: 0.6"]');
        if (placeholder) {
            placeholder.remove();
        }

        const timestamp = new Date().toLocaleTimeString();
        const p = document.createElement('p');
        p.className = type;
        p.textContent = `[${timestamp}] ${message}`;

        outputDiv.appendChild(p);

        // Auto-scroll to bottom
        outputDiv.scrollTop = outputDiv.scrollHeight;
    }

    /**
     * Clear the output console
     */
    clearOutput() {
        const outputDiv = this.modal.querySelector('#dev-output');
        outputDiv.innerHTML = '<p style="opacity: 0.6; font-style: italic;">Command output will appear here...</p>';
    }
}
