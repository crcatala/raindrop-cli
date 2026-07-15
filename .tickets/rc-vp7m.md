---
id: rc-vp7m
status: closed
deps: []
links: []
created: 2026-07-15T16:53:17Z
type: bug
priority: 0
assignee: cc-vps
---
# Publish corrected npm artifact for CLI shebang fix

The npm 0.1.1 tarball contains two #!/usr/bin/env node lines in dist/cli.js and fails to start under Node. The source build is already fixed in f035697 (PR #16): Bun retains the entrypoint shebang, so the build no longer prepends a second one. Publish a new version from the corrected main branch and verify npm install -g raindrop-cli && rd --version plus npx raindrop-cli --help.

## Acceptance Criteria

A newly published npm version has exactly one shebang in dist/cli.js; npm install -g raindrop-cli && rd --version succeeds; npx raindrop-cli --help succeeds; npm info raindrop-cli shows the corrected version as latest.


## Notes

**2026-07-15T17:14:15Z**

Verified the published 0.2.0 tarball directly: dist/cli.js has exactly one shebang (mode 755); isolated global installation runs rd --version; npx raindrop-cli@0.2.0 --help passes; npm latest is 0.2.0. Hardened release flow so after:bump runs the package smoke test, direct pack/publish rebuilds via prepack, and the smoke test asserts one shebang.
