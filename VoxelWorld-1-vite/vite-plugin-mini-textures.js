/**
 * vite-plugin-mini-textures.js
 *
 * Build-time plugin that generates 32x32 mini textures from art/blocks/*.png
 * Output: dist/art/chunkMinis/ (Electron) and public/art/chunkMinis/ (dev preview)
 *
 * Only runs during build - zero runtime overhead for Electron distribution
 */

import { readdir, mkdir, copyFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { createCanvas, loadImage } from 'canvas';

export function miniTexturesPlugin() {
    // Helper function for generating mini textures
    const generateMini = async (sourcePath, outputPath) => {
        try {
            // Load source image
            const sourceImage = await loadImage(sourcePath);

            // Create 32x32 canvas
            const canvas = createCanvas(32, 32);
            const ctx = canvas.getContext('2d');

            // Resize with bicubic interpolation (smooth scaling)
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(sourceImage, 0, 0, 32, 32);

            // Save as PNG
            const buffer = canvas.toBuffer('image/png');
            await mkdir(path.dirname(outputPath), { recursive: true });
            const { writeFile } = await import('fs/promises');
            await writeFile(outputPath, buffer);

            const filename = path.basename(outputPath);
            console.log(`  ✓ Generated: ${filename}`);

        } catch (error) {
            console.error(`  ✗ Failed to generate mini for ${sourcePath}:`, error.message);
        }
    };

    return {
        name: 'vite-plugin-mini-textures',

        async buildStart() {
            console.log('🎨 Mini Texture Generator: Starting...');

            const blocksDir = 'assets/art/blocks';
            const minisDir = 'assets/art/chunkMinis';

            // Ensure output directory exists
            if (!existsSync(minisDir)) {
                await mkdir(minisDir, { recursive: true });
                console.log(`📁 Created directory: ${minisDir}`);
            }

            try {
                // Scan art/blocks for all image files (PNG, JPG, JPEG)
                const files = await readdir(blocksDir);
                const imageFiles = files.filter(f =>
                    f.endsWith('.png') ||
                    f.endsWith('.jpg') ||
                    f.endsWith('.jpeg')
                );

                console.log(`🔍 Found ${imageFiles.length} block textures to process`);

                let generated = 0;
                let cached = 0;

                for (const filename of imageFiles) {
                    const sourcePath = path.join(blocksDir, filename);
                    // Always output as PNG (normalized format)
                    const outputFilename = filename.replace(/\.(jpg|jpeg)$/i, '.png');
                    const outputPath = path.join(minisDir, outputFilename);

                    // Check if mini already exists (skip regeneration)
                    if (existsSync(outputPath)) {
                        cached++;
                        continue;
                    }

                    // Generate 32x32 mini texture
                    await generateMini(sourcePath, outputPath);
                    generated++;
                }

                console.log(`✅ Mini Textures: ${generated} generated, ${cached} cached, ${imageFiles.length} total`);

            } catch (error) {
                console.error('❌ Mini Texture Generator failed:', error);
                // Don't fail the build - LOD can fallback to colors
            }
        }
    };
}
