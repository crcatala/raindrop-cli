---
id: rd-vst
status: closed
deps: []
links: []
created: 2026-01-02T13:52:52.813004338-08:00
type: task
priority: 0
---
# Add TTY detection for smart output defaults

Detect TTY to provide better defaults for human vs script usage.

Per clig.dev:
- 'Human-readable output is paramount'
- 'The most simple heuristic for whether output is being read by a human is whether or not it's a TTY'

Implementation:
- Use process.stdout.isTTY / process.stderr.isTTY
- Default --format to 'table' when TTY, 'json' when piped
- Disable animations/progress when not TTY
- Create utility: isTTY(): boolean

This improves UX significantly:
- `rdcli raindrops list` → nice table for humans
- `rdcli raindrops list | jq` → JSON automatically


