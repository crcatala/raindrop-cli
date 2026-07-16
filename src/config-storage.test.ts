import { afterAll, afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const clearKeyringToken = mock<() => Promise<void>>();

await mock.module("./credentials.js", () => ({
  clearKeyringToken,
  getKeyringToken: mock(() => Promise.resolve(null)),
  setKeyringToken: mock(() => Promise.resolve()),
}));

const config = await import("./config.js");

let originalXdgConfigHome: string | undefined;
let xdgConfigHome: string;

function configFilePath(): string {
  return join(xdgConfigHome, "raindrop-cli", "config.json");
}

function writeConfig(value: object): void {
  mkdirSync(join(xdgConfigHome, "raindrop-cli"), { recursive: true });
  writeFileSync(configFilePath(), JSON.stringify(value));
}

describe("keyring storage transitions", () => {
  beforeEach(() => {
    originalXdgConfigHome = process.env["XDG_CONFIG_HOME"];
    xdgConfigHome = mkdtempSync(join(tmpdir(), "raindrop-cli-config-"));
    process.env["XDG_CONFIG_HOME"] = xdgConfigHome;
    delete process.env["RAINDROP_TOKEN"];
    clearKeyringToken.mockReset();
    config.resetConfig();
  });

  afterEach(() => {
    if (originalXdgConfigHome === undefined) {
      delete process.env["XDG_CONFIG_HOME"];
    } else {
      process.env["XDG_CONFIG_HOME"] = originalXdgConfigHome;
    }
    rmSync(xdgConfigHome, { recursive: true, force: true });
    config.resetConfig();
  });

  afterAll(() => {
    mock.restore();
  });

  test("saves the config fallback even when an old keyring token cannot be cleared", async () => {
    writeConfig({ tokenStorage: "keyring", defaultFormat: "table" });
    clearKeyringToken.mockRejectedValue(new Error("keyring unavailable"));

    const result = await config.setStoredToken("fallback-token", true);

    expect(result).toEqual({ keyringCleanupFailed: true });
    expect(JSON.parse(readFileSync(configFilePath(), "utf8"))).toEqual({
      token: "fallback-token",
      tokenStorage: "config",
      defaultFormat: "table",
    });
    expect(await config.getTokenSource()).toBe("config");
    expect((await config.getConfig()).token).toBe("fallback-token");
  });

  test("removes the old keyring token after persisting the config fallback", async () => {
    writeConfig({ tokenStorage: "keyring" });
    clearKeyringToken.mockResolvedValue();

    const result = await config.setStoredToken("fallback-token", true);

    expect(result).toEqual({ keyringCleanupFailed: false });
    expect(clearKeyringToken).toHaveBeenCalledTimes(1);
    expect(JSON.parse(readFileSync(configFilePath(), "utf8"))).toEqual({
      token: "fallback-token",
      tokenStorage: "config",
    });
  });

  test("clears an explicit config fallback", async () => {
    writeConfig({ token: "fallback-token", tokenStorage: "config" });

    expect(await config.clearStoredToken()).toBe("config");
    expect(JSON.parse(readFileSync(configFilePath(), "utf8"))).toEqual({});
  });
});
