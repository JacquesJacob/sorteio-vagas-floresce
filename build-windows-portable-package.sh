#!/bin/sh

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
DIST_DIR="$ROOT_DIR/dist"
CACHE_DIR="$ROOT_DIR/.cache"
PACKAGE_NAME="sistema-sorteio-vagas-floresce-windows-portatil"
PACKAGE_DIR="$DIST_DIR/$PACKAGE_NAME"
TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"
ZIP_PATH="$DIST_DIR/$PACKAGE_NAME-$TIMESTAMP.zip"

NODE_VERSION="${NODE_VERSION:-24.16.0}"
NODE_PLATFORM="win-x64"
NODE_ARCHIVE_NAME="node-v$NODE_VERSION-$NODE_PLATFORM.zip"
NODE_DOWNLOAD_URL="https://nodejs.org/dist/v$NODE_VERSION/$NODE_ARCHIVE_NAME"
NODE_ARCHIVE_PATH="$CACHE_DIR/$NODE_ARCHIVE_NAME"
NODE_EXTRACT_DIR="$CACHE_DIR/node-v$NODE_VERSION-$NODE_PLATFORM"

mkdir -p "$DIST_DIR" "$CACHE_DIR"

if [ ! -f "$NODE_ARCHIVE_PATH" ]; then
  echo "Baixando runtime oficial do Node.js para Windows:"
  echo "$NODE_DOWNLOAD_URL"
  curl -fL "$NODE_DOWNLOAD_URL" -o "$NODE_ARCHIVE_PATH"
fi

rm -rf "$NODE_EXTRACT_DIR"
mkdir -p "$NODE_EXTRACT_DIR"
unzip -oq "$NODE_ARCHIVE_PATH" -d "$NODE_EXTRACT_DIR"

NODE_ROOT_DIR="$(find "$NODE_EXTRACT_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)"

if [ -z "$NODE_ROOT_DIR" ] || [ ! -f "$NODE_ROOT_DIR/node.exe" ]; then
  echo "Falha ao preparar o runtime Windows do Node.js."
  exit 1
fi

rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR/public" "$PACKAGE_DIR/config" "$PACKAGE_DIR/runtime"

cp "$ROOT_DIR/server.js" "$PACKAGE_DIR/"
cp "$ROOT_DIR/package.json" "$PACKAGE_DIR/"
cp "$ROOT_DIR/start.bat" "$PACKAGE_DIR/"
cp "$ROOT_DIR/INICIAR-SORTEIO-WINDOWS.bat" "$PACKAGE_DIR/"
cp "$ROOT_DIR/WINDOWS-README.txt" "$PACKAGE_DIR/"
cp -R "$ROOT_DIR/public/." "$PACKAGE_DIR/public/"
cp -R "$ROOT_DIR/config/." "$PACKAGE_DIR/config/"
cp -R "$NODE_ROOT_DIR/." "$PACKAGE_DIR/runtime/"

(
  cd "$DIST_DIR"
  rm -f "$ZIP_PATH"
  zip -rq "$(basename "$ZIP_PATH")" "$PACKAGE_NAME"
)

echo "Pacote Windows portatil gerado em:"
echo "$ZIP_PATH"
