# GDPR Data Export Implementation (Article 20)

**Sprint**: 03 of 04
**Index**: REMEDIATION_INDEX
**Depends On**: REMEDIATION_SPRINT_02_GDPR_MODULE_SPLIT
**Next**: REMEDIATION_SPRINT_04_BROWSER_CLI_TESTING
**Priority**: P2-MEDIUM_TERM
**Effort**: 4 hours
**Risk**: LOW (new feature, no breaking changes)

---

## Problem Statement

GDPR Article 20 requires data portability - users must be able to request their personal data in a portable, machine-readable format. Currently, OccuHealth has no endpoint to export user data.

**Compliance Gap**: Article 20 (Right to data portability) not implemented
**Impact**: Cannot fulfill data portability requests from patients

---

## Requirements

1. Export patient data in JSON format
2. Include all related data (appointments, reports, consents)
3. Exclude internal IDs where possible, use human-readable references
4. Audit log the export request
5. Admin-only access (patient requests via admin)

---

## Data to Export

```typescript
interface PatientDataExport {
  exportedAt: string;  // ISO timestamp
  patient: {
    firstName: string;
    lastName: string;
    email: string;
    dateOfBirth: string;
    jobTitle?: string;
    department?: string;
    employeeReference?: string;
  };
  employer: {
    companyName: string;
    companyType: string;
  };
  consents: Array<{
    type: "data_processing" | "health_data" | "employer_sharing";
    granted: boolean;
    grantedAt?: string;
    withdrawnAt?: string;
  }>;
  appointments: Array<{
    date: string;
    time: string;
    type: string;
    status: string;
    reason?: string;
  }>;
  reports: Array<{
    date: string;
    fitForWork: string;
    summary: string;
    restrictions?: string[];
    followUpRequired: boolean;
  }>;
}
```

---

## Implementation Plan

### Step 1: Add export query to gdprModules/

**File**: `convex/gdprModules/export.ts` (NEW)

```typescript
// convex/gdprModules/export.ts
import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../authModules";
import { internal } from "../_generated/api";

export const exportPatientData = query({
  args: {
    patientId: v.id("patients"),
  },
  handler: async (ctx, args) => {
    // 1. Verify admin access
    await requireAdmin(ctx);

    // 2. Fetch patient
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.deletedAt) {
      return null;
    }

    // 3. Fetch related data
    const employer = await ctx.db.get(patient.employerId);
    const consents = await ctx.db
      .query("consents")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
    
    // 4. Fetch appointment types for human-readable names
    const typeIds = [...new Set(appointments.map(a => a.appointmentTypeId))];
    const types = await Promise.all(typeIds.map(id => ctx.db.get(id)));
    const typeMap = new Map(types.filter(Boolean).map(t => [t!._id, t!.name]));

    // 5. Fetch reports
    const reports = await Promise.all(
      appointments.map(a => 
        ctx.db.query("reports")
          .withIndex("by_appointment", (q) => q.eq("appointmentId", a._id))
          .first()
      )
    );

    // 6. Build export structure
    return {
      exportedAt: new Date().toISOString(),
      patient: {
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        dateOfBirth: patient.dateOfBirth,
        jobTitle: patient.jobTitle,
        department: patient.department,
        employeeReference: patient.employeeReference,
      },
      employer: {
        companyName: employer?.companyName ?? "Unknown",
        companyType: employer?.companyType ?? "Unknown",
      },
      consents: consents.map(c => ({
        type: c.consentType,
        granted: c.granted,
        grantedAt: c.grantedAt ? new Date(c.grantedAt).toISOString() : undefined,
        withdrawnAt: c.withdrawnAt ? new Date(c.withdrawnAt).toISOString() : undefined,
      })),
      appointments: appointments.map(a => ({
        date: new Date(a.scheduledAt).toISOString().split("T")[0],
        time: new Date(a.scheduledAt).toISOString().split("T")[1].slice(0, 5),
        type: typeMap.get(a.appointmentTypeId) ?? "Unknown",
        status: a.status,
        reason: a.reasonForAppointment,
      })),
      reports: reports.filter(Boolean).map(r => ({
        date: new Date(r!.createdAt).toISOString().split("T")[0],
        fitForWork: r!.fitForWork,
        summary: r!.summary,
        restrictions: r!.restrictions,
        followUpRequired: r!.followUpRequired,
      })),
    };
  },
});
```

### Step 2: Update gdprModules/index.ts

```typescript
// Add to existing exports
export { exportPatientData } from "./export";
```

### Step 3: Update gdpr.ts facade

```typescript
// Add to re-exports
export { exportPatientData } from "./gdprModules";
```

### Step 4: Add audit logging for exports

In `exportPatientData`, after building the export:

```typescript
// Log the export for audit trail
await ctx.runMutation(internal.gdpr.logAction, {
  action: "patient_data_exported",
  actorType: "admin",
  actorId: admin.workosUserId,
  resourceType: "patient",
  resourceId: args.patientId,
  details: { exportedFields: Object.keys(exportData) },
});
```

### Step 5: Add admin UI (optional)

**File**: `src/pages/admin/ErasureRequests.tsx` - Add "Export Data" button per patient

```tsx
<Button 
  variant="outline" 
  onClick={() => handleExportData(patientId)}
>
  Export Data (GDPR Art. 20)
</Button>
```

---

## Acceptance Criteria

- [ ] `api.gdpr.exportPatientData` query returns complete patient data
- [ ] Export includes: patient info, employer, consents, appointments, reports
- [ ] Internal IDs excluded, human-readable values used
- [ ] Only admins can call the export function
- [ ] Export action is audit logged
- [ ] Deleted patients return `null`
- [ ] TypeScript compiles without errors

---

## Test Scenarios

### API Test
```bash
# Export patient data (admin only)
npx convex run gdpr:exportPatientData '{"patientId": "j57..."}'
```

### Manual Test (Browser-CLI)
See Sprint 04 for detailed Browser-CLI test commands.

---

## Compliance Notes

- **Article 20(1)**: Data provided in "structured, commonly used and machine-readable format" ✓ (JSON)
- **Article 20(2)**: Right to transmit data to another controller ✓ (downloadable JSON)
- **Article 12(3)**: Response within 30 days ✓ (immediate export)

---

→ Next: REMEDIATION_SPRINT_04_BROWSER_CLI_TESTING
