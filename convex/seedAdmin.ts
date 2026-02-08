import { v } from "convex/values";
import { mutation } from "./_generated/server";

// ---------------------------------------------------------------------------
// Admin Seed Mutation
// ---------------------------------------------------------------------------
// Public mutation for seeding admin users during development/testing.
// Idempotent: upserts by workosUserId.
// ---------------------------------------------------------------------------

export const seedAdmin = mutation({
  args: {
    workosUserId: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("adminUsers")
      .withIndex("by_workos_user_id", (q) =>
        q.eq("workosUserId", args.workosUserId)
      )
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        lastLoginAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("adminUsers", {
      workosUserId: args.workosUserId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      lastLoginAt: now,
      createdAt: now,
    });
  },
});

export const deleteEmployer = mutation({
  args: {
    id: v.id("employers"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
