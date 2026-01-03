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

  test("does not truncate long values (may word-wrap block fields)", () => {
    const longValue =
      "This is a very long string that would normally be truncated in table format but should be fully displayed in plain format";
    const data = { id: 1, name: longValue, tags: ["test"] };
    const result = formatPlain(data, columns);

    // Block fields (like name) are word-wrapped but all content is preserved
    // Check that key parts of the content exist
    expect(result).toContain("This is a very long string");
    expect(result).toContain("plain format");
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

  test("prominent fields display without labels at top", () => {
    const mixedColumns: ColumnConfig[] = [
      { key: "title", header: "Title", prominent: true },
      { key: "url", header: "URL", prominent: true },
      { key: "id", header: "ID" },
    ];
    const data = { title: "My Title", url: "https://example.com", id: 123 };
    const result = formatPlain(data, mixedColumns);

    // Title and URL should appear without labels
    expect(result).toContain("My Title");
    expect(result).toContain("https://example.com");
    // ID should appear with label and icon
    expect(result).toContain("🔖");
    expect(result).toContain("ID");
    expect(result).toContain("123");
    // Title should come before ID in the output
    const titleIndex = result.indexOf("My Title");
    const idIndex = result.indexOf("123");
    expect(titleIndex).toBeLessThan(idIndex);
  });

  test("prominent fields are separated from regular fields by blank line", () => {
    const mixedColumns: ColumnConfig[] = [
      { key: "title", header: "Title", prominent: true },
      { key: "id", header: "ID" },
    ];
    const data = { title: "My Title", id: 123 };
    const result = formatPlain(data, mixedColumns);

    // Should have a blank line between title and ID section
    expect(result).toContain("My Title\n\n");
  });

  test("empty prominent fields are not displayed", () => {
    const mixedColumns: ColumnConfig[] = [
      { key: "title", header: "Title", prominent: true },
      { key: "url", header: "URL", prominent: true },
      { key: "id", header: "ID" },
    ];
    const data = { title: "My Title", url: "", id: 123 };
    const result = formatPlain(data, mixedColumns);

    // Title should appear, empty URL should not show placeholder at top
    expect(result).toContain("My Title");
    // But still have the ID
    expect(result).toContain("123");
  });

  test("block fields (excerpt, note) display with label on own line", () => {
    const blockColumns: ColumnConfig[] = [
      { key: "title", header: "Title" },
      { key: "excerpt", header: "Excerpt" },
      { key: "note", header: "Note" },
    ];
    const data = {
      title: "Test",
      excerpt: "This is an excerpt",
      note: "This is a note",
    };
    const result = formatPlain(data, blockColumns);

    // Block fields should have label, then content on next line indented
    expect(result).toContain("📝");
    expect(result).toContain("Excerpt");
    expect(result).toContain("    This is an excerpt");
    expect(result).toContain("💬");
    expect(result).toContain("Note");
    expect(result).toContain("    This is a note");
    // Content should come after label (on next line)
    const excerptLabelIdx = result.indexOf("Excerpt");
    const excerptContentIdx = result.indexOf("This is an excerpt");
    expect(excerptContentIdx).toBeGreaterThan(excerptLabelIdx);
  });

  test("block fields word-wrap long content", () => {
    const blockColumns: ColumnConfig[] = [{ key: "note", header: "Note" }];
    const longText =
      "This is a very long note that should be wrapped at the configured width to maintain readability in the terminal output";
    const data = { note: longText };
    const result = formatPlain(data, blockColumns);

    // Should contain the text (possibly wrapped)
    expect(result).toContain("This is a very long note");
    // Content should be indented
    expect(result).toContain("    ");
  });

  test("separator has blank lines above and below", () => {
    const columns: ColumnConfig[] = [{ key: "id", header: "ID" }];
    const data = [{ id: 1 }, { id: 2 }];
    const result = formatPlain(data, columns);

    // Separator should have blank lines around it
    expect(result).toContain("\n\n");
    expect(result).toContain("───");
  });
});
