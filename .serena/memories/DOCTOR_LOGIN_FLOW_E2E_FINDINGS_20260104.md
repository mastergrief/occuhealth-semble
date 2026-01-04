# Doctor Login Flow E2E Testing Findings

**Test Date**: 2026-01-04  
**Tester**: Browser-CLI Automated Testing  
**Test Account**: `testdoc@occuhealth.com` / `(TestPass1234`  
**Environment**: localhost:5175 (Vite dev server)

---

## Executive Summary

The doctor login flow and portal are **completely non-functional**. Five critical bugs prevent doctors from accessing their portal. The root cause is a fundamental auth storage mismatch where tokens are stored in the wrong localStorage key.

---

## Test Flow Executed

```
1. Navigate to http://localhost:5175 (Landing Page)
2. Click "Provider Login" button [ref=e12]
3. WorkOS AuthKit login page loads
4. Enter testdoc@occuhealth.com in email field
5. Click Continue → Password page
6. Enter password "(TestPass1234"
7. Click "Sign in" button
8. UNEXPECTED: Redirected to /register/choose-role
9. Selected "Medical Provider" card
10. UNEXPECTED: /register/doctor shows placeholder page
11. Navigate to /doctor → UNEXPECTED: Redirects to landing
12. Navigate to /admin → EXPECTED: "Admin Access Required" shown
```

---

## Bugs Identified

### BUG-001: Doctor Login Redirects to Choose Role Page

| Attribute | Value |
|-----------|-------|
| **Severity** | Critical |
| **Location** | Auth callback routing |
| **Route** | `/register/choose-role` |
| **Expected Behavior** | Existing doctor user (testdoc@occuhealth.com) should be recognized and routed directly to `/doctor/dashboard` |
| **Actual Behavior** | User is treated as new and presented with role selection |
| **Impact** | Doctors cannot access their portal without re-registering |
| **Evidence** | `doctor-choose-role.png` |

**Technical Analysis**: The auth callback doesn't query the database to check if the WorkOS userId already exists as a registered doctor. It blindly routes to choose-role.

---

### BUG-002: Doctor Registration Page is Broken/Incomplete

| Attribute | Value |
|-----------|-------|
| **Severity** | Critical |
| **Location** | `/register/doctor` route |
| **Expected Behavior** | Doctor registration form with fields for: license number, specialty, clinic name, etc. |
| **Actual Behavior** | Shows generic placeholder dashboard with "Quick Stats (Demo)", "Add Random Number" button, "0 numbers stored" |
| **Impact** | New doctors cannot complete registration |
| **Evidence** | `doctor-registration-broken.png` |

**Page Content Observed**:
```yaml
- heading "Welcome to OccuHealth"
- paragraph: Logged in as  # Note: username is blank
- heading "Quick Stats (Demo)"
- button "Add Random Number"
- text: 0 numbers stored
- heading "Your Occupational Health Dashboard"
- paragraph: This is where your patient data... coming soon.
```

**Technical Analysis**: The `/register/doctor` route is likely rendering a wrong component or the DoctorRegistrationForm component doesn't exist.

---

### BUG-003: Auth Token Storage Bug (Root Cause)

| Attribute | Value |
|-----------|-------|
| **Severity** | Critical |
| **Location** | Auth context / token storage logic |
| **Expected Behavior** | Doctor auth tokens → `workos_doctor_auth` localStorage key |
| **Actual Behavior** | Doctor auth tokens → `workos_admin_auth` localStorage key |
| **Impact** | Doctor portal auth checks fail because they look in wrong key |

**localStorage State After Doctor Login**:
```json
{
  "workos_admin_auth": {
    "userId": "user_01KE2KYS77D57ZE1M9NCK2365Y",
    "accessToken": "eyJhbGciOiJSUzI1NiIs...",
    "refreshToken": "yB9PzFX3ylC4kR2zqWyHTuDUK",
    "sessionId": "session_01KE51ZHZZAPDTF7Y2PDM8984T"
  }
}
// MISSING: workos_doctor_auth
// MISSING: workos_employer_auth
```

**Technical Analysis**: The login flow uses a single storage key (`workos_admin_auth`) for all users. The role-specific auth hooks (`useDoctorAuth`, `useEmployerAuth`) check different keys that are never populated.

---

### BUG-004: Doctor Portal Routes Redirect to Landing

| Attribute | Value |
|-----------|-------|
| **Severity** | Critical |
| **Location** | `/doctor/*` routes, `DoctorLayout.tsx` |
| **Expected Behavior** | DoctorLayout with sidebar navigation (Dashboard, Appointments, Schedule, Reports, Settings) |
| **Actual Behavior** | Immediate redirect to `/` (landing page) |
| **Evidence** | `doctor-portal-redirect.png` |

**Technical Analysis**:
```typescript
// DoctorLayout.tsx (expected behavior per NAV-MAP)
const { isAuthenticated } = useDoctorAuth();
if (!isAuthenticated) {
  return <Navigate to="/" replace />;
}
```

The `useDoctorAuth()` hook checks `workos_doctor_auth` which is empty (tokens are in `workos_admin_auth`), so `isAuthenticated` is always false.

---

### BUG-005: Logout Shows WorkOS Error Page

| Attribute | Value |
|-----------|-------|
| **Severity** | Medium |
| **Location** | Sign Out functionality |
| **Expected Behavior** | Clean logout → return to landing page |
| **Actual Behavior** | WorkOS error page: "Something went wrong - Couldn't sign in. If you are not sure what happened, please contact your organization admin." |
| **Evidence** | `logout-error.png` |

**Technical Analysis**: The logout likely redirects to a WorkOS URL that expects different parameters or the session termination isn't properly coordinated with WorkOS.

---

## What Works Correctly

| Feature | Status | Notes |
|---------|--------|-------|
| Landing page | ✅ PASS | Loads correctly with all navigation |
| WorkOS AuthKit UI | ✅ PASS | Email/password entry, OAuth buttons work |
| Admin access control | ✅ PASS | Non-admin users see "Admin Access Required" |
| Provider Login button | ✅ PASS | Correctly navigates to WorkOS auth |

---

## Auth Architecture Analysis

### Expected Flow (per NAV-MAP)
```
Login → WorkOS Auth → Callback → Check User Role in DB → Route to Portal
                                  ├─ Admin → /admin
                                  ├─ Doctor → /doctor/dashboard  
                                  ├─ Employer → /employer/dashboard
                                  └─ New User → /register/choose-role
```

### Actual Flow (Observed)
```
Login → WorkOS Auth → Callback → Store in workos_admin_auth → /register/choose-role
                                                              (regardless of existing user)
```

### Storage Key Mapping
| Role | Expected Key | Actual Key Used |
|------|--------------|-----------------|
| Admin | `workos_admin_auth` | `workos_admin_auth` ✓ |
| Doctor | `workos_doctor_auth` | `workos_admin_auth` ✗ |
| Employer | `workos_employer_auth` | `workos_admin_auth` ✗ |

---

## Files to Investigate

Based on findings, these files likely need fixes:

| File | Suspected Issue |
|------|-----------------|
| `src/contexts/DoctorAuthContext.tsx` | Uses wrong localStorage key |
| `src/contexts/EmployerAuthContext.tsx` | Uses wrong localStorage key |
| `src/pages/auth/AdminAuthCallback.tsx` | Stores tokens in wrong key, doesn't check existing role |
| `src/pages/register/ChooseRole.tsx` | Shouldn't appear for existing users |
| `src/pages/register/DoctorRegistrationForm.tsx` | Missing or not wired to route |
| `src/layouts/DoctorLayout.tsx` | Auth check using wrong context |
| `src/App.tsx` | Route configuration for /register/doctor |

---

## Screenshots Captured

| File | Description |
|------|-------------|
| `workos-signin.png` | WorkOS AuthKit login page |
| `doctor-choose-role.png` | Unexpected role selection for existing user |
| `doctor-registration-broken.png` | Broken /register/doctor placeholder |
| `doctor-portal-redirect.png` | Doctor portal redirected to landing |
| `admin-access-denied-doctor.png` | Admin portal correctly blocked |
| `logout-error.png` | WorkOS error on logout |

---

## Recommended Remediation

### Priority 1: Fix Auth Token Storage
- Modify auth callback to store tokens in role-appropriate key
- Or unify to single key and have all auth hooks check same key

### Priority 2: Fix Role Detection on Login
- Query database for existing doctor/employer record by WorkOS userId
- Route existing users directly to their portal
- Only show choose-role for genuinely new users

### Priority 3: Implement Doctor Registration
- Create proper DoctorRegistrationForm component
- Wire to /register/doctor route
- Include fields: license, specialty, clinic, contact

### Priority 4: Fix Logout Flow
- Ensure proper WorkOS session termination
- Clear all auth localStorage keys
- Redirect to landing page (not WorkOS error)

---

## Test Commands Used

```bash
# Navigation
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate http://localhost:5175
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate http://localhost:5175/doctor
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate http://localhost:5175/admin

# Snapshots
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot --full

# Interactions
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click e12  # Provider Login
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts type e1 "testdoc@occuhealth.com"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click e2   # Continue
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts type e3 "(TestPass1234"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click e4   # Sign in

# Evidence
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot <name>.png
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts console
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts evaluate "JSON.stringify(Object.keys(localStorage))"
```

---

## Conclusion

The doctor authentication flow is fundamentally broken due to a token storage architecture mismatch. All auth tokens are stored in `workos_admin_auth` but role-specific auth hooks check different keys (`workos_doctor_auth`, `workos_employer_auth`) which are never populated. This results in all doctor/employer portal access being denied.

Additionally, the role detection on callback doesn't check for existing users, and the doctor registration page component is missing or misconfigured.

**Estimated Fix Complexity**: Medium-High (requires auth architecture changes)
