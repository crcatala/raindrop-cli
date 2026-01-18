---
id: rd-9ja
status: closed
deps: []
links: []
created: 2026-01-05T12:11:22.554862131-08:00
type: bug
priority: 2
---
# Flaky test: list supports --broken filter

The test 'bookmarks command - with auth > list supports --broken filter' is failing intermittently on main branch.

Error:
```
expect(result.exitCode).toBe(0)
Expected: 0
Received: 1
```

Location: src/commands/bookmarks.test.ts:465

This appears to be a flaky integration test that depends on external API state. Needs investigation to determine if:
1. The --broken filter API behavior changed
2. Test account doesn't have broken links to test against
3. Rate limiting or other transient issue


