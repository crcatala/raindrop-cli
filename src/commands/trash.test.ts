import { describe, test, expect } from "bun:test";
import { runCli, runCliExpectSuccess } from "../test-utils/index.js";

/**
 * Tests for the trash command.
 *
 * Integration tests that run the CLI as a subprocess.
 * Some tests require a valid RAINDROP_TOKEN environment variable.
 */

describe("trash command", () => {
  describe("help", () => {
    test("trash --help shows command description", async () => {
      const result = await runCliExpectSuccess(["trash", "--help"]);
      expect(result.stdout).toContain("Manage trash collection");
      expect(result.stdout).toContain("empty");
    });

    test("trash empty --help shows usage", async () => {
      const result = await runCliExpectSuccess(["trash", "empty", "--help"]);
      expect(result.stdout).toContain("Permanently delete all items in trash");
      expect(result.stdout).toContain("--force");
      expect(result.stdout).toContain("--dry-run");
    });
  });

  describe("empty command - requires --force", () => {
    test("fails without --force flag", async () => {
      const result = await runCli(["trash", "empty"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("--force");
    });

    test("shows warning about permanent deletion", async () => {
      const result = await runCli(["trash", "empty"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("permanently delete");
      expect(result.stderr).toContain("cannot be undone");
    });
  });

  describe("empty command - without auth", () => {
    test("fails gracefully without token", async () => {
      const result = await runCli(["trash", "empty", "--force"], {
        env: { RAINDROP_TOKEN: "" },
      });
      expect(result.exitCode).toBe(1);
      // Should fail with auth error
      const hasAuthError =
        result.stderr.includes("No API token") ||
        result.stderr.includes("401") ||
        result.stderr.includes("Unauthorized");
      expect(hasAuthError).toBe(true);
    });

    test("dry-run fails gracefully without token", async () => {
      const result = await runCli(["trash", "empty", "--dry-run"], {
        env: { RAINDROP_TOKEN: "" },
      });
      expect(result.exitCode).toBe(1);
      const hasAuthError =
        result.stderr.includes("No API token") ||
        result.stderr.includes("401") ||
        result.stderr.includes("Unauthorized");
      expect(hasAuthError).toBe(true);
    });
  });
});
