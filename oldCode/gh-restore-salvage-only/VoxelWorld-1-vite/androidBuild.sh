#!/bin/bash

# VoxelWorld Android Build Script
# This script builds the Android APK using Capacitor

echo "🏗️  Building VoxelWorld for Android..."

# Step 1: Build the web assets
echo "📦 Building web assets..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Web build failed!"
    exit 1
fi

# Step 2: Sync with Capacitor
echo "🔄 Syncing with Capacitor..."
npx cap sync android

if [ $? -ne 0 ]; then
    echo "❌ Capacitor sync failed!"
    exit 1
fi

# Step 3: Build the Android APK
echo "🤖 Building Android APK..."
cd android
./gradlew assembleDebug

if [ $? -ne 0 ]; then
    echo "❌ Android build failed!"
    exit 1
fi
cd ..

echo "✅ Android build completed successfully!"
echo ""
echo "📱 Your APK should be available in:"
echo "   android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "🚀 To install on device:"
echo "   adb install android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "💡 For release builds, use: npx cap build android --release"