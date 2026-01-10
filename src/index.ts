/**
 * Library exports for raindrop-cli.
 *
 * CLI entry point is now src/cli.ts.
 * This file exports types and utilities for programmatic use.
 */

export { getClient } from "./client.js";
export type { CliContext, OutputConfig } from "./cli/context.js";
export { createContext } from "./cli/context.js";
export type { OutputFormat, GlobalOptions } from "./types/index.js";
export { OUTPUT_FORMATS } from "./types/index.js";
