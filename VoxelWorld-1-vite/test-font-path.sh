#!/bin/bash

echo "Testing font loading in Electron ASAR..."
echo ""

# Extract a sample to test the actual file paths
TEMP="/tmp/voxelworld-test"
rm -rf "$TEMP"
mkdir -p "$TEMP"

echo "Extracting ASAR..."
npx asar extract /home/brad/Documents/VoxelWorld-1/VoxelWorld-1-vite/dist-electron/win-unpacked/resources/app.asar "$TEMP" > /dev/null 2>&1

echo ""
echo "File structure:"
echo "  index.html is at: dist/index.html"
echo "  CSS is at: dist/assets/index-DpRPicnm.css"
echo "  Font is at: dist/fonts/Inter-VariableFont_opsz,wght.ttf"
echo ""
echo "CSS font-face uses: url(../fonts/Inter-VariableFont_opsz,wght.ttf)"
echo "From dist/assets/, ../fonts/ should resolve to dist/fonts/ ✓"
echo ""

# Check if the path actually works
echo "Relative path check:"
cd "$TEMP/dist/assets"
if [ -f "../fonts/Inter-VariableFont_opsz,wght.ttf" ]; then
    echo "  ✅ ../fonts/Inter-VariableFont_opsz,wght.ttf exists!"
    ls -lh "../fonts/Inter-VariableFont_opsz,wght.ttf"
else
    echo "  ❌ Font path doesn't work!"
fi

echo ""
echo "The issue: Electron ASAR uses a virtual filesystem."
echo "Font paths may need to be:"
echo "  1. Absolute paths within the app"
echo "  2. Base64 encoded inline"
echo "  3. Extracted outside ASAR (asarUnpack)"
echo ""
echo "Recommended fix: Configure electron-builder to unpack fonts"
