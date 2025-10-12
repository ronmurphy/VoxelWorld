#!/bin/bash

# Font Debug Script for VoxelWorld Windows Build

echo "======================================"
echo "VoxelWorld Font Diagnostic Tool"
echo "======================================"
echo ""

APP_PATH="/home/brad/Documents/VoxelWorld-1/VoxelWorld-1-vite/dist-electron"
TEMP_DIR="/tmp/voxelworld-font-debug"

echo "1. Checking if portable executable exists..."
if [ -f "$APP_PATH/VoxelWorld-0.2.6-portable.exe" ]; then
    echo "   ✅ Found: VoxelWorld-0.2.6-portable.exe"
    ls -lh "$APP_PATH/VoxelWorld-0.2.6-portable.exe"
else
    echo "   ❌ Portable executable not found!"
    exit 1
fi

echo ""
echo "2. Extracting ASAR package..."
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"
npx asar extract "$APP_PATH/win-unpacked/resources/app.asar" "$TEMP_DIR" 2>&1 | head -3

echo ""
echo "3. Checking for font files..."
if [ -f "$TEMP_DIR/dist/fonts/Inter-VariableFont_opsz,wght.ttf" ]; then
    echo "   ✅ Font file found:"
    ls -lh "$TEMP_DIR/dist/fonts/"*.ttf
else
    echo "   ❌ Font file NOT found!"
fi

echo ""
echo "4. Checking CSS for font-face declaration..."
if grep -q "@font-face" "$TEMP_DIR/dist/assets"/*.css; then
    echo "   ✅ @font-face found in CSS"
    grep -o "@font-face{[^}]*}" "$TEMP_DIR/dist/assets"/*.css | head -1
else
    echo "   ❌ @font-face NOT found!"
fi

echo ""
echo "5. Checking font URL in CSS..."
FONT_URL=$(grep "@font-face" "$TEMP_DIR/dist/assets"/*.css | grep -o "url([^)]*)" | head -1)
echo "   Font URL: $FONT_URL"

echo ""
echo "6. Checking for color bug..."
if grep -q "\*{color:#000!important}" "$TEMP_DIR/dist/assets"/*.css; then
    echo "   ❌ COLOR BUG FOUND! Text will be invisible!"
else
    echo "   ✅ No color bug found"
fi

echo ""
echo "7. Checking HTML for external fonts..."
if grep -q "fonts.googleapis.com" "$TEMP_DIR/dist/index.html"; then
    echo "   ❌ External Google Fonts still referenced!"
else
    echo "   ✅ No external font references"
fi

echo ""
echo "8. File structure in ASAR:"
echo "   dist/"
ls -la "$TEMP_DIR/dist/" | head -10
echo "   dist/assets/"
ls -la "$TEMP_DIR/dist/assets/" | head -5
echo "   dist/fonts/"
ls -la "$TEMP_DIR/dist/fonts/" 2>/dev/null || echo "   (fonts directory not found)"

echo ""
echo "======================================"
echo "Diagnostic Complete"
echo "======================================"
echo ""
echo "To test with Wine:"
echo "  cd $APP_PATH"
echo "  wine VoxelWorld-0.2.6-portable.exe"
echo ""
echo "To check console errors:"
echo "  WINEDEBUG=+all wine VoxelWorld-0.2.6-portable.exe 2>&1 | grep -i font"
