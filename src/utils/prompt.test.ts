import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { isStdinTTY, confirmAction, NonInteractiveError } from "./prompt.js";
import { UsageError } from "./errors.js";
import readline from "node:readline";

describe("isStdinTTY", () => {
  let originalIsTTY: boolean | undefined;

  beforeEach(() => {
    originalIsTTY = process.stdin.isTTY;
  });

  afterEach(() => {
    Object.defineProperty(process.stdin, "isTTY", {
      value: originalIsTTY,
      writable: true,
    });
  });

  test("returns true when stdin is a TTY", () => {
    Object.defineProperty(process.stdin, "isTTY", { value: true, writable: true });
    expect(isStdinTTY()).toBe(true);
  });

  test("returns false when stdin is not a TTY", () => {
    Object.defineProperty(process.stdin, "isTTY", { value: false, writable: true });
    expect(isStdinTTY()).toBe(false);
  });

  test("returns false when stdin.isTTY is undefined", () => {
    Object.defineProperty(process.stdin, "isTTY", { value: undefined, writable: true });
    expect(isStdinTTY()).toBe(false);
  });
});

describe("confirmAction", () => {
  let originalIsTTY: boolean | undefined;

  beforeEach(() => {
    originalIsTTY = process.stdin.isTTY;
  });

  afterEach(() => {
    Object.defineProperty(process.stdin, "isTTY", {
      value: originalIsTTY,
      writable: true,
    });
  });

  test("throws NonInteractiveError when stdin is not a TTY", async () => {
    Object.defineProperty(process.stdin, "isTTY", { value: false, writable: true });

    await expect(confirmAction("Are you sure?")).rejects.toThrow(NonInteractiveError);
    await expect(confirmAction("Are you sure?")).rejects.toThrow(
      "Cannot prompt for confirmation in non-interactive mode. Use --force to skip confirmation."
    );
  });

  test("throws NonInteractiveError when stdin.isTTY is undefined", async () => {
    Object.defineProperty(process.stdin, "isTTY", { value: undefined, writable: true });

    await expect(confirmAction("Are you sure?")).rejects.toThrow(NonInteractiveError);
  });

  describe("with mock readline", () => {
    function createMockReadline(answer: string | null) {
      const closeHandlers: Array<() => void> = [];
      let questionCallback: ((answer: string) => void) | null = null;

      const mockRl = {
        on: (event: string, handler: () => void) => {
          if (event === "close") {
            closeHandlers.push(handler);
          }
          return mockRl;
        },
        question: (_prompt: string, callback: (answer: string) => void) => {
          questionCallback = callback;
          // Simulate async response
          setTimeout(() => {
            if (answer !== null && questionCallback) {
              questionCallback(answer);
            } else {
              // Simulate EOF (Ctrl+D) - just trigger close without answering
              closeHandlers.forEach((h) => h());
            }
          }, 0);
        },
        close: () => {
          closeHandlers.forEach((h) => h());
        },
      };

      return mockRl as unknown as readline.Interface;
    }

    test("returns true when user enters 'y'", async () => {
      const mockRl = createMockReadline("y");
      const result = await confirmAction("Continue?", { rl: mockRl, skipTTYCheck: true });
      expect(result).toBe(true);
    });

    test("returns true when user enters 'Y'", async () => {
      const mockRl = createMockReadline("Y");
      const result = await confirmAction("Continue?", { rl: mockRl, skipTTYCheck: true });
      expect(result).toBe(true);
    });

    test("returns true when user enters 'yes'", async () => {
      const mockRl = createMockReadline("yes");
      const result = await confirmAction("Continue?", { rl: mockRl, skipTTYCheck: true });
      expect(result).toBe(true);
    });

    test("returns true when user enters 'YES'", async () => {
      const mockRl = createMockReadline("YES");
      const result = await confirmAction("Continue?", { rl: mockRl, skipTTYCheck: true });
      expect(result).toBe(true);
    });

    test("returns true when user enters '  y  ' (with whitespace)", async () => {
      const mockRl = createMockReadline("  y  ");
      const result = await confirmAction("Continue?", { rl: mockRl, skipTTYCheck: true });
      expect(result).toBe(true);
    });

    test("returns false when user enters 'n'", async () => {
      const mockRl = createMockReadline("n");
      const result = await confirmAction("Continue?", { rl: mockRl, skipTTYCheck: true });
      expect(result).toBe(false);
    });

    test("returns false when user enters 'no'", async () => {
      const mockRl = createMockReadline("no");
      const result = await confirmAction("Continue?", { rl: mockRl, skipTTYCheck: true });
      expect(result).toBe(false);
    });

    test("returns false when user enters empty string", async () => {
      const mockRl = createMockReadline("");
      const result = await confirmAction("Continue?", { rl: mockRl, skipTTYCheck: true });
      expect(result).toBe(false);
    });

    test("returns false when user enters random text", async () => {
      const mockRl = createMockReadline("maybe");
      const result = await confirmAction("Continue?", { rl: mockRl, skipTTYCheck: true });
      expect(result).toBe(false);
    });

    test("returns false on EOF (Ctrl+D)", async () => {
      const mockRl = createMockReadline(null); // null simulates EOF
      const result = await confirmAction("Continue?", { rl: mockRl, skipTTYCheck: true });
      expect(result).toBe(false);
    });
  });
});

describe("NonInteractiveError", () => {
  test("has correct name", () => {
    const error = new NonInteractiveError("test message");
    expect(error.name).toBe("NonInteractiveError");
  });

  test("has correct message", () => {
    const error = new NonInteractiveError("test message");
    expect(error.message).toBe("test message");
  });

  test("is instanceof Error", () => {
    const error = new NonInteractiveError("test message");
    expect(error instanceof Error).toBe(true);
  });

  test("extends UsageError", () => {
    const error = new NonInteractiveError("test message");
    expect(error instanceof UsageError).toBe(true);
  });

  test("has exitCode 2 (same as UsageError)", () => {
    const error = new NonInteractiveError("test message");
    expect(error.exitCode).toBe(2);
  });
});
