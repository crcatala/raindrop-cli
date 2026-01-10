/**
 * Core CLI logic - Commander program execution.
 *
 * This layer:
 * - Creates the CLI context
 * - Sets up the Commander program
 * - Parses arguments and executes commands
 * - Handles Commander-specific errors (help/version display)
 *
 * This is the primary entry point for unit testing with mocked streams.
 */

import { CommanderError } from "commander";
import { createContext } from "./cli/context.js";
import { createProgram } from "./cli/program.js";
import { setOutputStream } from "./utils/output-streams.js";

export type RunEnv = {
  env: Record<string, string | undefined>;
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
};

export async function runCli(argv: string[], { env, stdout, stderr }: RunEnv): Promise<void> {
  setOutputStream(stdout, stderr);

  const isTty = "isTTY" in stdout && (stdout as NodeJS.WriteStream).isTTY === true;
  const ctx = createContext(argv, env, isTty);
  const program = createProgram(ctx);

  program.configureOutput({
    writeOut: (str) => stdout.write(str),
    writeErr: (str) => stderr.write(str),
  });

  program.exitOverride();

  try {
    await program.parseAsync(argv, { from: "user" });
  } catch (error) {
    if (error instanceof CommanderError) {
      const helpOrVersion = ["commander.helpDisplayed", "commander.version", "commander.help"];
      if (helpOrVersion.includes(error.code)) {
        return; // Normal exit for help/version
      }
    }
    throw error;
  }
}
