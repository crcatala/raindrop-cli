import { outputError } from "./output-streams.js";
import { isDebugEnabled } from "./debug.js";

export class RaindropCliError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>,
    public exitCode = 1
  ) {
    super(message);
    this.name = "RaindropCliError";
  }

  toJSON(): object {
    return {
      error: true,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

export class UsageError extends RaindropCliError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "USAGE_ERROR", details, 2);
    this.name = "UsageError";
  }
}

export class ConfigError extends RaindropCliError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "CONFIG_ERROR", details);
    this.name = "ConfigError";
  }
}

export class ApiError extends RaindropCliError {
  constructor(
    message: string,
    public statusCode?: number,
    details?: Record<string, unknown>
  ) {
    super(message, "API_ERROR", { statusCode, ...details });
    this.name = "ApiError";
  }
}

export class RateLimitError extends RaindropCliError {
  constructor(
    public limit: number,
    public resetTime: number
  ) {
    const seconds = Math.max(0, resetTime - Math.floor(Date.now() / 1000));
    const wait = formatSeconds(seconds);
    super(`Rate limited by Raindrop API. Wait ${wait} before retrying.`, "RATE_LIMITED", {
      limit,
      reset: resetTime,
    });
    this.name = "RateLimitError";
  }
}

function formatSeconds(seconds: number): string {
  if (seconds <= 0) return "a few seconds";
  if (seconds === 1) return "1 second";
  return `${seconds} seconds`;
}

function getDetail(error: RaindropCliError, key: string): unknown {
  if (!error.details || typeof error.details !== "object") return undefined;
  return (error.details as Record<string, unknown>)[key];
}

function formatApiErrorMessage(error: ApiError): string {
  const status = error.statusCode;

  if (!status) {
    const code = getDetail(error, "code");
    if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
      return "Can't reach Raindrop API. Check your internet connection or DNS and try again later.";
    }
    if (code === "ECONNREFUSED") {
      return "Can't connect to Raindrop API. Check your internet connection or try again later.";
    }
    if (code === "ETIMEDOUT" || code === "ECONNABORTED") {
      return "Request to Raindrop API timed out. Try again later.";
    }
    return "Can't connect to Raindrop API. Check your internet connection or try again later.";
  }

  if (status === 401) {
    return "Unauthorized by Raindrop API. Run `rdcli auth set-token` or set `RAINDROP_TOKEN`.";
  }
  if (status === 403) {
    return "Forbidden by Raindrop API. Check your token permissions and try again.";
  }
  if (status === 404) {
    return "Resource not found. Check the ID or URL and try again.";
  }
  if (status === 429) {
    return "Rate limited by Raindrop API. Wait a bit before retrying.";
  }
  if (status === 400 || status === 422) {
    return "Request rejected by Raindrop API. Check your input and try again.";
  }
  if (status >= 500) {
    return `Raindrop API error (status ${status}). Try again later.`;
  }

  return `Raindrop API error (status ${status}). Check your request and try again.`;
}

function formatUserMessage(error: RaindropCliError): string {
  if (error instanceof ApiError) {
    return formatApiErrorMessage(error);
  }

  return error.message || "An unexpected error occurred. Run with --debug for details.";
}

/**
 * Handle and output an error, then exit.
 *
 * When --debug is enabled:
 * - Shows error details for RaindropCliError
 * - Shows stack traces for all errors
 *
 * @param error - The error to handle
 * @param debugOverride - Override the global debug flag (for testing)
 */
export function handleError(error: unknown, debugOverride?: boolean): never {
  const showDebug = debugOverride ?? isDebugEnabled();

  if (error instanceof RaindropCliError) {
    if (process.env["RDCLI_FORMAT"] === "json") {
      outputError(JSON.stringify(error.toJSON(), null, 2));
    } else {
      outputError(formatUserMessage(error));
      if (showDebug && error.details) {
        outputError("[debug] Details: " + JSON.stringify(error.details, null, 2));
      }
      if (showDebug && error.stack) {
        outputError("[debug] Stack trace:");
        outputError(error.stack);
      }
    }
    process.exit(error.exitCode);
  }

  if (error instanceof Error) {
    const message = error.message || "An unexpected error occurred. Run with --debug for details.";
    outputError(message);
    if (showDebug && error.stack) {
      outputError("[debug] Stack trace:");
      outputError(error.stack);
    }
    process.exit(1);
  }

  outputError("An unexpected error occurred. Run with --debug for details.");
  if (showDebug) {
    outputError("[debug] Unknown error type: " + String(error));
  }
  process.exit(1);
}
