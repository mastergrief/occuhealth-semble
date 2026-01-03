import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/**
 * Create a new OAuth state for CSRF protection
 * Called when user initiates login flow
 */
export const create = internalMutation({
  args: {
    state: v.string(),
    expiresAt: v.number()
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("oauthStates", args);
  },
});

/**
 * Validate an OAuth state token
 * Returns the record if valid and not expired, null otherwise
 */
export const validate = internalQuery({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("oauthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();

    if (!record || record.expiresAt < Date.now()) {
      return null;
    }
    return record;
  },
});

/**
 * Delete a used OAuth state to prevent replay attacks
 * Called after successful state validation
 */
export const deleteState = internalMutation({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("oauthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();

    if (record) {
      await ctx.db.delete(record._id);
    }
  },
});
