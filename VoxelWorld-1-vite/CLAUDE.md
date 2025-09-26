# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VoxelWorld-1-vite is a 3D voxel-based world building game built with JavaScript, Three.js, and Vite. The application supports both web and Electron desktop deployment with mobile touch controls.

## Build Commands

- `npm run dev` - Start development server (Vite)
- `npm run build` - Build for web production
- `npm run preview` - Preview production build
- `npm run electron` - Run Electron app (requires build first)
- `npm run electron-dev` - Run Electron in development mode with hot reload
- `npm run build-web` - Build for web deployment with specific base path
- `npm run build-electron-win` - Build Windows Electron executable
- `npm run build-electron-linux` - Build Linux Electron executable
- `npm run build-electron-mac` - Build macOS Electron executable
- `npm run build-all` - Build Electron executables for all platforms

## Architecture

### Core Components

- **App.js** - Main entry point that handles mode switching between game and workbench
- **VoxelWorld.js** - Complete 3D voxel world implementation with:
  - Procedural terrain generation using seeded random
  - Chunk-based world loading/unloading
  - Biome system (forest, desert, mountain, plains, tundra)
  - Day/night cycle with dynamic lighting
  - Mobile touch controls with virtual joysticks
  - Save/load system using localStorage
  - Performance benchmarking system
- **main.js** - Legacy Vite template entry point (not used)
- **electron.cjs** - Electron main process configuration

### Key Features

- **Chunk System**: 8x8 block chunks with configurable render distance
- **Biome Generation**: Height-based terrain with biome-specific materials and colors
- **Mobile Support**: Automatic device detection with virtual joysticks
- **Performance Scaling**: Automatic render distance adjustment based on device performance
- **Material System**: Procedural textures for different block types with normal/player-placed variants

### Technologies

- **Three.js** - 3D rendering engine
- **Vite** - Build tool and development server
- **Electron** - Desktop application wrapper
- **Capacitor** - Mobile app framework (configured but not actively used)

## Development Notes

The project uses ES modules throughout. The main application initializes VoxelWorld in fullscreen mode by default. A workbench mode is planned but not yet implemented (ShapeForgeWorkbench.js).

The VoxelWorld class is fully self-contained with its own event handlers, save system, and UI elements. Performance is automatically optimized through chunk culling and device-specific render distance settings.