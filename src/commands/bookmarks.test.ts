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
      expect(result.stdout).toContain("get");
    });

    test("bookmarks get --help shows usage", async () => {
      const result = await runCliExpectSuccess(["bookmarks", "get", "--help"]);
      expect(result.stdout).toContain("Get a single bookmark by ID");
      expect(result.stdout).toContain("<id>");
    });

    test("bookmarks list --help shows all options", async () => {
      const result = await runCliExpectSuccess(["bookmarks", "list", "--help"]);
      expect(result.stdout).toContain("--limit");
      expect(result.stdout).toContain("--page");
      expect(result.stdout).toContain("--sort");
      expect(result.stdout).toContain("--search");
      expect(result.stdout).toContain("collection-id");
    });

    test("bookmarks list --help shows search examples and doc link", async () => {
      const result = await runCliExpectSuccess(["bookmarks", "list", "--help"]);
      // Check for search examples
      expect(result.stdout).toContain("type:article");
      expect(result.stdout).toContain("#javascript");
      expect(result.stdout).toContain("domain:github.com");
      // Check for documentation link
      expect(result.stdout).toContain("help.raindrop.io/using-search");
    });

    test("bookmarks list --help shows convenience filter flags", async () => {
      const result = await runCliExpectSuccess(["bookmarks", "list", "--help"]);
      expect(result.stdout).toContain("--type");
      expect(result.stdout).toContain("--tag");
      expect(result.stdout).toContain("--domain");
      expect(result.stdout).toContain("--favorites");
      expect(result.stdout).toContain("--with-notes");
      expect(result.stdout).toContain("--with-highlights");
      expect(result.stdout).toContain("--without-tags");
      expect(result.stdout).toContain("--has-reminder");
      expect(result.stdout).toContain("--broken");
      expect(result.stdout).toContain("--created");
    });
  });

  describe("list command - without auth", () => {
    test("fails gracefully without token", async () => {
      const result = await runCli(["bookmarks", "list"], {
        env: { RAINDROP_TOKEN: "" },
      });
      expect(result.exitCode).toBe(1);
      // Should fail with either no token error or 401 from API
      const hasAuthError = result.stderr.includes("No API token") || result.stderr.includes("401");
      expect(hasAuthError).toBe(true);
    });
  });

  describe("get command - without auth", () => {
    test("fails gracefully without token", async () => {
      const result = await runCli(["bookmarks", "get", "12345"], {
        env: { RAINDROP_TOKEN: "" },
      });
      expect(result.exitCode).toBe(1);
      const hasAuthError = result.stderr.includes("No API token") || result.stderr.includes("401");
      expect(hasAuthError).toBe(true);
    });
  });

  describe("get command - validation", () => {
    test("rejects non-numeric ID", async () => {
      const result = await runCli(["bookmarks", "get", "abc"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Invalid bookmark ID");
    });

    test("rejects negative ID", async () => {
      const result = await runCli(["bookmarks", "get", "-1"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Invalid bookmark ID");
    });

    test("rejects zero ID", async () => {
      const result = await runCli(["bookmarks", "get", "0"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Invalid bookmark ID");
    });

    test("requires ID argument", async () => {
      const result = await runCli(["bookmarks", "get"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(1);
      // Commander shows missing argument error
      expect(result.stderr).toContain("missing required argument");
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

    test("rejects invalid type option", async () => {
      const result = await runCli(["bookmarks", "list", "--type", "invalid"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Invalid type");
      expect(result.stderr).toContain("article");
    });

    test("rejects invalid created date format", async () => {
      const result = await runCli(["bookmarks", "list", "--created", "yesterday"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Invalid date format");
      expect(result.stderr).toContain("YYYY-MM");
    });

    test("rejects malformed created date", async () => {
      const result = await runCli(["bookmarks", "list", "--created", "2025-1"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Invalid date format");
    });

    test("accepts valid YYYY-MM date format", async () => {
      // This will fail auth but validates the date format is accepted
      const result = await runCli(["bookmarks", "list", "--created", "2025-01"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      // Should not fail on date validation (will fail on auth instead)
      expect(result.stderr).not.toContain("Invalid date format");
    });

    test("accepts valid YYYY-MM-DD date format", async () => {
      const result = await runCli(["bookmarks", "list", "--created", "2025-01-15"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.stderr).not.toContain("Invalid date format");
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
    // Just verify we got results - exact sort order depends on API's collation
    // which may differ from JavaScript string comparison for special chars
    expect(data.length).toBeGreaterThan(0);
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
    // TSV format should have tab-separated headers (Title first, ID last)
    expect(result.stdout).toContain("Title\tURL");
    expect(result.stdout).toContain("\tID");
  });

  testWithAuth("list plain format works", async () => {
    const result = await runCli(["bookmarks", "list", "--limit", "2", "--format", "plain"]);

    expect(result.exitCode).toBe(0);
    // Plain format has prominent title/URL at top (no labels), then labeled fields
    // Should have emoji icons for regular fields
    expect(result.stdout).toContain("🔖"); // ID
    expect(result.stdout).toContain("📝"); // Excerpt
    expect(result.stdout).toContain("💬"); // Note
    // Styled separator between items
    expect(result.stdout).toContain("───");
    // Title and URL should be present (as content, not labels)
    expect(result.stdout).toContain("https://");
  });

  // Convenience filter flag tests
  testWithAuth("list supports --type filter", async () => {
    const result = await runCliExpectSuccess([
      "bookmarks",
      "list",
      "--type",
      "article",
      "--limit",
      "5",
    ]);
    const data = parseJsonOutput<Array<{ _id: number; type: string }>>(result);

    expect(Array.isArray(data)).toBe(true);
    // If results exist, they should all be articles
    for (const item of data) {
      expect(item.type).toBe("article");
    }
  });

  testWithAuth("list supports --tag filter", async () => {
    // This test just verifies the flag is accepted; results depend on user's tags
    const result = await runCli(["bookmarks", "list", "--tag", "test", "--limit", "5"]);

    // Should succeed (even if no matches)
    expect(result.exitCode).toBe(0);
  });

  testWithAuth("list supports --domain filter", async () => {
    const result = await runCliExpectSuccess([
      "bookmarks",
      "list",
      "--domain",
      "github.com",
      "--limit",
      "5",
    ]);
    const data = parseJsonOutput<Array<{ _id: number; domain: string }>>(result);

    expect(Array.isArray(data)).toBe(true);
    // If results exist, they should all be from github.com
    for (const item of data) {
      expect(item.domain).toBe("github.com");
    }
  });

  testWithAuth("list supports --favorites filter", async () => {
    // This test just verifies the flag is accepted
    const result = await runCli(["bookmarks", "list", "--favorites", "--limit", "5"]);

    expect(result.exitCode).toBe(0);
  });

  testWithAuth("list supports multiple filter flags combined", async () => {
    // Combine --type and --domain
    const result = await runCli([
      "bookmarks",
      "list",
      "--type",
      "article",
      "--domain",
      "github.com",
      "--limit",
      "5",
    ]);

    expect(result.exitCode).toBe(0);
  });

  testWithAuth("list supports filter flags combined with --search", async () => {
    // Combine --type with raw --search
    const result = await runCli([
      "bookmarks",
      "list",
      "--type",
      "article",
      "--search",
      "react",
      "--limit",
      "5",
    ]);

    expect(result.exitCode).toBe(0);
  });

  testWithAuth("list supports --broken filter", async () => {
    // This test just verifies the flag is accepted
    const result = await runCli(["bookmarks", "list", "--broken", "--limit", "5"]);

    expect(result.exitCode).toBe(0);
  });

  // Get command tests
  testWithAuth("get returns a bookmark as JSON", async () => {
    // First get a bookmark ID from the list
    const listResult = await runCliExpectSuccess(["bookmarks", "list", "--limit", "1"]);
    const listData = parseJsonOutput<Array<{ _id: number }>>(listResult);

    if (listData.length === 0) {
      // No bookmarks to test with
      return;
    }

    const bookmarkId = listData[0]!._id;
    const result = await runCliExpectSuccess(["bookmarks", "get", String(bookmarkId)]);
    const data = parseJsonOutput<{
      _id: number;
      title: string;
      link: string;
      highlights: Array<{ text: string }>;
    }>(result);

    expect(data._id).toBe(bookmarkId);
    expect(data).toHaveProperty("title");
    expect(data).toHaveProperty("link");
    expect(data).toHaveProperty("highlights");
    expect(Array.isArray(data.highlights)).toBe(true);
  });

  testWithAuth("get includes full metadata", async () => {
    // First get a bookmark ID from the list
    const listResult = await runCliExpectSuccess(["bookmarks", "list", "--limit", "1"]);
    const listData = parseJsonOutput<Array<{ _id: number }>>(listResult);

    if (listData.length === 0) {
      return;
    }

    const bookmarkId = listData[0]!._id;
    const result = await runCliExpectSuccess(["bookmarks", "get", String(bookmarkId)]);
    const data = parseJsonOutput<{
      _id: number;
      title: string;
      link: string;
      domain: string;
      type: string;
      collectionId: number;
      created: string;
      lastUpdate: string;
    }>(result);

    // Verify all expected metadata fields are present
    expect(data).toHaveProperty("_id");
    expect(data).toHaveProperty("title");
    expect(data).toHaveProperty("link");
    expect(data).toHaveProperty("domain");
    expect(data).toHaveProperty("type");
    expect(data).toHaveProperty("collectionId");
    expect(data).toHaveProperty("created");
    expect(data).toHaveProperty("lastUpdate");
  });

  testWithAuth("get quiet mode outputs only ID", async () => {
    const listResult = await runCliExpectSuccess(["bookmarks", "list", "--limit", "1"]);
    const listData = parseJsonOutput<Array<{ _id: number }>>(listResult);

    if (listData.length === 0) {
      return;
    }

    const bookmarkId = listData[0]!._id;
    const result = await runCliExpectSuccess(["bookmarks", "get", String(bookmarkId), "-q"]);

    // Should output just the ID
    expect(result.stdout.trim()).toBe(String(bookmarkId));
  });

  testWithAuth("get plain format works", async () => {
    const listResult = await runCliExpectSuccess(["bookmarks", "list", "--limit", "1"]);
    const listData = parseJsonOutput<Array<{ _id: number }>>(listResult);

    if (listData.length === 0) {
      return;
    }

    const bookmarkId = listData[0]!._id;
    const result = await runCli(["bookmarks", "get", String(bookmarkId), "--format", "plain"]);

    expect(result.exitCode).toBe(0);
    // Plain format should include metadata fields
    expect(result.stdout).toContain("🔖"); // ID icon
    expect(result.stdout).toContain("🌐"); // Domain icon
  });

  testWithAuth("get table format works", async () => {
    const listResult = await runCliExpectSuccess(["bookmarks", "list", "--limit", "1"]);
    const listData = parseJsonOutput<Array<{ _id: number }>>(listResult);

    if (listData.length === 0) {
      return;
    }

    const bookmarkId = listData[0]!._id;
    const result = await runCli(["bookmarks", "get", String(bookmarkId), "--format", "table"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("ID");
    expect(result.stdout).toContain("Title");
  });

  testWithAuth("get returns 404 for non-existent bookmark", async () => {
    // Use a very large ID that's unlikely to exist
    const result = await runCli(["bookmarks", "get", "999999999"]);

    expect(result.exitCode).toBe(1);
    // Should return a 404 or "not found" error
    const hasNotFound =
      result.stderr.includes("404") ||
      result.stderr.includes("not found") ||
      result.stderr.includes("Not Found");
    expect(hasNotFound).toBe(true);
  });
});
