# OccuHealth GDPR Pivot - Schema & Cleanup

**Sprint**: 02 of 06
**Index**: OCCUHEALTH_GDPR_INDEX
**Depends On**: OCCUHEALTH_GDPR_SPRINT_01_OVERVIEW
**Next**: OCCUHEALTH_GDPR_SPRINT_03_AUTH

---

## Files to Delete

```
convex/semble.ts           # Remove entirely
convex/sembleWebhooks.ts   # Remove entirely
```

## Files to Modify

### `convex/http.ts`
- Remove lines 119-248 (Semble webhook handler)
- Keep WorkOS auth routes
- Add employer registration routes (Sprint 03)

### `convex/schema.ts`
- Remove tables: `semblePatients`, `sembleAppointments`, `sembleWebhookEvents`, `questionnaireSubmissions`
- Add new GDPR-compliant tables (below)

### `package.json`
- Remove `"semble:sync"` script

---

## New Schema Tables

### Core Business Tables

```typescript
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
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_workos_user", ["workosUserId"])
.index("by_status", ["status"])

doctorSettings: defineTable({
  workosUserId: v.string(),
  email: v.string(),
  name: v.string(),
  zoomPersonalLink: v.string(),
  createdAt: v.number(),
})
.index("by_workos_user", ["workosUserId"])

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
.index("by_deleted", ["deletedAt"])

appointmentTypes: defineTable({
  name: v.string(),
  description: v.string(),
  durationMinutes: v.number(),
  price: v.number(),
  isActive: v.boolean(),
})
.index("by_active", ["isActive"])

availableSlots: defineTable({
  date: v.string(),
  startTime: v.string(),
  endTime: v.string(),
  status: v.union(v.literal("available"), v.literal("booked"), v.literal("blocked")),
  appointmentId: v.optional(v.id("appointments")),
})
.index("by_date", ["date"])
.index("by_status", ["status"])

appointments: defineTable({
  patientId: v.id("patients"),
  employerId: v.id("employers"),
  appointmentTypeId: v.id("appointmentTypes"),
  slotId: v.id("availableSlots"),
  scheduledDate: v.string(),
  scheduledTime: v.string(),
  status: v.union(
    v.literal("scheduled"), v.literal("confirmed"), v.literal("completed"),
    v.literal("cancelled"), v.literal("no_show")
  ),
  reasonForAppointment: v.optional(v.string()),
  preAppointmentNotes: v.optional(v.string()),
  reportId: v.optional(v.id("reports")),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
  cancelledAt: v.optional(v.number()),
})
.index("by_employer", ["employerId"])
.index("by_date", ["scheduledDate"])
.index("by_status", ["status"])

reports: defineTable({
  appointmentId: v.id("appointments"),
  patientId: v.id("patients"),
  employerId: v.id("employers"),
  fitForWork: v.union(
    v.literal("fit"), v.literal("fit_with_restrictions"),
    v.literal("temporarily_unfit"), v.literal("needs_further_assessment")
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

clinicalNotes: defineTable({
  appointmentId: v.id("appointments"),
  patientId: v.id("patients"),
  findings: v.string(),
  diagnosis: v.optional(v.string()),
  createdAt: v.number(),
})
.index("by_appointment", ["appointmentId"])
```

### GDPR Compliance Tables

```typescript
consents: defineTable({
  patientEmail: v.string(),
  patientId: v.optional(v.id("patients")),
  consentType: v.union(
    v.literal("data_processing"), v.literal("health_data"), v.literal("employer_sharing")
  ),
  granted: v.boolean(),
  grantedAt: v.number(),
  withdrawnAt: v.optional(v.number()),
  consentText: v.string(),
  consentVersion: v.string(),
  collectedByEmployerId: v.id("employers"),
})
.index("by_patient", ["patientId"])
.index("by_type", ["consentType"])

auditLogs: defineTable({
  action: v.string(),
  actorType: v.union(v.literal("employer"), v.literal("doctor"), v.literal("admin"), v.literal("system")),
  actorId: v.optional(v.string()),
  resourceType: v.string(),
  resourceId: v.optional(v.string()),
  timestamp: v.number(),
})
.index("by_action", ["action"])
.index("by_timestamp", ["timestamp"])

erasureRequests: defineTable({
  requesterEmail: v.string(),
  patientId: v.optional(v.id("patients")),
  status: v.union(v.literal("pending"), v.literal("in_progress"), v.literal("completed"), v.literal("rejected")),
  requestedAt: v.number(),
  completedAt: v.optional(v.number()),
  processedBy: v.optional(v.string()),
})
.index("by_status", ["status"])
```

---

## New Backend Files to Create

| File | Purpose |
|------|---------|
| `convex/employers.ts` | CRUD + verification queries/mutations |
| `convex/doctorSettings.ts` | Doctor profile management |
| `convex/patients.ts` | Patient CRUD with consent |
| `convex/appointments.ts` | Booking logic |
| `convex/availableSlots.ts` | Schedule management |
| `convex/reports.ts` | Report creation + delivery |
| `convex/gdpr.ts` | Consent, audit, erasure functions |

---

## Success Criteria

- [ ] Semble files deleted
- [ ] Schema updated with new tables
- [ ] `npm run typecheck` passes
- [ ] `npx convex dev` deploys successfully

→ Next: OCCUHEALTH_GDPR_SPRINT_03_AUTH
