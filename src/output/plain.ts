import type { ColumnConfig } from "./index.js";
import { getNestedValue } from "./utils.js";

/**
 * Format a single value for plain text output.
 * Arrays are joined with ", ", other values are converted to string.
 */
function formatPlainValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return String(value);
}

/**
 * Format data as plain text with labeled fields.
 * Each record is displayed as multi-line with "Key: Value" format.
 * Records are separated by "---".
 *
 * Example output:
 * ```
 * ID:      1523405020
 * Title:   Some bookmark title
 * URL:     https://example.com
 * Tags:    tag1, tag2
 * Created: 2026-01-03
 *
 * ---
 *
 * ID:      1523401474
 * Title:   Another bookmark
 * ...
 * ```
 */
export function formatPlain<T>(data: T, columns: ColumnConfig[]): string {
  const items = Array.isArray(data) ? data : [data];

  if (items.length === 0) {
    return "";
  }

  // Find the longest header for alignment
  const maxHeaderLength = Math.max(...columns.map((c) => c.header.length));

  const formattedItems = items.map((item) => {
    const lines = columns.map((col) => {
      const value = formatPlainValue(getNestedValue(item, col.key));
      const paddedHeader = col.header.padEnd(maxHeaderLength);
      return `${paddedHeader}  ${value}`;
    });
    return lines.join("\n");
  });

  return formattedItems.join("\n\n---\n\n");
}
