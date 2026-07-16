import Raindrop, { generated } from "@lasuillard/raindrop-client";
import { getConfig, getConfigSync } from "./config.js";
import { ConfigError } from "./utils/errors.js";
import { setupClientInterceptors } from "./utils/axios-interceptors.js";
import { debug } from "./utils/debug.js";
import { getTimeoutMs, getTimeoutSeconds } from "./utils/timeout.js";

const { Configuration } = generated;

type RaindropClient = InstanceType<typeof Raindrop>;

let instance: RaindropClient | null = null;

function createClient(token: string): RaindropClient {
  debug("Creating Raindrop client");
  instance = new Raindrop(new Configuration({ accessToken: token }));

  debug("Setting up client interceptors");
  setupClientInterceptors(instance.client);

  const timeoutMs = getTimeoutMs();
  debug(`Setting request timeout to ${getTimeoutSeconds()}s`);
  instance.client.defaults.timeout = timeoutMs;
  return instance;
}

function noTokenError(): ConfigError {
  return new ConfigError(
    "No API token configured. Run `rd auth set-token` or set `RAINDROP_TOKEN`. " +
      "Get your token from: https://app.raindrop.io/settings/integrations."
  );
}

/**
 * Return a configured client for synchronous credential sources. Kept for
 * backwards compatibility with the package's existing programmatic API.
 */
export function getClient(): RaindropClient {
  if (instance) {
    return instance;
  }

  const config = getConfigSync();
  if (!config.token) {
    throw noTokenError();
  }
  return createClient(config.token);
}

/**
 * Return a configured client, including tokens stored in the system keyring.
 * CLI commands use this variant because keyring access is asynchronous.
 */
export async function getClientAsync(): Promise<RaindropClient> {
  if (instance) {
    return instance;
  }

  const config = await getConfig();
  if (!config.token) {
    throw noTokenError();
  }
  return createClient(config.token);
}

export function resetClient(): void {
  instance = null;
}
