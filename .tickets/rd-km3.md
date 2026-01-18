---
id: rd-km3
status: closed
deps: []
links: []
created: 2026-01-03T18:08:27.878920485-08:00
type: feature
priority: 2
---
# Add highlights subcommand

Add a `highlights` subcommand for viewing Raindrop.io highlights.

## Proposed Commands

```bash
rdcli highlights list                     # List all highlights
rdcli highlights list --collection <id>   # Highlights in specific collection
rdcli highlights list --limit 50          # Limit results
```

## API Support (via raindrop-client)

The client exposes these methods:
- `highlight.getAllHighlights(page, perpage)` - Get all highlights across collections
- `highlight.getHighlightsInCollection(collectionId, page, perpage)` - Get highlights in a collection

## Highlight Data Structure

Each highlight includes:
- `_id` - Highlight ID
- `text` - Highlighted text
- `note` - Optional note attached to highlight
- `color` - Highlight color
- `created` - Creation date
- `raindropRef` - ID of parent bookmark
- `link` - URL of parent bookmark
- `title` - Title of parent bookmark
- `tags` - Tags from parent bookmark

## Output Considerations

Show highlight text with context:
```
[bookmark-title]
"highlighted text here..."
Note: optional note
---
```

## Use Cases

- Review reading highlights/annotations
- Export highlights for note-taking systems
- Find bookmarks with specific annotations

## Priority Rationale

P2 because highlights are a secondary feature (require Pro for some features) but valuable for research/reading workflows.


