export type OutputFormat = "json" | "table" | "tsv";

export interface GlobalOptions {
  format?: OutputFormat;
  quiet: boolean;
  verbose: boolean;
}

export interface CommandContext {
  options: GlobalOptions;
}
