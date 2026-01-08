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

    const now = Date.now();
    const SIX_MINUTES_MS = 6 * 60 * 1000;

    // Try to read from cache first
    const cachedStats = await ctx.db.query("gdprStatsCache").first();

    // Always fetch fresh recent audit logs (lightweight query)
    const recentAuditLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .take(10);

    // If cache exists and is less than 6 minutes old, use it
    if (cachedStats && now - cachedStats.computedAt < SIX_MINUTES_MS) {
      return {
        pendingErasureCount: cachedStats.pendingErasureCount,
        totalPatients: cachedStats.totalPatients,
        activeConsents: cachedStats.activeConsents,
        recentAuditLogs,
        patientsWithAllConsents: cachedStats.patientsWithAllConsents,
        auditLogsByAction: cachedStats.auditLogsByAction,
        erasureApproachingDeadline: cachedStats.erasureApproachingDeadline,
        erasureOverdue: cachedStats.erasureOverdue,
      };
    }

    // Fallback: compute stats with bounded queries
    const pendingErasures = await ctx.db
      .query("erasureRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(1000);

    const patients = await ctx.db
      .query("patients")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .take(10000);

    const activeConsents = await ctx.db
      .query("consents")
      .withIndex("by_granted", (q) => q.eq("granted", true))
      .take(10000);

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

    // Audit logs by action (last 7 days, bounded)
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recentLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_timestamp")
      .filter((q) => q.gte(q.field("timestamp"), sevenDaysAgo))
      .take(5000);

    const actionCounts = new Map<string, number>();
    for (const log of recentLogs) {
      actionCounts.set(log.action, (actionCounts.get(log.action) || 0) + 1);
    }
    const auditLogsByAction = Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count);

    // Erasure SLA tracking (GDPR requires 30 days)
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
      totalPatients: patients.length,
      activeConsents: activeConsents.length,
      recentAuditLogs,
      patientsWithAllConsents,
      auditLogsByAction,
      erasureApproachingDeadline,
      erasureOverdue,
    };
  },
});
