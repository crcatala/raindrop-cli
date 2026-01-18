---
id: rd-dke.1
status: closed
deps: []
links: []
created: 2026-01-09T19:52:28.971030075-08:00
type: task
priority: 2
parent: rd-dke
---
# Add stream injection to output-streams.ts

Modify output-streams.ts to accept injectable streams instead of using process.stdout/stderr directly.

## Current State
```typescript
// src/utils/output-streams.ts
export function outputData(message: string): void {
  process.stdout.write(message + '\n');
}
```

## Target State
```typescript
// src/utils/output-streams.ts
let stdoutStream: NodeJS.WritableStream = process.stdout;
let stderrStream: NodeJS.WritableStream = process.stderr;

export function setOutputStream(stdout: NodeJS.WritableStream, stderr: NodeJS.WritableStream): void {
  stdoutStream = stdout;
  stderrStream = stderr;
}

export function resetOutputStream(): void {
  stdoutStream = process.stdout;
  stderrStream = process.stderr;
}

export function outputData(message: string): void {
  stdoutStream.write(message + '\n');
}

export function outputMessage(message: string): void {
  stderrStream.write(message + '\n');
}

export function outputError(message: string): void {
  stderrStream.write(message + '\n');
}
// Same pattern for outputDataRaw, outputMessageRaw
```

## Acceptance Criteria
- [ ] Add module-level `stdoutStream` and `stderrStream` variables (default to process.*)
- [ ] Add `setOutputStream(stdout, stderr)` function to override streams
- [ ] Add `resetOutputStream()` function for test cleanup
- [ ] Update `outputData` to write to `stdoutStream`
- [ ] Update `outputMessage`, `outputError` to write to `stderrStream`
- [ ] Update `outputDataRaw`, `outputMessageRaw` similarly
- [ ] Add test in `src/utils/output-streams.test.ts` demonstrating stream capture
- [ ] Run `bun run verify` - all existing tests pass

## Notes
- This is a non-breaking change - defaults preserve existing behavior
- Pattern reference: research-learning-agent/cli-starter/src/cli/output.ts


