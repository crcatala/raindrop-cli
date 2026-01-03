import { Command } from "commander";
import { getClient } from "../client.js";
import { output, type ColumnConfig } from "../output/index.js";
import { handleError } from "../utils/errors.js";
import { verbose, verboseTime, debug } from "../utils/debug.js";
import type { GlobalOptions } from "../types/index.js";

/**
 * Column configuration for bookmark list output.
 */
const BOOKMARK_COLUMNS: ColumnConfig[] = [
  { key: "_id", header: "ID", width: 12 },
  { key: "title", header: "Title", width: 40 },
  { key: "link", header: "URL", width: 50 },
  { key: "tags", header: "Tags", width: 20 },
  { key: "created", header: "Created", width: 12 },
];

/**
 * Valid sort options for bookmarks.
 * Prefix with '-' for descending order.
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
  "sort", // manual sort order
  "-sort",
];

/**
 * Special collection IDs in Raindrop.io
 */
const SPECIAL_COLLECTIONS = {
  all: 0,
  unsorted: -1,
  trash: -99,
} as const;

/**
 * Parse collection ID from string argument.
 * Supports numeric IDs and special names (all, unsorted, trash).
 */
function parseCollectionId(value: string | undefined): number {
  if (value === undefined) {
    return SPECIAL_COLLECTIONS.all;
  }

  // Check for special collection names
  const lowerValue = value.toLowerCase();
  if (lowerValue in SPECIAL_COLLECTIONS) {
    return SPECIAL_COLLECTIONS[lowerValue as keyof typeof SPECIAL_COLLECTIONS];
  }

  // Parse as number
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new Error(
      `Invalid collection ID: "${value}". Use a number or one of: all, unsorted, trash`
    );
  }
  return num;
}

/**
 * Format a raindrop item for output.
 * Transforms API response to a cleaner format for display.
 */
function formatBookmarkItem(item: {
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
  highlights: Array<{ text: string; note: string }>;
  lastUpdate: string;
}) {
  return {
    _id: item._id,
    title: item.title,
    link: item.link,
    tags: item.tags.join(", "),
    created: item.created.split("T")[0], // Just the date part
    excerpt: item.excerpt,
    domain: item.domain,
    type: item.type,
    collectionId: item.collectionId,
    note: item.note,
    highlights: item.highlights,
    lastUpdate: item.lastUpdate,
  };
}

export function createBookmarksCommand(): Command {
  const bookmarks = new Command("bookmarks").description("Manage bookmarks").action(function (
    this: Command
  ) {
    this.help();
  });

  // list command
  bookmarks
    .command("list")
    .description("List bookmarks from a collection")
    .argument("[collection-id]", "Collection ID or name (all, unsorted, trash). Default: all")
    .option("-l, --limit <number>", "Maximum number of bookmarks to return", "25")
    .option("-p, --page <number>", "Page number (0-indexed)", "0")
    .option(
      "-s, --sort <field>",
      "Sort field: created, title, domain, lastUpdate, sort. Prefix with - for descending",
      "-created"
    )
    .option("--search <query>", "Search query to filter bookmarks")
    .action(async function (this: Command, collectionIdArg: string | undefined, options) {
      try {
        // Get global options from parent command
        const globalOpts = this.optsWithGlobals() as GlobalOptions;

        // Parse and validate options
        const collectionId = parseCollectionId(collectionIdArg);
        const limit = parseInt(options.limit, 10);
        const page = parseInt(options.page, 10);
        const sort = options.sort;
        const search = options.search;

        // Validate limit
        if (isNaN(limit) || limit < 1 || limit > 50) {
          throw new Error("Limit must be between 1 and 50");
        }

        // Validate page
        if (isNaN(page) || page < 0) {
          throw new Error("Page must be a non-negative number");
        }

        // Validate sort
        if (!VALID_SORT_OPTIONS.includes(sort)) {
          throw new Error(
            `Invalid sort option: "${sort}". Valid options: ${VALID_SORT_OPTIONS.join(", ")}`
          );
        }

        debug("List bookmarks options", {
          collectionId,
          limit,
          page,
          sort,
          search,
        });

        verbose(`Fetching bookmarks from collection ${collectionId}`);

        const client = getClient();
        const response = await verboseTime("Fetching bookmarks", () =>
          client.raindrop.getRaindrops(collectionId, sort, limit, page, search)
        );

        const { items, count } = response.data;

        debug("API response", {
          itemCount: items.length,
          totalCount: count,
          collectionId: response.data.collectionId,
        });

        verbose(`Found ${count} total bookmarks, showing ${items.length}`);

        // Format items for output
        const formattedItems = items.map(formatBookmarkItem);

        // Output the results
        output(formattedItems, BOOKMARK_COLUMNS, {
          format: globalOpts.format,
          quiet: globalOpts.quiet,
          verbose: globalOpts.verbose,
          debug: globalOpts.debug,
        });
      } catch (error) {
        handleError(error);
      }
    });

  return bookmarks;
}
