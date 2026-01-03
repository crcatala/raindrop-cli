import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { colors, getColors } from "./colors.js";
import { setNoColorFlag } from "./tty.js";

describe("colors", () => {
  let originalEnv: NodeJS.ProcessEnv;
  let originalIsTTY: boolean | undefined;

  beforeEach(() => {
    originalEnv = { ...process.env };
    originalIsTTY = process.stdout.isTTY;
    setNoColorFlag(false);
  });

  afterEach(() => {
    process.env = originalEnv;
    Object.defineProperty(process.stdout, "isTTY", {
      value: originalIsTTY,
      writable: true,
    });
  });

  test("returns plain text when NO_COLOR is set", () => {
    process.env.NO_COLOR = "1";
    Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });

    const c = getColors();
    expect(c.red("test")).toBe("test");
    expect(c.bold("test")).toBe("test");
    expect(c.green("test")).toBe("test");
  });

  test("returns colored text when colors are enabled", () => {
    delete process.env.NO_COLOR;
    delete process.env.TERM;
    Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });

    const c = getColors();
    // picocolors adds ANSI escape codes
    expect(c.red("test")).toContain("\x1b[");
    expect(c.red("test")).toContain("test");
  });

  test("proxy object works correctly", () => {
    process.env.NO_COLOR = "1";
    Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });

    // colors proxy should respect shouldUseColor() dynamically
    expect(colors.red("test")).toBe("test");
  });

  test("respects --no-color flag", () => {
    delete process.env.NO_COLOR;
    delete process.env.TERM;
    Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });
    setNoColorFlag(true);

    const c = getColors();
    expect(c.red("test")).toBe("test");
  });
});
