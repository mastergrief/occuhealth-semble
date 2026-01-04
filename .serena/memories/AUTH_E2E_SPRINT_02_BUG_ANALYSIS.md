# Bug Analysis - Detailed Root Cause & Evidence

**Sprint**: 02 of 07  
**Index**: AUTH_E2E_INDEX  
**Depends On**: AUTH_E2E_SPRINT_01_EXECUTIVE_SUMMARY  
**Next**: AUTH_E2E_SPRINT_03_ARCHITECTURE

---

## BUG-001: Token Loss During Registration

### Severity: CRITICAL
### Status: ❌ CONFIRMED - STILL PRESENT

### Root Cause
`AdminAuthCallback.tsx:53` navigates to redirectPath WITHOUT preserving URL query parameters:

```typescript
// BROKEN CODE - loses tokens
navigate(redirectPath || "/admin", { replace: true });
```

### Data Flow (Broken)
```
WorkOS Callback → accessToken, userId in URL ✅
    ↓
AdminAuthCallback → extracts tokens, navigates to redirectPath
    ↓
/register/choose-role → NO URL PARAMS! ❌
    ↓
ChooseRole.tsx:16-21 → searchParams.get() returns null → "" fallback
    ↓
/register/employer?accessToken=&refreshToken=&userId=  (ALL EMPTY!)
    ↓
EmployerRegistrationForm → creates employer with empty workosUserId
```

### Evidence
```javascript
// ChooseRole.tsx lines 16-21
const accessToken = searchParams.get("accessToken") || "";  // ← Empty!
const refreshToken = searchParams.get("refreshToken") || "";
const userId = searchParams.get("userId") || "";

// localStorage after registration
workos_employer_auth = {
  "workosUserId": "",      // EMPTY
  "accessToken": "",       // EMPTY
  "refreshToken": ""       // EMPTY
}
```

### Files to Fix
1. `src/components/auth/AdminAuthCallback.tsx:53` - Preserve URL params
2. `src/pages/register/ChooseRole.tsx:16-21` - Validate tokens present
3. `src/components/employer/EmployerRegistrationForm.tsx` - Reject empty
4. `src/lib/workos-auth.tsx` - Validate in `loginAsEmployer()`

### Impact
- **ALL new user registrations fail**
- Users created with empty workosUserId
- Cannot authenticate on subsequent logins

---

## BUG-002: Admin UI Without DB Verification

### Severity: HIGH
### Status: ❌ CONFIRMED - STILL PRESENT

### Root Cause
`useAdminAuth()` only checks localStorage role, NOT the `adminUsers` database table:

```typescript
// workos-auth.tsx:298 - VULNERABLE
isAdminAuthenticated: auth.role === "admin" && auth.isAuthenticated
// ↑ Only checks localStorage, doesn't verify against DB!
```

### Evidence
```
User accessing admin: user_01KE2KZFNT7A3HRQJ980NKCHQV
Only admin in DB:     user_01KE1KZP4Z9YS3TNP533BQZV8Z (Gabriel)
                      ↑ DIFFERENT USER IDs!

Admin dashboard displayed: "Welcome, user_01KE2KZFNT7A3HRQJ980NKCHQV"
Admin navigation visible: Dashboard, Employers, GDPR
```

### Backend Protection (Working)
Backend IS protected - `requireAdmin()` blocks unauthorized requests:
```
ConvexError: {"code":"UNAUTHENTICATED","message":"Authentication required"}
at requireAdmin (authorization.ts:186)
```

### Risk Assessment
| Aspect | Status |
|--------|--------|
| UI Visible | ❌ Yes - Layout, nav, welcome |
| Data Protected | ✅ Yes - Backend guards |
| Risk Level | MEDIUM - Info disclosure, UX confusion |

### Files to Fix
1. `src/pages/AdminLayout.tsx` - Query `adminUsers` before rendering
2. `src/lib/workos-auth.tsx` - `useAdminAuth()` verify against DB

---

## BUG-003: WorkOS Session Persists After Logout

### Severity: MEDIUM
### Status: ⚠️ PARTIALLY FIXED (Admin only)

### Root Cause
`logout()` in `workos-auth.tsx` only clears app state, not WorkOS session:

```typescript
// workos-auth.tsx:211-221 - INCOMPLETE
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

### Evidence
1. Click "Sign out" → localStorage cleared ✅
2. Click "Provider Login" → goes directly to `/register/choose-role` ❌
3. WorkOS login form NEVER shown
4. Browser restart → still authenticated via WorkOS session cookie

### Fix Status by Layout

| Layout | sessionId Exposed | Logout Complete | Status |
|--------|-------------------|-----------------|--------|
| AdminLayout | ✅ Yes | ✅ Yes | FIXED |
| EmployerLayout | ❌ No | ❌ No | BROKEN |
| DoctorLayout | ❌ No | ❌ No | BROKEN |
| SignOutButton | ❌ No | ❌ No | BROKEN |

### Files to Fix
1. `src/lib/workos-auth.tsx` - Expose sessionId in Employer/Doctor hooks
2. `src/components/auth/SignOutButton.tsx` - Call `/auth/logout?sessionId=...`
3. `src/pages/EmployerLayout.tsx` - Match AdminLayout pattern
4. `src/pages/DoctorLayout.tsx` - Match AdminLayout pattern

---

## Bug Dependency Chain

```
BUG-001 (Token Loss) ──┐
                       ├──→ BUG-003 worsens (can't test logout)
BUG-003 (Session) ─────┘

BUG-002 (Admin UI) ──── Independent (frontend-only issue)
```

---

## Priority Fix Order

1. **BUG-001** - MUST FIX FIRST (blocks all registrations)
2. **BUG-003** - FIX SECOND (security + testing blocked)
3. **BUG-002** - FIX THIRD (defense-in-depth)

---

→ Next: AUTH_E2E_SPRINT_03_ARCHITECTURE
