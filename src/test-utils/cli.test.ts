import { test, expect } from "bun:test";
import { runCli } from "./cli.js";

test("runCli passes explicitly provided token", async () => {
  // We provide a fake token.
  // If the token reaches the CLI, getClient() sees it.
  // It tries to use it.
  // The API call might fail (401) or we might just check that it DOESN'T fail with "No API token".

  // We use "auth status" which calls getClient() early.
  const result = await runCli(["auth", "status"], {
    env: { RAINDROP_TOKEN: "fake-token-123" },
  });

  // If token was passed, we expect exit code 1 (due to invalid token)
  // BUT the stderr should NOT say "No API token configured".
  // It should say something about 401 or "Unauthorized" or just fail quietly if not verbose.
  // Actually, "auth status" prints to stdout/stderr.

  // If token was "" (empty), we expect "No API token configured".

  expect(result.stderr).not.toContain("No API token configured");
});
