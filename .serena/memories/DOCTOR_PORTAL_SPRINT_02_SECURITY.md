# Doctor Portal - Security Remediation

**Sprint**: 02 of 06
**Index**: DOCTOR_PORTAL_SPRINT_INDEX
**Depends On**: DOCTOR_PORTAL_SPRINT_01_ROUTING_FIX
**Next**: DOCTOR_PORTAL_SPRINT_03_ERROR_HANDLING
**Priority**: P0 - CRITICAL (Security vulnerabilities)

---

## Executive Summary

The Doctor Portal has **5 critical authorization vulnerabilities** that allow any authenticated user to manipulate doctor schedules and settings. This is a **HIPAA violation risk** - attackers could hijack Zoom links to intercept patient consultations.

**Impact**: HIGH (medical privacy) | **Effort**: 2-3 hours | **Risk**: Medium (backend changes)

---

## Vulnerabilities Identified

| ID | Severity | Component | Issue | CVSS |
|----|----------|-----------|-------|------|
| AUTH-001 | 🔴 CRITICAL | `availableSlots.createSlots` | No authorization check | 8.2 |
| AUTH-002 | 🔴 CRITICAL | `availableSlots.blockSlot` | No authorization check | 8.2 |
| AUTH-003 | 🔴 CRITICAL | `availableSlots.unblockSlot` | No authorization check | 8.2 |
| AUTH-004 | 🔴 CRITICAL | `doctorSettings.update` | No ownership verification | 8.5 |
| INV-001 | 🟠 HIGH | `doctorSettings.update` | Zoom URL not validated | 7.8 |

---

## Implementation

### Fix AUTH-001, AUTH-002, AUTH-003: Slot Mutations

**File**: `convex/availableSlots.ts`

**Add authorization to createSlots (lines 57-78):**
```typescript
import { requireDoctorAccess } from "./authModules/authorization";

export const createSlots = mutation({
  args: {
    slots: v.array(
      v.object({
        date: v.string(),
        startTime: v.string(),
        endTime: v.string(),
      })
    ),
  },
  handler: async (ctx, { slots }) => {
    // ADD: Verify caller is a doctor
    const doctor = await requireDoctorAccess(ctx);
    
    const ids: Id<"availableSlots">[] = [];
    for (const slot of slots) {
      const id = await ctx.db.insert("availableSlots", {
        doctorId: doctor._id,  // ADD: Associate with authenticated doctor
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: "available",
      });
      ids.push(id);
    }
    return ids;
  },
});
```

**Add authorization to blockSlot (lines 81-90):**
```typescript
export const blockSlot = mutation({
  args: { slotId: v.id("availableSlots") },
  handler: async (ctx, { slotId }) => {
    // ADD: Verify caller is a doctor
    const doctor = await requireDoctorAccess(ctx);
    
    const slot = await ctx.db.get(slotId);
    if (!slot) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Slot not found" });
    }
    
    // ADD: Verify doctor owns this slot
    if (slot.doctorId !== doctor._id) {
      throw new ConvexError({ code: "UNAUTHORIZED", message: "Cannot modify another doctor's slot" });
    }
    
    if (slot.status !== "available") {
      throw new ConvexError({ code: "INVALID_STATE", message: "Slot not available to block" });
    }
    
    await ctx.db.patch(slotId, { status: "blocked" });
  },
});
```

**Add authorization to unblockSlot (lines 93-102):**
```typescript
export const unblockSlot = mutation({
  args: { slotId: v.id("availableSlots") },
  handler: async (ctx, { slotId }) => {
    // ADD: Verify caller is a doctor
    const doctor = await requireDoctorAccess(ctx);
    
    const slot = await ctx.db.get(slotId);
    if (!slot) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Slot not found" });
    }
    
    // ADD: Verify doctor owns this slot
    if (slot.doctorId !== doctor._id) {
      throw new ConvexError({ code: "UNAUTHORIZED", message: "Cannot modify another doctor's slot" });
    }
    
    if (slot.status !== "blocked") {
      throw new ConvexError({ code: "INVALID_STATE", message: "Slot is not blocked" });
    }
    
    await ctx.db.patch(slotId, { status: "available" });
  },
});
```

---

### Fix AUTH-004 + INV-001: Doctor Settings Update

**File**: `convex/doctorSettings.ts`

**Add ownership check and URL validation (lines 58-70):**
```typescript
import { requireDoctorAccess } from "./authModules/authorization";

// ADD: URL validation helper
function isValidZoomUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    // Accept zoom.us or any subdomain
    return urlObj.hostname.endsWith("zoom.us") || 
           urlObj.hostname.endsWith("zoom.com");
  } catch {
    return false;
  }
}

export const update = mutation({
  args: {
    doctorId: v.id("doctorSettings"),
    name: v.optional(v.string()),
    zoomPersonalLink: v.optional(v.string()),
  },
  handler: async (ctx, { doctorId, ...updates }) => {
    // ADD: Verify caller is a doctor
    const doctor = await requireDoctorAccess(ctx);
    
    // ADD: Verify doctor owns this record
    if (doctor._id !== doctorId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Cannot modify another doctor's settings",
      });
    }
    
    // ADD: Validate Zoom URL if provided
    if (updates.zoomPersonalLink && !isValidZoomUrl(updates.zoomPersonalLink)) {
      throw new ConvexError({
        code: "INVALID_URL",
        message: "Zoom link must be a valid Zoom URL (e.g., https://zoom.us/j/123456)",
      });
    }
    
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    
    await ctx.db.patch(doctorId, filteredUpdates);
  },
});
```

---

## Schema Update (Optional but Recommended)

**File**: `convex/schema.ts`

Add `doctorId` to `availableSlots` table:
```typescript
availableSlots: defineTable({
  doctorId: v.id("doctorSettings"),  // ADD: Link slot to doctor
  date: v.string(),
  startTime: v.string(),
  endTime: v.string(),
  status: v.union(v.literal("available"), v.literal("booked"), v.literal("blocked")),
})
  .index("by_date", ["date"])
  .index("by_doctor", ["doctorId"])  // ADD: Index for doctor lookup
  .index("by_doctor_date", ["doctorId", "date"]),  // ADD: Compound index
```

---

## Acceptance Criteria

- [ ] Employer cannot call `createSlots` (returns UNAUTHORIZED)
- [ ] Employer cannot call `blockSlot` (returns UNAUTHORIZED)
- [ ] Doctor A cannot block Doctor B's slot (returns UNAUTHORIZED)
- [ ] Doctor cannot set Zoom link to `javascript:alert('xss')` (returns INVALID_URL)
- [ ] Doctor can set Zoom link to `https://zoom.us/j/123456` (succeeds)
- [ ] All mutations log to audit trail

---

## Test Commands

### Backend Verification (Convex CLI)
```bash
# Test as employer (should fail)
npx convex run availableSlots:createSlots '{"slots":[{"date":"2026-02-15","startTime":"09:00","endTime":"09:30"}]}' --identity employer_user_id
# Expected: ConvexError UNAUTHORIZED

# Test Zoom URL validation
npx convex run doctorSettings:update '{"doctorId":"doctor_123","zoomPersonalLink":"javascript:alert(1)"}'
# Expected: ConvexError INVALID_URL
```

### Browser-CLI Security Test
```bash
# Restore employer state (wrong role)
restoreState authenticated-employer

# Try to access doctor schedule page (should fail)
navigate /doctor/schedule
wait 1000
snapshot
# Expected: Redirect to landing OR access denied

# Try to call slot mutation via console (should fail)
evaluate 'fetch("/api/mutation/availableSlots:createSlots", {...})'
# Expected: 401/403 response
```

---

## Attack Scenarios Prevented

### Scenario 1: Schedule Sabotage
**Before Fix**: Employer discovers doctor's schedule, creates hundreds of fake slots
**After Fix**: `requireDoctorAccess()` blocks non-doctor callers

### Scenario 2: Zoom Link Hijacking (HIPAA Violation)
**Before Fix**: Attacker changes doctor's Zoom link to malicious URL, intercepts patient calls
**After Fix**: Ownership check + URL validation prevents modification

### Scenario 3: XSS via Zoom Link
**Before Fix**: Attacker sets `zoomPersonalLink: "javascript:..."`, executes when patient clicks
**After Fix**: URL validation rejects non-Zoom URLs

---

## Files Modified

| File | Changes |
|------|---------|
| `convex/availableSlots.ts` | Add auth to 3 mutations, add ownership checks |
| `convex/doctorSettings.ts` | Add ownership check, add URL validation |
| `convex/schema.ts` | Add `doctorId` field to slots (optional) |

---

## Post-Implementation

Run security test suite:
```bash
npm run typecheck
npx convex dev  # Verify no schema errors
```

Then proceed to **Sprint 03: Error Handling**.

---

→ Next: DOCTOR_PORTAL_SPRINT_03_ERROR_HANDLING
