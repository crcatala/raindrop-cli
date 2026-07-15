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

# dist was built above; do not run lifecycle scripts again while packing the
# artifact under test. `prepack` separately guarantees direct npm publish
# commands rebuild dist immediately before upload.
TARBALL="$(npm pack --ignore-scripts --silent | tail -n 1)"
npm install -g --prefix "$TMP_DIR/prefix" --ignore-scripts "./$TARBALL" >/dev/null

SHEBANG_COUNT="$(grep -c '^#!' dist/cli.js || true)"
if [[ "$SHEBANG_COUNT" != "1" ]]; then
  echo "Expected dist/cli.js to have exactly one shebang, got $SHEBANG_COUNT" >&2
  exit 1
fi

BIN="$TMP_DIR/prefix/bin/rd"
EXPECTED_VERSION="$(node -p "require('./package.json').version")"
ACTUAL_VERSION="$($BIN --version)"

if [[ "$ACTUAL_VERSION" != "$EXPECTED_VERSION" ]]; then
  echo "Expected rdcli --version to output '$EXPECTED_VERSION', got '$ACTUAL_VERSION'" >&2
  exit 1
fi

"$BIN" --help >/dev/null

# Check that executing a real Axios request from the project root does not emit
# Node deprecation warnings (e.g. from proxy-from-env using the legacy
# url.parse() API). Running from inside node_modules suppresses these warnings,
# so we exercise the local dist artifact directly.
DEPRECATION_OUTPUT="$(NODE_OPTIONS=--trace-deprecation RAINDROP_TOKEN=fake ./dist/cli.js collections stats 2>&1 || true)"
if echo "$DEPRECATION_OUTPUT" | grep -q "DeprecationWarning"; then
  echo "Found deprecation warning in CLI output:" >&2
  echo "$DEPRECATION_OUTPUT" >&2
  exit 1
fi

echo "Package smoke test passed"
