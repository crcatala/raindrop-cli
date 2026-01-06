import { describe, test, expect } from "bun:test";
import { runCli } from "../test-utils/index.js";

/**
 * Integration smoke tests for the highlights command.
 *
 * These tests spawn the CLI as a subprocess to verify end-to-end behavior.
 * They are intentionally minimal since subprocess spawning is slow (~200ms each).
 *
 * For unit tests, see highlights.test.ts.
 * For validation tests, see src/utils/validation.test.ts.
 * For live API tests, see highlights.live.test.ts.
 */

describe("highlights CLI integration", () => {
  test("highlights --help exits 0 with expected output", async () => {
    const result = await runCli(["highlights", "--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("highlights");
    expect(result.stdout).toContain("list");
  });

  test("highlights list without auth fails gracefully", async () => {
    const result = await runCli(["highlights", "list"], {
      env: { RAINDROP_TOKEN: "" },
    });
    expect(result.exitCode).toBe(1);
    const hasAuthError = result.stderr.includes("No API token") || result.stderr.includes("401");
    expect(hasAuthError).toBe(true);
  });

  test("validation errors exit with code 2", async () => {
    const result = await runCli(["highlights", "get", "invalid"], {
      env: { RAINDROP_TOKEN: "fake-token" },
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Invalid bookmark ID");
  });
});
