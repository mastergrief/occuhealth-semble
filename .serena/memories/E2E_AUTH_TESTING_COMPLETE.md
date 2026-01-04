# E2E Auth Testing - Complete Findings

**Testing Dates**: 2026-01-03, 2026-01-04
**Scope**: Full OAuth flow testing for Admin, Employer, Doctor roles using browser-cli
**Status**: ALL PHASES COMPLETE - 3 Critical Bugs Confirmed

---

## EXECUTIVE SUMMARY

| Bug | Severity | Status | Impact |
|-----|----------|--------|--------|
| BUG-001 | CRITICAL | ✅ CONFIRMED | Token loss breaks ALL new registrations |
| BUG-002 | HIGH | ✅ CONFIRMED | Admin UI accessible to non-admins (backend protected) |
| BUG-003 | MEDIUM | ✅ CONFIRMED | WorkOS session persists after logout |

---

## BUG-001: Token Loss During Registration Flow

**Severity**: CRITICAL  
**Status**: CONFIRMED (2026-01-03, re-confirmed 2026-01-04)

### Evidence
```
URL: /register/employer?accessToken=&refreshToken=&userId=
     (ALL PARAMS EMPTY!)

localStorage["workos_employer_auth"] = {
  "workosUserId": "",      // EMPTY
  "accessToken": "",       // EMPTY
  "refreshToken": ""       // EMPTY
}
```

### Root Cause
`AdminAuthCallback.tsx:53` navigates to `/register/choose-role` WITHOUT preserving URL parameters:
```typescript
navigate(redirectPath || "/admin", { replace: true });
// ↑ Navigates to path only, loses ?accessToken=X&userId=Y params
```

### Data Flow (Broken)
```
WorkOS Callback → accessToken, userId in URL ✅
    ↓
AdminAuthCallback → extracts tokens, navigates to redirectPath
    ↓
/register/choose-role → NO URL PARAMS! ❌
    ↓
ChooseRole.tsx → searchParams.get() returns null → uses "" fallback
    ↓
/register/employer?accessToken=&refreshToken=&userId=
    ↓
EmployerRegistrationForm → creates employer with empty workosUserId
```

### Files to Fix
1. `src/components/auth/AdminAuthCallback.tsx` - preserve URL params when navigating
2. `src/pages/register/ChooseRole.tsx` - validate tokens before proceeding
3. `src/components/employer/EmployerRegistrationForm.tsx` - reject empty tokens
4. `src/lib/workos-auth.tsx` - validate non-empty in `loginAsEmployer()`

---

## BUG-002: Admin Portal Accessible Without Proper Verification

**Severity**: HIGH  
**Status**: CONFIRMED (2026-01-03, re-confirmed 2026-01-04)

### Evidence
```
User accessing admin: user_01KE2KZFNT7A3HRQJ980NKCHQV
Only admin in DB:     user_01KE1KZP4Z9YS3TNP533BQZV8Z (Gabriel)
                      ↑ DIFFERENT USER IDs!

Admin dashboard displayed: "Welcome, user_01KE2KZFNT7A3HRQJ980NKCHQV"
Admin navigation visible: Dashboard, Employers, GDPR
```

### Root Cause
`useAdminAuth()` hook only checks localStorage role, NOT the `adminUsers` table:
```typescript
// workos-auth.tsx - VULNERABLE
isAdminAuthenticated: auth.role === "admin" && auth.isAuthenticated
// ↑ Only checks localStorage, doesn't verify against DB!
```

### Backend Protection (Working)
Backend IS protected - `requireAdmin()` blocks unauthorized requests:
```
ConvexError: {"code":"UNAUTHENTICATED","message":"Authentication required"}
at requireAdmin (authorization.ts:186)
```

### Risk Assessment
- **UI Visible**: Admin layout, navigation, welcome message
- **Data Protected**: All queries/mutations blocked by `requireAdmin()`
- **Risk**: Information disclosure, UX confusion, social engineering

### Files to Fix
1. `src/pages/AdminLayout.tsx` - add backend verification before rendering
2. `src/lib/workos-auth.tsx` - `useAdminAuth()` should query `adminUsers` table

---

## BUG-003: WorkOS Session Persists After App Logout

**Severity**: MEDIUM  
**Status**: CONFIRMED (2026-01-03, re-confirmed 2026-01-04 multiple times)

### Evidence
1. Click "Sign out" → localStorage cleared ✅
2. Click "Provider Login" → goes directly to `/register/choose-role` ❌
3. WorkOS login form NEVER shown
4. Browser restart → still authenticated via WorkOS session cookie

### Root Cause
`SignOutButton.tsx` calls `logout()` which only clears app state:
```typescript
// workos-auth.tsx - INCOMPLETE
const logout = useCallback(() => {
  localStorage.removeItem(STORAGE_KEYS[state.role]);  // App state only
  setState({ isAuthenticated: false, ... });
  // MISSING: WorkOS session termination!
}, [state.role]);
```

### Correct Pattern (AdminLayout.tsx:45-56)
```typescript
const handleLogout = () => {
  logoutAdmin();
  localStorage.clear();
  sessionStorage.clear();
  if (sessionId) {
    window.location.href = `${CONVEX_URL}/auth/logout?sessionId=${sessionId}`;
  }
};
```

### Files to Fix
1. `src/components/auth/SignOutButton.tsx` - call `/auth/logout?sessionId=...`
2. `src/lib/workos-auth.tsx` - add sessionId to logout flow
3. `src/pages/EmployerLayout.tsx` - match AdminLayout pattern
4. `src/pages/DoctorLayout.tsx` - match AdminLayout pattern

---

## TEST PHASE RESULTS

| Phase | Description | Status | Notes |
|-------|-------------|--------|-------|
| 1 | Setup | ✅ PASS | Dev server, browser-cli working |
| 2 | Employer Login | ⚠️ PARTIAL | Completed but tokens lost (BUG-001) |
| 3 | Doctor Login | ❌ BLOCKED | Can't get fresh session (BUG-003) |
| 4 | Admin Access | ⚠️ PARTIAL | UI accessible, backend protected (BUG-002) |
| 5 | Protected Routes | ❌ BROKEN | Saved states have empty auth |
| 6 | Logout Flow | ⚠️ PARTIAL | App cleared, WorkOS persists (BUG-003) |
| 7 | Unauthorized Access | ⚠️ MIXED | Employer blocked, Admin UI visible |

---

## SCREENSHOTS (Evidence)

| File | Description | Bug |
|------|-------------|-----|
| `landing-page.png` | Landing page with Provider Login | - |
| `workos-login.png` | WorkOS AuthKit login form | - |
| `choose-role.png` | Role selection page | BUG-003 |
| `employer-dashboard.png` | Dashboard after registration | BUG-001 |
| `admin-dashboard.png` | Admin portal dashboard | BUG-002 |
| `persisted-session.png` | Auth persists after browser restart | BUG-003 |
| `doctor-registration-broken.png` | Doctor flow with empty tokens | BUG-001 |
| `employer-dashboard-loading.png` | Employer stuck loading | BUG-001 |
| `admin-access-denied.png` | Saved state had empty auth | BUG-001 |
| `before-logout.png` | Before logout - authenticated | BUG-003 |
| `after-logout-session-persists.png` | After logout - still auth'd | BUG-003 |
| `admin-unauthorized-access.png` | Non-admin viewing admin UI | BUG-002 |
| `admin-backend-blocked.png` | Backend blocking admin action | BUG-002 |

---

## SAVED BROWSER STATES (Broken)

| State | Status | Issue |
|-------|--------|-------|
| `authenticated-employer` | ❌ BROKEN | Empty `workosUserId`, `accessToken`, `refreshToken` |
| `authenticated-admin` | ❌ BROKEN | Empty auth object |
| `authenticated-doctor` | ❌ NOT CREATED | BUG-003 blocked testing |

---

## TEST CREDENTIALS

| Role | Email | Password | Status |
|------|-------|----------|--------|
| Employer | testemployee@occuhealth.com | (TestPass1234 | Registration broken (BUG-001) |
| Doctor | testdoc@occuhealth.com | (TestPass1234 | Cannot test (BUG-003) |
| Admin | gennusogabriel@gmail.com | (user provides) | UI accessible, backend protected |

---

## PRIORITY FIX ORDER

### 1. BUG-001 (CRITICAL) - MUST FIX FIRST
**Why**: Blocks ALL new user registrations. No users can complete signup.

**Files**:
- `src/components/auth/AdminAuthCallback.tsx` - preserve URL params
- `src/pages/register/ChooseRole.tsx` - validate tokens present
- `src/components/employer/EmployerRegistrationForm.tsx` - reject empty
- `src/lib/workos-auth.tsx` - validate in `loginAsEmployer()`

### 2. BUG-003 (HIGH) - FIX SECOND
**Why**: Security risk + blocks testing. Users can't fully logout.

**Files**:
- `src/components/auth/SignOutButton.tsx` - call WorkOS logout
- `src/lib/workos-auth.tsx` - add sessionId handling
- `src/pages/EmployerLayout.tsx` - use AdminLayout pattern
- `src/pages/DoctorLayout.tsx` - use AdminLayout pattern

**Reference**: `src/pages/AdminLayout.tsx:45-56` (correct implementation)

### 3. BUG-002 (MEDIUM) - FIX THIRD
**Why**: Defense-in-depth. Backend already protected but UI should verify.

**Files**:
- `src/pages/AdminLayout.tsx` - query `adminUsers` before rendering
- `src/lib/workos-auth.tsx` - `useAdminAuth()` verify against DB

---

## TESTING LIMITATIONS

1. Cannot clear WorkOS session cookies via browser-cli
2. `localStorage.clear()` blocked by browser-cli security
3. Browser context persists across restarts
4. Doctor flow testing requires BUG-003 fix or external cookie clearing
