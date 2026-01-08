import { internalMutation } from "../_generated/server";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Update GDPR stats cache.
 *
 * Computes aggregate statistics from patients, consents, erasure requests,
 * and audit logs, then stores in gdprStatsCache table.
 *
 * Runs every 5 minutes via cron. Bounded queries with .take() to prevent
 * unbounded collection that could cause timeouts on large datasets.
 */
export const updateGDPRStatsCache = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Count pending erasure requests (typically small, OK to collect)
    const pendingErasures = await ctx.db
      .query("erasureRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    // Calculate erasure SLA metrics
    let erasureApproachingDeadline = 0;
    let erasureOverdue = 0;

    for (const request of pendingErasures) {
      const daysSinceRequest = now - request.requestedAt;
      if (daysSinceRequest > THIRTY_DAYS_MS) {
        erasureOverdue++;
      } else if (daysSinceRequest > THIRTY_DAYS_MS - SEVEN_DAYS_MS) {
        erasureApproachingDeadline++;
      }
    }

    // Count total patients (bounded query)
    // Using .take() with reasonable limit for stats; exact count not critical
    const patients = await ctx.db
      .query("patients")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .take(50000);
    const totalPatients = patients.length;

    // Count active consents using index (bounded)
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
    const sevenDaysAgo = now - SEVEN_DAYS_MS;
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

    // Delete old cache entries
    const existingCache = await ctx.db.query("gdprStatsCache").collect();
    for (const entry of existingCache) {
      await ctx.db.delete(entry._id);
    }

    // Insert new cache entry
    await ctx.db.insert("gdprStatsCache", {
      computedAt: now,
      totalPatients,
      activeConsents: activeConsents.length,
      pendingErasureCount: pendingErasures.length,
      patientsWithAllConsents,
      erasureApproachingDeadline,
      erasureOverdue,
      auditLogsByAction,
    });

    return {
      computedAt: now,
      totalPatients,
      activeConsents: activeConsents.length,
      pendingErasureCount: pendingErasures.length,
    };
  },
});
