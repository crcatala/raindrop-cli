import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as config from "./config.js";

describe("config", () => {
  let originalToken: string | undefined;

  beforeEach(() => {
    originalToken = process.env["RAINDROP_TOKEN"];
    delete process.env["RAINDROP_TOKEN"];
    config.resetConfig();
  });

  afterEach(() => {
    if (originalToken !== undefined) {
      process.env["RAINDROP_TOKEN"] = originalToken;
    } else {
      delete process.env["RAINDROP_TOKEN"];
    }
    config.resetConfig();
  });

  test("returns the expected config file path", () => {
    const path = config.getConfigFilePath();
    expect(path).toContain("raindrop-cli");
    expect(path).toContain("config.json");
  });

  test("keeps RAINDROP_TOKEN as the highest-priority token source", async () => {
    process.env["RAINDROP_TOKEN"] = "env-token-test";

    const resolved = await config.getConfig();
    expect(resolved.token).toBe("env-token-test");
    expect(resolved.tokenSource).toBe("env");
    expect(await config.getTokenSource()).toBe("env");
    expect(await config.hasToken()).toBe(true);
  });

  test("caches the resolved config until reset", async () => {
    process.env["RAINDROP_TOKEN"] = "first-token";
    const first = await config.getConfig();
    const second = await config.getConfig();
    expect(first).toBe(second);

    process.env["RAINDROP_TOKEN"] = "second-token";
    config.resetConfig();
    expect((await config.getConfig()).token).toBe("second-token");
  });

  test("returns configured defaults", async () => {
    process.env["RAINDROP_TOKEN"] = "test-token";
    const resolved = await config.getConfig();
    expect(["json", "table", "tsv"]).toContain(resolved.defaultFormat);
    expect(typeof resolved.defaultCollection).toBe("number");
  });
});
