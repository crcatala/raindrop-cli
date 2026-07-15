#!/bin/bash
# Usage: ./scripts/prep-release.sh [last-tag]
# Gathers commit information since the last release for changelog drafting.

set -euo pipefail

LAST_TAG="${1:-$(git describe --tags --abbrev=0 2>/dev/null || true)}"

if [ -n "$LAST_TAG" ] && ! git rev-parse --verify --quiet "${LAST_TAG}^{commit}" >/dev/null; then
  echo "Error: '$LAST_TAG' is not a valid tag or commit." >&2
  exit 1
fi

if [ -z "$LAST_TAG" ]; then
  RANGE="HEAD"
else
  RANGE="${LAST_TAG}..HEAD"
fi

echo "=== Release Prep ==="
echo ""

if [ -z "$LAST_TAG" ]; then
  echo "No previous tag found. Showing all commits."
else
  echo "Changes since: $LAST_TAG"
fi
echo ""

echo "=== Commits ==="
echo ""
git log "$RANGE" --pretty=format:"- %s (%h)" --no-merges
echo ""
echo ""

echo "=== Merged PRs (if using GitHub) ==="
echo ""
git log "$RANGE" --pretty=format:"%s" | grep -E "^Merge pull request|#[0-9]+" || echo "(none found)"
echo ""
echo ""

echo "=== Files changed ==="
echo ""
if [ -z "$LAST_TAG" ]; then
  # Compare against the empty tree so initial releases include the complete history.
  EMPTY_TREE="$(git hash-object -t tree /dev/null)"
  git diff --stat "$EMPTY_TREE" HEAD | tail -5
else
  git diff --stat "$RANGE" | tail -10
fi
echo ""
echo ""

echo "=== AI Prompt Template ==="
echo ""
cat << 'EOF'
Review these commits and generate changelog entries in Keep a Changelog format.
Group entries by: Added, Changed, Fixed, Removed, and Security (only include sections that have entries).
Include only user-facing changes; exclude tests, CI, internal refactors, and routine dependency updates unless they affect users.
Be concise. Include PR or issue numbers in parentheses where mentioned.

Format example:
### Added
- New feature description (#123)

### Fixed
- Bug fix description

Commits to review:
EOF
echo ""
git log "$RANGE" --pretty=format:"- %s" --no-merges
echo ""
