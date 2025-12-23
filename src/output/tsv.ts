import type { ColumnConfig } from "./index.js";
import { getNestedValue } from "./utils.js";

function formatTsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.join(",");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  // Escape tabs and newlines in string values
  return String(value).replace(/\t/g, "\\t").replace(/\n/g, "\\n");
}

export function formatTsv<T>(data: T, columns: ColumnConfig[]): string {
  const items = Array.isArray(data) ? data : [data];
  const lines: string[] = [];

  // Header row
  lines.push(columns.map((c) => c.header).join("\t"));

  // Data rows
  for (const item of items) {
    const row = columns.map((col) => formatTsvValue(getNestedValue(item, col.key)));
    lines.push(row.join("\t"));
  }

  return lines.join("\n");
}
