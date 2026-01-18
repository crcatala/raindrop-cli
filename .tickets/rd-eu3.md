---
id: rd-eu3
status: closed
deps: [rd-vst]
links: []
created: 2026-01-02T13:52:52.839302936-08:00
type: task
priority: 0
---
# Add NO_COLOR and --no-color support

Add color disable support before adding any colored output.

Per clig.dev, disable colors when:
- stdout/stderr is not a TTY
- NO_COLOR env var is set (any non-empty value)
- TERM=dumb
- --no-color flag is passed
- Optionally: RDCLI_NO_COLOR env var for app-specific control

Implementation:
- Add --no-color global flag
- Check NO_COLOR and TERM env vars
- Create utility: shouldUseColor(): boolean
- Wire into output system before any colors are added

Reference: https://no-color.org/


