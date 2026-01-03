import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ---------------------------------------------------------------------------
// Available Slots Management
// ---------------------------------------------------------------------------
// Schedule management for doctor appointment slots
// ---------------------------------------------------------------------------

// Get available slots by date range
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
    const ids = [];
    for (const slot of slots) {
      const id = await ctx.db.insert("availableSlots", {
        ...slot,
        status: "available",
      });
      ids.push(id);
    }
    return ids;
  },
});

// Doctor: block slot
export const blockSlot = mutation({
  args: { slotId: v.id("availableSlots") },
  handler: async (ctx, { slotId }) => {
    const slot = await ctx.db.get(slotId);
    if (!slot || slot.status !== "available") {
      throw new Error("Slot not available to block");
    }
    await ctx.db.patch(slotId, { status: "blocked" });
  },
});

// Doctor: unblock slot
export const unblockSlot = mutation({
  args: { slotId: v.id("availableSlots") },
  handler: async (ctx, { slotId }) => {
    const slot = await ctx.db.get(slotId);
    if (!slot || slot.status !== "blocked") {
      throw new Error("Slot is not blocked");
    }
    await ctx.db.patch(slotId, { status: "available" });
  },
});
