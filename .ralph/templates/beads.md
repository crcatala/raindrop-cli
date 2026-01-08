### Beads Issue Tracker Integration

For tasks with an `id` starting with your project prefix (e.g., `rd-`):

**Reading task details:**
```bash
bd show <task-id>
```
This provides the authoritative acceptance criteria. If the task also has inline `acceptance` in the manifest, use both.

**After completing a task:**
```bash
bd close <task-id>
bd sync
```

**Files to include in commit:**
- `.beads/` directory changes from `bd close` and `bd sync`
