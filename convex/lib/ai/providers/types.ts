/**
 * AI Provider Interface Types
 * Defines contracts for AI-powered medical report generation
 */

/**
 * Input for generating AI-powered report suggestions
 */
export interface ReportSuggestionInput {
  clinicalFindings: string;
  diagnosis?: string;
  appointmentType: string;
  reasonForAppointment?: string;
  patientJobTitle?: string;
  patientDepartment?: string;
  patientAge?: number;
}

/**
 * Structured restriction recommendation
 */
export interface StructuredRestriction {
  code: string;
  category: string;
  description: string;
  duration?: string;
}

/**
 * AI-generated report suggestion output
 */
export interface ReportSuggestionOutput {
  fitForWork: "fit" | "fit_with_restrictions" | "temporarily_unfit" | "needs_further_assessment";
  summary: string;
  restrictions: StructuredRestriction[];
  followUpRequired: boolean;
  followUpNotes?: string;
  confidence: number;
}

/**
 * AI Provider interface contract
 * All AI providers must implement this interface
 */
export interface AIProvider {
  name: string;
  model: string;
  generateReportSuggestion(input: ReportSuggestionInput): Promise<ReportSuggestionOutput>;
}
