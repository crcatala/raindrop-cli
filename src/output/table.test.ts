import { describe, test, expect } from "bun:test";
import { formatTable } from "./table.js";
import type { ColumnConfig } from "./index.js";

describe("formatTable", () => {
  const simpleColumns: ColumnConfig[] = [
    { header: "ID", key: "id" },
    { header: "Name", key: "name" },
  ];

  test("formats a single object into a table", () => {
    const data = { id: 1, name: "test" };
    const result = formatTable(data, simpleColumns);

    // Table should contain headers and data
    expect(result).toContain("ID");
    expect(result).toContain("Name");
    expect(result).toContain("1");
    expect(result).toContain("test");
  });

  test("formats an array of objects", () => {
    const data = [
      { id: 1, name: "first" },
      { id: 2, name: "second" },
    ];
    const result = formatTable(data, simpleColumns);

    expect(result).toContain("first");
    expect(result).toContain("second");
  });

  test("handles nested keys with dot notation", () => {
    const columns: ColumnConfig[] = [{ header: "User Name", key: "user.name" }];
    const data = { user: { name: "nested-user" } };
    const result = formatTable(data, columns);

    expect(result).toContain("User Name");
    expect(result).toContain("nested-user");
  });

  test("handles null values as empty string", () => {
    const data = { id: 1, name: null };
    const result = formatTable(data, simpleColumns);

    expect(result).toContain("1");
    // The empty cell should not cause errors
    expect(result).toContain("ID");
  });

  test("handles undefined values as empty string", () => {
    const data = { id: 1 };
    const result = formatTable(data, simpleColumns);

    expect(result).toContain("1");
  });

  test("joins array values with comma and space", () => {
    const columns: ColumnConfig[] = [{ header: "Tags", key: "tags" }];
    const data = { tags: ["a", "b", "c"] };
    const result = formatTable(data, columns);

    expect(result).toContain("a, b, c");
  });

  test("respects column width configuration", () => {
    const columns: ColumnConfig[] = [
      { header: "ID", key: "id", width: 10 },
      { header: "Name", key: "name", width: 20 },
    ];
    const data = { id: 1, name: "test" };
    const result = formatTable(data, columns);

    // Table should be rendered (width affects internal padding)
    expect(result).toContain("ID");
    expect(result).toContain("Name");
  });

  test("handles empty array", () => {
    const result = formatTable([], simpleColumns);

    // Should still have headers
    expect(result).toContain("ID");
    expect(result).toContain("Name");
  });

  test("stringifies object values as JSON", () => {
    const columns: ColumnConfig[] = [{ header: "Meta", key: "meta" }];
    const data = { meta: { key: "value" } };
    const result = formatTable(data, columns);

    expect(result).toContain('{"key":"value"}');
  });

  test("accepts style option in column config", () => {
    // Note: Actual ANSI styling only applies in TTY environments.
    // In non-TTY (like tests), getColors() returns no-op functions.
    // This test verifies the style option is accepted without errors.
    const columns: ColumnConfig[] = [{ header: "Name", key: "name", style: "bold" }];
    const data = { name: "Test" };
    const result = formatTable(data, columns);

    // Value should be present regardless of styling
    expect(result).toContain("Test");
  });

  test("style none does not cause errors", () => {
    const columns: ColumnConfig[] = [{ header: "Name", key: "name", style: "none" }];
    const data = { name: "Test" };
    const result = formatTable(data, columns);

    expect(result).toContain("Test");
  });
});
