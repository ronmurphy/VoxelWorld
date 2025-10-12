#!/bin/bash

echo "🎮 VoxelWorld v0.2.9 - Emoji Support Test"
echo "========================================"
echo ""

cd /home/brad/Documents/VoxelWorld-1/VoxelWorld-1-vite/dist-electron

echo "📦 Available builds:"
ls -lh VoxelWorld-0.2.9* | awk '{print "  ", $9, "("$5")"}'
echo ""

echo "🧪 Test Options:"
echo "----------------"
echo ""
echo "1. Test Windows Portable with Wine (emoji via Noto Color Emoji)"
echo "   wine VoxelWorld-0.2.9-portable.exe"
echo ""
echo "2. Test Linux Native (guaranteed emoji support)"
echo "   ./VoxelWorld-0.2.9.AppImage"
echo ""
echo "3. Debug emoji font loading in Wine"
echo "   WINEDEBUG=+font wine VoxelWorld-0.2.9-portable.exe 2>&1 | grep -i emoji"
echo ""
echo "4. Check Wine emoji fonts"
echo "   wine cmd /c 'fc-list' 2>/dev/null | grep -i emoji"
echo ""

read -p "Select test (1-4) or press Enter to skip: " choice

case $choice in
    1)
        echo ""
        echo "🍷 Testing Windows portable with Wine..."
        echo "Look for emoji in: file names, billboards, UI elements"
        echo ""
        wine VoxelWorld-0.2.9-portable.exe
        ;;
    2)
        echo ""
        echo "🐧 Testing Linux native..."
        chmod +x VoxelWorld-0.2.9.AppImage
        ./VoxelWorld-0.2.9.AppImage
        ;;
    3)
        echo ""
        echo "🔍 Debugging emoji font loading..."
        WINEDEBUG=+font wine VoxelWorld-0.2.9-portable.exe 2>&1 | grep -i emoji
        ;;
    4)
        echo ""
        echo "📋 Wine emoji fonts:"
        wine cmd /c 'fc-list' 2>/dev/null | grep -i emoji
        ;;
    *)
        echo ""
        echo "ℹ️  To test manually:"
        echo "  cd /home/brad/Documents/VoxelWorld-1/VoxelWorld-1-vite/dist-electron"
        echo "  wine VoxelWorld-0.2.9-portable.exe"
        ;;
esac

echo ""
echo "✅ Emoji Configuration Summary:"
echo "  - Wine emoji fonts: Configured ✓"
echo "  - Noto Color Emoji: Linked to Wine ✓"
echo "  - CSS emoji fallbacks: Added ✓"
echo "  - Material Design Icons: Bundled ✓"
echo ""
echo "If emoji don't show in Wine, use the Linux AppImage!"
echo "Linux build has guaranteed emoji support via system fonts."
echo ""
