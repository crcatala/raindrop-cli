#!/usr/bin/env node
/**
 * CLI entry point - thin shell that injects process.* dependencies.
 *
 * This is the executable entry point (package.json bin).
 * All it does is inject process.* dependencies and call runCliMain().
 *
 * Why this thin layer?
 * - Makes the CLI testable without spawning subprocesses
 * - Keeps process.* access in one place
 * - Enables dependency injection for streams, exit, etc.
 */

import { runCliMain } from "./cli-main.js";

void runCliMain({
  argv: process.argv.slice(2),
  env: process.env,
  stdout: process.stdout,
  stderr: process.stderr,
  exit: (code) => process.exit(code),
  setExitCode: (code) => {
    process.exitCode = code;
  },
}).catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(message + "\n");
  process.exitCode = 1;
});
