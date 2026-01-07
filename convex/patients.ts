import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  requireEmployerOwnership,
  getAuthenticatedUser,
} from "./authModules";
import { paginatedQueryArgs, toPaginatedResult } from "./helpers/pagination";
import { logPatientAction } from "./helpers/auditLogger";

// ---------------------------------------------------------------------------
// Patients CRUD Operations
// ---------------------------------------------------------------------------
// Patient/employee management with consent tracking and GDPR erasure
// Authorization: All operations require employer ownership verification
// ---------------------------------------------------------------------------

/**
 * Lists patients (employees) belonging to an employer with pagination support.
 *
 * Returns only non-deleted patients, filtered by employer ownership.
 * Results are paginated using Convex's cursor-based pagination.
 *
 * @param args.employerId - The employer ID to list patients for
 * @param args.paginationOpts - Pagination options (numItems, cursor)
 * @returns Paginated list of patient records with page metadata
 * @throws ConvexError with code "UNAUTHORIZED" if caller does not own the employer
 *
 * @example
 * ```ts
 * const { page, isDone, continueCursor } = await ctx.runQuery(api.patients.list, {
 *   employerId,
 *   paginationOpts: { numItems: 10 }
 * });
 * ```
 */
export const list = query({
  args: { 
    employerId: v.id("employers"),
    ...paginatedQueryArgs,
  },
  handler: async (ctx, args) => {
    // Verify caller owns this employer
    await requireEmployerOwnership(ctx, args.employerId);

    const result = await ctx.db
      .query("patients")
      .withIndex("by_employer", (q) => q.eq("employerId", args.employerId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .paginate(args.paginationOpts);
    
    return toPaginatedResult(result);
  },
});

/**
 * Retrieves a patient record by its unique ID.
 *
 * Performs authorization check to ensure the caller owns the employer
 * associated with the patient. Returns null if patient is not found
 * rather than throwing an error.
 *
 * @param args.patientId - The unique patient document ID
 * @returns The patient record or null if not found
 * @throws ConvexError with code "UNAUTHORIZED" if caller does not own the patient's employer
 *
 * @remarks
 * This query does not filter soft-deleted patients. Use with caution
 * when displaying patient data to avoid showing redacted records.
 */
export const getById = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, { patientId }) => {
    const patient = await ctx.db.get(patientId);

    if (!patient) {
      return null;
    }

    // Verify caller owns the patient's employer
    await requireEmployerOwnership(ctx, patient.employerId);

    return patient;
  },
});

/**
 * Looks up a patient record by email address.
 *
 * Requires authentication and verifies the caller owns the employer
 * associated with the found patient. Useful for checking if an employee
 * already exists before creating a duplicate.
 *
 * @param args.email - The email address to search for
 * @returns The patient record or null if not found
 * @throws ConvexError with code "UNAUTHENTICATED" if caller is not authenticated
 * @throws ConvexError with code "UNAUTHORIZED" if caller does not own the patient's employer
 *
 * @remarks
 * Uses the by_email index for efficient lookup. Only returns the first match
 * if multiple patients share the same email (edge case in data integrity).
 */
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    // Require authentication
    const user = await getAuthenticatedUser(ctx);
    if (!user) {
      throw new ConvexError({
        code: "UNAUTHENTICATED" as const,
        message: "Authentication required",
      });
    }

    const patient = await ctx.db
      .query("patients")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!patient) {
      return null;
    }

    // Verify caller owns the patient's employer
    await requireEmployerOwnership(ctx, patient.employerId);

    return patient;
  },
});

/**
 * Creates a new patient (employee) record with mandatory consent reference.
 *
 * Requires a valid consent record to be created first via the GDPR consent
 * workflow. This ensures GDPR compliance by linking patient data to explicit
 * consent. The operation is logged to the audit trail.
 *
 * @param args.employerId - The employer this patient belongs to
 * @param args.firstName - Patient's first name (required)
 * @param args.lastName - Patient's last name (required)
 * @param args.email - Patient's email address (required, used for communication)
 * @param args.phone - Patient's phone number (optional)
 * @param args.dateOfBirth - Patient's date of birth as ISO string (required for medical records)
 * @param args.jobTitle - Patient's job title (optional, for occupational health context)
 * @param args.department - Patient's department (optional)
 * @param args.employeeReference - Internal employee ID/reference (optional)
 * @param args.consentId - Reference to the consent record (required for GDPR compliance)
 * @returns The newly created patient document ID
 * @throws ConvexError with code "UNAUTHORIZED" if caller does not own the employer
 *
 * @remarks
 * GDPR Data Processing: This mutation processes personal data under the lawful
 * basis of explicit consent. The consentId must reference a valid, active consent
 * record created via gdpr.createConsent before patient creation.
 *
 * @example
 * ```ts
 * // First create consent, then create patient
 * const consentId = await ctx.runMutation(api.gdpr.createConsent, { ... });
 * const patientId = await ctx.runMutation(api.patients.create, {
 *   employerId, firstName: "John", lastName: "Doe",
 *   email: "john@example.com", dateOfBirth: "1990-01-15",
 *   consentId
 * });
 * ```
 */
export const create = mutation({
  args: {
    employerId: v.id("employers"),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    dateOfBirth: v.string(),
    jobTitle: v.optional(v.string()),
    department: v.optional(v.string()),
    employeeReference: v.optional(v.string()),
    consentId: v.id("consents"),
  },
  handler: async (ctx, args) => {
    // Verify caller owns the employer
    await requireEmployerOwnership(ctx, args.employerId);

    const patientId = await ctx.db.insert("patients", {
      ...args,
      createdAt: Date.now(),
    });

    // Log the patient creation for audit trail
    await logPatientAction(ctx, "patient_created", patientId, {
      employerId: args.employerId,
    });

    return patientId;
  },
});

/**
 * Updates an existing patient record with partial data.
 *
 * Only the provided fields are updated; omitted fields remain unchanged.
 * Email and date of birth cannot be updated via this mutation to maintain
 * data integrity. The operation is logged to the audit trail.
 *
 * @param args.patientId - The patient document ID to update
 * @param args.firstName - Updated first name (optional)
 * @param args.lastName - Updated last name (optional)
 * @param args.phone - Updated phone number (optional)
 * @param args.jobTitle - Updated job title (optional)
 * @param args.department - Updated department (optional)
 * @param args.employeeReference - Updated employee reference (optional)
 * @returns void
 * @throws ConvexError with code "NOT_FOUND" if patient does not exist
 * @throws ConvexError with code "UNAUTHORIZED" if caller does not own the patient's employer
 *
 * @remarks
 * GDPR Data Processing: Updates to personal data are logged in the audit trail
 * with the list of modified fields for compliance tracking. To change email or
 * date of birth, a new patient record with fresh consent should be created.
 */
export const update = mutation({
  args: {
    patientId: v.id("patients"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    department: v.optional(v.string()),
    employeeReference: v.optional(v.string()),
  },
  handler: async (ctx, { patientId, ...updates }) => {
    // Fetch existing patient
    const patient = await ctx.db.get(patientId);
    if (!patient) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Patient not found",
      });
    }

    // Verify caller owns the patient's employer
    await requireEmployerOwnership(ctx, patient.employerId);

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(patientId, filteredUpdates);

    // Log the patient update for audit trail
    await logPatientAction(ctx, "patient_updated", patientId, {
      updatedFields: Object.keys(filteredUpdates),
    });
  },
});

/**
 * Performs GDPR-compliant soft deletion (data erasure) of a patient record.
 *
 * Instead of deleting the database record, this mutation redacts all personal
 * identifiable information (PII) by replacing it with "[REDACTED]" placeholders.
 * This preserves referential integrity while satisfying GDPR Article 17
 * (Right to Erasure) requirements. The operation is logged to the audit trail.
 *
 * @param args.patientId - The patient document ID to soft delete
 * @returns void
 * @throws ConvexError with code "NOT_FOUND" if patient does not exist
 * @throws ConvexError with code "UNAUTHORIZED" if caller does not own the patient's employer
 *
 * @remarks
 * GDPR Article 17 Compliance: This implements the "right to be forgotten" by:
 * - Redacting firstName, lastName, email, phone, and dateOfBirth
 * - Setting deletedAt timestamp for filtering in queries
 * - Preserving the record for audit trail and referential integrity
 *
 * Related appointments and reports maintain their structure but reference
 * the redacted patient record. The audit log entry for this action is retained
 * for compliance documentation.
 *
 * This is a soft delete, NOT a hard delete. The record remains in the database
 * with redacted values. Use list() which filters by deletedAt to exclude
 * soft-deleted patients from normal queries.
 */
export const softDelete = mutation({
  args: { patientId: v.id("patients") },
  handler: async (ctx, { patientId }) => {
    // Fetch existing patient
    const patient = await ctx.db.get(patientId);
    if (!patient) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Patient not found",
      });
    }

    // Verify caller owns the patient's employer
    await requireEmployerOwnership(ctx, patient.employerId);

    await ctx.db.patch(patientId, {
      firstName: "[REDACTED]",
      lastName: "[REDACTED]",
      email: "[REDACTED]",
      phone: "[REDACTED]",
      dateOfBirth: "[REDACTED]",
      deletedAt: Date.now(),
    });

    // Log the patient deletion for audit trail
    await logPatientAction(ctx, "patient_deleted", patientId, {
      employerId: patient.employerId,
    });
  },
});
