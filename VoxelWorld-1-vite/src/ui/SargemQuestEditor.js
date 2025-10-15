/**
 * 🐈‍⬛ Sargem Quest Editor
 * Visual node-based quest/tutorial editor
 * Based on StarNode system - vanilla JS, no dependencies
 */

import { TutorialConverter } from '../utils/TutorialConverter.js';
import { ElectronFileSystem } from '../utils/ElectronFileSystem.js';
import { QuestRunner } from '../quests/QuestRunner.js';

export class SargemQuestEditor {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;
        this.isOpen = false;
        
        // Quest runner
        this.questRunner = new QuestRunner(voxelWorld);
        
        // Editor state
        this.nodes = [];
        this.connections = [];
        this.selectedNode = null;
        this.lastNodeId = 0;
        this.lastConnectionId = 0;
        this.hasUnsavedChanges = false;
        this.autosaveTimer = null;
        
        // Canvas state
        this.gridScale = 1;
        this.gridOffsetX = 0;
        this.gridOffsetY = 0;
        this.isPanning = false;
        this.draggedNode = null;
        this.isConnecting = false;
        this.connectionStartNode = null;
        
        // Node types for quests/tutorials
        this.nodeTypes = [
            { id: 'dialogue', name: 'Dialogue', icon: '💬', color: '#4ec9b0', desc: 'Show companion/NPC dialogue' },
            { id: 'choice', name: 'Choice', icon: '❓', color: '#569cd6', desc: 'Yes/No or Multiple Choice' },
            { id: 'image', name: 'Image', icon: '🖼️', color: '#c586c0', desc: 'Show image from /art/pictures/' },
            { id: 'combat', name: 'Combat', icon: '⚔️', color: '#ce9178', desc: 'Trigger combat encounter' },
            { id: 'item', name: 'Item', icon: '🎁', color: '#dcdcaa', desc: 'Give/Take items from player' },
            { id: 'condition', name: 'Condition', icon: '🔀', color: '#f48771', desc: 'Check inventory/quest state' },
            { id: 'trigger', name: 'Trigger', icon: '⚡', color: '#b5cea8', desc: 'Fire game event (unlock, spawn)' }
        ];
    }

    /**
     * Open Sargem's Quest Editor
     */
    async open() {
        // Remove any existing modal first (cleanup)
        const existingModal = document.getElementById('sargem-modal');
        if (existingModal) {
            existingModal.remove();
            this.isOpen = false;
            console.log('🧹 Cleaned up old modal');
        }

        if (this.isOpen) {
            console.log('🐈‍⬛ Sargem is already open');
            return;
        }

        // Disable game controls - Sargem is in charge!
        if (this.voxelWorld) {
            this.voxelWorld.controlsEnabled = false;
            console.log('🐈‍⬛ Sargem is in charge - controls disabled');
        }

        this.createModal();
        this.isOpen = true;
        console.log('🐈‍⬛ Sargem Quest Editor opened');

        // Check for autosaved work
        await this.checkForTempFile();

        // Auto-load existing quests
        await this.autoLoad();
    }

    /**
     * Close the editor
     */
    close() {
        if (!this.isOpen) return;

        // Check for unsaved changes
        if (this.hasUnsavedChanges) {
            const save = confirm('🐈‍⬛ You have unsaved changes. Save before closing?');
            if (save) {
                this.autoSaveToTemp();
            }
        }

        // Clear autosave timer
        if (this.autosaveTimer) {
            clearInterval(this.autosaveTimer);
            this.autosaveTimer = null;
        }

        // Hide back-to-sargem button if visible
        const backBtn = document.getElementById('back-to-sargem-btn');
        if (backBtn) backBtn.remove();

        // Remove modal
        const modal = document.getElementById('sargem-modal');
        if (modal) modal.remove();

        // Re-enable game controls
        if (this.voxelWorld) {
            this.voxelWorld.controlsEnabled = true;
            console.log('🎮 Game controls re-enabled - Sargem is resting');
        }

        this.isOpen = false;
        console.log('🐈‍⬛ Sargem Quest Editor closed');
    }

    /**
     * Create the modal UI
     */
    createModal() {
        const modal = document.createElement('div');
        modal.id = 'sargem-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.95);
            z-index: 60000;
            display: flex;
            flex-direction: column;
        `;

        // Header
        const header = this.createHeader();
        modal.appendChild(header);

        // Main container
        const main = document.createElement('div');
        main.style.cssText = 'display: flex; flex: 1; overflow: hidden;';

        // Sidebar (node types)
        const sidebar = this.createSidebar();
        main.appendChild(sidebar);

        // Canvas area
        const canvasContainer = document.createElement('div');
        canvasContainer.style.cssText = 'flex: 1; position: relative; overflow: hidden; background: #1e1e1e;';
        
        const canvas = document.createElement('div');
        canvas.id = 'sargem-canvas';
        canvas.style.cssText = `
            position: absolute;
            width: 3000px;
            height: 3000px;
            transform-origin: 0 0;
            background-image:
                linear-gradient(to right, rgba(52, 152, 219, 0.1) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(52, 152, 219, 0.1) 1px, transparent 1px);
            background-size: 60px 60px;
        `;
        canvasContainer.appendChild(canvas);
        main.appendChild(canvasContainer);

        // Properties panel
        const properties = this.createPropertiesPanel();
        main.appendChild(properties);

        modal.appendChild(main);

        // Add controls
        const controls = this.createControls();
        canvasContainer.appendChild(controls);

        document.body.appendChild(modal);

        // Setup events
        this.setupEvents(canvas, canvasContainer);

        // Center view
        this.centerView(canvasContainer);
    }

    /**
     * Create header with title and buttons
     */
    createHeader() {
        const header = document.createElement('div');
        header.style.cssText = `
            background: #2a2a2a;
            color: white;
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #3a3a3a;
        `;

        const title = document.createElement('h2');
        title.innerHTML = '🐈‍⬛ <span style="color: #4ec9b0;">Sargem</span> - Quest Editor';
        title.style.cssText = 'margin: 0; font-size: 20px;';

        const buttons = document.createElement('div');
        buttons.style.cssText = 'display: flex; gap: 10px;';

        buttons.appendChild(this.createButton('📂 Open', () => this.openFile()));
        buttons.appendChild(this.createButton('📄 New', () => this.newFile()));
        buttons.appendChild(this.createButton('▶️ Test Quest', () => this.testQuest(), '#0e8c0e'));
        buttons.appendChild(this.createButton('💾 Quick Save', () => this.quickSave(), '#0e639c'));
        buttons.appendChild(this.createButton('💾 Save As...', () => this.saveAs(), '#0e639c'));
        buttons.appendChild(this.createButton('✕ Close', () => this.close(), '#c72e2e'));

        header.appendChild(title);
        header.appendChild(buttons);

        return header;
    }

    /**
     * Create sidebar with draggable node types
     */
    createSidebar() {
        const sidebar = document.createElement('div');
        sidebar.style.cssText = `
            width: 250px;
            background: #252526;
            border-right: 1px solid #3e3e42;
            padding: 20px;
            overflow-y: auto;
        `;

        const title = document.createElement('h3');
        title.textContent = '📦 Node Types';
        title.style.cssText = 'color: #cccccc; margin-bottom: 15px; font-size: 14px; text-transform: uppercase;';
        sidebar.appendChild(title);

        this.nodeTypes.forEach(type => {
            const nodeEl = document.createElement('div');
            nodeEl.draggable = false; // We'll handle drag manually
            nodeEl.dataset.nodeType = type.id;
            nodeEl.style.cssText = `
                background: #37373d;
                padding: 10px;
                margin-bottom: 8px;
                border-radius: 4px;
                cursor: pointer;
                border-left: 3px solid ${type.color};
                transition: background 0.2s;
                user-select: none;
            `;

            nodeEl.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 4px;">${type.icon} ${type.name}</div>
                <div style="font-size: 12px; color: #858585;">${type.desc}</div>
            `;

            nodeEl.onmouseover = () => nodeEl.style.background = '#3e3e42';
            nodeEl.onmouseout = () => {
                if (this.selectedNodeType?.id !== type.id) {
                    nodeEl.style.background = '#37373d';
                }
            };
            nodeEl.onclick = () => {
                // Deselect all
                document.querySelectorAll('[data-node-type]').forEach(el => {
                    el.style.background = '#37373d';
                    el.style.boxShadow = 'none';
                });
                
                // Select this one
                this.selectedNodeType = type;
                nodeEl.style.background = '#0e8c0e';
                nodeEl.style.boxShadow = '0 0 10px rgba(14, 140, 14, 0.5)';
                
                console.log(`✨ Selected ${type.name} - Click on canvas to place!`);
            };

            sidebar.appendChild(nodeEl);
        });

        return sidebar;
    }

    /**
     * Create properties panel
     */
    createPropertiesPanel() {
        const panel = document.createElement('div');
        panel.id = 'sargem-properties';
        panel.style.cssText = `
            width: 300px;
            background: #252526;
            border-left: 1px solid #3e3e42;
            padding: 20px;
            overflow-y: auto;
        `;

        const title = document.createElement('h3');
        title.textContent = '⚙️ Properties';
        title.style.cssText = 'color: #cccccc; margin-bottom: 15px; font-size: 14px; text-transform: uppercase;';

        const content = document.createElement('div');
        content.id = 'sargem-properties-content';
        content.style.cssText = 'color: #858585; text-align: center; margin-top: 40px;';
        content.textContent = 'Select a node to edit properties';

        panel.appendChild(title);
        panel.appendChild(content);

        return panel;
    }

    /**
     * Create zoom/pan controls
     */
    createControls() {
        const controls = document.createElement('div');
        controls.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #2a2a2a;
            padding: 10px;
            border-radius: 10px;
            display: flex;
            gap: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
        `;

        const createControl = (text, onClick) => {
            const btn = document.createElement('div');
            btn.textContent = text;
            btn.style.cssText = `
                width: 40px; height: 40px;
                background: #3a3a3a;
                color: white;
                border-radius: 5px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 18px;
                transition: background 0.2s;
            `;
            btn.onmouseover = () => btn.style.background = '#4a4a4a';
            btn.onmouseout = () => btn.style.background = '#3a3a3a';
            btn.onclick = onClick;
            return btn;
        };

        controls.appendChild(createControl('-', () => this.zoom(0.9)));
        controls.appendChild(createControl('⊙', () => this.resetView()));
        controls.appendChild(createControl('+', () => this.zoom(1.1)));
        controls.appendChild(createControl('🔗', () => this.toggleConnectMode()));

        return controls;
    }

    /**
     * Create a button
     */
    createButton(text, onClick, bgColor = '#3e3e42') {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.onclick = onClick;
        btn.style.cssText = `
            background: ${bgColor};
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: opacity 0.2s;
        `;
        btn.onmouseover = () => btn.style.opacity = '0.8';
        btn.onmouseout = () => btn.style.opacity = '1';
        return btn;
    }

    /**
     * Setup event handlers
     */
    setupEvents(canvas, container) {
        // Canvas click to place node
        canvas.onclick = (e) => {
            if (e.target !== canvas) return;
            
            // Cancel connection mode on canvas click
            if (this.isConnecting) {
                this.cancelConnection();
                return;
            }
            
            if (!this.selectedNodeType) {
                console.log('ℹ️ Select a node type from the left sidebar first!');
                return;
            }

            // Get click position relative to canvas container (viewport)
            const container = canvas.parentElement;
            const containerRect = container.getBoundingClientRect();
            const viewportX = e.clientX - containerRect.left;
            const viewportY = e.clientY - containerRect.top;
            
            // Convert from viewport to canvas space (accounting for pan and zoom)
            const x = (viewportX - this.gridOffsetX) / this.gridScale;
            const y = (viewportY - this.gridOffsetY) / this.gridScale;

            this.createNode(x, y, this.selectedNodeType);
            
            // Clear selection visual
            document.querySelectorAll('[data-node-type]').forEach(el => {
                el.style.background = '#37373d';
                el.style.boxShadow = 'none';
            });
            this.selectedNodeType = null;
        };

        // Panning
        let startX, startY;
        canvas.onmousedown = (e) => {
            if (e.target !== canvas) return;
            this.isPanning = true;
            startX = e.clientX - this.gridOffsetX;
            startY = e.clientY - this.gridOffsetY;
        };

        document.onmousemove = (e) => {
            if (!this.isPanning) return;
            this.gridOffsetX = e.clientX - startX;
            this.gridOffsetY = e.clientY - startY;
            this.updateGridTransform();
        };

        document.onmouseup = () => {
            this.isPanning = false;
        };

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (!this.isOpen) return;
            
            if (e.key === 'Escape') this.close();
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.quickSave();
            }
            if (e.ctrlKey && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                this.saveAs();
            }
        });
    }

    /**
     * Create a quest node
     */
    createNode(x, y, type) {
        const nodeId = ++this.lastNodeId;
        
        const node = {
            id: nodeId,
            type: type.id,
            name: type.name,
            x: x,
            y: y,
            data: this.getDefaultNodeData(type.id),
            inputs: [],
            outputs: []
        };

        this.nodes.push(node);
        this.renderNode(node);
        
        this.markAsChanged();
        console.log('🐈‍⬛ Created node:', node);
    }

    /**
     * Get default data for node type
     */
    getDefaultNodeData(typeId) {
        const defaults = {
            dialogue: { speaker: 'companion', text: '' },
            choice: { question: '', options: ['Yes', 'No'] },
            image: { path: '', duration: 3 },
            combat: { enemy: '', level: 1 },
            item: { action: 'give', itemId: '', amount: 1 },
            condition: { checkType: 'hasItem', value: '' },
            trigger: { event: '', params: {} }
        };
        return defaults[typeId] || {};
    }

    /**
     * Render a node on canvas
     */
    renderNode(node) {
        const canvas = document.getElementById('sargem-canvas');
        const typeInfo = this.nodeTypes.find(t => t.id === node.type);
        
        const nodeEl = document.createElement('div');
        nodeEl.id = `sargem-node-${node.id}`;
        nodeEl.className = 'sargem-node';
        nodeEl.style.cssText = `
            position: absolute;
            left: ${node.x}px;
            top: ${node.y}px;
            width: 150px;
            background: #2a2a2a;
            border: 2px solid ${typeInfo.color};
            border-radius: 8px;
            padding: 10px;
            cursor: move;
            user-select: none;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            z-index: 10;
        `;

        nodeEl.innerHTML = `
            <div style="font-size: 24px; text-align: center; margin-bottom: 5px;">${typeInfo.icon}</div>
            <div style="font-weight: 600; text-align: center; color: white; margin-bottom: 5px;">${node.name}</div>
            <div style="font-size: 11px; text-align: center; color: #858585;">${this.getNodePreview(node)}</div>
        `;

        // Node dragging
        let isDragging = false, offsetX, offsetY;
        nodeEl.onmousedown = (e) => {
            e.stopPropagation();
            
            if (this.isConnecting) {
                this.startConnection(node);
                return;
            }
            
            isDragging = true;
            offsetX = e.clientX - node.x * this.gridScale;
            offsetY = e.clientY - node.y * this.gridScale;
            this.selectNode(node);
        };

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            node.x = (e.clientX - offsetX) / this.gridScale;
            node.y = (e.clientY - offsetY) / this.gridScale;
            nodeEl.style.left = node.x + 'px';
            nodeEl.style.top = node.y + 'px';
            // Redraw connections when dragging
            this.redrawConnections();
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // Double-click to edit
        nodeEl.ondblclick = (e) => {
            e.stopPropagation();
            this.selectNode(node);
        };

        canvas.appendChild(nodeEl);
    }

    /**
     * Get preview text for node
     */
    getNodePreview(node) {
        if (node.data.text) return node.data.text.substring(0, 30) + '...';
        if (node.data.question) {
            // Show choice options
            const opts = node.data.options || ['Yes', 'No'];
            return opts.join(' / ');
        }
        if (node.data.enemy) return `Enemy: ${node.data.enemy}`;
        if (node.data.itemId) return `${node.data.action}: ${node.data.itemId}`;
        return 'Configure...';
    }

    /**
     * Select a node and show properties
     */
    selectNode(node) {
        // Deselect previous node
        if (this.selectedNode) {
            const prevEl = document.getElementById(`sargem-node-${this.selectedNode.id}`);
            if (prevEl) prevEl.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        }

        this.selectedNode = node;

        // Highlight selected node
        const nodeEl = document.getElementById(`sargem-node-${node.id}`);
        if (nodeEl) nodeEl.style.boxShadow = '0 0 15px #9b59b6';

        // Show properties
        this.showProperties(node);
        console.log('Selected node:', node);
    }

    /**
     * Show properties panel for node
     */
    showProperties(node) {
        const content = document.getElementById('sargem-properties-content');
        content.style.textAlign = 'left';
        content.style.marginTop = '0';
        content.innerHTML = '';

        const typeInfo = this.nodeTypes.find(t => t.id === node.type);

        // Title
        const title = document.createElement('div');
        title.style.cssText = 'font-size: 16px; font-weight: 600; color: #cccccc; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #3e3e42;';
        title.innerHTML = `${typeInfo.icon} ${node.name}`;
        content.appendChild(title);

        // Create fields based on node type
        if (node.type === 'dialogue') {
            this.addSelectField(content, 'Speaker', node.data.speaker || 'companion', 
                ['companion', 'player', 'npc', 'narrator'], 
                (val) => { node.data.speaker = val; this.updateNodePreview(node); });
            this.addTextArea(content, 'Dialogue Text', node.data.text || '', 
                (val) => { node.data.text = val; this.updateNodePreview(node); });
        }
        else if (node.type === 'choice') {
            this.addTextField(content, 'Question', node.data.question || '', 
                (val) => { node.data.question = val; this.updateNodePreview(node); });
            
            const optionsLabel = document.createElement('div');
            optionsLabel.style.cssText = 'margin-bottom: 15px;';
            optionsLabel.innerHTML = `
                <label style="display: block; margin-bottom: 5px; color: #cccccc; font-size: 13px;">Options (one per line, max 3)</label>
                <div style="font-size: 11px; color: #858585; margin-bottom: 5px;">💡 Tip: Add 2-3 choices for branching quests</div>
            `;
            
            const textarea = document.createElement('textarea');
            textarea.value = (node.data.options || ['Yes', 'No']).join('\n');
            textarea.rows = 3;
            textarea.style.cssText = `
                width: 100%;
                padding: 6px;
                background: #3c3c3c;
                border: 1px solid #3e3e42;
                border-radius: 4px;
                color: #cccccc;
                font-size: 13px;
            `;
            textarea.oninput = (e) => {
                const opts = e.target.value.split('\n').filter(o => o.trim()).slice(0, 3); // Max 3
                node.data.options = opts;
                this.updateNodePreview(node);
            };
            
            optionsLabel.appendChild(textarea);
            content.appendChild(optionsLabel);
        }
        else if (node.type === 'image') {
            // Image path with file picker button
            const pathContainer = document.createElement('div');
            pathContainer.style.cssText = 'margin-bottom: 15px;';
            
            const pathLabel = document.createElement('label');
            pathLabel.textContent = 'Image Path';
            pathLabel.style.cssText = 'display: block; margin-bottom: 5px; color: #cccccc; font-size: 13px;';
            pathContainer.appendChild(pathLabel);
            
            const pathInputContainer = document.createElement('div');
            pathInputContainer.style.cssText = 'display: flex; gap: 5px;';
            
            const pathInput = document.createElement('input');
            pathInput.type = 'text';
            pathInput.value = node.data.path || '';
            pathInput.style.cssText = `
                flex: 1;
                padding: 6px;
                background: #3c3c3c;
                border: 1px solid #3e3e42;
                border-radius: 4px;
                color: #cccccc;
                font-size: 13px;
            `;
            pathInput.oninput = (e) => {
                node.data.path = e.target.value;
                this.updateNodePreview(node);
            };
            
            const browseBtn = document.createElement('button');
            browseBtn.textContent = '📁 Browse';
            browseBtn.style.cssText = `
                padding: 6px 12px;
                background: #0e639c;
                border: none;
                border-radius: 4px;
                color: white;
                cursor: pointer;
                font-size: 13px;
            `;
            browseBtn.onclick = async () => {
                // Use Electron file picker if available
                if (window.electronAPI?.sargemEditor) {
                    try {
                        const result = await window.electronAPI.sargemEditor.pickImage();
                        
                        if (!result.canceled && result.success) {
                            // Copy image to quest-images folder
                            const copyResult = await window.electronAPI.sargemEditor.copyImage(
                                result.sourcePath, 
                                result.fileName
                            );
                            
                            if (copyResult.success) {
                                pathInput.value = copyResult.path;
                                node.data.path = copyResult.path;
                                this.updateNodePreview(node);
                                console.log('✅ Image copied:', copyResult.path);
                            }
                        }
                    } catch (error) {
                        console.error('❌ File picker error:', error);
                    }
                } else {
                    // Fallback: browser file input
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = 'image/*';
                    fileInput.onchange = (e) => {
                        const file = e.target.files[0];
                        if (file) {
                            // In browser mode, just use the file name
                            const imagePath = `assets/quest-images/${file.name}`;
                            pathInput.value = imagePath;
                            node.data.path = imagePath;
                            this.updateNodePreview(node);
                            
                            console.log('📸 Selected image:', file.name);
                            console.log('⚠️ Browser mode - manually copy to:', imagePath);
                        }
                    };
                    fileInput.click();
                }
            };
            
            pathInputContainer.appendChild(pathInput);
            pathInputContainer.appendChild(browseBtn);
            pathContainer.appendChild(pathInputContainer);
            content.appendChild(pathContainer);
            
            this.addTextField(content, 'Duration (seconds)', node.data.duration || 3, 
                (val) => { node.data.duration = parseInt(val) || 3; this.updateNodePreview(node); });
        }
        else if (node.type === 'combat') {
            this.addTextField(content, 'Enemy Type', node.data.enemy || '', 
                (val) => { node.data.enemy = val; this.updateNodePreview(node); });
            this.addTextField(content, 'Level', node.data.level || 1, 
                (val) => { node.data.level = parseInt(val) || 1; this.updateNodePreview(node); });
        }
        else if (node.type === 'item') {
            this.addSelectField(content, 'Action', node.data.action || 'give', 
                ['give', 'take', 'check'], 
                (val) => { node.data.action = val; this.updateNodePreview(node); });
            this.addTextField(content, 'Item ID', node.data.itemId || '', 
                (val) => { node.data.itemId = val; this.updateNodePreview(node); });
            this.addTextField(content, 'Amount', node.data.amount || 1, 
                (val) => { node.data.amount = parseInt(val) || 1; this.updateNodePreview(node); });
        }
        else if (node.type === 'condition') {
            this.addSelectField(content, 'Check Type', node.data.checkType || 'hasItem', 
                ['hasItem', 'hasQuest', 'level', 'health'], 
                (val) => { node.data.checkType = val; this.updateNodePreview(node); });
            this.addTextField(content, 'Value', node.data.value || '', 
                (val) => { node.data.value = val; this.updateNodePreview(node); });
        }
        else if (node.type === 'trigger') {
            this.addTextField(content, 'Event Name', node.data.event || '', 
                (val) => { node.data.event = val; this.updateNodePreview(node); });
            this.addTextArea(content, 'Parameters (JSON)', JSON.stringify(node.data.params || {}, null, 2), 
                (val) => { 
                    try { 
                        node.data.params = JSON.parse(val); 
                        this.updateNodePreview(node); 
                    } catch(e) { 
                        console.error('Invalid JSON'); 
                    } 
                });
        }

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️ Delete Node';
        deleteBtn.style.cssText = `
            width: 100%;
            margin-top: 20px;
            padding: 10px;
            background: #c72e2e;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        deleteBtn.onclick = () => this.deleteNode(node);
        content.appendChild(deleteBtn);

        // Debug JSON
        const debugSection = document.createElement('details');
        debugSection.style.cssText = 'margin-top: 20px; padding-top: 20px; border-top: 1px solid #3e3e42;';
        const debugSummary = document.createElement('summary');
        debugSummary.textContent = '🐈‍⬛ Debug: Raw JSON';
        debugSummary.style.cssText = 'cursor: pointer; color: #858585; margin-bottom: 10px;';
        const debugPre = document.createElement('pre');
        debugPre.style.cssText = `
            background: #1e1e1e;
            padding: 10px;
            border-radius: 4px;
            font-size: 11px;
            overflow-x: auto;
            color: #d4d4d4;
        `;
        debugPre.textContent = JSON.stringify(node, null, 2);
        debugSection.appendChild(debugSummary);
        debugSection.appendChild(debugPre);
        content.appendChild(debugSection);
    }

    /**
     * Add text field to properties
     */
    addTextField(container, label, value, onChange) {
        const group = document.createElement('div');
        group.style.cssText = 'margin-bottom: 15px;';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = 'display: block; margin-bottom: 5px; color: #cccccc; font-size: 13px;';

        const input = document.createElement('input');
        input.type = 'text';
        input.value = value;
        input.style.cssText = `
            width: 100%;
            padding: 6px;
            background: #3c3c3c;
            border: 1px solid #3e3e42;
            border-radius: 4px;
            color: #cccccc;
            font-size: 13px;
        `;
        input.oninput = (e) => onChange(e.target.value);

        group.appendChild(labelEl);
        group.appendChild(input);
        container.appendChild(group);
    }

    /**
     * Add text area to properties
     */
    addTextArea(container, label, value, onChange) {
        const group = document.createElement('div');
        group.style.cssText = 'margin-bottom: 15px;';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = 'display: block; margin-bottom: 5px; color: #cccccc; font-size: 13px;';

        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.rows = 4;
        textarea.style.cssText = `
            width: 100%;
            padding: 6px;
            background: #3c3c3c;
            border: 1px solid #3e3e42;
            border-radius: 4px;
            color: #cccccc;
            font-size: 13px;
            font-family: 'Consolas', 'Monaco', monospace;
            resize: vertical;
        `;
        textarea.oninput = (e) => onChange(e.target.value);

        group.appendChild(labelEl);
        group.appendChild(textarea);
        container.appendChild(group);
    }

    /**
     * Add select field to properties
     */
    addSelectField(container, label, value, options, onChange) {
        const group = document.createElement('div');
        group.style.cssText = 'margin-bottom: 15px;';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = 'display: block; margin-bottom: 5px; color: #cccccc; font-size: 13px;';

        const select = document.createElement('select');
        select.style.cssText = `
            width: 100%;
            padding: 6px;
            background: #3c3c3c;
            border: 1px solid #3e3e42;
            border-radius: 4px;
            color: #cccccc;
            font-size: 13px;
        `;

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            option.selected = opt === value;
            select.appendChild(option);
        });

        select.onchange = (e) => onChange(e.target.value);

        group.appendChild(labelEl);
        group.appendChild(select);
        container.appendChild(group);
    }

    /**
     * Update node preview text
     */
    updateNodePreview(node) {
        const nodeEl = document.getElementById(`sargem-node-${node.id}`);
        if (!nodeEl) return;

        const preview = nodeEl.querySelector('div:last-child');
        if (preview) {
            preview.textContent = this.getNodePreview(node);
        }
    }

    /**
     * Delete a node
     */
    deleteNode(node) {
        if (!confirm(`Delete node "${node.name}"?`)) return;

        // Remove connections
        this.connections = this.connections.filter(conn => {
            if (conn.fromId === node.id || conn.toId === node.id) {
                const connEl = document.getElementById(`sargem-conn-${conn.id}`);
                if (connEl) connEl.remove();
                return false;
            }
            return true;
        });

        // Remove from array
        this.nodes = this.nodes.filter(n => n.id !== node.id);

        // Remove from DOM
        const nodeEl = document.getElementById(`sargem-node-${node.id}`);
        if (nodeEl) nodeEl.remove();

        // Clear properties
        const content = document.getElementById('sargem-properties-content');
        content.style.textAlign = 'center';
        content.style.marginTop = '40px';
        content.textContent = 'Select a node to edit properties';

        this.selectedNode = null;
        this.markAsChanged();
        console.log('🗑️ Deleted node:', node.name);
    }

    /**
     * Grid transform
     */
    updateGridTransform() {
        const canvas = document.getElementById('sargem-canvas');
        canvas.style.transform = `translate(${this.gridOffsetX}px, ${this.gridOffsetY}px) scale(${this.gridScale})`;
    }

    /**
     * Zoom
     */
    zoom(factor) {
        this.gridScale *= factor;
        this.gridScale = Math.max(0.3, Math.min(2, this.gridScale));
        this.updateGridTransform();
    }

    /**
     * Reset view
     */
    resetView() {
        this.gridScale = 1;
        this.gridOffsetX = 0;
        this.gridOffsetY = 0;
        this.updateGridTransform();
    }

    /**
     * Center view
     */
    centerView(container) {
        const rect = container.getBoundingClientRect();
        this.gridOffsetX = rect.width / 2 - 1500;
        this.gridOffsetY = rect.height / 2 - 1500;
        this.updateGridTransform();
    }

    /**
     * Toggle connection mode
     */
    toggleConnectMode() {
        this.isConnecting = !this.isConnecting;
        
        const btn = document.querySelector('.control-btn:nth-child(4)');
        if (btn) {
            btn.style.background = this.isConnecting ? '#0e8c0e' : '#3a3a3a';
        }
        
        if (this.isConnecting) {
            console.log('🔗 Connection mode ON - Click two nodes to connect');
        } else {
            this.connectionStartNode = null;
            console.log('🔗 Connection mode OFF');
        }
    }

    /**
     * Start connection from a node
     */
    startConnection(node) {
        if (!this.isConnecting) return;

        if (!this.connectionStartNode) {
            // First node - start connection
            this.connectionStartNode = node;
            const nodeEl = document.getElementById(`sargem-node-${node.id}`);
            if (nodeEl) nodeEl.style.boxShadow = '0 0 15px #0e8c0e';
            console.log('🔗 Connection started from:', node.name);
        } else if (this.connectionStartNode.id === node.id) {
            // Same node - cancel
            this.cancelConnection();
        } else {
            // Second node - finish connection
            this.finishConnection(node);
        }
    }

    /**
     * Finish connection to target node
     */
    finishConnection(targetNode) {
        const sourceNode = this.connectionStartNode;

        // Check if already connected
        const exists = this.connections.find(c => 
            c.fromId === sourceNode.id && c.toId === targetNode.id
        );

        if (exists) {
            alert('These nodes are already connected!');
            this.cancelConnection();
            return;
        }

        // Create connection
        const connId = ++this.lastConnectionId;
        const connection = {
            id: connId,
            fromId: sourceNode.id,
            toId: targetNode.id
        };

        this.connections.push(connection);

        // Update node connections
        sourceNode.outputs.push(targetNode.id);
        targetNode.inputs.push(sourceNode.id);

        // Draw connection
        this.drawConnection(connection);

        // Reset
        const sourceEl = document.getElementById(`sargem-node-${sourceNode.id}`);
        if (sourceEl) sourceEl.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';

        this.connectionStartNode = null;
        this.markAsChanged();
        console.log('✅ Connected:', sourceNode.name, '→', targetNode.name);
    }

    /**
     * Cancel connection
     */
    cancelConnection() {
        if (this.connectionStartNode) {
            const nodeEl = document.getElementById(`sargem-node-${this.connectionStartNode.id}`);
            if (nodeEl) nodeEl.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        }
        this.connectionStartNode = null;
        console.log('❌ Connection cancelled');
    }

    /**
     * Draw a connection line
     */
    drawConnection(conn) {
        const canvas = document.getElementById('sargem-canvas');
        const fromNode = this.nodes.find(n => n.id === conn.fromId);
        const toNode = this.nodes.find(n => n.id === conn.toId);

        if (!fromNode || !toNode) return;

        // Calculate positions (center of nodes)
        const fromX = fromNode.x + 75; // 150/2
        const fromY = fromNode.y + 60;
        const toX = toNode.x + 75;
        const toY = toNode.y + 60;

        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // Create line
        const line = document.createElement('div');
        line.id = `sargem-conn-${conn.id}`;
        line.className = 'sargem-connection';
        line.style.cssText = `
            position: absolute;
            left: ${fromX}px;
            top: ${fromY}px;
            width: ${distance}px;
            height: 4px;
            background: #2ecc71;
            transform-origin: 0 0;
            transform: rotate(${angle}rad);
            pointer-events: none;
            opacity: 0.7;
            z-index: 1;
        `;

        // Create arrow
        const arrow = document.createElement('div');
        arrow.className = 'sargem-arrow';
        arrow.style.cssText = `
            position: absolute;
            left: ${toX - 6}px;
            top: ${toY}px;
            width: 0;
            height: 0;
            border-left: 12px solid #2ecc71;
            border-top: 6px solid transparent;
            border-bottom: 6px solid transparent;
            transform: rotate(${angle}rad) translateY(-50%);
            pointer-events: none;
            opacity: 0.7;
            z-index: 1;
        `;

        // Click to delete connection
        const hitbox = document.createElement('div');
        hitbox.style.cssText = `
            position: absolute;
            left: ${fromX}px;
            top: ${fromY - 8}px;
            width: ${distance}px;
            height: 20px;
            transform-origin: 0 0;
            transform: rotate(${angle}rad);
            cursor: pointer;
            z-index: 2;
        `;
        hitbox.onclick = () => {
            if (confirm('Delete this connection?')) {
                this.deleteConnection(conn.id);
            }
        };
        hitbox.onmouseover = () => {
            line.style.background = '#e74c3c';
            arrow.style.borderLeftColor = '#e74c3c';
        };
        hitbox.onmouseout = () => {
            line.style.background = '#2ecc71';
            arrow.style.borderLeftColor = '#2ecc71';
        };

        canvas.appendChild(line);
        canvas.appendChild(arrow);
        canvas.appendChild(hitbox);
    }

    /**
     * Delete a connection
     */
    deleteConnection(connId) {
        const conn = this.connections.find(c => c.id === connId);
        if (!conn) return;

        // Remove from nodes
        const fromNode = this.nodes.find(n => n.id === conn.fromId);
        const toNode = this.nodes.find(n => n.id === conn.toId);

        if (fromNode) {
            fromNode.outputs = fromNode.outputs.filter(id => id !== conn.toId);
        }
        if (toNode) {
            toNode.inputs = toNode.inputs.filter(id => id !== conn.fromId);
        }

        // Remove from array
        this.connections = this.connections.filter(c => c.id !== connId);

        // Remove from DOM
        const line = document.getElementById(`sargem-conn-${connId}`);
        if (line) line.remove();
        
        const arrows = document.querySelectorAll('.sargem-arrow');
        const hitboxes = document.querySelectorAll('div[style*="cursor: pointer"]');
        // Simple cleanup - remove all and redraw
        arrows.forEach(a => a.remove());
        hitboxes.forEach(h => h.remove());
        
        this.redrawConnections();

        this.markAsChanged();
        console.log('🗑️ Deleted connection');
    }

    /**
     * Redraw all connections
     */
    redrawConnections() {
        // Clear all
        document.querySelectorAll('.sargem-connection, .sargem-arrow').forEach(el => el.remove());
        
        // Redraw
        this.connections.forEach(conn => this.drawConnection(conn));
    }

    /**
     * File operations
     */
    async autoLoad() {
        try {
            const data = await ElectronFileSystem.autoLoadTutorials();
            if (data) {
                console.log('🐈‍⬛ Auto-loaded:', data);
                // TODO: Load nodes from data
            }
        } catch (error) {
            console.error('Auto-load error:', error);
        }
    }

    async openFile() {
        console.log('📂 Open file...');
        // TODO: Implement
    }

    newFile() {
        if (confirm('Create a new quest? This will clear the current canvas.')) {
            this.nodes = [];
            this.connections = [];
            document.getElementById('sargem-canvas').innerHTML = '';
            console.log('📄 New file created');
        }
    }

    async quickSave() {
        console.log('💾 Quick save...');
        // TODO: Implement
    }

    async saveAs() {
        console.log('💾 Save as...');
        // TODO: Implement
    }

    async testQuest() {
        if (this.nodes.length === 0) {
            alert('⚠️ Add some nodes first!');
            return;
        }

        console.log('▶️ Testing quest...');

        // Convert nodes to quest format
        const questData = {
            id: 'sargem_test_quest',
            name: 'Test Quest',
            nodes: this.nodes,
            connections: this.connections
        };

        // Hide editor modal (keep in memory)
        const modal = document.getElementById('sargem-modal');
        if (modal) modal.style.display = 'none';

        // Re-enable game controls for testing
        if (this.voxelWorld) {
            this.voxelWorld.controlsEnabled = true;
            console.log('🎮 Game controls re-enabled for testing');
        }

        // Show HUD button to return to Sargem
        this.showTestHUD();

        // 🎯 Run the quest!
        this.questRunner.startQuest(questData);
    }

    /**
     * Show HUD button during testing
     */
    showTestHUD() {
        // Remove existing HUD if any
        const existing = document.getElementById('sargem-test-hud');
        if (existing) existing.remove();

        const hud = document.createElement('div');
        hud.id = 'sargem-test-hud';
        hud.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 50000;
            display: flex;
            gap: 10px;
        `;

        const stopBtn = document.createElement('button');
        stopBtn.innerHTML = '⏹️ Stop Test';
        stopBtn.style.cssText = `
            background: #e74c3c;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
            transition: all 0.2s;
        `;
        stopBtn.onmouseover = () => stopBtn.style.background = '#c0392b';
        stopBtn.onmouseout = () => stopBtn.style.background = '#e74c3c';
        stopBtn.onclick = () => this.stopTest();

        const returnBtn = document.createElement('button');
        returnBtn.innerHTML = '🐈‍⬛ Back to Sargem';
        returnBtn.style.cssText = `
            background: #0e8c0e;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(14, 140, 14, 0.4);
            transition: all 0.2s;
        `;
        returnBtn.onmouseover = () => returnBtn.style.background = '#0a6b0a';
        returnBtn.onmouseout = () => returnBtn.style.background = '#0e8c0e';
        returnBtn.onclick = () => this.returnToEditor();

        hud.appendChild(stopBtn);
        hud.appendChild(returnBtn);
        document.body.appendChild(hud);
    }

    /**
     * Stop test and close quest
     */
    stopTest() {
        // Stop the quest runner
        if (this.questRunner) {
            this.questRunner.stopQuest();
        }

        // Stop all running tutorials
        if (this.voxelWorld?.tutorialScriptSystem) {
            this.voxelWorld.tutorialScriptSystem.stopAll();
        }

        // Cleanup any NPCs spawned by the quest
        if (this.voxelWorld?.cleanupQuestNPCs) {
            this.voxelWorld.cleanupQuestNPCs();
        }

        // Remove HUD (both buttons)
        const hud = document.getElementById('sargem-test-hud');
        if (hud) hud.remove();

        console.log('⏹️ Test stopped - NPCs cleaned up');
    }

    /**
     * Return to editor from test
     */
    returnToEditor() {
        // Stop test first
        this.stopTest();

        // Show editor modal
        const modal = document.getElementById('sargem-modal');
        if (modal) modal.style.display = 'flex';

        // Disable game controls
        if (this.voxelWorld) {
            this.voxelWorld.controlsEnabled = false;
            console.log('🐈‍⬛ Sargem is in charge - controls disabled');
        }
    }

    /**
     * Mark as changed and trigger autosave
     */
    markAsChanged() {
        this.hasUnsavedChanges = true;
        
        // Update title to show unsaved state
        const title = document.querySelector('#sargem-header h2');
        if (title && !title.textContent.includes('*')) {
            title.textContent = title.textContent + ' *';
        }

        // Start autosave timer if not already running
        if (!this.autosaveTimer) {
            this.autosaveTimer = setInterval(() => this.autoSaveToTemp(), 30000); // Every 30 seconds
        }
    }

    /**
     * Auto-save to temp storage
     */
    autoSaveToTemp() {
        const data = {
            nodes: this.nodes,
            connections: this.connections,
            timestamp: Date.now()
        };

        try {
            localStorage.setItem('sargem_autosave', JSON.stringify(data));
            console.log('💾 Auto-saved to localStorage');
        } catch (error) {
            console.error('Autosave error:', error);
        }
    }

    /**
     * Check for temp file on open
     */
    async checkForTempFile() {
        try {
            const data = localStorage.getItem('sargem_autosave');
            if (data) {
                const parsed = JSON.parse(data);
                const date = new Date(parsed.timestamp);
                const restore = confirm(`🐈‍⬛ Found autosaved work from ${date.toLocaleString()}. Restore it?`);
                
                if (restore) {
                    this.nodes = parsed.nodes || [];
                    this.connections = parsed.connections || [];
                    
                    // Render all nodes
                    this.nodes.forEach(node => this.renderNode(node));
                    this.redrawConnections();
                    
                    console.log('✅ Restored from autosave');
                } else {
                    localStorage.removeItem('sargem_autosave');
                }
            }
        } catch (error) {
            console.error('Temp file check error:', error);
        }
    }
}
