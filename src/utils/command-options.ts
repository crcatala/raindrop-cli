import { Command } from "commander";

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
    .option("--format <format>", "output format (json, table, tsv)")
    .option("-q, --quiet", "minimal output (just IDs)")
    .option("-v, --verbose", "show operational details")
    .option("-d, --debug", "show debug info");
}
