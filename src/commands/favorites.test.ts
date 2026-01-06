import { describe, test, expect } from "bun:test";
import { createFavoritesCommand } from "./favorites.js";

describe("favorites command structure", () => {
  const favorites = createFavoritesCommand();

  test("has correct name and description", () => {
    expect(favorites.name()).toBe("favorites");
    expect(favorites.description()).toContain("favorite");
  });

  test("has list subcommand with ls alias", () => {
    const list = favorites.commands.find((c) => c.name() === "list");
    expect(list).toBeDefined();
    expect(list?.aliases()).toContain("ls");
  });

  describe("help text", () => {
    test("favorites list --help shows usage", () => {
      const list = favorites.commands.find((c) => c.name() === "list");
      const help = list?.helpInformation() ?? "";
      expect(help).toContain("--limit");
      expect(help).toContain("--page");
      expect(help).toContain("--sort");
      expect(help).toContain("--search");
      expect(help).toContain("--format");
    });
  });

  describe("list command options", () => {
    const list = favorites.commands.find((c) => c.name() === "list");

    test("has limit option with default", () => {
      const opt = list?.options.find((o) => o.long === "--limit");
      expect(opt).toBeDefined();
      expect(opt?.defaultValue).toBe("25");
    });

    test("has page option with default", () => {
      const opt = list?.options.find((o) => o.long === "--page");
      expect(opt).toBeDefined();
      expect(opt?.defaultValue).toBe("0");
    });

    test("has sort option with default", () => {
      const opt = list?.options.find((o) => o.long === "--sort");
      expect(opt).toBeDefined();
      expect(opt?.defaultValue).toBe("-created");
    });

    test("has search option for filtering", () => {
      const opt = list?.options.find((o) => o.long === "--search");
      expect(opt).toBeDefined();
    });

    test("accepts optional collection argument", () => {
      const args = list?.registeredArguments ?? [];
      expect(args.length).toBe(1);
      expect(args[0]?.name()).toBe("collection");
      expect(args[0]?.required).toBe(false);
    });
  });
});
