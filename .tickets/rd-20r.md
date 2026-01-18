---
id: rd-20r
status: closed
deps: [rd-671]
links: []
created: 2026-01-03T19:30:55.402751594-08:00
type: feature
priority: 3
---
# Add --parent option to collections create command

Add a `--parent <id>` option to the `collections create` command to allow creating nested collections.

## Current Behavior
```bash
rdcli collections create "My Collection"  # Always creates at root level
```

## Proposed Behavior
```bash
rdcli collections create "My Collection"                    # Root level (default)
rdcli collections create "Sub Collection" --parent 12345    # Nested under parent
```

## Implementation Notes
- The Raindrop API already supports this via `parent` field in `CreateCollectionRequest`
- Should validate that parent ID exists before attempting creation

## Related
- Follow-up from rd-671 (collections subcommand)
- Suggested in code review


