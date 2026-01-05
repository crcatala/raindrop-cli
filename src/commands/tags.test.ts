import { describe, test, expect } from "bun:test";
import { createTagsCommand } from "./tags.js";

/**
 * Unit tests for the tags command.
 *
 * These tests run in-process without spawning subprocesses (~1ms vs ~200ms each).
 * They test command structure, help text, and options/arguments.
 *
 * For validation tests, see src/utils/validation.test.ts (parseCollectionId).
 * For subprocess integration tests, see tags.integration.test.ts.
 * For live API tests, see tags.live.test.ts.
 */

describe("tags command structure", () => {
  const tags = createTagsCommand();

  describe("command hierarchy", () => {
    test("has correct name and description", () => {
      expect(tags.name()).toBe("tags");
      expect(tags.description()).toContain("Manage tags");
    });

    test("has list subcommand", () => {
      const list = tags.commands.find((c) => c.name() === "list");
      expect(list).toBeDefined();
      expect(list?.description()).toContain("List tags");
    });

    test("has rename subcommand", () => {
      const rename = tags.commands.find((c) => c.name() === "rename");
      expect(rename).toBeDefined();
      expect(rename?.description()).toContain("Rename");
    });

    test("has delete subcommand", () => {
      const del = tags.commands.find((c) => c.name() === "delete");
      expect(del).toBeDefined();
      expect(del?.description()).toContain("Remove");
    });
  });

  describe("help text", () => {
    test("tags --help shows command description", () => {
      const help = tags.helpInformation();
      expect(help).toContain("Manage tags");
      expect(help).toContain("list");
      expect(help).toContain("rename");
      expect(help).toContain("delete");
    });

    test("tags list --help shows usage", () => {
      const list = tags.commands.find((c) => c.name() === "list");
      const help = list?.helpInformation() ?? "";
      expect(help).toContain("List tags with bookmark counts");
      expect(help).toContain("collection");
    });

    test("tags rename --help shows usage", () => {
      const rename = tags.commands.find((c) => c.name() === "rename");
      const help = rename?.helpInformation() ?? "";
      expect(help).toContain("Rename a tag");
      expect(help).toContain("--force");
      expect(help).toContain("--collection");
    });

    test("tags delete --help shows usage", () => {
      const del = tags.commands.find((c) => c.name() === "delete");
      const help = del?.helpInformation() ?? "";
      expect(help).toContain("Remove a tag");
      expect(help).toContain("--force");
      expect(help).toContain("--collection");
    });
  });

  describe("rename command options", () => {
    const rename = tags.commands.find((c) => c.name() === "rename");

    test("has --force option", () => {
      const opt = rename?.options.find((o) => o.long === "--force");
      expect(opt).toBeDefined();
      expect(opt?.short).toBe("-f");
    });

    test("has --collection option", () => {
      const opt = rename?.options.find((o) => o.long === "--collection");
      expect(opt).toBeDefined();
      expect(opt?.short).toBe("-c");
    });

    test("requires old and new tag arguments", () => {
      const args = rename?.registeredArguments ?? [];
      expect(args.length).toBe(2);
      expect(args[0]?.name()).toBe("old");
      expect(args[0]?.required).toBe(true);
      expect(args[1]?.name()).toBe("new");
      expect(args[1]?.required).toBe(true);
    });
  });

  describe("delete command options", () => {
    const del = tags.commands.find((c) => c.name() === "delete");

    test("has --force option", () => {
      const opt = del?.options.find((o) => o.long === "--force");
      expect(opt).toBeDefined();
      expect(opt?.short).toBe("-f");
    });

    test("has --collection option", () => {
      const opt = del?.options.find((o) => o.long === "--collection");
      expect(opt).toBeDefined();
      expect(opt?.short).toBe("-c");
    });

    test("requires tag argument", () => {
      const args = del?.registeredArguments ?? [];
      expect(args.length).toBe(1);
      expect(args[0]?.name()).toBe("tag");
      expect(args[0]?.required).toBe(true);
    });
  });
});
