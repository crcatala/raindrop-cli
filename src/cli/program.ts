/**
 * Commander program setup - creates and configures the CLI program.
 *
 * This module:
 * - Creates the root Command program
 * - Registers all global options
 * - Sets up the preAction hook for global option handling
 * - Registers all commands and shortcuts
 * - Configures styled help output
 */

import { Command, CommanderError, Option } from "commander";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import type { CliContext } from "./context.js";
import { OUTPUT_FORMATS } from "../types/index.js";
import { createAuthCommand } from "../commands/auth.js";
import { createBookmarksCommand } from "../commands/bookmarks.js";
import { createCollectionsCommand } from "../commands/collections.js";
import { createFavoritesCommand } from "../commands/favorites.js";
import { createHighlightsCommand } from "../commands/highlights.js";
import { createTagsCommand } from "../commands/tags.js";
import { createFiltersCommand } from "../commands/filters.js";
import { createTrashCommand } from "../commands/trash.js";
import { setNoColorFlag } from "../utils/tty.js";
import { setDebugEnabled, setVerboseEnabled, debug } from "../utils/debug.js";
import { outputError } from "../utils/output-streams.js";
import { setTimeoutSeconds, validateTimeout, DEFAULT_TIMEOUT_SECONDS } from "../utils/timeout.js";
import { configureStyledHelpRecursive } from "../utils/help-formatter.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "../../package.json"), "utf-8"));

/**
 * Create root-level shortcuts for bookmark commands.
 * These allow users to run `rd list` instead of `rd bookmarks list`.
 * The shortcuts delegate to the full bookmarks subcommands.
 */
function createRootBookmarkShortcut(
  program: Command,
  subcommandName: string,
  aliases: string[],
  description: string
): Command {
  const cmd = new Command(subcommandName)
    .description(description)
    .allowUnknownOption()
    .allowExcessArguments()
    .passThroughOptions()
    .helpOption(false) // Disable help to pass through to bookmarks command
    .action(async (_opts, command) => {
      // Get the raw argv from the root program
      const rawArgs = command.parent?.args ?? [];

      // Build new argv with 'bookmarks' inserted before the subcommand
      // Find where the subcommand name appears
      const cmdIndex = rawArgs.findIndex((arg: string) =>
        [subcommandName, ...aliases].includes(arg)
      );
      if (cmdIndex === -1) {
        debug("Root shortcut: command not found", {
          subcommandName,
          rawArgs,
        });
        return;
      }

      // Build new argv: everything before cmd + 'bookmarks' + canonical name + rest
      const newArgv = [
        ...rawArgs.slice(0, cmdIndex),
        "bookmarks",
        subcommandName,
        ...rawArgs.slice(cmdIndex + 1),
      ];

      // Re-parse with the modified arguments
      try {
        await program.parseAsync(newArgv, { from: "user" });
      } catch (err) {
        if (err instanceof CommanderError) {
          const isHelpOrVersion =
            err.code === "commander.help" ||
            err.code === "commander.helpDisplayed" ||
            err.code === "commander.version";
          if (isHelpOrVersion) {
            return; // Let it propagate naturally
          }
        }
        throw err;
      }
    });

  // Add aliases
  if (aliases.length > 0) {
    cmd.aliases(aliases);
  }

  return cmd;
}

/**
 * Create search shortcut that transforms positional query to --search flag.
 * `rd search <query> [options]` -> `rd bookmarks list --search <query> [options]`
 */
function createSearchShortcut(program: Command): Command {
  const cmd = new Command("search")
    .description("Search bookmarks (shortcut for: bookmarks list --search)")
    .argument("<query>", "Search query (supports Raindrop search syntax)")
    .allowUnknownOption()
    .allowExcessArguments()
    .passThroughOptions()
    .helpOption(false) // Disable help to pass through to bookmarks command
    .addHelpText(
      "after",
      `
Examples:
  rd search "javascript"                  # Full-text search
  rd search "#cli"                        # Search by tag
  rd search "type:article"                # Search by type
  rd search "#dev" --limit 50             # With additional options
  rd search "domain:github.com" --tag js  # Combined filters

This is a shortcut for: rd bookmarks list --search <query>
All bookmarks list options are supported.`
    )
    .action(async (query, _opts, command) => {
      // Get the raw argv from the root program
      const rawArgs = command.parent?.args ?? [];

      // Find 'search' in the args
      const cmdIndex = rawArgs.findIndex((arg: string) => arg === "search");
      if (cmdIndex === -1) {
        debug("Search shortcut: command not found in args", {
          rawArgs,
        });
        return;
      }

      // If no query provided, let it fall through to show help/error
      if (!query || (typeof query === "string" && query.startsWith("-"))) {
        // Transform to show bookmarks list help with search context
        const newArgv = [...rawArgs.slice(0, cmdIndex), "bookmarks", "list", "--help"];
        try {
          await program.parseAsync(newArgv, { from: "user" });
        } catch (err) {
          if (err instanceof CommanderError) {
            if (err.code === "commander.help" || err.code === "commander.helpDisplayed") {
              return;
            }
          }
          throw err;
        }
        return;
      }

      // Transform: rd search "query" [opts] -> rd bookmarks list --search "query" [opts]
      const newArgv = [
        ...rawArgs.slice(0, cmdIndex),
        "bookmarks",
        "list",
        "--search",
        query,
        ...rawArgs.slice(cmdIndex + 2), // Everything after the query
      ];

      debug("Search shortcut: transforming command", {
        original: rawArgs,
        transformed: newArgv,
      });

      try {
        await program.parseAsync(newArgv, { from: "user" });
      } catch (err) {
        if (err instanceof CommanderError) {
          const isHelpOrVersion =
            err.code === "commander.help" ||
            err.code === "commander.helpDisplayed" ||
            err.code === "commander.version";
          if (isHelpOrVersion) {
            return;
          }
        }
        throw err;
      }
    });

  return cmd;
}

/**
 * Create and configure the Commander program.
 *
 * @param ctx - CLI context with output configuration
 * @returns Configured Commander program ready for parsing
 */
export function createProgram(ctx: CliContext): Command {
  const program = new Command();

  program
    .name("rd")
    .description("CLI for Raindrop.io, the all-in-one bookmark manager")
    .version(pkg.version)
    .enablePositionalOptions()
    .addHelpText("after", "\nReport issues: https://github.com/crcatala/raindrop-cli-spike/issues")
    .addOption(
      new Option(
        "--format <format>",
        "output format; defaults to table for terminal, json when piped"
      ).choices(OUTPUT_FORMATS)
    )
    .option("--json", "shorthand for --format json")
    .option("-q, --quiet", "minimal output (just IDs)")
    .option("-v, --verbose", "show operational details (API calls, timing)")
    .option("-d, --debug", "show debug info (stack traces, internal state)")
    .option("--no-color", "disable colored output")
    .option(
      "-t, --timeout <seconds>",
      `request timeout in seconds (default: ${DEFAULT_TIMEOUT_SECONDS}, env: RDCLI_TIMEOUT)`
    )
    .hook("preAction", (_thisCommand, actionCommand) => {
      // With enablePositionalOptions(), flags after subcommand go to subcommand.
      // Use optsWithGlobals() from actionCommand to see all options.
      const globalOpts = actionCommand.optsWithGlobals();

      // Set the no-color flag before any command runs
      // Still setting globals for backward compatibility with existing code
      if (globalOpts.color === false) {
        setNoColorFlag(true);
      }

      // Set debug/verbose flags (globals for backward compatibility)
      if (globalOpts.debug) {
        setDebugEnabled(true);
      }
      if (globalOpts.verbose) {
        setVerboseEnabled(true);
      }

      // Set timeout if specified
      if (globalOpts.timeout !== undefined) {
        const error = validateTimeout(globalOpts.timeout);
        if (error) {
          outputError(error);
          throw new CommanderError(2, "commander.invalidArgument", error);
        }
        setTimeoutSeconds(parseInt(globalOpts.timeout, 10));
      }

      // Normalize --json flag: if --json is set but --format isn't, set format to json
      // --format takes precedence over --json when both are specified
      // Must set on actionCommand since that's where the action will read from
      if (globalOpts.json && !globalOpts.format) {
        actionCommand.setOptionValue("format", "json");
      }

      // The ctx already has parsed values from createContext(), but we keep
      // setting globals for backward compatibility with existing command code.
      // Future refactoring can migrate commands to use ctx directly.
      void ctx; // Acknowledge ctx is available for future use
    });

  // Register commands in desired help order
  program.addCommand(createAuthCommand());
  program.addCommand(createBookmarksCommand());

  // Root-level bookmark shortcuts (bookmarks is the primary resource)
  program.addCommand(
    createRootBookmarkShortcut(
      program,
      "list",
      ["ls"],
      "List bookmarks (shortcut for: bookmarks list)"
    )
  );
  program.addCommand(
    createRootBookmarkShortcut(
      program,
      "show",
      [],
      "Show a bookmark (shortcut for: bookmarks show)"
    )
  );
  program.addCommand(createSearchShortcut(program));
  program.addCommand(
    createRootBookmarkShortcut(
      program,
      "add",
      ["new", "create"],
      "Add a bookmark (shortcut for: bookmarks add)"
    )
  );
  program.addCommand(
    createRootBookmarkShortcut(
      program,
      "update",
      [],
      "Update a bookmark (shortcut for: bookmarks update)"
    )
  );
  program.addCommand(
    createRootBookmarkShortcut(
      program,
      "delete",
      ["rm"],
      "Delete a bookmark (shortcut for: bookmarks delete)"
    )
  );
  program.addCommand(
    createRootBookmarkShortcut(
      program,
      "batch-update",
      [],
      "Batch update bookmarks (shortcut for: bookmarks batch-update)"
    )
  );
  program.addCommand(
    createRootBookmarkShortcut(
      program,
      "batch-delete",
      ["batch-rm"],
      "Batch delete bookmarks (shortcut for: bookmarks batch-delete)"
    )
  );

  // Register remaining commands after shortcuts
  program.addCommand(createCollectionsCommand());
  program.addCommand(createTagsCommand());
  program.addCommand(createFiltersCommand());
  program.addCommand(createFavoritesCommand());
  program.addCommand(createHighlightsCommand());
  program.addCommand(createTrashCommand());

  // Configure styled help output (respects NO_COLOR, --no-color, and TTY detection)
  // Must be called after all commands are added so it can recursively configure subcommands
  configureStyledHelpRecursive(program);

  return program;
}
