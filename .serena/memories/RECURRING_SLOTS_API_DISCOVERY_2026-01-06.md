# Weekly Recurring Slots: API Discovery Report
**Date**: 2026-01-06  
**Status**: COMPLETE  
**Scope**: Convex backend API files for recurring slot feature implementation

---

## Executive Summary

Discovered existing API infrastructure for availableSlots feature and supporting utilities. Schema modifications needed for recurring templates. All dependencies identified and catalogued.

**Key Findings**:
- ✅ `availableSlots.ts` exists with 6 exports (4 queries, 2 mutations) + auth pattern established
- ✅ `authModules/authorization.ts` provides `requireDoctorAccess()` for doctor-only access
- ✅ `convex/helpers/` provides batch operations, pagination, and audit logging utilities
- ✅ `convex/gdpr.ts` has `logAction()` internal mutation for GDPR audit compliance
- ⚠️ `recurringSlotTemplates` table NOT YET in schema - needs addition
- ✅ Existing type system in `src/types/doctor.ts` with `TimeSlot` interface ready to extend

---

## 1. EXISTING MUTATIONS IN availableSlots.ts

### Location
`/home/gabe/projects/convex-medical-starter/convex/availableSlots.ts` (188 lines)

### Current Mutations (2)

#### 1.1 `createSlots` - Creates individual slots
```typescript
// Lines 91-115
export const createSlots = mutation({
  args: {
    slots: v.array(v.object({
      date: v.string(),
      startTime: v.string(),
      endTime: v.string(),
    })),
  },
  handler: async (ctx, { slots }) => {
    const doctor = await requireDoctorAccess(ctx);
    // Loops through slots array and inserts each
    const ids = [];
    for (const slot of slots) {
      const id = await ctx.db.insert("availableSlots", {
        doctorId: doctor._id,
        ...slot,
        status: "available",
      });
      ids.push(id);
    }
    return ids;
  },
});
```

**Pattern**: Batch create via loop (suitable as foundation for recurring creation)

#### 1.2 `blockSlot` - Blocks individual slot
```typescript
// Lines 131-151
export const blockSlot = mutation({
  args: { slotId: v.id("availableSlots") },
  handler: async (ctx, { slotId }) => {
    const doctor = await requireDoctorAccess(ctx);
    const slot = await ctx.db.get(slotId);
    // Validation: NOT_FOUND, UNAUTHORIZED, INVALID_STATE
    await ctx.db.patch(slotId, { status: "blocked" });
  },
});
```

**Pattern**: Ownership check before mutation (model for templateId validation)

#### 1.3 `unblockSlot` - Unblocks individual slot
```typescript
// Lines 167-187
export const unblockSlot = mutation({
  args: { slotId: v.id("availableSlots") },
  handler: async (ctx, { slotId }) => {
    const doctor = await requireDoctorAccess(ctx);
    const slot = await ctx.db.get(slotId);
    // Validation: NOT_FOUND, UNAUTHORIZED, INVALID_STATE
    await ctx.db.patch(slotId, { status: "available" });
  },
});
```

### Current Queries (4)

#### 1.1 `getByDateRange` - Range queries
```typescript
// Lines 24-41
export const getByDateRange = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, { startDate, endDate }) => {
    return ctx.db
      .query("availableSlots")
      .withIndex("by_date")
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), startDate),
          q.lte(q.field("date"), endDate)
        )
      )
      .collect();
  },
});
```

**Pattern**: Range filtering with indexes (model for template-based queries)

#### 1.2 `getAvailable` - Availability queries
```typescript
// Lines 54-64
export const getAvailable = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    return ctx.db
      .query("availableSlots")
      .withIndex("by_date_status", (q) =>
        q.eq("date", date).eq("status", "available")
      )
      .collect();
  },
});
```

**Pattern**: Composite index usage (by_date_status)

#### 1.3 `getByMonth` - Calendar queries
```typescript
// Lines 67-77
export const getByMonth = query({
  args: { yearMonth: v.string() }, // Format: "2026-01"
  handler: async (ctx, { yearMonth }) => {
    return ctx.db
      .query("availableSlots")
      .withIndex("by_date")
      .filter((q) => q.gte(q.field("date"), `${yearMonth}-01`))
      .filter((q) => q.lt(q.field("date"), `${yearMonth}-32`))
      .collect();
  },
});
```

---

## 2. AUTHORIZATION PATTERN - requireDoctorAccess()

### Location
`/home/gabe/projects/convex-medical-starter/convex/authModules/authorization.ts` (208 lines)

### Function Signature
```typescript
export async function requireDoctorAccess(
  ctx: AuthContext
): Promise<Doc<"doctorSettings">> {
  const user = await getAuthenticatedUser(ctx);
  
  if (!user) {
    throw new ConvexError({
      code: "UNAUTHENTICATED" as const,
      message: "Authentication required",
    });
  }
  
  const doctor = await ctx.db
    .query("doctorSettings")
    .withIndex("by_workos_user", (q) => q.eq("workosUserId", user.workosUserId))
    .first();
  
  if (!doctor) {
    throw new ConvexError({
      code: "DOCTOR_NOT_FOUND" as const,
      message: "Doctor access required",
    });
  }
  
  return doctor;
}
```

### Usage Pattern
```typescript
// At mutation start
const doctor = await requireDoctorAccess(ctx);
// Now safe: doctor._id for doctorId field, doctor.workosUserId, etc.
```

### Re-exports
```typescript
// From authModules/index.ts
export {
  getAuthenticatedUser,
  requireEmployerOwnership,
  requireDoctorAccess,
  requireAdmin,
  type AuthContext,
  type AuthenticatedUser,
  type AuthErrorCode,
} from "./authorization";
```

---

## 3. SCHEMA: availableSlots TABLE

### Location & Definition
`/home/gabe/projects/convex-medical-starter/convex/schema.ts` (lines 120-132)

```typescript
availableSlots: defineTable({
  doctorId: v.id("doctorSettings"),
  date: v.string(),
  startTime: v.string(),
  endTime: v.string(),
  status: v.union(v.literal("available"), v.literal("booked"), v.literal("blocked")),
  appointmentId: v.optional(v.id("appointments")),
})
  .index("by_date", ["date"])
  .index("by_status", ["status"])
  .index("by_date_status", ["date", "status"])
  .index("by_doctor", ["doctorId"])
  .index("by_doctor_date", ["doctorId", "date"]),
```

### Indexes Available
1. `by_date` - Date-based queries (for calendar, month views)
2. `by_status` - Status filtering (available, booked, blocked)
3. `by_date_status` - Composite: date + status (getAvailable pattern)
4. `by_doctor` - Doctor-specific queries (for doctor's own slots)
5. `by_doctor_date` - Composite: doctor + date (efficient range queries)

### MISSING FIELD FOR RECURRING SLOTS
⚠️ **Schema change needed**: Add `templateId: v.optional(v.id("recurringSlotTemplates"))`
- Links created slots back to template for bulk deletion/management
- Enable queries: "Get all slots for this template"

### MISSING INDEXES
⚠️ **Schema change needed**: Add `.index("by_template", ["templateId"])`
- Enables efficient `getSlotsByTemplate()` query for deletion/archival
- Required before implementing `deleteTemplateSlots()` mutation

---

## 4. HELPER FUNCTIONS & UTILITIES

### 4.1 Batch Operations - `convex/helpers/batchFetch.ts`

```typescript
// Extract unique IDs from array
extractUniqueIds<T, K>(items: T[], keyFn: (item: T) => K): K[]

// Batch fetch multiple documents by ID
batchGet<TableName>(ctx: QueryCtx, ids: Id<TableName>[]): 
  Promise<Map<Id<TableName>, Doc<TableName>>>

// Enrich items with related data
enrichWithRelation<T, R, K, IdType>(
  items: T[],
  relationMap: Map<IdType, R>,
  idFn: (item: T) => IdType,
  key: K
): (T & { [P in K]: R | null })[]

// Convenience: combines all three above
batchEnrich<T, TableName, K>(
  ctx: QueryCtx,
  items: T[],
  idFn: (item: T) => Id<TableName>,
  key: K
): Promise<(T & { [P in K]: Doc<TableName> | null })[]>
```

**Use Case for Recurring Slots**: 
- `batchEnrich()` to load template details for slots in preview/list queries
- `extractUniqueIds()` to collect all affected slot IDs during deletion

### 4.2 Pagination - `convex/helpers/pagination.ts`

```typescript
// Validator for query args
export const paginatedQueryArgs = { paginationOpts: paginationOptsValidator }

// Transform Convex result to standard format
toPaginatedResult<T>(result: PaginationResult<T>): PaginatedResult<T>

// Default pagination (first page)
defaultPaginationOpts(numItems?: number = 50)

// Next page pagination
nextPageOpts(cursor: string, numItems?: number = 50)
```

**Use Case**: Paginated template list queries (listTemplates, getTemplatesByDoctor)

### 4.3 Audit Logging - `convex/helpers/auditLogger.ts`

```typescript
// Action-specific audit helpers (all async)
logPatientAction(ctx: MutationCtx, action: string, patientId: Id, details?: Record)
logReportAction(ctx: MutationCtx, action: string, reportId: Id, patientId: Id, details?: Record)
logAppointmentAction(ctx: MutationCtx, action: string, appointmentId: Id, patientId: Id, details?: Record)

// Internal: lower-level audit
export const logAction = internalMutation({
  // args: action, actorType, actorId, resourceType, resourceId, details
  // handler: inserts into auditLogs table with timestamp
})
```

**Use Case for Recurring Slots**:
- Add `logRecurringSlotAction()` to auditLogger.ts
- Call from `createRecurringSlots()`, `deleteTemplateSlots()`, template mutations
- Pattern: `{ action: "recurring_slots_created", details: { templateId, count } }`

### 4.4 GDPR Audit Logging - `convex/gdpr.ts`

```typescript
// Internal mutation (for use via ctx.runMutation(internal.gdpr.logAction, ...))
export const logAction = internalMutation({
  args: {
    action: v.string(),
    actorType: v.union(v.literal("employer"), v.literal("doctor"), v.literal("admin"), v.literal("system")),
    actorId: v.optional(v.string()),
    resourceType: v.string(),
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
```

**Existing pattern**: Used by `createConsent()` mutation - can reuse for slot actions

---

## 5. EXISTING TYPES - `src/types/doctor.ts`

### Location
`/home/gabe/projects/convex-medical-starter/src/types/doctor.ts` (159 lines)

### TimeSlot Interface (Foundational)
```typescript
export interface TimeSlot {
  date: string;                      // YYYY-MM-DD format
  startTime: string;                 // HH:MM 24-hour format
  endTime: string;                   // HH:MM 24-hour format
  status: SlotStatus;                // "available" | "booked" | "blocked"
  appointmentId?: Id<"appointments">;
}

export type SlotStatus = "available" | "booked" | "blocked";
```

### Related Types
```typescript
export interface DoctorContextType {
  doctor: Doc<"doctorSettings"> | null | undefined;
}

export interface DashboardStats {
  totalToday: number;
  completed: number;
  remaining: number;
}

export type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
```

### Types to Add
For recurring slots feature, extend this file with:
```typescript
export interface TimeSlotTemplate {
  startTime: string;
  endTime: string;
}

export interface RecurringSlotConfig {
  templateName?: string;
  daysOfWeek: number[];              // ISO: 1=Mon, 7=Sun
  timeSlots: TimeSlotTemplate[];
  startDate: string;                 // YYYY-MM-DD
  endDate: string;                   // YYYY-MM-DD
  conflictResolution: "skip" | "overwrite_available" | "fail_on_conflict";
}

export interface SlotConflict {
  date: string;
  startTime: string;
  reason: "booked" | "blocked" | "available";
}

export interface PreviewResult {
  totalSlots: number;
  proposedSlots: Record<string, TimeSlotTemplate[]>;
  conflicts: SlotConflict[];
  summary: {
    daysCount: number;
    slotsPerDay: number;
    conflictsCount: number;
  };
}
```

---

## 6. SCHEMA CHANGES NEEDED

### Add Table: recurringSlotTemplates

**Location**: `convex/schema.ts` after `availableSlots` table (line ~133)

```typescript
recurringSlotTemplates: defineTable({
  doctorId: v.id("doctorSettings"),
  name: v.optional(v.string()),           // e.g., "Standard Week"
  daysOfWeek: v.array(v.number()),        // [1,2,3,4,5] ISO weekdays
  timeSlots: v.array(v.object({
    startTime: v.string(),                // "09:00"
    endTime: v.string(),                  // "09:30"
  })),
  startDate: v.string(),                  // "2026-01-06"
  endDate: v.string(),                    // "2026-01-31"
  createdAt: v.number(),
  status: v.union(
    v.literal("active"),
    v.literal("archived")
  ),
})
  .index("by_doctor", ["doctorId"])
  .index("by_doctor_status", ["doctorId", "status"]),
```

### Modify Table: availableSlots

**Location**: `convex/schema.ts` lines 120-132

**Add field** (after `appointmentId`):
```typescript
templateId: v.optional(v.id("recurringSlotTemplates")),
```

**Add index** (after existing indexes):
```typescript
.index("by_template", ["templateId"])
```

---

## 7. MUTATION PATTERNS IN CODEBASE

### Create Pattern (from appointmentTypes.ts)
```typescript
export const create = mutation({
  args: { /* fields */ },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("tableName", { ...args });
    return id;
  },
});
```

### Bulk Create Pattern (from availableSlots.createSlots)
```typescript
const ids = [];
for (const item of items) {
  const id = await ctx.db.insert("tableName", item);
  ids.push(id);
}
return ids;
```

### Ownership Validation Pattern (from blockSlot)
```typescript
const doctor = await requireDoctorAccess(ctx);
const slot = await ctx.db.get(slotId);
if (!slot) throw new ConvexError({ code: "NOT_FOUND" as const, ... });
if (slot.doctorId !== doctor._id) {
  throw new ConvexError({ code: "UNAUTHORIZED" as const, ... });
}
```

### Conflict Detection Pattern (from gdpr.ts)
```typescript
const existing = await ctx.db
  .query("table")
  .withIndex("by_doctor_date", (q) =>
    q.and(
      q.eq(q.field("doctorId"), doctor._id),
      q.gte(q.field("date"), startDate),
      q.lte(q.field("date"), endDate)
    )
  )
  .collect();

// Then manual conflict resolution based on resolution strategy
```

---

## 8. IMPLEMENTATION ROADMAP

### Phase 1: Schema Setup
- [ ] Add `recurringSlotTemplates` table to schema.ts
- [ ] Add `templateId` field to `availableSlots`
- [ ] Add `by_template` index
- [ ] Run `npx convex dev` to validate

### Phase 2: Date/Time Utilities (NEW FILE)
Create: `convex/lib/dateUtils.ts`
- `calculateDatesForDays()` - Generate dates for weekdays in range
- `doTimeSlotsOverlap()` - Check time slot conflicts
- `isValidDateFormat()` - Validate YYYY-MM-DD
- `isValidTimeFormat()` - Validate HH:MM
- `validateDaysOfWeek()` - Validate ISO weekday array
- `validateDateRange()` - Validate date ordering
- `validateTimeSlots()` - Comprehensive slot validation

### Phase 3: Mutations (ADD TO availableSlots.ts)
- [ ] `createRecurringSlots()` - Bulk create with template + conflict handling
- [ ] `updateTemplate()` - Modify template settings
- [ ] `deleteTemplateSlots()` - Delete slots by template + mode

### Phase 4: Queries (ADD TO availableSlots.ts)
- [ ] `previewRecurringSlots()` - Preview before creation
- [ ] `listTemplates()` - Paginated template list for doctor
- [ ] `getTemplate()` - Single template details
- [ ] `getSlotsByTemplate()` - Slots linked to template

### Phase 5: Audit Logging (EXTEND convex/helpers/auditLogger.ts)
- [ ] `logRecurringSlotAction()` - Typed audit logging for recurring operations

### Phase 6: Types (EXTEND src/types/doctor.ts)
- [ ] RecurringSlotConfig interface
- [ ] TimeSlotTemplate interface
- [ ] SlotConflict interface
- [ ] PreviewResult interface
- [ ] CreateRecurringResult interface

---

## 9. FILE STRUCTURE SUMMARY

```
convex/
├── availableSlots.ts                    [EXISTING - 188 lines]
│   ├── getByDateRange()                 [QUERY]
│   ├── getAvailable()                   [QUERY]
│   ├── getByMonth()                     [QUERY]
│   ├── createSlots()                    [MUTATION]
│   ├── blockSlot()                      [MUTATION]
│   ├── unblockSlot()                    [MUTATION]
│   └── [TODO: Add 7 new functions for recurring]
│
├── lib/
│   └── dateUtils.ts                     [TODO - NEW FILE]
│       ├── calculateDatesForDays()
│       ├── doTimeSlotsOverlap()
│       ├── isValidDateFormat()
│       ├── isValidTimeFormat()
│       ├── validateDaysOfWeek()
│       ├── validateDateRange()
│       └── validateTimeSlots()
│
├── schema.ts                            [EXISTING - MODIFY]
│   └── [Add recurringSlotTemplates table]
│   └── [Modify availableSlots: add templateId + by_template index]
│
├── helpers/
│   ├── auditLogger.ts                   [EXISTING - EXTEND]
│   │   └── [Add logRecurringSlotAction()]
│   ├── pagination.ts                    [EXISTING - REUSE]
│   └── batchFetch.ts                    [EXISTING - REUSE]
│
├── authModules/
│   └── authorization.ts                 [EXISTING - REUSE requireDoctorAccess()]
│
└── gdpr.ts                              [EXISTING - REUSE logAction()]

src/
└── types/
    └── doctor.ts                        [EXISTING - EXTEND]
        ├── TimeSlotTemplate             [NEW]
        ├── RecurringSlotConfig          [NEW]
        ├── SlotConflict                 [NEW]
        ├── PreviewResult                [NEW]
        └── CreateRecurringResult        [NEW]
```

---

## 10. KEY DEPENDENCIES & IMPORTS

### For createRecurringSlots Mutation
```typescript
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { mutation } from "./_generated/server";
import { requireDoctorAccess } from "./authModules/authorization";
import {
  calculateDatesForDays,
  validateDaysOfWeek,
  validateDateRange,
  validateTimeSlots,
  doTimeSlotsOverlap
} from "./lib/dateUtils";
import { logRecurringSlotAction } from "./helpers/auditLogger";
```

### For previewRecurringSlots Query
```typescript
import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireDoctorAccess } from "./authModules/authorization";
import { calculateDatesForDays, validateDaysOfWeek, ... } from "./lib/dateUtils";
```

### For Types File Extension
```typescript
import { Doc, Id } from "../../convex/_generated/dataModel";
```

---

## 11. CONFLICT DETECTION ALGORITHM

### Existing Pattern (from appointments.ts, gdpr.ts)

```typescript
// Query existing in range
const existingSlots = await ctx.db
  .query("availableSlots")
  .withIndex("by_doctor_date", (q) =>
    q.and(
      q.eq(q.field("doctorId"), doctor._id),
      q.gte(q.field("date"), startDate),
      q.lte(q.field("date"), endDate)
    )
  )
  .collect();

// Manual conflict detection (no built-in overlap query in Convex)
function detectConflicts(proposed, existing) {
  const conflicts = [];
  for (const prop of proposed) {
    for (const exist of existing) {
      if (prop.date === exist.date && doTimeSlotsOverlap(prop, exist)) {
        conflicts.push({
          date: prop.date,
          startTime: prop.startTime,
          reason: exist.status, // "booked", "blocked", or "available"
        });
      }
    }
  }
  return conflicts;
}
```

### Conflict Resolution Strategies
1. **skip** - Skip conflicting slots, create non-conflicting ones
2. **overwrite_available** - Delete "available" slots, keep "booked"/"blocked"
3. **fail_on_conflict** - Throw error if ANY conflict found, create nothing

---

## 12. ACCEPTANCE CRITERIA CHECKLIST

For implementation verification:
- [ ] Schema migrations successful (`npx convex dev` no errors)
- [ ] `recurringSlotTemplates` table accessible via `ctx.db`
- [ ] `availableSlots.templateId` field initialized on new inserts
- [ ] All 6 date validation functions throw proper `ConvexError` with codes
- [ ] `calculateDatesForDays()` handles month boundaries correctly
- [ ] Conflict detection correctly identifies time overlaps
- [ ] `createRecurringSlots()` returns proper response with counts
- [ ] `previewRecurringSlots()` returns accurate previews without modifying DB
- [ ] `deleteTemplateSlots()` respects all 3 delete modes
- [ ] Slots created via `createRecurringSlots()` link to template via `templateId`
- [ ] Audit logs recorded for all recurring slot operations
- [ ] TypeScript types exported from `src/types/doctor.ts`
- [ ] All mutations require `requireDoctorAccess()` authentication
- [ ] Error responses follow Convex pattern (code + message)

---

## 13. RELATED FILES NOT MODIFIED

These files provide context but don't need modification:

| File | Purpose | Why Keep |
|------|---------|----------|
| `convex/appointments.ts` | Booking flow | Shows how bookings consume slots |
| `convex/appointmentTypes.ts` | Duration/pricing | May need integration for slot duration |
| `convex/doctorSettings.ts` | Doctor profile | Doctor lookup already works via auth |
| `convex/patients.ts` | Patient data | Recurring slots independent of patients |
| `src/types/index.ts` | Type exports | May re-export new scheduling types |

---

## 14. TESTING CONSIDERATIONS

### Unit Tests Needed
- Date calculation: boundary conditions, weekday filtering
- Validation: invalid formats, empty arrays, date ordering
- Conflict detection: overlapping times, same date, adjacent times

### Integration Tests Needed
- Full create flow: preview → create → verify DB
- Conflict handling: test all 3 resolution strategies
- Deletion: verify slots deleted, template archived
- Audit: verify logs recorded with correct actor/action

### Manual Testing (BROWSER-CLI)
- Doctor: Create template via UI
- Doctor: View preview of generated slots
- Doctor: Create recurring slots, verify calendar
- Doctor: Delete template in "future_only" mode
- Doctor: Block slots created from template

---

## 15. PERFORMANCE NOTES

### Query Efficiency
- **by_doctor_date index**: Enables fast range queries for conflict detection
- **by_template index**: Required for efficient template-based deletion
- **Batch insert**: Loop OK for < 1000 slots, but consider Promise.all() for larger batches

### Mutation Load
- **Date calculation**: O(days × timesPerDay) - acceptable for reasonable ranges
- **Conflict detection**: O(proposed × existing) - optimize if > 10K slots in range
- **Batch insert**: Sequential loops are safe; Promise.all() would exceed Convex action limits for large batches

### Recommended Limits
- Max template range: 1 year (365 days)
- Max time slots per template: 50
- Max recurring creation: 365 × 50 = 18,250 slots per call

---

END OF DISCOVERY REPORT
