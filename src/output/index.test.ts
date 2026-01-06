import { describe, test, expect, spyOn, beforeEach, afterEach } from "bun:test";
import { output, type ColumnConfig } from "./index.js";
import { OUTPUT_FORMATS } from "../types/index.js";

describe("output", () => {
  const testData = [
    { _id: 1, title: "First", url: "https://example.com/1" },
    { _id: 2, title: "Second", url: "https://example.com/2" },
  ];

  const columns: ColumnConfig[] = [
    { key: "_id", header: "ID" },
    { key: "title", header: "Title" },
    { key: "url", header: "URL" },
  ];

  const baseOptions = {
    quiet: false,
    verbose: false,
    debug: false,
  };

  let stdoutSpy: ReturnType<typeof spyOn>;
  let capturedOutput: string;

  beforeEach(() => {
    capturedOutput = "";
    stdoutSpy = spyOn(process.stdout, "write").mockImplementation((chunk) => {
      capturedOutput += String(chunk);
      return true;
    });
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  describe("format selection", () => {
    test("all OUTPUT_FORMATS values are handled", () => {
      // This test ensures the switch statement handles all defined formats
      for (const format of OUTPUT_FORMATS) {
        capturedOutput = "";
        expect(() => {
          output(testData, columns, { ...baseOptions, format });
        }).not.toThrow();
        expect(capturedOutput.length).toBeGreaterThan(0);
      }
    });

    test("json format outputs valid JSON", () => {
      output(testData, columns, { ...baseOptions, format: "json" });

      // Remove trailing newline for JSON parsing
      const jsonStr = capturedOutput.trim();
      expect(() => JSON.parse(jsonStr)).not.toThrow();
      const parsed = JSON.parse(jsonStr);
      expect(parsed).toHaveLength(2);
      expect(parsed[0]._id).toBe(1);
    });

    test("table format outputs formatted table", () => {
      output(testData, columns, { ...baseOptions, format: "table" });

      expect(capturedOutput).toContain("ID");
      expect(capturedOutput).toContain("Title");
    });

    test("tsv format outputs tab-separated values", () => {
      output(testData, columns, { ...baseOptions, format: "tsv" });

      expect(capturedOutput).toContain("\t");
      expect(capturedOutput).toContain("First");
    });

    test("plain format outputs readable text", () => {
      output(testData, columns, { ...baseOptions, format: "plain" });

      expect(capturedOutput).toContain("First");
    });

    test("uses default format when not specified", () => {
      // Default format depends on TTY state, but we can verify output happens
      output(testData, columns, baseOptions);

      expect(capturedOutput.length).toBeGreaterThan(0);
    });
  });

  describe("quiet mode", () => {
    test("outputs only IDs when quiet is true", () => {
      output(testData, columns, { ...baseOptions, quiet: true });

      // Should output IDs with newlines
      expect(capturedOutput).toContain("1");
      expect(capturedOutput).toContain("2");
      // Should NOT contain other data
      expect(capturedOutput).not.toContain("First");
      expect(capturedOutput).not.toContain("https://");
    });

    test("handles objects with id instead of _id", () => {
      const dataWithId = [{ id: 100 }, { id: 200 }];
      output(dataWithId, columns, { ...baseOptions, quiet: true });

      expect(capturedOutput).toContain("100");
      expect(capturedOutput).toContain("200");
    });

    test("handles single object in quiet mode", () => {
      const singleItem = { _id: 42, title: "Single" };
      output(singleItem, columns, { ...baseOptions, quiet: true });

      expect(capturedOutput).toContain("42");
      expect(capturedOutput).not.toContain("Single");
    });
  });
});

describe("OUTPUT_FORMATS constant", () => {
  test("contains expected formats", () => {
    expect(OUTPUT_FORMATS).toContain("json");
    expect(OUTPUT_FORMATS).toContain("table");
    expect(OUTPUT_FORMATS).toContain("tsv");
    expect(OUTPUT_FORMATS).toContain("plain");
  });

  test("has exactly 4 formats", () => {
    expect(OUTPUT_FORMATS).toHaveLength(4);
  });
});
