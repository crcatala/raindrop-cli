import readline from "node:readline";

/**
 * Error thrown when attempting to prompt in a non-interactive context.
 */
export class NonInteractiveError extends Error {
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
 * Prompt the user for confirmation.
 * Returns true if the user enters 'y', 'yes', 'Y', or 'YES', false otherwise.
 * Returns false if the user sends EOF (Ctrl+D).
 *
 * @throws {NonInteractiveError} if stdin is not a TTY (non-interactive context)
 */
export async function confirmAction(message: string): Promise<boolean> {
  if (!isStdinTTY()) {
    throw new NonInteractiveError(
      "Cannot prompt for confirmation in non-interactive mode. Use --force to skip confirmation."
    );
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    // Handle Ctrl+D (EOF) - treat as "no"
    rl.on("close", () => {
      resolve(false);
    });

    rl.question(`${message} [y/N] `, (answer) => {
      rl.close();
      const normalized = answer.toLowerCase().trim();
      resolve(normalized === "y" || normalized === "yes");
    });
  });
}
