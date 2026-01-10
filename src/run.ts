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

import { Command, CommanderError } from "commander";
import { createContext } from "./cli/context.js";
import { createProgram } from "./cli/program.js";
import { setOutputStream } from "./utils/output-streams.js";

export type RunEnv = {
  env: Record<string, string | undefined>;
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
};

/**
 * Recursively configure output streams and exit override on all commands.
 * Commander's configureOutput and exitOverride only apply to the command
 * they're called on, not subcommands. This ensures consistent behavior
 * when users invoke help on any subcommand (e.g., `rd bookmarks --help`).
 */
function configureCommandRecursive(
  cmd: Command,
  stdout: NodeJS.WritableStream,
  stderr: NodeJS.WritableStream
): void {
  cmd.configureOutput({
    writeOut: (str) => stdout.write(str),
    writeErr: (str) => stderr.write(str),
  });
  cmd.exitOverride();

  for (const subCmd of cmd.commands) {
    configureCommandRecursive(subCmd, stdout, stderr);
  }
}

export async function runCli(argv: string[], { env, stdout, stderr }: RunEnv): Promise<void> {
  setOutputStream(stdout, stderr);

  const isTty = "isTTY" in stdout && (stdout as NodeJS.WriteStream).isTTY === true;
  const ctx = createContext(argv, env, isTty);
  const program = createProgram(ctx);

  // Configure all commands recursively for proper stream handling and exit override
  configureCommandRecursive(program, stdout, stderr);

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
