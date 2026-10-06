#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EPUB_DIR="$ROOT/examples/demo-book/dist"
EPUB_NAME="the-water-line.epub"
EPUB="$EPUB_DIR/$EPUB_NAME"

if [[ ! -f "$EPUB" ]]; then
  bash "$ROOT/scripts/build-demo-epub.sh"
fi

READIUM_BIN="${READIUM_BIN:-}"

if [[ -z "$READIUM_BIN" ]]; then
  READIUM_BIN="$(bash "$ROOT/scripts/install-readium-cli.sh")"
fi

PORT="${READIUM_PORT:-15080}"
BASE="http://127.0.0.1:$PORT"
LOG="$(mktemp)"
MANIFEST="$(mktemp)"
POSITIONS="$(mktemp)"

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -f "$LOG" "$MANIFEST" "$POSITIONS"
}
trap cleanup EXIT

"$READIUM_BIN" serve   --file-directory "$EPUB_DIR"   --address 127.0.0.1   --port "$PORT"   >"$LOG" 2>&1 &
SERVER_PID=$!

for _ in $(seq 1 40); do
  if curl -fsS "$BASE/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

if ! curl -fsS "$BASE/health" >/dev/null; then
  cat "$LOG" >&2
  echo "Readium server did not become ready." >&2
  exit 1
fi

ENCODED="$(
  printf '%s' "$EPUB_NAME" |
    base64 -w0 |
    tr '+/' '-_' |
    tr -d '='
)"

PUBLICATION_BASE="$BASE/webpub/$ENCODED"
MANIFEST_URL="$PUBLICATION_BASE/manifest.json"
POSITIONS_URL="$PUBLICATION_BASE/~readium/positions.json"

curl -fsS "$MANIFEST_URL" -o "$MANIFEST"
curl -fsS "$POSITIONS_URL" -o "$POSITIONS"

IDENTIFIER="$(jq -r '.metadata.identifier' "$MANIFEST")"
if [[ "$IDENTIFIER" != "urn:uuid:orl-demo-the-water-line-v0.1" ]]; then
  echo "Unexpected manifest identifier: $IDENTIFIER" >&2
  exit 1
fi

READING_ORDER_COUNT="$(jq '.readingOrder | length' "$MANIFEST")"
if [[ "$READING_ORDER_COUNT" -ne 4 ]]; then
  echo "Expected 4 reading-order resources, got $READING_ORDER_COUNT" >&2
  exit 1
fi

POSITION_COUNT="$(jq '.positions | length' "$POSITIONS")"
if [[ "$POSITION_COUNT" -lt 4 ]]; then
  echo "Expected at least 4 Readium positions, got $POSITION_COUNT" >&2
  exit 1
fi

echo "Readium demo verified."
echo "Manifest: $MANIFEST_URL"
echo "Positions: $POSITIONS_URL"
echo "Reading-order resources: $READING_ORDER_COUNT"
echo "Positions: $POSITION_COUNT"
