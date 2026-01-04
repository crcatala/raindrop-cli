import { Command } from "commander";
import { getClient } from "../client.js";
import { output, type ColumnConfig } from "../output/index.js";
import { parseCollectionId } from "../utils/collections.js";
import { handleError } from "../utils/errors.js";
import { verbose, verboseTime, debug } from "../utils/debug.js";
import type { GlobalOptions } from "../types/index.js";

/**
 * Extended highlight type that includes the color field.
 * The raindrop-client types are missing this field, but the API returns it.
 */
interface HighlightWithColor {
  _id: string;
  text: string;
  note: string;
  color?: string;
  created: string;
  raindropRef: number;
  link: string;
  title: string;
  tags: string[];
}

/**
 * Column configuration for highlight list output.
 * Shows bookmark context alongside the highlight.
 */
const HIGHLIGHT_LIST_COLUMNS: ColumnConfig[] = [
  { key: "_id", header: "ID", width: 24 },
  { key: "title", header: "Bookmark", width: 30 },
  { key: "text", header: "Highlight", width: 50, prominent: true },
  { key: "color", header: "Color", width: 8 },
  { key: "note", header: "Note", width: 25 },
  { key: "created", header: "Created", width: 12 },
];

/**
 * Column configuration for single bookmark's highlights.
 * Omits bookmark context since it's implied.
 */
const HIGHLIGHT_DETAIL_COLUMNS: ColumnConfig[] = [
  { key: "_id", header: "ID", width: 24 },
  { key: "text", header: "Highlight", width: 60, prominent: true },
  { key: "note", header: "Note", width: 30 },
  { key: "created", header: "Created", width: 12 },
];

export function createHighlightsCommand(): Command {
  const highlights = new Command("highlights")
    .description("View highlights and annotations")
    .action(function (this: Command) {
      this.help();
    });

  // list command
  highlights
    .command("list")
    .description("List highlights across bookmarks")
    .option("-c, --collection <id>", "Collection ID or name (all, unsorted, trash)")
    .option("-l, --limit <number>", "Maximum number of highlights to return (1-50)", "25")
    .option("-p, --page <number>", "Page number (0-indexed)", "0")
    .action(async function (
      this: Command,
      options: { collection?: string; limit: string; page: string }
    ) {
      try {
        const globalOpts = this.optsWithGlobals() as GlobalOptions;

        // Parse and validate pagination options
        const limit = parseInt(options.limit, 10);
        const page = parseInt(options.page, 10);

        if (isNaN(limit) || limit < 1 || limit > 50) {
          throw new Error("Limit must be between 1 and 50");
        }
        if (isNaN(page) || page < 0) {
          throw new Error("Page must be a non-negative number");
        }

        const client = getClient();
        let items: HighlightWithColor[];

        if (options.collection !== undefined) {
          // Filter by collection
          const collectionId = parseCollectionId(options.collection);
          debug("List highlights options", { collectionId, limit, page });
          verbose(`Fetching highlights from collection ${collectionId}`);

          const response = await verboseTime("Fetching highlights", () =>
            client.highlight.getHighlightsInCollection(collectionId, page, limit)
          );
          // Cast to include color field which exists in API but not in types
          items = response.data.items as unknown as HighlightWithColor[];
        } else {
          // All highlights
          debug("List highlights options", { limit, page });
          verbose("Fetching all highlights");

          const response = await verboseTime("Fetching highlights", () =>
            client.highlight.getAllHighlights(page, limit)
          );
          // Cast to include color field which exists in API but not in types
          items = response.data.items as unknown as HighlightWithColor[];
        }

        debug("API response", { highlightCount: items.length });
        verbose(`Found ${items.length} highlights`);

        output(items, HIGHLIGHT_LIST_COLUMNS, {
          format: globalOpts.format,
          quiet: globalOpts.quiet,
          verbose: globalOpts.verbose,
          debug: globalOpts.debug,
        });
      } catch (error) {
        handleError(error);
      }
    });

  // get command - get highlights for a specific bookmark
  highlights
    .command("get")
    .description("Get highlights for a specific bookmark")
    .argument("<bookmark-id>", "Bookmark ID")
    .action(async function (this: Command, bookmarkIdArg: string) {
      try {
        const globalOpts = this.optsWithGlobals() as GlobalOptions;

        // Parse and validate bookmark ID
        const bookmarkId = parseInt(bookmarkIdArg, 10);
        if (isNaN(bookmarkId) || bookmarkId < 1) {
          throw new Error("Invalid bookmark ID: must be a positive number");
        }

        debug("Get highlights options", { bookmarkId });
        verbose(`Fetching highlights for bookmark ${bookmarkId}`);

        const client = getClient();
        const response = await verboseTime("Fetching bookmark", () =>
          client.highlight.getRaindrop(bookmarkId)
        );

        const { item } = response.data;
        const { highlights: bookmarkHighlights } = item;

        debug("API response", { highlightCount: bookmarkHighlights.length });
        verbose(`Found ${bookmarkHighlights.length} highlights`);

        if (bookmarkHighlights.length === 0) {
          verbose("No highlights found for this bookmark");
        }

        output(bookmarkHighlights, HIGHLIGHT_DETAIL_COLUMNS, {
          format: globalOpts.format,
          quiet: globalOpts.quiet,
          verbose: globalOpts.verbose,
          debug: globalOpts.debug,
        });
      } catch (error) {
        handleError(error);
      }
    });

  return highlights;
}
