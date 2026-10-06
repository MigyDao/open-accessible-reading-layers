#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/examples/demo-book/src"
DIST="$ROOT/examples/demo-book/dist"
OUT="$DIST/the-water-line.epub"

rm -rf "$DIST"
mkdir -p "$DIST"

cd "$SRC"

# EPUB requires mimetype to be the first archive entry and stored uncompressed.
zip -X0 "$OUT" mimetype >/dev/null
zip -Xr9D "$OUT" META-INF EPUB >/dev/null

unzip -t "$OUT" >/dev/null

FIRST_ENTRY="$(unzip -Z1 "$OUT" | head -n 1)"
if [[ "$FIRST_ENTRY" != "mimetype" ]]; then
  echo "Expected mimetype to be first EPUB entry, got: $FIRST_ENTRY" >&2
  exit 1
fi

MIMETYPE_VALUE="$(unzip -p "$OUT" mimetype)"
if [[ "$MIMETYPE_VALUE" != "application/epub+zip" ]]; then
  echo "Invalid EPUB mimetype: $MIMETYPE_VALUE" >&2
  exit 1
fi

echo "Built $OUT"
