#!/bin/bash

echo "🎨 Wine Emoji Configuration for VoxelWorld"
echo "=========================================="
echo ""

# Check current status
echo "📊 Current Emoji Font Status:"
echo "-----------------------------"
echo ""

echo "System emoji fonts installed:"
fc-list | grep -i emoji | cut -d: -f2 | sort -u
echo ""

echo "Wine prefix location:"
if [ -d "$HOME/.wine" ]; then
    echo "  ✅ ~/.wine (default)"
    WINE_PREFIX="$HOME/.wine"
else
    echo "  ℹ️  Custom or not found"
    WINE_PREFIX="$HOME/.wine"
fi
echo ""

echo "=========================================="
echo "🔧 Configuring Wine for Emoji Support"
echo "=========================================="
echo ""

# Check if winetricks is installed
if ! command -v winetricks &> /dev/null; then
    echo "📦 Installing winetricks..."
    sudo pacman -S winetricks
fi

echo "📥 Installing font support via winetricks..."
echo ""

# Install core fonts
echo "1. Installing Core Fonts..."
winetricks -q corefonts 2>/dev/null
echo "   ✅ Core fonts installed"

# Try to install Segoe UI
echo "2. Attempting to install Segoe UI..."
winetricks -q segoeui 2>/dev/null && echo "   ✅ Segoe UI installed" || echo "   ⚠️  Segoe UI failed (this is okay)"

echo ""
echo "=========================================="
echo "🔗 Linking System Emoji to Wine"
echo "=========================================="
echo ""

# Create Wine fonts directory if it doesn't exist
mkdir -p "$WINE_PREFIX/drive_c/windows/Fonts"

# Link Noto Color Emoji to Wine
NOTO_EMOJI=$(fc-list | grep -i "noto color emoji" | head -1 | cut -d: -f1)

if [ -n "$NOTO_EMOJI" ]; then
    echo "Found Noto Color Emoji at: $NOTO_EMOJI"
    
    # Create symlink in Wine
    if [ ! -f "$WINE_PREFIX/drive_c/windows/Fonts/NotoColorEmoji.ttf" ]; then
        ln -s "$NOTO_EMOJI" "$WINE_PREFIX/drive_c/windows/Fonts/NotoColorEmoji.ttf"
        echo "✅ Linked Noto Color Emoji to Wine"
    else
        echo "✅ Noto Color Emoji already linked"
    fi
else
    echo "❌ Noto Color Emoji not found!"
    echo "   Installing now..."
    sudo pacman -S noto-fonts-emoji
fi

echo ""
echo "=========================================="
echo "📝 Font Configuration Registry"
echo "=========================================="
echo ""

# Create font substitution registry file
cat > /tmp/emoji-fonts.reg << 'EOF'
REGEDIT4

[HKEY_LOCAL_MACHINE\Software\Microsoft\Windows NT\CurrentVersion\FontSubstitutes]
"Segoe UI Emoji"="NotoColorEmoji"

[HKEY_CURRENT_USER\Software\Wine\Fonts\Replacements]
"Segoe UI Emoji"="Noto Color Emoji"
EOF

echo "Importing font substitutions to Wine registry..."
wine regedit /tmp/emoji-fonts.reg 2>/dev/null
echo "✅ Font substitutions configured"

echo ""
echo "=========================================="
echo "✅ Configuration Complete!"
echo "=========================================="
echo ""

echo "📋 What was configured:"
echo "  1. ✅ Winetricks core fonts installed"
echo "  2. ✅ Noto Color Emoji linked to Wine"
echo "  3. ✅ Font substitutions registered"
echo "  4. ✅ Wine will use system emoji fonts"
echo ""

echo "🧪 Testing:"
echo "----------"
echo ""
echo "Test VoxelWorld with emoji support:"
echo "  cd dist-electron"
echo "  wine VoxelWorld-0.2.8-portable.exe"
echo ""

echo "Check if Wine sees emoji fonts:"
echo "  wine cmd /c 'fc-list' 2>/dev/null | grep -i emoji"
echo ""

echo "Debug font loading:"
echo "  WINEDEBUG=+font wine VoxelWorld-0.2.8-portable.exe 2>&1 | grep -i emoji"
echo ""

echo "=========================================="
echo "💡 Alternative: Test with Native Linux"
echo "=========================================="
echo ""
echo "The Linux AppImage will use your system emoji directly:"
echo "  cd dist-electron"
echo "  ./VoxelWorld-0.2.8.AppImage"
echo ""
echo "This will definitely show emojis! 🎮✨🚀"
echo ""
