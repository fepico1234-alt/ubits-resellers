#!/usr/bin/env bash
# Exporta la pieza de redes a PNG (doble resolución) con Google Chrome en modo headless.
# Uso: bash redes/exportar.sh
set -euo pipefail
cd "$(dirname "$0")"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
SRC="file://$PWD/pieza-resellers.html"
mkdir -p export
shot() { # formato ancho alto archivo
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 \
    --virtual-time-budget=3000 --window-size="$2,$3" --screenshot="$PWD/export/$4" "$SRC?f=$1" 2>/dev/null
  echo "export/$4"
}
shot land 1600 900  resellers-1600x900.png
shot feed 1080 1350 resellers-1080x1350.png
shot story 1080 1920 resellers-historia-1080x1920.png
