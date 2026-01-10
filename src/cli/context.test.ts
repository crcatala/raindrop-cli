import { describe, expect, it } from "bun:test";
import { createContext } from "./context.js";

describe("createContext", () => {
  describe("format detection from argv", () => {
    it("should detect --json format", () => {
      const ctx = createContext(["--json", "some-command"], {}, true);
      expect(ctx.output.format).toBe("json");
    });

    it("should detect --table format", () => {
      const ctx = createContext(["--table", "some-command"], {}, true);
      expect(ctx.output.format).toBe("table");
    });

    it("should detect --plain format", () => {
      const ctx = createContext(["--plain", "some-command"], {}, true);
      expect(ctx.output.format).toBe("plain");
    });

    it("should detect --tsv format", () => {
      const ctx = createContext(["--tsv", "some-command"], {}, true);
      expect(ctx.output.format).toBe("tsv");
    });

    it("should detect --format <value>", () => {
      const ctx = createContext(["--format", "json", "some-command"], {}, true);
      expect(ctx.output.format).toBe("json");
    });

    it("should return undefined format when not specified", () => {
      const ctx = createContext(["some-command"], {}, true);
      expect(ctx.output.format).toBeUndefined();
    });
  });

  describe("color handling", () => {
    it("should disable colors when NO_COLOR env is set", () => {
      const ctx = createContext([], { NO_COLOR: "1" }, true);
      expect(ctx.output.color).toBe(false);
      // Color functions should return plain text
      expect(ctx.colors.red("test")).toBe("test");
    });

    it("should disable colors when --no-color flag is passed", () => {
      const ctx = createContext(["--no-color"], {}, true);
      expect(ctx.output.color).toBe(false);
      expect(ctx.colors.green("test")).toBe("test");
    });

    it("should disable colors when isTty is false", () => {
      const ctx = createContext([], {}, false);
      expect(ctx.output.color).toBe(false);
      expect(ctx.colors.bold("test")).toBe("test");
    });

    it("should enable colors when isTty is true and no color flags set", () => {
      const ctx = createContext([], {}, true);
      expect(ctx.output.color).toBe(true);
      // Color functions should apply ANSI codes
      expect(ctx.colors.red("test")).not.toBe("test");
      expect(ctx.colors.red("test")).toContain("test");
    });

    it("should use Unicode prefixes when color is enabled", () => {
      const ctx = createContext([], {}, true);
      expect(ctx.prefix.ok).toBe("✓ ");
      expect(ctx.prefix.warn).toBe("⚠ ");
      expect(ctx.prefix.err).toBe("✗ ");
      expect(ctx.prefix.info).toBe("ℹ ");
    });

    it("should use text prefixes when color is disabled", () => {
      const ctx = createContext(["--no-color"], {}, true);
      expect(ctx.prefix.ok).toBe("[OK] ");
      expect(ctx.prefix.warn).toBe("[WARN] ");
      expect(ctx.prefix.err).toBe("[ERR] ");
      expect(ctx.prefix.info).toBe("[INFO] ");
    });
  });

  describe("verbosity flags", () => {
    it("should set verbose when --verbose flag is passed", () => {
      const ctx = createContext(["--verbose"], {}, true);
      expect(ctx.output.verbose).toBe(true);
      expect(ctx.output.debug).toBe(false);
    });

    it("should set verbose when -v flag is passed", () => {
      const ctx = createContext(["-v"], {}, true);
      expect(ctx.output.verbose).toBe(true);
    });

    it("should set both debug and verbose when --debug flag is passed", () => {
      const ctx = createContext(["--debug"], {}, true);
      expect(ctx.output.debug).toBe(true);
      expect(ctx.output.verbose).toBe(true);
    });

    it("should set both debug and verbose when -d flag is passed", () => {
      const ctx = createContext(["-d"], {}, true);
      expect(ctx.output.debug).toBe(true);
      expect(ctx.output.verbose).toBe(true);
    });

    it("should set quiet when --quiet flag is passed", () => {
      const ctx = createContext(["--quiet"], {}, true);
      expect(ctx.output.quiet).toBe(true);
    });

    it("should set quiet when -q flag is passed", () => {
      const ctx = createContext(["-q"], {}, true);
      expect(ctx.output.quiet).toBe(true);
    });

    it("should default verbose, debug, and quiet to false", () => {
      const ctx = createContext([], {}, true);
      expect(ctx.output.verbose).toBe(false);
      expect(ctx.output.debug).toBe(false);
      expect(ctx.output.quiet).toBe(false);
    });
  });

  describe("isTty", () => {
    it("should store isTty value in context", () => {
      const ctxTty = createContext([], {}, true);
      expect(ctxTty.isTty).toBe(true);

      const ctxNoTty = createContext([], {}, false);
      expect(ctxNoTty.isTty).toBe(false);
    });
  });
});
