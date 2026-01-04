import { Command } from "commander";
import { getClient } from "../client.js";
import { output, type ColumnConfig } from "../output/index.js";
import { parseCollectionId } from "../utils/collections.js";
import { handleError } from "../utils/errors.js";
import { verbose, verboseTime, debug } from "../utils/debug.js";
import type { GlobalOptions } from "../types/index.js";

/**
 * Column configuration for bookmark list output.
 */
const BOOKMARK_COLUMNS: ColumnConfig[] = [
  // Prominent fields (no labels, displayed first)
  { key: "title", header: "Title", width: 40, prominent: true },
  { key: "link", header: "URL", width: 50, prominent: true },
  // Regular fields in order of importance
  { key: "excerpt", header: "Excerpt" },
  { key: "note", header: "Note" },
  { key: "tags", header: "Tags", width: 20 },
  { key: "created", header: "Created", width: 12 },
  { key: "_id", header: "ID", width: 12 },
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
 * Valid bookmark types for the --type filter.
 */
const VALID_TYPES = ["article", "video", "link", "image", "document", "audio"] as const;

/**
 * Options for building a search query from convenience flags.
 */
interface FilterOptions {
  type?: string;
  tag?: string;
  domain?: string;
  favorites?: boolean;
  withNotes?: boolean;
  withHighlights?: boolean;
  withoutTags?: boolean;
  hasReminder?: boolean;
  broken?: boolean;
  created?: string;
  search?: string;
}

/**
 * Build search query string from convenience flags.
 * Combines flags with optional raw search query using AND logic.
 */
function buildSearchQuery(options: FilterOptions): string | undefined {
  const parts: string[] = [];

  if (options.type) parts.push(`type:${options.type}`);
  if (options.tag) parts.push(`#${options.tag}`);
  if (options.domain) parts.push(`domain:${options.domain}`);
  if (options.favorites) parts.push(`❤️`);
  if (options.withNotes) parts.push(`note:true`);
  if (options.withHighlights) parts.push(`highlights:true`);
  if (options.withoutTags) parts.push(`notag:true`);
  if (options.hasReminder) parts.push(`reminder:true`);
  if (options.broken) parts.push(`broken:true`);
  if (options.created) parts.push(`created:${options.created}`);

  // Append raw search query if provided
  if (options.search) parts.push(options.search);

  return parts.length > 0 ? parts.join(" ") : undefined;
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

import { confirmAction } from "../utils/prompt.js";

export function createBookmarksCommand(): Command {
  const bookmarks = new Command("bookmarks").description("Manage bookmarks").action(function (
    this: Command
  ) {
    this.help();
  });

  // delete command
  bookmarks
    .command("delete")
    .description("Delete a bookmark")
    .argument("<id>", "Bookmark ID")
    .option("-p, --permanent", "Skip trash and delete permanently")
    .option("-f, --force", "Skip confirmation prompt")
    .action(async function (this: Command, idArg: string, options) {
      try {
        const globalOpts = this.optsWithGlobals() as GlobalOptions;
        const id = parseInt(idArg, 10);

        if (isNaN(id)) {
          throw new Error("Invalid bookmark ID");
        }

        const permanent = !!options.permanent;
        const force = !!options.force;

        if (!force) {
          const message = permanent
            ? `Are you sure you want to PERMANENTLY delete bookmark ${id}? This cannot be undone.`
            : `Are you sure you want to move bookmark ${id} to trash?`;

          const confirmed = await confirmAction(message);
          if (!confirmed) {
            if (!globalOpts.quiet) {
              console.log("Operation cancelled.");
            }
            return;
          }
        }

        const client = getClient();

        verbose(`Deleting bookmark ${id} (permanent: ${permanent})`);

        // First deletion (moves to trash, or deletes if already in trash)
        await verboseTime("Deleting bookmark", async () => {
          try {
            await client.raindrop.removeRaindrop(id);
          } catch (error: any) {
            // If manual permanent delete loop, we might handle 404 specially,
            // but here checking if it exists is implicitly handled by the first call failing if not found.
            throw error;
          }
        });

        // If permanent deletion requested, try to delete again (from trash)
        if (permanent) {
          verbose(`Ensuring permanent deletion for ${id}`);
          try {
            await client.raindrop.removeRaindrop(id);
          } catch (error: any) {
            // If it was already in trash, the first delete killed it.
            // So the second delete returns 404. We strictly consider 404 here 'success' (it's gone).
            if (error?.response?.status !== 404) {
              throw error;
            }
          }
        }

        if (globalOpts.format === "json") {
          // We mimic a simple success response
          console.log(JSON.stringify({ result: true, id, permanent }, null, 2));
        } else if (!globalOpts.quiet) {
          console.log(
            permanent ? `Bookmark ${id} permanently deleted.` : `Bookmark ${id} moved to trash.`
          );
        }
      } catch (error) {
        handleError(error);
      }
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
    .option(
      "--search <query>",
      `Search query (raw Raindrop syntax). Examples:
                    "type:article"       Filter by type
                    "#javascript"        Filter by tag
                    "domain:github.com"  Filter by domain
                    Full syntax: https://help.raindrop.io/using-search`
    )
    // Convenience filter flags
    .option("--type <type>", "Filter by type: article, video, link, image, document, audio")
    .option("--tag <tag>", "Filter by tag")
    .option("--domain <domain>", "Filter by domain (e.g., github.com)")
    .option("--favorites", "Show only favorites")
    .option("--with-notes", "Show only bookmarks with notes")
    .option("--with-highlights", "Show only bookmarks with highlights")
    .option("--without-tags", "Show only bookmarks without tags")
    .option("--has-reminder", "Show only bookmarks with reminders")
    .option("--broken", "Show only bookmarks with broken links")
    .option("--created <date>", "Filter by creation date (YYYY-MM or YYYY-MM-DD)")
    .action(async function (this: Command, collectionIdArg: string | undefined, options) {
      try {
        // Get global options from parent command
        const globalOpts = this.optsWithGlobals() as GlobalOptions;

        // Parse and validate options
        const collectionId = parseCollectionId(collectionIdArg);
        const limit = parseInt(options.limit, 10);
        const page = parseInt(options.page, 10);
        const sort = options.sort;

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

        // Validate type if provided
        if (options.type && !VALID_TYPES.includes(options.type)) {
          throw new Error(
            `Invalid type: "${options.type}". Valid types: ${VALID_TYPES.join(", ")}`
          );
        }

        // Validate created date format if provided
        if (options.created && !/^\d{4}-\d{2}(-\d{2})?$/.test(options.created)) {
          throw new Error(
            `Invalid date format: "${options.created}". Use YYYY-MM or YYYY-MM-DD format`
          );
        }

        // Build combined search query from convenience flags and raw search
        const filterOptions: FilterOptions = {
          type: options.type,
          tag: options.tag,
          domain: options.domain,
          favorites: options.favorites,
          withNotes: options.withNotes,
          withHighlights: options.withHighlights,
          withoutTags: options.withoutTags,
          hasReminder: options.hasReminder,
          broken: options.broken,
          created: options.created,
          search: options.search,
        };
        const search = buildSearchQuery(filterOptions);

        debug("List bookmarks options", {
          collectionId,
          limit,
          page,
          sort,
          filterOptions,
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
