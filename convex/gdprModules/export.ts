/**
 * GDPR Article 20 - Data Portability
 *
 * Provides patient data export functionality for GDPR compliance.
 * Admin-only operation that returns all patient data in a portable format.
 *
 * @module gdprModules/export
 */

import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../authModules";

/**
 * Export all data associated with a patient for GDPR Article 20 compliance.
 *
 * This query collects:
 * - Patient personal information
 * - Employer information
 * - All consent records
 * - All appointments (with type names)
 * - All reports
 *
 * @param patientId - The ID of the patient to export data for
 * @returns Portable data export object or null if patient not found/deleted
 * @throws ConvexError if caller is not an admin
 *
 * @example
 * ```ts
 * const exportData = await ctx.runQuery(api.gdpr.exportPatientData, {
 *   patientId: patientIdValue
 * });
 * // Convert to JSON and provide to data subject
 * ```
 */
export const exportPatientData = query({
  args: {
    patientId: v.id("patients"),
  },
  handler: async (ctx, args) => {
    // 1. Verify admin access
    await requireAdmin(ctx);

    // 2. Fetch patient (check not deleted)
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.deletedAt) {
      return null;
    }

    // 3. Fetch employer for context
    const employer = await ctx.db.get(patient.employerId);

    // 4. Fetch all consents for this patient
    const consents = await ctx.db
      .query("consents")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();

    // 5. Fetch all appointments for this patient
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();

    // 6. Fetch appointment types for human-readable names
    const typeIds = [...new Set(appointments.map((a) => a.appointmentTypeId))];
    const types = await Promise.all(typeIds.map((id) => ctx.db.get(id)));
    const typeMap = new Map(
      types.filter(Boolean).map((t) => [t!._id, t!.name])
    );

    // 7. Fetch all reports for this patient
    const reports = await ctx.db
      .query("reports")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();

    // 8. Build GDPR-compliant export structure
    return {
      exportedAt: new Date().toISOString(),
      patient: {
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        dateOfBirth: patient.dateOfBirth,
        jobTitle: patient.jobTitle,
        department: patient.department,
        employeeReference: patient.employeeReference,
      },
      employer: {
        companyName: employer?.companyName ?? "Unknown",
        companyType: employer?.companyType ?? "Unknown",
      },
      consents: consents.map((c) => ({
        type: c.consentType,
        granted: c.granted,
        grantedAt: c.grantedAt
          ? new Date(c.grantedAt).toISOString()
          : undefined,
        withdrawnAt: c.withdrawnAt
          ? new Date(c.withdrawnAt).toISOString()
          : undefined,
      })),
      appointments: appointments.map((a) => ({
        date: a.scheduledDate,
        time: a.scheduledTime,
        type: typeMap.get(a.appointmentTypeId) ?? "Unknown",
        status: a.status,
        reason: a.reasonForAppointment,
      })),
      reports: reports.map((r) => ({
        date: r.signedAt
          ? new Date(r.signedAt).toISOString().split("T")[0]
          : "Unknown",
        fitForWork: r.fitForWork,
        summary: r.summary,
        restrictions: r.restrictions,
        followUpRequired: r.followUpRequired,
      })),
    };
  },
});
