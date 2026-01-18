# Ralph Progress Log: cli-playbook-patterns
Started: 2026-01-18T01:41:27.603Z

## Codebase Patterns
- Error hierarchy already existed: RaindropCliError (base), UsageError (exit 2), ConfigError, ApiError, TimeoutError, RateLimitError
- Tests use `spyOn(process, "exit").mockImplementation()` to test exit behavior without actually exiting

---

## [2026-01-17 17:43] - rc-9036.1
- Added `isCliError()` type guard function - the only missing piece from acceptance criteria
- Error class hierarchy was already implemented in src/utils/errors.ts
- Files changed: src/utils/errors.ts, src/utils/errors.test.ts
- **Learnings:** Codebase already had most error classes implemented. Just needed the type guard.
---

## [2026-01-17 17:45] - rc-9036.2
- Added `setupSignalHandlers()` function for graceful shutdown
- SIGINT: first Ctrl-C shows message, second force exits with code 130
- SIGTERM: clean exit with code 143 (128 + 15)
- Called at start of `runCliMain()`
- Files changed: src/cli-main.ts, src/cli-main.test.ts
- **Learnings:** Testing signal handlers requires mocking `process.on` to capture the handlers, then calling them directly. Use spyOn(process, "on").mockImplementation() to capture handlers in a Map.
---

## [2026-01-17 17:47] - rc-9036.3
- Integrated structured errors into cli-main.ts error handling
- Import and use `isCliError()` type guard from errors.ts
- When --json flag is set and error is CliError, output `error.toJSON()` to stderr
- Exit code comes from `error.exitCode` when error is CliError (UsageError=2, others=1)
- Non-CliError exceptions still handled gracefully (exit 1, message to stderr)
- Files changed: src/cli-main.ts, src/cli-main.test.ts
- **Learnings:** When mocking imported modules with spyOn in Bun tests, MUST save the spy reference and call `mockRestore()` in afterEach, otherwise the mock persists across test files due to module caching.
---

## [2026-01-17 17:52] - rc-9036.4
- Replaced CommanderError with UsageError for timeout validation in program.ts
- Import UsageError from utils/errors.ts
- Added clig.dev exit code documentation comment
- Updated integration tests: -t validation now checks for exit code 2 specifically
- Added new tests for zero and negative timeout values
- Files changed: src/cli/program.ts, src/cli.integration.test.ts
- **Learnings:** Commander's --help flag bypasses preAction hooks, so validation tests must use a real command (like `auth status`) instead of --help to properly test preAction validation errors.
---
