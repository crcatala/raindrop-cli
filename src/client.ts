import { client, generated } from "@lasuillard/raindrop-client";
import { getConfig } from "./config.js";
import { ConfigError } from "./utils/errors.js";
import { setupClientInterceptors } from "./utils/axios-interceptors.js";
import { debug } from "./utils/debug.js";
import { getTimeoutMs, getTimeoutSeconds } from "./utils/timeout.js";

const { Raindrop } = client;
const { Configuration } = generated;

type RaindropClient = InstanceType<typeof Raindrop>;

let instance: RaindropClient | null = null;

export function getClient(): RaindropClient {
  if (!instance) {
    const config = getConfig();
    if (!config.token) {
      throw new ConfigError(
        "No API token configured. Run `rdcli auth set-token` or set `RAINDROP_TOKEN`. " +
          "Get your token from: https://app.raindrop.io/settings/integrations."
      );
    }

    debug("Creating Raindrop client");
    instance = new Raindrop(
      new Configuration({
        accessToken: config.token,
      })
    );

    // Set up interceptors for error handling, retry, and logging
    debug("Setting up client interceptors");
    setupClientInterceptors(instance.client);

    // Configure timeout
    const timeoutMs = getTimeoutMs();
    debug(`Setting request timeout to ${getTimeoutSeconds()}s`);
    instance.client.defaults.timeout = timeoutMs;
  }
  return instance;
}

export function resetClient(): void {
  instance = null;
}
