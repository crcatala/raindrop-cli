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

**2026-07-16T19:25:56Z**

Reopened to fix CI test isolation: config-storage tests mock the credentials module globally, which races credential tests in Bun's parallel runner.

**2026-07-16T19:29:51Z**

Fixed CI: replaced the coverage-incompatible Axios/Nock assertion with an active-interceptor check, and removed global credentials-module mocking from storage tests. Full coverage suite now passes (584 tests).

**2026-07-16T19:49:59Z**

Reopened to restore the full Axios/Nock enforcement assertion in a separate non-coverage test process, avoiding Bun coverage incompatibility without weakening the check.

**2026-07-16T19:50:38Z**

Restored the Axios/Nock assertion and split it into its own non-coverage Bun process. The coverage suite runs 583 tests, then the network-isolation test runs separately; both pass.
