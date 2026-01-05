import { describe, test, expect } from "bun:test";
import { runCli, runCliExpectSuccess } from "../test-utils/index.js";

/**
 * Unit tests for the bookmarks command.
 *
 * These tests do NOT require authentication and test:
 * - Help output
 * - Argument validation
 * - Error handling for missing auth
 *
 * For live API tests, see bookmarks.live.test.ts
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
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid bookmark ID");
    });

    test("rejects negative ID", async () => {
      const result = await runCli(["bookmarks", "get", "-1"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid bookmark ID");
    });

    test("rejects zero ID", async () => {
      const result = await runCli(["bookmarks", "get", "0"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid bookmark ID");
    });

    test("requires ID argument", async () => {
      const result = await runCli(["bookmarks", "get"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      // Commander shows missing argument error
      expect(result.stderr).toContain("missing required argument");
    });
  });

  describe("list command - validation", () => {
    test("rejects invalid limit (too high)", async () => {
      const result = await runCli(["bookmarks", "list", "--limit", "100"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid limit");
      expect(result.stderr).toContain("1 and 50");
    });

    test("rejects invalid limit (too low)", async () => {
      const result = await runCli(["bookmarks", "list", "--limit", "0"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid limit");
      expect(result.stderr).toContain("1 and 50");
    });

    test("rejects invalid sort option", async () => {
      const result = await runCli(["bookmarks", "list", "--sort", "invalid"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid sort option");
    });

    test("rejects invalid collection ID", async () => {
      const result = await runCli(["bookmarks", "list", "notanumber"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid collection ID");
    });

    test("rejects negative page number", async () => {
      const result = await runCli(["bookmarks", "list", "--page", "-1"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid page");
      expect(result.stderr).toContain("non-negative");
    });

    test("rejects invalid type option", async () => {
      const result = await runCli(["bookmarks", "list", "--type", "invalid"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid type");
      expect(result.stderr).toContain("article");
    });

    test("rejects invalid created date format", async () => {
      const result = await runCli(["bookmarks", "list", "--created", "yesterday"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid date format");
      expect(result.stderr).toContain("YYYY-MM");
    });

    test("rejects malformed created date", async () => {
      const result = await runCli(["bookmarks", "list", "--created", "2025-1"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
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

describe("bookmarks delete command", () => {
  describe("validation", () => {
    test("rejects missing argument", async () => {
      const result = await runCli(["bookmarks", "delete"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("error: missing required argument 'id'");
    });

    test("rejects invalid ID", async () => {
      const result = await runCli(["bookmarks", "delete", "notanumber"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid bookmark ID");
    });
    test("rejects invalid bookmark ID (zero)", async () => {
      const result = await runCli(["bookmarks", "delete", "0"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid bookmark ID");
    });

    test("rejects invalid bookmark ID (negative)", async () => {
      const result = await runCli(["bookmarks", "delete", "-1"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid bookmark ID");
    });
  });

  describe("help", () => {
    test("bookmarks delete --help shows options", async () => {
      const result = await runCliExpectSuccess(["bookmarks", "delete", "--help"]);
      expect(result.stdout).toContain("--permanent");
      expect(result.stdout).toContain("--force");
      expect(result.stdout).toContain("--dry-run");
      expect(result.stdout).toContain("-n");
    });
  });
});

describe("bookmarks add command", () => {
  describe("help", () => {
    test("bookmarks add --help shows usage", async () => {
      const result = await runCliExpectSuccess(["bookmarks", "add", "--help"]);
      expect(result.stdout).toContain("Add a new bookmark");
      expect(result.stdout).toContain("<url>");
      expect(result.stdout).toContain("--title");
      expect(result.stdout).toContain("--excerpt");
      expect(result.stdout).toContain("--note");
      expect(result.stdout).toContain("--tags");
      expect(result.stdout).toContain("--collection");
      expect(result.stdout).toContain("--parse");
    });
  });

  describe("validation", () => {
    test("rejects missing URL argument", async () => {
      const result = await runCli(["bookmarks", "add"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("missing required argument");
    });

    test("rejects invalid URL (no protocol)", async () => {
      const result = await runCli(["bookmarks", "add", "example.com"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid URL");
    });

    test("rejects invalid URL (wrong protocol)", async () => {
      const result = await runCli(["bookmarks", "add", "ftp://example.com"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid URL");
    });

    test("rejects malformed URL (empty host)", async () => {
      const result = await runCli(["bookmarks", "add", "https://"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid URL");
    });

    test("rejects malformed URL (invalid characters)", async () => {
      const result = await runCli(["bookmarks", "add", "https://[invalid"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid URL");
    });

    test("rejects invalid collection ID", async () => {
      const result = await runCli(
        ["bookmarks", "add", "https://example.com", "--collection", "notanumber"],
        {
          env: { RAINDROP_TOKEN: "fake-token" },
        }
      );
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid collection ID");
    });
  });

  describe("without auth", () => {
    test("fails gracefully without token", async () => {
      const result = await runCli(["bookmarks", "add", "https://example.com"], {
        env: { RAINDROP_TOKEN: "" },
      });
      expect(result.exitCode).toBe(1);
      const hasAuthError = result.stderr.includes("No API token") || result.stderr.includes("401");
      expect(hasAuthError).toBe(true);
    });
  });
});

describe("bookmarks update command", () => {
  describe("help", () => {
    test("bookmarks update --help shows usage", async () => {
      const result = await runCliExpectSuccess(["bookmarks", "update", "--help"]);
      expect(result.stdout).toContain("Update an existing bookmark");
      expect(result.stdout).toContain("<id>");
      expect(result.stdout).toContain("--title");
      expect(result.stdout).toContain("--excerpt");
      expect(result.stdout).toContain("--note");
      expect(result.stdout).toContain("--tags");
      expect(result.stdout).toContain("--add-tags");
      expect(result.stdout).toContain("--remove-tags");
      expect(result.stdout).toContain("--collection");
      expect(result.stdout).toContain("--important");
      expect(result.stdout).toContain("--no-important");
      expect(result.stdout).toContain("--dry-run");
    });
  });

  describe("validation", () => {
    test("rejects missing ID argument", async () => {
      const result = await runCli(["bookmarks", "update"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("missing required argument");
    });

    test("rejects non-numeric ID", async () => {
      const result = await runCli(["bookmarks", "update", "abc", "--title", "Test"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid bookmark ID");
    });

    test("rejects zero ID", async () => {
      const result = await runCli(["bookmarks", "update", "0", "--title", "Test"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid bookmark ID");
    });

    test("rejects negative ID", async () => {
      const result = await runCli(["bookmarks", "update", "-1", "--title", "Test"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid bookmark ID");
    });

    test("rejects update with no fields specified", async () => {
      const result = await runCli(["bookmarks", "update", "12345"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("No fields to update");
    });

    test("rejects combining --tags with --add-tags", async () => {
      const result = await runCli(
        ["bookmarks", "update", "12345", "--tags", "new", "--add-tags", "extra"],
        {
          env: { RAINDROP_TOKEN: "fake-token" },
        }
      );
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Cannot combine --tags with --add-tags or --remove-tags");
    });

    test("rejects combining --tags with --remove-tags", async () => {
      const result = await runCli(
        ["bookmarks", "update", "12345", "--tags", "new", "--remove-tags", "old"],
        {
          env: { RAINDROP_TOKEN: "fake-token" },
        }
      );
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Cannot combine --tags with --add-tags or --remove-tags");
    });

    test("rejects invalid collection ID", async () => {
      const result = await runCli(["bookmarks", "update", "12345", "--collection", "notanumber"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid collection ID");
    });
  });

  describe("without auth", () => {
    test("fails gracefully without token", async () => {
      const result = await runCli(["bookmarks", "update", "12345", "--title", "Test"], {
        env: { RAINDROP_TOKEN: "" },
      });
      expect(result.exitCode).toBe(1);
      const hasAuthError = result.stderr.includes("No API token") || result.stderr.includes("401");
      expect(hasAuthError).toBe(true);
    });
  });
});

/**
 * Tests for batch-update command
 */
describe("bookmarks batch-update command", () => {
  describe("help and validation", () => {
    test("batch-update --help shows all options", async () => {
      const result = await runCliExpectSuccess(["bookmarks", "batch-update", "--help"]);
      expect(result.stdout).toContain("--ids");
      expect(result.stdout).toContain("--collection");
      expect(result.stdout).toContain("--add-tags");
      expect(result.stdout).toContain("--remove-tags");
      expect(result.stdout).toContain("--tags");
      expect(result.stdout).toContain("--important");
      expect(result.stdout).toContain("--no-important");
      expect(result.stdout).toContain("--move-to");
      expect(result.stdout).toContain("--force");
      expect(result.stdout).toContain("stdin");
      expect(result.stdout).toContain("--dry-run");
      expect(result.stdout).toContain("-n");
    });

    test("batch-update fails without any IDs or collection", async () => {
      const result = await runCli(["bookmarks", "batch-update", "--add-tags", "test", "--force"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("No bookmarks specified");
    });

    test("batch-update fails without any update options", async () => {
      const result = await runCli(["bookmarks", "batch-update", "--ids", "123", "--force"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("No updates specified");
    });

    test("batch-update rejects combining --tags with --add-tags", async () => {
      const result = await runCli(
        ["bookmarks", "batch-update", "--ids", "123", "--tags", "a", "--add-tags", "b", "--force"],
        { env: { RAINDROP_TOKEN: "fake-token" } }
      );
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Cannot combine --tags with --add-tags");
    });

    test("batch-update rejects invalid IDs", async () => {
      const result = await runCli(
        ["bookmarks", "batch-update", "--ids", "123,abc,456", "--add-tags", "test", "--force"],
        { env: { RAINDROP_TOKEN: "fake-token" } }
      );
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Invalid bookmark IDs: abc");
    });
  });
});

/**
 * Tests for batch-delete command
 */
describe("bookmarks batch-delete command", () => {
  describe("help and validation", () => {
    test("batch-delete --help shows all options", async () => {
      const result = await runCliExpectSuccess(["bookmarks", "batch-delete", "--help"]);
      expect(result.stdout).toContain("--ids");
      expect(result.stdout).toContain("--collection");
      expect(result.stdout).toContain("--search");
      expect(result.stdout).toContain("--force");
      expect(result.stdout).toContain("stdin");
      expect(result.stdout).toContain("--dry-run");
      expect(result.stdout).toContain("-n");
    });

    test("batch-delete fails without any IDs or collection", async () => {
      const result = await runCli(["bookmarks", "batch-delete", "--force"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("No bookmarks specified");
    });

    test("batch-delete rejects invalid IDs", async () => {
      const result = await runCli(["bookmarks", "batch-delete", "--ids", "123,-5,456", "--force"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Invalid bookmark IDs: -5");
    });
  });
});
