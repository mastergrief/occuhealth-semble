import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily data retention cleanup at 3 AM UTC
crons.daily(
  "data retention cleanup",
  { hourUTC: 3, minuteUTC: 0 },
  internal.scheduled.dataRetention.cleanupAuditLogs
);

// Refresh GDPR stats cache every 5 minutes
crons.interval(
  "refresh gdpr stats cache",
  { minutes: 5 },
  internal.scheduled.gdprStatsCache.updateGDPRStatsCache
);

// Clean expired AI cache entries daily at 3:15 AM UTC (offset from other cleanup)
crons.daily(
  "cleanup expired AI cache",
  { hourUTC: 3, minuteUTC: 15 },
  internal.aiHelpers.cleanupExpiredCache
);

export default crons;
