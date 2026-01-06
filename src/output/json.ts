/**
 * Format data as JSON.
 * Data should be clean (no ANSI codes) - styling is applied only by terminal formatters.
 */
export function formatJson<T>(data: T): string {
  return JSON.stringify(data, null, 2);
}
