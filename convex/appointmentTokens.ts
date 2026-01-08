/**
 * Appointment Token Management
 *
 * Generates and validates magic links for patient appointment access.
 * Tokens are SHA-256 hashed before storage for security.
 *
 * @module appointmentTokens
 */

import { v, ConvexError } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireEmployerOwnership } from "./authModules/authorization";
import { ErrorCodes } from "./lib/errorCodes";

const TOKEN_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

/**
 * Hash token using SHA-256 via Web Crypto API
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate a magic link token for an appointment
 *
 * @requires Employer authentication (must own the appointment)
 */
export const generate = mutation({
  args: {
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, { appointmentId }) => {
    // Get appointment and verify it exists
    const appointment = await ctx.db.get(appointmentId);
    if (!appointment) {
      throw new ConvexError({
        code: ErrorCodes.NOT_FOUND,
        message: "Appointment not found",
      });
    }

    // Verify employer ownership
    await requireEmployerOwnership(ctx, appointment.employerId);

    // Generate secure token using crypto.randomUUID
    const token = crypto.randomUUID();
    const tokenHash = await hashToken(token);

    const now = Date.now();
    const expiresAt = now + TOKEN_TTL_MS;

    // Store hashed token
    await ctx.db.insert("appointmentTokens", {
      tokenHash,
      appointmentId,
      patientId: appointment.patientId,
      createdAt: now,
      expiresAt,
    });

    // Audit log the token generation
    await ctx.runMutation(internal.gdpr.logAction, {
      action: "magic_link_generated",
      actorType: "employer",
      resourceType: "appointment",
      resourceId: appointmentId,
    });

    // Return unhashed token (only time it's visible)
    return { token, expiresAt };
  },
});

/**
 * Validate token and return appointment details
 *
 * PUBLIC - no auth required (token is the auth)
 */
export const validateAndGetAppointment = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, { token }) => {
    const tokenHash = await hashToken(token);

    const tokenRecord = await ctx.db
      .query("appointmentTokens")
      .withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
      .first();

    if (!tokenRecord) {
      return { valid: false as const, error: "Invalid or expired link" };
    }

    if (tokenRecord.expiresAt < Date.now()) {
      return { valid: false as const, error: "This link has expired" };
    }

    if (tokenRecord.invalidated) {
      return { valid: false as const, error: "This link is no longer valid" };
    }

    // Get appointment first (needed for other IDs)
    const appointment = await ctx.db.get(tokenRecord.appointmentId);
    if (!appointment) {
      return { valid: false as const, error: "Appointment not found" };
    }

    // Parallel batch 1: Independent entities
    const [patient, slot, appointmentType] = await Promise.all([
      ctx.db.get(tokenRecord.patientId),
      appointment.slotId ? ctx.db.get(appointment.slotId) : Promise.resolve(null),
      appointment.appointmentTypeId
        ? ctx.db.get(appointment.appointmentTypeId)
        : Promise.resolve(null),
    ]);

    // Parallel batch 2: Entities depending on previous
    const [doctor] = await Promise.all([
      slot?.doctorId ? ctx.db.get(slot.doctorId) : Promise.resolve(null),
    ]);

    return {
      valid: true as const,
      appointment: {
        id: appointment._id,
        status: appointment.status,
        reason: appointment.reasonForAppointment,
        scheduledDate: slot?.date,
        startTime: slot?.startTime,
        endTime: slot?.endTime,
      },
      patient: patient
        ? {
            firstName: patient.firstName,
            lastName: patient.lastName,
          }
        : null,
      doctor: doctor
        ? {
            name: doctor.name,
            zoomLink: doctor.zoomPersonalLink,
          }
        : null,
      appointmentType: appointmentType
        ? {
            name: appointmentType.name,
            duration: appointmentType.durationMinutes,
            description: appointmentType.description,
          }
        : null,
    };
  },
});


/**
 * Internal version of validateAndGetAppointment for HTTP actions
 *
 * INTERNAL - for use by httpAction only
 */
export const validateAndGetAppointmentInternal = internalQuery({
  args: {
    token: v.string(),
  },
  handler: async (ctx, { token }) => {
    const tokenHash = await hashToken(token);

    const tokenRecord = await ctx.db
      .query("appointmentTokens")
      .withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
      .first();

    if (!tokenRecord) {
      return { valid: false as const, error: "Invalid or expired link" };
    }

    if (tokenRecord.expiresAt < Date.now()) {
      return { valid: false as const, error: "This link has expired" };
    }

    if (tokenRecord.invalidated) {
      return { valid: false as const, error: "This link is no longer valid" };
    }

    // Get appointment first (needed for other IDs)
    const appointment = await ctx.db.get(tokenRecord.appointmentId);
    if (!appointment) {
      return { valid: false as const, error: "Appointment not found" };
    }

    // Parallel batch 1: Independent entities
    const [patient, slot, appointmentType] = await Promise.all([
      ctx.db.get(tokenRecord.patientId),
      appointment.slotId ? ctx.db.get(appointment.slotId) : Promise.resolve(null),
      appointment.appointmentTypeId
        ? ctx.db.get(appointment.appointmentTypeId)
        : Promise.resolve(null),
    ]);

    // Parallel batch 2: Entities depending on previous
    const [doctor] = await Promise.all([
      slot?.doctorId ? ctx.db.get(slot.doctorId) : Promise.resolve(null),
    ]);

    return {
      valid: true as const,
      appointment: {
        id: appointment._id,
        status: appointment.status,
        reason: appointment.reasonForAppointment,
        scheduledDate: slot?.date,
        startTime: slot?.startTime,
        endTime: slot?.endTime,
      },
      patient: patient
        ? {
            firstName: patient.firstName,
            lastName: patient.lastName,
          }
        : null,
      doctor: doctor
        ? {
            name: doctor.name,
            zoomLink: doctor.zoomPersonalLink,
          }
        : null,
      appointmentType: appointmentType
        ? {
            name: appointmentType.name,
            duration: appointmentType.durationMinutes,
            description: appointmentType.description,
          }
        : null,
    };
  },
});

/**
 * Mark token as viewed (for analytics)
 *
 * PUBLIC - no auth required
 */
export const markViewed = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const tokenHash = await hashToken(token);
    const tokenRecord = await ctx.db
      .query("appointmentTokens")
      .withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
      .first();

    if (tokenRecord && !tokenRecord.viewedAt) {
      await ctx.db.patch(tokenRecord._id, { viewedAt: Date.now() });
    }
  },
});

/**
 * Invalidate all tokens for an appointment (e.g., on cancellation)
 *
 * Internal mutation - called when appointment is cancelled
 */
export const invalidateForAppointment = internalMutation({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, { appointmentId }) => {
    const tokens = await ctx.db
      .query("appointmentTokens")
      .withIndex("by_appointment", (q) => q.eq("appointmentId", appointmentId))
      .collect();

    for (const token of tokens) {
      await ctx.db.patch(token._id, { invalidated: true });
    }
  },
});
