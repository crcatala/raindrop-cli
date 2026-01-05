import { describe, test, expect } from "bun:test";
import { createHighlightsCommand } from "./highlights.js";

/**
 * Unit tests for the highlights command.
 *
 * These tests run in-process without spawning subprocesses (~1ms vs ~200ms each).
 * They test command structure, help text, and rely on shared validation unit tests.
 *
 * For subprocess integration tests, see highlights.integration.test.ts.
 * For live API tests, see highlights.live.test.ts.
 */

describe("highlights command structure", () => {
  const highlights = createHighlightsCommand();

  describe("command hierarchy", () => {
    test("has correct name and description", () => {
      expect(highlights.name()).toBe("highlights");
      expect(highlights.description()).toContain("highlights");
    });

    test("has list subcommand", () => {
      const list = highlights.commands.find((c) => c.name() === "list");
      expect(list).toBeDefined();
      expect(list?.description()).toContain("List highlights");
    });

    test("has get subcommand", () => {
      const get = highlights.commands.find((c) => c.name() === "get");
      expect(get).toBeDefined();
      expect(get?.description()).toContain("Get highlights");
    });
  });

  describe("help text", () => {
    test("highlights --help shows command description", () => {
      const help = highlights.helpInformation();
      expect(help).toContain("View highlights");
      expect(help).toContain("list");
      expect(help).toContain("get");
    });

    test("highlights list --help shows usage", () => {
      const list = highlights.commands.find((c) => c.name() === "list");
      const help = list?.helpInformation() ?? "";
      expect(help).toContain("List highlights");
      expect(help).toContain("--collection");
      expect(help).toContain("--limit");
      expect(help).toContain("--page");
    });

    test("highlights get --help shows usage", () => {
      const get = highlights.commands.find((c) => c.name() === "get");
      const help = get?.helpInformation() ?? "";
      expect(help).toContain("Get highlights for a specific bookmark");
      expect(help).toContain("bookmark-id");
    });
  });

  describe("list command options", () => {
    const list = highlights.commands.find((c) => c.name() === "list");

    test("has --collection option", () => {
      const opt = list?.options.find((o) => o.long === "--collection");
      expect(opt).toBeDefined();
      expect(opt?.short).toBe("-c");
    });

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
  });

  describe("get command arguments", () => {
    const get = highlights.commands.find((c) => c.name() === "get");

    test("requires bookmark-id argument", () => {
      // Commander stores arguments in _args array
      const args = get?.registeredArguments ?? [];
      expect(args.length).toBe(1);
      expect(args[0]?.name()).toBe("bookmark-id");
      expect(args[0]?.required).toBe(true);
    });
  });
});
