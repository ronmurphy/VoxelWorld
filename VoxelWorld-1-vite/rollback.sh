#!/bin/bash
# Save greedy mesh WIP and roll back to stable

echo "Saving greedy mesh WIP to branch..."
git add .
git commit -m "WIP: Greedy mesh - textures inverted"
git branch wip-greedy-mesh-inverted-textures

echo "Finding pre-greedy commit..."
git log --oneline | head -20

echo ""
echo "To roll back to before greedy mesh, find the commit hash above"
echo "Then run: git reset --hard <commit-hash>"
echo ""
echo "Branch 'wip-greedy-mesh-inverted-textures' saved for later"
