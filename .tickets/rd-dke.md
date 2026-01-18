---
id: rd-dke
status: open
deps: []
links: []
created: 2026-01-09T19:52:19.061364232-08:00
type: epic
priority: 2
---
# CLI Architecture Refactor: Testability & Patterns

Refactor the CLI architecture to follow production-ready patterns from the CLI starter playbook. Focus areas:

1. **Three-layer entry point** for testability (cli.ts → cli-main.ts → run.ts)
2. **Stream dependency injection** to enable fast unit tests
3. **CliContext object** to consolidate scattered global state
4. **EPIPE handling** for graceful pipe closure

## Why
- Current architecture uses `process.*` directly, forcing all tests to spawn subprocesses (~100-500ms each)
- Global state (debugEnabled, noColorFlag) scattered across modules makes testing harder
- No EPIPE handling causes ugly errors when piping to head/grep

## Success Criteria
- Unit tests can run with mocked streams (10ms vs 200ms)
- CliContext passed to commands instead of reading globals
- Graceful handling when pipes close
- All existing tests still pass

## Reference
- CLI Starter: /home/mog/workspace/research-learning-agent/cli-starter/
- Patterns: Three-layer architecture, stream injection, CliContext


