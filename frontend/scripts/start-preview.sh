#!/usr/bin/env sh
set -eu

CONFIG_PATH="${INVENTORY_RUNTIME_CONFIG:-dist/runtime-config.js}"
mkdir -p "$(dirname "$CONFIG_PATH")"
node -e "const fs = require('fs'); const apiUrl = process.env.VITE_API_URL || process.env.API_URL || 'http://localhost:3000'; fs.writeFileSync(process.env.INVENTORY_RUNTIME_CONFIG || 'dist/runtime-config.js', 'window.__INVENTORY_CONFIG__ = ' + JSON.stringify({ apiUrl }) + ';\n');"
exec vite preview --host 0.0.0.0 --port "${PORT:-5173}"
