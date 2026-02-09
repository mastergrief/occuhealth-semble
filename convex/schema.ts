import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import { rateLimitTables } from "convex-helpers/server/rateLimit";

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
  // Rate Limiting Tables (required by convex-helpers rate limiter)
  // ---------------------------------------------------------------------------
  ...rateLimitTables,

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
    returnTo: v.optional(v.string()),
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
    deletedAt: v.optional(v.number()),
  })
    .index("by_active", ["isActive"])
    .index("by_deleted", ["deletedAt"]),

  // ---------------------------------------------------------------------------
  // Available Slots
  // ---------------------------------------------------------------------------
  availableSlots: defineTable({
    doctorId: v.id("doctorSettings"),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    status: v.union(v.literal("available"), v.literal("booked"), v.literal("blocked")),
    appointmentId: v.optional(v.id("appointments")),
    bookedAt: v.optional(v.number()),
    templateId: v.optional(v.id("recurringSlotTemplates")),
  })
    .index("by_date", ["date"])
    .index("by_status", ["status"])
    .index("by_date_status", ["date", "status"])
    .index("by_doctor", ["doctorId"])
    .index("by_doctor_date", ["doctorId", "date"])
    .index("by_template", ["templateId"]),

  // ---------------------------------------------------------------------------
  // Recurring Slot Templates
  // ---------------------------------------------------------------------------
  recurringSlotTemplates: defineTable({
    doctorId: v.id("doctorSettings"),
    name: v.optional(v.string()),
    daysOfWeek: v.array(v.number()),
    timeSlots: v.array(
      v.object({
        startTime: v.string(),
        endTime: v.string(),
      })
    ),
    startDate: v.string(),
    endDate: v.string(),
    createdAt: v.number(),
    status: v.union(v.literal("active"), v.literal("archived")),
  })
    .index("by_doctor", ["doctorId"])
    .index("by_doctor_status", ["doctorId", "status"]),

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
    .index("by_status", ["status"])
    .index("by_appointment_type", ["appointmentTypeId"]),

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
    // AI Report Generation tracking
    aiAssisted: v.optional(v.boolean()),
    aiAccepted: v.optional(v.boolean()),
    aiModified: v.optional(v.boolean()),
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
    .index("by_type", ["consentType"])
    .index("by_granted", ["granted"]),

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
    details: v.optional(v.record(v.string(), v.any())),
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
  // Appointment Tokens (Patient Access Links)
  // ---------------------------------------------------------------------------
  appointmentTokens: defineTable({
    tokenHash: v.string(),           // SHA-256 hash of token (never store raw)
    appointmentId: v.id("appointments"),
    patientId: v.id("patients"),
    createdAt: v.number(),
    expiresAt: v.number(),           // Date.now() + 48h TTL
    viewedAt: v.optional(v.number()), // Analytics: first view timestamp
    invalidated: v.optional(v.boolean()), // Cancellation support
  })
    .index("by_token", ["tokenHash"])
    .index("by_appointment", ["appointmentId"])
    .index("by_expiry", ["expiresAt"]),

  // ---------------------------------------------------------------------------
  // GDPR Stats Cache (Performance Optimization)
  // ---------------------------------------------------------------------------
  gdprStatsCache: defineTable({
    computedAt: v.number(),
    totalPatients: v.number(),
    activeConsents: v.number(),
    pendingErasureCount: v.number(),
    patientsWithAllConsents: v.number(),
    erasureApproachingDeadline: v.number(),
    erasureOverdue: v.number(),
    auditLogsByAction: v.array(v.object({
      action: v.string(),
      count: v.number(),
    })),
  }),

  // ---------------------------------------------------------------------------
  // Example Table (from starter)
  // ---------------------------------------------------------------------------
  numbers: defineTable({
    value: v.number(),
  }),

  // ---------------------------------------------------------------------------
  // AI Suggestion Cache (Performance Optimization)
  // ---------------------------------------------------------------------------
  aiSuggestionCache: defineTable({
    cacheKey: v.string(),
    suggestions: v.object({
      restrictions: v.array(v.object({
        code: v.string(),
        category: v.string(),
        description: v.string(),
        duration: v.optional(v.string()),
      })),
    }),
    hitCount: v.number(),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_key", ["cacheKey"])
    .index("by_expires", ["expiresAt"]),
});
