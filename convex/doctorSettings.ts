import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";

// ---------------------------------------------------------------------------
// Doctor Settings CRUD Operations
// ---------------------------------------------------------------------------
// Manages doctor configuration including Zoom links
// ---------------------------------------------------------------------------

// Internal query for auth routing
import { ConvexError } from "convex/values";
import { requireDoctorAccess } from "./authModules/authorization";
import { ErrorCodes } from "./lib/errorCodes";

// Zoom URL validation helper - exported for testing
export function isValidZoomUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.endsWith("zoom.us") || urlObj.hostname.endsWith("zoom.com");
  } catch {
    return false;
  }
}

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
/**
 * Get doctor settings by their Convex document ID.
 *
 * @auth public - No authentication required
 * @param ctx - Convex query context
 * @param args.doctorId - The doctor's Convex document ID
 * @returns Doctor settings document or null if not found
 */
export const getById = query({
  args: { doctorId: v.id("doctorSettings") },
  handler: async (ctx, { doctorId }) => {
    return ctx.db.get(doctorId);
  },
});


// Public query by WorkOS user ID (for client-side doctor lookup)
/**
 * Get doctor settings by their WorkOS user ID.
 *
 * Used by frontend to look up doctor data after authentication.
 *
 * @auth public - No authentication required
 * @param ctx - Convex query context
 * @param args.workosUserId - The doctor's WorkOS user ID
 * @returns Doctor settings document or null if not found
 */
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
/**
 * Create a new doctor settings record.
 *
 * Called during doctor registration to initialize their profile.
 *
 * @auth public - Registration flow, no authentication required
 * @param ctx - Convex mutation context
 * @param args.workosUserId - The doctor's WorkOS user ID
 * @param args.email - The doctor's email address
 * @param args.name - The doctor's display name
 * @param args.zoomPersonalLink - The doctor's Zoom meeting link
 * @returns The newly created doctor settings document ID
 */
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
/**
 * Update doctor settings.
 *
 * Allows doctors to update their profile and Zoom link.
 * Validates that the caller is the doctor being updated.
 *
 * @auth doctor - Requires doctor authentication
 * @throws {ConvexError} UNAUTHORIZED - Cannot modify another doctor's settings
 * @throws {ConvexError} INVALID_URL - Zoom link is not a valid Zoom URL
 * @param ctx - Convex mutation context
 * @param args.doctorId - The doctor's Convex document ID
 * @param args.name - Optional updated name
 * @param args.zoomPersonalLink - Optional updated Zoom link
 */
export const update = mutation({
  args: {
    doctorId: v.id("doctorSettings"),
    name: v.optional(v.string()),
    zoomPersonalLink: v.optional(v.string()),
  },
  handler: async (ctx, { doctorId, ...updates }) => {
    const doctor = await requireDoctorAccess(ctx);

    if (doctor._id !== doctorId) {
      throw new ConvexError({
        code: "UNAUTHORIZED" as const,
        message: "Cannot modify another doctor's settings",
      });
    }

    if (updates.zoomPersonalLink && !isValidZoomUrl(updates.zoomPersonalLink)) {
      throw new ConvexError({
        code: ErrorCodes.INVALID_URL,
        message: "Zoom link must be a valid Zoom URL (e.g., https://zoom.us/j/123456)",
      });
    }

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(doctorId, filteredUpdates);
  },
});;
