import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  requireEmployerOwnership,
  requireDoctorAccess,
  getAuthenticatedUser,
} from "./authModules";
import { paginatedQueryArgs, toPaginatedResult } from "./helpers/pagination";
import { extractUniqueIds, batchGet, enrichWithRelation } from "./helpers/batchFetch";
import { logReportAction } from "./helpers/auditLogger";

// ---------------------------------------------------------------------------
// Reports Management
// ---------------------------------------------------------------------------
// Medical fit-for-work report handling with employer delivery
// ---------------------------------------------------------------------------

// Get report by ID

export const getById = query({
  args: { reportId: v.id("reports") },
  handler: async (ctx, { reportId }) => {
    const report = await ctx.db.get(reportId);
    if (!report) return null;

    // Verify caller owns the employer this report is for
    await requireEmployerOwnership(ctx, report.employerId);

    return report;
  },
});

// Get report by appointment
export const getByAppointment = query({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, { appointmentId }) => {
    // First fetch the appointment to get employerId
    const appointment = await ctx.db.get(appointmentId);
    if (!appointment) return null;

    // Verify caller owns the employer OR is a doctor
    const user = await getAuthenticatedUser(ctx);
    if (!user) {
      throw new ConvexError({
        code: "UNAUTHENTICATED" as const,
        message: "Authentication required",
      });
    }

    // Check if user is a doctor
    const doctor = await ctx.db
      .query("doctorSettings")
      .withIndex("by_workos_user", (q) => q.eq("workosUserId", user.workosUserId))
      .first();

    // If not a doctor, must be the employer
    if (!doctor) {
      await requireEmployerOwnership(ctx, appointment.employerId);
    }

    return ctx.db
      .query("reports")
      .withIndex("by_appointment", (q) => q.eq("appointmentId", appointmentId))
      .first();
  },
});

// List reports by employer
export const listByEmployer = query({
  args: { 
    employerId: v.id("employers"),
    ...paginatedQueryArgs,
  },
  handler: async (ctx, args) => {
    // Verify caller owns the employer
    await requireEmployerOwnership(ctx, args.employerId);

    const result = await ctx.db
      .query("reports")
      .withIndex("by_employer", (q) => q.eq("employerId", args.employerId))
      .paginate(args.paginationOpts);

    // Batch fetch patients (O(1) instead of N queries)
    const patientIds = extractUniqueIds(result.page, (r) => r.patientId);
    const patientMap = await batchGet(ctx, patientIds);

    // Filter out reports where patient has been soft-deleted (GDPR compliance)
    const activeReports = result.page.filter((report) => {
      const patient = patientMap.get(report.patientId);
      return patient && patient.deletedAt === undefined;
    });

    const enriched = enrichWithRelation(activeReports, patientMap, (r) => r.patientId, "patient");

    return {
      ...toPaginatedResult(result),
      items: enriched,  // Override items with enriched data
    };
  },
});;

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
    // Only doctors can create medical reports
    await requireDoctorAccess(ctx);

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

    // Log the report creation for audit trail
    await logReportAction(ctx, "report_created", reportId, appointment.patientId, {
      appointmentId: args.appointmentId,
      fitForWork: args.fitForWork,
    });

    return reportId;
  },
});;

// Send report to employer
export const sendToEmployer = mutation({
  args: { reportId: v.id("reports") },
  handler: async (ctx, { reportId }) => {
    // Only doctors can send reports to employers
    await requireDoctorAccess(ctx);

    const report = await ctx.db.get(reportId);
    if (!report) {
      throw new ConvexError({
        code: "REPORT_NOT_FOUND" as const,
        message: "Report not found",
      });
    }

    await ctx.db.patch(reportId, {
      sentToEmployerAt: Date.now(),
    });

    // Log the report sent action for audit trail
    await logReportAction(ctx, "report_sent_to_employer", reportId, report.patientId, {
      employerId: report.employerId,
    });
  },
});;

// Mark report as viewed by employer
export const markViewed = mutation({
  args: { reportId: v.id("reports") },
  handler: async (ctx, { reportId }) => {
    const report = await ctx.db.get(reportId);
    if (!report) {
      throw new ConvexError({
        code: "REPORT_NOT_FOUND" as const,
        message: "Report not found",
      });
    }

    // Only the employer receiving the report can mark it viewed
    await requireEmployerOwnership(ctx, report.employerId);

    await ctx.db.patch(reportId, {
      viewedByEmployerAt: Date.now(),
    });

    // Log the report viewed action for audit trail
    await logReportAction(ctx, "report_viewed", reportId, report.patientId, {
      employerId: report.employerId,
    });
  },
});;
