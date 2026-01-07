// convex/gdprModules/types.ts
// Shared types for GDPR module

import { Doc } from "../_generated/dataModel";

export type ConsentType = "data_processing" | "health_data" | "employer_sharing";

export type ErasureStatus = "pending" | "in_progress" | "completed" | "rejected";

export type ActorType = "employer" | "doctor" | "admin" | "system";

export interface AuditLogEntry {
  action: string;
  actorType: ActorType;
  actorId?: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  timestamp: number;
}

// Re-export the GDPRStats type shape used by getGDPRStats
export type GDPRStats = {
  pendingErasureCount: number;
  totalPatients: number;
  activeConsents: number;
  recentAuditLogs: Doc<"auditLogs">[];
  patientsWithAllConsents: number;
  auditLogsByAction: { action: string; count: number }[];
  erasureApproachingDeadline: number;
  erasureOverdue: number;
};
