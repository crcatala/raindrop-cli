import { Command } from "commander";
import { getClient } from "../client.js";
import { output, type ColumnConfig } from "../output/index.js";
import { parseCollectionId } from "../utils/collections.js";
import { handleError } from "../utils/errors.js";
import { verbose, debug } from "../utils/debug.js";
import { withProgress } from "../utils/progress.js";
import { outputMessage } from "../utils/output-streams.js";
import type { GlobalOptions } from "../types/index.js";

/**
 * Section configuration for filter output.
 */
interface FilterSection {
  name: string;
  emoji: string;
  items: Array<{ _id: string; count: number }>;
}

/**
 * Output filters in sectioned format for plain output.
 * Outputs each section with a header and indented items.
 */
function outputSectionedPlain(sections: FilterSection[]): void {
  let first = true;
  for (const section of sections) {
    if (section.items.length === 0) continue;

    // Add blank line between sections
    if (!first) {
      outputMessage("");
    }
    first = false;

    // Section header
    outputMessage(`${section.emoji} ${section.name}:`);

    // Items with indent
    for (const item of section.items) {
      outputMessage(`  ${item._id} (${item.count})`);
    }
  }

  // Handle case where all sections are empty
  if (first) {
    outputMessage("No filters available for this collection.");
  }
}

/**
 * Output filters in table/tsv format.
 * Flattens data with a category column.
 */
function outputFlattened(sections: FilterSection[], globalOpts: GlobalOptions): void {
  const flatColumns: ColumnConfig[] = [
    { key: "category", header: "Category", width: 12 },
    { key: "_id", header: "Name", prominent: true },
    { key: "count", header: "Count", width: 10 },
  ];

  const flatItems: Array<{ category: string; _id: string; count: number }> = [];

  for (const section of sections) {
    for (const item of section.items) {
      flatItems.push({
        category: section.name.toLowerCase(),
        _id: item._id,
        count: item.count,
      });
    }
  }

  if (flatItems.length === 0) {
    outputMessage("No filters available for this collection.");
    return;
  }

  output(flatItems, flatColumns, {
    format: globalOpts.format,
    quiet: globalOpts.quiet,
    verbose: globalOpts.verbose,
    debug: globalOpts.debug,
  });
}

export function createFiltersCommand(): Command {
  const filters = new Command("filters")
    .description("Discover available filters")
    .exitOverride()
    .action(function (this: Command) {
      this.help();
    });

  // list command
  filters
    .command("list")
    .description("List available filters for a collection")
    .argument("[collection]", "Collection ID or name (all, unsorted, trash). Default: all")
    .action(async function (this: Command, collectionArg: string | undefined) {
      try {
        const globalOpts = this.optsWithGlobals() as GlobalOptions;
        const collectionId = parseCollectionId(collectionArg);

        debug("List filters options", { collectionId });
        verbose(`Fetching filters for collection ${collectionId}`);

        const client = getClient();
        const response = await withProgress("Fetching filters", () =>
          client.filter.getFilters(collectionId)
        );

        const { types, tags, created } = response.data;

        debug("API response", {
          typesCount: types.length,
          tagsCount: tags.length,
          createdCount: created.length,
        });
        verbose(`Found ${types.length} types, ${tags.length} tags, ${created.length} date groups`);

        // For JSON format, output the structured data directly
        if (globalOpts.format === "json") {
          output(
            { types, tags, created },
            [], // No columns needed for JSON
            {
              format: globalOpts.format,
              quiet: globalOpts.quiet,
              verbose: globalOpts.verbose,
              debug: globalOpts.debug,
            }
          );
          return;
        }

        // Build sections for output
        const sections: FilterSection[] = [
          { name: "Types", emoji: "📄", items: types },
          { name: "Tags", emoji: "🏷️", items: tags },
          { name: "Created", emoji: "📅", items: created },
        ];

        // For plain format (default for terminal), use sectioned output
        if (!globalOpts.format || globalOpts.format === "plain") {
          outputSectionedPlain(sections);
          return;
        }

        // For table/tsv formats, flatten with category column
        outputFlattened(sections, globalOpts);
      } catch (error) {
        handleError(error);
      }
    });

  return filters;
}
