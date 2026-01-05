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
  },
});;

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
  },
});;
