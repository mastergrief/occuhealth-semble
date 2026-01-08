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
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
