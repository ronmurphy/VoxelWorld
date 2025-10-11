#!/usr/bin/env node
/**
 * bump-version.js - Auto-increment version numbers
 *
 * Runs before each Electron build to bump the revision number
 * - Revision increments by 1 on each build
 * - After 10 revisions, minor bumps by 1 and revision resets to 0
 * - Major version is manually controlled (edit version.json directly)
 */

const fs = require('fs');
const path = require('path');

const versionPath = path.join(__dirname, 'version.json');

try {
    // Read current version
    const version = JSON.parse(fs.readFileSync(versionPath, 'utf8'));

    console.log(`📦 Current version: ${version.major}.${version.minor}.${version.revision}`);

    // Increment revision
    version.revision += 1;

    // Check if we need to bump minor
    if (version.revision >= 10) {
        version.minor += 1;
        version.revision = 0;
        console.log(`🎉 Minor version bumped! Now: ${version.major}.${version.minor}.${version.revision}`);
    } else {
        console.log(`⬆️  Revision bumped! Now: ${version.major}.${version.minor}.${version.revision}`);
    }

    // Update build date
    version.buildDate = new Date().toISOString();

    // Write back to file
    fs.writeFileSync(versionPath, JSON.stringify(version, null, 2) + '\n');

    // Also copy to assets folder so it's included in builds
    const assetsVersionPath = path.join(__dirname, 'assets', 'version.json');
    fs.writeFileSync(assetsVersionPath, JSON.stringify(version, null, 2) + '\n');

    console.log(`✅ Version file updated: ${version.major}.${version.minor}.${version.revision}`);
    console.log(`📅 Build date: ${version.buildDate}`);
    console.log(`📋 Copied to assets/version.json`);

} catch (error) {
    console.error('❌ Failed to bump version:', error);
    process.exit(1);
}
