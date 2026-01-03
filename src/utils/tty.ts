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
 * - TTY (human): plain format for full content with labeled fields
 * - Non-TTY (piped/scripted): JSON for machine parsing
 */
export function getDefaultFormat(): OutputFormat {
  return isStdoutTTY() ? "plain" : "json";
}

// Track whether --no-color flag was passed
let noColorFlag = false;

/**
 * Set the --no-color flag state (called from CLI parser).
 */
export function setNoColorFlag(value: boolean): void {
  noColorFlag = value;
}

/**
 * Determine if colored output should be used.
 *
 * Per https://no-color.org/ and clig.dev, colors are disabled when:
 * - --no-color flag is passed
 * - NO_COLOR env var is set (any non-empty value)
 * - TERM=dumb
 * - stdout is not a TTY (piped/redirected)
 */
export function shouldUseColor(): boolean {
  // --no-color flag takes precedence
  if (noColorFlag) {
    return false;
  }

  // NO_COLOR env var (standard: https://no-color.org/)
  if (process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== "") {
    return false;
  }

  // TERM=dumb indicates a terminal that doesn't support colors
  if (process.env.TERM === "dumb") {
    return false;
  }

  // No colors when not a TTY (piped or redirected)
  if (!isStdoutTTY()) {
    return false;
  }

  return true;
}
