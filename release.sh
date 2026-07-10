#!/bin/bash
set -euo pipefail

# Get version from manifest.json
VERSION=$(grep -Po '(?<="version": ")[^"]*' manifest.json)

# Stage only the files the extension needs at runtime. Never ship tests,
# configs, CI files, or local tooling to the store.
STAGE_DIR="dist/package"
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR"

cp manifest.json LICENSE "$STAGE_DIR/"
cp -r background popup shared icons lib "$STAGE_DIR/"

# Drop empty directories (e.g. local scratch dirs) from the package.
find "$STAGE_DIR" -type d -empty -delete

ZIP_NAME="TabCountdownTimer_${VERSION}.zip"
rm -f "$ZIP_NAME"
(cd "$STAGE_DIR" && zip -r "../../${ZIP_NAME}" .)

echo "Created ${ZIP_NAME}"
