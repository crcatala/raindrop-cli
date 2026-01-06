import { describe, test, expect } from "bun:test";
import { formatTsv } from "./tsv.js";
import type { ColumnConfig } from "./index.js";

describe("formatTsv", () => {
  const simpleColumns: ColumnConfig[] = [
    { header: "ID", key: "id" },
    { header: "Name", key: "name" },
  ];

  test("formats a single object", () => {
    const data = { id: 1, name: "test" };
    const result = formatTsv(data, simpleColumns);
    const lines = result.split("\n");

    expect(lines[0]).toBe("ID\tName");
    expect(lines[1]).toBe("1\ttest");
  });

  test("formats an array of objects", () => {
    const data = [
      { id: 1, name: "first" },
      { id: 2, name: "second" },
    ];
    const result = formatTsv(data, simpleColumns);
    const lines = result.split("\n");

    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("ID\tName");
    expect(lines[1]).toBe("1\tfirst");
    expect(lines[2]).toBe("2\tsecond");
  });

  test("handles nested keys with dot notation", () => {
    const columns: ColumnConfig[] = [
      { header: "User Name", key: "user.name" },
      { header: "Email", key: "user.email" },
    ];
    const data = { user: { name: "test", email: "test@example.com" } };
    const result = formatTsv(data, columns);
    const lines = result.split("\n");

    expect(lines[0]).toBe("User Name\tEmail");
    expect(lines[1]).toBe("test\ttest@example.com");
  });

  test("handles null values as empty string", () => {
    const data = { id: 1, name: null };
    const result = formatTsv(data, simpleColumns);
    const lines = result.split("\n");

    expect(lines[1]).toBe("1\t");
  });

  test("handles undefined values as empty string", () => {
    const data = { id: 1 };
    const result = formatTsv(data, simpleColumns);
    const lines = result.split("\n");

    expect(lines[1]).toBe("1\t");
  });

  test("joins array values with commas", () => {
    const columns: ColumnConfig[] = [{ header: "Tags", key: "tags" }];
    const data = { tags: ["a", "b", "c"] };
    const result = formatTsv(data, columns);
    const lines = result.split("\n");

    expect(lines[1]).toBe("a,b,c");
  });

  test("stringifies object values as JSON", () => {
    const columns: ColumnConfig[] = [{ header: "Meta", key: "meta" }];
    const data = { meta: { key: "value" } };
    const result = formatTsv(data, columns);
    const lines = result.split("\n");

    expect(lines[1]).toBe('{"key":"value"}');
  });

  test("escapes tab characters in values", () => {
    const data = { id: 1, name: "has\ttab" };
    const result = formatTsv(data, simpleColumns);
    const lines = result.split("\n");

    expect(lines[1]).toBe("1\thas\\ttab");
  });

  test("escapes newline characters in values", () => {
    const data = { id: 1, name: "has\nnewline" };
    const result = formatTsv(data, simpleColumns);
    const lines = result.split("\n");

    expect(lines[1]).toBe("1\thas\\nnewline");
  });

  test("handles empty array", () => {
    const result = formatTsv([], simpleColumns);
    expect(result).toBe("ID\tName");
  });

  test("preserves special characters in values", () => {
    // TSV should preserve data as-is
    // (ANSI codes should never be in the data - styling is applied by terminal formatters)
    const data = { id: 1, name: "Test & <Special>" };
    const result = formatTsv(data, simpleColumns);
    const lines = result.split("\n");

    expect(lines[1]).toBe("1\tTest & <Special>");
  });

  test("preserves unicode and emoji", () => {
    const columns: ColumnConfig[] = [
      { header: "Tree", key: "tree" },
      { header: "ID", key: "_id" },
    ];
    const data = { tree: "📂 日本語", _id: 123 };
    const result = formatTsv(data, columns);
    const lines = result.split("\n");

    expect(lines[1]).toBe("📂 日本語\t123");
  });
});
