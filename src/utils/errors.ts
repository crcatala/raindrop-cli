import { outputError } from "./output-streams.js";
import { isDebugEnabled } from "./debug.js";

export class RaindropCliError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
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
    super(
      `Rate limit exceeded. Limit: ${limit}, resets at: ${new Date(resetTime * 1000).toISOString()}`,
      "RATE_LIMITED",
      {
        limit,
        reset: resetTime,
      }
    );
    this.name = "RateLimitError";
  }
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
      outputError(`Error: ${error.message}`);
      if (showDebug && error.details) {
        outputError("[debug] Details: " + JSON.stringify(error.details, null, 2));
      }
      if (showDebug && error.stack) {
        outputError("[debug] Stack trace:");
        outputError(error.stack);
      }
    }
    process.exit(1);
  }

  if (error instanceof Error) {
    outputError(`Error: ${error.message}`);
    if (showDebug && error.stack) {
      outputError("[debug] Stack trace:");
      outputError(error.stack);
    }
    process.exit(1);
  }

  outputError("An unexpected error occurred");
  if (showDebug) {
    outputError("[debug] Unknown error type: " + String(error));
  }
  process.exit(1);
}
