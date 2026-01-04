import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";

// ---------------------------------------------------------------------------
// Admin Users (WorkOS AuthKit)
// ---------------------------------------------------------------------------
// Internal mutations for managing admin users authenticated via WorkOS
// ---------------------------------------------------------------------------

export const upsertAdminUser = internalMutation({
  args: {
    workosUserId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    profilePictureUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("adminUsers")
      .withIndex("by_workos_user_id", (q) => q.eq("workosUserId", args.workosUserId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        profilePictureUrl: args.profilePictureUrl,
        lastLoginAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("adminUsers", {
      workosUserId: args.workosUserId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      profilePictureUrl: args.profilePictureUrl,
      lastLoginAt: now,
      createdAt: now,
    });
  },
});

// Internal query for auth routing
export const getByWorkosId = internalQuery({
  args: { workosUserId: v.string() },
  handler: async (ctx, { workosUserId }) => {
    return ctx.db
      .query("adminUsers")
      .withIndex("by_workos_user_id", (q) => q.eq("workosUserId", workosUserId))
      .first();
  },
});

export const getByWorkosUserId = internalQuery({
  args: { workosUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("adminUsers")
      .withIndex("by_workos_user_id", (q) => q.eq("workosUserId", args.workosUserId))
      .first();
  },
});

export const getByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("adminUsers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Public query that verifies admin status using authenticated identity
// This prevents admin enumeration - caller can only check their own admin status
export const verifyAdmin = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null; // Not authenticated
    }

    // Get admin by the identity's subject (which is the WorkOS user ID)
    const admin = await ctx.db
      .query("adminUsers")
      .withIndex("by_workos_user_id", (q) =>
        q.eq("workosUserId", identity.subject)
      )
      .first();

    return admin;
  },
});
