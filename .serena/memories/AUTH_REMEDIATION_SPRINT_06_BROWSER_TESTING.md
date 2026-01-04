# Browser-CLI E2E Testing Guide

**Sprint**: 06 of 07
**Index**: AUTH_REMEDIATION_INDEX
**Depends On**: Sprint 02, Sprint 04
**Next**: AUTH_REMEDIATION_SPRINT_07_REMEDIATION

---

## Browser Agent Testing Strategy

This sprint documents how to use the **browser agent** (via Task tool with `subagent_type: browser`) for comprehensive E2E auth testing.

## Pre-Flight Checklist

```bash
# 1. Check if dev servers are running
lsof -ti:5175   # Vite frontend
lsof -ti:5176   # If separate backend

# 2. Start servers if not running
npm run dev

# 3. Verify browser manager is responsive
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts status --verbose
```

---

## Test Credentials

| Role | Email | Password | Expected Result |
|------|-------|----------|-----------------|
| Admin | `testadmin@occuhealth.com` | `(TestPass1234` | ✅ Should work |
| Doctor | `testdoc@occuhealth.com` | `(TestPass1234` | ❌ Currently broken |
| Employer | `testemployee@occuhealth.com` | `(TestPass1234` | ❌ Currently broken |

---

## Browser Agent Test Scenarios

### Scenario 1: Admin Login Flow (Baseline - Should Pass)

**Purpose**: Verify admin portal works correctly as baseline.

**Browser Agent Prompt**:
```
Test the admin login flow:
1. Navigate to http://localhost:5175/admin
2. Verify "Admin Access Required" page appears
3. Click "Sign in as Admin" link
4. Wait for WorkOS login page
5. Enter email: testadmin@occuhealth.com
6. Click Continue
7. Enter password: (TestPass1234
8. Click Sign in
9. Wait for redirect to /admin
10. Take screenshot of admin dashboard
11. Verify "Admin Dashboard" heading is visible
12. Check localStorage for workos_admin_auth key
13. Navigate to /admin/employers
14. Verify "Employer Verification" page loads
15. Navigate to /admin/gdpr
16. Verify GDPR dashboard loads

Report: Success/failure for each step, localStorage contents, any console errors.
```

**Expected Storage After Login**:
```json
{
  "workos_admin_auth": {
    "userId": "user_01KE...",
    "accessToken": "eyJ...",
    "sessionId": "session_01KE..."
  }
}
```

---

### Scenario 2: Doctor Login Flow (Bug Verification)

**Purpose**: Document the current broken behavior.

**Browser Agent Prompt**:
```
Test the doctor login flow to document the bug:
1. Clear all localStorage (fresh state)
2. Navigate to http://localhost:5175
3. Click "Provider Login" button (bottom-right floating)
4. Wait for WorkOS login page
5. Enter email: testdoc@occuhealth.com
6. Click Continue
7. Enter password: (TestPass1234
8. Click Sign in
9. Wait for any redirect
10. Screenshot the result page
11. Check current URL - is it /doctor/dashboard or /register/choose-role?
12. Check localStorage - which keys exist?
13. If on choose-role page, click "Medical Provider" card
14. Screenshot the doctor registration page
15. Navigate directly to /doctor
16. Screenshot result - does it redirect to landing?

Report: 
- Where did user land after login?
- What localStorage keys exist?
- Can user access /doctor routes?
- Evidence of DOC-001 through DOC-004 bugs.
```

**Expected Bug Observations**:
- Lands on `/register/choose-role` instead of `/doctor/dashboard`
- Token stored in `workos_admin_auth` (WRONG)
- `workos_doctor_auth` is NULL or missing
- Direct navigation to `/doctor` redirects to landing

---

### Scenario 3: Token Storage Verification

**Purpose**: Verify storage key bug.

**Browser Agent Prompt**:
```
After doctor login, verify token storage:
1. Open browser dev tools
2. Execute: JSON.stringify(Object.keys(localStorage))
3. Execute: localStorage.getItem('workos_admin_auth')
4. Execute: localStorage.getItem('workos_doctor_auth')
5. Execute: localStorage.getItem('workos_employer_auth')

Report which keys have values and which are null.
Expected bug: All tokens in workos_admin_auth regardless of user role.
```

---

### Scenario 4: Logout Flow Testing

**Purpose**: Verify logout bug.

**Browser Agent Prompt**:
```
Test logout from admin portal:
1. Restore authenticated-admin state (or login as admin)
2. Navigate to /admin
3. Click "Sign Out" button
4. Screenshot the result
5. Check URL - is it landing page or WorkOS error?
6. Check localStorage - are all keys cleared?

Expected bug: WorkOS error page instead of clean redirect.
```

---

### Scenario 5: Post-Fix Verification

**Purpose**: Verify fix worked after implementing changes.

**Browser Agent Prompt**:
```
Verify doctor login fix:
1. Clear localStorage completely
2. Navigate to http://localhost:5175
3. Click "Provider Login"
4. Login as testdoc@occuhealth.com / (TestPass1234
5. Verify redirect to /doctor/dashboard (NOT /register/choose-role)
6. Check localStorage.getItem('workos_doctor_auth') is NOT null
7. Check localStorage.getItem('workos_admin_auth') is null
8. Navigate to /doctor/appointments - verify access
9. Navigate to /doctor/schedule - verify access
10. Click Sign Out - verify clean redirect to landing

All checks should pass after fix.
```

---

## Browser-CLI Command Sequences

### Quick Auth State Check
```bash
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts evaluate "JSON.stringify(Object.keys(localStorage))"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts evaluate "localStorage.getItem('workos_admin_auth')"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts evaluate "localStorage.getItem('workos_doctor_auth')"
```

### Full Login Flow
```bash
# Navigate to landing
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate http://localhost:5175
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Click login
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Provider Login"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 2000
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Enter credentials (WorkOS page)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts type e1 "testdoc@occuhealth.com"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Continue"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts type e1 "(TestPass1234"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Sign in"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 3000

# Verify result
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot doctor-login-result.png
```

### Save/Restore State
```bash
# After successful login, save state
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts saveState authenticated-doctor

# Restore for quick testing
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts restoreState authenticated-doctor
```

---

## Saved States Reference

| State Name | Description | Usage |
|------------|-------------|-------|
| `authenticated-admin` | Admin logged in | Admin portal testing |
| `authenticated-employer` | Employer logged in | Employer portal testing |
| `authenticated-doctor` | Doctor logged in | Doctor portal testing (post-fix) |
| `landing-page` | Fresh landing page | Unauthenticated tests |

**Location**: `BROWSER-CLI/states/<name>.json`

---

## Assertion Commands for Verification

```bash
# Take fresh snapshot first
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Assert element visible
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assert e5 visible

# Assert text content
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assert e5 text "Admin Dashboard"

# Assert no console errors
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assertConsole --level=error

# Assert network request occurred
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assertNetwork employers:list
```

---

## Expected Test Results Matrix

### Before Fix

| Test | Admin | Doctor | Employer |
|------|-------|--------|----------|
| Login redirects correctly | ✅ /admin | ❌ /choose-role | ❌ /choose-role |
| Token in correct key | ✅ admin key | ❌ admin key | ❌ admin key |
| Portal accessible | ✅ | ❌ redirects | ❌ redirects |
| Logout clean | ❌ WorkOS error | ❌ WorkOS error | ❌ WorkOS error |

### After Fix

| Test | Admin | Doctor | Employer |
|------|-------|--------|----------|
| Login redirects correctly | ✅ /admin | ✅ /doctor | ✅ /employer |
| Token in correct key | ✅ admin key | ✅ doctor key | ✅ employer key |
| Portal accessible | ✅ | ✅ | ✅ |
| Logout clean | ✅ landing | ✅ landing | ✅ landing |

---

## Browser Agent Task Tool Usage

To run browser tests, use the Task tool with browser agent:

```typescript
// Example: Launch browser agent for admin login test
Task({
  subagent_type: "browser",
  description: "Test admin login flow",
  prompt: `
    Test the admin portal login:
    1. Navigate to http://localhost:5175/admin
    2. Take snapshot
    3. Click "Sign in as Admin"
    4. Enter testadmin@occuhealth.com
    5. Enter (TestPass1234
    6. Verify dashboard loads
    Report success/failure with screenshots.
  `
})
```

---

## NAV-MAP Quick Reference

For complete route information, element selectors, and loading states, refer to:
`.claude/rules/BROWSER-CLI/NAV-MAP.md`

Key routes for auth testing:
- `/` - Landing page
- `/auth/callback` - OAuth callback
- `/register/choose-role` - Role selection
- `/admin` - Admin portal
- `/doctor` - Doctor portal
- `/employer` - Employer portal

---

→ Next: AUTH_REMEDIATION_SPRINT_07_REMEDIATION
