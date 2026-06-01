#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_NAME="Agent Pet.app"
RELEASE_DIR="$ROOT_DIR/release"
APP_DIR="$RELEASE_DIR/mac-arm64/$APP_NAME"
ZIP_PATH="$RELEASE_DIR/Agent Pet-0.1.0-mac-arm64.zip"
DMG_PATH="$RELEASE_DIR/Agent Pet-0.1.0-mac-arm64.dmg"
STAGE_DIR="$RELEASE_DIR/dmg-stage"

cd "$ROOT_DIR"

env CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --mac zip --publish never

# Re-sign the staged app with a coherent ad-hoc signature so GitHub alpha
# downloads open as an unsigned app instead of a broken signature bundle.
codesign --force --deep --sign - "$APP_DIR"
codesign --verify --deep --strict --verbose=2 "$APP_DIR"

rm -f "$ZIP_PATH"
ditto -c -k --keepParent "$APP_DIR" "$ZIP_PATH"

rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR"
cp -R "$APP_DIR" "$STAGE_DIR/"
ln -s /Applications "$STAGE_DIR/Applications"

rm -f "$DMG_PATH"
hdiutil create \
  -volname "Agent Pet" \
  -srcfolder "$STAGE_DIR" \
  -ov \
  -format UDZO \
  "$DMG_PATH"

rm -rf "$STAGE_DIR"
