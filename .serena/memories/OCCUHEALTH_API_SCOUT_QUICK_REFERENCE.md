# OccuHealth API Scout - Quick Reference

## Critical Issues by Phase (3-Week Plan)

### PHASE 1: SECURITY (Authorization) - 9.5 Days

**P0 BLOCKING** (Do first):
```
✗ patients.list (10 LOC)           - No owner check → data leak
✗ reports.listByEmployer (16 LOC)  - No owner check + N+1
✗ appointments.listByEmployer (17) - No owner check + N+1
✗ employers.verify (14 LOC)        - No admin check → privilege escalation
```

**P1 High**:
```
✗ appointments.listByDate (18)     - No doctor filter → calendar scraping
✗ employers.reject (13 LOC)        - No admin check
✗ appointments.getTodaysAppointments (10) - No doctor filter
```

**P2 Medium**:
```
✗ patients.getByEmail (9 LOC)      - Email enumeration attack
```

---

### PHASE 2: SCALABILITY (N+1 & Pagination) - 11.5 Days

**N+1 Patterns** (Execute 3N+1 to 100+ queries unnecessarily):
```
reports.listByEmployer     - 1 query + N patient fetches
appointments.listByEmployer - 1 query + N patient fetches  
appointments.listByDate    - 1 query + 3N enrichment fetches
```

**Missing Pagination** (Unbounded `.collect()` calls):
```
patients.list
reports.listByEmployer
appointments.listByEmployer
appointments.listByDate
gdpr.listErasureRequests
appointmentTypes.listAll
```

---

### PHASE 3: COMPLIANCE (Audit Logs & GDPR) - 12 Days

**Missing Audit Logging** (8 mutations):
```
patients.create/update/softDelete      - Audit trail missing
reports.create/sendToEmployer/markViewed - Tracking missing
appointments.book/markCompleted        - Access logs missing
```

**Cascading Delete Gap** (gdpr.processErasure):
```
✗ Only redacts patient record
✗ Leaves appointments, reports, consents, audit logs intact
  → GDPR Article 17 violation
```

**GDPR Filters Missing**:
```
appointments.listByEmployer - Returns deleted patients
reports.listByEmployer      - Returns deleted patients
```

---

## File Impact Map

| File | P1 Issues | P2 Issues | P3 Issues | Total |
|------|-----------|-----------|-----------|-------|
| patients.ts | 2 (S1,S2) | 1 (pag) | 3 (audit) | 6 |
| reports.ts | 1 (S2) | 1 (N+1+pag) | 3 (audit) + 1 (filter) | 6 |
| appointments.ts | 3 (S3-S4,S5) | 3 (N+1+pag) | 2 (audit) + 2 (filter) | 10 |
| employers.ts | 2 (S5-S6) | 0 | 0 | 2 |
| gdpr.ts | 0 | 1 (pag) | 2 (cascade+enforce) | 3 |
| appointmentTypes.ts | 0 | 1 (pag) | 0 | 1 |
| **Total** | **9** | **9** | **12** | **30 issues** |

---

## Implementation Roadmap

### Week 1: Authorization (BLOCKING)
```
Monday:    patients.list, employers.verify/reject
Tuesday:   appointments.getTodaysAppointments, patients.getByEmail  
Wed-Thu:   reports.listByEmployer (add auth + N+1 fix)
Fri-Mon:   appointments.listByEmployer + listByDate (auth + N+1 + pagination)
```

### Week 2: Pagination (depends on Week 1)
```
Complete N+1 fixes from Week 1
Add pagination to simple queries (patients.list, gdpr.listErasureRequests)
```

### Week 3: Compliance (GDPR)
```
Mon-Tue:   Cascading delete in processErasure (critical for GDPR)
Wed-Thu:   Add GDPR filters to appointment/report list queries
Fri:       Audit logging across all mutations
```

---

## Key Code Locations

**Security (Phase 1)**:
- `convex/patients.ts:11-20` (list - missing auth)
- `convex/reports.ts:30-45` (listByEmployer - missing auth + N+1)
- `convex/appointments.ts:27-43` (listByEmployer - missing auth + N+1)
- `convex/appointments.ts:46-63` (listByDate - missing auth + 3N+1)
- `convex/appointments.ts:66-75` (getTodaysAppointments - missing doctor filter)
- `convex/employers.ts:111-124` (verify - missing admin check)
- `convex/employers.ts:127-139` (reject - missing admin check)
- `convex/patients.ts:31-39` (getByEmail - enumeration risk)

**Scalability (Phase 2)**:
- All list queries above need: `.withIndex()` pagination + batch queries

**Compliance (Phase 3)**:
- `convex/gdpr.ts:130-161` (processErasure - incomplete cascading delete)
- `convex/patients.ts:42-61, 64-80, 83-95` (no audit logs)
- `convex/reports.ts:48-83, 86-93, 96-103` (no audit logs)
- `convex/appointments.ts:78-122, 125-133` (no audit logs)

---

## Reusable Patterns to Create

### 1. Authorization Helpers (convex/authHelpers.ts)
```typescript
getAuthorizedUser(ctx)      // Get identity or throw
getAuthorizedEmployer(ctx, employerId)  // Verify ownership
getAuthorizedAdmin(ctx)     // Admin-only check
```

### 2. Pagination Helper
```typescript
// Reusable cursor-based pagination
pagination(limit?, cursor?)
// Returns: { items, hasMore, nextCursor }
```

### 3. Audit Logging Helper
```typescript
// Wrapper for all mutations
logAction(action, actorType, actorId, resourceType, resourceId, details)
```

### 4. Batch Query Helper
```typescript
// Prevent N+1 patterns
batchGetMany(ids)  // vs individual ctx.db.get() calls
```

---

## Testing Priorities

**After Phase 1** (Security):
- [ ] Employer A cannot query Employer B's patients
- [ ] Non-admin cannot verify employers
- [ ] Non-doctor cannot see other doctors' appointments

**After Phase 2** (Scalability):
- [ ] List queries return ≤50 items by default
- [ ] Pagination cursor works (hasMore/nextCursor)
- [ ] N+1 fixed: list 100 items executes 1 query (not 100+)

**After Phase 3** (Compliance):
- [ ] All mutations appear in auditLogs
- [ ] Patient erasure cascades to all related tables
- [ ] Deleted patients don't appear in list results
- [ ] GDPR stats accurate

---

## Convex Specifics

**Auth Pattern for Convex**:
```typescript
// All queries/mutations have access to ctx.auth
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Unauthorized");
// identity.subject = WorkOS user ID (workosUserId)
```

**Pagination Pattern for Convex**:
```typescript
// Use cursor-based pagination (not offset)
query.filter((q) => q.gt(q.field("_id"), cursor))
```

**Batch Queries for N+1**:
```typescript
// Convex doesn't have built-in batch
// Use Promise.all() with individual queries strategically
// OR denormalize related data in main document
```

---

## HTTP Routes Status

✅ /auth/login - SECURE (CSRF protection)
✅ /auth/callback - SECURE (state validation, replay prevention)
✅ /auth/logout - SECURE (sessionId required)
✅ /health - PUBLIC (no issues)

No HTTP route changes needed.

