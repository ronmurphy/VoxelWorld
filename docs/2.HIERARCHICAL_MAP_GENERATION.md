# Hierarchical Map Generation System

## Overview

This document describes a 5-layer hierarchical procedural generation system for creating coherent, large-scale worlds with logical biome placement, continental landmasses, and smooth transitions. The system uses Web Workers for background generation and aggressive caching to maintain performance.

---

## Core Philosophy

**Traditional Perlin/Simplex noise creates random blobs** - good for local detail but poor for creating continents, logical biome clustering, and explorable worlds.

**Hierarchical generation solves this** by starting macro (continents) and zooming in progressively (regions → biomes → terrain → details), similar to how Minecraft and Dwarf Fortress work.

---

## 5-Layer Architecture

### Layer 1: Macro (2048 blocks/pixel) - Continental Structure
- **Purpose**: Define land vs water at continental scale
- **Resolution**: 256×256 pixel map = 524,288 blocks coverage
- **Generation**: Simple noise threshold (land/water binary mask)
- **Cache**: Forever (seed-based, never regenerate)
- **Data Size**: ~64KB (256×256 bytes)

### Layer 2: Regional (512 blocks/pixel) - Temperature Zones
- **Purpose**: Assign temperature zones (freezing, cold, temperate, warm)
- **Resolution**: 1024×1024 pixel map (4× Layer 1)
- **Generation**: Noise + smoothing pass for natural gradients
- **Cache**: Forever (seed-based, never regenerate)
- **Data Size**: ~1MB (1024×1024 bytes)

### Layer 3: Biomes (128 blocks/pixel) - Specific Biome Assignment
- **Purpose**: Assign specific biomes (forest, desert, tundra, etc.)
- **Resolution**: 4096×4096 pixel map (4× Layer 2)
- **Generation**: Temperature-based biome selection + local noise variation
- **Cache**: Per 512×512 block region (~64KB each)
- **Data Size**: ~64KB per cached region

### Layer 4: Terrain (32 blocks/pixel) - Height Maps
- **Purpose**: Generate terrain elevation and shape
- **Resolution**: Generated per chunk cluster (e.g., 3×3 chunks)
- **Generation**: Biome-specific height amplification + multi-octave noise
- **Cache**: As part of chunk data
- **Data Size**: Included in chunk vertex data (~2-4KB per chunk)

### Layer 5: Details (8 blocks/pixel) - Structures & Features
- **Purpose**: Place trees, shrubs, rocks, structures
- **Resolution**: Generated per individual chunk
- **Generation**: Biome-specific placement rules + density maps
- **Cache**: As part of chunk data
- **Data Size**: Included in chunk vertex data

---

## Generation Flow (Complete Pipeline)

```
┌─────────────────────────────────────────────────────────┐
│ WORLD CREATION (One-Time per Seed)                      │
├─────────────────────────────────────────────────────────┤
│ 1. Generate Layer 1 (Land/Water Mask)                   │
│    → Cache to IndexedDB/fs.promises                      │
│ 2. Generate Layer 2 (Temperature Zones)                 │
│    → Cache to IndexedDB/fs.promises                      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ CHUNK GENERATION (Per Chunk, In Web Worker)             │
├─────────────────────────────────────────────────────────┤
│ 1. Load cached Layer 1 & 2 data (fast lookup)           │
│ 2. Generate/Load Layer 3 for region (biomes)            │
│ 3. Generate Layer 4 (terrain height map)                │
│ 4. Build stone terrain structure                        │
│ 5. Fill water blocks (y ≤ 3)                            │
│ 6. Apply surface blocks (1 layer, biome-specific)       │
│ 7. Generate Layer 5 (trees, structures)                 │
│ 8. Generate caves/ravines (negative space)              │
│ 9. Build vertex data (positions, normals, UVs, indices) │
│ 10. Transfer to main thread (TypedArrays)               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ MAIN THREAD (Three.js Rendering)                        │
├─────────────────────────────────────────────────────────┤
│ 1. Receive vertex data from worker                      │
│ 2. Create THREE.BufferGeometry from arrays              │
│ 3. Create THREE.Mesh with materials                     │
│ 4. Add to scene                                         │
│ 5. Cache chunk data (CacheChunk.js)                     │
└─────────────────────────────────────────────────────────┘
```

---

## Detailed Layer Specifications

### Layer 1: Land/Water Mask

**Algorithm:**
```javascript
// Generate once per world seed
function generateLayer1(seed) {
  const size = 256;
  const noise = new SimplexNoise(seed);
  const landMask = new Uint8Array(size * size);

  // Land threshold: 60% land, 40% water
  const LAND_THRESHOLD = 0.4;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const ny = y / size;

      // Single octave, large-scale noise
      const value = noise.noise2D(nx * 2, ny * 2) * 0.5 + 0.5; // [0, 1]

      // Binary: 1 = land, 0 = water
      landMask[y * size + x] = value > LAND_THRESHOLD ? 1 : 0;
    }
  }

  // Smoothing pass: remove tiny islands/lakes
  return smoothBinaryMask(landMask, size, 3); // 3×3 filter
}

function smoothBinaryMask(mask, size, radius) {
  const smoothed = new Uint8Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sum = 0;
      let count = 0;

      // Count neighbors
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
            sum += mask[ny * size + nx];
            count++;
          }
        }
      }

      // If majority are land, make this land (removes single-pixel noise)
      smoothed[y * size + x] = (sum / count) > 0.5 ? 1 : 0;
    }
  }

  return smoothed;
}
```

**Storage:**
- Format: `Uint8Array` (1 byte per pixel)
- Size: 65,536 bytes (64KB)
- Key: `world_${seed}_layer1`

---

### Layer 2: Temperature Zones

**Temperature Mapping:**
```
0.00 - 0.25 = Freezing (4)
0.25 - 0.50 = Cold (3)
0.50 - 0.75 = Temperate (2)
0.75 - 1.00 = Warm (1)
```

**Algorithm:**
```javascript
function generateLayer2(seed, layer1Data) {
  const size = 1024; // 4× Layer 1
  const noise = new SimplexNoise(seed + 1); // Different seed offset
  const tempMap = new Uint8Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Check if this position is land (downsample from Layer 1)
      const layer1X = Math.floor(x / 4);
      const layer1Y = Math.floor(y / 4);
      const isLand = layer1Data[layer1Y * 256 + layer1X] === 1;

      if (!isLand) {
        tempMap[y * size + x] = 0; // Water = no temperature
        continue;
      }

      // Generate temperature noise
      const nx = x / size;
      const ny = y / size;

      // Latitude gradient (colder at poles, warmer at equator)
      const latitude = Math.abs(ny - 0.5) * 2; // [0, 1], 0 = equator
      const latitudeTemp = 1.0 - latitude; // Warmer at equator

      // Noise variation (creates temperature pockets)
      const noiseValue = noise.noise2D(nx * 3, ny * 3) * 0.5 + 0.5; // [0, 1]

      // Combine: 70% latitude, 30% noise
      const rawTemp = latitudeTemp * 0.7 + noiseValue * 0.3;

      // Map to temperature zones (1-4)
      if (rawTemp < 0.25) tempMap[y * size + x] = 4; // Freezing
      else if (rawTemp < 0.50) tempMap[y * size + x] = 3; // Cold
      else if (rawTemp < 0.75) tempMap[y * size + x] = 2; // Temperate
      else tempMap[y * size + x] = 1; // Warm
    }
  }

  // Smoothing pass: create natural temperature gradients
  return smoothTemperatureMap(tempMap, size, 2); // 5×5 filter
}

function smoothTemperatureMap(tempMap, size, radius) {
  const smoothed = new Uint8Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (tempMap[y * size + x] === 0) {
        smoothed[y * size + x] = 0; // Keep water as 0
        continue;
      }

      let sum = 0;
      let count = 0;

      // Average neighbors
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
            const val = tempMap[ny * size + nx];
            if (val > 0) { // Skip water
              sum += val;
              count++;
            }
          }
        }
      }

      // Round to nearest temperature zone
      smoothed[y * size + x] = Math.round(sum / count);
    }
  }

  return smoothed;
}
```

**Storage:**
- Format: `Uint8Array` (1 byte per pixel)
- Size: 1,048,576 bytes (1MB)
- Key: `world_${seed}_layer2`

---

### Layer 3: Biome Assignment

**Biome Definitions:**
```javascript
const BIOME_TYPES = {
  // Warm biomes (temperature = 1)
  PLAINS: { id: 1, temp: 1, surfaceBlock: 'grass', heightAmp: 2 },
  DESERT: { id: 2, temp: 1, surfaceBlock: 'sand', heightAmp: 3 },
  SAVANNA: { id: 3, temp: 1, surfaceBlock: 'dry_grass', heightAmp: 2 },

  // Temperate biomes (temperature = 2)
  FOREST: { id: 4, temp: 2, surfaceBlock: 'grass', heightAmp: 4 },
  MOUNTAINS: { id: 5, temp: 2, surfaceBlock: 'stone', heightAmp: 20 },

  // Cold biomes (temperature = 3)
  TUNDRA: { id: 6, temp: 3, surfaceBlock: 'snow', heightAmp: 2 },
  TAIGA: { id: 7, temp: 3, surfaceBlock: 'grass', heightAmp: 5 },

  // Freezing biomes (temperature = 4)
  ICE_MOUNTAINS: { id: 8, temp: 4, surfaceBlock: 'snow', heightAmp: 18 },
  FROZEN_TUNDRA: { id: 9, temp: 4, surfaceBlock: 'snow', heightAmp: 1 },

  // Water
  OCEAN: { id: 10, temp: 0, surfaceBlock: 'water', heightAmp: 0 }
};

// Temperature → Biome mapping with weighted selection
const BIOME_WEIGHTS = {
  1: [ // Warm
    { biome: BIOME_TYPES.PLAINS, weight: 0.5 },
    { biome: BIOME_TYPES.DESERT, weight: 0.3 },
    { biome: BIOME_TYPES.SAVANNA, weight: 0.2 }
  ],
  2: [ // Temperate
    { biome: BIOME_TYPES.FOREST, weight: 0.4 },
    { biome: BIOME_TYPES.PLAINS, weight: 0.35 },
    { biome: BIOME_TYPES.MOUNTAINS, weight: 0.25 }
  ],
  3: [ // Cold
    { biome: BIOME_TYPES.TAIGA, weight: 0.4 },
    { biome: BIOME_TYPES.TUNDRA, weight: 0.35 },
    { biome: BIOME_TYPES.MOUNTAINS, weight: 0.25 }
  ],
  4: [ // Freezing
    { biome: BIOME_TYPES.FROZEN_TUNDRA, weight: 0.6 },
    { biome: BIOME_TYPES.ICE_MOUNTAINS, weight: 0.4 }
  ]
};
```

**Algorithm:**
```javascript
function generateLayer3ForRegion(seed, layer2Data, regionX, regionY) {
  // Each region = 512×512 blocks = 4096 pixels at Layer 3 resolution
  const regionSize = 512; // blocks
  const resolution = 128; // blocks/pixel
  const pixelSize = regionSize / resolution; // 4 pixels

  const noise = new SimplexNoise(seed + 2);
  const biomeMap = new Uint8Array(pixelSize * pixelSize);

  for (let y = 0; y < pixelSize; y++) {
    for (let x = 0; x < pixelSize; x++) {
      // Map to Layer 2 coordinates
      const layer2X = regionX * pixelSize + x * 2; // Layer 3 is 2× Layer 2
      const layer2Y = regionY * pixelSize + y * 2;

      // Get temperature from Layer 2
      const temp = layer2Data[layer2Y * 1024 + layer2X];

      if (temp === 0) {
        biomeMap[y * pixelSize + x] = BIOME_TYPES.OCEAN.id;
        continue;
      }

      // Weighted random selection based on temperature
      const weights = BIOME_WEIGHTS[temp];
      const nx = (regionX * pixelSize + x) / 100;
      const ny = (regionY * pixelSize + y) / 100;
      const noiseValue = noise.noise2D(nx, ny) * 0.5 + 0.5; // [0, 1]

      // Select biome based on noise threshold
      let sum = 0;
      for (const { biome, weight } of weights) {
        sum += weight;
        if (noiseValue <= sum) {
          biomeMap[y * pixelSize + x] = biome.id;
          break;
        }
      }
    }
  }

  return biomeMap;
}
```

**Storage:**
- Format: `Uint8Array` (1 byte per pixel)
- Size: 16 bytes per 512×512 region (4×4 pixels)
- Key: `world_${seed}_layer3_${regionX}_${regionY}`

---

### Layer 4: Terrain Height Maps

**Algorithm:**
```javascript
function generateTerrainHeight(chunkX, chunkZ, chunkSize, biomeId, seed) {
  const noise = new SimplexNoise(seed + 3);
  const biome = getBiomeById(biomeId);

  // Height map for chunk
  const heightMap = new Float32Array(chunkSize * chunkSize);

  for (let z = 0; z < chunkSize; z++) {
    for (let x = 0; x < chunkSize; x++) {
      const worldX = chunkX * chunkSize + x;
      const worldZ = chunkZ * chunkSize + z;

      // Multi-octave noise for natural terrain
      let height = 0;
      let amplitude = 1;
      let frequency = 1;
      const octaves = 4;

      for (let i = 0; i < octaves; i++) {
        const nx = worldX * 0.01 * frequency;
        const nz = worldZ * 0.01 * frequency;
        height += noise.noise2D(nx, nz) * amplitude;

        amplitude *= 0.5;
        frequency *= 2;
      }

      // Normalize to [0, 1]
      height = height * 0.5 + 0.5;

      // Apply biome-specific height amplification
      height *= biome.heightAmp;

      // Base terrain level (y=2 for water level compatibility)
      const baseLevel = 4;
      heightMap[z * chunkSize + x] = baseLevel + height;
    }
  }

  return heightMap;
}
```

---

### Layer 5: Structure Placement

**Tree Placement Example:**
```javascript
function placeTreesInChunk(chunkX, chunkZ, chunkSize, biomeId, heightMap, seed) {
  const biome = getBiomeById(biomeId);
  const random = seededRandom(seed + chunkX * 1000 + chunkZ);

  // Tree density varies by biome
  const treeDensity = {
    [BIOME_TYPES.FOREST.id]: 0.15,
    [BIOME_TYPES.TAIGA.id]: 0.12,
    [BIOME_TYPES.PLAINS.id]: 0.02,
    [BIOME_TYPES.SAVANNA.id]: 0.05,
    // Others = 0
  };

  const density = treeDensity[biomeId] || 0;
  const treePositions = [];

  for (let z = 1; z < chunkSize - 1; z++) { // Keep away from edges
    for (let x = 1; x < chunkSize - 1; x++) {
      if (random() < density) {
        const groundY = Math.floor(heightMap[z * chunkSize + x]);
        treePositions.push({ x, y: groundY + 1, z }); // Place on surface
      }
    }
  }

  return treePositions;
}
```

---

## Terrain Building Process

### Step-by-Step Block Placement

```javascript
function buildChunkTerrain(chunkX, chunkZ, chunkSize, biomeId, heightMap, seed) {
  const blocks = new Uint8Array(chunkSize * chunkSize * 64); // Max height = 64
  const biome = getBiomeById(biomeId);

  // Helper: Get block index
  const getIndex = (x, y, z) => x + z * chunkSize + y * chunkSize * chunkSize;

  // Step 1: Bedrock layer (y=1)
  for (let z = 0; z < chunkSize; z++) {
    for (let x = 0; x < chunkSize; x++) {
      blocks[getIndex(x, 1, z)] = BLOCK_TYPES.BEDROCK;
    }
  }

  // Step 2: Stone structure (y=2 to heightMap[x][z])
  for (let z = 0; z < chunkSize; z++) {
    for (let x = 0; x < chunkSize; x++) {
      const terrainHeight = Math.floor(heightMap[z * chunkSize + x]);

      for (let y = 2; y <= terrainHeight; y++) {
        blocks[getIndex(x, y, z)] = BLOCK_TYPES.STONE;
      }
    }
  }

  // Step 3: Water fill (y ≤ 3)
  const WATER_LEVEL = 3;
  for (let z = 0; z < chunkSize; z++) {
    for (let x = 0; x < chunkSize; x++) {
      const terrainHeight = Math.floor(heightMap[z * chunkSize + x]);

      if (terrainHeight < WATER_LEVEL) {
        for (let y = terrainHeight + 1; y <= WATER_LEVEL; y++) {
          blocks[getIndex(x, y, z)] = BLOCK_TYPES.WATER;
        }
      }
    }
  }

  // Step 4: Surface blocks (1 layer on top of stone)
  for (let z = 0; z < chunkSize; z++) {
    for (let x = 0; x < chunkSize; x++) {
      const terrainHeight = Math.floor(heightMap[z * chunkSize + x]);

      // Only place surface blocks above water
      if (terrainHeight >= WATER_LEVEL) {
        const surfaceBlock = getSurfaceBlock(biome, terrainHeight);
        blocks[getIndex(x, terrainHeight, z)] = surfaceBlock;
      } else {
        // Beach/shore: sand at water edges
        if (terrainHeight === WATER_LEVEL - 1) {
          blocks[getIndex(x, terrainHeight, z)] = BLOCK_TYPES.SAND;
        }
      }
    }
  }

  // Step 5: Caves/ravines (negative space - future implementation)
  // generateCaves(blocks, chunkSize, seed);

  return blocks;
}

function getSurfaceBlock(biome, height) {
  // For mountains, use snow above certain height
  if (biome.id === BIOME_TYPES.MOUNTAINS.id && height > 15) {
    return BLOCK_TYPES.SNOW;
  }

  // Otherwise use biome default
  return BLOCK_TYPES[biome.surfaceBlock.toUpperCase()];
}
```

---

## Web Worker Implementation

### Worker File Structure

```javascript
// ChunkWorker.js

importScripts('simplex-noise.js'); // Or inline the noise code

let layer1Cache = null;
let layer2Cache = null;
let layer3Cache = new Map();

self.onmessage = function(e) {
  const { type, data } = e.data;

  switch (type) {
    case 'INIT':
      initWorker(data);
      break;

    case 'LOAD_MACRO':
      loadMacroData(data);
      break;

    case 'GENERATE_CHUNK':
      generateChunk(data);
      break;
  }
};

function initWorker({ seed }) {
  // Generate or load Layer 1 & 2 if not cached
  if (!layer1Cache) {
    layer1Cache = generateLayer1(seed);
    self.postMessage({ type: 'CACHE_LAYER1', data: layer1Cache });
  }

  if (!layer2Cache) {
    layer2Cache = generateLayer2(seed, layer1Cache);
    self.postMessage({ type: 'CACHE_LAYER2', data: layer2Cache });
  }

  self.postMessage({ type: 'INIT_COMPLETE' });
}

function loadMacroData({ layer1, layer2 }) {
  // Load from cache instead of regenerating
  layer1Cache = new Uint8Array(layer1);
  layer2Cache = new Uint8Array(layer2);
}

function generateChunk({ chunkX, chunkZ, chunkSize, seed }) {
  // 1. Determine biome for this chunk
  const biomeId = getBiomeForChunk(chunkX, chunkZ, layer2Cache, layer3Cache);

  // 2. Generate height map
  const heightMap = generateTerrainHeight(chunkX, chunkZ, chunkSize, biomeId, seed);

  // 3. Build block data
  const blocks = buildChunkTerrain(chunkX, chunkZ, chunkSize, biomeId, heightMap, seed);

  // 4. Generate vertex data from blocks
  const vertexData = buildVertexData(blocks, chunkSize);

  // 5. Transfer to main thread (zero-copy with transferable objects)
  self.postMessage({
    type: 'CHUNK_READY',
    data: {
      chunkX,
      chunkZ,
      positions: vertexData.positions,
      normals: vertexData.normals,
      uvs: vertexData.uvs,
      indices: vertexData.indices,
      colors: vertexData.colors
    }
  }, [
    vertexData.positions.buffer,
    vertexData.normals.buffer,
    vertexData.uvs.buffer,
    vertexData.indices.buffer,
    vertexData.colors.buffer
  ]);
}

function buildVertexData(blocks, chunkSize) {
  // This is the expensive part - convert blocks to mesh vertices
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const colors = [];

  let vertexCount = 0;

  for (let y = 0; y < 64; y++) {
    for (let z = 0; z < chunkSize; z++) {
      for (let x = 0; x < chunkSize; x++) {
        const blockType = blocks[x + z * chunkSize + y * chunkSize * chunkSize];

        if (blockType === 0) continue; // Air

        // Check each face for visibility (greedy meshing or simple culling)
        const faces = getVisibleFaces(blocks, x, y, z, chunkSize);

        for (const face of faces) {
          // Add vertices for this face
          addFaceVertices(
            positions, normals, uvs, indices, colors,
            x, y, z, face, blockType, vertexCount
          );
          vertexCount += 4; // 4 vertices per face
        }
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new Uint32Array(indices),
    colors: new Float32Array(colors)
  };
}
```

### Main Thread Integration

```javascript
// VoxelWorld.js or new WorldManager.js

class WorldManager {
  constructor(seed) {
    this.seed = seed;
    this.worker = new Worker('ChunkWorker.js');
    this.worker.onmessage = this.handleWorkerMessage.bind(this);

    // Initialize worker
    this.worker.postMessage({ type: 'INIT', data: { seed } });
  }

  handleWorkerMessage(e) {
    const { type, data } = e.data;

    switch (type) {
      case 'INIT_COMPLETE':
        console.log('Worker initialized');
        break;

      case 'CACHE_LAYER1':
        this.cacheLayer1(data);
        break;

      case 'CACHE_LAYER2':
        this.cacheLayer2(data);
        break;

      case 'CHUNK_READY':
        this.addChunkToScene(data);
        break;
    }
  }

  async cacheLayer1(data) {
    // Save to IndexedDB or fs.promises
    await saveToCache(`world_${this.seed}_layer1`, data);
  }

  async cacheLayer2(data) {
    await saveToCache(`world_${this.seed}_layer2`, data);
  }

  addChunkToScene({ chunkX, chunkZ, positions, normals, uvs, indices, colors }) {
    // Create Three.js geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));

    // Create mesh
    const material = new THREE.MeshLambertMaterial({ vertexColors: true });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(chunkX * 8, 0, chunkZ * 8);

    this.scene.add(mesh);

    // Cache chunk data
    this.cacheChunk(chunkX, chunkZ, { positions, normals, uvs, indices, colors });
  }

  requestChunk(chunkX, chunkZ) {
    // Check cache first
    if (this.hasChunkInCache(chunkX, chunkZ)) {
      const data = this.loadChunkFromCache(chunkX, chunkZ);
      this.addChunkToScene(data);
    } else {
      // Request from worker
      this.worker.postMessage({
        type: 'GENERATE_CHUNK',
        data: { chunkX, chunkZ, chunkSize: 8, seed: this.seed }
      });
    }
  }
}
```

---

## Caching Strategy

### IndexedDB Schema (Web)

```javascript
// db-cache.js

const DB_NAME = 'VoxelWorldCache';
const DB_VERSION = 1;

async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Store for Layer 1 & 2 (world-level data)
      if (!db.objectStoreNames.contains('worldData')) {
        db.createObjectStore('worldData', { keyPath: 'key' });
      }

      // Store for Layer 3 (regional biome data)
      if (!db.objectStoreNames.contains('regionData')) {
        db.createObjectStore('regionData', { keyPath: 'key' });
      }

      // Store for chunks
      if (!db.objectStoreNames.contains('chunks')) {
        db.createObjectStore('chunks', { keyPath: 'key' });
      }
    };
  });
}

async function saveToCache(key, data) {
  const db = await initDB();
  const tx = db.transaction(['worldData'], 'readwrite');
  const store = tx.objectStore('worldData');

  return new Promise((resolve, reject) => {
    const request = store.put({ key, data, timestamp: Date.now() });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function loadFromCache(key) {
  const db = await initDB();
  const tx = db.transaction(['worldData'], 'readonly');
  const store = tx.objectStore('worldData');

  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result?.data);
    request.onerror = () => reject(request.error);
  });
}
```

### Electron fs.promises (Desktop)

```javascript
// electron-cache.js (in preload or main process)

const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

const CACHE_DIR = path.join(app.getPath('userData'), 'worldCache');

async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (err) {
    // Directory already exists
  }
}

async function saveToCache(key, data) {
  await ensureCacheDir();
  const filePath = path.join(CACHE_DIR, `${key}.bin`);
  await fs.writeFile(filePath, Buffer.from(data));
}

async function loadFromCache(key) {
  const filePath = path.join(CACHE_DIR, `${key}.bin`);
  try {
    const buffer = await fs.readFile(filePath);
    return new Uint8Array(buffer);
  } catch (err) {
    return null; // Not cached
  }
}
```

### LRU Chunk Cache (RAM)

```javascript
// CacheChunk.js

class ChunkCache {
  constructor(maxSize = 256) {
    this.maxSize = maxSize;
    this.cache = new Map(); // key → { data, lastAccess }
  }

  set(chunkX, chunkZ, data) {
    const key = `${chunkX},${chunkZ}`;
    this.cache.set(key, { data, lastAccess: Date.now() });

    // Evict oldest if over limit
    if (this.cache.size > this.maxSize) {
      this.evictOldest();
    }
  }

  get(chunkX, chunkZ) {
    const key = `${chunkX},${chunkZ}`;
    const entry = this.cache.get(key);

    if (entry) {
      entry.lastAccess = Date.now(); // Update access time
      return entry.data;
    }

    return null;
  }

  evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey);

      // Persist to disk before evicting
      const [chunkX, chunkZ] = oldestKey.split(',').map(Number);
      this.persistChunk(chunkX, chunkZ, entry.data);

      this.cache.delete(oldestKey);
    }
  }

  async persistChunk(chunkX, chunkZ, data) {
    // Save to IndexedDB or fs.promises
    await saveToCache(`chunk_${chunkX}_${chunkZ}`, data);
  }
}
```

---

## Performance Targets

### Memory Budget
- **Layer 1 Cache**: 64KB (always in RAM)
- **Layer 2 Cache**: 1MB (always in RAM)
- **Layer 3 Cache**: 64KB per region × 9 regions = 576KB (keep 3×3 around player)
- **Chunk RAM Cache**: 256 chunks × 4KB = 1MB
- **Total Baseline**: ~2.6MB for world data

### Generation Speed
- **Layer 1 + 2**: Generate once per world (~100ms total, acceptable one-time cost)
- **Chunk Generation**: Target <16ms per chunk in worker (allows 60fps main thread)
- **Vertex Building**: Most expensive part, optimize with greedy meshing

### Disk Usage
- **World Data**: 1-2MB per seed (Layer 1, 2, cached regions)
- **Chunks**: ~4KB each, 1000 chunks = 4MB
- **Total for explored world**: 5-10MB (very reasonable)

---

## Implementation Phases (REVISED - Performance-First Approach)

### Phase 1: Web Workers + Region Noise (PRIORITY - Do First) 🚀
**Goal**: Eliminate stuttering, smooth 60fps gameplay

1. **Region-Level Noise Maps** (Smart optimization)
   - Generate temperature/moisture maps per region (not per chunk)
   - Cache region noise in worker memory
   - Chunks sample from pre-generated region data
   - Result: Fewer noise calculations, smoother biome transitions

2. **Web Worker Chunk Generation**
   - Create ChunkWorker.js with transferable objects
   - Move terrain generation to background thread
   - Use ArrayBuffer/TypedArray for zero-copy transfers
   - Main thread only creates THREE.Mesh from worker data

3. **LRU RAM Cache**
   - 256-chunk limit with least-recently-used eviction
   - Instant retrieval for nearby chunks
   - NO disk persistence yet (adds complexity/slowdown)

**Files to Create:**
- `src/workers/ChunkWorker.js` - Background chunk generation
- `src/worldgen/RegionNoiseCache.js` - Region-level noise maps
- `src/cache/ChunkCache.js` - LRU RAM cache
- `src/worldgen/WorkerManager.js` - Worker communication

**Success Criteria:**
- [ ] No frame drops during chunk generation
- [ ] Render distance 4-5 with smooth gameplay
- [ ] Main thread stays at 60fps
- [ ] Region noise maps load/cache correctly
- [ ] Worker communication overhead <5ms per chunk

**Estimated Time:** 4-6 hours
**Performance Gain:** Massive (stuttering eliminated, 2x render distance)

---

### Phase 2: Feature Registry + Debug Tools (Polish)
**Goal**: Clean code structure, easier biome tuning

1. **Procedural Feature Hooks**
   - Registry pattern for biome-specific features
   - `featureRegistry['forest'] = generateForestFeatures`
   - Easier to add new biomes and features

2. **Debug Overlay** (toggle-able, disabled by default)
   - Show current biome, elevation, moisture, temperature
   - Display chunk/region IDs
   - Help tune noise parameters

**Files to Create:**
- `src/worldgen/FeatureRegistry.js`
- `src/ui/BiomeDebugOverlay.js`

**Success Criteria:**
- [ ] Easy to add new biome types
- [ ] Debug overlay helps identify biome issues
- [ ] No performance impact when debug mode off

**Estimated Time:** 2-3 hours
**Performance Gain:** Neutral (code organization only)

---

### Phase 3: Level of Detail (LOD) System (Advanced Performance)
**Goal**: Render distance 8+ with 60fps

1. **Chunk LOD Implementation**
   - Distant chunks (>5 distance) use simplified geometry
   - Reduce vertex count by 50-75% for far chunks
   - Gradual transition between LOD levels

2. **Frustum Culling**
   - Don't render chunks outside camera view
   - Integrate with Three.js frustum culling

**Files to Create:**
- `src/rendering/ChunkLOD.js`
- `src/rendering/FrustumCuller.js`

**Success Criteria:**
- [ ] Render distance 8+ at 60fps
- [ ] Smooth LOD transitions (no pop-in)
- [ ] Memory usage scales efficiently

**Estimated Time:** 3-4 hours
**Performance Gain:** High (enables very high render distances)

---

### Phase 4: Layer 1-2 Continental Structure (Optional Enhancement)
**Goal**: Better world structure with continents/oceans

**Only do this if you want continental landmasses instead of current biome system**

1. Implement Layer 1 (Land/Water mask)
2. Implement Layer 2 (Temperature zones)
3. Adapt current BiomeWorldGen to use Layer 1-2 data
4. Cache Layer 1-2 (only 1.6MB total)

**Files to Create:**
- `src/worldgen/Layer1Generator.js`
- `src/worldgen/Layer2Generator.js`
- `src/cache/MacroDataCache.js`

**Success Criteria:**
- [ ] Visible continents and oceans
- [ ] Temperature zones create logical biome clusters
- [ ] Smooth integration with existing system

**Estimated Time:** 4-5 hours
**Performance Gain:** Neutral (better world structure, same speed)

---

### Phase 5: Advanced Features (Future - Not Urgent)
**Goal**: Content and depth

**Skip these for now unless specifically needed:**
- ❌ Biome metadata index (debugging only, add if needed)
- ❌ Versioning/modding support (premature)
- ❌ Full disk persistence (IndexedDB is slow, RAM cache sufficient)

**Do these later when performance is solved:**
- ⏳ Cave generation (3D Perlin noise)
- ⏳ Ore deposits (vein generation)
- ⏳ Structures (villages, ruins)
- ⏳ Rare biomes

---

## Friend's Suggestions - Implementation Status

✅ **Region-Level Noise Maps** → Phase 1 (Do Now)
⚠️ **Biome Metadata Index** → Skip (not needed yet)
✅ **Feature Registry** → Phase 2 (Nice to have)
✅ **Debug Overlay** → Phase 2 (with toggle)
❌ **Versioning/Modding** → Skip (premature)
✅ **LOD System** → Phase 3 (Major perf win)

---

## Performance-First Implementation Order

```
Tonight (Phase 1):
1. Web Worker chunk generation
2. Region-level noise maps
3. LRU RAM cache

Result: 60fps, render distance 4-5, smooth gameplay
Time: 4-6 hours
Risk: Low (well-tested patterns)

Later (Phase 2-3):
4. Feature registry (code cleanup)
5. Debug overlay (tuning tool)
6. LOD system (render distance 8+)

Optional (Phase 4):
7. Layer 1-2 continental structure (if you want better world generation)

Skip Entirely:
8. Biome metadata index
9. Versioning system
10. Disk caching (RAM is enough)
```

---

## Code Examples

### Complete Chunk Generation Example

```javascript
// Full pipeline example

class ChunkGenerator {
  constructor(seed) {
    this.seed = seed;
    this.noise = new SimplexNoise(seed);
    this.layer1 = null;
    this.layer2 = null;
    this.layer3Cache = new Map();
  }

  async initialize() {
    // Try loading from cache
    this.layer1 = await loadFromCache(`world_${this.seed}_layer1`);
    this.layer2 = await loadFromCache(`world_${this.seed}_layer2`);

    // Generate if not cached
    if (!this.layer1) {
      this.layer1 = this.generateLayer1();
      await saveToCache(`world_${this.seed}_layer1`, this.layer1);
    }

    if (!this.layer2) {
      this.layer2 = this.generateLayer2();
      await saveToCache(`world_${this.seed}_layer2`, this.layer2);
    }
  }

  generateLayer1() {
    const size = 256;
    const mask = new Uint8Array(size * size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const value = this.noise.noise2D(x / 128, y / 128) * 0.5 + 0.5;
        mask[y * size + x] = value > 0.4 ? 1 : 0;
      }
    }

    return smoothBinaryMask(mask, size, 3);
  }

  generateLayer2() {
    const size = 1024;
    const temps = new Uint8Array(size * size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Check if land
        const layer1X = Math.floor(x / 4);
        const layer1Y = Math.floor(y / 4);
        if (this.layer1[layer1Y * 256 + layer1X] === 0) {
          temps[y * size + x] = 0; // Water
          continue;
        }

        // Generate temperature
        const latitude = Math.abs(y / size - 0.5) * 2;
        const latTemp = 1.0 - latitude;
        const noiseValue = this.noise.noise2D(x / 300, y / 300) * 0.5 + 0.5;
        const rawTemp = latTemp * 0.7 + noiseValue * 0.3;

        if (rawTemp < 0.25) temps[y * size + x] = 4;
        else if (rawTemp < 0.50) temps[y * size + x] = 3;
        else if (rawTemp < 0.75) temps[y * size + x] = 2;
        else temps[y * size + x] = 1;
      }
    }

    return smoothTemperatureMap(temps, size, 2);
  }

  generateChunk(chunkX, chunkZ, chunkSize = 8) {
    // 1. Get biome
    const biomeId = this.getBiomeForChunk(chunkX, chunkZ);
    const biome = BIOME_TYPES_BY_ID[biomeId];

    // 2. Generate height map
    const heightMap = new Float32Array(chunkSize * chunkSize);
    for (let z = 0; z < chunkSize; z++) {
      for (let x = 0; x < chunkSize; x++) {
        const worldX = chunkX * chunkSize + x;
        const worldZ = chunkZ * chunkSize + z;

        let h = 0;
        let amp = 1;
        let freq = 1;

        for (let i = 0; i < 4; i++) {
          h += this.noise.noise2D(worldX * 0.01 * freq, worldZ * 0.01 * freq) * amp;
          amp *= 0.5;
          freq *= 2;
        }

        h = h * 0.5 + 0.5;
        h *= biome.heightAmp;
        heightMap[z * chunkSize + x] = 4 + h;
      }
    }

    // 3. Build blocks
    const maxHeight = 64;
    const blocks = new Uint8Array(chunkSize * chunkSize * maxHeight);
    const getIdx = (x, y, z) => x + z * chunkSize + y * chunkSize * chunkSize;

    // Bedrock
    for (let z = 0; z < chunkSize; z++) {
      for (let x = 0; x < chunkSize; x++) {
        blocks[getIdx(x, 1, z)] = BLOCK_TYPES.BEDROCK;
      }
    }

    // Stone + surface
    for (let z = 0; z < chunkSize; z++) {
      for (let x = 0; x < chunkSize; x++) {
        const h = Math.floor(heightMap[z * chunkSize + x]);

        for (let y = 2; y < h; y++) {
          blocks[getIdx(x, y, z)] = BLOCK_TYPES.STONE;
        }

        if (h >= 3) {
          blocks[getIdx(x, h, z)] = BLOCK_TYPES[biome.surfaceBlock.toUpperCase()];
        }
      }
    }

    // Water fill
    const WATER_LEVEL = 3;
    for (let z = 0; z < chunkSize; z++) {
      for (let x = 0; x < chunkSize; x++) {
        const h = Math.floor(heightMap[z * chunkSize + x]);
        if (h < WATER_LEVEL) {
          for (let y = h + 1; y <= WATER_LEVEL; y++) {
            blocks[getIdx(x, y, z)] = BLOCK_TYPES.WATER;
          }
        }
      }
    }

    return { blocks, heightMap, biomeId };
  }

  getBiomeForChunk(chunkX, chunkZ) {
    // Map chunk to Layer 3 pixel
    const layer3X = Math.floor(chunkX * 8 / 128); // 128 blocks/pixel
    const layer3Y = Math.floor(chunkZ * 8 / 128);

    // Map to Layer 2 coordinate
    const layer2X = layer3X * 2;
    const layer2Y = layer3Y * 2;

    const temp = this.layer2[layer2Y * 1024 + layer2X];

    if (temp === 0) return BIOME_TYPES.OCEAN.id;

    // Simple selection (can be enhanced with Layer 3 caching)
    const weights = BIOME_WEIGHTS[temp];
    const noiseValue = this.noise.noise2D(layer3X / 50, layer3Y / 50) * 0.5 + 0.5;

    let sum = 0;
    for (const { biome, weight } of weights) {
      sum += weight;
      if (noiseValue <= sum) return biome.id;
    }

    return weights[0].biome.id; // Fallback
  }
}
```

---

## Testing & Validation

### Unit Tests
```javascript
// test/worldgen.test.js

describe('Layer 1 Generation', () => {
  it('should generate 256×256 binary mask', () => {
    const layer1 = generateLayer1(12345);
    expect(layer1.length).toBe(256 * 256);
    expect(layer1.every(v => v === 0 || v === 1)).toBe(true);
  });

  it('should have ~60% land coverage', () => {
    const layer1 = generateLayer1(12345);
    const landCount = layer1.reduce((sum, v) => sum + v, 0);
    const landRatio = landCount / layer1.length;
    expect(landRatio).toBeGreaterThan(0.5);
    expect(landRatio).toBeLessThan(0.7);
  });
});

describe('Layer 2 Generation', () => {
  it('should respect land/water from Layer 1', () => {
    const layer1 = new Uint8Array(256 * 256).fill(0); // All water
    const layer2 = generateLayer2(12345, layer1);
    expect(layer2.every(v => v === 0)).toBe(true);
  });

  it('should generate valid temperature zones', () => {
    const layer1 = new Uint8Array(256 * 256).fill(1); // All land
    const layer2 = generateLayer2(12345, layer1);
    expect(layer2.every(v => v >= 1 && v <= 4)).toBe(true);
  });
});

describe('Terrain Generation', () => {
  it('should place bedrock at y=1', () => {
    const gen = new ChunkGenerator(12345);
    const { blocks } = gen.generateChunk(0, 0, 8);

    for (let z = 0; z < 8; z++) {
      for (let x = 0; x < 8; x++) {
        expect(blocks[x + z * 8 + 1 * 64]).toBe(BLOCK_TYPES.BEDROCK);
      }
    }
  });

  it('should fill water at y≤3', () => {
    const gen = new ChunkGenerator(12345);
    // Mock ocean biome
    const { blocks } = gen.generateChunk(0, 0, 8);
    // Validate water blocks...
  });
});
```

### Visual Validation
1. **Minimap View**: Render Layer 1 as 256×256 image (white=land, blue=water)
2. **Temperature Map**: Render Layer 2 with color gradient (blue→green→yellow→red)
3. **Biome Map**: Render Layer 3 with biome colors
4. **Height Map**: Render terrain heights as grayscale

---

## Configuration Options

```javascript
// config/worldgen.config.js

export const WORLDGEN_CONFIG = {
  // Layer 1: Land/Water
  layer1: {
    size: 256,
    landThreshold: 0.4, // 0-1, higher = more land
    smoothRadius: 3 // Pixel radius for smoothing
  },

  // Layer 2: Temperature
  layer2: {
    size: 1024,
    latitudeWeight: 0.7, // 0-1, higher = more latitude influence
    noiseWeight: 0.3,
    smoothRadius: 2
  },

  // Layer 3: Biomes
  layer3: {
    regionSize: 512, // Blocks per cached region
    resolution: 128 // Blocks per pixel
  },

  // Layer 4: Terrain
  layer4: {
    octaves: 4,
    baseFrequency: 0.01,
    persistence: 0.5,
    lacunarity: 2.0
  },

  // World settings
  world: {
    waterLevel: 3,
    maxHeight: 64,
    bedrockLevel: 1
  },

  // Performance
  cache: {
    maxChunksInRAM: 256,
    persistChunksOnEvict: true
  },

  // Chunk settings
  chunk: {
    defaultSize: 8, // Can be changed to 16 or 32
    renderDistance: 3 // Initial value, auto-adjusted
  }
};
```

---

## Troubleshooting

### Issue: Biome transitions look abrupt
**Solution**: Increase Layer 2 smoothing radius from 2 to 3-4

### Issue: Mountains not tall enough
**Solution**: Increase biome.heightAmp for mountain biomes (try 25-30)

### Issue: Too much water
**Solution**: Lower layer1.landThreshold (try 0.35 instead of 0.4)

### Issue: Biomes feel too uniform
**Solution**: Add more noise variation in Layer 3 generation

### Issue: Worker transfer slow
**Solution**: Verify transferable objects are being used (check console for warnings)

### Issue: Cache not persisting
**Solution**: Check IndexedDB/fs.promises permissions and error logs

---

## Future Enhancements

### Cave Generation (3D Perlin Worms)
```javascript
function generateCaves(blocks, chunkX, chunkZ, chunkSize, seed) {
  const noise3D = new SimplexNoise(seed + 100);

  for (let y = 2; y < 30; y++) { // Caves between y=2 and y=30
    for (let z = 0; z < chunkSize; z++) {
      for (let x = 0; x < chunkSize; x++) {
        const worldX = chunkX * chunkSize + x;
        const worldZ = chunkZ * chunkSize + z;

        const caveNoise = noise3D.noise3D(
          worldX * 0.05,
          y * 0.05,
          worldZ * 0.05
        );

        // Carve out cave if noise above threshold
        if (caveNoise > 0.6) {
          const idx = x + z * chunkSize + y * chunkSize * chunkSize;
          if (blocks[idx] === BLOCK_TYPES.STONE) {
            blocks[idx] = 0; // Air
          }
        }
      }
    }
  }
}
```

### Ore Vein Generation
```javascript
function generateOreVeins(blocks, chunkX, chunkZ, chunkSize, seed) {
  const oreTypes = [
    { type: BLOCK_TYPES.COAL, minY: 5, maxY: 50, frequency: 0.02 },
    { type: BLOCK_TYPES.IRON, minY: 5, maxY: 40, frequency: 0.01 },
    { type: BLOCK_TYPES.GOLD, minY: 5, maxY: 25, frequency: 0.005 }
  ];

  const random = seededRandom(seed + chunkX * 1000 + chunkZ);

  for (const ore of oreTypes) {
    // Spawn ore veins randomly
    if (random() < ore.frequency) {
      const veinX = Math.floor(random() * chunkSize);
      const veinY = ore.minY + Math.floor(random() * (ore.maxY - ore.minY));
      const veinZ = Math.floor(random() * chunkSize);
      const veinSize = 3 + Math.floor(random() * 4); // 3-6 blocks

      // Place vein in cluster pattern
      for (let i = 0; i < veinSize; i++) {
        const dx = Math.floor(random() * 3) - 1;
        const dy = Math.floor(random() * 3) - 1;
        const dz = Math.floor(random() * 3) - 1;

        const x = Math.max(0, Math.min(chunkSize - 1, veinX + dx));
        const y = Math.max(ore.minY, Math.min(ore.maxY, veinY + dy));
        const z = Math.max(0, Math.min(chunkSize - 1, veinZ + dz));

        const idx = x + z * chunkSize + y * chunkSize * chunkSize;
        if (blocks[idx] === BLOCK_TYPES.STONE) {
          blocks[idx] = ore.type;
        }
      }
    }
  }
}
```

### Biome-Specific Tree Types
```javascript
const TREE_TYPES_BY_BIOME = {
  [BIOME_TYPES.FOREST.id]: ['oak', 'birch'],
  [BIOME_TYPES.TAIGA.id]: ['pine'],
  [BIOME_TYPES.SAVANNA.id]: ['acacia'],
  [BIOME_TYPES.DESERT.id]: ['cactus'], // Not technically a tree
};

function selectTreeType(biomeId, random) {
  const types = TREE_TYPES_BY_BIOME[biomeId] || ['oak'];
  return types[Math.floor(random() * types.length)];
}
```

---

## Summary

This hierarchical generation system provides:

✅ **Coherent continents** instead of random noise blobs
✅ **Logical biome placement** with temperature zones
✅ **Smooth transitions** between biomes
✅ **Scalable architecture** (5 layers is manageable)
✅ **Smart caching** (persistent macro data, LRU chunks)
✅ **Worker-based generation** (no main thread blocking)
✅ **Configurable** (easy to tweak for different world types)
✅ **Future-proof** (can add caves, structures, etc.)

**Estimated Implementation Time:**
- Phase 1 (Proof of Concept): 4-6 hours
- Phase 2 (Caching): 3-4 hours
- Phase 3 (Workers): 3-4 hours
- Phase 4 (Optimization): 2-3 hours
- **Total: 12-17 hours of focused dev time**

Ready to build tonight! 🚀
