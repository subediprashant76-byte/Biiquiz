#!/bin/sh
set -eu

BACKEND_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

if [ -x "$BACKEND_DIR/.venv/bin/python" ]; then
  exec "$BACKEND_DIR/.venv/bin/python" "$@"
fi

if [ -x "$BACKEND_DIR/env/bin/python" ]; then
  exec "$BACKEND_DIR/env/bin/python" "$@"
fi

exec python3 "$@"
