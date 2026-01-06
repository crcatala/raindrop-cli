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
  });

  describe("help text", () => {
    test("trash --help shows command description", () => {
      const help = trash.helpInformation();
      expect(help).toContain("Manage trash");
      expect(help).toContain("empty");
    });

    test("trash empty --help shows usage", () => {
      const empty = trash.commands.find((c) => c.name() === "empty");
      const help = empty?.helpInformation() ?? "";
      expect(help).toContain("Permanently delete all items in trash");
      expect(help).toContain("--force");
      expect(help).toContain("--dry-run");
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
});
