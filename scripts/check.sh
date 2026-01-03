#!/usr/bin/env bash
# check.sh - Run individual checks with minimal output
#
# Usage:
#   ./scripts/check.sh test       # Run tests silently
#   ./scripts/check.sh lint       # Run linting silently
#   ./scripts/check.sh typecheck  # Run typecheck silently
#   ./scripts/check.sh format     # Run format check silently
#
#   VERBOSE=1 ./scripts/check.sh test  # Full output

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/run_silent.sh"

case "$1" in
  test)
    run_silent_test "Tests" "bun test --bail --only-failures" "bun run test:verbose"
    ;;
  lint)
    run_silent "Lint" "oxlint --type-aware src/" "bun run lint:verbose"
    ;;
  typecheck)
    run_silent "Typecheck" "tsc --noEmit" "bun run typecheck:verbose"
    ;;
  format)
    run_silent "Format" "prettier --check \"src/**/*.ts\"" "bun run format:check:verbose"
    ;;
  *)
    echo "Usage: $0 {test|lint|typecheck|format}"
    echo ""
    echo "Runs the specified check with minimal output."
    echo "Set VERBOSE=1 for full output."
    exit 1
    ;;
esac
