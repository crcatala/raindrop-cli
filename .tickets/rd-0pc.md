---
id: rd-0pc
status: closed
deps: [rd-abh]
links: []
created: 2025-12-22T13:56:22.751588951-08:00
type: feature
priority: 0
---
# 2.6 Search Raindrops Command

rdcli raindrops search <query> with --collection, --type, --tag, --created-after/before, --important, --broken, --limit, --format

---

## SUPERSEDED BY rd-y81

This issue proposed a separate `search` subcommand, but after analysis we decided to enhance the existing `bookmarks list` command with convenience filter flags instead (rd-y81).

**Rationale:**
1. `bookmarks list` already has `--search` flag - a separate command creates confusion
2. Mirrors Raindrop web UI where filtering is applied to the list view, not a separate mode
3. Single command to learn - all filtering options discoverable via `--help`
4. Follows CLI conventions (kubectl, docker, gh all use filters on list commands)
5. Composable: `--type article --tag javascript --search "query"` all work together

See rd-y81 for the implementation approach.


