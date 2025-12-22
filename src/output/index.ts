import type { OutputFormat } from "../types/index.js";
import { formatJson } from "./json.js";
import { formatTable } from "./table.js";
import { formatTsv } from "./tsv.js";

export interface OutputOptions {
  format: OutputFormat;
  quiet: boolean;
  verbose: boolean;
}

export interface ColumnConfig {
  key: string;
  header: string;
  width?: number;
}

export function output<T>(data: T, columns: ColumnConfig[], options: OutputOptions): void {
  if (options.quiet) {
    // In quiet mode, output just IDs if available
    if (Array.isArray(data)) {
      for (const item of data) {
        if (typeof item === "object" && item !== null && "_id" in item) {
          console.log((item as { _id: unknown })._id);
        } else if (typeof item === "object" && item !== null && "id" in item) {
          console.log((item as { id: unknown }).id);
        }
      }
    } else if (typeof data === "object" && data !== null) {
      if ("_id" in data) {
        console.log((data as { _id: unknown })._id);
      } else if ("id" in data) {
        console.log((data as { id: unknown }).id);
      }
    }
    return;
  }

  switch (options.format) {
    case "json":
      console.log(formatJson(data));
      break;
    case "table":
      console.log(formatTable(data, columns));
      break;
    case "tsv":
      console.log(formatTsv(data, columns));
      break;
  }
}
