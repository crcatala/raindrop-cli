---
id: rd-dke.5
status: closed
deps: [rd-dke.3]
links: []
created: 2026-01-09T19:53:26.477069951-08:00
type: task
priority: 2
parent: rd-dke
---
# Add unit tests with mocked streams

Add fast unit tests that use mocked streams instead of spawning subprocesses.

## Current State
All CLI tests spawn subprocesses (~100-500ms each):
```typescript
// src/test-utils/cli.ts
const proc = Bun.spawn(['bun', 'src/cli.ts', ...args], { ... });
```

## Target State
Add unit tests that call runCli() directly (~10-20ms each):
```typescript
// src/run.test.ts
import { runCli } from './run.js';
import { captureStream, noopStream } from './test-utils/streams.js';

it('outputs JSON correctly', async () => {
  const { stream: stdout, getOutput } = captureStream();
  
  await runCli(['--help'], {
    env: {},
    stdout,
    stderr: noopStream(),
  });

  expect(getOutput()).toContain('rd');
  expect(getOutput()).toContain('Commands:');
});
```

## Files to Create

### src/test-utils/streams.ts
```typescript
import { Writable } from 'node:stream';

/**
 * Create a stream that captures all written data.
 * Use for testing stdout/stderr output.
 */
export function captureStream(): {
  stream: NodeJS.WritableStream;
  getOutput: () => string;
} {
  let output = '';
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      output += chunk.toString();
      callback();
    },
  });
  return { stream, getOutput: () => output };
}

/**
 * Create a stream that discards all data.
 * Use when you don't care about the output.
 */
export function noopStream(): NodeJS.WritableStream {
  return new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
}
```

### src/run.test.ts (Unit tests for CLI parsing)
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { runCli } from './run.js';
import { captureStream, noopStream } from './test-utils/streams.js';
import nock from 'nock';

describe('runCli unit tests', () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });
  
  afterEach(() => {
    nock.cleanAll();
  });

  describe('help output', () => {
    it('shows help with --help', async () => {
      const { stream: stdout, getOutput } = captureStream();
      
      await runCli(['--help'], {
        env: {},
        stdout,
        stderr: noopStream(),
      });
      
      const output = getOutput();
      expect(output).toContain('rd');
      expect(output).toContain('Commands:');
      expect(output).toContain('bookmarks');
    });

    it('shows subcommand help', async () => {
      const { stream: stdout, getOutput } = captureStream();
      
      await runCli(['bookmarks', '--help'], {
        env: {},
        stdout,
        stderr: noopStream(),
      });
      
      expect(getOutput()).toContain('list');
      expect(getOutput()).toContain('add');
    });
  });

  describe('output format flags', () => {
    it('respects --json flag', async () => {
      // Mock API response
      nock('https://api.raindrop.io')
        .get('/rest/v1/raindrops/0')
        .query(true)
        .reply(200, { result: true, items: [] });

      const { stream: stdout, getOutput } = captureStream();
      
      await runCli(['bookmarks', 'list', '--json'], {
        env: { RAINDROP_TOKEN: 'test-token' },
        stdout,
        stderr: noopStream(),
      });
      
      const output = getOutput();
      expect(() => JSON.parse(output)).not.toThrow();
    });
  });

  describe('quiet mode', () => {
    it('outputs only IDs with --quiet', async () => {
      nock('https://api.raindrop.io')
        .get('/rest/v1/raindrops/0')
        .query(true)
        .reply(200, { 
          result: true, 
          items: [{ _id: 123, title: 'Test' }] 
        });

      const { stream: stdout, getOutput } = captureStream();
      
      await runCli(['bookmarks', 'list', '--quiet'], {
        env: { RAINDROP_TOKEN: 'test-token' },
        stdout,
        stderr: noopStream(),
      });
      
      expect(getOutput().trim()).toBe('123');
    });
  });

  describe('verbose/debug output', () => {
    it('writes verbose to stderr', async () => {
      nock('https://api.raindrop.io')
        .get('/rest/v1/raindrops/0')
        .query(true)
        .reply(200, { result: true, items: [] });

      const { stream: stderr, getOutput } = captureStream();
      
      await runCli(['bookmarks', 'list', '--verbose'], {
        env: { RAINDROP_TOKEN: 'test-token' },
        stdout: noopStream(),
        stderr,
      });
      
      expect(getOutput()).toContain('→');
    });
  });

  describe('error handling', () => {
    it('throws on unknown command', async () => {
      await expect(
        runCli(['unknown-command'], {
          env: {},
          stdout: noopStream(),
          stderr: noopStream(),
        })
      ).rejects.toThrow();
    });
  });
});
```

## Acceptance Criteria
- [ ] Create src/test-utils/streams.ts with captureStream() and noopStream()
- [ ] Export from src/test-utils/index.ts
- [ ] Create src/run.test.ts with unit tests
- [ ] Tests cover:
  - [ ] Help output (--help, subcommand --help)
  - [ ] JSON format flag (--json)
  - [ ] Quiet mode (--quiet)
  - [ ] Verbose output goes to stderr (--verbose)
  - [ ] Error on unknown command
- [ ] All tests use nock to mock API calls (no real network)
- [ ] Unit tests run significantly faster than integration tests
- [ ] Add comment at top of test file explaining the pattern
- [ ] `bun run verify` passes
- [ ] Keep existing integration tests (they test exit codes)

## Notes
- Depends on rd-dke.3 for runCli() to accept stream params
- Use nock for HTTP mocking (already in project)
- This demonstrates the pattern - future tests can follow it
- Pattern reference: research-learning-agent/cli-starter/tests/unit/cli.test.ts


