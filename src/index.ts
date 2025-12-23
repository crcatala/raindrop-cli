import { program } from "commander";

program
  .name("rdcli")
  .description("CLI for Raindrop.io - AI agent friendly bookmark management")
  .version("0.1.0")
  .option("-f, --format <format>", "output format (json, table, tsv)", "json")
  .option("-q, --quiet", "minimal output (just IDs)")
  .option("-v, --verbose", "verbose output with debug info");

// Commands will be registered here as they are implemented
// import { registerRaindropCommands } from "./commands/raindrops/index.js";
// registerRaindropCommands(program);

program.parse();
