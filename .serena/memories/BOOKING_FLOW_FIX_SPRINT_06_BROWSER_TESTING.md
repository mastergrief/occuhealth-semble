# Browser-CLI Manual Testing
**Sprint**: 06 of 06
**Index**: BOOKING_FLOW_FIX_INDEX
**Depends On**: BOOKING_FLOW_FIX_SPRINT_04_IMPLEMENTATION
**Next**: None (Final Sprint)

---

## Pre-Test Setup

### 1. Verify Dev Servers Running

```bash
# Check if servers already active
lsof -ti:5175  # Frontend
lsof -ti:5176  # Backend (if separate)

# If not running, start dev servers
npm run dev
```

### 2. Verify Appointment Types Seeded

```bash
# Check database has appointment types
npx convex run appointmentTypes:listActive '{}'

# Expected: Array with 4-5 items
# If empty, run seed commands from Sprint 04
```

### 3. Verify Test Credentials

From `.env.local`:
- **Employer**: `testemployee@occuhealth.com` / `(TestPass1234`
- **Doctor**: `testdoc@occuhealth.com` / `(TestPass1234`

---

## Test Suite: Booking Flow

### Test 1: Verify Appointment Type Dropdown (CRITICAL)

**Objective**: Confirm dropdown shows options after seeding

```bash
# 1. Navigate to bookings page
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate localhost:5175/employer/bookings

# 2. Wait for page load
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1500

# 3. Take baseline snapshot
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# 4. Click "New Booking" button
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:New Booking"

# 5. Wait for modal to open
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 500

# 6. Take snapshot of modal
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# 7. Verify dropdown has options (check ref count)
# Expected: Appointment Type dropdown shows 4-5 options

# 8. Screenshot for evidence
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot booking-step1-types.png
```

**Expected Result**: 
- Modal shows "Book Appointment - Step 1 of 3"
- "Appointment Type" dropdown shows seeded options
- "Next" button becomes enabled when type selected

---

### Test 2: Complete Booking Flow (Happy Path)

**Objective**: Book an appointment end-to-end

```bash
# 1. Restore authenticated employer state (if available)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts restoreState authenticated-employer

# 2. Navigate to bookings
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate localhost:5175/employer/bookings
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000

# 3. Open booking modal
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:New Booking"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 500

# 4. Take snapshot to get refs
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# STEP 1: Select Employee & Type
# 5. Select employee from dropdown
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "select"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 200
# Select first employee option (use ref from snapshot)

# 6. Select appointment type
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts selectOption "select:nth(2)" "Initial Assessment"

# 7. Click Next
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Next"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 500
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# STEP 2: Select Date & Time
# 8. Enter date (must have available slots!)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts type "input[type='date']" "2026-01-15"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 500

# 9. Select available time slot
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot
# Click time slot button (use ref from snapshot)

# 10. Click Next
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Next"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 300

# STEP 3: Confirm
# 11. Take snapshot of confirmation
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# 12. Add reason (optional)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts type "input[placeholder*='reason']" "Annual health check"

# 13. Confirm booking
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Confirm Booking"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1500

# 14. Verify booking created
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts network --filter=appointments:book
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot booking-complete.png
```

**Expected Result**:
- Modal closes after successful booking
- Booking appears in "All Appointments" list
- Network shows `CONVEX M(appointments:book)` succeeded

---

### Test 3: Empty State (No Appointment Types)

**Objective**: Verify UX when appointmentTypes table is empty

**Prerequisite**: Temporarily clear appointment types (testing only!)

```bash
# ⚠️ CAUTION: Only do this in dev environment
# This test verifies the empty state UX

# 1. Navigate to bookings
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate localhost:5175/employer/bookings
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000

# 2. Open booking modal
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:New Booking"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 500

# 3. Take snapshot
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# 4. Screenshot
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot booking-empty-types.png

# Expected (BEFORE fix): Empty dropdown, no feedback
# Expected (AFTER fix): Warning banner "No appointment types available"
```

---

### Test 4: Loading State

**Objective**: Verify loading skeleton displays during query fetch

```bash
# 1. Clear browser state for fresh load
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts close
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate localhost:5175/employer/bookings

# 2. Immediately open modal before queries resolve
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:New Booking"

# 3. Quickly take snapshot (should show loading state)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot booking-loading.png

# Expected (BEFORE fix): Empty dropdowns
# Expected (AFTER fix): Skeleton placeholders
```

---

### Test 5: Slot Availability (Race Condition)

**Objective**: Verify booking fails gracefully if slot taken

```bash
# This test requires two browser windows or pre-booked slot

# 1. Navigate to bookings
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate localhost:5175/employer/bookings
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000

# 2. Complete Step 1 and Step 2 (select a slot)

# 3. Before clicking Confirm, book same slot via CLI:
# npx convex run appointments:book '{"slotId":"<slot_id>","patientId":"...","employerId":"...","appointmentTypeId":"..."}'

# 4. Click Confirm Booking
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Confirm Booking"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000

# 5. Check for error toast
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts console
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Expected: Error toast "SLOT_UNAVAILABLE"
```

---

## Verification Commands

### Check Console for Errors

```bash
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts console
# Look for: React errors, Convex errors, network failures
```

### Check Network Requests

```bash
# Verify Convex queries/mutations
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts network --filter=convex

# Check for specific mutation
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts network --filter=appointmentTypes:listActive
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts network --filter=appointments:book
```

### Save State for Future Tests

```bash
# After authenticating as employer
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts saveState authenticated-employer

# List saved states
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts listStates
```

---

## Assertion Commands

```bash
# Verify modal opened
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assert "text:Book Appointment" visible

# Verify dropdown has options (element count > 1)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assertCount "option" gt 1

# Verify Next button enabled after selections
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assert "text:Next" enabled

# Verify no console errors
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assertConsole --level=error
```

---

## Test Results Template

| Test | Status | Evidence | Notes |
|------|--------|----------|-------|
| T1: Type Dropdown | ⏳ | booking-step1-types.png | |
| T2: Complete Flow | ⏳ | booking-complete.png | |
| T3: Empty State | ⏳ | booking-empty-types.png | |
| T4: Loading State | ⏳ | booking-loading.png | |
| T5: Slot Race | ⏳ | Console logs | |

---

## Key Selectors Reference

| Element | Selector |
|---------|----------|
| New Booking button | `text:New Booking` |
| Modal title | `text:Book Appointment` |
| Employee dropdown | `select:first` |
| Type dropdown | `select:nth(2)` |
| Date input | `input[type='date']` |
| Time slot button | (use ref from snapshot) |
| Next button | `text:Next` |
| Back button | `text:Back` |
| Confirm button | `text:Confirm Booking` |
| Reason input | `input[placeholder*='reason']` |

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Modal doesn't open | Auth not loaded | Restore authenticated state |
| Empty type dropdown | Table not seeded | Run seed commands from Sprint 04 |
| No time slots | Doctor hasn't created slots | Create slots as doctor first |
| Booking fails | Invalid IDs | Check refs in snapshot |
| Network timeout | Server not running | Verify `npm run dev` active |

---

## Evidence Collection Checklist

- [ ] Screenshot: Booking Step 1 with populated dropdown
- [ ] Screenshot: Booking Step 2 with time slots
- [ ] Screenshot: Booking Step 3 confirmation
- [ ] Screenshot: Booking complete (modal closed, list updated)
- [ ] Network log: `appointments:book` success
- [ ] Console log: No errors

---

✓ Final Sprint
