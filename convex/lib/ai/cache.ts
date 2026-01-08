/**
 * AI Suggestion Cache Helper Functions
 *
 * Provides cache key generation, TTL management, and cache operations
 * for AI-generated restriction suggestions.
 */

import { MutationCtx, QueryCtx } from "../../_generated/server";

// =============================================================================
// TTL Constants
// =============================================================================

const CACHE_TTL = {
  specific_job: 7 * 24 * 60 * 60 * 1000,  // 7 days for job-specific suggestions
  general: 24 * 60 * 60 * 1000,            // 1 day for general suggestions
};

// =============================================================================
// Types
// =============================================================================

/**
 * Structure for cached restrictions
 */
export interface CachedRestriction {
  code: string;
  category: string;
  description: string;
  duration?: string;
}

/**
 * Parameters for cache key generation
 */
export interface CacheKeyParams {
  jobTitle: string | undefined;
  appointmentType: string;
  fitForWork: string;
}

// =============================================================================
// Cache Key Generation
// =============================================================================

/**
 * Generate cache key from job/type/fitness parameters.
 * Normalizes inputs for consistent cache hits.
 */
export function getCacheKey(params: CacheKeyParams): string {
  const job = params.jobTitle
    ? params.jobTitle.toLowerCase().trim().replace(/\s+/g, "_")
    : "general";
  const type = params.appointmentType.toLowerCase().replace(/\s+/g, "_");
  return `${job}:${type}:${params.fitForWork}`;
}

/**
 * Get TTL based on whether job is specified.
 * Job-specific suggestions are cached longer (7 days) than general ones (1 day).
 */
export function getTTL(jobTitle: string | undefined): number {
  return jobTitle ? CACHE_TTL.specific_job : CACHE_TTL.general;
}

// =============================================================================
// Cache Operations
// =============================================================================

/**
 * Query cache for restrictions by key.
 * Returns null if not found or expired.
 */
export async function getCachedRestrictions(
  ctx: QueryCtx,
  cacheKey: string
): Promise<CachedRestriction[] | null> {
  const cached = await ctx.db
    .query("aiSuggestionCache")
    .withIndex("by_key", (q) => q.eq("cacheKey", cacheKey))
    .first();

  if (!cached || cached.expiresAt < Date.now()) return null;
  return cached.suggestions.restrictions;
}

/**
 * Store restrictions in cache.
 * Updates existing entry or creates new one.
 */
export async function setCachedRestrictions(
  ctx: MutationCtx,
  cacheKey: string,
  restrictions: CachedRestriction[],
  ttl: number
): Promise<void> {
  const existing = await ctx.db
    .query("aiSuggestionCache")
    .withIndex("by_key", (q) => q.eq("cacheKey", cacheKey))
    .first();

  const now = Date.now();
  if (existing) {
    await ctx.db.patch(existing._id, {
      suggestions: { restrictions },
      hitCount: existing.hitCount + 1,
      expiresAt: now + ttl,
    });
  } else {
    await ctx.db.insert("aiSuggestionCache", {
      cacheKey,
      suggestions: { restrictions },
      hitCount: 0,
      createdAt: now,
      expiresAt: now + ttl,
    });
  }
}

/**
 * Increment hit count for a cache entry.
 * Called when cache is accessed successfully.
 */
export async function incrementHitCount(
  ctx: MutationCtx,
  cacheKey: string
): Promise<void> {
  const cached = await ctx.db
    .query("aiSuggestionCache")
    .withIndex("by_key", (q) => q.eq("cacheKey", cacheKey))
    .first();

  if (cached) {
    await ctx.db.patch(cached._id, { hitCount: cached.hitCount + 1 });
  }
}
