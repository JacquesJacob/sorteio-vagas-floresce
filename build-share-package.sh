#!/bin/sh

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
DIST_DIR="$ROOT_DIR/dist"
PACKAGE_NAME="sistema-sorteio-vagas-floresce"
TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"
PACKAGE_DIR="$DIST_DIR/$PACKAGE_NAME"
ZIP_PATH="$DIST_DIR/$PACKAGE_NAME-$TIMESTAMP.zip"

rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR"
mkdir -p "$DIST_DIR"

cp "$ROOT_DIR/server.js" "$PACKAGE_DIR/"
cp "$ROOT_DIR/package.json" "$PACKAGE_DIR/"
cp "$ROOT_DIR/run-local.sh" "$PACKAGE_DIR/"
cp "$ROOT_DIR/start.command" "$PACKAGE_DIR/"
cp "$ROOT_DIR/start.bat" "$PACKAGE_DIR/"
cp "$ROOT_DIR/README.md" "$PACKAGE_DIR/"
mkdir -p "$PACKAGE_DIR/public" "$PACKAGE_DIR/config"
cp -R "$ROOT_DIR/public/." "$PACKAGE_DIR/public/"
cp -R "$ROOT_DIR/config/." "$PACKAGE_DIR/config/"

chmod +x "$PACKAGE_DIR/run-local.sh" "$PACKAGE_DIR/start.command"

(
  cd "$DIST_DIR"
  rm -f "$ZIP_PATH"
  zip -rq "$(basename "$ZIP_PATH")" "$PACKAGE_NAME"
)

echo "Pacote gerado em:"
echo "$ZIP_PATH"
