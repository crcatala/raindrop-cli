import { describe, test, expect } from "bun:test";
import { runCli, runCliExpectSuccess, parseJsonOutput } from "../test-utils/index.js";

/**
 * Tests for the bookmarks command.
 *
 * Integration tests that run the CLI as a subprocess.
 * Some tests require a valid RAINDROP_TOKEN environment variable.
 */

describe("bookmarks command", () => {
  describe("help", () => {
    test("bookmarks --help shows command description", async () => {
      const result = await runCliExpectSuccess(["bookmarks", "--help"]);
      expect(result.stdout).toContain("Manage bookmarks");
      expect(result.stdout).toContain("list");
    });

    test("bookmarks list --help shows all options", async () => {
      const result = await runCliExpectSuccess(["bookmarks", "list", "--help"]);
      expect(result.stdout).toContain("--limit");
      expect(result.stdout).toContain("--page");
      expect(result.stdout).toContain("--sort");
      expect(result.stdout).toContain("--search");
      expect(result.stdout).toContain("collection-id");
    });
  });

  describe("list command - without auth", () => {
    test("fails gracefully without token", async () => {
      const result = await runCli(["bookmarks", "list"], {
        env: { RAINDROP_TOKEN: "" },
      });
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("No API token");
    });
  });

  describe("list command - validation", () => {
    test("rejects invalid limit (too high)", async () => {
      const result = await runCli(["bookmarks", "list", "--limit", "100"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Limit must be between 1 and 50");
    });

    test("rejects invalid limit (too low)", async () => {
      const result = await runCli(["bookmarks", "list", "--limit", "0"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Limit must be between 1 and 50");
    });

    test("rejects invalid sort option", async () => {
      const result = await runCli(["bookmarks", "list", "--sort", "invalid"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Invalid sort option");
    });

    test("rejects invalid collection ID", async () => {
      const result = await runCli(["bookmarks", "list", "notanumber"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Invalid collection ID");
    });

    test("rejects negative page number", async () => {
      const result = await runCli(["bookmarks", "list", "--page", "-1"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Page must be a non-negative number");
    });
  });
});

/**
 * Integration tests that require a valid RAINDROP_TOKEN.
 * These are skipped if no token is available.
 */
describe("bookmarks command - with auth", () => {
  const hasToken = !!process.env["RAINDROP_TOKEN"];

  const testWithAuth = hasToken ? test : test.skip;

  testWithAuth("list returns bookmarks as JSON", async () => {
    const result = await runCliExpectSuccess(["bookmarks", "list", "--limit", "2"]);
    const data = parseJsonOutput<Array<{ _id: number; title: string; link: string }>>(result);

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeLessThanOrEqual(2);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty("_id");
      expect(data[0]).toHaveProperty("title");
      expect(data[0]).toHaveProperty("link");
    }
  });

  testWithAuth("list supports special collection names", async () => {
    // Test 'unsorted' collection
    const result = await runCliExpectSuccess(["bookmarks", "list", "unsorted", "--limit", "1"]);
    const data = parseJsonOutput<Array<{ _id: number; collectionId: number }>>(result);

    expect(Array.isArray(data)).toBe(true);
    // Items from unsorted collection have collectionId -1
    if (data.length > 0) {
      const first = data[0]!;
      expect(first.collectionId).toBe(-1);
    }
  });

  testWithAuth("list supports numeric collection ID", async () => {
    // Test 'all' collection (ID 0)
    const result = await runCliExpectSuccess(["bookmarks", "list", "0", "--limit", "1"]);
    const data = parseJsonOutput<Array<{ _id: number }>>(result);

    expect(Array.isArray(data)).toBe(true);
  });

  testWithAuth("list supports search filter", async () => {
    const result = await runCliExpectSuccess([
      "bookmarks",
      "list",
      "--search",
      "test",
      "--limit",
      "5",
    ]);
    const data = parseJsonOutput<Array<{ _id: number; title: string }>>(result);

    expect(Array.isArray(data)).toBe(true);
    // Results should be filtered (may be empty if no matches)
  });

  testWithAuth("list supports sort options", async () => {
    const result = await runCliExpectSuccess([
      "bookmarks",
      "list",
      "--sort",
      "title",
      "--limit",
      "3",
    ]);
    const data = parseJsonOutput<Array<{ _id: number; title: string }>>(result);

    expect(Array.isArray(data)).toBe(true);
    // Verify alphabetical order if we have multiple items
    if (data.length >= 2) {
      const first = data[0]!;
      const second = data[1]!;
      expect(first.title.toLowerCase() <= second.title.toLowerCase()).toBe(true);
    }
  });

  testWithAuth("list supports descending sort", async () => {
    const result = await runCliExpectSuccess([
      "bookmarks",
      "list",
      "--sort",
      "-created",
      "--limit",
      "3",
    ]);
    const data = parseJsonOutput<Array<{ _id: number; created: string }>>(result);

    expect(Array.isArray(data)).toBe(true);
    // Verify descending order by date
    if (data.length >= 2) {
      const first = data[0]!;
      const second = data[1]!;
      expect(first.created >= second.created).toBe(true);
    }
  });

  testWithAuth("list quiet mode outputs only IDs", async () => {
    const result = await runCliExpectSuccess(["bookmarks", "list", "--limit", "3", "-q"]);

    // Each line should be just an ID (number)
    const lines = result.stdout.trim().split("\n");
    for (const line of lines) {
      expect(line).toMatch(/^\d+$/);
    }
  });

  testWithAuth("list supports pagination", async () => {
    // Get first page
    const page0 = await runCliExpectSuccess(["bookmarks", "list", "--limit", "2", "--page", "0"]);
    const data0 = parseJsonOutput<Array<{ _id: number }>>(page0);

    // Get second page
    const page1 = await runCliExpectSuccess(["bookmarks", "list", "--limit", "2", "--page", "1"]);
    const data1 = parseJsonOutput<Array<{ _id: number }>>(page1);

    // Pages should have different items (if there are enough bookmarks)
    if (data0.length > 0 && data1.length > 0) {
      const first0 = data0[0]!;
      const first1 = data1[0]!;
      expect(first0._id).not.toBe(first1._id);
    }
  });

  testWithAuth("list table format works", async () => {
    const result = await runCli(["bookmarks", "list", "--limit", "2", "--format", "table"]);

    expect(result.exitCode).toBe(0);
    // Table format should have headers
    expect(result.stdout).toContain("ID");
    expect(result.stdout).toContain("Title");
    expect(result.stdout).toContain("URL");
  });

  testWithAuth("list tsv format works", async () => {
    const result = await runCli(["bookmarks", "list", "--limit", "2", "--format", "tsv"]);

    expect(result.exitCode).toBe(0);
    // TSV format should have tab-separated headers
    expect(result.stdout).toContain("ID\tTitle\tURL");
  });

  testWithAuth("list plain format works", async () => {
    const result = await runCli(["bookmarks", "list", "--limit", "2", "--format", "plain"]);

    expect(result.exitCode).toBe(0);
    // Plain format should have labeled fields with icons
    expect(result.stdout).toContain("ID");
    expect(result.stdout).toContain("Title");
    expect(result.stdout).toContain("URL");
    // Should have emoji icons
    expect(result.stdout).toContain("🔖"); // ID
    expect(result.stdout).toContain("📌"); // Title
    expect(result.stdout).toContain("🔗"); // URL
    // Styled separator between items
    expect(result.stdout).toContain("───");
  });
});
