#!/bin/bash
# Run only unit tests (excluding *.live.test.ts files)
# This ensures no API calls are made during unit testing
#
# Why a script? Bun test doesn't have a built-in --exclude flag,
# so we need to explicitly find and list the non-live test files.
#
# All additional arguments are passed through to bun test, e.g.:
#   ./scripts/test-unit.sh --test-name-pattern "my pattern"
#   ./scripts/test-unit.sh --bail --timeout 10000
#   ./scripts/test-unit.sh --coverage  # enable coverage report

set -e

# Find all .test.ts files except .live.test.ts files
test_files=$(find src -name "*.test.ts" ! -name "*.live.test.ts" -type f | sort)

if [ -z "$test_files" ]; then
  echo "No unit test files found"
  exit 0
fi

# Run bun test with the found files (all args passed through)
exec bun test $test_files "$@"
