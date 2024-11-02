#!/bin/bash

# Get version from manifest.json
VERSION=$(grep -Po '(?<="version": ")[^"]*' manifest.json)

# Create zip file
zip -r "TabCountdownTimer_${VERSION}.zip" . -x "*.git*" "release.sh"

echo "Created TabCountdownTimer_${VERSION}.zip"
