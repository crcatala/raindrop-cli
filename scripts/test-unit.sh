#!/bin/bash
# Run only unit tests (excluding *.live.test.ts files)
# This ensures no API calls are made during unit testing

set -e

# Find all .test.ts files except .live.test.ts files
test_files=$(find src -name "*.test.ts" ! -name "*.live.test.ts" -type f | sort)

if [ -z "$test_files" ]; then
  echo "No unit test files found"
  exit 0
fi

# Run bun test with the found files
exec bun test $test_files "$@"
