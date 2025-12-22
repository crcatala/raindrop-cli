export interface PaginationOptions {
  page?: number;
  perPage?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  count: number;
  page: number;
  perPage: number;
  hasMore: boolean;
}

export function createPaginatedResult<T>(
  items: T[],
  count: number,
  page: number,
  perPage: number
): PaginatedResult<T> {
  return {
    items,
    count,
    page,
    perPage,
    hasMore: page * perPage < count,
  };
}
