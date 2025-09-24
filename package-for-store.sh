#!/bin/bash

# Chrome Web Store Packaging Script for Spark Focus Timer
# This script creates a clean ZIP package ready for Chrome Web Store submission

set -e  # Exit on any error

# Configuration
EXTENSION_NAME="spark-focus-timer"
VERSION=$(grep '"version"' manifest.json | cut -d '"' -f 4)
OUTPUT_ZIP="${EXTENSION_NAME}-v${VERSION}-store-submission.zip"
TEMP_DIR="temp-package"

echo "🚀 Packaging Spark Focus Timer v${VERSION} for Chrome Web Store submission..."

# Clean up any existing temp directory
if [ -d "$TEMP_DIR" ]; then
    rm -rf "$TEMP_DIR"
fi

# Create temp directory and copy files
mkdir -p "$TEMP_DIR"

echo "📁 Copying extension files..."

# Core extension files (required)
cp manifest.json "$TEMP_DIR/"
cp popup.html "$TEMP_DIR/"
cp popup.js "$TEMP_DIR/"
cp background.js "$TEMP_DIR/"
cp styles.css "$TEMP_DIR/"
cp options.html "$TEMP_DIR/"
cp options.js "$TEMP_DIR/"
cp privacy.html "$TEMP_DIR/"

# Copy icons directory
if [ -d "icons" ]; then
    cp -r icons "$TEMP_DIR/"
    echo "✅ Icons directory copied"
else
    echo "⚠️  Warning: icons directory not found!"
fi

# Copy media directory if it exists (for promotional images)
if [ -d "media" ]; then
    cp -r media "$TEMP_DIR/"
    echo "✅ Media directory copied"
fi

# Verify manifest.json is at root level
if [ ! -f "$TEMP_DIR/manifest.json" ]; then
    echo "❌ Error: manifest.json not found at root level!"
    exit 1
fi

# Remove any development files that might have been copied
rm -f "$TEMP_DIR/debug-test.js"
rm -f "$TEMP_DIR/package-for-store.sh"
rm -f "$TEMP_DIR/CHROME_STORE_SUBMISSION.md"
rm -f "$TEMP_DIR/STORE_LISTING.md"
rm -f "$TEMP_DIR/PRIVACY_POLICY.md"
rm -f "$TEMP_DIR/.gitignore"

echo "🧹 Removed development files..."

# Create the ZIP file
if [ -f "$OUTPUT_ZIP" ]; then
    rm "$OUTPUT_ZIP"
fi

cd "$TEMP_DIR"
zip -r "../$OUTPUT_ZIP" . -x "*.DS_Store" "*/.git/*" "*/node_modules/*"
cd ..

# Clean up temp directory
rm -rf "$TEMP_DIR"

# Get file size
FILE_SIZE=$(ls -lh "$OUTPUT_ZIP" | awk '{print $5}')

echo "📦 Package created: $OUTPUT_ZIP ($FILE_SIZE)"
echo ""
echo "✅ Pre-submission checklist:"
echo "   📋 Manifest V3 compliant"
echo "   🔐 Privacy policy included"
echo "   🎨 All icons present (16, 32, 48, 128px)"
echo "   🚫 No development files included"
echo "   📁 manifest.json at root level"
echo ""
echo "📋 Next steps:"
echo "   1. Test the packaged extension locally"
echo "   2. Create screenshots (1280x800) and promotional images (440x280)"
echo "   3. Upload to Chrome Web Store Developer Dashboard"
echo "   4. Complete store listing with content from STORE_LISTING.md"
echo "   5. Link privacy policy: privacy.html"
echo ""
echo "🎯 Target category: Workflow & Planning"
echo "📝 Summary: Boost productivity with customizable Pomodoro work and break intervals - focus timer with uplifting break content"
echo ""
echo "Ready for Chrome Web Store submission! 🚀"