import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireDoctorAccess } from "./authModules/authorization";

// ---------------------------------------------------------------------------
// Available Slots Management
// ---------------------------------------------------------------------------
// Schedule management for doctor appointment slots
// ---------------------------------------------------------------------------

// Get available slots by date range
/**
 * Get all time slots within a date range.
 *
 * Used by Schedule page to display slots for selected dates.
 *
 * @auth public - No authentication required
 * @param ctx - Convex query context
 * @param args.startDate - Start date in YYYY-MM-DD format
 * @param args.endDate - End date in YYYY-MM-DD format
 * @returns Array of slot documents within the date range
 */
import {
  isValidDateFormat,
  validateTimeRange,
  validateDateRange,
  validateDaysOfWeek,
  validateTimeSlots,
  calculateDatesForDays,
  doTimeSlotsOverlap,
} from "./lib/dateUtils";
import { logSlotAction } from "./helpers/auditLogger";

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

// Get available slots for booking (status = available)
/**
 * Get only available slots for a specific date.
 *
 * Used by booking flow to show bookable time slots.
 *
 * @auth public - No authentication required
 * @param ctx - Convex query context
 * @param args.date - Date in YYYY-MM-DD format
 * @returns Array of available slot documents for the date
 */
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

// Get slots by month for calendar
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

// Doctor: create multiple slots
/**
 * Create new time slots for appointments.
 *
 * Allows doctors to add available time slots to their schedule.
 * Slots are created with 'available' status.
 *
 * @auth doctor - Requires doctor authentication
 * @param ctx - Convex mutation context
 * @param args.slots - Array of slot objects with date, startTime, endTime
 * @returns Array of newly created slot document IDs
 */
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
    const doctor = await requireDoctorAccess(ctx);

    // Validate array size limit
    if (slots.length > 100) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "Cannot create more than 100 slots at once.",
      });
    }

    // Validate each slot before inserting
    for (const slot of slots) {
      if (!isValidDateFormat(slot.date)) {
        throw new ConvexError({
          code: "VALIDATION_ERROR" as const,
          message: `Invalid date format: ${slot.date}. Expected YYYY-MM-DD.`,
        });
      }
      validateTimeRange(slot.startTime, slot.endTime);
    }

    const ids = [];
    for (const slot of slots) {
      const id = await ctx.db.insert("availableSlots", {
        doctorId: doctor._id,
        ...slot,
        status: "available",
      });
      ids.push(id);

      // Log each slot creation
      await logSlotAction(ctx, "slot_created", id, doctor._id, {
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
    }
    return ids;
  },
});;

// Doctor: block slot
/**
 * Block an available time slot.
 *
 * Prevents bookings on the slot (e.g., for vacation, admin time).
 * Only the doctor who owns the slot can block it.
 *
 * @auth doctor - Requires doctor authentication
 * @throws {ConvexError} NOT_FOUND - Slot not found
 * @throws {ConvexError} UNAUTHORIZED - Cannot modify another doctor's slot
 * @throws {ConvexError} INVALID_STATE - Slot not available to block
 * @param ctx - Convex mutation context
 * @param args.slotId - The slot document ID to block
 */
export const blockSlot = mutation({
  args: { slotId: v.id("availableSlots") },
  handler: async (ctx, { slotId }) => {
    const doctor = await requireDoctorAccess(ctx);

    const slot = await ctx.db.get(slotId);
    if (!slot) {
      throw new ConvexError({ code: "NOT_FOUND" as const, message: "Slot not found" });
    }

    if (slot.doctorId !== doctor._id) {
      throw new ConvexError({ code: "UNAUTHORIZED" as const, message: "Cannot modify another doctor's slot" });
    }

    if (slot.status !== "available") {
      throw new ConvexError({ code: "INVALID_STATE" as const, message: "Slot not available to block" });
    }

    await ctx.db.patch(slotId, { status: "blocked" });

    // Audit log the block action
    await logSlotAction(ctx, "slot_blocked", slotId, doctor._id, {
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
  },
});;;

// Doctor: unblock slot
/**
 * Unblock a blocked time slot.
 *
 * Makes the slot available for booking again.
 * Only the doctor who owns the slot can unblock it.
 *
 * @auth doctor - Requires doctor authentication
 * @throws {ConvexError} NOT_FOUND - Slot not found
 * @throws {ConvexError} UNAUTHORIZED - Cannot modify another doctor's slot
 * @throws {ConvexError} INVALID_STATE - Slot is not blocked
 * @param ctx - Convex mutation context
 * @param args.slotId - The slot document ID to unblock
 */
export const unblockSlot = mutation({
  args: { slotId: v.id("availableSlots") },
  handler: async (ctx, { slotId }) => {
    const doctor = await requireDoctorAccess(ctx);

    const slot = await ctx.db.get(slotId);
    if (!slot) {
      throw new ConvexError({ code: "NOT_FOUND" as const, message: "Slot not found" });
    }

    if (slot.doctorId !== doctor._id) {
      throw new ConvexError({ code: "UNAUTHORIZED" as const, message: "Cannot modify another doctor's slot" });
    }

    if (slot.status !== "blocked") {
      throw new ConvexError({ code: "INVALID_STATE" as const, message: "Slot is not blocked" });
    }

    await ctx.db.patch(slotId, { status: "available" });

    // Audit log the unblock action
    await logSlotAction(ctx, "slot_unblocked", slotId, doctor._id, {
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
  },
});

// ---------------------------------------------------------------------------
// Recurring Slots Management
// ---------------------------------------------------------------------------

// Types for recurring slots
interface ProposedSlot {
  date: string;
  startTime: string;
  endTime: string;
}

interface SlotConflict {
  date: string;
  startTime: string;
  reason: "booked" | "blocked" | "available";
  existingSlotId: string;
}

/**
 * Preview recurring slots before creation.
 * Shows proposed slots and detects conflicts without making changes.
 *
 * @auth doctor - Requires doctor authentication
 */
export const previewRecurringSlots = query({
  args: {
    daysOfWeek: v.array(v.number()),
    timeSlots: v.array(
      v.object({
        startTime: v.string(),
        endTime: v.string(),
      })
    ),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const doctor = await requireDoctorAccess(ctx);

    // Validate inputs
    validateDaysOfWeek(args.daysOfWeek);
    validateDateRange(args.startDate, args.endDate);
    validateTimeSlots(args.timeSlots);

    // Calculate target dates
    const targetDates = calculateDatesForDays(
      args.startDate,
      args.endDate,
      args.daysOfWeek
    );

    // Generate proposed slots
    const proposedSlots: ProposedSlot[] = [];
    for (const date of targetDates) {
      for (const slot of args.timeSlots) {
        proposedSlots.push({ date, ...slot });
      }
    }

    // Get existing slots in date range
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
    const conflicts: SlotConflict[] = [];
    for (const proposed of proposedSlots) {
      const conflict = existingSlots.find(
        (existing) =>
          existing.date === proposed.date &&
          doTimeSlotsOverlap(proposed, existing)
      );
      if (conflict) {
        conflicts.push({
          date: proposed.date,
          startTime: proposed.startTime,
          reason: conflict.status as "booked" | "blocked" | "available",
          existingSlotId: conflict._id,
        });
      }
    }

    // Group proposed slots by date
    const proposedByDate: Record<string, Array<{ startTime: string; endTime: string }>> = {};
    for (const slot of proposedSlots) {
      if (!proposedByDate[slot.date]) {
        proposedByDate[slot.date] = [];
      }
      proposedByDate[slot.date].push({
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
    }

    return {
      totalSlots: proposedSlots.length,
      proposedSlots: proposedByDate,
      conflicts,
      summary: {
        daysCount: targetDates.length,
        slotsPerDay: args.timeSlots.length,
        conflictsCount: conflicts.length,
      },
    };
  },
});

/**
 * Create recurring slots based on a weekly pattern.
 *
 * Creates a template record and generates individual slots for each
 * matching day within the date range.
 *
 * @auth doctor - Requires doctor authentication
 */
export const createRecurringSlots = mutation({
  args: {
    templateName: v.optional(v.string()),
    daysOfWeek: v.array(v.number()),
    timeSlots: v.array(
      v.object({
        startTime: v.string(),
        endTime: v.string(),
      })
    ),
    startDate: v.string(),
    endDate: v.string(),
    conflictResolution: v.union(
      v.literal("skip"),
      v.literal("overwrite_available"),
      v.literal("fail_on_conflict")
    ),
  },
  handler: async (ctx, args) => {
    const doctor = await requireDoctorAccess(ctx);

    // Validate inputs
    validateDaysOfWeek(args.daysOfWeek);
    validateDateRange(args.startDate, args.endDate);
    validateTimeSlots(args.timeSlots);

    // Calculate target dates
    const targetDates = calculateDatesForDays(
      args.startDate,
      args.endDate,
      args.daysOfWeek
    );

    // Generate proposed slots
    const proposedSlots: ProposedSlot[] = [];
    for (const date of targetDates) {
      for (const slot of args.timeSlots) {
        proposedSlots.push({ date, ...slot });
      }
    }

    // Get existing slots in date range
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

    // Resolve conflicts
    const toCreate: ProposedSlot[] = [];
    const conflicts: SlotConflict[] = [];
    const skipped: ProposedSlot[] = [];
    const toOverwrite: string[] = [];

    for (const proposed of proposedSlots) {
      const conflict = existingSlots.find(
        (existing) =>
          existing.date === proposed.date &&
          doTimeSlotsOverlap(proposed, existing)
      );

      if (!conflict) {
        toCreate.push(proposed);
      } else {
        const conflictInfo: SlotConflict = {
          date: proposed.date,
          startTime: proposed.startTime,
          reason: conflict.status as "booked" | "blocked" | "available",
          existingSlotId: conflict._id,
        };

        if (conflict.status === "booked" || conflict.status === "blocked") {
          // Cannot overwrite booked or blocked slots
          conflicts.push(conflictInfo);
          skipped.push(proposed);
        } else if (args.conflictResolution === "skip") {
          skipped.push(proposed);
        } else if (args.conflictResolution === "overwrite_available") {
          toOverwrite.push(conflict._id);
          toCreate.push(proposed);
        } else {
          // fail_on_conflict
          conflicts.push(conflictInfo);
        }
      }
    }

    // Fail if requested and conflicts exist
    if (args.conflictResolution === "fail_on_conflict" && conflicts.length > 0) {
      throw new ConvexError({
        code: "CONFLICT_DETECTED" as const,
        message: `${conflicts.length} conflict(s) detected. Cannot create slots.`,
        conflicts: conflicts.map((c) => ({
          date: c.date,
          time: c.startTime,
          reason: c.reason,
        })),
      });
    }

    // Create template record
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

    // Delete slots to be overwritten
    for (const slotId of toOverwrite) {
      await ctx.db.delete(slotId as any);
    }

    // Batch insert new slots
    const createdIds = [];
    for (const slot of toCreate) {
      const id = await ctx.db.insert("availableSlots", {
        doctorId: doctor._id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: "available",
        templateId,
      });
      createdIds.push(id);
    }

    // Audit log
    await logSlotAction(ctx, "recurring_slots_created", templateId, doctor._id, {
      templateName: args.templateName,
      daysOfWeek: args.daysOfWeek,
      startDate: args.startDate,
      endDate: args.endDate,
      created: createdIds.length,
      skipped: skipped.length,
      conflicts: conflicts.length,
    });

    return {
      templateId,
      created: createdIds.length,
      skipped: skipped.length,
      conflicts: conflicts.length,
      conflictDetails: conflicts,
    };
  },
});

/**
 * Delete slots created from a template.
 *
 * Supports different deletion modes:
 * - future_only: Only delete slots with date >= today
 * - all_available: Delete all available slots (skip booked)
 * - all: Delete everything (warning: loses bookings)
 *
 * @auth doctor - Requires doctor authentication
 */
export const deleteTemplateSlots = mutation({
  args: {
    templateId: v.id("recurringSlotTemplates"),
    deleteMode: v.union(
      v.literal("future_only"),
      v.literal("all_available"),
      v.literal("all")
    ),
  },
  handler: async (ctx, args) => {
    const doctor = await requireDoctorAccess(ctx);

    // Verify template ownership
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Template not found.",
      });
    }
    if (template.doctorId !== doctor._id) {
      throw new ConvexError({
        code: "UNAUTHORIZED" as const,
        message: "Cannot modify another doctor's template.",
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
      // Skip past slots if future_only
      if (args.deleteMode === "future_only" && slot.date < today) {
        continue;
      }

      // Skip booked/blocked if not "all" mode
      if (args.deleteMode !== "all" && slot.status !== "available") {
        skippedBooked++;
        continue;
      }

      await ctx.db.delete(slot._id);
      deleted++;
    }

    // Archive template if all slots deleted
    const remainingSlots = await ctx.db
      .query("availableSlots")
      .withIndex("by_template", (q) => q.eq("templateId", args.templateId))
      .first();

    if (!remainingSlots) {
      await ctx.db.patch(args.templateId, { status: "archived" });
    }

    // Audit log
    await logSlotAction(ctx, "template_slots_deleted", args.templateId, doctor._id, {
      deleteMode: args.deleteMode,
      deleted,
      skippedBooked,
    });

    return { deleted, skippedBooked };
  },
});

/**
 * Get recurring slot templates for the current doctor.
 *
 * @auth doctor - Requires doctor authentication
 */
export const getTemplates = query({
  args: {
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
  },
  handler: async (ctx, args) => {
    const doctor = await requireDoctorAccess(ctx);

    // Query templates
    let templatesQuery;
    if (args.status) {
      templatesQuery = ctx.db
        .query("recurringSlotTemplates")
        .withIndex("by_doctor_status", (q) =>
          q.eq("doctorId", doctor._id).eq("status", args.status!)
        );
    } else {
      templatesQuery = ctx.db
        .query("recurringSlotTemplates")
        .withIndex("by_doctor", (q) => q.eq("doctorId", doctor._id));
    }

    const templates = await templatesQuery.collect();

    // Get slot counts for each template
    const templatesWithCounts = await Promise.all(
      templates.map(async (template) => {
        const slots = await ctx.db
          .query("availableSlots")
          .withIndex("by_template", (q) => q.eq("templateId", template._id))
          .collect();

        const availableCount = slots.filter((s) => s.status === "available").length;
        const bookedCount = slots.filter((s) => s.status === "booked").length;
        const blockedCount = slots.filter((s) => s.status === "blocked").length;

        return {
          ...template,
          slotCounts: {
            total: slots.length,
            available: availableCount,
            booked: bookedCount,
            blocked: blockedCount,
          },
        };
      })
    );

    return templatesWithCounts;
  },
});
