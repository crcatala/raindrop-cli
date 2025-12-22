import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface Config {
  token: string | null;
  defaultFormat: "json" | "table" | "tsv";
  defaultCollection: number;
}

const CONFIG_PATHS = [
  join(homedir(), ".config", "raindrop-cli", "config.json"),
  join(homedir(), ".raindroprc"),
];

function loadConfigFile(): Partial<Config> {
  for (const configPath of CONFIG_PATHS) {
    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, "utf-8");
        return JSON.parse(content) as Partial<Config>;
      } catch {
        // Ignore malformed config files
      }
    }
  }
  return {};
}

let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (cachedConfig) {
    return cachedConfig;
  }

  const fileConfig = loadConfigFile();

  cachedConfig = {
    token: process.env["RAINDROP_TOKEN"] ?? fileConfig.token ?? null,
    defaultFormat: fileConfig.defaultFormat ?? "json",
    defaultCollection: fileConfig.defaultCollection ?? 0,
  };

  return cachedConfig;
}

export function resetConfig(): void {
  cachedConfig = null;
}
