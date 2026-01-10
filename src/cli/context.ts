/**
 * CLI context module - consolidated global state for CLI operations.
 *
 * Creates a CliContext object from argv and environment, providing:
 * - Output configuration (format, color, verbosity)
 * - TTY detection
 * - Color functions that respect color settings
 * - Prefixes for different message types
 *
 * @example
 * ```ts
 * import { createContext } from './cli/context.js';
 *
 * const ctx = createContext(process.argv.slice(2), process.env);
 * console.log(ctx.colors.green('Success!'));
 * ```
 */

import type { OutputFormat } from "../types/index.js";
import { createColors } from "picocolors";

export type OutputConfig = {
  format: OutputFormat | undefined; // undefined = auto-detect
  color: boolean;
  verbose: boolean;
  debug: boolean;
  quiet: boolean;
};

export type CliContext = {
  isTty: boolean;
  output: OutputConfig;
  colors: {
    bold: (t: string) => string;
    dim: (t: string) => string;
    cyan: (t: string) => string;
    yellow: (t: string) => string;
    green: (t: string) => string;
    red: (t: string) => string;
  };
  prefix: {
    ok: string;
    warn: string;
    err: string;
    info: string;
  };
};

/**
 * Create CLI context from argv and environment.
 *
 * @param argv - Command line arguments (without node/script path)
 * @param env - Environment variables
 * @param isTty - Whether stdout is a TTY (passed explicitly for testability)
 */
export function createContext(
  argv: string[],
  env: Record<string, string | undefined>,
  isTty: boolean = process.stdout.isTTY ?? false
): CliContext {
  const noColor = argv.includes("--no-color") || env.NO_COLOR !== undefined;
  const debug = argv.includes("--debug") || argv.includes("-d");
  const verbose = argv.includes("--verbose") || argv.includes("-v") || debug;
  const quiet = argv.includes("--quiet") || argv.includes("-q");

  // Determine format from argv
  let format: OutputFormat | undefined;
  if (argv.includes("--json")) format = "json";
  else if (argv.includes("--table")) format = "table";
  else if (argv.includes("--plain")) format = "plain";
  else if (argv.includes("--tsv")) format = "tsv";
  // Check --format <value>
  const formatIdx = argv.findIndex((a) => a === "--format");
  if (formatIdx !== -1 && argv[formatIdx + 1]) {
    format = argv[formatIdx + 1] as OutputFormat;
  }

  const useColor = isTty && !noColor;

  // Use picocolors with forced color support, then wrap to respect our useColor setting
  // This bypasses picocolors' own TTY detection so we control color output
  const pc = createColors(true);

  return {
    isTty,
    output: { format, color: useColor, verbose, debug, quiet },
    colors: {
      bold: useColor ? pc.bold : String,
      dim: useColor ? pc.dim : String,
      cyan: useColor ? pc.cyan : String,
      yellow: useColor ? pc.yellow : String,
      green: useColor ? pc.green : String,
      red: useColor ? pc.red : String,
    },
    prefix: useColor
      ? { ok: "✓ ", warn: "⚠ ", err: "✗ ", info: "ℹ " }
      : { ok: "[OK] ", warn: "[WARN] ", err: "[ERR] ", info: "[INFO] " },
  };
}
