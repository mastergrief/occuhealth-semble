/**
 * GDPR Compliance API Facade
 *
 * This file re-exports all GDPR functions from modular implementations.
 * API paths are preserved: api.gdpr.{functionName}
 *
 * @module gdpr
 */

// Audit logging
export { logAction, getAuditLogs, getAuditLogsByResource } from "./gdprModules/audit";

// Consent management
export { createConsent, createConsentInternal, withdrawConsent, getConsentsByPatient } from "./gdprModules/consent";

// Erasure requests
export { requestErasure, listErasureRequests, processErasure } from "./gdprModules/erasure";

// GDPR statistics
export { getGDPRStats } from "./gdprModules/stats";

// Data export (Article 20 - Data Portability)
export { exportPatientData } from "./gdprModules/export";

// Types (re-export for external use)
export type {
  ConsentType,
  ErasureStatus,
  ActorType,
  AuditLogEntry,
  GDPRStats,
} from "./gdprModules/types";
