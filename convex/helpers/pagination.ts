/**
 * Pagination Helper Module
 *
 * Provides reusable pagination utilities for Convex queries.
 * Uses Convex's native pagination pattern with type-safe wrappers.
 */

import { paginationOptsValidator, PaginationResult } from "convex/server";

/**
 * Standard pagination result type for API responses.
 * Provides a consistent interface for paginated data across all queries.
 */
export type PaginatedResult<T> = {
  /** The page of results */
  items: T[];
  /** Cursor for fetching the next page (null if no more results) */
  cursor: string | null;
  /** Whether more results exist beyond this page */
  hasMore: boolean;
};

/**
 * Pagination arguments validator for query definitions.
 * Use this in your query's args to enable pagination.
 *
 * @example
 * ```ts
 * export const listPatients = query({
 *   args: {
 *     ...paginatedQueryArgs,
 *     employerId: v.id("employers"),
 *   },
 *   handler: async (ctx, args) => {
 *     const result = await ctx.db
 *       .query("patients")
 *       .withIndex("by_employer", q => q.eq("employerId", args.employerId))
 *       .paginate(args.paginationOpts);
 *     return toPaginatedResult(result);
 *   },
 * });
 * ```
 */
export const paginatedQueryArgs = {
  paginationOpts: paginationOptsValidator,
};

/**
 * Transforms Convex's PaginationResult into our standard PaginatedResult format.
 *
 * @param result - The raw pagination result from Convex's .paginate() method
 * @returns A standardized PaginatedResult with items, cursor, and hasMore
 *
 * @example
 * ```ts
 * const result = await ctx.db.query("patients").paginate(args.paginationOpts);
 * return toPaginatedResult(result);
 * ```
 */
export function toPaginatedResult<T>(result: PaginationResult<T>): PaginatedResult<T> {
  return {
    items: result.page,
    cursor: result.isDone ? null : result.continueCursor,
    hasMore: !result.isDone,
  };
}

/**
 * Default pagination options for initial page loads.
 * Use when calling a paginated query without an existing cursor.
 *
 * @param numItems - Number of items per page (default: 50)
 * @returns Pagination options for the first page
 *
 * @example
 * ```ts
 * // Client-side usage
 * const result = await convex.query(api.patients.list, {
 *   ...defaultPaginationOpts(20),
 *   employerId: "...",
 * });
 * ```
 */
export function defaultPaginationOpts(numItems: number = 50) {
  return {
    paginationOpts: {
      numItems,
      cursor: null,
    },
  };
}

/**
 * Creates pagination options for fetching the next page.
 *
 * @param cursor - The cursor from the previous page's result
 * @param numItems - Number of items per page (default: 50)
 * @returns Pagination options for the next page
 *
 * @example
 * ```ts
 * // Client-side usage for loading more
 * const nextResult = await convex.query(api.patients.list, {
 *   ...nextPageOpts(previousResult.cursor, 20),
 *   employerId: "...",
 * });
 * ```
 */
export function nextPageOpts(cursor: string, numItems: number = 50) {
  return {
    paginationOpts: {
      numItems,
      cursor,
    },
  };
}
