import { describe, test, expect } from "bun:test";
import { runCli, runCliExpectSuccess, parseJsonOutput } from "../test-utils/index.js";

/**
 * Tests for the tags command.
 *
 * Integration tests that run the CLI as a subprocess.
 * Some tests require a valid RAINDROP_TOKEN environment variable.
 */

describe("tags command", () => {
  describe("help", () => {
    test("tags --help shows command description", async () => {
      const result = await runCliExpectSuccess(["tags", "--help"]);
      expect(result.stdout).toContain("Manage tags");
      expect(result.stdout).toContain("list");
      expect(result.stdout).toContain("rename");
      expect(result.stdout).toContain("delete");
    });

    test("tags list --help shows usage", async () => {
      const result = await runCliExpectSuccess(["tags", "list", "--help"]);
      expect(result.stdout).toContain("List tags with bookmark counts");
      expect(result.stdout).toContain("collection");
    });

    test("tags rename --help shows usage", async () => {
      const result = await runCliExpectSuccess(["tags", "rename", "--help"]);
      expect(result.stdout).toContain("Rename a tag");
      expect(result.stdout).toContain("--force");
      expect(result.stdout).toContain("--collection");
    });

    test("tags delete --help shows usage", async () => {
      const result = await runCliExpectSuccess(["tags", "delete", "--help"]);
      expect(result.stdout).toContain("Remove a tag");
      expect(result.stdout).toContain("--force");
      expect(result.stdout).toContain("--collection");
    });
  });

  describe("list command - without auth", () => {
    test("fails gracefully without token", async () => {
      const result = await runCli(["tags", "list"], {
        env: { RAINDROP_TOKEN: "" },
      });
      expect(result.exitCode).toBe(1);
      // Should fail with either no token error or 401 from API
      const hasAuthError = result.stderr.includes("No API token") || result.stderr.includes("401");
      expect(hasAuthError).toBe(true);
    });
  });

  describe("list command - validation", () => {
    test("rejects invalid collection ID", async () => {
      const result = await runCli(["tags", "list", "notanumber"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid collection ID");
    });
  });

  describe("rename command - requires --force", () => {
    test("fails without --force flag", async () => {
      const result = await runCli(["tags", "rename", "old-tag", "new-tag"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("--force");
    });

    test("shows what will be renamed in error message", async () => {
      const result = await runCli(["tags", "rename", "my-tag", "better-tag"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("my-tag");
      expect(result.stderr).toContain("better-tag");
    });
  });

  describe("delete command - requires --force", () => {
    test("fails without --force flag", async () => {
      const result = await runCli(["tags", "delete", "some-tag"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("--force");
    });

    test("shows what will be deleted in error message", async () => {
      const result = await runCli(["tags", "delete", "unwanted-tag"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("unwanted-tag");
    });
  });
});

/**
 * Integration tests that require a valid RAINDROP_TOKEN.
 * These are skipped if no token is available.
 */
describe("tags command - with auth", () => {
  const hasToken = !!process.env["RAINDROP_TOKEN"];
  const AUTH_TEST_TIMEOUT = 20000;

  const testWithAuth = hasToken
    ? (name: string, fn: () => Promise<void>) => test(name, fn, { timeout: AUTH_TEST_TIMEOUT })
    : test.skip;

  const AUTH_CLI_TIMEOUT = 20000;
  const runCliWithAuth = (args: string[], options: Parameters<typeof runCli>[1] = {}) =>
    runCli(args, { timeout: AUTH_CLI_TIMEOUT, ...options });
  const runCliExpectSuccessWithAuth = (
    args: string[],
    options: Parameters<typeof runCliExpectSuccess>[1] = {}
  ) => runCliExpectSuccess(args, { timeout: AUTH_CLI_TIMEOUT, ...options });

  testWithAuth("list returns tags as JSON", async () => {
    const result = await runCliExpectSuccessWithAuth(["tags", "list"]);
    const data = parseJsonOutput<Array<{ _id: string; count: number }>>(result);

    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty("_id");
      expect(data[0]).toHaveProperty("count");
      expect(typeof data[0]!._id).toBe("string");
      expect(typeof data[0]!.count).toBe("number");
    }
  });

  testWithAuth("list supports special collection names", async () => {
    const result = await runCliExpectSuccessWithAuth(["tags", "list", "unsorted"]);
    const data = parseJsonOutput<Array<{ _id: string; count: number }>>(result);

    expect(Array.isArray(data)).toBe(true);
  });

  testWithAuth("list supports numeric collection ID", async () => {
    const result = await runCliExpectSuccessWithAuth(["tags", "list", "0"]);
    const data = parseJsonOutput<Array<{ _id: string; count: number }>>(result);

    expect(Array.isArray(data)).toBe(true);
  });

  testWithAuth("list quiet mode outputs only tag names", async () => {
    const result = await runCliExpectSuccessWithAuth(["tags", "list", "-q"]);

    // Each line should be a tag name (the _id field)
    const lines = result.stdout.trim().split("\n");
    // At least verify it's not empty and not JSON
    if (lines.length > 0 && lines[0]) {
      expect(lines[0]).not.toContain("{");
    }
  });

  testWithAuth("list table format works", async () => {
    const result = await runCliWithAuth(["tags", "list", "--format", "table"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Tag");
    expect(result.stdout).toContain("Count");
  });

  testWithAuth("list tsv format works", async () => {
    const result = await runCliWithAuth(["tags", "list", "--format", "tsv"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Tag\t");
  });

  testWithAuth("list plain format works", async () => {
    const result = await runCliWithAuth(["tags", "list", "--format", "plain"]);

    expect(result.exitCode).toBe(0);
    // Plain format should have styled dividers between items
    if (result.stdout.trim().length > 0) {
      expect(result.stdout).toContain("───");
    }
  });

  // Note: We don't test rename and delete with real operations here
  // since they would modify the user's actual data. Those should be
  // tested with mocked API responses in unit tests.
});
