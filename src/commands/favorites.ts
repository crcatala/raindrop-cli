import { Command } from "commander";
import { getClient } from "../client.js";
import { output, type ColumnConfig } from "../output/index.js";
import { parseCollectionId } from "../utils/collections.js";
import { addOutputOptions } from "../utils/command-options.js";
import { handleError, UsageError } from "../utils/errors.js";
import { verbose, debug } from "../utils/debug.js";
import { withProgress } from "../utils/progress.js";
import type { GlobalOptions } from "../types/index.js";

/**
 * Column configuration for favorites list output.
 */
const FAVORITES_COLUMNS: ColumnConfig[] = [
  { key: "title", header: "Title", width: 40, prominent: true },
  { key: "link", header: "URL", width: 50, prominent: true },
  { key: "excerpt", header: "Excerpt" },
  { key: "note", header: "Note" },
  { key: "tags", header: "Tags", width: 20 },
  { key: "created", header: "Created", width: 12 },
  { key: "_id", header: "ID", width: 12 },
];

/**
 * Valid sort options for bookmarks.
 */
const VALID_SORT_OPTIONS = [
  "created",
  "-created",
  "title",
  "-title",
  "domain",
  "-domain",
  "lastUpdate",
  "-lastUpdate",
  "sort",
  "-sort",
];

/**
 * Format a bookmark item for output.
 */
function formatFavoriteItem(item: {
  _id: number;
  title: string;
  link: string;
  tags: string[];
  created: string;
  excerpt: string;
  domain: string;
  type: string;
  collectionId: number;
  note: string;
}) {
  return {
    _id: item._id,
    title: item.title,
    link: item.link,
    tags: item.tags.join(", "),
    created: item.created.split("T")[0],
    excerpt: item.excerpt,
    domain: item.domain,
    type: item.type,
    collectionId: item.collectionId,
    note: item.note,
  };
}

export function createFavoritesCommand(): Command {
  const favorites = new Command("favorites")
    .description("Manage favorite bookmarks")
    .exitOverride()
    .addHelpText(
      "after",
      `
To add or remove favorites, use the bookmarks command:
  rd bookmarks add <url> --favorite          # Add new bookmark as favorite
  rd bookmarks update <id> --favorite        # Mark existing bookmark as favorite
  rd bookmarks update <id> --favorite false  # Remove favorite status
  rd bookmarks batch-update --favorite ...   # Mark multiple as favorites`
    )
    .action(function (this: Command) {
      this.help();
    });

  // list command
  addOutputOptions(
    favorites
      .command("list")
      .alias("ls")
      .description("List favorite bookmarks (alias: ls)")
      .argument("[collection]", "Collection ID or name (all, unsorted). Default: all")
      .option("-l, --limit <number>", "Maximum number of favorites to return", "25")
      .option("-p, --page <number>", "Page number (0-indexed)", "0")
      .option(
        "--sort <field>",
        "Sort field: created, title, domain, lastUpdate, sort. Prefix with - for descending",
        "-created"
      )
      .option("-s, --search <query>", "Additional search query to filter favorites")
  )
    .addHelpText(
      "after",
      `
Examples:
  rd favorites list                        # List all favorites
  rd favorites ls                          # Same, using alias
  rd favorites list 12345                  # Favorites in collection
  rd favorites list --limit 50             # Limit results
  rd favorites list -s "#javascript"       # Filter favorites by tag
  rd favorites list --format json          # Output as JSON

To add or remove favorites:
  rd bookmarks add <url> --favorite        # Add new bookmark as favorite
  rd bookmarks update <id> --favorite      # Mark as favorite
  rd bookmarks update <id> --favorite false  # Remove favorite status`
    )
    .action(async function (this: Command, collectionArg: string | undefined, options) {
      try {
        const globalOpts = this.optsWithGlobals() as GlobalOptions;

        // Parse and validate options
        const collectionId = parseCollectionId(collectionArg);
        const limit = parseInt(options.limit, 10);
        const page = parseInt(options.page, 10);
        const sort = options.sort;

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

        // Build search query: always include ❤️ for favorites, optionally add user search
        const search = options.search ? `❤️ ${options.search}` : "❤️";

        debug("List favorites options", {
          collectionId,
          limit,
          page,
          sort,
          search,
        });

        verbose(`Fetching favorites from collection ${collectionId}`);

        const client = getClient();
        const response = await withProgress("Fetching favorites", () =>
          client.raindrop.getRaindrops(collectionId, sort, limit, page, search)
        );

        const { items, count } = response.data;

        debug("API response", {
          itemCount: items.length,
          totalCount: count,
        });

        verbose(`Found ${count} total favorites, showing ${items.length}`);

        // Format items for output
        const formattedItems = items.map(formatFavoriteItem);

        // Output the results
        output(formattedItems, FAVORITES_COLUMNS, {
          format: globalOpts.format,
          quiet: globalOpts.quiet,
          verbose: globalOpts.verbose,
          debug: globalOpts.debug,
        });
      } catch (error) {
        handleError(error);
      }
    });

  return favorites;
}
