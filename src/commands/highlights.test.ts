import { describe, test, expect } from "bun:test";
import { runCli, runCliExpectSuccess, parseJsonOutput } from "../test-utils/index.js";

/**
 * Tests for the highlights command.
 *
 * Integration tests that run the CLI as a subprocess.
 * Some tests require a valid RAINDROP_TOKEN environment variable.
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

/**
 * Integration tests that require a valid RAINDROP_TOKEN.
 * These are skipped if no token is available.
 */
describe("highlights command - with auth", () => {
  const hasToken = !!process.env["RAINDROP_TOKEN"];
  const AUTH_TEST_TIMEOUT = 20000;

  const testWithAuth = hasToken
    ? (name: string, fn: () => Promise<void>) => test(name, fn, { timeout: AUTH_TEST_TIMEOUT })
    : test.skip;

  testWithAuth("list returns highlights as JSON", async () => {
    const result = await runCliExpectSuccess(["highlights", "list"]);
    const data = parseJsonOutput<
      Array<{
        _id: string;
        text: string;
        title: string;
        link: string;
        created: string;
      }>
    >(result);

    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty("_id");
      expect(data[0]).toHaveProperty("text");
      expect(data[0]).toHaveProperty("title");
      expect(data[0]).toHaveProperty("link");
      expect(typeof data[0]!._id).toBe("string");
      expect(typeof data[0]!.text).toBe("string");
    }
  });

  testWithAuth("list supports --limit option", async () => {
    const result = await runCliExpectSuccess(["highlights", "list", "--limit", "5"]);
    const data = parseJsonOutput<Array<{ _id: string }>>(result);

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeLessThanOrEqual(5);
  });

  testWithAuth("list supports special collection names", async () => {
    const result = await runCliExpectSuccess(["highlights", "list", "--collection", "all"]);
    const data = parseJsonOutput<Array<{ _id: string }>>(result);

    expect(Array.isArray(data)).toBe(true);
  });

  testWithAuth("list supports numeric collection ID", async () => {
    const result = await runCliExpectSuccess(["highlights", "list", "--collection", "0"]);
    const data = parseJsonOutput<Array<{ _id: string }>>(result);

    expect(Array.isArray(data)).toBe(true);
  });

  testWithAuth("list quiet mode outputs only highlight IDs", async () => {
    const result = await runCliExpectSuccess(["highlights", "list", "-q"]);

    const lines = result.stdout.trim().split("\n");
    if (lines.length > 0 && lines[0]) {
      expect(lines[0]).not.toContain("{");
    }
  });

  testWithAuth("list table format works", async () => {
    const result = await runCli(["highlights", "list", "--format", "table"]);

    expect(result.exitCode).toBe(0);
    // Table format has headers
    expect(result.stdout).toContain("ID");
    expect(result.stdout).toContain("Highlight");
  });

  testWithAuth("list tsv format works", async () => {
    const result = await runCli(["highlights", "list", "--format", "tsv"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("ID\t");
  });

  testWithAuth("list plain format works", async () => {
    const result = await runCli(["highlights", "list", "--format", "plain"]);

    expect(result.exitCode).toBe(0);
    // Plain format should have styled dividers between items (if there are items)
    if (result.stdout.trim().length > 0) {
      // Either has dividers or is empty/no-results
      const hasDividers = result.stdout.includes("───");
      const isEmpty = result.stdout.trim() === "";
      const hasEmptyMessage = result.stdout.includes("No results found");
      expect(hasDividers || isEmpty || hasEmptyMessage).toBe(true);
    }
  });
});
