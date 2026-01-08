/**
 * Zod Validation Schema for AI Report Suggestions
 * Validates and transforms AI-generated responses
 */

import { z } from "zod";
import type { ReportSuggestionOutput, StructuredRestriction } from "../providers/types";

/**
 * Schema for structured restrictions
 */
const StructuredRestrictionSchema = z.object({
  code: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  duration: z.string().optional(),
});

/**
 * Schema for the complete AI report suggestion output
 */
export const ReportSuggestionOutputSchema = z.object({
  fitForWork: z.enum([
    "fit",
    "fit_with_restrictions",
    "temporarily_unfit",
    "needs_further_assessment",
  ]),
  summary: z.string().min(20).max(1000),
  restrictions: z.array(StructuredRestrictionSchema),
  followUpRequired: z.boolean(),
  followUpNotes: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

/**
 * Raw response type from AI (before validation)
 */
export type ReportSuggestionRaw = z.input<typeof ReportSuggestionOutputSchema>;

/**
 * Validates AI response and transforms to typed output
 * @param raw - Raw response from AI
 * @returns Validated and typed ReportSuggestionOutput
 * @throws ZodError if validation fails
 */
export function validateAIResponse(raw: unknown): ReportSuggestionOutput {
  const parsed = ReportSuggestionOutputSchema.parse(raw);

  // Transform to ensure type compatibility
  const restrictions: StructuredRestriction[] = parsed.restrictions.map((r) => ({
    code: r.code,
    category: r.category,
    description: r.description,
    duration: r.duration,
  }));

  return {
    fitForWork: parsed.fitForWork,
    summary: parsed.summary,
    restrictions,
    followUpRequired: parsed.followUpRequired,
    followUpNotes: parsed.followUpNotes,
    confidence: parsed.confidence,
  };
}
