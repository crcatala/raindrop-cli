/**
 * Styled help formatter for Commander.js
 *
 * Adds color and formatting to help text while respecting TTY detection
 * and NO_COLOR environment variable. Falls back to plain text in non-TTY
 * environments.
 *
 * Styling approach (conservative, per clig.dev recommendations):
 * - Bold: Section headers (Usage:, Options:, Commands:)
 * - Cyan: Command and subcommand names
 * - Yellow: Option flags (-h, --help)
 * - Dim: Metadata like defaults, choices, argument placeholders
 */

import { Help, Command } from "commander";
import { colors } from "./colors.js";

/**
 * Custom Help class that adds styling to Commander's help output.
 * Uses Commander's built-in style methods for consistent formatting.
 */
export class StyledHelp extends Help {
  /**
   * Style section titles like "Usage:", "Options:", "Commands:"
   */
  styleTitle(title: string): string {
    return colors.bold(title);
  }

  /**
   * Style the usage string (the part after "Usage:")
   * e.g., "rd bookmarks list|ls [options] [collection-id]"
   */
  styleUsage(str: string): string {
    // Split into parts and style each appropriately
    return str
      .split(" ")
      .map((part) => {
        // [options] - dim since it's a placeholder
        if (part === "[options]") {
          return colors.dim(part);
        }
        // [command] - dim since it's a placeholder
        if (part === "[command]") {
          return colors.dim(part);
        }
        // Other bracketed args like [collection-id] - dim
        if (part.startsWith("[") && part.endsWith("]")) {
          return colors.dim(part);
        }
        // Required args like <id> - dim
        if (part.startsWith("<") && part.endsWith(">")) {
          return colors.dim(part);
        }
        // Command names (including aliases like list|ls) - cyan
        return colors.cyan(part);
      })
      .join(" ");
  }

  /**
   * Style command name in usage string
   */
  styleCommandText(str: string): string {
    return colors.cyan(str);
  }

  /**
   * Style option flags like "-h, --help" or "--format <format>"
   * The flag part is yellow, argument placeholders are dim.
   */
  styleOptionText(str: string): string {
    // Split into flag part and argument placeholder part
    // e.g., "--format <format>" -> "--format" (yellow) + " <format>" (dim)
    // e.g., "-t, --timeout <seconds>" -> "-t, --timeout" (yellow) + " <seconds>" (dim)
    const match = str.match(/^([^<\[]+)(\s*[<\[].*)?$/);
    if (match) {
      const flagPart = match[1];
      const argPart = match[2];
      if (flagPart && argPart) {
        return colors.yellow(flagPart) + colors.dim(argPart);
      }
    }
    return colors.yellow(str);
  }

  /**
   * Style subcommand names in the command list
   */
  styleSubcommandText(str: string): string {
    return colors.cyan(str);
  }

  /**
   * Style argument placeholders like "<id>" or "[collection-id]"
   */
  styleArgumentText(str: string): string {
    return colors.dim(str);
  }

  /**
   * Style option descriptions, dimming metadata like (default:) and (choices:)
   */
  styleOptionDescription(str: string): string {
    return styleMetadata(str);
  }

  /**
   * Style subcommand descriptions, dimming metadata like (alias:) and (shortcut for:)
   */
  styleSubcommandDescription(str: string): string {
    return styleMetadata(str);
  }

  /**
   * Style argument descriptions
   */
  styleArgumentDescription(str: string): string {
    return styleMetadata(str);
  }

  /**
   * Format a list of items with a heading.
   * Adds a blank line after the heading for better readability.
   */
  formatItemList(heading: string, items: string[], helper: Help): string[] {
    if (items.length === 0) return [];
    // Add blank line after heading, then items, then blank line after
    return [helper.styleTitle(heading), "", ...items, ""];
  }
}

/**
 * Style metadata in descriptions: (choices: ...), (default: ...), (alias: ...)
 * Makes these less prominent so the main description stands out.
 */
function styleMetadata(desc: string): string {
  // Style (choices: "x", "y", "z")
  desc = desc.replace(/\(choices: ([^)]+)\)/g, (_match, choices: string) =>
    colors.dim(`(choices: ${choices})`)
  );

  // Style (default: value)
  desc = desc.replace(/\(default: ([^)]+)\)/g, (_match, value: string) =>
    colors.dim(`(default: ${value})`)
  );

  // Style (alias: x) or (aliases: x, y)
  desc = desc.replace(/\(alias(?:es)?: ([^)]+)\)/g, (match) => colors.dim(match));

  // Style "shortcut for: ..." text
  desc = desc.replace(/\(shortcut for: ([^)]+)\)/g, (match) => colors.dim(match));

  return desc;
}

/**
 * Help configuration object for use with configureHelp().
 * Extracted so it can be reused across commands.
 */
const styledHelpConfig = {
  styleTitle: (str: string) => new StyledHelp().styleTitle(str),
  styleUsage: (str: string) => new StyledHelp().styleUsage(str),
  styleCommandText: (str: string) => new StyledHelp().styleCommandText(str),
  styleOptionText: (str: string) => new StyledHelp().styleOptionText(str),
  styleSubcommandText: (str: string) => new StyledHelp().styleSubcommandText(str),
  styleArgumentText: (str: string) => new StyledHelp().styleArgumentText(str),
  styleOptionDescription: (str: string) => new StyledHelp().styleOptionDescription(str),
  styleSubcommandDescription: (str: string) => new StyledHelp().styleSubcommandDescription(str),
  styleArgumentDescription: (str: string) => new StyledHelp().styleArgumentDescription(str),
  formatItemList: (heading: string, items: string[], helper: Help) =>
    new StyledHelp().formatItemList(heading, items, helper),
};

/**
 * Configure a Command to use styled help output.
 * Must be called on each command (including subcommands) for styling to apply.
 *
 * The styling automatically respects:
 * - NO_COLOR environment variable
 * - --no-color flag
 * - TTY detection (no colors when piped)
 * - TERM=dumb
 */
export function configureStyledHelp(cmd: Command): void {
  cmd.configureHelp(styledHelpConfig);
}

/**
 * Recursively configure styled help on a command and all its subcommands.
 * Call this on your root program after all commands have been added.
 */
export function configureStyledHelpRecursive(program: Command): void {
  configureStyledHelp(program);
  for (const cmd of program.commands) {
    configureStyledHelpRecursive(cmd);
  }
}
