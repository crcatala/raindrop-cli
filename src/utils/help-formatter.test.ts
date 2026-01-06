import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { StyledHelp } from "./help-formatter.js";
import { setNoColorFlag } from "./tty.js";

describe("StyledHelp", () => {
  let originalEnv: NodeJS.ProcessEnv;
  let originalIsTTY: boolean | undefined;
  let help: StyledHelp;

  beforeEach(() => {
    originalEnv = { ...process.env };
    originalIsTTY = process.stdout.isTTY;
    // Enable colors for testing
    delete process.env.NO_COLOR;
    delete process.env.TERM;
    Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });
    setNoColorFlag(false);
    help = new StyledHelp();
  });

  afterEach(() => {
    process.env = originalEnv;
    Object.defineProperty(process.stdout, "isTTY", {
      value: originalIsTTY,
      writable: true,
    });
    setNoColorFlag(false);
  });

  describe("styleUsage", () => {
    test("styles command names cyan", () => {
      const result = help.styleUsage("rd bookmarks list");
      expect(result).toContain("\x1b[36m"); // cyan
      expect(result).toContain("rd");
      expect(result).toContain("bookmarks");
      expect(result).toContain("list");
    });

    test("styles [options] dim", () => {
      const result = help.styleUsage("rd [options] [command]");
      // [options] should be dim
      expect(result).toContain("\x1b[2m"); // dim
      expect(result).toContain("[options]");
      // [command] should be dim
      expect(result).toContain("[command]");
    });

    test("styles optional arguments dim", () => {
      const result = help.styleUsage("rd bookmarks list [collection-id]");
      expect(result).toContain("\x1b[2m"); // dim for [collection-id]
      expect(result).toContain("[collection-id]");
    });

    test("styles required arguments dim", () => {
      const result = help.styleUsage("rd bookmarks show <id>");
      expect(result).toContain("\x1b[2m"); // dim for <id>
      expect(result).toContain("<id>");
    });

    test("handles command aliases", () => {
      const result = help.styleUsage("rd bookmarks list|ls [options]");
      expect(result).toContain("\x1b[36m"); // cyan for list|ls
      expect(result).toContain("list|ls");
    });

    test("returns plain text when colors disabled", () => {
      setNoColorFlag(true);
      const result = help.styleUsage("rd [options] [command]");
      expect(result).toBe("rd [options] [command]");
    });
  });

  describe("styleTitle", () => {
    test("makes section headers bold", () => {
      const result = help.styleTitle("Options:");
      expect(result).toContain("\x1b[1m"); // bold
      expect(result).toContain("Options:");
    });

    test("returns plain text when colors disabled", () => {
      setNoColorFlag(true);
      const result = help.styleTitle("Options:");
      expect(result).toBe("Options:");
      expect(result).not.toContain("\x1b[");
    });
  });

  describe("styleCommandText", () => {
    test("makes command names cyan", () => {
      const result = help.styleCommandText("bookmarks");
      expect(result).toContain("\x1b[36m"); // cyan
      expect(result).toContain("bookmarks");
    });

    test("returns plain text when colors disabled", () => {
      setNoColorFlag(true);
      const result = help.styleCommandText("bookmarks");
      expect(result).toBe("bookmarks");
    });
  });

  describe("styleOptionText", () => {
    test("makes simple flags yellow", () => {
      const result = help.styleOptionText("-h, --help");
      expect(result).toContain("\x1b[33m"); // yellow
      expect(result).toContain("-h, --help");
    });

    test("splits flag and argument - flag yellow, arg dim", () => {
      const result = help.styleOptionText("--format <format>");
      // Should have yellow for --format
      expect(result).toContain("\x1b[33m");
      expect(result).toContain("--format");
      // Should have dim for <format>
      expect(result).toContain("\x1b[2m"); // dim
      expect(result).toContain("<format>");
    });

    test("handles complex flag with argument", () => {
      const result = help.styleOptionText("-t, --timeout <seconds>");
      expect(result).toContain("\x1b[33m"); // yellow for flags
      expect(result).toContain("-t, --timeout");
      expect(result).toContain("\x1b[2m"); // dim for arg
      expect(result).toContain("<seconds>");
    });

    test("handles optional argument syntax", () => {
      const result = help.styleOptionText("--collection [id]");
      expect(result).toContain("\x1b[33m"); // yellow for flag
      expect(result).toContain("--collection");
      expect(result).toContain("\x1b[2m"); // dim for optional arg
      expect(result).toContain("[id]");
    });

    test("returns plain text when colors disabled", () => {
      setNoColorFlag(true);
      const result = help.styleOptionText("--format <format>");
      expect(result).toBe("--format <format>");
    });
  });

  describe("styleSubcommandText", () => {
    test("makes subcommand names cyan", () => {
      const result = help.styleSubcommandText("list");
      expect(result).toContain("\x1b[36m"); // cyan
      expect(result).toContain("list");
    });

    test("returns plain text when colors disabled", () => {
      setNoColorFlag(true);
      const result = help.styleSubcommandText("list");
      expect(result).toBe("list");
    });
  });

  describe("styleArgumentText", () => {
    test("makes arguments dim", () => {
      const result = help.styleArgumentText("<id>");
      expect(result).toContain("\x1b[2m"); // dim
      expect(result).toContain("<id>");
    });

    test("returns plain text when colors disabled", () => {
      setNoColorFlag(true);
      const result = help.styleArgumentText("<id>");
      expect(result).toBe("<id>");
    });
  });

  describe("styleOptionDescription", () => {
    test("dims (default: ...) metadata", () => {
      const result = help.styleOptionDescription("Some description (default: 25)");
      expect(result).toContain("\x1b[2m"); // dim
      expect(result).toContain("(default: 25)");
      expect(result).toContain("Some description");
    });

    test("dims (choices: ...) metadata", () => {
      const result = help.styleOptionDescription('Output format (choices: "json", "table")');
      expect(result).toContain("\x1b[2m"); // dim
      expect(result).toContain('(choices: "json", "table")');
    });

    test("dims (alias: ...) metadata", () => {
      const result = help.styleOptionDescription("Delete a bookmark (alias: rm)");
      expect(result).toContain("\x1b[2m"); // dim
      expect(result).toContain("(alias: rm)");
    });

    test("dims (shortcut for: ...) metadata", () => {
      const result = help.styleOptionDescription("List bookmarks (shortcut for: bookmarks list)");
      expect(result).toContain("\x1b[2m"); // dim
      expect(result).toContain("(shortcut for: bookmarks list)");
    });

    test("returns plain text when colors disabled", () => {
      setNoColorFlag(true);
      const result = help.styleOptionDescription("Some description (default: 25)");
      expect(result).toBe("Some description (default: 25)");
    });
  });

  describe("styleSubcommandDescription", () => {
    test("dims alias metadata in subcommand descriptions", () => {
      const result = help.styleSubcommandDescription("List bookmarks (alias: ls)");
      expect(result).toContain("\x1b[2m"); // dim
      expect(result).toContain("(alias: ls)");
    });
  });

  describe("formatItemList", () => {
    test("adds blank line after heading", () => {
      const items = ["  item1", "  item2"];
      const result = help.formatItemList("Options:", items, help);
      // Should be: [styled heading, "", item1, item2, ""]
      expect(result.length).toBe(5);
      expect(result[0]).toContain("Options:");
      expect(result[1]).toBe(""); // blank line after heading
      expect(result[2]).toBe("  item1");
      expect(result[3]).toBe("  item2");
      expect(result[4]).toBe(""); // blank line after items
    });

    test("returns empty array for empty items", () => {
      const result = help.formatItemList("Options:", [], help);
      expect(result).toEqual([]);
    });

    test("styles the heading", () => {
      const items = ["  item1"];
      const result = help.formatItemList("Commands:", items, help);
      expect(result[0]).toContain("\x1b[1m"); // bold
      expect(result[0]).toContain("Commands:");
    });
  });
});

describe("StyledHelp with NO_COLOR environment", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test("respects NO_COLOR environment variable", () => {
    process.env.NO_COLOR = "1";
    Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });

    const help = new StyledHelp();
    expect(help.styleTitle("Options:")).toBe("Options:");
    expect(help.styleCommandText("bookmarks")).toBe("bookmarks");
    expect(help.styleOptionText("--help")).toBe("--help");
  });

  test("respects TERM=dumb", () => {
    delete process.env.NO_COLOR;
    process.env.TERM = "dumb";
    Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });

    const help = new StyledHelp();
    expect(help.styleTitle("Options:")).toBe("Options:");
  });
});
