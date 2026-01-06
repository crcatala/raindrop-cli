# Commander.js Best Practices

Hard-won lessons from building CLI tools with [Commander.js](https://github.com/tj/commander.js).

## Error Handling with `exitOverride()`

### The Pattern

When using `exitOverride()`, Commander throws errors instead of calling `process.exit()`. This is useful for testing and custom error handling:

```typescript
program
  .exitOverride()
  .parse();
```

### The Gotcha

With `exitOverride()`, Commander **outputs errors before throwing**. If you catch the error and output it again, users see duplicate messages:

```typescript
// ❌ BAD - causes duplicate error messages
try {
  program.exitOverride().parse();
} catch (err) {
  if (err instanceof CommanderError) {
    console.error(err.message);  // Duplicate! Commander already printed this
    process.exit(2);
  }
}
```

### The Solution

Let Commander handle error output. In your catch block, just manage exit codes:

```typescript
// ✅ GOOD - Commander handles output, we handle exit codes
try {
  program.exitOverride().parse();
} catch (err) {
  if (err instanceof CommanderError) {
    // Commander already output the error/help
    const isHelpOrVersion =
      err.code === "commander.help" ||
      err.code === "commander.helpDisplayed" ||
      err.code === "commander.version";
    process.exit(isHelpOrVersion ? 0 : 2);
  }
  throw err;
}
```

## Settings Inheritance

### The Gotcha

`configureOutput()` and other settings **only inherit** when using `.command()` to create subcommands:

```typescript
// ✅ Settings ARE inherited
program
  .configureOutput({ /* ... */ })
  .command('sub')  // inherits parent's configureOutput
  .action(() => {});

// ❌ Settings are NOT inherited
const sub = new Command('sub');
program.addCommand(sub);  // sub does NOT inherit configureOutput
```

### Why This Matters

If you use `new Command()` + `addCommand()` (common for organizing code into separate files), each command needs its own configuration—or you need to handle everything at the top level.

### Source Reference

From Commander's source code:
- `.command()` calls `copyInheritedSettings()` → settings inherited
- `.addCommand()` does NOT call `copyInheritedSettings()` → no inheritance

## The `configureOutput()` API

### Available Options

```typescript
program.configureOutput({
  // Where to write help output (default: stdout)
  writeOut: (str) => process.stdout.write(str),
  
  // Where to write error output (default: stderr)
  writeErr: (str) => process.stderr.write(str),
  
  // Error message formatter - receives (str, write) and should call write()
  outputError: (str, write) => write(str),
  
  // Terminal width for help formatting
  getOutHelpWidth: () => process.stdout.columns,
  getErrHelpWidth: () => process.stderr.columns,
});
```

### The `outputError` Gotcha

`outputError` is a **formatter**, not a suppressor. It receives `(str, write)` and should call `write()`:

```typescript
// ❌ BAD - swallows all errors silently (code smell!)
program.configureOutput({
  outputError: () => {},
});

// ✅ GOOD - formats errors (e.g., add color)
program.configureOutput({
  outputError: (str, write) => write(chalk.red(str)),
});
```

### The `writeErr` Gotcha

Don't suppress `writeErr` thinking it only affects errors—Commander also uses it for **help output** when no subcommand is provided:

```typescript
// ❌ BAD - suppresses help output when user runs `cli` with no args!
program.configureOutput({
  writeErr: () => {},
});
```

When a user runs your CLI without a subcommand, Commander internally calls `help({ error: true })`, which writes to `writeErr`.

## Help Output Behavior

### Explicit vs Implicit Help

| Scenario | Method Called | Output Stream | Exit Code |
|----------|--------------|---------------|-----------|
| `cli --help` | `help()` | stdout via `writeOut` | 0 |
| `cli` (no args, has subcommands) | `help({ error: true })` | stderr via `writeErr` | 1* |

*Exit code is 1 by default, but with `exitOverride()` you control it.

### Why Help Goes to stderr

When the user didn't explicitly ask for help but needs it (missing required subcommand), Commander treats it as an error condition. This is intentional—the help is going to stderr because something went wrong (user didn't provide required input).

## Recommended Architecture

### For Simple CLIs

Let Commander handle everything:

```typescript
import { program, CommanderError } from "commander";

program
  .name("mycli")
  .exitOverride();

program.command("foo").action(() => { /* ... */ });
program.command("bar").action(() => { /* ... */ });

try {
  program.parse();
} catch (err) {
  if (err instanceof CommanderError) {
    const isHelp = ["commander.help", "commander.helpDisplayed", "commander.version"].includes(err.code);
    process.exit(isHelp ? 0 : 2);
  }
  throw err;
}
```

### For CLIs with Separate Command Files

If you organize commands in separate files using `new Command()` + `addCommand()`:

1. **Don't** try to configure output on each subcommand
2. **Do** handle all error output at the top level
3. **Do** use `exitOverride()` on subcommands if you want errors to bubble up

```typescript
// commands/foo.ts
export function createFooCommand() {
  return new Command("foo")
    .exitOverride()  // Let errors bubble to main
    .action(() => { /* ... */ });
}

// index.ts
program.addCommand(createFooCommand());
// Handle all errors here at the top level
```

## Testing Tips

### Test for Duplicate Errors

Always test that error messages appear exactly once:

```typescript
test("error shows single message (no duplicates)", async () => {
  const result = await runCli(["invalid-command"]);
  
  const errorMatches = result.stderr.match(/error:/gi) || [];
  expect(errorMatches.length).toBe(1);
});
```

### Test No-Args Behavior

```typescript
test("shows help when invoked with no arguments", async () => {
  const result = await runCli([]);
  
  // Help goes to stderr when no subcommand provided
  expect(result.stderr).toContain("Usage:");
  expect(result.exitCode).toBe(0);  // or whatever you set
});
```

## Summary

| Do | Don't |
|----|-------|
| Let Commander handle error output | Suppress `outputError` with `() => {}` |
| Handle only exit codes in catch block | Re-output `CommanderError.message` |
| Use `.command()` if you need inherited settings | Expect `addCommand()` to inherit settings |
| Test for single error messages | Assume error output works correctly |
| Keep `writeErr` intact | Suppress `writeErr` (breaks implicit help) |

## References

- [Commander.js README](https://github.com/tj/commander.js)
- [configureOutput PR #1387](https://github.com/tj/commander.js/pull/1387)
- [clig.dev - CLI Guidelines](https://clig.dev/) (exit code conventions)
