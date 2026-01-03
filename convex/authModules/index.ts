/**
 * Authorization Module Exports
 *
 * Re-exports all authorization functions and types for clean imports.
 *
 * @example
 * ```ts
 * import { requireEmployerOwnership, requireAdmin } from "./authModules";
 * ```
 */

export {
  // Functions
  getAuthenticatedUser,
  requireEmployerOwnership,
  requireDoctorAccess,
  requireAdmin,
  // Types
  type AuthContext,
  type AuthenticatedUser,
  type AuthErrorCode,
} from "./authorization";
