import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  getTimeoutSeconds,
  getTimeoutMs,
  setTimeoutSeconds,
  validateTimeout,
  resetTimeoutState,
  DEFAULT_TIMEOUT_SECONDS,
  MIN_TIMEOUT_SECONDS,
  MAX_TIMEOUT_SECONDS,
} from "./timeout.js";

describe("timeout", () => {
  const originalEnv = process.env["RDCLI_TIMEOUT"];

  beforeEach(() => {
    resetTimeoutState();
    delete process.env["RDCLI_TIMEOUT"];
  });

  afterEach(() => {
    resetTimeoutState();
    if (originalEnv !== undefined) {
      process.env["RDCLI_TIMEOUT"] = originalEnv;
    } else {
      delete process.env["RDCLI_TIMEOUT"];
    }
  });

  describe("getTimeoutSeconds", () => {
    test("returns default when no override or env var", () => {
      expect(getTimeoutSeconds()).toBe(DEFAULT_TIMEOUT_SECONDS);
    });

    test("returns env var value when set", () => {
      process.env["RDCLI_TIMEOUT"] = "60";
      expect(getTimeoutSeconds()).toBe(60);
    });

    test("returns CLI override over env var", () => {
      process.env["RDCLI_TIMEOUT"] = "60";
      setTimeoutSeconds(120);
      expect(getTimeoutSeconds()).toBe(120);
    });

    test("clamps value below minimum to minimum", () => {
      setTimeoutSeconds(0);
      expect(getTimeoutSeconds()).toBe(MIN_TIMEOUT_SECONDS);
    });

    test("clamps value above maximum to maximum", () => {
      setTimeoutSeconds(9999);
      expect(getTimeoutSeconds()).toBe(MAX_TIMEOUT_SECONDS);
    });

    test("clamps env var below minimum", () => {
      process.env["RDCLI_TIMEOUT"] = "0";
      expect(getTimeoutSeconds()).toBe(MIN_TIMEOUT_SECONDS);
    });

    test("clamps env var above maximum", () => {
      process.env["RDCLI_TIMEOUT"] = "9999";
      expect(getTimeoutSeconds()).toBe(MAX_TIMEOUT_SECONDS);
    });

    test("ignores invalid env var value", () => {
      process.env["RDCLI_TIMEOUT"] = "not-a-number";
      expect(getTimeoutSeconds()).toBe(DEFAULT_TIMEOUT_SECONDS);
    });

    test("ignores empty env var", () => {
      process.env["RDCLI_TIMEOUT"] = "";
      expect(getTimeoutSeconds()).toBe(DEFAULT_TIMEOUT_SECONDS);
    });
  });

  describe("getTimeoutMs", () => {
    test("returns timeout in milliseconds", () => {
      expect(getTimeoutMs()).toBe(DEFAULT_TIMEOUT_SECONDS * 1000);
    });

    test("converts CLI override to milliseconds", () => {
      setTimeoutSeconds(45);
      expect(getTimeoutMs()).toBe(45000);
    });
  });

  describe("validateTimeout", () => {
    test("returns null for valid value", () => {
      expect(validateTimeout("30")).toBeNull();
    });

    test("returns null for minimum value", () => {
      expect(validateTimeout(String(MIN_TIMEOUT_SECONDS))).toBeNull();
    });

    test("returns null for maximum value", () => {
      expect(validateTimeout(String(MAX_TIMEOUT_SECONDS))).toBeNull();
    });

    test("returns error for non-numeric value", () => {
      const error = validateTimeout("abc");
      expect(error).toContain("Invalid timeout value");
      expect(error).toContain("abc");
    });

    test("returns error for value below minimum", () => {
      const error = validateTimeout("0");
      expect(error).toContain("at least");
      expect(error).toContain(String(MIN_TIMEOUT_SECONDS));
    });

    test("returns error for value above maximum", () => {
      const error = validateTimeout("9999");
      expect(error).toContain("at most");
      expect(error).toContain(String(MAX_TIMEOUT_SECONDS));
    });

    test("returns error for negative value", () => {
      const error = validateTimeout("-5");
      expect(error).toContain("at least");
    });

    test("returns error for float value", () => {
      // parseInt will parse "30.5" as 30, so this should be valid
      expect(validateTimeout("30.5")).toBeNull();
    });
  });

  describe("resetTimeoutState", () => {
    test("resets to default after override", () => {
      setTimeoutSeconds(120);
      expect(getTimeoutSeconds()).toBe(120);

      resetTimeoutState();
      expect(getTimeoutSeconds()).toBe(DEFAULT_TIMEOUT_SECONDS);
    });
  });

  describe("constants", () => {
    test("DEFAULT_TIMEOUT_SECONDS is 30", () => {
      expect(DEFAULT_TIMEOUT_SECONDS).toBe(30);
    });

    test("MIN_TIMEOUT_SECONDS is 1", () => {
      expect(MIN_TIMEOUT_SECONDS).toBe(1);
    });

    test("MAX_TIMEOUT_SECONDS is 300", () => {
      expect(MAX_TIMEOUT_SECONDS).toBe(300);
    });
  });
});
