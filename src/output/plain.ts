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
  tags: "🏷️",
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
 * Fields that should be displayed in block format (label on own line, content below).
 */
const BLOCK_FIELDS = new Set(["excerpt", "note", "notes", "description", "content", "body"]);

/**
 * Default width for word wrapping block content.
 */
const WRAP_WIDTH = 72;

/**
 * Indent size for block content.
 */
const BLOCK_INDENT = 4;

/**
 * Get icon for a field based on its key.
 */
function getFieldIcon(key: string): string {
  const normalizedKey = key.toLowerCase().replace(/[._-]/g, "");
  return FIELD_ICONS[normalizedKey] ?? "•";
}

/**
 * Check if a field should be displayed in block format.
 */
function isBlockField(key: string): boolean {
  const normalizedKey = key.toLowerCase().replace(/[._-]/g, "");
  return BLOCK_FIELDS.has(normalizedKey);
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
 * Word-wrap text to a maximum width, preserving existing line breaks.
 * Each paragraph (separated by blank lines) is wrapped independently.
 */
function wordWrap(text: string, maxWidth: number): string {
  const lines = text.split("\n");
  const wrappedLines: string[] = [];

  for (const line of lines) {
    // Preserve empty lines
    if (line.trim() === "") {
      wrappedLines.push("");
      continue;
    }

    // Wrap long lines
    if (line.length <= maxWidth) {
      wrappedLines.push(line);
    } else {
      const words = line.split(/\s+/);
      let currentLine = "";

      for (const word of words) {
        if (currentLine === "") {
          currentLine = word;
        } else if (currentLine.length + 1 + word.length <= maxWidth) {
          currentLine += " " + word;
        } else {
          wrappedLines.push(currentLine);
          currentLine = word;
        }
      }

      if (currentLine) {
        wrappedLines.push(currentLine);
      }
    }
  }

  return wrappedLines.join("\n");
}

/**
 * Indent all lines of text by a given amount.
 */
function indentAllLines(text: string, indent: number): string {
  const padding = " ".repeat(indent);
  return text
    .split("\n")
    .map((line) => padding + line)
    .join("\n");
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
 * - Prominent fields (title/URL) displayed without labels, bold/cyan
 * - Emoji icons for regular field types
 * - Bold field labels
 * - Dimmed placeholder for empty values
 * - Proper indentation for multiline content
 * - Newlines around separators for visual breathing room
 */
export function formatPlain<T>(data: T, columns: ColumnConfig[]): string {
  const items = Array.isArray(data) ? data : [data];
  const c = getColors();

  if (items.length === 0) {
    return c.dim("No results found.");
  }

  // Separate prominent columns from regular columns
  const prominentCols = columns.filter((col) => col.prominent);
  const regularCols = columns.filter((col) => !col.prominent);

  // Find the longest header for alignment (only regular columns need alignment)
  const maxHeaderLength =
    regularCols.length > 0 ? Math.max(...regularCols.map((col) => col.header.length)) : 0;
  // Icon (emoji) + space + header + padding
  const labelWidth = 2 + maxHeaderLength + 2;

  const formattedItems = items.map((item) => {
    const outputLines: string[] = [];

    // Prominent fields first (no labels, styled prominently)
    for (const col of prominentCols) {
      const rawValue = formatPlainValue(getNestedValue(item, col.key));
      if (rawValue !== null) {
        // Title gets bold, URL gets cyan
        const isUrl =
          col.key.toLowerCase().includes("url") || col.key.toLowerCase().includes("link");
        if (isUrl) {
          outputLines.push(c.cyan(rawValue));
        } else {
          outputLines.push(c.bold(rawValue));
        }
      }
    }

    // Add blank line between prominent and regular fields if both exist
    if (prominentCols.length > 0 && regularCols.length > 0) {
      outputLines.push("");
    }

    // Regular fields with icons and labels
    for (const col of regularCols) {
      const icon = getFieldIcon(col.key);
      const rawValue = formatPlainValue(getNestedValue(item, col.key));
      const paddedHeader = col.header.padEnd(maxHeaderLength);

      // Check if this is a block field (excerpt, note, etc.)
      const isBlock = isBlockField(col.key);

      // Style the label (icon + bold header)
      const label = `${icon} ${c.bold(paddedHeader)}`;

      if (rawValue === null) {
        // Empty value - show placeholder inline
        outputLines.push(`${label}  ${c.dim("—")}`);
      } else if (isBlock) {
        // Block field: label on its own line, content below with word-wrap
        outputLines.push(label);
        const wrapped = wordWrap(rawValue, WRAP_WIDTH);
        const indented = indentAllLines(wrapped, BLOCK_INDENT);
        outputLines.push(indented);
      } else {
        // Inline field: label and value on same line
        const value = indentMultiline(rawValue, labelWidth);
        outputLines.push(`${label}  ${value}`);
      }
    }

    return outputLines.join("\n");
  });

  // Styled separator between items with blank lines for breathing room
  const separator = "\n\n" + c.dim("  ─────────────────────────────────────") + "\n\n";

  return formattedItems.join(separator);
}
