import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";

const RETENTION_DAYS = 90;
const COMPLIANCE_RETENTION_YEARS = 7;

/**
 * Clean up old audit logs per GDPR data retention policy.
 *
 * - Standard logs: 90 days
 * - Compliance-critical logs (consent, erasure): 7 years
 */
export const cleanupAuditLogs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoffDate = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const complianceCutoff =
      Date.now() - COMPLIANCE_RETENTION_YEARS * 365 * 24 * 60 * 60 * 1000;

    // Get old logs (batch of 100 to avoid timeout)
    const oldLogs = await ctx.db
      .query("auditLogs")
      .filter((q) => q.lt(q.field("timestamp"), cutoffDate))
      .take(100);

    let deleted = 0;
    const complianceActions = [
      "consent_granted",
      "consent_withdrawn",
      "erasure_processed",
    ];

    for (const log of oldLogs) {
      // Keep compliance-critical logs longer
      if (
        complianceActions.includes(log.action) &&
        log.timestamp > complianceCutoff
      ) {
        continue;
      }

      await ctx.db.delete(log._id);
      deleted++;
    }

    // Log the cleanup action (if any deletions)
    if (deleted > 0) {
      await ctx.runMutation(internal.gdpr.logAction, {
        action: "data_retention_cleanup",
        actorType: "system",
        resourceType: "auditLogs",
        details: {
          deletedCount: deleted,
          cutoffDate: new Date(cutoffDate).toISOString(),
        },
      });
    }

    return { deleted };
  },
});
