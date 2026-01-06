import { describe, test, expect } from "bun:test";
import { runCli } from "../test-utils/index.js";

/**
 * Integration smoke tests for the tags command.
 *
 * These tests spawn the CLI as a subprocess to verify end-to-end behavior.
 * They are intentionally minimal since subprocess spawning is slow (~200ms each).
 *
 * For unit tests, see tags.test.ts.
 * For validation tests, see src/utils/validation.test.ts.
 * For live API tests, see tags.live.test.ts.
 */

describe("tags CLI integration", () => {
  test("tags --help exits 0 with expected output", async () => {
    const result = await runCli(["tags", "--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("tags");
    expect(result.stdout).toContain("list");
  });

  test("tags list without auth fails gracefully", async () => {
    const result = await runCli(["tags", "list"], {
      env: { RAINDROP_TOKEN: "" },
    });
    expect(result.exitCode).toBe(1);
    const hasAuthError =
      result.stderr.includes("No API token") ||
      result.stderr.includes("401") ||
      result.stderr.includes("Unauthorized");
    expect(hasAuthError).toBe(true);
  });

  test("validation errors exit with code 2", async () => {
    const result = await runCli(["tags", "list", "notanumber"], {
      env: { RAINDROP_TOKEN: "fake-token" },
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Invalid collection ID");
  });

  test("rename without --force exits with code 2", async () => {
    const result = await runCli(["tags", "rename", "old-tag", "new-tag"], {
      env: { RAINDROP_TOKEN: "fake-token" },
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("--force");
  });

  test("delete without --force exits with code 2", async () => {
    const result = await runCli(["tags", "delete", "some-tag"], {
      env: { RAINDROP_TOKEN: "fake-token" },
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("--force");
  });
});
