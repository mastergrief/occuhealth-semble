/**
 * Clinical Notes Management
 *
 * Doctor-only clinical notes for appointments.
 * These notes are protected and never sent to employers.
 * Used as input for AI report generation.
 *
 * GDPR Note: Clinical notes are redacted during erasure requests,
 * with findings and diagnosis set to "[REDACTED]".
 */

import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireDoctorAccess } from "./authModules";
import { ErrorCodes } from "./lib/errorCodes";

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create clinical notes for an appointment.
 *
 * @auth doctor - Requires doctor authentication
 * @throws {ConvexError} NOT_FOUND - Appointment not found
 * @param ctx - Convex mutation context
 * @param args.appointmentId - The appointment these notes are for
 * @param args.findings - Clinical findings (doctor's observations)
 * @param args.diagnosis - Optional diagnosis
 * @returns The newly created clinical notes document ID
 */
export const create = mutation({
  args: {
    appointmentId: v.id("appointments"),
    findings: v.string(),
    diagnosis: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Only doctors can create clinical notes
    await requireDoctorAccess(ctx);

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) {
      throw new ConvexError({
        code: ErrorCodes.NOT_FOUND,
        message: "Appointment not found",
      });
    }

    // Check if clinical notes already exist for this appointment
    const existing = await ctx.db
      .query("clinicalNotes")
      .withIndex("by_appointment", (q) =>
        q.eq("appointmentId", args.appointmentId)
      )
      .first();

    if (existing) {
      throw new ConvexError({
        code: ErrorCodes.ALREADY_EXISTS,
        message: "Clinical notes already exist for this appointment",
      });
    }

    return await ctx.db.insert("clinicalNotes", {
      appointmentId: args.appointmentId,
      patientId: appointment.patientId,
      findings: args.findings,
      diagnosis: args.diagnosis,
      createdAt: Date.now(),
    });
  },
});

/**
 * Update clinical notes for an appointment.
 *
 * @auth doctor - Requires doctor authentication
 * @throws {ConvexError} NOT_FOUND - Clinical notes not found
 * @param ctx - Convex mutation context
 * @param args.clinicalNotesId - The clinical notes document ID
 * @param args.findings - Updated clinical findings
 * @param args.diagnosis - Optional updated diagnosis
 */
export const update = mutation({
  args: {
    clinicalNotesId: v.id("clinicalNotes"),
    findings: v.string(),
    diagnosis: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Only doctors can update clinical notes
    await requireDoctorAccess(ctx);

    const existingNotes = await ctx.db.get(args.clinicalNotesId);
    if (!existingNotes) {
      throw new ConvexError({
        code: ErrorCodes.NOT_FOUND,
        message: "Clinical notes not found",
      });
    }

    await ctx.db.patch(args.clinicalNotesId, {
      findings: args.findings,
      diagnosis: args.diagnosis,
    });
  },
});

// =============================================================================
// Queries
// =============================================================================

/**
 * Get clinical notes by appointment ID.
 *
 * @auth doctor - Requires doctor authentication
 * @param ctx - Convex query context
 * @param args.appointmentId - The appointment document ID
 * @returns Clinical notes document or null if not found
 */
export const getByAppointment = query({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    // Only doctors can view clinical notes
    await requireDoctorAccess(ctx);

    return await ctx.db
      .query("clinicalNotes")
      .withIndex("by_appointment", (q) =>
        q.eq("appointmentId", args.appointmentId)
      )
      .first();
  },
});

/**
 * Get clinical notes by ID.
 *
 * @auth doctor - Requires doctor authentication
 * @param ctx - Convex query context
 * @param args.clinicalNotesId - The clinical notes document ID
 * @returns Clinical notes document or null if not found
 */
export const getById = query({
  args: { clinicalNotesId: v.id("clinicalNotes") },
  handler: async (ctx, args) => {
    // Only doctors can view clinical notes
    await requireDoctorAccess(ctx);

    return await ctx.db.get(args.clinicalNotesId);
  },
});
