# Complete Auth Contexts Analysis - localStorage Key Usage

**Analysis Date**: 2026-01-04  
**Analyst**: Serena Code Inspector  
**Files Analyzed**: 
- `src/lib/workos-auth.tsx` (unified auth context)
- `src/components/auth/AdminAuthCallback.tsx` (admin login callback)
- `src/pages/AdminLayout.tsx` (admin portal layout)
- `src/pages/DoctorLayout.tsx` (doctor portal layout)
- `src/pages/EmployerLayout.tsx` (employer portal layout)

---

## KEY FINDINGS

### Architecture Overview
The project uses a **unified auth context** (`WorkOSAuthProvider`) that manages all three roles (admin, doctor, employer). Role-specific hooks (`useAdminAuth`, `useDoctorAuth`, `useEmployerAuth`) are thin wrappers that select role-specific data from the unified context.

**Storage Keys Defined** (line 66-70 of workos-auth.tsx):
```typescript
const STORAGE_KEYS: Record<UserRole, string> = {
  admin: "workos_admin_auth",
  employer: "workos_employer_auth",
  doctor: "workos_doctor_auth",
};
```

This is **CORRECT** - the architecture is sound.

---

## THE ACTUAL PROBLEM

### Authentication Callback Bug
The problem is NOT in the auth context code itself. The problem is in **`AdminAuthCallback.tsx`** which ONLY calls `loginAsAdmin()`:

```typescript
// Line 45-50 of AdminAuthCallback.tsx
loginAsAdmin({
  accessToken,
  refreshToken: refreshToken || undefined,
  userId,
  sessionId: sessionId || undefined,
});
```

**Critical Issue**: This callback ALWAYS calls `loginAsAdmin()` regardless of the user's actual role. All users (admin, doctor, employer) are routed through the `/auth/callback` page which ONLY stores tokens in `workos_admin_auth`.

### Where This Happens
**File**: `src/pages/auth/AdminAuthCallback.tsx`  
**Lines**: 15-50  
**Bug**: The callback doesn't detect the user's role and doesn't call `loginAsDoctor()` or `loginAsEmployer()`.

---

## SIDE-BY-SIDE COMPARISON: HOW AUTH WORKS

### UNIFIED AUTH CONTEXT (workos-auth.tsx)

#### Storage Keys Definition
| Role | Key |
|------|-----|
| Admin | `workos_admin_auth` |
| Doctor | `workos_doctor_auth` |
| Employer | `workos_employer_auth` |

#### useAdminAuth() Hook (Lines 325-369)
```typescript
export function useAdminAuth(): {
  adminUser: AdminUser | null;
  isAdminAuthenticated: boolean;
  isLoading: boolean;
  sessionId: string | null;
  loginAsAdmin: (params: {...}) => void;
  logoutAdmin: () => void;
}
```

**Key Logic**:
- Checks if `auth.role === "admin"` (line 363)
- Returns `adminUser` if role is admin and authenticated
- `isAdminAuthenticated` only true if role is "admin"
- Calls `auth.login("admin", ...)` internally

**Implementation**:
```typescript
const loginAsAdmin = useCallback(
  (params: { accessToken: string; refreshToken?: string; userId: string; sessionId?: string }) => {
    auth.login("admin", {
      workosUserId: params.userId,
      accessToken: params.accessToken,
      refreshToken: params.refreshToken,
      sessionId: params.sessionId,
    });
  },
  [auth]
);
```

#### useDoctorAuth() Hook (Lines 422-461)
```typescript
export function useDoctorAuth(): {
  isAuthenticated: boolean;
  isLoading: boolean;
  doctor: Doctor | null;
  workosUserId: string | null;
  accessToken: string | null;
  sessionId: string | null;
  loginAsDoctor: (workosUserId: string, accessToken: string, refreshToken: string, sessionId?: string) => void;
  logoutDoctor: () => void;
}
```

**Key Logic**:
- Checks if `auth.role === "doctor"` (line 449)
- Returns `workosUserId` if role is doctor and authenticated
- `isAuthenticated` only true if role is "doctor"
- Calls `auth.login("doctor", ...)` internally

**Implementation**:
```typescript
const loginAsDoctor = useCallback(
  (workosUserId: string, accessToken: string, refreshToken: string, sessionId?: string) => {
    auth.login("doctor", { workosUserId, accessToken, refreshToken, sessionId });
  },
  [auth]
);
```

#### useEmployerAuth() Hook (Lines 375-416)
```typescript
export function useEmployerAuth(): {
  isAuthenticated: boolean;
  isLoading: boolean;
  employer: Employer | null;
  workosUserId: string | null;
  accessToken: string | null;
  sessionId: string | null;
  isVerified: boolean;
  loginAsEmployer: (workosUserId: string, accessToken: string, refreshToken: string, sessionId?: string) => void;
  logoutEmployer: () => void;
}
```

**Key Logic**:
- Checks if `auth.role === "employer"` (line 403)
- Returns `workosUserId` if role is employer and authenticated
- `isAuthenticated` only true if role is "employer"
- Calls `auth.login("employer", ...)` internally

**Implementation**:
```typescript
const loginAsEmployer = useCallback(
  (workosUserId: string, accessToken: string, refreshToken: string, sessionId?: string) => {
    auth.login("employer", { workosUserId, accessToken, refreshToken, sessionId });
  },
  [auth]
);
```

#### Core login() Function (Lines 250-274)
```typescript
const login = useCallback((role: UserRole, tokens: AuthTokens) => {
  // Store with role-appropriate field names for backward compatibility
  const storageData =
    role === "admin"
      ? {
          userId: tokens.workosUserId,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          sessionId: tokens.sessionId,
        }
      : {
          workosUserId: tokens.workosUserId,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          sessionId: tokens.sessionId,
        };

  localStorage.setItem(STORAGE_KEYS[role], JSON.stringify(storageData));
  setState({
    isAuthenticated: true,
    isLoading: false,
    tokens,
    role,
  });
}, []);
```

**Key Points**:
1. Uses `STORAGE_KEYS[role]` to get the correct key
2. Stores data with role-specific field names (admin uses `userId`, others use `workosUserId`)
3. Updates state with the role

---

### ADMIN AUTH CALLBACK (AdminAuthCallback.tsx)

**File Location**: `src/components/auth/AdminAuthCallback.tsx`  
**Lines**: 1-92  

#### Flow (Lines 19-64)
```typescript
useEffect(() => {
  if (processedRef.current) return;

  const accessToken = searchParams.get("accessToken");
  const refreshToken = searchParams.get("refreshToken");
  const userId = searchParams.get("userId");
  const sessionId = searchParams.get("sessionId");
  const redirectPath = searchParams.get("redirectPath");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    setError(errorParam);
    return;
  }

  if (!accessToken || !userId) {
    setError("Missing authentication tokens");
    return;
  }

  processedRef.current = true;

  // *** THE BUG IS HERE ***
  loginAsAdmin({
    accessToken,
    refreshToken: refreshToken || undefined,
    userId,
    sessionId: sessionId || undefined,
  });

  // Redirect handling (ALWAYS to admin or /register/doctor)
  if (redirectPath?.startsWith("/register")) {
    // Pass tokens in URL params for registration pages
    navigate(`${redirectPath}?...`, { replace: true });
  } else {
    navigate(redirectPath || "/admin", { replace: true });
  }
}, [searchParams, loginAsAdmin, navigate]);
```

#### CRITICAL BUG
**Line 45**: `loginAsAdmin()` is called UNCONDITIONALLY

**Problem**: 
- This callback handles ALL users (admin, doctor, employer)
- But it ONLY calls `loginAsAdmin()`
- It doesn't check the user's role
- It doesn't call `loginAsDoctor()` or `loginAsEmployer()`

**Result**:
- Doctor login: Tokens stored in `workos_admin_auth` (wrong!)
- Employer login: Tokens stored in `workos_admin_auth` (wrong!)
- Admin login: Tokens stored in `workos_admin_auth` (correct!)

---

### LAYOUT AUTHENTICATION CHECKS

#### AdminLayout.tsx (Lines 45-46)
```typescript
const { isAdminAuthenticated, isLoading, adminUser, logoutAdmin, sessionId } = useAdminAuth();

if (!isAdminAuthenticated || dbAdmin === null) {
  // Show "Admin Access Required" page
}
```

**When Admin Logs In**:
1. `loginAsAdmin()` called → stores in `workos_admin_auth`
2. `useAdminAuth()` checks `auth.role === "admin"` → TRUE
3. `isAdminAuthenticated` → TRUE
4. ✅ Access granted

#### DoctorLayout.tsx (Lines 9, 32-33)
```typescript
const { isAuthenticated, isLoading, workosUserId, logoutDoctor, sessionId } = useDoctorAuth();

if (!isAuthenticated) {
  return <Navigate to="/" replace />;
}
```

**When Doctor Logs In**:
1. `loginAsAdmin()` called → stores in `workos_admin_auth`
2. `useDoctorAuth()` checks `auth.role === "doctor"` → FALSE (role is "admin"!)
3. `isAuthenticated` → FALSE
4. ❌ Redirected to landing page

#### EmployerLayout.tsx (Lines 17, 42-43)
```typescript
const { isAuthenticated, isLoading, workosUserId, logoutEmployer, sessionId } = useEmployerAuth();

if (!isAuthenticated) {
  return <Navigate to="/" replace />;
}
```

**When Employer Logs In**:
1. `loginAsAdmin()` called → stores in `workos_admin_auth`
2. `useEmployerAuth()` checks `auth.role === "employer"` → FALSE (role is "admin"!)
3. `isAuthenticated` → FALSE
4. ❌ Redirected to landing page

---

## ROOT CAUSE SUMMARY

| Component | Expected Behavior | Actual Behavior | Issue |
|-----------|-------------------|-----------------|-------|
| **AdminAuthCallback** | Routes to correct callback based on role | Always calls loginAsAdmin() | Hardcoded to admin only |
| **workos-auth.tsx** | Stores in role-appropriate key | Would work IF correct function called | Architecture is correct |
| **useAdminAuth()** | Checks if role === "admin" | Works correctly | No bug |
| **useDoctorAuth()** | Checks if role === "doctor" | Always finds role === "admin" | Upstream bug in callback |
| **useEmployerAuth()** | Checks if role === "employer" | Always finds role === "admin" | Upstream bug in callback |

---

## FIX LOCATION

**File**: `src/components/auth/AdminAuthCallback.tsx`  
**Lines**: 44-50  
**Required Change**: Detect user role and call appropriate login function

**Solution Approach**:
1. Query database to detect user role (admin/doctor/employer)
2. Call `loginAsAdmin()`, `loginAsDoctor()`, or `loginAsEmployer()` accordingly
3. Route to appropriate portal based on role

---

## SUPPORTING EVIDENCE

### From E2E Testing
- **Admin login works**: Uses AdminAuthCallback → loginAsAdmin() → workos_admin_auth ✅
- **Doctor login fails**: Uses AdminAuthCallback → loginAsAdmin() → workos_admin_auth ❌ (wrong key)
- **Doctor auth check fails**: useDoctorAuth() looks for role === "doctor", finds role === "admin" ❌

### localStorage After Login

**Admin Login (works)**:
```json
{
  "workos_admin_auth": {
    "userId": "user_01KE4VZAPHYY71HZ0XWWWVK936",
    "accessToken": "eyJ...",
    "refreshToken": "iMc...",
    "sessionId": "session_01KE52YZ..."
  }
}
```

**Doctor Login (broken)**:
```json
{
  "workos_admin_auth": {
    "userId": "user_01KE2KYS77D57ZE1M9NCK2365Y",  // Doctor's ID in wrong key!
    "accessToken": "eyJ...",
    "refreshToken": "yB9...",
    "sessionId": "session_01KE51ZH..."
  },
  // MISSING: workos_doctor_auth
}
```

---

## SECONDARY BUG: ROLE DETECTION

Even if the callback fixed to call the right function, there's still a problem:

**How does the callback know which function to call?**

Current flow:
1. User signs in via WorkOS AuthKit
2. Redirected to `/auth/callback?accessToken=...&userId=...`
3. Callback doesn't know if user is admin/doctor/employer
4. Hardcoded to call loginAsAdmin()

**Needed Solution**:
1. WorkOS callback should provide role/user type information
2. OR callback should query database for user role by userId
3. THEN call appropriate login function

---

## ARCHITECTURE ASSESSMENT

### What's Done Right
✅ Unified auth context with role-specific hooks  
✅ Proper storage key mapping (STORAGE_KEYS constant)  
✅ Token refresh logic with mutex  
✅ Multi-tab sync via storage events  
✅ Backward compatible field names (userId vs workosUserId)  
✅ Layout-level auth checks for each role  

### What's Broken
❌ Callback hardcoded to admin only  
❌ No role detection on login  
❌ Doctor/employer logins use wrong storage key  
❌ No database query to detect existing users  

### Recommendation
The auth context architecture is excellent. The bug is purely in the **callback routing logic**, not in the auth hooks themselves. Fix should be surgical - just make the callback detect user role and call the appropriate hook.

---

## CODE SNIPPETS FOR REFERENCE

### Current (Broken)
```typescript
// AdminAuthCallback.tsx lines 45-50
loginAsAdmin({
  accessToken,
  refreshToken: refreshToken || undefined,
  userId,
  sessionId: sessionId || undefined,
});
```

### Expected Pattern
```typescript
// Pseudo-code for correct implementation
const userRole = await queryUserRole(userId);  // Query database
switch(userRole) {
  case 'admin':
    loginAsAdmin({ accessToken, refreshToken, userId, sessionId });
    break;
  case 'doctor':
    loginAsDoctor(userId, accessToken, refreshToken, sessionId);
    break;
  case 'employer':
    loginAsEmployer(userId, accessToken, refreshToken, sessionId);
    break;
}
```

---

## SUMMARY FOR DEVELOPMENT TEAM

**Problem**: All users authenticated via AdminAuthCallback, which always calls loginAsAdmin()

**Impact**: 
- Admin logins work (coincidentally correct)
- Doctor logins fail (wrong storage key)
- Employer logins fail (wrong storage key)

**Root Cause**: Missing role detection in callback

**Fix**: Detect user role (via DB query or WorkOS response) and call appropriate login function

**Files to Change**: `src/components/auth/AdminAuthCallback.tsx` (main), potentially auth integration point

**Effort**: Low-Medium (single file, straightforward logic)

**Risk**: Low (auth context hooks unchanged, only callback behavior modified)
