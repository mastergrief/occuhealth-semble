/**
 * Standardized error codes for Convex mutations and queries.
 * Use these with ConvexError for consistent frontend error handling.
 */
export const ErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",

  // Token-related errors
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",

  // Resource errors
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",

  // Slot booking errors
  SLOT_UNAVAILABLE: "SLOT_UNAVAILABLE",
  SLOT_ALREADY_BOOKED: "SLOT_ALREADY_BOOKED",

  // State and transition errors
  INVALID_STATE: "INVALID_STATE",
  CONFLICT_DETECTED: "CONFLICT_DETECTED",

  // Report errors
  REPORT_NOT_FOUND: "REPORT_NOT_FOUND",

  // URL validation errors
  INVALID_URL: "INVALID_URL",

  // Employer status errors
  EMPLOYER_NOT_VERIFIED: "EMPLOYER_NOT_VERIFIED",

  // Rate limiting
  RATE_LIMITED: "RATE_LIMITED",

  // Validation errors
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",

  // Server errors
  INTERNAL_ERROR: "INTERNAL_ERROR",
  CONFIGURATION_ERROR: "CONFIGURATION_ERROR",

  // AI Service Errors
  AI_SERVICE_UNAVAILABLE: "AI_SERVICE_UNAVAILABLE",
  AI_RATE_LIMITED: "AI_RATE_LIMITED",
  AI_RESPONSE_MALFORMED: "AI_RESPONSE_MALFORMED",
  AI_RESPONSE_EMPTY: "AI_RESPONSE_EMPTY",
  AI_TIMEOUT: "AI_TIMEOUT",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
