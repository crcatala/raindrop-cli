#!/usr/bin/env bash
# Smoke test the npm package artifact exactly as users install it.
# This catches packaging-only failures such as invalid bin paths, missing files,
# duplicate shebangs, and runtime assumptions about the installed layout.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TMP_DIR="$(mktemp -d)"
TARBALL=""
cleanup() {
  rm -rf "$TMP_DIR"
  if [[ -n "$TARBALL" && -f "$TARBALL" ]]; then
    rm -f "$TARBALL"
  fi
}
trap cleanup EXIT

bun run build >/dev/null

TARBALL="$(npm pack --silent | tail -n 1)"
npm install -g --prefix "$TMP_DIR/prefix" --ignore-scripts "./$TARBALL" >/dev/null

BIN="$TMP_DIR/prefix/bin/rdcli"
EXPECTED_VERSION="$(node -p "require('./package.json').version")"
ACTUAL_VERSION="$($BIN --version)"

if [[ "$ACTUAL_VERSION" != "$EXPECTED_VERSION" ]]; then
  echo "Expected rdcli --version to output '$EXPECTED_VERSION', got '$ACTUAL_VERSION'" >&2
  exit 1
fi

"$BIN" --help >/dev/null

echo "Package smoke test passed"
