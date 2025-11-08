#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Validates the Chrome Extension manifest file
 * Ensures all required fields are present and valid
 */

function validateManifest() {
  const manifestPath = path.join(__dirname, '..', 'manifest.json');

  try {
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);

    console.log('🔍 Validating manifest.json...');

    // Check required fields
    const requiredFields = [
      'name',
      'version',
      'manifest_version',
      'description'
    ];

    let hasErrors = false;

    for (const field of requiredFields) {
      if (!manifest[field]) {
        console.error(`❌ Missing required field: ${field}`);
        hasErrors = true;
      } else {
        console.log(`✅ Found required field: ${field}`);
      }
    }

    // Validate manifest version
    if (manifest.manifest_version !== 3) {
      console.error(`❌ Invalid manifest_version: ${manifest.manifest_version}. Expected: 3`);
      hasErrors = true;
    } else {
      console.log(`✅ Valid manifest_version: ${manifest.manifest_version}`);
    }

    // Validate version format (semver)
    const versionRegex = /^\d+\.\d+\.\d+$/;
    if (!versionRegex.test(manifest.version)) {
      console.error(`❌ Invalid version format: ${manifest.version}. Expected: x.y.z`);
      hasErrors = true;
    } else {
      console.log(`✅ Valid version format: ${manifest.version}`);
    }

    // Validate icons if present
    if (manifest.icons) {
      const requiredSizes = [16, 32, 48, 128];
      for (const size of requiredSizes) {
        if (!manifest.icons[size]) {
          console.warn(`⚠️  Missing icon size: ${size}x${size}`);
        } else {
          const iconPath = path.join(__dirname, '..', manifest.icons[size]);
          if (!fs.existsSync(iconPath)) {
            console.error(`❌ Icon file not found: ${iconPath}`);
            hasErrors = true;
          } else {
            console.log(`✅ Found icon: ${size}x${size}`);
          }
        }
      }
    }

    // Validate action/popup
    if (manifest.action && manifest.action.default_popup) {
      const popupPath = path.join(__dirname, '..', manifest.action.default_popup);
      if (!fs.existsSync(popupPath)) {
        console.error(`❌ Popup file not found: ${popupPath}`);
        hasErrors = true;
      } else {
        console.log(`✅ Found popup file: ${manifest.action.default_popup}`);
      }
    }

    // Validate background script
    if (manifest.background && manifest.background.service_worker) {
      const backgroundPath = path.join(__dirname, '..', manifest.background.service_worker);
      if (!fs.existsSync(backgroundPath)) {
        console.error(`❌ Background script not found: ${backgroundPath}`);
        hasErrors = true;
      } else {
        console.log(`✅ Found background script: ${manifest.background.service_worker}`);
      }
    }

    // Validate permissions
    if (manifest.permissions) {
      const validPermissions = [
        'alarms',
        'storage',
        'activeTab',
        'scripting',
        'tabs',
        'unlimitedStorage',
        'background'
      ];

      for (const permission of manifest.permissions) {
        if (!validPermissions.includes(permission)) {
          console.warn(`⚠️  Potentially unused permission: ${permission}`);
        }
      }
      console.log(`✅ Validated ${manifest.permissions.length} permissions`);
    }

    if (hasErrors) {
      console.error('\n❌ Manifest validation failed!');
      process.exit(1);
    }

    console.log('\n✅ Manifest validation passed!');
    console.log(`📦 Extension: ${manifest.name} v${manifest.version}`);

  } catch (error) {
    console.error(`❌ Error reading manifest: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  validateManifest();
}

module.exports = { validateManifest };
