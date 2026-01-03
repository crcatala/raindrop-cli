import type { OutputFormat } from "../types/index.js";
import { formatJson } from "./json.js";
import { formatTable } from "./table.js";
import { formatTsv } from "./tsv.js";
import { getDefaultFormat } from "../utils/tty.js";
import { outputData } from "../utils/output-streams.js";

export interface OutputOptions {
  format?: OutputFormat;
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
          outputData(String((item as { _id: unknown })._id));
        } else if (typeof item === "object" && item !== null && "id" in item) {
          outputData(String((item as { id: unknown }).id));
        }
      }
    } else if (typeof data === "object" && data !== null) {
      if ("_id" in data) {
        outputData(String((data as { _id: unknown })._id));
      } else if ("id" in data) {
        outputData(String((data as { id: unknown }).id));
      }
    }
    return;
  }

  const format = options.format ?? getDefaultFormat();

  switch (format) {
    case "json":
      outputData(formatJson(data));
      break;
    case "table":
      outputData(formatTable(data, columns));
      break;
    case "tsv":
      outputData(formatTsv(data, columns));
      break;
  }
}
