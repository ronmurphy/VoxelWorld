/**
 * MusicSystem.js - Background music player with volume controls
 *
 * Features:
 * - Looping background music (OGG format)
 * - Volume up/down/mute controls
 * - Fade in/out transitions
 * - Proper memory cleanup (no leaks!)
 * - Persistent volume settings (localStorage)
 */

export class MusicSystem {
    constructor() {
        this.audio = null;
        this.currentTrack = null;
        this.isPlaying = false;
        this.isMuted = false;

        // Volume settings (0.0 to 1.0)
        this.volume = this.loadVolume();
        this.volumeStep = 0.1; // 10% increments

        console.log('🎵 MusicSystem initialized');
    }

    /**
     * Load volume from localStorage
     */
    loadVolume() {
        const saved = localStorage.getItem('music_volume');
        if (saved !== null) {
            return parseFloat(saved);
        }
        return 0.5; // Default 50% volume
    }

    /**
     * Save volume to localStorage
     */
    saveVolume() {
        localStorage.setItem('music_volume', this.volume.toString());
    }

    /**
     * Play a music track (loops automatically)
     * @param {string} trackPath - Path to music file (e.g., 'music/forestDay.ogg')
     */
    async play(trackPath) {
        // If already playing this track, do nothing
        if (this.currentTrack === trackPath && this.isPlaying) {
            console.log('🎵 Track already playing:', trackPath);
            return;
        }

        // Stop current track if playing
        if (this.audio) {
            this.stop();
        }

        try {
            // Create new audio element
            this.audio = new Audio(trackPath);
            this.audio.loop = true; // Enable looping
            this.audio.volume = this.isMuted ? 0 : this.volume;
            this.currentTrack = trackPath;

            // Wait for audio to be ready
            await new Promise((resolve, reject) => {
                this.audio.addEventListener('canplaythrough', resolve, { once: true });
                this.audio.addEventListener('error', reject, { once: true });
            });

            // Play with fade-in
            await this.audio.play();
            this.isPlaying = true;
            this.fadeIn();

            console.log('🎵 Now playing:', trackPath, `(Volume: ${Math.round(this.volume * 100)}%)`);

        } catch (error) {
            console.error('🎵 Failed to play music:', error);
            this.cleanup();
        }
    }

    /**
     * Stop the current track
     */
    stop() {
        if (!this.audio) return;

        this.audio.pause();
        this.isPlaying = false;
        this.cleanup();

        console.log('🎵 Music stopped');
    }

    /**
     * Pause the current track (can be resumed)
     */
    pause() {
        if (!this.audio || !this.isPlaying) return;

        this.audio.pause();
        this.isPlaying = false;

        console.log('🎵 Music paused');
    }

    /**
     * Resume the paused track
     */
    resume() {
        if (!this.audio || this.isPlaying) return;

        this.audio.play();
        this.isPlaying = true;

        console.log('🎵 Music resumed');
    }

    /**
     * Increase volume by 10%
     */
    volumeUp() {
        this.volume = Math.min(1.0, this.volume + this.volumeStep);
        this.updateVolume();
        this.saveVolume();

        console.log(`🎵 Volume: ${Math.round(this.volume * 100)}%`);
        this.showVolumeNotification();
    }

    /**
     * Decrease volume by 10%
     */
    volumeDown() {
        this.volume = Math.max(0.0, this.volume - this.volumeStep);
        this.updateVolume();
        this.saveVolume();

        console.log(`🎵 Volume: ${Math.round(this.volume * 100)}%`);
        this.showVolumeNotification();
    }

    /**
     * Toggle mute
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        this.updateVolume();

        console.log(`🎵 Mute: ${this.isMuted ? 'ON' : 'OFF'}`);
        this.showVolumeNotification();
    }

    /**
     * Update audio element volume
     */
    updateVolume() {
        if (!this.audio) return;
        this.audio.volume = this.isMuted ? 0 : this.volume;
    }

    /**
     * Fade in effect (smooth volume increase)
     */
    fadeIn(duration = 2000) {
        if (!this.audio) return;

        const targetVolume = this.isMuted ? 0 : this.volume;
        const startVolume = 0;
        const startTime = Date.now();

        const fade = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            if (this.audio) {
                this.audio.volume = startVolume + (targetVolume - startVolume) * progress;
            }

            if (progress < 1 && this.audio) {
                requestAnimationFrame(fade);
            }
        };

        this.audio.volume = startVolume;
        fade();
    }

    /**
     * Fade out effect (smooth volume decrease)
     */
    fadeOut(duration = 1000) {
        return new Promise((resolve) => {
            if (!this.audio) {
                resolve();
                return;
            }

            const startVolume = this.audio.volume;
            const startTime = Date.now();

            const fade = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                if (this.audio) {
                    this.audio.volume = startVolume * (1 - progress);
                }

                if (progress < 1 && this.audio) {
                    requestAnimationFrame(fade);
                } else {
                    resolve();
                }
            };

            fade();
        });
    }

    /**
     * Show volume notification on screen
     */
    showVolumeNotification() {
        // Remove existing notification if present
        const existing = document.getElementById('volume-notification');
        if (existing) {
            existing.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.id = 'volume-notification';
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 16px;
            z-index: 9999;
            pointer-events: none;
            transition: opacity 0.3s ease;
        `;

        const volumePercent = Math.round(this.volume * 100);
        const volumeBars = '█'.repeat(Math.ceil(volumePercent / 10));
        const emptyBars = '░'.repeat(10 - Math.ceil(volumePercent / 10));

        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px;">${this.isMuted ? '🔇' : '🎵'}</span>
                <div>
                    <div style="font-weight: bold;">Music Volume</div>
                    <div style="font-family: monospace; font-size: 14px; margin-top: 5px;">
                        ${volumeBars}${emptyBars} ${this.isMuted ? 'MUTED' : volumePercent + '%'}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        // Fade out and remove after 2 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    /**
     * Clean up audio resources (prevent memory leaks)
     */
    cleanup() {
        if (this.audio) {
            this.audio.pause();
            this.audio.src = ''; // Release audio buffer
            this.audio.load(); // Force cleanup
            this.audio = null;
        }
        this.currentTrack = null;
        this.isPlaying = false;
    }

    /**
     * Dispose of the music system (call on game shutdown)
     */
    dispose() {
        this.stop();
        this.cleanup();
        console.log('🎵 MusicSystem disposed');
    }
}
