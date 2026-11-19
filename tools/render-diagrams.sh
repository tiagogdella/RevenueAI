#!/usr/bin/env bash
# Render every docs/*.mmd Mermaid diagram to a PNG next to it.
# Usage: tools/render-diagrams.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="$(mktemp)"
trap 'rm -f "$CONFIG"' EXIT

# Use the system Chrome when available, so puppeteer doesn't download its own.
CHROME="$(command -v google-chrome || command -v chromium || command -v chromium-browser || true)"
if [ -n "$CHROME" ]; then
  echo "{\"executablePath\": \"$CHROME\", \"args\": [\"--no-sandbox\"]}" > "$CONFIG"
else
  echo '{"args": ["--no-sandbox"]}' > "$CONFIG"
fi

shopt -s nullglob
for src in "$ROOT"/docs/*.mmd; do
  out="${src%.mmd}.png"
  echo "Rendering $(basename "$src") -> $(basename "$out")"
  PUPPETEER_SKIP_DOWNLOAD=1 npx -y @mermaid-js/mermaid-cli@11.4.2 \
    -i "$src" -o "$out" -p "$CONFIG" -b white -w 1600 -s 2
done
