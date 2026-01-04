# Doctor Portal Browser Agent Audit Plan

**Version**: 1.0  
**Created**: 2026-01-04  
**Purpose**: Comprehensive browser-cli testing plan to audit doctor portal functionality

---

## Overview

This plan provides step-by-step browser agent commands to systematically test every feature of the doctor portal, documenting what works, what's broken, and what's missing.

**Test Credentials**:
- Email: `testdoc@occuhealth.com`
- Password: `(TestPass1234`

**Portal URL**: `http://localhost:5175/doctor`

---

## Pre-Test Setup

```bash
# 1. Verify dev server running
lsof -ti:5175

# 2. Start browser and navigate
navigate http://localhost:5175
wait 1000
snapshot

# 3. Authenticate as doctor (if not already)
# Check if already on doctor portal or need to login
```

---

## Test Suite 1: Authentication & Layout

### T1.1 - Doctor Login Flow
```bash
# Start fresh
navigate http://localhost:5175
wait 500
snapshot

# Click Provider Login
click "text:Provider Login"
wait 2000
snapshot

# Enter credentials
type "input[type='email']" "testdoc@occuhealth.com"
click "text:Continue"
wait 1000
snapshot

# Enter password
type "input[type='password']" "(TestPass1234"
click "text:Sign in"
wait 3000
snapshot
screenshot doctor-login-result.png

# VERIFY:
# ✅ URL should be /doctor or /doctor/dashboard
# ✅ Sidebar visible with doctor name
# ✅ No console errors
console
```

**Expected Results**:
| Check | Expected | Status |
|-------|----------|--------|
| Final URL | `/doctor` or `/doctor/dashboard` | |
| Sidebar visible | Yes - with "Dr. {name}" | |
| Navigation links | 5 tabs visible | |
| Console errors | None | |

### T1.2 - Sidebar Navigation Structure
```bash
# Verify all navigation elements present
snapshot --full

# VERIFY these refs exist:
# - Dashboard link
# - Appointments link  
# - Schedule link
# - Reports link
# - Settings link
# - Sign Out button
```

**Expected Sidebar Elements**:
| Element | Icon | Route |
|---------|------|-------|
| Dashboard | LayoutDashboard | `/doctor/dashboard` |
| Appointments | Calendar | `/doctor/appointments` |
| Schedule | Clock | `/doctor/schedule` |
| Reports | FileText | `/doctor/reports` |
| Settings | Settings | `/doctor/settings` |
| Sign Out | LogOut | (logout action) |

### T1.3 - Auth Token Storage
```bash
# Check localStorage for correct key
evaluate 'Object.keys(localStorage).filter(k => k.includes("workos"))'

# VERIFY:
# ✅ Should contain "workos_doctor_auth"
# ❌ Should NOT be using "workos_admin_auth"

evaluate 'JSON.parse(localStorage.getItem("workos_doctor_auth") || "{}")'
```

---

## Test Suite 2: Dashboard Tab

### T2.1 - Dashboard Load & Stats
```bash
# Navigate to dashboard
click 'a[href="/doctor/dashboard"]'
wait 1000
snapshot
screenshot doctor-dashboard.png

# VERIFY:
# ✅ 3 stat cards visible (Total Today, Completed, Remaining)
# ✅ Today's appointments list OR empty state
console
network --filter=appointments
```

**Expected Dashboard Elements**:
| Element | Content |
|---------|---------|
| Stats Card 1 | "Total Today" with count |
| Stats Card 2 | "Completed" (green) with count |
| Stats Card 3 | "Remaining" (blue) with count |
| Appointments List | Today's appointments OR "No appointments today" |

### T2.2 - Dashboard Appointment Display
```bash
# If appointments exist, verify structure
snapshot --full

# Each appointment should show:
# - Time
# - Patient ID
# - Status badge
# - Join Zoom button (if scheduled and zoom link set)
```

### T2.3 - Zoom Integration
```bash
# Check if Join Zoom button appears for scheduled appointments
# Button should link to doctor's zoomPersonalLink

evaluate 'document.querySelector("a[href*=zoom]")?.href'
```

---

## Test Suite 3: Appointments Tab

### T3.1 - Appointments Page Load
```bash
# Navigate to appointments
click 'a[href="/doctor/appointments"]'
wait 1000
snapshot
screenshot doctor-appointments.png

# VERIFY:
# ✅ Date picker visible (defaults to today)
# ✅ Appointments list OR empty state
console
network --filter=listByDate
```

### T3.2 - Date Selection
```bash
# Get current date input value
evaluate 'document.querySelector("input[type=date]")?.value'

# Change to different date
type "input[type='date']" "2026-01-10"
wait 1000
snapshot

# VERIFY:
# ✅ Query refetches with new date
# ✅ List updates accordingly
network --filter=listByDate
```

### T3.3 - Appointment Details Display
```bash
# Each appointment should show:
snapshot --full

# VERIFY for each appointment:
# - Patient name (firstName lastName)
# - Appointment time
# - Company name
# - Reason (if provided)
# - Status badge (scheduled=blue, completed=green)
# - Complete button (only on scheduled)
```

### T3.4 - Mark Appointment Complete
```bash
# Find a scheduled appointment and click Complete
# (Only run if scheduled appointment exists)

click "text:Complete"
wait 1000
snapshot

# VERIFY:
# ✅ Mutation fires: appointments:markCompleted
# ✅ Status badge changes to green "completed"
# ✅ Complete button disappears
network --filter=markCompleted
console
```

---

## Test Suite 4: Schedule Tab

### T4.1 - Schedule Page Load
```bash
# Navigate to schedule
click 'a[href="/doctor/schedule"]'
wait 1000
snapshot
screenshot doctor-schedule.png

# VERIFY:
# ✅ Add Time Slot form visible
# ✅ Date, start time, end time inputs
# ✅ Add Slot button
# ✅ Slots grid OR empty state
console
network --filter=getByDateRange
```

### T4.2 - Add Time Slot Form
```bash
# Fill out add slot form
type "input[type='date']" "2026-01-15"
type "input[type='time']:first-of-type" "09:00"
type "input[type='time']:last-of-type" "09:30"
snapshot --forms

# Click Add Slot
click "text:Add Slot"
wait 1000
snapshot

# VERIFY:
# ✅ Mutation fires: availableSlots:createSlots
# ✅ New slot appears in grid
# ✅ Slot shows as "available" (green)
network --filter=createSlots
console
```

### T4.3 - Slot Status Display
```bash
# Verify slot color coding
snapshot --full

# VERIFY slot colors:
# - Available: green background
# - Booked: blue background  
# - Blocked: gray background
```

### T4.4 - Block Slot
```bash
# Find an available slot and block it
click "text:Block"
wait 1000
snapshot

# VERIFY:
# ✅ Mutation fires: availableSlots:blockSlot
# ✅ Slot changes to gray "blocked"
# ✅ Block button disappears
network --filter=blockSlot
console
```

---

## Test Suite 5: Reports Tab

### T5.1 - Reports Page Load
```bash
# Navigate to reports
click 'a[href="/doctor/reports"]'
wait 1000
snapshot
screenshot doctor-reports.png

# VERIFY:
# ✅ List of completed appointments awaiting reports
# ✅ OR empty state "No appointments awaiting reports"
console
network --filter=getTodaysAppointments
```

### T5.2 - Create Report Dialog
```bash
# Click Create Report on a completed appointment
click "text:Create Report"
wait 500
snapshot
screenshot doctor-report-dialog.png

# VERIFY dialog contains:
# ✅ Fitness Assessment dropdown (4 options)
# ✅ Summary textarea
# ✅ Follow-up required checkbox
# ✅ Submit & Send to Employer button
# ✅ Cancel button
```

### T5.3 - Report Form Interaction
```bash
# Fill out report form
selectOption "select" "fit_with_restrictions"
type "textarea" "Patient is fit for work with minor restrictions. Recommend ergonomic assessment."
click "input[type='checkbox']"
wait 300
snapshot

# Follow-up notes should appear
type "textarea:nth-of-type(2)" "Review in 3 months. Monitor RSI symptoms."
snapshot --forms
```

### T5.4 - Submit Report
```bash
# Submit the report
click "text:Submit & Send to Employer"
wait 2000
snapshot

# VERIFY:
# ✅ reports:create mutation fires
# ✅ reports:sendToEmployer mutation fires
# ✅ Dialog closes
# ✅ Appointment removed from list
network --filter=reports
console
```

---

## Test Suite 6: Settings Tab

### T6.1 - Settings Page Load
```bash
# Navigate to settings
click 'a[href="/doctor/settings"]'
wait 1000
snapshot
screenshot doctor-settings.png

# VERIFY:
# ✅ Profile section with name and email (read-only)
# ✅ Zoom Settings section with editable link
# ✅ Save Changes button
console
```

### T6.2 - Profile Display
```bash
# Verify profile info displayed
snapshot --full

# VERIFY:
# - Doctor name shown as "Dr. {name}"
# - Email address displayed
# - Both fields are read-only
```

### T6.3 - Update Zoom Link
```bash
# Update Zoom personal meeting link
type "input[placeholder*='zoom']" "https://zoom.us/j/1234567890"
click "text:Save Changes"
wait 1000
snapshot

# VERIFY:
# ✅ doctorSettings:update mutation fires
# ✅ Success feedback shown
# ✅ Value persisted (refresh and check)
network --filter=doctorSettings
console
```

### T6.4 - Persistence Check
```bash
# Refresh and verify Zoom link persisted
navigate http://localhost:5175/doctor/settings
wait 1000
snapshot

# Check input value
evaluate 'document.querySelector("input[placeholder*=zoom]")?.value'
```

---

## Test Suite 7: Logout Flow

### T7.1 - Sign Out
```bash
# Click Sign Out
click "text:Sign Out"
wait 2000
snapshot
screenshot doctor-logout-result.png

# VERIFY:
# ✅ Redirects to landing page (/)
# ✅ localStorage cleared (workos_doctor_auth removed)
# ✅ No WorkOS error page

evaluate 'localStorage.getItem("workos_doctor_auth")'
```

---

## Test Suite 8: Error Handling & Edge Cases

### T8.1 - Empty States
```bash
# Test each page with no data
# Dashboard: No appointments today
# Appointments: No appointments for selected date
# Schedule: No slots for selected date
# Reports: No appointments awaiting reports

# Navigate to each and verify empty state messages
```

### T8.2 - Network Errors
```bash
# Check console for any failed requests
console --level=error
network --status=400
network --status=500
```

### T8.3 - Auth Guard
```bash
# Test accessing doctor routes without auth
# First logout
click "text:Sign Out"
wait 1000

# Try direct navigation
navigate http://localhost:5175/doctor/dashboard
wait 1000
snapshot

# VERIFY:
# ✅ Redirects to landing page
# ✅ Does NOT show doctor content
```

---

## Results Template

### Feature Status Matrix

| Feature | Tab | Status | Notes |
|---------|-----|--------|-------|
| **Authentication** | | | |
| Doctor login flow | Auth | ⬜ | |
| Token storage (correct key) | Auth | ⬜ | |
| Auth guard (redirect if not auth) | Auth | ⬜ | |
| Logout flow | Auth | ⬜ | |
| **Dashboard** | | | |
| Stats cards display | Dashboard | ⬜ | |
| Today's appointments list | Dashboard | ⬜ | |
| Zoom join button | Dashboard | ⬜ | |
| Empty state | Dashboard | ⬜ | |
| **Appointments** | | | |
| Date picker | Appointments | ⬜ | |
| Appointments list | Appointments | ⬜ | |
| Patient/company details | Appointments | ⬜ | |
| Mark complete | Appointments | ⬜ | |
| Status badges | Appointments | ⬜ | |
| Empty state | Appointments | ⬜ | |
| **Schedule** | | | |
| Add slot form | Schedule | ⬜ | |
| Create slot mutation | Schedule | ⬜ | |
| Slots grid display | Schedule | ⬜ | |
| Slot status colors | Schedule | ⬜ | |
| Block slot | Schedule | ⬜ | |
| Empty state | Schedule | ⬜ | |
| **Reports** | | | |
| Completed appointments list | Reports | ⬜ | |
| Create report dialog | Reports | ⬜ | |
| Fitness assessment dropdown | Reports | ⬜ | |
| Follow-up checkbox toggle | Reports | ⬜ | |
| Submit & send to employer | Reports | ⬜ | |
| Empty state | Reports | ⬜ | |
| **Settings** | | | |
| Profile display (read-only) | Settings | ⬜ | |
| Zoom link input | Settings | ⬜ | |
| Save changes mutation | Settings | ⬜ | |
| Persistence after refresh | Settings | ⬜ | |

### Status Legend
- ✅ Working as expected
- ⚠️ Partially working / issues found
- ❌ Not working / broken
- ⬜ Not tested yet
- 🚧 Missing / not implemented

---

## Quick Audit Commands

### Full Audit (All Tabs)
```bash
# Run complete audit
navigate http://localhost:5175
# ... login sequence ...

# Dashboard
click 'a[href="/doctor/dashboard"]'
wait 1000 && snapshot && screenshot audit-dashboard.png

# Appointments  
click 'a[href="/doctor/appointments"]'
wait 1000 && snapshot && screenshot audit-appointments.png

# Schedule
click 'a[href="/doctor/schedule"]'
wait 1000 && snapshot && screenshot audit-schedule.png

# Reports
click 'a[href="/doctor/reports"]'
wait 1000 && snapshot && screenshot audit-reports.png

# Settings
click 'a[href="/doctor/settings"]'
wait 1000 && snapshot && screenshot audit-settings.png

# Check for errors
console --level=error
network --status=400
network --status=500
```

### Quick Health Check
```bash
# Minimal check - login and verify each tab loads
navigate http://localhost:5175/doctor
wait 2000
snapshot

# Verify sidebar navigation works
click 'a[href="/doctor/dashboard"]' && wait 500
click 'a[href="/doctor/appointments"]' && wait 500
click 'a[href="/doctor/schedule"]' && wait 500
click 'a[href="/doctor/reports"]' && wait 500
click 'a[href="/doctor/settings"]' && wait 500
snapshot
console
```

---

## Related Memories

- `06_WORKOS_CONVEX_INTEGRATION_GUIDE.md` - Auth integration details
- `07_WORKOS_REDIRECT_CONFIGURATION_GUIDE.md` - Redirect configuration
- `AUTH_BUGS_PICKUP_20260104.md` - Known auth issues
- `NAV-MAP.md` - Route/selector reference
