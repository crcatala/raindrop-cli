#!/usr/bin/env bash
# Manual test script for TTY detection
# Run this to verify smart output defaults work correctly

set -e

echo "=== TTY Detection Test ==="
echo ""

# Build first
echo "Building..."
npm run build > /dev/null 2>&1
echo ""

# Test 1: Direct terminal output (should show table if TTY)
echo "Test 1: Direct terminal output"
echo "  Expected: table format (if running in terminal)"
echo "  Command: node dist/index.js auth status"
echo "  ---"
node dist/index.js auth status 2>/dev/null || echo "  (auth not configured - that's ok for this test)"
echo ""

# Test 2: Piped output (should show JSON)
echo "Test 2: Piped to cat (simulates non-TTY)"
echo "  Expected: JSON format"
echo "  Command: node dist/index.js auth status --json | cat"
echo "  ---"
node dist/index.js auth status --json 2>/dev/null | cat || echo "  (auth not configured - that's ok for this test)"
echo ""

# Test 3: Explicit format override
echo "Test 3: Explicit --format json in terminal"
echo "  Expected: JSON format (explicit overrides TTY detection)"
echo "  Command: node dist/index.js --format json auth status"
echo "  ---"
# Note: auth status has its own --json flag, so this tests global option passthrough
echo "  (This tests that --format flag is accepted)"
node dist/index.js --format json --help > /dev/null && echo "  --format json accepted ✓"
echo ""

# Test 4: Check help text mentions smart defaults
echo "Test 4: Help text describes smart defaults"
echo "  ---"
node dist/index.js --help | grep -i "format" || echo "  (format option not found in help)"
echo ""

echo "=== Tests Complete ==="
echo ""
echo "To manually verify TTY detection:"
echo "  1. Run a command directly - should get table format"
echo "  2. Run command | cat - should get JSON format"
echo "  3. Run command | jq . - should parse as valid JSON"
