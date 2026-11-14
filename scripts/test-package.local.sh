#!/usr/bin/env bash
# Project-specific package checks, sourced by scripts/test-package.sh (the canonical smoke test)
# with $consumer set to the install prefix. Keep the canonical script unchanged.
#
# These checks used to live in scripts/test-package.sh before it was replaced by the release
# standard's copy; they are kept here so nothing the repository relied on was dropped.

# dist/ was just rebuilt by `npm pack` (which runs prepack), so this inspects the artifact
# under test rather than a previous build.
SHEBANG_COUNT="$(grep -c '^#!' dist/cli.js || true)"
if [[ "$SHEBANG_COUNT" != "1" ]]; then
  echo "Expected dist/cli.js to have exactly one shebang, got $SHEBANG_COUNT" >&2
  exit 1
fi

# The version line must carry this package's version, not just look like a version.
EXPECTED_VERSION="$(node -p "require('./package.json').version")"
ACTUAL_VERSION="$("$consumer/node_modules/.bin/rd" --version)"
case "$ACTUAL_VERSION" in
  "rd $EXPECTED_VERSION" | "rd $EXPECTED_VERSION "*) ;;
  *)
    echo "Expected 'rd --version' to report $EXPECTED_VERSION, got '$ACTUAL_VERSION'" >&2
    exit 1
    ;;
esac

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
