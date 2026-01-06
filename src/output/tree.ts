/**
 * Tree-specific output formatting.
 *
 * Trees need special handling because:
 * - Terminal output should show a compact tree structure (not separate cards)
 * - Data formats (JSON/TSV) should output clean structured data (not visual characters)
 */

import Table from "cli-table3";
import type { OutputFormat } from "../types/index.js";
import type { TreeNode, TreeItem } from "../utils/tree.js";
import { getColors } from "../utils/colors.js";
import { outputData } from "../utils/output-streams.js";
import { getDefaultFormat } from "../utils/tty.js";

export interface TreeOutputOptions {
  format?: OutputFormat;
  quiet: boolean;
}

/**
 * Structured tree data for JSON/TSV output (no visual characters).
 */
interface TreeDataRow {
  title: string;
  _id: number;
  count: number;
  parentId: number | null;
  depth: number;
}

/**
 * Flatten tree into structured rows for data export.
 */
function flattenTreeToData<T extends TreeItem>(nodes: TreeNode<T>[], depth = 0): TreeDataRow[] {
  const result: TreeDataRow[] = [];

  for (const node of nodes) {
    result.push({
      title: node.item.title,
      _id: node.item._id,
      count: node.item.count,
      parentId: node.item.parent?.$id ?? null,
      depth,
    });

    if (node.children.length > 0) {
      result.push(...flattenTreeToData(node.children, depth + 1));
    }
  }

  return result;
}

/**
 * Render tree as compact terminal output.
 */
function renderTreeTerminal<T extends TreeItem>(nodes: TreeNode<T>[], icon: string = "📂"): string {
  const c = getColors();
  const lines: string[] = [];

  function render(nodes: TreeNode<T>[], prefix: string, isRoot: boolean): void {
    nodes.forEach((node, i) => {
      const isLast = i === nodes.length - 1;

      // Determine the branch character
      let branch = "";
      if (!isRoot) {
        branch = isLast ? "└── " : "├── ";
      }

      // Format count display
      const countStr = node.item.count === 1 ? "1 item" : `${node.item.count} items`;

      // Build the tree line
      const treeLine = `${prefix}${branch}${icon} ${c.bold(node.item.title)} ${c.dim(`(${countStr})`)}`;
      lines.push(treeLine);

      // Process children with updated prefix
      if (node.children.length > 0) {
        const childPrefix = isRoot ? "" : prefix + (isLast ? "    " : "│   ");
        render(node.children, childPrefix, false);
      }
    });
  }

  render(nodes, "", true);
  return lines.join("\n");
}

/**
 * Render tree as a table with headers.
 * The Collection column contains tree structure, ID and Items are separate columns.
 */
function renderTreeTable<T extends TreeItem>(nodes: TreeNode<T>[], icon: string = "📂"): string {
  const c = getColors();

  const table = new Table({
    head: ["Collection", "ID", "Items"],
    colWidths: [50, 12, 8],
  });

  function render(nodes: TreeNode<T>[], prefix: string, isRoot: boolean): void {
    nodes.forEach((node, i) => {
      const isLast = i === nodes.length - 1;

      // Determine the branch character
      let branch = "";
      if (!isRoot) {
        branch = isLast ? "└── " : "├── ";
      }

      // Build the tree cell content
      const treeCell = `${prefix}${branch}${icon} ${c.bold(node.item.title)}`;

      table.push([treeCell, String(node.item._id), String(node.item.count)]);

      // Process children with updated prefix
      if (node.children.length > 0) {
        const childPrefix = isRoot ? "" : prefix + (isLast ? "    " : "│   ");
        render(node.children, childPrefix, false);
      }
    });
  }

  render(nodes, "", true);
  return table.toString();
}

/**
 * Format tree data as TSV.
 */
function formatTreeTsv(data: TreeDataRow[]): string {
  const headers = ["title", "_id", "count", "parentId", "depth"];
  const lines = [headers.join("\t")];

  for (const row of data) {
    const values = [
      row.title,
      String(row._id),
      String(row.count),
      row.parentId === null ? "" : String(row.parentId),
      String(row.depth),
    ];
    lines.push(values.join("\t"));
  }

  return lines.join("\n");
}

/**
 * Output tree data with format-appropriate rendering.
 *
 * - quiet: Just output IDs
 * - json: Structured data with title, _id, count, parentId, depth
 * - tsv: Same structured data as TSV
 * - plain/table: Compact tree visualization
 */
export function outputTree<T extends TreeItem>(
  tree: TreeNode<T>[],
  options: TreeOutputOptions
): void {
  // Quiet mode: just IDs
  if (options.quiet) {
    const data = flattenTreeToData(tree);
    for (const row of data) {
      outputData(String(row._id));
    }
    return;
  }

  const format = options.format ?? getDefaultFormat();

  switch (format) {
    case "json": {
      const data = flattenTreeToData(tree);
      outputData(JSON.stringify(data, null, 2));
      break;
    }

    case "tsv": {
      const data = flattenTreeToData(tree);
      outputData(formatTreeTsv(data));
      break;
    }

    case "plain": {
      // Compact tree view
      outputData(renderTreeTerminal(tree));
      break;
    }

    case "table": {
      // Table with headers and tree structure in first column
      outputData(renderTreeTable(tree));
      break;
    }

    default: {
      const _exhaustive: never = format;
      throw new Error(`Unknown output format: ${_exhaustive}`);
    }
  }
}
