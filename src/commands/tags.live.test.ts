/**
 * Live integration tests for the tags command.
 *
 * These tests require a valid RAINDROP_TOKEN environment variable.
 * They are skipped automatically if no token is available.
 *
 * Run with: bun run test:live
 */

import { describe, test, expect } from "bun:test";
import { runCli, runCliExpectSuccess, parseJsonOutput } from "../test-utils/index.js";
import { AUTH_CLI_TIMEOUT_MS, AUTH_TEST_TIMEOUT_MS } from "../test-utils/timeouts.js";
import { setupLiveTests } from "../test-utils/live-setup.js";

// Set up cleanup before live tests
setupLiveTests();

const runCliBase = runCli;
const runCliExpectSuccessBase = runCliExpectSuccess;

// Capture token at module level to ensure stability
const LIVE_TOKEN = process.env.RAINDROP_TOKEN || "";

/**
 * Integration tests that require a valid RAINDROP_TOKEN.
 * These are skipped if no token is available.
 */
describe("tags command - with auth", () => {
  const hasToken = !!process.env["RAINDROP_TOKEN"];
  const AUTH_TEST_TIMEOUT = AUTH_TEST_TIMEOUT_MS;

  const testWithAuth = hasToken
    ? (name: string, fn: () => Promise<void>) => test(name, fn, { timeout: AUTH_TEST_TIMEOUT })
    : test.skip;

  const AUTH_CLI_TIMEOUT = AUTH_CLI_TIMEOUT_MS;
  const runCli = (args: string[], options: Parameters<typeof runCliBase>[1] = {}) =>
    runCliBase(args, {
      timeout: AUTH_CLI_TIMEOUT,
      ...options,
      env: { RAINDROP_TOKEN: LIVE_TOKEN, ...options.env },
    });
  const runCliExpectSuccess = (
    args: string[],
    options: Parameters<typeof runCliExpectSuccessBase>[1] = {}
  ) =>
    runCliExpectSuccessBase(args, {
      timeout: AUTH_CLI_TIMEOUT,
      ...options,
      env: { RAINDROP_TOKEN: LIVE_TOKEN, ...options.env },
    });

  testWithAuth("list returns tags as JSON", async () => {
    const result = await runCliExpectSuccess(["tags", "list", "--format", "json"]);
    const data = parseJsonOutput<Array<{ _id: string; count: number }>>(result);

    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty("_id");
      expect(data[0]).toHaveProperty("count");
      expect(typeof data[0]!._id).toBe("string");
      expect(typeof data[0]!.count).toBe("number");
    }
  });

  testWithAuth("list supports special collection names", async () => {
    const result = await runCliExpectSuccess(["tags", "list", "unsorted", "--format", "json"]);
    const data = parseJsonOutput<Array<{ _id: string; count: number }>>(result);

    expect(Array.isArray(data)).toBe(true);
  });

  testWithAuth("list supports numeric collection ID", async () => {
    const result = await runCliExpectSuccess(["tags", "list", "0", "--format", "json"]);
    const data = parseJsonOutput<Array<{ _id: string; count: number }>>(result);

    expect(Array.isArray(data)).toBe(true);
  });

  testWithAuth("list quiet mode outputs only tag names", async () => {
    const result = await runCliExpectSuccess(["tags", "list", "-q"]);

    // Each line should be a tag name (the _id field)
    const lines = result.stdout.trim().split("\n");
    // At least verify it's not empty and not JSON
    if (lines.length > 0 && lines[0]) {
      expect(lines[0]).not.toContain("{");
    }
  });

  testWithAuth("list table format works", async () => {
    const result = await runCli(["tags", "list", "--format", "table"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Tag");
    expect(result.stdout).toContain("Count");
  });

  testWithAuth("list tsv format works", async () => {
    const result = await runCli(["tags", "list", "--format", "tsv"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Tag\t");
  });

  testWithAuth("list plain format works", async () => {
    const result = await runCli(["tags", "list", "--format", "plain"]);

    expect(result.exitCode).toBe(0);
    // Plain format outputs simple "tagname (count)" per line
    const lines = result.stdout.trim().split("\n");
    if (lines.length > 0 && lines[0] && !lines[0].includes("No tags")) {
      // Should have parentheses with count
      expect(lines[0]).toMatch(/\(\d+\)/);
    }
  });

  // Note: We don't test rename and delete with real operations here
  // since they would modify the user's actual data. Those should be
  // tested with mocked API responses in unit tests.
});
