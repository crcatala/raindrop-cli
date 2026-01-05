import { UsageError } from "./errors.js";

/**
 * Shared validation utilities for CLI arguments and options.
 * These are extracted to enable fast unit testing without subprocess spawning.
 */

/**
 * Parse and validate a limit parameter.
 * @param value - String value from CLI
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @returns Parsed number
 * @throws UsageError if invalid
 */
export function parseLimit(value: string, min: number = 1, max: number = 50): number {
  const num = parseInt(value, 10);
  if (isNaN(num) || num < min || num > max) {
    throw new UsageError(`Invalid limit: "${value}". Use a number between ${min} and ${max}.`);
  }
  return num;
}

/**
 * Parse and validate a page parameter.
 * @param value - String value from CLI
 * @returns Parsed number (0-indexed)
 * @throws UsageError if invalid
 */
export function parsePage(value: string): number {
  const num = parseInt(value, 10);
  if (isNaN(num) || num < 0) {
    throw new UsageError(`Invalid page: "${value}". Use a non-negative number.`);
  }
  return num;
}

/**
 * Parse and validate a bookmark ID.
 * @param value - String value from CLI
 * @returns Parsed positive integer
 * @throws UsageError if invalid
 */
export function parseBookmarkId(value: string): number {
  const num = parseInt(value, 10);
  if (isNaN(num) || num < 1) {
    throw new UsageError(`Invalid bookmark ID: "${value}". Use a positive number.`);
  }
  return num;
}
