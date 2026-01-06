import { describe, test, expect } from "bun:test";
import { buildTree, renderTree, type TreeItem, type TreeNode } from "./tree.js";

describe("buildTree", () => {
  test("builds single root item", () => {
    const roots: TreeItem[] = [{ _id: 1, title: "Root", count: 5 }];
    const children: TreeItem[] = [];

    const tree = buildTree(roots, children);

    expect(tree).toHaveLength(1);
    expect(tree[0]!.item._id).toBe(1);
    expect(tree[0]!.item.title).toBe("Root");
    expect(tree[0]!.children).toHaveLength(0);
  });

  test("builds multiple root items sorted alphabetically", () => {
    const roots: TreeItem[] = [
      { _id: 1, title: "Zebra", count: 1 },
      { _id: 2, title: "Apple", count: 2 },
      { _id: 3, title: "Mango", count: 3 },
    ];
    const children: TreeItem[] = [];

    const tree = buildTree(roots, children);

    expect(tree).toHaveLength(3);
    expect(tree[0]!.item.title).toBe("Apple");
    expect(tree[1]!.item.title).toBe("Mango");
    expect(tree[2]!.item.title).toBe("Zebra");
  });

  test("links children to parents", () => {
    const roots: TreeItem[] = [{ _id: 1, title: "Parent", count: 0 }];
    const children: TreeItem[] = [{ _id: 2, title: "Child", count: 0, parent: { $id: 1 } }];

    const tree = buildTree(roots, children);

    expect(tree).toHaveLength(1);
    expect(tree[0]!.item.title).toBe("Parent");
    expect(tree[0]!.children).toHaveLength(1);
    expect(tree[0]!.children[0]!.item.title).toBe("Child");
  });

  test("handles multiple levels of nesting", () => {
    const roots: TreeItem[] = [{ _id: 1, title: "Root", count: 0 }];
    const children: TreeItem[] = [
      { _id: 2, title: "Child", count: 0, parent: { $id: 1 } },
      { _id: 3, title: "Grandchild", count: 0, parent: { $id: 2 } },
    ];

    const tree = buildTree(roots, children);

    expect(tree).toHaveLength(1);
    expect(tree[0]!.children).toHaveLength(1);
    expect(tree[0]!.children[0]!.children).toHaveLength(1);
    expect(tree[0]!.children[0]!.children[0]!.item.title).toBe("Grandchild");
  });

  test("sorts children at each level alphabetically", () => {
    const roots: TreeItem[] = [{ _id: 1, title: "Parent", count: 0 }];
    const children: TreeItem[] = [
      { _id: 2, title: "Zebra Child", count: 0, parent: { $id: 1 } },
      { _id: 3, title: "Apple Child", count: 0, parent: { $id: 1 } },
    ];

    const tree = buildTree(roots, children);

    expect(tree[0]!.children[0]!.item.title).toBe("Apple Child");
    expect(tree[0]!.children[1]!.item.title).toBe("Zebra Child");
  });

  test("deduplicates items that appear in both lists", () => {
    const item: TreeItem = { _id: 1, title: "Duplicate", count: 5 };
    const roots: TreeItem[] = [item];
    const children: TreeItem[] = [item]; // Same item in both

    const tree = buildTree(roots, children);

    expect(tree).toHaveLength(1);
    expect(tree[0]!.item._id).toBe(1);
  });

  test("handles orphaned children (parent not in list) as roots", () => {
    const roots: TreeItem[] = [];
    const children: TreeItem[] = [
      { _id: 1, title: "Orphan", count: 0, parent: { $id: 999 } }, // Parent 999 doesn't exist
    ];

    const tree = buildTree(roots, children);

    expect(tree).toHaveLength(1);
    expect(tree[0]!.item.title).toBe("Orphan");
  });

  test("handles items with null parent as roots", () => {
    const roots: TreeItem[] = [];
    const children: TreeItem[] = [{ _id: 1, title: "NullParent", count: 0, parent: null }];

    const tree = buildTree(roots, children);

    expect(tree).toHaveLength(1);
    expect(tree[0]!.item.title).toBe("NullParent");
  });

  test("handles empty input", () => {
    const tree = buildTree([], []);
    expect(tree).toHaveLength(0);
  });

  test("preserves item properties", () => {
    const roots: TreeItem[] = [{ _id: 42, title: "Test", count: 123 }];

    const tree = buildTree(roots, []);

    expect(tree[0]!.item._id).toBe(42);
    expect(tree[0]!.item.title).toBe("Test");
    expect(tree[0]!.item.count).toBe(123);
  });
});

describe("renderTree", () => {
  // Helper to build a simple tree for testing
  function makeTree(
    items: Array<{ title: string; _id: number; count: number; children?: any[] }>
  ): TreeNode[] {
    return items.map((item) => ({
      item: { _id: item._id, title: item.title, count: item.count },
      children: item.children ? makeTree(item.children) : [],
    }));
  }

  test("renders single root item without branch characters", () => {
    const tree = makeTree([{ _id: 1, title: "Root", count: 5 }]);

    const rows = renderTree(tree);

    expect(rows).toHaveLength(1);
    expect(rows[0]!.tree).toBe("📂 Root");
    expect(rows[0]!._id).toBe(1);
    expect(rows[0]!.count).toBe(5);
  });

  test("renders multiple root items without branch characters", () => {
    const tree = makeTree([
      { _id: 1, title: "First", count: 1 },
      { _id: 2, title: "Second", count: 2 },
    ]);

    const rows = renderTree(tree);

    expect(rows).toHaveLength(2);
    expect(rows[0]!.tree).toBe("📂 First");
    expect(rows[1]!.tree).toBe("📂 Second");
  });

  test("renders child with branch character", () => {
    const tree = makeTree([
      {
        _id: 1,
        title: "Parent",
        count: 0,
        children: [{ _id: 2, title: "Child", count: 0 }],
      },
    ]);

    const rows = renderTree(tree);

    expect(rows).toHaveLength(2);
    expect(rows[0]!.tree).toBe("📂 Parent");
    expect(rows[1]!.tree).toBe("└── 📂 Child");
  });

  test("renders multiple children with correct branch characters", () => {
    const tree = makeTree([
      {
        _id: 1,
        title: "Parent",
        count: 0,
        children: [
          { _id: 2, title: "First Child", count: 0 },
          { _id: 3, title: "Last Child", count: 0 },
        ],
      },
    ]);

    const rows = renderTree(tree);

    expect(rows).toHaveLength(3);
    expect(rows[0]!.tree).toBe("📂 Parent");
    expect(rows[1]!.tree).toBe("├── 📂 First Child");
    expect(rows[2]!.tree).toBe("└── 📂 Last Child");
  });

  test("renders nested children with proper indentation", () => {
    const tree = makeTree([
      {
        _id: 1,
        title: "Root",
        count: 0,
        children: [
          {
            _id: 2,
            title: "Child",
            count: 0,
            children: [{ _id: 3, title: "Grandchild", count: 0 }],
          },
        ],
      },
    ]);

    const rows = renderTree(tree);

    expect(rows).toHaveLength(3);
    expect(rows[0]!.tree).toBe("📂 Root");
    expect(rows[1]!.tree).toBe("└── 📂 Child");
    expect(rows[2]!.tree).toBe("    └── 📂 Grandchild");
  });

  test("renders complex tree with correct continuation lines", () => {
    const tree = makeTree([
      {
        _id: 1,
        title: "Root",
        count: 0,
        children: [
          {
            _id: 2,
            title: "First",
            count: 0,
            children: [{ _id: 4, title: "Nested", count: 0 }],
          },
          { _id: 3, title: "Second", count: 0 },
        ],
      },
    ]);

    const rows = renderTree(tree);

    expect(rows).toHaveLength(4);
    expect(rows[0]!.tree).toBe("📂 Root");
    expect(rows[1]!.tree).toBe("├── 📂 First");
    expect(rows[2]!.tree).toBe("│   └── 📂 Nested"); // │ continues because "Second" follows
    expect(rows[3]!.tree).toBe("└── 📂 Second");
  });

  test("uses custom icon", () => {
    const tree = makeTree([{ _id: 1, title: "Item", count: 0 }]);

    const rows = renderTree(tree, "🏷️");

    expect(rows[0]!.tree).toBe("🏷️ Item");
  });

  test("returns empty array for empty input", () => {
    const rows = renderTree([]);
    expect(rows).toHaveLength(0);
  });

  test("does not include ANSI escape codes", () => {
    const tree = makeTree([
      {
        _id: 1,
        title: "Parent",
        count: 0,
        children: [{ _id: 2, title: "Child", count: 0 }],
      },
    ]);

    const rows = renderTree(tree);

    for (const row of rows) {
      // ANSI escape codes start with \u001b[
      expect(row.tree).not.toContain("\u001b");
      expect(row.tree).not.toContain("\x1b");
    }
  });

  test("preserves special characters in titles", () => {
    const tree = makeTree([{ _id: 1, title: 'Test & <Special> "Chars"', count: 0 }]);

    const rows = renderTree(tree);

    expect(rows[0]!.tree).toContain('Test & <Special> "Chars"');
  });

  test("handles unicode in titles", () => {
    const tree = makeTree([{ _id: 1, title: "日本語タイトル", count: 0 }]);

    const rows = renderTree(tree);

    expect(rows[0]!.tree).toBe("📂 日本語タイトル");
  });
});

describe("buildTree + renderTree integration", () => {
  test("end-to-end: builds and renders a realistic collection structure", () => {
    const roots: TreeItem[] = [
      { _id: 1, title: "Work", count: 10 },
      { _id: 2, title: "Personal", count: 5 },
    ];
    const children: TreeItem[] = [
      { _id: 3, title: "Projects", count: 3, parent: { $id: 1 } },
      { _id: 4, title: "Archive", count: 7, parent: { $id: 1 } },
      { _id: 5, title: "Active", count: 2, parent: { $id: 3 } },
    ];

    const tree = buildTree(roots, children);
    const rows = renderTree(tree);

    expect(rows).toHaveLength(5);

    // Personal comes first alphabetically
    expect(rows[0]!.tree).toBe("📂 Personal");
    expect(rows[0]!._id).toBe(2);

    // Work with children
    expect(rows[1]!.tree).toBe("📂 Work");
    expect(rows[2]!.tree).toBe("├── 📂 Archive"); // Archive before Projects
    expect(rows[3]!.tree).toBe("└── 📂 Projects");
    expect(rows[4]!.tree).toBe("    └── 📂 Active");
  });
});
