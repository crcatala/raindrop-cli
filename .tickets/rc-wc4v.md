---
id: rc-wc4v
status: closed
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

**2026-07-16T19:19:29Z**

Reopened to address review findings: safe keyring-to-config fallback, synchronous client guidance, and storage lifecycle coverage.

**2026-07-16T19:21:28Z**

Addressed review findings: config fallback is persisted before best-effort keyring cleanup (with warning), synchronous callers get an actionable getClientAsync error, and storage lifecycle coverage was added.
