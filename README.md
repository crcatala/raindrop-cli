# raindrop-cli

A TypeScript CLI for Raindrop.io built on `@lasuillard/raindrop-client` and `commander`, designed for AI agent integration and personal productivity workflows.

## Features

- Comprehensive CLI access to Raindrop.io API
- Structured JSON output optimized for AI agent consumption
- Human-friendly output formats (tables, TSV)
- Full bookmark (raindrop) CRUD operations
- Collection management
- Tag and highlight operations

## Installation

```bash
npm install -g raindrop-cli
```

This installs `rd` as the primary command. An `rdcli` alias is also available if `rd` conflicts with another tool on your system (e.g., Windows cmd.exe's built-in `rd` command).

## Configuration

Set your Raindrop.io API token:

```bash
export RAINDROP_TOKEN=your-token-here
```

Get your token from [Raindrop.io Integrations Settings](https://app.raindrop.io/settings/integrations).

## Usage

```bash
# List your raindrops
rd raindrops list

# Add a new bookmark
rd raindrops add https://example.com --tags "reading,tech"

# Search raindrops
rd raindrops search "typescript"

# Get help
rd --help
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
