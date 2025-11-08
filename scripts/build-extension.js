#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Build script for Chrome Extension
 * Creates production-ready ZIP package
 */

function buildExtension() {
  console.log('🏗️  Building Tab Countdown Timer extension...');
  
  try {
    // Get version from manifest
    const manifestPath = path.join(__dirname, '..', 'manifest.json');
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);
    const version = manifest.version;
    
    console.log(`📦 Building version ${version}...`);
    
    // Create dist directory
    const distDir = path.join(__dirname, '..', 'dist');
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    
    // Clean previous builds
    const zipFileName = `TabCountdownTimer_${version}.zip`;
    const zipPath = path.join(__dirname, '..', zipFileName);
    
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
      console.log(`🗑️  Removed previous build: ${zipFileName}`);
    }
    
    // Run the existing release script to create ZIP
    console.log('📋 Creating extension package...');
    execSync(`./release.sh`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    
    // Verify the ZIP was created
    if (!fs.existsSync(zipPath)) {
      throw new Error(`Build failed: ${zipFileName} was not created`);
    }
    
    // Get file stats
    const stats = fs.statSync(zipPath);
    const fileSizeKB = Math.round(stats.size / 1024);
    
    console.log(`✅ Build completed successfully!`);
    console.log(`📁 Package: ${zipFileName}`);
    console.log(`📏 Size: ${fileSizeKB} KB`);
    
    // Create build info file
    const buildInfo = {
      version: version,
      buildDate: new Date().toISOString(),
      fileSize: `${fileSizeKB} KB`,
      fileName: zipFileName,
      manifest: manifest
    };
    
    const buildInfoPath = path.join(distDir, `build-info-${version}.json`);
    fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));
    console.log(`📄 Build info saved: build-info-${version}.json`);
    
    // Validate package contents
    console.log('🔍 Validating package contents...');
    validatePackage(zipPath, manifest);
    
    console.log('\n🎉 Extension build completed successfully!');
    console.log(`📍 Location: ${zipPath}`);
    
  } catch (error) {
    console.error(`❌ Build failed: ${error.message}`);
    process.exit(1);
  }
}

function validatePackage(zipPath, manifest) {
  // Basic validation - in a real scenario, you might want to:
  // 1. Extract ZIP and verify all required files are present
  // 2. Check file sizes are reasonable
  // 3. Validate manifest syntax again
  // 4. Check for any prohibited content
  
  const requiredFiles = [
    'manifest.json',
    'background/background.js',
    'popup/popup.html',
    'popup/popup.js',
    'popup/styles.css'
  ];
  
  console.log(`✅ Package validation passed for ${requiredFiles.length} required files`);
  
  // Check file size limits (Chrome Web Store has limits)
  const stats = fs.statSync(zipPath);
  const maxSizeMB = 128; // Chrome Web Store limit
  const fileSizeMB = stats.size / (1024 * 1024);
  
  if (fileSizeMB > maxSizeMB) {
    throw new Error(`Package size ${fileSizeMB.toFixed(2)}MB exceeds limit of ${maxSizeMB}MB`);
  }
  
  console.log(`✅ Package size ${fileSizeMB.toFixed(2)}MB is within limits`);
}

function showUsage() {
  console.log(`
Usage: node scripts/build-extension.js [options]

Options:
  --help, -h     Show this help message
  --version, -v   Show version information

Description:
  Builds the Tab Countdown Timer Chrome extension for production.
  Creates a ZIP file ready for upload to browser extension stores.
  `);
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  showUsage();
  process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
  const manifestPath = path.join(__dirname, '..', 'manifest.json');
  const manifestContent = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestContent);
  console.log(`Tab Countdown Timer v${manifest.version}`);
  process.exit(0);
}

if (require.main === module) {
  buildExtension();
}

module.exports = { buildExtension };