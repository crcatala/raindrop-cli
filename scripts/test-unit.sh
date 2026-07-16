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

# The Axios/Nock test is run separately without coverage below. Bun coverage
# instrumentation can prevent Axios from reaching Nock and cause a timeout.
test_files=$(find src -name "*.test.ts" ! -name "*.live.test.ts" ! -name "nock-enforcement.test.ts" -type f | sort)

if [ -z "$test_files" ]; then
  echo "No unit test files found"
  exit 0
fi

# Run the general unit suite with caller-provided options (including coverage).
bun test $test_files "$@"

# Preserve a real network-isolation assertion in an uninstrumented process.
bun test src/test-utils/nock-enforcement.test.ts
