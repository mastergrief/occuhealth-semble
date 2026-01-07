import { query } from "../_generated/server";
import { requireAdmin } from "../authModules";
import type { GDPRStats } from "./types";

/**
 * Get GDPR statistics for the admin dashboard
 * Authorization: Admin only
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
