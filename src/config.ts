import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  chmodSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface StoredConfig {
  token?: string;
  defaultFormat?: "json" | "table" | "tsv";
  defaultCollection?: number;
}

export interface ResolvedConfig {
  token: string | null;
  tokenSource: "env" | "config" | null;
  defaultFormat: "json" | "table" | "tsv";
  defaultCollection: number;
}

const CONFIG_DIR = join(homedir(), ".config", "raindrop-cli");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

/**
 * Ensure config directory exists with secure permissions (700).
 */
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Load raw config from file.
 */
function loadConfigFile(): StoredConfig {
  if (existsSync(CONFIG_FILE)) {
    try {
      const content = readFileSync(CONFIG_FILE, "utf-8");
      return JSON.parse(content) as StoredConfig;
    } catch {
      // Ignore malformed config files
    }
  }
  return {};
}

/**
 * Save config to file with secure permissions (600).
 */
function saveConfigFile(config: StoredConfig): void {
  ensureConfigDir();
  const content = JSON.stringify(config, null, 2);
  // mode option only applies to new files; chmodSync ensures existing files also get correct perms
  writeFileSync(CONFIG_FILE, content, { mode: 0o600 });
  chmodSync(CONFIG_FILE, 0o600);
}

/**
 * Get the stored token from config file (not env var).
 */
export function getStoredToken(): string | null {
  const config = loadConfigFile();
  return config.token ?? null;
}

/**
 * Store token in config file.
 */
export function setStoredToken(token: string): void {
  const config = loadConfigFile();
  config.token = token;
  saveConfigFile(config);
}

/**
 * Clear token from config file.
 */
export function clearStoredToken(): void {
  const config = loadConfigFile();
  delete config.token;
  saveConfigFile(config);
}

/**
 * Check if a token is configured (either env or config file).
 */
export function hasToken(): boolean {
  return !!(process.env["RAINDROP_TOKEN"] || getStoredToken());
}

/**
 * Get token source for display purposes.
 */
export function getTokenSource(): "env" | "config" | null {
  if (process.env["RAINDROP_TOKEN"]) {
    return "env";
  }
  if (getStoredToken()) {
    return "config";
  }
  return null;
}

let cachedConfig: ResolvedConfig | null = null;

/**
 * Get resolved config with precedence: env > config file.
 */
export function getConfig(): ResolvedConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const fileConfig = loadConfigFile();
  const envToken = process.env["RAINDROP_TOKEN"];

  let token: string | null = null;
  let tokenSource: "env" | "config" | null = null;

  if (envToken) {
    token = envToken;
    tokenSource = "env";
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

/**
 * Reset cached config (useful for testing or after token changes).
 */
export function resetConfig(): void {
  cachedConfig = null;
}

/**
 * Get the config file path (for display purposes).
 */
export function getConfigFilePath(): string {
  return CONFIG_FILE;
}
