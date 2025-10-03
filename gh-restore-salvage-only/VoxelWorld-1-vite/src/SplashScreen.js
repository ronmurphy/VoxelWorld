/**
 * SplashScreen.js
 *
 * Manages the loading splash screen with progress tracking.
 * Displays logo and progress bar during initial asset loading and world generation.
 */

export class SplashScreen {
    constructor() {
        this.splashElement = document.getElementById('splash-screen');
        this.progressFill = document.getElementById('progress-fill');
        this.statusText = document.getElementById('splash-status');

        this.currentProgress = 0;
        this.isHidden = false;

        // Progress milestones
        this.milestones = {
            initialized: 0,
            texturesLoading: 10,
            texturesLoaded: 50,
            worldGenerating: 60,
            chunksLoaded: 90,
            complete: 100
        };

        console.log('🎬 SplashScreen initialized');
    }

    /**
     * Update progress and status message
     * @param {number} progress - Progress percentage (0-100)
     * @param {string} message - Status message to display
     */
    updateProgress(progress, message) {
        this.currentProgress = Math.min(progress, 100);

        if (this.progressFill) {
            this.progressFill.style.width = `${this.currentProgress}%`;
        }

        if (this.statusText && message) {
            this.statusText.textContent = message;
        }

        console.log(`📊 Splash: ${this.currentProgress}% - ${message}`);
    }

    /**
     * Hide the splash screen with smooth fade-out
     */
    hide() {
        if (this.isHidden) return;

        this.updateProgress(100, 'Ready!');

        setTimeout(() => {
            if (this.splashElement) {
                this.splashElement.classList.add('hidden');
                this.isHidden = true;
                console.log('🎬 Splash screen hidden');

                // Remove from DOM after fade animation completes
                setTimeout(() => {
                    if (this.splashElement && this.splashElement.parentNode) {
                        this.splashElement.style.display = 'none';
                    }
                }, 800); // Match CSS transition duration
            }
        }, 500); // Brief pause at 100%
    }

    /**
     * Show splash screen (useful for re-initializing)
     */
    show() {
        if (this.splashElement) {
            this.splashElement.style.display = 'flex';
            this.splashElement.classList.remove('hidden');
            this.isHidden = false;
            this.currentProgress = 0;
            this.updateProgress(0, 'Initializing...');
            console.log('🎬 Splash screen shown');
        }
    }

    /**
     * Helper methods for common loading stages
     */
    setInitializing() {
        this.updateProgress(this.milestones.initialized, 'Initializing game...');
    }

    setLoadingTextures() {
        this.updateProgress(this.milestones.texturesLoading, 'Loading textures...');
    }

    setTexturesLoaded() {
        this.updateProgress(this.milestones.texturesLoaded, 'Textures loaded!');
    }

    setGeneratingWorld() {
        this.updateProgress(this.milestones.worldGenerating, 'Generating world...');
    }

    setLoadingChunks() {
        this.updateProgress(this.milestones.chunksLoaded, 'Loading chunks...');
    }

    setComplete() {
        this.updateProgress(this.milestones.complete, 'Complete!');
        this.hide();
    }
}
