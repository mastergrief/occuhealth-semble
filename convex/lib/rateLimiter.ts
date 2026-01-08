// convex/lib/rateLimiter.ts
// Rate limiting configuration for API abuse prevention

import { rateLimit as rateLimitFn, RateLimitConfig } from "convex-helpers/server/rateLimit";
import { ConvexError } from "convex/values";
import { GenericMutationCtx } from "convex/server";
import { DataModel } from "../_generated/dataModel";

/**
 * Rate limit configurations for different operations
 * Using token bucket algorithm for smooth rate limiting
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Appointment booking: 10 requests per minute per user
  // Prevents slot spam booking
  bookAppointment: {
    kind: "token bucket",
    rate: 10,
    period: 60000, // 1 minute
    capacity: 10,
  },

  // Patient creation: 20 requests per minute per employer
  // Prevents employee creation spam
  createPatient: {
    kind: "token bucket",
    rate: 20,
    period: 60000, // 1 minute
    capacity: 20,
  },

  // Consent creation: 30 requests per minute per employer
  // Higher limit as consents are created alongside patients
  createConsent: {
    kind: "token bucket",
    rate: 30,
    period: 60000, // 1 minute
    capacity: 30,
  },

  // Recurring slot creation: 5 requests per minute
  // Lower limit as this creates many records at once
  createRecurringSlots: {
    kind: "token bucket",
    rate: 5,
    period: 60000, // 1 minute
    capacity: 5,
  },
};

/**
 * Check and consume rate limit for a given operation
 * @param ctx - Mutation context
 * @param name - Rate limit name (must be a key in RATE_LIMITS)
 * @param key - Unique key for the rate limit (e.g., userId, employerId)
 */
export async function rateLimit(
  ctx: GenericMutationCtx<DataModel>,
  args: { name: keyof typeof RATE_LIMITS; key: string }
): Promise<{ ok: boolean; retryAt: number | undefined }> {
  const config = RATE_LIMITS[args.name];
  if (!config) {
    throw new Error(`Unknown rate limit: ${args.name}`);
  }

  // The rateLimitFn expects a context with db that has the rateLimits table
  // Our DataModel includes rateLimitTables from the schema, so this is safe
  // We use 'as any' because the library's types are overly restrictive
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rateLimitFn(ctx as any, {
    name: args.name,
    key: args.key,
    config,
  });
}

/**
 * Helper to throw a rate limit error with retry information
 */
export function throwRateLimitError(name: string, retryAt: number | undefined): never {
  const retryAfterMs = retryAt ? retryAt - Date.now() : 60000;
  const retryAfterSec = Math.ceil(retryAfterMs / 1000);
  throw new ConvexError({
    code: "RATE_LIMITED",
    message: `Too many requests for ${name}. Please try again in ${retryAfterSec} seconds.`,
    retryAfter: retryAfterMs,
  });
}
