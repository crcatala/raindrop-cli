/**
 * Live integration tests for the bookmarks command.
 *
 * These tests require a valid RAINDROP_TOKEN environment variable.
 * They are skipped automatically if no token is available.
 *
 * Run with: bun run test:live
 */

import { describe, test, expect } from "bun:test";
import { runCli, runCliExpectSuccess, parseJsonOutput } from "../test-utils/index.js";
import { AUTH_CLI_TIMEOUT_MS, AUTH_TEST_TIMEOUT_MS } from "../test-utils/timeouts.js";
import {
  setupLiveTests,
  createTestBookmark,
  deleteTestBookmark,
  TEST_BOOKMARK_PREFIX,
  TEST_TAG_PREFIX,
} from "../test-utils/live-setup.js";

// Set up cleanup before live tests
setupLiveTests();

const runCliBase = runCli;
const runCliExpectSuccessBase = runCliExpectSuccess;

/**
 * Integration tests that require a valid RAINDROP_TOKEN.
 * These are skipped if no token is available.
 */
describe("bookmarks command - with auth", () => {
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

  testWithAuth("list returns bookmarks as JSON", async () => {
    const result = await runCliExpectSuccess(["bookmarks", "list", "--limit", "2"]);
    const data = parseJsonOutput<Array<{ _id: number; title: string; link: string }>>(result);

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeLessThanOrEqual(2);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty("_id");
      expect(data[0]).toHaveProperty("title");
      expect(data[0]).toHaveProperty("link");
    }
  });

  testWithAuth("list supports special collection names", async () => {
    // Test 'unsorted' collection
    const result = await runCliExpectSuccess(["bookmarks", "list", "unsorted", "--limit", "1"]);
    const data = parseJsonOutput<Array<{ _id: number; collectionId: number }>>(result);

    expect(Array.isArray(data)).toBe(true);
    // Items from unsorted collection have collectionId -1
    if (data.length > 0) {
      const first = data[0]!;
      expect(first.collectionId).toBe(-1);
    }
  });

  testWithAuth("list supports numeric collection ID", async () => {
    // Test 'all' collection (ID 0)
    const result = await runCliExpectSuccess(["bookmarks", "list", "0", "--limit", "1"]);
    const data = parseJsonOutput<Array<{ _id: number }>>(result);

    expect(Array.isArray(data)).toBe(true);
  });

  testWithAuth("list supports search filter", async () => {
    const result = await runCliExpectSuccess([
      "bookmarks",
      "list",
      "--search",
      "test",
      "--limit",
      "5",
    ]);
    const data = parseJsonOutput<Array<{ _id: number; title: string }>>(result);

    expect(Array.isArray(data)).toBe(true);
    // Results should be filtered (may be empty if no matches)
  });

  testWithAuth("list supports sort options", async () => {
    const result = await runCliExpectSuccess([
      "bookmarks",
      "list",
      "--sort",
      "title",
      "--limit",
      "3",
    ]);
    const data = parseJsonOutput<Array<{ _id: number; title: string }>>(result);

    expect(Array.isArray(data)).toBe(true);
    // Just verify we got results - exact sort order depends on API's collation
    // which may differ from JavaScript string comparison for special chars
    expect(data.length).toBeGreaterThan(0);
  });

  testWithAuth("list supports descending sort", async () => {
    const result = await runCliExpectSuccess([
      "bookmarks",
      "list",
      "--sort",
      "-created",
      "--limit",
      "3",
    ]);
    const data = parseJsonOutput<Array<{ _id: number; created: string }>>(result);

    expect(Array.isArray(data)).toBe(true);
    // Verify descending order by date
    if (data.length >= 2) {
      const first = data[0]!;
      const second = data[1]!;
      expect(first.created >= second.created).toBe(true);
    }
  });

  testWithAuth("list quiet mode outputs only IDs", async () => {
    const result = await runCliExpectSuccess(["bookmarks", "list", "--limit", "3", "-q"]);

    // Each line should be just an ID (number)
    const lines = result.stdout.trim().split("\n");
    for (const line of lines) {
      expect(line).toMatch(/^\d+$/);
    }
  });

  testWithAuth("list supports pagination", async () => {
    // Get first page
    const page0 = await runCliExpectSuccess(["bookmarks", "list", "--limit", "2", "--page", "0"]);
    const data0 = parseJsonOutput<Array<{ _id: number }>>(page0);

    // Get second page
    const page1 = await runCliExpectSuccess(["bookmarks", "list", "--limit", "2", "--page", "1"]);
    const data1 = parseJsonOutput<Array<{ _id: number }>>(page1);

    // Pages should have different items (if there are enough bookmarks)
    if (data0.length > 0 && data1.length > 0) {
      const first0 = data0[0]!;
      const first1 = data1[0]!;
      expect(first0._id).not.toBe(first1._id);
    }
  });

  testWithAuth("list table format works", async () => {
    const result = await runCli(["bookmarks", "list", "--limit", "2", "--format", "table"]);

    expect(result.exitCode).toBe(0);
    // Table format should have headers
    expect(result.stdout).toContain("ID");
    expect(result.stdout).toContain("Title");
    expect(result.stdout).toContain("URL");
  });

  testWithAuth("list tsv format works", async () => {
    const result = await runCli(["bookmarks", "list", "--limit", "2", "--format", "tsv"]);

    expect(result.exitCode).toBe(0);
    // TSV format should have tab-separated headers (Title first, ID last)
    expect(result.stdout).toContain("Title\tURL");
    expect(result.stdout).toContain("\tID");
  });

  testWithAuth("list plain format works", async () => {
    const result = await runCli(["bookmarks", "list", "--limit", "2", "--format", "plain"]);

    expect(result.exitCode).toBe(0);
    // Plain format has prominent title/URL at top (no labels), then labeled fields
    // Should have emoji icons for regular fields
    expect(result.stdout).toContain("🔖"); // ID
    expect(result.stdout).toContain("📝"); // Excerpt
    expect(result.stdout).toContain("💬"); // Note
    // Styled separator between items (only if there are 2+ items)
    // Count items by looking for the ID emoji which appears once per item
    const itemCount = (result.stdout.match(/🔖/g) || []).length;
    if (itemCount >= 2) {
      expect(result.stdout).toContain("───");
    }
    // Title and URL should be present (as content, not labels)
    expect(result.stdout).toContain("https://");
  });

  // Convenience filter flag tests
  testWithAuth("list supports --type filter", async () => {
    const result = await runCliExpectSuccess([
      "bookmarks",
      "list",
      "--type",
      "article",
      "--limit",
      "5",
    ]);
    const data = parseJsonOutput<Array<{ _id: number; type: string }>>(result);

    expect(Array.isArray(data)).toBe(true);
    // If results exist, they should all be articles
    for (const item of data) {
      expect(item.type).toBe("article");
    }
  });

  testWithAuth("list supports --tag filter", async () => {
    // This test just verifies the flag is accepted; results depend on user's tags
    const result = await runCli(["bookmarks", "list", "--tag", "test", "--limit", "5"]);

    // Should succeed (even if no matches)
    expect(result.exitCode).toBe(0);
  });

  testWithAuth("list supports --domain filter", async () => {
    const result = await runCliExpectSuccess([
      "bookmarks",
      "list",
      "--domain",
      "github.com",
      "--limit",
      "5",
    ]);
    const data = parseJsonOutput<Array<{ _id: number; domain: string }>>(result);

    expect(Array.isArray(data)).toBe(true);
    // If results exist, they should all be from github.com
    for (const item of data) {
      expect(item.domain).toBe("github.com");
    }
  });

  testWithAuth("list supports --favorites filter", async () => {
    // This test just verifies the flag is accepted
    const result = await runCli(["bookmarks", "list", "--favorites", "--limit", "5"]);

    expect(result.exitCode).toBe(0);
  });

  testWithAuth("list supports multiple filter flags combined", async () => {
    // Combine --type and --domain
    const result = await runCli([
      "bookmarks",
      "list",
      "--type",
      "article",
      "--domain",
      "github.com",
      "--limit",
      "5",
    ]);

    expect(result.exitCode).toBe(0);
  });

  testWithAuth("list supports filter flags combined with --search", async () => {
    // Combine --type with raw --search
    const result = await runCli([
      "bookmarks",
      "list",
      "--type",
      "article",
      "--search",
      "react",
      "--limit",
      "5",
    ]);

    expect(result.exitCode).toBe(0);
  });

  testWithAuth("list supports --broken filter", async () => {
    // This test just verifies the flag is accepted
    const result = await runCli(["bookmarks", "list", "--broken", "--limit", "5"]);

    expect(result.exitCode).toBe(0);
  });

  // Get command tests
  testWithAuth("get returns a bookmark as JSON", async () => {
    // First get a bookmark ID from the list
    const listResult = await runCliExpectSuccess(["bookmarks", "list", "--limit", "1"]);
    const listData = parseJsonOutput<Array<{ _id: number }>>(listResult);

    if (listData.length === 0) {
      // No bookmarks to test with
      return;
    }

    const bookmarkId = listData[0]!._id;
    const result = await runCliExpectSuccess(["bookmarks", "show", String(bookmarkId)]);
    const data = parseJsonOutput<{
      _id: number;
      title: string;
      link: string;
      highlights: Array<{ text: string }>;
    }>(result);

    expect(data._id).toBe(bookmarkId);
    expect(data).toHaveProperty("title");
    expect(data).toHaveProperty("link");
    expect(data).toHaveProperty("highlights");
    expect(Array.isArray(data.highlights)).toBe(true);
  });

  testWithAuth("get includes full metadata", async () => {
    // First get a bookmark ID from the list
    const listResult = await runCliExpectSuccess(["bookmarks", "list", "--limit", "1"]);
    const listData = parseJsonOutput<Array<{ _id: number }>>(listResult);

    if (listData.length === 0) {
      return;
    }

    const bookmarkId = listData[0]!._id;
    const result = await runCliExpectSuccess(["bookmarks", "show", String(bookmarkId)]);
    const data = parseJsonOutput<{
      _id: number;
      title: string;
      link: string;
      domain: string;
      type: string;
      collectionId: number;
      created: string;
      lastUpdate: string;
    }>(result);

    // Verify all expected metadata fields are present
    expect(data).toHaveProperty("_id");
    expect(data).toHaveProperty("title");
    expect(data).toHaveProperty("link");
    expect(data).toHaveProperty("domain");
    expect(data).toHaveProperty("type");
    expect(data).toHaveProperty("collectionId");
    expect(data).toHaveProperty("created");
    expect(data).toHaveProperty("lastUpdate");
  });

  testWithAuth("get quiet mode outputs only ID", async () => {
    const listResult = await runCliExpectSuccess(["bookmarks", "list", "--limit", "1"]);
    const listData = parseJsonOutput<Array<{ _id: number }>>(listResult);

    if (listData.length === 0) {
      return;
    }

    const bookmarkId = listData[0]!._id;
    const result = await runCliExpectSuccess(["bookmarks", "show", String(bookmarkId), "-q"]);

    // Should output just the ID
    expect(result.stdout.trim()).toBe(String(bookmarkId));
  });

  testWithAuth("get plain format works", async () => {
    const listResult = await runCliExpectSuccess(["bookmarks", "list", "--limit", "1"]);
    const listData = parseJsonOutput<Array<{ _id: number }>>(listResult);

    if (listData.length === 0) {
      return;
    }

    const bookmarkId = listData[0]!._id;
    const result = await runCli(["bookmarks", "show", String(bookmarkId), "--format", "plain"]);

    expect(result.exitCode).toBe(0);
    // Plain format should include metadata fields
    expect(result.stdout).toContain("🔖"); // ID icon
    expect(result.stdout).toContain("🌐"); // Domain icon
  });

  testWithAuth("get table format works", async () => {
    const listResult = await runCliExpectSuccess(["bookmarks", "list", "--limit", "1"]);
    const listData = parseJsonOutput<Array<{ _id: number }>>(listResult);

    if (listData.length === 0) {
      return;
    }

    const bookmarkId = listData[0]!._id;
    const result = await runCli(["bookmarks", "show", String(bookmarkId), "--format", "table"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("ID");
    expect(result.stdout).toContain("Title");
  });

  testWithAuth("get returns 404 for non-existent bookmark", async () => {
    // Use a very large ID that's unlikely to exist
    const result = await runCli(["bookmarks", "show", "999999999"]);

    expect(result.exitCode).toBe(1);
    // Should return a 404 or "not found" error
    const hasNotFound =
      result.stderr.includes("404") ||
      result.stderr.includes("not found") ||
      result.stderr.includes("Not Found");
    expect(hasNotFound).toBe(true);
  });
});

/**
 * Integration tests for add command that require a valid RAINDROP_TOKEN.
 * These create and clean up test bookmarks.
 */
describe("bookmarks add command - with auth", () => {
  const hasToken = !!process.env["RAINDROP_TOKEN"];
  const AUTH_TEST_TIMEOUT = AUTH_TEST_TIMEOUT_MS;
  const testWithAuth = hasToken
    ? (name: string, fn: () => Promise<void>) => test(name, fn, { timeout: AUTH_TEST_TIMEOUT })
    : test.skip;

  const AUTH_CLI_TIMEOUT = AUTH_CLI_TIMEOUT_MS;
  const runCliExpectSuccess = (
    args: string[],
    options: Parameters<typeof runCliExpectSuccessBase>[1] = {}
  ) => runCliExpectSuccessBase(args, { timeout: AUTH_CLI_TIMEOUT, ...options });

  testWithAuth("add creates a bookmark with just URL", async () => {
    const testUrl = `https://example.com/test-${Date.now()}`;

    const result = await runCliExpectSuccess([
      "bookmarks",
      "add",
      testUrl,
      "--title",
      `${TEST_BOOKMARK_PREFIX} Add Test`,
    ]);
    const data = parseJsonOutput<{ _id: number; link: string }>(result);

    expect(data).toHaveProperty("_id");
    expect(data.link).toBe(testUrl);

    // Cleanup
    await deleteTestBookmark(data._id);
  });

  testWithAuth("add creates a bookmark with all options", async () => {
    const testUrl = `https://example.com/full-test-${Date.now()}`;
    const testTitle = `${TEST_BOOKMARK_PREFIX} Full Options Test`;
    const testExcerpt = "This is a test excerpt";
    const testNote = "This is a test note";
    const testTags = `${TEST_TAG_PREFIX}full,${TEST_TAG_PREFIX}options,${TEST_TAG_PREFIX}cli`;

    const result = await runCliExpectSuccess([
      "bookmarks",
      "add",
      testUrl,
      "--title",
      testTitle,
      "--excerpt",
      testExcerpt,
      "--note",
      testNote,
      "--tags",
      testTags,
      "--collection",
      "unsorted",
    ]);

    const data = parseJsonOutput<{
      _id: number;
      link: string;
      title: string;
      excerpt: string;
      note: string;
      tags: string;
      collectionId: number;
    }>(result);

    expect(data.link).toBe(testUrl);
    expect(data.title).toBe(testTitle);
    expect(data.excerpt).toBe(testExcerpt);
    expect(data.note).toBe(testNote);
    expect(data.tags).toContain(`${TEST_TAG_PREFIX}full`);
    expect(data.tags).toContain(`${TEST_TAG_PREFIX}options`);
    expect(data.tags).toContain(`${TEST_TAG_PREFIX}cli`);
    expect(data.collectionId).toBe(-1); // unsorted

    // Cleanup
    await deleteTestBookmark(data._id);
  });

  testWithAuth("add with --parse extracts metadata", async () => {
    // Use a well-known URL that should have parseable metadata
    const testUrl = "https://github.com";

    const result = await runCliExpectSuccess([
      "bookmarks",
      "add",
      testUrl,
      "--parse",
      "--tags",
      `${TEST_TAG_PREFIX}parse`,
    ]);

    const data = parseJsonOutput<{
      _id: number;
      title: string;
      domain: string;
    }>(result);

    expect(data).toHaveProperty("_id");
    // With --parse, Raindrop should extract title from the page
    expect(data.title).toBeTruthy();
    expect(data.domain).toBe("github.com");

    // Cleanup
    await deleteTestBookmark(data._id);
  });

  testWithAuth("add quiet mode outputs only ID", async () => {
    const testUrl = `https://example.com/quiet-test-${Date.now()}`;

    const result = await runCliExpectSuccess([
      "bookmarks",
      "add",
      testUrl,
      "--title",
      `${TEST_BOOKMARK_PREFIX} Quiet Test`,
      "-q",
    ]);

    // Should output just the ID (a number)
    const id = parseInt(result.stdout.trim(), 10);
    expect(id).toBeGreaterThan(0);

    // Cleanup
    await deleteTestBookmark(id);
  });

  testWithAuth("add with empty tags is handled correctly", async () => {
    const testUrl = `https://example.com/empty-tags-${Date.now()}`;

    // Empty string for tags should result in no tags
    const result = await runCliExpectSuccess([
      "bookmarks",
      "add",
      testUrl,
      "--title",
      `${TEST_BOOKMARK_PREFIX} Empty Tags Test`,
      "--tags",
      "",
    ]);

    const data = parseJsonOutput<{ _id: number; tags: string }>(result);
    expect(data.tags).toBe("");

    // Cleanup
    await deleteTestBookmark(data._id);
  });

  testWithAuth("add supports numeric collection ID", async () => {
    const testUrl = `https://example.com/collection-test-${Date.now()}`;

    // Use -1 for unsorted (numeric)
    const result = await runCliExpectSuccess([
      "bookmarks",
      "add",
      testUrl,
      "--title",
      `${TEST_BOOKMARK_PREFIX} Collection Test`,
      "--collection",
      "-1",
    ]);

    const data = parseJsonOutput<{ _id: number; collectionId: number }>(result);
    expect(data.collectionId).toBe(-1);

    // Cleanup
    await deleteTestBookmark(data._id);
  });
});

/**
 * Integration tests for update command that require a valid RAINDROP_TOKEN.
 * These create, update, and clean up test bookmarks.
 */
describe("bookmarks update command - with auth", () => {
  const hasToken = !!process.env["RAINDROP_TOKEN"];
  const AUTH_TEST_TIMEOUT = AUTH_TEST_TIMEOUT_MS;
  const testWithAuth = hasToken
    ? (name: string, fn: () => Promise<void>) => test(name, fn, { timeout: AUTH_TEST_TIMEOUT })
    : test.skip;

  const AUTH_CLI_TIMEOUT = AUTH_CLI_TIMEOUT_MS;
  const runCliExpectSuccess = (
    args: string[],
    options: Parameters<typeof runCliExpectSuccessBase>[1] = {}
  ) => runCliExpectSuccessBase(args, { timeout: AUTH_CLI_TIMEOUT, ...options });

  testWithAuth("update title", async () => {
    const { id } = await createTestBookmark("-title");
    const newTitle = `${TEST_BOOKMARK_PREFIX} Updated Title`;

    try {
      const result = await runCliExpectSuccess([
        "bookmarks",
        "update",
        String(id),
        "--title",
        newTitle,
      ]);
      const data = parseJsonOutput<{ _id: number; title: string }>(result);

      expect(data._id).toBe(id);
      expect(data.title).toBe(newTitle);
    } finally {
      await deleteTestBookmark(id);
    }
  });

  testWithAuth("update excerpt", async () => {
    const { id } = await createTestBookmark("-excerpt");
    const newExcerpt = "This is an updated excerpt";

    try {
      const result = await runCliExpectSuccess([
        "bookmarks",
        "update",
        String(id),
        "--excerpt",
        newExcerpt,
      ]);
      const data = parseJsonOutput<{ _id: number; excerpt: string }>(result);

      expect(data._id).toBe(id);
      expect(data.excerpt).toBe(newExcerpt);
    } finally {
      await deleteTestBookmark(id);
    }
  });

  testWithAuth("update note", async () => {
    const { id } = await createTestBookmark("-note");
    const newNote = "This is an updated note";

    try {
      const result = await runCliExpectSuccess([
        "bookmarks",
        "update",
        String(id),
        "--note",
        newNote,
      ]);
      const data = parseJsonOutput<{ _id: number; note: string }>(result);

      expect(data._id).toBe(id);
      expect(data.note).toBe(newNote);
    } finally {
      await deleteTestBookmark(id);
    }
  });

  testWithAuth("clear note with empty string", async () => {
    const { id } = await createTestBookmark("-clear-note");

    try {
      // First add a note
      await runCliExpectSuccess(["bookmarks", "update", String(id), "--note", "Temporary note"]);

      // Then clear it
      const result = await runCliExpectSuccess(["bookmarks", "update", String(id), "--note", ""]);
      const data = parseJsonOutput<{ _id: number; note: string }>(result);

      expect(data._id).toBe(id);
      expect(data.note).toBe("");
    } finally {
      await deleteTestBookmark(id);
    }
  });

  testWithAuth("replace all tags with --tags", async () => {
    const { id } = await createTestBookmark("-replace-tags");

    try {
      const result = await runCliExpectSuccess([
        "bookmarks",
        "update",
        String(id),
        "--tags",
        `${TEST_TAG_PREFIX}new,${TEST_TAG_PREFIX}replacement`,
      ]);
      const data = parseJsonOutput<{ _id: number; tags: string }>(result);

      expect(data._id).toBe(id);
      expect(data.tags).toContain(`${TEST_TAG_PREFIX}new`);
      expect(data.tags).toContain(`${TEST_TAG_PREFIX}replacement`);
      expect(data.tags).not.toContain(`${TEST_TAG_PREFIX}auto`);
    } finally {
      await deleteTestBookmark(id);
    }
  });

  testWithAuth("add tags with --add-tags", async () => {
    const { id } = await createTestBookmark("-add-tags");

    try {
      const result = await runCliExpectSuccess([
        "bookmarks",
        "update",
        String(id),
        "--add-tags",
        `${TEST_TAG_PREFIX}newtag,${TEST_TAG_PREFIX}another`,
      ]);
      const data = parseJsonOutput<{ _id: number; tags: string }>(result);

      expect(data._id).toBe(id);
      // Should have original tags plus new ones
      expect(data.tags).toContain(`${TEST_TAG_PREFIX}auto`);
      expect(data.tags).toContain(`${TEST_TAG_PREFIX}newtag`);
      expect(data.tags).toContain(`${TEST_TAG_PREFIX}another`);
    } finally {
      await deleteTestBookmark(id);
    }
  });

  testWithAuth("remove tags with --remove-tags", async () => {
    const { id } = await createTestBookmark("-remove-tags");

    try {
      const result = await runCliExpectSuccess([
        "bookmarks",
        "update",
        String(id),
        "--remove-tags",
        `${TEST_TAG_PREFIX}auto`,
      ]);
      const data = parseJsonOutput<{ _id: number; tags: string }>(result);

      expect(data._id).toBe(id);
      // Should not have the removed tag
      expect(data.tags).not.toContain(`${TEST_TAG_PREFIX}auto`);
    } finally {
      await deleteTestBookmark(id);
    }
  });

  testWithAuth("combine --add-tags and --remove-tags", async () => {
    const { id } = await createTestBookmark("-combo-tags");

    try {
      const result = await runCliExpectSuccess([
        "bookmarks",
        "update",
        String(id),
        "--add-tags",
        `${TEST_TAG_PREFIX}added`,
        "--remove-tags",
        `${TEST_TAG_PREFIX}auto`,
      ]);
      const data = parseJsonOutput<{ _id: number; tags: string }>(result);

      expect(data._id).toBe(id);
      expect(data.tags).toContain(`${TEST_TAG_PREFIX}added`);
      expect(data.tags).not.toContain(`${TEST_TAG_PREFIX}auto`);
    } finally {
      await deleteTestBookmark(id);
    }
  });

  testWithAuth("clear all tags with empty --tags", async () => {
    const { id } = await createTestBookmark("-clear-tags");

    try {
      const result = await runCliExpectSuccess(["bookmarks", "update", String(id), "--tags", ""]);
      const data = parseJsonOutput<{ _id: number; tags: string }>(result);

      expect(data._id).toBe(id);
      expect(data.tags).toBe("");
    } finally {
      await deleteTestBookmark(id);
    }
  });

  testWithAuth("update collection", async () => {
    const { id } = await createTestBookmark("-collection");

    try {
      // Move to trash
      const result = await runCliExpectSuccess([
        "bookmarks",
        "update",
        String(id),
        "--collection",
        "trash",
      ]);
      const data = parseJsonOutput<{ _id: number; collectionId: number }>(result);

      expect(data._id).toBe(id);
      expect(data.collectionId).toBe(-99); // trash collection ID
    } finally {
      await deleteTestBookmark(id);
    }
  });

  testWithAuth("mark as important", async () => {
    const { id } = await createTestBookmark("-important");

    try {
      const result = await runCliExpectSuccess(["bookmarks", "update", String(id), "--important"]);
      // The API response should reflect the change
      // Note: the formatted output may not include 'important' field directly
      // but the update should succeed
      expect(result.exitCode).toBe(0);
    } finally {
      await deleteTestBookmark(id);
    }
  });

  testWithAuth("unmark as important with --important false", async () => {
    const { id } = await createTestBookmark("-unimportant");

    try {
      // First mark as important
      await runCliExpectSuccess(["bookmarks", "update", String(id), "--important"]);

      // Then unmark it
      const result = await runCliExpectSuccess([
        "bookmarks",
        "update",
        String(id),
        "--important",
        "false",
      ]);
      expect(result.exitCode).toBe(0);
    } finally {
      await deleteTestBookmark(id);
    }
  });

  testWithAuth("update multiple fields at once", async () => {
    const { id } = await createTestBookmark("-multi");
    const newTitle = `${TEST_BOOKMARK_PREFIX} Multi-Updated Title`;
    const newNote = "Multi-updated note";

    try {
      const result = await runCliExpectSuccess([
        "bookmarks",
        "update",
        String(id),
        "--title",
        newTitle,
        "--note",
        newNote,
        "--add-tags",
        `${TEST_TAG_PREFIX}multi`,
      ]);
      const data = parseJsonOutput<{
        _id: number;
        title: string;
        note: string;
        tags: string;
      }>(result);

      expect(data._id).toBe(id);
      expect(data.title).toBe(newTitle);
      expect(data.note).toBe(newNote);
      expect(data.tags).toContain(`${TEST_TAG_PREFIX}multi`);
    } finally {
      await deleteTestBookmark(id);
    }
  });

  testWithAuth("update quiet mode outputs only ID", async () => {
    const { id } = await createTestBookmark("-quiet");

    try {
      const result = await runCliExpectSuccess([
        "bookmarks",
        "update",
        String(id),
        "--title",
        `${TEST_BOOKMARK_PREFIX} Quiet Update`,
        "-q",
      ]);

      // Should output just the ID
      expect(result.stdout.trim()).toBe(String(id));
    } finally {
      await deleteTestBookmark(id);
    }
  });

  testWithAuth("update returns 404 for non-existent bookmark", async () => {
    const result = await runCli(["bookmarks", "update", "999999999", "--title", "Does not exist"]);

    expect(result.exitCode).toBe(1);
    const hasNotFound =
      result.stderr.includes("404") ||
      result.stderr.includes("not found") ||
      result.stderr.includes("Not Found");
    expect(hasNotFound).toBe(true);
  });
});

/**
 * Integration tests for batch commands that require authentication
 */
describe("bookmarks batch commands - with auth", () => {
  const hasToken = !!process.env["RAINDROP_TOKEN"];
  const AUTH_TEST_TIMEOUT = AUTH_TEST_TIMEOUT_MS;

  const testWithAuth = hasToken
    ? (name: string, fn: () => Promise<void>) => test(name, fn, { timeout: AUTH_TEST_TIMEOUT })
    : test.skip;

  const AUTH_CLI_TIMEOUT = AUTH_CLI_TIMEOUT_MS;
  const runCliExpectSuccess = (
    args: string[],
    options: Parameters<typeof runCliExpectSuccessBase>[1] = {}
  ) => runCliExpectSuccessBase(args, { timeout: AUTH_CLI_TIMEOUT, ...options });

  testWithAuth("batch-update adds tags to multiple bookmarks", async () => {
    const bookmark1 = await createTestBookmark("-batch1");
    const bookmark2 = await createTestBookmark("-batch2");

    try {
      const result = await runCliExpectSuccess([
        "bookmarks",
        "batch-update",
        "--ids",
        `${bookmark1.id},${bookmark2.id}`,
        "--add-tags",
        `${TEST_TAG_PREFIX}batch-added`,
        "--force",
        "--format",
        "json",
      ]);

      const data = parseJsonOutput<{ result: boolean; modified: number }>(result);
      expect(data.modified).toBe(2);

      // Verify the tags were added
      const verify1 = await runCliExpectSuccess(["bookmarks", "show", String(bookmark1.id)]);
      const verify1Data = parseJsonOutput<{ tags: string }>(verify1);
      expect(verify1Data.tags).toContain(`${TEST_TAG_PREFIX}batch-added`);
      expect(verify1Data.tags).toContain(`${TEST_TAG_PREFIX}auto`);

      const verify2 = await runCliExpectSuccess(["bookmarks", "show", String(bookmark2.id)]);
      const verify2Data = parseJsonOutput<{ tags: string }>(verify2);
      expect(verify2Data.tags).toContain(`${TEST_TAG_PREFIX}batch-added`);
    } finally {
      await deleteTestBookmark(bookmark1.id);
      await deleteTestBookmark(bookmark2.id);
    }
  });

  testWithAuth("batch-update removes tags from multiple bookmarks", async () => {
    const bookmark1 = await createTestBookmark("-remove1");
    const bookmark2 = await createTestBookmark("-remove2");

    try {
      const result = await runCliExpectSuccess([
        "bookmarks",
        "batch-update",
        "--ids",
        `${bookmark1.id},${bookmark2.id}`,
        "--remove-tags",
        `${TEST_TAG_PREFIX}auto`,
        "--force",
        "--format",
        "json",
      ]);

      const data = parseJsonOutput<{ result: boolean; modified: number }>(result);
      expect(data.modified).toBe(2);

      // Verify the tags were removed
      const verify1 = await runCliExpectSuccess(["bookmarks", "show", String(bookmark1.id)]);
      const verify1Data = parseJsonOutput<{ tags: string }>(verify1);
      expect(verify1Data.tags).not.toContain(`${TEST_TAG_PREFIX}auto`);
    } finally {
      await deleteTestBookmark(bookmark1.id);
      await deleteTestBookmark(bookmark2.id);
    }
  });

  // Note: The Raindrop batch API's 'tags' field ADDS tags rather than replacing them.
  // This is different from the single update command. For true tag replacement in batch,
  // users should use --remove-tags first, then --add-tags.
  testWithAuth("batch-update sets tags using --tags (adds to existing)", async () => {
    const bookmark1 = await createTestBookmark("-settags1");
    const bookmark2 = await createTestBookmark("-settags2");

    try {
      const result = await runCliExpectSuccess([
        "bookmarks",
        "batch-update",
        "--ids",
        `${bookmark1.id},${bookmark2.id}`,
        "--collection",
        "all",
        "--tags",
        `${TEST_TAG_PREFIX}new-batch-tag`,
        "--force",
        "--format",
        "json",
      ]);

      const data = parseJsonOutput<{ result: boolean; modified: number }>(result);
      expect(data.modified).toBe(2);

      // Verify the tags were added (batch API adds, doesn't replace)
      const verify1 = await runCliExpectSuccess(["bookmarks", "show", String(bookmark1.id)]);
      const verify1Data = parseJsonOutput<{ tags: string }>(verify1);
      expect(verify1Data.tags).toContain(`${TEST_TAG_PREFIX}new-batch-tag`);
      // Original tags are preserved with batch API
      expect(verify1Data.tags).toContain(`${TEST_TAG_PREFIX}auto`);
    } finally {
      await deleteTestBookmark(bookmark1.id);
      await deleteTestBookmark(bookmark2.id);
    }
  });

  testWithAuth("batch-delete removes multiple bookmarks", async () => {
    const bookmark1 = await createTestBookmark("-delete1");
    const bookmark2 = await createTestBookmark("-delete2");

    const result = await runCliExpectSuccess([
      "bookmarks",
      "batch-delete",
      "--ids",
      `${bookmark1.id},${bookmark2.id}`,
      "--force",
      "--format",
      "json",
    ]);

    const data = parseJsonOutput<{ result: boolean; modified: number }>(result);
    expect(data.result).toBe(true);
    expect(data.modified).toBe(2);

    // Verify bookmarks are in trash (get should fail or return trash status)
    // Since they're in trash, we need to permanently delete them for cleanup
    await deleteTestBookmark(bookmark1.id);
    await deleteTestBookmark(bookmark2.id);
  });

  testWithAuth("batch-update with plain format shows human-readable output", async () => {
    const bookmark1 = await createTestBookmark("-plain1");

    try {
      const result = await runCliExpectSuccess([
        "bookmarks",
        "batch-update",
        "--ids",
        String(bookmark1.id),
        "--add-tags",
        `${TEST_TAG_PREFIX}plain-test`,
        "--force",
        "--format",
        "plain",
      ]);

      expect(result.stdout).toContain("Updated");
      expect(result.stdout).toContain("bookmark");
    } finally {
      await deleteTestBookmark(bookmark1.id);
    }
  });
});
