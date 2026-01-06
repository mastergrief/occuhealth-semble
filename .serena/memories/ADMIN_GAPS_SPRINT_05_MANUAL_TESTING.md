# Browser-CLI Manual Testing Procedures

**Sprint**: 05 of 06
**Index**: ADMIN_GAPS_INDEX
**Depends On**: ADMIN_GAPS_SPRINT_03_CRUD_IMPLEMENTATION, ADMIN_GAPS_SPRINT_04_UX_IMPLEMENTATION
**Next**: ADMIN_GAPS_SPRINT_06_TESTING_DOCS

---

## Prerequisites

### Start Dev Server
```bash
# Check if already running
lsof -ti:5175

# If not running, start dev server
npm run dev
```

### Start Browser-CLI Manager
```bash
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts status --verbose
# If not running, manager auto-starts
```

### Restore Authenticated State
```bash
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts restoreState authenticated-admin
```

---

## Test Suite 1: Appointment Types Edit/Delete

### TEST-APPT-10: Edit Appointment Type

**Objective**: Verify edit functionality works with pre-populated form

```bash
# Navigate to appointment types page
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate http://localhost:5175/admin/appointment-types
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Click Edit button on first type card
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Edit"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 500
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Verify dialog title shows "Edit Appointment Type"
# Verify form fields are pre-populated

# Modify the name field
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts type 'input[name="name"]' " (Updated)"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 300

# Submit the form
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Save Changes"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000

# Verify mutation was called
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts network --filter=appointmentTypes:update
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# EXPECTED: Dialog closes, list shows updated name
```

**Pass Criteria**:
- [ ] Edit button opens dialog with existing values
- [ ] Modified name appears in list after save
- [ ] Network shows `appointmentTypes:update` mutation

---

### TEST-APPT-11: Delete Appointment Type (No References)

**Objective**: Verify hard delete works when no appointments reference the type

```bash
# First create a test type to delete
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Add Type"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 500
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts type 'input[name="name"]' "DELETE_TEST_TYPE"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts type 'input[name="description"]' "Test type for deletion"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts type 'input[name="durationMinutes"]' "30"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts type 'input[name="price"]' "50"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Create Type"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Find and click Delete on the new type
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:DELETE_TEST_TYPE"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 300
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click 'button:has-text("Delete")'
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 500
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Verify confirmation dialog
# Click confirm
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Delete"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000

# Verify mutation and result
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts network --filter=appointmentTypes:remove
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# EXPECTED: Type removed from list entirely (hard delete)
```

**Pass Criteria**:
- [ ] Confirmation dialog appears before delete
- [ ] Type is removed from list after confirmation
- [ ] Network shows `appointmentTypes:remove` mutation
- [ ] Response contains `{ deleted: true }`

---

### TEST-APPT-12: Delete Appointment Type (With References - Soft Delete)

**Objective**: Verify soft delete when appointments exist for the type

```bash
# Use a type that has existing appointments (e.g., "Initial Assessment")
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate http://localhost:5175/admin/appointment-types
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Click Delete on a type with appointments
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click 'button:has-text("Delete"):near(:text("Initial Assessment"))'
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 500
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Delete"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000

# Verify result
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts network --filter=appointmentTypes:remove
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts console
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# EXPECTED: Type marked inactive (soft delete), still visible but disabled
```

**Pass Criteria**:
- [ ] Type still visible in list but marked inactive
- [ ] Response contains `{ softDeleted: true, reason: "in_use" }`
- [ ] Audit log entry created for soft delete

---

## Test Suite 2: Custom Employer Rejection Reason

### TEST-EMP-06: Custom Rejection Reason Input

**Objective**: Verify rejection dialog accepts and stores custom reason

```bash
# Navigate to employers page
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate http://localhost:5175/admin/employers
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# If pending employers exist:
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Reject"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 500
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Verify dialog opened with textarea
# Enter custom reason
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts type 'textarea' "Company registration documents expired. Please resubmit with valid documentation."
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 300

# Verify button enables (min 10 chars)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Confirm rejection
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Confirm Rejection"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000

# Verify mutation
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts network --filter=employers:reject
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot
```

**Pass Criteria**:
- [ ] Rejection dialog opens with textarea
- [ ] Submit button disabled when reason < 10 chars
- [ ] Custom reason passed to mutation (not hardcoded string)
- [ ] Employer removed from pending list

---

### TEST-EMP-07: Rejection Reason Validation

**Objective**: Verify minimum length validation

```bash
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate http://localhost:5175/admin/employers
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Reject"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 500

# Enter short reason (< 10 chars)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts type 'textarea' "Too short"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Verify button is disabled
# EXPECTED: Button shows disabled state

# Enter valid reason
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts type 'textarea' " - additional context added here"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# EXPECTED: Button becomes enabled
```

**Pass Criteria**:
- [ ] Button disabled when reason < 10 characters
- [ ] Character count displayed
- [ ] Button enables when reason >= 10 characters

---

## Test Suite 3: Audit Log Filtering

### TEST-AUD-05: Filter by Action Type

```bash
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate http://localhost:5175/admin/gdpr/audit
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Open action filter dropdown
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click 'button:has-text("All actions")'
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 300
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Select "consent_created"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:consent_created"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Verify only consent_created logs displayed
```

**Pass Criteria**:
- [ ] Filter dropdown shows action options
- [ ] Only matching logs displayed after selection
- [ ] Result count updates

---

### TEST-AUD-06: Filter by Date Range

```bash
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate http://localhost:5175/admin/gdpr/audit
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000

# Set start date to 7 days ago
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts type 'input[type="date"]:first-of-type' "2026-01-01"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 500

# Set end date to today
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts type 'input[type="date"]:last-of-type' "2026-01-06"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Verify logs within date range
```

**Pass Criteria**:
- [ ] Date inputs accept values
- [ ] Logs filtered to date range
- [ ] Query includes startTime/endTime params

---

### TEST-AUD-07: Clear Filters

```bash
# With filters active
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Clear"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 500
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Verify all filters reset, full log list displayed
```

**Pass Criteria**:
- [ ] Clear button visible when filters active
- [ ] All dropdowns reset to default
- [ ] Full log list restored

---

## Test Suite 4: Dark Mode Toggle

### TEST-UX-10: Dark Mode Toggle Functionality

```bash
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate http://localhost:5175/admin
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Verify light mode (no .dark class)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts evaluate 'document.documentElement.classList.contains("dark")'
# EXPECTED: false

# Click theme toggle
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click 'button[aria-label="Toggle theme"]'
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 300
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Select Dark
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Dark"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 500

# Verify dark mode active
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts evaluate 'document.documentElement.classList.contains("dark")'
# EXPECTED: true

npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot dark-mode-admin.png

# Refresh and verify persistence
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate http://localhost:5175/admin
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts evaluate 'document.documentElement.classList.contains("dark")'
# EXPECTED: true (persisted to localStorage)
```

**Pass Criteria**:
- [ ] Theme toggle visible in header
- [ ] Dark mode applies `.dark` class
- [ ] Theme persists after page refresh
- [ ] Visual appearance changes (screenshot evidence)

---

## Test Suite 5: Mobile Hamburger Menu

### TEST-UX-11: Mobile Navigation

```bash
# Resize to mobile viewport
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts resize 375 812
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate http://localhost:5175/admin
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Verify hamburger icon visible, desktop nav hidden
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot mobile-admin-closed.png

# Click hamburger menu
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click 'button[aria-label="Open menu"]'
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 500
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot mobile-admin-open.png

# Click nav link in drawer
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Employers"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000

# Verify navigation and menu closes
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot
# URL should be /admin/employers
# Menu should be closed

# Reset to desktop
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts resize 1280 800
```

**Pass Criteria**:
- [ ] Desktop nav hidden on mobile
- [ ] Hamburger icon visible (44px touch target)
- [ ] Sheet opens from right
- [ ] Navigation works from mobile menu
- [ ] Menu closes after navigation

---

## Security Audit Tests

### TEST-SEC-01: Verify Audit Logs Created

```bash
# After performing admin actions, verify audit logs exist
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate http://localhost:5175/admin/gdpr/audit
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Look for recent actions:
# - employer_verified / employer_rejected
# - appointment_type_created / appointment_type_updated
# - erasure_processed
```

### TEST-SEC-02: Convex Backend Verification

```bash
# Query audit logs directly via Convex CLI
npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts auditLogs --limit=10 --json
```

**Pass Criteria**:
- [ ] Admin actions appear in audit logs
- [ ] actorId matches authenticated admin
- [ ] timestamp is accurate

---

## Complete Test Run Sequence

```bash
# Full test suite execution order:
# 1. Restore authenticated state
restoreState authenticated-admin

# 2. Security tests first
# Run TEST-SEC-01, TEST-SEC-02

# 3. CRUD tests
# Run TEST-APPT-10, TEST-APPT-11, TEST-APPT-12
# Run TEST-EMP-06, TEST-EMP-07

# 4. Filter tests
# Run TEST-AUD-05, TEST-AUD-06, TEST-AUD-07

# 5. UX tests
# Run TEST-UX-10, TEST-UX-11

# 6. Collect evidence
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot final-state.png
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts console
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts network --filter=convex
```

---

## Test Evidence Artifacts

| Artifact | Location | Purpose |
|----------|----------|---------|
| Screenshots | `BROWSER-CLI/screenshots/` | Visual verification |
| Network logs | Console output | Mutation verification |
| Snapshots | Console output | DOM state verification |
| Audit logs | Convex dashboard | Security compliance |

---

→ Next: ADMIN_GAPS_SPRINT_06_TESTING_DOCS
