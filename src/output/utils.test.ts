import { describe, test, expect } from "bun:test";
import { getNestedValue, formatValue } from "./utils.js";

describe("getNestedValue", () => {
  test("returns top-level property", () => {
    const obj = { name: "test" };
    expect(getNestedValue(obj, "name")).toBe("test");
  });

  test("returns nested property with dot notation", () => {
    const obj = { user: { name: "test" } };
    expect(getNestedValue(obj, "user.name")).toBe("test");
  });

  test("returns deeply nested property", () => {
    const obj = { a: { b: { c: { d: "deep" } } } };
    expect(getNestedValue(obj, "a.b.c.d")).toBe("deep");
  });

  test("returns undefined for missing property", () => {
    const obj = { name: "test" };
    expect(getNestedValue(obj, "missing")).toBeUndefined();
  });

  test("returns undefined for missing nested property", () => {
    const obj = { user: { name: "test" } };
    expect(getNestedValue(obj, "user.email")).toBeUndefined();
  });

  test("returns undefined for path through null", () => {
    const obj = { user: null };
    expect(getNestedValue(obj, "user.name")).toBeUndefined();
  });

  test("returns undefined for path through undefined", () => {
    const obj = { user: undefined };
    expect(getNestedValue(obj, "user.name")).toBeUndefined();
  });

  test("returns the value if it is an object", () => {
    const nested = { name: "test" };
    const obj = { user: nested };
    expect(getNestedValue(obj, "user")).toBe(nested);
  });

  test("returns the value if it is an array", () => {
    const arr = [1, 2, 3];
    const obj = { items: arr };
    expect(getNestedValue(obj, "items")).toBe(arr);
  });
});

describe("formatValue", () => {
  test("returns empty string for null", () => {
    expect(formatValue(null)).toBe("");
  });

  test("returns empty string for undefined", () => {
    expect(formatValue(undefined)).toBe("");
  });

  test("joins array elements with comma and space", () => {
    expect(formatValue(["a", "b", "c"])).toBe("a, b, c");
  });

  test("handles array of numbers", () => {
    expect(formatValue([1, 2, 3])).toBe("1, 2, 3");
  });

  test("handles empty array", () => {
    expect(formatValue([])).toBe("");
  });

  test("stringifies objects as JSON", () => {
    const obj = { name: "test" };
    expect(formatValue(obj)).toBe('{"name":"test"}');
  });

  test("converts strings as-is", () => {
    expect(formatValue("hello")).toBe("hello");
  });

  test("converts numbers to string", () => {
    expect(formatValue(42)).toBe("42");
    expect(formatValue(3.14)).toBe("3.14");
  });

  test("converts booleans to string", () => {
    expect(formatValue(true)).toBe("true");
    expect(formatValue(false)).toBe("false");
  });
});
