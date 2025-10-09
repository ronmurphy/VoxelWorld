/**
 * GameIntroOverlay.js
 *
 * Explorer's Journal themed intro overlay for first-time players
 * Shows story intro and starter monster selection
 */

export class GameIntroOverlay {
    constructor() {
        this.overlayElement = null;
        this.currentStep = 'story'; // 'story' or 'monster_select'
        this.onComplete = null; // Callback when player finishes selection

        this.createOverlay();
    }

    createOverlay() {
        // Create main overlay container
        this.overlayElement = document.createElement('div');
        this.overlayElement.id = 'game-intro-overlay';
        this.overlayElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.5s ease;
        `;

        // Create journal-themed content container
        const journalContainer = document.createElement('div');
        journalContainer.id = 'journal-container';
        journalContainer.style.cssText = `
            width: 80%;
            max-width: 800px;
            height: 70%;
            max-height: 600px;
            background: linear-gradient(135deg, #8B7355 0%, #A0826D 50%, #8B7355 100%);
            border: 4px solid #4A3728;
            border-radius: 12px;
            box-shadow: 0 0 40px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(0, 0, 0, 0.3);
            position: relative;
            padding: 40px;
            font-family: 'Georgia', serif;
            overflow: hidden;
        `;

        // Add corner decorations
        const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        corners.forEach(corner => {
            const decoration = document.createElement('div');
            decoration.className = `corner-decoration ${corner}`;
            decoration.style.cssText = `
                position: absolute;
                width: 40px;
                height: 40px;
                border: 3px solid #D4AF37;
                ${corner.includes('top') ? 'top: 10px;' : 'bottom: 10px;'}
                ${corner.includes('left') ? 'left: 10px;' : 'right: 10px;'}
                ${corner === 'top-left' ? 'border-right: none; border-bottom: none;' : ''}
                ${corner === 'top-right' ? 'border-left: none; border-bottom: none;' : ''}
                ${corner === 'bottom-left' ? 'border-right: none; border-top: none;' : ''}
                ${corner === 'bottom-right' ? 'border-left: none; border-top: none;' : ''}
            `;
            journalContainer.appendChild(decoration);
        });

        // Create content area
        const contentArea = document.createElement('div');
        contentArea.id = 'intro-content';
        contentArea.style.cssText = `
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            color: #2C1810;
        `;

        // Add title
        const title = document.createElement('h1');
        title.style.cssText = `
            font-size: 36px;
            text-align: center;
            margin: 0 0 30px 0;
            color: #2C1810;
            text-shadow: 2px 2px 4px rgba(212, 175, 55, 0.3);
            font-weight: bold;
        `;
        title.textContent = "Explorer's Journal";

        // Add story content area
        const storyContent = document.createElement('div');
        storyContent.id = 'story-content';
        storyContent.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 8px;
            font-size: 18px;
            line-height: 1.8;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        storyContent.innerHTML = `
            <div style="max-width: 600px;">
                <p style="font-style: italic; color: #4A3728; margin-bottom: 20px;">
                    📖 Story goes here
                </p>
                <p style="font-size: 14px; color: #666;">
                    (This is a placeholder for the game's introduction story)
                </p>
            </div>
        `;

        // Add continue button
        const continueButton = document.createElement('button');
        continueButton.id = 'continue-button';
        continueButton.textContent = 'Continue';
        continueButton.style.cssText = `
            margin-top: 20px;
            padding: 15px 50px;
            font-size: 20px;
            font-family: 'Georgia', serif;
            background: linear-gradient(135deg, #D4AF37 0%, #F4E4A6 50%, #D4AF37 100%);
            color: #2C1810;
            border: 3px solid #8B7355;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            transition: all 0.3s ease;
        `;

        continueButton.addEventListener('mouseover', () => {
            continueButton.style.transform = 'scale(1.05)';
            continueButton.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.4)';
        });

        continueButton.addEventListener('mouseout', () => {
            continueButton.style.transform = 'scale(1)';
            continueButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        });

        continueButton.addEventListener('click', () => {
            this.showMonsterSelection();
        });

        // Assemble the overlay
        contentArea.appendChild(title);
        contentArea.appendChild(storyContent);
        contentArea.appendChild(continueButton);
        journalContainer.appendChild(contentArea);
        this.overlayElement.appendChild(journalContainer);
    }

    show() {
        document.body.appendChild(this.overlayElement);

        // Fade in
        setTimeout(() => {
            this.overlayElement.style.opacity = '1';
        }, 10);
    }

    hide() {
        this.overlayElement.style.opacity = '0';
        setTimeout(() => {
            if (this.overlayElement.parentNode) {
                this.overlayElement.parentNode.removeChild(this.overlayElement);
            }
        }, 500);
    }

    async showMonsterSelection() {
        console.log('🎮 Showing companion selection...');

        // Load entities data
        const entitiesData = await this.loadEntities();
        const starters = entitiesData.starter_choices; // ["rat", "goblin_grunt", "troglodyte"]

        const contentArea = document.getElementById('intro-content');
        contentArea.innerHTML = `
            <h1 style="font-size: 36px; text-align: center; margin: 0 0 20px 0; color: #2C1810; text-shadow: 2px 2px 4px rgba(212, 175, 55, 0.3); font-weight: bold;">
                Choose Your Companion
            </h1>
            <p style="text-align: center; font-size: 16px; color: #4A3728; margin-bottom: 30px;">
                Select your first companion to aid you in battle
            </p>
            <div id="monster-selection" style="flex: 1; display: flex; justify-content: space-around; align-items: center; gap: 20px; padding: 20px;">
                ${this.createMonsterCards(starters, entitiesData.monsters)}
            </div>
        `;

        // Set up click handlers NOW that cards are rendered
        this.setupClickHandlers();
    }

    createMonsterCards(starterIds, monstersData) {
        return starterIds.map(monsterId => {
            const monster = monstersData[monsterId];
            return `
                <div class="monster-card" data-monster="${monsterId}" style="
                    flex: 1;
                    max-width: 200px;
                    background: rgba(255, 255, 255, 0.4);
                    border: 3px solid #8B7355;
                    border-radius: 12px;
                    padding: 20px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    text-align: center;
                " onmouseover="this.style.transform='scale(1.05)'; this.style.borderColor='#D4AF37'; this.style.boxShadow='0 8px 16px rgba(0,0,0,0.4)';" onmouseout="this.style.transform='scale(1)'; this.style.borderColor='#8B7355'; this.style.boxShadow='none';">
                    <img src="assets/art/entities/${monster.sprite_portrait}" alt="${monster.name}" style="
                        width: 120px;
                        height: 120px;
                        object-fit: cover;
                        border-radius: 8px;
                        margin-bottom: 15px;
                        border: 2px solid #4A3728;
                    ">
                    <h3 style="margin: 0 0 10px 0; color: #2C1810; font-size: 20px;">${monster.name}</h3>
                    <p style="font-size: 14px; color: #4A3728; margin-bottom: 15px; line-height: 1.4;">${monster.description}</p>
                    <div style="font-size: 12px; color: #666; margin-bottom: 10px;">
                        <div>❤️ HP: ${monster.hp}</div>
                        <div>⚔️ Attack: ${monster.attack}</div>
                        <div>🛡️ Defense: ${monster.defense}</div>
                        <div>⚡ Speed: ${monster.speed}</div>
                    </div>
                    <button class="select-monster-btn" data-monster="${monsterId}" style="
                        padding: 10px 20px;
                        background: linear-gradient(135deg, #D4AF37 0%, #F4E4A6 50%, #D4AF37 100%);
                        color: #2C1810;
                        border: 2px solid #8B7355;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: bold;
                        font-size: 14px;
                        transition: all 0.2s ease;
                    " onmouseover="this.style.transform='scale(1.1)';" onmouseout="this.style.transform='scale(1)';">
                        Choose
                    </button>
                </div>
            `;
        }).join('');
    }

    async loadEntities() {
        try {
            const response = await fetch('assets/art/entities/entities.json');
            return await response.json();
        } catch (error) {
            console.error('Failed to load entities.json:', error);
            // Return fallback data
            return {
                starter_choices: ['rat', 'goblin_grunt', 'troglodyte'],
                monsters: {
                    rat: { name: 'Rat', hp: 8, attack: 3, defense: 13, speed: 5, description: 'A scrappy tunnel rat.', sprite_portrait: 'rat.jpeg' },
                    goblin_grunt: { name: 'Goblin Grunt', hp: 6, attack: 4, defense: 12, speed: 4, description: 'Small green warrior.', sprite_portrait: 'goblin_grunt.jpeg' },
                    troglodyte: { name: 'Troglodyte', hp: 15, attack: 4, defense: 13, speed: 2, description: 'Primitive cave dweller.', sprite_portrait: 'troglodyte.jpeg' }
                }
            };
        }
    }

    setCompletionCallback(callback) {
        this.onComplete = callback;
    }

    setupClickHandlers() {
        // Set up click handlers for companion selection buttons
        // Called after cards are rendered in showMonsterSelection()
        setTimeout(() => {
            const buttons = document.querySelectorAll('.select-monster-btn');
            console.log(`🖱️ Setting up click handlers for ${buttons.length} companion buttons`);

            buttons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const selectedCompanion = e.target.dataset.monster;
                    console.log(`✅ Companion selected: ${selectedCompanion}`);
                    if (this.onComplete) {
                        this.onComplete(selectedCompanion);
                    }
                    this.hide();
                });
            });
        }, 100);
    }
}
