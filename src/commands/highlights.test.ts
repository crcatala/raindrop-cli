import { describe, test, expect } from "bun:test";
import { runCli, runCliExpectSuccess } from "../test-utils/index.js";

/**
 * Unit tests for the highlights command.
 *
 * These tests do NOT require authentication and test:
 * - Help output
 * - Argument validation
 * - Error handling for missing auth
 *
 * For live API tests, see highlights.live.test.ts
 */

describe("highlights command", () => {
  describe("help", () => {
    test("highlights --help shows command description", async () => {
      const result = await runCliExpectSuccess(["highlights", "--help"]);
      expect(result.stdout).toContain("View highlights");
      expect(result.stdout).toContain("list");
      expect(result.stdout).toContain("get");
    });

    test("highlights list --help shows usage", async () => {
      const result = await runCliExpectSuccess(["highlights", "list", "--help"]);
      expect(result.stdout).toContain("List highlights");
      expect(result.stdout).toContain("--collection");
      expect(result.stdout).toContain("--limit");
      expect(result.stdout).toContain("--page");
    });

    test("highlights get --help shows usage", async () => {
      const result = await runCliExpectSuccess(["highlights", "get", "--help"]);
      expect(result.stdout).toContain("Get highlights for a specific bookmark");
      expect(result.stdout).toContain("bookmark-id");
    });
  });

  describe("list command - without auth", () => {
    test("fails gracefully without token", async () => {
      const result = await runCli(["highlights", "list"], {
        env: { RAINDROP_TOKEN: "" },
      });
      expect(result.exitCode).toBe(1);
      const hasAuthError = result.stderr.includes("No API token") || result.stderr.includes("401");
      expect(hasAuthError).toBe(true);
    });
  });

  describe("list command - validation", () => {
    test("rejects invalid collection ID", async () => {
      const result = await runCli(["highlights", "list", "--collection", "notanumber"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid collection ID");
    });

    test("rejects invalid limit (too low)", async () => {
      const result = await runCli(["highlights", "list", "--limit", "0"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid limit");
      expect(result.stderr).toContain("1 and 50");
    });

    test("rejects invalid limit (too high)", async () => {
      const result = await runCli(["highlights", "list", "--limit", "100"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid limit");
      expect(result.stderr).toContain("1 and 50");
    });

    test("rejects invalid limit (not a number)", async () => {
      const result = await runCli(["highlights", "list", "--limit", "abc"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid limit");
      expect(result.stderr).toContain("1 and 50");
    });

    test("rejects negative page number", async () => {
      const result = await runCli(["highlights", "list", "--page", "-1"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid page");
      expect(result.stderr).toContain("non-negative");
    });
  });

  describe("get command - validation", () => {
    test("rejects missing bookmark ID", async () => {
      const result = await runCli(["highlights", "get"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("bookmark-id");
    });

    test("rejects invalid bookmark ID (not a number)", async () => {
      const result = await runCli(["highlights", "get", "notanumber"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid bookmark ID");
    });

    test("rejects invalid bookmark ID (zero)", async () => {
      const result = await runCli(["highlights", "get", "0"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid bookmark ID");
    });

    test("rejects invalid bookmark ID (negative)", async () => {
      const result = await runCli(["highlights", "get", "-5"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid bookmark ID");
    });
  });
});
