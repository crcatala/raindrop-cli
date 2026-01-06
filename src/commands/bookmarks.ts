import { Command } from "commander";
import { getClient } from "../client.js";
import { output, type ColumnConfig } from "../output/index.js";
import { parseCollectionId } from "../utils/collections.js";
import { addOutputOptions } from "../utils/command-options.js";
import { handleError, UsageError } from "../utils/errors.js";
import { verbose, debug } from "../utils/debug.js";
import { withProgress } from "../utils/progress.js";
import { confirmAction } from "../utils/prompt.js";
import { hasStdinData, readIdsFromStdin, parseIds } from "../utils/stdin.js";
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
  { key: "favorite", header: "❤️ Fav", width: 8 },
  { key: "created", header: "Created", width: 12 },
  { key: "_id", header: "ID", width: 12 },
];

/**
 * Column configuration for single bookmark detail view.
 * Shows more metadata than the list view.
 */
const BOOKMARK_DETAIL_COLUMNS: ColumnConfig[] = [
  // Prominent fields (no labels, displayed first)
  { key: "title", header: "Title", width: 40, prominent: true },
  { key: "link", header: "URL", width: 50, prominent: true },
  // Regular fields - comprehensive view
  { key: "excerpt", header: "Excerpt" },
  { key: "note", header: "Note" },
  { key: "tags", header: "Tags", width: 30 },
  { key: "favorite", header: "❤️ Fav", width: 8 },
  { key: "type", header: "Type", width: 12 },
  { key: "domain", header: "Domain", width: 30 },
  { key: "collectionId", header: "Collection", width: 12 },
  { key: "created", header: "Created", width: 12 },
  { key: "lastUpdate", header: "Updated", width: 12 },
  { key: "_id", header: "ID", width: 12 },
  { key: "highlightsFormatted", header: "Highlights" },
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
 * Parse a comma-separated tag string into an array of trimmed, non-empty tags.
 * Returns undefined if the input is undefined or results in no valid tags.
 */
function parseTags(tagsString: string | undefined): string[] | undefined {
  if (tagsString === undefined) return undefined;
  const tags = tagsString
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  return tags.length > 0 ? tags : undefined;
}

/**
 * Parse an optional boolean argument for flags like --favorite [bool].
 * Returns true if no value provided, parses "true"/"false" strings otherwise.
 */
function parseOptionalBoolean(value: string | boolean | undefined): boolean {
  if (value === undefined || value === true || value === "") {
    return true;
  }
  if (value === false) {
    return false;
  }
  const lower = String(value).toLowerCase();
  if (lower === "true" || lower === "1" || lower === "yes") {
    return true;
  }
  if (lower === "false" || lower === "0" || lower === "no") {
    return false;
  }
  throw new UsageError(`Invalid boolean value: "${value}". Use true/false, yes/no, or 1/0.`);
}

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
  if (options.favorites) parts.push(`❤️️`);
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
 * Highlight type from API response.
 */
interface Highlight {
  _id?: string;
  text: string;
  note?: string;
  color?: string;
  created?: string;
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
  important?: boolean;
}) {
  return {
    _id: item._id,
    title: item.title,
    link: item.link,
    tags: item.tags.join(", "),
    favorite: item.important ? "true" : "false",
    created: item.created.split("T")[0], // Just the date part
    excerpt: item.excerpt,
    domain: item.domain,
    type: item.type,
    collectionId: item.collectionId,
    note: item.note,
    highlights: item.highlights,
    lastUpdate: item.lastUpdate,
    important: item.important ?? false,
  };
}

/**
 * Format highlights for plain text display.
 * Each highlight is shown with its text and optional note.
 */
function formatHighlightsForDisplay(highlights: Highlight[]): string {
  if (highlights.length === 0) {
    return "";
  }

  return highlights
    .map((h, i) => {
      const parts = [`[${i + 1}] "${h.text}"`];
      if (h.note) {
        parts.push(`    Note: ${h.note}`);
      }
      return parts.join("\n");
    })
    .join("\n\n");
}

/**
 * Format a single bookmark for detail view output.
 * Includes all metadata and formatted highlights.
 */
function formatBookmarkDetail(item: {
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
  highlights: Highlight[];
  lastUpdate: string;
  important?: boolean;
}) {
  return {
    _id: item._id,
    title: item.title,
    link: item.link,
    tags: item.tags.join(", "),
    favorite: item.important ? "true" : "false",
    created: item.created.split("T")[0],
    lastUpdate: item.lastUpdate.split("T")[0],
    excerpt: item.excerpt,
    domain: item.domain,
    type: item.type,
    collectionId: item.collectionId,
    note: item.note,
    highlights: item.highlights,
    highlightsFormatted: formatHighlightsForDisplay(item.highlights),
    important: item.important ?? false,
  };
}

export function createBookmarksCommand(): Command {
  const bookmarks = new Command("bookmarks")
    .description("Manage bookmarks")
    .exitOverride()
    .action(function (this: Command) {
      this.help();
    });

  // delete command
  addOutputOptions(
    bookmarks
      .command("delete")
      .alias("rm")
      .description("Delete a bookmark (alias: rm)")
      .argument("<id>", "Bookmark ID")
      .option("-P, --permanent", "Skip trash and delete permanently (uppercase: dangerous)")
      .option("-f, --force", "Skip confirmation prompt")
      .option("-n, --dry-run", "Show what would be deleted without actually deleting")
  )
    .addHelpText(
      "after",
      `
Examples:
  rd bookmarks delete 12345                # Move bookmark to trash
  rd bookmarks delete 12345 -P             # Delete permanently (skip trash)
  rd bookmarks delete 12345 --force        # Skip confirmation prompt
  rd bookmarks delete 12345 --dry-run      # Preview what would be deleted`
    )
    .action(async function (this: Command, idArg: string, options) {
      try {
        const globalOpts = this.optsWithGlobals() as GlobalOptions;
        const id = parseInt(idArg, 10);

        if (isNaN(id) || id <= 0) {
          throw new UsageError(`Invalid bookmark ID: "${idArg}". Use a positive number.`);
        }

        const permanent = !!options.permanent;
        const force = !!options.force;
        const dryRun = !!options.dryRun;

        const client = getClient();

        // For dry-run, fetch bookmark info to show what would be deleted
        if (dryRun) {
          verbose(`Dry run: fetching bookmark ${id} to show what would be deleted`);
          const response = await withProgress("Fetching bookmark", () =>
            client.raindrop.getRaindrop(id)
          );
          const item = response.data.item;

          if (globalOpts.format === "json") {
            console.log(
              JSON.stringify(
                {
                  dryRun: true,
                  wouldDelete: {
                    id: item._id,
                    title: item.title,
                    link: item.link,
                    permanent,
                  },
                },
                null,
                2
              )
            );
          } else if (!globalOpts.quiet) {
            const action = permanent ? "permanently delete" : "move to trash";
            console.log(`Would ${action}:`);
            console.log(`  - ${item._id}: '${item.title}'`);
            console.log(`\nRun without --dry-run to execute.`);
          }
          return;
        }

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

        verbose(`Deleting bookmark ${id} (permanent: ${permanent})`);

        // First deletion (moves to trash, or deletes if already in trash)
        await withProgress("Deleting bookmark", async () => {
          await client.raindrop.removeRaindrop(id);
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
  addOutputOptions(
    bookmarks
      .command("list")
      .alias("ls")
      .description("List bookmarks from a collection (alias: ls)")
      .argument("[collection-id]", "Collection ID or name (all, unsorted, trash). Default: all")
      .option("-l, --limit <number>", "Maximum number of bookmarks to return", "25")
      .option("-p, --page <number>", "Page number (0-indexed)", "0")
      .option(
        "--sort <field>",
        "Sort field: created, title, domain, lastUpdate, sort. Prefix with - for descending",
        "-created"
      )
      .option(
        "-s, --search <query>",
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
  )
    .addHelpText(
      "after",
      `
Examples:
  rd bookmarks list                        # List all bookmarks
  rd bookmarks list 12345                  # List bookmarks in collection
  rd bookmarks list unsorted               # List unsorted bookmarks
  rd bookmarks list --limit 50             # Limit results
  rd bookmarks list --tag javascript       # Filter by tag
  rd bookmarks list --type article         # Filter by type
  rd bookmarks list --domain github.com    # Filter by domain
  rd bookmarks list --favorites            # Show only favorites
  rd bookmarks list -s "#cli"              # Raw search query
  rd bookmarks list -s "type:article #dev"    # Multiple filters
  rd bookmarks list --format json | jq '.[].title'  # Pipe JSON to jq`
    )
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

        // Validate type if provided
        if (options.type && !VALID_TYPES.includes(options.type)) {
          throw new UsageError(
            `Invalid type: "${options.type}". Use one of: ${VALID_TYPES.join(", ")}.`
          );
        }

        // Validate created date format if provided
        if (options.created && !/^\d{4}-\d{2}(-\d{2})?$/.test(options.created)) {
          throw new UsageError(
            `Invalid date format: "${options.created}". Use YYYY-MM or YYYY-MM-DD.`
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
        const response = await withProgress("Fetching bookmarks", () =>
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

  // show command - fetch a single bookmark by ID
  addOutputOptions(
    bookmarks
      .command("show")
      .description("Show a single bookmark by ID")
      .argument("<id>", "Bookmark ID")
  )
    .addHelpText(
      "after",
      `
Examples:
  rd bookmarks show 12345                  # Show bookmark details
  rd bookmarks show 12345 --format json    # Output as JSON
  rd bookmarks show 12345 -q               # Output just the ID`
    )
    .action(async function (this: Command, idArg: string) {
      try {
        const globalOpts = this.optsWithGlobals() as GlobalOptions;

        // Parse and validate bookmark ID
        const id = parseInt(idArg, 10);
        if (isNaN(id) || id < 1) {
          throw new UsageError(`Invalid bookmark ID: "${idArg}". Use a positive number.`);
        }

        debug("Get bookmark options", { id });
        verbose(`Fetching bookmark ${id}`);

        const client = getClient();
        const response = await withProgress("Fetching bookmark", () =>
          client.raindrop.getRaindrop(id)
        );

        const { item } = response.data;

        debug("API response", {
          id: item._id,
          title: item.title,
          highlightCount: item.highlights.length,
        });

        verbose(`Found bookmark: ${item.title}`);

        // Format for output
        const formatted = formatBookmarkDetail(item);

        // Output the result
        output(formatted, BOOKMARK_DETAIL_COLUMNS, {
          format: globalOpts.format,
          quiet: globalOpts.quiet,
          verbose: globalOpts.verbose,
          debug: globalOpts.debug,
        });
      } catch (error) {
        handleError(error);
      }
    });

  // add command - create a new bookmark
  addOutputOptions(
    bookmarks
      .command("add")
      .aliases(["new", "create"])
      .description("Add a new bookmark (aliases: new, create)")
      .argument("<url>", "URL to bookmark")
      .option("-t, --title <title>", "Bookmark title (auto-detected if --parse is used)")
      .option("-e, --excerpt <excerpt>", "Short description/excerpt")
      .option("-n, --note <note>", "Personal note")
      .option("--tags <tags>", "Comma-separated tags (e.g., 'tech,reading,important')")
      .option(
        "-c, --collection <id>",
        "Collection ID or name (all, unsorted, trash). Default: unsorted",
        "unsorted"
      )
      .option("-p, --parse", "Auto-parse URL to extract title, excerpt, and metadata")
      .option("-i, --important [bool]", "Mark as important/favorite (default: true)")
      .option("-f, --favorite [bool]", "Mark as favorite (default: true)")
  )
    .addHelpText(
      "after",
      `
Examples:
  rd bookmarks add https://example.com                     # Add bookmark
  rd bookmarks add https://example.com --parse             # Auto-parse title/excerpt
  rd bookmarks add https://example.com -t "My Title"       # Set custom title
  rd bookmarks add https://example.com --tags "dev,read"   # Add with tags
  rd bookmarks add https://example.com -c 12345            # Add to collection
  rd bookmarks add https://example.com -n "Check later"    # Add with note
  rd bookmarks add https://example.com --favorite          # Add as favorite`
    )
    .action(async function (this: Command, url: string, options) {
      try {
        const globalOpts = this.optsWithGlobals() as GlobalOptions;

        // Validate URL format using URL constructor for proper parsing
        try {
          const parsedUrl = new URL(url);
          if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
            throw new UsageError(`Invalid URL: "${url}". Use http:// or https://.`);
          }
        } catch (e) {
          if (e instanceof UsageError) {
            throw e;
          }
          throw new UsageError(`Invalid URL: "${url}". Use http:// or https://.`);
        }

        // Parse collection ID
        const collectionId = parseCollectionId(options.collection);

        // Parse tags from comma-separated string
        const tags = parseTags(options.tags);

        // Handle --important and --favorite (they're aliases, both accept optional bool)
        // Only set if one of the flags was actually provided
        let isImportant: boolean | undefined;
        if (options.important !== undefined) {
          isImportant = parseOptionalBoolean(options.important);
        } else if (options.favorite !== undefined) {
          isImportant = parseOptionalBoolean(options.favorite);
        }

        debug("Add bookmark options", {
          url,
          title: options.title,
          excerpt: options.excerpt,
          note: options.note,
          tags,
          collectionId,
          parse: !!options.parse,
          important: isImportant,
        });

        verbose(`Adding bookmark: ${url}`);

        const client = getClient();

        // Build the request payload
        // Note: We include 'note' even though it may not be in the TypeScript types,
        // as the Raindrop API does support it
        const requestBody: Record<string, unknown> = {
          link: url,
        };

        if (options.title) {
          requestBody.title = options.title;
        }

        if (options.excerpt) {
          requestBody.excerpt = options.excerpt;
        }

        if (options.note) {
          requestBody.note = options.note;
        }

        if (tags && tags.length > 0) {
          requestBody.tags = tags;
        }

        if (collectionId !== 0) {
          // Only set collection if not "all" (0)
          // Use -1 for unsorted which is the default
          requestBody.collection = { $id: collectionId };
        }

        if (options.parse) {
          requestBody.pleaseParse = {};
        }

        if (isImportant !== undefined) {
          requestBody.important = isImportant;
        }

        // Cast through unknown because the API accepts fields (like 'note') that aren't
        // in the generated TypeScript types
        const response = await withProgress("Creating bookmark", () =>
          client.raindrop.createRaindrop(
            requestBody as unknown as Parameters<typeof client.raindrop.createRaindrop>[0]
          )
        );

        const { item } = response.data;

        debug("API response", {
          id: item._id,
          title: item.title,
          result: response.data.result,
        });

        verbose(`Created bookmark ${item._id}: ${item.title}`);

        // Format for output (reuse detail format)
        const formatted = formatBookmarkDetail({
          _id: item._id,
          title: item.title,
          link: item.link,
          tags: item.tags || [],
          created: item.created,
          excerpt: item.excerpt || "",
          domain: item.domain || "",
          type: item.type || "link",
          collectionId: item.collection?.$id ?? -1,
          note: item.note || "",
          highlights: [],
          lastUpdate: item.lastUpdate || item.created,
          important: (item as { important?: boolean }).important,
        });

        // Output the result
        output(formatted, BOOKMARK_DETAIL_COLUMNS, {
          format: globalOpts.format,
          quiet: globalOpts.quiet,
          verbose: globalOpts.verbose,
          debug: globalOpts.debug,
        });
      } catch (error) {
        handleError(error);
      }
    });

  // update command - update an existing bookmark
  addOutputOptions(
    bookmarks
      .command("update")
      .description("Update an existing bookmark")
      .argument("<id>", "Bookmark ID")
      .option("-t, --title <title>", "Update bookmark title")
      .option(
        "-e, --excerpt <excerpt>",
        "Update short description/excerpt (use empty string to clear)"
      )
      .option("-n, --note <note>", "Update personal note (use empty string to clear)")
      .option(
        "--tags <tags>",
        "Replace all tags with comma-separated list (cannot combine with --add-tags/--remove-tags)"
      )
      .option("--add-tags <tags>", "Add comma-separated tags to existing tags")
      .option("--remove-tags <tags>", "Remove comma-separated tags from existing tags")
      .option("-c, --collection <id>", "Move to collection (ID or name: all, unsorted, trash)")
      .option("-i, --important [bool]", "Set important/favorite status (default: true)")
      .option("-f, --favorite [bool]", "Set favorite status (default: true)")
      .option("--dry-run", "Show what would be updated without actually updating")
  )
    .addHelpText(
      "after",
      `
Examples:
  rd bookmarks update 12345 -t "New Title"     # Update title
  rd bookmarks update 12345 --tags "a,b,c"     # Replace all tags
  rd bookmarks update 12345 --add-tags "new"   # Add tags to existing
  rd bookmarks update 12345 --remove-tags "old"  # Remove specific tags
  rd bookmarks update 12345 -c 67890           # Move to collection
  rd bookmarks update 12345 --favorite         # Mark as favorite
  rd bookmarks update 12345 --favorite false   # Remove favorite
  rd bookmarks update 12345 --dry-run          # Preview changes`
    )
    .action(async function (this: Command, idArg: string, options) {
      try {
        const globalOpts = this.optsWithGlobals() as GlobalOptions;

        // Parse and validate bookmark ID
        const id = parseInt(idArg, 10);
        if (isNaN(id) || id < 1) {
          throw new UsageError(`Invalid bookmark ID: "${idArg}". Use a positive number.`);
        }

        // Validate that --tags is not combined with --add-tags or --remove-tags
        if (options.tags !== undefined && (options.addTags || options.removeTags)) {
          throw new UsageError(
            "Cannot combine --tags with --add-tags or --remove-tags. " +
              "Use --tags to replace all tags, or --add-tags/--remove-tags for incremental changes."
          );
        }

        // Resolve --important/--favorite (they're aliases, both accept optional bool)
        let resolvedImportant: boolean | undefined;
        if (options.important !== undefined) {
          resolvedImportant = parseOptionalBoolean(options.important);
        } else if (options.favorite !== undefined) {
          resolvedImportant = parseOptionalBoolean(options.favorite);
        }

        // Check if any update fields were provided
        const hasUpdates =
          options.title !== undefined ||
          options.excerpt !== undefined ||
          options.note !== undefined ||
          options.tags !== undefined ||
          options.addTags !== undefined ||
          options.removeTags !== undefined ||
          options.collection !== undefined ||
          resolvedImportant !== undefined;

        if (!hasUpdates) {
          throw new UsageError(
            "No fields to update. Use --title, --excerpt, --note, --tags, --add-tags, " +
              "--remove-tags, --collection, or --favorite to specify changes."
          );
        }

        // Parse collection ID if provided
        const collectionId =
          options.collection !== undefined ? parseCollectionId(options.collection) : undefined;

        // Parse tags options (parseTags returns undefined for empty results)
        const replaceTags =
          options.tags !== undefined ? (parseTags(options.tags) ?? []) : undefined;
        const addTags = parseTags(options.addTags);
        const removeTags = parseTags(options.removeTags);

        debug("Update bookmark options", {
          id,
          title: options.title,
          excerpt: options.excerpt,
          note: options.note,
          replaceTags,
          addTags,
          removeTags,
          collectionId,
          important: resolvedImportant,
        });

        const client = getClient();

        // If using --add-tags or --remove-tags, we need to fetch current tags first
        let currentTags: string[] | undefined;
        if (addTags || removeTags) {
          verbose(`Fetching current bookmark ${id} to get existing tags`);
          const currentResponse = await withProgress("Fetching current bookmark", () =>
            client.raindrop.getRaindrop(id)
          );
          currentTags = currentResponse.data.item.tags || [];
          debug("Current tags", { currentTags });
        }

        // Calculate final tags
        let finalTags: string[] | undefined;
        if (replaceTags !== undefined) {
          // Replace all tags
          finalTags = replaceTags;
        } else if (addTags || removeTags) {
          // Incremental tag changes
          const tagSet = new Set(currentTags || []);

          if (addTags) {
            for (const tag of addTags) {
              tagSet.add(tag);
            }
          }

          if (removeTags) {
            for (const tag of removeTags) {
              tagSet.delete(tag);
            }
          }

          finalTags = Array.from(tagSet);
        }

        // Build the request payload
        const requestBody: Record<string, unknown> = {};

        if (options.title !== undefined) {
          requestBody.title = options.title;
        }

        if (options.excerpt !== undefined) {
          requestBody.excerpt = options.excerpt;
        }

        if (options.note !== undefined) {
          requestBody.note = options.note;
        }

        if (finalTags !== undefined) {
          requestBody.tags = finalTags;
        }

        if (collectionId !== undefined) {
          requestBody.collection = { $id: collectionId };
        }

        if (resolvedImportant !== undefined) {
          requestBody.important = resolvedImportant;
        }

        // Handle dry-run mode
        if (options.dryRun) {
          // Fetch current bookmark state for comparison
          verbose(`Dry run: fetching bookmark ${id} to show what would be updated`);
          const currentResponse = await withProgress("Fetching bookmark", () =>
            client.raindrop.getRaindrop(id)
          );
          const currentItem = currentResponse.data.item;

          // Build list of changes
          const changes: string[] = [];
          if (options.title !== undefined) {
            changes.push(`title: '${currentItem.title}' → '${options.title}'`);
          }
          if (options.excerpt !== undefined) {
            const oldExcerpt = currentItem.excerpt || "(empty)";
            const newExcerpt = options.excerpt || "(empty)";
            changes.push(`excerpt: '${oldExcerpt}' → '${newExcerpt}'`);
          }
          if (options.note !== undefined) {
            const oldNote = currentItem.note || "(empty)";
            const newNote = options.note || "(empty)";
            changes.push(`note: '${oldNote}' → '${newNote}'`);
          }
          if (finalTags !== undefined) {
            const oldTags = (currentItem.tags || []).join(", ") || "(none)";
            const newTags = finalTags.join(", ") || "(none)";
            changes.push(`tags: [${oldTags}] → [${newTags}]`);
          }
          if (collectionId !== undefined) {
            changes.push(`collection: ${currentItem.collection?.$id ?? -1} → ${collectionId}`);
          }
          if (resolvedImportant !== undefined) {
            const currentImportant = (currentItem as { important?: boolean }).important ?? false;
            changes.push(`important: ${currentImportant} → ${resolvedImportant}`);
          }

          if (globalOpts.format === "json") {
            console.log(
              JSON.stringify(
                {
                  dryRun: true,
                  wouldUpdate: {
                    id: currentItem._id,
                    title: currentItem.title,
                    changes: requestBody,
                  },
                },
                null,
                2
              )
            );
          } else if (!globalOpts.quiet) {
            console.log(`Would update bookmark ${currentItem._id}: '${currentItem.title}'`);
            for (const change of changes) {
              console.log(`  - ${change}`);
            }
            console.log(`\nRun without --dry-run to execute.`);
          }
          return;
        }

        verbose(`Updating bookmark ${id}`);

        const response = await withProgress("Updating bookmark", () =>
          client.raindrop.updateRaindrop(id, requestBody)
        );

        const item = response.data.item;

        if (!item) {
          throw new Error("Update failed. Try again later.");
        }

        debug("API response", {
          id: item._id,
          title: item.title,
          result: response.data.result,
        });

        verbose(`Updated bookmark ${item._id}: ${item.title}`);

        // Format for output (reuse detail format)
        const formatted = formatBookmarkDetail({
          _id: item._id,
          title: item.title,
          link: item.link,
          tags: item.tags || [],
          created: item.created,
          excerpt: item.excerpt || "",
          domain: item.domain || "",
          type: item.type || "link",
          collectionId: item.collection?.$id ?? -1,
          note: item.note || "",
          highlights: item.highlights || [],
          lastUpdate: item.lastUpdate || item.created,
          important: (item as { important?: boolean }).important,
        });

        // Output the result
        output(formatted, BOOKMARK_DETAIL_COLUMNS, {
          format: globalOpts.format,
          quiet: globalOpts.quiet,
          verbose: globalOpts.verbose,
          debug: globalOpts.debug,
        });
      } catch (error) {
        handleError(error);
      }
    });

  // batch-update command - update multiple bookmarks at once
  addOutputOptions(
    bookmarks
      .command("batch-update")
      .description(
        "Update multiple bookmarks at once. Provide IDs via --ids, stdin, or use --collection to update all in a collection."
      )
      .option(
        "--ids <ids>",
        "Comma-separated list of bookmark IDs (or pipe IDs via stdin, separated by newlines/commas/spaces)"
      )
      .option(
        "-c, --collection <id>",
        "Collection ID or name. Required as scope for the batch operation."
      )
      .option("--add-tags <tags>", "Add comma-separated tags to existing tags")
      .option("--remove-tags <tags>", "Remove comma-separated tags from existing tags")
      .option("--tags <tags>", "Set tags (comma-separated). Note: batch API adds to existing tags")
      .option("-i, --important [bool]", "Set important/favorite status (default: true)")
      .option("-f, --favorite [bool]", "Set favorite status (default: true)")
      .option("--move-to <collection>", "Move bookmarks to a different collection")
      .option("--force", "Skip confirmation prompt")
      .option("-n, --dry-run", "Show what would be updated without actually updating")
  )
    .addHelpText(
      "after",
      `
Examples:
  rd bookmarks batch-update --ids 1,2,3 --add-tags "review"   # Add tag to specific IDs
  rd bookmarks batch-update -c 12345 --favorite --force       # Mark all in collection as favorite
  rd bookmarks batch-update --ids 1,2,3 --favorite false      # Remove favorite from specific IDs
  rd bookmarks batch-update --ids 1,2 --move-to 67890         # Move bookmarks to collection
  echo "1\\n2\\n3" | rd bookmarks batch-update --add-tags "x"  # Pipe IDs from stdin
  rd bookmarks list -q | rd bookmarks batch-update --add-tags "bulk"  # Chain commands`
    )
    .action(async function (this: Command, options) {
      try {
        const globalOpts = this.optsWithGlobals() as GlobalOptions;
        const client = getClient();

        // Collect IDs from --ids flag and/or stdin
        let ids: number[] = [];

        // Parse --ids flag if provided
        if (options.ids) {
          ids = parseIds(options.ids);
        }

        // Read from stdin if available
        if (hasStdinData()) {
          const stdinIds = await readIdsFromStdin();
          ids = [...ids, ...stdinIds];
        }

        // Remove duplicates
        ids = [...new Set(ids)];

        // Parse collection ID (required for API call)
        const collectionId =
          options.collection !== undefined ? parseCollectionId(options.collection) : 0; // 0 = all collections

        // Resolve --important/--favorite (they're aliases, both accept optional bool)
        let resolvedImportant: boolean | undefined;
        if (options.important !== undefined) {
          resolvedImportant = parseOptionalBoolean(options.important);
        } else if (options.favorite !== undefined) {
          resolvedImportant = parseOptionalBoolean(options.favorite);
        }

        // Validate that we have something to update
        const hasTagChanges = options.addTags || options.removeTags || options.tags !== undefined;
        const hasImportantChange = resolvedImportant !== undefined;
        const hasMoveOperation = options.moveTo !== undefined;

        if (!hasTagChanges && !hasImportantChange && !hasMoveOperation) {
          throw new Error(
            "No updates specified. Use --add-tags, --remove-tags, --tags, --favorite, or --move-to."
          );
        }

        // Validate that --tags is not combined with --add-tags or --remove-tags
        if (options.tags !== undefined && (options.addTags || options.removeTags)) {
          throw new Error(
            "Cannot combine --tags with --add-tags or --remove-tags. " +
              "Use --tags to replace all tags, or --add-tags/--remove-tags for incremental changes."
          );
        }

        // Parse tag options
        const replaceTags = parseTags(options.tags);
        const addTags = parseTags(options.addTags);
        const removeTags = parseTags(options.removeTags);

        // Parse move-to collection if provided
        const moveToCollectionId =
          options.moveTo !== undefined ? parseCollectionId(options.moveTo) : undefined;

        debug("Batch update options", {
          ids,
          collectionId,
          replaceTags,
          addTags,
          removeTags,
          important: resolvedImportant,
          moveToCollectionId,
        });

        // Determine what we're updating
        let targetDescription: string;
        if (ids.length > 0) {
          targetDescription = `${ids.length} bookmark${ids.length === 1 ? "" : "s"}`;
        } else if (options.collection) {
          targetDescription = `all bookmarks in collection "${options.collection}"`;
        } else {
          throw new Error(
            "No bookmarks specified. Provide --ids, pipe IDs via stdin, or use --collection to target all bookmarks in a collection."
          );
        }

        // Build update description
        const updateParts: string[] = [];
        if (addTags) updateParts.push(`add tags: ${addTags.join(", ")}`);
        if (removeTags) updateParts.push(`remove tags: ${removeTags.join(", ")}`);
        if (replaceTags) updateParts.push(`set tags: ${replaceTags.join(", ")}`);
        if (resolvedImportant === true) updateParts.push("mark as favorite");
        if (resolvedImportant === false) updateParts.push("remove favorite");
        if (moveToCollectionId !== undefined)
          updateParts.push(`move to collection ${options.moveTo}`);

        // Handle dry-run mode
        if (options.dryRun) {
          verbose(`Dry run: showing what would be updated for ${targetDescription}`);

          if (ids.length > 0) {
            // Fetch bookmark details for specific IDs
            const bookmarkDetails: Array<{ id: number; title: string }> = [];
            for (const id of ids) {
              try {
                const response = await client.raindrop.getRaindrop(id);
                bookmarkDetails.push({
                  id: response.data.item._id,
                  title: response.data.item.title,
                });
              } catch {
                bookmarkDetails.push({ id, title: "(unable to fetch)" });
              }
            }

            if (globalOpts.format === "json") {
              console.log(
                JSON.stringify(
                  {
                    dryRun: true,
                    wouldUpdate: bookmarkDetails.map((b) => ({ id: b.id, title: b.title })),
                    changes: updateParts,
                  },
                  null,
                  2
                )
              );
            } else if (!globalOpts.quiet) {
              console.log(`Would update ${ids.length} bookmark${ids.length === 1 ? "" : "s"}:`);
              for (const bookmark of bookmarkDetails) {
                console.log(`  - ${bookmark.id}: '${bookmark.title}'`);
              }
              console.log(`\nChanges:`);
              for (const part of updateParts) {
                console.log(`  - ${part}`);
              }
              console.log(`\nRun without --dry-run to execute.`);
            }
          } else {
            // Collection-wide update
            if (globalOpts.format === "json") {
              console.log(
                JSON.stringify(
                  {
                    dryRun: true,
                    wouldUpdate: targetDescription,
                    changes: updateParts,
                  },
                  null,
                  2
                )
              );
            } else if (!globalOpts.quiet) {
              console.log(`Would update ${targetDescription}:`);
              for (const part of updateParts) {
                console.log(`  - ${part}`);
              }
              console.log(`\nRun without --dry-run to execute.`);
            }
          }
          return;
        }

        // Confirm action unless --force is used
        if (!options.force) {
          const message = `About to update ${targetDescription}:\n  - ${updateParts.join("\n  - ")}\n\nContinue?`;
          const confirmed = await confirmAction(message);
          if (!confirmed) {
            if (!globalOpts.quiet) {
              console.log("Operation cancelled.");
            }
            return;
          }
        }

        verbose(`Batch updating ${targetDescription}`);

        // For --add-tags or --remove-tags, we need to handle each bookmark individually
        // because we need to fetch current tags first
        if ((addTags || removeTags) && ids.length > 0) {
          // Incremental tag updates - must process individually
          let successCount = 0;
          let errorCount = 0;

          for (const id of ids) {
            try {
              // Fetch current bookmark to get existing tags
              const currentResponse = await client.raindrop.getRaindrop(id);
              const currentTags = currentResponse.data.item.tags || [];

              // Calculate new tags
              const tagSet = new Set(currentTags);
              if (addTags) {
                for (const tag of addTags) {
                  tagSet.add(tag);
                }
              }
              if (removeTags) {
                for (const tag of removeTags) {
                  tagSet.delete(tag);
                }
              }
              const finalTags = Array.from(tagSet);

              // Build update request
              const updateBody: Record<string, unknown> = { tags: finalTags };
              if (resolvedImportant !== undefined) {
                updateBody.important = resolvedImportant;
              }
              if (moveToCollectionId !== undefined) {
                updateBody.collection = { $id: moveToCollectionId };
              }

              // Update the bookmark
              await client.raindrop.updateRaindrop(id, updateBody);
              successCount++;
              verbose(`Updated bookmark ${id}`);
            } catch (error) {
              errorCount++;
              verbose(`Failed to update bookmark ${id}: ${error}`);
            }
          }

          // Output result
          const result = {
            result: errorCount === 0,
            modified: successCount,
            errors: errorCount,
          };

          if (globalOpts.format === "json") {
            console.log(JSON.stringify(result, null, 2));
          } else if (!globalOpts.quiet) {
            console.log(`Updated ${successCount} bookmark${successCount === 1 ? "" : "s"}.`);
            if (errorCount > 0) {
              console.log(`Failed to update ${errorCount} bookmark${errorCount === 1 ? "" : "s"}.`);
            }
          }
        } else {
          // Use batch API for direct tag replacement or when operating on collection
          const requestBody: Record<string, unknown> = {};

          if (ids.length > 0) {
            requestBody.ids = ids;
          }

          if (replaceTags !== undefined) {
            requestBody.tags = replaceTags;
          }

          if (resolvedImportant !== undefined) {
            requestBody.important = resolvedImportant;
          }

          if (moveToCollectionId !== undefined) {
            requestBody.collection = { $id: moveToCollectionId };
          }

          const response = await withProgress("Batch updating bookmarks", () =>
            client.raindrop.updateRaindrops(collectionId, requestBody)
          );

          const modified = response.data.modified ?? 0;

          debug("API response", {
            result: response.data.result,
            modified,
          });

          if (globalOpts.format === "json") {
            console.log(JSON.stringify({ result: response.data.result, modified }, null, 2));
          } else if (!globalOpts.quiet) {
            console.log(`Updated ${modified} bookmark${modified === 1 ? "" : "s"}.`);
          }
        }
      } catch (error) {
        handleError(error);
      }
    });

  // batch-delete command - delete multiple bookmarks at once
  addOutputOptions(
    bookmarks
      .command("batch-delete")
      .alias("batch-rm")
      .description(
        "Delete multiple bookmarks at once (alias: batch-rm). Provide IDs via --ids, stdin, or use --collection to delete all in a collection."
      )
      .option(
        "--ids <ids>",
        "Comma-separated list of bookmark IDs (or pipe IDs via stdin, separated by newlines/commas/spaces)"
      )
      .option(
        "-c, --collection <id>",
        "Collection ID or name. When used without --ids, deletes ALL bookmarks in the collection."
      )
      .option("-s, --search <query>", "Search query to filter bookmarks (used with --collection)")
      .option("-f, --force", "Skip confirmation prompt")
      .option("-n, --dry-run", "Show what would be deleted without actually deleting")
  )
    .addHelpText(
      "after",
      `
Examples:
  rd bookmarks batch-delete --ids 1,2,3 -f         # Delete specific bookmarks
  rd bookmarks batch-delete -c 12345 -f            # Delete all in collection
  rd bookmarks batch-delete -c 12345 -s "old" -f   # Delete matching search
  echo "1\\n2\\n3" | rd bookmarks batch-delete -f   # Pipe IDs from stdin
  rd bookmarks batch-delete --ids 1,2 --dry-run    # Preview what would be deleted`
    )
    .action(async function (this: Command, options) {
      try {
        const globalOpts = this.optsWithGlobals() as GlobalOptions;
        const client = getClient();

        // Collect IDs from --ids flag and/or stdin
        let ids: number[] = [];

        // Parse --ids flag if provided
        if (options.ids) {
          ids = parseIds(options.ids);
        }

        // Read from stdin if available
        if (hasStdinData()) {
          const stdinIds = await readIdsFromStdin();
          ids = [...ids, ...stdinIds];
        }

        // Remove duplicates
        ids = [...new Set(ids)];

        // Parse collection ID (required for API call)
        const collectionId =
          options.collection !== undefined ? parseCollectionId(options.collection) : 0; // 0 = all collections

        // Validate that we have something to delete
        if (ids.length === 0 && options.collection === undefined) {
          throw new Error(
            "No bookmarks specified. Provide --ids, pipe IDs via stdin, or use --collection to target all bookmarks in a collection."
          );
        }

        debug("Batch delete options", {
          ids,
          collectionId,
          search: options.search,
        });

        // Determine what we're deleting
        let targetDescription: string;
        if (ids.length > 0) {
          targetDescription = `${ids.length} bookmark${ids.length === 1 ? "" : "s"}`;
        } else if (options.search) {
          targetDescription = `bookmarks matching "${options.search}" in collection "${options.collection}"`;
        } else {
          targetDescription = `ALL bookmarks in collection "${options.collection}"`;
        }

        // Handle dry-run mode
        if (options.dryRun) {
          verbose(`Dry run: showing what would be deleted for ${targetDescription}`);

          if (ids.length > 0) {
            // Fetch bookmark details for specific IDs
            const bookmarkDetails: Array<{ id: number; title: string }> = [];
            for (const id of ids) {
              try {
                const response = await client.raindrop.getRaindrop(id);
                bookmarkDetails.push({
                  id: response.data.item._id,
                  title: response.data.item.title,
                });
              } catch {
                bookmarkDetails.push({ id, title: "(unable to fetch)" });
              }
            }

            if (globalOpts.format === "json") {
              console.log(
                JSON.stringify(
                  {
                    dryRun: true,
                    wouldDelete: bookmarkDetails.map((b) => ({ id: b.id, title: b.title })),
                  },
                  null,
                  2
                )
              );
            } else if (!globalOpts.quiet) {
              console.log(`Would delete ${ids.length} bookmark${ids.length === 1 ? "" : "s"}:`);
              for (const bookmark of bookmarkDetails) {
                console.log(`  - ${bookmark.id}: '${bookmark.title}'`);
              }
              console.log(`\nRun without --dry-run to execute.`);
            }
          } else {
            // Collection-wide or search-based delete
            if (globalOpts.format === "json") {
              console.log(
                JSON.stringify(
                  {
                    dryRun: true,
                    wouldDelete: targetDescription,
                  },
                  null,
                  2
                )
              );
            } else if (!globalOpts.quiet) {
              console.log(`Would delete ${targetDescription}.`);
              console.log(`\nRun without --dry-run to execute.`);
            }
          }
          return;
        }

        // Confirm action unless --force is used
        if (!options.force) {
          const message = `⚠️  About to DELETE ${targetDescription}. This will move them to trash.\n\nContinue?`;
          const confirmed = await confirmAction(message);
          if (!confirmed) {
            if (!globalOpts.quiet) {
              console.log("Operation cancelled.");
            }
            return;
          }
        }

        verbose(`Batch deleting ${targetDescription}`);

        // Build request body
        const requestBody: { ids?: number[] } = {};
        if (ids.length > 0) {
          requestBody.ids = ids;
        }

        const response = await withProgress("Batch deleting bookmarks", () =>
          client.raindrop.removeRaindrops(collectionId, options.search, requestBody)
        );

        const modified = response.data.modified ?? ids.length;

        debug("API response", {
          result: response.data.result,
          modified,
        });

        if (globalOpts.format === "json") {
          console.log(JSON.stringify({ result: response.data.result, modified }, null, 2));
        } else if (!globalOpts.quiet) {
          console.log(`Deleted ${modified} bookmark${modified === 1 ? "" : "s"} (moved to trash).`);
        }
      } catch (error) {
        handleError(error);
      }
    });

  return bookmarks;
}
