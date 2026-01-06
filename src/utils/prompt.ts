import readline from "node:readline";
import type { Interface as ReadlineInterface } from "node:readline";
import { UsageError } from "./errors.js";

/**
 * Error thrown when attempting to prompt in a non-interactive context.
 * Extends UsageError because it's a usage issue (user needs --force in non-interactive mode).
 */
export class NonInteractiveError extends UsageError {
  constructor(message: string) {
    super(message);
    this.name = "NonInteractiveError";
  }
}

/**
 * Check if stdin is a TTY (interactive terminal).
 * Returns false when input is piped or redirected.
 */
export function isStdinTTY(): boolean {
  return process.stdin.isTTY ?? false;
}

/**
 * Options for confirmAction, primarily for testing.
 */
export interface ConfirmActionOptions {
  /** Custom readline interface (for testing) */
  rl?: ReadlineInterface;
  /** Skip TTY check (for testing) */
  skipTTYCheck?: boolean;
}

/**
 * Prompt the user for confirmation.
 * Returns true if the user enters 'y', 'yes', 'Y', or 'YES', false otherwise.
 * Returns false if the user sends EOF (Ctrl+D).
 *
 * @throws {NonInteractiveError} if stdin is not a TTY (non-interactive context)
 */
export async function confirmAction(
  message: string,
  options: ConfirmActionOptions = {}
): Promise<boolean> {
  const { rl: customRl, skipTTYCheck = false } = options;

  if (!skipTTYCheck && !isStdinTTY()) {
    throw new NonInteractiveError(
      "Cannot prompt for confirmation in non-interactive mode. Use --force to skip confirmation."
    );
  }

  const rl =
    customRl ??
    readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

  return new Promise((resolve) => {
    let answered = false;

    // Handle Ctrl+D (EOF) - treat as "no"
    rl.on("close", () => {
      if (!answered) {
        resolve(false);
      }
    });

    rl.question(`${message} [y/N] `, (answer) => {
      answered = true;
      const normalized = answer.toLowerCase().trim();
      const confirmed = normalized === "y" || normalized === "yes";
      resolve(confirmed);
      rl.close();
    });
  });
}
