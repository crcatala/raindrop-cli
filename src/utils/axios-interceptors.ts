/**
 * Axios interceptors for the Raindrop API client.
 *
 * Provides:
 * - Request/response logging (verbose mode)
 * - Automatic retry with exponential backoff for transient errors
 * - Rate limit detection and RateLimitError throwing
 * - Error transformation to ApiError
 */

import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { ApiError, RateLimitError, TimeoutError } from "./errors.js";
import { verbose, debug } from "./debug.js";
import { getTimeoutSeconds } from "./timeout.js";

// Rate limit header names (as documented by Raindrop API)
const HEADER_RATE_LIMIT = "x-ratelimit-limit";
const HEADER_RATE_REMAINING = "ratelimit-remaining";
const HEADER_RATE_RESET = "x-ratelimit-reset";

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000; // 1 second
const MAX_DELAY_MS = 30000; // 30 seconds

// Extend request config to track retry state
interface ExtendedRequestConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
  _requestStartTime?: number;
}

/**
 * Check if an error is retryable (transient).
 * Retryable: network errors, 5xx server errors, 408 timeout.
 * NOT retryable: 429 (handled separately), 4xx client errors.
 */
export function isRetryableError(error: AxiosError): boolean {
  // Network errors (no response)
  if (!error.response) {
    return true;
  }

  const status = error.response.status;

  // Server errors (5xx) are retryable
  if (status >= 500 && status <= 599) {
    return true;
  }

  // 408 Request Timeout is retryable
  if (status === 408) {
    return true;
  }

  return false;
}

/**
 * Calculate exponential backoff delay with jitter.
 * Formula: min(initialDelay * 2^retryCount + jitter, maxDelay)
 */
export function calculateBackoff(retryCount: number): number {
  const delay = INITIAL_DELAY_MS * Math.pow(2, retryCount);
  // Add jitter (0-25% of delay)
  const jitter = delay * 0.25 * Math.random();
  return Math.min(delay + jitter, MAX_DELAY_MS);
}

/**
 * Sleep for a given duration.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get the API delay from environment variable.
 * Used to throttle requests during live tests to avoid rate limits.
 */
function getApiDelayMs(): number {
  const delay = process.env["RDCLI_API_DELAY_MS"];
  if (delay) {
    const parsed = parseInt(delay, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 0;
}

/**
 * Extract rate limit info from response headers.
 */
export function extractRateLimitInfo(headers: Record<string, string>): {
  limit?: number;
  remaining?: number;
  reset?: number;
} {
  return {
    limit: headers[HEADER_RATE_LIMIT] ? parseInt(headers[HEADER_RATE_LIMIT], 10) : undefined,
    remaining: headers[HEADER_RATE_REMAINING]
      ? parseInt(headers[HEADER_RATE_REMAINING], 10)
      : undefined,
    reset: headers[HEADER_RATE_RESET] ? parseInt(headers[HEADER_RATE_RESET], 10) : undefined,
  };
}

/**
 * Set up request interceptor for logging and optional rate limiting.
 */
function setupRequestInterceptor(axiosInstance: AxiosInstance): void {
  axiosInstance.interceptors.request.use(
    async (config: ExtendedRequestConfig) => {
      // Apply API delay if configured (for live tests to avoid rate limits)
      const apiDelay = getApiDelayMs();
      if (apiDelay > 0) {
        debug(`API delay: waiting ${apiDelay}ms before request`);
        await sleep(apiDelay);
      }

      // Track request start time for timing
      config._requestStartTime = performance.now();

      // Verbose logging of request
      const method = (config.method ?? "GET").toUpperCase();
      const url = config.url ?? "unknown";
      verbose(`API ${method} ${url}`);

      // Debug logging of request details
      debug("Request config", {
        method,
        url,
        params: config.params,
        hasData: !!config.data,
      });

      return config;
    },
    (error) => {
      debug("Request setup error", { error: String(error) });
      return Promise.reject(error);
    }
  );
}

/**
 * Set up response interceptor for logging, error handling, and retry.
 */
function setupResponseInterceptor(axiosInstance: AxiosInstance): void {
  axiosInstance.interceptors.response.use(
    // Success handler - log timing and rate limit info
    (response: AxiosResponse) => {
      const config = response.config as ExtendedRequestConfig;
      const startTime = config._requestStartTime;

      if (startTime) {
        const elapsed = performance.now() - startTime;
        const method = (config.method ?? "GET").toUpperCase();
        const url = config.url ?? "unknown";
        verbose(`API ${method} ${url} completed in ${elapsed.toFixed(0)}ms`);
      }

      // Log rate limit status in debug mode
      const rateInfo = extractRateLimitInfo(response.headers as Record<string, string>);
      if (rateInfo.remaining !== undefined) {
        debug("Rate limit status", {
          remaining: rateInfo.remaining,
          limit: rateInfo.limit,
        });
      }

      return response;
    },

    // Error handler - transform errors, handle retry
    async (error: AxiosError) => {
      const config = error.config as ExtendedRequestConfig | undefined;

      // Handle rate limit (429)
      if (error.response?.status === 429) {
        const headers = error.response.headers as Record<string, string>;
        const rateInfo = extractRateLimitInfo(headers);

        const limit = rateInfo.limit ?? 120; // Default per Raindrop docs
        const reset = rateInfo.reset ?? Math.floor(Date.now() / 1000) + 60;

        debug("Rate limit exceeded", { limit, reset });
        throw new RateLimitError(limit, reset);
      }

      // Check if we should retry
      if (config && isRetryableError(error)) {
        const retryCount = config._retryCount ?? 0;

        if (retryCount < MAX_RETRIES) {
          const delay = calculateBackoff(retryCount);
          const status = error.response?.status ?? "network error";

          verbose(
            `Retrying request (attempt ${retryCount + 1}/${MAX_RETRIES}) after ${delay.toFixed(0)}ms - ${status}`
          );
          debug("Retry details", {
            retryCount,
            delay,
            status,
            url: config.url,
          });

          await sleep(delay);

          // Increment retry count and retry
          config._retryCount = retryCount + 1;
          return axiosInstance.request(config);
        }

        verbose(`Max retries (${MAX_RETRIES}) exceeded`);
      }

      // Transform to ApiError for non-retryable/exhausted errors
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data as Record<string, unknown> | undefined;
        const message = data?.error ?? data?.message ?? error.message ?? "API request failed";

        debug("API error response", {
          status,
          data,
          url: config?.url,
        });

        throw new ApiError(String(message), status, {
          url: config?.url,
          method: config?.method,
        });
      }

      // Check for timeout errors
      if (
        error.code === "ECONNABORTED" ||
        error.code === "ETIMEDOUT" ||
        error.message?.includes("timeout")
      ) {
        const timeoutSeconds = getTimeoutSeconds();
        debug("Request timed out", { timeoutSeconds, code: error.code });
        throw new TimeoutError(timeoutSeconds, {
          url: config?.url,
          method: config?.method,
          code: error.code,
        });
      }

      // Network error with no response
      debug("Network error", { message: error.message });
      throw new ApiError(error.message || "Network error - no response received", undefined, {
        code: error.code,
      });
    }
  );
}

/**
 * Configure Axios interceptors on a Raindrop client instance.
 * Call this after creating the client.
 */
export function setupClientInterceptors(axiosInstance: AxiosInstance): void {
  setupRequestInterceptor(axiosInstance);
  setupResponseInterceptor(axiosInstance);
}

// Export constants and helpers for testing
export { MAX_RETRIES, INITIAL_DELAY_MS, MAX_DELAY_MS, getApiDelayMs };
