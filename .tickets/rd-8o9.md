---
id: rd-8o9
status: closed
deps: [rd-vst, rd-u3p, rd-ua6]
links: []
created: 2026-01-02T13:53:16.98154704-08:00
type: task
priority: 3
---
# Add progress indicators for API calls

Per clig.dev:
- 'Responsive is more important than fast - print something in <100ms'
- 'Show progress if something takes a long time'
- 'If your program displays no output for a while, it will look broken'

Raindrop API calls can be slow. Show the user something is happening.

Implementation:
- Add spinner for operations >100ms
- Use a library like 'ora' or 'cli-spinners'
- Disable spinner when not TTY (per guidelines)
- Show what's happening: 'Fetching raindrops...'
- For batch operations, consider progress bar

Note: Keep output clean - spinner should write to stderr so stdout remains pipeable.


