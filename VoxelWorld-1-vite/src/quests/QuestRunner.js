/**
 * 🐈‍⬛ Quest Runner
 * Executes quest scripts created in Sargem Quest Editor
 * Handles dialogue, choices, NPCs, items, combat, etc.
 */

import { ChatOverlay } from '../ui/Chat.js';

export class QuestRunner {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;
        this.chatOverlay = new ChatOverlay();
        
        // Current quest state
        this.currentQuest = null;
        this.currentNodeId = null;
        this.questNPCs = [];
        this.isRunning = false;
        
        // Quest data (nodes + connections from Sargem)
        this.nodes = [];
        this.connections = [];
        
        // Node counters for debug labels
        this.nodeCounters = {};
    }

    /**
     * Load and start a quest
     * @param {Object} questData - Quest data from Sargem editor { nodes: [], connections: [] }
     */
    startQuest(questData) {
        if (this.isRunning) {
            console.warn('⚠️ Quest already running!');
            return;
        }

        this.nodes = questData.nodes || [];
        this.connections = questData.connections || [];
        this.isRunning = true;
        
        // Reset node counters for debug labels
        this.nodeCounters = {};

        console.log('🎮 Starting quest with', this.nodes.length, 'nodes');

        // Find the start node (first node or node with no incoming connections)
        const startNode = this.findStartNode();
        if (startNode) {
            this.executeNode(startNode);
        } else {
            console.error('❌ No start node found!');
            this.stopQuest();
        }
    }

    /**
     * Find the starting node of the quest
     */
    findStartNode() {
        // Find node with no incoming connections (or just use first node)
        const nodesWithIncoming = new Set();
        this.connections.forEach(conn => {
            // Sargem uses 'toId', not 'targetId'
            nodesWithIncoming.add(conn.toId || conn.targetId);
        });

        console.log('🔍 Finding start node...');
        console.log('  Nodes:', this.nodes.map(n => ({ id: n.id, type: n.type })));
        console.log('  Connections:', this.connections.map(c => ({ from: c.fromId || c.sourceId, to: c.toId || c.targetId })));
        console.log('  Incoming targets:', Array.from(nodesWithIncoming));

        const startNode = this.nodes.find(node => !nodesWithIncoming.has(node.id));
        
        if (!startNode) {
            console.warn('⚠️ No node without incoming connections, using first node');
            return this.nodes[0];
        }
        
        console.log(`✅ Start node found: ${startNode.id} (${startNode.type})`);
        return startNode;
    }

    /**
     * Execute a node based on its type
     */
    executeNode(node) {
        if (!node) {
            console.log('✅ Quest complete - no more nodes');
            this.stopQuest();
            return;
        }

        this.currentNodeId = node.id;
        
        // Create debug label with counter
        const type = node.type;
        if (!this.nodeCounters[type]) {
            this.nodeCounters[type] = 0;
        }
        this.nodeCounters[type]++;
        const label = `${type.charAt(0).toUpperCase() + type.slice(1)} ${this.nodeCounters[type]}`;
        
        console.log(`🎬 Executing ${label} (node ${node.id}):`, node.data);

        switch (node.type) {
            case 'dialogue':
                this.executeDialogue(node);
                break;
            
            case 'choice':
                this.executeChoice(node);
                break;
            
            case 'image':
                this.executeImage(node);
                break;
            
            case 'combat':
                this.executeCombat(node);
                break;
            
            case 'item':
                this.executeItem(node);
                break;
            
            case 'condition':
                this.executeCondition(node);
                break;
            
            case 'trigger':
                this.executeTrigger(node);
                break;
            
            default:
                console.warn(`⚠️ Unknown node type: ${node.type}`);
                this.goToNext(node);
        }
    }

    /**
     * Show dialogue and spawn NPC if needed
     * Uses Storyboard pattern: execute node, then callback to next
     */
    executeDialogue(node) {
        const data = node.data;
        const speaker = data.speaker || 'companion';
        const text = data.text || 'Hello!';
        const emoji = speaker === 'companion' ? '🐈‍⬛' : data.emoji || '🙂';

        // Spawn NPC if speaker is 'companion' or an NPC name
        if (speaker === 'companion' && this.questNPCs.length === 0) {
            const npc = this.voxelWorld.spawnNPC('🐈‍⬛', 'Sargem', 3);
            if (npc) {
                this.questNPCs.push(npc);
            }
        }

        // Show dialogue using Chat overlay with callback
        this.chatOverlay.showMessage({
            character: speaker,
            name: speaker === 'companion' ? 'Sargem' : speaker,
            text: text,
            emoji: emoji
        }, () => {
            // Callback: Find next node and execute it
            this.goToNext(node);
        });
    }

    /**
     * Show choice dialog (Yes/No or multiple options)
     * Uses Storyboard pattern: show choices, callback with selected index
     */
    executeChoice(node) {
        const data = node.data;
        const question = data.question || 'Choose:';
        const options = data.options || ['Yes', 'No'];

        // Create choice overlay with callback
        this.showChoiceDialog(question, options, (chosenIndex) => {
            // Find connection for this choice - Sargem uses fromId/toId
            const outgoing = this.connections.filter(c => 
                (c.fromId || c.sourceId) === node.id
            );
            
            // Sort by handle index (output_0, output_1, etc.)
            outgoing.sort((a, b) => {
                const aIndex = parseInt(a.sourceHandle?.split('_')[1] || 0);
                const bIndex = parseInt(b.sourceHandle?.split('_')[1] || 0);
                return aIndex - bIndex;
            });

            // Get the connection for chosen option
            const connection = outgoing[chosenIndex];
            if (connection) {
                const targetId = connection.toId || connection.targetId;
                const nextNode = this.nodes.find(n => n.id === targetId);
                this.executeNode(nextNode);
            } else {
                console.warn('⚠️ No connection found for choice', chosenIndex);
                this.stopQuest();
            }
        });
    }

    /**
     * Show choice dialog UI
     */
    showChoiceDialog(question, options, onChoose) {
        // Exit pointer lock to enable cursor
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
        
        // Create simple choice overlay
        const overlay = document.createElement('div');
        overlay.id = 'quest-choice-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 60000;
        `;

        // Question text
        const questionEl = document.createElement('div');
        questionEl.textContent = question;
        questionEl.style.cssText = `
            color: white;
            font-size: 24px;
            margin-bottom: 30px;
            text-align: center;
            max-width: 600px;
        `;
        overlay.appendChild(questionEl);

        // Choice buttons
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.cssText = `
            display: flex;
            gap: 20px;
        `;

        options.forEach((option, index) => {
            const button = document.createElement('button');
            button.textContent = option;
            button.style.cssText = `
                padding: 15px 40px;
                font-size: 18px;
                background: #4ec9b0;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                transition: background 0.2s;
            `;
            button.onmouseover = () => button.style.background = '#6ed9c0';
            button.onmouseout = () => button.style.background = '#4ec9b0';
            button.onclick = () => {
                document.body.removeChild(overlay);
                
                // Re-request pointer lock after choice
                setTimeout(() => {
                    if (this.voxelWorld.controlsEnabled && this.voxelWorld.renderer?.domElement) {
                        this.voxelWorld.renderer.domElement.requestPointerLock();
                    }
                }, 100);
                
                onChoose(index);
            };
            buttonsContainer.appendChild(button);
        });

        overlay.appendChild(buttonsContainer);
        document.body.appendChild(overlay);
    }

    /**
     * Execute image node (show image overlay)
     */
    executeImage(node) {
        const data = node.data;
        let imagePath = data.path || '';
        const duration = data.duration || 3;

        // In Electron production mode, images are relative to dist/
        // The HTML is loaded from dist/index.html, so assets/ works correctly
        // But just in case, we can check if file doesn't load and show error
        console.log(`🖼️ Loading image from: ${imagePath}`);

        // Exit pointer lock to enable cursor
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }

        // Create image overlay with dimmed background
        const overlay = document.createElement('div');
        overlay.id = 'quest-image-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 60000;
        `;

        // Image container
        const imgContainer = document.createElement('div');
        imgContainer.style.cssText = `
            position: relative;
            max-width: 90vw;
            max-height: 90vh;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

        // Image element
        const img = document.createElement('img');
        img.src = imagePath;
        img.style.cssText = `
            max-width: 100%;
            max-height: 90vh;
            width: auto;
            height: auto;
            object-fit: contain;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        `;

        // Close button [X]
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `
            position: absolute;
            top: -40px;
            right: -40px;
            width: 32px;
            height: 32px;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border: 2px solid white;
            border-radius: 50%;
            cursor: pointer;
            font-size: 20px;
            line-height: 1;
            transition: background 0.2s;
        `;
        closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255, 255, 255, 0.4)';
        closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        closeBtn.onclick = () => {
            document.body.removeChild(overlay);
            
            // Re-request pointer lock
            setTimeout(() => {
                if (this.voxelWorld.controlsEnabled && this.voxelWorld.renderer?.domElement) {
                    this.voxelWorld.renderer.domElement.requestPointerLock();
                }
            }, 100);
            
            this.goToNext(node);
        };

        imgContainer.appendChild(img);
        imgContainer.appendChild(closeBtn);
        overlay.appendChild(imgContainer);
        document.body.appendChild(overlay);

        console.log(`🖼️ Showing image: ${imagePath}`);
    }

    /**
     * Execute combat node
     */
    executeCombat(node) {
        const data = node.data;
        const enemy = data.enemy || 'goblin_grunt';
        const level = data.level || 1;

        console.log(`⚔️ Starting combat with ${enemy} (level ${level})`);
        
        // TODO: Integrate with battle system
        // For now, just continue
        setTimeout(() => {
            this.goToNext(node);
        }, 1000);
    }

    /**
     * Execute item node (give/take items)
     */
    executeItem(node) {
        const data = node.data;
        const action = data.action || 'give';
        const itemId = data.itemId || '';
        const amount = data.amount || 1;

        console.log(`🎁 ${action} ${amount}x ${itemId}`);
        
        // TODO: Integrate with inventory system
        this.goToNext(node);
    }

    /**
     * Execute condition node (check inventory/state)
     */
    executeCondition(node) {
        const data = node.data;
        const checkType = data.checkType || 'hasItem';
        const value = data.value || '';

        console.log(`🔀 Checking condition: ${checkType} = ${value}`);
        
        // TODO: Implement condition checking
        // For now, assume success and go to first output
        this.goToNext(node);
    }

    /**
     * Execute trigger node (fire game event)
     */
    executeTrigger(node) {
        const data = node.data;
        const event = data.event || '';
        const params = data.params || {};

        console.log(`⚡ Triggering event: ${event}`, params);
        
        // TODO: Implement event system
        this.goToNext(node);
    }

    /**
     * Go to the next connected node
     */
    goToNext(currentNode, outputIndex = 0) {
        const nextNode = this.getNextNode(currentNode, outputIndex);
        
        if (nextNode) {
            this.executeNode(nextNode);
        } else {
            console.log('✅ Quest complete - end of chain');
            this.stopQuest();
        }
    }

    /**
     * Get the next connected node without executing it
     */
    getNextNode(currentNode, outputIndex = 0) {
        // Find outgoing connection - Sargem uses fromId/toId
        const outgoing = this.connections.filter(c => 
            (c.fromId || c.sourceId) === currentNode.id
        );
        
        if (outgoing.length === 0) {
            return null;
        }

        // Use specified output or first one
        const connection = outgoing[outputIndex] || outgoing[0];
        const targetId = connection.toId || connection.targetId;
        const nextNode = this.nodes.find(n => n.id === targetId);
        
        return nextNode || null;
    }

    /**
     * Stop the quest and cleanup
     */
    stopQuest() {
        console.log('🛑 Stopping quest');
        
        this.isRunning = false;
        this.currentQuest = null;
        this.currentNodeId = null;
        this.nodes = [];
        this.connections = [];
        
        // Cleanup quest NPCs
        this.cleanupNPCs();
    }

    /**
     * Cleanup all quest NPCs
     */
    cleanupNPCs() {
        this.questNPCs.forEach(npc => {
            if (npc && npc.id) {
                this.voxelWorld.npcManager?.remove(npc.id);
            }
        });
        this.questNPCs = [];
    }
}
