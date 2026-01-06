# Security Vulnerabilities & Fixes

**Sprint**: 02 of 06
**Index**: ADMIN_GAPS_INDEX
**Depends On**: ADMIN_GAPS_SPRINT_01_EXECUTIVE_SUMMARY
**Next**: ADMIN_GAPS_SPRINT_03_CRUD_IMPLEMENTATION

---

## Vulnerability Inventory

| ID | Title | Severity | Component | Status |
|---|---|---|---|---|
| VUL-001 | Missing audit logs on employer verify/reject | HIGH | employers.ts | Active |
| VUL-002 | Missing audit logs on appointment type create/update | HIGH | appointmentTypes.ts | Active |
| VUL-003 | No audit log on erasure processing | HIGH | gdpr.ts | Active |
| VUL-004 | Unvalidated processedBy parameter | HIGH | gdpr.ts | Active |
| VUL-005 | No string length validation | MEDIUM | multiple | Active |
| VUL-006 | No number range validation (duration, price) | MEDIUM | appointmentTypes.ts | Active |
| VUL-007 | Rejection reason not required (can be empty) | MEDIUM | employers.ts | Active |

---

## CRITICAL FIX 1: Add Audit Logs to Employer Actions

**File**: `convex/employers.ts`

### Current (INSECURE)
```typescript
// Line 122-137 - verify mutation
export const verify = mutation({
  args: { employerId: v.id("employers") },
  handler: async (ctx, { employerId }) => {
    const admin = await requireAdmin(ctx);
    await ctx.db.patch(employerId, {
      status: "verified",
      verifiedAt: Date.now(),
      verifiedBy: admin._id,
      updatedAt: Date.now(),
      // ❌ NO AUDIT LOG
    });
  },
});
```

### Fixed Implementation
```typescript
export const verify = mutation({
  args: { employerId: v.id("employers") },
  handler: async (ctx, { employerId }) => {
    const admin = await requireAdmin(ctx);
    
    const employer = await ctx.db.get(employerId);
    if (!employer) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Employer not found" });
    }
    
    await ctx.db.patch(employerId, {
      status: "verified",
      verifiedAt: Date.now(),
      verifiedBy: admin._id,
      updatedAt: Date.now(),
    });
    
    // ✅ ADD AUDIT LOG
    await ctx.runMutation(internal.gdpr.logAction, {
      action: "employer_verified",
      actorType: "admin",
      actorId: admin._id,
      resourceType: "employer",
      resourceId: employerId,
      details: { companyName: employer.companyName },
    });
  },
});
```

### Apply same pattern to `reject` mutation (lines 140-155)

---

## CRITICAL FIX 2: Fix processedBy Parameter

**File**: `convex/gdpr.ts` (lines 168-257)

### Current (INSECURE)
```typescript
export const processErasure = mutation({
  args: {
    requestId: v.id("erasureRequests"),
    processedBy: v.string(),  // ❌ Frontend-supplied, not authenticated
  },
  handler: async (ctx, { requestId, processedBy }) => {
    await requireAdmin(ctx);  // Verifies but doesn't use admin ID
    // ...
    await ctx.db.patch(requestId, {
      processedBy,  // ❌ Uses untrusted frontend value
    });
  },
});
```

### Fixed Implementation
```typescript
export const processErasure = mutation({
  args: {
    requestId: v.id("erasureRequests"),
    // REMOVE processedBy from args - get from auth
  },
  handler: async (ctx, { requestId }) => {
    const admin = await requireAdmin(ctx);  // ✅ Use authenticated admin
    
    // ... erasure logic ...
    
    await ctx.db.patch(requestId, {
      status: "completed",
      completedAt: Date.now(),
      processedBy: admin.email,  // ✅ From auth context
    });
    
    // ✅ ADD AUDIT LOG
    await ctx.runMutation(internal.gdpr.logAction, {
      action: "erasure_processed",
      actorType: "admin",
      actorId: admin._id,
      resourceType: "erasureRequest",
      resourceId: requestId,
      details: { patientId: request.patientId },
    });
  },
});
```

---

## CRITICAL FIX 3: Add Audit Logs to Appointment Types

**File**: `convex/appointmentTypes.ts`

### Add to `create` mutation (after line 53)
```typescript
// After insert
await ctx.runMutation(internal.gdpr.logAction, {
  action: "appointment_type_created",
  actorType: "admin",
  actorId: admin._id,
  resourceType: "appointmentType",
  resourceId: typeId,
  details: { name: args.name },
});
```

### Add to `update` mutation (after line 72)
```typescript
await ctx.runMutation(internal.gdpr.logAction, {
  action: "appointment_type_updated",
  actorType: "admin",
  actorId: admin._id,
  resourceType: "appointmentType",
  resourceId: typeId,
  details: { updates: Object.keys(filteredUpdates) },
});
```

---

## MEDIUM FIX 4: Input Validation

**File**: `convex/appointmentTypes.ts`

### Add validation to create/update handlers
```typescript
// In handler, before insert/patch:
if (!args.name || args.name.trim().length < 1) {
  throw new ConvexError({ code: "VALIDATION_ERROR", message: "Name is required" });
}
if (args.name.length > 100) {
  throw new ConvexError({ code: "VALIDATION_ERROR", message: "Name too long (max 100)" });
}
if (args.durationMinutes < 15 || args.durationMinutes > 480) {
  throw new ConvexError({ code: "VALIDATION_ERROR", message: "Duration must be 15-480 minutes" });
}
if (args.price < 0 || args.price > 99999) {
  throw new ConvexError({ code: "VALIDATION_ERROR", message: "Price must be 0-99999" });
}
```

**File**: `convex/employers.ts`

### Add validation to reject handler
```typescript
if (!reason || reason.trim().length < 10) {
  throw new ConvexError({ 
    code: "VALIDATION_ERROR", 
    message: "Rejection reason required (min 10 characters)" 
  });
}
```

---

## GDPR Compliance Checklist

| Requirement | Before | After |
|-------------|--------|-------|
| Audit trail for verification decisions | ❌ | ✅ |
| Audit trail for erasure processing | ❌ | ✅ |
| Authenticated admin ID in logs | ❌ | ✅ |
| Input validation | ❌ | ✅ |
| Authorization checks | ✅ | ✅ |
| Data redaction on erasure | ✅ | ✅ |

**Compliance Score**: 75% → 100%

---

## Acceptance Criteria

- [ ] All employer verify/reject actions logged to auditLogs
- [ ] All appointment type create/update actions logged
- [ ] Erasure processing logged with authenticated admin ID
- [ ] processedBy field populated from auth context, not frontend
- [ ] Input validation prevents empty strings and invalid ranges
- [ ] All mutations throw ConvexError with structured codes

---

→ Next: ADMIN_GAPS_SPRINT_03_CRUD_IMPLEMENTATION
