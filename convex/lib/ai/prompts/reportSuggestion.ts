/**
 * Prompt Templates for Medical Report Suggestion Generation
 * Generates employer-safe occupational health assessments
 */

import type { ReportSuggestionInput } from "../providers/types";

export interface ReportPrompt {
  system: string;
  user: string;
}

/**
 * System prompt for medical report generation
 * Establishes JSON structure and employer-safe content guidelines
 */
const SYSTEM_PROMPT = `You are an occupational health assessment assistant helping doctors generate structured fitness-for-work reports.

CRITICAL GUIDELINES:
1. Generate employer-safe content only - NO specific medical diagnoses or conditions
2. Focus on functional capacity and work restrictions
3. Use standardized restriction codes and categories
4. Be concise but comprehensive

RESPONSE FORMAT (JSON):
{
  "fitForWork": "fit" | "fit_with_restrictions" | "temporarily_unfit" | "needs_further_assessment",
  "summary": "Brief employer-safe summary of fitness status (20-1000 chars)",
  "restrictions": [
    {
      "code": "Standardized code (e.g., LIFT-01, STAND-02)",
      "category": "Category (e.g., Physical, Environmental, Hours)",
      "description": "Clear description of the restriction",
      "duration": "Optional duration (e.g., '4 weeks', 'Permanent')"
    }
  ],
  "followUpRequired": true | false,
  "followUpNotes": "Optional notes about follow-up requirements",
  "confidence": 0.0-1.0
}

RESTRICTION CATEGORIES:
- Physical: Lifting, standing, sitting, mobility restrictions
- Environmental: Temperature, noise, dust, chemical exposure
- Hours: Shift work, overtime, break requirements
- Cognitive: Concentration, multitasking, stress limitations
- Equipment: PPE requirements, equipment modifications

EMPLOYER-SAFE LANGUAGE:
- DO NOT mention specific diagnoses (e.g., "diabetes", "depression")
- DO use functional language (e.g., "requires regular breaks", "limited lifting capacity")
- Focus on what the employee CAN do with accommodations`;

/**
 * Builds user prompt with clinical context
 */
function buildUserPrompt(input: ReportSuggestionInput): string {
  const parts: string[] = [
    `CLINICAL FINDINGS:\n${input.clinicalFindings}`,
  ];

  if (input.diagnosis) {
    parts.push(`DIAGNOSIS (confidential - do not include in output):\n${input.diagnosis}`);
  }

  parts.push(`APPOINTMENT TYPE: ${input.appointmentType}`);

  if (input.reasonForAppointment) {
    parts.push(`REASON FOR APPOINTMENT: ${input.reasonForAppointment}`);
  }

  // Job context for relevant restrictions
  const jobContext: string[] = [];
  if (input.patientJobTitle) {
    jobContext.push(`Job Title: ${input.patientJobTitle}`);
  }
  if (input.patientDepartment) {
    jobContext.push(`Department: ${input.patientDepartment}`);
  }
  if (input.patientAge !== undefined) {
    jobContext.push(`Age: ${input.patientAge}`);
  }

  if (jobContext.length > 0) {
    parts.push(`JOB CONTEXT:\n${jobContext.join("\n")}`);
  }

  parts.push(
    "\nGenerate a structured fitness-for-work assessment based on the above information. Ensure the summary and restrictions are employer-safe (no specific medical diagnoses)."
  );

  return parts.join("\n\n");
}

/**
 * Generates prompts for report suggestion
 * @param input - Clinical and job context data
 * @returns System and user prompts
 */
export function reportSuggestionPrompt(input: ReportSuggestionInput): ReportPrompt {
  return {
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(input),
  };
}
