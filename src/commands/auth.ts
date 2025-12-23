import { Command } from "commander";
import { createInterface } from "node:readline";
import {
  getConfig,
  getStoredToken,
  setStoredToken,
  clearStoredToken,
  getTokenSource,
  getConfigFilePath,
  resetConfig,
} from "../config.js";
import { getClient, resetClient } from "../client.js";

/**
 * Prompt for input (hides from shell history).
 */
async function prompt(message: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Validate token by calling the Raindrop API.
 */
async function validateToken(token: string): Promise<{ valid: boolean; user?: { name: string; email: string } }> {
  // Temporarily set the token in env for validation
  const originalToken = process.env["RAINDROP_TOKEN"];
  process.env["RAINDROP_TOKEN"] = token;
  resetConfig();
  resetClient();

  try {
    const client = getClient();
    const response = await client.user.getCurrentUser();
    const user = response.data.user;
    return {
      valid: true,
      user: user ? { name: user.fullName ?? "Unknown", email: user.email ?? "Unknown" } : undefined,
    };
  } catch {
    return { valid: false };
  } finally {
    // Restore original env
    if (originalToken) {
      process.env["RAINDROP_TOKEN"] = originalToken;
    } else {
      delete process.env["RAINDROP_TOKEN"];
    }
    resetConfig();
    resetClient();
  }
}

export function createAuthCommand(): Command {
  const auth = new Command("auth").description("Manage authentication");

  // set-token command
  auth
    .command("set-token")
    .description("Set your Raindrop.io API token")
    .option("--validate", "Validate token against API before saving", true)
    .option("--no-validate", "Skip token validation")
    .action(async (options) => {
      console.log("Get your token from: https://app.raindrop.io/settings/integrations");
      console.log("");

      const token = await prompt("Paste your token: ");

      if (!token) {
        console.error("Error: No token provided");
        process.exit(1);
      }

      if (options.validate) {
        console.log("Validating token...");
        const result = await validateToken(token);

        if (!result.valid) {
          console.error("Error: Invalid token. Please check your token and try again.");
          process.exit(1);
        }

        setStoredToken(token);
        resetConfig();
        console.log(`Token saved successfully!`);
        if (result.user) {
          console.log(`Authenticated as: ${result.user.name} (${result.user.email})`);
        }
      } else {
        setStoredToken(token);
        resetConfig();
        console.log("Token saved (not validated).");
      }

      console.log(`Config file: ${getConfigFilePath()}`);
    });

  // status command
  auth
    .command("status")
    .description("Show authentication status")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const config = getConfig();
      const source = getTokenSource();

      if (!config.token) {
        if (options.json) {
          console.log(JSON.stringify({ authenticated: false }, null, 2));
        } else {
          console.log("Not authenticated.");
          console.log("");
          console.log("To authenticate, either:");
          console.log("  1. Run: rdcli auth set-token");
          console.log("  2. Set RAINDROP_TOKEN environment variable");
          console.log("");
          console.log("Get your token from: https://app.raindrop.io/settings/integrations");
        }
        return;
      }

      // Try to validate and get user info
      try {
        const client = getClient();
        const response = await client.user.getCurrentUser();
        const user = response.data.user;

        if (options.json) {
          console.log(
            JSON.stringify(
              {
                authenticated: true,
                tokenSource: source,
                user: user
                  ? {
                      name: user.fullName,
                      email: user.email,
                    }
                  : null,
              },
              null,
              2
            )
          );
        } else {
          console.log("Authenticated ✓");
          console.log("");
          if (user) {
            console.log(`  User:   ${user.fullName ?? "Unknown"}`);
            console.log(`  Email:  ${user.email ?? "Unknown"}`);
          }
          console.log(`  Source: ${source === "env" ? "RAINDROP_TOKEN env var" : `config file (${getConfigFilePath()})`}`);
        }
      } catch {
        if (options.json) {
          console.log(
            JSON.stringify(
              {
                authenticated: false,
                tokenSource: source,
                error: "Token validation failed",
              },
              null,
              2
            )
          );
        } else {
          console.log("Token configured but invalid or expired.");
          console.log(`  Source: ${source === "env" ? "RAINDROP_TOKEN env var" : `config file (${getConfigFilePath()})`}`);
          console.log("");
          console.log("Run 'rdcli auth set-token' to set a new token.");
        }
        process.exit(1);
      }
    });

  // clear command
  auth
    .command("clear")
    .description("Remove stored token from config file")
    .action(() => {
      const hadToken = !!getStoredToken();
      clearStoredToken();
      resetConfig();

      if (hadToken) {
        console.log("Token cleared from config file.");
      } else {
        console.log("No token was stored in config file.");
      }

      if (process.env["RAINDROP_TOKEN"]) {
        console.log("");
        console.log("Note: RAINDROP_TOKEN environment variable is still set.");
      }
    });

  return auth;
}
