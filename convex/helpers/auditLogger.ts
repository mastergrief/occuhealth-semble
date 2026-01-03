import { MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

// ---------------------------------------------------------------------------
// Audit Logging Helper Module
// ---------------------------------------------------------------------------
// Provides typed wrappers for GDPR-compliant audit logging in mutations
// ---------------------------------------------------------------------------

type ActorType = "employer" | "doctor" | "admin" | "system";

interface ActorInfo {
  actorType: ActorType;
  actorId: string | undefined;
}

/**
 * Extracts actor information from the authenticated context.
 * Returns system actor if no identity is found (for system operations).
 */
async function getActorInfo(ctx: MutationCtx): Promise<ActorInfo> {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    return { actorType: "system", actorId: undefined };
  }

  // Determine actor type based on identity metadata
  // WorkOS users are typically admins/doctors, employer tokens have employer role
  const role = identity.role as string | undefined;

  let actorType: ActorType = "employer"; // Default for employer users
  if (role === "doctor") {
    actorType = "doctor";
  } else if (role === "admin") {
    actorType = "admin";
  }

  return {
    actorType,
    actorId: identity.subject,
  };
}

/**
 * Logs a patient-related action to the audit log.
 * @param ctx - Mutation context
 * @param action - Action name (e.g., 'patient_created', 'patient_updated', 'patient_deleted')
 * @param patientId - ID of the patient affected
 * @param details - Optional additional details about the action
 */
export async function logPatientAction(
  ctx: MutationCtx,
  action: string,
  patientId: Id<"patients">,
  details?: Record<string, unknown>
): Promise<void> {
  const { actorType, actorId } = await getActorInfo(ctx);

  await ctx.runMutation(internal.gdpr.logAction, {
    action,
    actorType,
    actorId,
    resourceType: "patient",
    resourceId: patientId,
    details,
  });
}

/**
 * Logs a report-related action to the audit log.
 * @param ctx - Mutation context
 * @param action - Action name (e.g., 'report_created', 'report_sent_to_employer', 'report_viewed')
 * @param reportId - ID of the report affected
 * @param patientId - ID of the patient the report belongs to
 * @param details - Optional additional details about the action
 */
export async function logReportAction(
  ctx: MutationCtx,
  action: string,
  reportId: Id<"reports">,
  patientId: Id<"patients">,
  details?: Record<string, unknown>
): Promise<void> {
  const { actorType, actorId } = await getActorInfo(ctx);

  await ctx.runMutation(internal.gdpr.logAction, {
    action,
    actorType,
    actorId,
    resourceType: "report",
    resourceId: reportId,
    details: {
      patientId,
      ...details,
    },
  });
}

/**
 * Logs an appointment-related action to the audit log.
 * @param ctx - Mutation context
 * @param action - Action name (e.g., 'appointment_booked', 'appointment_completed')
 * @param appointmentId - ID of the appointment affected
 * @param patientId - ID of the patient the appointment belongs to
 * @param details - Optional additional details about the action
 */
export async function logAppointmentAction(
  ctx: MutationCtx,
  action: string,
  appointmentId: Id<"appointments">,
  patientId: Id<"patients">,
  details?: Record<string, unknown>
): Promise<void> {
  const { actorType, actorId } = await getActorInfo(ctx);

  await ctx.runMutation(internal.gdpr.logAction, {
    action,
    actorType,
    actorId,
    resourceType: "appointment",
    resourceId: appointmentId,
    details: {
      patientId,
      ...details,
    },
  });
}
