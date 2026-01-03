import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";

// ---------------------------------------------------------------------------
// Doctor Settings CRUD Operations
// ---------------------------------------------------------------------------
// Manages doctor configuration including Zoom links
// ---------------------------------------------------------------------------

// Internal query for auth routing
export const getByWorkosId = internalQuery({
  args: { workosUserId: v.string() },
  handler: async (ctx, { workosUserId }) => {
    return ctx.db
      .query("doctorSettings")
      .withIndex("by_workos_user", (q) => q.eq("workosUserId", workosUserId))
      .first();
  },
});

// Public query by ID
export const getById = query({
  args: { doctorId: v.id("doctorSettings") },
  handler: async (ctx, { doctorId }) => {
    return ctx.db.get(doctorId);
  },
});


// Public query by WorkOS user ID (for client-side doctor lookup)
export const getByWorkosUserId = query({
  args: { workosUserId: v.string() },
  handler: async (ctx, { workosUserId }) => {
    return ctx.db
      .query("doctorSettings")
      .withIndex("by_workos_user", (q) => q.eq("workosUserId", workosUserId))
      .first();
  },
});

// Create doctor settings
export const create = mutation({
  args: {
    workosUserId: v.string(),
    email: v.string(),
    name: v.string(),
    zoomPersonalLink: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("doctorSettings", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Update doctor settings
export const update = mutation({
  args: {
    doctorId: v.id("doctorSettings"),
    name: v.optional(v.string()),
    zoomPersonalLink: v.optional(v.string()),
  },
  handler: async (ctx, { doctorId, ...updates }) => {
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(doctorId, filteredUpdates);
  },
});
