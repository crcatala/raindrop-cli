---
id: rd-8q6
status: closed
deps: []
links: []
created: 2026-01-02T13:53:16.952627443-08:00
type: task
priority: 1
---
# Clarify --verbose vs --debug flags

Clarify the distinction between verbose and debug output.

Per clig.dev:
- '--debug' typically shows stack traces and internal state
- '--verbose' shows more operational detail (what's happening)
- '-v' can mean either verbose or version (avoid confusion)

Current state: We have --verbose but usage is unclear.

Recommendation: Add --debug flag for stack traces on errors, keep --verbose for 'what am I doing' output.

Implementation:
- Add -d/--debug global flag
- On error: show stack trace only if --debug
- --verbose: show API calls being made, timing info
- Update error handling in utils/errors.ts


