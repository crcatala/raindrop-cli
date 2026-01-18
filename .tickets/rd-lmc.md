---
id: rd-lmc
status: closed
deps: [rd-8q6]
links: []
created: 2026-01-02T13:53:17.042166887-08:00
type: task
priority: 1
---
# Improve error messages with actionable hints

Per clig.dev: 'Catch errors and rewrite them for humans. Think of it like a conversation where the program is guiding them in the right direction.'

Make error messages helpful and actionable.

Examples:
- 'Can't connect to Raindrop API. Check your internet connection or try again later.'
- 'Invalid collection ID: "abc". Collection IDs must be numbers. Use "rdcli collections list" to see available collections.'
- 'Rate limited by Raindrop API. Wait 60 seconds before retrying.'

Implementation:
- Create error handler that catches known error types
- Map API errors to friendly messages
- Include 'what to do next' in error messages
- Put most important info at end (per clig.dev)
- Consider exit codes: 1=error, 2=usage error


