import { describe, test, expect } from "bun:test";
import { parseLimit, parsePage, parseBookmarkId } from "./validation.js";
import { parseCollectionId, SPECIAL_COLLECTIONS } from "./collections.js";
import { UsageError } from "./errors.js";

describe("parseLimit", () => {
  test("parses valid limit within default range", () => {
    expect(parseLimit("25")).toBe(25);
    expect(parseLimit("1")).toBe(1);
    expect(parseLimit("50")).toBe(50);
  });

  test("parses valid limit with custom range", () => {
    expect(parseLimit("100", 1, 100)).toBe(100);
    expect(parseLimit("5", 5, 10)).toBe(5);
  });

  test("rejects limit below minimum", () => {
    expect(() => parseLimit("0")).toThrow(UsageError);
    expect(() => parseLimit("0")).toThrow("between 1 and 50");
  });

  test("rejects limit above maximum", () => {
    expect(() => parseLimit("100")).toThrow(UsageError);
    expect(() => parseLimit("100")).toThrow("between 1 and 50");
  });

  test("rejects non-numeric limit", () => {
    expect(() => parseLimit("abc")).toThrow(UsageError);
    expect(() => parseLimit("abc")).toThrow('Invalid limit: "abc"');
  });

  test("rejects empty string", () => {
    expect(() => parseLimit("")).toThrow(UsageError);
  });
});

describe("parsePage", () => {
  test("parses valid page numbers", () => {
    expect(parsePage("0")).toBe(0);
    expect(parsePage("1")).toBe(1);
    expect(parsePage("100")).toBe(100);
  });

  test("rejects negative page", () => {
    expect(() => parsePage("-1")).toThrow(UsageError);
    expect(() => parsePage("-1")).toThrow("non-negative");
  });

  test("rejects non-numeric page", () => {
    expect(() => parsePage("abc")).toThrow(UsageError);
    expect(() => parsePage("abc")).toThrow('Invalid page: "abc"');
  });
});

describe("parseBookmarkId", () => {
  test("parses valid bookmark IDs", () => {
    expect(parseBookmarkId("1")).toBe(1);
    expect(parseBookmarkId("12345")).toBe(12345);
    expect(parseBookmarkId("999999999")).toBe(999999999);
  });

  test("rejects zero", () => {
    expect(() => parseBookmarkId("0")).toThrow(UsageError);
    expect(() => parseBookmarkId("0")).toThrow("positive number");
  });

  test("rejects negative numbers", () => {
    expect(() => parseBookmarkId("-1")).toThrow(UsageError);
    expect(() => parseBookmarkId("-5")).toThrow("positive number");
  });

  test("rejects non-numeric values", () => {
    expect(() => parseBookmarkId("abc")).toThrow(UsageError);
    expect(() => parseBookmarkId("notanumber")).toThrow('Invalid bookmark ID: "notanumber"');
  });

  test("rejects empty string", () => {
    expect(() => parseBookmarkId("")).toThrow(UsageError);
  });
});

describe("parseCollectionId", () => {
  test("returns 0 (all) when undefined", () => {
    expect(parseCollectionId(undefined)).toBe(SPECIAL_COLLECTIONS.all);
    expect(parseCollectionId(undefined)).toBe(0);
  });

  test("parses special collection names", () => {
    expect(parseCollectionId("all")).toBe(0);
    expect(parseCollectionId("unsorted")).toBe(-1);
    expect(parseCollectionId("trash")).toBe(-99);
  });

  test("parses special names case-insensitively", () => {
    expect(parseCollectionId("ALL")).toBe(0);
    expect(parseCollectionId("Unsorted")).toBe(-1);
    expect(parseCollectionId("TRASH")).toBe(-99);
  });

  test("parses numeric collection IDs", () => {
    expect(parseCollectionId("123")).toBe(123);
    expect(parseCollectionId("1")).toBe(1);
    expect(parseCollectionId("999999")).toBe(999999);
  });

  test("rejects non-numeric strings", () => {
    expect(() => parseCollectionId("notanumber")).toThrow(UsageError);
    expect(() => parseCollectionId("abc")).toThrow("Invalid collection ID");
  });

  test("rejects empty string", () => {
    expect(() => parseCollectionId("")).toThrow(UsageError);
  });
});
