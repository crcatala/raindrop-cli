import { Command, Option } from "commander";
import { OUTPUT_FORMATS } from "../types/index.js";

/**
 * Add global output options to a subcommand.
 *
 * Commander.js doesn't automatically make program-level options available
 * when placed after subcommand names. This helper adds the common output
 * options to subcommands so users can write:
 *   rdcli bookmarks list -q
 * instead of:
 *   rdcli -q bookmarks list
 *
 * The options are still accessed via `this.optsWithGlobals()` in actions.
 */
export function addOutputOptions(cmd: Command): Command {
  return cmd
    .addOption(new Option("--format <format>", "output format").choices(OUTPUT_FORMATS))
    .option("--json", "shorthand for --format json")
    .option("-q, --quiet", "minimal output (just IDs)")
    .option("-v, --verbose", "show operational details")
    .option("-d, --debug", "show debug info")
    .option("--no-color", "disable colored output");
}
