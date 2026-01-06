/**
 * Utilities for building and rendering tree structures.
 */

/**
 * Represents an item that can be placed in a tree structure.
 */
export interface TreeItem {
  _id: number;
  title: string;
  count: number;
  parent?: { $id: number } | null;
}

/**
 * Tree node for hierarchical display.
 */
export interface TreeNode<T extends TreeItem = TreeItem> {
  item: T;
  children: TreeNode<T>[];
}

/**
 * Rendered tree row with display string and item data.
 */
export interface TreeRow {
  /** Display string with tree characters and icon (no ANSI styling) */
  tree: string;
  /** Original item ID */
  _id: number;
  /** Item count */
  count: number;
}

/**
 * Build a tree structure from flat item lists.
 * Handles deduplication if items appear in both lists.
 *
 * @param rootItems - Items at root level (no parent)
 * @param childItems - Items with parents
 * @returns Array of root TreeNodes with children populated
 */
export function buildTree<T extends TreeItem>(rootItems: T[], childItems: T[]): TreeNode<T>[] {
  // Create a map of all items by ID (deduplicates if same item in both lists)
  const itemMap = new Map<number, T>();
  for (const item of [...rootItems, ...childItems]) {
    itemMap.set(item._id, item);
  }
  const allItems = Array.from(itemMap.values());

  // Create tree nodes for all items
  const nodeMap = new Map<number, TreeNode<T>>();
  for (const item of allItems) {
    nodeMap.set(item._id, { item, children: [] });
  }

  // Build the tree by linking children to parents
  const roots: TreeNode<T>[] = [];

  for (const item of allItems) {
    const node = nodeMap.get(item._id)!;
    const parentId = item.parent?.$id;

    if (parentId !== undefined && nodeMap.has(parentId)) {
      // Has a valid parent - add as child
      nodeMap.get(parentId)!.children.push(node);
    } else {
      // No parent or parent not found - it's a root
      roots.push(node);
    }
  }

  // Sort children at each level by title
  function sortChildren(nodes: TreeNode<T>[]): void {
    nodes.sort((a, b) => a.item.title.localeCompare(b.item.title));
    for (const node of nodes) {
      sortChildren(node.children);
    }
  }

  sortChildren(roots);
  return roots;
}

/**
 * Render tree nodes as formatted rows with tree characters.
 * Returns plain text without ANSI styling - styling is applied by formatters.
 *
 * @param nodes - Tree nodes to render
 * @param icon - Icon to display before each title (default: 📂)
 * @returns Array of TreeRow objects
 */
export function renderTree<T extends TreeItem>(
  nodes: TreeNode<T>[],
  icon: string = "📂"
): TreeRow[] {
  const result: TreeRow[] = [];

  function render(nodes: TreeNode<T>[], prefix: string, isRoot: boolean): void {
    nodes.forEach((node, i) => {
      const isLast = i === nodes.length - 1;

      // Determine the branch character
      let branch = "";
      if (!isRoot) {
        branch = isLast ? "└── " : "├── ";
      }

      // Format the tree line (no ANSI styling - just structure)
      const treeLine = `${prefix}${branch}${icon} ${node.item.title}`;

      result.push({
        tree: treeLine,
        _id: node.item._id,
        count: node.item.count,
      });

      // Process children with updated prefix
      if (node.children.length > 0) {
        const childPrefix = isRoot ? "" : prefix + (isLast ? "    " : "│   ");
        render(node.children, childPrefix, false);
      }
    });
  }

  render(nodes, "", true);
  return result;
}
