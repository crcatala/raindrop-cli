import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { clearKeyringToken, getKeyringToken, setKeyringToken } from "./credentials.js";

export interface StoredConfig {
  /** Legacy plaintext token or the explicit --use-config fallback. */
  token?: string;
  tokenStorage?: "keyring" | "config";
  defaultFormat?: "json" | "table" | "tsv";
  defaultCollection?: number;
}

export interface ResolvedConfig {
  token: string | null;
  tokenSource: "env" | "keyring" | "config" | null;
  defaultFormat: "json" | "table" | "tsv";
  defaultCollection: number;
}

function getConfigDir(): string {
  return process.env["XDG_CONFIG_HOME"]
    ? join(process.env["XDG_CONFIG_HOME"], "raindrop-cli")
    : join(homedir(), ".config", "raindrop-cli");
}

function getConfigFile(): string {
  return join(getConfigDir(), "config.json");
}

function ensureConfigDir(): void {
  const configDir = getConfigDir();
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true, mode: 0o700 });
  }
  chmodSync(configDir, 0o700);
}

function loadConfigFile(): StoredConfig {
  const configFile = getConfigFile();
  if (existsSync(configFile)) {
    try {
      const content = readFileSync(configFile, "utf-8");
      return JSON.parse(content) as StoredConfig;
    } catch {
      // Ignore malformed config files.
    }
  }
  return {};
}

function saveConfigFile(config: StoredConfig): void {
  ensureConfigDir();
  const configFile = getConfigFile();
  writeFileSync(configFile, JSON.stringify(config, null, 2), { mode: 0o600 });
  chmodSync(configFile, 0o600);
}

/**
 * Get the locally stored token. Existing plaintext tokens remain supported;
 * newly saved tokens use the system keyring unless --use-config is selected.
 */
export async function getStoredToken(): Promise<string | null> {
  const config = loadConfigFile();
  if (config.tokenStorage === "keyring") {
    return getKeyringToken();
  }
  return config.token ?? null;
}

/** Store a token in the keyring by default, or plaintext when explicitly requested. */
export async function setStoredToken(token: string, useConfig = false): Promise<void> {
  const config = loadConfigFile();

  if (useConfig) {
    if (config.tokenStorage === "keyring") {
      await clearKeyringToken();
    }
    config.token = token;
    config.tokenStorage = "config";
  } else {
    await setKeyringToken(token);
    delete config.token;
    config.tokenStorage = "keyring";
  }

  saveConfigFile(config);
}

/** Remove the token from its configured storage location. */
export async function clearStoredToken(): Promise<"keyring" | "config" | null> {
  const config = loadConfigFile();
  const storage = config.tokenStorage ?? (config.token ? "config" : null);

  if (storage === "keyring") {
    await clearKeyringToken();
  }

  delete config.token;
  delete config.tokenStorage;
  saveConfigFile(config);
  return storage;
}

export async function hasToken(): Promise<boolean> {
  return !!(process.env["RAINDROP_TOKEN"] || (await getStoredToken()));
}

export async function getTokenSource(): Promise<ResolvedConfig["tokenSource"]> {
  if (process.env["RAINDROP_TOKEN"]) {
    return "env";
  }

  const config = loadConfigFile();
  if (config.tokenStorage === "keyring") {
    return (await getKeyringToken()) ? "keyring" : null;
  }
  return config.token ? "config" : null;
}

let cachedConfig: ResolvedConfig | null = null;

/**
 * Resolve sources that can be read synchronously. This preserves the original
 * library client API for environment and plaintext-config consumers; keyring
 * credentials require getConfig() because keytar is asynchronous.
 */
export function getConfigSync(): ResolvedConfig {
  const fileConfig = loadConfigFile();
  const envToken = process.env["RAINDROP_TOKEN"];

  if (envToken) {
    return {
      token: envToken,
      tokenSource: "env",
      defaultFormat: fileConfig.defaultFormat ?? "json",
      defaultCollection: fileConfig.defaultCollection ?? 0,
    };
  }

  return {
    token: fileConfig.tokenStorage === "keyring" ? null : (fileConfig.token ?? null),
    tokenSource: fileConfig.tokenStorage === "keyring" ? null : fileConfig.token ? "config" : null,
    defaultFormat: fileConfig.defaultFormat ?? "json",
    defaultCollection: fileConfig.defaultCollection ?? 0,
  };
}

/** Get resolved config with precedence: env > keyring/config. */
export async function getConfig(): Promise<ResolvedConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  const fileConfig = loadConfigFile();
  const envToken = process.env["RAINDROP_TOKEN"];
  let token: string | null = null;
  let tokenSource: ResolvedConfig["tokenSource"] = null;

  if (envToken) {
    token = envToken;
    tokenSource = "env";
  } else if (fileConfig.tokenStorage === "keyring") {
    token = await getKeyringToken();
    tokenSource = token ? "keyring" : null;
  } else if (fileConfig.token) {
    token = fileConfig.token;
    tokenSource = "config";
  }

  cachedConfig = {
    token,
    tokenSource,
    defaultFormat: fileConfig.defaultFormat ?? "json",
    defaultCollection: fileConfig.defaultCollection ?? 0,
  };
  return cachedConfig;
}

export function resetConfig(): void {
  cachedConfig = null;
}

export function getConfigFilePath(): string {
  return getConfigFile();
}
