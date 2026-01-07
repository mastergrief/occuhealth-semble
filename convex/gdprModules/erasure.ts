// convex/gdprModules/erasure.ts
// Erasure request functions for GDPR compliance

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../authModules";
import { internal } from "../_generated/api";
import { paginatedQueryArgs, toPaginatedResult } from "../helpers/pagination";

/**
 * Requests erasure of personal data (GDPR Article 17 - Right to Erasure).
 * Creates a pending erasure request for admin review.
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

/**
 * Lists erasure requests with optional status filter.
 * Only admins can list erasure requests.
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

/**
 * Processes an erasure request by redacting all personal data.
 * Only admins can process erasure requests.
 *
 * This implements GDPR Article 17 (Right to Erasure) by:
 * 1. Redacting appointment data
 * 2. Redacting report data
 * 3. Redacting clinical notes
 * 4. Withdrawing all consents
 * 5. Soft-deleting patient (redacting PII)
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
});
