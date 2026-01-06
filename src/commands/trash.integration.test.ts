import { describe, test, expect } from "bun:test";
import { runCli } from "../test-utils/index.js";

/**
 * Integration smoke tests for the trash command.
 *
 * These tests spawn the CLI as a subprocess to verify end-to-end behavior.
 * They are intentionally minimal since subprocess spawning is slow (~200ms each).
 *
 * For unit tests, see trash.test.ts.
 */

describe("trash CLI integration", () => {
  test("trash --help exits 0 with expected output", async () => {
    const result = await runCli(["trash", "--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Manage trash");
    expect(result.stdout).toContain("empty");
    expect(result.stdout).toContain("list");
  });

  test("trash empty without --force fails with code 2", async () => {
    const result = await runCli(["trash", "empty"], {
      env: { RAINDROP_TOKEN: "fake-token" },
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("--force");
    expect(result.stderr).toContain("permanently delete");
  });

  test("trash empty with --force without auth fails gracefully", async () => {
    const result = await runCli(["trash", "empty", "--force"], {
      env: { RAINDROP_TOKEN: "" },
    });
    expect(result.exitCode).toBe(1);
    const hasAuthError =
      result.stderr.includes("No API token") ||
      result.stderr.includes("401") ||
      result.stderr.includes("Unauthorized");
    expect(hasAuthError).toBe(true);
  });

  test("trash empty dry-run without auth fails gracefully", async () => {
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

  describe("trash list", () => {
    test("trash list --help exits 0 with expected output", async () => {
      const result = await runCli(["trash", "list", "--help"]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("List items in trash");
      expect(result.stdout).toContain("--limit");
      expect(result.stdout).toContain("--page");
      expect(result.stdout).toContain("--sort");
      expect(result.stdout).toContain("--search");
    });

    test("trash ls --help works (alias)", async () => {
      const result = await runCli(["trash", "ls", "--help"]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("List items in trash");
    });

    test("trash list without auth fails gracefully", async () => {
      const result = await runCli(["trash", "list"], {
        env: { RAINDROP_TOKEN: "" },
      });
      expect(result.exitCode).toBe(1);
      const hasAuthError =
        result.stderr.includes("No API token") ||
        result.stderr.includes("401") ||
        result.stderr.includes("Unauthorized");
      expect(hasAuthError).toBe(true);
    });

    test("trash list with invalid limit fails with code 2", async () => {
      const result = await runCli(["trash", "list", "--limit", "invalid"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid limit");
    });

    test("trash list with invalid sort fails with code 2", async () => {
      const result = await runCli(["trash", "list", "--sort", "invalid"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid sort");
    });

    test("trash list with limit > 50 fails with code 2", async () => {
      const result = await runCli(["trash", "list", "--limit", "100"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid limit");
    });

    test("trash list with negative page fails with code 2", async () => {
      const result = await runCli(["trash", "list", "--page", "-1"], {
        env: { RAINDROP_TOKEN: "fake-token" },
      });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid page");
    });
  });
});
