import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// ---------------------------------------------------------------------------
// Employers CRUD Operations
// ---------------------------------------------------------------------------
// Manages employer/insurer accounts with verification workflow
// ---------------------------------------------------------------------------

// Internal query for auth routing
export const getByWorkosId = internalQuery({
  args: { workosUserId: v.string() },
  handler: async (ctx, { workosUserId }) => {
    return ctx.db
      .query("employers")
      .withIndex("by_workos_user", (q) => q.eq("workosUserId", workosUserId))
      .first();
  },
});


// Public query by WorkOS user ID
export const getByWorkosIdPublic = query({
  args: { workosUserId: v.string() },
  handler: async (ctx, { workosUserId }) => {
    return ctx.db
      .query("employers")
      .withIndex("by_workos_user", (q) => q.eq("workosUserId", workosUserId))
      .first();
  },
});

// Public query by ID
export const getById = query({
  args: { employerId: v.id("employers") },
  handler: async (ctx, { employerId }) => {
    return ctx.db.get(employerId);
  },
});

// Create employer (registration)
export const create = mutation({
  args: {
    workosUserId: v.string(),
    email: v.string(),
    companyType: v.union(v.literal("employer"), v.literal("insurer")),
    companyName: v.string(),
    companyRegistrationNumber: v.optional(v.string()),
    contactName: v.string(),
    contactPhone: v.optional(v.string()),
    addressLine1: v.string(),
    addressLine2: v.optional(v.string()),
    city: v.string(),
    postcode: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("employers", {
      ...args,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update employer
export const update = mutation({
  args: {
    employerId: v.id("employers"),
    companyName: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    addressLine1: v.optional(v.string()),
    addressLine2: v.optional(v.string()),
    city: v.optional(v.string()),
    postcode: v.optional(v.string()),
  },
  handler: async (ctx, { employerId, ...updates }) => {
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(employerId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });
  },
});

// Admin: list pending employers
export const listPending = query({
  args: {},
  handler: async (ctx): Promise<Doc<"employers">[]> => {
    return ctx.db
      .query("employers")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
  },
});

// Admin: list all employers
export const listAll = query({
  args: {},
  handler: async (ctx): Promise<Doc<"employers">[]> => {
    return ctx.db.query("employers").collect();
  },
});

// Admin: verify employer
export const verify = mutation({
  args: {
    employerId: v.id("employers"),
    adminUserId: v.id("adminUsers"),
  },
  handler: async (ctx, { employerId, adminUserId }) => {
    await ctx.db.patch(employerId, {
      status: "verified",
      verifiedAt: Date.now(),
      verifiedBy: adminUserId,
      updatedAt: Date.now(),
    });
  },
});

// Admin: reject employer
export const reject = mutation({
  args: {
    employerId: v.id("employers"),
    reason: v.string(),
  },
  handler: async (ctx, { employerId, reason }) => {
    await ctx.db.patch(employerId, {
      status: "rejected",
      rejectionReason: reason,
      updatedAt: Date.now(),
    });
  },
});
