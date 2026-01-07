# Employer Booking Verification Fix

**Sprint**: 01 of 04
**Index**: REMEDIATION_INDEX
**Depends On**: None
**Next**: REMEDIATION_SPRINT_02_GDPR_MODULE_SPLIT
**Priority**: P1-IMMEDIATE
**Effort**: 15 minutes
**Risk**: MEDIUM (security gap)

---

## Problem Statement

The `appointments.book()` mutation allows unverified employers to book appointments. While the frontend disables the "New Booking" button for pending employers, the backend does not enforce this check, creating a security gap where direct API calls could bypass the restriction.

**Location**: `convex/appointments.ts` - `book` mutation
**Current behavior**: Allows any authenticated employer to book
**Expected behavior**: Only verified employers (status === "verified") can book

---

## Implementation Plan

### Step 1: Locate the mutation

```
convex/appointments.ts → book mutation (lines ~180-242)
```

### Step 2: Add verification check

After the existing `requireEmployerOwnership()` call, add employer status validation:

```typescript
// After line ~195 (after requireEmployerOwnership)
// ADD: Verify employer is approved before allowing booking
if (employer.status !== "verified") {
  throw new ConvexError({
    code: "EMPLOYER_NOT_VERIFIED" as const,
    message: "Only verified employers can book appointments. Please wait for admin approval.",
  });
}
```

### Step 3: Update the error code type (if needed)

If `EMPLOYER_NOT_VERIFIED` isn't in the error code union, add it to `authModules/authorization.ts`:

```typescript
export type AuthErrorCode = 
  | "UNAUTHENTICATED"
  | "UNAUTHORIZED"
  | "EMPLOYER_NOT_FOUND"
  | "EMPLOYER_NOT_VERIFIED"  // ADD THIS
  | "DOCTOR_NOT_FOUND"
  | "ADMIN_NOT_FOUND";
```

---

## Acceptance Criteria

- [ ] Backend rejects booking attempts from employers with `status !== "verified"`
- [ ] Error message clearly explains the restriction
- [ ] Error code is `EMPLOYER_NOT_VERIFIED`
- [ ] Frontend gracefully handles the new error (displays toast)
- [ ] Existing verified employer booking flow unchanged
- [ ] Audit log captures rejected booking attempts (optional)

---

## Test Scenarios

### Unit Test (Convex)
```typescript
// convex/__tests__/appointments.test.ts
describe("appointments.book", () => {
  it("should reject booking from unverified employer", async () => {
    // Mock: employer with status="pending"
    // Action: call book mutation
    // Assert: ConvexError with code EMPLOYER_NOT_VERIFIED
  });

  it("should allow booking from verified employer", async () => {
    // Mock: employer with status="verified"
    // Action: call book mutation
    // Assert: appointment created successfully
  });
});
```

### Manual Test (Browser-CLI)
See Sprint 04 for detailed Browser-CLI test commands.

---

## Rollback Plan

If issues arise, revert the single code change in `appointments.ts`. The frontend already handles the pending state gracefully.

---

## Evidence Requirements

- [ ] Screenshot: Error toast when pending employer attempts booking
- [ ] Screenshot: Successful booking for verified employer
- [ ] Console log: `ConvexError { code: "EMPLOYER_NOT_VERIFIED" }` for rejected attempt

---

→ Next: REMEDIATION_SPRINT_02_GDPR_MODULE_SPLIT
