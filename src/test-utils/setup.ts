import { beforeAll, afterAll } from "bun:test";
import nock from "nock";

/**
 * Global test setup.
 *
 * This file is preloaded by Bun before running tests.
 * It enforces network isolation using Nock.
 */

beforeAll(() => {
  // Disable all real network connections by default.
  // This ensures unit/integration tests never accidentally hit real APIs.
  // Live tests (which need network) must explicitly enable it.
  nock.disableNetConnect();

  // Allow localhost connections if needed for local processes (optional)
  // nock.enableNetConnect('127.0.0.1');
});

afterAll(() => {
  // Clean up Nock after tests
  nock.cleanAll();
  nock.restore();
});
