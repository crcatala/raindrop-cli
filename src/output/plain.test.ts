import { describe, test, expect } from "bun:test";
import { formatPlain } from "./plain.js";
import type { ColumnConfig } from "./index.js";

describe("formatPlain", () => {
  const columns: ColumnConfig[] = [
    { key: "id", header: "ID" },
    { key: "name", header: "Name" },
    { key: "tags", header: "Tags" },
  ];

  test("formats single item with labeled fields", () => {
    const data = { id: 1, name: "Test Item", tags: ["a", "b"] };
    const result = formatPlain(data, columns);

    expect(result).toContain("ID    1");
    expect(result).toContain("Name  Test Item");
    expect(result).toContain("Tags  a, b");
  });

  test("formats multiple items with separators", () => {
    const data = [
      { id: 1, name: "First", tags: [] },
      { id: 2, name: "Second", tags: ["x"] },
    ];
    const result = formatPlain(data, columns);

    expect(result).toContain("ID    1");
    expect(result).toContain("Name  First");
    expect(result).toContain("---");
    expect(result).toContain("ID    2");
    expect(result).toContain("Name  Second");
  });

  test("handles empty array", () => {
    const result = formatPlain([], columns);
    expect(result).toBe("");
  });

  test("handles null and undefined values", () => {
    const data = { id: 1, name: null, tags: undefined };
    const result = formatPlain(data, columns);

    expect(result).toContain("ID    1");
    expect(result).toContain("Name  ");
    expect(result).toContain("Tags  ");
  });

  test("aligns headers based on longest header", () => {
    const longColumns: ColumnConfig[] = [
      { key: "id", header: "ID" },
      { key: "description", header: "Description" },
    ];
    const data = { id: 1, description: "Test" };
    const result = formatPlain(data, longColumns);

    // "Description" is 11 chars, so "ID" should be padded
    expect(result).toContain("ID           1");
    expect(result).toContain("Description  Test");
  });

  test("handles nested keys", () => {
    const nestedColumns: ColumnConfig[] = [{ key: "user.name", header: "User" }];
    const data = { user: { name: "John" } };
    const result = formatPlain(data, nestedColumns);

    expect(result).toContain("User  John");
  });

  test("does not truncate long values", () => {
    const longValue =
      "This is a very long string that would normally be truncated in table format but should be fully displayed in plain format";
    const data = { id: 1, name: longValue, tags: [] };
    const result = formatPlain(data, columns);

    expect(result).toContain(longValue);
  });
});
