/**
 * Vite Plugin: Asset Manifest Generator
 * 
 * Scans assets/art/ folders and generates fileList.json manifests
 * containing all files with their extensions.
 * 
 * Benefits:
 * - Zero runtime discovery cost
 * - No 404 errors during asset loading
 * - Faster startup (no multi-extension fallback loops)
 * - Build-time asset validation
 * 
 * Usage in vite.config.js:
 *   import assetManifest from './vite-plugin-asset-manifest.js'
 *   plugins: [assetManifest()]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function assetManifest() {
    return {
        name: 'vite-plugin-asset-manifest',
        
        // Run during build start
        buildStart() {
            console.log('\n📋 Asset Manifest Generator: Starting...');
            
            const assetsDir = path.join(__dirname, 'assets');
            
            // Categories to scan
            const categories = [
                { path: 'art/blocks', name: 'blocks' },
                { path: 'art/entities', name: 'entities' },
                { path: 'art/tools', name: 'tools' },
                { path: 'art/food', name: 'food' },
                { path: 'art/time', name: 'time' },
                { path: 'music', name: 'music' }
            ];
            
            let totalFiles = 0;
            let totalManifests = 0;
            
            for (const category of categories) {
                const categoryPath = path.join(assetsDir, category.path);
                
                if (!fs.existsSync(categoryPath)) {
                    console.log(`⚠️  Skipping ${category.name}: directory not found`);
                    continue;
                }
                
                // Scan directory for files
                const files = fs.readdirSync(categoryPath);
                const manifest = {};
                
                for (const file of files) {
                    const filePath = path.join(categoryPath, file);
                    const stat = fs.statSync(filePath);
                    
                    // Skip directories and hidden files
                    if (stat.isDirectory() || file.startsWith('.')) {
                        continue;
                    }
                    
                    // Parse filename and extension
                    const ext = path.extname(file);
                    const baseName = path.basename(file, ext);
                    
                    // Store in manifest: { "oak_wood-sides": ".jpeg" }
                    manifest[baseName] = ext;
                }
                
                // Write manifest to category directory
                const manifestPath = path.join(categoryPath, 'fileList.json');
                fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
                
                const fileCount = Object.keys(manifest).length;
                totalFiles += fileCount;
                totalManifests++;
                
                console.log(`✅ ${category.name}: ${fileCount} files → ${category.path}/fileList.json`);
            }
            
            console.log(`📋 Asset Manifest Generator: ${totalManifests} manifests created (${totalFiles} files total)\n`);
        }
    };
}
