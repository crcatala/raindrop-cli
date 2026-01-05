import { describe, test, expect } from "bun:test";
import { runCli, runCliExpectSuccess } from "../test-utils/index.js";

/**
 * Unit tests for the tags command.
 *
 * These tests do NOT require authentication and test:
 * - Help output
 * - Argument validation
 * - Error handling for missing auth
 *
 * For live API tests, see tags.live.test.ts
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
