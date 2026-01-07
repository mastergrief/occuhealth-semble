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
    details: v.optional(v.any()),
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
  handler: async (ctx, { limit, action, actorType, resourceType, startTime, endTime }) => {
    // Authorization: Only admins can view audit logs
    await requireAdmin(ctx);

    // Start with all logs ordered by timestamp desc
    let results = await ctx.db
      .query("auditLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .collect();

    // Apply filters
    if (action) {
      results = results.filter((log) => log.action === action);
    }
    if (actorType) {
      results = results.filter((log) => log.actorType === actorType);
    }
    if (resourceType) {
      results = results.filter((log) => log.resourceType === resourceType);
    }
    if (startTime) {
      results = results.filter((log) => log.timestamp >= startTime);
    }
    if (endTime) {
      results = results.filter((log) => log.timestamp <= endTime);
    }

    // Apply limit after filtering with max cap of 1000
    const maxLimit = limit && limit > 0 ? Math.min(limit, 1000) : 100;
    return results.slice(0, maxLimit);
  },
});

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
