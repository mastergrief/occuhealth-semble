import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { requireAdmin } from "./authModules";

// ---------------------------------------------------------------------------
// Appointment Types Management
// ---------------------------------------------------------------------------
// Manages appointment type catalog for booking
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Input Validation
// ---------------------------------------------------------------------------

function validateAppointmentTypeFields(args: {
  name?: string;
  description?: string;
  durationMinutes?: number;
  price?: number;
}) {
  if (args.name !== undefined) {
    if (!args.name || args.name.trim().length < 1) {
      throw new ConvexError({ code: "VALIDATION_ERROR", message: "Name is required" });
    }
    if (args.name.length > 100) {
      throw new ConvexError({ code: "VALIDATION_ERROR", message: "Name too long (max 100 characters)" });
    }
  }

  if (args.description !== undefined && args.description.length > 500) {
    throw new ConvexError({ code: "VALIDATION_ERROR", message: "Description too long (max 500 characters)" });
  }

  if (args.durationMinutes !== undefined) {
    if (args.durationMinutes < 15 || args.durationMinutes > 480) {
      throw new ConvexError({ code: "VALIDATION_ERROR", message: "Duration must be 15-480 minutes" });
    }
  }

  if (args.price !== undefined) {
    if (args.price < 0 || args.price > 99999) {
      throw new ConvexError({ code: "VALIDATION_ERROR", message: "Price must be 0-99999" });
    }
  }
}

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
  args: {
    includeDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, { includeDeleted }): Promise<Doc<"appointmentTypes">[]> => {
    await requireAdmin(ctx);
    
    if (includeDeleted) {
      // Return all types including soft-deleted
      return ctx.db.query("appointmentTypes").collect();
    }
    
    // Default: filter out soft-deleted types
    return ctx.db
      .query("appointmentTypes")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});;

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
    const admin = await requireAdmin(ctx);
    validateAppointmentTypeFields({
      name: args.name,
      description: args.description,
      durationMinutes: args.durationMinutes,
      price: args.price,
    });
    const typeId = await ctx.db.insert("appointmentTypes", {
      ...args,
      isActive: true,
    });

    // Audit logging for GDPR compliance
    await ctx.runMutation(internal.gdpr.logAction, {
      action: "appointment_type_created",
      actorType: "admin",
      actorId: admin._id,
      resourceType: "appointmentType",
      resourceId: typeId,
      details: { name: args.name },
    });

    return typeId;
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
    const admin = await requireAdmin(ctx);
    validateAppointmentTypeFields({
      name: updates.name,
      description: updates.description,
      durationMinutes: updates.durationMinutes,
      price: updates.price,
    });
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(typeId, filteredUpdates);

    // Audit logging for GDPR compliance
    await ctx.runMutation(internal.gdpr.logAction, {
      action: "appointment_type_updated",
      actorType: "admin",
      actorId: admin._id,
      resourceType: "appointmentType",
      resourceId: typeId,
      details: { updatedFields: Object.keys(filteredUpdates) },
    });
  },
});


export const remove = mutation({
  args: {
    typeId: v.id("appointmentTypes"),
  },
  handler: async (ctx, { typeId }) => {
    const admin = await requireAdmin(ctx);

    // Check if type exists
    const type = await ctx.db.get(typeId);
    if (!type) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Appointment type not found" });
    }

    // Check referential integrity - are there appointments using this type?
    const usedAppointment = await ctx.db
      .query("appointments")
      .withIndex("by_appointment_type", (q) => q.eq("appointmentTypeId", typeId))
      .first();

    if (usedAppointment) {
      // Soft delete - type is in use by existing appointments
      await ctx.db.patch(typeId, {
        deletedAt: Date.now(),
        isActive: false,
      });

      // Audit log for soft delete
      await ctx.runMutation(internal.gdpr.logAction, {
        action: "appointment_type_soft_deleted",
        actorType: "admin",
        actorId: admin._id,
        resourceType: "appointmentType",
        resourceId: typeId,
        details: { name: type.name, reason: "in_use" },
      });

      return { softDeleted: true, reason: "Type has existing appointments and was deactivated" };
    }

    // Hard delete - safe to remove completely
    await ctx.db.delete(typeId);

    // Audit log for hard delete
    await ctx.runMutation(internal.gdpr.logAction, {
      action: "appointment_type_deleted",
      actorType: "admin",
      actorId: admin._id,
      resourceType: "appointmentType",
      resourceId: typeId,
      details: { name: type.name },
    });

    return { deleted: true };
  },
});
