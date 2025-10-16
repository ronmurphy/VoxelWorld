#!/usr/bin/env node
/**
 * Texture Atlas Generator for VoxelWorld
 *
 * Scans ALL textures in blocks folder and creates a single atlas.png
 * Generates atlas-key.json mapping for UV coordinates
 *
 * Usage: node build-texture-atlas.cjs
 */

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// Configuration
const BLOCKS_DIR = path.join(__dirname, 'assets', 'art', 'blocks'); // Use SOURCE assets folder
const OUTPUT_DIR = path.join(__dirname, 'assets', 'art'); // Output to SOURCE so Vite copies it
const OUTPUT_ATLAS = path.join(OUTPUT_DIR, 'atlas.png');
const OUTPUT_KEY = path.join(OUTPUT_DIR, 'atlas-key.json');

const TILE_SIZE = 128; // Each texture will be 128x128 in atlas
const ATLAS_COLS = 16; // 16 columns (more room for all variants)
const ATLAS_ROWS = 16; // 16 rows (256 total slots)
const ATLAS_WIDTH = TILE_SIZE * ATLAS_COLS;   // 2048px
const ATLAS_HEIGHT = TILE_SIZE * ATLAS_ROWS;  // 2048px

async function generateAtlas() {
    console.log('🎨 Starting Texture Atlas Generation...');
    console.log(`📁 Source: ${BLOCKS_DIR}`);
    console.log(`📐 Atlas Size: ${ATLAS_WIDTH}x${ATLAS_HEIGHT} (${ATLAS_COLS}x${ATLAS_ROWS} grid)`);
    console.log(`📏 Tile Size: ${TILE_SIZE}x${TILE_SIZE}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

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
    const allFiles = fs.readdirSync(BLOCKS_DIR)
        .filter(file => /\.(png|jpe?g|webp)$/i.test(file))
        .sort(); // Alphabetical order for consistency

    console.log(`📦 Found ${allFiles.length} texture files`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Process each texture file
    for (const fileName of allFiles) {
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

            console.log(`✅ [${currentRow},${currentCol}] ${textureName.padEnd(35)} (${img.width}x${img.height} → ${TILE_SIZE}x${TILE_SIZE})`);
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
            console.error(`❌ Error loading ${fileName}: ${error.message}`);
            errorCount++;
        }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Results: ${loadedCount} loaded, ${errorCount} errors`);
    console.log(`📦 Total textures in atlas: ${Object.keys(atlasKey.textures).length}`);
    console.log(`📍 Used slots: ${currentRow * ATLAS_COLS + currentCol} / ${ATLAS_COLS * ATLAS_ROWS}`);

    // Save atlas image
    const atlasBuffer = canvas.toBuffer('image/png');
    fs.writeFileSync(OUTPUT_ATLAS, atlasBuffer);
    console.log(`💾 Saved: ${OUTPUT_ATLAS}`);

    // Save atlas key
    fs.writeFileSync(OUTPUT_KEY, JSON.stringify(atlasKey, null, 2));
    console.log(`💾 Saved: ${OUTPUT_KEY}`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Texture Atlas Generation Complete!');
    console.log('💡 Atlas saved to assets/art/ - Vite will copy to dist/ during build');
}

// Run generator
generateAtlas().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
