# OccuHealth API Remediation Scout Report

**Date**: 2026-01-03
**Scope**: All 13 API modules in `/convex/`
**Total LOC Analyzed**: 1,677
**Critical Issues**: 12 (P0/P1)

---

## Executive Summary

Three-phase remediation strategy identified:
- **Phase 1 (Security - Authorization)**: 5 critical queries lack ownership validation
- **Phase 2 (Scalability - Pagination & N+1)**: 7 queries need pagination + 3 with N+1 patterns
- **Phase 3 (Compliance - Audit Logging)**: 8 mutations need audit logging + cascading delete gaps

---

## PHASE 1: SECURITY (AUTHORIZATION CHECKS)

### P0-S1: patients.list - Missing Authorization (Lines 11-20)

**File**: `/home/gabe/projects/convex-medical-starter/convex/patients.ts:11-20`
**Type**: Query
**LOC**: 10
**Current Issue**: No validation that caller owns the employerId

```typescript
// Line 11-20: VULNERABLE - any employer can query any other employer's patients
export const list = query({
  args: { employerId: v.id("employers") },
  handler: async (ctx, { employerId }) => {
    return ctx.db
      .query("patients")
      .withIndex("by_employer", (q) => q.eq("employerId", employerId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();  // Returns WITHOUT checking if caller is owner!
  },
});
```

**Attack Vector**: Employer A's session can call `patients.list({ employerId: EMPLOYER_B_ID })` and retrieve B's patient data

**Required Fix**: Add auth check before query:
```typescript
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Unauthorized");
const employer = await ctx.db.get(employerId);
if (employer.workosUserId !== identity.subject) throw new Error("Unauthorized");
```

**Remediation**: 1 day (simple auth check + test)

---

### P0-S2: reports.listByEmployer - Missing Authorization (Lines 30-45)

**File**: `/home/gabe/projects/convex-medical-starter/convex/reports.ts:30-45`
**Type**: Query with N+1 enrichment
**LOC**: 16
**Current Issue**: No validation + N+1 pattern (enriches patient data per report)

```typescript
// Line 30-45: VULNERABLE - cross-company report leak + N+1
export const listByEmployer = query({
  args: { employerId: v.id("employers") },
  handler: async (ctx, { employerId }) => {
    const reports = await ctx.db
      .query("reports")
      .withIndex("by_employer", (q) => q.eq("employerId", employerId))
      .collect();

    return Promise.all(
      reports.map(async (report) => ({
        ...report,
        patient: await ctx.db.get(report.patientId),  // N+1! (1 query + N fetches)
      }))
    );
  },
});
```

**Attack Vector**: Employer A can fetch all reports for Employer B and their associated patient data

**N+1 Pattern**: If employer has 100 reports, executes 101 queries (1 list + 100 patient fetches)

**Required Fixes**:
1. Authorization: Verify caller owns employerId
2. N+1 optimization: Use batch fetch or dataloader pattern

**Remediation**: 2 days (auth + N+1 fix + testing)

---

### P0-S3: appointments.listByEmployer - Missing Authorization (Lines 27-43)

**File**: `/home/gabe/projects/convex-medical-starter/convex/appointments.ts:27-43`
**Type**: Query with N+1 enrichment
**LOC**: 17
**Current Issue**: No authorization + N+1 pattern

```typescript
// Line 27-43: VULNERABLE - appointments leak + N+1
export const listByEmployer = query({
  args: { employerId: v.id("employers") },
  handler: async (ctx, { employerId }) => {
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_employer", (q) => q.eq("employerId", employerId))
      .collect();

    // Enrich with patient data - N+1 queries!
    return Promise.all(
      appointments.map(async (apt) => ({
        ...apt,
        patient: await ctx.db.get(apt.patientId),  // N+1
      }))
    );
  },
});
```

**Attack Vector**: List appointments from competing employer + see all patient details

**N+1 Pattern**: 1 appointment query + N patient fetches

**Required Fixes**:
1. Authorization check
2. N+1 optimization
3. Add GDPR soft-delete filter (currently missing!)

**Remediation**: 2 days

---

### P0-S4: appointments.listByDate - Missing Authorization (Lines 46-63)

**File**: `/home/gabe/projects/convex-medical-starter/convex/appointments.ts:46-63`
**Type**: Query with N+1
**LOC**: 18
**Current Issue**: No doctor validation + calendar enumeration risk + N+1

```typescript
// Line 46-63: VULNERABLE - date enumeration allows calendar scraping
export const listByDate = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("scheduledDate", date))
      .collect();

    return Promise.all(
      appointments.map(async (apt) => ({
        ...apt,
        patient: await ctx.db.get(apt.patientId),
        employer: await ctx.db.get(apt.employerId),
        appointmentType: await ctx.db.get(apt.appointmentTypeId),
      }))
    );
  },
});
```

**Attack Vector**: Any user can query any date to enumerate all appointments system-wide + see patient/employer names

**N+1 Pattern**: 1 appointment query + 3 enrichment queries per appointment = 3N+1

**Authorization**: Should be doctor-only OR filtered by caller's schedule

**Remediation**: 2 days (doctor role check + N+1 fix)

---

### P0-S5: employers.verify - Missing Admin Authorization (Lines 111-124)

**File**: `/home/gabe/projects/convex-medical-starter/convex/employers.ts:111-124`
**Type**: Mutation (admin-only)
**LOC**: 14
**Current Issue**: No admin role check - any authenticated user can verify employers

```typescript
// Line 111-124: VULNERABLE - privilege escalation
export const verify = mutation({
  args: {
    employerId: v.id("employers"),
    adminUserId: v.id("adminUsers"),
  },
  handler: async (ctx, { employerId, adminUserId }) => {
    // NO CHECK: Is caller actually an admin?
    await ctx.db.patch(employerId, {
      status: "verified",
      verifiedAt: Date.now(),
      verifiedBy: adminUserId,
      updatedAt: Date.now(),
    });
  },
});
```

**Attack Vector**: Employer A's session calls verify() to approve their own account to "verified" status

**Impact**: Direct privilege escalation - unverified employers become verified without admin approval

**Required Fix**: Check if caller is in adminUsers table

**Remediation**: 0.5 days

---

### P1-S1: employers.reject - Missing Admin Authorization (Lines 127-139)

**File**: `/home/gabe/projects/convex-medical-starter/convex/employers.ts:127-139`
**Type**: Mutation (admin-only)
**LOC**: 13
**Current Issue**: No admin role check

**Same issue as verify()** - privilege escalation

**Remediation**: 0.5 days

---

### P1-S2: appointments.getTodaysAppointments - Missing Doctor Authorization (Lines 66-75)

**File**: `/home/gabe/projects/convex-medical-starter/convex/appointments.ts:66-75`
**Type**: Query
**LOC**: 10
**Current Issue**: Returns today's appointments for ALL doctors, no caller validation

```typescript
// Line 66-75: VULNERABLE - any user can fetch today's appointments
export const getTodaysAppointments = query({
  args: {},
  handler: async (ctx): Promise<Doc<"appointments">[]> => {
    const today = new Date().toISOString().split("T")[0];
    return ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("scheduledDate", today))
      .collect();  // No filter by doctor!
  },
});
```

**Attack Vector**: Any user sees all appointments scheduled for today across all doctors

**Required Fix**: Filter by authenticated doctor's ID

**Remediation**: 0.5 days

---

### P2-S1: patients.getByEmail - Email Enumeration Risk (Lines 31-39)

**File**: `/home/gabe/projects/convex-medical-starter/convex/patients.ts:31-39`
**Type**: Query
**LOC**: 9
**Current Issue**: Allows attackers to enumerate valid patient emails in system

```typescript
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return ctx.db
      .query("patients")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
  },
});
```

**Attack Vector**: Attacker iterates through common email formats to discover who's in the system

**Mitigation**: Require caller to own the email OR add rate limiting

**Remediation**: 1 day (add auth + rate limit)

---

## PHASE 2: SCALABILITY (PAGINATION & N+1)

### P1-SC1: N+1 Query Pattern - reports.listByEmployer

**File**: `/home/gabe/projects/convex-medical-starter/convex/reports.ts:30-45`
**Issue Type**: N+1 (already listed as P0-S2 for security, flagging for scalability aspect)
**Queries Executed for 100 reports**: 101 (1 list + 100 patient fetches)
**Impact**: Each report page load executes 101 queries instead of 1

**Current Pattern**:
```typescript
return Promise.all(
  reports.map(async (report) => ({
    ...report,
    patient: await ctx.db.get(report.patientId),  // N+1
  }))
);
```

**Solution**: Use `ctx.db.getMany()` or denormalize patient data in report document

---

### P1-SC2: N+1 Query Pattern - appointments.listByEmployer

**File**: `/home/gabe/projects/convex-medical-starter/convex/appointments.ts:27-43`
**Issue Type**: N+1
**Queries for 50 appointments**: 51
**Pattern**: Same as reports.listByEmployer

---

### P1-SC3: N+1 Query Pattern - appointments.listByDate

**File**: `/home/gabe/projects/convex-medical-starter/convex/appointments.ts:46-63`
**Issue Type**: 3N+1 (enriches 3 relations per document)
**Queries for 20 appointments**: 61 (1 + 20*3)
**Pattern**:
```typescript
return Promise.all(
  appointments.map(async (apt) => ({
    ...apt,
    patient: await ctx.db.get(apt.patientId),        // N+1
    employer: await ctx.db.get(apt.employerId),      // N+1
    appointmentType: await ctx.db.get(apt.appointmentTypeId),  // N+1
  }))
);
```

**Solution**: Batch fetch using getMany() for each relation type

---

### P1-SC4: Missing Pagination - patients.list

**File**: `/home/gabe/projects/convex-medical-starter/convex/patients.ts:11-20`
**Type**: Query (returns all)
**Current**: `.collect()` - no limit
**Risk**: Employer with 10,000 patients returns all in single response
**Impact**: Memory explosion, slow response, network strain

**Required Fix**: Add pagination arguments:
```typescript
args: {
  employerId: v.id("employers"),
  limit: v.optional(v.number()),  // Default 50
  cursor: v.optional(v.string()),
}
```

---

### P1-SC5: Missing Pagination - reports.listByEmployer

**File**: `/home/gabe/projects/convex-medical-starter/convex/reports.ts:30-45`
**Type**: Query (returns all)
**Risk**: 1000+ reports returned without limit

---

### P1-SC6: Missing Pagination - appointments.listByEmployer

**File**: `/home/gabe/projects/convex-medical-starter/convex/appointments.ts:27-43`
**Type**: Query (returns all)
**Risk**: Unbounded appointment data

---

### P1-SC7: Missing Pagination - appointments.listByDate

**File**: `/home/gabe/projects/convex-medical-starter/convex/appointments.ts:46-63`
**Type**: Query (returns all)
**Risk**: Popular dates return thousands of appointments

---

### P1-SC8: Missing Pagination - gdpr.listErasureRequests

**File**: `/home/gabe/projects/convex-medical-starter/convex/gdpr.ts:111-127`
**Type**: Query (no limit)
**LOC**: 17
**Risk**: All erasure requests returned even if thousands

```typescript
export const listErasureRequests = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, { status }) => {
    // No limit parameter - returns all requests
    if (status) {
      return ctx.db
        .query("erasureRequests")
        .withIndex("by_status", (q) =>
          q.eq("status", status as "pending" | "in_progress" | "completed" | "rejected")
        )
        .collect();  // No limit!
    }
    return ctx.db.query("erasureRequests").collect();  // No limit!
  },
});
```

---

### P1-SC9: Missing Pagination - appointmentTypes.listAll

**File**: `/home/gabe/projects/convex-medical-starter/convex/appointmentTypes.ts:23-28`
**Type**: Query
**LOC**: 6
**Risk**: Returns all types (likely OK for small catalogs, but inconsistent)

---

## PHASE 3: COMPLIANCE (AUDIT LOGGING & CASCADING DELETES)

### P1-C1: Missing Audit Logging - patients.create

**File**: `/home/gabe/projects/convex-medical-starter/convex/patients.ts:42-61`
**Type**: Mutation (creates sensitive record)
**LOC**: 20
**Current**: No audit log entry
**Required**: Log "patient_created" with patient ID, employer ID, email

```typescript
// Missing:
await ctx.runMutation(internal.gdpr.logAction, {
  action: "patient_created",
  actorType: "employer",  // or extract from auth
  actorId: <employer_workos_id>,
  resourceType: "patients",
  resourceId: patientId,
  details: { email: args.email },
});
```

---

### P1-C2: Missing Audit Logging - patients.update

**File**: `/home/gabe/projects/convex-medical-starter/convex/patients.ts:64-80`
**Type**: Mutation
**LOC**: 17
**Current**: No audit log
**Required**: Log "patient_updated" with what changed

---

### P1-C3: Missing Audit Logging - patients.softDelete

**File**: `/home/gabe/projects/convex-medical-starter/convex/patients.ts:83-95`
**Type**: Mutation (GDPR-critical)
**LOC**: 13
**Current**: No audit log
**Required**: Log "patient_deleted" (GDPR requirement for deletion trail)

```typescript
// Missing:
await ctx.runMutation(internal.gdpr.logAction, {
  action: "patient_deleted",
  actorType: "system",
  resourceType: "patients",
  resourceId: patientId,
  details: { reason: "GDPR erasure" },
});
```

---

### P1-C4: Missing Audit Logging - reports.create

**File**: `/home/gabe/projects/convex-medical-starter/convex/reports.ts:48-83`
**Type**: Mutation (medical report - highly sensitive)
**LOC**: 36
**Current**: No audit log
**Required**: Log "report_created" with fit-for-work status, patient, employer

---

### P1-C5: Missing Audit Logging - reports.sendToEmployer

**File**: `/home/gabe/projects/convex-medical-starter/convex/reports.ts:86-93`
**Type**: Mutation (compliance-critical - tracks data sharing)
**LOC**: 8
**Current**: No audit log
**Required**: Log "report_sent_to_employer" (GDPR Article 32 - accountability)

---

### P1-C6: Missing Audit Logging - reports.markViewed

**File**: `/home/gabe/projects/convex-medical-starter/convex/reports.ts:96-103`
**Type**: Mutation (access logging required)
**LOC**: 8
**Current**: No audit log
**Required**: Log "report_viewed" - critical for breach response

---

### P1-C7: Missing Audit Logging - appointments.book

**File**: `/home/gabe/projects/convex-medical-starter/convex/appointments.ts:78-122`
**Type**: Mutation
**LOC**: 45
**Current**: No audit log
**Required**: Log "appointment_booked" with patient, employer, date

---

### P1-C8: Missing Audit Logging - appointments.markCompleted

**File**: `/home/gabe/projects/convex-medical-starter/convex/appointments.ts:125-133`
**Type**: Mutation (affects GDPR retention clock)
**LOC**: 9
**Current**: No audit log
**Required**: Log "appointment_completed"

---

### P2-C1: Missing Cascading Delete - gdpr.processErasure

**File**: `/home/gabe/projects/convex-medical-starter/convex/gdpr.ts:130-161`
**Type**: Mutation (GDPR erasure handler)
**LOC**: 32
**Current Issue**: Only soft-deletes patient, leaves related data orphaned

```typescript
// Line 130-161: INCOMPLETE GDPR COMPLIANCE
export const processErasure = mutation({
  args: {
    requestId: v.id("erasureRequests"),
    processedBy: v.string(),
  },
  handler: async (ctx, { requestId, processedBy }) => {
    const request = await ctx.db.get(requestId);
    if (!request) throw new Error("Request not found");

    await ctx.db.patch(requestId, { status: "in_progress" });

    if (request.patientId) {
      // ONLY redacts patient record
      await ctx.db.patch(request.patientId, {
        firstName: "[REDACTED]",
        lastName: "[REDACTED]",
        email: "[REDACTED]",
        phone: "[REDACTED]",
        dateOfBirth: "[REDACTED]",
        deletedAt: Date.now(),
      });
      // MISSING: Delete/redact related:
      // - appointments for this patient
      // - reports for this patient
      // - consents for this patient
      // - audit logs mentioning this patient
    }

    await ctx.db.patch(requestId, {
      status: "completed",
      completedAt: Date.now(),
      processedBy,
    });
  },
});
```

**GDPR Gap**: Article 17 (Right to Erasure) requires cascading deletion. Current implementation:
- ✅ Redacts patient table
- ❌ Leaves appointments referencing patient
- ❌ Leaves reports with patient details
- ❌ Leaves consents in place
- ❌ Leaves audit logs with patient name

**Required Fix**: Query and redact all related tables:
```typescript
// Find and redact appointments
const appointments = await ctx.db.query("appointments")
  .withIndex("by_patient", (q) => q.eq("patientId", patientId))
  .collect();
for (const apt of appointments) {
  await ctx.db.patch(apt._id, {
    reasonForAppointment: "[REDACTED]",
    preAppointmentNotes: "[REDACTED]",
  });
}

// Find and redact reports
const reports = await ctx.db.query("reports")
  .withIndex("by_patient", (q) => q.eq("patientId", patientId))
  .collect();
for (const report of reports) {
  await ctx.db.patch(report._id, {
    summary: "[REDACTED]",
    restrictions: [],
    followUpNotes: "[REDACTED]",
  });
}

// Withdraw consents
const consents = await ctx.db.query("consents")
  .withIndex("by_patient", (q) => q.eq("patientId", patientId))
  .collect();
for (const consent of consents) {
  await ctx.db.patch(consent._id, {
    granted: false,
    withdrawnAt: Date.now(),
  });
}
```

**Remediation**: 2 days (implement cascading delete + testing)

---

### P2-C2: Missing GDPR Filter - appointments.listByEmployer

**File**: `/home/gabe/projects/convex-medical-starter/convex/appointments.ts:27-43`
**Issue**: Returns appointments with deleted (soft-deleted) patients

```typescript
// Current: Returns appointments even if patient is deleted
const appointments = await ctx.db
  .query("appointments")
  .withIndex("by_employer", (q) => q.eq("employerId", employerId))
  .collect();  // Includes appointments for patients where deletedAt is set!
```

**Required Fix**: Filter out deleted patients:
```typescript
const appointments = await ctx.db
  .query("appointments")
  .withIndex("by_employer", (q) => q.eq("employerId", employerId))
  .filter((q) => {
    // Exclude appointments where patient is deleted
    // (requires join or denormalization)
  })
  .collect();
```

OR return appointments but filter in post-processing based on patient.deletedAt

---

### P2-C3: Missing GDPR Filter - reports.listByEmployer

**File**: `/home/gabe/projects/convex-medical-starter/convex/reports.ts:30-45`
**Issue**: Returns reports for deleted patients (GDPR violation)

---

### P2-C4: Audit Logging Not Enforced

**File**: `/home/gabe/projects/convex-medical-starter/convex/gdpr.ts:20-40`
**Issue**: `logAction` mutation exists but is NOT called by other modules

**Current State**:
- ✅ `logAction` defined and available
- ❌ No other module calls it
- ❌ No enforcement mechanism (e.g., decorator/middleware)

**Solution**: Create enforcement in future phase - either:
1. Create audit logging middleware/helper
2. Wrap all mutations to auto-log
3. Add JSDoc requirement with enforcement in CI

---

## HTTP ROUTES ANALYSIS

### `/auth/login` (http.ts:26-63)
**Status**: ✅ SECURE
- ✅ CSRF state generation (UUID)
- ✅ 5-minute TTL on state
- ✅ State storage in database
- No issues

---

### `/auth/callback` (http.ts:96-202)
**Status**: ✅ SECURE
- ✅ CSRF state validation (line 116-129)
- ✅ Replay prevention (state deleted after use, line 129)
- ✅ OAuth code exchange server-side (no client-side exposure)
- ✅ SessionId extraction for proper logout tracking
- ✅ Role-based routing (admin/employer/doctor/unregistered)
- Minor: Tokens in URL appear in browser history (acceptable for OAuth with short TTL)

---

### `/auth/logout` (http.ts:65-94)
**Status**: ✅ SECURE
- ✅ SessionId required for logout
- ✅ Properly calls WorkOS logout endpoint
- ✅ Fallback redirect if sessionId missing

---

### `/health` (http.ts:207-223)
**Status**: ✅ PUBLIC (no security needed)
- Simple health check, no sensitive data

---

## SUMMARY TABLE

### Phase 1: Security (Authorization) - 7 Issues

| ID | File | Function | Type | LOC | Priority | Effort |
|----|------|----------|------|-----|----------|--------|
| P0-S1 | patients.ts | list | Query | 10 | P0 | 1 day |
| P0-S2 | reports.ts | listByEmployer | Query | 16 | P0 | 2 days |
| P0-S3 | appointments.ts | listByEmployer | Query | 17 | P0 | 2 days |
| P0-S4 | appointments.ts | listByDate | Query | 18 | P1 | 2 days |
| P0-S5 | employers.ts | verify | Mutation | 14 | P0 | 0.5 days |
| P1-S1 | employers.ts | reject | Mutation | 13 | P1 | 0.5 days |
| P1-S2 | appointments.ts | getTodaysAppointments | Query | 10 | P1 | 0.5 days |
| P2-S1 | patients.ts | getByEmail | Query | 9 | P2 | 1 day |

**Total Phase 1 Effort**: 9.5 days

---

### Phase 2: Scalability (Pagination & N+1) - 9 Issues

| ID | File | Function | Issue | LOC | Priority | Effort |
|----|------|----------|-------|-----|----------|--------|
| P1-SC1 | reports.ts | listByEmployer | N+1 + pagination | 16 | P1 | 2 days |
| P1-SC2 | appointments.ts | listByEmployer | N+1 + pagination | 17 | P1 | 2 days |
| P1-SC3 | appointments.ts | listByDate | 3N+1 + pagination | 18 | P1 | 2 days |
| P1-SC4 | patients.ts | list | Missing pagination | 10 | P1 | 1 day |
| P1-SC5 | reports.ts | listByEmployer | Missing pagination | 16 | P1 | 1 day |
| P1-SC6 | appointments.ts | listByEmployer | Missing pagination | 17 | P1 | 1 day |
| P1-SC7 | appointments.ts | listByDate | Missing pagination | 18 | P1 | 1 day |
| P1-SC8 | gdpr.ts | listErasureRequests | Missing pagination | 17 | P1 | 1 day |
| P1-SC9 | appointmentTypes.ts | listAll | Missing pagination | 6 | P2 | 0.5 days |

**Note**: SC1, SC2, SC3 overlap with security phase (same functions need both fixes)

**Total Phase 2 Effort**: 11.5 days (5 are overlaps with Phase 1)

---

### Phase 3: Compliance (Audit & Cascading Deletes) - 10 Issues

| ID | File | Function | Issue | LOC | Priority | Effort |
|----|------|----------|-------|-----|----------|--------|
| P1-C1 | patients.ts | create | Missing audit log | 20 | P1 | 1 day |
| P1-C2 | patients.ts | update | Missing audit log | 17 | P1 | 1 day |
| P1-C3 | patients.ts | softDelete | Missing audit log | 13 | P1 | 0.5 days |
| P1-C4 | reports.ts | create | Missing audit log | 36 | P1 | 1 day |
| P1-C5 | reports.ts | sendToEmployer | Missing audit log | 8 | P1 | 0.5 days |
| P1-C6 | reports.ts | markViewed | Missing audit log | 8 | P1 | 0.5 days |
| P1-C7 | appointments.ts | book | Missing audit log | 45 | P1 | 1 day |
| P1-C8 | appointments.ts | markCompleted | Missing audit log | 9 | P1 | 0.5 days |
| P2-C1 | gdpr.ts | processErasure | Missing cascading delete | 32 | P2 | 2 days |
| P2-C2 | appointments.ts | listByEmployer | Missing GDPR filter | 17 | P2 | 1 day |
| P2-C3 | reports.ts | listByEmployer | Missing GDPR filter | 16 | P2 | 1 day |
| P2-C4 | gdpr.ts | logAction | Not enforced | 20 | P3 | 2 days (future) |

**Total Phase 3 Effort**: 12 days

---

## Critical Path (Recommended Order)

### Week 1: Phase 1 (Security) - Fix authorization first (BLOCKING)

1. **Day 1-2**: Add auth checks to:
   - patients.list (P0-S1)
   - employers.verify (P0-S5)
   - employers.reject (P1-S1)
   - appointments.getTodaysAppointments (P1-S2)

2. **Day 3-4**: Add auth + N+1 fix to:
   - reports.listByEmployer (P0-S2)

3. **Day 5-6**: Add auth + N+1 + pagination fix to:
   - appointments.listByEmployer (P0-S3)

4. **Day 7-8**: Add auth + N+1 + pagination fix to:
   - appointments.listByDate (P0-S4)

5. **Day 9**: Add rate limiting + auth to:
   - patients.getByEmail (P2-S1)

### Week 2: Phase 2 (Scalability) - Add pagination

1. **Days 1-3**: Fix N+1 + add pagination (overlaps):
   - reports.listByEmployer
   - appointments.listByEmployer
   - appointments.listByDate

2. **Days 4-6**: Add pagination to non-N+1 queries:
   - patients.list
   - gdpr.listErasureRequests
   - appointmentTypes.listAll

### Week 3: Phase 3 (Compliance) - Audit logging + GDPR

1. **Days 1-3**: Implement cascading delete in gdpr.processErasure

2. **Day 4-5**: Add GDPR filters to:
   - appointments.listByEmployer
   - reports.listByEmployer

3. **Days 6-9**: Add audit logging to all mutations:
   - patients.create/update/softDelete
   - reports.create/sendToEmployer/markViewed
   - appointments.book/markCompleted

---

## Implementation Notes

### Authorization Pattern (Reusable)

```typescript
// Create auth helper in new module: convex/authHelpers.ts
export async function getAuthorizedUser(ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  return identity;
}

export async function getAuthorizedEmployer(ctx, employerId) {
  const identity = await getAuthorizedUser(ctx);
  const employer = await ctx.db.get(employerId);
  
  if (!employer || employer.workosUserId !== identity.subject) {
    throw new Error("Unauthorized: not employer owner");
  }
  return employer;
}

export async function getAuthorizedAdmin(ctx) {
  const identity = await getAuthorizedUser(ctx);
  const admin = await ctx.db
    .query("adminUsers")
    .withIndex("by_workos_user_id", (q) => q.eq("workosUserId", identity.subject))
    .first();
  
  if (!admin) throw new Error("Unauthorized: admin only");
  return admin;
}
```

### Pagination Pattern (Reusable)

```typescript
export const list = query({
  args: {
    employerId: v.id("employers"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { employerId, limit = 50, cursor }) => {
    let q = ctx.db
      .query("patients")
      .withIndex("by_employer", (q) => q.eq("employerId", employerId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined));
    
    if (cursor) {
      q = q.filter((q) => q.gt(q.field("_id"), cursor));
    }
    
    const items = await q.take(limit + 1);
    const hasMore = items.length > limit;
    const results = hasMore ? items.slice(0, limit) : items;
    
    return {
      items: results,
      hasMore,
      nextCursor: hasMore ? results[results.length - 1]._id : null,
    };
  },
});
```

### Audit Logging Pattern (Reusable)

```typescript
// In each mutation:
await ctx.runMutation(internal.gdpr.logAction, {
  action: "patient_created",
  actorType: "employer",
  actorId: identity.subject,
  resourceType: "patients",
  resourceId: patientId,
  details: { email: args.email },
});
```

---

## Verification Checklist

After implementing fixes, verify:

- [ ] All P0 authorization issues fixed (prevents privilege escalation)
- [ ] All queries have authorization checks
- [ ] All list queries have pagination with reasonable defaults (50 items)
- [ ] No N+1 patterns remain in active code paths
- [ ] All mutations log to auditLogs table
- [ ] Soft-deleted patients filtered from all query results
- [ ] processErasure cascades to all related tables
- [ ] TypeScript compilation passes without errors
- [ ] E2E tests cover auth scenarios (cross-employer access prevented)
- [ ] Performance tests show <50ms latency for list queries with pagination

