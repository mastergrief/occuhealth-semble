/**
 * Authorization Helper Module
 *
 * Provides helper functions for authorization checks in Convex mutations/queries.
 * These functions extract the authenticated user identity and verify access
 * based on role (employer, doctor, admin).
 */

import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

// =============================================================================
// Types
// =============================================================================

/** Context type that supports auth operations (both Query and Mutation contexts) */
export type AuthContext = QueryCtx | MutationCtx;

/** User identity from Convex auth */
export interface AuthenticatedUser {
  /** The WorkOS user ID (stored in identity.subject) */
  workosUserId: string;
  /** The raw identity object from Convex auth */
  identity: {
    subject: string;
    issuer?: string;
    tokenIdentifier: string;
  };
}

/** Authorization error codes for structured error handling */
export type AuthErrorCode =
  | "UNAUTHENTICATED"
  | "UNAUTHORIZED"
  | "EMPLOYER_NOT_FOUND"
  | "DOCTOR_NOT_FOUND"
  | "ADMIN_NOT_FOUND";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract authenticated user identity from Convex context.
 *
 * @param ctx - The Convex query or mutation context
 * @returns The authenticated user info or null if not authenticated
 *
 * @example
 * ```ts
 * const user = await getAuthenticatedUser(ctx);
 * if (!user) {
 *   throw new ConvexError({ code: "UNAUTHENTICATED", message: "Please log in" });
 * }
 * ```
 */
export async function getAuthenticatedUser(
  ctx: AuthContext
): Promise<AuthenticatedUser | null> {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    return null;
  }

  return {
    workosUserId: identity.subject,
    identity: {
      subject: identity.subject,
      issuer: identity.issuer,
      tokenIdentifier: identity.tokenIdentifier,
    },
  };
}

/**
 * Verify that the caller owns the specified employer record.
 *
 * @param ctx - The Convex query or mutation context
 * @param employerId - The employer ID to verify ownership of
 * @returns The employer record if the caller owns it
 * @throws ConvexError with code "UNAUTHENTICATED" if not logged in
 * @throws ConvexError with code "EMPLOYER_NOT_FOUND" if employer doesn't exist
 * @throws ConvexError with code "UNAUTHORIZED" if caller doesn't own the employer
 *
 * @example
 * ```ts
 * const employer = await requireEmployerOwnership(ctx, args.employerId);
 * // Now safe to operate on employer's data
 * ```
 */
export async function requireEmployerOwnership(
  ctx: AuthContext,
  employerId: Id<"employers">
): Promise<Doc<"employers">> {
  const user = await getAuthenticatedUser(ctx);

  if (!user) {
    throw new ConvexError({
      code: "UNAUTHENTICATED" as const,
      message: "Authentication required",
    });
  }

  const employer = await ctx.db.get(employerId);

  if (!employer) {
    throw new ConvexError({
      code: "EMPLOYER_NOT_FOUND" as const,
      message: "Employer not found",
    });
  }

  if (employer.workosUserId !== user.workosUserId) {
    throw new ConvexError({
      code: "UNAUTHORIZED" as const,
      message: "You do not have access to this employer's data",
    });
  }

  return employer;
}

/**
 * Verify that the caller is a registered doctor.
 *
 * @param ctx - The Convex query or mutation context
 * @returns The doctor settings record if the caller is a doctor
 * @throws ConvexError with code "UNAUTHENTICATED" if not logged in
 * @throws ConvexError with code "DOCTOR_NOT_FOUND" if caller is not a doctor
 *
 * @example
 * ```ts
 * const doctor = await requireDoctorAccess(ctx);
 * // Now safe to access doctor-specific resources
 * ```
 */
export async function requireDoctorAccess(
  ctx: AuthContext
): Promise<Doc<"doctorSettings">> {
  const user = await getAuthenticatedUser(ctx);

  if (!user) {
    throw new ConvexError({
      code: "UNAUTHENTICATED" as const,
      message: "Authentication required",
    });
  }

  const doctor = await ctx.db
    .query("doctorSettings")
    .withIndex("by_workos_user", (q) => q.eq("workosUserId", user.workosUserId))
    .first();

  if (!doctor) {
    throw new ConvexError({
      code: "DOCTOR_NOT_FOUND" as const,
      message: "Doctor access required",
    });
  }

  return doctor;
}

/**
 * Verify that the caller is a registered admin.
 *
 * @param ctx - The Convex query or mutation context
 * @returns The admin user record if the caller is an admin
 * @throws ConvexError with code "UNAUTHENTICATED" if not logged in
 * @throws ConvexError with code "ADMIN_NOT_FOUND" if caller is not an admin
 *
 * @example
 * ```ts
 * const admin = await requireAdmin(ctx);
 * // Now safe to perform admin operations
 * ```
 */
export async function requireAdmin(
  ctx: AuthContext
): Promise<Doc<"adminUsers">> {
  const user = await getAuthenticatedUser(ctx);

  if (!user) {
    throw new ConvexError({
      code: "UNAUTHENTICATED" as const,
      message: "Authentication required",
    });
  }

  const admin = await ctx.db
    .query("adminUsers")
    .withIndex("by_workos_user_id", (q) =>
      q.eq("workosUserId", user.workosUserId)
    )
    .first();

  if (!admin) {
    throw new ConvexError({
      code: "ADMIN_NOT_FOUND" as const,
      message: "Admin access required",
    });
  }

  return admin;
}
