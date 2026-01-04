import { Command } from "commander";
import { getClient } from "../client.js";
import { output, type ColumnConfig } from "../output/index.js";
import { handleError } from "../utils/errors.js";
import { verbose, verboseTime, debug } from "../utils/debug.js";
import { outputError, outputMessage } from "../utils/output-streams.js";
import type { GlobalOptions } from "../types/index.js";

/**
 * Column configuration for tag list output.
 */
const TAG_COLUMNS: ColumnConfig[] = [
  { key: "_id", header: "Tag", prominent: true },
  { key: "count", header: "Count", width: 10 },
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

export function createTagsCommand(): Command {
  const tags = new Command("tags").description("Manage tags").action(function (this: Command) {
    this.help();
  });

  // list command
  tags
    .command("list")
    .description("List tags with bookmark counts")
    .argument("[collection]", "Collection ID or name (all, unsorted, trash). Default: all")
    .action(async function (this: Command, collectionArg: string | undefined) {
      try {
        const globalOpts = this.optsWithGlobals() as GlobalOptions;
        const collectionId = parseCollectionId(collectionArg);

        debug("List tags options", { collectionId });
        verbose(`Fetching tags from collection ${collectionId}`);

        const client = getClient();
        const response = await verboseTime("Fetching tags", () =>
          client.tag.getTagsInCollection(collectionId)
        );

        const { items } = response.data;

        debug("API response", { tagCount: items.length });
        verbose(`Found ${items.length} tags`);

        output(items, TAG_COLUMNS, {
          format: globalOpts.format,
          quiet: globalOpts.quiet,
          verbose: globalOpts.verbose,
          debug: globalOpts.debug,
        });
      } catch (error) {
        handleError(error);
      }
    });

  // rename command
  tags
    .command("rename")
    .description("Rename a tag (merges if target exists)")
    .argument("<old>", "Current tag name")
    .argument("<new>", "New tag name")
    .option("-c, --collection <id>", "Collection ID or name (all, unsorted, trash). Default: all")
    .option("-f, --force", "Confirm this destructive operation")
    .action(async function (
      this: Command,
      oldTag: string,
      newTag: string,
      options: { collection?: string; force?: boolean }
    ) {
      try {
        const collectionId = parseCollectionId(options.collection);

        if (!options.force) {
          outputError(
            `This will rename tag "${oldTag}" to "${newTag}" in collection ${collectionId}.`
          );
          outputError("Use --force to confirm this destructive operation.");
          process.exit(1);
        }

        debug("Rename tag options", { oldTag, newTag, collectionId });
        verbose(`Renaming tag "${oldTag}" to "${newTag}" in collection ${collectionId}`);

        const client = getClient();
        const response = await verboseTime("Renaming tag", () =>
          client.tag.renameOrMergeTags(collectionId, {
            replace: newTag,
            tags: [oldTag],
          })
        );

        debug("API response", { result: response.data.result });

        if (response.data.result) {
          outputMessage(`Tag "${oldTag}" renamed to "${newTag}"`);
        } else {
          outputError("Failed to rename tag");
          process.exit(1);
        }
      } catch (error) {
        handleError(error);
      }
    });

  // delete command
  tags
    .command("delete")
    .description("Remove a tag from all bookmarks in collection")
    .argument("<tag>", "Tag name to remove")
    .option("-c, --collection <id>", "Collection ID or name (all, unsorted, trash). Default: all")
    .option("-f, --force", "Confirm this destructive operation")
    .action(async function (
      this: Command,
      tag: string,
      options: { collection?: string; force?: boolean }
    ) {
      try {
        const collectionId = parseCollectionId(options.collection);

        if (!options.force) {
          outputError(
            `This will remove tag "${tag}" from all bookmarks in collection ${collectionId}.`
          );
          outputError("Use --force to confirm this destructive operation.");
          process.exit(1);
        }

        debug("Delete tag options", { tag, collectionId });
        verbose(`Deleting tag "${tag}" from collection ${collectionId}`);

        const client = getClient();
        const response = await verboseTime("Deleting tag", () =>
          client.tag.removeTagsFromCollection(collectionId, {
            tags: [tag],
          })
        );

        debug("API response", { result: response.data.result });

        if (response.data.result) {
          outputMessage(`Tag "${tag}" removed`);
        } else {
          outputError("Failed to remove tag");
          process.exit(1);
        }
      } catch (error) {
        handleError(error);
      }
    });

  return tags;
}
