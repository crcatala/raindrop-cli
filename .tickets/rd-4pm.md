---
id: rd-4pm
status: closed
deps: []
links: []
created: 2026-01-02T16:54:34.137346757-08:00
type: task
priority: 1
---
# Add automated test infrastructure for CLI

Set up proper testing infrastructure for the CLI.

## Context
Currently we only have manual test scripts (e.g., scripts/test-tty.sh). We need automated tests before implementing more CLI commands.

## Test Runner
Bun test is already configured - just need to add test files.

## Priority Areas (in order)

### 1. Unit tests for formatters (highest value, easiest)
- `src/output/json.ts`, `table.ts`, `tsv.ts` - pure functions
- `src/utils/output-streams.ts` - mock process.stdout/stderr.write
- Example: verify formatTable produces correct output for given data

### 2. Integration tests for stream separation
- Spawn CLI as subprocess with `Bun.spawn()`
- Capture stdout/stderr separately
- Verify JSON goes to stdout, messages to stderr
- Test exit codes for error scenarios

### 3. Unit tests for config/errors
- `src/config.ts` - mock fs operations, test precedence
- `src/utils/errors.ts` - verify error formatting

## Challenges
- TTY detection tests are tricky because test runners affect TTY state
- For TTY tests: mock process.stdout.isTTY or use child_process with pty

## Related
- Created during rd-vst (TTY detection) implementation
- Manual test script exists at scripts/test-tty.sh as reference
- rd-u3p (stdout/stderr separation) would benefit from integration tests


