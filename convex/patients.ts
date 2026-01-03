import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  requireEmployerOwnership,
  getAuthenticatedUser,
} from "./authModules";
import { paginatedQueryArgs, toPaginatedResult } from "./helpers/pagination";
import { logPatientAction } from "./helpers/auditLogger";

// ---------------------------------------------------------------------------
// Patients CRUD Operations
// ---------------------------------------------------------------------------
// Patient/employee management with consent tracking and GDPR erasure
// Authorization: All operations require employer ownership verification
// ---------------------------------------------------------------------------

// List patients for an employer
export const list = query({
  args: { 
    employerId: v.id("employers"),
    ...paginatedQueryArgs,
  },
  handler: async (ctx, args) => {
    // Verify caller owns this employer
    await requireEmployerOwnership(ctx, args.employerId);

    const result = await ctx.db
      .query("patients")
      .withIndex("by_employer", (q) => q.eq("employerId", args.employerId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .paginate(args.paginationOpts);
    
    return toPaginatedResult(result);
  },
});;

// Get patient by ID
export const getById = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, { patientId }) => {
    const patient = await ctx.db.get(patientId);

    if (!patient) {
      return null;
    }

    // Verify caller owns the patient's employer
    await requireEmployerOwnership(ctx, patient.employerId);

    return patient;
  },
});

// Get patient by email
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    // Require authentication
    const user = await getAuthenticatedUser(ctx);
    if (!user) {
      throw new ConvexError({
        code: "UNAUTHENTICATED" as const,
        message: "Authentication required",
      });
    }

    const patient = await ctx.db
      .query("patients")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!patient) {
      return null;
    }

    // Verify caller owns the patient's employer
    await requireEmployerOwnership(ctx, patient.employerId);

    return patient;
  },
});

// Create patient with consent
export const create = mutation({
  args: {
    employerId: v.id("employers"),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    dateOfBirth: v.string(),
    jobTitle: v.optional(v.string()),
    department: v.optional(v.string()),
    employeeReference: v.optional(v.string()),
    consentId: v.id("consents"),
  },
  handler: async (ctx, args) => {
    // Verify caller owns the employer
    await requireEmployerOwnership(ctx, args.employerId);

    const patientId = await ctx.db.insert("patients", {
      ...args,
      createdAt: Date.now(),
    });

    // Log the patient creation for audit trail
    await logPatientAction(ctx, "patient_created", patientId, {
      employerId: args.employerId,
    });

    return patientId;
  },
});;

// Update patient
export const update = mutation({
  args: {
    patientId: v.id("patients"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    department: v.optional(v.string()),
    employeeReference: v.optional(v.string()),
  },
  handler: async (ctx, { patientId, ...updates }) => {
    // Fetch existing patient
    const patient = await ctx.db.get(patientId);
    if (!patient) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Patient not found",
      });
    }

    // Verify caller owns the patient's employer
    await requireEmployerOwnership(ctx, patient.employerId);

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(patientId, filteredUpdates);

    // Log the patient update for audit trail
    await logPatientAction(ctx, "patient_updated", patientId, {
      updatedFields: Object.keys(filteredUpdates),
    });
  },
});;

// Soft delete (GDPR erasure)
export const softDelete = mutation({
  args: { patientId: v.id("patients") },
  handler: async (ctx, { patientId }) => {
    // Fetch existing patient
    const patient = await ctx.db.get(patientId);
    if (!patient) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Patient not found",
      });
    }

    // Verify caller owns the patient's employer
    await requireEmployerOwnership(ctx, patient.employerId);

    await ctx.db.patch(patientId, {
      firstName: "[REDACTED]",
      lastName: "[REDACTED]",
      email: "[REDACTED]",
      phone: "[REDACTED]",
      dateOfBirth: "[REDACTED]",
      deletedAt: Date.now(),
    });

    // Log the patient deletion for audit trail
    await logPatientAction(ctx, "patient_deleted", patientId, {
      employerId: patient.employerId,
    });
  },
});;
