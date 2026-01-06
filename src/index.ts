import { program, Command, CommanderError, Option } from "commander";
import { OUTPUT_FORMATS } from "./types/index.js";
import { createAuthCommand } from "./commands/auth.js";
import { createBookmarksCommand } from "./commands/bookmarks.js";
import { createCollectionsCommand } from "./commands/collections.js";
import { createFavoritesCommand } from "./commands/favorites.js";
import { createHighlightsCommand } from "./commands/highlights.js";
import { createTagsCommand } from "./commands/tags.js";
import { createFiltersCommand } from "./commands/filters.js";
import { createTrashCommand } from "./commands/trash.js";
import { setNoColorFlag } from "./utils/tty.js";
import { setDebugEnabled, setVerboseEnabled, debug } from "./utils/debug.js";
import { outputError } from "./utils/output-streams.js";
import { setTimeoutSeconds, validateTimeout, DEFAULT_TIMEOUT_SECONDS } from "./utils/timeout.js";
import { configureStyledHelpRecursive } from "./utils/help-formatter.js";

program
  .name("rd")
  .description("CLI for Raindrop.io, the all-in-one bookmark manager")
  .version("0.1.0")
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
  .exitOverride()
  .hook("preAction", (_thisCommand, actionCommand) => {
    // With enablePositionalOptions(), flags after subcommand go to subcommand.
    // Use optsWithGlobals() from actionCommand to see all options.
    const globalOpts = actionCommand.optsWithGlobals();

    // Set the no-color flag before any command runs
    if (globalOpts.color === false) {
      setNoColorFlag(true);
    }

    // Set debug/verbose flags
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
        process.exit(2);
      }
      setTimeoutSeconds(parseInt(globalOpts.timeout, 10));
    }

    // Normalize --json flag: if --json is set but --format isn't, set format to json
    // --format takes precedence over --json when both are specified
    // Must set on actionCommand since that's where the action will read from
    if (globalOpts.json && !globalOpts.format) {
      actionCommand.setOptionValue("format", "json");
    }
  });

// Register commands in desired help order
program.addCommand(createAuthCommand());
program.addCommand(createBookmarksCommand());

/**
 * Create root-level shortcuts for bookmark commands.
 * These allow users to run `rd list` instead of `rd bookmarks list`.
 * The shortcuts delegate to the full bookmarks subcommands.
 */
function createRootBookmarkShortcut(
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
    .action(async () => {
      // Find the command at the expected position (index 2: ['node', 'rd', '<cmd>', ...])
      // We check explicitly at index 2 to avoid matching command names in argument values
      const cmdIndex = process.argv.findIndex(
        (arg, index) => index === 2 && [subcommandName, ...aliases].includes(arg)
      );
      if (cmdIndex === -1) {
        debug("Root shortcut: command not found at expected position", {
          subcommandName,
          argv: process.argv,
        });
        return;
      }

      // Build new argv with 'bookmarks' inserted before the subcommand
      // Also normalize alias to canonical name
      const newArgv = [
        ...process.argv.slice(0, cmdIndex),
        "bookmarks",
        subcommandName,
        ...process.argv.slice(cmdIndex + 1),
      ];

      // Re-parse with the modified arguments
      // Catch CommanderError for help/version display (expected exits)
      try {
        await program.parseAsync(newArgv);
      } catch (err) {
        if (err instanceof CommanderError) {
          const isHelpOrVersion =
            err.code === "commander.help" ||
            err.code === "commander.helpDisplayed" ||
            err.code === "commander.version";
          process.exit(isHelpOrVersion ? 0 : 2);
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
function createSearchShortcut(): Command {
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
    .action(async () => {
      // Find 'search' command in argv (after position 1 to skip node/bun and script path)
      // We look for the first non-option argument that matches 'search'
      let cmdIndex = -1;
      for (let i = 2; i < process.argv.length; i++) {
        const arg = process.argv[i];
        if (!arg) continue;
        // Skip options and their values
        if (arg.startsWith("-")) {
          // If it's an option that takes a value (like --format json), skip next arg too
          // For simplicity, skip just the flag - Commander handles this before calling action
          continue;
        }
        if (arg === "search") {
          cmdIndex = i;
          break;
        }
      }

      if (cmdIndex === -1) {
        debug("Search shortcut: command not found in argv", {
          argv: process.argv,
        });
        return;
      }

      // The query is right after 'search'
      const query = process.argv[cmdIndex + 1];

      // If no query provided, let it fall through to show help/error
      if (!query || query.startsWith("-")) {
        // Transform to show bookmarks list help with search context
        const newArgv = [...process.argv.slice(0, cmdIndex), "bookmarks", "list", "--help"];
        try {
          await program.parseAsync(newArgv);
        } catch (err) {
          if (err instanceof CommanderError) {
            process.exit(
              err.code === "commander.help" || err.code === "commander.helpDisplayed" ? 0 : 2
            );
          }
          throw err;
        }
        return;
      }

      // Transform: rd search "query" [opts] -> rd bookmarks list --search "query" [opts]
      const newArgv = [
        ...process.argv.slice(0, cmdIndex),
        "bookmarks",
        "list",
        "--search",
        query,
        ...process.argv.slice(cmdIndex + 2), // Everything after the query
      ];

      debug("Search shortcut: transforming command", {
        original: process.argv,
        transformed: newArgv,
      });

      try {
        await program.parseAsync(newArgv);
      } catch (err) {
        if (err instanceof CommanderError) {
          const isHelpOrVersion =
            err.code === "commander.help" ||
            err.code === "commander.helpDisplayed" ||
            err.code === "commander.version";
          process.exit(isHelpOrVersion ? 0 : 2);
        }
        throw err;
      }
    });

  return cmd;
}

// Root-level bookmark shortcuts (bookmarks is the primary resource)
program.addCommand(
  createRootBookmarkShortcut("list", ["ls"], "List bookmarks (shortcut for: bookmarks list)")
);
program.addCommand(
  createRootBookmarkShortcut("show", [], "Show a bookmark (shortcut for: bookmarks show)")
);
program.addCommand(createSearchShortcut());
program.addCommand(
  createRootBookmarkShortcut(
    "add",
    ["new", "create"],
    "Add a bookmark (shortcut for: bookmarks add)"
  )
);
program.addCommand(
  createRootBookmarkShortcut("update", [], "Update a bookmark (shortcut for: bookmarks update)")
);
program.addCommand(
  createRootBookmarkShortcut("delete", ["rm"], "Delete a bookmark (shortcut for: bookmarks delete)")
);
program.addCommand(
  createRootBookmarkShortcut(
    "batch-update",
    [],
    "Batch update bookmarks (shortcut for: bookmarks batch-update)"
  )
);
program.addCommand(
  createRootBookmarkShortcut(
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

try {
  // Commander automatically shows help when no subcommand is provided
  program.parse();
} catch (err) {
  if (err instanceof CommanderError) {
    // Commander already output the error/help, just exit with appropriate code
    // (see docs/commander-best-practices.md for why we don't re-output errors)
    const isHelpOrVersion =
      err.code === "commander.help" ||
      err.code === "commander.helpDisplayed" ||
      err.code === "commander.version";
    // Help/version exit 0, usage errors exit 2 (per clig.dev conventions)
    process.exit(isHelpOrVersion ? 0 : 2);
  }
  throw err;
}
