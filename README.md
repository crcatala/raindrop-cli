# raindrop-cli

[![npm version](https://img.shields.io/npm/v/raindrop-cli)](https://npmjs.com/package/raindrop-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A fast, scriptable command-line interface for [Raindrop.io](https://raindrop.io) — the all-in-one bookmark manager.

Built for power users, automation workflows, and AI agent integration.

> **Disclaimer:** This is an unofficial, community-built tool and is not affiliated with or endorsed by Raindrop.io.

## Features

- **Full CRUD Operations** — Create, read, update, and delete bookmarks with ease
- **Powerful Search** — Use Raindrop's full search syntax from the command line
- **Batch Operations** — Update or delete multiple bookmarks at once via stdin piping
- **Multiple Output Formats** — JSON, table, TSV, or plain text for any workflow
- **AI-Friendly** — Structured output designed for LLM and agent consumption
- **Scriptable** — Quiet mode, stdin support, and composable commands
- **Collection Management** — Organize bookmarks with hierarchical collections
- **Tag Operations** — Bulk rename, delete, and manage tags
- **Fast** — Built with Bun for quick startup and execution

## Requirements

- Node.js 20+

## Installation

```bash
npm install -g raindrop-cli
```

Or use without installing:
```bash
npx raindrop-cli --help
```

This installs `rd` as the primary command. An `rdcli` alias is also available if `rd` conflicts with another tool:

- **Windows**: `rd` is a built-in command (remove directory)
- **oh-my-zsh**: `rd` is aliased to `rmdir` — add `unalias rd` to your `~/.zshrc` or use `rdcli`

## Quick Start

### 1. Get Your API Token

Get a test token from [Raindrop.io Integrations Settings](https://app.raindrop.io/settings/integrations).

### 2. Authenticate

```bash
rd auth set-token
# Paste your token when prompted
```

Or set via environment variable:

```bash
export RAINDROP_TOKEN=your-token-here
```

### 3. Start Using

```bash
# List your bookmarks
rd list

# Add a bookmark
rd add https://example.com --tags "reading,tech"

# Search your bookmarks
rd search "typescript"

# Get help
rd --help
```

## Commands

### Bookmarks

The primary resource. Most bookmark commands have convenient shortcuts at the root level.

```bash
# List bookmarks
rd list                                    # or: rd bookmarks list
rd list --limit 50                         # limit results
rd list --tag javascript                   # filter by tag
rd list --type article                     # filter by type
rd list --favorites                        # show only favorites
rd list 12345                              # list from specific collection

# Search
rd search "typescript"                     # full-text search
rd search "#javascript"                    # search by tag
rd search "domain:github.com"              # search by domain
rd search "type:article created:2024-01"   # combine filters

# Show details
rd show 12345                              # show bookmark by ID

# Add bookmarks
rd add https://example.com                 # basic add
rd add https://example.com --title "My Title" --tags "dev,reading"
rd add https://example.com --favorite      # add as favorite
rd add https://example.com --collection 12345

# Update bookmarks
rd update 12345 --title "New Title"
rd update 12345 --tags "new,tags"          # replace all tags
rd update 12345 --favorite                 # mark as favorite
rd update 12345 --favorite false           # remove favorite

# Delete bookmarks
rd delete 12345                            # prompts for confirmation
rd delete 12345 --force                    # skip confirmation

# Batch operations
rd list -q | rd batch-update --favorite    # favorite all bookmarks
rd list -q --tag old | rd batch-delete     # delete by tag
rd batch-update --ids 123,456,789 --tags "archived"
```

### Collections

Organize bookmarks into folders with optional nesting.

```bash
rd collections list                        # show collection tree
rd collections list --flat                 # flat list with IDs
rd collections show 12345                  # collection details
rd collections add "My Collection"         # create collection
rd collections add "Sub" --parent 12345    # create nested collection
rd collections delete 12345 --force        # delete collection
rd collections stats                       # show system collection counts
```

### Tags

Manage tags across your bookmarks.

```bash
rd tags list                               # list all tags with counts
rd tags list 12345                         # tags in specific collection
rd tags rename "old-tag" "new-tag" -f      # rename (merges if exists)
rd tags delete "unused-tag" -f             # remove tag from all bookmarks
```

### Favorites

Quick access to your starred bookmarks.

```bash
rd favorites list                          # list all favorites
rd favorites list 12345                    # favorites in collection
rd favorites list -s "#javascript"         # filter favorites
```

### Highlights

View your annotations and highlights.

```bash
rd highlights list                         # list all highlights
rd highlights list -c 12345                # highlights in collection
rd highlights show 12345                   # highlights for bookmark
```

### Filters

Discover available filter values for search.

```bash
rd filters list                            # show types, tags, dates
rd filters list 12345                      # filters for collection
```

### Trash

Manage deleted bookmarks.

```bash
rd trash list                              # list trashed items
rd trash empty --dry-run                   # preview deletion
rd trash empty --force                     # permanently delete all
```

### Auth

Manage authentication.

```bash
rd auth status                             # check auth status
rd auth set-token                          # set new token (interactive)
rd auth clear                              # remove stored token
```

## Output Formats

Control output format for different use cases:

```bash
# Table (default for terminals)
rd list

# JSON (default when piped, great for jq)
rd list --json
rd list -f json | jq '.[].title'

# TSV (spreadsheet-friendly)
rd list -f tsv > bookmarks.tsv

# Plain text (human-readable)
rd list -f plain

# Quiet mode (just IDs, for scripting)
rd list -q
rd list -q | xargs -I {} rd show {}
```

## Scripting Examples

### Backup All Bookmarks

```bash
rd list --limit 50 --format json > backup.json
```

### Tag All Unsorted Bookmarks

```bash
rd list unsorted -q | rd batch-update --tags "needs-review"
```

### Delete Old Bookmarks

```bash
rd list --created 2020-01 -q | rd batch-delete
```

### Export to TSV for Spreadsheet

```bash
rd list --limit 100 -f tsv > bookmarks.tsv
```

### Find Broken Links

```bash
rd list --broken -f json | jq '.[] | {title, link}'
```

### Migrate Tags

```bash
rd tags rename "javascript" "js" -f
```

## Global Options

```
-V, --version            Output version number
--format <format>        Output format: json, table, tsv, plain
--json                   Shorthand for --format json
-q, --quiet              Minimal output (just IDs)
-v, --verbose            Show operational details
-d, --debug              Show debug info
--no-color               Disable colored output
-t, --timeout <seconds>  Request timeout (default: 30, env: RDCLI_TIMEOUT)
-h, --help               Display help
```

## Configuration

### Token Storage

Tokens can be provided via:

1. **Environment variable** (takes precedence): `RAINDROP_TOKEN`
2. **Config file**: `~/.config/raindrop-cli/config.json` (set via `rd auth set-token`)

### Environment Variables

| Variable | Description |
|----------|-------------|
| `RAINDROP_TOKEN` | API token (overrides config file) |
| `RDCLI_TIMEOUT` | Request timeout in seconds (default: 30) |
| `RDCLI_API_DELAY_MS` | Delay between API calls (milliseconds) |
| `NO_COLOR` | Disable colored output |

## Development

```bash
# Install dependencies
bun install

# Run in development
bun run dev -- list

# Run tests
bun run test              # unit tests
bun run test:live         # live API tests (requires token)

# Lint and format
bun run lint
bun run format

# Type check
bun run typecheck

# Build
bun run build

# Run all checks
bun run verify
```

### Verbose Commands

Most commands have a `:verbose` variant with human-friendly output (e.g., `bun run test:verbose`). The defaults are optimized for AI agents with minimal output.

### Live Tests in CI

Live tests run against the real Raindrop.io API and require a token. In CI, maintainers and collaborators can trigger them by commenting `/run-live-tests` on a PR.

> **Note:** Live tests only work on PRs from the same repository, not forks (secrets aren't available to forks for security).

### Project Structure

```
src/
├── index.ts           # CLI entry point
├── commands/          # Command implementations
├── output/            # Output formatters (json, table, tsv, plain)
├── utils/             # Shared utilities
└── types/             # TypeScript types
```

## Releasing

For maintainers publishing a new version to npm.

### Prerequisites

- Push access to the repository
- npm account with publish rights to `raindrop-cli`
- Logged in to npm (`npm whoami` to verify)
- ggshield installed and authenticated (`ggshield auth status`)

### Release Process

```bash
# 1. Ensure you're on main with latest changes
git checkout main
git pull

# 2. Update CHANGELOG.md
# - Move items from "Unreleased" to new version section
# - Set the release date (e.g., ## [0.2.0] - 2026-01-15)

# 3. Commit the changelog
git add CHANGELOG.md
git commit -m "chore: update changelog for vX.Y.Z"

# 4. Bump version (creates commit + git tag automatically)
npm version patch  # or: minor, major
# This updates package.json and creates a vX.Y.Z tag

# 5. Dry run to verify package contents
npm publish --dry-run --access public

# 6. Publish to npm
npm publish --access public

# 7. Push commits and tags to GitHub
git push && git push --tags

# 8. Verify installation works
npm info raindrop-cli
npx raindrop-cli@latest --version
```

### What Happens During Publish

The `prepublishOnly` script runs automatically before upload:

1. **Verify** — runs tests, lint, typecheck, format
2. **Build** — compiles to `dist/`
3. **Secret scan** — ggshield scans source and `dist/` for leaked secrets
4. **Package** — creates tarball with only: `dist/*`, `README.md`, `LICENSE`, `package.json`

No need to run `bun run build` manually — it's all handled automatically.

### Notes

- **Immutable** — published versions cannot be changed, only deprecated
- **Tags** — `npm version` creates the git tag; just remember to `git push --tags`
- **Secrets** — publish will fail if ggshield detects secrets in the bundle

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

Quick start:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `bun run verify` to ensure tests pass
5. Submit a pull request

## License

[MIT](LICENSE)

## Links

- [Raindrop.io](https://raindrop.io)
- [Raindrop.io API Documentation](https://developer.raindrop.io)
- [Changelog](CHANGELOG.md)
- [Report Issues](https://github.com/crcatala/raindrop-cli-spike/issues)
