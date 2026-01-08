/**
 * AI Module Facade
 * Public API for AI-powered medical report generation
 */

// Provider factory and types
export { getAIProvider } from "./providers";
export type {
  AIProvider,
  ReportSuggestionInput,
  ReportSuggestionOutput,
  StructuredRestriction,
} from "./providers";

// Retry logic
export { withRetry } from "./retry";
export type { RetryConfig } from "./retry";

// Prompt templates
export { reportSuggestionPrompt } from "./prompts";
export type { ReportPrompt } from "./prompts";

// Validation schemas
export {
  validateAIResponse,
  ReportSuggestionOutputSchema,
} from "./schemas/reportSuggestion";

// Cache helpers
export {
  getCacheKey,
  getTTL,
  getCachedRestrictions,
  setCachedRestrictions,
  incrementHitCount,
} from "./cache";
export type { CachedRestriction, CacheKeyParams } from "./cache";
