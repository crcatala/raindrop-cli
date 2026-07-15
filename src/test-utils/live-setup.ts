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
import { runCli } from "./cli.js";
import { AUTH_CLI_TIMEOUT_MS, AUTH_TEST_TIMEOUT_MS } from "./timeouts.js";

// Re-export helpers for convenience
export {
  createTestBookmark,
  deleteTestBookmark,
  TEST_BOOKMARK_PREFIX,
  TEST_TAG_PREFIX,
  TEST_COLLECTION_PREFIX,
} from "./cleanup.js";

type BeforeAll = (callback: () => Promise<void>, options: { timeout: number }) => void;

type LiveTestSetupDependencies = {
  beforeAll: BeforeAll;
  enableNetConnect: () => void;
  getToken: () => string | undefined;
  runCli: typeof runCli;
  cleanupTestArtifacts: typeof cleanupTestArtifacts;
};

/**
 * Creates a live-test setup function. Dependencies are injectable so the
 * validation and cleanup gate can be tested without making API requests.
 */
export function createLiveTestSetup({
  beforeAll: registerBeforeAll,
  enableNetConnect,
  getToken,
  runCli: executeCli,
  cleanupTestArtifacts: cleanup,
}: LiveTestSetupDependencies): () => void {
  // Share initialization across test files so validation and cleanup run once per suite.
  let setupPromise: Promise<void> | undefined;

  async function initializeLiveTests(): Promise<void> {
    // Enable network access for live tests (blocked by default in global setup).
    enableNetConnect();

    const token = getToken();
    if (!token) {
      return;
    }

    // Validate once up front so an invalid CI secret produces one clear failure
    // instead of a cascade of failing authenticated tests.
    const result = await executeCli(["auth", "status", "--json"], {
      env: { RAINDROP_TOKEN: token },
      timeout: AUTH_CLI_TIMEOUT_MS,
    });

    if (result.exitCode !== 0) {
      throw new Error(
        "Live test token validation failed. RAINDROP_TOKEN is invalid or expired; update it and rerun the suite."
      );
    }

    await cleanup();
  }

  return () => {
    registerBeforeAll(
      async () => {
        setupPromise ??= initializeLiveTests();
        await setupPromise;
      },
      { timeout: AUTH_TEST_TIMEOUT_MS }
    );
  };
}

const setupLiveTestsOnce = createLiveTestSetup({
  beforeAll,
  enableNetConnect: () => nock.enableNetConnect(),
  getToken: () => process.env["RAINDROP_TOKEN"],
  runCli,
  cleanupTestArtifacts,
});

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

  setupLiveTestsOnce();
}
