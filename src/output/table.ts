import Table from "cli-table3";
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
    return value.join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

export function formatTable<T>(data: T, columns: ColumnConfig[]): string {
  const table = new Table({
    head: columns.map((c) => c.header),
    colWidths: columns.map((c) => c.width ?? null),
  });

  const items = Array.isArray(data) ? data : [data];

  for (const item of items) {
    const row = columns.map((col) => formatValue(getNestedValue(item, col.key)));
    table.push(row);
  }

  return table.toString();
}
