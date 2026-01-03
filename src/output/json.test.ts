import { describe, test, expect } from "bun:test";
import { formatJson } from "./json.js";

describe("formatJson", () => {
  test("formats a simple object with indentation", () => {
    const data = { name: "test", value: 42 };
    const result = formatJson(data);
    expect(result).toBe(JSON.stringify(data, null, 2));
  });

  test("formats an array of objects", () => {
    const data = [
      { id: 1, name: "first" },
      { id: 2, name: "second" },
    ];
    const result = formatJson(data);
    expect(result).toBe(JSON.stringify(data, null, 2));
  });

  test("formats nested objects", () => {
    const data = {
      user: {
        name: "test",
        settings: {
          theme: "dark",
        },
      },
    };
    const result = formatJson(data);
    expect(result).toContain('"user"');
    expect(result).toContain('"settings"');
    expect(result).toContain('"theme": "dark"');
  });

  test("formats null", () => {
    const result = formatJson(null);
    expect(result).toBe("null");
  });

  test("formats primitives", () => {
    expect(formatJson("string")).toBe('"string"');
    expect(formatJson(123)).toBe("123");
    expect(formatJson(true)).toBe("true");
  });

  test("formats empty array", () => {
    expect(formatJson([])).toBe("[]");
  });

  test("formats empty object", () => {
    expect(formatJson({})).toBe("{}");
  });
});
