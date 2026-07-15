---
id: rc-81yq
status: closed
deps: []
links: []
created: 2026-07-15T16:18:37Z
type: chore
priority: 2
assignee: cc-vps
parent: rd-u22
---
# Tighten contribution and build hygiene

Apply the contribution policy and clean-build behavior established in ticktick-cli PR #69 to raindrop-cli.

## Acceptance Criteria

CONTRIBUTING.md states the personal-maintainer policy; README aligns; each build removes stale dist output before generating artifacts.


## Notes

**2026-07-15T16:19:16Z**

Implemented the personal-maintainer contribution policy and clean build step. Validated with bun run build, npm pack --dry-run (90 files), and bun run verify (580 passed).
