import { program, CommanderError } from "commander";
import { createAuthCommand } from "./commands/auth.js";
import { createBookmarksCommand } from "./commands/bookmarks.js";
import { createCollectionsCommand } from "./commands/collections.js";
import { createHighlightsCommand } from "./commands/highlights.js";
import { createTagsCommand } from "./commands/tags.js";
import { createFiltersCommand } from "./commands/filters.js";
import { createTrashCommand } from "./commands/trash.js";
import { setNoColorFlag } from "./utils/tty.js";
import { setDebugEnabled, setVerboseEnabled } from "./utils/debug.js";
import { outputError } from "./utils/output-streams.js";
import { setTimeoutSeconds, validateTimeout, DEFAULT_TIMEOUT_SECONDS } from "./utils/timeout.js";

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
  .option(
    "--timeout <seconds>",
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
