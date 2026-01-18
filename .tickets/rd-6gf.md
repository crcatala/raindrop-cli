---
id: rd-6gf
status: closed
deps: []
links: []
created: 2026-01-03T18:08:17.224120452-08:00
type: feature
priority: 2
---
# Add tags subcommand

Add a `tags` subcommand for managing Raindrop.io tags.

## Proposed Commands

```bash
rdcli tags list                     # List all tags with counts
rdcli tags list --collection <id>   # Tags in specific collection
rdcli tags rename <old> <new>       # Rename tag (merges if target exists)
rdcli tags delete <tag>             # Remove tag from all bookmarks in collection
```

## API Support (via raindrop-client)

The client exposes these methods:
- `tag.getTagsInCollection(collectionId)` - Get tags with counts
- `tag.renameOrMergeTags(collectionId, request)` - Rename/merge tags
- `tag.removeTagsFromCollection(collectionId, request)` - Delete tags

## Output Format

### List command
```
javascript (45)
typescript (32)
react (28)
python (15)
machine-learning (8)
```

Or in table format with more details.

## Use Cases

- Discover available tags for filtering (`--tag` flag)
- Clean up tag taxonomy (rename/merge duplicates)
- Bulk remove unused tags

## Priority Rationale

P2 because while useful, tag management is less critical than core bookmark/collection operations.


