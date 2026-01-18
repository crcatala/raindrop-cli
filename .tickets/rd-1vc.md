---
id: rd-1vc
status: closed
deps: []
links: []
created: 2026-01-02T13:53:41.131527993-08:00
type: task
priority: 2
---
# Add --no-input flag for non-interactive mode

Per clig.dev: 'If --no-input is passed, don't prompt or do anything interactive. This allows users an explicit way to disable all prompts.'

Implementation:
- Add global --no-input flag
- Support RDCLI_NO_INPUT env var (for CI/scripts)
- When set: never prompt, fail if input required
- Error message should explain which flag to pass instead

Example:
```
$ rdcli raindrops delete 123 --no-input
Error: Confirmation required. Use --force to skip confirmation in non-interactive mode.
```


