<h1><img src="assets/icon.png" width="40" height="40" align="top" alt="" /> raindrop-cli</h1>

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

- Node.js 22+

## Installation

```bash
npm install -g raindrop-cli        # or: pnpm add -g raindrop-cli, bun add -g raindrop-cli
npx raindrop-cli --help            # run without installing
```

Requires Node.js 22 or later.

This installs `rd` as the primary command. An `rdcli` alias is also available if `rd` conflicts with another tool:

- **Windows**: `rd` is a built-in command (remove directory)
- **oh-my-zsh**: `rd` is aliased to `rmdir` — add `unalias rd` to your `~/.zshrc` or use `rdcli`

### From source

```bash
git clone https://github.com/crcatala/raindrop-cli.git
cd raindrop-cli
bun install
bun run build
bun link                     # puts `rd` on your PATH, pointing at this clone
rd --version                 # rd X.Y.Z (sha7 YYYY-MM-DD): the commit you built
```

Rebuild after pulling (`bun run build`); the link keeps pointing at the clone. If `rd` is
also installed globally, remove that copy so the linked build is the one on `PATH`
(`command -v rd` should resolve inside the clone).

### Updating

```bash
rd update --check       # exit 0: up to date, 1: update available, 2: unknown
rd update               # updates the same way it was installed
```

`rd update` pulls and rebuilds a source checkout (it refuses when the tree is dirty or
not on `main`), and runs `npm install -g raindrop-cli@latest` for a global npm install.

## Quick Start

### 1. Get Your API Token

Get a test token from [Raindrop.io Integrations Settings](https://app.raindrop.io/settings/integrations).

### 2. Authenticate

```bash
rd auth set-token
# Paste your token when prompted; it is stored in your system keyring by default
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
2. **System keyring** (default for `rd auth set-token`): macOS Keychain, Windows Credential Manager, or Linux Secret Service
3. **Config file**: `~/.config/raindrop-cli/config.json` (only with `rd auth set-token --use-config`, or for legacy tokens)

The keyring is preferred because the config file does not contain the bearer token. Linux keyring storage requires an active Secret Service/D-Bus session; in headless or SSH environments where it is unavailable, use the explicit fallback:

```bash
rd auth set-token --use-config
```

The fallback stores the token unencrypted in `config.json`, which is restricted to the current user (`0600`).

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

Live tests run against the real Raindrop.io API and require a `RAINDROP_TOKEN` repository secret. The repository owner can trigger them by commenting exactly `/run-live-tests` on a same-repo PR.

> **Notes:**
> - Only the repository owner can trigger live tests (not collaborators).
> - Fork PRs are rejected so repository secrets are never exposed to untrusted code paths.
> - The workflow definition always runs from the default branch; only the PR head commit is checked out for the test job.

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

For maintainers publishing a new version to npm. Releases are cut by hand from a clean
`main` with [release-it](https://github.com/release-it/release-it), wrapped by
`scripts/release.mjs`; the full process, prerequisites and recovery steps are in
[RELEASING.md](RELEASING.md).

## Contributing

This is a personally maintained project and does not accept code contributions, pull requests, or feature requests. Bug reports with a clear reproduction are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

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
