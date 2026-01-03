import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// ---------------------------------------------------------------------------
// GDPR Compliance Functions
// ---------------------------------------------------------------------------
// Consent management, audit logging, and erasure request handling
// ---------------------------------------------------------------------------

// Type for GDPR stats return value
type GDPRStats = {
  pendingErasureCount: number;
  totalPatients: number;
  activeConsents: number;
  recentAuditLogs: Doc<"auditLogs">[];
};

// Audit log helper - to be called from other mutations
export const logAction = mutation({
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

// Create consent
export const createConsent = mutation({
  args: {
    patientEmail: v.string(),
    patientId: v.optional(v.id("patients")),
    consentType: v.union(
      v.literal("data_processing"),
      v.literal("health_data"),
      v.literal("employer_sharing")
    ),
    consentText: v.string(),
    consentVersion: v.string(),
    collectedByEmployerId: v.id("employers"),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("consents", {
      ...args,
      granted: true,
      grantedAt: Date.now(),
    });
  },
});

// Withdraw consent
export const withdrawConsent = mutation({
  args: { consentId: v.id("consents") },
  handler: async (ctx, { consentId }) => {
    await ctx.db.patch(consentId, {
      granted: false,
      withdrawnAt: Date.now(),
    });
  },
});

// Get consents by patient
export const getConsentsByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, { patientId }) => {
    return ctx.db
      .query("consents")
      .withIndex("by_patient", (q) => q.eq("patientId", patientId))
      .collect();
  },
});

// Request erasure (GDPR right to be forgotten)
export const requestErasure = mutation({
  args: {
    requesterEmail: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { requesterEmail, reason }) => {
    // Find patient by email
    const patient = await ctx.db
      .query("patients")
      .withIndex("by_email", (q) => q.eq("email", requesterEmail))
      .first();

    return ctx.db.insert("erasureRequests", {
      requesterEmail,
      patientId: patient?._id,
      status: "pending",
      reason,
      requestedAt: Date.now(),
    });
  },
});

// List erasure requests (admin)
export const listErasureRequests = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, { status }) => {
    if (status) {
      return ctx.db
        .query("erasureRequests")
        .withIndex("by_status", (q) =>
          q.eq(
            "status",
            status as "pending" | "in_progress" | "completed" | "rejected"
          )
        )
        .collect();
    }
    return ctx.db.query("erasureRequests").collect();
  },
});

// Process erasure (admin)
export const processErasure = mutation({
  args: {
    requestId: v.id("erasureRequests"),
    processedBy: v.string(),
  },
  handler: async (ctx, { requestId, processedBy }) => {
    const request = await ctx.db.get(requestId);
    if (!request) throw new Error("Request not found");

    // Mark as in progress
    await ctx.db.patch(requestId, { status: "in_progress" });

    if (request.patientId) {
      // Soft delete patient (redact PII)
      await ctx.db.patch(request.patientId, {
        firstName: "[REDACTED]",
        lastName: "[REDACTED]",
        email: "[REDACTED]",
        phone: "[REDACTED]",
        dateOfBirth: "[REDACTED]",
        deletedAt: Date.now(),
      });
    }

    // Mark request as completed
    await ctx.db.patch(requestId, {
      status: "completed",
      completedAt: Date.now(),
      processedBy,
    });
  },
});

// Get audit logs (admin)
export const getAuditLogs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit }) => {
    const q = ctx.db
      .query("auditLogs")
      .withIndex("by_timestamp")
      .order("desc");

    if (limit) {
      return q.take(limit);
    }
    return q.collect();
  },
});

// Get audit logs by resource
export const getAuditLogsByResource = query({
  args: {
    resourceType: v.string(),
    resourceId: v.string(),
  },
  handler: async (ctx, { resourceType, resourceId }) => {
    return ctx.db
      .query("auditLogs")
      .withIndex("by_resource", (q) =>
        q.eq("resourceType", resourceType).eq("resourceId", resourceId)
      )
      .collect();
  },
});

// GDPR stats for admin dashboard
export const getGDPRStats = query({
  args: {},
  handler: async (ctx): Promise<GDPRStats> => {
    const pendingErasures = await ctx.db
      .query("erasureRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const totalPatients = await ctx.db
      .query("patients")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const activeConsents = await ctx.db
      .query("consents")
      .filter((q) => q.eq(q.field("granted"), true))
      .collect();

    const recentAuditLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .take(10);

    return {
      pendingErasureCount: pendingErasures.length,
      totalPatients: totalPatients.length,
      activeConsents: activeConsents.length,
      recentAuditLogs,
    };
  },
});
