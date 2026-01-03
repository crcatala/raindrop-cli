import { program, CommanderError } from "commander";
import { createAuthCommand } from "./commands/auth.js";
import { createRaindropsCommand } from "./commands/raindrops.js";
import { outputError } from "./utils/output-streams.js";
import { setNoColorFlag } from "./utils/tty.js";
import { setDebugEnabled, setVerboseEnabled } from "./utils/debug.js";

program
  .name("rdcli")
  .description("CLI for Raindrop.io - AI agent friendly bookmark management")
  .version("0.1.0")
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
program.addCommand(createRaindropsCommand());

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
    // Usage errors should exit with code 2 (per clig.dev conventions)
    const usageErrors = [
      "commander.unknownCommand",
      "commander.unknownOption",
      "commander.missingArgument",
      "commander.invalidArgument",
      "commander.missingMandatoryOptionValue",
      "commander.optionMissingArgument",
      "commander.excessArguments",
      "commander.conflictingOption",
    ];
    if (usageErrors.includes(err.code)) {
      outputError(err.message);
      process.exit(2);
    }
  }
  throw err;
}
