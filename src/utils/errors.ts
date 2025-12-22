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
    super(`Rate limit exceeded. Limit: ${limit}, resets at: ${new Date(resetTime * 1000).toISOString()}`, "RATE_LIMITED", {
      limit,
      reset: resetTime,
    });
    this.name = "RateLimitError";
  }
}

export function handleError(error: unknown, debug = false): never {
  if (error instanceof RaindropCliError) {
    if (process.env["RDCLI_FORMAT"] === "json") {
      console.error(JSON.stringify(error.toJSON(), null, 2));
    } else {
      console.error(`Error: ${error.message}`);
      if (debug && error.details) {
        console.error("Details:", JSON.stringify(error.details, null, 2));
      }
    }
    process.exit(1);
  }

  if (error instanceof Error) {
    console.error(`Error: ${error.message}`);
    if (debug) {
      console.error(error.stack);
    }
    process.exit(1);
  }

  console.error("An unexpected error occurred");
  process.exit(1);
}
