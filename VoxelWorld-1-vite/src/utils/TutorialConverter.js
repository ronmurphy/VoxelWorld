/**
 * TutorialConverter - Bidirectional conversion between Drawflow and Tutorial JSON formats
 * Converts visual node graphs to game-compatible tutorial scripts and vice versa
 */

export class TutorialConverter {
    /**
     * Convert Drawflow format to Tutorial JSON format
     * @param {Object} drawflowData - Drawflow export data
     * @returns {Object} Tutorial JSON format
     */
    static drawflowToTutorial(drawflowData) {
        const tutorials = {};
        
        // Get the Home module (default Drawflow module)
        const nodes = drawflowData.drawflow?.Home?.data || {};
        
        // Convert each node to a tutorial entry
        for (const [nodeId, node] of Object.entries(nodes)) {
            const tutorialId = this.generateTutorialId(node);
            const tutorial = this.convertNodeToTutorial(node, nodes);
            
            if (tutorial) {
                tutorials[tutorialId] = tutorial;
            }
        }
        
        return {
            tutorials: tutorials
        };
    }

    /**
     * Convert Tutorial JSON format to Drawflow format
     * @param {Object} tutorialData - Tutorial JSON data
     * @returns {Object} Drawflow format
     */
    static tutorialToDrawflow(tutorialData) {
        const drawflowNodes = {};
        let nodeCounter = 1;
        const tutorialToNodeMap = {}; // Map tutorial IDs to node IDs
        
        // Convert each tutorial to a Drawflow node
        for (const [tutorialId, tutorial] of Object.entries(tutorialData.tutorials || {})) {
            const nodeId = nodeCounter++;
            tutorialToNodeMap[tutorialId] = nodeId;
            
            drawflowNodes[nodeId] = this.convertTutorialToNode(
                nodeId,
                tutorialId,
                tutorial,
                nodeCounter * 250,
                Math.floor((nodeCounter - 1) / 3) * 200 + 100
            );
        }
        
        // TODO: Add connections based on tutorial flow logic
        // This would require analyzing message sequences and triggers
        
        return {
            drawflow: {
                Home: {
                    data: drawflowNodes
                }
            }
        };
    }

    /**
     * Generate a tutorial ID from node data
     */
    static generateTutorialId(node) {
        const data = node.data || {};
        
        // Use explicit ID if provided
        if (data.tutorialId) {
            return data.tutorialId;
        }
        
        // Generate from node type and content
        switch (data.type) {
            case 'dialogue':
                const speaker = data.speaker || 'npc';
                const text = (data.text || '').substring(0, 20).toLowerCase().replace(/\s+/g, '_');
                return `${speaker}_${text}_${node.id}`;
            
            case 'choice':
                return `choice_${node.id}`;
            
            case 'combat':
                return `combat_${data.enemy || 'enemy'}_${node.id}`;
            
            case 'item':
                return `${data.action}_item_${data.itemId || 'item'}_${node.id}`;
            
            default:
                return `tutorial_${data.type || 'unknown'}_${node.id}`;
        }
    }

    /**
     * Convert a Drawflow node to a tutorial entry
     */
    static convertNodeToTutorial(node, allNodes) {
        const data = node.data || {};
        
        switch (data.type) {
            case 'dialogue':
                return {
                    id: this.generateTutorialId(node),
                    title: `${data.speaker} dialogue`,
                    trigger: data.trigger || 'manual',
                    once: data.once !== false,
                    messages: [
                        {
                            speaker: data.speaker || 'companion',
                            text: data.text || ''
                        }
                    ]
                };
            
            case 'choice':
                return {
                    id: this.generateTutorialId(node),
                    title: 'Player choice',
                    trigger: data.trigger || 'manual',
                    once: data.once !== false,
                    messages: [
                        {
                            speaker: 'system',
                            text: data.question || '',
                            choices: (data.options || []).filter(opt => opt && opt.trim())
                        }
                    ]
                };
            
            case 'combat':
                return {
                    id: this.generateTutorialId(node),
                    title: `Combat: ${data.enemy}`,
                    trigger: data.trigger || 'manual',
                    once: data.once !== false,
                    combat: {
                        enemy: data.enemy || 'ghost',
                        level: data.level || 1
                    }
                };
            
            case 'image':
                return {
                    id: this.generateTutorialId(node),
                    title: 'Show image',
                    trigger: data.trigger || 'manual',
                    once: data.once !== false,
                    image: {
                        path: data.path || '',
                        duration: data.duration || 3
                    }
                };
            
            case 'item':
                return {
                    id: this.generateTutorialId(node),
                    title: `${data.action} item`,
                    trigger: data.trigger || 'manual',
                    once: data.once !== false,
                    item: {
                        action: data.action || 'give',
                        itemId: data.itemId || '',
                        amount: data.amount || 1
                    }
                };
            
            case 'condition':
                return {
                    id: this.generateTutorialId(node),
                    title: 'Condition check',
                    trigger: data.trigger || 'manual',
                    once: false, // Conditions can repeat
                    condition: {
                        type: data.checkType || 'hasItem',
                        value: data.value || ''
                    }
                };
            
            case 'trigger':
                return {
                    id: this.generateTutorialId(node),
                    title: `Trigger: ${data.event}`,
                    trigger: data.trigger || 'manual',
                    once: data.once !== false,
                    event: {
                        name: data.event || '',
                        params: data.params || {}
                    }
                };
            
            default:
                console.warn('Unknown node type:', data.type);
                return null;
        }
    }

    /**
     * Convert a tutorial entry to a Drawflow node
     */
    static convertTutorialToNode(nodeId, tutorialId, tutorial, posX, posY) {
        const nodeData = {
            tutorialId: tutorialId,
            trigger: tutorial.trigger || 'manual',
            once: tutorial.once !== false
        };
        
        let nodeType = 'dialogue';
        let inputs = 1;
        let outputs = 1;
        let html = '';
        
        // Determine node type from tutorial structure
        if (tutorial.messages && tutorial.messages.length > 0) {
            const firstMessage = tutorial.messages[0];
            
            if (firstMessage.choices && firstMessage.choices.length > 0) {
                nodeType = 'choice';
                outputs = Math.min(firstMessage.choices.length, 3);
                nodeData.type = 'choice';
                nodeData.question = firstMessage.text;
                nodeData.options = firstMessage.choices;
                html = `<div class="title">❓ Choice</div><div class="content">${firstMessage.text?.substring(0, 30) || ''}...</div>`;
            } else {
                nodeType = 'dialogue';
                nodeData.type = 'dialogue';
                nodeData.speaker = firstMessage.speaker || 'companion';
                nodeData.text = firstMessage.text || '';
                html = `<div class="title">💬 Dialogue</div><div class="content">${nodeData.text.substring(0, 30) || ''}...</div>`;
            }
        } else if (tutorial.combat) {
            nodeType = 'combat';
            outputs = 2; // Win/Lose
            nodeData.type = 'combat';
            nodeData.enemy = tutorial.combat.enemy;
            nodeData.level = tutorial.combat.level;
            html = `<div class="title">⚔️ Combat</div><div class="content">${nodeData.enemy} Lvl ${nodeData.level}</div>`;
        } else if (tutorial.image) {
            nodeType = 'image';
            nodeData.type = 'image';
            nodeData.path = tutorial.image.path;
            nodeData.duration = tutorial.image.duration;
            html = `<div class="title">🖼️ Image</div><div class="content">${nodeData.path}</div>`;
        } else if (tutorial.item) {
            nodeType = 'item';
            nodeData.type = 'item';
            nodeData.action = tutorial.item.action;
            nodeData.itemId = tutorial.item.itemId;
            nodeData.amount = tutorial.item.amount;
            html = `<div class="title">🎁 Item</div><div class="content">${nodeData.action} ${nodeData.itemId}</div>`;
        } else if (tutorial.condition) {
            nodeType = 'condition';
            outputs = 2; // True/False
            nodeData.type = 'condition';
            nodeData.checkType = tutorial.condition.type;
            nodeData.value = tutorial.condition.value;
            html = `<div class="title">🔀 Condition</div><div class="content">${nodeData.checkType}</div>`;
        } else if (tutorial.event) {
            nodeType = 'trigger';
            nodeData.type = 'trigger';
            nodeData.event = tutorial.event.name;
            nodeData.params = tutorial.event.params;
            html = `<div class="title">⚡ Trigger</div><div class="content">${nodeData.event}</div>`;
        }
        
        return {
            id: nodeId,
            name: nodeType,
            data: nodeData,
            class: nodeType,
            html: html,
            inputs: this.generateInputs(inputs),
            outputs: this.generateOutputs(outputs),
            pos_x: posX,
            pos_y: posY
        };
    }

    /**
     * Generate Drawflow input structure
     */
    static generateInputs(count) {
        const inputs = {};
        for (let i = 1; i <= count; i++) {
            inputs[`input_${i}`] = { connections: [] };
        }
        return inputs;
    }

    /**
     * Generate Drawflow output structure
     */
    static generateOutputs(count) {
        const outputs = {};
        for (let i = 1; i <= count; i++) {
            outputs[`output_${i}`] = { connections: [] };
        }
        return outputs;
    }
}
