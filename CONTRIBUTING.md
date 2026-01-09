# Contributing to raindrop-cli

## Prerequisites

- Node.js 20+
- Bun (for development)

## Setup

```bash
git clone https://github.com/crcatala/raindrop-cli.git
cd raindrop-cli
bun install
```

## Development

```bash
bun run verify    # Run all checks (lint, typecheck, test, format)
bun run build     # Build for production
bun run dev       # Watch mode
```

## Running Live Tests

Live tests require a Raindrop.io API token:

```bash
export RAINDROP_TOKEN=your-test-token
bun run test:live
```

**Note:** Use a dedicated test account, not your personal bookmarks.

## Pull Request Process

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Run `bun run verify`
5. Submit PR
