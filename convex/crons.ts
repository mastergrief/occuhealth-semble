import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily data retention cleanup at 3 AM UTC
crons.daily(
  "data retention cleanup",
  { hourUTC: 3, minuteUTC: 0 },
  internal.scheduled.dataRetention.cleanupAuditLogs
);

export default crons;
