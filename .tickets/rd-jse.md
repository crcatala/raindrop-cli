---
id: rd-jse
status: closed
deps: []
links: []
created: 2026-01-02T13:53:41.000427101-08:00
type: task
priority: 2
---
# Add --timeout flag for network operations

Per clig.dev: 'Make things time out. Allow network timeouts to be configured, and have a reasonable default so it doesn't hang forever.'

Implementation:
- Add global --timeout <seconds> flag
- Default to reasonable value (30s?)
- Support RDCLI_TIMEOUT env var
- Apply to all API calls via client wrapper
- Show helpful error when timeout occurs


