# Security & Pre-Flight Fixes
**Sprint**: 05 of 06
**Index**: RECURRING_SLOTS_INDEX
**Depends On**: RECURRING_SLOTS_SPRINT_01_ARCHITECTURE
**Next**: RECURRING_SLOTS_SPRINT_06_BROWSER_CLI

---

## Critical Pre-Flight Checklist

⚠️ **MUST COMPLETE BEFORE implementing recurring slots feature**

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Missing audit logging for slot mutations | CRITICAL (GDPR) | ❌ Fix Required |
| 2 | No backend date/time validation | HIGH | ❌ Fix Required |
| 3 | Race condition in concurrent bookings | MEDIUM | ⚠️ Acknowledge/Defer |
| 4 | `unblockSlot` defined but no UI | LOW | ⚠️ Implement or Remove |
| 5 | Unbounded slot array in createSlots | MEDIUM | ❌ Fix Required |

---

## Fix 1: Add Audit Logging (GDPR Compliance)

### Issue
Slot mutations (`createSlots`, `blockSlot`, `unblockSlot`) have NO audit logs. This violates GDPR requirements for data processing audit trails.

### Location
`convex/availableSlots.ts` - lines 91-187

### Fix

```typescript
// Import audit logger (if exists)
import { logAction } from "./auditLogger";
// OR create inline logging

// In createSlots mutation (after line 115):
export const createSlots = mutation({
  handler: async (ctx, { slots }) => {
    const doctor = await requireDoctorAccess(ctx);
    
    const ids = [];
    for (const slot of slots) {
      const id = await ctx.db.insert("availableSlots", {
        doctorId: doctor._id,
        ...slot,
        status: "available",
      });
      ids.push(id);
    }
    
    // ADD: Audit log
    await ctx.db.insert("auditLogs", {
      action: "slots_created",
      actorType: "doctor",
      actorId: doctor._id.toString(),
      entityType: "availableSlots",
      entityId: ids[0]?.toString() || "batch",
      details: JSON.stringify({
        count: ids.length,
        date: slots[0]?.date,
        doctorId: doctor._id,
      }),
      timestamp: Date.now(),
    });
    
    return ids;
  },
});

// In blockSlot mutation (after line 149):
await ctx.db.insert("auditLogs", {
  action: "slot_blocked",
  actorType: "doctor",
  actorId: doctor._id.toString(),
  entityType: "availableSlots",
  entityId: slotId.toString(),
  details: JSON.stringify({ date: slot.date, time: slot.startTime }),
  timestamp: Date.now(),
});

// In unblockSlot mutation (after line 185):
await ctx.db.insert("auditLogs", {
  action: "slot_unblocked",
  actorType: "doctor",
  actorId: doctor._id.toString(),
  entityType: "availableSlots",
  entityId: slotId.toString(),
  details: JSON.stringify({ date: slot.date, time: slot.startTime }),
  timestamp: Date.now(),
});
```

### Verification
```bash
# After creating slot, check audit logs
npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts auditLogs --limit=5 --json | jq '.data[] | select(.action == "slots_created")'
```

---

## Fix 2: Add Backend Date/Time Validation

### Issue
All date/time inputs are `v.string()` with no format validation. Invalid values like `"2026-99-99"` or `"25:99"` are accepted.

### Location
`convex/availableSlots.ts` - multiple mutations

### Fix

```typescript
// Add to top of file or import from lib/dateUtils.ts
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;

function validateDateFormat(date: string, fieldName: string): void {
  if (!DATE_REGEX.test(date)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: `Invalid ${fieldName} format. Use YYYY-MM-DD`,
    });
  }
}

function validateTimeFormat(time: string, fieldName: string): void {
  if (!TIME_REGEX.test(time)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: `Invalid ${fieldName} format. Use HH:MM`,
    });
  }
}

function validateTimeRange(startTime: string, endTime: string): void {
  if (startTime >= endTime) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "End time must be after start time",
    });
  }
}

// In createSlots mutation (add before insert loop):
export const createSlots = mutation({
  handler: async (ctx, { slots }) => {
    const doctor = await requireDoctorAccess(ctx);
    
    // ADD: Validate all slots
    for (const slot of slots) {
      validateDateFormat(slot.date, "date");
      validateTimeFormat(slot.startTime, "startTime");
      validateTimeFormat(slot.endTime, "endTime");
      validateTimeRange(slot.startTime, slot.endTime);
    }
    
    // ... existing insert logic
  },
});

// In getByDateRange query (add validation):
export const getByDateRange = query({
  handler: async (ctx, { startDate, endDate }) => {
    validateDateFormat(startDate, "startDate");
    validateDateFormat(endDate, "endDate");
    
    if (startDate > endDate) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "startDate must be before endDate",
      });
    }
    
    // ... existing query logic
  },
});
```

### Verification
```bash
# Test invalid date (should fail)
npx convex run availableSlots:createSlots '{"slots":[{"date":"invalid","startTime":"09:00","endTime":"09:30"}]}'
# Expected: VALIDATION_ERROR

# Test invalid time (should fail)
npx convex run availableSlots:createSlots '{"slots":[{"date":"2026-01-15","startTime":"9:00","endTime":"09:30"}]}'
# Expected: VALIDATION_ERROR
```

---

## Fix 3: Acknowledge Race Condition

### Issue
`appointments.book()` has a TOCTOU (Time-of-Check, Time-of-Use) vulnerability. Two concurrent bookings can double-book the same slot.

### Scenario
```
T1: Employer A reads slot.status = "available"
T2: Employer B reads slot.status = "available"
T3: Employer A updates slot → booked, appointmentId = apt1
T4: Employer B updates slot → booked, appointmentId = apt2 (OVERWRITES)
Result: Double booking, apt1 orphaned
```

### Decision Required
| Option | Impact | Effort |
|--------|--------|--------|
| **A: Accept risk** | Low occurrence, manual resolution | None |
| **B: Add retry logic** | Frontend retries on conflict | Low |
| **C: Atomic update** | Requires Convex feature check | Medium |

### Recommended: Option B (Add retry)
```typescript
// In BookingFlow.tsx - wrap book mutation
const bookWithRetry = async (args, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await book(args);
    } catch (err) {
      if (err.code === "SLOT_UNAVAILABLE" && i < retries - 1) {
        await new Promise(r => setTimeout(r, 500)); // Wait before retry
        continue;
      }
      throw err;
    }
  }
};
```

### Status: ⚠️ DEFER - Document for future sprint

---

## Fix 4: Implement unblockSlot UI

### Issue
`unblockSlot` mutation exists but no UI calls it. Either implement or remove.

### Option A: Add UI Button

```typescript
// In Schedule.tsx, update blocked slot display:
{slot.status === "blocked" && (
  <Button
    variant="outline"
    size="sm"
    onClick={() => handleUnblockSlot(slot._id)}
    disabled={unblockingId === slot._id}
  >
    {unblockingId === slot._id ? "..." : "Unblock"}
  </Button>
)}

// Add handler:
const unblockSlot = useMutation(api.availableSlots.unblockSlot);
const [unblockingId, setUnblockingId] = useState<Id<"availableSlots"> | null>(null);

const handleUnblockSlot = async (slotId: Id<"availableSlots">) => {
  setUnblockingId(slotId);
  try {
    await unblockSlot({ slotId });
  } finally {
    setUnblockingId(null);
  }
};
```

### Option B: Remove Function
If unblock is not needed, remove from `availableSlots.ts` to reduce code surface.

### Decision: **Implement UI** (Option A) - Doctors need to unblock slots

---

## Fix 5: Add Max Array Size Validation

### Issue
`createSlots` accepts unlimited array size, enabling DoS attacks.

### Fix

```typescript
// In createSlots mutation args:
export const createSlots = mutation({
  args: {
    slots: v.array(
      v.object({
        date: v.string(),
        startTime: v.string(),
        endTime: v.string(),
      }),
      { maxItems: 100 }  // ADD: Limit to 100 slots per call
    ),
  },
  handler: async (ctx, { slots }) => {
    // Additional runtime check (belt and suspenders)
    if (slots.length > 100) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "Maximum 100 slots per request",
      });
    }
    // ... existing logic
  },
});
```

**Note**: Convex `v.array()` may not support `maxItems` directly. Use runtime check as fallback.

---

## Security Assessment Summary

| Category | Before | After Fixes |
|----------|--------|-------------|
| **Authentication** | ✅ Strong | ✅ Strong |
| **Authorization** | ✅ Good | ✅ Good |
| **Input Validation** | ❌ Missing | ✅ Complete |
| **Audit Logging** | ❌ Missing | ✅ GDPR Compliant |
| **DoS Protection** | ⚠️ Partial | ✅ Array limits |
| **Race Conditions** | ⚠️ Known | ⚠️ Documented |

---

## Pre-Flight Verification Checklist

Before proceeding to feature implementation:

- [ ] Audit logging added to all 3 mutations
- [ ] Date format validation added (YYYY-MM-DD)
- [ ] Time format validation added (HH:MM)
- [ ] Time range validation added (end > start)
- [ ] Array size limit added (100 max)
- [ ] unblockSlot UI implemented OR function removed
- [ ] Race condition documented in README
- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes
- [ ] Manual test: create slot, check audit log exists

---

## Post-Fix Testing

### Manual Verification Commands

```bash
# 1. Test audit logging
npx convex run availableSlots:createSlots '{"slots":[{"date":"2026-01-15","startTime":"09:00","endTime":"09:30"}]}'
npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts auditLogs --limit=1 --json
# Verify: "action": "slots_created"

# 2. Test date validation
npx convex run availableSlots:createSlots '{"slots":[{"date":"invalid","startTime":"09:00","endTime":"09:30"}]}'
# Expected: Error with code "VALIDATION_ERROR"

# 3. Test time validation
npx convex run availableSlots:createSlots '{"slots":[{"date":"2026-01-15","startTime":"9:0","endTime":"09:30"}]}'
# Expected: Error with code "VALIDATION_ERROR"

# 4. Test array limit
# (Create 101-item array in test file)
# Expected: Error with message "Maximum 100 slots"
```

---

## Acceptance Criteria

- [ ] All slot mutations have audit logging
- [ ] All date inputs validated as YYYY-MM-DD
- [ ] All time inputs validated as HH:MM
- [ ] startTime < endTime enforced on backend
- [ ] Array size limited to 100 items
- [ ] unblockSlot either has UI or is removed
- [ ] No TypeScript errors
- [ ] No new security vulnerabilities
- [ ] GDPR audit trail functional

---

→ Next: **RECURRING_SLOTS_SPRINT_06_BROWSER_CLI** (Browser-CLI Manual Testing)
