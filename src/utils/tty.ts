import type { OutputFormat } from "../types/index.js";

/**
 * Check if stdout is a TTY (interactive terminal).
 * Returns false when output is piped or redirected.
 */
export function isStdoutTTY(): boolean {
  return process.stdout.isTTY ?? false;
}

/**
 * Check if stderr is a TTY (interactive terminal).
 * Returns false when stderr is piped or redirected.
 */
export function isStderrTTY(): boolean {
  return process.stderr.isTTY ?? false;
}

/**
 * Get the default output format based on TTY detection.
 * - TTY (human): table format for readability
 * - Non-TTY (piped/scripted): JSON for machine parsing
 */
export function getDefaultFormat(): OutputFormat {
  return isStdoutTTY() ? "table" : "json";
}
