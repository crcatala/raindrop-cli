import Table from "cli-table3";
import type { ColumnConfig } from "./index.js";
import { formatValue, getNestedValue } from "./utils.js";

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
