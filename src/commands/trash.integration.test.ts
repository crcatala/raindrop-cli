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
});
