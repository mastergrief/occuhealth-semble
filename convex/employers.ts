import { v } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";

// ---------------------------------------------------------------------------
// Employers CRUD Operations
// ---------------------------------------------------------------------------
// Manages employer/insurer accounts with verification workflow
// ---------------------------------------------------------------------------

// Internal query for auth routing
import { requireAdmin, requireEmployerOwnership } from "./authModules";

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

/**
 * Internal version of create for use in server-side actions.
 * Same logic as create but callable via internal API (no client auth needed).
 */
export const createInternal = internalMutation({
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
    // Verify caller owns this employer record
    await requireEmployerOwnership(ctx, employerId);

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
    // Admin-only: verify caller has admin privileges
    await requireAdmin(ctx);

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
    // Admin-only: verify caller has admin privileges
    await requireAdmin(ctx);

    return ctx.db.query("employers").collect();
  },
});

// Admin: verify employer
export const verify = mutation({
  args: {
    employerId: v.id("employers"),
  },
  handler: async (ctx, { employerId }) => {
    // Admin-only: verify caller has admin privileges and get admin record
    const admin = await requireAdmin(ctx);

    // Get employer for audit details
    const employer = await ctx.db.get(employerId);
    if (!employer) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Employer not found",
      });
    }

    await ctx.db.patch(employerId, {
      status: "verified",
      verifiedAt: Date.now(),
      verifiedBy: admin._id,
      updatedAt: Date.now(),
    });

    // Audit logging for GDPR compliance
    await ctx.runMutation(internal.gdpr.logAction, {
      action: "employer_verified",
      actorType: "admin",
      actorId: admin._id,
      resourceType: "employer",
      resourceId: employerId,
      details: {
        companyName: employer.companyName,
        email: employer.email,
      },
    });
  },
});


/**
 * Get aggregated dashboard statistics for an employer.
 *
 * Combines employee, appointment, and report counts in a single query
 * to reduce client-side round trips from 3 to 1.
 *
 * @param employerId - The employer to get stats for
 * @returns Dashboard statistics object
 */
export const getDashboardStats = query({
  args: { employerId: v.id("employers") },
  handler: async (ctx, { employerId }) => {
    // Verify employer ownership
    await requireEmployerOwnership(ctx, employerId);

    // Get counts efficiently using indexed queries
    // Note: Convex doesn't have COUNT aggregates, so we still need to collect
    // but we can limit the scope with filters
    const [patients, appointments, reports] = await Promise.all([
      ctx.db
        .query("patients")
        .withIndex("by_employer", (q) => q.eq("employerId", employerId))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect(),
      ctx.db
        .query("appointments")
        .withIndex("by_employer", (q) => q.eq("employerId", employerId))
        .collect(),
      ctx.db
        .query("reports")
        .withIndex("by_employer", (q) => q.eq("employerId", employerId))
        .collect(),
    ]);

    // Get only recent appointments (last 30 days) for the dashboard list
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentAppointments = appointments
      .filter((apt) => apt._creationTime >= thirtyDaysAgo)
      .sort((a, b) => (b._creationTime || 0) - (a._creationTime || 0))
      .slice(0, 5);

    // Batch fetch patients for recent appointments
    const patientIds = [...new Set(recentAppointments.map((apt) => apt.patientId))];
    const patientDocs = await Promise.all(
      patientIds.map((id) => ctx.db.get(id))
    );
    const patientMap = new Map(
      patientDocs.filter((p) => p !== null).map((p) => [p!._id, p])
    );

    return {
      employeeCount: patients.length,
      appointmentCount: appointments.length,
      reportCount: reports.length,
      pendingCount: appointments.filter((a) => a.status === "scheduled").length,
      completedCount: appointments.filter((a) => a.status === "completed").length,
      recentAppointments: recentAppointments.map((apt) => {
        const patient = patientMap.get(apt.patientId);
        return {
          _id: apt._id,
          patientId: apt.patientId,
          scheduledDate: apt.scheduledDate,
          scheduledTime: apt.scheduledTime,
          status: apt.status,
          patient: patient
            ? { firstName: patient.firstName, lastName: patient.lastName }
            : null,
        };
      }),
    };
  },
});;;;

// Admin: reject employer
export const reject = mutation({
  args: {
    employerId: v.id("employers"),
    reason: v.string(),
  },
  handler: async (ctx, { employerId, reason }) => {
    // Admin-only: verify caller has admin privileges and get admin record
    const admin = await requireAdmin(ctx);

    // Input validation (VUL-007): Rejection reason must be meaningful
    if (!reason || reason.trim().length < 10) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Rejection reason required (minimum 10 characters)",
      });
    }

    // Get employer for audit details
    const employer = await ctx.db.get(employerId);
    if (!employer) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Employer not found",
      });
    }

    await ctx.db.patch(employerId, {
      status: "rejected",
      rejectionReason: reason.trim(),
      updatedAt: Date.now(),
    });

    // Audit logging for GDPR compliance (VUL-001)
    await ctx.runMutation(internal.gdpr.logAction, {
      action: "employer_rejected",
      actorType: "admin",
      actorId: admin._id,
      resourceType: "employer",
      resourceId: employerId,
      details: {
        companyName: employer.companyName,
        email: employer.email,
        rejectionReason: reason.trim(),
      },
    });
  },
});;


// Internal mutation to fix workosUserId for existing employers
export const linkWorkosUser = internalMutation({
  args: {
    email: v.string(),
    workosUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const employer = await ctx.db
      .query("employers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (employer) {
      await ctx.db.patch(employer._id, {
        workosUserId: args.workosUserId,
        updatedAt: Date.now(),
      });
      return { updated: true, email: args.email };
    }
    return { updated: false, email: args.email };
  },
});
