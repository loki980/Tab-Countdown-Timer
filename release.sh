#!/bin/bash

# Get version from manifest.json
VERSION=$(grep -Po '(?<="version": ")[^"]*' manifest.json)

# Create zip file
zip -r "TabCountdownTimer_${VERSION}.zip" . -x "*.git*" "release.sh" "*.zip" "node_modules/*" "coverage/*" ".jest/*" "reports/*" "dist/*" "*.lcov" ".nyc_output/*"

echo "Created TabCountdownTimer_${VERSION}.zip"
