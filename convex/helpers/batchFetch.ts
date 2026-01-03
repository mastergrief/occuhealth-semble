/**
 * Batch Fetch Helper Module
 *
 * Provides utilities to eliminate N+1 query patterns in Convex queries.
 * Instead of fetching related documents one-by-one inside a loop,
 * these utilities collect unique IDs, fetch all in a single batch,
 * and return a Map for O(1) lookup during enrichment.
 *
 * @example
 * ```ts
 * // BEFORE (N+1 - 20 appointments = 21 queries):
 * const enriched = await Promise.all(
 *   appointments.map(async (apt) => ({
 *     ...apt,
 *     patient: await ctx.db.get(apt.patientId),
 *   }))
 * );
 *
 * // AFTER (batch - 20 appointments = 2 queries):
 * const patientIds = extractUniqueIds(appointments, a => a.patientId);
 * const patients = await batchGet(ctx, patientIds);
 * const enriched = enrichWithRelation(appointments, patients, a => a.patientId, "patient");
 * ```
 */

import { QueryCtx } from "../_generated/server";
import { Doc, Id, TableNames } from "../_generated/dataModel";

/**
 * Extracts unique IDs from an array of items using a key function.
 * Filters out null/undefined values and removes duplicates.
 *
 * @param items - Array of items to extract IDs from
 * @param keyFn - Function that extracts the ID from each item
 * @returns Deduplicated array of IDs
 *
 * @example
 * ```ts
 * const appointments = await ctx.db.query("appointments").collect();
 * const patientIds = extractUniqueIds(appointments, a => a.patientId);
 * // Returns: [Id<"patients">, Id<"patients">, ...] (unique only)
 * ```
 */
export function extractUniqueIds<T, K>(
  items: T[],
  keyFn: (item: T) => K | null | undefined
): K[] {
  const seen = new Set<string>();
  const result: K[] = [];

  for (const item of items) {
    const id = keyFn(item);
    if (id == null) continue;

    // Use string representation for deduplication (Convex IDs are strings at runtime)
    const idStr = String(id);
    if (!seen.has(idStr)) {
      seen.add(idStr);
      result.push(id);
    }
  }

  return result;
}

/**
 * Fetches multiple documents by ID in a single batch using Promise.all.
 * Returns a Map for O(1) lookup. Filters out null results (deleted documents).
 *
 * @param ctx - Convex query context
 * @param ids - Array of document IDs to fetch
 * @returns Map from ID to document for O(1) lookup
 *
 * @example
 * ```ts
 * const patientIds = extractUniqueIds(appointments, a => a.patientId);
 * const patientsMap = await batchGet(ctx, patientIds);
 * // Returns: Map<Id<"patients">, Doc<"patients">>
 *
 * // O(1) lookup:
 * const patient = patientsMap.get(appointment.patientId);
 * ```
 */
export async function batchGet<TableName extends TableNames>(
  ctx: QueryCtx,
  ids: Id<TableName>[]
): Promise<Map<Id<TableName>, Doc<TableName>>> {
  // Fetch all documents in parallel
  const docs = await Promise.all(ids.map((id) => ctx.db.get(id)));

  // Build map, filtering out nulls (deleted documents)
  const map = new Map<Id<TableName>, Doc<TableName>>();
  for (let i = 0; i < ids.length; i++) {
    const doc = docs[i];
    if (doc != null) {
      map.set(ids[i], doc);
    }
  }

  return map;
}

/**
 * Enriches items with related data from a pre-fetched Map.
 * Type-safe: the enriched property name is strongly typed.
 *
 * @param items - Array of items to enrich
 * @param relationMap - Map of related documents (from batchGet)
 * @param idFn - Function that extracts the foreign key from each item
 * @param key - Property name to add the related document under
 * @returns Array of items with the related document added (or null if not found)
 *
 * @example
 * ```ts
 * const patientIds = extractUniqueIds(appointments, a => a.patientId);
 * const patients = await batchGet(ctx, patientIds);
 * const enriched = enrichWithRelation(
 *   appointments,
 *   patients,
 *   a => a.patientId,
 *   "patient"
 * );
 * // Returns: (Appointment & { patient: Patient | null })[]
 * ```
 */
export function enrichWithRelation<
  T,
  R,
  K extends string,
  IdType extends Id<TableNames>
>(
  items: T[],
  relationMap: Map<IdType, R>,
  idFn: (item: T) => IdType | null | undefined,
  key: K
): (T & { [P in K]: R | null })[] {
  return items.map((item) => {
    const id = idFn(item);
    const related = id != null ? relationMap.get(id) ?? null : null;
    return { ...item, [key]: related } as T & { [P in K]: R | null };
  });
}

/**
 * Convenience function that combines extractUniqueIds, batchGet, and enrichWithRelation.
 * Use this for simple single-relation enrichment.
 *
 * @param ctx - Convex query context
 * @param items - Array of items to enrich
 * @param idFn - Function that extracts the foreign key from each item
 * @param key - Property name to add the related document under
 * @returns Array of items with the related document added (or null if not found)
 *
 * @example
 * ```ts
 * const appointments = await ctx.db.query("appointments").collect();
 * const enriched = await batchEnrich(ctx, appointments, a => a.patientId, "patient");
 * // 2 queries total instead of N+1
 * ```
 */
export async function batchEnrich<
  T,
  TableName extends TableNames,
  K extends string
>(
  ctx: QueryCtx,
  items: T[],
  idFn: (item: T) => Id<TableName> | null | undefined,
  key: K
): Promise<(T & { [P in K]: Doc<TableName> | null })[]> {
  const ids = extractUniqueIds(items, idFn);
  const relationMap = await batchGet(ctx, ids);
  return enrichWithRelation(items, relationMap, idFn, key);
}
