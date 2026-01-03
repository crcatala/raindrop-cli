#!/usr/bin/env bash
# verify.sh - Run all verification checks in parallel with minimal output
#
# Usage:
#   ./scripts/verify.sh          # Brief output (for AI agents)
#   VERBOSE=1 ./scripts/verify.sh # Full output (for humans)
#
# Runs: tests, lint, typecheck, format check

set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/run_silent.sh"

# Track failures
declare -a FAILED_CHECKS=()
declare -a FAILED_HINTS=()

echo "Verifying..."
echo ""

# Create temp files for each check's exit code
tmp_test=$(mktemp)
tmp_lint=$(mktemp)
tmp_typecheck=$(mktemp)
tmp_format=$(mktemp)

# Run all checks in parallel using background jobs
(
  run_silent_test "Tests" "bun test --bail" "bun run test:verbose"
  echo $? > "$tmp_test"
) &
pid_test=$!

(
  run_silent "Lint" "oxlint --type-aware src/" "bun run lint:verbose"
  echo $? > "$tmp_lint"
) &
pid_lint=$!

(
  run_silent "Typecheck" "tsc --noEmit" "bun run typecheck:verbose"
  echo $? > "$tmp_typecheck"
) &
pid_typecheck=$!

(
  run_silent "Format" "prettier --check \"src/**/*.ts\"" "bun run format:check:verbose"
  echo $? > "$tmp_format"
) &
pid_format=$!

# Wait for all jobs to complete
wait $pid_test $pid_lint $pid_typecheck $pid_format

# Collect results
exit_test=$(cat "$tmp_test")
exit_lint=$(cat "$tmp_lint")
exit_typecheck=$(cat "$tmp_typecheck")
exit_format=$(cat "$tmp_format")

# Clean up temp files
rm -f "$tmp_test" "$tmp_lint" "$tmp_typecheck" "$tmp_format"

# Track failures
[ "$exit_test" != "0" ] && FAILED_CHECKS+=("Tests") && FAILED_HINTS+=("bun run test:verbose")
[ "$exit_lint" != "0" ] && FAILED_CHECKS+=("Lint") && FAILED_HINTS+=("bun run lint:verbose")
[ "$exit_typecheck" != "0" ] && FAILED_CHECKS+=("Typecheck") && FAILED_HINTS+=("bun run typecheck:verbose")
[ "$exit_format" != "0" ] && FAILED_CHECKS+=("Format") && FAILED_HINTS+=("bun run format:check:verbose")

# Print summary
echo ""
if [ ${#FAILED_CHECKS[@]} -eq 0 ]; then
  echo -e "${GREEN}All checks passed${NC}"
  exit 0
else
  echo -e "${RED}${#FAILED_CHECKS[@]} check(s) failed${NC}"

  # Only show hints if not in verbose mode (verbose already shows full output)
  if [ "$VERBOSE" != "1" ]; then
    echo ""
    echo "Run for details:"
    for hint in "${FAILED_HINTS[@]}"; do
      echo "  $hint"
    done
  fi

  exit 1
fi
