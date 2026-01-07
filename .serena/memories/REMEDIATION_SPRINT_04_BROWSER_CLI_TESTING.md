# Browser-CLI Manual Testing Protocol

**Sprint**: 04 of 04
**Index**: REMEDIATION_INDEX
**Depends On**: Sprint 01, Sprint 02, Sprint 03
**Next**: Complete
**Priority**: P1-VERIFICATION
**Effort**: 1-2 hours
**Purpose**: End-to-end verification of all remediation changes

---

## Pre-Requisites

1. Dev servers running: `npm run dev` (ports 5175 frontend, Convex backend)
2. Browser-CLI available: `npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts`
3. Saved states exist: `authenticated-employer`, `authenticated-admin`
4. Test data: At least 1 pending employer, 1 verified employer, 1 patient with appointments

---

## Test Suite 1: Employer Booking Verification (Sprint 01)

### Test 1.1: Verify Pending Employer Cannot Book (Backend Enforcement)

**Setup**: Use a pending employer account

```bash
# Restore pending employer state (or create one via registration)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts restoreState authenticated-employer-pending

# Navigate to bookings page
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate localhost:5175/employer/bookings
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Verify UI shows disabled state
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assert "text:Booking is disabled" visible
```

**Expected**: "Booking is disabled until your account is verified" message visible

### Test 1.2: Attempt Direct API Booking (Should Fail)

```bash
# Use Convex CLI to attempt booking bypass
npx convex run appointments:book '{
  "patientId": "PATIENT_ID_HERE",
  "employerId": "PENDING_EMPLOYER_ID",
  "appointmentTypeId": "TYPE_ID",
  "slotId": "SLOT_ID"
}'
```

**Expected**: Error response with `code: "EMPLOYER_NOT_VERIFIED"`

### Test 1.3: Verified Employer Can Book Successfully

```bash
# Restore verified employer state
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts restoreState authenticated-employer

# Navigate to bookings
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate localhost:5175/employer/bookings
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Click New Booking button
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:New Booking"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 500
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Verify booking dialog opens (Step 1 of 3)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assert "text:Book Appointment" visible
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assert "text:Step 1" visible
```

**Expected**: Booking dialog opens for verified employer

### Evidence Collection (Sprint 01)

```bash
# Screenshot: Pending employer booking disabled
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot EVIDENCE_SPRINT01_pending_booking_disabled.png

# Screenshot: Verified employer booking enabled
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot EVIDENCE_SPRINT01_verified_booking_enabled.png

# Console log: API rejection
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts console
```

---

## Test Suite 2: GDPR Module Split Verification (Sprint 02)

### Test 2.1: Verify API Paths Still Work

```bash
# Test consent creation (should work via new module path)
npx convex run gdpr:createConsent '{
  "patientEmail": "test@example.com",
  "consentType": "data_processing",
  "consentText": "I consent to data processing",
  "consentVersion": "1.0",
  "collectedByEmployerId": "EMPLOYER_ID"
}'

# Test GDPR stats query
npx convex run gdpr:getGDPRStats '{}'

# Test audit logs
npx convex run gdpr:getAuditLogs '{}'
```

**Expected**: All API calls succeed with same behavior as before refactor

### Test 2.2: Admin GDPR Dashboard Functions

```bash
# Restore admin state
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts restoreState authenticated-admin

# Navigate to GDPR dashboard
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate localhost:5175/admin/gdpr
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1500
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Verify stats load
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assert "text:GDPR Compliance" visible

# Check for data (pending erasures, consent coverage)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot --full
```

**Expected**: Dashboard displays stats correctly, no JavaScript errors

### Test 2.3: Audit Logs Load

```bash
# Navigate to audit logs
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate localhost:5175/admin/gdpr/audit
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Verify logs display
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts console
```

**Expected**: Audit logs load without errors

### Test 2.4: Erasure Processing Functions

```bash
# Navigate to erasure requests
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate localhost:5175/admin/gdpr/erasure
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Verify page loads (even if empty)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assert "text:Erasure Requests" visible
```

**Expected**: Page loads, erasure functionality intact

### Evidence Collection (Sprint 02)

```bash
# Screenshot: GDPR Dashboard working
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot EVIDENCE_SPRINT02_gdpr_dashboard.png

# Screenshot: Audit logs working
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot EVIDENCE_SPRINT02_audit_logs.png

# Console check: No errors
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts console
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assertConsole --level=error
```

---

## Test Suite 3: GDPR Data Export (Sprint 03)

### Test 3.1: Export Patient Data via API

```bash
# Get a patient ID first
npx convex run patients:list '{"employerId": "EMPLOYER_ID"}'

# Export the patient data
npx convex run gdpr:exportPatientData '{"patientId": "PATIENT_ID"}'
```

**Expected**: JSON response with patient, employer, consents, appointments, reports

### Test 3.2: Verify Export Contains Required Fields

Check the export response includes:
- [ ] `exportedAt` - ISO timestamp
- [ ] `patient.firstName`, `lastName`, `email`, `dateOfBirth`
- [ ] `employer.companyName`
- [ ] `consents[]` - Array of consent records
- [ ] `appointments[]` - Array with type name (not ID)
- [ ] `reports[]` - Array with fit-for-work status

### Test 3.3: Verify Audit Log Created

```bash
# Check latest audit logs for export action
npx convex run gdpr:getAuditLogs '{}'
```

**Expected**: Entry with `action: "patient_data_exported"`

### Test 3.4: Verify Non-Admin Cannot Export

```bash
# Using employer credentials (not admin)
# This should fail with authorization error
npx convex run gdpr:exportPatientData '{"patientId": "PATIENT_ID"}'
```

**Expected**: Error with `code: "ADMIN_NOT_FOUND"`

### Evidence Collection (Sprint 03)

```bash
# Save export output to file for evidence
npx convex run gdpr:exportPatientData '{"patientId": "PATIENT_ID"}' > EVIDENCE_SPRINT03_data_export.json

# Screenshot: Audit log showing export
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate localhost:5175/admin/gdpr/audit
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot EVIDENCE_SPRINT03_export_audit_log.png
```

---

## Test Suite 4: Integration & Regression

### Test 4.1: Full Employer Workflow

```bash
# Complete workflow: Login → Dashboard → Employees → Bookings
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts restoreState authenticated-employer
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate localhost:5175/employer/dashboard
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000

# Check all sidebar navigation works
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Employees"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 500
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Bookings"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 500
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Reports"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 500
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot
```

### Test 4.2: Full Admin Workflow

```bash
# Complete admin workflow: GDPR Dashboard → Audit → Erasure → Employers
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts restoreState authenticated-admin
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate localhost:5175/admin
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Navigate through all admin pages
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:GDPR"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 500

npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Employers"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 500
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot
```

### Test 4.3: Console Error Check

```bash
# Final console check for any errors
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts console
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assertConsole --level=error
```

**Expected**: No console errors across all pages

---

## Evidence Checklist

| Sprint | Evidence File | Description | Status |
|--------|---------------|-------------|--------|
| 01 | EVIDENCE_SPRINT01_pending_booking_disabled.png | Pending employer cannot book | [ ] |
| 01 | EVIDENCE_SPRINT01_verified_booking_enabled.png | Verified employer can book | [ ] |
| 02 | EVIDENCE_SPRINT02_gdpr_dashboard.png | GDPR dashboard loads | [ ] |
| 02 | EVIDENCE_SPRINT02_audit_logs.png | Audit logs display | [ ] |
| 03 | EVIDENCE_SPRINT03_data_export.json | Patient data export JSON | [ ] |
| 03 | EVIDENCE_SPRINT03_export_audit_log.png | Export action logged | [ ] |
| ALL | Console output | No JS errors | [ ] |

---

## Pass/Fail Criteria

### Sprint 01: PASS if
- [ ] Pending employers see disabled booking UI
- [ ] Direct API call rejected with `EMPLOYER_NOT_VERIFIED`
- [ ] Verified employers can complete booking flow

### Sprint 02: PASS if
- [ ] All `api.gdpr.*` calls work as before
- [ ] GDPR Dashboard loads with stats
- [ ] Audit logs display correctly
- [ ] No console errors

### Sprint 03: PASS if
- [ ] Export returns complete patient data JSON
- [ ] Export action is audit logged
- [ ] Non-admins cannot export

### Overall: PASS if all 3 sprints pass

---

✓ Final Sprint - Testing Protocol Complete
