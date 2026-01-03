import { program, CommanderError } from "commander";
import { createAuthCommand } from "./commands/auth.js";
import { outputError } from "./utils/output-streams.js";

program
  .name("rdcli")
  .description("CLI for Raindrop.io - AI agent friendly bookmark management")
  .version("0.1.0")
  .option("-f, --format <format>", "output format (json, table, tsv); defaults to table for terminal, json when piped")
  .option("-q, --quiet", "minimal output (just IDs)")
  .option("-v, --verbose", "verbose output with debug info")
  .exitOverride();

// Register commands
program.addCommand(createAuthCommand());

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
    // Unknown command should error
    if (err.code === "commander.unknownCommand") {
      outputError(err.message);
      process.exit(1);
    }
  }
  throw err;
}
