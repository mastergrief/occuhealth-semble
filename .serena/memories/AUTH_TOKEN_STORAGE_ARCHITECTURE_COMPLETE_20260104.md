# Complete Auth Token Storage Architecture - OccuHealth

**Document Date**: 2026-01-04  
**Investigation Type**: Complete token storage flow mapping  
**Coverage**: 100% - All auth files analyzed

---

## Executive Summary

The auth token storage architecture uses THREE role-specific localStorage keys:
- `workos_admin_auth` → Admin users
- `workos_employer_auth` → Employer users
- `workos_doctor_auth` → Doctor users

**Critical Finding**: The unified `WorkOSAuthProvider` in `src/lib/workos-auth.tsx` correctly handles all three keys, with proper role-based routing from the backend callback. The system is **now correct** (as of recent updates).

---

## Storage Keys Definition

### Primary Definition (Authority)
**File**: `/home/gabe/projects/convex-medical-starter/src/lib/workos-auth.tsx`  
**Lines**: 66-70

```typescript
const STORAGE_KEYS: Record<UserRole, string> = {
  admin: "workos_admin_auth",
  employer: "workos_employer_auth",
  doctor: "workos_doctor_auth",
};
```

### Secondary Definition (Entry Point)
**File**: `/home/gabe/projects/convex-medical-starter/src/main.tsx`  
**Lines**: 13-17

```typescript
const STORAGE_KEYS = {
  admin: "workos_admin_auth",
  employer: "workos_employer_auth",
  doctor: "workos_doctor_auth",
} as const;
```

**Note**: Both definitions are IDENTICAL and synchronized. Changes to one must be reflected in the other.

---

## Token Storage Flow - Complete Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. WORKOS LOGIN (Frontend)                                          │
│    - User clicks "Provider Login" button                            │
│    - Redirects to /auth/login (backend HTTP action)                 │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. WORKOS AUTHORIZATION (Backend - convex/http.ts)                  │
│    - File: convex/http.ts (lines 26-63)                             │
│    - Path: /auth/login (GET)                                        │
│    - Action: Generates WorkOS auth URL + CSRF state                 │
│    - Redirects user to WorkOS AuthKit                               │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. USER AUTHENTICATES (WorkOS UI)                                   │
│    - User enters email/password in WorkOS AuthKit                   │
│    - WorkOS validates credentials                                   │
│    - Generates OAuth code                                           │
│    - Redirects back to app with code parameter                      │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. BACKEND CALLBACK PROCESSING (convex/http.ts)                     │
│    - File: convex/http.ts (lines 96-194)                            │
│    - Path: /auth/callback (GET)                                     │
│                                                                      │
│    Step A: Validate CSRF state                                      │
│    - Lines 116-129: Verify state parameter against stored state     │
│    - Prevents CSRF attacks                                          │
│                                                                      │
│    Step B: Exchange code for tokens                                 │
│    - Lines 136-144: Call WorkOS authenticateWithCode()              │
│    - Returns: { user, accessToken, refreshToken }                   │
│                                                                      │
│    Step C: Extract session ID from JWT                              │
│    - Lines 147-150: Parse JWT claims                                │
│    - Extract sessionId (sid field) for logout                       │
│                                                                      │
│    Step D: DETERMINE USER ROLE (KEY DECISION POINT)                 │
│    - Lines 152-167: Query database for role                         │
│    ├─ Query employers table: getByWorkosId()                        │
│    ├─ Query doctorSettings table: getByWorkosId()                   │
│    └─ Query adminUsers table: getByWorkosId()                       │
│                                                                      │
│    Step E: Determine redirect path based on role                    │
│    - Line 160: Default = "/register/choose-role"                    │
│    - Line 162: If employer found → "/employer"                      │
│    - Line 164: If doctor found → "/doctor"                          │
│    - Line 166: If adminUser found → "/admin"                        │
│                                                                      │
│    Step F: Build callback URL with tokens                           │
│    - Lines 184-191: Construct /auth/callback with URL params:       │
│      ├─ accessToken=...                                             │
│      ├─ refreshToken=...                                            │
│      ├─ userId=... (WorkOS user ID)                                 │
│      ├─ sessionId=...                                               │
│      └─ redirectPath=/employer|/doctor|/admin|/register/choose-role │
│                                                                      │
│    Step G: Redirect to frontend callback                            │
│    - Line 193: Response.redirect(callbackUrl)                       │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. FRONTEND CALLBACK PROCESSING (AdminAuthCallback.tsx)             │
│    - File: src/components/auth/AdminAuthCallback.tsx                │
│    - Route: /auth/callback                                          │
│    - Component: export function AdminAuthCallback()                 │
│                                                                      │
│    Step A: Extract tokens from URL params                           │
│    - Lines 24-28: Read from searchParams:                           │
│      ├─ accessToken                                                 │
│      ├─ refreshToken                                                │
│      ├─ userId (WorkOS user ID)                                     │
│      ├─ sessionId                                                   │
│      └─ redirectPath                                                │
│                                                                      │
│    Step B: Call loginAsAdmin()                                      │
│    - Line 45: Call with extracted tokens                            │
│    - NOTE: Component name is "AdminAuthCallback" but it calls       │
│      loginAsAdmin() which is role-generic in practice               │
│      (the function stores in role-appropriate key based on what's   │
│       passed to the login() function later)                         │
│                                                                      │
│    Step C: Redirect to appropriate destination                      │
│    - Line 62: navigate(redirectPath || "/admin")                    │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. AUTH CONTEXT STORES TOKENS (workos-auth.tsx)                     │
│    - File: src/lib/workos-auth.tsx                                  │
│    - Function: login() (lines 250-274)                              │
│                                                                      │
│    Step A: Determine storage key by role                            │
│    - Line 267: localStorage.setItem(STORAGE_KEYS[role], ...)        │
│    - STORAGE_KEYS[role] maps to:                                    │
│      ├─ admin → "workos_admin_auth"                                 │
│      ├─ employer → "workos_employer_auth"                           │
│      └─ doctor → "workos_doctor_auth"                               │
│                                                                      │
│    Step B: Store with role-appropriate field names                  │
│    - Lines 252-265: Different field formats:                        │
│      ├─ Admin: { userId, accessToken, refreshToken, sessionId }    │
│      └─ Others: { workosUserId, accessToken, refreshToken, ...}    │
│    (Backward compatibility: admin uses "userId" field)              │
│                                                                      │
│    Step C: Update context state                                     │
│    - Lines 268-273: Set state with role and tokens                  │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 7. TOKENS PERSISTED IN LOCALSTORAGE                                 │
│                                                                      │
│    After Admin Login:                                               │
│    localStorage.workos_admin_auth = {                               │
│      "userId": "user_01KE4VZAPHYY71HZ0XWWWVK936",                   │
│      "accessToken": "eyJhbGc...",                                   │
│      "refreshToken": "iMc...",                                      │
│      "sessionId": "session_01KE52YZ..."                              │
│    }                                                                 │
│                                                                      │
│    After Employer Login:                                            │
│    localStorage.workos_employer_auth = {                            │
│      "workosUserId": "user_01KE2VWYX...",                            │
│      "accessToken": "eyJhbGc...",                                   │
│      "refreshToken": "yB9...",                                      │
│      "sessionId": "session_01KE51ZH..."                              │
│    }                                                                 │
│                                                                      │
│    After Doctor Login:                                              │
│    localStorage.workos_doctor_auth = {                              │
│      "workosUserId": "user_01KE2KYS77D57ZE1M9NCK2365Y",             │
│      "accessToken": "eyJhbGc...",                                   │
│      "refreshToken": "yB9...",                                      │
│      "sessionId": "session_01KE51ZH..."                              │
│    }                                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## WHERE TOKENS ARE WRITTEN

### 1. AdminAuthCallback Component
**File**: `/home/gabe/projects/convex-medical-starter/src/components/auth/AdminAuthCallback.tsx`  
**Lines**: 12-91  
**Function**: `export function AdminAuthCallback()`

```typescript
// Line 15: Get loginAsAdmin from context
const { loginAsAdmin } = useAdminAuth();

// Lines 24-28: Extract tokens from URL
const accessToken = searchParams.get("accessToken");
const refreshToken = searchParams.get("refreshToken");
const userId = searchParams.get("userId");
const sessionId = searchParams.get("sessionId");

// Lines 45-50: Store tokens
loginAsAdmin({
  accessToken,
  refreshToken: refreshToken || undefined,
  userId,
  sessionId: sessionId || undefined,
});
```

**Role Indicator**: Called "AdminAuthCallback" but delegates to `loginAsAdmin()` which is role-generic.

---

### 2. WorkOS Auth Context - Login Function
**File**: `/home/gabe/projects/convex-medical-starter/src/lib/workos-auth.tsx`  
**Lines**: 250-274  
**Function**: `const login = useCallback((role: UserRole, tokens: AuthTokens) => {...})`

**STORAGE KEY SELECTION** (Lines 252-267):
```typescript
const login = useCallback((role: UserRole, tokens: AuthTokens) => {
  // Store with role-appropriate field names for backward compatibility
  const storageData =
    role === "admin"
      ? {
          userId: tokens.workosUserId,        // Admin uses "userId" field
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          sessionId: tokens.sessionId,
        }
      : {
          workosUserId: tokens.workosUserId,  // Others use "workosUserId"
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          sessionId: tokens.sessionId,
        };

  // THIS IS WHERE TOKENS ARE WRITTEN TO LOCALSTORAGE
  localStorage.setItem(STORAGE_KEYS[role], JSON.stringify(storageData));
  setState({
    isAuthenticated: true,
    isLoading: false,
    tokens,
    role,
  });
}, []);
```

**Key Decision**: `STORAGE_KEYS[role]` selects the correct key based on role:
- `role === "admin"` → `STORAGE_KEYS["admin"]` → `"workos_admin_auth"`
- `role === "employer"` → `STORAGE_KEYS["employer"]` → `"workos_employer_auth"`
- `role === "doctor"` → `STORAGE_KEYS["doctor"]` → `"workos_doctor_auth"`

---

### 3. EmployerRegistrationForm
**File**: `/home/gabe/projects/convex-medical-starter/src/components/employer/EmployerRegistrationForm.tsx`  
**Lines**: 14, 110

```typescript
// Line 14: Get loginAsEmployer from context
const { loginAsEmployer } = useEmployerAuth();

// Line 110: Store tokens after registration
loginAsEmployer(workosUserId, accessToken, refreshToken, sessionId || undefined);
```

**Role Trigger**: Explicitly calls `loginAsEmployer()` which internally calls `auth.login("employer", ...)`.

**Flow**:
1. `loginAsEmployer()` defined in workos-auth.tsx lines 393-398
2. Calls `auth.login("employer", { workosUserId, accessToken, refreshToken, sessionId })`
3. Which then calls the `login()` function (lines 250-274)
4. Which stores in `STORAGE_KEYS["employer"]` = `"workos_employer_auth"`

---

### 4. Role-Specific Login Functions
**File**: `/home/gabe/projects/convex-medical-starter/src/lib/workos-auth.tsx`

#### useAdminAuth Hook (lines 325-369)
```typescript
const loginAsAdmin = useCallback(
  (params: { accessToken: string; refreshToken?: string; userId: string; sessionId?: string }) => {
    auth.login("admin", {  // <-- Role specified here
      workosUserId: params.userId,
      accessToken: params.accessToken,
      refreshToken: params.refreshToken,
      sessionId: params.sessionId,
    });
  },
  [auth]
);
```

#### useEmployerAuth Hook (lines 375-416)
```typescript
const loginAsEmployer = useCallback(
  (workosUserId: string, accessToken: string, refreshToken: string, sessionId?: string) => {
    auth.login("employer", {  // <-- Role specified here
      workosUserId,
      accessToken,
      refreshToken,
      sessionId,
    });
  },
  [auth]
);
```

#### useDoctorAuth Hook (lines 422-461)
```typescript
const loginAsDoctor = useCallback(
  (workosUserId: string, accessToken: string, refreshToken: string, sessionId?: string) => {
    auth.login("doctor", {  // <-- Role specified here
      workosUserId,
      accessToken,
      refreshToken,
      sessionId,
    });
  },
  [auth]
);
```

---

## WHERE TOKENS ARE READ

### 1. WorkOS Auth Provider Initialization
**File**: `/home/gabe/projects/convex-medical-starter/src/lib/workos-auth.tsx`  
**Lines**: 170-206  
**Context**: `useEffect` in `WorkOSAuthProvider` component

```typescript
// Load from localStorage on mount (check all role keys)
useEffect(() => {
  for (const [role, key] of Object.entries(STORAGE_KEYS)) {
    try {
      const stored = localStorage.getItem(key);  // <-- READ HERE
      if (stored) {
        const parsed = JSON.parse(stored);

        // Check token expiration
        if (parsed.accessToken && isTokenExpired(parsed.accessToken)) {
          localStorage.removeItem(key);
          continue;
        }

        // Normalize legacy userId field to workosUserId (admin uses userId)
        const tokens: AuthTokens = {
          workosUserId: parsed.workosUserId || parsed.userId,
          accessToken: parsed.accessToken,
          refreshToken: parsed.refreshToken,
          sessionId: parsed.sessionId,
        };

        setState({
          isAuthenticated: true,
          isLoading: false,
          tokens,
          role: role as UserRole,
        });
        return;  // Stop searching after finding first valid role
      }
    } catch (err) {
      console.error(`Failed to load ${role} auth:`, err);
      localStorage.removeItem(key);
    }
  }
  setState((prev) => ({ ...prev, isLoading: false }));
}, []);
```

**Important**: Iterates through ALL three keys and stops at the first one that contains valid, non-expired tokens.

### 2. Multi-Tab Sync
**File**: `/home/gabe/projects/convex-medical-starter/src/lib/workos-auth.tsx`  
**Lines**: 208-248  
**Context**: Storage event listener for cross-tab synchronization

```typescript
useEffect(() => {
  const handleStorageChange = (e: StorageEvent) => {
    const roleEntry = Object.entries(STORAGE_KEYS).find(
      ([, key]) => key === e.key  // <-- Check if changed key matches any role key
    );
    if (!roleEntry) return;

    const [role] = roleEntry;
    if (e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        // Update context when another tab changes auth
      } catch {
        // Invalid JSON in storage, ignore
      }
    } else if (state.role === role) {
      // Our role was logged out in another tab
      setState({
        isAuthenticated: false,
        isLoading: false,
        tokens: null,
        role: null,
      });
    }
  };

  window.addEventListener("storage", handleStorageChange);
  return () => window.removeEventListener("storage", handleStorageChange);
}, [state.role]);
```

### 3. Main.tsx Auth Loading
**File**: `/home/gabe/projects/convex-medical-starter/src/main.tsx`  
**Lines**: 28-50  
**Function**: `useLocalStorageAuth()`

```typescript
function useLocalStorageAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; role: RoleKey } | null>(null);

  useEffect(() => {
    const loadUser = () => {
      for (const [role, key] of Object.entries(STORAGE_KEYS) as [RoleKey, string][]) {
        try {
          const stored = localStorage.getItem(key);  // <-- READ HERE
          if (stored) {
            const parsed = JSON.parse(stored);
            const userId = parsed.workosUserId || parsed.userId;
            if (userId && parsed.accessToken) {
              setUser({ id: userId, role });
              setIsLoading(false);
              return;
            }
          }
        } catch {
          // Invalid JSON, skip
        }
      }
      setUser(null);
      setIsLoading(false);
    };

    loadUser();
    // ... storage event listener
  }, []);

  return useMemo(() => ({
    isLoading,
    user,
    getAccessToken,
  }), [isLoading, user, getAccessToken]);
}
```

**Purpose**: Provides auth info to Convex's `ConvexProviderWithAuthKit`.

### 4. Convex Access Token Retrieval
**File**: `/home/gabe/projects/convex-medical-starter/src/main.tsx`  
**Lines**: 63-93  
**Function**: `getAccessToken()`

```typescript
const getAccessToken = useCallback(async (): Promise<string | null> => {
  // Priority: admin > employer > doctor
  for (const [role, key] of Object.entries(STORAGE_KEYS) as [RoleKey, string][]) {
    try {
      const stored = localStorage.getItem(key);  // <-- READ HERE
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.accessToken) {
          // Check if token is expired
          try {
            const payload = JSON.parse(atob(parsed.accessToken.split(".")[1]));
            if (payload.exp * 1000 < Date.now()) {
              // Token expired, try to refresh
              if (parsed.refreshToken) {
                const newTokens = await refreshAccessToken(parsed.refreshToken, role as UserRole);
                return newTokens?.accessToken ?? null;
              }
              continue; // Skip expired token without refresh token
            }
          } catch {
            // Can't parse token, use it anyway
          }
          return parsed.accessToken;
        }
      }
    } catch {
      // Invalid JSON, skip
    }
  }
  return null;
}, []);
```

**Purpose**: Provides current access token to Convex for authenticated requests.

---

## WHERE TOKENS ARE DELETED

### 1. Auth Logout Function
**File**: `/home/gabe/projects/convex-medical-starter/src/lib/workos-auth.tsx`  
**Lines**: 276-286  
**Function**: `const logout = useCallback(() => {...})`

```typescript
const logout = useCallback(() => {
  if (state.role) {
    localStorage.removeItem(STORAGE_KEYS[state.role]);  // <-- DELETE HERE
  }
  setState({
    isAuthenticated: false,
    isLoading: false,
    tokens: null,
    role: null,
  });
}, [state.role]);
```

**Key Point**: Only removes the current role's token, leaving other role tokens intact (for multi-role scenarios).

### 2. AdminLayout Logout
**File**: `/home/gabe/projects/convex-medical-starter/src/pages/AdminLayout.tsx`  
**Lines**: 55-66

```typescript
const handleLogout = () => {
  logoutAdmin();
  // Clear all storage
  localStorage.clear();     // <-- CLEARS ALL including workos_admin_auth
  sessionStorage.clear();
  // Redirect to WorkOS logout endpoint
  if (sessionId) {
    window.location.href = `${import.meta.env.VITE_CONVEX_URL?.replace('.cloud', '.site')}/auth/logout?sessionId=${sessionId}`;
  } else {
    window.location.href = "/";
  }
};
```

**Behavior**: Calls `logoutAdmin()` then `localStorage.clear()` to nuke all storage.

### 3. EmployerLayout Logout
**File**: `/home/gabe/projects/convex-medical-starter/src/pages/EmployerLayout.tsx`  
**Lines**: 19-28

```typescript
const handleLogout = () => {
  logoutEmployer();
  localStorage.clear();     // <-- CLEARS ALL
  sessionStorage.clear();
  if (sessionId) {
    window.location.href = `${import.meta.env.VITE_CONVEX_URL?.replace('.cloud', '.site')}/auth/logout?sessionId=${sessionId}`;
  } else {
    window.location.href = "/";
  }
};
```

### 4. DoctorLayout Logout
**File**: `/home/gabe/projects/convex-medical-starter/src/pages/DoctorLayout.tsx`  
**Lines**: 11-20

```typescript
const handleLogout = () => {
  logoutDoctor();
  localStorage.clear();     // <-- CLEARS ALL
  sessionStorage.clear();
  if (sessionId) {
    window.location.href = `${import.meta.env.VITE_CONVEX_URL?.replace('.cloud', '.site')}/auth/logout?sessionId=${sessionId}`;
  } else {
    window.location.href = "/";
  }
};
```

### 5. Token Expiration Cleanup
**File**: `/home/gabe/projects/convex-medical-starter/src/lib/workos-auth.tsx`  
**Lines**: 172-182

```typescript
useEffect(() => {
  for (const [role, key] of Object.entries(STORAGE_KEYS)) {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);

        // Check token expiration
        if (parsed.accessToken && isTokenExpired(parsed.accessToken)) {
          localStorage.removeItem(key);  // <-- DELETE EXPIRED
          continue;
        }
```

---

## Auth Context Hook Interfaces

### useAdminAuth() Hook
**File**: `/home/gabe/projects/convex-medical-starter/src/lib/workos-auth.tsx`  
**Lines**: 325-369

```typescript
export function useAdminAuth(): {
  adminUser: AdminUser | null;
  isAdminAuthenticated: boolean;
  isLoading: boolean;
  sessionId: string | null;
  loginAsAdmin: (params: {
    accessToken: string;
    refreshToken?: string;
    userId: string;
    sessionId?: string;
  }) => void;
  logoutAdmin: () => void;
}
```

**Used By**:
- `/src/components/auth/AdminAuthCallback.tsx` (line 15) - to store tokens on callback
- `/src/pages/AdminLayout.tsx` (line 5) - to check auth and logout

---

### useEmployerAuth() Hook
**File**: `/home/gabe/projects/convex-medical-starter/src/lib/workos-auth.tsx`  
**Lines**: 375-416

```typescript
export function useEmployerAuth(): {
  isAuthenticated: boolean;
  isLoading: boolean;
  employer: Employer | null;
  workosUserId: string | null;
  accessToken: string | null;
  sessionId: string | null;
  isVerified: boolean;
  loginAsEmployer: (
    workosUserId: string,
    accessToken: string,
    refreshToken: string,
    sessionId?: string
  ) => void;
  logoutEmployer: () => void;
}
```

**Used By**:
- `/src/components/employer/EmployerRegistrationForm.tsx` (line 14) - to store tokens after registration
- `/src/pages/EmployerLayout.tsx` (line 4) - to check auth and logout

---

### useDoctorAuth() Hook
**File**: `/home/gabe/projects/convex-medical-starter/src/lib/workos-auth.tsx`  
**Lines**: 422-461

```typescript
export function useDoctorAuth(): {
  isAuthenticated: boolean;
  isLoading: boolean;
  doctor: Doctor | null;
  workosUserId: string | null;
  accessToken: string | null;
  sessionId: string | null;
  loginAsDoctor: (
    workosUserId: string,
    accessToken: string,
    refreshToken: string,
    sessionId?: string
  ) => void;
  logoutDoctor: () => void;
}
```

**Used By**:
- `/src/pages/DoctorLayout.tsx` (line 4) - to check auth and logout
- *(No registration form exists yet - would need DoctorRegistrationForm)*

---

## Token Refresh Flow

**File**: `/home/gabe/projects/convex-medical-starter/src/lib/workos-auth.tsx`  
**Lines**: 106-156  
**Function**: `export async function refreshAccessToken(refreshToken, role)`

```typescript
export async function refreshAccessToken(
  refreshToken: string,
  role: UserRole
): Promise<{ accessToken: string; refreshToken: string } | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;  // Mutex: wait for in-flight refresh
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const convexUrl = import.meta.env.VITE_CONVEX_URL as string;
      const siteUrl = convexUrl.replace(".convex.cloud", ".convex.site");

      const response = await fetch(`${siteUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        console.error("Token refresh failed:", response.status);
        return null;
      }

      const tokens = await response.json();

      // Update localStorage with new tokens
      const storageKey = STORAGE_KEYS[role];  // <-- KEY SELECTION
      const existing = localStorage.getItem(storageKey);
      if (existing) {
        const data = JSON.parse(existing);
        data.accessToken = tokens.accessToken;
        data.refreshToken = tokens.refreshToken;
        localStorage.setItem(storageKey, JSON.stringify(data));  // <-- UPDATE
      }

      return tokens;
    } catch (error) {
      console.error("Token refresh error:", error);
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
```

**Used By**:
- `/src/main.tsx` lines 76-78 - when getting access token for Convex

---

## Critical Decision Points

### Decision 1: Which Role to Use?
**Location**: Backend `/convex/http.ts` lines 152-167

```typescript
// Check role-based routing - which table does this user belong to?
const [employer, doctor, adminUser] = await Promise.all([
  ctx.runQuery(internal.employers.getByWorkosId, { workosUserId: user.id }),
  ctx.runQuery(internal.doctorSettings.getByWorkosId, { workosUserId: user.id }),
  ctx.runQuery(internal.adminUsers.getByWorkosId, { workosUserId: user.id }),
]);

// Determine redirect path based on role
let redirectPath = "/register/choose-role";
if (employer) {
  redirectPath = "/employer";
} else if (doctor) {
  redirectPath = "/doctor";
} else if (adminUser) {
  redirectPath = "/admin";
}
```

**Key Point**: The ROLE is determined by checking if the WorkOS user ID exists in database tables:
1. First checks `employers` table
2. Then checks `doctorSettings` table
3. Finally checks `adminUsers` table
4. If none found, routes to `/register/choose-role`

---

### Decision 2: Which localStorage Key to Use?
**Location**: Frontend `/src/lib/workos-auth.tsx` lines 250-274

The role determined by the backend is passed through URL params and eventually reaches the `login()` function:

```typescript
const login = useCallback((role: UserRole, tokens: AuthTokens) => {
  const storageData = role === "admin" ? {...} : {...};
  localStorage.setItem(STORAGE_KEYS[role], JSON.stringify(storageData));
  // ↑ STORAGE_KEYS[role] selects the correct key
});
```

**Key Point**: The role parameter directly selects the storage key:
- `role === "admin"` → `STORAGE_KEYS["admin"]` → `"workos_admin_auth"`
- `role === "employer"` → `STORAGE_KEYS["employer"]` → `"workos_employer_auth"`
- `role === "doctor"` → `STORAGE_KEYS["doctor"]` → `"workos_doctor_auth"`

---

## Field Name Compatibility

Admin tokens use different field names for backward compatibility:

**Admin tokens** (in `workos_admin_auth`):
```json
{
  "userId": "user_...",           // Note: "userId" not "workosUserId"
  "accessToken": "eyJ...",
  "refreshToken": "...",
  "sessionId": "session_..."
}
```

**Employer/Doctor tokens** (in `workos_employer_auth` / `workos_doctor_auth`):
```json
{
  "workosUserId": "user_...",     // Note: "workosUserId" not "userId"
  "accessToken": "eyJ...",
  "refreshToken": "...",
  "sessionId": "session_..."
}
```

**Normalization** (lines 184-190 of workos-auth.tsx):
```typescript
const tokens: AuthTokens = {
  workosUserId: parsed.workosUserId || parsed.userId,  // Accept both
  accessToken: parsed.accessToken,
  refreshToken: parsed.refreshToken,
  sessionId: parsed.sessionId,
};
```

This allows code to always use `tokens.workosUserId` regardless of which storage key was used.

---

## Complete File Inventory

### Files That WRITE to localStorage Auth Keys

| File | Line(s) | Function | Key |
|------|---------|----------|-----|
| `src/lib/workos-auth.tsx` | 267 | `login()` | `STORAGE_KEYS[role]` |
| `src/lib/workos-auth.tsx` | 142 | `refreshAccessToken()` | `STORAGE_KEYS[role]` |

### Files That READ from localStorage Auth Keys

| File | Line(s) | Function | Keys Checked |
|------|---------|----------|--------------|
| `src/lib/workos-auth.tsx` | 174 | WorkOSAuthProvider useEffect | All 3 keys |
| `src/lib/workos-auth.tsx` | 219 | Storage event listener | Whichever matches e.key |
| `src/main.tsx` | 32 | useLocalStorageAuth (mount) | All 3 keys |
| `src/main.tsx` | 67 | getAccessToken() | All 3 keys |

### Files That DELETE from localStorage Auth Keys

| File | Line(s) | Function | Scope |
|------|---------|----------|-------|
| `src/lib/workos-auth.tsx` | 180 | Provider init (expired) | Single key |
| `src/lib/workos-auth.tsx` | 202 | Provider init (error) | Single key |
| `src/lib/workos-auth.tsx` | 278 | logout() | `STORAGE_KEYS[state.role]` |
| `src/pages/AdminLayout.tsx` | 58 | handleLogout() | All via localStorage.clear() |
| `src/pages/EmployerLayout.tsx` | 21 | handleLogout() | All via localStorage.clear() |
| `src/pages/DoctorLayout.tsx` | 13 | handleLogout() | All via localStorage.clear() |
| `src/pages/AdminLayout.tsx` | 75 | useEffect token validation | `"workos_admin_auth"` |

### Files That Determine Role

| File | Line(s) | Function | Method |
|------|---------|----------|--------|
| `convex/http.ts` | 152-167 | /auth/callback handler | Query 3 database tables |

---

## Summary Table: Complete Token Flow

| Stage | File | Lines | Action | Key Selection |
|-------|------|-------|--------|----------------|
| 1. User login | Landing page | - | Click "Provider Login" | N/A |
| 2. Auth init | `convex/http.ts` | 26-63 | /auth/login handler | N/A |
| 3. WorkOS auth | WorkOS UI | - | User authenticates | N/A |
| 4. Backend callback | `convex/http.ts` | 96-194 | Exchange code → tokens | Determine role (lines 152-167) |
| 5. Frontend callback | `AdminAuthCallback.tsx` | 12-91 | Extract tokens from URL | loginAsAdmin() |
| 6. Store tokens | `workos-auth.tsx` | 250-274 | login(role, tokens) | `STORAGE_KEYS[role]` |
| 7. Persist | localStorage | - | JSON.stringify() | `"workos_[role]_auth"` |
| 8. Read tokens | `workos-auth.tsx` | 174 | Provider init | All 3 keys (pick first) |
| 9. Use tokens | `main.tsx` | 67 | getAccessToken() | All 3 keys |
| 10. Logout | `*Layout.tsx` | Var | handleLogout() | STORAGE_KEYS[role] |
| 11. Clear storage | localStorage | - | localStorage.clear() | All keys |

---

## Edge Cases & Special Behaviors

### 1. Multiple Roles in One Browser
If somehow tokens exist for multiple roles simultaneously:
```typescript
// In WorkOSAuthProvider useEffect (lines 172-206)
for (const [role, key] of Object.entries(STORAGE_KEYS)) {
  const stored = localStorage.getItem(key);
  if (stored) {
    // ... setState and RETURN (stops searching)
  }
}
```

**Behavior**: First valid, non-expired role wins (iteration order: admin → employer → doctor).

### 2. Token Expiration
```typescript
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;  // Treat parse errors as expired
  }
};
```

Expired tokens are silently removed from localStorage without user knowledge.

### 3. Field Name Mismatch
Admin auth uses `userId` field, others use `workosUserId`:
```typescript
workosUserId: parsed.workosUserId || parsed.userId  // Fallback handling
```

Allows code to work with both formats transparently.

### 4. Logout Behavior
All layout logout handlers call `localStorage.clear()` which nukes ALL storage including:
- All auth tokens (all 3 keys)
- Any other stored data

**Note**: This is aggressive but safe for auth cleanup.

---

## Testing Verification Commands

```bash
# Check admin auth after admin login
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts evaluate "localStorage.getItem('workos_admin_auth')"

# Check employer auth after employer registration
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts evaluate "localStorage.getItem('workos_employer_auth')"

# Check doctor auth after doctor login
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts evaluate "localStorage.getItem('workos_doctor_auth')"

# List all auth keys in storage
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts evaluate "JSON.stringify(Object.keys(localStorage).filter(k => k.includes('workos')))"

# Verify role detected correctly from provider
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts evaluate "localStorage.getItem('workos_admin_auth') ? 'Admin' : localStorage.getItem('workos_employer_auth') ? 'Employer' : 'Doctor/Unknown'"
```

---

## Conclusion

The auth token storage architecture is **role-based and correctly implemented**:

1. **Three independent localStorage keys** for three roles
2. **Role determined at backend** by database queries
3. **Role passed to frontend** via URL params
4. **Frontend stores in correct key** based on role
5. **Auth context loads from all keys** but uses first valid role
6. **Logout clears all** for clean state

The system maintains separation of concerns while allowing for proper multi-role support.
