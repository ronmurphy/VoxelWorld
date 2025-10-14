/**
 * TutorialScriptSystem.js
 * 
 * Event-driven tutorial system that loads scripts from tutorialScripts.json
 * Tracks seen tutorials, shows companion messages at appropriate times,
 * and handles sequential message sequences with delays.
 */

import { ChatOverlay } from './Chat.js';

export class TutorialScriptSystem {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;
        this.chat = new ChatOverlay();
        this.scripts = null;
        this.loading = true;
        
        // Load tutorial state from localStorage
        const playerData = JSON.parse(localStorage.getItem('NebulaWorld_playerData') || '{}');
        this.tutorialsSeen = playerData.tutorialsSeen || {};
        
        // Load companion info
        this.companionId = playerData.selectedCompanion || playerData.starterMonster || 'rat';
        this.companionName = this.getCompanionName(this.companionId);
        
        // Load scripts asynchronously
        this.loadScripts();
        
        console.log('🎓 TutorialScriptSystem initialized');
    }

    /**
     * Load tutorial scripts from JSON file
     */
    async loadScripts() {
        try {
            const response = await fetch('./data/tutorialScripts.json');
            if (!response.ok) {
                throw new Error(`Failed to load tutorial scripts: ${response.status}`);
            }
            this.scripts = await response.json();
            this.loading = false;
            console.log(`🎓 Loaded ${Object.keys(this.scripts.tutorials).length} tutorial scripts`);
        } catch (error) {
            console.error('🎓 Failed to load tutorial scripts:', error);
            this.scripts = { tutorials: {} };
            this.loading = false;
        }
    }

    /**
     * Get companion display name from ID
     */
    getCompanionName(companionId) {
        const names = {
            'rat': 'Scrappy',
            'goblin_grunt': 'Grunk',
            'troglodyte': 'Troggle',
            'skeleton': 'Bones',
            'ghost': 'Whisper',
            'vampire': 'Vlad'
        };
        return names[companionId] || 'Companion';
    }

    /**
     * Mark a tutorial as seen and save to localStorage
     */
    markSeen(tutorialId) {
        this.tutorialsSeen[tutorialId] = true;
        
        const playerData = JSON.parse(localStorage.getItem('NebulaWorld_playerData') || '{}');
        playerData.tutorialsSeen = this.tutorialsSeen;
        localStorage.setItem('NebulaWorld_playerData', JSON.stringify(playerData));
        
        console.log(`🎓 Tutorial marked as seen: ${tutorialId}`);
    }

    /**
     * Check if a tutorial has been shown
     */
    hasSeen(tutorialId) {
        return this.tutorialsSeen[tutorialId] === true;
    }

    /**
     * Show a tutorial by ID
     * @param {string} tutorialId - The tutorial ID from tutorialScripts.json
     * @param {object} context - Optional context data (e.g., {item: 'workbench'})
     */
    async showTutorial(tutorialId, context = {}) {
        // Wait for scripts to load
        while (this.loading) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const tutorial = this.scripts.tutorials[tutorialId];
        if (!tutorial) {
            console.warn(`🎓 Tutorial not found: ${tutorialId}`);
            return false;
        }

        // Check if already seen (if once: true)
        if (tutorial.once && this.hasSeen(tutorialId)) {
            console.log(`🎓 Tutorial already seen: ${tutorialId}`);
            return false;
        }

        // Check item context if specified
        if (tutorial.item && context.item !== tutorial.item) {
            return false;
        }

        // Check animal context if specified
        if (tutorial.animal && context.animal !== tutorial.animal) {
            return false;
        }

        console.log(`🎓 Showing tutorial: ${tutorialId}`);

        // Show message sequence
        await this.showMessageSequence(tutorial.messages);

        // Mark as seen
        if (tutorial.once) {
            this.markSeen(tutorialId);
        }

        return true;
    }

    /**
     * Show a sequence of messages with delays
     * @param {array} messages - Array of {text, delay} objects
     */
    async showMessageSequence(messages) {
        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            
            // Show message
            await new Promise(resolve => {
                this.chat.showMessage({
                    character: this.companionId,
                    name: this.companionName,
                    text: msg.text
                }, resolve);
            });

            // Wait for delay before next message
            if (msg.delay && i < messages.length - 1) {
                await new Promise(resolve => setTimeout(resolve, msg.delay));
            }
        }
    }

    // ========================================================================
    // EVENT HANDLERS - Call these from game code
    // ========================================================================

    /**
     * 🎮 Called when game starts (first time)
     */
    onGameStart() {
        this.showTutorial('game_start');
    }

    /**
     * 🔪 Called when machete is first selected in hotbar
     */
    onMacheteSelected() {
        this.showTutorial('machete_selected');
    }

    /**
     * 🎒 Called when backpack is first opened (E key)
     */
    onBackpackOpened() {
        this.showTutorial('backpack_opened');
    }

    /**
     * 🔨 Called when an item is crafted
     * @param {string} itemId - The item that was crafted (e.g., 'workbench', 'tool_bench')
     */
    onItemCrafted(itemId) {
        // Check for specific item tutorials
        const tutorials = [
            { id: 'workbench_crafted', item: 'workbench' },
            { id: 'tool_bench_crafted', item: 'tool_bench' },
            { id: 'kitchen_bench_crafted', item: 'kitchen_bench' },
            { id: 'torch_crafted', item: 'torch' },
            { id: 'campfire_crafted', item: 'campfire' },
            { id: 'hoe_crafted', item: 'hoe' },
            { id: 'watering_can_crafted', item: 'watering_can' },
            { id: 'light_orb_crafted', item: 'crafted_light_orb' },
            { id: 'spear_crafted', item: 'crafted_stone_spear' }
        ];

        for (const tutorial of tutorials) {
            if (itemId === tutorial.item) {
                this.showTutorial(tutorial.id, { item: itemId });
                break;
            }
        }
    }

    /**
     * 📦 Called when workbench is placed in world
     */
    onWorkbenchPlaced() {
        this.showTutorial('workbench_placed');
    }

    /**
     * 🔧 Called when workbench UI is opened
     */
    onWorkbenchOpened() {
        this.showTutorial('workbench_opened');
    }

    /**
     * 🔨 Called when tool bench UI is opened
     */
    onToolBenchOpened() {
        this.showTutorial('tool_bench_opened');
    }

    /**
     * 🍳 Called when kitchen bench UI is opened
     */
    onKitchenBenchOpened() {
        this.showTutorial('kitchen_bench_opened');
    }

    /**
     * 🔥 Called when campfire is placed
     */
    onCampfirePlaced() {
        this.showTutorial('campfire_placed');
    }

    /**
     * 🌙 Called when night falls (first time)
     */
    onNightfall() {
        this.showTutorial('nightfall');
    }

    /**
     * 👻 Called when a ghost spawns (first time)
     */
    onGhostSpawn() {
        this.showTutorial('first_ghost');
    }

    /**
     * 🐰 Called when an animal spawns (first time per type)
     * @param {string} animalType - The animal type (e.g., 'rabbit')
     */
    onAnimalSpawn(animalType) {
        if (animalType === 'rabbit') {
            this.showTutorial('first_rabbit', { animal: 'rabbit' });
        }
    }

    /**
     * 🔄 Reset all tutorials (for debugging/testing)
     */
    resetAllTutorials() {
        this.tutorialsSeen = {};
        const playerData = JSON.parse(localStorage.getItem('NebulaWorld_playerData') || '{}');
        playerData.tutorialsSeen = {};
        localStorage.setItem('NebulaWorld_playerData', JSON.stringify(playerData));
        console.log('🎓 All tutorials reset');
    }
}
