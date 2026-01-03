import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import type { AxiosError } from "axios";
import {
  isRetryableError,
  calculateBackoff,
  extractRateLimitInfo,
  MAX_RETRIES,
  INITIAL_DELAY_MS,
  MAX_DELAY_MS,
} from "./axios-interceptors.js";
import { resetDebugState } from "./debug.js";

describe("axios-interceptors", () => {
  beforeEach(() => {
    resetDebugState();
  });

  afterEach(() => {
    resetDebugState();
  });

  describe("isRetryableError", () => {
    test("returns true for network errors (no response)", () => {
      const error = { response: undefined } as AxiosError;
      expect(isRetryableError(error)).toBe(true);
    });

    test("returns true for 500 server error", () => {
      const error = { response: { status: 500 } } as AxiosError;
      expect(isRetryableError(error)).toBe(true);
    });

    test("returns true for 502 bad gateway", () => {
      const error = { response: { status: 502 } } as AxiosError;
      expect(isRetryableError(error)).toBe(true);
    });

    test("returns true for 503 service unavailable", () => {
      const error = { response: { status: 503 } } as AxiosError;
      expect(isRetryableError(error)).toBe(true);
    });

    test("returns true for 504 gateway timeout", () => {
      const error = { response: { status: 504 } } as AxiosError;
      expect(isRetryableError(error)).toBe(true);
    });

    test("returns true for 408 request timeout", () => {
      const error = { response: { status: 408 } } as AxiosError;
      expect(isRetryableError(error)).toBe(true);
    });

    test("returns false for 429 rate limit (handled separately)", () => {
      const error = { response: { status: 429 } } as AxiosError;
      expect(isRetryableError(error)).toBe(false);
    });

    test("returns false for 400 bad request", () => {
      const error = { response: { status: 400 } } as AxiosError;
      expect(isRetryableError(error)).toBe(false);
    });

    test("returns false for 401 unauthorized", () => {
      const error = { response: { status: 401 } } as AxiosError;
      expect(isRetryableError(error)).toBe(false);
    });

    test("returns false for 403 forbidden", () => {
      const error = { response: { status: 403 } } as AxiosError;
      expect(isRetryableError(error)).toBe(false);
    });

    test("returns false for 404 not found", () => {
      const error = { response: { status: 404 } } as AxiosError;
      expect(isRetryableError(error)).toBe(false);
    });

    test("returns false for 422 unprocessable entity", () => {
      const error = { response: { status: 422 } } as AxiosError;
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe("calculateBackoff", () => {
    test("first retry has base delay around 1000ms", () => {
      const delay = calculateBackoff(0);
      // Base is 1000ms, with up to 25% jitter = 1000-1250ms
      expect(delay).toBeGreaterThanOrEqual(INITIAL_DELAY_MS);
      expect(delay).toBeLessThanOrEqual(INITIAL_DELAY_MS * 1.25);
    });

    test("second retry doubles the delay", () => {
      const delay = calculateBackoff(1);
      // 2000ms base + jitter (up to 500ms)
      expect(delay).toBeGreaterThanOrEqual(2000);
      expect(delay).toBeLessThanOrEqual(2500);
    });

    test("third retry quadruples the base delay", () => {
      const delay = calculateBackoff(2);
      // 4000ms base + jitter (up to 1000ms)
      expect(delay).toBeGreaterThanOrEqual(4000);
      expect(delay).toBeLessThanOrEqual(5000);
    });

    test("delay is capped at MAX_DELAY_MS", () => {
      const delay = calculateBackoff(10); // Would be 1024 seconds without cap
      expect(delay).toBeLessThanOrEqual(MAX_DELAY_MS);
    });

    test("very high retry count still respects cap", () => {
      const delay = calculateBackoff(100);
      expect(delay).toBeLessThanOrEqual(MAX_DELAY_MS);
    });
  });

  describe("extractRateLimitInfo", () => {
    test("extracts all rate limit headers", () => {
      const headers = {
        "x-ratelimit-limit": "120",
        "ratelimit-remaining": "50",
        "x-ratelimit-reset": "1704067200",
      };

      const info = extractRateLimitInfo(headers);

      expect(info.limit).toBe(120);
      expect(info.remaining).toBe(50);
      expect(info.reset).toBe(1704067200);
    });

    test("returns undefined for missing headers", () => {
      const info = extractRateLimitInfo({});

      expect(info.limit).toBeUndefined();
      expect(info.remaining).toBeUndefined();
      expect(info.reset).toBeUndefined();
    });

    test("handles partial headers - only remaining", () => {
      const headers = {
        "ratelimit-remaining": "10",
      };

      const info = extractRateLimitInfo(headers);

      expect(info.limit).toBeUndefined();
      expect(info.remaining).toBe(10);
      expect(info.reset).toBeUndefined();
    });

    test("handles partial headers - only limit and reset", () => {
      const headers = {
        "x-ratelimit-limit": "120",
        "x-ratelimit-reset": "1704067200",
      };

      const info = extractRateLimitInfo(headers);

      expect(info.limit).toBe(120);
      expect(info.remaining).toBeUndefined();
      expect(info.reset).toBe(1704067200);
    });

    test("parses integer values correctly", () => {
      const headers = {
        "x-ratelimit-limit": "100",
        "ratelimit-remaining": "0",
        "x-ratelimit-reset": "1704153600",
      };

      const info = extractRateLimitInfo(headers);

      expect(info.limit).toBe(100);
      expect(info.remaining).toBe(0);
      expect(info.reset).toBe(1704153600);
    });
  });

  describe("constants", () => {
    test("MAX_RETRIES is 3", () => {
      expect(MAX_RETRIES).toBe(3);
    });

    test("INITIAL_DELAY_MS is 1000", () => {
      expect(INITIAL_DELAY_MS).toBe(1000);
    });

    test("MAX_DELAY_MS is 30000", () => {
      expect(MAX_DELAY_MS).toBe(30000);
    });
  });
});
