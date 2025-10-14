import fs from 'fs';
import path from 'path';

/**
 * Vite plugin to copy tutorial-editor.html and drawflow assets to dist
 */
export default function copyTutorialEditor() {
  return {
    name: 'copy-tutorial-editor',
    closeBundle() {
      console.log('🎓 Copy Tutorial Editor: Starting...');
      
      const rootDir = process.cwd();
      const distDir = path.join(rootDir, 'dist');
      
      try {
        // Copy tutorial-editor.html
        const editorSrc = path.join(rootDir, 'tutorial-editor.html');
        const editorDest = path.join(distDir, 'tutorial-editor.html');
        fs.copyFileSync(editorSrc, editorDest);
        console.log('  ✅ tutorial-editor.html');
        
        // Copy TutorialConverter.js
        const converterSrc = path.join(rootDir, 'src', 'utils', 'TutorialConverter.js');
        const converterDest = path.join(distDir, 'TutorialConverter.js');
        fs.copyFileSync(converterSrc, converterDest);
        console.log('  ✅ TutorialConverter.js');
        
        // Copy drawflow CSS
        const drawflowCssSrc = path.join(rootDir, 'node_modules', 'drawflow', 'dist', 'drawflow.min.css');
        const drawflowCssDest = path.join(distDir, 'drawflow.min.css');
        fs.copyFileSync(drawflowCssSrc, drawflowCssDest);
        console.log('  ✅ drawflow.min.css');
        
        // Copy drawflow JS
        const drawflowJsSrc = path.join(rootDir, 'node_modules', 'drawflow', 'dist', 'drawflow.min.js');
        const drawflowJsDest = path.join(distDir, 'drawflow.min.js');
        fs.copyFileSync(drawflowJsSrc, drawflowJsDest);
        console.log('  ✅ drawflow.min.js');
        
        console.log('🎓 Copy Tutorial Editor: Complete!');
      } catch (error) {
        console.error('❌ Error copying tutorial editor:', error.message);
      }
    }
  };
}
