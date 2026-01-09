/**
 * Live integration tests for the highlights command.
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

/**
 * Integration tests that require a valid RAINDROP_TOKEN.
 * These are skipped if no token is available.
 */
describe("highlights command - with auth", () => {
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
      env: { RAINDROP_TOKEN: process.env.RAINDROP_TOKEN || "", ...options.env },
    });
  const runCliExpectSuccess = (
    args: string[],
    options: Parameters<typeof runCliExpectSuccessBase>[1] = {}
  ) =>
    runCliExpectSuccessBase(args, {
      timeout: AUTH_CLI_TIMEOUT,
      ...options,
      env: { RAINDROP_TOKEN: process.env.RAINDROP_TOKEN || "", ...options.env },
    });

  testWithAuth("list returns highlights as JSON", async () => {
    const result = await runCliExpectSuccess(["highlights", "list"]);
    const data = parseJsonOutput<
      Array<{
        _id: string;
        text: string;
        title: string;
        link: string;
        created: string;
      }>
    >(result);

    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty("_id");
      expect(data[0]).toHaveProperty("text");
      expect(data[0]).toHaveProperty("title");
      expect(data[0]).toHaveProperty("link");
      expect(typeof data[0]!._id).toBe("string");
      expect(typeof data[0]!.text).toBe("string");
    }
  });

  testWithAuth("list supports --limit option", async () => {
    const result = await runCliExpectSuccess(["highlights", "list", "--limit", "5"]);
    const data = parseJsonOutput<Array<{ _id: string }>>(result);

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeLessThanOrEqual(5);
  });

  testWithAuth("list supports special collection names", async () => {
    const result = await runCliExpectSuccess(["highlights", "list", "--collection", "all"]);
    const data = parseJsonOutput<Array<{ _id: string }>>(result);

    expect(Array.isArray(data)).toBe(true);
  });

  testWithAuth("list supports numeric collection ID", async () => {
    const result = await runCliExpectSuccess(["highlights", "list", "--collection", "0"]);
    const data = parseJsonOutput<Array<{ _id: string }>>(result);

    expect(Array.isArray(data)).toBe(true);
  });

  testWithAuth("list quiet mode outputs only highlight IDs", async () => {
    const result = await runCliExpectSuccess(["highlights", "list", "-q"]);

    const lines = result.stdout.trim().split("\n");
    if (lines.length > 0 && lines[0]) {
      expect(lines[0]).not.toContain("{");
    }
  });

  testWithAuth("list table format works", async () => {
    const result = await runCli(["highlights", "list", "--format", "table"]);

    expect(result.exitCode).toBe(0);
    // Table format has headers
    expect(result.stdout).toContain("ID");
    expect(result.stdout).toContain("Highlight");
  });

  testWithAuth("list tsv format works", async () => {
    const result = await runCli(["highlights", "list", "--format", "tsv"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("ID\t");
  });

  testWithAuth("list plain format works", async () => {
    const result = await runCli(["highlights", "list", "--format", "plain"]);

    expect(result.exitCode).toBe(0);
    // Plain format should have styled dividers between items (if there are items)
    if (result.stdout.trim().length > 0) {
      // Either has dividers or is empty/no-results
      const hasDividers = result.stdout.includes("───");
      const isEmpty = result.stdout.trim() === "";
      const hasEmptyMessage = result.stdout.includes("No results found");
      expect(hasDividers || isEmpty || hasEmptyMessage).toBe(true);
    }
  });
});
