#!/usr/bin/env bash
# release-standard: scripts/test-package.sh r1 (do not edit; see RELEASING.md)
# Pack the npm tarball, install it the way a user would, and check that every command
# answers --help and prints a standard --version line. Project-specific checks go in
# scripts/test-package.local.sh, which is sourced with $consumer set to the install prefix.
set -euo pipefail

tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT

# `npm pack` runs prepack (the build), so the tarball carries a fresh build-info stamp.
npm pack --pack-destination "$tmpdir" >/dev/null
archive=$(find "$tmpdir" -maxdepth 1 -name '*.tgz' | head -n 1)
[[ -n "$archive" ]] || { echo 'Error: npm pack produced no tarball.' >&2; exit 1; }

consumer="$tmpdir/consumer"
# A normal install, so dependency install scripts run just as they do for users.
npm install --omit=dev --no-audit --no-fund --prefix "$consumer" "$archive" >/dev/null

bins=$(node -e '
  const p = require(process.argv[1]);
  const names = typeof p.bin === "string" ? [p.name.split("/").pop()] : Object.keys(p.bin ?? {});
  console.log(names.join(" "));
' "$(pwd)/package.json")
[[ -n "$bins" ]] || { echo 'Error: package.json declares no "bin".' >&2; exit 1; }

version_re='^[^ ]+ [0-9]+\.[0-9]+\.[0-9]+[^ ]* \([0-9a-f]{7}(-dirty)? [0-9]{4}-[0-9]{2}-[0-9]{2}\)$'
for bin in $bins; do
  "$consumer/node_modules/.bin/$bin" --help >/dev/null
  line=$("$consumer/node_modules/.bin/$bin" --version)
  if ! [[ "$line" =~ $version_re ]]; then
    echo "Error: '$bin --version' printed '$line'; expected '<name> X.Y.Z (sha7 YYYY-MM-DD)'." >&2
    echo 'Check that the build runs scripts/build-info.mjs and that package.json "files" ships dist/build-info.json.' >&2
    exit 1
  fi
done

if [[ -f scripts/test-package.local.sh ]]; then
  # shellcheck source=/dev/null
  source scripts/test-package.local.sh
fi

echo 'Package smoke test passed.'
