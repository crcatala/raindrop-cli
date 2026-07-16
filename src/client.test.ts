import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getClient, getClientAsync, resetClient } from "./client.js";
import { resetConfig } from "./config.js";

describe("client", () => {
  let originalToken: string | undefined;
  let originalXdgConfigHome: string | undefined;
  let xdgConfigHome: string | undefined;

  beforeEach(() => {
    originalToken = process.env["RAINDROP_TOKEN"];
    originalXdgConfigHome = process.env["XDG_CONFIG_HOME"];
    process.env["RAINDROP_TOKEN"] = "test-token";
    resetConfig();
    resetClient();
  });

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env["RAINDROP_TOKEN"];
    } else {
      process.env["RAINDROP_TOKEN"] = originalToken;
    }
    if (originalXdgConfigHome === undefined) {
      delete process.env["XDG_CONFIG_HOME"];
    } else {
      process.env["XDG_CONFIG_HOME"] = originalXdgConfigHome;
    }
    if (xdgConfigHome) {
      rmSync(xdgConfigHome, { recursive: true, force: true });
      xdgConfigHome = undefined;
    }
    resetConfig();
    resetClient();
  });

  test("keeps getClient synchronous for existing programmatic users", async () => {
    const client = getClient();
    expect(client).toBeDefined();
    expect(await getClientAsync()).toBe(client);
  });

  test("directs synchronous callers to getClientAsync for keyring-backed tokens", () => {
    xdgConfigHome = mkdtempSync(join(tmpdir(), "raindrop-cli-client-"));
    process.env["XDG_CONFIG_HOME"] = xdgConfigHome;
    delete process.env["RAINDROP_TOKEN"];
    const configDir = join(xdgConfigHome, "raindrop-cli");
    mkdirSync(configDir, { recursive: true });
    writeFileSync(join(configDir, "config.json"), JSON.stringify({ tokenStorage: "keyring" }));
    resetConfig();

    expect(() => getClient()).toThrow(
      "Use `getClientAsync()` to access keyring-backed credentials"
    );
  });
});
