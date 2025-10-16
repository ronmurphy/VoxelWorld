/**
 * Test file for GreedyMesher
 * Run this in browser console to verify greedy meshing works
 */

import { GreedyMesher } from './GreedyMesher.js';

// Test 1: Simple 3x3x1 flat plane of same blocks
console.log('🧪 Test 1: 3x3 flat stone plane');
const testBlocks1 = [];
for (let x = 0; x < 3; x++) {
    for (let z = 0; z < 3; z++) {
        testBlocks1.push({ x, y: 0, z, blockType: 'stone', color: 0x696969 });
    }
}

const result1 = GreedyMesher.generateMesh(testBlocks1, 8);
console.log(`Input: 9 blocks`);
console.log(`Output: ${result1.vertexCount / 6} quads (expected: ~2 quads for top/bottom faces)`);
console.log(`Vertices: ${result1.vertexCount}`);
console.log('---');

// Test 2: Mixed block types (should NOT merge)
console.log('🧪 Test 2: 3x3 mixed stone and grass');
const testBlocks2 = [];
for (let x = 0; x < 3; x++) {
    for (let z = 0; z < 3; z++) {
        const blockType = (x + z) % 2 === 0 ? 'stone' : 'grass';
        const color = blockType === 'stone' ? 0x696969 : 0x228B22;
        testBlocks2.push({ x, y: 0, z, blockType, color });
    }
}

const result2 = GreedyMesher.generateMesh(testBlocks2, 8);
console.log(`Input: 9 blocks (checkerboard)`);
console.log(`Output: ${result2.vertexCount / 6} quads`);
console.log(`Should have MORE quads than Test 1 (can't merge different types)`);
console.log('---');

// Test 3: 3D cube of same blocks
console.log('🧪 Test 3: 3x3x3 solid stone cube');
const testBlocks3 = [];
for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
        for (let z = 0; z < 3; z++) {
            testBlocks3.push({ x, y, z, blockType: 'stone', color: 0x696969 });
        }
    }
}

const result3 = GreedyMesher.generateMesh(testBlocks3, 8);
console.log(`Input: 27 blocks`);
console.log(`Output: ${result3.vertexCount / 6} quads`);
console.log(`Without greedy: 27 cubes × 6 faces = 162 faces`);
console.log(`With greedy: Only exterior faces needed = ~54 faces (6 sides × 9 squares each)`);
console.log(`But greedy merges those 9 squares into 1 large face per side = 6 quads!`);
console.log('---');

// Test 4: Performance test - Full chunk (8×8×10 = 640 blocks)
console.log('🧪 Test 4: Full chunk performance test');
const testBlocks4 = [];
const startTime = performance.now();

// Generate a typical chunk: bedrock + stone layers + grass surface
for (let x = 0; x < 8; x++) {
    for (let z = 0; z < 8; z++) {
        // Bedrock layer
        testBlocks4.push({ x, y: 0, z, blockType: 'bedrock', color: 0x1a1a1a });

        // Stone layers (1-8)
        for (let y = 1; y < 9; y++) {
            testBlocks4.push({ x, y, z, blockType: 'stone', color: 0x696969 });
        }

        // Grass surface
        testBlocks4.push({ x, y: 9, z, blockType: 'grass', color: 0x228B22 });
    }
}

const result4 = GreedyMesher.generateMesh(testBlocks4, 8);
const endTime = performance.now();

console.log(`Input: ${testBlocks4.length} blocks`);
console.log(`Output: ${result4.vertexCount / 6} quads`);
console.log(`Processing time: ${(endTime - startTime).toFixed(2)}ms`);
console.log(`Without greedy: ${testBlocks4.length * 6} potential faces`);
console.log(`Reduction: ${(((testBlocks4.length * 6) - (result4.vertexCount / 6)) / (testBlocks4.length * 6) * 100).toFixed(1)}%`);
console.log('---');

console.log('✅ All tests complete! Check numbers above to verify greedy meshing is working.');
console.log('Expected: Test 3 should show dramatic reduction (162 faces → 6 quads)');
