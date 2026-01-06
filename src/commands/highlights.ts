import { Command } from "commander";
import { getClient } from "../client.js";
import { output, type ColumnConfig } from "../output/index.js";
import { parseCollectionId } from "../utils/collections.js";
import { addOutputOptions } from "../utils/command-options.js";
import { handleError } from "../utils/errors.js";
import { parseLimit, parsePage, parseBookmarkId } from "../utils/validation.js";
import { verbose, debug } from "../utils/debug.js";
import { withProgress } from "../utils/progress.js";
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
    .exitOverride()
    .action(function (this: Command) {
      this.help();
    });

  // list command
  addOutputOptions(
    highlights
      .command("list")
      .alias("ls")
      .description("List highlights across bookmarks (alias: ls)")
      .option("-c, --collection <id>", "Collection ID or name (all, unsorted, trash)")
      .option("-l, --limit <number>", "Maximum number of highlights to return (1-50)", "25")
      .option("-p, --page <number>", "Page number (0-indexed)", "0")
  )
    .addHelpText(
      "after",
      `
Examples:
  rdcli highlights list                       # List all highlights
  rdcli highlights list -c 12345              # List highlights in collection
  rdcli highlights list --limit 50            # Limit results
  rdcli highlights list -f json               # Output as JSON`
    )
    .action(async function (
      this: Command,
      options: { collection?: string; limit: string; page: string }
    ) {
      try {
        const globalOpts = this.optsWithGlobals() as GlobalOptions;

        // Parse and validate pagination options
        const limit = parseLimit(options.limit);
        const page = parsePage(options.page);

        const client = getClient();
        let items: HighlightWithColor[];

        if (options.collection !== undefined) {
          // Filter by collection
          const collectionId = parseCollectionId(options.collection);
          debug("List highlights options", { collectionId, limit, page });
          verbose(`Fetching highlights from collection ${collectionId}`);

          const response = await withProgress("Fetching highlights", () =>
            client.highlight.getHighlightsInCollection(collectionId, page, limit)
          );
          // Cast to include color field which exists in API but not in types
          items = response.data.items as unknown as HighlightWithColor[];
        } else {
          // All highlights
          debug("List highlights options", { limit, page });
          verbose("Fetching all highlights");

          const response = await withProgress("Fetching highlights", () =>
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

  // show command - show highlights for a specific bookmark
  addOutputOptions(
    highlights
      .command("show")
      .description("Show highlights for a specific bookmark")
      .argument("<bookmark-id>", "Bookmark ID")
  )
    .addHelpText(
      "after",
      `
Examples:
  rdcli highlights show 12345                 # Show highlights for bookmark
  rdcli highlights show 12345 -f json         # Output as JSON`
    )
    .action(async function (this: Command, bookmarkIdArg: string) {
      try {
        const globalOpts = this.optsWithGlobals() as GlobalOptions;

        // Parse and validate bookmark ID
        const bookmarkId = parseBookmarkId(bookmarkIdArg);

        debug("Get highlights options", { bookmarkId });
        verbose(`Fetching highlights for bookmark ${bookmarkId}`);

        const client = getClient();
        const response = await withProgress("Fetching bookmark", () =>
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
