// convex/gdprModules/audit.ts
// Audit logging functions for GDPR compliance

import { internalMutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../authModules";

/**
 * Internal mutation to log actions for GDPR audit trail
 * Used by other mutations to record data access and modifications
 */
export const logAction = internalMutation({
  args: {
    action: v.string(),
    actorType: v.union(
      v.literal("employer"),
      v.literal("doctor"),
      v.literal("admin"),
      v.literal("system")
    ),
    actorId: v.optional(v.string()),
    resourceType: v.string(),
    resourceId: v.optional(v.string()),
    details: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("auditLogs", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

/**
 * Query to retrieve audit logs with optional filters
 * Requires admin authorization
 */
export const getAuditLogs = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    action: v.optional(v.string()),
    actorType: v.optional(
      v.union(
        v.literal("employer"),
        v.literal("doctor"),
        v.literal("admin"),
        v.literal("system")
      )
    ),
    resourceType: v.optional(v.string()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
  },
  handler: async (ctx, { limit, cursor, action, actorType, resourceType, startTime, endTime }) => {
    // Authorization: Only admins can view audit logs
    await requireAdmin(ctx);

    // Default to last 30 days if no time range specified
    const defaultStartTime = startTime ?? (Date.now() - 30 * 24 * 60 * 60 * 1000);
    const pageSize = Math.min(limit ?? 50, 100); // Cap at 100 per page

    // Build query with index-based filtering for time range
    let queryBuilder = ctx.db
      .query("auditLogs")
      .withIndex("by_timestamp", (q) => 
        q.gte("timestamp", defaultStartTime)
      )
      .order("desc");

    // Apply filters (endTime filter must be done via filter since index only supports one range)
    if (endTime) {
      queryBuilder = queryBuilder.filter((q) => q.lte(q.field("timestamp"), endTime));
    }
    if (action) {
      queryBuilder = queryBuilder.filter((q) => q.eq(q.field("action"), action));
    }
    if (actorType) {
      queryBuilder = queryBuilder.filter((q) => q.eq(q.field("actorType"), actorType));
    }
    if (resourceType) {
      queryBuilder = queryBuilder.filter((q) => q.eq(q.field("resourceType"), resourceType));
    }

    // Paginate results
    const paginationOpts = {
      numItems: pageSize,
      cursor: cursor ?? null,
    };
    
    const results = await queryBuilder.paginate(paginationOpts);

    return {
      logs: results.page,
      nextCursor: results.continueCursor,
      hasMore: !results.isDone,
    };
  },
});;;

/**
 * Query to retrieve audit logs for a specific resource
 * Requires admin authorization
 */
export const getAuditLogsByResource = query({
  args: {
    resourceType: v.string(),
    resourceId: v.string(),
  },
  handler: async (ctx, { resourceType, resourceId }) => {
    // Authorization: Only admins can view audit logs by resource
    await requireAdmin(ctx);

    return ctx.db
      .query("auditLogs")
      .withIndex("by_resource", (q) =>
        q.eq("resourceType", resourceType).eq("resourceId", resourceId)
      )
      .collect();
  },
});
