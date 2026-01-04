export type OutputFormat = "json" | "table" | "tsv" | "plain";

export interface GlobalOptions {
  format?: OutputFormat;
  quiet: boolean;
  verbose: boolean;
  debug: boolean;
}

export interface CommandContext {
  options: GlobalOptions;
}
