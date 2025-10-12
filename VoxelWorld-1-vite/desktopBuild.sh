#!/bin/bash

# VoxelWorld Desktop Build Script
# This script builds desktop executables for Windows, Linux, and macOS using Electron

echo "🏗️  Building VoxelWorld for Desktop..."

# Step 1: Build the web assets
echo "📦 Building web assets..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Web build failed!"
    exit 1
fi

# Step 2: Build for Linux and Windows
echo "🖥️  Building desktop executables for Linux and Windows..."
npm run build-wl

if [ $? -ne 0 ]; then
    echo "❌ Desktop build failed!"
    exit 1
fi

echo "✅ Desktop build completed successfully!"
echo ""
echo "📁 Your executables are in the 'dist-electron' folder:"
echo ""
echo "🚀 To run the app:"
echo "   npm run electron"
echo ""
echo "💡 For development:"
echo "   npm run electron-dev"
echo ""
echo "🔧 Other build options:"
echo "   npm run build-electron-win    # Windows only"
echo "   npm run build-electron-linux  # Linux only"
echo "   npm run build-electron-mac    # macOS only"
echo "   npm run build-all            # All platforms"