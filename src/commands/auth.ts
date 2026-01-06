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
import { outputData, outputMessage, outputError } from "../utils/output-streams.js";
import { verbose, debug } from "../utils/debug.js";
import { withProgress } from "../utils/progress.js";

/**
 * Prompt for input. Using readline avoids token appearing in shell history
 * (unlike passing via CLI args). Note: input is visible while typing.
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
async function validateToken(
  token: string
): Promise<{ valid: boolean; user?: { name: string; email: string } }> {
  // Temporarily set the token in env for validation
  const originalToken = process.env["RAINDROP_TOKEN"];
  process.env["RAINDROP_TOKEN"] = token;
  resetConfig();
  resetClient();

  debug("Validating token against Raindrop API");

  try {
    const client = getClient();
    const response = await withProgress("Calling Raindrop API", () => client.user.getCurrentUser());
    const user = response.data.user;
    debug("API response received", { userId: user?._id, email: user?.email });
    return {
      valid: true,
      user: user ? { name: user.fullName ?? "Unknown", email: user.email ?? "Unknown" } : undefined,
    };
  } catch (error) {
    debug("Token validation failed", { error: String(error) });
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
  const auth = new Command("auth")
    .description("Manage authentication")
    .exitOverride()
    .configureOutput({ outputError: () => {} })
    .action(function (this: Command) {
      this.help();
    });

  // set-token command
  auth
    .command("set-token")
    .description("Set your Raindrop.io API token")
    .option("--validate", "Validate token against API before saving", true)
    .option("--no-validate", "Skip token validation")
    .addHelpText(
      "after",
      `
Examples:
  rdcli auth set-token                        # Prompt for token (validates)
  rdcli auth set-token --no-validate          # Save without validation

Get your token from: https://app.raindrop.io/settings/integrations`
    )
    .action(async (options) => {
      outputMessage("Get your token from: https://app.raindrop.io/settings/integrations");
      outputMessage("");

      const token = await prompt("Paste your token: ");

      if (!token) {
        outputError("No token provided. Paste a token or run again to retry.");
        process.exit(2);
      }

      if (options.validate) {
        outputMessage("Validating token...");
        const result = await validateToken(token);

        if (!result.valid) {
          outputError("Token validation failed. Check your token and try again.");
          process.exit(1);
        }

        setStoredToken(token);
        resetConfig();
        outputMessage(`Token saved successfully!`);
        if (result.user) {
          outputMessage(`Authenticated as: ${result.user.name} (${result.user.email})`);
        }
      } else {
        setStoredToken(token);
        resetConfig();
        outputMessage("Token saved (not validated).");
      }

      outputMessage(`Config file: ${getConfigFilePath()}`);
    });

  // status command
  auth
    .command("status")
    .description("Show authentication status")
    .option("--json", "Output as JSON")
    .addHelpText(
      "after",
      `
Examples:
  rdcli auth status                           # Check authentication status
  rdcli auth status --json                    # Output as JSON for scripts`
    )
    .action(async (options) => {
      verbose("Checking authentication status");
      const config = getConfig();
      const source = getTokenSource();
      debug("Token lookup result", { hasToken: !!config.token, source });

      if (!config.token) {
        verbose("No token configured");
        if (options.json) {
          outputData(JSON.stringify({ authenticated: false }, null, 2));
        } else {
          outputMessage("Not authenticated.");
          outputMessage("");
          outputMessage("To authenticate, either:");
          outputMessage("  1. Run: rdcli auth set-token");
          outputMessage("  2. Set RAINDROP_TOKEN environment variable");
          outputMessage("");
          outputMessage("Get your token from: https://app.raindrop.io/settings/integrations");
        }
        return;
      }

      // Try to validate and get user info
      try {
        const client = getClient();
        const response = await withProgress("Fetching user info", () =>
          client.user.getCurrentUser()
        );
        const user = response.data.user;

        if (options.json) {
          outputData(
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
          outputMessage("Authenticated ✓");
          outputMessage("");
          if (user) {
            outputMessage(`  User:   ${user.fullName ?? "Unknown"}`);
            outputMessage(`  Email:  ${user.email ?? "Unknown"}`);
          }
          outputMessage(
            `  Source: ${source === "env" ? "RAINDROP_TOKEN env var" : `config file (${getConfigFilePath()})`}`
          );
        }
      } catch {
        // JSON output goes to stdout even on error (for scripts to parse).
        // Exit code 1 signals failure per clig.dev guidelines.
        if (options.json) {
          outputData(
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
          outputMessage("Token configured but invalid or expired.");
          outputMessage(
            `  Source: ${source === "env" ? "RAINDROP_TOKEN env var" : `config file (${getConfigFilePath()})`}`
          );
          outputMessage("");
          outputMessage("Run 'rdcli auth set-token' to set a new token.");
        }
        process.exit(1);
      }
    });

  // clear command
  auth
    .command("clear")
    .description("Remove stored token from config file")
    .addHelpText(
      "after",
      `
Examples:
  rdcli auth clear                            # Remove saved token`
    )
    .action(() => {
      const hadToken = !!getStoredToken();
      clearStoredToken();
      resetConfig();

      if (hadToken) {
        outputMessage("Token cleared from config file.");
      } else {
        outputMessage("No token was stored in config file.");
      }

      if (process.env["RAINDROP_TOKEN"]) {
        outputMessage("");
        outputMessage("Note: RAINDROP_TOKEN environment variable is still set.");
      }
    });

  return auth;
}
