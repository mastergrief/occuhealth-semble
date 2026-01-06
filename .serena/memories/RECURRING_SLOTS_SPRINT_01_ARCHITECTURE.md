# Executive Summary & Architecture
**Sprint**: 01 of 06
**Index**: RECURRING_SLOTS_INDEX
**Depends On**: None
**Next**: RECURRING_SLOTS_SPRINT_05_SECURITY

---

## Feature Overview

### Current State
The Doctor Schedule page (`/doctor/schedule`) allows doctors to create **single time slots** for specific dates. Each slot requires manual entry of date, start time, and end time.

**Pain Point**: Doctors with consistent weekly schedules must create 35+ individual slots (5 days × 7 slots) manually.

### Proposed Enhancement
Weekly recurring slots that enable:
- Day-of-week selection (Mon-Sun toggleable checkboxes)
- Time slot templates (define once, apply to all selected days)
- Multi-week application (apply to N weeks ahead)
- Conflict detection with existing slots
- Preview before creation

### User Request
> "I want to be able to set recurring slots for an entire week i.e 7 days fully configurable"

---

## Current Architecture

### File Inventory

| File | Lines | Purpose |
|------|-------|---------|
| `src/pages/doctor/Schedule.tsx` | 143 | Main schedule page |
| `convex/availableSlots.ts` | 187 | Backend queries/mutations |
| `convex/schema.ts` | 120-132 | availableSlots table |
| `src/types/doctor.ts` | 158 | SlotStatus, TimeSlot types |
| `src/pages/DoctorLayout.tsx` | 160 | Portal layout + context |

### Data Flow

```
Doctor → Schedule.tsx → createSlots mutation → availableSlots.ts
→ requireDoctorAccess() → Insert with status="available"
```

### Schema (Current)

```typescript
availableSlots: defineTable({
  doctorId: v.id("doctorSettings"),
  date: v.string(),        // YYYY-MM-DD
  startTime: v.string(),   // HH:MM
  endTime: v.string(),     // HH:MM
  status: v.union(v.literal("available"), v.literal("booked"), v.literal("blocked")),
  appointmentId: v.optional(v.id("appointments")),
})
```

### Indexes
- `by_date` - Date range queries
- `by_status` - Status filtering (unused)
- `by_date_status` - getAvailable query
- `by_doctor` - Doctor filtering (unused)
- `by_doctor_date` - Doctor + date (unused)

---

## Proposed Architecture

### Schema Addition: recurringSlotTemplates

```typescript
recurringSlotTemplates: defineTable({
  doctorId: v.id("doctorSettings"),
  name: v.optional(v.string()),
  daysOfWeek: v.array(v.number()),     // [1,2,3,4,5] = Mon-Fri (ISO)
  timeSlots: v.array(v.object({
    startTime: v.string(),
    endTime: v.string(),
  })),
  startDate: v.string(),               // First application date
  endDate: v.string(),                 // Last application date
  createdAt: v.number(),
  status: v.union(v.literal("active"), v.literal("archived")),
})
  .index("by_doctor", ["doctorId"])
  .index("by_doctor_status", ["doctorId", "status"])
```

### Schema Modification: availableSlots

```typescript
// ADD to existing table
templateId: v.optional(v.id("recurringSlotTemplates")),

// ADD new index
.index("by_template", ["templateId"])
```

### New Backend Functions

| Function | Type | Purpose |
|----------|------|---------|
| `createRecurringSlots` | Mutation | Bulk create with template |
| `previewRecurringSlots` | Query | Calculate slots + conflicts |
| `deleteTemplateSlots` | Mutation | Bulk delete by template |
| `getTemplates` | Query | List doctor's templates |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  RECURRING SLOTS ARCHITECTURE                                   │
└─────────────────────────────────────────────────────────────────┘

FRONTEND
───────────────────────────────────────────────────────────────────
Schedule.tsx (enhanced)
├── RecurringSlotForm (NEW)
│   ├── DaySelector.tsx        - 7 toggleable days
│   ├── TimeSlotList.tsx       - Add/remove time slots
│   ├── QuickFillBar.tsx       - Auto-generate slots
│   ├── WeekRangeSelector.tsx  - Start/end dates
│   ├── SlotPreview.tsx        - Calculated slots list
│   └── ConflictResolution.tsx - Handle conflicts
│
└── WeekCalendarView (NEW)     - 7-day grid display

BACKEND
───────────────────────────────────────────────────────────────────
availableSlots.ts (enhanced)
├── createRecurringSlots()     - Main creation mutation
│   ├── validateTimeSlots()    - Format validation
│   ├── calculateDatesForDays() - Date generation
│   ├── resolveConflicts()     - Conflict handling
│   └── Insert template + slots
├── previewRecurringSlots()    - Preview query
└── deleteTemplateSlots()      - Bulk delete

DATABASE
───────────────────────────────────────────────────────────────────
┌─────────────────────┐     ┌─────────────────────┐
│ recurringSlot       │     │ availableSlots      │
│ Templates           │────►│ (modified)          │
│ - daysOfWeek        │     │ - templateId (new)  │
│ - timeSlots[]       │     │ - doctorId          │
│ - startDate/endDate │     │ - date, time, status│
└─────────────────────┘     └─────────────────────┘
```

---

## Implementation Phases

| Phase | Scope | Effort | Priority |
|-------|-------|--------|----------|
| **Phase 1** | Schema + Backend mutations | 2-3 hours | P0 |
| **Phase 2** | Basic recurring form UI | 3-4 hours | P0 |
| **Phase 3** | Conflict detection UX | 2-3 hours | P1 |
| **Phase 4** | Week calendar view | 3-4 hours | P2 |
| **Phase 5** | Template management | 2-3 hours | P2 |

**Total Estimated Effort**: 12-17 hours

---

## Key Design Decisions

### Why Separate Templates Table?
1. **Group Operations** - Edit/delete all Tuesday slots at once
2. **Reusability** - "Copy last week's schedule" becomes trivial
3. **Audit Trail** - Clear record of what created which slots
4. **Future-Proof** - Easy to add recurrence rules, exceptions

### Why Not Simple Bulk Insert?
- No way to manage recurring slots as a group
- Can't answer "which slots came from this pattern?"
- No cascade delete capability

### Conflict Resolution Options
- `skip` - Don't create conflicting slots
- `overwrite_available` - Replace "available" status slots
- `fail_on_conflict` - Abort if any conflict

---

## Success Criteria

1. Doctor can select Mon-Fri and create 8 slots per day in one action
2. Preview shows exactly what will be created
3. Conflicts with existing slots are detected and shown
4. Created slots link to template for group management
5. Week view shows 7 days of availability at once

---

→ Next: **RECURRING_SLOTS_SPRINT_05_SECURITY** (Critical pre-flight fixes)
