/**
 * MusicSystem.js - Background music player with volume controls
 *
 * Features:
 * - Looping background music (OGG format)
 * - Day/Night crossfading support
 * - Volume up/down/mute controls
 * - Fade in/out transitions
 * - Proper memory cleanup (no leaks!)
 * - Persistent volume settings (localStorage)
 * - Powered by Howler.js for better audio quality and features
 */

import { Howl, Howler } from 'howler';

export class MusicSystem {
    constructor() {
        // Day/Night track management
        this.dayTrack = null;      // Howler instance for day music
        this.nightTrack = null;    // Howler instance for night music
        this.currentMode = null;   // 'day' or 'night'
        
        // Legacy single track support (for backward compatibility)
        this.howl = null;
        this.currentTrack = null;
        this.isPlaying = false;
        this.isMuted = false;

        // Volume settings (0.0 to 1.0)
        this.volume = this.loadVolume();
        this.volumeStep = 0.1; // 10% increments

        // Autoplay setting
        this.autoplayEnabled = this.loadAutoplay();

        // Day/Night cycle tracking
        this.lastTimeOfDay = null;
        this.crossfadeDuration = 3000; // 3 seconds for crossfade

        // Set global Howler volume
        Howler.volume(this.volume);

        console.log('🎵 MusicSystem initialized (Howler.js with Day/Night support)');
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
     * Load autoplay from localStorage
     */
    loadAutoplay() {
        const saved = localStorage.getItem('music_autoplay');
        if (saved !== null) {
            return saved === 'true';
        }
        return true; // Default autoplay enabled
    }

    /**
     * Save autoplay to localStorage
     */
    saveAutoplay() {
        localStorage.setItem('music_autoplay', this.autoplayEnabled.toString());
    }

    /**
     * Toggle autoplay
     */
    toggleAutoplay() {
        this.autoplayEnabled = !this.autoplayEnabled;
        this.saveAutoplay();
        console.log(`🎵 Autoplay: ${this.autoplayEnabled ? 'ON' : 'OFF'}`);
        return this.autoplayEnabled;
    }

    /**
     * Initialize day/night music system with two tracks
     * @param {string} dayTrackPath - Path to day music (e.g., 'music/forestDay.ogg')
     * @param {string} nightTrackPath - Path to night music (e.g., 'music/forestNight.ogg')
     */
    async initDayNightMusic(dayTrackPath, nightTrackPath) {
        console.log('🎵 Initializing Day/Night music system...');
        console.log(`🎵 Electron detected: ${!!window.isElectron?.platform}`);
        console.log(`🎵 Autoplay enabled: ${this.autoplayEnabled}`);

        const isElectron = window.isElectron?.platform;

        // Fix paths for electron
        const fixedDayPath = isElectron && dayTrackPath.startsWith('/')
            ? dayTrackPath.substring(1)
            : dayTrackPath;
        const fixedNightPath = isElectron && nightTrackPath.startsWith('/')
            ? nightTrackPath.substring(1)
            : nightTrackPath;

        console.log(`🎵 Day track path: "${fixedDayPath}"`);
        console.log(`🎵 Night track path: "${fixedNightPath}"`);

        // Create day track (preload but don't play yet)
        // Use html5: false for Web Audio API (faster loading, better for Electron)
        this.dayTrack = new Howl({
            src: [fixedDayPath],
            loop: true,
            volume: 0, // Start silent
            html5: false, // Web Audio API - faster loading!
            preload: true,
            onload: () => {
                console.log('🌅 ✅ Day track LOADED successfully');
                console.log(`🌅 State: ${this.dayTrack.state()}, Duration: ${this.dayTrack.duration()}s`);
            },
            onloaderror: (id, error) => {
                console.error('🌅 ❌ Day track load ERROR:', error);
                console.error('🌅 Failed path:', fixedDayPath);
            }
        });

        // Create night track (preload but don't play yet)
        this.nightTrack = new Howl({
            src: [fixedNightPath],
            loop: true,
            volume: 0, // Start silent
            html5: false, // Web Audio API - faster loading!
            preload: true,
            onload: () => {
                console.log('🌙 ✅ Night track LOADED successfully');
                console.log(`🌙 State: ${this.nightTrack.state()}, Duration: ${this.nightTrack.duration()}s`);
            },
            onloaderror: (id, error) => {
                console.error('🌙 ❌ Night track load ERROR:', error);
                console.error('🌙 Failed path:', fixedNightPath);
            }
        });

        // Wait for both tracks to load (with timeout)
        console.log('🎵 Waiting for tracks to load...');
        const loadTimeout = 10000; // 10 second timeout
        const startTime = Date.now();

        while (Date.now() - startTime < loadTimeout) {
            const dayReady = this.dayTrack.state() === 'loaded';
            const nightReady = this.nightTrack.state() === 'loaded';

            if (dayReady && nightReady) {
                console.log('🎵 ✅ Both tracks loaded successfully!');
                break;
            }

            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const finalDayState = this.dayTrack.state();
        const finalNightState = this.nightTrack.state();
        console.log(`🎵 Final states: Day=${finalDayState}, Night=${finalNightState}`);

        if (finalDayState !== 'loaded' || finalNightState !== 'loaded') {
            console.warn('⚠️ Music tracks did not load within timeout!');
        }

        console.log('🎵 Day/Night music system initialization complete!');
    }

    /**
     * Update music based on time of day (call this from your day/night cycle)
     * @param {number} timeOfDay - Current time in 24-hour format (0-24)
     */
    updateTimeOfDay(timeOfDay) {
        if (!this.dayTrack || !this.nightTrack) {
            // Tracks not initialized yet - silently ignore (they'll start when ready)
            return;
        }

        // Determine if it's day or night
        // Day: 8am-5pm (8-17), Night: 5pm-8am (17-24, 0-8)
        const isDaytime = timeOfDay >= 8 && timeOfDay < 19;
        const targetMode = isDaytime ? 'day' : 'night';

        // If mode hasn't changed, do nothing
        if (targetMode === this.currentMode) {
            return;
        }

        // Mode changed - perform crossfade!
        console.log(`🎵 Time of day changed: ${timeOfDay.toFixed(1)}h → ${targetMode === 'day' ? '🌅 Day' : '🌙 Night'}`);
        
        const oldMode = this.currentMode;
        this.currentMode = targetMode;

        if (oldMode === null) {
            // First time - just start the appropriate track
            this.startDayNightTrack(targetMode);
        } else {
            // Crossfade from old to new
            this.crossfadeDayNight(oldMode, targetMode);
        }
    }

    /**
     * Start a day or night track (initial play)
     */
    startDayNightTrack(mode) {
        const track = mode === 'day' ? this.dayTrack : this.nightTrack;
        const emoji = mode === 'day' ? '🌅' : '🌙';
        
        if (!track) return;

        console.log(`${emoji} Starting ${mode} music...`);

        // Ensure track is loaded before playing
        if (track.state() === 'unloaded') {
            console.warn(`${emoji} Track not loaded yet! Waiting...`);
            track.once('load', () => {
                console.log(`${emoji} Track loaded, now playing...`);
                this.startDayNightTrack(mode);
            });
            return;
        }

        // Start playing
        const soundId = track.play();
        this.isPlaying = true;

        console.log(`${emoji} Sound ID: ${soundId}, State: ${track.state()}, Playing: ${track.playing()}`);

        // Fade in from 0 to target volume
        const targetVolume = this.isMuted ? 0 : this.volume;
        track.fade(0, targetVolume, this.crossfadeDuration);

        // Verify it's actually playing after a moment
        setTimeout(() => {
            const isPlaying = track.playing();
            const vol = track.volume();
            console.log(`${emoji} Status check: playing=${isPlaying}, volume=${Math.round(vol * 100)}%`);
            if (!isPlaying) {
                console.error(`${emoji} ⚠️ Track failed to start! Retrying...`);
                track.play();
            }
        }, 500);
    }

    /**
     * Crossfade between day and night tracks
     */
    crossfadeDayNight(fromMode, toMode) {
        const fromTrack = fromMode === 'day' ? this.dayTrack : this.nightTrack;
        const toTrack = toMode === 'day' ? this.dayTrack : this.nightTrack;
        const fromEmoji = fromMode === 'day' ? '🌅' : '🌙';
        const toEmoji = toMode === 'day' ? '🌅' : '🌙';

        if (!fromTrack || !toTrack) return;

        console.log(`🎵 Crossfading: ${fromEmoji} ${fromMode} → ${toEmoji} ${toMode}`);

        const targetVolume = this.isMuted ? 0 : this.volume;

        // Fade out old track
        const currentVolume = fromTrack.volume();
        console.log(`${fromEmoji} Fading out from ${Math.round(currentVolume * 100)}% to 0%`);
        fromTrack.fade(currentVolume, 0, this.crossfadeDuration);
        
        // Stop old track after fade completes (with proper cleanup)
        setTimeout(() => {
            if (fromTrack.playing()) {
                console.log(`${fromEmoji} Stopping ${fromMode} track`);
                fromTrack.stop();
            }
        }, this.crossfadeDuration + 100);

        // Start new track if not already playing
        if (!toTrack.playing()) {
            console.log(`${toEmoji} Starting ${toMode} track...`);
            toTrack.volume(0); // Ensure it starts at 0
            const soundId = toTrack.play();
            
            // Verify it started
            setTimeout(() => {
                const isPlaying = toTrack.playing();
                const currentVol = toTrack.volume();
                console.log(`${toEmoji} Track status: playing=${isPlaying}, volume=${Math.round(currentVol * 100)}%, soundId=${soundId}`);
            }, 100);
            
            // Fade in new track (wait a tiny bit for play() to take effect)
            setTimeout(() => {
                console.log(`${toEmoji} Fading in from 0% to ${Math.round(targetVolume * 100)}%`);
                toTrack.fade(0, targetVolume, this.crossfadeDuration);
            }, 50);
        } else {
            // Track already playing - just fade it to target volume from current volume
            const currentVol = toTrack.volume();
            console.log(`${toEmoji} ${toMode} track already playing at ${Math.round(currentVol * 100)}%`);
            console.log(`${toEmoji} Fading from ${Math.round(currentVol * 100)}% to ${Math.round(targetVolume * 100)}%`);
            toTrack.fade(currentVol, targetVolume, this.crossfadeDuration);
        }
        
        this.isPlaying = true;
    }

    /**
     * Stop all day/night tracks
     */
    stopDayNightMusic() {
        if (this.dayTrack) {
            this.dayTrack.stop();
        }
        if (this.nightTrack) {
            this.nightTrack.stop();
        }
        this.currentMode = null;
        this.isPlaying = false;
        console.log('🎵 Day/Night music stopped');
    }

    /**
     * Play a music track (loops automatically)
     * @param {string} trackPath - Path to music file (e.g., '/music/forestDay.ogg' or 'music/forestDay.ogg')
     */
    async play(trackPath) {
        // If already playing this track, do nothing
        if (this.currentTrack === trackPath && this.isPlaying) {
            console.log('🎵 Track already playing:', trackPath);
            return;
        }

        // Stop current track if playing
        if (this.howl) {
            this.stop();
        }

        try {
            // Fix path for electron - remove leading slash to make it relative
            // In electron: dist/index.html loads music from dist/music/
            // So we need relative path: music/forestDay.ogg (not /music/forestDay.ogg)
            const isElectron = window.isElectron?.platform;
            const fixedPath = isElectron && trackPath.startsWith('/') 
                ? trackPath.substring(1)  // Remove leading slash
                : trackPath;
            
            console.log(`🎵 Loading music: "${trackPath}" → "${fixedPath}" (electron: ${!!isElectron})`);
            
            // Create new Howl instance
            this.howl = new Howl({
                src: [fixedPath],
                loop: true,
                volume: this.isMuted ? 0 : this.volume,
                html5: false, // Web Audio API - faster loading!
                preload: true,
                onload: () => {
                    console.log('🎵 Music loaded:', fixedPath);
                },
                onloaderror: (id, error) => {
                    console.error('🎵 Audio load error:', error);
                    console.error('🎵 Failed path:', fixedPath);
                },
                onplayerror: (id, error) => {
                    console.error('🎵 Audio play error:', error);
                    // Try to unlock audio on mobile
                    this.howl.once('unlock', () => {
                        this.howl.play();
                    });
                }
            });

            this.currentTrack = trackPath;

            // Play with fade-in
            this.howl.play();
            this.isPlaying = true;
            this.fadeIn();

            console.log('🎵 Now playing:', fixedPath, `(Volume: ${Math.round(this.volume * 100)}%)`);

        } catch (error) {
            console.error('🎵 Failed to play music:', error);
            console.error('🎵 Original path:', trackPath);
            this.cleanup();
        }
    }

    /**
     * Stop the current track
     */
    stop() {
        if (!this.howl) return;

        this.howl.stop();
        this.isPlaying = false;
        this.cleanup();

        console.log('🎵 Music stopped');
    }

    /**
     * Pause the current track (can be resumed)
     */
    pause() {
        if (!this.howl || !this.isPlaying) return;

        this.howl.pause();
        this.isPlaying = false;

        console.log('🎵 Music paused');
    }

    /**
     * Resume the paused track
     */
    resume() {
        if (!this.howl || this.isPlaying) return;

        this.howl.play();
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
        const targetVolume = this.isMuted ? 0 : this.volume;
        
        // Update day/night tracks if active
        if (this.dayTrack && this.dayTrack.playing()) {
            this.dayTrack.volume(targetVolume);
        }
        if (this.nightTrack && this.nightTrack.playing()) {
            this.nightTrack.volume(targetVolume);
        }
        
        // Update legacy single track
        if (this.howl) {
            this.howl.volume(targetVolume);
        }
        
        // Global volume
        Howler.volume(targetVolume);
    }

    /**
     * Fade in effect (smooth volume increase) - Using Howler's built-in fade
     */
    fadeIn(duration = 2000) {
        if (!this.howl) return;

        const targetVolume = this.isMuted ? 0 : this.volume;
        this.howl.fade(0, targetVolume, duration);
    }

    /**
     * Fade out effect (smooth volume decrease) - Using Howler's built-in fade
     */
    fadeOut(duration = 1000) {
        return new Promise((resolve) => {
            if (!this.howl) {
                resolve();
                return;
            }

            const currentVolume = this.howl.volume();
            this.howl.fade(currentVolume, 0, duration);
            
            // Wait for fade to complete
            setTimeout(resolve, duration);
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
        // Clean up day/night tracks
        if (this.dayTrack) {
            this.dayTrack.unload();
            this.dayTrack = null;
        }
        if (this.nightTrack) {
            this.nightTrack.unload();
            this.nightTrack = null;
        }
        this.currentMode = null;
        
        // Clean up legacy single track
        if (this.howl) {
            this.howl.unload();
            this.howl = null;
        }
        
        this.currentTrack = null;
        this.isPlaying = false;
    }

    /**
     * Dispose of the music system (call on game shutdown)
     */
    dispose() {
        this.stopDayNightMusic();
        this.stop();
        this.cleanup();
        console.log('🎵 MusicSystem disposed');
    }
}
