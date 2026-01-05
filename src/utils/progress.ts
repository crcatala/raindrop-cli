/**
 * Combined progress utility that provides both verbose timing and spinner feedback.
 *
 * This combines the behavior of verboseTime (for --verbose mode) and withSpinner
 * (for interactive terminal feedback) into a single, unified API.
 *
 * Behavior:
 * - Verbose mode: Shows timing information (via verboseTime)
 * - Normal TTY mode: Shows spinner (via withSpinner)
 * - Non-TTY mode: Silent execution
 */

import { verboseTime } from "./debug.js";
import { withSpinner } from "./spinner.js";

/**
 * Execute an async operation with appropriate progress feedback.
 *
 * In verbose mode, shows timing information.
 * In normal TTY mode, shows a spinner.
 * In non-TTY mode (piped/scripted), runs silently.
 *
 * @param message - Message describing the operation (shown in spinner and verbose output)
 * @param operation - Async operation to execute
 * @returns The result of the operation
 *
 * @example
 * const response = await withProgress("Fetching bookmarks", () =>
 *   client.raindrop.getRaindrops(collectionId)
 * );
 */
export async function withProgress<T>(message: string, operation: () => Promise<T>): Promise<T> {
  // Spinner will auto-disable in verbose mode (via shouldShowSpinner)
  // verboseTime will auto-disable in non-verbose mode
  // So we can safely wrap both and get the right behavior
  return withSpinner({ text: `${message}...` }, () => verboseTime(message, operation));
}
