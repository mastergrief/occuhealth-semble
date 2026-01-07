// convex/gdprModules/consent.ts
// Consent management functions for GDPR compliance

import { mutation, query } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { requireEmployerOwnership } from "../authModules";
import { internal } from "../_generated/api";

/**
 * Creates a consent record for a patient.
 * Only the owning employer can create consent records.
 */
export const createConsent = mutation({
  args: {
    patientEmail: v.string(),
    patientId: v.optional(v.id("patients")),
    consentType: v.union(
      v.literal("data_processing"),
      v.literal("health_data"),
      v.literal("employer_sharing")
    ),
    consentText: v.string(),
    consentVersion: v.string(),
    collectedByEmployerId: v.id("employers"),
  },
  handler: async (ctx, args) => {
    // Authorization: Only the owning employer can create consent
    await requireEmployerOwnership(ctx, args.collectedByEmployerId);

    const consentId = await ctx.db.insert("consents", {
      ...args,
      granted: true,
      grantedAt: Date.now(),
    });

    // Audit logging for GDPR compliance
    await ctx.runMutation(internal.gdpr.logAction, {
      action: "consent_granted",
      actorType: "employer",
      resourceType: "consent",
      resourceId: consentId,
      details: {
        patientEmail: args.patientEmail,
        consentType: args.consentType,
        consentVersion: args.consentVersion,
      },
    });

    return consentId;
  },
});

/**
 * Withdraws a previously granted consent.
 * Only the owning employer can withdraw consent records.
 */
export const withdrawConsent = mutation({
  args: { consentId: v.id("consents") },
  handler: async (ctx, { consentId }) => {
    // Authorization: Only the owning employer can withdraw consent
    const consent = await ctx.db.get(consentId);
    if (!consent) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Consent not found" });
    }
    await requireEmployerOwnership(ctx, consent.collectedByEmployerId);

    await ctx.db.patch(consentId, {
      granted: false,
      withdrawnAt: Date.now(),
    });

    // Audit logging for GDPR compliance
    await ctx.runMutation(internal.gdpr.logAction, {
      action: "consent_withdrawn",
      actorType: "employer",
      resourceType: "consent",
      resourceId: consentId,
      details: {
        patientEmail: consent.patientEmail,
        consentType: consent.consentType,
      },
    });
  },
});

/**
 * Gets all consents for a specific patient.
 * Only the owning employer can view patient consents.
 */
export const getConsentsByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, { patientId }) => {
    // Authorization: Only the owning employer can view patient consents
    const patient = await ctx.db.get(patientId);
    if (!patient) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Patient not found" });
    }
    await requireEmployerOwnership(ctx, patient.employerId);

    return ctx.db
      .query("consents")
      .withIndex("by_patient", (q) => q.eq("patientId", patientId))
      .collect();
  },
});
