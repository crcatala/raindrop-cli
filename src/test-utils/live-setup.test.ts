import { describe, expect, test } from "bun:test";
import { createLiveTestSetup } from "./live-setup.js";
import type { CliResult } from "./cli.js";

const successfulResult: CliResult = { stdout: "", stderr: "", exitCode: 0 };

describe("createLiveTestSetup", () => {
  test("validates and cleans up exactly once when registered by multiple files", async () => {
    const hooks: Array<() => Promise<void>> = [];
    const runCalls: Array<{ args: string[]; options: unknown }> = [];
    let networkEnables = 0;
    let cleanups = 0;

    const setup = createLiveTestSetup({
      beforeAll: (hook) => hooks.push(hook),
      enableNetConnect: () => {
        networkEnables++;
      },
      getToken: () => "valid-token",
      runCli: async (args, options) => {
        runCalls.push({ args, options });
        return successfulResult;
      },
      cleanupTestArtifacts: async () => {
        cleanups++;
      },
    });

    setup();
    setup();
    await Promise.all(hooks.map((hook) => hook()));

    expect(networkEnables).toBe(1);
    expect(runCalls).toEqual([
      {
        args: ["auth", "status", "--json"],
        options: { env: { RAINDROP_TOKEN: "valid-token" }, timeout: 20000 },
      },
    ]);
    expect(cleanups).toBe(1);
  });

  test("fails before cleanup when token validation fails", async () => {
    const hooks: Array<() => Promise<void>> = [];
    let cleanups = 0;

    const setup = createLiveTestSetup({
      beforeAll: (hook) => hooks.push(hook),
      enableNetConnect: () => {},
      getToken: () => "expired-token",
      runCli: async () => ({ stdout: "", stderr: "unauthorized", exitCode: 1 }),
      cleanupTestArtifacts: async () => {
        cleanups++;
      },
    });

    setup();

    await expect(hooks[0]!()).rejects.toThrow(
      "Live test token validation failed. RAINDROP_TOKEN is invalid or expired; update it and rerun the suite."
    );
    expect(cleanups).toBe(0);
  });

  test("skips validation and cleanup when no token is configured", async () => {
    const hooks: Array<() => Promise<void>> = [];
    let validations = 0;
    let cleanups = 0;

    const setup = createLiveTestSetup({
      beforeAll: (hook) => hooks.push(hook),
      enableNetConnect: () => {},
      getToken: () => undefined,
      runCli: async () => {
        validations++;
        return successfulResult;
      },
      cleanupTestArtifacts: async () => {
        cleanups++;
      },
    });

    setup();
    await hooks[0]!();

    expect(validations).toBe(0);
    expect(cleanups).toBe(0);
  });
});
