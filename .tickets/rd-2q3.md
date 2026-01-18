---
id: rd-2q3
status: closed
deps: []
links: []
created: 2026-01-02T13:53:41.042931633-08:00
type: task
priority: 2
---
# Add usage examples to help text

Per clig.dev: 'Lead with examples. Users tend to use examples over other forms of documentation.'

Add concrete examples to each command's help text.

Example for 'raindrops list':
```
Examples:
  rdcli raindrops list                    # List all raindrops
  rdcli raindrops list 12345              # List raindrops in collection
  rdcli raindrops list -1                 # List unsorted raindrops
  rdcli raindrops list --limit 50         # Limit results
  rdcli raindrops list | jq '.[].title'   # Pipe to jq
```

Implementation:
- Add .addHelpText('after', examples) to each command
- Show common use cases first
- Include piping examples for AI agent users
- Consider a separate 'examples' command for extensive examples


