# Browser-CLI Manual Testing Guide
**Sprint**: 05 of 06
**Index**: CODEBASE_ANALYSIS_INDEX
**Depends On**: CODEBASE_ANALYSIS_SPRINT_04_TESTING
**Next**: CODEBASE_ANALYSIS_SPRINT_06_ROADMAP

---

## Quick Start

### 1. Prerequisites
```bash
# Check if dev servers are running
lsof -ti:5175  # Frontend
lsof -ti:5176  # Preview

# If not running, start them
npm run dev
```

### 2. Browser-CLI Command Format
```bash
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts <command>
```

### 3. First Test Session
```bash
# Navigate to app
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate http://localhost:5175

# Take snapshot (see page structure)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Take screenshot
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot landing.png
```

---

## Core Commands Reference

### Navigation & Timing
| Command | Purpose | Example |
|---------|---------|---------|
| `navigate <url>` | Go to page | `navigate http://localhost:5175` |
| `wait <ms>` | Pause execution | `wait 1000` |
| `waitForSelector <sel>` | Wait for element | `waitForSelector "text:Dashboard"` |

### Capture & Inspection
| Command | Purpose | Example |
|---------|---------|---------|
| `snapshot` | Accessibility tree + refs | `snapshot` |
| `snapshot --forms` | Form field analysis | `snapshot --forms` |
| `screenshot <path>` | Visual capture | `screenshot test.png` |
| `console` | Browser console logs | `console` |
| `network` | HTTP requests | `network --filter=convex` |

### Interaction
| Command | Purpose | Example |
|---------|---------|---------|
| `click e5` | Click element ref | `click e5` |
| `click "text:Login"` | Click by text | `click "text:Login"` |
| `type e15 "text"` | Type into input | `type e15 "john@test.com"` |
| `pressKey Enter` | Keyboard input | `pressKey Enter` |
| `selectOption <sel> <val>` | Select dropdown | `selectOption "select" "option1"` |
| `dblclick e10` | Double-click | `dblclick e10` |
| `hover e3` | Hover over element | `hover e3` |

### State Management
| Command | Purpose | Example |
|---------|---------|---------|
| `saveState <name>` | Save browser state | `saveState authenticated-employer` |
| `restoreState <name>` | Restore saved state | `restoreState authenticated-employer` |
| `listStates` | List saved states | `listStates` |

### Assertions
| Command | Purpose | Example |
|---------|---------|---------|
| `assert e5 visible` | Check visibility | `assert e5 visible` |
| `assert e5 text "X"` | Check text | `assert e5 text "Dashboard"` |
| `assertConsole` | Check for errors | `assertConsole --level=error` |
| `assertNetwork <pat>` | Check API call | `assertNetwork patients:create` |

---

## Selector Strategies (Best to Worst)

### 1. Element Refs (Best) ⭐
```bash
# From snapshot output: [ref=e5]
click e5
type e15 "text"
```
- Generated from accessibility tree
- Most stable (survives styling changes)
- Reset on each snapshot

### 2. Semantic Selectors ✅
```bash
click "role:button:Submit"
click "text:Login"
type "label:Email" "test@example.com"
```
- Human-readable
- Based on accessibility

### 3. CSS Selectors (Last Resort) ❌
```bash
click ".btn-primary"
click 'a[href="/employer/dashboard"]'
```
- Fragile (breaks on class changes)
- Use only when necessary

---

## Portal Testing Workflows

### Employer Portal Login
```bash
# 1. Navigate to landing
navigate http://localhost:5175
wait 1000
snapshot

# 2. Click Provider Login
click "text:Provider Login"
wait 2000

# 3. Enter credentials (on WorkOS page)
type "label:Email" "testemployee@occuhealth.com"
pressKey Tab
type "label:Password" "(TestPass1234"
pressKey Enter
wait 3000

# 4. Verify dashboard loaded
snapshot
assert "text:Dashboard" visible
screenshot employer-dashboard.png

# 5. Save state for reuse
saveState authenticated-employer
```

### Quick Employer Test (Using Saved State)
```bash
restoreState authenticated-employer
navigate http://localhost:5175/employer/dashboard
wait 1000
snapshot
```

### Add Employee Flow
```bash
restoreState authenticated-employer
navigate http://localhost:5175/employer/employees
wait 1000
snapshot

# Open form
click "text:Add Employee"
wait 500
snapshot --forms

# Fill form
type e3 "John"           # First Name
type e4 "Doe"            # Last Name
type e5 "john@test.com"  # Email
type e6 "1990-01-01"     # DOB

# Submit
click "text:Add Employee"
wait 1000
assertNetwork patients:create
screenshot employee-added.png
```

### Booking Appointment Flow
```bash
restoreState authenticated-employer
navigate http://localhost:5175/employer/bookings
wait 1000

# Open booking wizard
click "text:New Booking"
wait 500
snapshot

# Step 1: Select Employee & Type
selectOption "select:first" "<patient_id>"
selectOption "select:nth(2)" "<type_id>"
click "text:Next"
wait 300

# Step 2: Select Date & Slot
type "input[type='date']" "2026-01-15"
wait 500
click e10  # Time slot
click "text:Next"
wait 300

# Step 3: Confirm
type "input:placeholder('reason')" "Annual checkup"
click "text:Confirm Booking"
wait 1500
assertNetwork appointments:book
snapshot
```

---

## Doctor Portal Testing

### Schedule Management
```bash
restoreState authenticated-doctor
navigate http://localhost:5175/doctor/schedule
wait 1000
snapshot

# Add time slot
type 'input[type="date"]' "2026-02-15"
type 'input[type="time"]:first-of-type' "09:00"
type 'input[type="time"]:last-of-type' "09:30"
click "text:Add Slot"
wait 300
assertNetwork availableSlots:createSlots
snapshot
```

---

## Admin Portal Testing

### Employer Verification
```bash
restoreState authenticated-admin
navigate http://localhost:5175/admin/employers
wait 1000
snapshot

# If pending employers exist
click "text:Verify"
wait 300
assertNetwork employers:verify
snapshot
```

### GDPR Erasure Processing
```bash
restoreState authenticated-admin
navigate http://localhost:5175/admin/gdpr/erasure
wait 1000
snapshot

# Process erasure request
click "text:Process Erasure"
wait 300
assertNetwork gdpr:processErasure
snapshot
```

---

## Pre-Saved States Available

| State Name | Description |
|------------|-------------|
| `authenticated-admin` | Admin logged in |
| `authenticated-employer` | Employer logged in |
| `authenticated-doctor` | Doctor logged in |
| `landing-page` | Fresh landing page |

**Usage:**
```bash
restoreState authenticated-employer
navigate /employer/dashboard
```

**Storage:** `BROWSER-CLI/states/<name>.json`

---

## Debugging Tips

### View Console Errors
```bash
navigate http://localhost:5175/employer/dashboard
wait 1000
console
```

### Check Network Requests
```bash
network --filter=convex          # All Convex calls
network --status=400             # Failed requests
network --method=POST            # Mutations only
```

### Full Debug Workflow
```bash
navigate http://localhost:5175/employer/employees
wait 1000
snapshot                         # See structure
click "text:Add Employee"
wait 500
snapshot --forms                 # See form fields
console                          # Check for errors
network --filter=convex          # Check API calls
```

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Selector not found | Element not rendered | `wait 500`, then `snapshot` |
| Stale refs | Refs reset per snapshot | Take fresh `snapshot` |
| Auth lost | Browser restarted | `restoreState authenticated-*` |
| API failure hidden | UI looks correct | `network --status=400` |
| Modal won't open | Wrong click | `snapshot` first, use correct ref |

---

## Evidence Collection

```bash
# Before test
screenshot before-test.png

# After test
screenshot after-test.png
snapshot --file=test-result

# Full audit trail
console
network --filter=convex
```

---

## Golden Testing Pattern

```bash
# 1. Setup
restoreState authenticated-employer
navigate /employer/dashboard
wait 500

# 2. Capture baseline
snapshot

# 3. Perform action
click "text:Employees"
wait 300

# 4. Verify
snapshot
assert "text:Employees" visible

# 5. Evidence
screenshot employees-page.png
network --filter=convex
assertConsole --level=error
```

---

## Key Selectors by Portal

### Employer Portal
| Element | Selector |
|---------|----------|
| Dashboard nav | `a[href="/employer/dashboard"]` |
| Employees nav | `a[href="/employer/employees"]` |
| Add Employee btn | `text:Add Employee` |
| New Booking btn | `text:New Booking` |

### Doctor Portal
| Element | Selector |
|---------|----------|
| Schedule nav | `a[href="/doctor/schedule"]` |
| Add Slot btn | `text:Add Slot` |
| Block btn | `text:Block` |

### Admin Portal
| Element | Selector |
|---------|----------|
| Employers nav | `a[href="/admin/employers"]` |
| GDPR nav | `a[href="/admin/gdpr"]` |
| Verify btn | `text:Verify` |
| Process Erasure btn | `text:Process Erasure` |

---

→ Next: CODEBASE_ANALYSIS_SPRINT_06_ROADMAP
