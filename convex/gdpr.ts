import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// ---------------------------------------------------------------------------
// GDPR Compliance Functions
// ---------------------------------------------------------------------------
// Consent management, audit logging, and erasure request handling
// ---------------------------------------------------------------------------

// Type for GDPR stats return value
import { paginatedQueryArgs, toPaginatedResult } from "./helpers/pagination";

type GDPRStats = {
  pendingErasureCount: number;
  totalPatients: number;
  activeConsents: number;
  recentAuditLogs: Doc<"auditLogs">[];
  // Enhanced metrics
  patientsWithAllConsents: number;
  auditLogsByAction: { action: string; count: number }[];
  erasureApproachingDeadline: number;
  erasureOverdue: number;
};

// Audit log helper - internal mutation to be called from other mutations
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
  args: { status: v.optional(v.string()), ...paginatedQueryArgs },
  handler: async (ctx, args) => {
    if (args.status) {
      const result = await ctx.db
        .query("erasureRequests")
        .withIndex("by_status", (q) =>
          q.eq(
            "status",
            args.status as "pending" | "in_progress" | "completed" | "rejected"
          )
        )
        .paginate(args.paginationOpts);
      return toPaginatedResult(result);
    }

    const result = await ctx.db
      .query("erasureRequests")
      .paginate(args.paginationOpts);
    return toPaginatedResult(result);
  },
});;;

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
      const patientId = request.patientId;
      const now = Date.now();

      // 1. Redact appointments for this patient
      const appointments = await ctx.db
        .query("appointments")
        .withIndex("by_patient", (q) => q.eq("patientId", patientId))
        .collect();
      
      for (const appointment of appointments) {
        await ctx.db.patch(appointment._id, {
          reasonForAppointment: "[REDACTED]",
          preAppointmentNotes: "[REDACTED]",
        });
      }

      // 2. Redact reports for this patient
      const reports = await ctx.db
        .query("reports")
        .withIndex("by_patient", (q) => q.eq("patientId", patientId))
        .collect();
      
      for (const report of reports) {
        await ctx.db.patch(report._id, {
          summary: "[REDACTED]",
          restrictions: ["[REDACTED]"],
          followUpNotes: "[REDACTED]",
        });
      }

      // 3. Redact clinical notes for this patient
      const clinicalNotes = await ctx.db
        .query("clinicalNotes")
        .withIndex("by_patient", (q) => q.eq("patientId", patientId))
        .collect();
      
      for (const note of clinicalNotes) {
        await ctx.db.patch(note._id, {
          findings: "[REDACTED]",
          diagnosis: "[REDACTED]",
        });
      }

      // 4. Withdraw all consents for this patient
      const consents = await ctx.db
        .query("consents")
        .withIndex("by_patient", (q) => q.eq("patientId", patientId))
        .collect();
      
      for (const consent of consents) {
        await ctx.db.patch(consent._id, {
          granted: false,
          withdrawnAt: now,
        });
      }

      // 5. Soft delete patient (redact PII)
      await ctx.db.patch(patientId, {
        firstName: "[REDACTED]",
        lastName: "[REDACTED]",
        email: "[REDACTED]",
        phone: "[REDACTED]",
        dateOfBirth: "[REDACTED]",
        deletedAt: now,
      });
    }

    // Mark request as completed
    await ctx.db.patch(requestId, {
      status: "completed",
      completedAt: Date.now(),
      processedBy,
    });
  },
});;

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

    // Calculate patients with all 3 required consent types
    const consentsByPatient = new Map<string, Set<string>>();
    for (const consent of activeConsents) {
      if (consent.patientEmail) {
        if (!consentsByPatient.has(consent.patientEmail)) {
          consentsByPatient.set(consent.patientEmail, new Set());
        }
        consentsByPatient.get(consent.patientEmail)!.add(consent.consentType);
      }
    }
    const requiredConsents = ["data_processing", "health_data", "employer_sharing"];
    let patientsWithAllConsents = 0;
    for (const consents of consentsByPatient.values()) {
      if (requiredConsents.every((type) => consents.has(type))) {
        patientsWithAllConsents++;
      }
    }

    // Audit logs by action (last 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_timestamp")
      .filter((q) => q.gte(q.field("timestamp"), sevenDaysAgo))
      .collect();
    
    const actionCounts = new Map<string, number>();
    for (const log of recentLogs) {
      actionCounts.set(log.action, (actionCounts.get(log.action) || 0) + 1);
    }
    const auditLogsByAction = Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count);

    // Erasure SLA tracking (GDPR requires 30 days)
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    
    let erasureApproachingDeadline = 0;
    let erasureOverdue = 0;
    
    for (const request of pendingErasures) {
      const daysSinceRequest = now - request.requestedAt;
      if (daysSinceRequest > thirtyDays) {
        erasureOverdue++;
      } else if (daysSinceRequest > thirtyDays - sevenDays) {
        erasureApproachingDeadline++;
      }
    }

    return {
      pendingErasureCount: pendingErasures.length,
      totalPatients: totalPatients.length,
      activeConsents: activeConsents.length,
      recentAuditLogs,
      patientsWithAllConsents,
      auditLogsByAction,
      erasureApproachingDeadline,
      erasureOverdue,
    };
  },
});
