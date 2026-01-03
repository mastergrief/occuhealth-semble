# GDPR Compliance

**Sprint**: 05 of 09
**Index**: OCCUHEALTH_EXPLORATION_INDEX
**Depends On**: OCCUHEALTH_SPRINT_02_BACKEND_MODULES, OCCUHEALTH_SPRINT_04_AUTHENTICATION_SECURITY
**Next**: OCCUHEALTH_SPRINT_06_TESTING_INFRASTRUCTURE

---

## GDPR Compliance Overview

**Location**: `convex/gdpr.ts` (229 LOC) + Schema tables
**Admin Portal**: `/admin/gdpr/*`

---

## GDPR Infrastructure

### Database Tables

| Table | Purpose | Fields |
|-------|---------|--------|
| `consents` | Granular consent tracking | type, granted, grantedAt, withdrawnAt, version |
| `auditLogs` | Compliance audit trail | action, actorType, actorId, resourceType, resourceId, timestamp |
| `erasureRequests` | Right to be forgotten | status, requesterEmail, reason, requestedAt, completedAt |
| `patients` | Soft delete support | `deletedAt` field for GDPR deletion |

### Consent Types

```typescript
consentType: v.union(
  v.literal("data_processing"),   // General data processing
  v.literal("health_data"),        // Health information
  v.literal("employer_sharing")    // Share with employer
)
```

---

## GDPR Functions

### Consent Management

```typescript
// Create consent record
export const createConsent = mutation({
  args: {
    patientEmail: v.string(),
    consentType: v.union(...),
    collectedByEmployerId: v.id("employers"),
    consentVersion: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("consents", {
      ...args,
      granted: true,
      grantedAt: Date.now(),
    });
  },
});

// Withdraw consent
export const withdrawConsent = mutation({
  args: { consentId: v.id("consents") },
  handler: async (ctx, { consentId }) => {
    await ctx.db.patch(consentId, {
      granted: false,
      withdrawnAt: Date.now(),
    });
  },
});
```

### Audit Logging

```typescript
// Log any GDPR-relevant action
export const logAction = mutation({
  args: {
    action: v.string(),            // "create_patient", "view_report", etc.
    actorType: v.union(
      v.literal("employer"),
      v.literal("doctor"),
      v.literal("admin"),
      v.literal("system")
    ),
    actorId: v.optional(v.string()),
    resourceType: v.string(),       // "patients", "reports", etc.
    resourceId: v.optional(v.string()),
    details: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("auditLogs", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

// Query audit logs
export const getAuditLogs = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 100 }) => {
    return ctx.db.query("auditLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);
  },
});
```

### Erasure Request Workflow

```typescript
// Step 1: Request erasure (patient initiates)
export const requestErasure = mutation({
  args: {
    requesterEmail: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { requesterEmail, reason }) => {
    // Find patient by email
    const patient = await ctx.db.query("patients")
      .withIndex("by_email", (q) => q.eq("email", requesterEmail))
      .first();

    return ctx.db.insert("erasureRequests", {
      requesterEmail,
      patientId: patient?._id,
      status: "pending",
      reason,
      requestedAt: Date.now(),
    });
  },
});

// Step 2: Process erasure (admin executes)
export const processErasure = mutation({
  args: {
    requestId: v.id("erasureRequests"),
    processedBy: v.string(),
  },
  handler: async (ctx, { requestId, processedBy }) => {
    const request = await ctx.db.get(requestId);
    if (!request) throw new Error("Request not found");

    // Mark as in progress
    await ctx.db.patch(requestId, { status: "in_progress" });

    // Soft delete patient (redact PII)
    if (request.patientId) {
      await ctx.db.patch(request.patientId, {
        firstName: "[REDACTED]",
        lastName: "[REDACTED]",
        email: "[REDACTED]",
        phone: "[REDACTED]",
        dateOfBirth: "[REDACTED]",
        deletedAt: Date.now(),
      });
    }

    // Mark as completed
    await ctx.db.patch(requestId, {
      status: "completed",
      completedAt: Date.now(),
      processedBy,
    });
  },
});
```

### GDPR Dashboard Stats

```typescript
export const getGDPRStats = query({
  args: {},
  handler: async (ctx): Promise<GDPRStats> => {
    const pendingErasures = await ctx.db.query("erasureRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const totalPatients = await ctx.db.query("patients")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const activeConsents = await ctx.db.query("consents")
      .filter((q) => q.eq(q.field("granted"), true))
      .collect();

    const recentAuditLogs = await ctx.db.query("auditLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .take(10);

    return {
      pendingErasureCount: pendingErasures.length,
      totalPatients: totalPatients.length,
      activeConsents: activeConsents.length,
      recentAuditLogs,
    };
  },
});
```

---

## Admin Portal Pages

### GDPR Dashboard (`/admin/gdpr`)
- Overview stats: pending erasures, total patients, active consents
- Quick links to sub-pages
- Recent audit log summary

### Audit Logs (`/admin/gdpr/audit`)
- Full audit trail viewer
- Filter by action type, actor, resource
- Timestamp ordering

### Erasure Requests (`/admin/gdpr/erasure`)
- Pending requests list
- Approve/reject actions
- Processing status tracking

---

## Compliance Gaps

### ❌ Critical Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| Soft-delete not checked in queries | Deleted patient data returned | P0 |
| Missing cascading delete | Appointments/reports not redacted | P1 |
| Audit logging not enforced | Mutations don't call logAction | P1 |

### ⚠️ Medium Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| No data export API | Article 20 violation | P2 |
| No consent enforcement | Consent table unused in mutations | P2 |
| No data retention policy | No automatic cleanup | P3 |

---

## GDPR Readiness Checklist

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Lawful basis (consent) | ⚠️ Partial | Table exists, enforcement missing |
| Data minimization | ✅ Good | Only necessary fields collected |
| Storage limitation | ✅ Good | Soft-delete + erasure workflow |
| Integrity & confidentiality | ❌ FAIL | Authorization missing |
| Accountability | ⚠️ Partial | Audit logs available, not enforced |
| Right to access | ❌ Missing | No data export API |
| Right to erasure | ✅ Good | processErasure implemented |
| Right to rectification | ✅ Good | Patient update mutation exists |

---

## Soft Delete Pattern

### Schema Support
```typescript
patients: defineTable({
  // ... other fields
  deletedAt: v.optional(v.number()),  // Soft delete timestamp
})
  .index("by_deleted", ["deletedAt"])
```

### Redaction on Erasure
```typescript
await ctx.db.patch(request.patientId, {
  firstName: "[REDACTED]",
  lastName: "[REDACTED]",
  email: "[REDACTED]",
  phone: "[REDACTED]",
  dateOfBirth: "[REDACTED]",
  deletedAt: Date.now(),
});
```

### Query Filter (MISSING in some places)
```typescript
// ✅ Correct - patients.list filters deleted
.filter((q) => q.eq(q.field("deletedAt"), undefined))

// ❌ Missing - appointments.listByEmployer doesn't filter
// Returns appointments with deleted patients!
```

---

## Remediation Plan

### Phase 1: Critical Fixes
1. Add soft-delete filters to appointments.listByEmployer
2. Add soft-delete filters to reports.listByEmployer
3. Implement cascading delete in processErasure

### Phase 2: Enforcement
4. Create audit logging decorator for mutations
5. Add consent check before patient operations
6. Implement data export API

### Phase 3: Automation
7. Add data retention scheduler
8. Implement breach notification system
9. Create consent renewal workflow

---

→ Next: OCCUHEALTH_SPRINT_06_TESTING_INFRASTRUCTURE
