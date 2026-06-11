#!/bin/sh

set -eu

if command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
elif [ -x "/Users/jacquesjacob/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" ]; then
  NODE_BIN="/Users/jacquesjacob/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
else
  echo "Node.js nao encontrado. Instale o Node ou ajuste o caminho em run-local.sh."
  exit 1
fi

exec "$NODE_BIN" server.js
