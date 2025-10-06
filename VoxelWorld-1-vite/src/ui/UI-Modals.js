/**
 * UI-Modals.js
 *
 * Centralized modal system for VoxelWorld
 * Character creation, settings, help, etc.
 * Styled to match Explorer's Journal aesthetic
 */

export class UIModals {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;
        this.activeModal = null;

        console.log('📜 UI-Modals system initialized');
    }

    // 📜 CHARACTER CREATION MODAL
    showCharacterCreation(onComplete) {
        // Remove existing modal if any
        this.closeActiveModal();

        const modal = document.createElement('div');
        modal.id = 'characterCreationModal';
        modal.className = 'voxel-modal-overlay';

        modal.innerHTML = `
            <div class="voxel-modal character-creation-modal">
                <div class="modal-header">
                    <h2>📖 Explorer's Chronicle</h2>
                    <p class="subtitle">Begin your adventure by creating your character</p>
                </div>

                <div class="modal-body">
                    <!-- STEP 1: Basic Info -->
                    <div class="creation-step" id="step-basic">
                        <h3>📝 Your Identity</h3>

                        <div class="form-group">
                            <label for="char-name">Name:</label>
                            <input type="text" id="char-name" placeholder="Enter your name" maxlength="20" />
                        </div>

                        <div class="info-box">
                            <p>💡 <strong>Welcome, Explorer!</strong></p>
                            <p>You are about to embark on a journey through the voxel world. First, let's define who you are.</p>
                        </div>
                    </div>

                    <!-- STEP 2: Attribute Allocation -->
                    <div class="creation-step hidden" id="step-attributes">
                        <h3>⚡ Your Strengths</h3>

                        <div class="points-remaining">
                            <span>Points Remaining: <strong id="points-left">3</strong></span>
                        </div>

                        <div class="attribute-list">
                            ${this._generateAttributeControls()}
                        </div>

                        <div class="info-box">
                            <p>💡 <strong>Distribute 3 points</strong> among your attributes</p>
                            <p>All attributes start at 2. Choose wisely!</p>
                        </div>
                    </div>

                    <!-- STEP 3: Summary -->
                    <div class="creation-step hidden" id="step-summary">
                        <h3>📊 Character Summary</h3>

                        <div id="char-summary" class="summary-display">
                            <!-- Will be filled dynamically -->
                        </div>

                        <div class="info-box success">
                            <p>✅ <strong>Ready to begin!</strong></p>
                            <p>Your character has been created. Good luck, Explorer!</p>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" id="btn-prev" disabled>← Previous</button>
                    <button class="btn btn-primary" id="btn-next">Next →</button>
                    <button class="btn btn-success hidden" id="btn-finish">Start Adventure!</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.activeModal = modal;

        // State tracking
        let currentStep = 0;
        const steps = ['basic', 'attributes', 'summary'];
        let charData = {
            name: '',
            attributes: { str: 2, dex: 2, con: 2, int: 2, wis: 2, cha: 2 },
            pointsRemaining: 3
        };

        // Wire up controls
        this._setupCharacterCreationControls(modal, charData, steps, currentStep, onComplete);

        return modal;
    }

    _generateAttributeControls() {
        const attributes = [
            { key: 'str', name: 'Strength', icon: '💪', desc: 'Melee damage, mining speed' },
            { key: 'dex', name: 'Dexterity', icon: '🏃', desc: 'Movement, defense, ranged' },
            { key: 'con', name: 'Constitution', icon: '❤️', desc: 'Health, stamina' },
            { key: 'int', name: 'Intelligence', icon: '🧠', desc: 'Crafting, XP gain' },
            { key: 'wis', name: 'Wisdom', icon: '👁️', desc: 'Perception, magic points' },
            { key: 'cha', name: 'Charisma', icon: '💬', desc: 'Trading, NPC relations' }
        ];

        return attributes.map(attr => `
            <div class="attribute-control" data-attr="${attr.key}">
                <div class="attr-header">
                    <span class="attr-icon">${attr.icon}</span>
                    <span class="attr-name">${attr.name}</span>
                    <span class="attr-value" id="${attr.key}-value">2</span>
                </div>
                <div class="attr-desc">${attr.desc}</div>
                <div class="attr-buttons">
                    <button class="btn-mini btn-decrement" data-attr="${attr.key}">-</button>
                    <button class="btn-mini btn-increment" data-attr="${attr.key}">+</button>
                </div>
            </div>
        `).join('');
    }

    _setupCharacterCreationControls(modal, charData, steps, currentStep, onComplete) {
        const btnPrev = modal.querySelector('#btn-prev');
        const btnNext = modal.querySelector('#btn-next');
        const btnFinish = modal.querySelector('#btn-finish');
        const charNameInput = modal.querySelector('#char-name');

        // Navigation
        const updateStepDisplay = (step) => {
            steps.forEach((s, i) => {
                const stepEl = modal.querySelector(`#step-${s}`);
                stepEl.classList.toggle('hidden', i !== step);
            });

            btnPrev.disabled = step === 0;
            btnNext.classList.toggle('hidden', step === steps.length - 1);
            btnFinish.classList.toggle('hidden', step !== steps.length - 1);
        };

        btnNext.addEventListener('click', () => {
            // Validate current step
            if (currentStep === 0) {
                charData.name = charNameInput.value.trim();
                if (!charData.name) {
                    alert('Please enter a name!');
                    return;
                }
            }

            if (currentStep === 1) {
                if (charData.pointsRemaining > 0) {
                    const confirm = window.confirm(`You have ${charData.pointsRemaining} points left. Continue anyway?`);
                    if (!confirm) return;
                }
            }

            currentStep++;
            updateStepDisplay(currentStep);

            if (currentStep === steps.length - 1) {
                this._updateSummary(modal, charData);
            }
        });

        btnPrev.addEventListener('click', () => {
            currentStep--;
            updateStepDisplay(currentStep);
        });

        btnFinish.addEventListener('click', () => {
            this.closeActiveModal();
            if (onComplete) {
                onComplete(charData);
            }
        });

        // Attribute controls
        modal.querySelectorAll('.btn-increment').forEach(btn => {
            btn.addEventListener('click', () => {
                const attr = btn.dataset.attr;
                if (charData.pointsRemaining > 0 && charData.attributes[attr] < 15) {
                    charData.attributes[attr]++;
                    charData.pointsRemaining--;
                    this._updateAttributeDisplay(modal, charData);
                }
            });
        });

        modal.querySelectorAll('.btn-decrement').forEach(btn => {
            btn.addEventListener('click', () => {
                const attr = btn.dataset.attr;
                if (charData.attributes[attr] > 2) {
                    charData.attributes[attr]--;
                    charData.pointsRemaining++;
                    this._updateAttributeDisplay(modal, charData);
                }
            });
        });

        updateStepDisplay(currentStep);
    }

    _updateAttributeDisplay(modal, charData) {
        // Update all attribute values
        Object.keys(charData.attributes).forEach(attr => {
            const valueEl = modal.querySelector(`#${attr}-value`);
            if (valueEl) {
                valueEl.textContent = charData.attributes[attr];
            }
        });

        // Update points remaining
        const pointsEl = modal.querySelector('#points-left');
        if (pointsEl) {
            pointsEl.textContent = charData.pointsRemaining;
        }
    }

    _updateSummary(modal, charData) {
        const summaryEl = modal.querySelector('#char-summary');
        if (!summaryEl) return;

        const hp = charData.attributes.con + 1; // Level 1
        const mp = charData.attributes.wis + charData.attributes.int;

        summaryEl.innerHTML = `
            <div class="summary-section">
                <h4>📝 ${charData.name}</h4>
                <p>Level 1 Explorer</p>
            </div>

            <div class="summary-section">
                <h4>⚡ Attributes</h4>
                <div class="attr-grid">
                    <div>💪 STR: ${charData.attributes.str}</div>
                    <div>🏃 DEX: ${charData.attributes.dex}</div>
                    <div>❤️ CON: ${charData.attributes.con}</div>
                    <div>🧠 INT: ${charData.attributes.int}</div>
                    <div>👁️ WIS: ${charData.attributes.wis}</div>
                    <div>💬 CHA: ${charData.attributes.cha}</div>
                </div>
            </div>

            <div class="summary-section">
                <h4>💚 Vitals</h4>
                <p>Health: ${hp} HP</p>
                <p>Magic: ${mp} MP</p>
                <p>Luck: 1d10</p>
            </div>
        `;
    }

    // 🚪 CLOSE MODAL
    closeActiveModal() {
        if (this.activeModal) {
            this.activeModal.remove();
            this.activeModal = null;
        }
    }

    // 📊 FUTURE: Settings Modal
    showSettings() {
        // TODO: Migrate settings from VoxelWorld.js
        console.log('⚙️ Settings modal - coming soon!');
    }

    // 📖 FUTURE: Help/Tutorial Modal
    showHelp() {
        // TODO: Migrate help system
        console.log('❓ Help modal - coming soon!');
    }

    // 🗺️ FUTURE: World Map Modal (migrate from VoxelWorld)
    showWorldMap() {
        // TODO: Migrate world map from VoxelWorld.js
        console.log('🗺️ World map modal - coming soon!');
    }
}
