# WorkOS Auth Migration - Auth Context Unification

**Sprint**: 04 of 06
**Index**: WORKOS_AUTH_MIGRATION_INDEX
**Depends On**: SPRINT_03_LANDING
**Next**: WORKOS_AUTH_MIGRATION_SPRINT_05_E2E

---

## Objective

Unify 3 separate auth contexts into a single generic provider to:
- Reduce code duplication (~300 LOC → ~120 LOC)
- Fix naming inconsistencies (userId vs workosUserId)
- Add proper memoization (context value not currently memoized)
- Standardize function signatures

---

## Current State: 3 Separate Providers

| Provider | Storage Key | User ID Field | Login Signature |
|----------|-------------|---------------|-----------------|
| AdminAuth | workos_admin_auth | `userId` | Object param |
| EmployerAuth | workos_employer_auth | `workosUserId` | 3 positional params |
| DoctorAuth | workos_doctor_auth | `workosUserId` | 3 positional params |

**Issues**:
1. `userId` vs `workosUserId` naming inconsistency
2. Object param vs positional params inconsistency
3. Context value recreated every render (no useMemo)
4. ~300 lines of duplicate patterns

---

## Target: Unified Generic Provider

### New File: `src/lib/workos-auth.tsx`

```typescript
import { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from "react";

// Types
type UserRole = "admin" | "employer" | "doctor";

interface AuthTokens {
  workosUserId: string;
  accessToken: string;
  refreshToken?: string;
}

interface WorkOSAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  tokens: AuthTokens | null;
  role: UserRole | null;
}

interface WorkOSAuthContextType extends WorkOSAuthState {
  login: (role: UserRole, tokens: AuthTokens) => void;
  logout: () => void;
}

// Storage keys by role
const STORAGE_KEYS: Record<UserRole, string> = {
  admin: "workos_admin_auth",
  employer: "workos_employer_auth",
  doctor: "workos_doctor_auth",
};

// Context
const WorkOSAuthContext = createContext<WorkOSAuthContextType | undefined>(undefined);

// Token expiration check
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

// Provider component
export function WorkOSAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkOSAuthState>({
    isAuthenticated: false,
    isLoading: true,
    tokens: null,
    role: null,
  });

  // Load from localStorage on mount (check all role keys)
  useEffect(() => {
    for (const [role, key] of Object.entries(STORAGE_KEYS)) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const tokens = JSON.parse(stored) as AuthTokens;
          
          // Check token expiration
          if (tokens.accessToken && isTokenExpired(tokens.accessToken)) {
            localStorage.removeItem(key);
            continue;
          }
          
          // Normalize legacy userId field to workosUserId
          if ('userId' in tokens && !tokens.workosUserId) {
            tokens.workosUserId = (tokens as any).userId;
          }
          
          setState({
            isAuthenticated: true,
            isLoading: false,
            tokens,
            role: role as UserRole,
          });
          return;
        }
      } catch (err) {
        console.error(`Failed to load ${role} auth:`, err);
        localStorage.removeItem(key);
      }
    }
    setState(prev => ({ ...prev, isLoading: false }));
  }, []);

  // Multi-tab sync
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      const roleEntry = Object.entries(STORAGE_KEYS).find(([_, key]) => key === e.key);
      if (!roleEntry) return;
      
      const [role] = roleEntry;
      if (e.newValue) {
        const tokens = JSON.parse(e.newValue) as AuthTokens;
        setState({
          isAuthenticated: true,
          isLoading: false,
          tokens,
          role: role as UserRole,
        });
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
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [state.role]);

  const login = useCallback((role: UserRole, tokens: AuthTokens) => {
    localStorage.setItem(STORAGE_KEYS[role], JSON.stringify(tokens));
    setState({
      isAuthenticated: true,
      isLoading: false,
      tokens,
      role,
    });
  }, []);

  const logout = useCallback(() => {
    if (state.role) {
      localStorage.removeItem(STORAGE_KEYS[state.role]);
    }
    setState({
      isAuthenticated: false,
      isLoading: false,
      tokens: null,
      role: null,
    });
  }, [state.role]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<WorkOSAuthContextType>(() => ({
    ...state,
    login,
    logout,
  }), [state, login, logout]);

  return (
    <WorkOSAuthContext.Provider value={contextValue}>
      {children}
    </WorkOSAuthContext.Provider>
  );
}

// Generic hook
export function useWorkOSAuth() {
  const context = useContext(WorkOSAuthContext);
  if (!context) {
    throw new Error("useWorkOSAuth must be used within WorkOSAuthProvider");
  }
  return context;
}

// Role-specific convenience hooks (backward compatible)
export function useAdminAuth() {
  const auth = useWorkOSAuth();
  return {
    adminUser: auth.role === 'admin' ? auth.tokens : null,
    isAdminAuthenticated: auth.role === 'admin' && auth.isAuthenticated,
    isLoading: auth.isLoading,
    loginAsAdmin: (params: { accessToken: string; refreshToken?: string; userId: string }) => {
      auth.login('admin', {
        workosUserId: params.userId,
        accessToken: params.accessToken,
        refreshToken: params.refreshToken,
      });
    },
    logoutAdmin: auth.logout,
  };
}

export function useEmployerAuth() {
  const auth = useWorkOSAuth();
  return {
    isAuthenticated: auth.role === 'employer' && auth.isAuthenticated,
    isLoading: auth.isLoading,
    workosUserId: auth.role === 'employer' ? auth.tokens?.workosUserId : null,
    accessToken: auth.role === 'employer' ? auth.tokens?.accessToken : null,
    loginAsEmployer: (workosUserId: string, accessToken: string, refreshToken: string) => {
      auth.login('employer', { workosUserId, accessToken, refreshToken });
    },
    logoutEmployer: auth.logout,
  };
}

export function useDoctorAuth() {
  const auth = useWorkOSAuth();
  return {
    isAuthenticated: auth.role === 'doctor' && auth.isAuthenticated,
    isLoading: auth.isLoading,
    workosUserId: auth.role === 'doctor' ? auth.tokens?.workosUserId : null,
    accessToken: auth.role === 'doctor' ? auth.tokens?.accessToken : null,
    loginAsDoctor: (workosUserId: string, accessToken: string, refreshToken: string) => {
      auth.login('doctor', { workosUserId, accessToken, refreshToken });
    },
    logoutDoctor: auth.logout,
  };
}
```

---

## Migration Steps

### Step 1: Add New Unified Provider

Create `src/lib/workos-auth.tsx` with code above.

### Step 2: Update main.tsx

```diff
- import { AdminAuthProvider } from "./lib/admin-auth";
+ import { WorkOSAuthProvider } from "./lib/workos-auth";

  <ConvexProvider client={convex}>
-   <AdminAuthProvider>
+   <WorkOSAuthProvider>
      <App />
-   </AdminAuthProvider>
+   </WorkOSAuthProvider>
  </ConvexProvider>
```

### Step 3: Update App.tsx Routes

```diff
- import { EmployerAuthProvider } from "./lib/employer-auth";
- import { DoctorAuthProvider } from "./lib/doctor-auth";

  // Remove route-level providers (now handled by unified provider)
- <Route path="/employer" element={<EmployerAuthProvider><EmployerLayout /></EmployerAuthProvider>}>
+ <Route path="/employer" element={<EmployerLayout />}>

- <Route path="/doctor" element={<DoctorAuthProvider><DoctorLayout /></DoctorAuthProvider>}>
+ <Route path="/doctor" element={<DoctorLayout />}>
```

### Step 4: Update Hook Imports

In consuming components, update imports:

```diff
- import { useAdminAuth } from "@/lib/admin-auth";
+ import { useAdminAuth } from "@/lib/workos-auth";

- import { useEmployerAuth } from "@/lib/employer-auth";
+ import { useEmployerAuth } from "@/lib/workos-auth";

- import { useDoctorAuth } from "@/lib/doctor-auth";
+ import { useDoctorAuth } from "@/lib/workos-auth";
```

### Step 5: Delete Old Files (After E2E Passes)

- `src/lib/admin-auth.tsx` (83 LOC)
- `src/lib/employer-auth.tsx` (112 LOC)
- `src/lib/doctor-auth.tsx` (107 LOC)

---

## Backward Compatibility

The convenience hooks (`useAdminAuth`, `useEmployerAuth`, `useDoctorAuth`) maintain:
- Same return type signatures
- Same function names (loginAsAdmin, logoutAdmin, etc.)
- Same localStorage keys (migration-safe)

**Breaking Change**: None for consumers.

---

## Acceptance Criteria

- [ ] Single WorkOSAuthProvider wraps entire app
- [ ] All 3 role-specific hooks work identically
- [ ] Multi-tab sync works (logout in one tab → logout in all)
- [ ] Token expiration checked on load
- [ ] Context value properly memoized (no extra re-renders)
- [ ] Legacy userId → workosUserId migration handled
- [ ] Old provider files deleted

---

→ Next: WORKOS_AUTH_MIGRATION_SPRINT_05_E2E
