import { program, Command, CommanderError, Option } from "commander";
import { OUTPUT_FORMATS } from "./types/index.js";
import { createAuthCommand } from "./commands/auth.js";
import { createBookmarksCommand } from "./commands/bookmarks.js";
import { createCollectionsCommand } from "./commands/collections.js";
import { createHighlightsCommand } from "./commands/highlights.js";
import { createTagsCommand } from "./commands/tags.js";
import { createFiltersCommand } from "./commands/filters.js";
import { createTrashCommand } from "./commands/trash.js";
import { setNoColorFlag } from "./utils/tty.js";
import { setDebugEnabled, setVerboseEnabled, debug } from "./utils/debug.js";
import { outputError } from "./utils/output-streams.js";
import { setTimeoutSeconds, validateTimeout, DEFAULT_TIMEOUT_SECONDS } from "./utils/timeout.js";

program
  .name("rd")
  .description("CLI for Raindrop.io - AI agent friendly bookmark management")
  .version("0.1.0")
  .enablePositionalOptions()
  .addHelpText("after", "\nReport issues: https://github.com/crcatala/raindrop-cli-spike/issues")
  .addOption(
    new Option(
      "--format <format>",
      "output format; defaults to table for terminal, json when piped"
    ).choices(OUTPUT_FORMATS)
  )
  .option("-q, --quiet", "minimal output (just IDs)")
  .option("-v, --verbose", "show operational details (API calls, timing)")
  .option("-d, --debug", "show debug info (stack traces, internal state)")
  .option("--no-color", "disable colored output")
  .option(
    "-t, --timeout <seconds>",
    `request timeout in seconds (default: ${DEFAULT_TIMEOUT_SECONDS}, env: RDCLI_TIMEOUT)`
  )
  .exitOverride()
  .hook("preAction", (thisCommand) => {
    const opts = thisCommand.opts();

    // Set the no-color flag before any command runs
    if (opts.color === false) {
      setNoColorFlag(true);
    }

    // Set debug/verbose flags
    if (opts.debug) {
      setDebugEnabled(true);
    }
    if (opts.verbose) {
      setVerboseEnabled(true);
    }

    // Set timeout if specified
    if (opts.timeout !== undefined) {
      const error = validateTimeout(opts.timeout);
      if (error) {
        outputError(error);
        process.exit(2);
      }
      setTimeoutSeconds(parseInt(opts.timeout, 10));
    }
  });

// Register commands
program.addCommand(createAuthCommand());
program.addCommand(createBookmarksCommand());
program.addCommand(createCollectionsCommand());
program.addCommand(createHighlightsCommand());
program.addCommand(createTagsCommand());
program.addCommand(createFiltersCommand());
program.addCommand(createTrashCommand());

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

// Root-level bookmark shortcuts (bookmarks is the primary resource)
program.addCommand(
  createRootBookmarkShortcut("list", ["ls"], "List bookmarks (shortcut for: bookmarks list)")
);
program.addCommand(
  createRootBookmarkShortcut(
    "add",
    ["new", "create"],
    "Add a bookmark (shortcut for: bookmarks add)"
  )
);
program.addCommand(
  createRootBookmarkShortcut("show", [], "Show a bookmark (shortcut for: bookmarks show)")
);
program.addCommand(
  createRootBookmarkShortcut("delete", ["rm"], "Delete a bookmark (shortcut for: bookmarks delete)")
);
program.addCommand(
  createRootBookmarkShortcut("update", [], "Update a bookmark (shortcut for: bookmarks update)")
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
