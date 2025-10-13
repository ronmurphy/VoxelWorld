/**
 * CompanionTutorialSystem.js
 * 
 * Dynamic, context-aware tutorial system where companion explains features
 * as they're encountered for the first time. Tracks what's been shown and
 * adapts explanations based on player's current inventory/equipment.
 */

import { ChatOverlay } from './Chat.js';

export class CompanionTutorialSystem {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;
        this.chat = new ChatOverlay();
        
        // Load tutorial state from localStorage
        const playerData = JSON.parse(localStorage.getItem('NebulaWorld_playerData') || '{}');
        this.tutorialsSeen = playerData.tutorialsSeen || {};
        
        // Load companion info
        this.companionId = playerData.selectedCompanion || 'rat';
        this.companionName = this.getCompanionName(this.companionId);
    }

    /**
     * Get companion display name from ID
     */
    getCompanionName(companionId) {
        const names = {
            'rat': 'Scrappy',
            'goblin_grunt': 'Grunk',
            'troglodyte': 'Troggle'
        };
        return names[companionId] || 'Companion';
    }

    /**
     * Mark a tutorial as seen and save to localStorage
     */
    markSeen(tutorialKey) {
        this.tutorialsSeen[tutorialKey] = true;
        
        const playerData = JSON.parse(localStorage.getItem('NebulaWorld_playerData') || '{}');
        playerData.tutorialsSeen = this.tutorialsSeen;
        localStorage.setItem('NebulaWorld_playerData', JSON.stringify(playerData));
    }

    /**
     * Check if a tutorial has been shown
     */
    hasSeen(tutorialKey) {
        return this.tutorialsSeen[tutorialKey] === true;
    }

    /**
     * Find which hotbar slot contains an item (1-5 for regular, 6-8 for equipment)
     * Returns { slot: number, isEquipment: boolean } or null
     */
    findItemSlot(itemType) {
        // Check hotbar slots (1-5)
        for (let i = 0; i < 5; i++) {
            const slot = this.voxelWorld.hotbarSystem.getHotbarSlot(i);
            if (slot && slot.itemType === itemType) {
                return { slot: i + 1, isEquipment: false };
            }
        }
        
        // Check equipment slots (6-8)
        const equipment = this.voxelWorld.hotbarSystem.equipmentSlots;
        for (let i = 0; i < equipment.length; i++) {
            if (equipment[i] && equipment[i].itemType === itemType) {
                return { slot: i + 6, isEquipment: true };
            }
        }
        
        return null;
    }

    /**
     * 🔪 Machete Tutorial - Called when machete is first selected
     * Dynamically finds which slot/key it's in
     */
    async showMacheteTutorial() {
        if (this.hasSeen('machete')) return;

        const macheteSlot = this.findItemSlot('machete');
        if (!macheteSlot) {
            console.warn('Machete tutorial triggered but machete not found in hotbar');
            return;
        }

        const slotKey = macheteSlot.slot;
        const slotType = macheteSlot.isEquipment ? 'equipment slot' : 'hotbar slot';

        this.chat.showMessage({
            character: this.companionId,
            name: this.companionName,
            text: `Oh! That machete in ${slotType} ${slotKey} belonged to Uncle Beastly! He used to chop down trees with it by holding left-click on leaves or trunks. Works on grass, dirt, even stone... and it never dulls! Pretty handy, eh?`
        }, () => {
            this.markSeen('machete');
        });
    }

    /**
     * 🔨 Workbench Tutorial - Called AFTER workbench is opened for first time
     * Explains the interface now that they can see it
     */
    async showWorkbenchTutorial() {
        if (this.hasSeen('workbench')) return;

        this.chat.showSequence([
            {
                character: this.companionId,
                name: this.companionName,
                text: `Nice! You found the Workbench! See those three columns? The left shows what materials you have, the middle is where you build your recipe, and the right shows all the cool stuff you can make!`
            },
            {
                character: this.companionId,
                name: this.companionName,
                text: `Try clicking materials from the left column to add them to your recipe in the middle. When you find the right combination, the preview will show what you're about to craft. Pretty neat!`
            },
            {
                character: this.companionId,
                name: this.companionName,
                text: `Oh, and that slider below? That's for making multiple items at once. Drag it to choose how many you want! Some useful things to craft: tool_bench and kitchen_bench... we'll need those later!`
            }
        ], () => {
            this.markSeen('workbench');
        });
    }

    /**
     * 🔧 Tool Bench Tutorial - Called when Tool Bench is first opened
     */
    async showToolBenchTutorial() {
        if (this.hasSeen('toolBench')) return;

        this.chat.showSequence([
            {
                character: this.companionId,
                name: this.companionName,
                text: `Ooh, the Tool Bench! This is where we craft special tools and upgrades using discovery items you find exploring - things like mushrooms, crystals, bones, and rare treasures!`
            },
            {
                character: this.companionId,
                name: this.companionName,
                text: `See those categories on the left? Each tool has a blueprint - kind of like a recipe, but more mysterious! The ingredients show as clues until you discover them in the world.`
            },
            {
                character: this.companionId,
                name: this.companionName,
                text: `Unlike the Workbench, you can only craft ONE item at a time here - but each one is special! Try making a grappling hook when you find the right items... it lets you climb up things!`
            }
        ], () => {
            this.markSeen('toolBench');
        });
    }

    /**
     * 🍳 Kitchen Bench Tutorial - Called when Kitchen Bench is first opened
     */
    async showKitchenBenchTutorial() {
        if (this.hasSeen('kitchenBench')) return;

        this.chat.showSequence([
            {
                character: this.companionId,
                name: this.companionName,
                text: `Ah, the Kitchen Bench! Now we're cooking! *Literally!* This is where you combine ingredients to make food that gives you special buffs - speed boosts, extra stamina, all sorts of good stuff!`
            },
            {
                character: this.companionId,
                name: this.companionName,
                text: `The left panel shows ingredients you have. Click them to add to the cooking area in the middle. The right panel is your Recipe Book - it shows all the food you can make and what buffs they give!`
            },
            {
                character: this.companionId,
                name: this.companionName,
                text: `Try experimenting with different ingredient combos! When you hit the right combination, hit that Cook button and watch those flames dance! 🔥 Then eat the food by right-clicking it from your hotbar!`
            }
        ], () => {
            this.markSeen('kitchenBench');
        });
    }

    /**
     * 🪝 Grappling Hook Tutorial - Called when first crafted
     */
    async showGrapplingHookTutorial() {
        if (this.hasSeen('grapplingHook')) return;

        const hookSlot = this.findItemSlot('crafted_grappling_hook');
        const slotInfo = hookSlot ? ` It's in slot ${hookSlot.slot} now!` : '';

        this.chat.showSequence([
            {
                character: this.companionId,
                name: this.companionName,
                text: `Whoa! You crafted a grappling hook! That's one of my favorite tools!${slotInfo} This beauty lets you climb up tall structures and mountains!`
            },
            {
                character: this.companionId,
                name: this.companionName,
                text: `Here's how it works: aim at a block above you, then right-click to fire the hook. If it catches, you'll zoom up! It's great for exploring mountains or escaping danger!`
            },
            {
                character: this.companionId,
                name: this.companionName,
                text: `Oh, but be careful - the hook has limited durability! Each use wears it down a bit. When it breaks, you'll need to craft another one. So use it wisely!`
            }
        ], () => {
            this.markSeen('grapplingHook');
        });
    }

    /**
     * 👢 Speed Boots Tutorial - Called when first crafted
     */
    async showSpeedBootsTutorial() {
        if (this.hasSeen('speedBoots')) return;

        this.chat.showSequence([
            {
                character: this.companionId,
                name: this.companionName,
                text: `Ooh, Speed Boots! Nice crafting! These will make you run MUCH faster - like, seriously fast. You'll zip across the world in no time!`
            },
            {
                character: this.companionId,
                name: this.companionName,
                text: `They also give you extra stamina, so you can run longer without getting tired. Perfect for exploring or making a quick escape when things get dicey!`
            },
            {
                character: this.companionId,
                name: this.companionName,
                text: `Just keep them equipped in your hotbar and the buffs are always active. You'll feel the difference immediately when you move around!`
            }
        ], () => {
            this.markSeen('speedBoots');
        });
    }

    /**
     * 🧭 Compass Tutorial - Called when first crafted
     */
    async showCompassTutorial() {
        if (this.hasSeen('compass')) return;

        this.chat.showMessage({
            character: this.companionId,
            name: this.companionName,
            text: `A compass! Smart choice! This will help you track down specific targets. Right-click it while looking at something you want to remember - like a rare resource or your home base - and it'll always point you back there! Really handy when exploring far from home!`
        }, () => {
            this.markSeen('compass');
        });
    }

    /**
     * 🧪 Healing Potion Tutorial - Called when first crafted
     */
    async showHealingPotionTutorial() {
        if (this.hasSeen('healingPotion')) return;

        this.chat.showMessage({
            character: this.companionId,
            name: this.companionName,
            text: `Nice! A healing potion! Keep this in your hotbar for emergencies. When your HP gets low, right-click it to instantly restore health. It's saved my hide more times than I can count! Just remember - it's consumable, so craft extras when you can!`
        }, () => {
            this.markSeen('healingPotion');
        });
    }

    /**
     * 💡 Light Orb Tutorial - Called when first crafted
     */
    async showLightOrbTutorial() {
        if (this.hasSeen('lightOrb')) return;

        this.chat.showMessage({
            character: this.companionId,
            name: this.companionName,
            text: `Ooh, a light orb! These are perfect for exploring at night! Right-click to throw it, and it'll stick to whatever it hits, lighting up the area. Way better than carrying a torch everywhere! They last a while too, so you can light up a whole path!`
        }, () => {
            this.markSeen('lightOrb');
        });
    }

    /**
     * 🔥 First Nightfall Tutorial - Called when it first gets dark
     * Suggests crafting safety items
     */
    async showFirstNightTutorial() {
        if (this.hasSeen('firstNight')) return;

        // Check what the player has access to
        const hasToolBench = this.voxelWorld.hasToolBench;
        const hasWorkbench = this.voxelWorld.hasBackpack; // Workbench available after backpack

        let safetyTip = '';
        if (hasToolBench) {
            safetyTip = `Say, your Tool Bench can make light orbs if you have the right materials! Those would light up the darkness nicely.`;
        } else if (hasWorkbench) {
            safetyTip = `You know, your Workbench can make torches and campfires! A campfire would keep you safe AND set your respawn point. Smart investment!`;
        } else {
            safetyTip = `Once you find your backpack, you'll be able to craft torches and campfires for safety. The darkness can be... unsettling.`;
        }

        this.chat.showMessage({
            character: this.companionId,
            name: this.companionName,
            text: `Uh oh, it's getting dark out there... The shadows can hide all sorts of things. ${safetyTip} Just a thought from your friendly companion! Stay safe!`
        }, () => {
            this.markSeen('firstNight');
        });
    }

    /**
     * 🔥 Campfire Tutorial - Called when campfire is placed
     */
    async showCampfireTutorial() {
        if (this.hasSeen('campfire')) return;

        this.chat.showMessage({
            character: this.companionId,
            name: this.companionName,
            text: `Great thinking with that campfire! Not only does it light up the area, but it also sets your respawn point. If something unfortunate happens to you, you'll wake up right here instead of back at spawn. Very smart!`
        }, () => {
            this.markSeen('campfire');
        });
    }

    /**
     * 🌾 Hoe Tutorial - Called when first crafted
     */
    async showHoeTutorial() {
        if (this.hasSeen('hoe')) return;

        this.chat.showMessage({
            character: this.companionId,
            name: this.companionName,
            text: `A hoe! Time to start farming! Right-click on grass or dirt to till the soil into farmland. Then you can plant seeds there and grow crops! Water them regularly and they'll grow big and strong. Fresh food is always nice!`
        }, () => {
            this.markSeen('hoe');
        });
    }

    /**
     * 🔨 Stone Hammer Tutorial - Called when first crafted
     */
    async showStoneHammerTutorial() {
        if (this.hasSeen('stoneHammer')) return;

        this.chat.showSequence([
            {
                character: this.companionId,
                name: this.companionName,
                text: `Whoa! A stone hammer! That's a serious tool! When you harvest stone blocks with this equipped, you'll have a chance to get iron ore or coal from them!`
            },
            {
                character: this.companionId,
                name: this.companionName,
                text: `Each hit creates a small explosion of particles - looks pretty cool! It's like mining, but more... dramatic! The more you use it, the more resources you'll uncover. Happy hammering!`
            }
        ], () => {
            this.markSeen('stoneHammer');
        });
    }

    /**
     * Call this from your existing systems when events occur
     */
    
    // Hook into existing machete selection code
    onMacheteSelected() {
        this.showMacheteTutorial();
    }

    // Hook into workbench open
    onWorkbenchOpened() {
        // Wait a tiny bit so UI is visible
        setTimeout(() => {
            this.showWorkbenchTutorial();
        }, 500);
    }

    // Hook into tool bench open
    onToolBenchOpened() {
        setTimeout(() => {
            this.showToolBenchTutorial();
        }, 500);
    }

    // Hook into kitchen bench open
    onKitchenBenchOpened() {
        setTimeout(() => {
            this.showKitchenBenchTutorial();
        }, 500);
    }

    // Hook into item crafting
    onItemCrafted(itemId) {
        // Map itemId to tutorial
        const tutorials = {
            'crafted_grappling_hook': () => this.showGrapplingHookTutorial(),
            'crafted_speed_boots': () => this.showSpeedBootsTutorial(),
            'compass': () => this.showCompassTutorial(),
            'compass_upgrade': () => this.showCompassTutorial(),
            'crafted_healing_potion': () => this.showHealingPotionTutorial(),
            'crafted_light_orb': () => this.showLightOrbTutorial(),
            'stone_hammer': () => this.showStoneHammerTutorial(),
            'hoe': () => this.showHoeTutorial()
        };

        const tutorial = tutorials[itemId];
        if (tutorial) {
            // Wait a moment for crafting animation to complete
            setTimeout(() => {
                tutorial();
            }, 800);
        }
    }

    // Hook into campfire placement
    onCampfirePlaced() {
        setTimeout(() => {
            this.showCampfireTutorial();
        }, 500);
    }

    // Hook into day/night cycle
    onNightfall() {
        this.showFirstNightTutorial();
    }
}
