---
id: rd-1kg
status: closed
deps: []
links: []
created: 2026-01-02T13:53:52.304139066-08:00
type: task
priority: 3
---
# Add shell completions

Per clig.dev (ease of discovery): Help users discover commands and options.

Generate shell completions for bash, zsh, fish.

Implementation:
- Add 'rdcli completion <shell>' command
- Commander has built-in completion support or use 'omelette'
- Output completion script to stdout
- Users install via: rdcli completion bash >> ~/.bashrc

Completions should include:
- Subcommands (auth, raindrops, collections, etc.)
- Flags for each command
- Optionally: collection IDs, tag names (requires API call)

Lower priority but significantly improves discoverability.


