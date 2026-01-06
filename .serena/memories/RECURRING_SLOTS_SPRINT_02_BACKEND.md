# Backend Schema & Mutations
**Sprint**: 02 of 06
**Index**: RECURRING_SLOTS_INDEX
**Depends On**: RECURRING_SLOTS_SPRINT_01_ARCHITECTURE
**Next**: RECURRING_SLOTS_SPRINT_03_FRONTEND

---

## Schema Changes

### File: `convex/schema.ts`

#### Add New Table: recurringSlotTemplates (after line 132)

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

#### Modify Existing Table: availableSlots (line ~126)

```typescript
// ADD after appointmentId field:
templateId: v.optional(v.id("recurringSlotTemplates")),

// ADD after existing indexes (line ~132):
.index("by_template", ["templateId"])
```

---

## New Mutations

### File: `convex/availableSlots.ts`

#### 1. createRecurringSlots Mutation

```typescript
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireDoctorAccess } from "./authModules/authorization";
import { logAction } from "./auditLogger"; // If exists

// Add after existing mutations (~line 187)

export const createRecurringSlots = mutation({
  args: {
    templateName: v.optional(v.string()),
    daysOfWeek: v.array(v.number()),      // [1,2,3,4,5] = Mon-Fri
    timeSlots: v.array(v.object({
      startTime: v.string(),
      endTime: v.string(),
    })),
    startDate: v.string(),                // "2026-01-06"
    endDate: v.string(),                  // "2026-01-31"
    conflictResolution: v.union(
      v.literal("skip"),
      v.literal("overwrite_available"),
      v.literal("fail_on_conflict"),
    ),
  },
  handler: async (ctx, args) => {
    const doctor = await requireDoctorAccess(ctx);
    
    // 1. Validate inputs
    validateDaysOfWeek(args.daysOfWeek);
    validateDateRange(args.startDate, args.endDate);
    validateTimeSlots(args.timeSlots);
    
    // 2. Calculate target dates
    const targetDates = calculateDatesForDays(
      args.startDate,
      args.endDate,
      args.daysOfWeek
    );
    
    // 3. Generate proposed slots
    const proposedSlots: ProposedSlot[] = [];
    for (const date of targetDates) {
      for (const slot of args.timeSlots) {
        proposedSlots.push({ date, ...slot });
      }
    }
    
    // 4. Check conflicts
    const existingSlots = await ctx.db
      .query("availableSlots")
      .withIndex("by_doctor_date")
      .filter((q) =>
        q.and(
          q.eq(q.field("doctorId"), doctor._id),
          q.gte(q.field("date"), args.startDate),
          q.lte(q.field("date"), args.endDate)
        )
      )
      .collect();
    
    const { toCreate, conflicts, skipped } = resolveConflicts(
      proposedSlots,
      existingSlots,
      args.conflictResolution
    );
    
    // 5. Fail if requested and conflicts exist
    if (args.conflictResolution === "fail_on_conflict" && conflicts.length > 0) {
      throw new ConvexError({
        code: "CONFLICT_DETECTED" as const,
        message: `${conflicts.length} conflicts detected`,
        conflicts: conflicts.map(c => ({
          date: c.date,
          time: c.startTime,
          reason: c.reason
        })),
      });
    }
    
    // 6. Create template record
    const templateId = await ctx.db.insert("recurringSlotTemplates", {
      doctorId: doctor._id,
      name: args.templateName,
      daysOfWeek: args.daysOfWeek,
      timeSlots: args.timeSlots,
      startDate: args.startDate,
      endDate: args.endDate,
      createdAt: Date.now(),
      status: "active",
    });
    
    // 7. Batch insert slots
    const createdIds = await Promise.all(
      toCreate.map(slot =>
        ctx.db.insert("availableSlots", {
          doctorId: doctor._id,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: "available",
          templateId,
        })
      )
    );
    
    // 8. Audit log (GDPR compliance)
    // await logAction(ctx, "recurring_slots_created", { templateId, count: createdIds.length });
    
    return {
      templateId,
      created: createdIds.length,
      skipped: skipped.length,
      conflicts: conflicts.length,
      conflictDetails: conflicts,
    };
  },
});
```

#### 2. previewRecurringSlots Query

```typescript
export const previewRecurringSlots = query({
  args: {
    daysOfWeek: v.array(v.number()),
    timeSlots: v.array(v.object({
      startTime: v.string(),
      endTime: v.string(),
    })),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const doctor = await requireDoctorAccess(ctx);
    
    // Calculate proposed slots
    const targetDates = calculateDatesForDays(
      args.startDate,
      args.endDate,
      args.daysOfWeek
    );
    
    const proposedSlots: ProposedSlot[] = [];
    for (const date of targetDates) {
      for (const slot of args.timeSlots) {
        proposedSlots.push({ date, ...slot });
      }
    }
    
    // Get existing slots
    const existingSlots = await ctx.db
      .query("availableSlots")
      .withIndex("by_doctor_date")
      .filter((q) =>
        q.and(
          q.eq(q.field("doctorId"), doctor._id),
          q.gte(q.field("date"), args.startDate),
          q.lte(q.field("date"), args.endDate)
        )
      )
      .collect();
    
    // Detect conflicts
    const conflicts = detectConflicts(proposedSlots, existingSlots);
    
    return {
      totalSlots: proposedSlots.length,
      proposedSlots: groupByDate(proposedSlots),
      conflicts,
      summary: {
        daysCount: targetDates.length,
        slotsPerDay: args.timeSlots.length,
        conflictsCount: conflicts.length,
      },
    };
  },
});
```

#### 3. deleteTemplateSlots Mutation

```typescript
export const deleteTemplateSlots = mutation({
  args: {
    templateId: v.id("recurringSlotTemplates"),
    deleteMode: v.union(
      v.literal("future_only"),
      v.literal("all_available"),
      v.literal("all"),
    ),
  },
  handler: async (ctx, args) => {
    const doctor = await requireDoctorAccess(ctx);
    
    // Verify ownership
    const template = await ctx.db.get(args.templateId);
    if (!template || template.doctorId !== doctor._id) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Template not found",
      });
    }
    
    // Get slots by template
    const slots = await ctx.db
      .query("availableSlots")
      .withIndex("by_template", (q) => q.eq("templateId", args.templateId))
      .collect();
    
    const today = new Date().toISOString().split("T")[0];
    let deleted = 0;
    let skippedBooked = 0;
    
    for (const slot of slots) {
      if (args.deleteMode === "future_only" && slot.date < today) continue;
      if (args.deleteMode === "all_available" && slot.status !== "available") {
        skippedBooked++;
        continue;
      }
      if (slot.status === "booked" && args.deleteMode !== "all") {
        skippedBooked++;
        continue;
      }
      
      await ctx.db.delete(slot._id);
      deleted++;
    }
    
    // Archive template if all deleted
    if (deleted === slots.length) {
      await ctx.db.patch(args.templateId, { status: "archived" });
    }
    
    return { deleted, skippedBooked };
  },
});
```

---

## Helper Functions

### File: `convex/lib/dateUtils.ts` (NEW)

```typescript
/**
 * Calculate dates for specified weekdays within a range
 * @param startDate "2026-01-06"
 * @param endDate "2026-01-31"
 * @param daysOfWeek [1,2,3,4,5] ISO weekdays (Mon=1, Sun=7)
 */
export function calculateDatesForDays(
  startDate: string,
  endDate: string,
  daysOfWeek: number[]
): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    // Convert JS Sunday=0 to ISO Sunday=7
    const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
    if (daysOfWeek.includes(dayOfWeek)) {
      dates.push(d.toISOString().split("T")[0]);
    }
  }
  
  return dates;
}

/**
 * Check if two time slots overlap
 */
export function doTimeSlotsOverlap(
  a: { startTime: string; endTime: string },
  b: { startTime: string; endTime: string }
): boolean {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

/**
 * Validate date format YYYY-MM-DD
 */
export function isValidDateFormat(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

/**
 * Validate time format HH:MM
 */
export function isValidTimeFormat(time: string): boolean {
  return /^\d{2}:\d{2}$/.test(time);
}

/**
 * Validate days of week array
 */
export function validateDaysOfWeek(days: number[]): void {
  if (days.length === 0) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "At least one day must be selected",
    });
  }
  if (days.some(d => d < 1 || d > 7)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Invalid day of week (must be 1-7)",
    });
  }
}

/**
 * Validate date range
 */
export function validateDateRange(startDate: string, endDate: string): void {
  if (!isValidDateFormat(startDate) || !isValidDateFormat(endDate)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Invalid date format (use YYYY-MM-DD)",
    });
  }
  if (startDate > endDate) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Start date must be before end date",
    });
  }
}

/**
 * Validate time slots array
 */
export function validateTimeSlots(
  slots: Array<{ startTime: string; endTime: string }>
): void {
  if (slots.length === 0) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "At least one time slot required",
    });
  }
  if (slots.length > 50) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Maximum 50 time slots per template",
    });
  }
  for (const slot of slots) {
    if (!isValidTimeFormat(slot.startTime) || !isValidTimeFormat(slot.endTime)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "Invalid time format (use HH:MM)",
      });
    }
    if (slot.startTime >= slot.endTime) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "End time must be after start time",
      });
    }
  }
}
```

---

## Types

### File: `src/types/scheduling.ts` (NEW)

```typescript
import { Id } from "../convex/_generated/dataModel";

export interface RecurringSlotConfig {
  templateName?: string;
  daysOfWeek: number[];           // ISO weekdays: 1=Mon, 7=Sun
  timeSlots: TimeSlotTemplate[];
  startDate: string;              // YYYY-MM-DD
  endDate: string;                // YYYY-MM-DD
  conflictResolution: ConflictResolution;
}

export interface TimeSlotTemplate {
  startTime: string;              // HH:MM
  endTime: string;                // HH:MM
}

export type ConflictResolution = 
  | "skip" 
  | "overwrite_available" 
  | "fail_on_conflict";

export interface SlotConflict {
  date: string;
  startTime: string;
  reason: "booked" | "blocked" | "available";
  existingSlotId: Id<"availableSlots">;
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

export interface CreateRecurringResult {
  templateId: Id<"recurringSlotTemplates">;
  created: number;
  skipped: number;
  conflicts: number;
  conflictDetails: SlotConflict[];
}
```

---

## Acceptance Criteria

- [ ] Schema migration successful (`npx convex dev` no errors)
- [ ] `createRecurringSlots` creates template + slots
- [ ] `previewRecurringSlots` returns accurate conflict detection
- [ ] `deleteTemplateSlots` respects delete modes
- [ ] Validation throws ConvexError with proper codes
- [ ] Date calculation handles month boundaries correctly
- [ ] Slots link to template via `templateId`
- [ ] TypeScript types exported and usable in frontend

---

→ Next: **RECURRING_SLOTS_SPRINT_03_FRONTEND** (UI Components)
