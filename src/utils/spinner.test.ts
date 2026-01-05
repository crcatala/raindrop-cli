import { describe, test, expect, spyOn } from "bun:test";
import { shouldShowSpinner, createSpinner, withSpinner } from "./spinner.js";
import * as tty from "./tty.js";
import * as debug from "./debug.js";

describe("spinner", () => {
  describe("shouldShowSpinner", () => {
    test("returns true when stderr is TTY and not verbose", () => {
      const ttyMock = spyOn(tty, "isStderrTTY").mockReturnValue(true);
      const verboseMock = spyOn(debug, "isVerboseEnabled").mockReturnValue(false);

      expect(shouldShowSpinner()).toBe(true);

      ttyMock.mockRestore();
      verboseMock.mockRestore();
    });

    test("returns false when stderr is not TTY", () => {
      const ttyMock = spyOn(tty, "isStderrTTY").mockReturnValue(false);
      const verboseMock = spyOn(debug, "isVerboseEnabled").mockReturnValue(false);

      expect(shouldShowSpinner()).toBe(false);

      ttyMock.mockRestore();
      verboseMock.mockRestore();
    });

    test("returns false when verbose mode is enabled", () => {
      const ttyMock = spyOn(tty, "isStderrTTY").mockReturnValue(true);
      const verboseMock = spyOn(debug, "isVerboseEnabled").mockReturnValue(true);

      expect(shouldShowSpinner()).toBe(false);

      ttyMock.mockRestore();
      verboseMock.mockRestore();
    });
  });

  describe("withSpinner", () => {
    test("executes operation and returns result when spinner disabled", async () => {
      // When not TTY, spinner is disabled but operation should still run
      const ttyMock = spyOn(tty, "isStderrTTY").mockReturnValue(false);
      const verboseMock = spyOn(debug, "isVerboseEnabled").mockReturnValue(false);

      const result = await withSpinner("Loading...", async () => "test-result");

      expect(result).toBe("test-result");

      ttyMock.mockRestore();
      verboseMock.mockRestore();
    });

    test("executes operation without spinner in verbose mode", async () => {
      const ttyMock = spyOn(tty, "isStderrTTY").mockReturnValue(true);
      const verboseMock = spyOn(debug, "isVerboseEnabled").mockReturnValue(true);

      const result = await withSpinner("Loading...", async () => "result");

      expect(result).toBe("result");

      ttyMock.mockRestore();
      verboseMock.mockRestore();
    });

    test("accepts string shorthand for options", async () => {
      const ttyMock = spyOn(tty, "isStderrTTY").mockReturnValue(false);
      const verboseMock = spyOn(debug, "isVerboseEnabled").mockReturnValue(false);

      const result = await withSpinner("Simple text", async () => "result");
      expect(result).toBe("result");

      ttyMock.mockRestore();
      verboseMock.mockRestore();
    });

    test("propagates errors from operation", async () => {
      const ttyMock = spyOn(tty, "isStderrTTY").mockReturnValue(false);
      const verboseMock = spyOn(debug, "isVerboseEnabled").mockReturnValue(false);

      const error = new Error("Test error");

      await expect(
        withSpinner("Loading...", async () => {
          throw error;
        })
      ).rejects.toThrow("Test error");

      ttyMock.mockRestore();
      verboseMock.mockRestore();
    });
  });

  describe("createSpinner", () => {
    test("creates spinner when conditions are met", () => {
      const ttyMock = spyOn(tty, "isStderrTTY").mockReturnValue(true);
      const verboseMock = spyOn(debug, "isVerboseEnabled").mockReturnValue(false);

      const spinner = createSpinner("Processing...");

      expect(spinner).not.toBeNull();
      expect(spinner?.text).toBe("Processing...");

      ttyMock.mockRestore();
      verboseMock.mockRestore();
    });

    test("returns null when stderr is not TTY", () => {
      const ttyMock = spyOn(tty, "isStderrTTY").mockReturnValue(false);
      const verboseMock = spyOn(debug, "isVerboseEnabled").mockReturnValue(false);

      const spinner = createSpinner("Processing...");

      expect(spinner).toBeNull();

      ttyMock.mockRestore();
      verboseMock.mockRestore();
    });

    test("returns null in verbose mode", () => {
      const ttyMock = spyOn(tty, "isStderrTTY").mockReturnValue(true);
      const verboseMock = spyOn(debug, "isVerboseEnabled").mockReturnValue(true);

      const spinner = createSpinner("Processing...");

      expect(spinner).toBeNull();

      ttyMock.mockRestore();
      verboseMock.mockRestore();
    });
  });
});
