/**
 * AI Helper Queries and Mutations
 *
 * Internal functions for AI-assisted report generation:
 * - getReportContext: Load all context needed for AI generation
 * - storeSuggestion: Audit log AI generation events
 * - generateWithRecovery: Log failed AI attempts for debugging
 * - getCacheStats: Monitor cache performance (placeholder for Sprint 05)
 */

import { internalQuery, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// Internal Queries
// =============================================================================

/**
 * Load all context needed for AI report generation.
 * Combines appointment, patient, appointmentType, and clinical notes data.
 */
export const getReportContext = internalQuery({
  args: {
    appointmentId: v.id("appointments"),
    clinicalNotesId: v.optional(v.id("clinicalNotes")),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) return null;

    const patient = await ctx.db.get(appointment.patientId);
    if (!patient) return null;

    const appointmentType = await ctx.db.get(appointment.appointmentTypeId);

    // Load clinical notes if ID provided, otherwise try to find by appointment
    let clinicalNotes = null;
    if (args.clinicalNotesId) {
      clinicalNotes = await ctx.db.get(args.clinicalNotesId);
    } else {
      clinicalNotes = await ctx.db
        .query("clinicalNotes")
        .withIndex("by_appointment", (q) =>
          q.eq("appointmentId", args.appointmentId)
        )
        .first();
    }

    // Calculate age from DOB
    const dob = new Date(patient.dateOfBirth);
    const age = Math.floor(
      (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );

    return {
      patientId: patient._id,
      employerId: appointment.employerId,
      appointmentType: appointmentType?.name || "General Assessment",
      reasonForAppointment: appointment.reasonForAppointment,
      preAppointmentNotes: appointment.preAppointmentNotes,
      patientJobTitle: patient.jobTitle,
      patientDepartment: patient.department,
      patientAge: age,
      clinicalFindings:
        clinicalNotes?.findings || appointment.preAppointmentNotes || "",
      diagnosis: clinicalNotes?.diagnosis,
    };
  },
});

// =============================================================================
// Internal Mutations
// =============================================================================

/**
 * Store AI suggestion and create audit log entry.
 * Called after successful AI generation.
 */
export const storeSuggestion = internalMutation({
  args: {
    appointmentId: v.id("appointments"),
    patientId: v.id("patients"),
    suggestion: v.object({
      fitForWork: v.string(),
      summary: v.string(),
      restrictions: v.array(
        v.object({
          code: v.string(),
          category: v.string(),
          description: v.string(),
          duration: v.optional(v.string()),
        })
      ),
      followUpRequired: v.boolean(),
      followUpNotes: v.optional(v.string()),
      confidence: v.number(),
    }),
    modelUsed: v.string(),
    latencyMs: v.number(),
  },
  handler: async (ctx, args) => {
    // Log AI generation for audit trail
    await ctx.db.insert("auditLogs", {
      action: "ai_report_suggestion_generated",
      actorType: "system",
      resourceType: "appointment",
      resourceId: args.appointmentId,
      details: {
        patientId: args.patientId,
        modelUsed: args.modelUsed,
        latencyMs: args.latencyMs,
        confidence: args.suggestion.confidence,
      },
      timestamp: Date.now(),
    });

    return args.suggestion;
  },
});

/**
 * Log failed AI generation attempts for debugging.
 * Called when AI generation fails at any stage.
 */
export const generateWithRecovery = internalMutation({
  args: {
    appointmentId: v.id("appointments"),
    error: v.string(),
    stage: v.string(),
  },
  handler: async (ctx, args) => {
    // Log failed AI generation for debugging
    await ctx.db.insert("auditLogs", {
      action: "ai_report_suggestion_failed",
      actorType: "system",
      resourceType: "appointment",
      resourceId: args.appointmentId,
      details: {
        error: args.error,
        failedAtStage: args.stage,
      },
      timestamp: Date.now(),
    });
  },
});

// =============================================================================
// Public Queries
// =============================================================================

/**
 * Get cache statistics for AI suggestions.
 */
export const getCacheStats = query({
  args: {},
  handler: async (ctx) => {
    const allCache = await ctx.db.query("aiSuggestionCache").collect();
    const now = Date.now();

    const totalEntries = allCache.length;
    const totalHits = allCache.reduce((sum, e) => sum + e.hitCount, 0);
    const activeEntries = allCache.filter((e) => e.expiresAt > now).length;

    return {
      totalEntries,
      activeEntries,
      expiredEntries: totalEntries - activeEntries,
      totalHits,
      avgHitsPerEntry: totalEntries > 0 ? totalHits / totalEntries : 0,
    };
  },
});

// =============================================================================
// Cache Internal Functions
// =============================================================================

/**
 * Clean up expired cache entries.
 * Called by cron job daily at 3:15 AM UTC.
 */
export const cleanupExpiredCache = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("aiSuggestionCache")
      .withIndex("by_expires")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .take(100);

    for (const entry of expired) {
      await ctx.db.delete(entry._id);
    }

    return { deleted: expired.length };
  },
});

/**
 * Internal query for cache lookup.
 * Used by actions to check cache before calling AI.
 */
export const getCachedRestrictionsInternal = internalQuery({
  args: { cacheKey: v.string() },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("aiSuggestionCache")
      .withIndex("by_key", (q) => q.eq("cacheKey", args.cacheKey))
      .first();

    if (!cached || cached.expiresAt < Date.now()) return null;
    return cached.suggestions.restrictions;
  },
});

/**
 * Internal mutation for incrementing hit count.
 * Called when cache is accessed successfully.
 */
export const incrementCacheHit = internalMutation({
  args: { cacheKey: v.string() },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("aiSuggestionCache")
      .withIndex("by_key", (q) => q.eq("cacheKey", args.cacheKey))
      .first();

    if (cached) {
      await ctx.db.patch(cached._id, { hitCount: cached.hitCount + 1 });
    }
  },
});

/**
 * Internal mutation for setting cache.
 * Called after successful AI generation to cache results.
 */
export const setCacheRestrictions = internalMutation({
  args: {
    cacheKey: v.string(),
    restrictions: v.array(
      v.object({
        code: v.string(),
        category: v.string(),
        description: v.string(),
        duration: v.optional(v.string()),
      })
    ),
    ttl: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("aiSuggestionCache")
      .withIndex("by_key", (q) => q.eq("cacheKey", args.cacheKey))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        suggestions: { restrictions: args.restrictions },
        expiresAt: now + args.ttl,
      });
    } else {
      await ctx.db.insert("aiSuggestionCache", {
        cacheKey: args.cacheKey,
        suggestions: { restrictions: args.restrictions },
        hitCount: 0,
        createdAt: now,
        expiresAt: now + args.ttl,
      });
    }
  },
});
