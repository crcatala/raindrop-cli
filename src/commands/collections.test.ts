import { describe, test, expect } from "bun:test";
import { runCli, runCliExpectSuccess, parseJsonOutput } from "../test-utils/index.js";
import { AUTH_CLI_TIMEOUT_MS, AUTH_TEST_TIMEOUT_MS } from "../test-utils/timeouts.js";

const runCliBase = runCli;
const runCliExpectSuccessBase = runCliExpectSuccess;

/**
 * Tests for the collections command.
 *
 * Integration tests that run the CLI as a subprocess.
 * Some tests require a valid RAINDROP_TOKEN environment variable.
 */

describe("collections command", () => {
  describe("help", () => {
    test("collections --help shows command description", async () => {
      const result = await runCliExpectSuccess(["collections", "--help"]);
      expect(result.stdout).toContain("Manage collections");
      expect(result.stdout).toContain("list");
      expect(result.stdout).toContain("show");
      expect(result.stdout).toContain("create");
      expect(result.stdout).toContain("delete");
      expect(result.stdout).toContain("stats");
    });

    test("collections list --help shows options", async () => {
      const result = await runCliExpectSuccess(["collections", "list", "--help"]);
      expect(result.stdout).toContain("--flat");
    });

    test("collections show --help shows arguments", async () => {
      const result = await runCliExpectSuccess(["collections", "show", "--help"]);
      expect(result.stdout).toContain("collection-id");
    });

    test("collections create --help shows arguments", async () => {
      const result = await runCliExpectSuccess(["collections", "create", "--help"]);
      expect(result.stdout).toContain("name");
    });

    test("collections delete --help shows options", async () => {
      const result = await runCliExpectSuccess(["collections", "delete", "--help"]);
      expect(result.stdout).toContain("collection-id");
      expect(result.stdout).toContain("--force");
    });
  });

  describe("list command - without auth", () => {
    test("fails gracefully without token", async () => {
      const result = await runCli(["collections", "list"], {
        env: { RAINDROP_TOKEN: "" },
      });
      expect(result.exitCode).toBe(1);
      // Should fail with either no token error or 401 from API
      const hasAuthError = result.stderr.includes("No API token") || result.stderr.includes("401");
      expect(hasAuthError).toBe(true);
    });
  });

  describe("show command - validation", () => {
    test("rejects invalid collection ID", async () => {
      const result = await runCli(["collections", "show", "notanumber"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid collection ID");
    });
  });

  describe("create command - validation", () => {
    test("rejects empty name", async () => {
      const result = await runCli(["collections", "create", "   "], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Collection name cannot be empty");
    });
  });

  describe("delete command - validation", () => {
    test("rejects invalid collection ID", async () => {
      const result = await runCli(["collections", "delete", "notanumber"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid collection ID");
    });
  });
});

/**
 * Integration tests that require a valid RAINDROP_TOKEN.
 * These are skipped if no token is available.
 */
describe("collections command - with auth", () => {
  const hasToken = !!process.env["RAINDROP_TOKEN"];
  const AUTH_TEST_TIMEOUT = AUTH_TEST_TIMEOUT_MS;
  const testWithAuth = hasToken
    ? (name: string, fn: () => Promise<void>) => test(name, fn, { timeout: AUTH_TEST_TIMEOUT })
    : test.skip;

  const AUTH_CLI_TIMEOUT = AUTH_CLI_TIMEOUT_MS;
  const runCli = (args: string[], options: Parameters<typeof runCliBase>[1] = {}) =>
    runCliBase(args, { timeout: AUTH_CLI_TIMEOUT, ...options });
  const runCliExpectSuccess = (
    args: string[],
    options: Parameters<typeof runCliExpectSuccessBase>[1] = {}
  ) => runCliExpectSuccessBase(args, { timeout: AUTH_CLI_TIMEOUT, ...options });

  testWithAuth("list returns collections as JSON", async () => {
    const result = await runCliExpectSuccess(["collections", "list"]);
    const data = parseJsonOutput<Array<{ _id: number; tree?: string; count: number }>>(result);

    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty("_id");
      expect(data[0]).toHaveProperty("count");
    }
  });

  testWithAuth("list --flat returns flat structure", async () => {
    const result = await runCliExpectSuccess(["collections", "list", "--flat"]);
    const data = parseJsonOutput<Array<{ _id: number; title: string; count: number }>>(result);

    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty("_id");
      expect(data[0]).toHaveProperty("title");
      expect(data[0]).toHaveProperty("count");
    }
  });

  testWithAuth("list quiet mode outputs only IDs", async () => {
    const result = await runCliExpectSuccess(["collections", "list", "-q"]);

    // Each line should be just an ID (number)
    const lines = result.stdout.trim().split("\n");
    for (const line of lines) {
      if (line) {
        expect(line).toMatch(/^\d+$/);
      }
    }
  });

  testWithAuth("list table format works", async () => {
    const result = await runCli(["collections", "list", "--format", "table"]);

    expect(result.exitCode).toBe(0);
    // Table format should have headers
    expect(result.stdout).toContain("ID");
    expect(result.stdout).toContain("Items");
  });

  testWithAuth("stats returns system collection stats", async () => {
    const result = await runCliExpectSuccess(["collections", "stats"]);
    const data = parseJsonOutput<Array<{ name: string; count: string; _id: number }>>(result);

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    // Should have the standard system collections
    const names = data.map((item) => item.name);
    expect(names).toContain("All Bookmarks");
  });

  testWithAuth("stats quiet mode outputs only IDs", async () => {
    const result = await runCliExpectSuccess(["collections", "stats", "-q"]);

    // Each line should be a number (positive or negative for system IDs)
    const lines = result.stdout.trim().split("\n");
    for (const line of lines) {
      if (line) {
        expect(line).toMatch(/^-?\d+$/);
      }
    }
  });

  // Note: We don't test show, create, or delete with auth because:
  // - show requires a known collection ID from the user's account
  // - create would create real collections in the user's account
  // - delete would delete real collections
  // These should be tested manually or with a dedicated test account
});
