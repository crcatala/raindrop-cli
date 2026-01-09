#!/usr/bin/env bash
# check.sh - Run individual checks with minimal output
#
# Usage:
#   ./scripts/check.sh test        # Run tests silently
#   ./scripts/check.sh lint        # Run linting silently
#   ./scripts/check.sh typecheck   # Run typecheck silently
#   ./scripts/check.sh format      # Run format check silently
#   ./scripts/check.sh format-fix  # Run format fix silently
#
#   VERBOSE=1 ./scripts/check.sh test  # Full output
#
# Additional args are passed to the underlying command:
#   ./scripts/check.sh test --test-name-pattern "my pattern"
#   ./scripts/check.sh test --timeout 10000

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/run_silent.sh"

# Capture the command type and shift to get remaining args
cmd="$1"
shift 2>/dev/null || true
extra_args="$*"

case "$cmd" in
  test)
    run_silent_test "Unit Tests" "FORCE_COLOR=1 bash scripts/test-unit.sh --bail $extra_args" "bun run test:verbose -- $extra_args"
    ;;
  test:live)
    run_silent_test "Live Tests" "RDCLI_API_DELAY_MS=250 bun test --no-parallel src/**/*.live.test.ts --bail $extra_args" "bun run test:live:verbose -- $extra_args"
    ;;
  test:all)
    run_silent_test "All Tests" "RDCLI_API_DELAY_MS=250 bun test src --bail $extra_args" "bun run test:all:verbose -- $extra_args"
    ;;
  lint)
    run_silent "Lint" "oxlint --type-aware src/ $extra_args" "bun run lint:verbose"
    ;;
  typecheck)
    run_silent "Typecheck" "tsc --noEmit $extra_args" "bun run typecheck:verbose"
    ;;
  format)
    run_silent "Format" "prettier --check \"src/**/*.ts\" $extra_args" "bun run format:check:verbose"
    ;;
  format-fix)
    run_silent "Format (fix)" "prettier --write \"src/**/*.ts\" $extra_args" "bun run format:verbose"
    ;;
  *)
    echo "Usage: $0 {test|test:live|test:all|lint|typecheck|format|format-fix} [extra args...]"
    echo ""
    echo "Runs the specified check with minimal output."
    echo "Set VERBOSE=1 for full output."
    echo ""
    echo "Examples:"
    echo "  $0 test                                    # Run unit tests"
    echo "  $0 test --test-name-pattern 'my pattern'  # Filter by test name"
    echo "  $0 test --timeout 10000                   # Custom timeout"
    exit 1
    ;;
esac
