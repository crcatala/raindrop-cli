---
id: rd-n2q
status: closed
deps: []
links: []
created: 2026-01-03T18:08:39.792936463-08:00
type: feature
priority: 3
---
# Add filters discovery subcommand

Add a `filters` subcommand to discover available filters for a collection.

## Proposed Commands

```bash
rdcli filters show                  # Show filters for all bookmarks
rdcli filters show <collection-id>  # Show filters for specific collection
```

## API Support (via raindrop-client)

The client exposes:
- `filter.getFilters(collectionId, tagsSort?, search?)` - Returns available filters

## Filter Response Structure

The API returns:
- `types` - Array of {_id: type, count: N} (e.g., article, video, link)
- `tags` - Array of {_id: tag, count: N}
- `created` - Array of {_id: date, count: N} (grouped by date)

## Output Format

```
Types:
  article (45)
  link (123)
  video (12)

Tags:
  javascript (45)
  typescript (32)
  react (28)

Created:
  2025-01 (34)
  2024-12 (56)
  2024-11 (23)
```

## Use Cases

- Discover what types of content exist in a collection
- See tag distribution
- Understand temporal distribution of bookmarks
- Power user feature for building complex queries

## Priority Rationale

P3 because this is a power user/discovery feature. Most users will use convenience flags or the web UI for filtering.


