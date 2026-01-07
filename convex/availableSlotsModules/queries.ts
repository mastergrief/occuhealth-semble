// convex/availableSlotsModules/queries.ts
// Query functions extracted from availableSlots.ts

import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireDoctorAccess } from "../authModules/authorization";

/**
 * Get all time slots within a date range.
 *
 * Used by Schedule page to display slots for selected dates.
 *
 * @auth public - No authentication required
 * @param ctx - Convex query context
 * @param args.startDate - Start date in YYYY-MM-DD format
 * @param args.endDate - End date in YYYY-MM-DD format
 * @returns Array of slot documents within the date range
 */
export const getByDateRange = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, { startDate, endDate }) => {
    return ctx.db
      .query("availableSlots")
      .withIndex("by_date")
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), startDate),
          q.lte(q.field("date"), endDate)
        )
      )
      .collect();
  },
});

/**
 * Get available slots for a specific date.
 *
 * Used by booking flow to show available appointment times.
 *
 * @auth public - No authentication required
 * @param ctx - Convex query context
 * @param args.date - Date in YYYY-MM-DD format
 * @returns Array of available slot documents for the date
 */
export const getAvailable = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    return ctx.db
      .query("availableSlots")
      .withIndex("by_date_status", (q) =>
        q.eq("date", date).eq("status", "available")
      )
      .collect();
  },
});

/**
 * Get all slots for a specific month.
 *
 * Used by calendar view to display monthly slot overview.
 *
 * @auth public - No authentication required
 * @param ctx - Convex query context
 * @param args.yearMonth - Year and month in YYYY-MM format
 * @returns Array of slot documents for the month
 */
export const getByMonth = query({
  args: { yearMonth: v.string() }, // Format: "2026-01"
  handler: async (ctx, { yearMonth }) => {
    return ctx.db
      .query("availableSlots")
      .withIndex("by_date")
      .filter((q) => q.gte(q.field("date"), `${yearMonth}-01`))
      .filter((q) => q.lt(q.field("date"), `${yearMonth}-32`))
      .collect();
  },
});

/**
 * Get recurring slot templates for the authenticated doctor.
 *
 * Returns templates with slot counts for management UI.
 *
 * @auth Requires doctor authentication
 * @param ctx - Convex query context
 * @param args.status - Optional filter by status (active/archived)
 * @returns Array of templates with slot count statistics
 */
export const getTemplates = query({
  args: {
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
  },
  handler: async (ctx, args) => {
    const doctor = await requireDoctorAccess(ctx);

    // Query templates
    let templatesQuery;
    if (args.status) {
      templatesQuery = ctx.db
        .query("recurringSlotTemplates")
        .withIndex("by_doctor_status", (q) =>
          q.eq("doctorId", doctor._id).eq("status", args.status!)
        );
    } else {
      templatesQuery = ctx.db
        .query("recurringSlotTemplates")
        .withIndex("by_doctor", (q) => q.eq("doctorId", doctor._id));
    }

    const templates = await templatesQuery.collect();

    // Get slot counts for each template
    const templatesWithCounts = await Promise.all(
      templates.map(async (template) => {
        const slots = await ctx.db
          .query("availableSlots")
          .withIndex("by_template", (q) => q.eq("templateId", template._id))
          .collect();

        const availableCount = slots.filter((s) => s.status === "available").length;
        const bookedCount = slots.filter((s) => s.status === "booked").length;
        const blockedCount = slots.filter((s) => s.status === "blocked").length;

        return {
          ...template,
          slotCounts: {
            total: slots.length,
            available: availableCount,
            booked: bookedCount,
            blocked: blockedCount,
          },
        };
      })
    );

    return templatesWithCounts;
  },
});
