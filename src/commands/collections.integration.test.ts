import { describe, test, expect } from "bun:test";
import { runCli } from "../test-utils/index.js";

/**
 * Integration smoke tests for the collections command.
 *
 * These tests spawn the CLI as a subprocess to verify end-to-end behavior.
 * They are intentionally minimal since subprocess spawning is slow (~200ms each).
 *
 * For unit tests, see collections.test.ts.
 * For validation tests, see src/utils/validation.test.ts.
 * For live API tests, see collections.live.test.ts.
 */

describe("collections CLI integration", () => {
  test("collections --help exits 0 with expected output", async () => {
    const result = await runCli(["collections", "--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Manage collections");
    expect(result.stdout).toContain("list");
  });

  test("collections list without auth fails gracefully", async () => {
    const result = await runCli(["collections", "list"], {
      env: { RAINDROP_TOKEN: "" },
    });
    expect(result.exitCode).toBe(1);
    const hasAuthError =
      result.stderr.includes("No API token") ||
      result.stderr.includes("401") ||
      result.stderr.includes("Unauthorized");
    expect(hasAuthError).toBe(true);
  });

  test("validation errors exit with code 2 - invalid collection ID", async () => {
    const result = await runCli(["collections", "show", "notanumber"], {
      env: { RAINDROP_TOKEN: "fake-token" },
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Invalid collection ID");
  });

  test("validation errors exit with code 2 - empty collection name", async () => {
    const result = await runCli(["collections", "create", "   "], {
      env: { RAINDROP_TOKEN: "fake-token" },
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Collection name cannot be empty");
  });

  test("validation errors exit with code 2 - invalid parent ID", async () => {
    const result = await runCli(["collections", "create", "Test", "--parent", "notanumber"], {
      env: { RAINDROP_TOKEN: "fake-token" },
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Invalid collection ID");
  });
});
