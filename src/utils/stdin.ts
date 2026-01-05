/**
 * Utilities for reading input from stdin.
 */

/**
 * Check if stdin has data available (is being piped to).
 * Returns true if stdin is not a TTY (i.e., data is being piped).
 */
export function hasStdinData(): boolean {
  return !process.stdin.isTTY;
}

/**
 * Read all data from stdin and return as a string.
 * Returns empty string if stdin is a TTY (no piped data).
 */
export async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) {
    return "";
  }

  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    process.stdin.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    process.stdin.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf-8"));
    });

    process.stdin.on("error", reject);
  });
}

/**
 * Parse IDs from a string input.
 * Accepts IDs separated by newlines, commas, or whitespace.
 * Returns an array of valid positive integers.
 *
 * @param input - Raw string input containing IDs
 * @returns Array of parsed integer IDs
 * @throws Error if any ID is invalid (not a positive integer)
 */
export function parseIds(input: string): number[] {
  const parts = input
    .split(/[\n,\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const ids: number[] = [];
  const invalid: string[] = [];

  for (const part of parts) {
    const id = parseInt(part, 10);
    if (isNaN(id) || id <= 0 || String(id) !== part) {
      invalid.push(part);
    } else {
      ids.push(id);
    }
  }

  if (invalid.length > 0) {
    throw new Error(`Invalid bookmark IDs: ${invalid.join(", ")}. IDs must be positive integers.`);
  }

  return ids;
}

/**
 * Read and parse IDs from stdin.
 * Combines readStdin() and parseIds().
 *
 * @returns Array of parsed integer IDs, or empty array if no stdin data
 */
export async function readIdsFromStdin(): Promise<number[]> {
  const input = await readStdin();
  if (!input.trim()) {
    return [];
  }
  return parseIds(input);
}
