#!/usr/bin/env bash
set -euo pipefail

VERSION="${READIUM_CLI_VERSION:-0.10.1}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="${READIUM_BIN_DIR:-$ROOT/.tools/readium}"
ARCHIVE_DIR="$ROOT/.tools/cache"

mkdir -p "$BIN_DIR" "$ARCHIVE_DIR"

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
MACHINE="$(uname -m)"

case "$OS/$MACHINE" in
  linux/x86_64)
    ASSET="readium_linux_x86_64.tar.gz"
    SHA256="3968edc84b89e44ab139a4ec646daffac04fa3b808ae652d1ef7b95a1d2cb91a"
    ;;
  linux/aarch64|linux/arm64)
    ASSET="readium_linux_arm64.tar.gz"
    SHA256="0ddea0f6cd67233976038feb3b355a4e72756e908e8011e6423fe256b7f10e60"
    ;;
  darwin/arm64)
    ASSET="readium_darwin_arm64.tar.gz"
    SHA256="7c1d7c59c2b976fb041b4ef4ceae884f53aafd5f4cfbe94088b2ad61ad91d6e1"
    ;;
  darwin/x86_64)
    ASSET="readium_darwin_x86_64.tar.gz"
    SHA256="6ff03d4cfa82fb3a687b261a7c7ae211e3d015f328aae45c377b4db59ebf4ad5"
    ;;
  *)
    echo "Unsupported platform for this installer: $OS/$MACHINE" >&2
    echo "Install Readium CLI manually from https://github.com/readium/cli/releases" >&2
    exit 1
    ;;
esac

ARCHIVE="$ARCHIVE_DIR/$ASSET"
URL="https://github.com/readium/cli/releases/download/v$VERSION/$ASSET"

if [[ ! -f "$ARCHIVE" ]]; then
  curl -fsSL "$URL" -o "$ARCHIVE"
fi

if ! printf '%s  %s\n' "$SHA256" "$ARCHIVE" | sha256sum -c - >/dev/null; then
  echo "Readium CLI checksum verification failed for $ASSET" >&2
  exit 1
fi

rm -rf "$BIN_DIR"/*
tar -xzf "$ARCHIVE" -C "$BIN_DIR"

READIUM_BIN="$(find "$BIN_DIR" -type f -name readium -perm -111 -print -quit)"

if [[ -z "$READIUM_BIN" || ! -x "$READIUM_BIN" ]]; then
  echo "Readium executable not found after extracting $ASSET" >&2
  find "$BIN_DIR" -maxdepth 2 -type f -print >&2 || true
  exit 1
fi

# stdout is intentionally reserved for the resolved executable path so callers
# can safely use command substitution.
printf '%s\n' "$READIUM_BIN"
