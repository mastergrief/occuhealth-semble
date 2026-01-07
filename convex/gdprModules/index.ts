// convex/gdprModules/index.ts
// Module index - re-exports all GDPR functions and types

// Types
export type {
  ConsentType,
  ErasureStatus,
  ActorType,
  AuditLogEntry,
  GDPRStats,
} from "./types";

// Audit
export { logAction, getAuditLogs, getAuditLogsByResource } from "./audit";

// Consent
export { createConsent, withdrawConsent, getConsentsByPatient } from "./consent";

// Erasure
export { requestErasure, listErasureRequests, processErasure } from "./erasure";

// Stats
export { getGDPRStats } from "./stats";

// Export
export { exportPatientData } from "./export";
