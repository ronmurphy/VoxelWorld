/**
 * vite-plugin-texture-atlas.js
 *
 * Build-time plugin that generates texture atlas from art/blocks/*.{png,jpg,jpeg}
 * Output: assets/art/atlas.png and assets/art/atlas-key.json
 *
 * Runs automatically during Vite build - zero runtime overhead for Electron distribution
 */

import { readdir, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { createCanvas, loadImage } from 'canvas';

export function textureAtlasPlugin() {
    return {
        name: 'vite-plugin-texture-atlas',

        async buildStart() {
            console.log('🎨 Texture Atlas Generator: Starting...');

            // Configuration
            const BLOCKS_DIR = 'assets/art/blocks'; // Use SOURCE assets folder
            const OUTPUT_DIR = 'assets/art'; // Output to SOURCE so Vite copies it
            const OUTPUT_ATLAS = path.join(OUTPUT_DIR, 'atlas.png');
            const OUTPUT_KEY = path.join(OUTPUT_DIR, 'atlas-key.json');

            const TILE_SIZE = 128; // Each texture will be 128x128 in atlas
            const ATLAS_COLS = 16; // 16 columns (more room for all variants)
            const ATLAS_ROWS = 16; // 16 rows (256 total slots)
            const ATLAS_WIDTH = TILE_SIZE * ATLAS_COLS;   // 2048px
            const ATLAS_HEIGHT = TILE_SIZE * ATLAS_ROWS;  // 2048px

            console.log(`📁 Source: ${BLOCKS_DIR}`);
            console.log(`📐 Atlas Size: ${ATLAS_WIDTH}x${ATLAS_HEIGHT} (${ATLAS_COLS}x${ATLAS_ROWS} grid)`);
            console.log(`📏 Tile Size: ${TILE_SIZE}x${TILE_SIZE}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            try {
                // Ensure output directory exists
                if (!existsSync(OUTPUT_DIR)) {
                    await mkdir(OUTPUT_DIR, { recursive: true });
                }

                // Create canvas
                const canvas = createCanvas(ATLAS_WIDTH, ATLAS_HEIGHT);
                const ctx = canvas.getContext('2d');

                // Fill with magenta (missing texture indicator)
                ctx.fillStyle = '#FF00FF';
                ctx.fillRect(0, 0, ATLAS_WIDTH, ATLAS_HEIGHT);

                // Atlas key for UV mapping
                const atlasKey = {
                    atlasSize: { width: ATLAS_WIDTH, height: ATLAS_HEIGHT },
                    tileSize: TILE_SIZE,
                    textures: {}
                };

                let currentRow = 0;
                let currentCol = 0;
                let loadedCount = 0;
                let errorCount = 0;

                // Scan ALL files in blocks directory
                const allFiles = await readdir(BLOCKS_DIR);
                const imageFiles = allFiles
                    .filter(file => /\.(png|jpe?g|webp)$/i.test(file))
                    .sort(); // Alphabetical order for consistency

                console.log(`📦 Found ${imageFiles.length} texture files`);
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

                // Process each texture file
                for (const fileName of imageFiles) {
                    const filePath = path.join(BLOCKS_DIR, fileName);

                    // Generate texture name (remove extension and suffix markers)
                    // Example: "oak_wood-sides.jpeg" → texture name: "oak_wood-sides"
                    const textureName = fileName.replace(/\.(png|jpe?g|webp)$/i, '');

                    try {
                        // Load image
                        const img = await loadImage(filePath);

                        // Calculate position in atlas
                        const x = currentCol * TILE_SIZE;
                        const y = currentRow * TILE_SIZE;

                        // Draw resized image to atlas
                        ctx.drawImage(img, x, y, TILE_SIZE, TILE_SIZE);

                        // Store in key with FULL texture name (including variant suffix)
                        atlasKey.textures[textureName] = {
                            file: fileName,
                            col: currentCol,
                            row: currentRow,
                            x: x,
                            y: y,
                            width: TILE_SIZE,
                            height: TILE_SIZE,
                            originalSize: { width: img.width, height: img.height },
                            // UV coordinates (0.0 to 1.0)
                            uv: {
                                minU: currentCol / ATLAS_COLS,
                                minV: currentRow / ATLAS_ROWS,
                                maxU: (currentCol + 1) / ATLAS_COLS,
                                maxV: (currentRow + 1) / ATLAS_ROWS
                            }
                        };

                        console.log(`  ✓ [${currentRow},${currentCol}] ${textureName.padEnd(35)} (${img.width}x${img.height} → ${TILE_SIZE}x${TILE_SIZE})`);
                        loadedCount++;

                        // Advance grid position
                        currentCol++;
                        if (currentCol >= ATLAS_COLS) {
                            currentCol = 0;
                            currentRow++;
                        }

                        // Safety check - don't exceed atlas size
                        if (currentRow >= ATLAS_ROWS) {
                            console.warn(`⚠️  Atlas full! Increase ATLAS_ROWS to fit more textures.`);
                            break;
                        }

                    } catch (error) {
                        console.error(`  ✗ Error loading ${fileName}: ${error.message}`);
                        errorCount++;
                    }
                }

                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log(`📊 Results: ${loadedCount} loaded, ${errorCount} errors`);
                console.log(`📦 Total textures in atlas: ${Object.keys(atlasKey.textures).length}`);
                console.log(`📍 Used slots: ${currentRow * ATLAS_COLS + currentCol} / ${ATLAS_COLS * ATLAS_ROWS}`);

                // Save atlas image
                const atlasBuffer = canvas.toBuffer('image/png');
                await writeFile(OUTPUT_ATLAS, atlasBuffer);
                console.log(`💾 Saved: ${OUTPUT_ATLAS}`);

                // Save atlas key
                await writeFile(OUTPUT_KEY, JSON.stringify(atlasKey, null, 2));
                console.log(`💾 Saved: ${OUTPUT_KEY}`);

                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('✅ Texture Atlas Generation Complete!');
                console.log('💡 Atlas saved to assets/art/ - Vite will copy to dist/ during build');

            } catch (error) {
                console.error('❌ Texture Atlas Generator failed:', error);
                // Don't fail the build - greedy meshing can fallback to colors
            }
        }
    };
}
