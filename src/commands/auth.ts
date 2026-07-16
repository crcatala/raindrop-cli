import { Command } from "commander";
import { createInterface } from "node:readline";
import {
  getConfig,
  setStoredToken,
  clearStoredToken,
  getTokenSource,
  getConfigFilePath,
  resetConfig,
} from "../config.js";
import { getClientAsync, resetClient } from "../client.js";
import { outputData, outputMessage, outputError } from "../utils/output-streams.js";
import { verbose, debug } from "../utils/debug.js";
import { withProgress } from "../utils/progress.js";

/**
 * Prompt for input. Using readline avoids token appearing in shell history
 * (unlike passing via CLI args). Note: input is visible while typing.
 */
function formatTokenSource(source: "env" | "keyring" | "config" | null): string {
  if (source === "env") {
    return "RAINDROP_TOKEN env var";
  }
  if (source === "keyring") {
    return "system keyring";
  }
  return `config file (${getConfigFilePath()})`;
}

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
    const client = await getClientAsync();
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
    .action(function (this: Command) {
      this.help();
    });

  // set-token command
  auth
    .command("set-token")
    .description("Set your Raindrop.io API token")
    .option("--validate", "Validate token against API before saving", true)
    .option("--no-validate", "Skip token validation")
    .option("--use-config", "Store token in plaintext config instead of the system keyring")
    .addHelpText(
      "after",
      `
Examples:
  rd auth set-token                        # Prompt for token (validates, saves to keyring)
  rd auth set-token --use-config           # Save plaintext token in config file
  rd auth set-token --no-validate          # Save without validation

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

        const storageResult = await setStoredToken(token, options.useConfig);
        resetConfig();
        outputMessage(
          `Token saved successfully${options.useConfig ? " to config file" : " to system keyring"}!`
        );
        if (storageResult.keyringCleanupFailed) {
          outputError(
            "Warning: the previous system-keyring token could not be removed; the config-file token will be used."
          );
        }
        if (result.user) {
          outputMessage(`Authenticated as: ${result.user.name} (${result.user.email})`);
        }
      } else {
        const storageResult = await setStoredToken(token, options.useConfig);
        resetConfig();
        outputMessage(
          `Token saved${options.useConfig ? " to config file" : " to system keyring"} (not validated).`
        );
        if (storageResult.keyringCleanupFailed) {
          outputError(
            "Warning: the previous system-keyring token could not be removed; the config-file token will be used."
          );
        }
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
  rd auth status                           # Check authentication status
  rd auth status --json                    # Output as JSON for scripts`
    )
    .action(async (options) => {
      verbose("Checking authentication status");
      const config = await getConfig();
      const source = await getTokenSource();
      debug("Token lookup result", { hasToken: !!config.token, source });

      if (!config.token) {
        verbose("No token configured");
        if (options.json) {
          outputData(JSON.stringify({ authenticated: false }, null, 2));
        } else {
          outputMessage("Not authenticated.");
          outputMessage("");
          outputMessage("To authenticate, either:");
          outputMessage("  1. Run: rd auth set-token");
          outputMessage("  2. Set RAINDROP_TOKEN environment variable");
          outputMessage("");
          outputMessage("Get your token from: https://app.raindrop.io/settings/integrations");
        }
        return;
      }

      // Try to validate and get user info
      try {
        const client = await getClientAsync();
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
          outputMessage(`  Source: ${formatTokenSource(source)}`);
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
          outputMessage(`  Source: ${formatTokenSource(source)}`);
          outputMessage("");
          outputMessage("Run 'rd auth set-token' to set a new token.");
        }
        process.exit(1);
      }
    });

  // whoami command (alias for status)
  auth
    .command("whoami")
    .description("Show the authenticated user")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      // Parse only the status command's arguments. With `from: "user"`,
      // including "status" here makes Commander treat it as an extra argument.
      const statusCmd = auth.commands.find((command) => command.name() === "status");
      if (statusCmd) {
        await statusCmd.parseAsync(options.json ? ["--json"] : [], { from: "user" });
      }
    });

  // clear command
  auth
    .command("clear")
    .description("Remove the locally stored token")
    .addHelpText(
      "after",
      `
Examples:
  rd auth clear                            # Remove saved token`
    )
    .action(async () => {
      const storage = await clearStoredToken();
      resetConfig();

      if (storage === "keyring") {
        outputMessage("Token cleared from system keyring.");
      } else if (storage === "config") {
        outputMessage("Token cleared from config file.");
      } else {
        outputMessage("No token was stored locally.");
      }

      if (process.env["RAINDROP_TOKEN"]) {
        outputMessage("");
        outputMessage("Note: RAINDROP_TOKEN environment variable is still set.");
      }
    });

  return auth;
}
