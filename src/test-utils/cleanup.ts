/**
 * Test artifact cleanup utilities.
 *
 * Provides functions to clean up test-created bookmarks, tags, and collections
 * that use the [RDCLI-TEST] naming convention.
 */

import { runCli as runCliBase, parseJsonOutput, CliOptions } from "./cli.js";

/**
 * Wrapper for runCli that includes the RAINDROP_TOKEN from environment.
 * This ensures cleanup operations have access to the API token.
 */
function runCli(args: string[], options: CliOptions = {}) {
  return runCliBase(args, {
    ...options,
    env: { RAINDROP_TOKEN: process.env.RAINDROP_TOKEN || "", ...options.env },
  });
}

/** Prefix used to identify test-created bookmarks */
export const TEST_BOOKMARK_PREFIX = "[RDCLI-TEST]";

/** Prefix used to identify test-created tags */
export const TEST_TAG_PREFIX = "rdcli-test-";

/** Prefix used to identify test-created collections */
export const TEST_COLLECTION_PREFIX = "RDCLI-TEST-";

/**
 * Clean up all test artifacts from the Raindrop account.
 * This should be run once before the live test suite starts.
 *
 * Cleans up:
 * - Bookmarks with titles starting with [RDCLI-TEST]
 * - Tags starting with rdcli-test-
 * - Collections named RDCLI-TEST-*
 * - Empties the trash
 */
export async function cleanupTestArtifacts(): Promise<void> {
  // Only run if we have a token
  if (!process.env["RAINDROP_TOKEN"]) {
    return;
  }

  console.log("[cleanup] Starting test artifact cleanup...");

  try {
    // 1. Find and delete test bookmarks
    await cleanupTestBookmarks();

    // 2. Clean up test tags
    await cleanupTestTags();

    // 3. Clean up test collections
    await cleanupTestCollections();

    // 4. Empty the trash to permanently delete everything
    await emptyTrash();

    console.log("[cleanup] Test artifact cleanup complete");
  } catch (error) {
    console.warn("[cleanup] Cleanup failed:", error);
    // Don't fail tests if cleanup fails - it's just a best effort
  }
}

/**
 * Find and permanently delete all bookmarks with [RDCLI-TEST] in the title.
 */
async function cleanupTestBookmarks(): Promise<void> {
  // Search for test bookmarks using the search API
  const searchResult = await runCli([
    "bookmarks",
    "list",
    "--search",
    TEST_BOOKMARK_PREFIX,
    "--limit",
    "50",
  ]);

  if (searchResult.exitCode !== 0) {
    console.warn("[cleanup] Failed to search for test bookmarks");
    return;
  }

  let bookmarks: Array<{ _id: number; title: string }>;
  try {
    bookmarks = parseJsonOutput<Array<{ _id: number; title: string }>>(searchResult);
  } catch {
    // Empty result or parse error
    return;
  }

  if (bookmarks.length === 0) {
    console.log("[cleanup] No test bookmarks found");
    return;
  }

  // Filter to only include bookmarks that actually start with the test prefix
  const testBookmarks = bookmarks.filter((b) => b.title?.startsWith(TEST_BOOKMARK_PREFIX));

  if (testBookmarks.length === 0) {
    console.log("[cleanup] No test bookmarks found");
    return;
  }

  console.log(`[cleanup] Found ${testBookmarks.length} test bookmark(s) to delete`);

  // Delete each bookmark permanently
  for (const bookmark of testBookmarks) {
    await runCli(["bookmarks", "delete", String(bookmark._id), "--permanent", "--force"]);
  }

  console.log(`[cleanup] Deleted ${testBookmarks.length} test bookmark(s)`);
}

/**
 * Delete all tags starting with rdcli-test-.
 */
async function cleanupTestTags(): Promise<void> {
  const tagsResult = await runCli(["tags", "list"]);

  if (tagsResult.exitCode !== 0) {
    console.warn("[cleanup] Failed to list tags");
    return;
  }

  let tags: Array<{ _id: string }>;
  try {
    tags = parseJsonOutput<Array<{ _id: string }>>(tagsResult);
  } catch {
    return;
  }

  const testTags = tags.filter((t) => t._id?.startsWith(TEST_TAG_PREFIX));

  if (testTags.length === 0) {
    return;
  }

  console.log(`[cleanup] Found ${testTags.length} test tag(s) to delete`);

  for (const tag of testTags) {
    await runCli(["tags", "delete", tag._id, "--force"]);
  }

  console.log(`[cleanup] Deleted ${testTags.length} test tag(s)`);
}

/**
 * Delete all collections starting with RDCLI-TEST-.
 */
async function cleanupTestCollections(): Promise<void> {
  const collectionsResult = await runCli(["collections", "list", "--flat"]);

  if (collectionsResult.exitCode !== 0) {
    console.warn("[cleanup] Failed to list collections");
    return;
  }

  let collections: Array<{ _id: number; title: string }>;
  try {
    collections = parseJsonOutput<Array<{ _id: number; title: string }>>(collectionsResult);
  } catch {
    return;
  }

  const testCollections = collections.filter((c) => c.title?.startsWith(TEST_COLLECTION_PREFIX));

  if (testCollections.length === 0) {
    return;
  }

  console.log(`[cleanup] Found ${testCollections.length} test collection(s) to delete`);

  for (const collection of testCollections) {
    await runCli(["collections", "delete", String(collection._id), "--force"]);
  }

  console.log(`[cleanup] Deleted ${testCollections.length} test collection(s)`);
}

/**
 * Empty the trash to permanently delete all trashed items.
 */
async function emptyTrash(): Promise<void> {
  const result = await runCli(["trash", "empty", "--force"]);

  if (result.exitCode === 0) {
    console.log("[cleanup] Trash emptied");
  }
}

/**
 * Helper to create a test bookmark with proper naming convention.
 * Returns the bookmark ID and URL.
 */
export async function createTestBookmark(
  suffix: string = ""
): Promise<{ id: number; url: string }> {
  const testUrl = `https://example.com/test-${Date.now()}${suffix}`;
  const result = await runCli([
    "bookmarks",
    "add",
    testUrl,
    "--title",
    `${TEST_BOOKMARK_PREFIX} Test ${suffix}`,
    "--tags",
    `${TEST_TAG_PREFIX}auto`,
  ]);

  if (result.exitCode !== 0) {
    throw new Error(`Failed to create test bookmark: ${result.stderr}`);
  }

  const data = parseJsonOutput<{ _id: number; link: string }>(result);
  return { id: data._id, url: testUrl };
}

/**
 * Helper to delete a test bookmark permanently.
 */
export async function deleteTestBookmark(id: number): Promise<void> {
  await runCli(["bookmarks", "delete", String(id), "--permanent", "--force"]);
}
