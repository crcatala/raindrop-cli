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

