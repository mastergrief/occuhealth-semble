import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// =============================================================================
// OCCUHEALTH GDPR-COMPLIANT SCHEMA
// =============================================================================
// Includes:
// - Auth tables (Convex Auth)
// - Admin users (WorkOS AuthKit)
// - GDPR-compliant business tables
// - Audit and compliance tables
// =============================================================================

export default defineSchema({
  // ---------------------------------------------------------------------------
  // Auth Tables (required by @convex-dev/auth)
  // ---------------------------------------------------------------------------
  ...authTables,

  // ---------------------------------------------------------------------------
  // Admin Users (WorkOS AuthKit)
  // ---------------------------------------------------------------------------
  adminUsers: defineTable({
    workosUserId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    profilePictureUrl: v.optional(v.string()),
    lastLoginAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_workos_user_id", ["workosUserId"])
    .index("by_email", ["email"]),

  // ---------------------------------------------------------------------------
  // OAuth States (CSRF Protection for WorkOS Auth)
  // ---------------------------------------------------------------------------
  oauthStates: defineTable({
    state: v.string(),
    expiresAt: v.number(),
  }).index("by_state", ["state"]),

  // ---------------------------------------------------------------------------
  // Employers (Companies/Insurers)
  // ---------------------------------------------------------------------------
  employers: defineTable({
    workosUserId: v.string(),
    email: v.string(),
    companyType: v.union(v.literal("employer"), v.literal("insurer")),
    companyName: v.string(),
    companyRegistrationNumber: v.optional(v.string()),
    contactName: v.string(),
    contactPhone: v.optional(v.string()),
    addressLine1: v.string(),
    addressLine2: v.optional(v.string()),
    city: v.string(),
    postcode: v.string(),
    status: v.union(v.literal("pending"), v.literal("verified"), v.literal("rejected")),
    verifiedAt: v.optional(v.number()),
    verifiedBy: v.optional(v.id("adminUsers")),
    rejectionReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workos_user", ["workosUserId"])
    .index("by_status", ["status"])
    .index("by_email", ["email"]),

  // ---------------------------------------------------------------------------
  // Doctor Settings
  // ---------------------------------------------------------------------------
  doctorSettings: defineTable({
    workosUserId: v.string(),
    email: v.string(),
    name: v.string(),
    zoomPersonalLink: v.string(),
    createdAt: v.number(),
  })
    .index("by_workos_user", ["workosUserId"]),

  // ---------------------------------------------------------------------------
  // Patients
  // ---------------------------------------------------------------------------
  patients: defineTable({
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
    createdAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_employer", ["employerId"])
    .index("by_email", ["email"])
    .index("by_deleted", ["deletedAt"]),

  // ---------------------------------------------------------------------------
  // Appointment Types
  // ---------------------------------------------------------------------------
  appointmentTypes: defineTable({
    name: v.string(),
    description: v.string(),
    durationMinutes: v.number(),
    price: v.number(),
    isActive: v.boolean(),
  })
    .index("by_active", ["isActive"]),

  // ---------------------------------------------------------------------------
  // Available Slots
  // ---------------------------------------------------------------------------
  availableSlots: defineTable({
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    status: v.union(v.literal("available"), v.literal("booked"), v.literal("blocked")),
    appointmentId: v.optional(v.id("appointments")),
  })
    .index("by_date", ["date"])
    .index("by_status", ["status"])
    .index("by_date_status", ["date", "status"]),

  // ---------------------------------------------------------------------------
  // Appointments
  // ---------------------------------------------------------------------------
  appointments: defineTable({
    patientId: v.id("patients"),
    employerId: v.id("employers"),
    appointmentTypeId: v.id("appointmentTypes"),
    slotId: v.id("availableSlots"),
    scheduledDate: v.string(),
    scheduledTime: v.string(),
    status: v.union(
      v.literal("scheduled"),
      v.literal("confirmed"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("no_show")
    ),
    reasonForAppointment: v.optional(v.string()),
    preAppointmentNotes: v.optional(v.string()),
    reportId: v.optional(v.id("reports")),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
  })
    .index("by_employer", ["employerId"])
    .index("by_patient", ["patientId"])
    .index("by_date", ["scheduledDate"])
    .index("by_status", ["status"]),

  // ---------------------------------------------------------------------------
  // Reports (Fit-for-Work)
  // ---------------------------------------------------------------------------
  reports: defineTable({
    appointmentId: v.id("appointments"),
    patientId: v.id("patients"),
    employerId: v.id("employers"),
    fitForWork: v.union(
      v.literal("fit"),
      v.literal("fit_with_restrictions"),
      v.literal("temporarily_unfit"),
      v.literal("needs_further_assessment")
    ),
    summary: v.string(),
    restrictions: v.optional(v.array(v.string())),
    followUpRequired: v.boolean(),
    followUpNotes: v.optional(v.string()),
    signedAt: v.number(),
    sentToEmployerAt: v.optional(v.number()),
    viewedByEmployerAt: v.optional(v.number()),
  })
    .index("by_employer", ["employerId"])
    .index("by_appointment", ["appointmentId"])
    .index("by_patient", ["patientId"]),

  // ---------------------------------------------------------------------------
  // Clinical Notes (Doctor-only, GDPR-protected)
  // ---------------------------------------------------------------------------
  clinicalNotes: defineTable({
    appointmentId: v.id("appointments"),
    patientId: v.id("patients"),
    findings: v.string(),
    diagnosis: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_appointment", ["appointmentId"])
    .index("by_patient", ["patientId"]),

  // ---------------------------------------------------------------------------
  // Consents (GDPR Compliance)
  // ---------------------------------------------------------------------------
  consents: defineTable({
    patientEmail: v.string(),
    patientId: v.optional(v.id("patients")),
    consentType: v.union(
      v.literal("data_processing"),
      v.literal("health_data"),
      v.literal("employer_sharing")
    ),
    granted: v.boolean(),
    grantedAt: v.number(),
    withdrawnAt: v.optional(v.number()),
    consentText: v.string(),
    consentVersion: v.string(),
    collectedByEmployerId: v.id("employers"),
  })
    .index("by_patient", ["patientId"])
    .index("by_email", ["patientEmail"])
    .index("by_type", ["consentType"]),

  // ---------------------------------------------------------------------------
  // Audit Logs (GDPR Compliance)
  // ---------------------------------------------------------------------------
  auditLogs: defineTable({
    action: v.string(),
    actorType: v.union(
      v.literal("employer"),
      v.literal("doctor"),
      v.literal("admin"),
      v.literal("system")
    ),
    actorId: v.optional(v.string()),
    resourceType: v.string(),
    resourceId: v.optional(v.string()),
    details: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_action", ["action"])
    .index("by_timestamp", ["timestamp"])
    .index("by_resource", ["resourceType", "resourceId"]),

  // ---------------------------------------------------------------------------
  // Erasure Requests (GDPR Right to be Forgotten)
  // ---------------------------------------------------------------------------
  erasureRequests: defineTable({
    requesterEmail: v.string(),
    patientId: v.optional(v.id("patients")),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("rejected")
    ),
    reason: v.optional(v.string()),
    requestedAt: v.number(),
    completedAt: v.optional(v.number()),
    processedBy: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_email", ["requesterEmail"]),

  // ---------------------------------------------------------------------------
  // Example Table (from starter)
  // ---------------------------------------------------------------------------
  numbers: defineTable({
    value: v.number(),
  }),
});
