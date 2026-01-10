#!/bin/bash
# Validates that CHANGELOG.md has entries in the [Unreleased] section before releasing.

set -e

# Extract content between [Unreleased] and next version header
content=$(awk '/^## \[Unreleased\]/{found=1;next} /^## \[/{exit} found{print}' CHANGELOG.md)

# Check if there's any actual content (### headers like Added, Fixed, etc.)
if ! echo "$content" | grep -q '^### '; then
  echo "Error: No entries in [Unreleased] section of CHANGELOG.md"
  echo ""
  echo "Add your changes before releasing:"
  echo "  ### Added"
  echo "  - New feature description"
  echo ""
  echo "  ### Fixed"
  echo "  - Bug fix description"
  exit 1
fi

echo "✓ Changelog has unreleased entries"
