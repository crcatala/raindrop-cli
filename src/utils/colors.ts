/**
 * Color utilities for CLI output.
 *
 * Uses picocolors for terminal coloring, with automatic detection
 * of when colors should be disabled (NO_COLOR, --no-color, non-TTY, etc).
 *
 * @example
 * ```ts
 * import { colors } from "./utils/colors.js";
 * console.log(colors.red("Error!"));
 * console.log(colors.bold(colors.green("Success")));
 * ```
 */

import pc from "picocolors";
import { shouldUseColor } from "./tty.js";

type ColorFunction = (text: string | number) => string;

interface Colors {
  // Modifiers
  reset: ColorFunction;
  bold: ColorFunction;
  dim: ColorFunction;
  italic: ColorFunction;
  underline: ColorFunction;
  inverse: ColorFunction;
  hidden: ColorFunction;
  strikethrough: ColorFunction;

  // Colors
  black: ColorFunction;
  red: ColorFunction;
  green: ColorFunction;
  yellow: ColorFunction;
  blue: ColorFunction;
  magenta: ColorFunction;
  cyan: ColorFunction;
  white: ColorFunction;
  gray: ColorFunction;

  // Background colors
  bgBlack: ColorFunction;
  bgRed: ColorFunction;
  bgGreen: ColorFunction;
  bgYellow: ColorFunction;
  bgBlue: ColorFunction;
  bgMagenta: ColorFunction;
  bgCyan: ColorFunction;
  bgWhite: ColorFunction;
}

// Identity function that returns the input as a string
const identity: ColorFunction = (text) => String(text);

// No-op colors object for when colors are disabled
const noColors: Colors = {
  reset: identity,
  bold: identity,
  dim: identity,
  italic: identity,
  underline: identity,
  inverse: identity,
  hidden: identity,
  strikethrough: identity,
  black: identity,
  red: identity,
  green: identity,
  yellow: identity,
  blue: identity,
  magenta: identity,
  cyan: identity,
  white: identity,
  gray: identity,
  bgBlack: identity,
  bgRed: identity,
  bgGreen: identity,
  bgYellow: identity,
  bgBlue: identity,
  bgMagenta: identity,
  bgCyan: identity,
  bgWhite: identity,
};

/**
 * Get the colors object, respecting NO_COLOR, --no-color, and TTY detection.
 *
 * Note: This checks shouldUseColor() on each call, so the --no-color flag
 * can be set after import and will still be respected.
 */
export function getColors(): Colors {
  if (!shouldUseColor()) {
    return noColors;
  }
  return pc as unknown as Colors;
}

/**
 * Convenience export for direct usage.
 * Use getColors() if you need dynamic color detection after flag parsing.
 *
 * @example
 * ```ts
 * import { colors } from "./utils/colors.js";
 * console.log(colors.red("Error"));
 * ```
 */
export const colors = new Proxy({} as Colors, {
  get(_target, prop: keyof Colors) {
    return getColors()[prop];
  },
});
