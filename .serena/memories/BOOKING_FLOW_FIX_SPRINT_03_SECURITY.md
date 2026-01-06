# Security Vulnerabilities
**Sprint**: 03 of 06
**Index**: BOOKING_FLOW_FIX_INDEX
**Depends On**: BOOKING_FLOW_FIX_SPRINT_01_EXECUTIVE_SUMMARY
**Next**: BOOKING_FLOW_FIX_SPRINT_04_IMPLEMENTATION

---

## Security Assessment Summary

| Overall Status | MEDIUM-HIGH RISK |
|----------------|------------------|
| **Critical Vulnerabilities** | 2 |
| **Medium Vulnerabilities** | 3 |
| **Low Vulnerabilities** | 2 |

---

## CRITICAL: Missing Admin Authorization

### VULN-APT-01: appointmentTypes.create() - No Auth

**File**: `convex/appointmentTypes.ts`
**Lines**: 39-52
**Severity**: CRITICAL

```typescript
// CURRENT (VULNERABLE):
export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    durationMinutes: v.number(),
    price: v.number(),
  },
  handler: async (ctx, args) => {
    // ❌ NO AUTH CHECK - Anyone can create appointment types!
    return ctx.db.insert("appointmentTypes", {
      ...args,
      isActive: true,
    });
  },
});
```

**Attack Vector**: Any authenticated user (employer/doctor) can create arbitrary appointment types.

**Impact**:
- Service catalog corruption
- Fake/invalid appointment types
- Price manipulation potential

---

### VULN-APT-02: appointmentTypes.update() - No Auth

**File**: `convex/appointmentTypes.ts`
**Lines**: 55-70
**Severity**: CRITICAL

```typescript
// CURRENT (VULNERABLE):
export const update = mutation({
  args: {
    typeId: v.id("appointmentTypes"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
    price: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { typeId, ...updates }) => {
    // ❌ NO AUTH CHECK - Anyone can modify appointment types!
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(typeId, filteredUpdates);
  },
});
```

**Attack Vector**: Any authenticated user can modify existing appointment type pricing, duration, or deactivate types.

**Impact**:
- Booking flow disruption (set all types to inactive)
- Financial impact (price manipulation)
- Service denial

---

## MEDIUM: Additional Security Gaps

### VULN-APT-03: listAll() - No Auth

**File**: `convex/appointmentTypes.ts`
**Lines**: 23-28

```typescript
// CURRENT:
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    // ❌ Returns all types including inactive/hidden
    return ctx.db.query("appointmentTypes").collect();
  },
});
```

**Impact**: Information disclosure - enumerate all appointment types

---

### VULN-ERR-01: Inconsistent Error Handling

**File**: `convex/gdpr.ts`
**Line**: 178

```typescript
// CURRENT (INCONSISTENT):
if (!request) throw new Error("Request not found");

// SHOULD BE:
if (!request) throw new ConvexError({ 
  code: "NOT_FOUND", 
  message: "Request not found" 
});
```

---

### VULN-ZOOM-01: Weak URL Validation

**File**: `convex/doctorSettings.ts`
**Lines**: 15-22

```typescript
// CURRENT: Only checks hostname
function isValidZoomUrl(url: string): boolean {
  const urlObj = new URL(url);
  return urlObj.hostname.includes("zoom");
  // ❌ Accepts javascript:void(0)//zoom or data:text/html,zoom
}
```

**Impact**: Low-risk XSS potential via Zoom link field

---

## Authorization Pattern Comparison

### ✅ CORRECT Pattern (employers.ts)

```typescript
// convex/employers.ts:122-137
export const verify = mutation({
  args: { employerId: v.id("employers") },
  handler: async (ctx, { employerId }) => {
    const admin = await requireAdmin(ctx);  // ← AUTH CHECK
    await ctx.db.patch(employerId, {
      status: "verified",
      verifiedBy: admin._id,
    });
  },
});
```

### ❌ INCORRECT Pattern (appointmentTypes.ts)

```typescript
// convex/appointmentTypes.ts:39-52
export const create = mutation({
  args: { ... },
  handler: async (ctx, args) => {
    // ← MISSING: await requireAdmin(ctx);
    return ctx.db.insert("appointmentTypes", { ... });
  },
});
```

---

## Security Fix Requirements

### Priority 1: Add Admin Auth to Mutations

**File**: `convex/appointmentTypes.ts`

```typescript
import { requireAdmin } from "./authModules";

export const create = mutation({
  args: { ... },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);  // ← ADD THIS
    return ctx.db.insert("appointmentTypes", { ... });
  },
});

export const update = mutation({
  args: { ... },
  handler: async (ctx, { typeId, ...updates }) => {
    await requireAdmin(ctx);  // ← ADD THIS
    // ... existing code
  },
});
```

### Priority 2: Protect listAll Query

```typescript
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);  // ← ADD THIS
    return ctx.db.query("appointmentTypes").collect();
  },
});
```

---

## Booking Flow Security: CONFIRMED SECURE

The core booking mutations ARE properly protected:

| Mutation | Auth Check | Ownership Check | Status |
|----------|-----------|-----------------|--------|
| `appointments.book()` | requireEmployerOwnership | Patient + employer | ✅ SECURE |
| `appointments.cancel()` | requireEmployerOwnership | Appointment employer | ✅ SECURE |
| `appointments.markCompleted()` | requireDoctorAccess | N/A | ✅ SECURE |
| `availableSlots.createSlots()` | requireDoctorAccess | Doctor owns slots | ✅ SECURE |
| `patients.create()` | requireEmployerOwnership | Employer | ✅ SECURE |

---

## Security Checklist

| Check | Status |
|-------|--------|
| Frontend auth guards | ✅ PASS |
| Token storage (role-specific) | ✅ PASS |
| JWT validation | ✅ PASS |
| Authorization on booking mutations | ✅ PASS |
| Authorization on appointmentTypes mutations | ❌ FAIL |
| Ownership checks | ✅ PASS |
| GDPR routes protected | ✅ PASS |
| Error codes consistent | ⚠️ PARTIAL |
| Audit logging | ✅ PASS |
| Rate limiting | ❌ MISSING |

---

→ Next: BOOKING_FLOW_FIX_SPRINT_04_IMPLEMENTATION
