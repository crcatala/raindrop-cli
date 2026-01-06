import { Command } from "commander";
import { getClient } from "../client.js";
import { output, type ColumnConfig } from "../output/index.js";
import { ApiError, handleError, UsageError } from "../utils/errors.js";
import { verbose, debug } from "../utils/debug.js";
import { withProgress } from "../utils/progress.js";
import { getColors } from "../utils/colors.js";
import type { GlobalOptions } from "../types/index.js";

/**
 * Column configuration for collection list output.
 */
const LIST_COLUMNS: ColumnConfig[] = [
  { key: "tree", header: "Collection", width: 50, prominent: true },
  { key: "_id", header: "ID", width: 10 },
  { key: "count", header: "Items", width: 8 },
];

/**
 * Column configuration for flat list output.
 */
const FLAT_LIST_COLUMNS: ColumnConfig[] = [
  { key: "title", header: "Title", width: 40, prominent: true },
  { key: "_id", header: "ID", width: 10 },
  { key: "count", header: "Items", width: 8 },
  { key: "parentId", header: "Parent", width: 10 },
];

/**
 * Column configuration for collection detail output.
 */
const DETAIL_COLUMNS: ColumnConfig[] = [
  { key: "title", header: "Title", width: 40, prominent: true },
  { key: "_id", header: "ID", width: 12 },
  { key: "description", header: "Description" },
  { key: "count", header: "Items", width: 8 },
  { key: "public", header: "Public", width: 6 },
  { key: "created", header: "Created", width: 12 },
  { key: "lastUpdate", header: "Updated", width: 12 },
];

/**
 * System collection IDs for stats command.
 */
const SYSTEM_COLLECTION_IDS: Record<number, string> = {
  0: "All Bookmarks",
  [-1]: "Unsorted",
  [-99]: "Trash",
};

/**
 * Represents a collection with optional parent reference.
 */
interface CollectionItem {
  _id: number;
  title: string;
  count: number;
  parent?: { $id: number } | null;
  description?: string;
  public?: boolean;
  created?: string;
  lastUpdate?: string;
}

/**
 * Tree node for hierarchical display.
 */
interface TreeNode {
  collection: CollectionItem;
  children: TreeNode[];
}

/**
 * Build a tree structure from flat collection lists.
 */
function buildTree(
  rootCollections: CollectionItem[],
  childCollections: CollectionItem[]
): TreeNode[] {
  // Create a map of all collections by ID
  const allCollections = [...rootCollections, ...childCollections];
  const collectionMap = new Map<number, CollectionItem>();
  for (const col of allCollections) {
    collectionMap.set(col._id, col);
  }

  // Create tree nodes for all collections
  const nodeMap = new Map<number, TreeNode>();
  for (const col of allCollections) {
    nodeMap.set(col._id, { collection: col, children: [] });
  }

  // Build the tree by linking children to parents
  const roots: TreeNode[] = [];

  for (const col of allCollections) {
    const node = nodeMap.get(col._id)!;
    const parentId = col.parent?.$id;

    if (parentId !== undefined && nodeMap.has(parentId)) {
      // Has a valid parent - add as child
      nodeMap.get(parentId)!.children.push(node);
    } else {
      // No parent or parent not found - it's a root
      roots.push(node);
    }
  }

  // Sort children at each level by title
  function sortChildren(nodes: TreeNode[]): void {
    nodes.sort((a, b) => a.collection.title.localeCompare(b.collection.title));
    for (const node of nodes) {
      sortChildren(node.children);
    }
  }

  sortChildren(roots);
  return roots;
}

/**
 * Render tree nodes as formatted strings with tree characters.
 */
function renderTree(
  nodes: TreeNode[],
  prefix: string = "",
  isRoot: boolean = true
): Array<{ tree: string; _id: number; count: number }> {
  const result: Array<{ tree: string; _id: number; count: number }> = [];
  const c = getColors();

  nodes.forEach((node, i) => {
    const isLast = i === nodes.length - 1;

    // Determine the branch character
    let branch = "";
    if (!isRoot) {
      branch = isLast ? "└── " : "├── ";
    }

    // Format the collection line
    const icon = "📂";
    const title = node.collection.title;
    const treeLine = `${prefix}${branch}${icon} ${c.bold(title)}`;

    result.push({
      tree: treeLine,
      _id: node.collection._id,
      count: node.collection.count,
    });

    // Process children with updated prefix
    if (node.children.length > 0) {
      const childPrefix = isRoot ? "" : prefix + (isLast ? "    " : "│   ");
      const childResults = renderTree(node.children, childPrefix, false);
      result.push(...childResults);
    }
  });

  return result;
}

/**
 * Format a collection for flat list output.
 */
function formatCollectionFlat(item: CollectionItem) {
  return {
    title: item.title,
    _id: item._id,
    count: item.count,
    parentId: item.parent?.$id ?? "—",
  };
}

/**
 * Format a collection for detail output.
 */
function formatCollectionDetail(item: CollectionItem) {
  return {
    title: item.title,
    _id: item._id,
    description: item.description || "",
    count: item.count,
    public: item.public ? "Yes" : "No",
    created: item.created?.split("T")[0] ?? "",
    lastUpdate: item.lastUpdate?.split("T")[0] ?? "",
  };
}

/**
 * Parse collection ID from string argument.
 */
function parseCollectionId(value: string): number {
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new UsageError(
      `Invalid collection ID: "${value}". Use a number or run \`rdcli collections list\` for IDs.`
    );
  }
  return num;
}

export function createCollectionsCommand(): Command {
  const collections = new Command("collections")
    .description("Manage collections")
    .exitOverride()
    .configureOutput({ outputError: () => {} })
    .action(function (this: Command) {
      this.help();
    });

  // list command - hierarchical tree view
  collections
    .command("list")
    .description("List all collections")
    .option("--flat", "Show flat list instead of tree")
    .addHelpText(
      "after",
      `
Examples:
  rdcli collections list                      # Show collections as tree
  rdcli collections list --flat               # Show as flat list
  rdcli collections list -f json              # Output as JSON
  rdcli collections list -q                   # Output just IDs`
    )
    .action(async function (this: Command, options) {
      try {
        const globalOpts = this.optsWithGlobals() as GlobalOptions;

        debug("List collections options", { flat: options.flat });
        verbose("Fetching collections");

        const client = getClient();

        // Fetch root and child collections in parallel
        const [rootResponse, childResponse] = await withProgress("Fetching collections", () =>
          Promise.all([
            client.collection.getRootCollections(),
            client.collection.getChildCollections(),
          ])
        );

        const rootCollections = rootResponse.data.items as CollectionItem[];
        const childCollections = childResponse.data.items as CollectionItem[];

        debug("API response", {
          rootCount: rootCollections.length,
          childCount: childCollections.length,
        });

        verbose(
          `Found ${rootCollections.length} root collections and ${childCollections.length} child collections`
        );

        if (options.flat) {
          // Flat list output
          const allCollections = [...rootCollections, ...childCollections];
          const formattedItems = allCollections.map(formatCollectionFlat);

          output(formattedItems, FLAT_LIST_COLUMNS, {
            format: globalOpts.format,
            quiet: globalOpts.quiet,
            verbose: globalOpts.verbose,
            debug: globalOpts.debug,
          });
        } else {
          // Tree output
          const tree = buildTree(rootCollections, childCollections);
          const treeItems = renderTree(tree);

          output(treeItems, LIST_COLUMNS, {
            format: globalOpts.format,
            quiet: globalOpts.quiet,
            verbose: globalOpts.verbose,
            debug: globalOpts.debug,
          });
        }
      } catch (error) {
        handleError(error);
      }
    });

  // show command - collection details
  collections
    .command("show")
    .description("Show collection details")
    .argument("<collection-id>", "Collection ID")
    .addHelpText(
      "after",
      `
Examples:
  rdcli collections show 12345                # Show collection details
  rdcli collections show 12345 -f json        # Output as JSON`
    )
    .action(async function (this: Command, collectionIdArg: string) {
      try {
        const globalOpts = this.optsWithGlobals() as GlobalOptions;
        const collectionId = parseCollectionId(collectionIdArg);

        debug("Show collection options", { collectionId });
        verbose(`Fetching collection ${collectionId}`);

        const client = getClient();
        const response = await withProgress("Fetching collection", () =>
          client.collection.getCollection(collectionId)
        );

        const collection = response.data.item as CollectionItem;

        debug("API response", { collection });
        verbose(`Found collection: ${collection.title}`);

        const formatted = formatCollectionDetail(collection);

        output([formatted], DETAIL_COLUMNS, {
          format: globalOpts.format,
          quiet: globalOpts.quiet,
          verbose: globalOpts.verbose,
          debug: globalOpts.debug,
        });
      } catch (error) {
        handleError(error);
      }
    });

  // create command - create new collection
  collections
    .command("create")
    .description("Create a new collection")
    .argument("<name>", "Collection name")
    .option("-p, --parent <id>", "Parent collection ID for creating nested collections")
    .addHelpText(
      "after",
      `
Examples:
  rdcli collections create "My Collection"           # Create root collection
  rdcli collections create "Sub" --parent 12345      # Create nested collection
  rdcli collections create "Work" -f json            # Output as JSON`
    )
    .action(async function (this: Command, name: string, options: { parent?: string }) {
      // Track parentId for use in error handling
      let parentId: number | undefined;

      try {
        const globalOpts = this.optsWithGlobals() as GlobalOptions;

        if (!name.trim()) {
          throw new UsageError("Collection name cannot be empty. Provide a name.");
        }

        // Parse parent collection ID if provided
        parentId = options.parent ? parseCollectionId(options.parent) : undefined;

        debug("Create collection options", { name, parentId });
        verbose(`Creating collection: ${name}${parentId ? ` (parent: ${parentId})` : ""}`);

        const client = getClient();
        const response = await withProgress("Creating collection", () =>
          client.collection.createCollection({
            title: name,
            view: "list",
            sort: 0,
            public: false,
            cover: [],
            parent: parentId ? { $ref: "collections", $id: parentId } : undefined,
          })
        );

        const collection = response.data.item as CollectionItem;

        debug("API response", { collection });
        verbose(`Created collection with ID: ${collection._id}`);

        const formatted = formatCollectionDetail(collection);

        output([formatted], DETAIL_COLUMNS, {
          format: globalOpts.format,
          quiet: globalOpts.quiet,
          verbose: globalOpts.verbose,
          debug: globalOpts.debug,
        });
      } catch (error) {
        // Provide clearer error message when parent collection doesn't exist
        if (parentId && error instanceof ApiError && error.statusCode === 403) {
          handleError(
            new UsageError(
              `Parent collection ${parentId} not found or not accessible. Run \`rdcli collections list\` to see available collections.`
            )
          );
        }
        handleError(error);
      }
    });

  // delete command - delete collection
  collections
    .command("delete")
    .description("Delete a collection")
    .argument("<collection-id>", "Collection ID to delete")
    .option("-f, --force", "Skip confirmation prompt")
    .addHelpText(
      "after",
      `
Examples:
  rdcli collections delete 12345              # Delete (prompts for confirmation)
  rdcli collections delete 12345 --force      # Delete without confirmation`
    )
    .action(async function (this: Command, collectionIdArg: string, options) {
      try {
        const globalOpts = this.optsWithGlobals() as GlobalOptions;
        const collectionId = parseCollectionId(collectionIdArg);

        debug("Delete collection options", { collectionId, force: options.force });

        const client = getClient();

        // Fetch collection first to show what we're deleting
        if (!options.force) {
          const showResponse = await withProgress("Fetching collection", () =>
            client.collection.getCollection(collectionId)
          );
          const collection = showResponse.data.item as CollectionItem;

          const c = getColors();
          console.error(
            c.yellow(
              `Warning: This will delete collection "${collection.title}" (ID: ${collection._id}) with ${collection.count} items.`
            )
          );
          console.error(c.dim("Use --force to skip this warning."));

          // In a CLI, we'd prompt for confirmation here
          // For now, require --force flag
          throw new UsageError("Deletion cancelled. Re-run with --force to confirm deletion.");
        }

        verbose(`Deleting collection ${collectionId}`);

        await withProgress("Deleting collection", () =>
          client.collection.removeCollection(collectionId)
        );

        verbose(`Deleted collection ${collectionId}`);

        if (!globalOpts.quiet) {
          const c = getColors();
          console.log(c.green(`Collection ${collectionId} deleted successfully.`));
        }
      } catch (error) {
        handleError(error);
      }
    });

  // stats command - system collection stats
  collections
    .command("stats")
    .description("Show system collection statistics")
    .addHelpText(
      "after",
      `
Examples:
  rdcli collections stats                     # Show All/Unsorted/Trash counts
  rdcli collections stats -f json             # Output as JSON`
    )
    .action(async function (this: Command) {
      try {
        const globalOpts = this.optsWithGlobals() as GlobalOptions;

        debug("Stats command");
        verbose("Fetching system collection stats");

        const client = getClient();
        const response = await withProgress("Fetching stats", () =>
          client.collection.getSystemCollectionStats()
        );

        const items = response.data.items;

        debug("API response", { items });

        // Format stats for output
        const stats = items.map((item: { _id: number; count: number }) => ({
          name: SYSTEM_COLLECTION_IDS[item._id] ?? `Collection ${item._id}`,
          count: item.count.toLocaleString(),
          _id: item._id,
        }));

        output(
          stats,
          [
            { key: "name", header: "Collection", prominent: true },
            { key: "count", header: "Count" },
            { key: "_id", header: "ID" },
          ],
          {
            format: globalOpts.format,
            quiet: globalOpts.quiet,
            verbose: globalOpts.verbose,
            debug: globalOpts.debug,
          }
        );
      } catch (error) {
        handleError(error);
      }
    });

  return collections;
}
