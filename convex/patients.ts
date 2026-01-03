import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ---------------------------------------------------------------------------
// Patients CRUD Operations
// ---------------------------------------------------------------------------
// Patient/employee management with consent tracking and GDPR erasure
// ---------------------------------------------------------------------------

// List patients for an employer
export const list = query({
  args: { employerId: v.id("employers") },
  handler: async (ctx, { employerId }) => {
    return ctx.db
      .query("patients")
      .withIndex("by_employer", (q) => q.eq("employerId", employerId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

// Get patient by ID
export const getById = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, { patientId }) => {
    return ctx.db.get(patientId);
  },
});

// Get patient by email
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return ctx.db
      .query("patients")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
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
    return ctx.db.insert("patients", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

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
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(patientId, filteredUpdates);
  },
});

// Soft delete (GDPR erasure)
export const softDelete = mutation({
  args: { patientId: v.id("patients") },
  handler: async (ctx, { patientId }) => {
    await ctx.db.patch(patientId, {
      firstName: "[REDACTED]",
      lastName: "[REDACTED]",
      email: "[REDACTED]",
      phone: "[REDACTED]",
      dateOfBirth: "[REDACTED]",
      deletedAt: Date.now(),
    });
  },
});
