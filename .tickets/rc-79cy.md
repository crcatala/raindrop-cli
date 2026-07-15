---
id: rc-79cy
status: closed
deps: []
links: []
created: 2026-07-15T16:54:19Z
type: chore
priority: 2
assignee: cc-vps
---
# Harden dependency vulnerability remediation

Update vulnerable transitive resolutions, expose Renovate OSV alerts, and add dependency audit to CI.


## Notes

**2026-07-15T16:54:26Z**

Investigating safe Bun overrides, Renovate OSV dashboard visibility, and CI audit policy.

**2026-07-15T16:55:52Z**

Added Bun overrides for all remediable audited transitive dependencies. Audit is now clear at the critical threshold; the remaining lodash findings are upstream-only through release-it. Added Renovate OSV dashboard summary and non-blocking CI audit job. Verified with bun install --frozen-lockfile, bun audit --audit-level critical, and bun run verify (580 tests).
