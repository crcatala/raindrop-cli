/**
 * Live test setup - runs once before all live tests.
 *
 * This file is imported by live test files to:
 * 1. Clean up any leftover test artifacts from previous runs
 * 2. Provide common test utilities with proper naming conventions
 *
 * Usage in live test files:
 * ```ts
 * import { setupLiveTests, createTestBookmark, deleteTestBookmark } from "../test-utils/live-setup.js";
 *
 * setupLiveTests();
 *
 * describe("my live tests", () => {
 *   // tests...
 * });
 * ```
 */

import { beforeAll } from "bun:test";
import nock from "nock";
import { cleanupTestArtifacts } from "./cleanup.js";
import { AUTH_TEST_TIMEOUT_MS } from "./timeouts.js";

// Re-export helpers for convenience
export {
  createTestBookmark,
  deleteTestBookmark,
  TEST_BOOKMARK_PREFIX,
  TEST_TAG_PREFIX,
  TEST_COLLECTION_PREFIX,
} from "./cleanup.js";

// Track if cleanup has already run (to avoid running multiple times)
let cleanupComplete = false;

/**
 * Set up live tests with cleanup.
 * Call this once at the top of each live test file.
 *
 * This will run cleanup once before all live tests start.
 */
export function setupLiveTests(): void {
  // Debug logging
  if (process.env.CI) {
    const token = process.env.RAINDROP_TOKEN;
    if (token) {
      console.log(`[setupLiveTests] Token present (length: ${token.length})`);
    } else {
      console.error("[setupLiveTests] No RAINDROP_TOKEN found in environment!");
    }
  }

  beforeAll(
    async () => {
      // Enable network access for live tests (blocked by default in global setup)
      nock.enableNetConnect();

      // Only run cleanup once, even if multiple files import this
      if (cleanupComplete) {
        return;
      }

      // Only cleanup if we have a token (i.e., live tests will actually run)
      if (process.env["RAINDROP_TOKEN"]) {
        await cleanupTestArtifacts();
        cleanupComplete = true;
      }
    },
    { timeout: AUTH_TEST_TIMEOUT_MS }
  );
}
