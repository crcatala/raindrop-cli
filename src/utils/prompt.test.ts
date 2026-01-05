import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { isStdinTTY, confirmAction, NonInteractiveError } from "./prompt.js";

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
});
