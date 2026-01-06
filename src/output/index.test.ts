import { describe, test, expect, mock, beforeEach } from "bun:test";
import { output, type ColumnConfig } from "./index.js";
import type { OutputFormat } from "../types/index.js";
import { OUTPUT_FORMATS } from "../types/index.js";

// Mock the output streams module
const mockOutputData = mock(() => {});
mock.module("../utils/output-streams.js", () => ({
  outputData: mockOutputData,
}));

// Mock tty to control default format
mock.module("../utils/tty.js", () => ({
  getDefaultFormat: () => "table" as OutputFormat,
}));

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

  beforeEach(() => {
    mockOutputData.mockClear();
  });

  describe("format selection", () => {
    test("all OUTPUT_FORMATS values are handled", () => {
      // This test ensures the switch statement handles all defined formats
      for (const format of OUTPUT_FORMATS) {
        expect(() => {
          output(testData, columns, { ...baseOptions, format });
        }).not.toThrow();
        expect(mockOutputData).toHaveBeenCalled();
        mockOutputData.mockClear();
      }
    });

    test("json format outputs valid JSON", () => {
      output(testData, columns, { ...baseOptions, format: "json" });

      expect(mockOutputData).toHaveBeenCalledTimes(1);
      const calls = mockOutputData.mock.calls as unknown[][];
      const outputStr = String(calls[0]?.[0] ?? "");
      expect(() => JSON.parse(outputStr)).not.toThrow();
      const parsed = JSON.parse(outputStr);
      expect(parsed).toHaveLength(2);
      expect(parsed[0]._id).toBe(1);
    });

    test("table format outputs formatted table", () => {
      output(testData, columns, { ...baseOptions, format: "table" });

      expect(mockOutputData).toHaveBeenCalledTimes(1);
      const calls = mockOutputData.mock.calls as unknown[][];
      const outputStr = String(calls[0]?.[0] ?? "");
      expect(outputStr).toContain("ID");
      expect(outputStr).toContain("Title");
    });

    test("tsv format outputs tab-separated values", () => {
      output(testData, columns, { ...baseOptions, format: "tsv" });

      expect(mockOutputData).toHaveBeenCalledTimes(1);
      const calls = mockOutputData.mock.calls as unknown[][];
      const outputStr = String(calls[0]?.[0] ?? "");
      expect(outputStr).toContain("\t");
      expect(outputStr).toContain("First");
    });

    test("plain format outputs readable text", () => {
      output(testData, columns, { ...baseOptions, format: "plain" });

      expect(mockOutputData).toHaveBeenCalledTimes(1);
      const calls = mockOutputData.mock.calls as unknown[][];
      const outputStr = String(calls[0]?.[0] ?? "");
      expect(outputStr).toContain("First");
    });

    test("uses default format when not specified", () => {
      // Default is mocked to "table" above
      output(testData, columns, baseOptions);

      expect(mockOutputData).toHaveBeenCalledTimes(1);
      const calls = mockOutputData.mock.calls as unknown[][];
      const outputStr = String(calls[0]?.[0] ?? "");
      // Table format includes headers
      expect(outputStr).toContain("ID");
    });
  });

  describe("quiet mode", () => {
    test("outputs only IDs when quiet is true", () => {
      output(testData, columns, { ...baseOptions, quiet: true });

      // Should output each ID on separate calls
      expect(mockOutputData).toHaveBeenCalledTimes(2);
      expect(mockOutputData).toHaveBeenCalledWith("1");
      expect(mockOutputData).toHaveBeenCalledWith("2");
    });

    test("handles objects with id instead of _id", () => {
      const dataWithId = [{ id: 100 }, { id: 200 }];
      output(dataWithId, columns, { ...baseOptions, quiet: true });

      expect(mockOutputData).toHaveBeenCalledWith("100");
      expect(mockOutputData).toHaveBeenCalledWith("200");
    });

    test("handles single object in quiet mode", () => {
      const singleItem = { _id: 42, title: "Single" };
      output(singleItem, columns, { ...baseOptions, quiet: true });

      expect(mockOutputData).toHaveBeenCalledTimes(1);
      expect(mockOutputData).toHaveBeenCalledWith("42");
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
