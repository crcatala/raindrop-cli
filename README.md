# raindrop-cli

[![npm version](https://img.shields.io/npm/v/raindrop-cli)](https://npmjs.com/package/raindrop-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A TypeScript CLI for Raindrop.io built on `@lasuillard/raindrop-client` and `commander`, designed for AI agent integration and personal productivity workflows.

## Features

- Comprehensive CLI access to Raindrop.io API
- Structured JSON output optimized for AI agent consumption
- Human-friendly output formats (tables, TSV)
- Full bookmark (raindrop) CRUD operations
- Collection management
- Tag and highlight operations

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

This installs `rd` as the primary command. An `rdcli` alias is also available if `rd` conflicts with another tool on your system:

- **Windows cmd.exe/PowerShell**: `rd` is a built-in command (remove directory)
- **oh-my-zsh**: `rd` is aliased to `rmdir` in the core library

To use `rd` with oh-my-zsh, add `unalias rd` to your `~/.zshrc` after oh-my-zsh is sourced, or use `rdcli` instead.

## Configuration

Set your Raindrop.io API token:

```bash
export RAINDROP_TOKEN=your-token-here
```

Get your token from [Raindrop.io Integrations Settings](https://app.raindrop.io/settings/integrations).

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `RAINDROP_TOKEN` | API token from Raindrop.io | Yes |
| `RDCLI_TIMEOUT` | Request timeout in seconds | No |
| `RDCLI_API_DELAY_MS` | Delay between API calls | No |

## Usage

```bash
# List your bookmarks
rd bookmarks list

# Add a new bookmark
rd bookmarks add https://example.com --tags "reading,tech"

# Search bookmarks
rd bookmarks search "typescript"

# Get help
rd --help
```

### Root Shortcuts

Common operations have shortcuts at the root level:

```bash
rd list                 # Shortcut for: rd bookmarks list
rd search "query"       # Shortcut for: rd bookmarks search
rd add <url>            # Shortcut for: rd bookmarks add
rd show <id>            # Shortcut for: rd bookmarks show
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev

# Run tests
npm test

# Lint
npm run lint
```

## License

MIT
