"use node";

/**
 * AI Report Suggestion Action
 *
 * Convex action that calls OpenAI to generate medical report suggestions.
 * IMPORTANT: This file must start with "use node"; directive for external API access.
 *
 * Flow:
 * 1. Load context via internal query (patient, appointment, clinical notes)
 * 2. Get AI provider (OpenAI with gpt-5-mini)
 * 3. Call AI with timing measurement
 * 4. Validate response with Zod schema
 * 5. Store audit log via internal mutation
 * 6. Return validated suggestion
 */

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { getAIProvider, validateAIResponse } from "../lib/ai";
import { ConvexError } from "convex/values";
import { ErrorCodes } from "../lib/errorCodes";

export const generateSuggestion = action({
  args: {
    appointmentId: v.id("appointments"),
    clinicalNotesId: v.optional(v.id("clinicalNotes")),
  },
  handler: async (ctx, args) => {
    try {
      // 1. Load context via internal query
      const context = await ctx.runQuery(internal.aiHelpers.getReportContext, {
        appointmentId: args.appointmentId,
        clinicalNotesId: args.clinicalNotesId,
      });

      if (!context) {
        throw new ConvexError({
          code: ErrorCodes.NOT_FOUND,
          message: "Appointment or patient not found",
        });
      }

      // 2. Get AI provider (OpenAI with gpt-5-mini)
      const provider = getAIProvider("openai");

      // 3. Call AI with timing measurement
      const startTime = Date.now();

      const rawResponse = await provider.generateReportSuggestion({
        clinicalFindings: context.clinicalFindings,
        diagnosis: context.diagnosis,
        appointmentType: context.appointmentType,
        reasonForAppointment: context.reasonForAppointment,
        patientJobTitle: context.patientJobTitle,
        patientDepartment: context.patientDepartment,
        patientAge: context.patientAge,
      });

      const latencyMs = Date.now() - startTime;

      // 4. Validate response with Zod schema
      const validatedSuggestion = validateAIResponse(rawResponse);

      // 5. Store audit log via internal mutation
      await ctx.runMutation(internal.aiHelpers.storeSuggestion, {
        appointmentId: args.appointmentId,
        patientId: context.patientId,
        suggestion: validatedSuggestion,
        modelUsed: provider.model,
        latencyMs,
      });

      // 6. Return validated suggestion
      return validatedSuggestion;
    } catch (error) {
      // Log the failure for debugging
      await ctx.runMutation(internal.aiHelpers.generateWithRecovery, {
        appointmentId: args.appointmentId,
        error: error instanceof Error ? error.message : String(error),
        stage: "ai_generation",
      });

      // Re-throw to surface to frontend
      if (error instanceof ConvexError) {
        throw error;
      }

      // Wrap unknown errors in a ConvexError
      throw new ConvexError({
        code: ErrorCodes.AI_SERVICE_UNAVAILABLE,
        message:
          error instanceof Error
            ? error.message
            : "AI service encountered an error",
      });
    }
  },
});
