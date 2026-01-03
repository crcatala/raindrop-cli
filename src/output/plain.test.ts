import { describe, test, expect } from "bun:test";
import { formatPlain } from "./plain.js";
import type { ColumnConfig } from "./index.js";

describe("formatPlain", () => {
  const columns: ColumnConfig[] = [
    { key: "id", header: "ID" },
    { key: "name", header: "Name" },
    { key: "tags", header: "Tags" },
  ];

  test("formats single item with labeled fields and icons", () => {
    const data = { id: 1, name: "Test Item", tags: ["a", "b"] };
    const result = formatPlain(data, columns);

    // Check for field values (icons and labels included)
    expect(result).toContain("ID");
    expect(result).toContain("1");
    expect(result).toContain("Name");
    expect(result).toContain("Test Item");
    expect(result).toContain("Tags");
    expect(result).toContain("a, b");
    // Should have emoji icons
    expect(result).toContain("🔖"); // ID icon
    expect(result).toContain("🏷️"); // Tags icon
  });

  test("formats multiple items with separators", () => {
    const data = [
      { id: 1, name: "First", tags: ["x"] },
      { id: 2, name: "Second", tags: ["y"] },
    ];
    const result = formatPlain(data, columns);

    expect(result).toContain("1");
    expect(result).toContain("First");
    expect(result).toContain("2");
    expect(result).toContain("Second");
    // Separator between items (styled line)
    expect(result).toContain("───");
  });

  test("handles empty array with message", () => {
    const result = formatPlain([], columns);
    expect(result).toContain("No results");
  });

  test("shows placeholder for null and undefined values", () => {
    const data = { id: 1, name: null, tags: undefined };
    const result = formatPlain(data, columns);

    expect(result).toContain("ID");
    expect(result).toContain("1");
    // Empty values show em-dash placeholder
    expect(result).toContain("—");
  });

  test("shows placeholder for empty string values", () => {
    const data = { id: 1, name: "", tags: [] };
    const result = formatPlain(data, columns);

    // Empty string and empty array both show placeholder
    expect(result.match(/—/g)?.length).toBeGreaterThanOrEqual(2);
  });

  test("handles nested keys", () => {
    const nestedColumns: ColumnConfig[] = [{ key: "user.name", header: "User" }];
    const data = { user: { name: "John" } };
    const result = formatPlain(data, nestedColumns);

    expect(result).toContain("User");
    expect(result).toContain("John");
  });

  test("does not truncate long values", () => {
    const longValue =
      "This is a very long string that would normally be truncated in table format but should be fully displayed in plain format";
    const data = { id: 1, name: longValue, tags: ["test"] };
    const result = formatPlain(data, columns);

    expect(result).toContain(longValue);
  });

  test("handles multiline values with proper indentation", () => {
    const multilineValue = "Line one\nLine two\nLine three";
    const data = { id: 1, name: multilineValue, tags: [] };
    const result = formatPlain(data, columns);

    // Should contain all lines
    expect(result).toContain("Line one");
    expect(result).toContain("Line two");
    expect(result).toContain("Line three");
  });

  test("uses appropriate icons for common field names", () => {
    const fieldColumns: ColumnConfig[] = [
      { key: "title", header: "Title" },
      { key: "url", header: "URL" },
      { key: "created", header: "Created" },
    ];
    const data = { title: "Test", url: "https://example.com", created: "2026-01-01" };
    const result = formatPlain(data, fieldColumns);

    expect(result).toContain("📌"); // title icon
    expect(result).toContain("🔗"); // url icon
    expect(result).toContain("📅"); // created icon
  });
});
