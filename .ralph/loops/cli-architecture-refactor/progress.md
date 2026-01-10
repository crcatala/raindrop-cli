# Ralph Progress Log: CLI Architecture Refactor
Started: 2026-01-09 20:22

## Codebase Patterns
- **Stream capture pattern**: Use Node.js `Writable` from `node:stream` to create capture streams for testing. Collect chunks in `write()`, concatenate in `getOutput()`.
- **Test cleanup**: Always call `resetOutputStream()` in `afterEach` to restore defaults.

---

## [2026-01-09 20:22] - rd-dke.1
- Added stream injection to output-streams.ts
- Added `stdoutStream` and `stderrStream` module variables (default to process.*)
- Added `setOutputStream(stdout, stderr)` function to override streams
- Added `resetOutputStream()` function for test cleanup
- Updated all 5 output functions to use the injectable stream variables
- Added comprehensive test demonstrating stream capture works
- Files changed: `src/utils/output-streams.ts`, `src/utils/output-streams.test.ts`
- **Learnings:** Existing tests use `spyOn(process.stdout, "write")` which still works because the module defaults to process.stdout/stderr. New injection tests work alongside spy-based tests.
---

## [2026-01-09 20:24] - rd-dke.2
- Created CliContext type and context.ts module
- Created `src/cli/` directory with:
  - `src/cli/context.ts` - CliContext type and createContext() function
  - `src/cli/index.ts` - exports for the module
  - `src/cli/context.test.ts` - comprehensive unit tests
- createContext() parses all format flags (--json, --table, --plain, --tsv, --format)
- Handles verbosity flags (--verbose/-v, --debug/-d, --quiet/-q)
- --debug implies verbose
- Respects NO_COLOR env and --no-color flag
- Color functions wrapped to return plain text when color disabled
- isTty passed explicitly for testability (defaults to process.stdout.isTTY)
- Unicode prefixes (✓, ⚠, ✗, ℹ) when color enabled, text prefixes when disabled
- Files changed: `src/cli/context.ts`, `src/cli/index.ts`, `src/cli/context.test.ts`
- **Learnings:** The existing `colors` export from `utils/colors.ts` is a Proxy that dynamically calls `getColors()`, which respects global flags. The new context.ts wraps these same color functions but evaluates color setting at context creation time, allowing tests to have predictable behavior.
---

## [2026-01-09 20:27] - rd-dke.3
- Split monolithic index.ts into three-layer architecture
- Created `src/cli.ts` - thin shell (process.* injection, ~30 lines)
- Created `src/cli-main.ts` - error handling, orchestration (~60 lines)
- Created `src/run.ts` - core Commander logic, testable with mocked streams (~45 lines)
- Created `src/cli/program.ts` - all Commander setup extracted from index.ts (~280 lines)
- Updated `src/cli/index.ts` to export createProgram
- Reduced `src/index.ts` to library exports only (~15 lines)
- Updated `package.json` bin to point to `dist/cli.js`
- Updated build script to build `src/cli.ts` instead of `src/index.ts`
- Updated `src/test-utils/cli.ts` to spawn `src/cli.ts`
- Files changed: `src/cli.ts` (new), `src/cli-main.ts` (new), `src/run.ts` (new), `src/cli/program.ts` (new), `src/cli/index.ts`, `src/index.ts`, `src/test-utils/cli.ts`, `package.json`
- **Learnings:** 
  - Commander's default exitCode for usage errors is 1, but clig.dev convention is exit code 2 for usage errors. Must explicitly set `setExitCode(2)` for CommanderError.
  - The preAction hook still sets globals (setDebugEnabled, etc.) for backward compatibility with existing commands. Future tasks could migrate commands to use ctx directly.
  - Root shortcuts (list, show, add, etc.) use `command.parent?.args` to get argv instead of process.argv, making them work with the new architecture.
---


## [2026-01-09 20:32] - rd-dke.4
- Added EPIPE handling for graceful pipe closure
- Added `handlePipeErrors(stream, exit)` function to cli-main.ts
- Function exits with code 0 on EPIPE (normal when piping to head/grep)
- Non-EPIPE errors are re-thrown
- Called handlePipeErrors for both stdout and stderr at start of runCliMain
- Added unit tests in src/cli-main.test.ts with 2 test cases
- Files changed: `src/cli-main.ts`, `src/cli-main.test.ts`
- **Learnings:** Node.js stream errors are emitted asynchronously. The `stream.emit('error', ...)` pattern works for testing because Writable streams handle error events synchronously when emitted manually.
---
