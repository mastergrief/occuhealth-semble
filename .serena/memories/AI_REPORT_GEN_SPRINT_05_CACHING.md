# AI Report Generation - Caching & Performance

**Sprint**: 05 of 06
**Index**: AI_REPORT_GEN_INDEX
**Depends On**: AI_REPORT_GEN_SPRINT_03_ACTION
**Next**: AI_REPORT_GEN_SPRINT_06_TESTING

---

## Objective

Implement caching for AI restriction suggestions to reduce API costs and latency. Similar job types/appointment combinations can reuse cached suggestions.

## Cache Strategy

| Scenario | Cache Key | TTL | Hit Rate |
|----------|-----------|-----|----------|
| Same job type + fit status | `{jobTitle}:{appointmentType}:{fitForWork}` | 7 days | 60-70% |
| General (no job) | `general:{appointmentType}:{fitForWork}` | 1 day | 20-30% |

**Expected Savings**: 60% reduction in API calls, ~$0.04/day → ~$0.016/day

## Implementation Tasks

### Task 5.1: Add Cache Table to Schema

**File**: `convex/schema.ts` - Add table

```typescript
aiSuggestionCache: defineTable({
  cacheKey: v.string(),
  suggestions: v.object({
    restrictions: v.array(v.object({
      code: v.string(),
      category: v.string(),
      description: v.string(),
      duration: v.optional(v.string()),
    })),
    // Don't cache summary - too unique per patient
  }),
  hitCount: v.number(),
  createdAt: v.number(),
  expiresAt: v.number(),
})
  .index("by_key", ["cacheKey"])
  .index("by_expires", ["expiresAt"]),
```

### Task 5.2: Create Cache Helper Functions

**File**: `convex/lib/ai/cache.ts`

```typescript
import { MutationCtx, QueryCtx } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";

const CACHE_TTL = {
  specific_job: 7 * 24 * 60 * 60 * 1000,  // 7 days
  general: 24 * 60 * 60 * 1000,            // 1 day
};

export function getCacheKey(params: {
  jobTitle: string | undefined;
  appointmentType: string;
  fitForWork: string;
}): string {
  const job = params.jobTitle 
    ? params.jobTitle.toLowerCase().trim().replace(/\s+/g, "_")
    : "general";
  const type = params.appointmentType.toLowerCase().replace(/\s+/g, "_");
  return `${job}:${type}:${params.fitForWork}`;
}

export function getTTL(jobTitle: string | undefined): number {
  return jobTitle ? CACHE_TTL.specific_job : CACHE_TTL.general;
}

export async function getCachedRestrictions(
  ctx: QueryCtx,
  cacheKey: string
): Promise<{ code: string; category: string; description: string; duration?: string }[] | null> {
  const cached = await ctx.db
    .query("aiSuggestionCache")
    .withIndex("by_key", (q) => q.eq("cacheKey", cacheKey))
    .first();
  
  if (!cached) return null;
  
  // Check expiration
  if (cached.expiresAt < Date.now()) {
    return null;
  }
  
  return cached.suggestions.restrictions;
}

export async function setCachedRestrictions(
  ctx: MutationCtx,
  cacheKey: string,
  restrictions: { code: string; category: string; description: string; duration?: string }[],
  ttl: number
): Promise<void> {
  const existing = await ctx.db
    .query("aiSuggestionCache")
    .withIndex("by_key", (q) => q.eq("cacheKey", cacheKey))
    .first();
  
  if (existing) {
    await ctx.db.patch(existing._id, {
      suggestions: { restrictions },
      hitCount: existing.hitCount + 1,
      expiresAt: Date.now() + ttl,
    });
  } else {
    await ctx.db.insert("aiSuggestionCache", {
      cacheKey,
      suggestions: { restrictions },
      hitCount: 0,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl,
    });
  }
}

export async function incrementHitCount(
  ctx: MutationCtx,
  cacheKey: string
): Promise<void> {
  const cached = await ctx.db
    .query("aiSuggestionCache")
    .withIndex("by_key", (q) => q.eq("cacheKey", cacheKey))
    .first();
  
  if (cached) {
    await ctx.db.patch(cached._id, {
      hitCount: cached.hitCount + 1,
    });
  }
}
```

### Task 5.3: Update AI Action with Cache

**File**: `convex/actions/aiReportSuggestion.ts` - Modify

```typescript
export const generateSuggestion = action({
  args: {
    appointmentId: v.id("appointments"),
    clinicalNotesId: v.optional(v.id("clinicalNotes")),
  },
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(internal.aiHelpers.getReportContext, {
      appointmentId: args.appointmentId,
      clinicalNotesId: args.clinicalNotesId,
    });
    
    if (!context) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Context not found" });
    }
    
    // Check cache for restrictions
    const cacheKey = getCacheKey({
      jobTitle: context.patientJobTitle,
      appointmentType: context.appointmentType,
      fitForWork: "fit_with_restrictions", // Most common case for restrictions
    });
    
    const cachedRestrictions = await ctx.runQuery(
      internal.aiHelpers.getCachedRestrictions,
      { cacheKey }
    );
    
    const provider = getAIProvider("openai");
    const startTime = Date.now();
    
    let suggestion;
    let fromCache = false;
    
    if (cachedRestrictions) {
      // Use cached restrictions, still generate summary
      fromCache = true;
      const partialSuggestion = await provider.generateReportSuggestion({
        ...context,
        // Hint to focus on summary since we have restrictions
        skipRestrictions: true,
      });
      
      suggestion = {
        ...partialSuggestion,
        restrictions: cachedRestrictions,
      };
      
      // Increment hit count
      await ctx.runMutation(internal.aiHelpers.incrementCacheHit, { cacheKey });
    } else {
      // Full generation
      suggestion = await provider.generateReportSuggestion(context);
      
      // Cache the restrictions for future use
      if (suggestion.restrictions.length > 0) {
        const ttl = getTTL(context.patientJobTitle);
        await ctx.runMutation(internal.aiHelpers.setCacheRestrictions, {
          cacheKey,
          restrictions: suggestion.restrictions,
          ttl,
        });
      }
    }
    
    const latencyMs = Date.now() - startTime;
    
    // Store suggestion with cache info
    await ctx.runMutation(internal.aiHelpers.storeSuggestion, {
      appointmentId: args.appointmentId,
      patientId: context.patientId,
      suggestion,
      modelUsed: provider.model,
      latencyMs,
      fromCache,
    });
    
    return suggestion;
  },
});
```

### Task 5.4: Add Cache Cleanup Cron

**File**: `convex/crons.ts` - Add or extend

```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean expired cache entries daily at 3 AM UTC
crons.daily(
  "cleanup expired AI cache",
  { hourUTC: 3, minuteUTC: 0 },
  internal.aiHelpers.cleanupExpiredCache
);

export default crons;
```

**File**: `convex/aiHelpers.ts` - Add cleanup mutation

```typescript
export const cleanupExpiredCache = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("aiSuggestionCache")
      .withIndex("by_expires")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .take(100); // Batch delete
    
    for (const entry of expired) {
      await ctx.db.delete(entry._id);
    }
    
    return { deleted: expired.length };
  },
});
```

## Performance Monitoring

### Add Cache Metrics Query

**File**: `convex/aiHelpers.ts` - Add query

```typescript
export const getCacheStats = query({
  args: {},
  handler: async (ctx) => {
    const allCache = await ctx.db.query("aiSuggestionCache").collect();
    
    const totalEntries = allCache.length;
    const totalHits = allCache.reduce((sum, e) => sum + e.hitCount, 0);
    const activeEntries = allCache.filter(e => e.expiresAt > Date.now()).length;
    
    return {
      totalEntries,
      activeEntries,
      expiredEntries: totalEntries - activeEntries,
      totalHits,
      avgHitsPerEntry: totalEntries > 0 ? totalHits / totalEntries : 0,
    };
  },
});
```

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| API calls/day | ~100 | ~40 |
| Cost/day | $0.10 | $0.04 |
| Avg latency (cached) | N/A | <100ms |
| Avg latency (uncached) | 3-5s | 3-5s |
| Cache hit rate | 0% | 60% |

## Acceptance Criteria

- [ ] `aiSuggestionCache` table added to schema
- [ ] Cache helper functions created in `convex/lib/ai/cache.ts`
- [ ] AI action checks cache before calling OpenAI
- [ ] Successful restrictions cached with appropriate TTL
- [ ] Cache cleanup cron job configured
- [ ] Cache stats query available for monitoring
- [ ] fromCache flag included in audit logs

---

→ Next: AI_REPORT_GEN_SPRINT_06_TESTING
