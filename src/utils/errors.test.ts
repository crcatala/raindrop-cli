import { describe, test, expect, spyOn, beforeEach, afterEach } from "bun:test";
import {
  RaindropCliError,
  ConfigError,
  ApiError,
  RateLimitError,
  TimeoutError,
  UsageError,
  handleError,
} from "./errors.js";

describe("RaindropCliError", () => {
  test("creates error with message and code", () => {
    const error = new RaindropCliError("test message", "TEST_CODE");
    expect(error.message).toBe("test message");
    expect(error.code).toBe("TEST_CODE");
    expect(error.name).toBe("RaindropCliError");
  });

  test("creates error with details", () => {
    const details = { key: "value", count: 42 };
    const error = new RaindropCliError("test", "CODE", details);
    expect(error.details).toEqual(details);
  });

  test("toJSON returns structured error object", () => {
    const error = new RaindropCliError("test message", "TEST_CODE", {
      extra: "data",
    });
    const json = error.toJSON();

    expect(json).toEqual({
      error: true,
      code: "TEST_CODE",
      message: "test message",
      details: { extra: "data" },
    });
  });

  test("is instanceof Error", () => {
    const error = new RaindropCliError("test", "CODE");
    expect(error instanceof Error).toBe(true);
  });
});

describe("ConfigError", () => {
  test("creates error with CONFIG_ERROR code", () => {
    const error = new ConfigError("config problem");
    expect(error.code).toBe("CONFIG_ERROR");
    expect(error.name).toBe("ConfigError");
    expect(error.message).toBe("config problem");
  });

  test("includes details in error", () => {
    const error = new ConfigError("missing file", { path: "/some/path" });
    expect(error.details).toEqual({ path: "/some/path" });
  });

  test("is instanceof RaindropCliError", () => {
    const error = new ConfigError("test");
    expect(error instanceof RaindropCliError).toBe(true);
  });
});

describe("UsageError", () => {
  test("uses exit code 2", () => {
    const error = new UsageError("bad input");
    expect(error.exitCode).toBe(2);
  });
});

describe("ApiError", () => {
  test("creates error with API_ERROR code", () => {
    const error = new ApiError("api failed");
    expect(error.code).toBe("API_ERROR");
    expect(error.name).toBe("ApiError");
    expect(error.message).toBe("api failed");
  });

  test("includes status code", () => {
    const error = new ApiError("not found", 404);
    expect(error.statusCode).toBe(404);
    expect(error.details).toEqual({ statusCode: 404 });
  });

  test("includes additional details with status code", () => {
    const error = new ApiError("error", 500, { endpoint: "/api/test" });
    expect(error.details).toEqual({ statusCode: 500, endpoint: "/api/test" });
  });

  test("is instanceof RaindropCliError", () => {
    const error = new ApiError("test");
    expect(error instanceof RaindropCliError).toBe(true);
  });
});

describe("RateLimitError", () => {
  test("creates error with RATE_LIMITED code", () => {
    const resetTime = Math.floor(Date.now() / 1000) + 3600;
    const error = new RateLimitError(100, resetTime);

    expect(error.code).toBe("RATE_LIMITED");
    expect(error.name).toBe("RateLimitError");
    expect(error.limit).toBe(100);
    expect(error.resetTime).toBe(resetTime);
  });

  test("includes limit and reset in details", () => {
    const resetTime = 1234567890;
    const error = new RateLimitError(50, resetTime);

    expect(error.details).toEqual({ limit: 50, reset: resetTime });
  });

  test("message includes retry guidance", () => {
    const resetTime = 1234567890;
    const error = new RateLimitError(100, resetTime);

    expect(error.message).toContain("Rate limited by Raindrop API");
    expect(error.message).toContain("retrying");
  });

  test("is instanceof RaindropCliError", () => {
    const error = new RateLimitError(100, 123);
    expect(error instanceof RaindropCliError).toBe(true);
  });
});

describe("TimeoutError", () => {
  test("creates error with TIMEOUT code", () => {
    const error = new TimeoutError(30);

    expect(error.code).toBe("TIMEOUT");
    expect(error.name).toBe("TimeoutError");
    expect(error.timeoutSeconds).toBe(30);
  });

  test("includes timeout in details", () => {
    const error = new TimeoutError(60, { url: "/api/test" });

    expect(error.details).toEqual({ timeoutSeconds: 60, url: "/api/test" });
  });

  test("message includes timeout value and guidance", () => {
    const error = new TimeoutError(30);

    expect(error.message).toContain("30 seconds");
    expect(error.message).toContain("--timeout");
  });

  test("is instanceof RaindropCliError", () => {
    const error = new TimeoutError(30);
    expect(error instanceof RaindropCliError).toBe(true);
  });
});

describe("handleError", () => {
  let stderrSpy: ReturnType<typeof spyOn>;
  let exitSpy: ReturnType<typeof spyOn>;
  let originalFormat: string | undefined;

  beforeEach(() => {
    stderrSpy = spyOn(process.stderr, "write").mockImplementation(() => true);
    exitSpy = spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
    originalFormat = process.env["RDCLI_FORMAT"];
    delete process.env["RDCLI_FORMAT"];
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    exitSpy.mockRestore();
    if (originalFormat !== undefined) {
      process.env["RDCLI_FORMAT"] = originalFormat;
    } else {
      delete process.env["RDCLI_FORMAT"];
    }
  });

  test("outputs error message for RaindropCliError", () => {
    const error = new RaindropCliError("test error", "TEST");

    expect(() => handleError(error)).toThrow("process.exit called");
    expect(stderrSpy).toHaveBeenCalledWith("test error\n");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test("outputs JSON for RaindropCliError when RDCLI_FORMAT is json", () => {
    process.env["RDCLI_FORMAT"] = "json";
    const error = new RaindropCliError("test error", "TEST", { key: "value" });

    expect(() => handleError(error)).toThrow("process.exit called");

    // Check that JSON was written
    const calls = stderrSpy.mock.calls;
    const output = calls[0]?.[0] as string;
    expect(output).toContain('"error": true');
    expect(output).toContain('"code": "TEST"');
  });

  test("outputs details when debug is true", () => {
    const error = new RaindropCliError("test", "TEST", { debug: "info" });

    expect(() => handleError(error, true)).toThrow("process.exit called");

    // Should have two calls - error message and details
    expect(stderrSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  test("handles regular Error", () => {
    const error = new Error("regular error");

    expect(() => handleError(error)).toThrow("process.exit called");
    expect(stderrSpy).toHaveBeenCalledWith("regular error\n");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test("outputs stack trace for regular Error when debug is true", () => {
    const error = new Error("regular error");
    error.stack = "Error: regular error\n    at test.ts:1:1";

    expect(() => handleError(error, true)).toThrow("process.exit called");

    // Should output stack trace
    const calls = stderrSpy.mock.calls as unknown[][];
    const hasStack = calls.some(
      (call: unknown[]) => typeof call[0] === "string" && call[0].includes("at test.ts")
    );
    expect(hasStack).toBe(true);
  });

  test("handles unknown error type", () => {
    expect(() => handleError("string error")).toThrow("process.exit called");
    expect(stderrSpy).toHaveBeenCalledWith(
      "An unexpected error occurred. Run with --debug for details.\n"
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test("handles null/undefined error", () => {
    expect(() => handleError(null)).toThrow("process.exit called");
    expect(stderrSpy).toHaveBeenCalledWith(
      "An unexpected error occurred. Run with --debug for details.\n"
    );
  });
});
