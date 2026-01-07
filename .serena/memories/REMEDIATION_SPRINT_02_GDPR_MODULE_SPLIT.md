# GDPR Module Split (gdpr.ts Refactor)

**Sprint**: 02 of 04
**Index**: REMEDIATION_INDEX
**Depends On**: None
**Next**: REMEDIATION_SPRINT_03_DATA_EXPORT
**Priority**: P1-SHORT_TERM
**Effort**: 2-3 hours
**Risk**: LOW (refactoring, no logic change)

---

## Problem Statement

The `convex/gdpr.ts` file is 651 lines - well above the 400-line "concern" threshold and approaching the 800-line "must split" threshold defined in CLAUDE.md. The file contains 10 functions spanning consent, audit logging, and erasure request domains.

**Pattern to follow**: `availableSlotsModules/` (successfully split from monolith)

---

## Current Structure Analysis

```
convex/gdpr.ts (651 lines, 10 functions)
├── Audit Logging
│   └── logAction (internalMutation) - 21 lines
├── Consent Management
│   ├── createConsent (mutation) - 39 lines
│   ├── withdrawConsent (mutation) - 35 lines
│   └── getConsentsByPatient (query) - 25 lines
├── Erasure Requests
│   ├── requestErasure (mutation) - 30 lines
│   ├── listErasureRequests (query) - 45 lines
│   └── processErasure (mutation) - 80 lines
└── Dashboard & Stats
    ├── getAuditLogs (query) - 55 lines
    ├── getAuditLogsByResource (query) - 40 lines
    └── getGDPRStats (query) - 80 lines
```

---

## Target Structure

```
convex/gdpr.ts (facade, <50 lines)
└── convex/gdprModules/
    ├── index.ts (~20 lines) - Re-exports
    ├── types.ts (~30 lines) - Shared types
    ├── audit.ts (~100 lines) - logAction, getAuditLogs, getAuditLogsByResource
    ├── consent.ts (~120 lines) - createConsent, withdrawConsent, getConsentsByPatient
    ├── erasure.ts (~180 lines) - requestErasure, listErasureRequests, processErasure
    └── stats.ts (~100 lines) - getGDPRStats
```

---

## Implementation Steps

### Step 1: Create module directory
```bash
mkdir -p convex/gdprModules
```

### Step 2: Create types.ts
```typescript
// convex/gdprModules/types.ts

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
```

### Step 3: Create audit.ts
```typescript
// convex/gdprModules/audit.ts
import { internalMutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../authModules";

// Move: logAction, getAuditLogs, getAuditLogsByResource
// Keep all existing logic intact
```

### Step 4: Create consent.ts
```typescript
// convex/gdprModules/consent.ts
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireEmployerOwnership } from "../authModules";

// Move: createConsent, withdrawConsent, getConsentsByPatient
// Keep all existing logic intact
```

### Step 5: Create erasure.ts
```typescript
// convex/gdprModules/erasure.ts
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin } from "../authModules";
import { internal } from "../_generated/api";

// Move: requestErasure, listErasureRequests, processErasure
// Keep all existing logic intact
```

### Step 6: Create stats.ts
```typescript
// convex/gdprModules/stats.ts
import { query } from "../_generated/server";
import { requireAdmin } from "../authModules";

// Move: getGDPRStats
// Keep all existing logic intact
```

### Step 7: Create index.ts (module facade)
```typescript
// convex/gdprModules/index.ts

// Types
export type { ConsentType, ErasureStatus, ActorType, AuditLogEntry } from "./types";

// Audit
export { logAction, getAuditLogs, getAuditLogsByResource } from "./audit";

// Consent
export { createConsent, withdrawConsent, getConsentsByPatient } from "./consent";

// Erasure
export { requestErasure, listErasureRequests, processErasure } from "./erasure";

// Stats
export { getGDPRStats } from "./stats";
```

### Step 8: Update gdpr.ts (parent facade)
```typescript
// convex/gdpr.ts (NEW - facade only, ~40 lines)

// Re-export all GDPR functions to preserve API paths
// api.gdpr.{functionName} continues to work

export {
  // Audit
  logAction,
  getAuditLogs,
  getAuditLogsByResource,
  // Consent
  createConsent,
  withdrawConsent,
  getConsentsByPatient,
  // Erasure
  requestErasure,
  listErasureRequests,
  processErasure,
  // Stats
  getGDPRStats,
} from "./gdprModules";

// Types (optional re-export)
export type {
  ConsentType,
  ErasureStatus,
  ActorType,
  AuditLogEntry,
} from "./gdprModules";
```

---

## Browser Testing - COMPLETED ✅

**Date:** 2026-01-07
**Test Results:** ALL TESTS PASSED

### Test Coverage
- ✅ GDPR Dashboard loads and displays all statistics
- ✅ Audit Logs page: 23 entries visible with filtering UI
- ✅ Erasure Requests page: loads correctly, empty state shown
- ✅ Navigation: all links functional
- ✅ Console: 0 errors detected
- ✅ TypeScript: compiles without errors
- ✅ API paths: all functions accessible through facade

### Module Size Verification
- convex/gdpr.ts (facade): 32 lines ✅
- convex/gdprModules/audit.ts: 108 lines ✅
- convex/gdprModules/consent.ts: 105 lines ✅
- convex/gdprModules/erasure.ts: 176 lines ✅
- convex/gdprModules/stats.ts: 98 lines ✅
- convex/gdprModules/export.ts: 122 lines ✅
- convex/gdprModules/types.ts: 32 lines ✅
- convex/gdprModules/index.ts: 26 lines ✅

**Evidence:**
- SPRINT02_BROWSER_TEST_REPORT.md (comprehensive test report)
- 4 screenshots (dashboard, audit logs, erasure requests, auth)
- Saved state: authenticated-admin-sprint02

---

## Acceptance Criteria

- [ ] All 10 functions moved to appropriate module files
- [ ] `gdpr.ts` is <50 lines (facade only)
- [ ] Each module file is 100-200 lines (focused)
- [ ] API paths preserved: `api.gdpr.createConsent` etc. still work
- [ ] No frontend changes required
- [ ] TypeScript compiles without errors
- [ ] All existing tests pass
- [ ] GDPR Dashboard continues to function

---

## Verification Commands

```bash
# Typecheck
npm run typecheck

# Verify API paths work
npx convex run gdpr:getGDPRStats '{}'

# Run existing tests
npm run test
```

---

## Rollback Plan

Keep original `gdpr.ts` as `gdpr.ts.backup` until verification complete. If issues, restore from backup.

---

→ Next: REMEDIATION_SPRINT_03_DATA_EXPORT
