# Test Refactoring Handoff

## Context

We're speeding up the test suite by converting subprocess-based tests to fast unit tests. Each subprocess test takes ~200ms due to CLI startup overhead. By testing command structure and validation logic directly, we reduce this to ~1ms per test.

## Completed

- ✅ `highlights` - Unit tests + integration smoke tests
- ✅ `tags` - Unit tests + integration smoke tests
- ✅ `src/utils/validation.ts` - Shared validators with tests

## Remaining Commands

| Command | File | Tests | Est. Time Saved |
|---------|------|-------|-----------------|
| bookmarks | `src/commands/bookmarks.test.ts` | 52 | ~10s |
| collections | `src/commands/collections.test.ts` | 10 | ~2s |
| trash | `src/commands/trash.test.ts` | 7 | ~1.4s |

## Pattern to Follow

### 1. File Naming Convention

- `*.test.ts` → Unit tests (fast, in-process)
- `*.integration.test.ts` → Subprocess smoke tests (~3-5 per command)
- `*.live.test.ts` → Live API tests (unchanged)

### 2. What Goes Where

**Unit tests (`*.test.ts`):**
- Command structure (name, description, subcommands)
- Help text via `command.helpInformation()`
- Options existence and defaults
- Argument requirements

**Integration tests (`*.integration.test.ts`):**
- One `--help` exits 0 test
- One auth failure test
- One validation error exits with code 2 test
- `--force` flag requirement tests (for destructive commands)

**Shared validation (`src/utils/validation.ts`):**
- Add any new validators here
- Already has: `parseLimit`, `parsePage`, `parseBookmarkId`
- Already has: `parseCollectionId` (in `collections.ts`, tested in `validation.test.ts`)

### 3. Step-by-Step for Each Command

```bash
# 1. Read the existing test file
cat src/commands/<command>.test.ts

# 2. Read the command implementation to understand structure
cat src/commands/<command>.ts

# 3. Create unit test file (will replace existing)
# - Import createXCommand from the command file
# - Test command.name(), command.description()
# - Test subcommands via command.commands.find()
# - Test help via command.helpInformation()
# - Test options via command.options.find()
# - Test arguments via command.registeredArguments

# 4. Create integration test file
# - Keep only 3-5 smoke tests that need real subprocess
# - Auth failures, exit codes, --force requirements

# 5. Extract any new validators to src/utils/validation.ts
# - If command has inline validation (parseInt, etc.)
# - Add tests to validation.test.ts

# 6. Update command to use shared validators (if applicable)

# 7. Run tests to verify
bun test src/commands/<command>.test.ts src/commands/<command>.integration.test.ts
```

### 4. Example: Unit Test Structure

```typescript
import { describe, test, expect } from "bun:test";
import { createXCommand } from "./x.js";

describe("x command structure", () => {
  const cmd = createXCommand();

  describe("command hierarchy", () => {
    test("has correct name and description", () => {
      expect(cmd.name()).toBe("x");
      expect(cmd.description()).toContain("...");
    });

    test("has subcommand y", () => {
      const sub = cmd.commands.find((c) => c.name() === "y");
      expect(sub).toBeDefined();
    });
  });

  describe("help text", () => {
    test("x --help shows expected content", () => {
      const help = cmd.helpInformation();
      expect(help).toContain("...");
    });
  });

  describe("subcommand options", () => {
    const sub = cmd.commands.find((c) => c.name() === "y");

    test("has --option flag", () => {
      const opt = sub?.options.find((o) => o.long === "--option");
      expect(opt).toBeDefined();
    });

    test("requires argument", () => {
      const args = sub?.registeredArguments ?? [];
      expect(args.length).toBe(1);
      expect(args[0]?.required).toBe(true);
    });
  });
});
```

### 5. Example: Integration Smoke Tests

```typescript
import { describe, test, expect } from "bun:test";
import { runCli } from "../test-utils/index.js";

describe("x CLI integration", () => {
  test("x --help exits 0", async () => {
    const result = await runCli(["x", "--help"]);
    expect(result.exitCode).toBe(0);
  });

  test("x without auth fails gracefully", async () => {
    const result = await runCli(["x", "action"], {
      env: { RAINDROP_TOKEN: "" },
    });
    expect(result.exitCode).toBe(1);
  });

  test("validation errors exit with code 2", async () => {
    const result = await runCli(["x", "action", "invalid"], {
      env: { RAINDROP_TOKEN: "fake" },
    });
    expect(result.exitCode).toBe(2);
  });
});
```

## Validation Functions to Potentially Extract

Check these commands for inline validation that could move to `validation.ts`:

- **bookmarks**: URL validation, sort option validation, date format validation
- **collections**: Possibly none (uses `parseCollectionId`)
- **trash**: Possibly none

## Testing Your Changes

```bash
# Run specific command tests
bun test src/commands/<command>.test.ts src/commands/<command>.integration.test.ts

# Run all tests to ensure no regressions
bun test

# Check timing improvement
bun test src/commands/<command> 2>&1 | grep "Ran"
```

## TypeScript Notes

When accessing array elements after a length check, use optional chaining to satisfy TypeScript:

```typescript
// ❌ TypeScript error: Object is possibly 'undefined'
expect(args[0].name()).toBe("x");

// ✅ Correct
expect(args[0]?.name()).toBe("x");
```

## Definition of Done

- [ ] `bookmarks.test.ts` converted to unit tests
- [ ] `bookmarks.integration.test.ts` created with smoke tests
- [ ] `collections.test.ts` converted to unit tests
- [ ] `collections.integration.test.ts` created with smoke tests
- [ ] `trash.test.ts` converted to unit tests
- [ ] `trash.integration.test.ts` created with smoke tests
- [ ] Any new validators extracted to `validation.ts` with tests
- [ ] All tests pass: `bun test`
- [ ] TypeScript passes: `bun run typecheck`
