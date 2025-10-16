#!/bin/bash
cd /home/brad/Documents/VoxelWorld-1/VoxelWorld-1-vite

# Create branch to save current work
git branch wip-greedy-mesh-session5-inverted-uvs

# Roll back to before greedy mesh
git reset --hard 353983c

echo "✅ Rolled back to commit 353983c"
echo "✅ WIP work saved to branch: wip-greedy-mesh-session5-inverted-uvs"
echo ""
echo "Run 'npm run dev' to test the old working version"
