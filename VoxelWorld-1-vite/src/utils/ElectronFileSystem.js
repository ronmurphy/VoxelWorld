/**
 * ElectronFileSystem - File operations for tutorial editor in Electron
 * Provides native save/load dialogs and auto-load functionality
 */

export class ElectronFileSystem {
    /**
     * Check if running in Electron
     */
    static isElectron() {
        return typeof window !== 'undefined' && 
               window.electronAPI !== undefined &&
               window.electronAPI.tutorialEditor !== undefined;
    }

    /**
     * Auto-load tutorialScripts.json from data folder
     * @returns {Promise<Object|null>} Tutorial data or null if not found
     */
    static async autoLoadTutorials() {
        if (!this.isElectron()) {
            console.warn('⚠️ Not in Electron, using web file loader');
            return this.webAutoLoad();
        }

        try {
            const data = await window.electronAPI.tutorialEditor.autoLoad();
            
            if (data) {
                console.log('✅ Auto-loaded tutorialScripts.json');
                return data;
            } else {
                console.log('ℹ️ No existing tutorialScripts.json found');
                return null;
            }
        } catch (error) {
            console.error('❌ Auto-load failed:', error);
            return null;
        }
    }

    /**
     * Fallback web auto-load using fetch
     */
    static async webAutoLoad() {
        try {
            const response = await fetch('./assets/data/tutorialScripts.json');
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Auto-loaded tutorialScripts.json (web mode)');
                return data;
            } else {
                console.log('ℹ️ No tutorialScripts.json found (web mode)');
                return null;
            }
        } catch (error) {
            console.log('ℹ️ tutorialScripts.json not found or error:', error.message);
            return null;
        }
    }

    /**
     * Show native open dialog and load file
     * @returns {Promise<Object|null>} Loaded data or null if cancelled
     */
    static async showOpenDialog() {
        if (!this.isElectron()) {
            console.warn('⚠️ Native dialogs only available in Electron');
            return this.webOpenDialog();
        }

        try {
            const result = await window.electronAPI.tutorialEditor.openDialog();
            
            if (result.canceled || !result.data) {
                console.log('ℹ️ File open cancelled');
                return null;
            }

            console.log('✅ Loaded file from:', result.filePath);
            return result.data;
        } catch (error) {
            console.error('❌ Open dialog failed:', error);
            return null;
        }
    }

    /**
     * Fallback web open dialog using file input
     */
    static async webOpenDialog() {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) {
                    resolve(null);
                    return;
                }

                try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    console.log('✅ Loaded file:', file.name);
                    resolve(data);
                } catch (error) {
                    console.error('❌ Failed to load file:', error);
                    alert('Error loading file: ' + error.message);
                    resolve(null);
                }
            };

            input.oncancel = () => resolve(null);
            input.click();
        });
    }

    /**
     * Show native save dialog and save file
     * @param {Object} data - Data to save
     * @param {string} defaultPath - Default filename
     * @returns {Promise<boolean>} True if saved successfully
     */
    static async showSaveDialog(data, defaultPath = 'tutorialScripts.json') {
        if (!this.isElectron()) {
            console.warn('⚠️ Native dialogs only available in Electron');
            return this.webSaveDialog(data, defaultPath);
        }

        try {
            const result = await window.electronAPI.tutorialEditor.saveDialog(data, defaultPath);

            if (result.canceled) {
                console.log('ℹ️ File save cancelled');
                return false;
            }

            console.log('✅ Saved file to:', result.filePath);
            return true;
        } catch (error) {
            console.error('❌ Save dialog failed:', error);
            alert('Error saving file: ' + error.message);
            return false;
        }
    }

    /**
     * Fallback web save dialog using download
     */
    static async webSaveDialog(data, defaultPath) {
        try {
            const blob = new Blob([JSON.stringify(data, null, 2)], { 
                type: 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = defaultPath;
            a.click();
            URL.revokeObjectURL(url);
            
            console.log('✅ Downloaded file:', defaultPath);
            return true;
        } catch (error) {
            console.error('❌ Web save failed:', error);
            return false;
        }
    }

    /**
     * Save to default location (data folder)
     * @param {Object} data - Data to save
     * @returns {Promise<boolean>} True if saved successfully
     */
    static async saveToDefault(data) {
        if (!this.isElectron()) {
            console.warn('⚠️ Default save only available in Electron');
            return this.webSaveDialog(data, 'tutorialScripts.json');
        }

        try {
            await window.electronAPI.tutorialEditor.saveDefault(data);
            console.log('✅ Saved to default location (data/tutorialScripts.json)');
            return true;
        } catch (error) {
            console.error('❌ Default save failed:', error);
            alert('Error saving to default location: ' + error.message);
            return false;
        }
    }
}
