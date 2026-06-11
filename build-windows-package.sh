#!/bin/sh

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
DIST_DIR="$ROOT_DIR/dist"
PACKAGE_NAME="sistema-sorteio-vagas-floresce-windows"
PACKAGE_DIR="$DIST_DIR/$PACKAGE_NAME"
TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"
ZIP_PATH="$DIST_DIR/$PACKAGE_NAME-$TIMESTAMP.zip"

rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR/public" "$PACKAGE_DIR/config" "$PACKAGE_DIR/runtime"
mkdir -p "$DIST_DIR"

cp "$ROOT_DIR/server.js" "$PACKAGE_DIR/"
cp "$ROOT_DIR/package.json" "$PACKAGE_DIR/"
cp "$ROOT_DIR/start.bat" "$PACKAGE_DIR/"
cp "$ROOT_DIR/INICIAR-SORTEIO-WINDOWS.bat" "$PACKAGE_DIR/"
cp "$ROOT_DIR/WINDOWS-README.txt" "$PACKAGE_DIR/"
cp -R "$ROOT_DIR/public/." "$PACKAGE_DIR/public/"
cp -R "$ROOT_DIR/config/." "$PACKAGE_DIR/config/"

(
  cd "$DIST_DIR"
  rm -f "$ZIP_PATH"
  zip -rq "$(basename "$ZIP_PATH")" "$PACKAGE_NAME"
)

echo "Pacote Windows gerado em:"
echo "$ZIP_PATH"
