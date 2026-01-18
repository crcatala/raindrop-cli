---
id: rd-vza
status: closed
deps: []
links: []
created: 2026-01-02T13:53:52.282744647-08:00
type: task
priority: 3
---
# Add typo suggestions for commands

Per clig.dev: 'If the user did something wrong and you can guess what they meant, suggest it.'

Example:
```
$ rdcli raindrop list
Unknown command: raindrop
Did you mean: raindrops?
```

Implementation:
- Use Levenshtein distance or similar for fuzzy matching
- Commander may have built-in support for this
- Suggest closest match if distance < threshold
- Don't auto-execute - just suggest

Lower priority - nice to have for polish.


