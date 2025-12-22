# Raindrop CLI Implementation Plan

> A TypeScript CLI for Raindrop.io built on `@lasuillard/raindrop-client` and `commander`, designed for AI agent integration and personal productivity workflows.

## Project Overview

### Goals
- Provide comprehensive CLI access to Raindrop.io API
- Optimize for AI agent consumption (structured JSON output)
- Support human-friendly output formats (tables, TSV)
- Fill gaps missing from existing tools (collections, highlights, search)
- Enable automation and scripting for personal productivity

### Non-Goals (v1)
- GUI or TUI interface
- Real-time sync/watch functionality
- Local caching or offline mode
- OAuth flow for multi-user (test token only for personal use)

### Tech Stack
- **Runtime**: Node.js 20+ (or Bun for faster startup)
- **Language**: TypeScript 5.x
- **CLI Framework**: Commander.js
- **API Client**: `@lasuillard/raindrop-client`
- **Output Formatting**: `cli-table3` (tables), built-in JSON
- **Build**: `tsup` or `bun build`
- **Testing**: Vitest

---

## Phase 0: Project Setup
**Estimated Effort**: Small
**Priority**: P0 (Blocker)

### 0.1 Repository Initialization
- [ ] Create new repository (e.g., `raindrop-cli` or `rdcli`)
- [ ] Initialize with `npm init` or `bun init`
- [ ] Set up TypeScript configuration
- [ ] Configure ESLint + Prettier
- [ ] Add `.gitignore` for Node.js projects
- [ ] Create initial README with project description

### 0.2 Dependencies
```json
{
  "dependencies": {
    "@lasuillard/raindrop-client": "^0.7.x",
    "commander": "^12.x",
    "cli-table3": "^0.6.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "tsup": "^8.x",
    "vitest": "^2.x",
    "@types/node": "^20.x"
  }
}
```

### 0.3 Project Structure
```
raindrop-cli/
├── src/
│   ├── index.ts              # Entry point, CLI setup
│   ├── client.ts             # Raindrop client singleton
│   ├── config.ts             # Config loading (env, file)
│   ├── commands/
│   │   ├── index.ts          # Command registration
│   │   ├── raindrops/
│   │   │   ├── list.ts
│   │   │   ├── add.ts
│   │   │   ├── get.ts
│   │   │   ├── update.ts
│   │   │   ├── delete.ts
│   │   │   └── search.ts
│   │   ├── collections/
│   │   │   ├── list.ts
│   │   │   ├── tree.ts
│   │   │   ├── create.ts
│   │   │   ├── update.ts
│   │   │   └── delete.ts
│   │   ├── tags/
│   │   │   ├── list.ts
│   │   │   ├── rename.ts
│   │   │   └── merge.ts
│   │   ├── highlights/
│   │   │   ├── list.ts
│   │   │   └── get.ts
│   │   ├── user/
│   │   │   └── whoami.ts
│   │   └── backup/
│   │       ├── list.ts
│   │       ├── create.ts
│   │       └── download.ts
│   ├── output/
│   │   ├── index.ts          # Output dispatcher
│   │   ├── json.ts           # JSON formatter
│   │   ├── table.ts          # Human-readable tables
│   │   └── tsv.ts            # Tab-separated for pipes
│   ├── utils/
│   │   ├── errors.ts         # Error handling
│   │   └── pagination.ts     # Pagination helpers
│   └── types/
│       └── index.ts          # Shared types
├── tests/
│   ├── commands/
│   └── output/
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

### 0.4 Build Configuration
- [ ] Configure `tsup` for CJS + ESM output
- [ ] Add `bin` field to package.json for CLI executable
- [ ] Set up npm scripts: `build`, `dev`, `test`, `lint`
- [ ] Configure shebang for executable (`#!/usr/bin/env node`)

### 0.5 Deliverables
- [ ] Working `npm run build` producing executable
- [ ] `npx . --help` shows help text
- [ ] Basic `--version` command works

---

## Phase 1: Core Infrastructure
**Estimated Effort**: Medium
**Priority**: P0 (Blocker)

### 1.1 Configuration Management
- [ ] Load token from `RAINDROP_TOKEN` environment variable
- [ ] Support config file (`~/.config/raindrop-cli/config.json` or `~/.raindroprc`)
- [ ] Config precedence: CLI flags > env vars > config file
- [ ] Validate token presence before API calls
- [ ] Helpful error message when token missing

**Config file format:**
```json
{
  "token": "xxx-xxx-xxx",
  "defaultFormat": "json",
  "defaultCollection": 0
}
```

### 1.2 Client Wrapper
- [ ] Create singleton wrapper around `@lasuillard/raindrop-client`
- [ ] Lazy initialization (only connect when needed)
- [ ] Centralized error handling for API errors
- [ ] Rate limit awareness (expose headers in errors)

```typescript
// src/client.ts
import Raindrop, { Configuration } from '@lasuillard/raindrop-client';
import { getConfig } from './config';

let instance: Raindrop | null = null;

export function getClient(): Raindrop {
  if (!instance) {
    const config = getConfig();
    if (!config.token) {
      throw new Error('RAINDROP_TOKEN not set. Get your token from https://app.raindrop.io/settings/integrations');
    }
    instance = new Raindrop(new Configuration({ accessToken: config.token }));
  }
  return instance;
}
```

### 1.3 Output System
- [ ] Global `--format` flag (`json`, `table`, `tsv`)
- [ ] Default to `json` (AI-friendly)
- [ ] Detect TTY and adjust defaults (table for TTY, json for pipes)
- [ ] `--quiet` flag for minimal output (just IDs)
- [ ] `--verbose` flag for debug info

**Output interface:**
```typescript
interface OutputOptions {
  format: 'json' | 'table' | 'tsv';
  quiet: boolean;
  verbose: boolean;
}

function output<T>(data: T, opts: OutputOptions): void;
```

### 1.4 Error Handling
- [ ] Catch API errors and format nicely
- [ ] Show rate limit info when hitting limits
- [ ] Exit codes: 0 (success), 1 (error), 2 (usage error)
- [ ] `--debug` flag for stack traces

### 1.5 Deliverables
- [ ] `rdcli --help` shows all global options
- [ ] Token loading from env/file works
- [ ] Error messages are clear and actionable

---

## Phase 2: Raindrop Commands (Core CRUD)
**Estimated Effort**: Medium
**Priority**: P0 (Required for MVP)

### 2.1 List Raindrops
```bash
rdcli raindrops list [collection-id]
  --limit <n>          # Max items (default: 50, 0 for all)
  --sort <field>       # created, -created, title, -title, domain, etc.
  --search <query>     # Search query
  --format <fmt>       # json, table, tsv
```

- [ ] Implement basic listing with pagination
- [ ] Support `--limit 0` to fetch all (uses `getAllRaindrops` helper)
- [ ] Collection ID defaults to 0 (all raindrops)
- [ ] Support special collections: `-1` (unsorted), `-99` (trash)

### 2.2 Get Single Raindrop
```bash
rdcli raindrops get <id>
  --format <fmt>
```

- [ ] Fetch single raindrop by ID
- [ ] Include highlights in output
- [ ] Show full metadata

### 2.3 Add Raindrop
```bash
rdcli raindrops add <url>
  --title <title>
  --excerpt <desc>
  --note <note>
  --tags <t1,t2,t3>
  --collection <id>
  --parse                # Auto-parse URL for metadata
```

- [ ] Create new raindrop with URL (required)
- [ ] Support all optional fields
- [ ] `--parse` flag to use Raindrop's URL parsing
- [ ] Output created raindrop ID (or full object with `--format json`)

### 2.4 Update Raindrop
```bash
rdcli raindrops update <id>
  --title <title>
  --excerpt <desc>
  --note <note>
  --tags <t1,t2,t3>      # Replace tags
  --add-tags <t1,t2>     # Add to existing
  --remove-tags <t1,t2>  # Remove specific
  --collection <id>
  --important            # Mark as favorite
  --no-important         # Unmark
```

- [ ] Update single raindrop
- [ ] Support partial updates (only specified fields)
- [ ] Tag manipulation helpers

### 2.5 Delete Raindrop
```bash
rdcli raindrops delete <id>
  --permanent           # Skip trash, delete forever
  --force               # No confirmation
```

- [ ] Move to trash by default
- [ ] `--permanent` for hard delete
- [ ] Confirmation prompt unless `--force`

### 2.6 Search Raindrops
```bash
rdcli raindrops search <query>
  --collection <id>     # Limit to collection
  --type <type>         # link, article, image, video, document, audio
  --tag <tag>           # Filter by tag (repeatable)
  --created-after <date>
  --created-before <date>
  --important           # Only favorites
  --broken              # Only broken links
  --limit <n>
  --format <fmt>
```

- [ ] Full search query support (uses Raindrop search syntax)
- [ ] Type filtering
- [ ] Date range filtering
- [ ] Combine multiple filters

**Search syntax reference:** https://help.raindrop.io/using-search/

### 2.7 Batch Operations
```bash
rdcli raindrops batch-update
  --ids <id1,id2,id3>
  --collection <id>
  --add-tags <t1,t2>
  --remove-tags <t1,t2>

rdcli raindrops batch-delete
  --ids <id1,id2,id3>
  --force
```

- [ ] Batch update multiple raindrops
- [ ] Batch delete
- [ ] Accept IDs from stdin for piping

### 2.8 Deliverables
- [ ] All raindrop CRUD operations work
- [ ] Search with filters works
- [ ] Batch operations work
- [ ] Output formats work correctly

---

## Phase 3: Collection Commands
**Estimated Effort**: Medium
**Priority**: P1 (High - key differentiator from Go CLI)

### 3.1 List Collections
```bash
rdcli collections list
  --format <fmt>
```

- [ ] List root collections
- [ ] Include child collections
- [ ] Show item counts

### 3.2 Collection Tree
```bash
rdcli collections tree
  --format <fmt>        # json or ascii
```

- [ ] Use client's `getCollectionTree()` helper
- [ ] ASCII tree for human view
- [ ] Nested JSON for programmatic use

**ASCII output example:**
```
My Collections
├── Tech (42)
│   ├── TypeScript (15)
│   └── Go (8)
├── Reading List (123)
└── Research (67)
```

### 3.3 Get Collection
```bash
rdcli collections get <id>
  --format <fmt>
```

- [ ] Show collection details
- [ ] Include collaborator info if shared

### 3.4 Create Collection
```bash
rdcli collections create <title>
  --parent <id>         # Nest under parent
  --view <view>         # list, simple, grid, masonry
  --public              # Make public
  --description <desc>
```

- [ ] Create new collection
- [ ] Support nesting
- [ ] Return created collection ID

### 3.5 Update Collection
```bash
rdcli collections update <id>
  --title <title>
  --description <desc>
  --view <view>
  --public / --private
  --parent <id>         # Move to different parent
```

- [ ] Update collection properties
- [ ] Support moving between parents

### 3.6 Delete Collection
```bash
rdcli collections delete <id>
  --force               # No confirmation
```

- [ ] Delete collection
- [ ] Warn about contained raindrops
- [ ] Confirmation unless `--force`

### 3.7 Merge Collections
```bash
rdcli collections merge --from <id1,id2> --to <target-id>
```

- [ ] Merge multiple collections into one

### 3.8 Deliverables
- [ ] Full collection CRUD works
- [ ] Tree view works
- [ ] Nesting and moving works

---

## Phase 4: Tags & Highlights
**Estimated Effort**: Small-Medium
**Priority**: P1 (High)

### 4.1 Tag Commands
```bash
rdcli tags list
  --collection <id>     # Filter by collection
  --format <fmt>

rdcli tags rename <old> <new>
  --collection <id>

rdcli tags merge <tag1,tag2,tag3> --into <target>
  --collection <id>

rdcli tags delete <tag>
  --collection <id>
  --force
```

- [ ] List all tags with counts
- [ ] Rename tags
- [ ] Merge multiple tags into one
- [ ] Delete tags

### 4.2 Highlight Commands
```bash
rdcli highlights list
  --collection <id>
  --raindrop <id>
  --format <fmt>

rdcli highlights get <raindrop-id>
  --format <fmt>
```

- [ ] List highlights across collections
- [ ] List highlights for specific raindrop
- [ ] Include source info (raindrop title, URL)

### 4.3 Deliverables
- [ ] Tag management works
- [ ] Highlight listing works

---

## Phase 5: User & Backup Commands
**Estimated Effort**: Small
**Priority**: P2 (Medium)

### 5.1 User Commands
```bash
rdcli user whoami
  --format <fmt>

rdcli user stats
  --format <fmt>
```

- [ ] Show current user info
- [ ] Show account stats (pro status, storage, etc.)

### 5.2 Backup Commands (Custom Implementation)

> Note: `@lasuillard/raindrop-client` doesn't include backup endpoints.
> These need custom HTTP implementation.

```bash
rdcli backup list
  --format <fmt>

rdcli backup create

rdcli backup download <id> <output-path>
  --format csv|html
```

- [ ] Add custom API calls for `/rest/v1/backups`
- [ ] Add custom API calls for `/rest/v1/backup`
- [ ] Handle Brotli decompression for downloads
- [ ] Show progress bar for downloads

### 5.3 Export Commands (Custom Implementation)

> Also not in raindrop-client, needs custom implementation.

```bash
rdcli export <collection-id> <output-path>
  --format csv|html|zip
```

- [ ] Custom implementation for `/rest/v1/raindrops/{id}/export.{format}`

### 5.4 Deliverables
- [ ] User info works
- [ ] Backup operations work
- [ ] Export works

---

## Phase 6: AI Agent Optimization
**Estimated Effort**: Medium
**Priority**: P1 (High - core use case)

### 6.1 Structured Output Improvements
- [ ] Consistent JSON schema across all commands
- [ ] Include metadata in JSON output (pagination info, rate limits)
- [ ] `--output-file <path>` to write directly to file
- [ ] Support JSON Lines format (`--format jsonl`) for streaming

### 6.2 Stdin Input Support
```bash
# Read URLs from stdin
cat urls.txt | rdcli raindrops add --stdin

# Read IDs from stdin for batch ops
rdcli raindrops search "unread" --quiet | rdcli raindrops batch-update --stdin --add-tags "processed"

# Read raindrop data from stdin
echo '{"url": "...", "title": "..."}' | rdcli raindrops add --json-stdin
```

- [ ] `--stdin` flag for reading input from pipe
- [ ] `--json-stdin` for JSON input
- [ ] Support line-by-line processing

### 6.3 Scripting Helpers
```bash
# Check if URL already exists
rdcli raindrops exists <url>
# Exit code: 0 if exists, 1 if not

# Get specific field
rdcli raindrops get <id> --field title
rdcli raindrops get <id> --field tags --format tsv

# Wait for backup to complete
rdcli backup create --wait
```

- [ ] `exists` command for duplicate checking
- [ ] `--field` extractor for specific values
- [ ] `--wait` flags for async operations

### 6.4 Machine-Readable Errors
```json
{
  "error": true,
  "code": "RATE_LIMITED",
  "message": "Rate limit exceeded",
  "details": {
    "limit": 120,
    "reset": 1751433732
  }
}
```

- [ ] Structured JSON errors with `--format json`
- [ ] Error codes for programmatic handling

### 6.5 Deliverables
- [ ] Stdin piping works
- [ ] All commands have consistent JSON output
- [ ] Error output is structured
- [ ] Field extraction works

---

## Phase 7: Distribution & Documentation
**Estimated Effort**: Medium
**Priority**: P1 (Required for release)

### 7.1 npm Publishing
- [ ] Set up npm package with proper metadata
- [ ] Configure package.json `bin` field
- [ ] Add `files` field to include only necessary files
- [ ] Publish to npm as `raindrop-cli` or `@yourname/raindrop-cli`

### 7.2 Binary Distribution (Optional)
- [ ] Use `bun build --compile` for single binary
- [ ] Or use `pkg` for Node.js binary
- [ ] GitHub releases with binaries for major platforms
- [ ] Homebrew formula (optional, for macOS)

### 7.3 Documentation
- [ ] Comprehensive README with installation, quick start
- [ ] Command reference with all options
- [ ] Examples for common workflows
- [ ] AI agent integration examples
- [ ] Contributing guide

### 7.4 Example Workflows in Docs
```bash
# Daily reading list cleanup
rdcli raindrops search "created:>7d tag:unread" --quiet | \
  xargs -I {} rdcli raindrops update {} --add-tags "stale"

# Export all bookmarks weekly
rdcli backup create --wait
rdcli backup list --format json | jq -r '.[0].id' | \
  xargs -I {} rdcli backup download {} ~/backups/raindrop-$(date +%Y%m%d).csv

# AI agent: analyze and tag
rdcli raindrops list --collection 123 --format json | \
  ai-agent analyze-and-tag | \
  rdcli raindrops batch-update --json-stdin
```

### 7.5 Deliverables
- [ ] `npm install -g raindrop-cli` works
- [ ] README is comprehensive
- [ ] Examples cover major use cases

---

## Phase 8: Testing & Quality
**Estimated Effort**: Medium
**Priority**: P1 (Ongoing)

### 8.1 Unit Tests
- [ ] Test output formatters
- [ ] Test config loading
- [ ] Test command argument parsing
- [ ] Mock API client for command tests

### 8.2 Integration Tests
- [ ] Test against real API (with test account)
- [ ] Record/playback with Polly.js (like raindrop-client does)
- [ ] Test error scenarios

### 8.3 E2E Tests
- [ ] Shell script tests for full CLI flows
- [ ] Test piping and stdin scenarios
- [ ] Test exit codes

### 8.4 CI/CD
- [ ] GitHub Actions for tests on PR
- [ ] Automated npm publishing on release tags
- [ ] Binary builds in CI

### 8.5 Deliverables
- [ ] >70% test coverage
- [ ] CI pipeline working
- [ ] Automated releases

---

## Implementation Order (Recommended)

```
Phase 0 ──► Phase 1 ──► Phase 2 ──► MVP Release
   │           │           │
   │           │           └── Core raindrop CRUD works
   │           └── Config, client, output system
   └── Project setup

Post-MVP:
Phase 3 (Collections) ──► Phase 4 (Tags/Highlights)
                              │
                              ▼
Phase 5 (Backup/Export) ◄── Phase 6 (AI Optimization)
                              │
                              ▼
                    Phase 7 (Distribution)
                              │
                              ▼
                    Phase 8 (Ongoing testing)
```

### MVP Definition (Phases 0-2)
- Install and configure with token
- List, add, update, delete raindrops
- Search raindrops
- JSON and table output formats

### v1.0 Definition (Phases 0-6)
- All raindrop operations
- Collection management
- Tags and highlights
- Backup and export
- Full AI agent support

---

## Open Questions for Research

1. **Package name**: Is `raindrop-cli` available on npm? Alternatives: `rdcli`, `raindrop-io-cli`, `@yourscope/raindrop`

2. **Bun vs Node**: Should we target Bun for faster startup? Trade-off is ecosystem compatibility.

3. **Config file format**: JSON, YAML, or TOML? Where to store? (`~/.config/`, `~/.raindroprc`, etc.)

4. **Interactive mode**: Should there be an interactive/REPL mode for exploration? (Could be v2)

5. **Completion scripts**: Generate shell completions for bash/zsh/fish?

6. **MCP server**: Should this also expose an MCP (Model Context Protocol) server for direct AI integration?

---

## Dependencies on raindrop-client

### Available in client
- All raindrop CRUD
- All collection CRUD
- Tags CRUD
- Highlights read
- User info
- Import (URL parse, check exists)
- Filters

### Missing from client (need custom implementation)
- `/rest/v1/backups` - List backups
- `/rest/v1/backup` - Create backup
- `/rest/v1/backup/{id}.{format}` - Download backup
- `/rest/v1/raindrops/{collection}/export.{format}` - Export

### Potential upstream contributions
- Consider contributing backup/export endpoints to raindrop-client
- Would benefit both projects

---

## References

- [Raindrop.io Official API Docs](https://developer.raindrop.io/)
- [raindrop-client GitHub](https://github.com/lasuillard/raindrop-client)
- [raindrop-client OpenAPI Spec](https://github.com/lasuillard/raindrop-client/blob/main/openapi.yaml)
- [Commander.js Docs](https://github.com/tj/commander.js)
- [Raindrop Search Syntax](https://help.raindrop.io/using-search/)
