# Architecture & Root Cause Analysis

**Sprint**: 02 of 07
**Index**: AUTH_REMEDIATION_INDEX
**Depends On**: Sprint 01
**Next**: AUTH_REMEDIATION_SPRINT_03_SECURITY

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Auth Flow Architecture                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User clicks "Provider Login"                                               │
│         │                                                                   │
│         ▼                                                                   │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  BACKEND: convex/http.ts /auth/callback ✅ WORKS CORRECTLY          │    │
│  │                                                                     │    │
│  │  const [employer, doctor, adminUser] = await Promise.all([          │    │
│  │    ctx.runQuery(internal.employers.getByWorkosId, {...}),          │    │
│  │    ctx.runQuery(internal.doctorSettings.getByWorkosId, {...}),     │    │
│  │    ctx.runQuery(internal.adminUsers.getByWorkosId, {...}),         │    │
│  │  ]);                                                                │    │
│  │                                                                     │    │
│  │  if (employer) redirectPath = "/employer";                          │    │
│  │  else if (doctor) redirectPath = "/doctor";                         │    │
│  │  else if (adminUser) redirectPath = "/admin";                       │    │
│  │  else redirectPath = "/register/choose-role";                       │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│         │                                                                   │
│         │ Redirect to /auth/callback?accessToken=...&redirectPath=/doctor  │
│         ▼                                                                   │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  FRONTEND: AdminAuthCallback.tsx ❌ THE BUG                         │    │
│  │                                                                     │    │
│  │  Lines 44-50:                                                       │    │
│  │  loginAsAdmin({           ← ALWAYS admin, ignores redirectPath     │    │
│  │    accessToken,                                                     │    │
│  │    refreshToken,                                                    │    │
│  │    userId,                                                          │    │
│  │    sessionId,                                                       │    │
│  │  });                                                                │    │
│  │                                                                     │    │
│  │  navigate(redirectPath);   ← Goes to /doctor but wrong token!      │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│         │                                                                   │
│         ▼                                                                   │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                   │
│  │ AdminLayout   │  │ DoctorLayout  │  │EmployerLayout │                   │
│  │               │  │               │  │               │                   │
│  │ useAdminAuth()│  │useDoctorAuth()│  │useEmployerAuth│                   │
│  │ Checks: admin │  │Checks: doctor │  │Checks: employer│                  │
│  │ Finds: ✅     │  │Finds: ❌ NULL │  │Finds: ❌ NULL │                   │
│  └───────────────┘  └───────────────┘  └───────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Storage Key Architecture

**File**: `src/lib/workos-auth.tsx` (lines 66-70)

```typescript
const STORAGE_KEYS: Record<UserRole, string> = {
  admin: "workos_admin_auth",
  employer: "workos_employer_auth",
  doctor: "workos_doctor_auth",
};
```

**Mirrored in**: `src/main.tsx` (lines 13-17) - MUST stay synchronized

## Current vs Expected Token Storage

### After Doctor Login (CURRENT - BROKEN)
```json
{
  "workos_admin_auth": {
    "userId": "user_01KE2KYS...",
    "accessToken": "eyJ...",
    "sessionId": "session_01KE..."
  },
  "workos_doctor_auth": null,    // ❌ EMPTY
  "workos_employer_auth": null   // ❌ EMPTY
}
```

### After Doctor Login (EXPECTED - FIXED)
```json
{
  "workos_admin_auth": null,
  "workos_doctor_auth": {        // ✅ CORRECT KEY
    "workosUserId": "user_01KE2KYS...",
    "accessToken": "eyJ...",
    "sessionId": "session_01KE..."
  },
  "workos_employer_auth": null
}
```

## Source Tree with Line Counts

```
src/
├── lib/
│   └── workos-auth.tsx (477 lines) ✅ AUTH CONTEXT
│       ├── STORAGE_KEYS (L66-70)
│       ├── WorkOSAuthProvider (L162-303)
│       ├── useAdminAuth() (L325-369)
│       ├── useDoctorAuth() (L422-461)
│       └── useEmployerAuth() (L375-416)
│
├── components/auth/
│   └── AdminAuthCallback.tsx (91 lines) ❌ BUG LOCATION
│       ├── Token extraction (L23-28)
│       └── loginAsAdmin ONLY (L44-50) ← FIX HERE
│
├── pages/
│   ├── AdminLayout.tsx (140 lines) ✅ WORKS
│   ├── DoctorLayout.tsx (100 lines) ❌ AUTH FAILS
│   └── EmployerLayout.tsx (142 lines) ❌ AUTH FAILS
│
├── components/
│   ├── employer/EmployerRegistrationForm.tsx (356 lines) ✅
│   └── doctor/DoctorRegistrationForm.tsx ❌ MISSING
│
└── main.tsx (93 lines)
    └── STORAGE_KEYS duplicate (L13-17)

convex/
├── http.ts (286 lines) ✅ BACKEND WORKS
│   ├── /auth/login (L26-63)
│   ├── /auth/callback (L96-202) - Role detection ✅
│   ├── /auth/logout (L65-94)
│   └── /auth/refresh (L238-284)
│
└── auth.config.ts (31 lines) ✅ JWT CONFIG
```

## Auth Hook Interface Comparison

| Aspect | useAdminAuth | useDoctorAuth | useEmployerAuth |
|--------|--------------|---------------|-----------------|
| **Auth field** | `isAdminAuthenticated` | `isAuthenticated` | `isAuthenticated` |
| **User ID** | `adminUser.userId` | `workosUserId` | `workosUserId` |
| **Login signature** | Object params | Positional params | Positional params |
| **Storage key** | `workos_admin_auth` | `workos_doctor_auth` | `workos_employer_auth` |

**Inconsistency Note**: Admin uses object params `loginAsAdmin({...})`, while doctor/employer use positional `loginAsDoctor(userId, token, ...)`.

## Bug Fix Required

**File**: `src/components/auth/AdminAuthCallback.tsx`

**Current (lines 44-50)**:
```typescript
loginAsAdmin({
  accessToken,
  refreshToken: refreshToken || undefined,
  userId,
  sessionId: sessionId || undefined,
});
```

**Fixed**:
```typescript
// Detect role from redirectPath and call appropriate login
if (redirectPath?.startsWith('/admin')) {
  loginAsAdmin({ accessToken, refreshToken, userId, sessionId });
} else if (redirectPath?.startsWith('/doctor')) {
  loginAsDoctor(userId, accessToken, refreshToken, sessionId);
} else if (redirectPath?.startsWith('/employer')) {
  loginAsEmployer(userId, accessToken, refreshToken, sessionId);
} else {
  // New user - no login needed, will register
}
```

**Required imports**:
```typescript
const { loginAsAdmin } = useAdminAuth();
const { loginAsDoctor } = useDoctorAuth();
const { loginAsEmployer } = useEmployerAuth();
```

## Logout Flow Architecture

```
User clicks "Sign Out"
       │
       ▼
handleLogout() in Layout
       │
       ├─ Call logoutAdmin/Doctor/Employer()
       │     └─ Clears localStorage key
       │     └─ Resets context state
       │
       ├─ localStorage.clear()
       ├─ sessionStorage.clear()
       │
       └─ window.location.href = /auth/logout?sessionId=...
              │
              ▼
       Convex /auth/logout
              │
              └─ workos.getLogoutUrl({ sessionId, returnTo: appUrl })
                     │
                     └─ Redirect to WorkOS → Clear session → Return to app
```

**Bug**: WorkOS error page shown instead of clean redirect. Root cause likely invalid sessionId or returnTo URL mismatch.

---

→ Next: AUTH_REMEDIATION_SPRINT_03_SECURITY
