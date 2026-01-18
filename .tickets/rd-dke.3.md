---
id: rd-dke.3
status: closed
deps: [rd-dke.1, rd-dke.2]
links: []
created: 2026-01-09T19:52:57.478746681-08:00
type: task
priority: 2
parent: rd-dke
---
# Split index.ts into three-layer architecture

Split the monolithic src/index.ts (314 lines) into three layers for testability.

## Target Structure
```
src/
├── cli.ts        # NEW: Thin shell - injects process.* dependencies
├── cli-main.ts   # NEW: Error handling, orchestration
├── run.ts        # NEW: Core Commander logic (testable with mocked streams)
├── cli/
│   ├── context.ts   # From rd-dke.2
│   ├── index.ts     # From rd-dke.2
│   └── program.ts   # NEW: Commander program setup + command registration
└── index.ts      # KEEP: Library re-exports only
```

## Layer 1: src/cli.ts (Thin Shell)
```typescript
#!/usr/bin/env node
import { runCliMain } from './cli-main.js';

void runCliMain({
  argv: process.argv.slice(2),
  env: process.env,
  stdout: process.stdout,
  stderr: process.stderr,
  exit: (code) => process.exit(code),
  setExitCode: (code) => { process.exitCode = code; },
}).catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(message + '\n');
  process.exitCode = 1;
});
```

## Layer 2: src/cli-main.ts
```typescript
import { runCli } from './run.js';
import { setOutputStream, resetOutputStream } from './utils/output-streams.js';

export type CliMainArgs = {
  argv: string[];
  env: Record<string, string | undefined>;
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
  exit: (code: number) => void;
  setExitCode: (code: number) => void;
};

export async function runCliMain(args: CliMainArgs): Promise<void> {
  const { argv, env, stdout, stderr, exit, setExitCode } = args;
  
  // Configure output streams (from rd-dke.1)
  setOutputStream(stdout, stderr);
  
  // EPIPE handling will be added in rd-dke.4
  
  const debug = argv.includes('--debug');
  const jsonOutput = argv.includes('--json');
  
  try {
    await runCli(argv, { env, stdout, stderr });
  } catch (error) {
    // Handle errors with proper formatting
    // JSON error format if --json
    // Debug mode shows stack traces
    // ... (see current index.ts error handling)
    setExitCode(1);
  } finally {
    resetOutputStream();
  }
}
```

## Layer 3: src/run.ts
```typescript
import { CommanderError } from 'commander';
import { createContext } from './cli/context.js';
import { createProgram } from './cli/program.js';
import { setOutputStream } from './utils/output-streams.js';

export type RunEnv = {
  env: Record<string, string | undefined>;
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
};

export async function runCli(argv: string[], { env, stdout, stderr }: RunEnv): Promise<void> {
  setOutputStream(stdout, stderr);
  
  const isTty = 'isTTY' in stdout && (stdout as NodeJS.WriteStream).isTTY === true;
  const ctx = createContext(argv, env, isTty);
  const program = createProgram(ctx);
  
  program.configureOutput({
    writeOut: (str) => stdout.write(str),
    writeErr: (str) => stderr.write(str),
  });
  
  program.exitOverride();
  
  try {
    await program.parseAsync(argv, { from: 'user' });
  } catch (error) {
    if (error instanceof CommanderError) {
      const helpOrVersion = ['commander.helpDisplayed', 'commander.version', 'commander.help'];
      if (helpOrVersion.includes(error.code)) {
        return;
      }
    }
    throw error;
  }
}
```

## Layer 4: src/cli/program.ts (Extract from index.ts)
Move ALL Commander setup here:
```typescript
import { Command, Option } from 'commander';
import type { CliContext } from './context.js';
// ... all command imports

export function createProgram(ctx: CliContext): Command {
  const program = new Command();
  
  // Move from index.ts:
  // - program.name(), .description(), .version()
  // - Global options (--format, --json, --quiet, --verbose, --debug, --no-color, --timeout)
  // - preAction hook (but use ctx instead of globals!)
  // - All command registration
  // - createRootBookmarkShortcut() and calls
  // - createSearchShortcut() and call
  // - configureStyledHelpRecursive()
  
  return program;
}
```

## What Moves Where

| Current Location | New Location |
|-----------------|--------------|
| Global option parsing (preAction hook) | src/cli/program.ts (use ctx) |
| createRootBookmarkShortcut() | src/cli/program.ts |
| createSearchShortcut() | src/cli/program.ts |
| Command registration | src/cli/program.ts |
| configureStyledHelpRecursive() | src/cli/program.ts |
| Error handling (CommanderError) | src/cli-main.ts + src/run.ts |
| process.exit() calls | src/cli.ts only |

## Files to Update

### package.json
```json
{
  "bin": {
    "rd": "dist/cli.js",
    "rdcli": "dist/cli.js",
    "raindrop-cli": "dist/cli.js"
  }
}
```

### src/test-utils/cli.ts
Update subprocess spawn:
```typescript
// OLD:
const proc = Bun.spawn(['bun', 'src/index.ts', ...args], { ... });

// NEW:
const proc = Bun.spawn(['bun', 'src/cli.ts', ...args], { ... });
```

### src/index.ts (Keep for library exports)
```typescript
// Library exports only - CLI entry is now src/cli.ts
export { getClient } from './client.js';
export type { CliContext } from './cli/context.js';
// ... other library exports if needed
```

## Acceptance Criteria
- [ ] Create src/cli.ts as thin entry point
- [ ] Create src/cli-main.ts with CliMainArgs type and runCliMain()
- [ ] Create src/run.ts with RunEnv type and runCli()
- [ ] Create src/cli/program.ts with createProgram(ctx)
- [ ] Move ALL Commander setup from index.ts to program.ts
- [ ] preAction hook uses CliContext instead of setting globals
- [ ] Update package.json bin to point to dist/cli.js
- [ ] Update src/test-utils/cli.ts to spawn src/cli.ts
- [ ] Reduce src/index.ts to library exports only
- [ ] All integration tests pass (`bun test`)
- [ ] `bun run verify` passes
- [ ] Manual smoke test: `bun src/cli.ts --help` works

## Notes
- This is the largest task - take care with the refactoring
- The preAction hook currently sets globals (setDebugEnabled, setNoColorFlag, etc.)
  - For now, KEEP setting those globals for backward compatibility
  - Also store in ctx for new code paths
- Depends on: rd-dke.1 (stream injection), rd-dke.2 (CliContext)


