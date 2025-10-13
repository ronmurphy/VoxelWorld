# Windows Fonts on Arch Linux - Complete Guide

## Current Status ✅
- **ttf-ms-fonts**: Installed (Core Microsoft fonts: Arial, Times New Roman, etc.)
- **ttf-dejavu**: Installed (Open source alternatives)
- **Material Design Icons**: Added to VoxelWorld (bundled, no external CDN)

## Why Windows 11 Fonts are Tricky on Arch

Windows 11 fonts are **proprietary** and **licensed**. Microsoft doesn't allow free redistribution, which is why:
1. `ttf-ms-win11-auto` often breaks (downloads from MS servers, which may block it)
2. No official package exists in AUR with the actual Win11 font files

## Solutions (Best to Worst)

### ✅ Option 1: Use What You Have (Recommended)
The `ttf-ms-fonts` you installed includes:
- Arial, Times New Roman, Courier New
- Comic Sans MS, Georgia, Verdana, Trebuchet MS
- Impact, Webdings

**This is enough for most applications!** VoxelWorld is already configured to use these as fallbacks.

```bash
# Verify installed:
fc-list | grep -i arial
fc-list | grep -i "times new"
```

### ✅ Option 2: Install Vista/Win7 Era Fonts
These are newer than ttf-ms-fonts but still redistributable:

```bash
yay -S ttf-vista-fonts
```

Includes: Calibri, Cambria, Candara, Consolas, Constantia, Corbel

### ⚠️ Option 3: Manual Windows 11 Font Installation
If you have access to a Windows 11 machine:

```bash
# 1. On Windows 11, copy fonts from:
C:\Windows\Fonts\

# 2. Transfer them to Linux
# 3. Install locally:
mkdir -p ~/.local/share/fonts/Win11
cp /path/to/windows/fonts/*.ttf ~/.local/share/fonts/Win11/
fc-cache -fv
```

**Important Windows 11 fonts to copy**:
- `Segoe UI` family (SegoeUI*.ttf)
- `Cascadia Code` (coding font)
- `Aptos` (new Office font)

### ⚠️ Option 4: Wine Font Helper
Use Wine's font installation system:

```bash
# Install winetricks
sudo pacman -S winetricks

# Install core fonts through Wine
winetricks corefonts

# Install all fonts (large download)
winetricks allfonts
```

### ❌ Option 5: ttf-ms-win11-auto (Often Breaks)
This package tries to download from Microsoft servers:

```bash
yay -S ttf-ms-win11-auto
```

**Common issues:**
- Microsoft blocks automated downloads
- Package outdated
- Checksums fail

**If it fails**, check the package comments:
```bash
yay -Gi ttf-ms-win11-auto  # View package info
```

## Alternative: Use Open Source Replacements

Microsoft fonts → Open Source equivalents:

| Windows Font | Open Source Alternative | Install |
|--------------|-------------------------|---------|
| Arial | Liberation Sans | `sudo pacman -S ttf-liberation` |
| Times New Roman | Liberation Serif | (same package) |
| Courier New | Liberation Mono | (same package) |
| Calibri | Carlito | `sudo pacman -S ttf-carlito` |
| Cambria | Caladea | `sudo pacman -S ttf-caladea` |
| Segoe UI | Noto Sans | `sudo pacman -S noto-fonts` |

**Install all open source replacements:**
```bash
sudo pacman -S ttf-liberation ttf-carlito ttf-caladea noto-fonts noto-fonts-emoji
```

## VoxelWorld Font Configuration

VoxelWorld is already configured with extensive fallbacks:

1. **Inter** (custom bundled font)
2. **Segoe UI** (Windows 10/11)
3. **Roboto** (Android)
4. **Ubuntu, Oxygen, Cantarell** (Linux)
5. **Liberation Sans** (Open source Arial replacement)
6. **DejaVu Sans** (Your installed fallback)
7. **Generic sans-serif**

## Recommended Action Plan

```bash
# 1. Install open source replacements (safe, legal, works great)
sudo pacman -S ttf-liberation ttf-dejavu noto-fonts

# 2. Install Vista fonts (legal, redistributable)
yay -S ttf-vista-fonts

# 3. Update font cache
fc-cache -fv

# 4. Test VoxelWorld
cd /home/brad/Documents/VoxelWorld-1/VoxelWorld-1-vite/dist-electron
wine VoxelWorld-0.2.7-portable.exe
```

## Verify Fonts Are Working

```bash
# List all available sans-serif fonts
fc-list : family | grep -i sans | sort -u

# Check specific fonts
fc-list | grep -i liberation
fc-list | grep -i dejavu
fc-list | grep -i noto

# Check what Wine sees
WINEDEBUG=+font wine VoxelWorld-0.2.7-portable.exe 2>&1 | grep -i "font"
```

## Current VoxelWorld Status

✅ **Fonts working with ttf-ms-fonts**
✅ **Material Design Icons bundled (no external CDN)**  
✅ **Fallback fonts configured for Linux**  
✅ **No external dependencies**

You don't actually need Windows 11 fonts - the current setup works great!

---
**Last Updated**: October 12, 2025  
**VoxelWorld Version**: 0.2.7
