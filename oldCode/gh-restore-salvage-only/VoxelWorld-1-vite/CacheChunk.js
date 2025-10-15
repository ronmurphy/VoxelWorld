// CacheChunk.js
// Hybrid RAM + Disk chunk caching layer for VoxelWorld

const RAM_CACHE_LIMIT = 256; // Max active chunks in memory
const RAM_CACHE = new Map(); // Map<chunkId, ChunkData>

// Utility: generate chunk ID from seed and position
export function getChunkId(seed, x, y) {
  return `${seed}_${x}_${y}`;
}

// Utility: create empty chunk data (example: 16x16 blocks)
export function createEmptyChunkData(size = 256) {
  return new Uint8Array(size); // Replace with your block schema
}

// Load chunk from cache (RAM first, then disk)
export async function loadChunk(seed, x, y) {
  const id = getChunkId(seed, x, y);

  // RAM cache hit
  if (RAM_CACHE.has(id)) {
    const chunk = RAM_CACHE.get(id);
    chunk.lastAccessed = Date.now();
    return chunk;
  }

  // Disk cache fallback
  const diskChunk = await readChunkFromDisk(id);
  if (diskChunk) {
    RAM_CACHE.set(id, diskChunk);
    trimRamCache();
    return diskChunk;
  }

  // Generate new chunk
  const newChunk = {
    id,
    position: { x, y },
    data: createEmptyChunkData(),
    dirty: true,
    lastAccessed: Date.now()
  };
  RAM_CACHE.set(id, newChunk);
  trimRamCache();
  return newChunk;
}

// Save chunk to disk if dirty
export async function saveChunk(chunk) {
  if (!chunk.dirty) return;
  await writeChunkToDisk(chunk.id, chunk.data);
  chunk.dirty = false;
}

// Trim RAM cache if over limit
function trimRamCache() {
  if (RAM_CACHE.size <= RAM_CACHE_LIMIT) return;

  const sorted = [...RAM_CACHE.entries()].sort(
    (a, b) => a[1].lastAccessed - b[1].lastAccessed
  );
  const toEvict = sorted.slice(0, RAM_CACHE.size - RAM_CACHE_LIMIT);
  for (const [id, chunk] of toEvict) {
    saveChunk(chunk); // Persist before eviction
    RAM_CACHE.delete(id);
  }
}

// Stub: read chunk from disk (Electron or browser)
async function readChunkFromDisk(id) {
  // TODO: implement IndexedDB or fs.readFile
  console.log(`Reading chunk ${id} from disk...`);
  return null;
}

// Stub: write chunk to disk (Electron or browser)
async function writeChunkToDisk(id, data) {
  // TODO: implement IndexedDB or fs.writeFile
  console.log(`Writing chunk ${id} to disk...`);
}
