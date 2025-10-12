#!/bin/bash

# Wine Emoji Support Setup for Testing Windows Builds

echo "================================================"
echo "Wine Emoji Support Configuration"
echo "================================================"
echo ""

echo "The issue: Wine doesn't include Windows emoji fonts by default"
echo "Solution: Install Windows emoji fonts for Wine"
echo ""

echo "📋 Step 1: Check Current Wine Emoji Support"
echo "--------------------------------------------"
echo ""

# Check if Wine has Segoe UI Emoji
if fc-list | grep -i "segoe ui emoji" > /dev/null; then
    echo "✅ Segoe UI Emoji found on system"
else
    echo "❌ Segoe UI Emoji NOT found"
fi

echo ""
echo "📦 Step 2: Install Emoji Fonts for Wine"
echo "---------------------------------------"
echo ""

echo "Option A: Use Winetricks (Easiest)"
echo "-----------------------------------"
echo ""
echo "# Install core fonts (includes some emoji support)"
echo "winetricks corefonts"
echo ""
echo "# Install Segoe UI fonts (Windows Vista/7 fonts with emoji)"
echo "winetricks segoeui"
echo ""

echo "Option B: Install Windows 10/11 Emoji Font Manually"
echo "---------------------------------------------------"
echo ""
echo "If you have access to Windows 10/11:"
echo ""
echo "1. From Windows, copy these files from C:\\Windows\\Fonts\\"
echo "   - seguiemj.ttf  (Segoe UI Emoji - THE MAIN ONE!)"
echo "   - seguisym.ttf  (Segoe UI Symbol)"
echo ""
echo "2. Install to Wine's font directory:"
echo ""
echo "   # Find your Wine prefix (usually ~/.wine)"
echo "   WINEPREFIX=~/.wine"
echo ""
echo "   # Copy emoji fonts"
echo "   cp seguiemj.ttf ~/.wine/drive_c/windows/Fonts/"
echo "   cp seguisym.ttf ~/.wine/drive_c/windows/Fonts/"
echo ""
echo "   # Register fonts"
echo "   wine regedit"
echo "   # Navigate to HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Fonts"
echo "   # Add entries for the fonts"
echo ""

echo "Option C: Use Noto Color Emoji as Fallback"
echo "------------------------------------------"
echo ""
echo "Install Google's Noto Color Emoji (works in Wine):"
echo ""
echo "   sudo pacman -S noto-fonts-emoji"
echo ""
echo "   # Then configure Wine to use it as fallback"
echo "   # Edit ~/.wine/user.reg and add font substitutions"
echo ""

echo "================================================"
echo "Quick Setup (Recommended)"
echo "================================================"
echo ""

read -p "Do you want to install emoji support now? (y/n): " choice

if [[ "$choice" == "y" || "$choice" == "Y" ]]; then
    echo ""
    echo "Installing Noto Color Emoji (works with Wine)..."
    sudo pacman -S noto-fonts-emoji
    
    echo ""
    echo "Installing winetricks if not present..."
    if ! command -v winetricks &> /dev/null; then
        sudo pacman -S winetricks
    fi
    
    echo ""
    echo "Installing fonts via winetricks..."
    winetricks corefonts
    
    echo ""
    echo "Trying to install Segoe UI via winetricks..."
    winetricks segoeui
    
    echo ""
    echo "Updating font cache..."
    fc-cache -fv
    
    echo ""
    echo "✅ Setup complete!"
fi

echo ""
echo "================================================"
echo "Testing Emoji in Wine"
echo "================================================"
echo ""

echo "To test emoji rendering:"
echo ""
echo "1. Check if Wine can see emoji fonts:"
echo "   wine cmd /c fc-list | grep -i emoji"
echo ""
echo "2. Test VoxelWorld portable:"
echo "   cd dist-electron"
echo "   WINEDEBUG=+font wine VoxelWorld-0.2.8-portable.exe"
echo ""
echo "3. Look for font warnings in output"
echo ""

echo "================================================"
echo "Alternative: Use Windows Portable on Linux"
echo "================================================"
echo ""
echo "Instead of Wine, test with the native Linux AppImage:"
echo "   cd dist-electron"
echo "   ./VoxelWorld-0.2.8.AppImage"
echo ""
echo "The Linux build will use your system's emoji fonts!"
echo ""

echo "================================================"
echo "Emoji Font Fallback Order"
echo "================================================"
echo ""
echo "VoxelWorld will try fonts in this order:"
echo "1. Segoe UI Emoji (Windows)"
echo "2. Apple Color Emoji (macOS)"
echo "3. Noto Color Emoji (Linux/Android)"
echo "4. System default emoji font"
echo ""
echo "On Wine with Noto Color Emoji installed, emojis will work!"
echo ""
