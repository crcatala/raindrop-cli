import { describe, test, expect } from "bun:test";
import { runCli, runCliExpectSuccess } from "../test-utils/index.js";

/**
 * Unit tests for the collections command.
 *
 * These tests do NOT require authentication and test:
 * - Help output
 * - Argument validation
 * - Error handling for missing auth
 *
 * For live API tests, see collections.live.test.ts
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

    test("collections create --help shows arguments and options", async () => {
      const result = await runCliExpectSuccess(["collections", "create", "--help"]);
      expect(result.stdout).toContain("name");
      expect(result.stdout).toContain("--parent");
      expect(result.stdout).toContain("-p");
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

    test("rejects invalid parent ID", async () => {
      const result = await runCli(["collections", "create", "Test", "--parent", "notanumber"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid collection ID");
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
