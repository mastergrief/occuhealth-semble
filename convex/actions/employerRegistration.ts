"use node";

/**
 * Employer Registration Action
 *
 * Atomically creates an employer record and GDPR consent records
 * in a single server-side action, eliminating the race condition where
 * createConsent fails because the JWT hasn't propagated yet.
 */

import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

export const registerEmployer = action({
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
    consents: v.object({
      dataProcessing: v.boolean(),
      healthData: v.boolean(),
      employerSharing: v.boolean(),
    }),
  },
  handler: async (ctx, args): Promise<{ employerId: Id<"employers"> }> => {
    // 1. Create employer record
    // @ts-ignore TS2589 - Convex deep type instantiation (non-deterministic)
    const employerId: Id<"employers"> = await ctx.runMutation(internal.employers.createInternal, {
      workosUserId: args.workosUserId,
      email: args.email,
      companyType: args.companyType,
      companyName: args.companyName,
      companyRegistrationNumber: args.companyRegistrationNumber,
      contactName: args.contactName,
      contactPhone: args.contactPhone,
      addressLine1: args.addressLine1,
      addressLine2: args.addressLine2,
      city: args.city,
      postcode: args.postcode,
    });

    // 2. Create GDPR consents atomically
    const now = Date.now();
    const consentDefs = [
      {
        type: "data_processing" as const,
        granted: args.consents.dataProcessing,
        text: "I consent to the processing of employee health data for occupational health assessments",
      },
      {
        type: "health_data" as const,
        granted: args.consents.healthData,
        text: "I understand that sensitive health data will be collected and processed in accordance with GDPR Article 9",
      },
      {
        type: "employer_sharing" as const,
        granted: args.consents.employerSharing,
        text: "I consent to receiving anonymized fitness-for-work reports for my employees",
      },
    ];

    await Promise.all(
      consentDefs.map((c) =>
        // @ts-ignore TS2589 - Convex deep type instantiation (non-deterministic)
        ctx.runMutation(internal.gdpr.createConsentInternal, {
          patientEmail: args.email,
          consentType: c.type,
          granted: c.granted,
          grantedAt: now,
          consentText: c.text,
          consentVersion: "1.0",
          collectedByEmployerId: employerId,
        })
      )
    );

    return { employerId };
  },
});
