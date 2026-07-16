import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { getClient, getClientAsync, resetClient } from "./client.js";
import { resetConfig } from "./config.js";

describe("client", () => {
  let originalToken: string | undefined;

  beforeEach(() => {
    originalToken = process.env["RAINDROP_TOKEN"];
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
    resetConfig();
    resetClient();
  });

  test("keeps getClient synchronous for existing programmatic users", async () => {
    const client = getClient();
    expect(client).toBeDefined();
    expect(await getClientAsync()).toBe(client);
  });
});
