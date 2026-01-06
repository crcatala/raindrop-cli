import { Command } from "commander";
import { getClient } from "../client.js";
import { output, type ColumnConfig } from "../output/index.js";
import { SPECIAL_COLLECTIONS } from "../utils/collections.js";
import { addOutputOptions } from "../utils/command-options.js";
import { handleError, UsageError } from "../utils/errors.js";
import { verbose, debug } from "../utils/debug.js";
import { withProgress } from "../utils/progress.js";
import { outputMessage } from "../utils/output-streams.js";
import type { GlobalOptions } from "../types/index.js";

/**
 * Column configuration for trash list output.
 * Similar to bookmarks list but focused on what's relevant for trash review.
 */
const TRASH_COLUMNS: ColumnConfig[] = [
  { key: "title", header: "Title", width: 40, prominent: true },
  { key: "link", header: "URL", width: 50, prominent: true },
  { key: "domain", header: "Domain", width: 20 },
  { key: "created", header: "Created", width: 12 },
  { key: "_id", header: "ID", width: 12 },
];

/**
 * Valid sort options for trash list.
 */
const VALID_SORT_OPTIONS = [
  "created",
  "-created",
  "title",
  "-title",
  "domain",
  "-domain",
  "sort",
  "-sort",
];

/**
 * Format a trash item for output.
 */
function formatTrashItem(item: {
  _id: number;
  title: string;
  link: string;
  domain: string;
  created: string;
}) {
  return {
    _id: item._id,
    title: item.title,
    link: item.link,
    domain: item.domain,
    created: item.created.split("T")[0],
  };
}

export function createTrashCommand(): Command {
  const trash = new Command("trash")
    .description("Manage trash collection")
    .exitOverride()
    .action(function (this: Command) {
      this.help();
    });

  // empty command
  addOutputOptions(
    trash
      .command("empty")
      .description("Permanently delete all items in trash")
      .option("-f, --force", "Skip confirmation prompt")
      .option("-n, --dry-run", "Show what would be deleted without actually deleting")
  )
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

  // list command
  addOutputOptions(
    trash
      .command("list")
      .alias("ls")
      .description("List items in trash (alias: ls)")
      .option("-l, --limit <number>", "Maximum number of items to return", "25")
      .option("-p, --page <number>", "Page number (0-indexed)", "0")
      .option(
        "--sort <field>",
        "Sort field: created, title, domain, sort. Prefix with - for descending",
        "-created"
      )
      .option("-s, --search <query>", "Search query to filter trash items")
  )
    .addHelpText(
      "after",
      `
Examples:
  rd trash list                            # List items in trash
  rd trash ls                              # Alias for list
  rd trash list --limit 50                 # Show more items
  rd trash list --sort title               # Sort by title
  rd trash list -s "keyword"               # Search within trash
  rd trash list --format json              # Output as JSON
  rd trash list -q                         # Output just IDs (for piping)`
    )
    .action(async function (this: Command, options) {
      try {
        const globalOpts = this.optsWithGlobals() as GlobalOptions;

        // Parse and validate options
        const limit = parseInt(options.limit, 10);
        const page = parseInt(options.page, 10);
        const sort = options.sort;
        const search = options.search;

        // Validate limit
        if (isNaN(limit) || limit < 1 || limit > 50) {
          throw new UsageError(`Invalid limit: "${options.limit}". Use a number between 1 and 50.`);
        }

        // Validate page
        if (isNaN(page) || page < 0) {
          throw new UsageError(`Invalid page: "${options.page}". Use a non-negative number.`);
        }

        // Validate sort
        if (!VALID_SORT_OPTIONS.includes(sort)) {
          throw new UsageError(
            `Invalid sort option: "${sort}". Use one of: ${VALID_SORT_OPTIONS.join(", ")}.`
          );
        }

        debug("List trash options", { limit, page, sort, search });

        verbose("Fetching items from trash");

        const client = getClient();
        const response = await withProgress("Fetching trash items", () =>
          client.raindrop.getRaindrops(SPECIAL_COLLECTIONS.trash, sort, limit, page, search)
        );

        const { items, count } = response.data;

        debug("API response", {
          itemCount: items.length,
          totalCount: count,
        });

        verbose(`Found ${count} total items in trash, showing ${items.length}`);

        // Format items for output
        const formattedItems = items.map(formatTrashItem);

        // Output the results
        output(formattedItems, TRASH_COLUMNS, {
          format: globalOpts.format,
          quiet: globalOpts.quiet,
          verbose: globalOpts.verbose,
          debug: globalOpts.debug,
        });
      } catch (error) {
        handleError(error);
      }
    });

  return trash;
}
