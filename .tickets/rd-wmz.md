---
id: rd-wmz
status: closed
deps: []
links: []
created: 2026-01-03T18:07:56.282321514-08:00
type: task
priority: 2
---
# Improve search flag help with examples and documentation link

Enhance the `--search` flag help text on `bookmarks list` to show examples of Raindrop's search query syntax and link to full documentation.

## Current State
The `--search` flag has minimal help: "Search query to filter bookmarks"

## Proposed Enhancement

Update help text to show 2-3 common examples inline:
```
--search <query>    Search query to filter bookmarks
                    Examples:
                      --search "type:article"      Filter by type
                      --search "#javascript"       Filter by tag
                      --search "domain:github.com" Filter by domain
                    Full syntax: https://help.raindrop.io/using-search
```

## Decision: In-repo docs vs external link

**Decision: Option 1 - Inline examples + external link**

- Show 2-3 examples directly in `--search` help text
- Link to https://help.raindrop.io/using-search for full syntax
- Can add in-repo docs later if needed for offline access

This keeps the CLI self-contained for common cases while pointing power users to comprehensive documentation.

## Related
- rd-2q3: Add usage examples to help text (general examples task)
- rd-y81: Add convenience filter flags (reduces need for raw search syntax)


