---
id: rd-1hp
status: closed
deps: [rd-1vc]
links: []
created: 2026-01-02T13:53:17.01158922-08:00
type: task
priority: 1
---
# Add --force flag for destructive operations

Per clig.dev: 'Confirm before doing anything dangerous... requiring them to pass -f or --force'

For delete and batch operations, require confirmation or --force flag.

Implementation:
- Add -f/--force flag to: delete, batch-delete, batch-update
- Without --force: prompt 'Are you sure? (y/N)'
- With --force: skip confirmation
- If stdin is not TTY and no --force: error with helpful message
- For severe operations (batch-delete), consider requiring --force=<count>

Applies to:
- rd-nfd (Delete Raindrop Command) - already mentions --force
- rd-ntf (Batch Operations Commands) - already mentions --force


