/**
 * Timeout configuration for network operations.
 *
 * Per clig.dev guidelines:
 * - Allow network timeouts to be configured
 * - Have a reasonable default so it doesn't hang forever
 *
 * Precedence: --timeout flag > RDCLI_TIMEOUT env var > default (30s)
 */

// Default timeout in seconds
export const DEFAULT_TIMEOUT_SECONDS = 30;

// Minimum timeout in seconds (to prevent unreasonably short timeouts)
export const MIN_TIMEOUT_SECONDS = 1;

// Maximum timeout in seconds (to prevent excessively long timeouts)
export const MAX_TIMEOUT_SECONDS = 300; // 5 minutes

// Global state for timeout (set from CLI flag)
let timeoutOverride: number | null = null;

/**
 * Set the timeout from CLI flag (in seconds)
 */
export function setTimeoutSeconds(seconds: number): void {
  timeoutOverride = seconds;
}

/**
 * Get the configured timeout in seconds.
 * Precedence: CLI flag > env var > default
 */
export function getTimeoutSeconds(): number {
  // CLI flag takes precedence
  if (timeoutOverride !== null) {
    return clampTimeout(timeoutOverride);
  }

  // Check environment variable
  const envValue = process.env["RDCLI_TIMEOUT"];
  if (envValue !== undefined && envValue !== "") {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed)) {
      return clampTimeout(parsed);
    }
  }

  return DEFAULT_TIMEOUT_SECONDS;
}

/**
 * Get the configured timeout in milliseconds (for axios).
 */
export function getTimeoutMs(): number {
  return getTimeoutSeconds() * 1000;
}

/**
 * Clamp timeout to valid range.
 */
function clampTimeout(seconds: number): number {
  if (seconds < MIN_TIMEOUT_SECONDS) {
    return MIN_TIMEOUT_SECONDS;
  }
  if (seconds > MAX_TIMEOUT_SECONDS) {
    return MAX_TIMEOUT_SECONDS;
  }
  return seconds;
}

/**
 * Validate timeout value and return error message if invalid.
 * Returns null if valid.
 */
export function validateTimeout(value: string): string | null {
  const parsed = parseInt(value, 10);

  if (isNaN(parsed)) {
    return `Invalid timeout value: "${value}". Must be a number.`;
  }

  if (parsed < MIN_TIMEOUT_SECONDS) {
    return `Timeout must be at least ${MIN_TIMEOUT_SECONDS} second.`;
  }

  if (parsed > MAX_TIMEOUT_SECONDS) {
    return `Timeout must be at most ${MAX_TIMEOUT_SECONDS} seconds (5 minutes).`;
  }

  return null;
}

/**
 * Reset timeout state (useful for testing)
 */
export function resetTimeoutState(): void {
  timeoutOverride = null;
}
