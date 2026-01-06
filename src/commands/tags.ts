import { Command } from "commander";
import { getClient } from "../client.js";
import { output, type ColumnConfig } from "../output/index.js";
import { parseCollectionId } from "../utils/collections.js";
import { addOutputOptions } from "../utils/command-options.js";
import { handleError, UsageError } from "../utils/errors.js";
import { verbose, debug } from "../utils/debug.js";
import { withProgress } from "../utils/progress.js";
import { outputError, outputMessage } from "../utils/output-streams.js";
import type { GlobalOptions } from "../types/index.js";

/**
 * Column configuration for tag list output.
 */
const TAG_COLUMNS: ColumnConfig[] = [
  { key: "_id", header: "Tag", prominent: true },
  { key: "count", header: "Count", width: 10 },
];

export function createTagsCommand(): Command {
  const tags = new Command("tags")
    .description("Manage tags")
    .exitOverride()
    .action(function (this: Command) {
      this.help();
    });

  // list command
  addOutputOptions(
    tags
      .command("list")
      .alias("ls")
      .description("List tags with bookmark counts (alias: ls)")
      .argument("[collection]", "Collection ID or name (all, unsorted, trash). Default: all")
  )
    .addHelpText(
      "after",
      `
Examples:
  rd tags list                             # List all tags with counts
  rd tags list 12345                       # List tags in collection
  rd tags list -f json                     # Output as JSON
  rd tags list -q                          # Output just tag names`
    )
    .action(async function (this: Command, collectionArg: string | undefined) {
      try {
        const globalOpts = this.optsWithGlobals() as GlobalOptions;
        const collectionId = parseCollectionId(collectionArg);

        debug("List tags options", { collectionId });
        verbose(`Fetching tags from collection ${collectionId}`);

        const client = getClient();
        const response = await withProgress("Fetching tags", () =>
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
    .addHelpText(
      "after",
      `
Examples:
  rd tags rename "old-tag" "new-tag" -f    # Rename tag globally
  rd tags rename "typo" "fixed" -c 12345 -f  # Rename in collection
  rd tags rename "js" "javascript" -f      # Merges if "javascript" exists`
    )
    .action(async function (
      this: Command,
      oldTag: string,
      newTag: string,
      options: { collection?: string; force?: boolean }
    ) {
      try {
        const collectionId = parseCollectionId(options.collection);

        if (!options.force) {
          throw new UsageError(
            `This will rename tag "${oldTag}" to "${newTag}" in collection ${collectionId}. ` +
              "Re-run with --force to confirm."
          );
        }

        debug("Rename tag options", { oldTag, newTag, collectionId });
        verbose(`Renaming tag "${oldTag}" to "${newTag}" in collection ${collectionId}`);

        const client = getClient();
        const response = await withProgress("Renaming tag", () =>
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
    .alias("rm")
    .description("Remove a tag from all bookmarks in collection (alias: rm)")
    .argument("<tag>", "Tag name to remove")
    .option("-c, --collection <id>", "Collection ID or name (all, unsorted, trash). Default: all")
    .option("-f, --force", "Confirm this destructive operation")
    .addHelpText(
      "after",
      `
Examples:
  rd tags delete "unused-tag" -f           # Remove tag from all bookmarks
  rd tags delete "temp" -c 12345 -f        # Remove tag in specific collection`
    )
    .action(async function (
      this: Command,
      tag: string,
      options: { collection?: string; force?: boolean }
    ) {
      try {
        const collectionId = parseCollectionId(options.collection);

        if (!options.force) {
          throw new UsageError(
            `This will remove tag "${tag}" from all bookmarks in collection ${collectionId}. ` +
              "Re-run with --force to confirm."
          );
        }

        debug("Delete tag options", { tag, collectionId });
        verbose(`Deleting tag "${tag}" from collection ${collectionId}`);

        const client = getClient();
        const response = await withProgress("Deleting tag", () =>
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
