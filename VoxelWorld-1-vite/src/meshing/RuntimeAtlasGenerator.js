/**
 * RuntimeAtlasGenerator.js
 *
 * Generates texture atlas at runtime by loading individual block textures
 * and assembling them on a canvas. This solves Electron file:// URL issues
 * by using the working electronAPI.readFile() instead of THREE.TextureLoader.
 */

import * as THREE from 'three';

export class RuntimeAtlasGenerator {
    constructor() {
        this.textureSize = 128; // Size of each texture tile
        this.atlasSize = 2048;  // Total atlas size
        this.tilesPerRow = this.atlasSize / this.textureSize; // 16 tiles per row

        this.canvas = null;
        this.ctx = null;
        this.atlasKey = {};
        this.loadedCount = 0;
        this.totalTextures = 0;
    }

    /**
     * Generate atlas from list of texture filenames
     * @param {Array<string>} textureFiles - Array of texture filenames (e.g., ['grass.png', 'dirt.png'])
     * @returns {Promise<{texture: THREE.CanvasTexture, key: Object}>}
     */
    async generateAtlas(textureFiles) {
        console.log(`🎨 RuntimeAtlasGenerator: Starting atlas generation for ${textureFiles.length} textures...`);

        this.totalTextures = textureFiles.length;
        this.loadedCount = 0;

        // Create canvas for atlas
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.atlasSize;
        this.canvas.height = this.atlasSize;
        this.ctx = this.canvas.getContext('2d');

        // Fill with transparent background
        this.ctx.clearRect(0, 0, this.atlasSize, this.atlasSize);

        // Load and place each texture
        const isElectron = typeof window !== 'undefined' && window.electronAPI;

        for (let i = 0; i < textureFiles.length; i++) {
            const filename = textureFiles[i];
            const textureName = filename.replace('.png', ''); // Remove .png extension

            // Calculate position in atlas (16x16 grid)
            const col = i % this.tilesPerRow;
            const row = Math.floor(i / this.tilesPerRow);
            const x = col * this.textureSize;
            const y = row * this.textureSize;

            try {
                let imageData;

                if (isElectron) {
                    // Electron: Use RELATIVE path (same as EnhancedGraphics)
                    // THREE.TextureLoader works with relative paths in Electron!
                    const img = new Image();
                    const loadPromise = new Promise((resolve, reject) => {
                        img.onload = () => resolve(img);
                        img.onerror = (e) => reject(new Error(`Failed to load ${filename}: ${e.message}`));
                    });

                    // Use relative path - works in both dev and production Electron
                    img.src = `art/blocks/${filename}`;
                    imageData = await loadPromise;
                } else {
                    // Browser: Use fetch and blob
                    const response = await fetch(`/art/blocks/${filename}`);
                    const blob = await response.blob();
                    const img = new Image();

                    const loadPromise = new Promise((resolve, reject) => {
                        img.onload = () => resolve(img);
                        img.onerror = (e) => reject(new Error(`Failed to load ${filename}: ${e.message}`));
                    });

                    img.src = URL.createObjectURL(blob);
                    imageData = await loadPromise;
                }

                // Draw texture onto atlas canvas
                this.ctx.drawImage(imageData, x, y, this.textureSize, this.textureSize);

                // Store UV coordinates in atlas key (normalized 0-1)
                this.atlasKey[textureName] = {
                    u: x / this.atlasSize,
                    v: y / this.atlasSize,
                    width: this.textureSize / this.atlasSize,
                    height: this.textureSize / this.atlasSize
                };

                this.loadedCount++;

                if (this.loadedCount % 10 === 0) {
                    console.log(`🎨 RuntimeAtlasGenerator: Loaded ${this.loadedCount}/${this.totalTextures} textures...`);
                }

            } catch (error) {
                console.error(`❌ RuntimeAtlasGenerator: Failed to load ${filename}:`, error);
                // Fill with magenta error color
                this.ctx.fillStyle = '#FF00FF';
                this.ctx.fillRect(x, y, this.textureSize, this.textureSize);

                // Still add to key so UVs work
                this.atlasKey[textureName] = {
                    u: x / this.atlasSize,
                    v: y / this.atlasSize,
                    width: this.textureSize / this.atlasSize,
                    height: this.textureSize / this.atlasSize
                };

                this.loadedCount++; // Count it anyway so we continue
            }
        }

        // Create Three.js texture from canvas
        const texture = new THREE.CanvasTexture(this.canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.needsUpdate = true;

        console.log(`✅ RuntimeAtlasGenerator: Atlas generated successfully!`);
        console.log(`   - Loaded ${this.loadedCount}/${this.totalTextures} textures`);
        console.log(`   - Atlas size: ${this.atlasSize}x${this.atlasSize}`);
        console.log(`   - Textures in key:`, Object.keys(this.atlasKey).length);

        return {
            texture: texture,
            key: this.atlasKey
        };
    }

    /**
     * Get list of texture files from assets
     * @returns {Promise<Array<string>>}
     */
    async getTextureFileList() {
        const isElectron = typeof window !== 'undefined' && window.electronAPI;

        try {
            if (isElectron && window.electronAPI.readFile) {
                // Electron: Read fileList.json manifest using readFile
                console.log('🎨 RuntimeAtlasGenerator: Loading texture list from manifest (Electron)...');
                const fileContent = await window.electronAPI.readFile('art/blocks/fileList.json');
                const fileList = JSON.parse(fileContent);
                // fileList is {filename: extension}, convert to array of "filename.ext"
                return Object.entries(fileList)
                    .filter(([name, ext]) => ext === '.png' || ext === '.jpg' || ext === '.jpeg')
                    .map(([name, ext]) => `${name}${ext}`);
            } else {
                // Browser: Use fetch to get fileList.json manifest
                console.log('🎨 RuntimeAtlasGenerator: Loading texture list from manifest (Browser)...');
                const response = await fetch('/art/blocks/fileList.json');
                const fileList = await response.json();
                // fileList is {filename: extension}, convert to array of "filename.ext"
                return Object.entries(fileList)
                    .filter(([name, ext]) => ext === '.png' || ext === '.jpg' || ext === '.jpeg')
                    .map(([name, ext]) => `${name}${ext}`);
            }
        } catch (error) {
            console.error('❌ RuntimeAtlasGenerator: Failed to load texture file list:', error);
            throw error;
        }
    }

    /**
     * Get canvas for debugging
     */
    getCanvas() {
        return this.canvas;
    }
}
