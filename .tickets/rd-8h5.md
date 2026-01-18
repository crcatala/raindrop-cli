---
id: rd-8h5
status: closed
deps: []
links: []
created: 2026-01-05T12:52:40.658108073-08:00
type: feature
priority: 2
---
# Add trash empty command to permanently delete all items in trash

## Summary
Add a `trash empty` command that permanently deletes all bookmarks in the trash collection.

## Background
The Raindrop API client (`@lasuillard/raindrop-client`) exposes an `emptyTrash()` method on the Collection API. We need to expose this in the CLI.

This is needed for test cleanup - our live integration tests create test bookmarks that get moved to trash, and we need a way to clear them out.

## Implementation Details

### API Method
The client already has this available:
```typescript
// From @lasuillard/raindrop-client
client.collection.emptyTrash()
```

### CLI Command Structure
```
rdcli trash empty [options]

Options:
  --force, -f    Skip confirmation prompt
  --dry-run, -n  Show what would be deleted without actually deleting
```

### Suggested Implementation Location
Create a new command file: `src/commands/trash.ts`

Or alternatively add to `src/commands/collections.ts` since trash is technically a special collection (-99).

### Output Formats
Follow existing patterns:
- JSON: `{ "result": true, "message": "Trash emptied" }`
- Plain: `Trash emptied successfully.`
- Quiet: (no output, just exit 0)

## Acceptance Criteria
- [ ] `rdcli trash empty --force` empties the trash
- [ ] Without --force, prompts for confirmation
- [ ] --dry-run shows intent without executing
- [ ] Works with all output formats (json, plain, table, tsv, quiet)
- [ ] Help text is clear: `rdcli trash --help` and `rdcli trash empty --help`
- [ ] Unit tests for validation/help (no auth required)
- [ ] Fails gracefully without auth token


