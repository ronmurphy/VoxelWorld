/**
 * Vite Plugin: Copy Help Files
 * 
 * Copies markdown help files from assets/help/ to dist/assets/help/
 * during build to ensure they're available at runtime.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function copyHelpFiles() {
    return {
        name: 'vite-plugin-copy-help',
        
        // Run after build is complete
        closeBundle() {
            console.log('\n📚 Copy Help Files: Starting...');
            
            const sourceDir = path.join(__dirname, 'assets', 'help');
            const destDir = path.join(__dirname, 'dist', 'assets', 'help');
            
            // Check if source directory exists
            if (!fs.existsSync(sourceDir)) {
                console.log('⚠️  Source directory not found:', sourceDir);
                return;
            }
            
            // Create destination directory
            fs.mkdirSync(destDir, { recursive: true });
            
            // Copy all markdown files
            const files = fs.readdirSync(sourceDir);
            let copiedCount = 0;
            
            for (const file of files) {
                const sourcePath = path.join(sourceDir, file);
                const destPath = path.join(destDir, file);
                
                // Only copy files (not directories)
                const stat = fs.statSync(sourcePath);
                if (stat.isFile()) {
                    fs.copyFileSync(sourcePath, destPath);
                    copiedCount++;
                    console.log(`  ✅ ${file}`);
                }
            }
            
            console.log(`📚 Copy Help Files: ${copiedCount} files copied to dist/assets/help/\n`);
        }
    };
}
