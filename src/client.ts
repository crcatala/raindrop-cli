import { client, generated } from "@lasuillard/raindrop-client";
import { getConfig } from "./config.js";

const { Raindrop } = client;
const { Configuration } = generated;

type RaindropClient = InstanceType<typeof Raindrop>;

let instance: RaindropClient | null = null;

export function getClient(): RaindropClient {
  if (!instance) {
    const config = getConfig();
    if (!config.token) {
      throw new Error(
        "RAINDROP_TOKEN not set. Get your token from https://app.raindrop.io/settings/integrations"
      );
    }
    instance = new Raindrop(
      new Configuration({
        accessToken: config.token,
      })
    );
  }
  return instance;
}

export function resetClient(): void {
  instance = null;
}
