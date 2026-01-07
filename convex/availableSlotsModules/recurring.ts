// convex/availableSlotsModules/recurring.ts
/**
 * Recurring Slots Module
 * Handles weekly recurring slot templates for doctor schedules
 */

import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireDoctorAccess } from "../authModules/authorization";
import {
  validateDateRange,
  validateDaysOfWeek,
  validateTimeSlots,
  calculateDatesForDays,
  doTimeSlotsOverlap,
} from "../lib/dateUtils";
import { logSlotAction } from "../helpers/auditLogger";
import type { ProposedSlot, SlotConflict } from "./types";

/**
 * Preview recurring slots before creating them.
 *
 * Shows what slots would be created and detects conflicts.
 *
 * @auth doctor - Requires doctor authentication
 * @param ctx - Convex query context
 * @param args.daysOfWeek - Array of day numbers (0=Sunday, 6=Saturday)
 * @param args.timeSlots - Array of {startTime, endTime} objects
 * @param args.startDate - Start date in YYYY-MM-DD format
 * @param args.endDate - End date in YYYY-MM-DD format
 * @returns Preview with proposed slots, conflicts, and summary
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
 * Create recurring slots based on weekly schedule.
 *
 * Creates slots for specified days of week within date range.
 *
 * @auth doctor - Requires doctor authentication
 * @param ctx - Convex mutation context
 * @param args.templateName - Optional name for the template
 * @param args.daysOfWeek - Array of day numbers (0=Sunday, 6=Saturday)
 * @param args.timeSlots - Array of {startTime, endTime} objects
 * @param args.startDate - Start date in YYYY-MM-DD format
 * @param args.endDate - End date in YYYY-MM-DD format
 * @param args.conflictResolution - How to handle conflicts: skip, overwrite_available, fail_on_conflict
 * @returns Created template ID and statistics
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
 * Delete slots created from a recurring template.
 *
 * Provides flexible deletion modes for managing templates.
 *
 * @auth doctor - Requires doctor authentication
 * @param ctx - Convex mutation context
 * @param args.templateId - ID of the recurring template
 * @param args.deleteMode - Delete mode: future_only, all_available, all
 * @returns Number of deleted and skipped slots
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
