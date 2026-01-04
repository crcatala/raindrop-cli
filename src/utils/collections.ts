/**
 * Shared utilities for collection ID parsing and special collections.
 */

/**
 * Special collection IDs in Raindrop.io
 */
export const SPECIAL_COLLECTIONS = {
  all: 0,
  unsorted: -1,
  trash: -99,
} as const;

export type SpecialCollectionName = keyof typeof SPECIAL_COLLECTIONS;

/**
 * Parse collection ID from string argument.
 * Supports numeric IDs and special names (all, unsorted, trash).
 */
export function parseCollectionId(value: string | undefined): number {
  if (value === undefined) {
    return SPECIAL_COLLECTIONS.all;
  }

  // Check for special collection names
  const lowerValue = value.toLowerCase();
  if (lowerValue in SPECIAL_COLLECTIONS) {
    return SPECIAL_COLLECTIONS[lowerValue as SpecialCollectionName];
  }

  // Parse as number
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new Error(
      `Invalid collection ID: "${value}". Use a number or one of: all, unsorted, trash`
    );
  }
  return num;
}
