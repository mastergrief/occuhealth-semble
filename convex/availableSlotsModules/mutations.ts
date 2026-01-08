// convex/availableSlotsModules/mutations.ts

import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { mutation } from "../_generated/server";
import { requireDoctorAccess } from "../authModules/authorization";
import { isValidDateFormat, validateTimeRange } from "../lib/dateUtils";
import { logSlotAction } from "../helpers/auditLogger";
import { ErrorCodes } from "../lib/errorCodes";

/**
 * Create multiple time slots for the authenticated doctor.
 *
 * @auth doctor - Must be authenticated as a doctor
 * @param ctx - Convex mutation context
 * @param args.slots - Array of slot definitions with date, startTime, endTime
 * @returns Array of created slot IDs
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
});

/**
 * Block an available slot to prevent bookings.
 *
 * @auth doctor - Must be authenticated as the slot's doctor
 * @param ctx - Convex mutation context
 * @param args.slotId - ID of the slot to block
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
      throw new ConvexError({ code: ErrorCodes.INVALID_STATE, message: "Slot not available to block" });
    }

    await ctx.db.patch(slotId, { status: "blocked" });

    // Audit log the block action
    await logSlotAction(ctx, "slot_blocked", slotId, doctor._id, {
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
  },
});

/**
 * Unblock a blocked slot to make it available for bookings.
 *
 * @auth doctor - Must be authenticated as the slot's doctor
 * @param ctx - Convex mutation context
 * @param args.slotId - ID of the slot to unblock
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
      throw new ConvexError({ code: ErrorCodes.INVALID_STATE, message: "Slot is not blocked" });
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
