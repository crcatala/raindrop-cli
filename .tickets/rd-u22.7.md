---
id: rd-u22.7
status: closed
deps: [rd-u22.2]
links: []
created: 2026-01-07T08:00:40.298068547-08:00
type: task
priority: 1
parent: rd-u22
---
# Update README for accuracy and completeness

Update README to match actual CLI behavior and add missing sections.

**Issues to fix (verified in codebase):**
- Uses `rd raindrops ...` but CLI uses `rd bookmarks ...`
- Missing documentation for root shortcuts
- Missing installation section
- Missing environment variables documentation

**Note:** Use final repo name (`raindrop-cli`) in URLs and badges. The repo does not exist yet but will be created before publishing.

## Required Changes

### 1. Fix command examples
**Current (wrong):**
```bash
rd raindrops list
rd raindrops add https://example.com
rd raindrops search "typescript"
```

**Correct:**
```bash
rd bookmarks list
rd bookmarks add https://example.com
rd bookmarks search "typescript"
```

### 2. Document root shortcuts
```bash
rd list                 # Shortcut for: rd bookmarks list
rd search "query"       # Shortcut for: rd bookmarks search
rd add <url>            # Shortcut for: rd bookmarks add
rd show <id>            # Shortcut for: rd bookmarks show
```

### 3. Add installation section
```markdown
## Installation

```bash
npm install -g raindrop-cli
```

Or use without installing:
```bash
npx raindrop-cli --help
```
```

### 4. Add badges (use final repo name)
```markdown
[![npm version](https://img.shields.io/npm/v/raindrop-cli)](https://npmjs.com/package/raindrop-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
```

### 5. Document environment variables
| Variable | Description | Required |
|----------|-------------|----------|
| `RAINDROP_TOKEN` | API token from Raindrop.io | Yes |
| `RDCLI_TIMEOUT` | Request timeout in seconds | No |
| `RDCLI_API_DELAY_MS` | Delay between API calls | No |

### 6. Add Requirements section
- Node.js 20+

### 7. Keep the `rd` vs `rdcli` alias note
The existing note about Windows/oh-my-zsh conflicts with `rd` is helpful - preserve it.

**Acceptance Criteria:**
- [ ] All `raindrops` references changed to `bookmarks`
- [ ] Root shortcuts documented
- [ ] Installation section with npm/npx instructions
- [ ] Badges use `raindrop-cli` (final name)
- [ ] Environment variables documented
- [ ] Requirements section present
- [ ] `rd`/`rdcli` alias note preserved

**Reference:** plans/RELEASE-READINESS-v0.1.0.md §8


