/**
 * Progress indicator utilities using ora spinner.
 *
 * Per clig.dev guidelines:
 * - "Responsive is more important than fast - print something in <100ms"
 * - "Show progress if something takes a long time"
 * - "If your program displays no output for a while, it will look broken"
 *
 * Spinner behavior:
 * - Only shows after 100ms delay (avoid flicker for fast operations)
 * - Disabled when stderr is not a TTY (piped/redirected)
 * - Disabled in verbose mode (verbose output serves same purpose)
 * - Writes to stderr to keep stdout clean for pipeable data
 */

import ora, { type Ora } from "ora";
import { isStderrTTY } from "./tty.js";
import { isVerboseEnabled } from "./debug.js";

/** Delay in ms before showing spinner (per clig.dev: respond in <100ms) */
const SPINNER_DELAY_MS = 100;

/**
 * Options for the spinner.
 */
export interface SpinnerOptions {
  /** Message to display while operation is in progress */
  text: string;
  /** Message to display on success (optional) */
  successText?: string;
  /** Message to display on failure (optional) */
  failText?: string;
}

/**
 * Check if spinner should be shown.
 * Disabled when:
 * - stderr is not a TTY (output is piped/redirected)
 * - verbose mode is enabled (verbose output replaces spinner)
 */
export function shouldShowSpinner(): boolean {
  // Don't show spinner if not a TTY
  if (!isStderrTTY()) {
    return false;
  }

  // Don't show spinner in verbose mode - verbose output serves same purpose
  if (isVerboseEnabled()) {
    return false;
  }

  return true;
}

/**
 * Execute an async operation with a spinner.
 *
 * The spinner only appears after 100ms delay to avoid flicker for fast operations.
 * If the operation completes before 100ms, no spinner is shown.
 *
 * @param options - Spinner options (text, successText, failText)
 * @param operation - Async operation to execute
 * @returns The result of the operation
 *
 * @example
 * const result = await withSpinner(
 *   { text: "Fetching bookmarks...", successText: "Done!" },
 *   () => client.getRaindrops(collectionId)
 * );
 */
export async function withSpinner<T>(
  options: SpinnerOptions | string,
  operation: () => Promise<T>
): Promise<T> {
  // Normalize options
  const opts: SpinnerOptions = typeof options === "string" ? { text: options } : options;

  // If spinner shouldn't be shown, just run the operation
  if (!shouldShowSpinner()) {
    return operation();
  }

  // Use an object to hold spinner state so TypeScript can track mutations
  const state: { spinner: Ora | null; started: boolean } = {
    spinner: null,
    started: false,
  };

  // Start spinner after delay (avoid flicker for fast operations)
  const timeoutId = setTimeout(() => {
    state.spinner = ora({
      text: opts.text,
      stream: process.stderr,
    }).start();
    state.started = true;
  }, SPINNER_DELAY_MS);

  try {
    const result = await operation();

    // Clear timeout if operation completed before spinner started
    clearTimeout(timeoutId);

    // Show success state if spinner was displayed
    if (state.started && state.spinner) {
      if (opts.successText) {
        state.spinner.succeed(opts.successText);
      } else {
        state.spinner.stop();
      }
    }

    return result;
  } catch (error) {
    // Clear timeout if operation failed before spinner started
    clearTimeout(timeoutId);

    // Show failure state if spinner was displayed
    if (state.started && state.spinner) {
      if (opts.failText) {
        state.spinner.fail(opts.failText);
      } else {
        state.spinner.stop();
      }
    }

    throw error;
  }
}

/**
 * Create a manual spinner for operations that need progress updates.
 * Useful for batch operations where you want to update the message.
 *
 * Returns null if spinner shouldn't be shown (non-TTY, verbose mode).
 *
 * @param text - Initial spinner text
 * @returns Ora spinner instance or null
 *
 * @example
 * const spinner = createSpinner("Processing bookmarks...");
 * for (let i = 0; i < items.length; i++) {
 *   spinner?.text = `Processing ${i + 1}/${items.length}...`;
 *   await processItem(items[i]);
 * }
 * spinner?.succeed("Processed all bookmarks");
 */
export function createSpinner(text: string): Ora | null {
  if (!shouldShowSpinner()) {
    return null;
  }

  return ora({
    text,
    stream: process.stderr,
  });
}
