import { describe, test, expect } from "bun:test";
import { createCollectionsCommand } from "./collections.js";

/**
 * Unit tests for the collections command.
 *
 * These tests run in-process without spawning subprocesses (~1ms vs ~200ms each).
 * They test command structure, help text, and options/arguments.
 *
 * For validation tests, see src/utils/validation.test.ts.
 * For subprocess integration tests, see collections.integration.test.ts.
 * For live API tests, see collections.live.test.ts.
 */

describe("collections command structure", () => {
  const collections = createCollectionsCommand();

  describe("command hierarchy", () => {
    test("has correct name and description", () => {
      expect(collections.name()).toBe("collections");
      expect(collections.description()).toContain("Manage collections");
    });

    test("has list subcommand", () => {
      const list = collections.commands.find((c) => c.name() === "list");
      expect(list).toBeDefined();
      expect(list?.description()).toContain("List all collections");
    });

    test("has show subcommand", () => {
      const show = collections.commands.find((c) => c.name() === "show");
      expect(show).toBeDefined();
      expect(show?.description()).toContain("Show collection details");
    });

    test("has add subcommand", () => {
      const add = collections.commands.find((c) => c.name() === "add");
      expect(add).toBeDefined();
      expect(add?.description()).toContain("Create a new collection");
    });

    test("has delete subcommand", () => {
      const del = collections.commands.find((c) => c.name() === "delete");
      expect(del).toBeDefined();
      expect(del?.description()).toContain("Delete a collection");
    });

    test("has stats subcommand", () => {
      const stats = collections.commands.find((c) => c.name() === "stats");
      expect(stats).toBeDefined();
      expect(stats?.description()).toContain("Show system collection statistics");
    });
  });

  describe("command aliases", () => {
    test("list has ls alias", () => {
      const list = collections.commands.find((c) => c.name() === "list");
      expect(list?.aliases()).toContain("ls");
    });

    test("delete has rm alias", () => {
      const del = collections.commands.find((c) => c.name() === "delete");
      expect(del?.aliases()).toContain("rm");
    });

    test("add has new and create aliases", () => {
      const add = collections.commands.find((c) => c.name() === "add");
      expect(add?.aliases()).toContain("new");
      expect(add?.aliases()).toContain("create");
    });
  });

  describe("help text", () => {
    test("collections --help shows command description", () => {
      const help = collections.helpInformation();
      expect(help).toContain("Manage collections");
      expect(help).toContain("list");
      expect(help).toContain("show");
      expect(help).toContain("add");
      expect(help).toContain("delete");
      expect(help).toContain("stats");
    });

    test("collections list --help shows options", () => {
      const list = collections.commands.find((c) => c.name() === "list");
      const help = list?.helpInformation() ?? "";
      expect(help).toContain("--flat");
    });

    test("collections show --help shows arguments", () => {
      const show = collections.commands.find((c) => c.name() === "show");
      const help = show?.helpInformation() ?? "";
      expect(help).toContain("collection-id");
    });

    test("collections add --help shows arguments and options", () => {
      const add = collections.commands.find((c) => c.name() === "add");
      const help = add?.helpInformation() ?? "";
      expect(help).toContain("name");
      expect(help).toContain("--parent");
      expect(help).toContain("-p");
    });

    test("collections delete --help shows options", () => {
      const del = collections.commands.find((c) => c.name() === "delete");
      const help = del?.helpInformation() ?? "";
      expect(help).toContain("collection-id");
      expect(help).toContain("--force");
    });
  });

  describe("list command options", () => {
    const list = collections.commands.find((c) => c.name() === "list");

    test("has --flat option", () => {
      const opt = list?.options.find((o) => o.long === "--flat");
      expect(opt).toBeDefined();
    });
  });

  describe("show command arguments", () => {
    const show = collections.commands.find((c) => c.name() === "show");

    test("requires collection-id argument", () => {
      const args = show?.registeredArguments ?? [];
      expect(args.length).toBe(1);
      expect(args[0]?.name()).toBe("collection-id");
      expect(args[0]?.required).toBe(true);
    });
  });

  describe("add command arguments and options", () => {
    const add = collections.commands.find((c) => c.name() === "add");

    test("requires name argument", () => {
      const args = add?.registeredArguments ?? [];
      expect(args.length).toBe(1);
      expect(args[0]?.name()).toBe("name");
      expect(args[0]?.required).toBe(true);
    });

    test("has --parent option", () => {
      const opt = add?.options.find((o) => o.long === "--parent");
      expect(opt).toBeDefined();
      expect(opt?.short).toBe("-p");
    });
  });

  describe("delete command arguments and options", () => {
    const del = collections.commands.find((c) => c.name() === "delete");

    test("requires collection-id argument", () => {
      const args = del?.registeredArguments ?? [];
      expect(args.length).toBe(1);
      expect(args[0]?.name()).toBe("collection-id");
      expect(args[0]?.required).toBe(true);
    });

    test("has --force option", () => {
      const opt = del?.options.find((o) => o.long === "--force");
      expect(opt).toBeDefined();
      expect(opt?.short).toBe("-f");
    });
  });
});
