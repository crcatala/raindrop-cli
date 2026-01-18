/**
 * CLI main orchestration - error handling and stream setup.
 *
 * This layer:
 * - Sets up output streams (for testability)
 * - Handles EPIPE errors gracefully (pipe closed by consumer)
 * - Handles top-level errors with proper formatting
 * - Coordinates between the thin shell (cli.ts) and core logic (run.ts)
 */

import { CommanderError } from "commander";
import { runCli } from "./run.js";
import { setOutputStream, resetOutputStream, outputError } from "./utils/output-streams.js";
import { isCliError } from "./utils/errors.js";

/**
 * Setup signal handlers for graceful shutdown.
 *
 * - SIGINT (Ctrl-C): First press shows message, second force exits with code 130
 * - SIGTERM: Clean exit with code 143 (128 + 15)
 *
 * Exit codes follow standard Unix conventions:
 * - 130 = 128 + SIGINT (2)
 * - 143 = 128 + SIGTERM (15)
 */
export function setupSignalHandlers(
  stderr: NodeJS.WritableStream,
  exit: (code: number) => void
): void {
  let interrupted = false;

  process.on("SIGINT", () => {
    if (interrupted) {
      stderr.write("\nForce exiting...\n");
      exit(130);
      return;
    }
    interrupted = true;
    stderr.write("\nInterrupted. Press Ctrl-C again to force exit.\n");
    setTimeout(() => exit(130), 3000);
  });

  process.on("SIGTERM", () => {
    stderr.write("\nTerminated.\n");
    exit(143);
  });
}

/**
 * Handle EPIPE errors gracefully (pipe closed by consumer like head/grep).
 * This is normal when piping to commands that don't consume all output.
 */
export function handlePipeErrors(
  stream: NodeJS.WritableStream,
  exit: (code: number) => void
): void {
  stream.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EPIPE") {
      exit(0); // Normal exit when pipe closes
      return;
    }
    throw error; // Re-throw other errors
  });
}

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

  // Setup signal handlers for graceful shutdown
  setupSignalHandlers(stderr, exit);

  // Handle EPIPE errors gracefully (e.g., when piping to head/grep)
  handlePipeErrors(stdout, exit);
  handlePipeErrors(stderr, exit);

  // Configure output streams (from rd-dke.1)
  setOutputStream(stdout, stderr);

  const debug = argv.includes("--debug") || argv.includes("-d");
  const jsonOutput = argv.includes("--json");

  try {
    await runCli(argv, { env, stdout, stderr });
  } catch (error) {
    // CommanderError already printed its message via configureOutput
    // Use exit code 2 for usage errors per clig.dev conventions
    // (Commander's default is 1, but we follow clig.dev's convention of 2)
    if (error instanceof CommanderError) {
      setExitCode(2);
      return;
    }

    // Determine exit code: use CliError.exitCode if available, otherwise 1
    // Exit codes follow clig.dev: 0=success, 1=runtime error, 2=usage error
    const exitCode = isCliError(error) ? error.exitCode : 1;

    // Handle structured CliErrors with JSON output
    if (jsonOutput && isCliError(error)) {
      outputError(JSON.stringify(error.toJSON(), null, 2));
      setExitCode(exitCode);
      return;
    }

    // Handle other errors with proper formatting
    if (jsonOutput) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorOutput = JSON.stringify({ error: errorMessage }, null, 2);
      outputError(errorOutput);
    } else if (debug && error instanceof Error && error.stack) {
      outputError(error.stack);
    } else {
      const message = error instanceof Error ? error.message : String(error);
      outputError(message);
    }
    setExitCode(exitCode);
  } finally {
    resetOutputStream();
  }
}
