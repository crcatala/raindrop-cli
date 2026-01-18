---
id: rd-74g
status: closed
deps: []
links: []
created: 2026-01-03T21:24:01.402782868-08:00
type: bug
priority: 2
---
# Fix failing highlights plain format test

Test 'highlights command - with auth > list plain format works' is failing. The test expects dividers in plain format output but they're not present.

Location: src/commands/highlights.test.ts:212

Error:
expect(hasDividers || isEmpty).toBe(true)
Expected: true
Received: false


