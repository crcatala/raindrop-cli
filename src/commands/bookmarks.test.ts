import { describe, test, expect } from "bun:test";
import { createBookmarksCommand } from "./bookmarks.js";

/**
 * Unit tests for the bookmarks command.
 *
 * These tests run in-process without spawning subprocesses (~1ms vs ~200ms each).
 * They test command structure, help text, and options/arguments.
 *
 * For validation tests, see src/utils/validation.test.ts.
 * For subprocess integration tests, see bookmarks.integration.test.ts.
 * For live API tests, see bookmarks.live.test.ts.
 */

describe("bookmarks command structure", () => {
  const bookmarks = createBookmarksCommand();

  describe("command hierarchy", () => {
    test("has correct name and description", () => {
      expect(bookmarks.name()).toBe("bookmarks");
      expect(bookmarks.description()).toContain("Manage bookmarks");
    });

    test("has list subcommand", () => {
      const list = bookmarks.commands.find((c) => c.name() === "list");
      expect(list).toBeDefined();
      expect(list?.description()).toContain("List bookmarks");
    });

    test("has show subcommand", () => {
      const show = bookmarks.commands.find((c) => c.name() === "show");
      expect(show).toBeDefined();
      expect(show?.description()).toContain("Show a single bookmark");
    });

    test("has add subcommand", () => {
      const add = bookmarks.commands.find((c) => c.name() === "add");
      expect(add).toBeDefined();
      expect(add?.description()).toContain("Add a new bookmark");
    });

    test("has update subcommand", () => {
      const update = bookmarks.commands.find((c) => c.name() === "update");
      expect(update).toBeDefined();
      expect(update?.description()).toContain("Update an existing bookmark");
    });

    test("has delete subcommand", () => {
      const del = bookmarks.commands.find((c) => c.name() === "delete");
      expect(del).toBeDefined();
      expect(del?.description()).toContain("Delete a bookmark");
    });

    test("has batch-update subcommand", () => {
      const batchUpdate = bookmarks.commands.find((c) => c.name() === "batch-update");
      expect(batchUpdate).toBeDefined();
      expect(batchUpdate?.description()).toContain("Update multiple bookmarks");
    });

    test("has batch-delete subcommand", () => {
      const batchDelete = bookmarks.commands.find((c) => c.name() === "batch-delete");
      expect(batchDelete).toBeDefined();
      expect(batchDelete?.description()).toContain("Delete multiple bookmarks");
    });
  });

  describe("help text", () => {
    test("bookmarks --help shows command description", () => {
      const help = bookmarks.helpInformation();
      expect(help).toContain("Manage bookmarks");
      expect(help).toContain("list");
      expect(help).toContain("show");
      expect(help).toContain("add");
      expect(help).toContain("update");
      expect(help).toContain("delete");
    });

    test("bookmarks list --help shows options", () => {
      const list = bookmarks.commands.find((c) => c.name() === "list");
      const help = list?.helpInformation() ?? "";
      expect(help).toContain("--limit");
      expect(help).toContain("--page");
      expect(help).toContain("--sort");
      expect(help).toContain("--search");
      expect(help).toContain("collection-id");
    });

    test("bookmarks list --help shows convenience filter flags", () => {
      const list = bookmarks.commands.find((c) => c.name() === "list");
      const help = list?.helpInformation() ?? "";
      expect(help).toContain("--type");
      expect(help).toContain("--tag");
      expect(help).toContain("--domain");
      expect(help).toContain("--favorites");
      expect(help).toContain("--with-notes");
      expect(help).toContain("--with-highlights");
      expect(help).toContain("--without-tags");
      expect(help).toContain("--has-reminder");
      expect(help).toContain("--broken");
      expect(help).toContain("--created");
    });

    test("bookmarks list --help shows search examples and doc link", () => {
      const list = bookmarks.commands.find((c) => c.name() === "list");
      const help = list?.helpInformation() ?? "";
      expect(help).toContain("type:article");
      expect(help).toContain("#javascript");
      expect(help).toContain("domain:github.com");
      expect(help).toContain("help.raindrop.io/using-search");
    });

    test("bookmarks show --help shows usage", () => {
      const show = bookmarks.commands.find((c) => c.name() === "show");
      const help = show?.helpInformation() ?? "";
      expect(help).toContain("Show a single bookmark by ID");
      expect(help).toContain("<id>");
    });

    test("bookmarks add --help shows usage", () => {
      const add = bookmarks.commands.find((c) => c.name() === "add");
      const help = add?.helpInformation() ?? "";
      expect(help).toContain("Add a new bookmark");
      expect(help).toContain("<url>");
      expect(help).toContain("--title");
      expect(help).toContain("--excerpt");
      expect(help).toContain("--note");
      expect(help).toContain("--tags");
      expect(help).toContain("--collection");
      expect(help).toContain("--parse");
    });

    test("bookmarks update --help shows usage", () => {
      const update = bookmarks.commands.find((c) => c.name() === "update");
      const help = update?.helpInformation() ?? "";
      expect(help).toContain("Update an existing bookmark");
      expect(help).toContain("<id>");
      expect(help).toContain("--title");
      expect(help).toContain("--excerpt");
      expect(help).toContain("--note");
      expect(help).toContain("--tags");
      expect(help).toContain("--add-tags");
      expect(help).toContain("--remove-tags");
      expect(help).toContain("--collection");
      expect(help).toContain("--important");
      expect(help).toContain("--no-important");
      expect(help).toContain("--dry-run");
    });

    test("bookmarks delete --help shows options", () => {
      const del = bookmarks.commands.find((c) => c.name() === "delete");
      const help = del?.helpInformation() ?? "";
      expect(help).toContain("--permanent");
      expect(help).toContain("--force");
      expect(help).toContain("--dry-run");
      expect(help).toContain("-n");
    });

    test("bookmarks batch-update --help shows all options", () => {
      const batchUpdate = bookmarks.commands.find((c) => c.name() === "batch-update");
      const help = batchUpdate?.helpInformation() ?? "";
      expect(help).toContain("--ids");
      expect(help).toContain("--collection");
      expect(help).toContain("--add-tags");
      expect(help).toContain("--remove-tags");
      expect(help).toContain("--tags");
      expect(help).toContain("--important");
      expect(help).toContain("--no-important");
      expect(help).toContain("--move-to");
      expect(help).toContain("--force");
      expect(help).toContain("stdin");
      expect(help).toContain("--dry-run");
      expect(help).toContain("-n");
    });

    test("bookmarks batch-delete --help shows all options", () => {
      const batchDelete = bookmarks.commands.find((c) => c.name() === "batch-delete");
      const help = batchDelete?.helpInformation() ?? "";
      expect(help).toContain("--ids");
      expect(help).toContain("--collection");
      expect(help).toContain("--search");
      expect(help).toContain("--force");
      expect(help).toContain("stdin");
      expect(help).toContain("--dry-run");
      expect(help).toContain("-n");
    });
  });

  describe("list command options", () => {
    const list = bookmarks.commands.find((c) => c.name() === "list");

    test("has --limit option with default", () => {
      const opt = list?.options.find((o) => o.long === "--limit");
      expect(opt).toBeDefined();
      expect(opt?.defaultValue).toBe("25");
    });

    test("has --page option with default", () => {
      const opt = list?.options.find((o) => o.long === "--page");
      expect(opt).toBeDefined();
      expect(opt?.defaultValue).toBe("0");
    });

    test("has --sort option with default", () => {
      const opt = list?.options.find((o) => o.long === "--sort");
      expect(opt).toBeDefined();
      expect(opt?.defaultValue).toBe("-created");
    });

    test("has optional collection-id argument", () => {
      const args = list?.registeredArguments ?? [];
      expect(args.length).toBe(1);
      expect(args[0]?.name()).toBe("collection-id");
      expect(args[0]?.required).toBe(false);
    });
  });

  describe("show command arguments", () => {
    const show = bookmarks.commands.find((c) => c.name() === "show");

    test("requires id argument", () => {
      const args = show?.registeredArguments ?? [];
      expect(args.length).toBe(1);
      expect(args[0]?.name()).toBe("id");
      expect(args[0]?.required).toBe(true);
    });
  });

  describe("add command arguments and options", () => {
    const add = bookmarks.commands.find((c) => c.name() === "add");

    test("requires url argument", () => {
      const args = add?.registeredArguments ?? [];
      expect(args.length).toBe(1);
      expect(args[0]?.name()).toBe("url");
      expect(args[0]?.required).toBe(true);
    });

    test("has --title option", () => {
      const opt = add?.options.find((o) => o.long === "--title");
      expect(opt).toBeDefined();
      expect(opt?.short).toBe("-t");
    });

    test("has --collection option with default", () => {
      const opt = add?.options.find((o) => o.long === "--collection");
      expect(opt).toBeDefined();
      expect(opt?.short).toBe("-c");
      expect(opt?.defaultValue).toBe("unsorted");
    });

    test("has --parse option", () => {
      const opt = add?.options.find((o) => o.long === "--parse");
      expect(opt).toBeDefined();
      expect(opt?.short).toBe("-p");
    });
  });

  describe("update command arguments and options", () => {
    const update = bookmarks.commands.find((c) => c.name() === "update");

    test("requires id argument", () => {
      const args = update?.registeredArguments ?? [];
      expect(args.length).toBe(1);
      expect(args[0]?.name()).toBe("id");
      expect(args[0]?.required).toBe(true);
    });

    test("has --add-tags and --remove-tags options", () => {
      const addTags = update?.options.find((o) => o.long === "--add-tags");
      const removeTags = update?.options.find((o) => o.long === "--remove-tags");
      expect(addTags).toBeDefined();
      expect(removeTags).toBeDefined();
    });

    test("has --important and --no-important options", () => {
      const important = update?.options.find((o) => o.long === "--important");
      const noImportant = update?.options.find((o) => o.long === "--no-important");
      expect(important).toBeDefined();
      expect(noImportant).toBeDefined();
    });
  });

  describe("delete command arguments and options", () => {
    const del = bookmarks.commands.find((c) => c.name() === "delete");

    test("requires id argument", () => {
      const args = del?.registeredArguments ?? [];
      expect(args.length).toBe(1);
      expect(args[0]?.name()).toBe("id");
      expect(args[0]?.required).toBe(true);
    });

    test("has --permanent option", () => {
      const opt = del?.options.find((o) => o.long === "--permanent");
      expect(opt).toBeDefined();
      expect(opt?.short).toBe("-p");
    });

    test("has --force option", () => {
      const opt = del?.options.find((o) => o.long === "--force");
      expect(opt).toBeDefined();
      expect(opt?.short).toBe("-f");
    });

    test("has --dry-run option", () => {
      const opt = del?.options.find((o) => o.long === "--dry-run");
      expect(opt).toBeDefined();
      expect(opt?.short).toBe("-n");
    });
  });

  describe("batch-update command options", () => {
    const batchUpdate = bookmarks.commands.find((c) => c.name() === "batch-update");

    test("has --ids option", () => {
      const opt = batchUpdate?.options.find((o) => o.long === "--ids");
      expect(opt).toBeDefined();
    });

    test("has --move-to option", () => {
      const opt = batchUpdate?.options.find((o) => o.long === "--move-to");
      expect(opt).toBeDefined();
    });

    test("has --force option", () => {
      const opt = batchUpdate?.options.find((o) => o.long === "--force");
      expect(opt).toBeDefined();
      expect(opt?.short).toBe("-f");
    });
  });

  describe("batch-delete command options", () => {
    const batchDelete = bookmarks.commands.find((c) => c.name() === "batch-delete");

    test("has --ids option", () => {
      const opt = batchDelete?.options.find((o) => o.long === "--ids");
      expect(opt).toBeDefined();
    });

    test("has --search option", () => {
      const opt = batchDelete?.options.find((o) => o.long === "--search");
      expect(opt).toBeDefined();
    });

    test("has --force option", () => {
      const opt = batchDelete?.options.find((o) => o.long === "--force");
      expect(opt).toBeDefined();
      expect(opt?.short).toBe("-f");
    });
  });
});
