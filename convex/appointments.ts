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

/**
 * Get an appointment by ID with related patient, employer, and type data.
 *
 * @param appointmentId - The appointment document ID to retrieve
 * @returns Appointment with patient, employer, and appointmentType relations, or null if not found
 * @throws ConvexError if caller does not own the employer associated with this appointment
 */
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

/**
 * List appointments for a specific employer with pagination.
 *
 * Filters out appointments for soft-deleted patients (GDPR compliance).
 * Uses batch fetching to avoid N+1 query patterns.
 *
 * @param employerId - The employer document ID to list appointments for
 * @param paginationOpts - Pagination options (cursor, numItems)
 * @returns Paginated list of appointments enriched with patient data
 * @throws ConvexError if caller does not own the specified employer
 */
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
});

/**
 * List appointments by date with patient, employer, and type info.
 *
 * Used by doctor Appointments page to browse appointments for a specific date.
 * Uses batch fetching to efficiently load related entities.
 *
 * @param date - Date in YYYY-MM-DD format to filter appointments
 * @param paginationOpts - Pagination options (cursor, numItems)
 * @returns Paginated list of appointments with patient, employer, and appointmentType relations
 * @throws ConvexError if caller is not authenticated as a doctor
 */
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

/**
 * Get all appointments scheduled for today.
 *
 * Used by doctor Dashboard to display today's schedule overview.
 *
 * @returns Array of appointment documents scheduled for the current date
 * @throws ConvexError if caller is not authenticated as a doctor
 */
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

/**
 * Book a new appointment for a patient.
 *
 * Creates an appointment, marks the selected slot as booked, and logs
 * the action for audit trail compliance.
 *
 * @param patientId - The patient document ID to book the appointment for
 * @param employerId - The employer document ID booking the appointment
 * @param appointmentTypeId - The appointment type document ID
 * @param slotId - The available slot document ID to reserve
 * @param reasonForAppointment - Optional reason for the appointment
 * @param preAppointmentNotes - Optional notes to include before the appointment
 * @returns The newly created appointment document ID
 * @throws ConvexError if caller does not own the employer
 * @throws ConvexError if the slot is not available (SLOT_UNAVAILABLE)
 * @throws ConvexError if patient does not belong to employer (UNAUTHORIZED)
 */
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
    const employer = await requireEmployerOwnership(ctx, args.employerId);

    // Verify employer is approved before allowing booking
    if (employer.status !== "verified") {
      throw new ConvexError({
        code: "EMPLOYER_NOT_VERIFIED" as const,
        message: "Only verified employers can book appointments. Please wait for admin approval.",
      });
    }

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

/**
 * Mark an appointment as completed.
 *
 * Used by doctors after completing a patient consultation.
 * Records completion timestamp and creates an audit log entry.
 *
 * @param appointmentId - The appointment document ID to mark as completed
 * @returns void
 * @throws ConvexError if caller is not authenticated as a doctor
 * @throws ConvexError if appointment not found (NOT_FOUND)
 */
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
});

/**
 * Cancel an appointment and free up the associated slot.
 *
 * Releases the booked slot back to available status and marks
 * the appointment as cancelled with a timestamp.
 *
 * @param appointmentId - The appointment document ID to cancel
 * @returns void
 * @throws ConvexError if appointment not found (NOT_FOUND)
 * @throws ConvexError if caller does not own the employer who booked the appointment
 */
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

/**
 * Update the status of an appointment.
 *
 * Allows employers to change appointment status (e.g., confirm, mark no-show).
 *
 * @param appointmentId - The appointment document ID to update
 * @param status - New status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show"
 * @returns void
 * @throws ConvexError if appointment not found (NOT_FOUND)
 * @throws ConvexError if caller does not own the employer who booked the appointment
 */
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
