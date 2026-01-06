export const OUTPUT_FORMATS = ["json", "table", "tsv", "plain"] as const;
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

export interface GlobalOptions {
  format?: OutputFormat;
  json?: boolean;
  quiet: boolean;
  verbose: boolean;
  debug: boolean;
}

export interface CommandContext {
  options: GlobalOptions;
}
