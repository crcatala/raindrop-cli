import { describe, test, expect } from "bun:test";
import { runCli } from "../test-utils/index.js";

/**
 * Integration smoke tests for the bookmarks command.
 *
 * These tests spawn the CLI as a subprocess to verify end-to-end behavior.
 * They are intentionally minimal since subprocess spawning is slow (~200ms each).
 *
 * For unit tests, see bookmarks.test.ts.
 * For validation tests, see src/utils/validation.test.ts.
 * For live API tests, see bookmarks.live.test.ts.
 */

describe("bookmarks CLI integration", () => {
  test("bookmarks --help exits 0 with expected output", async () => {
    const result = await runCli(["bookmarks", "--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Manage bookmarks");
    expect(result.stdout).toContain("list");
  });

  test("bookmarks list without auth fails gracefully", async () => {
    const result = await runCli(["bookmarks", "list"], {
      env: { RAINDROP_TOKEN: "" },
    });
    expect(result.exitCode).toBe(1);
    const hasAuthError =
      result.stderr.includes("No API token") ||
      result.stderr.includes("401") ||
      result.stderr.includes("Unauthorized");
    expect(hasAuthError).toBe(true);
  });

  test("validation errors exit with code 2 - invalid bookmark ID", async () => {
    const result = await runCli(["bookmarks", "show", "abc"], {
      env: { RAINDROP_TOKEN: "fake-token" },
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Invalid bookmark ID");
  });

  test("validation errors exit with code 2 - invalid limit", async () => {
    const result = await runCli(["bookmarks", "list", "--limit", "100"], {
      env: { RAINDROP_TOKEN: "fake-token" },
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Invalid limit");
  });

  test("validation errors exit with code 2 - invalid sort", async () => {
    const result = await runCli(["bookmarks", "list", "--sort", "invalid"], {
      env: { RAINDROP_TOKEN: "fake-token" },
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Invalid sort option");
  });

  test("validation errors exit with code 2 - invalid URL", async () => {
    const result = await runCli(["bookmarks", "add", "example.com"], {
      env: { RAINDROP_TOKEN: "fake-token" },
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Invalid URL");
  });

  test("validation errors exit with code 2 - update with no fields", async () => {
    const result = await runCli(["bookmarks", "update", "12345"], {
      env: { RAINDROP_TOKEN: "fake-token" },
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("No fields to update");
  });

  test("validation errors exit with code 2 - conflicting tag options", async () => {
    const result = await runCli(
      ["bookmarks", "update", "12345", "--tags", "new", "--add-tags", "extra"],
      {
        env: { RAINDROP_TOKEN: "fake-token" },
      }
    );
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Cannot combine --tags with --add-tags or --remove-tags");
  });
});
