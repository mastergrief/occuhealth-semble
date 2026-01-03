import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ---------------------------------------------------------------------------
// Reports Management
// ---------------------------------------------------------------------------
// Medical fit-for-work report handling with employer delivery
// ---------------------------------------------------------------------------

// Get report by ID
export const getById = query({
  args: { reportId: v.id("reports") },
  handler: async (ctx, { reportId }) => {
    return ctx.db.get(reportId);
  },
});

// Get report by appointment
export const getByAppointment = query({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, { appointmentId }) => {
    return ctx.db
      .query("reports")
      .withIndex("by_appointment", (q) => q.eq("appointmentId", appointmentId))
      .first();
  },
});

// List reports by employer
export const listByEmployer = query({
  args: { employerId: v.id("employers") },
  handler: async (ctx, { employerId }) => {
    const reports = await ctx.db
      .query("reports")
      .withIndex("by_employer", (q) => q.eq("employerId", employerId))
      .collect();

    return Promise.all(
      reports.map(async (report) => ({
        ...report,
        patient: await ctx.db.get(report.patientId),
      }))
    );
  },
});

// Create report
export const create = mutation({
  args: {
    appointmentId: v.id("appointments"),
    fitForWork: v.union(
      v.literal("fit"),
      v.literal("fit_with_restrictions"),
      v.literal("temporarily_unfit"),
      v.literal("needs_further_assessment")
    ),
    summary: v.string(),
    restrictions: v.optional(v.array(v.string())),
    followUpRequired: v.boolean(),
    followUpNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new Error("Appointment not found");

    const reportId = await ctx.db.insert("reports", {
      appointmentId: args.appointmentId,
      patientId: appointment.patientId,
      employerId: appointment.employerId,
      fitForWork: args.fitForWork,
      summary: args.summary,
      restrictions: args.restrictions,
      followUpRequired: args.followUpRequired,
      followUpNotes: args.followUpNotes,
      signedAt: Date.now(),
    });

    // Link report to appointment
    await ctx.db.patch(args.appointmentId, { reportId });

    return reportId;
  },
});

// Send report to employer
export const sendToEmployer = mutation({
  args: { reportId: v.id("reports") },
  handler: async (ctx, { reportId }) => {
    await ctx.db.patch(reportId, {
      sentToEmployerAt: Date.now(),
    });
  },
});

// Mark report as viewed by employer
export const markViewed = mutation({
  args: { reportId: v.id("reports") },
  handler: async (ctx, { reportId }) => {
    await ctx.db.patch(reportId, {
      viewedByEmployerAt: Date.now(),
    });
  },
});
