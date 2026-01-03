import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";
import {
  setDebugEnabled,
  setVerboseEnabled,
  isDebugEnabled,
  isVerboseEnabled,
  debug,
  verbose,
  verboseTime,
  resetDebugState,
} from "./debug.js";

describe("debug utilities", () => {
  let stderrSpy: ReturnType<typeof spyOn>;
  let stderrOutput: string[];

  beforeEach(() => {
    resetDebugState();
    stderrOutput = [];
    stderrSpy = spyOn(process.stderr, "write").mockImplementation((chunk) => {
      stderrOutput.push(String(chunk));
      return true;
    });
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    resetDebugState();
  });

  describe("setDebugEnabled / isDebugEnabled", () => {
    test("defaults to false", () => {
      expect(isDebugEnabled()).toBe(false);
    });

    test("can be enabled", () => {
      setDebugEnabled(true);
      expect(isDebugEnabled()).toBe(true);
    });

    test("can be disabled", () => {
      setDebugEnabled(true);
      setDebugEnabled(false);
      expect(isDebugEnabled()).toBe(false);
    });
  });

  describe("setVerboseEnabled / isVerboseEnabled", () => {
    test("defaults to false", () => {
      expect(isVerboseEnabled()).toBe(false);
    });

    test("can be enabled", () => {
      setVerboseEnabled(true);
      expect(isVerboseEnabled()).toBe(true);
    });

    test("can be disabled", () => {
      setVerboseEnabled(true);
      setVerboseEnabled(false);
      expect(isVerboseEnabled()).toBe(false);
    });
  });

  describe("debug()", () => {
    test("outputs nothing when debug is disabled", () => {
      debug("test message");
      expect(stderrOutput.join("")).toBe("");
    });

    test("outputs message with [debug] prefix when enabled", () => {
      setDebugEnabled(true);
      debug("test message");
      expect(stderrOutput.join("")).toContain("[debug] test message");
    });

    test("outputs data as formatted JSON when provided", () => {
      setDebugEnabled(true);
      debug("data test", { foo: "bar" });
      const output = stderrOutput.join("");
      expect(output).toContain("[debug] data test");
      expect(output).toContain('"foo"');
      expect(output).toContain('"bar"');
    });

    test("outputs string data directly", () => {
      setDebugEnabled(true);
      debug("string data", "raw string");
      const output = stderrOutput.join("");
      expect(output).toContain("raw string");
    });
  });

  describe("verbose()", () => {
    test("outputs nothing when verbose is disabled", () => {
      verbose("test message");
      expect(stderrOutput.join("")).toBe("");
    });

    test("outputs message with arrow prefix when enabled", () => {
      setVerboseEnabled(true);
      verbose("test message");
      expect(stderrOutput.join("")).toContain("→ test message");
    });
  });

  describe("verboseTime()", () => {
    test("returns result without output when verbose is disabled", async () => {
      const result = await verboseTime("operation", async () => "result");
      expect(result).toBe("result");
      expect(stderrOutput.join("")).toBe("");
    });

    test("logs start and completion with timing when verbose is enabled", async () => {
      setVerboseEnabled(true);
      const result = await verboseTime("fetch data", async () => {
        await new Promise((r) => setTimeout(r, 10));
        return "data";
      });

      expect(result).toBe("data");
      const output = stderrOutput.join("");
      expect(output).toContain("→ fetch data...");
      expect(output).toContain("→ fetch data completed in");
      expect(output).toContain("ms");
    });

    test("logs failure on error", async () => {
      setVerboseEnabled(true);

      await expect(
        verboseTime("failing op", async () => {
          throw new Error("oops");
        })
      ).rejects.toThrow("oops");

      const output = stderrOutput.join("");
      expect(output).toContain("→ failing op...");
      expect(output).toContain("→ failing op failed after");
    });
  });

  describe("resetDebugState()", () => {
    test("resets both flags to false", () => {
      setDebugEnabled(true);
      setVerboseEnabled(true);
      resetDebugState();
      expect(isDebugEnabled()).toBe(false);
      expect(isVerboseEnabled()).toBe(false);
    });
  });
});
