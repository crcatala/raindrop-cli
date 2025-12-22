import type { ColumnConfig } from "./index.js";

function getNestedValue(obj: unknown, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current;
}

function formatValue(value: unknown): string {
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
    const row = columns.map((col) => formatValue(getNestedValue(item, col.key)));
    lines.push(row.join("\t"));
  }

  return lines.join("\n");
}
