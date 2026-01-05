# Browser-CLI Manual Testing Guide

**Sprint**: 03 of 06
**Index**: EMPLOYER_ROUTING_INDEX
**Depends On**: EMPLOYER_ROUTING_SPRINT_02_ARCHITECTURE
**Next**: EMPLOYER_ROUTING_SPRINT_04_PERFORMANCE

---

## Pre-Requisites

1. Dev servers running: `npm run dev` (port 5175)
2. Browser-CLI manager active
3. Test user credentials from `.env.local`

---

## Test Suite: Before Fix (Baseline)

### TEST-B01: Verify Current Broken State

```bash
# Start fresh browser session
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts start http://localhost:5175

# Authenticate as employer
restoreState authenticated-employer
wait 1000
snapshot

# Navigate to employer dashboard
navigate http://localhost:5175/employer/dashboard
wait 1500
snapshot

# Expected: Sidebar visible, main content EMPTY
# Look for: <main> element with no children
```

**Expected Result**: 
- Sidebar renders with 5 NavLinks
- Main content area is **empty**
- No console errors
- URL shows `/employer/dashboard`

### TEST-B02: Verify All Routes Empty

```bash
# Test each employer route
navigate http://localhost:5175/employer/employees
wait 1000
snapshot
# Expected: Empty content

navigate http://localhost:5175/employer/bookings
wait 1000
snapshot
# Expected: Empty content

navigate http://localhost:5175/employer/reports
wait 1000
snapshot
# Expected: Empty content

navigate http://localhost:5175/employer/settings
wait 1000
snapshot
# Expected: Empty content
```

---

## Test Suite: After Fix (Verification)

### TEST-A01: Dashboard Renders

```bash
restoreState authenticated-employer
navigate http://localhost:5175/employer/dashboard
wait 2000
snapshot

# Verify dashboard content
assert "text:Dashboard" visible
# Look for stats cards
assertCount ".grid" equals 1

# Check Convex queries fired
console
# Expected: CONVEX Q(patients:list), Q(appointments:listByEmployer)
```

**Expected Result**:
- Dashboard heading visible
- Stats cards render (Employees, Appointments, Reports)
- Recent appointments section visible

### TEST-A02: Employees Page

```bash
click 'a[href="/employer/employees"]'
wait 1500
snapshot

# Verify employees page
assert "text:Employees" visible
assert "text:Add Employee" visible

# Check for employee list or empty state
# If empty: assert "text:No employees added yet" visible
```

**Expected Result**:
- Employees heading visible
- "Add Employee" button present
- Either employee list OR empty state message

### TEST-A03: Employee Form Modal

```bash
# From employees page
click "text:Add Employee"
wait 500
snapshot --forms

# Verify form opens
assert "role:dialog" visible

# Fill form
type 'input[name="firstName"]' "Test"
type 'input[name="lastName"]' "User"
type 'input[name="email"]' "test@example.com"
type 'input[type="date"]' "1990-01-15"

# Submit
click "text:Add Employee"
wait 1500

# Verify mutation
assertNetwork patients:create
snapshot

# Verify list updated
assert "text:Test User" visible
```

### TEST-A04: Bookings Page

```bash
click 'a[href="/employer/bookings"]'
wait 1500
snapshot

# Verify bookings page
assert "text:Bookings" visible

# Check for verification warning if applicable
# assert "text:Account Pending Verification" visible  # If not verified
```

**Expected Result**:
- Bookings heading visible
- Either booking list OR empty state
- "New Booking" button (may be disabled if not verified)

### TEST-A05: Booking Flow (3-Step Wizard)

```bash
# Only if employer is verified
click "text:New Booking"
wait 500
snapshot

# Step 1: Select Employee & Type
selectOption "select:first" "employee_id"
selectOption "select:nth(2)" "Initial Assessment"
click "text:Next"
wait 300

# Step 2: Date & Time
type "input[type='date']" "2026-02-15"
wait 500
click e10  # Time slot button
click "text:Next"
wait 300

# Step 3: Confirm
type "input:placeholder('reason')" "Annual checkup"
click "text:Confirm Booking"
wait 1500

assertNetwork appointments:book
snapshot
```

### TEST-A06: Reports Page

```bash
click 'a[href="/employer/reports"]'
wait 1500
snapshot

assert "text:Reports" visible
# Either report list OR empty state
```

### TEST-A07: Settings Page

```bash
click 'a[href="/employer/settings"]'
wait 1500
snapshot

assert "text:Settings" visible
# Should show company info
```

### TEST-A08: Navigation State Persistence

```bash
# Test browser back/forward
navigate http://localhost:5175/employer/employees
wait 1000
navigate http://localhost:5175/employer/bookings
wait 1000

# Go back
pressKey Alt+ArrowLeft  # Or use browser back
wait 500
snapshot
# Should be on /employer/employees

# Go forward
pressKey Alt+ArrowRight
wait 500
snapshot
# Should be on /employer/bookings
```

### TEST-A09: Direct URL Navigation

```bash
# Fresh start
navigate http://localhost:5175/employer/settings
wait 1500
snapshot

# Should load settings directly (not require dashboard first)
assert "text:Settings" visible
```

---

## Comparison: Doctor Portal (Working Reference)

```bash
# Verify Doctor portal works correctly
restoreState authenticated-doctor
navigate http://localhost:5175/doctor/dashboard
wait 1500
snapshot

# Should show doctor dashboard with content
assert "text:Dashboard" visible
assertCount ".grid" gte 1
```

---

## Evidence Collection Commands

```bash
# Screenshot for audit
screenshot employer-dashboard-after-fix.png

# Full console log
console

# Network verification
network --filter=convex

# Save state for future tests
saveState employer-dashboard-working
```

---

## Common Issues & Debug

| Issue | Symptom | Debug Command |
|-------|---------|---------------|
| Routes still empty | Blank content | `snapshot --full` check for error |
| Auth lost | Redirect to "/" | `console` check for auth errors |
| Queries not firing | No data | `network --filter=convex` |
| Wrong employer | Different data | Check `useEmployerAuth()` return |
| Lazy load stuck | Spinner forever | `console` check for chunk errors |

---

## Test Acceptance Criteria

| Test | Status | Notes |
|------|--------|-------|
| TEST-A01 Dashboard | [ ] Pass | Stats cards + recent appointments |
| TEST-A02 Employees | [ ] Pass | List or empty state |
| TEST-A03 Employee Form | [ ] Pass | Modal + mutation |
| TEST-A04 Bookings | [ ] Pass | List or empty state |
| TEST-A05 Booking Flow | [ ] Pass | 3-step wizard |
| TEST-A06 Reports | [ ] Pass | List or empty state |
| TEST-A07 Settings | [ ] Pass | Company info |
| TEST-A08 Navigation | [ ] Pass | Back/forward |
| TEST-A09 Direct URL | [ ] Pass | Deep link |

**All 9 tests must pass for fix verification.**

---

→ Next: EMPLOYER_ROUTING_SPRINT_04_PERFORMANCE
