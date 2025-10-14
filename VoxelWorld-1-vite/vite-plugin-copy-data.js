/**
 * Vite plugin to copy the data/ folder to dist/ during build
 * This ensures JSON data files are available in production builds
 */

import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

export default function copyDataFiles() {
    return {
        name: 'copy-data-files',
        writeBundle() {
            const sourceDir = 'data';
            const targetDir = 'dist/data';

            // Create target directory if it doesn't exist
            try {
                mkdirSync(targetDir, { recursive: true });
            } catch (err) {
                if (err.code !== 'EEXIST') throw err;
            }

            // Copy all files from data/ to dist/data/
            const copyRecursive = (src, dest) => {
                const entries = readdirSync(src);
                
                for (const entry of entries) {
                    const srcPath = join(src, entry);
                    const destPath = join(dest, entry);
                    
                    if (statSync(srcPath).isDirectory()) {
                        mkdirSync(destPath, { recursive: true });
                        copyRecursive(srcPath, destPath);
                    } else {
                        copyFileSync(srcPath, destPath);
                        console.log(`📋 Copied: ${srcPath} → ${destPath}`);
                    }
                }
            };

            copyRecursive(sourceDir, targetDir);
            console.log('✅ Data files copied to dist/');
        }
    };
}
