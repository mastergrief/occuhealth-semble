# AI Report Generation - Database Schema Discovery

## Overview
Complete database context for AI-assisted report generation feature. All schema tables and relationships documented with implementation patterns for audit logging, GDPR compliance, and caching.

---

## 1. REPORTS TABLE (Primary Table)

**Location**: `convex/schema.ts` (lines 195-217)

### Current Schema
```typescript
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
  .index("by_patient", ["patientId"])
```

### Recommended AI Metadata Fields
- `aiAssisted: v.boolean()` - Whether AI was used in generating this report
- `aiAccepted: v.optional(v.boolean())` - Doctor's acceptance of AI-generated content
- `aiModified: v.optional(v.boolean())` - Whether doctor modified AI suggestions
- `aiModel: v.optional(v.string())` - Model name used (e.g., "gpt-4", "gpt-4-mini")
- `aiInputHash: v.optional(v.string())` - Hash of clinical input for audit trail
- `generatedAt: v.optional(v.number())` - Timestamp of AI generation

### Operations
- **Create**: `reports.create` - Handles initial report creation with doctor auth
- **Mutations**: `sendToEmployer`, `markViewed`, (add AI metadata here)
- **Queries**: `getById`, `getByAppointment`, `listByEmployer`
- **Audit**: Logged via `logReportAction()` helper

---

## 2. CLINICAL NOTES TABLE (Doctor-Only, Protected)

**Location**: `convex/schema.ts` (lines 220-230)

### Current Schema
```typescript
clinicalNotes: defineTable({
  appointmentId: v.id("appointments"),
  patientId: v.id("patients"),
  findings: v.string(),
  diagnosis: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_appointment", ["appointmentId"])
  .index("by_patient", ["patientId"])
```

### Key Characteristics
- **Protected**: Doctor-only data, never sent to employer
- **GDPR**: Redacted during erasure (findings & diagnosis set to "[REDACTED]")
- **Purpose**: Raw clinical input for AI report generation
- **Usage**: AI system reads clinical notes to generate report suggestions
- **Storage**: No mutation file yet - stored directly in schema

### Relationships
- Links to appointments via appointmentId
- Links to patients via patientId
- Each appointment can have ONE clinical note record
- Clinical data is sensitive, only accessible to doctors

---

## 3. AUDIT LOGS TABLE (Compliance & Tracking)

**Location**: `convex/schema.ts` (lines 256-274)

### Current Schema
```typescript
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
  .index("by_resource", ["resourceType", "resourceId"])
```

### Action Types (from codebase)
- `report_created`, `report_sent_to_employer`, `report_viewed`
- `patient_created`, `patient_updated`, `patient_deleted`
- `appointment_booked`, `appointment_completed`, `appointment_cancelled`
- `slot_created`, `slot_blocked`, `slot_unblocked`, `recurring_slots_created`
- `erasure_processed`, `consent_created`, etc.

### Logging Pattern (via helpers)
```typescript
// Location: convex/helpers/auditLogger.ts

// Report logging
await logReportAction(ctx, "report_created", reportId, patientId, {
  appointmentId: args.appointmentId,
  fitForWork: args.fitForWork,
});

// Appointment logging
await logAppointmentAction(ctx, "appointment_booked", appointmentId, patientId, {
  employerId: args.employerId,
  appointmentTypeId: args.appointmentTypeId,
});

// Patient logging
await logPatientAction(ctx, "patient_created", patientId, {
  employerId: args.employerId,
});
```

### AI-Related Audit Actions (New)
- `ai_suggestion_generated` - AI system generated suggestions
- `ai_content_accepted` - Doctor accepted AI-generated content
- `ai_content_modified` - Doctor modified AI suggestions
- `ai_report_completed` - Final report using AI assistance

---

## 4. APPOINTMENTS TABLE (Context Loading)

**Location**: `convex/schema.ts` (lines 165-192)

### Current Schema
```typescript
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
  .index("by_appointment_type", ["appointmentTypeId"])
```

### AI Integration Points
- `reasonForAppointment` - Context for AI report generation
- `preAppointmentNotes` - Additional patient notes for AI input
- `reportId` - Bidirectional link to reports table
- Status `"completed"` indicates appointment is ready for report

### Operations
- `book()` - Creates appointment, locks slot atomically
- `markCompleted()` - Doctor marks appointment complete
- `cancel()` - Releases slot back to available
- `updateStatus()` - Employer can change status

---

## 5. PATIENTS TABLE (Context Loading)

**Location**: `convex/schema.ts` (lines 89-107)

### Current Schema
```typescript
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
  .index("by_deleted", ["deletedAt"])
```

### AI Integration Points
- `firstName`, `lastName` - Patient context for AI
- `jobTitle`, `department` - Occupational health context for AI
- `dateOfBirth` - Age context for medical assessments
- `deletedAt` - GDPR soft-delete flag (filter in queries)

### Operations
- `list()` - Paginated list by employer (filters deletedAt)
- `getById()` - Single patient fetch with auth check
- `create()` - Creates with mandatory consent reference
- `softDelete()` - GDPR erasure (redacts PII, sets deletedAt)

---

## 6. GDPR STATS CACHE TABLE (Performance Optimization)

**Location**: `convex/schema.ts` (lines 313-327)

### Current Schema
```typescript
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
})
```

### Cache Pattern (from `convex/scheduled/gdprStatsCache.ts`)
- **Cron Job**: Runs every 5 minutes via `crons.ts`
- **Strategy**: Single cache entry (old entries deleted before insert)
- **Bounded Queries**: Uses `.take()` to prevent unbounded collection
  - `patients.take(50000)` - Total patient count
  - `consents.take(10000)` - Active consents
  - `auditLogs.take(5000)` - Recent audit logs (7 days)
- **TTL**: Implicit via cron (5-minute freshness)

### AI Cache Table Pattern (Recommended)
```typescript
aiSuggestionsCache: defineTable({
  appointmentId: v.id("appointments"),
  patientId: v.id("patients"),
  clinicalInputHash: v.string(),
  suggestions: v.object({
    fitForWork: v.string(),
    summaryBullets: v.array(v.string()),
    restrictions: v.array(v.string()),
    followUpRecommendations: v.array(v.string()),
  }),
  generatedAt: v.number(),
  expiresAt: v.number(), // TTL for cache invalidation
})
  .index("by_appointment", ["appointmentId"])
  .index("by_expiry", ["expiresAt"])
```

---

## 7. OTHER RELATED TABLES

### Appointment Types
- `appointmentTypes` - Defines appointment categories (Initial Assessment, Follow-up, etc.)
- Used for scheduling and report categorization

### Available Slots
- `availableSlots` - Doctor availability scheduling
- Linked to appointments when booked
- Status: "available", "booked", "blocked"

### Recurring Slot Templates
- `recurringSlotTemplates` - Doctor can define recurring availability
- Auto-generates slots via cron job

### Consents (GDPR)
- `consents` - Tracks patient consent for data processing
- Three types: `data_processing`, `health_data`, `employer_sharing`
- Required before patient creation

### Erasure Requests (GDPR)
- `erasureRequests` - GDPR Article 17 (Right to Erasure) requests
- Admin-only processing via `gdpr.processErasure`
- Redacts all data: appointments, reports, clinical notes, consents

### Appointment Tokens (Patient Access)
- `appointmentTokens` - Magic link access for patients to view reports
- Token hash stored (never raw token)
- 48-hour TTL with expiry index

---

## 8. AUDIT LOGGING PATTERNS

**Location**: `convex/helpers/auditLogger.ts`

### Helper Functions
```typescript
logPatientAction(ctx, action, patientId, details)
logReportAction(ctx, action, reportId, patientId, details)
logAppointmentAction(ctx, action, appointmentId, patientId, details)
logSlotAction(ctx, action, slotId, doctorId, details)
```

### Actor Detection
- Auto-detects actorType from auth context (employer/doctor/admin/system)
- Extracts actorId from identity subject
- Falls back to "system" if no identity

### Internal Mutation
- All logging delegated to `internal.gdpr.logAction`
- Centralized in `convex/gdprModules/audit.ts`
- Allows cross-database audit trail without circular dependencies

---

## 9. KEY INDEXES FOR AI QUERIES

### Reports Table
- `by_employer` - Fast lookup for employer dashboard
- `by_appointment` - Load report from appointment context
- `by_patient` - Historical reports for patient (for ML training context)

### Clinical Notes Table
- `by_appointment` - One note per appointment
- `by_patient` - Load all notes for patient context

### Audit Logs Table
- `by_action` - Filter by action type (report_created, etc.)
- `by_timestamp` - Range queries for audit windows
- `by_resource` - Find all logs for specific resource

### Patients Table
- `by_employer` - Pagination of patients
- `by_email` - Quick lookup for duplicate checks
- `by_deleted` - Filter soft-deleted (GDPR compliance)

---

## 10. SCHEMA DESIGN PRINCIPLES

### GDPR Compliance
- **Soft Delete**: `deletedAt` field used instead of hard delete
- **Audit Trail**: Every action logged with actor, timestamp, details
- **Redaction**: Sensitive data redacted during erasure, not deleted
- **Data Minimization**: No unnecessary fields stored

### Referential Integrity
- All foreign keys use Convex `v.id()` types
- No CASCADE deletes - manual redaction via erasure process
- Bidirectional links (e.g., appointment.reportId, report.appointmentId)

### Performance
- Indexes on commonly filtered fields (by_employer, by_status, by_date)
- Bounded queries with `.take()` for large datasets
- Pagination for list queries

### Audit & Compliance
- `timestamp` in UTC milliseconds (Date.now())
- Actor info tracked for all mutations
- Resource types: patient, report, appointment, slot, erasureRequest, consent
- Details object for flexible metadata

---

## 11. DATA LOADING PATTERNS (For AI Input)

### Load Report Context
```typescript
const appointment = await ctx.db.get(appointmentId);
const patient = await ctx.db.get(appointment.patientId);
const clinicalNotes = await ctx.db
  .query("clinicalNotes")
  .withIndex("by_appointment", q => q.eq("appointmentId", appointmentId))
  .first();
```

### Batch Load (Avoiding N+1)
```typescript
// From patients.ts, appointments.ts, reports.ts
const patientIds = extractUniqueIds(results, r => r.patientId);
const patientMap = await batchGet(ctx, patientIds);
```

### Historical Context
```typescript
// For ML training or trend analysis
const previousReports = await ctx.db
  .query("reports")
  .withIndex("by_patient", q => q.eq("patientId", patientId))
  .collect();
```

---

## 12. AI INTEGRATION CHECKLIST

### Schema Updates Needed
- [ ] Add `aiAssisted`, `aiAccepted`, `aiModified` to reports table
- [ ] Add `aiModel`, `aiInputHash`, `generatedAt` to reports table
- [ ] Create `aiSuggestionsCache` table for caching AI responses
- [ ] Add `aiGenerationLog` action type to audit logging

### Queries to Create
- [ ] `aiSuggestions.generate` - Call LLM with clinical context
- [ ] `aiSuggestions.getCached` - Check cache before regenerating
- [ ] `reports.getWithAIContext` - Load report + clinical notes + patient

### Mutations to Create
- [ ] `reports.acceptAISuggestions` - Doctor accepts AI content
- [ ] `reports.modifyAISuggestions` - Doctor modifies AI content
- [ ] Log AI-related actions in audit trail

### Caching Strategy
- Hash clinical input + appointment context
- Cache suggestions for 24 hours
- Invalidate on clinical note updates
- Use `.take()` to avoid timeouts on cache queries

---

## File Locations Reference

| File | Purpose |
|------|---------|
| `convex/schema.ts` | Full schema definition (335 lines) |
| `convex/reports.ts` | Report CRUD operations |
| `convex/appointments.ts` | Appointment booking & management |
| `convex/patients.ts` | Patient/employee management |
| `convex/gdprModules/erasure.ts` | GDPR erasure implementation |
| `convex/helpers/auditLogger.ts` | Audit logging patterns |
| `convex/scheduled/gdprStatsCache.ts` | Cache update cron job |
| `convex/gdprModules/audit.ts` | Internal audit mutation |

---

## Summary Statistics

- **Tables in use**: 19 (8 auth/system, 11 business)
- **Report-related tables**: 5 (reports, clinicalNotes, appointments, patients, auditLogs)
- **Indexes**: 30+ across all tables
- **Audit actions tracked**: 15+
- **GDPR-specific features**: Soft delete, redaction, consent tracking, erasure requests

