---
id: rd-y81
status: closed
deps: []
links: []
created: 2026-01-03T18:07:41.011342314-08:00
type: feature
priority: 1
---
# Add convenience filter flags to bookmark list command

Enhance the existing `bookmarks list` command with convenience flags that map to Raindrop's search query syntax. This provides a better CLI UX than requiring users to know raw search syntax.

## Proposed Flags

### Type Filters
```bash
rdcli bookmarks list --type article    # type:article
rdcli bookmarks list --type video      # type:video
rdcli bookmarks list --type link       # type:link
rdcli bookmarks list --type image      # type:image
rdcli bookmarks list --type document   # type:document
rdcli bookmarks list --type audio      # type:audio
```

### Metadata Filters
```bash
rdcli bookmarks list --with-notes      # Bookmarks with notes
rdcli bookmarks list --with-highlights # Bookmarks with highlights
rdcli bookmarks list --without-tags    # notag:true
rdcli bookmarks list --favorites       # ❤️ (important flag)
rdcli bookmarks list --has-reminder    # reminder:true
```

### Tag Filter
```bash
rdcli bookmarks list --tag javascript
rdcli bookmarks list --tag "machine learning"
```

### Date Filters
```bash
rdcli bookmarks list --created 2025-01      # created:2025-01
rdcli bookmarks list --created 2025-01-15   # created:2025-01-15
```

### Domain Filter
```bash
rdcli bookmarks list --domain github.com
```

## Implementation Notes

- These flags build a search query string internally
- Combine with existing `--search` for power users
- Multiple flags should AND together (e.g., `--type article --tag javascript`)
- The `--search` flag remains for raw query syntax

## Relation to rd-0pc

This differs from rd-0pc (Search Raindrops Command) which proposes a separate `search` subcommand. This approach enhances the existing `list` command, which already has `--search`. Consider whether both approaches are needed or if this replaces rd-0pc.


