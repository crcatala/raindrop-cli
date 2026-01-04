import readline from "node:readline";

/**
 * Prompt the user for confirmation.
 * Returns true if the user enters 'y' or 'Y', false otherwise.
 */
export async function confirmAction(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} [y/N] `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}
