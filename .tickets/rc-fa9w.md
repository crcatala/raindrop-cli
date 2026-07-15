---
id: rc-fa9w
status: closed
deps: []
links: []
created: 2026-07-15T17:58:54Z
type: bug
priority: 2
assignee: cc-vps
---
# Add auth whoami alias

Add rd auth whoami as an alias for rd auth status. Ensure Commander delegation uses only the selected subcommand arguments to avoid the too-many-arguments regression fixed in ticktick-cli PR #73.


## Notes

**2026-07-15T18:00:10Z**

Verified ticktick-cli PR #73's Commander parseAsync issue. Added rd auth whoami as a status alias, passing only status arguments with from: user. Added plain and JSON integration regressions. Verified bun run test (582 pass), typecheck, lint, and format.
