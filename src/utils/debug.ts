/**
 * Debug and verbose output utilities.
 *
 * Per clig.dev guidelines:
 * - --debug: Show stack traces, internal state, detailed error info
 * - --verbose: Show operational details (what's happening, timing, API calls)
 *
 * Both output to stderr to keep stdout clean for data.
 */

import { outputMessage } from "./output-streams.js";

// Global state for debug/verbose flags
let debugEnabled = false;
let verboseEnabled = false;

/**
 * Set the debug flag (typically from CLI --debug option)
 */
export function setDebugEnabled(enabled: boolean): void {
  debugEnabled = enabled;
}

/**
 * Set the verbose flag (typically from CLI --verbose option)
 */
export function setVerboseEnabled(enabled: boolean): void {
  verboseEnabled = enabled;
}

/**
 * Check if debug mode is enabled
 */
export function isDebugEnabled(): boolean {
  return debugEnabled;
}

/**
 * Check if verbose mode is enabled
 */
export function isVerboseEnabled(): boolean {
  return verboseEnabled;
}

/**
 * Output debug information (stack traces, internal state).
 * Only outputs when --debug flag is set.
 */
export function debug(message: string, data?: unknown): void {
  if (!debugEnabled) return;

  const prefix = "[debug]";
  outputMessage(`${prefix} ${message}`);

  if (data !== undefined) {
    const formatted = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    // Indent each line for readability
    const indented = formatted
      .split("\n")
      .map((line) => `${prefix}   ${line}`)
      .join("\n");
    outputMessage(indented);
  }
}

/**
 * Output verbose operational information (API calls, timing).
 * Only outputs when --verbose flag is set.
 */
export function verbose(message: string): void {
  if (!verboseEnabled) return;
  outputMessage(`→ ${message}`);
}

/**
 * Time an async operation and log it (verbose mode only).
 * Returns the result of the operation.
 */
export async function verboseTime<T>(label: string, operation: () => Promise<T>): Promise<T> {
  if (!verboseEnabled) {
    return operation();
  }

  verbose(`${label}...`);
  const start = performance.now();

  try {
    const result = await operation();
    const elapsed = performance.now() - start;
    verbose(`${label} completed in ${elapsed.toFixed(0)}ms`);
    return result;
  } catch (error) {
    const elapsed = performance.now() - start;
    verbose(`${label} failed after ${elapsed.toFixed(0)}ms`);
    throw error;
  }
}

/**
 * Reset debug/verbose state (useful for testing)
 */
export function resetDebugState(): void {
  debugEnabled = false;
  verboseEnabled = false;
}
