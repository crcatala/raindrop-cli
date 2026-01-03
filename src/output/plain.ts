import type { ColumnConfig } from "./index.js";
import { getNestedValue } from "./utils.js";
import { getColors } from "../utils/colors.js";

/**
 * Emoji icons for common field types.
 * Makes output more scannable at a glance.
 */
const FIELD_ICONS: Record<string, string> = {
  id: "🔖",
  _id: "🔖",
  title: "📌",
  name: "📌",
  url: "🔗",
  link: "🔗",
  tags: "🏷️ ",
  excerpt: "📝",
  note: "💬",
  notes: "💬",
  created: "📅",
  updated: "📅",
  lastupdated: "📅",
  lastupdate: "📅",
  domain: "🌐",
  type: "📁",
  collection: "📂",
  collectionid: "📂",
};

/**
 * Get icon for a field based on its key.
 */
function getFieldIcon(key: string): string {
  const normalizedKey = key.toLowerCase().replace(/[._-]/g, "");
  return FIELD_ICONS[normalizedKey] ?? "•";
}

/**
 * Format a single value for plain text output.
 * Returns null if value is empty (to be styled differently).
 */
function formatPlainValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return value.join(", ");
  }
  return String(value);
}

/**
 * Indent multiline text so continuation lines align with the first line.
 * Preserves existing line breaks in the content.
 */
function indentMultiline(text: string, indent: number): string {
  const lines = text.split("\n");
  if (lines.length <= 1) return text;

  const padding = " ".repeat(indent);
  return lines.map((line, i) => (i === 0 ? line : padding + line)).join("\n");
}

/**
 * Format data as styled plain text with labeled fields.
 * Each record is displayed as multi-line with icons, colors, and proper formatting.
 * Records are separated by a styled divider.
 *
 * Features:
 * - Emoji icons for field types
 * - Bold field labels
 * - Dimmed placeholder for empty values
 * - Proper indentation for multiline content
 * - Colored separators between records
 */
export function formatPlain<T>(data: T, columns: ColumnConfig[]): string {
  const items = Array.isArray(data) ? data : [data];
  const c = getColors();

  if (items.length === 0) {
    return c.dim("No results found.");
  }

  // Find the longest header for alignment (including icon space)
  const maxHeaderLength = Math.max(...columns.map((col) => col.header.length));
  // Icon (emoji) + space + header + padding
  const labelWidth = 2 + maxHeaderLength + 2;

  const formattedItems = items.map((item) => {
    const lines = columns.map((col) => {
      const icon = getFieldIcon(col.key);
      const rawValue = formatPlainValue(getNestedValue(item, col.key));
      const paddedHeader = col.header.padEnd(maxHeaderLength);

      // Style the label (icon + bold header)
      const label = `${icon} ${c.bold(paddedHeader)}`;

      // Style the value (dim if empty, otherwise normal with multiline support)
      let value: string;
      if (rawValue === null) {
        value = c.dim("—");
      } else {
        value = indentMultiline(rawValue, labelWidth);
      }

      return `${label}  ${value}`;
    });

    return lines.join("\n");
  });

  // Styled separator between items
  const separator = c.dim("\n  ─────────────────────────────────────\n");

  return formattedItems.join(separator);
}
