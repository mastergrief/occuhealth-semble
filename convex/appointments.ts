import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { ConvexError } from "convex/values";
import {
  requireEmployerOwnership,
  requireDoctorAccess,
} from "./authModules";
import {
  paginatedQueryArgs,
  toPaginatedResult,
} from "./helpers/pagination";
import {
  extractUniqueIds,
  batchGet,
  enrichWithRelation,
} from "./helpers/batchFetch";
import { logAppointmentAction } from "./helpers/auditLogger";

// ---------------------------------------------------------------------------
// Appointments Management
// ---------------------------------------------------------------------------
// Booking flow with slot management and status tracking
// Authorization: Employers see their own appointments, doctors see by date
// ---------------------------------------------------------------------------

// Get appointment by ID with related data
// Authorization: Employer can see their own appointments
export const getById = query({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, { appointmentId }) => {
    const appointment = await ctx.db.get(appointmentId);
    if (!appointment) return null;

    // Verify caller owns this employer
    await requireEmployerOwnership(ctx, appointment.employerId);

    const patient = await ctx.db.get(appointment.patientId);
    const employer = await ctx.db.get(appointment.employerId);
    const appointmentType = await ctx.db.get(appointment.appointmentTypeId);

    return { ...appointment, patient, employer, appointmentType };
  },
});

// List appointments by employer
// Authorization: Caller must own the employer
export const listByEmployer = query({
  args: { 
    employerId: v.id("employers"),
    ...paginatedQueryArgs,
  },
  handler: async (ctx, { employerId, paginationOpts }) => {
    // Verify caller owns this employer
    await requireEmployerOwnership(ctx, employerId);

    const paginatedResult = await ctx.db
      .query("appointments")
      .withIndex("by_employer", (q) => q.eq("employerId", employerId))
      .paginate(paginationOpts);

    // Batch fetch patient data to avoid N+1
    const patientIds = extractUniqueIds(paginatedResult.page, (a) => a.patientId);
    const patientMap = await batchGet(ctx, patientIds);

    // Filter out appointments where patient has been soft-deleted (GDPR compliance)
    const activeAppointments = paginatedResult.page.filter((appointment) => {
      const patient = patientMap.get(appointment.patientId);
      return patient && patient.deletedAt === undefined;
    });

    // Enrich with patient data
    const enrichedItems = enrichWithRelation(
      activeAppointments,
      patientMap,
      (a) => a.patientId,
      "patient"
    );

    return toPaginatedResult({ ...paginatedResult, page: enrichedItems });
  },
});;

// List appointments by date (for doctor)
// Authorization: Only doctors can view all appointments by date
export const listByDate = query({
  args: { date: v.string(), ...paginatedQueryArgs },
  handler: async (ctx, { date, paginationOpts }) => {
    // Verify caller is a doctor
    await requireDoctorAccess(ctx);

    const paginatedResult = await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("scheduledDate", date))
      .paginate(paginationOpts);

    // Batch fetch all three relations to avoid 3N+1 pattern
    const patientIds = extractUniqueIds(paginatedResult.page, (a) => a.patientId);
    const employerIds = extractUniqueIds(paginatedResult.page, (a) => a.employerId);
    const typeIds = extractUniqueIds(paginatedResult.page, (a) => a.appointmentTypeId);

    const [patientMap, employerMap, typeMap] = await Promise.all([
      batchGet(ctx, patientIds),
      batchGet(ctx, employerIds),
      batchGet(ctx, typeIds),
    ]);

    // Enrich with all three relations in a single map
    const enriched = paginatedResult.page.map((apt) => ({
      ...apt,
      patient: patientMap.get(apt.patientId) ?? null,
      employer: employerMap.get(apt.employerId) ?? null,
      appointmentType: typeMap.get(apt.appointmentTypeId) ?? null,
    }));

    return toPaginatedResult({ ...paginatedResult, page: enriched });
  },
});

// Get today's appointments (for doctor dashboard)
// Authorization: Only doctors can view today's appointments
export const getTodaysAppointments = query({
  args: {},
  handler: async (ctx): Promise<Doc<"appointments">[]> => {
    // Verify caller is a doctor
    await requireDoctorAccess(ctx);

    const today = new Date().toISOString().split("T")[0];
    return ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("scheduledDate", today))
      .collect();
  },
});

// Book appointment
// Authorization: Caller must own the employer booking the appointment
export const book = mutation({
  args: {
    patientId: v.id("patients"),
    employerId: v.id("employers"),
    appointmentTypeId: v.id("appointmentTypes"),
    slotId: v.id("availableSlots"),
    reasonForAppointment: v.optional(v.string()),
    preAppointmentNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify caller owns this employer
    await requireEmployerOwnership(ctx, args.employerId);

    // Verify slot is available
    const slot = await ctx.db.get(args.slotId);
    if (!slot || slot.status !== "available") {
      throw new ConvexError({
        code: "SLOT_UNAVAILABLE" as const,
        message: "Slot is not available",
      });
    }

    // Verify employer owns patient
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.employerId !== args.employerId) {
      throw new ConvexError({
        code: "UNAUTHORIZED" as const,
        message: "Unauthorized: patient does not belong to employer",
      });
    }

    // Create appointment
    const appointmentId = await ctx.db.insert("appointments", {
      patientId: args.patientId,
      employerId: args.employerId,
      appointmentTypeId: args.appointmentTypeId,
      slotId: args.slotId,
      scheduledDate: slot.date,
      scheduledTime: slot.startTime,
      status: "scheduled",
      reasonForAppointment: args.reasonForAppointment,
      preAppointmentNotes: args.preAppointmentNotes,
      createdAt: Date.now(),
    });

    // Mark slot as booked
    await ctx.db.patch(args.slotId, {
      status: "booked",
      appointmentId,
    });

    // Log the appointment booking for audit trail
    await logAppointmentAction(ctx, "appointment_booked", appointmentId, args.patientId, {
      employerId: args.employerId,
      appointmentTypeId: args.appointmentTypeId,
      scheduledDate: slot.date,
      scheduledTime: slot.startTime,
    });

    return appointmentId;
  },
});;

// Mark appointment complete
// Authorization: Only doctors can mark appointments as completed
export const markCompleted = mutation({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, { appointmentId }) => {
    // Verify caller is a doctor
    await requireDoctorAccess(ctx);

    const appointment = await ctx.db.get(appointmentId);
    if (!appointment) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Appointment not found",
      });
    }

    await ctx.db.patch(appointmentId, {
      status: "completed",
      completedAt: Date.now(),
    });

    // Log the appointment completion for audit trail
    await logAppointmentAction(ctx, "appointment_completed", appointmentId, appointment.patientId, {
      employerId: appointment.employerId,
    });
  },
});;

// Cancel appointment
// Authorization: Caller must own the employer who booked the appointment
export const cancel = mutation({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, { appointmentId }) => {
    const appointment = await ctx.db.get(appointmentId);
    if (!appointment) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Appointment not found",
      });
    }

    // Verify caller owns this employer
    await requireEmployerOwnership(ctx, appointment.employerId);

    // Free up the slot
    await ctx.db.patch(appointment.slotId, {
      status: "available",
      appointmentId: undefined,
    });

    await ctx.db.patch(appointmentId, {
      status: "cancelled",
      cancelledAt: Date.now(),
    });
  },
});

// Update appointment status
// Authorization: Caller must own the employer who booked the appointment
export const updateStatus = mutation({
  args: {
    appointmentId: v.id("appointments"),
    status: v.union(
      v.literal("scheduled"),
      v.literal("confirmed"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("no_show")
    ),
  },
  handler: async (ctx, { appointmentId, status }) => {
    const appointment = await ctx.db.get(appointmentId);
    if (!appointment) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Appointment not found",
      });
    }

    // Verify caller owns this employer
    await requireEmployerOwnership(ctx, appointment.employerId);

    await ctx.db.patch(appointmentId, { status });
  },
});
