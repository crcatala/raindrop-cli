---
id: rd-dke.2
status: closed
deps: []
links: []
created: 2026-01-09T19:52:41.847039019-08:00
type: task
priority: 2
parent: rd-dke
---
# Create CliContext type and context.ts module

Create a unified CliContext object that consolidates scattered global state.

## Current State
State is scattered across multiple modules:
- `utils/tty.ts`: noColorFlag, isTTY(), shouldUseColors(), getDefaultFormat()
- `utils/debug.ts`: debugEnabled, verboseEnabled
- `utils/colors.ts`: color functions (bold, dim, cyan, yellow, green, red)
- Commands read globals directly

## Target State

### Create src/cli/context.ts
```typescript
import type { OutputFormat } from '../types/index.js';
import { colors as colorFns } from '../utils/colors.js';

export type OutputConfig = {
  format: OutputFormat | undefined;  // undefined = auto-detect
  color: boolean;
  verbose: boolean;
  debug: boolean;
  quiet: boolean;
};

export type CliContext = {
  isTty: boolean;
  output: OutputConfig;
  colors: {
    bold: (t: string) => string;
    dim: (t: string) => string;
    cyan: (t: string) => string;
    yellow: (t: string) => string;
    green: (t: string) => string;
    red: (t: string) => string;
  };
  prefix: {
    ok: string;
    warn: string;
    err: string;
    info: string;
  };
};

/**
 * Create CLI context from argv and environment.
 * 
 * @param argv - Command line arguments (without node/script path)
 * @param env - Environment variables
 * @param isTty - Whether stdout is a TTY (passed explicitly for testability)
 */
export function createContext(
  argv: string[],
  env: Record<string, string | undefined>,
  isTty: boolean = process.stdout.isTTY ?? false
): CliContext {
  const noColor = argv.includes('--no-color') || env.NO_COLOR !== undefined;
  const debug = argv.includes('--debug') || argv.includes('-d');
  const verbose = argv.includes('--verbose') || argv.includes('-v') || debug;
  const quiet = argv.includes('--quiet') || argv.includes('-q');
  
  // Determine format from argv
  let format: OutputFormat | undefined;
  if (argv.includes('--json')) format = 'json';
  else if (argv.includes('--table')) format = 'table';
  else if (argv.includes('--plain')) format = 'plain';
  else if (argv.includes('--tsv')) format = 'tsv';
  // Check --format <value>
  const formatIdx = argv.findIndex(a => a === '--format');
  if (formatIdx !== -1 && argv[formatIdx + 1]) {
    format = argv[formatIdx + 1] as OutputFormat;
  }

  const useColor = isTty && !noColor;

  // Wrap color functions to respect color setting
  const wrapColor = (fn: (s: string) => string) => 
    (text: string) => useColor ? fn(text) : text;

  return {
    isTty,
    output: { format, color: useColor, verbose, debug, quiet },
    colors: {
      bold: wrapColor(colorFns.bold),
      dim: wrapColor(colorFns.dim),
      cyan: wrapColor(colorFns.cyan),
      yellow: wrapColor(colorFns.yellow),
      green: wrapColor(colorFns.green),
      red: wrapColor(colorFns.red),
    },
    prefix: useColor
      ? { ok: '✓ ', warn: '⚠ ', err: '✗ ', info: 'ℹ ' }
      : { ok: '[OK] ', warn: '[WARN] ', err: '[ERR] ', info: '[INFO] ' },
  };
}
```

### Create src/cli/index.ts
```typescript
export { createContext, type CliContext, type OutputConfig } from './context.js';
```

## Acceptance Criteria
- [ ] Create `src/cli/` directory
- [ ] Create `src/cli/context.ts` with CliContext type and createContext()
- [ ] createContext() accepts `isTty` as third parameter (default: process.stdout.isTTY)
- [ ] createContext() parses --json, --table, --plain, --tsv, --format from argv
- [ ] createContext() parses --verbose/-v, --debug/-d, --quiet/-q from argv
- [ ] createContext() respects NO_COLOR env and --no-color flag
- [ ] Color functions return plain text when color is disabled
- [ ] Create `src/cli/index.ts` exporting context module
- [ ] Add unit tests in `src/cli/context.test.ts`:
  - Test format detection from argv
  - Test NO_COLOR disables colors
  - Test --no-color disables colors
  - Test --debug implies verbose
  - Test isTty=false disables colors
- [ ] Run `bun run verify` passes

## Notes
- This is additive - existing globals in utils/debug.ts and utils/tty.ts continue to work
- Commands will be migrated to use context in rd-dke.3
- Pattern reference: research-learning-agent/cli-starter/src/cli/context.ts


