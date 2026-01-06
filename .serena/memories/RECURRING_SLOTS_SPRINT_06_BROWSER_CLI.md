# Browser-CLI Manual Testing
**Sprint**: 06 of 06
**Index**: RECURRING_SLOTS_INDEX
**Depends On**: All previous sprints
**Next**: ✓ Final Sprint

---

## Test Environment Setup

### Prerequisites
```bash
# 1. Start dev servers (if not running)
lsof -ti:5175 || npm run dev

# 2. Verify Browser-CLI manager
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts status --verbose

# 3. Check saved states
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts listStates
```

### Test Credentials
| Role | Email | Password | State File |
|------|-------|----------|------------|
| Doctor | testdoc@occuhealth.com | (TestPass1234 | `authenticated-doctor` |

---

## Test Suite 1: Existing Schedule Functionality

### T1.1: Navigate to Schedule Page

```bash
# Restore authenticated doctor state
restoreState authenticated-doctor
navigate /doctor/schedule
wait 1000
snapshot
screenshot schedule-page-initial.png

# Verify page elements
assert "text:Manage Schedule" visible
assert "text:Add Time Slot" visible
assert "text:Date" visible
assert "text:Start" visible
assert "text:End" visible
```

**Expected**: Schedule page loads with form and slot grid

### T1.2: Create Single Slot

```bash
# Fill form
type 'input[type="date"]' "2026-01-15"
wait 300
type 'input[type="time"]:first-of-type' "09:00"
type 'input[type="time"]:last-of-type' "09:30"

# Submit
click "text:Add Slot"
wait 1000
snapshot
assertNetwork availableSlots:createSlots

# Verify slot appears
assert "text:09:00 - 09:30" visible
screenshot single-slot-created.png
```

**Expected**: Slot created and visible in grid

### T1.3: Block Slot

```bash
# Find available slot with Block button
snapshot
click "text:Block"
wait 500
snapshot
assertNetwork availableSlots:blockSlot

# Verify status change (gray background)
screenshot slot-blocked.png
```

**Expected**: Slot shows as blocked (gray)

### T1.4: Validation Error

```bash
# Set invalid time range (end before start)
type 'input[type="time"]:first-of-type' "10:00"
type 'input[type="time"]:last-of-type' "09:00"
click "text:Add Slot"
wait 300
snapshot

# Check error message
assert "text:End time must be after start time" visible
screenshot validation-error.png
```

**Expected**: Error message displayed, slot NOT created

---

## Test Suite 2: Recurring Slots Form

### T2.1: Open Recurring Form

```bash
restoreState authenticated-doctor
navigate /doctor/schedule
wait 1000
snapshot

# Click recurring slots button
click "text:Recurring Slots"
wait 500
snapshot --full
screenshot recurring-form-open.png

# Verify form elements
assert "text:SELECT DAYS" visible
assert "text:Mon" visible
assert "text:TIME SLOTS" visible
assert "text:APPLY TO" visible
```

**Expected**: Recurring slots form opens in dialog

### T2.2: Day Selection

```bash
# Default should be Mon-Fri selected
snapshot
assert e10 visible  # Mon button

# Toggle Saturday on
click "text:Sat"
wait 200
snapshot

# Click Weekdays quick select
click "text:Weekdays"
wait 200
snapshot

# Click Clear
click "text:Clear"
wait 200
snapshot
# All days should be unselected

# Click All
click "text:All"
wait 200
snapshot
screenshot day-selection-all.png
```

**Expected**: Day toggles work, quick select buttons function

### T2.3: Time Slot Management

```bash
# Add time slot
click "text:Add Slot"
wait 200
snapshot

# Verify two slots now exist
# Count time inputs (should be 4 = 2 start + 2 end)
snapshot --forms

# Remove first slot
click "button:has([aria-label='remove'])"
wait 200
snapshot
screenshot time-slots-managed.png
```

**Expected**: Add/remove time slots works

### T2.4: Quick Fill

```bash
# Set quick fill parameters
# Duration dropdown
selectOption "select" "30"

# Start time
type 'input[aria-label="from time"]' "09:00"

# End time  
type 'input[aria-label="to time"]' "17:00"

# Click Fill
click "text:Fill"
wait 300
snapshot

# Should have 16 slots (8 hours × 2 per hour)
screenshot quick-fill-result.png
```

**Expected**: 16 time slots generated (09:00-09:30 through 16:30-17:00)

### T2.5: Preview Display

```bash
# With days selected and slots defined, verify preview
snapshot

# Check preview section
assert "text:PREVIEW" visible
assert "text:Creating" visible
assert "text:slots" visible

# Check for day grouping
assert "text:Mon" visible
assert "text:Jan" visible
screenshot preview-display.png
```

**Expected**: Preview shows slot count and grouped by date

### T2.6: Conflict Detection

```bash
# First create a slot that will conflict
navigate /doctor/schedule
wait 500
type 'input[type="date"]' "2026-01-06"
type 'input[type="time"]:first-of-type' "09:00"
type 'input[type="time"]:last-of-type' "09:30"
click "text:Add Slot"
wait 1000

# Now open recurring form
click "text:Recurring Slots"
wait 500

# Set up conflicting recurring slots
# Mon 06 Jan at 09:00 should conflict
click "text:Mon"
wait 200
# Add 09:00-09:30 slot
snapshot

# Check for conflict warning
assert "text:CONFLICT" visible
assert "text:booked" visible
screenshot conflict-detected.png
```

**Expected**: Conflict warning shows for overlapping slot

### T2.7: Submit Recurring Slots

```bash
# With form filled out
# Select Mon-Fri
click "text:Weekdays"
wait 200

# Set date range (1 week)
type 'input[aria-label="start date"]' "2026-01-20"
type 'input[aria-label="end date"]' "2026-01-24"
wait 500

# Preview should update
snapshot

# Submit
click "text:Create"
wait 2000
assertNetwork availableSlots:createRecurringSlots
snapshot

# Verify success toast
assert "text:Created" visible
screenshot recurring-created.png
```

**Expected**: Slots created, dialog closes, success toast

---

## Test Suite 3: Week Calendar View

### T3.1: Week View Navigation

```bash
navigate /doctor/schedule
wait 1000

# Switch to week view (if implemented)
click "text:Week View"
wait 500
snapshot
screenshot week-view-initial.png

# Verify 7 columns
assert "text:Mon" visible
assert "text:Tue" visible
assert "text:Wed" visible
assert "text:Thu" visible
assert "text:Fri" visible
assert "text:Sat" visible
assert "text:Sun" visible
```

**Expected**: Week calendar shows 7 days

### T3.2: Week Navigation

```bash
# Click next week
click "text:Next" 
wait 500
snapshot

# Click previous week
click "text:Prev"
wait 500
snapshot
screenshot week-navigation.png
```

**Expected**: Week changes on navigation

### T3.3: Slot Status Colors

```bash
snapshot

# Verify color coding in week view
# Available = green, Booked = blue, Blocked = gray
# (Visual inspection via screenshot)
screenshot slot-colors.png
```

**Expected**: Slots show appropriate status colors

---

## Test Suite 4: Backend Verification

### T4.1: Audit Log Verification

```bash
# After creating slots, verify audit log entry
# Use Convex CLI (not browser)
```

```bash
# In terminal (not Browser-CLI):
npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts auditLogs --limit=5 --json | jq '.data[] | select(.action | contains("slot"))'
```

**Expected**: Audit log entries for slot creation

### T4.2: Template Creation

```bash
# Verify template was created
npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts recurringSlotTemplates --limit=5 --json
```

**Expected**: Template record exists with correct pattern

### T4.3: Slot-Template Linkage

```bash
# Verify slots have templateId
npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts availableSlots --limit=10 --json | jq '.data[] | select(.templateId != null)'
```

**Expected**: Slots created from recurring have templateId

---

## Test Suite 5: Error Handling

### T5.1: No Days Selected

```bash
click "text:Recurring Slots"
wait 500
click "text:Clear"  # Clear all days
wait 200

click "text:Create"
wait 300
snapshot

# Check error message
assert "text:At least one day" visible
screenshot error-no-days.png
```

**Expected**: Error shown, form not submitted

### T5.2: No Time Slots

```bash
click "text:Recurring Slots"
wait 500

# Remove all time slots
click "button:has([aria-label='remove'])"
wait 200

click "text:Create"
wait 300
snapshot

assert "text:At least one time slot" visible
screenshot error-no-slots.png
```

**Expected**: Error shown, form not submitted

### T5.3: Invalid Date Range

```bash
click "text:Recurring Slots"
wait 500

# Set end before start
type 'input[aria-label="start date"]' "2026-01-31"
type 'input[aria-label="end date"]' "2026-01-01"

click "text:Create"
wait 300
snapshot

assert "text:Start date must be before" visible
screenshot error-invalid-range.png
```

**Expected**: Error shown, form not submitted

---

## Test Suite 6: Edge Cases

### T6.1: Month Boundary

```bash
click "text:Recurring Slots"
wait 500

# Set range across month boundary
type 'input[aria-label="start date"]' "2026-01-29"
type 'input[aria-label="end date"]' "2026-02-06"
wait 500

snapshot

# Preview should show dates from both months
assert "text:Jan" visible
assert "text:Feb" visible
screenshot month-boundary.png
```

**Expected**: Dates calculated correctly across month boundary

### T6.2: Max Slots Warning

```bash
click "text:Recurring Slots"
wait 500

# Select all days
click "text:All"
wait 200

# Quick fill with many slots
type 'input[aria-label="from time"]' "00:00"
type 'input[aria-label="to time"]' "23:59"
click "text:Fill"
wait 500

# Set long date range
type 'input[aria-label="start date"]' "2026-01-01"
type 'input[aria-label="end date"]' "2026-12-31"
wait 1000

snapshot

# Should show warning about slot count
screenshot max-slots-warning.png
```

**Expected**: Warning if creating > 100 slots

---

## Test Execution Summary

### Quick Smoke Test (5 minutes)
```bash
# Run these for quick verification
restoreState authenticated-doctor
navigate /doctor/schedule
wait 1000
snapshot
click "text:Recurring Slots"
wait 500
snapshot
screenshot smoke-test.png
```

### Full Test Suite Order
1. T1.1-T1.4: Existing functionality (sanity check)
2. T2.1-T2.7: Recurring form complete flow
3. T3.1-T3.3: Week view (if implemented)
4. T4.1-T4.3: Backend verification
5. T5.1-T5.3: Error handling
6. T6.1-T6.2: Edge cases

### Regression Test (after changes)
- T1.2: Single slot still works
- T2.7: Recurring creation still works
- T4.1: Audit logging still works

---

## Evidence Collection

### Screenshots Required
| Test | Screenshot Name | Purpose |
|------|----------------|---------|
| T1.1 | schedule-page-initial.png | Baseline |
| T1.2 | single-slot-created.png | Single slot works |
| T2.1 | recurring-form-open.png | Form renders |
| T2.7 | recurring-created.png | Success state |
| T5.* | error-*.png | Error handling |

### Network Assertions
```bash
# Key mutations to verify
assertNetwork availableSlots:createSlots
assertNetwork availableSlots:createRecurringSlots
assertNetwork availableSlots:blockSlot

# Key queries to verify
assertNetwork availableSlots:getByDateRange
assertNetwork availableSlots:previewRecurringSlots
```

---

## Acceptance Criteria

- [ ] T1.1-T1.4: Existing schedule functionality works
- [ ] T2.1-T2.7: Recurring slots form complete
- [ ] T3.1-T3.3: Week view works (if implemented)
- [ ] T4.1-T4.3: Backend data correct
- [ ] T5.1-T5.3: Error handling proper
- [ ] T6.1-T6.2: Edge cases handled
- [ ] All screenshots collected
- [ ] No console errors (assertConsole --level=error)
- [ ] All network assertions pass

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| State restore fails | `listStates` to verify, re-authenticate manually |
| Selector not found | Take fresh `snapshot`, use revealed refs |
| Network assertion fails | Check `network --filter=availableSlots` |
| Form not opening | Check for dialog overlay, use `wait 500` |
| Slots not appearing | Verify Convex websocket: `network --filter=convex` |

---

✓ Final Sprint - Documentation Complete
