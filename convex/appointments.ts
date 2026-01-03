import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// ---------------------------------------------------------------------------
// Appointments Management
// ---------------------------------------------------------------------------
// Booking flow with slot management and status tracking
// ---------------------------------------------------------------------------

// Get appointment by ID with related data
export const getById = query({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, { appointmentId }) => {
    const appointment = await ctx.db.get(appointmentId);
    if (!appointment) return null;

    const patient = await ctx.db.get(appointment.patientId);
    const employer = await ctx.db.get(appointment.employerId);
    const appointmentType = await ctx.db.get(appointment.appointmentTypeId);

    return { ...appointment, patient, employer, appointmentType };
  },
});

// List appointments by employer
export const listByEmployer = query({
  args: { employerId: v.id("employers") },
  handler: async (ctx, { employerId }) => {
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_employer", (q) => q.eq("employerId", employerId))
      .collect();

    // Enrich with patient data
    return Promise.all(
      appointments.map(async (apt) => ({
        ...apt,
        patient: await ctx.db.get(apt.patientId),
      }))
    );
  },
});

// List appointments by date (for doctor)
export const listByDate = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("scheduledDate", date))
      .collect();

    return Promise.all(
      appointments.map(async (apt) => ({
        ...apt,
        patient: await ctx.db.get(apt.patientId),
        employer: await ctx.db.get(apt.employerId),
        appointmentType: await ctx.db.get(apt.appointmentTypeId),
      }))
    );
  },
});

// Get today's appointments (for doctor dashboard)
export const getTodaysAppointments = query({
  args: {},
  handler: async (ctx): Promise<Doc<"appointments">[]> => {
    const today = new Date().toISOString().split("T")[0];
    return ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("scheduledDate", today))
      .collect();
  },
});

// Book appointment
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
    // Verify slot is available
    const slot = await ctx.db.get(args.slotId);
    if (!slot || slot.status !== "available") {
      throw new Error("Slot is not available");
    }

    // Verify employer owns patient
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.employerId !== args.employerId) {
      throw new Error("Unauthorized: patient does not belong to employer");
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

    return appointmentId;
  },
});

// Mark appointment complete
export const markCompleted = mutation({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, { appointmentId }) => {
    await ctx.db.patch(appointmentId, {
      status: "completed",
      completedAt: Date.now(),
    });
  },
});

// Cancel appointment
export const cancel = mutation({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, { appointmentId }) => {
    const appointment = await ctx.db.get(appointmentId);
    if (!appointment) throw new Error("Appointment not found");

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
    await ctx.db.patch(appointmentId, { status });
  },
});
