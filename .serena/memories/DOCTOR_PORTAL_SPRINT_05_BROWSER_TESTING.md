# Doctor Portal - Browser-CLI Testing with Browser Agents

**Sprint**: 05 of 06
**Index**: DOCTOR_PORTAL_SPRINT_INDEX
**Depends On**: DOCTOR_PORTAL_SPRINT_01_ROUTING_FIX, DOCTOR_PORTAL_SPRINT_04_TESTING
**Next**: DOCTOR_PORTAL_SPRINT_06_DOCUMENTATION
**Priority**: P1 - HIGH (E2E verification)

---

## Executive Summary

This sprint implements comprehensive E2E tests for the Doctor Portal using the **Browser-CLI tool** and **Browser Agent**. Tests verify the complete user journey from authentication through all portal features.

**Tests Planned**: 24 | **Effort**: 4-6 hours | **Coverage**: All 5 doctor pages

---

## Pre-requisites

1. **Sprint 01 Complete**: Routing fix applied (pages render)
2. **Dev Server Running**: `npm run dev` on port 5175
3. **Browser-CLI Active**: Manager running on port 3456
4. **Test Credentials**: `testdoc@occuhealth.com` / `(TestPass1234`
5. **Saved Auth State**: `authenticated-doctor` state file exists

---

## Test Plan Overview

| Test Suite | Tests | Page | Priority |
|------------|-------|------|----------|
| T1: Authentication | 5 | Auth flow | P0 |
| T2: Navigation | 3 | Layout | P0 |
| T3: Dashboard | 4 | Dashboard | P1 |
| T4: Appointments | 4 | Appointments | P1 |
| T5: Schedule | 4 | Schedule | P1 |
| T6: Reports | 4 | Reports | P1 |
| T7: Settings | 4 | Settings | P2 |

---

## Browser Agent Invocation

Use the **browser agent** via Task tool for complex test sequences:

```
Task tool with subagent_type="browser"
```

---

## Test Suite T1: Authentication Flow

### T1.1 Doctor Login Flow

**Browser Agent Prompt:**
```
Execute doctor login flow:
1. navigate localhost:5175
2. wait 1000
3. snapshot
4. Click "Provider Login" button (bottom-right floating button)
5. Wait for WorkOS redirect
6. Enter credentials: testdoc@occuhealth.com / (TestPass1234
7. Complete authentication
8. Verify redirect to /doctor/dashboard
9. snapshot and screenshot login-success.png
10. Verify sidebar contains "Dashboard", "Appointments", "Schedule", "Reports", "Settings"
```

### T1.2 Token Storage Verification

**Browser-CLI Commands:**
```bash
restoreState authenticated-doctor
navigate /doctor/dashboard
wait 500

# Verify token in localStorage
evaluate 'JSON.parse(localStorage.getItem("workos_doctor_auth"))?.workosUserId ? "has_user_id" : "missing"'
# Expected: "has_user_id"

evaluate 'JSON.parse(localStorage.getItem("workos_doctor_auth"))?.accessToken ? "has_token" : "missing"'
# Expected: "has_token"
```

### T1.3 Auth Guard (Unauthenticated Access)

**Browser-CLI Commands:**
```bash
# Clear state
evaluate 'localStorage.clear(); sessionStorage.clear()'

# Try to access protected route
navigate /doctor/dashboard
wait 1000
snapshot

# Should redirect to landing
evaluate 'window.location.pathname'
# Expected: "/" (landing page)
```

### T1.4 Save Auth State

**Browser-CLI Commands:**
```bash
# After successful login
saveState authenticated-doctor-fresh
listStates
# Should show: authenticated-doctor-fresh
```

### T1.5 Logout Flow

**Browser-CLI Commands:**
```bash
restoreState authenticated-doctor
navigate /doctor/dashboard
wait 500

# Click Sign Out
click "text:Sign Out"
wait 1000

# Verify redirect and token clear
evaluate 'window.location.pathname'
# Expected: "/" or WorkOS logout URL

evaluate 'localStorage.getItem("workos_doctor_auth")'
# Expected: null
```

---

## Test Suite T2: Navigation

### T2.1 Sidebar Structure

**Browser-CLI Commands:**
```bash
restoreState authenticated-doctor
navigate /doctor/dashboard
wait 500
snapshot

# Verify sidebar elements
assert 'a[href="/doctor/dashboard"]' visible
assert 'a[href="/doctor/appointments"]' visible
assert 'a[href="/doctor/schedule"]' visible
assert 'a[href="/doctor/reports"]' visible
assert 'a[href="/doctor/settings"]' visible
assert "text:Sign Out" visible
```

### T2.2 Tab Navigation

**Browser-CLI Commands:**
```bash
restoreState authenticated-doctor
navigate /doctor/dashboard
wait 300

# Navigate via sidebar
click 'a[href="/doctor/appointments"]'
wait 500
evaluate 'window.location.pathname'
# Expected: "/doctor/appointments"

click 'a[href="/doctor/schedule"]'
wait 500
evaluate 'window.location.pathname'
# Expected: "/doctor/schedule"

click 'a[href="/doctor/reports"]'
wait 500
evaluate 'window.location.pathname'
# Expected: "/doctor/reports"

click 'a[href="/doctor/settings"]'
wait 500
evaluate 'window.location.pathname'
# Expected: "/doctor/settings"
```

### T2.3 Active Tab Highlighting

**Browser-CLI Commands:**
```bash
restoreState authenticated-doctor
navigate /doctor/dashboard
wait 500
snapshot

# Check active class on dashboard link
evaluate 'document.querySelector("a[href=\\"/doctor/dashboard\\"]").classList.contains("bg-blue-600")'
# Expected: true

navigate /doctor/appointments
wait 500
evaluate 'document.querySelector("a[href=\\"/doctor/appointments\\"]").classList.contains("bg-blue-600")'
# Expected: true
```

---

## Test Suite T3: Dashboard

### T3.1 Page Renders

**Browser-CLI Commands:**
```bash
restoreState authenticated-doctor
navigate /doctor/dashboard
wait 1000
snapshot

assert "text:Today's Schedule" visible
screenshot T3.1-dashboard.png
```

### T3.2 Stats Cards Display

**Browser-CLI Commands:**
```bash
restoreState authenticated-doctor
navigate /doctor/dashboard
wait 1000
snapshot --full

# Verify stats cards exist
assert "text:Total Today" visible
assert "text:Completed" visible
assert "text:Remaining" visible
```

### T3.3 Appointments List

**Browser-CLI Commands:**
```bash
restoreState authenticated-doctor
navigate /doctor/dashboard
wait 1000
snapshot

# If appointments exist
# assert "text:Join Zoom" visible

# If no appointments
# assert "text:No appointments today" visible
```

### T3.4 Zoom Join Button

**Browser-CLI Commands:**
```bash
restoreState authenticated-doctor
navigate /doctor/dashboard
wait 1000

# Check Zoom link is valid URL
evaluate 'document.querySelector("a[href*=\\"zoom\\"]")?.href || "no zoom link"'
# Expected: Valid Zoom URL or "no zoom link"
```

---

## Test Suite T4: Appointments

### T4.1 Date Picker

**Browser-CLI Commands:**
```bash
restoreState authenticated-doctor
navigate /doctor/appointments
wait 1000
snapshot --forms

# Type date
type 'input[type="date"]' "2026-01-15"
wait 500
snapshot
```

### T4.2 Appointments List by Date

**Browser-CLI Commands:**
```bash
restoreState authenticated-doctor
navigate /doctor/appointments
wait 1000

type 'input[type="date"]' "2026-01-04"
wait 1000
snapshot

# List should update or show empty state
network --filter=appointments
```

### T4.3 Mark Complete Button

**Browser Agent Prompt:**
```
Test mark complete flow:
1. restoreState authenticated-doctor
2. navigate /doctor/appointments
3. wait 1000
4. If appointments exist with "Complete" button:
   - Click the Complete button
   - Wait for mutation to complete
   - Verify button changes to checkmark or disappears
   - Check network for appointments:markCompleted call
5. snapshot after action
6. screenshot T4.3-complete.png
```

### T4.4 Empty State

**Browser-CLI Commands:**
```bash
restoreState authenticated-doctor
navigate /doctor/appointments
wait 500

# Set date far in future (likely no appointments)
type 'input[type="date"]' "2027-12-31"
wait 1000
snapshot

assert "text:No appointments for this date" visible
```

---

## Test Suite T5: Schedule

### T5.1 Slot Grid Display

**Browser-CLI Commands:**
```bash
restoreState authenticated-doctor
navigate /doctor/schedule
wait 1000
snapshot

screenshot T5.1-schedule.png
```

### T5.2 Add Slot Form

**Browser Agent Prompt:**
```
Test add slot flow:
1. restoreState authenticated-doctor
2. navigate /doctor/schedule
3. wait 1000
4. snapshot --forms to see form fields
5. Fill date input with "2026-02-15"
6. Fill start time with "09:00"
7. Fill end time with "09:30"
8. Click "Add Slot" button
9. wait 1000
10. Verify new slot appears in grid
11. Check network for availableSlots:createSlots call
12. screenshot T5.2-add-slot.png
```

### T5.3 Block Slot

**Browser Agent Prompt:**
```
Test block slot flow:
1. restoreState authenticated-doctor
2. navigate /doctor/schedule
3. wait 1000
4. If available slots exist with "Block" button:
   - Click Block button
   - wait 500
   - Verify slot status changes to blocked
   - Check network for availableSlots:blockSlot call
5. snapshot and screenshot
```

### T5.4 Validation

**Browser-CLI Commands:**
```bash
restoreState authenticated-doctor
navigate /doctor/schedule
wait 500

# Try to add slot with invalid times (end before start)
type 'input[type="date"]' "2026-02-15"
type 'input[type="time"]:first-of-type' "10:00"
type 'input[type="time"]:last-of-type' "09:00"

click "text:Add Slot"
wait 500
snapshot

# Should show error message (if validation added in Sprint 03)
```

---

## Test Suite T6: Reports

### T6.1 Reports Page Display

**Browser-CLI Commands:**
```bash
restoreState authenticated-doctor
navigate /doctor/reports
wait 1000
snapshot

screenshot T6.1-reports.png
```

### T6.2 Create Report Dialog

**Browser Agent Prompt:**
```
Test create report dialog:
1. restoreState authenticated-doctor
2. navigate /doctor/reports
3. wait 1000
4. snapshot
5. If "Create Report" button exists:
   - Click it
   - wait 500
   - snapshot (should show dialog)
   - Verify dialog contains:
     - Fitness status dropdown
     - Summary textarea
     - Follow-up checkbox
   - screenshot T6.2-dialog.png
6. Click Cancel or close dialog
```

### T6.3 Submit Report

**Browser Agent Prompt:**
```
Test report submission:
1. restoreState authenticated-doctor
2. navigate /doctor/reports
3. wait 1000
4. If completed appointment exists without report:
   - Click "Create Report" button
   - wait 500
   - Select fitness status (e.g., "Fit for work")
   - Type summary: "Patient healthy. Annual checkup complete."
   - Click "Submit & Send to Employer"
   - wait 1500
   - Verify dialog closes
   - Check network for reports:create and reports:sendToEmployer calls
5. snapshot and screenshot T6.3-submitted.png
```

### T6.4 Empty State

**Browser-CLI Commands:**
```bash
restoreState authenticated-doctor
navigate /doctor/reports
wait 1000
snapshot

# If no appointments awaiting reports
# assert "text:No appointments awaiting reports" visible
```

---

## Test Suite T7: Settings

### T7.1 Profile Display

**Browser-CLI Commands:**
```bash
restoreState authenticated-doctor
navigate /doctor/settings
wait 1000
snapshot

screenshot T7.1-settings.png

# Verify profile elements
assert "text:Profile" visible
```

### T7.2 Zoom Link Input

**Browser-CLI Commands:**
```bash
restoreState authenticated-doctor
navigate /doctor/settings
wait 1000
snapshot --forms

# Check Zoom input exists
evaluate 'document.querySelector("input[placeholder*=\\"zoom\\"]") ? "exists" : "missing"'
```

### T7.3 Save Settings

**Browser Agent Prompt:**
```
Test save settings flow:
1. restoreState authenticated-doctor
2. navigate /doctor/settings
3. wait 1000
4. snapshot --forms
5. Clear zoom link input
6. Type new value: "https://zoom.us/j/test123"
7. Click "Save Changes" or "Save" button
8. wait 1000
9. Verify success message appears (if implemented in Sprint 03)
10. Check network for doctorSettings:update call
11. screenshot T7.3-saved.png
```

### T7.4 URL Validation

**Browser-CLI Commands:**
```bash
restoreState authenticated-doctor
navigate /doctor/settings
wait 500

# Try invalid URL
type 'input[placeholder*="zoom"]' "not-a-valid-url"
click "text:Save"
wait 500
snapshot

# Should show error (if validation implemented)
console  # Check for errors
```

---

## Browser Agent Batch Execution

### Full Test Suite Execution

**Browser Agent Prompt for Complete Run:**
```
Execute comprehensive Doctor Portal test suite:

PHASE 1: Authentication
- Run T1.1 through T1.5
- Save authenticated state for reuse

PHASE 2: Navigation  
- Run T2.1 through T2.3
- Verify all sidebar links work

PHASE 3: Feature Pages
For each page (Dashboard, Appointments, Schedule, Reports, Settings):
- Navigate to page
- Wait for content to load
- Take snapshot
- Verify key elements visible
- Test primary interaction (if applicable)
- Screenshot evidence

PHASE 4: Summary
- Report pass/fail for each test
- List any errors in console
- Save all screenshots to BROWSER-CLI/screenshots/
```

---

## State Management

### Saved States to Create

| State Name | Description | When to Save |
|------------|-------------|--------------|
| `authenticated-doctor` | Fresh doctor login | After T1.1 |
| `authenticated-doctor-fresh` | Updated login | Periodically |

### State Restoration Pattern

Always start tests with:
```bash
restoreState authenticated-doctor
navigate /doctor/dashboard
wait 500
snapshot
```

---

## Evidence Collection

### Screenshot Naming Convention

```
T{suite}.{test}-{description}.png
Examples:
- T1.1-login-success.png
- T3.1-dashboard.png
- T5.2-add-slot.png
```

### Snapshot Archiving

```bash
snapshot --file=T3.1-dashboard-baseline
# Saves to BROWSER-CLI/snapshots/T3.1-dashboard-baseline.txt
```

---

## Console Error Monitoring

After each page navigation:
```bash
assertConsole --level=error
# Fails if any console errors present
```

---

## Network Verification

For mutation tests:
```bash
assertNetwork patients:create --method=POST
assertNetwork appointments:markCompleted
assertNetwork reports:create
```

---

## Test Report Template

After test execution, generate report:

```markdown
# Doctor Portal E2E Test Report
**Date**: {timestamp}
**Duration**: {minutes}

## Summary
| Suite | Passed | Failed | Blocked |
|-------|--------|--------|---------|
| T1: Auth | /5 | | |
| T2: Nav | /3 | | |
| T3: Dashboard | /4 | | |
| T4: Appointments | /4 | | |
| T5: Schedule | /4 | | |
| T6: Reports | /4 | | |
| T7: Settings | /4 | | |

## Failed Tests
(list any failures with screenshots)

## Console Errors
(list any console errors found)

## Network Issues
(list any failed API calls)
```

---

## Acceptance Criteria

- [ ] All 24 tests executed
- [ ] Screenshots saved for each page
- [ ] No console errors
- [ ] Auth state saved and reusable
- [ ] Test report generated

---

→ Next: DOCTOR_PORTAL_SPRINT_06_DOCUMENTATION
