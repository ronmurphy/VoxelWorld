/**
 * Chat.js
 *
 * Visual novel-style dialogue overlay system
 * Used for companion dialogue, tutorials, NPC interactions, story moments
 */

export class ChatOverlay {
    constructor() {
        this.overlayElement = null;
        this.messageQueue = [];
        this.currentMessageIndex = 0;
        this.onSequenceComplete = null;
    }

    /**
     * Show a single message
     * @param {Object} message - Message configuration
     * @param {string} message.character - Character ID (e.g., 'rat', 'goblin_grunt')
     * @param {string} message.name - Display name (e.g., 'Scrappy the Rat')
     * @param {string} message.portrait - Path to portrait image (optional, auto-loads from character ID)
     * @param {string} message.text - Dialogue text
     * @param {Function} onComplete - Callback when message is dismissed
     */
    showMessage(message, onComplete = null) {
        this.showSequence([message], onComplete);
    }

    /**
     * Show a sequence of messages
     * @param {Array} messages - Array of message objects
     * @param {Function} onComplete - Callback when all messages are shown
     */
    showSequence(messages, onComplete = null) {
        this.messageQueue = messages;
        this.currentMessageIndex = 0;
        this.onSequenceComplete = onComplete;

        // Create overlay if it doesn't exist
        if (!this.overlayElement) {
            this.createOverlay();
        }

        // Show first message
        this.showNextMessage();
    }

    createOverlay() {
        // Release pointer lock when chat opens
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }

        // Main overlay container (semi-transparent background)
        this.overlayElement = document.createElement('div');
        this.overlayElement.id = 'chat-overlay';
        this.overlayElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: flex-end;
            z-index: 50002;
            opacity: 0;
            transition: opacity 0.3s ease;
            padding-bottom: 40px;
        `;

        // Chat box container
        const chatBox = document.createElement('div');
        chatBox.id = 'chat-box';
        chatBox.style.cssText = `
            width: 80%;
            max-width: 700px;
            background: linear-gradient(135deg, #8B7355 0%, #A0826D 50%, #8B7355 100%);
            border: 4px solid #4A3728;
            border-radius: 12px;
            box-shadow: 0 0 30px rgba(0, 0, 0, 0.8);
            padding: 20px;
            font-family: 'Georgia', serif;
            position: relative;
        `;

        // Character info section (portrait + name)
        const characterSection = document.createElement('div');
        characterSection.id = 'chat-character';
        characterSection.style.cssText = `
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #D4AF37;
        `;

        // Portrait
        const portrait = document.createElement('img');
        portrait.id = 'chat-portrait';
        portrait.style.cssText = `
            width: 60px;
            height: 60px;
            border-radius: 50%;
            border: 3px solid #D4AF37;
            margin-right: 15px;
            object-fit: cover;
            background: #4A3728;
        `;

        // Name label
        const nameLabel = document.createElement('div');
        nameLabel.id = 'chat-name';
        nameLabel.style.cssText = `
            font-size: 20px;
            font-weight: bold;
            color: #2C1810;
            text-shadow: 1px 1px 2px rgba(212, 175, 55, 0.3);
        `;

        characterSection.appendChild(portrait);
        characterSection.appendChild(nameLabel);

        // Dialogue text area
        const textArea = document.createElement('div');
        textArea.id = 'chat-text';
        textArea.style.cssText = `
            font-size: 18px;
            line-height: 1.6;
            color: #2C1810;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            min-height: 80px;
        `;

        // Continue button
        const continueBtn = document.createElement('button');
        continueBtn.id = 'chat-continue-btn';
        continueBtn.textContent = 'Continue ▶';
        continueBtn.style.cssText = `
            float: right;
            padding: 10px 25px;
            font-size: 16px;
            font-family: 'Georgia', serif;
            background: linear-gradient(135deg, #D4AF37 0%, #F4E4A6 50%, #D4AF37 100%);
            color: #2C1810;
            border: 2px solid #8B7355;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            transition: all 0.2s ease;
        `;

        continueBtn.addEventListener('mouseover', () => {
            continueBtn.style.transform = 'scale(1.05)';
            continueBtn.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.4)';
        });

        continueBtn.addEventListener('mouseout', () => {
            continueBtn.style.transform = 'scale(1)';
            continueBtn.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.3)';
        });

        continueBtn.addEventListener('click', () => {
            this.showNextMessage();
        });

        // Assemble chat box
        chatBox.appendChild(characterSection);
        chatBox.appendChild(textArea);
        chatBox.appendChild(continueBtn);
        this.overlayElement.appendChild(chatBox);

        // Add to DOM
        document.body.appendChild(this.overlayElement);

        // Fade in
        setTimeout(() => {
            this.overlayElement.style.opacity = '1';
        }, 10);
    }

    showNextMessage() {
        if (this.currentMessageIndex >= this.messageQueue.length) {
            // Sequence complete
            this.hide();
            if (this.onSequenceComplete) {
                this.onSequenceComplete();
            }
            return;
        }

        const message = this.messageQueue[this.currentMessageIndex];
        this.currentMessageIndex++;

        // Update portrait
        const portrait = document.getElementById('chat-portrait');
        if (message.portrait) {
            portrait.src = message.portrait;
        } else if (message.character) {
            // Auto-generate portrait path from character ID
            portrait.src = `art/entities/${message.character}.jpeg`;
        }

        // Update name
        const nameLabel = document.getElementById('chat-name');
        nameLabel.textContent = message.name || message.character || 'Unknown';

        // Update text
        const textArea = document.getElementById('chat-text');
        textArea.textContent = message.text;

        // Update continue button text
        const continueBtn = document.getElementById('chat-continue-btn');
        if (this.currentMessageIndex >= this.messageQueue.length) {
            continueBtn.textContent = 'Close ✓';
        } else {
            continueBtn.textContent = 'Continue ▶';
        }
    }

    hide() {
        if (!this.overlayElement) return;

        this.overlayElement.style.opacity = '0';
        setTimeout(() => {
            if (this.overlayElement && this.overlayElement.parentNode) {
                this.overlayElement.parentNode.removeChild(this.overlayElement);
                this.overlayElement = null;
            }

            // Re-request pointer lock after chat closes (unless workbench/other UI is open)
            setTimeout(() => {
                const canvas = document.querySelector('canvas');
                const voxelApp = window.voxelApp;

                // Don't re-engage pointer lock if workbench or other modals are open
                if (canvas && voxelApp) {
                    const isWorkbenchOpen = voxelApp.workbenchSystem?.isOpen;
                    const isToolBenchOpen = voxelApp.toolBenchSystem?.isOpen;

                    if (!isWorkbenchOpen && !isToolBenchOpen) {
                        canvas.requestPointerLock();
                    }
                }
            }, 100);
        }, 300);
    }

    /**
     * Utility: Load companion data from entities.json
     * Returns promise with companion info
     */
    static async loadCompanionData(companionId) {
        try {
            const response = await fetch('art/entities/entities.json');
            const data = await response.json();
            return data.monsters[companionId];
        } catch (error) {
            console.error('Failed to load companion data:', error);
            return null;
        }
    }
}
