---
id: rd-u3p
status: closed
deps: []
links: []
created: 2026-01-02T13:52:52.782896378-08:00
type: task
priority: 0
---
# Ensure stdout/stderr separation

Architectural: Ensure data output goes to stdout and errors/warnings go to stderr.

Per clig.dev:
- 'Send output to stdout' - primary output and machine-readable data
- 'Send messaging to stderr' - log messages, errors, warnings

This enables proper piping (e.g., `rdcli raindrops list | jq` won't break from error messages).

Implementation:
- Audit all console.log() calls - data should use stdout
- Audit all console.error() calls - errors/warnings should use stderr  
- Update output() function to explicitly write to process.stdout
- Ensure error handling writes to process.stderr

Should be done BEFORE adding more commands to avoid tech debt.


