---
id: rc-wc4v
status: in_progress
deps: []
links: []
created: 2026-07-16T18:42:08Z
type: feature
priority: 2
assignee: cc-vps
---
# Add keyring-backed Raindrop token storage

Store tokens in the system keyring by default while preserving RAINDROP_TOKEN behavior and an explicit plaintext config fallback.


## Notes

**2026-07-16T18:53:25Z**

Implemented keytar-backed default token storage with --use-config fallback, preserved RAINDROP_TOKEN precedence, added adapter/client coverage, and documented Linux keyring constraints. Focused tests, typecheck, build, lint, and formatting pass; the full unit suite has an unrelated flaky nock-enforcement timeout.
