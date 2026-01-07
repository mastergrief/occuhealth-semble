import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

// ---------------------------------------------------------------------------
// GDPR Compliance Functions
// ---------------------------------------------------------------------------
// Consent management, audit logging, and erasure request handling
// ---------------------------------------------------------------------------

// Type for GDPR stats return value
import { paginatedQueryArgs, toPaginatedResult } from "./helpers/pagination";

import { ConvexError } from "convex/values";
import {
  requireAdmin,
  requireEmployerOwnership,
} from "./authModules/authorization";

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
/**
 * Records an audit trail entry for GDPR compliance.
 *
 * Per GDPR Article 5(2) (Accountability), organizations must demonstrate
 * compliance through documented evidence. This internal mutation creates
 * immutable audit log entries for all data processing activities.
 *
 * @param action - The action performed (e.g., "consent_granted", "erasure_processed")
 * @param actorType - Type of actor: "employer", "doctor", "admin", or "system"
 * @param actorId - Optional identifier of the actor performing the action
 * @param resourceType - Type of resource affected (e.g., "consent", "patient")
 * @param resourceId - Optional identifier of the affected resource
 * @param details - Optional additional context about the action
 * @returns The ID of the created audit log entry
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

// Create consent
/**
 * Records explicit consent from a data subject for data processing activities.
 *
 * Per GDPR Article 6(1)(a), processing is lawful when the data subject has given
 * consent for specific purposes. This mutation creates an auditable consent record
 * that documents:
 * - The specific consent type granted
 * - The exact text presented to the data subject
 * - Version tracking for consent form changes
 * - Timestamp of when consent was obtained
 *
 * Consent types:
 * - "data_processing" - General personal data processing (Art. 6)
 * - "health_data" - Special category health data processing (Art. 9(2)(a))
 * - "employer_sharing" - Sharing fitness-to-work outcomes with employer
 *
 * @param patientEmail - Email address of the data subject
 * @param patientId - Optional reference to patient record
 * @param consentType - Category of consent being granted
 * @param consentText - Full text of consent shown to data subject
 * @param consentVersion - Version identifier for consent form tracking
 * @param collectedByEmployerId - Employer who collected the consent
 * @returns The ID of the created consent record
 */
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
    // Authorization: Only the owning employer can create consent
    await requireEmployerOwnership(ctx, args.collectedByEmployerId);

    const consentId = await ctx.db.insert("consents", {
      ...args,
      granted: true,
      grantedAt: Date.now(),
    });

    // Audit logging for GDPR compliance
    await ctx.runMutation(internal.gdpr.logAction, {
      action: "consent_granted",
      actorType: "employer",
      resourceType: "consent",
      resourceId: consentId,
      details: {
        patientEmail: args.patientEmail,
        consentType: args.consentType,
        consentVersion: args.consentVersion,
      },
    });

    return consentId;
  },
});;

// Withdraw consent
/**
 * Withdraws previously granted consent from a data subject.
 *
 * Per GDPR Article 7(3), data subjects have the right to withdraw consent
 * at any time. Withdrawal must be as easy as giving consent. This mutation:
 * - Marks the consent as withdrawn with a timestamp
 * - Does NOT delete the consent record (retained for audit purposes)
 * - Creates an audit log entry for accountability
 *
 * Note: Withdrawal does not affect the lawfulness of processing performed
 * before the withdrawal (per Art. 7(3)).
 *
 * @param consentId - The ID of the consent record to withdraw
 * @throws ConvexError with code "NOT_FOUND" if consent does not exist
 */
export const withdrawConsent = mutation({
  args: { consentId: v.id("consents") },
  handler: async (ctx, { consentId }) => {
    // Authorization: Only the owning employer can withdraw consent
    const consent = await ctx.db.get(consentId);
    if (!consent) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Consent not found" });
    }
    await requireEmployerOwnership(ctx, consent.collectedByEmployerId);

    await ctx.db.patch(consentId, {
      granted: false,
      withdrawnAt: Date.now(),
    });

    // Audit logging for GDPR compliance
    await ctx.runMutation(internal.gdpr.logAction, {
      action: "consent_withdrawn",
      actorType: "employer",
      resourceType: "consent",
      resourceId: consentId,
      details: {
        patientEmail: consent.patientEmail,
        consentType: consent.consentType,
      },
    });
  },
});

// Get consents by patient
/**
 * Retrieves all consent records for a specific patient.
 *
 * Per GDPR Article 15 (Right of Access), data subjects have the right to obtain
 * confirmation of whether their personal data is being processed and access to
 * that data. This query supports Subject Access Requests (SARs) by providing:
 * - All consent records (granted and withdrawn)
 * - Consent types, versions, and timestamps
 * - Processing basis documentation
 *
 * Authorization: Only the owning employer can view patient consents.
 *
 * @param patientId - The ID of the patient whose consents to retrieve
 * @returns Array of consent records for the patient
 * @throws ConvexError with code "NOT_FOUND" if patient does not exist
 */
export const getConsentsByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, { patientId }) => {
    // Authorization: Only the owning employer can view patient consents
    const patient = await ctx.db.get(patientId);
    if (!patient) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Patient not found" });
    }
    await requireEmployerOwnership(ctx, patient.employerId);

    return ctx.db
      .query("consents")
      .withIndex("by_patient", (q) => q.eq("patientId", patientId))
      .collect();
  },
});

// Request erasure (GDPR right to be forgotten)
/**
 * Submits a data erasure request (Right to be Forgotten).
 *
 * Per GDPR Article 17, data subjects have the right to obtain erasure of their
 * personal data without undue delay. This mutation creates an erasure request
 * that must be processed within 30 days (per Art. 12(3)).
 *
 * Grounds for erasure (Art. 17(1)):
 * - Personal data no longer necessary for original purpose
 * - Data subject withdraws consent
 * - Data subject objects to processing
 * - Personal data unlawfully processed
 * - Legal obligation to erase
 *
 * Note: Request can be submitted even if patient record not found (for cases
 * where the requester believes data exists but cannot be located).
 *
 * @param requesterEmail - Email address of the person requesting erasure
 * @param reason - Optional explanation for the erasure request
 * @returns The ID of the created erasure request
 */
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
/**
 * Lists erasure requests for admin review and processing.
 *
 * Per GDPR Article 12(3), erasure requests must be actioned within one month.
 * This query enables admins to monitor pending requests and track SLA compliance.
 * Results are paginated to handle high-volume request queues efficiently.
 *
 * Request statuses:
 * - "pending" - Awaiting admin review
 * - "in_progress" - Erasure being executed
 * - "completed" - All data redacted/deleted
 * - "rejected" - Request denied (with documented reason)
 *
 * Authorization: Admin-only access to protect data subject privacy.
 *
 * @param status - Optional filter by request status
 * @param paginationOpts - Pagination options for large result sets
 * @returns Paginated list of erasure requests
 */
export const listErasureRequests = query({
  args: { status: v.optional(v.string()), ...paginatedQueryArgs },
  handler: async (ctx, args) => {
    // Authorization: Only admins can list erasure requests
    await requireAdmin(ctx);

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
});

// Process erasure (admin)
/**
 * Executes data erasure for an approved request.
 *
 * Per GDPR Article 17, this mutation implements the Right to Erasure by:
 * 1. Redacting appointment records (replacing PII with "[REDACTED]")
 * 2. Redacting medical reports and clinical notes
 * 3. Withdrawing all active consents
 * 4. Soft-deleting the patient record (PII redacted, deletedAt timestamp set)
 *
 * Data retention exceptions (Art. 17(3)):
 * - Record IDs preserved for audit trail integrity
 * - Timestamps retained for legal compliance verification
 * - Audit logs retained per accountability requirements (Art. 5(2))
 *
 * This approach uses data minimization/pseudonymization rather than hard deletion
 * to maintain referential integrity while eliminating personal data.
 *
 * Authorization: Admin-only. Logged for accountability.
 *
 * @param requestId - The ID of the erasure request to process
 * @throws Error if the erasure request is not found
 */
export const processErasure = mutation({
  args: {
    requestId: v.id("erasureRequests"),
  },
  handler: async (ctx, { requestId }) => {
    // Authorization: Only admins can process erasure requests
    const admin = await requireAdmin(ctx);

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
      processedBy: admin.email,
    });

    // Audit log the erasure processing
    await ctx.runMutation(internal.gdpr.logAction, {
      action: "erasure_processed",
      actorType: "admin",
      actorId: admin._id,
      resourceType: "erasureRequest",
      resourceId: requestId,
      details: { patientId: request.patientId },
    });
  },
});;

// Get audit logs (admin)
/**
 * Retrieves audit logs for compliance monitoring and incident investigation.
 *
 * Per GDPR Article 5(2) (Accountability), controllers must demonstrate compliance
 * with data protection principles. This query provides access to the audit trail
 * with flexible filtering for:
 * - Compliance audits and ICO investigations
 * - Data breach forensics (Art. 33-34)
 * - Data subject access request fulfillment
 * - Internal security monitoring
 *
 * Retention: Audit logs should be retained for the statutory limitation period
 * (typically 6 years in UK) to support legal defense if needed.
 *
 * Authorization: Admin-only to protect audit trail integrity.
 *
 * @param limit - Maximum records to return (capped at 1000, default 100)
 * @param action - Filter by action type (e.g., "consent_granted")
 * @param actorType - Filter by actor: "employer", "doctor", "admin", "system"
 * @param resourceType - Filter by affected resource type
 * @param startTime - Filter logs after this timestamp (ms since epoch)
 * @param endTime - Filter logs before this timestamp (ms since epoch)
 * @returns Array of audit log entries, newest first
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

// Get audit logs by resource
/**
 * Retrieves all audit logs for a specific resource.
 *
 * Per GDPR Article 15 (Right of Access) and Article 5(2) (Accountability),
 * this query enables tracking the complete history of actions performed
 * on a specific resource. Useful for:
 * - Subject access requests (showing all actions on a patient record)
 * - Consent audit trails (showing grant/withdrawal history)
 * - Incident investigation (timeline of actions on compromised resource)
 *
 * Authorization: Admin-only to maintain audit trail confidentiality.
 *
 * @param resourceType - Type of resource (e.g., "patient", "consent", "erasureRequest")
 * @param resourceId - Identifier of the specific resource
 * @returns Array of audit log entries for the resource
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

// GDPR stats for admin dashboard
/**
 * Retrieves GDPR compliance dashboard metrics for admin oversight.
 *
 * Per GDPR Article 5(2) (Accountability), data controllers must be able to
 * demonstrate compliance. This query provides real-time metrics including:
 *
 * - Pending erasure count with SLA tracking (Art. 12(3) - 30 day deadline)
 * - Erasure requests approaching deadline (7 days warning)
 * - Overdue erasure requests (compliance violation indicator)
 * - Total active patients and consent status
 * - Patients with complete consent coverage (all 3 required types)
 * - Recent audit log activity by action type (7 day window)
 *
 * These metrics support:
 * - ICO audit readiness
 * - Proactive compliance monitoring
 * - Data protection officer (DPO) reporting
 *
 * Authorization: Admin-only to protect aggregate data insights.
 *
 * @returns GDPRStats object with compliance metrics and recent activity
 */
export const getGDPRStats = query({
  args: {},
  handler: async (ctx): Promise<GDPRStats> => {
    // Authorization: Only admins can view GDPR statistics
    await requireAdmin(ctx);

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
