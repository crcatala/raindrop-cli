# Guardrails for CLI Playbook Patterns Loop

## Code Quality

- Run `bun run verify` before committing (lint + test + typecheck)
- All new code must have unit tests
- Keep test files co-located with source files (e.g., `errors.test.ts` next to `errors.ts`)

## Architecture Rules

- Don't modify existing working code unless necessary for the task
- New error classes are ADDITIVE - keep existing error utilities working
- Follow existing patterns in the codebase (picocolors for colors, bun:test for tests)

## Testing

- Tests should be fast (< 100ms per test file)
- Use mocked streams for CLI tests (see src/cli-main.test.ts for pattern)
- No real network calls in unit tests

## Exit Codes (clig.dev)

- 0: Success
- 1: General/runtime errors (API failures, network issues)
- 2: Usage errors (invalid arguments, validation failures)
- 130: Interrupted (SIGINT, 128 + 2)
- 143: Terminated (SIGTERM, 128 + 15)

## Commit Messages

- Format: `<type>: <description>` (e.g., `feat: add CliError class hierarchy`)
- Reference ticket in body if relevant
