import { Command } from "commander";
import { getClient } from "../client.js";
import { handleError, UsageError } from "../utils/errors.js";
import { verbose, debug } from "../utils/debug.js";
import { withProgress } from "../utils/progress.js";
import { outputMessage } from "../utils/output-streams.js";
import type { GlobalOptions } from "../types/index.js";

export function createTrashCommand(): Command {
  const trash = new Command("trash")
    .description("Manage trash collection")
    .exitOverride()
    .action(function (this: Command) {
      this.help();
    });

  // empty command
  trash
    .command("empty")
    .description("Permanently delete all items in trash")
    .option("-f, --force", "Skip confirmation prompt")
    .option("-n, --dry-run", "Show what would be deleted without actually deleting")
    .addHelpText(
      "after",
      `
Examples:
  rd trash empty --dry-run                 # Preview what would be deleted
  rd trash empty --force                   # Permanently delete all trash items
  rd trash empty -f -q                     # Silent deletion for scripts`
    )
    .action(async function (this: Command, options: { force?: boolean; dryRun?: boolean }) {
      try {
        const globalOpts = this.optsWithGlobals() as GlobalOptions;

        debug("Empty trash options", { force: options.force, dryRun: options.dryRun });

        // Dry-run mode: show intent without executing
        if (options.dryRun) {
          verbose("Dry-run mode: fetching trash stats");

          const client = getClient();
          const response = await withProgress("Fetching trash stats", () =>
            client.collection.getSystemCollectionStats()
          );

          const trashStats = response.data.items.find(
            (item: { _id: number; count: number }) => item._id === -99
          );
          const trashCount = trashStats?.count ?? 0;

          debug("Trash stats", { trashCount });

          if (globalOpts.format === "json") {
            console.log(
              JSON.stringify({
                dryRun: true,
                message: `Would permanently delete ${trashCount} item(s) from trash`,
                count: trashCount,
              })
            );
          } else if (globalOpts.quiet) {
            // Output just the count for scripting
            console.log(trashCount);
          } else {
            outputMessage(`Dry-run: Would permanently delete ${trashCount} item(s) from trash`);
          }
          return;
        }

        // Require --force for destructive operation
        if (!options.force) {
          throw new UsageError(
            "This will permanently delete all items in trash. " +
              "This action cannot be undone. Re-run with --force to confirm."
          );
        }

        verbose("Emptying trash");

        const client = getClient();
        const response = await withProgress("Emptying trash", () => client.collection.emptyTrash());

        debug("API response", { result: response.data.result });

        if (response.data.result) {
          if (globalOpts.format === "json") {
            console.log(JSON.stringify({ result: true, message: "Trash emptied" }));
          } else if (!globalOpts.quiet) {
            outputMessage("Trash emptied successfully.");
          }
        } else {
          throw new Error("Failed to empty trash");
        }
      } catch (error) {
        handleError(error);
      }
    });

  return trash;
}
