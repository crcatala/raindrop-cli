import { program, CommanderError } from "commander";
import { createAuthCommand } from "./commands/auth.js";
import { createBookmarksCommand } from "./commands/bookmarks.js";
import { createCollectionsCommand } from "./commands/collections.js";
import { createHighlightsCommand } from "./commands/highlights.js";
import { createTagsCommand } from "./commands/tags.js";
import { createFiltersCommand } from "./commands/filters.js";
import { setNoColorFlag } from "./utils/tty.js";
import { setDebugEnabled, setVerboseEnabled } from "./utils/debug.js";

program
  .name("rdcli")
  .description("CLI for Raindrop.io - AI agent friendly bookmark management")
  .version("0.1.0")
  .addHelpText("after", "\nReport issues: https://github.com/crcatala/raindrop-cli-spike/issues")
  .option(
    "-f, --format <format>",
    "output format (json, table, tsv); defaults to table for terminal, json when piped"
  )
  .option("-q, --quiet", "minimal output (just IDs)")
  .option("-v, --verbose", "show operational details (API calls, timing)")
  .option("-d, --debug", "show debug info (stack traces, internal state)")
  .option("--no-color", "disable colored output")
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
  });

// Register commands
program.addCommand(createAuthCommand());
program.addCommand(createBookmarksCommand());
program.addCommand(createCollectionsCommand());
program.addCommand(createHighlightsCommand());
program.addCommand(createTagsCommand());
program.addCommand(createFiltersCommand());

try {
  program.parse();
  // If we get here with no subcommand, show help
  if (process.argv.length <= 2) {
    program.help();
  }
} catch (err) {
  if (err instanceof CommanderError) {
    // Help/version display should exit cleanly
    if (
      err.code === "commander.help" ||
      err.code === "commander.helpDisplayed" ||
      err.code === "commander.version"
    ) {
      process.exit(0);
    }
    // Commander errors are usage errors (per clig.dev conventions)
    process.exit(2);
  }
  throw err;
}
