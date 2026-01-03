import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// ---------------------------------------------------------------------------
// Appointment Types Management
// ---------------------------------------------------------------------------
// Manages appointment type catalog for booking
// ---------------------------------------------------------------------------

// List active appointment types
export const listActive = query({
  args: {},
  handler: async (ctx): Promise<Doc<"appointmentTypes">[]> => {
    return ctx.db
      .query("appointmentTypes")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

// List all appointment types (admin)
export const listAll = query({
  args: {},
  handler: async (ctx): Promise<Doc<"appointmentTypes">[]> => {
    return ctx.db.query("appointmentTypes").collect();
  },
});

// Get by ID
export const getById = query({
  args: { typeId: v.id("appointmentTypes") },
  handler: async (ctx, { typeId }) => {
    return ctx.db.get(typeId);
  },
});

// Create appointment type (admin)
export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    durationMinutes: v.number(),
    price: v.number(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("appointmentTypes", {
      ...args,
      isActive: true,
    });
  },
});

// Update appointment type (admin)
export const update = mutation({
  args: {
    typeId: v.id("appointmentTypes"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
    price: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { typeId, ...updates }) => {
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(typeId, filteredUpdates);
  },
});
