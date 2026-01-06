import { describe, test, expect } from "bun:test";
import { createTrashCommand } from "./trash.js";

/**
 * Unit tests for the trash command.
 *
 * These tests run in-process without spawning subprocesses (~1ms vs ~200ms each).
 * They test command structure, help text, and options/arguments.
 *
 * For subprocess integration tests, see trash.integration.test.ts.
 */

describe("trash command structure", () => {
  const trash = createTrashCommand();

  describe("command hierarchy", () => {
    test("has correct name and description", () => {
      expect(trash.name()).toBe("trash");
      expect(trash.description()).toContain("Manage trash");
    });

    test("has empty subcommand", () => {
      const empty = trash.commands.find((c) => c.name() === "empty");
      expect(empty).toBeDefined();
      expect(empty?.description()).toContain("Permanently delete all items in trash");
    });

    test("has list subcommand", () => {
      const list = trash.commands.find((c) => c.name() === "list");
      expect(list).toBeDefined();
      expect(list?.description()).toContain("List items in trash");
    });

    test("list has ls alias", () => {
      const list = trash.commands.find((c) => c.name() === "list");
      expect(list?.aliases()).toContain("ls");
    });
  });

  describe("help text", () => {
    test("trash --help shows command description", () => {
      const help = trash.helpInformation();
      expect(help).toContain("Manage trash");
      expect(help).toContain("empty");
      expect(help).toContain("list");
    });

    test("trash empty --help shows usage", () => {
      const empty = trash.commands.find((c) => c.name() === "empty");
      const help = empty?.helpInformation() ?? "";
      expect(help).toContain("Permanently delete all items in trash");
      expect(help).toContain("--force");
      expect(help).toContain("--dry-run");
    });

    test("trash list --help shows usage", () => {
      const list = trash.commands.find((c) => c.name() === "list");
      const help = list?.helpInformation() ?? "";
      expect(help).toContain("List items in trash");
      expect(help).toContain("--limit");
      expect(help).toContain("--page");
      expect(help).toContain("--sort");
      expect(help).toContain("--search");
    });
  });

  describe("empty command options", () => {
    const empty = trash.commands.find((c) => c.name() === "empty");

    test("has --force option", () => {
      const opt = empty?.options.find((o) => o.long === "--force");
      expect(opt).toBeDefined();
      expect(opt?.short).toBe("-f");
    });

    test("has --dry-run option", () => {
      const opt = empty?.options.find((o) => o.long === "--dry-run");
      expect(opt).toBeDefined();
      expect(opt?.short).toBe("-n");
    });
  });

  describe("list command options", () => {
    const list = trash.commands.find((c) => c.name() === "list");

    test("has --limit option with default", () => {
      const opt = list?.options.find((o) => o.long === "--limit");
      expect(opt).toBeDefined();
      expect(opt?.short).toBe("-l");
      expect(opt?.defaultValue).toBe("25");
    });

    test("has --page option with default", () => {
      const opt = list?.options.find((o) => o.long === "--page");
      expect(opt).toBeDefined();
      expect(opt?.short).toBe("-p");
      expect(opt?.defaultValue).toBe("0");
    });

    test("has --sort option with default", () => {
      const opt = list?.options.find((o) => o.long === "--sort");
      expect(opt).toBeDefined();
      expect(opt?.defaultValue).toBe("-created");
    });

    test("has --search option with -s short flag", () => {
      const opt = list?.options.find((o) => o.long === "--search");
      expect(opt).toBeDefined();
      expect(opt?.short).toBe("-s");
    });
  });
});
