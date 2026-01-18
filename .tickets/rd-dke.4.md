---
id: rd-dke.4
status: closed
deps: [rd-dke.3]
links: []
created: 2026-01-09T19:53:09.584288071-08:00
type: task
priority: 2
parent: rd-dke
---
# Add EPIPE handling for graceful pipe closure

Add EPIPE error handling so the CLI exits gracefully when output pipes close.

## Problem
Without EPIPE handling, piping to commands that close early shows ugly errors:
```bash
rd bookmarks list --limit 100 | head -5
# May show EPIPE error after output completes
```

## Solution
Add EPIPE handler in cli-main.ts:

```typescript
// src/cli-main.ts

/**
 * Handle EPIPE errors gracefully (pipe closed by consumer like head/grep).
 * This is normal when piping to commands that don't consume all output.
 */
function handlePipeErrors(stream: NodeJS.WritableStream, exit: (code: number) => void): void {
  stream.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EPIPE') {
      exit(0); // Normal exit when pipe closes
      return;
    }
    throw error; // Re-throw other errors
  });
}

export async function runCliMain({ stdout, stderr, exit, ... }: CliMainArgs): Promise<void> {
  // Add at the start of runCliMain, before any output
  handlePipeErrors(stdout, exit);
  handlePipeErrors(stderr, exit);
  
  // ... rest of function
}
```

## Acceptance Criteria
- [ ] Add `handlePipeErrors(stream, exit)` function in src/cli-main.ts
- [ ] Call handlePipeErrors for stdout before running CLI
- [ ] Call handlePipeErrors for stderr before running CLI
- [ ] EPIPE errors result in exit(0) (clean exit)
- [ ] Other stream errors are re-thrown
- [ ] Add unit test in src/cli-main.test.ts:
  ```typescript
  import { Writable } from 'node:stream';
  
  describe('handlePipeErrors', () => {
    it('calls exit(0) on EPIPE', () => {
      let exitCode: number | undefined;
      const stream = new Writable({ write() {} });
      
      handlePipeErrors(stream, (code) => { exitCode = code; });
      
      const epipeError = new Error('write EPIPE') as NodeJS.ErrnoException;
      epipeError.code = 'EPIPE';
      stream.emit('error', epipeError);
      
      expect(exitCode).toBe(0);
    });
    
    it('re-throws non-EPIPE errors', () => {
      const stream = new Writable({ write() {} });
      handlePipeErrors(stream, () => {});
      
      const otherError = new Error('other') as NodeJS.ErrnoException;
      otherError.code = 'ENOENT';
      
      expect(() => stream.emit('error', otherError)).toThrow('other');
    });
  });
  ```
- [ ] `bun run verify` passes

## Notes
- Small focused change - just add the EPIPE handling
- Depends on rd-dke.3 since cli-main.ts is created there
- Pattern reference: research-learning-agent/cli-starter/src/cli-main.ts


