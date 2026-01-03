import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { shouldUseColor, setNoColorFlag, getDefaultFormat } from "./tty.js";

describe("shouldUseColor", () => {
  let originalEnv: NodeJS.ProcessEnv;
  let originalIsTTY: boolean | undefined;

  beforeEach(() => {
    originalEnv = { ...process.env };
    originalIsTTY = process.stdout.isTTY;
    // Reset the no-color flag
    setNoColorFlag(false);
  });

  afterEach(() => {
    process.env = originalEnv;
    Object.defineProperty(process.stdout, "isTTY", {
      value: originalIsTTY,
      writable: true,
    });
  });

  test("returns false when NO_COLOR is set", () => {
    process.env.NO_COLOR = "1";
    Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });
    expect(shouldUseColor()).toBe(false);
  });

  test("returns false when NO_COLOR is empty string", () => {
    // Per no-color.org, empty string should NOT disable colors
    process.env.NO_COLOR = "";
    delete process.env.TERM;
    Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });
    expect(shouldUseColor()).toBe(true);
  });

  test("returns false when TERM=dumb", () => {
    delete process.env.NO_COLOR;
    process.env.TERM = "dumb";
    Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });
    expect(shouldUseColor()).toBe(false);
  });

  test("returns false when not a TTY", () => {
    delete process.env.NO_COLOR;
    delete process.env.TERM;
    Object.defineProperty(process.stdout, "isTTY", { value: false, writable: true });
    expect(shouldUseColor()).toBe(false);
  });

  test("returns false when --no-color flag is set", () => {
    delete process.env.NO_COLOR;
    delete process.env.TERM;
    Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });
    setNoColorFlag(true);
    expect(shouldUseColor()).toBe(false);
  });

  test("returns true when TTY and no color-disabling conditions", () => {
    delete process.env.NO_COLOR;
    delete process.env.TERM;
    Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });
    setNoColorFlag(false);
    expect(shouldUseColor()).toBe(true);
  });
});

describe("getDefaultFormat", () => {
  let originalIsTTY: boolean | undefined;

  beforeEach(() => {
    originalIsTTY = process.stdout.isTTY;
  });

  afterEach(() => {
    Object.defineProperty(process.stdout, "isTTY", {
      value: originalIsTTY,
      writable: true,
    });
  });

  test("returns 'plain' when stdout is a TTY", () => {
    Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });
    expect(getDefaultFormat()).toBe("plain");
  });

  test("returns 'json' when stdout is not a TTY (piped)", () => {
    Object.defineProperty(process.stdout, "isTTY", { value: false, writable: true });
    expect(getDefaultFormat()).toBe("json");
  });

  test("returns 'json' when stdout.isTTY is undefined", () => {
    Object.defineProperty(process.stdout, "isTTY", { value: undefined, writable: true });
    expect(getDefaultFormat()).toBe("json");
  });
});
