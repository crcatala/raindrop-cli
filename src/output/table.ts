import Table from "cli-table3";
import type { ColumnConfig, ColumnStyle } from "./index.js";
import { formatValue, getNestedValue } from "./utils.js";
import { getColors } from "../utils/colors.js";

/**
 * Apply style to a string value for terminal display.
 */
function applyStyle(value: string, style: ColumnStyle | undefined): string {
  if (!style || style === "none") return value;

  const c = getColors();
  switch (style) {
    case "bold":
      return c.bold(value);
    case "dim":
      return c.dim(value);
    case "cyan":
      return c.cyan(value);
    default:
      return value;
  }
}

export function formatTable<T>(data: T, columns: ColumnConfig[]): string {
  const table = new Table({
    head: columns.map((c) => c.header),
    colWidths: columns.map((c) => c.width ?? null),
  });

  const items = Array.isArray(data) ? data : [data];

  for (const item of items) {
    const row = columns.map((col) => {
      const value = formatValue(getNestedValue(item, col.key));
      return applyStyle(value, col.style);
    });
    table.push(row);
  }

  return table.toString();
}
