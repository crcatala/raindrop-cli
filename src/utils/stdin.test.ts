import { describe, test, expect } from "bun:test";
import { parseIds } from "./stdin.js";

describe("parseIds", () => {
  test("parses newline-separated IDs", () => {
    expect(parseIds("123\n456\n789")).toEqual([123, 456, 789]);
  });

  test("parses comma-separated IDs", () => {
    expect(parseIds("123,456,789")).toEqual([123, 456, 789]);
  });

  test("parses space-separated IDs", () => {
    expect(parseIds("123 456 789")).toEqual([123, 456, 789]);
  });

  test("parses mixed separators", () => {
    expect(parseIds("123, 456\n789 111")).toEqual([123, 456, 789, 111]);
  });

  test("handles extra whitespace", () => {
    expect(parseIds("  123  ,  456  \n\n  789  ")).toEqual([123, 456, 789]);
  });

  test("handles empty input", () => {
    expect(parseIds("")).toEqual([]);
    expect(parseIds("   ")).toEqual([]);
    expect(parseIds("\n\n")).toEqual([]);
  });

  test("throws on invalid ID (non-numeric)", () => {
    expect(() => parseIds("123,abc,456")).toThrow("Invalid bookmark IDs: abc");
  });

  test("throws on invalid ID (negative)", () => {
    expect(() => parseIds("123,-5,456")).toThrow("Invalid bookmark IDs: -5");
  });

  test("throws on invalid ID (zero)", () => {
    expect(() => parseIds("123,0,456")).toThrow("Invalid bookmark IDs: 0");
  });

  test("throws on invalid ID (float)", () => {
    expect(() => parseIds("123,45.6,789")).toThrow("Invalid bookmark IDs: 45.6");
  });

  test("reports all invalid IDs in error message", () => {
    expect(() => parseIds("123,abc,456,xyz")).toThrow("Invalid bookmark IDs: abc, xyz");
  });

  test("throws on invalid ID (leading zeros)", () => {
    expect(() => parseIds("123,012,456")).toThrow("Invalid bookmark IDs: 012");
  });
});
