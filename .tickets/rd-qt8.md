---
id: rd-qt8
status: closed
deps: []
links: []
created: 2026-01-02T13:53:41.089153676-08:00
type: task
priority: 2
---
# Add --dry-run flag for destructive operations

Per clig.dev: 'Consider giving the user a way to dry run the operation so they can see what'll happen before they commit to it.'

Show what WOULD happen without actually doing it.

Implementation:
- Add -n/--dry-run flag to: delete, update, batch-delete, batch-update
- Output what would be changed/deleted
- Exit with success (0) after showing preview
- Make output clear it's a dry run: 'Would delete 5 raindrops:'

Example:
```
$ rdcli raindrops batch-delete --ids 1,2,3 --dry-run
Would delete 3 raindrops:
  - 1: 'Article about TypeScript'
  - 2: 'React hooks tutorial'  
  - 3: 'CLI design patterns'
Run without --dry-run to execute.
```


