# OccuHealth GDPR Pivot - Admin & GDPR Compliance

**Sprint**: 06 of 06
**Index**: OCCUHEALTH_GDPR_INDEX
**Depends On**: OCCUHEALTH_GDPR_SPRINT_04_EMPLOYER, OCCUHEALTH_GDPR_SPRINT_05_DOCTOR
**Next**: Complete

---

## Admin Portal Enhancements

### New Routes

```
/admin/employers        - Employer verification queue
/admin/employers/:id    - Employer detail/verify
/admin/gdpr             - GDPR compliance dashboard
/admin/gdpr/erasure     - Erasure request processing
/admin/gdpr/audit       - Audit log viewer
```

---

## Employer Verification

### `src/pages/admin/EmployerVerification.tsx`

**Queue View:**
- List all employers with `status: "pending"`
- Show: company name, registration number, contact, created date
- Action buttons: "Verify" | "Reject"

**Detail View:**
- Full company details
- Registration number (manual lookup at Companies House)
- Approve with click OR reject with reason

### `convex/employers.ts` (Admin Functions)

```typescript
export const listPending = query({
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return ctx.db.query("employers")
      .withIndex("by_status", q => q.eq("status", "pending"))
      .collect();
  },
});

export const verify = mutation({
  args: { employerId: v.id("employers") },
  handler: async (ctx, { employerId }) => {
    const admin = await requireAdmin(ctx);
    await ctx.db.patch(employerId, {
      status: "verified",
      verifiedAt: Date.now(),
      verifiedBy: admin._id,
    });
    await logAction(ctx, "employer_verified", "employer", employerId);
  },
});

export const reject = mutation({
  args: { 
    employerId: v.id("employers"),
    reason: v.string(),
  },
  handler: async (ctx, { employerId, reason }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(employerId, {
      status: "rejected",
      rejectionReason: reason,
    });
    await logAction(ctx, "employer_rejected", "employer", employerId);
  },
});
```

---

## GDPR Dashboard

### `src/pages/admin/GDPRDashboard.tsx`

**Stats Cards:**
- Total patients
- Active consents
- Pending erasure requests
- Recent audit events

**Quick Links:**
- Process erasure requests
- View audit log
- Export compliance report

---

## Erasure Request Processing

### `convex/gdpr.ts`

```typescript
// Patient can request erasure via email/form
export const requestErasure = mutation({
  args: { patientEmail: v.string() },
  handler: async (ctx, { patientEmail }) => {
    // Find patient by email
    const patient = await ctx.db.query("patients")
      .filter(q => q.eq(q.field("email"), patientEmail))
      .first();
    
    return ctx.db.insert("erasureRequests", {
      requesterEmail: patientEmail,
      patientId: patient?._id,
      status: "pending",
      requestedAt: Date.now(),
    });
  },
});

// Admin processes the request
export const processErasure = mutation({
  args: { requestId: v.id("erasureRequests") },
  handler: async (ctx, { requestId }) => {
    const admin = await requireAdmin(ctx);
    const request = await ctx.db.get(requestId);
    if (!request?.patientId) throw new Error("Patient not found");
    
    // Soft delete patient (redact PII)
    await ctx.db.patch(request.patientId, {
      firstName: "[REDACTED]",
      lastName: "[REDACTED]",
      email: "[REDACTED]",
      phone: "[REDACTED]",
      dateOfBirth: "[REDACTED]",
      deletedAt: Date.now(),
    });
    
    // Mark request complete
    await ctx.db.patch(requestId, {
      status: "completed",
      completedAt: Date.now(),
      processedBy: admin._id,
    });
    
    await logAction(ctx, "erasure_completed", "patient", request.patientId);
  },
});
```

**Note:** Reports are NOT deleted (8-year retention for medical records), but patient name is redacted.

---

## Audit Logging

### Helper Function

```typescript
// convex/gdpr.ts
export async function logAction(
  ctx: MutationCtx,
  action: string,
  resourceType: string,
  resourceId?: string
) {
  const actorId = await getActorId(ctx); // From auth context
  const actorType = await getActorType(ctx);
  
  await ctx.db.insert("auditLogs", {
    action,
    actorType,
    actorId,
    resourceType,
    resourceId,
    timestamp: Date.now(),
  });
}
```

### Logged Actions

| Action | When |
|--------|------|
| `patient_created` | Employee added by employer |
| `patient_viewed` | Doctor views patient details |
| `patient_deleted` | Erasure processed |
| `appointment_booked` | Employer books slot |
| `appointment_cancelled` | Cancelled by any party |
| `appointment_completed` | Doctor marks done |
| `report_created` | Doctor creates report |
| `report_sent` | Doctor sends to employer |
| `report_viewed` | Employer views report |
| `consent_granted` | During booking |
| `consent_withdrawn` | If patient withdraws |
| `erasure_completed` | Admin processes request |
| `employer_verified` | Admin approves |

---

## Consent Management

### Required Consents (Before Booking)

1. **data_processing** - Basic GDPR consent for processing personal data
2. **health_data** - Special category consent for medical information
3. **employer_sharing** - Consent to share report with employer

### Consent Text Versioning

```typescript
const CONSENT_TEXTS = {
  data_processing: {
    version: "1.0",
    text: "I consent to OccuHealth processing my personal data for the purpose of arranging and conducting my occupational health appointment.",
  },
  health_data: {
    version: "1.0", 
    text: "I consent to the collection and processing of health information during my occupational health assessment.",
  },
  employer_sharing: {
    version: "1.0",
    text: "I consent to sharing the fitness-for-work outcome with my employer/insurer. Clinical details will NOT be shared.",
  },
};
```

---

## Data Export (Portability)

```typescript
export const exportPatientData = action({
  args: { patientId: v.id("patients") },
  handler: async (ctx, { patientId }) => {
    await requireAdmin(ctx);
    
    const patient = await ctx.runQuery(internal.patients.get, { patientId });
    const consents = await ctx.runQuery(internal.consents.getByPatient, { patientId });
    const appointments = await ctx.runQuery(internal.appointments.getByPatient, { patientId });
    const reports = await ctx.runQuery(internal.reports.getByPatient, { patientId });
    
    return {
      exportDate: new Date().toISOString(),
      dataController: "OccuHealth Ltd",
      personalData: {
        name: `${patient.firstName} ${patient.lastName}`,
        email: patient.email,
        dateOfBirth: patient.dateOfBirth,
      },
      consents: consents.map(c => ({
        type: c.consentType,
        grantedAt: c.grantedAt,
        text: c.consentText,
      })),
      appointments: appointments.map(a => ({
        date: a.scheduledDate,
        status: a.status,
      })),
      reports: reports.map(r => ({
        date: r.signedAt,
        outcome: r.fitForWork,
        summary: r.summary,
      })),
    };
  },
});
```

---

## Success Criteria

- [ ] Admin can view pending employers
- [ ] Admin can verify/reject employers
- [ ] Erasure requests can be processed
- [ ] Audit log captures all sensitive actions
- [ ] Data export works for patient portability

✓ Final Sprint - Implementation Complete
