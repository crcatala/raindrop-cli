/**
 * CLI main orchestration - error handling and stream setup.
 *
 * This layer:
 * - Sets up output streams (for testability)
 * - Handles top-level errors with proper formatting
 * - Coordinates between the thin shell (cli.ts) and core logic (run.ts)
 *
 * EPIPE handling will be added in rd-dke.4.
 */

import { CommanderError } from "commander";
import { runCli } from "./run.js";
import { setOutputStream, resetOutputStream, outputError } from "./utils/output-streams.js";

export type CliMainArgs = {
  argv: string[];
  env: Record<string, string | undefined>;
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
  exit: (code: number) => void;
  setExitCode: (code: number) => void;
};

export async function runCliMain(args: CliMainArgs): Promise<void> {
  const { argv, env, stdout, stderr, setExitCode } = args;

  // Configure output streams (from rd-dke.1)
  setOutputStream(stdout, stderr);

  // EPIPE handling will be added in rd-dke.4

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
    setExitCode(1);
  } finally {
    resetOutputStream();
  }
}
