# OccuHealth Authentication Extension API - Deep Analysis

## Executive Summary

The OccuHealth authentication system uses a **table-based role detection pattern** where user roles are determined by table membership rather than JWT claims. This creates specific extension points and constraints for adding new roles.

---

## 1. ADDING A NEW ROLE (e.g., "Nurse")

### 1.1 Required Changes Inventory

| Location | File | Change Type | Lines to Modify |
|----------|------|-------------|-----------------|
| Type Definition | `src/lib/workos-auth.tsx:15` | Add to union | `"admin" \| "employer" \| "doctor" \| "nurse"` |
| Storage Key | `src/lib/workos-auth.tsx:65-69` | Add mapping | `nurse: "workos_nurse_auth"` |
| Role Hook | `src/lib/workos-auth.tsx` (new) | Create hook | ~35 lines (follow `useDoctorAuth` pattern) |
| Provider Alias | `src/lib/workos-auth.tsx` (new) | Create alias | `export const NurseAuthProvider = WorkOSAuthProvider;` |
| Schema Table | `convex/schema.ts` | Add table | ~15 lines with index |
| Backend Module | `convex/nurseSettings.ts` (new) | Create module | ~70 lines |
| Auth Guard | `convex/authModules/authorization.ts` | Add guard | ~25 lines |
| Error Code | `convex/authModules/authorization.ts:32-37` | Add code | `"NURSE_NOT_FOUND"` |
| OAuth Callback | `convex/http.ts:153-157` | Add query | +1 parallel query |
| Role Detection | `convex/http.ts:159-167` | Add branch | +3 lines |
| Layout | `src/pages/NurseLayout.tsx` (new) | Create layout | ~100 lines |
| Routes | `src/App.tsx` | Add routes | ~10 lines |
| Registration | `src/pages/register/ChooseRole.tsx` | Add option | +1 card |

### 1.2 Step-by-Step Implementation Guide

**STEP 1: Update Type System (Frontend)**

```typescript
// src/lib/workos-auth.tsx

// Line 15: Add to UserRole
export type UserRole = "admin" | "employer" | "doctor" | "nurse";

// Lines 65-69: Add storage key
const STORAGE_KEYS: Record<UserRole, string> = {
  admin: "workos_admin_auth",
  employer: "workos_employer_auth",
  doctor: "workos_doctor_auth",
  nurse: "workos_nurse_auth",  // NEW
};
```

**STEP 2: Create Role Hook (Frontend)**

```typescript
// src/lib/workos-auth.tsx - Add after useDoctorAuth

interface Nurse {
  _id: Id<"nurseSettings">;
  workosUserId: string;
  email: string;
  name: string;
  licenseNumber: string;
}

export function useNurseAuth(): {
  isAuthenticated: boolean;
  isLoading: boolean;
  nurse: Nurse | null;
  workosUserId: string | null;
  accessToken: string | null;
  loginAsNurse: (workosUserId: string, accessToken: string, refreshToken: string) => void;
  logoutNurse: () => void;
} {
  const auth = useWorkOSAuth();

  const loginAsNurse = useCallback(
    (workosUserId: string, accessToken: string, refreshToken: string) => {
      auth.login("nurse", { workosUserId, accessToken, refreshToken });
    },
    [auth]
  );

  return {
    isAuthenticated: auth.role === "nurse" && auth.isAuthenticated,
    isLoading: auth.isLoading,
    nurse: null, // Fetched via Convex in consuming components
    workosUserId: auth.role === "nurse" ? (auth.tokens?.workosUserId ?? null) : null,
    accessToken: auth.role === "nurse" ? (auth.tokens?.accessToken ?? null) : null,
    loginAsNurse,
    logoutNurse: auth.logout,
  };
}

export const NurseAuthProvider = WorkOSAuthProvider;
```

**STEP 3: Add Database Table (Backend)**

```typescript
// convex/schema.ts - Add after doctorSettings

  // ---------------------------------------------------------------------------
  // Nurse Settings
  // ---------------------------------------------------------------------------
  nurseSettings: defineTable({
    workosUserId: v.string(),
    email: v.string(),
    name: v.string(),
    licenseNumber: v.string(),
    specialization: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_workos_user", ["workosUserId"]),
```

**STEP 4: Create Backend Module**

```typescript
// convex/nurseSettings.ts
import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";

export const create = mutation({
  args: {
    workosUserId: v.string(),
    email: v.string(),
    name: v.string(),
    licenseNumber: v.string(),
    specialization: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("nurseSettings", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const getByWorkosId = internalQuery({
  args: { workosUserId: v.string() },
  handler: async (ctx, { workosUserId }) => {
    return ctx.db
      .query("nurseSettings")
      .withIndex("by_workos_user", (q) => q.eq("workosUserId", workosUserId))
      .first();
  },
});

export const getByWorkosUserId = query({
  args: { workosUserId: v.string() },
  handler: async (ctx, { workosUserId }) => {
    return ctx.db
      .query("nurseSettings")
      .withIndex("by_workos_user", (q) => q.eq("workosUserId", workosUserId))
      .first();
  },
});
```

**STEP 5: Add Authorization Guard**

```typescript
// convex/authModules/authorization.ts

// Line 32-37: Add error code
export type AuthErrorCode =
  | "UNAUTHENTICATED"
  | "UNAUTHORIZED"
  | "EMPLOYER_NOT_FOUND"
  | "DOCTOR_NOT_FOUND"
  | "ADMIN_NOT_FOUND"
  | "NURSE_NOT_FOUND";  // NEW

// Add after requireAdmin()
export async function requireNurseAccess(
  ctx: AuthContext
): Promise<Doc<"nurseSettings">> {
  const user = await getAuthenticatedUser(ctx);

  if (!user) {
    throw new ConvexError({
      code: "UNAUTHENTICATED" as const,
      message: "Authentication required",
    });
  }

  const nurse = await ctx.db
    .query("nurseSettings")
    .withIndex("by_workos_user", (q) => q.eq("workosUserId", user.workosUserId))
    .first();

  if (!nurse) {
    throw new ConvexError({
      code: "NURSE_NOT_FOUND" as const,
      message: "Nurse access required",
    });
  }

  return nurse;
}
```

**STEP 6: Update OAuth Callback**

```typescript
// convex/http.ts - Lines 153-167

// Add to parallel queries
const [employer, doctor, adminUser, nurse] = await Promise.all([
  ctx.runQuery(internal.employers.getByWorkosId, { workosUserId: user.id }),
  ctx.runQuery(internal.doctorSettings.getByWorkosId, { workosUserId: user.id }),
  ctx.runQuery(internal.adminUsers.getByWorkosId, { workosUserId: user.id }),
  ctx.runQuery(internal.nurseSettings.getByWorkosId, { workosUserId: user.id }),  // NEW
]);

// Update role detection logic
let redirectPath = "/register/choose-role";
if (employer) {
  redirectPath = "/employer";
} else if (doctor) {
  redirectPath = "/doctor";
} else if (nurse) {           // NEW
  redirectPath = "/nurse";    // NEW
} else if (adminUser) {
  redirectPath = "/admin";
}
```

**STEP 7: Create Layout and Routes**

```typescript
// src/pages/NurseLayout.tsx
import { Outlet } from "react-router-dom";
import { useNurseAuth } from "@/lib/workos-auth";

export function NurseLayout() {
  const { isAuthenticated, isLoading, workosUserId } = useNurseAuth();
  
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please sign in</div>;
  
  return (
    <div className="flex min-h-screen">
      <nav className="w-64 border-r p-4">
        <a href="/nurse/dashboard">Dashboard</a>
        <a href="/nurse/patients">Patients</a>
        <a href="/nurse/settings">Settings</a>
      </nav>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}

// src/App.tsx - Add routes
<Route path="/nurse" element={<NurseAuthProvider><NurseLayout /></NurseAuthProvider>}>
  <Route path="dashboard" element={<NurseDashboard />} />
  <Route path="patients" element={<NursePatients />} />
  <Route path="settings" element={<NurseSettings />} />
</Route>
```

---

## 2. LIFECYCLE HOOKS ANALYSIS

### 2.1 Implemented Hooks

| Hook | Location | Trigger | Implementation |
|------|----------|---------|----------------|
| **onLogin** | `WorkOSAuthProvider.login()` | Token storage | Sets localStorage, updates state |
| **onLogout** | `WorkOSAuthProvider.logout()` | Session end | Clears localStorage, resets state |
| **onTokenLoad** | `useEffect()` mount | App init | Loads from localStorage, validates expiry |
| **onStorageChange** | `StorageEvent` | Multi-tab | Syncs state across tabs |
| **onTokenExpired** | `isTokenExpired()` | Token check | Auto-clears expired tokens |

### 2.2 NOT Implemented (Extension Points)

| Hook | Purpose | Implementation Guide |
|------|---------|---------------------|
| **onTokenRefresh** | Auto-refresh before expiry | Call `workos.userManagement.refreshToken()` |
| **onSessionValidate** | Periodic server check | Poll backend with accessToken |
| **beforeLogout** | Cleanup tasks | Add callback prop to WorkOSAuthProvider |
| **onAuthError** | Centralized error handling | Add error boundary + callback |
| **onRoleChange** | Role switching | Currently not supported (single role per session) |

### 2.3 Token Refresh Implementation (Gap)

The system stores `refreshToken` but never uses it:

```typescript
// CURRENT: Token stored but unused
const tokens: AuthTokens = {
  workosUserId: parsed.workosUserId,
  accessToken: parsed.accessToken,
  refreshToken: parsed.refreshToken,  // STORED BUT NEVER USED
  sessionId: parsed.sessionId,
};

// RECOMMENDED: Add refresh logic
const refreshAccessToken = async (): Promise<string | null> => {
  if (!state.tokens?.refreshToken) return null;
  
  const response = await fetch(`${CONVEX_SITE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: state.tokens.refreshToken }),
  });
  
  if (!response.ok) {
    logout(); // Force re-login
    return null;
  }
  
  const { accessToken } = await response.json();
  // Update stored token
  login(state.role!, { ...state.tokens, accessToken });
  return accessToken;
};
```

---

## 3. VALIDATION & SECURITY MODEL

### 3.1 Token Validation Chain

```
                    ┌─────────────────────────────────────────┐
                    │           TOKEN VALIDATION              │
                    └─────────────────────────────────────────┘
                                        │
            ┌───────────────────────────┼───────────────────────────┐
            │                           │                           │
            ▼                           ▼                           ▼
    ┌───────────────┐         ┌─────────────────┐         ┌─────────────────┐
    │   Frontend    │         │    Backend      │         │    WorkOS       │
    │   (Client)    │         │    (Convex)     │         │    (OAuth)      │
    └───────┬───────┘         └────────┬────────┘         └────────┬────────┘
            │                          │                           │
    isTokenExpired()            getUserIdentity()           JWT Signature
    - Decode JWT                - Convex auth.getUserIdentity()   - RSA256
    - Check exp claim           - Returns {subject, issuer}       - Auto-verified
    - Auto-cleanup              - Null if invalid                 - WorkOS JWKS
            │                          │                           │
            ▼                          ▼                           ▼
    localStorage cleanup        ConvexError thrown         OAuth denied
```

### 3.2 Role Verification Enforcement Points

| Layer | Mechanism | Bypass Prevention |
|-------|-----------|-------------------|
| **Frontend** | Role-specific hooks | Only returns data if `auth.role === "<role>"` |
| **Backend** | `requireX()` guards | Database query confirms table membership |
| **OAuth** | JWT claims | WorkOS signs token; Convex verifies signature |

### 3.3 Role Escalation Prevention

**Why roles cannot be escalated:**

1. **Role determined by table membership** - Not stored in JWT
2. **Backend guards query database** - Each request re-verifies
3. **No client-side role storage** - Role derived from which localStorage key has token
4. **Parallel table queries** - All 3+ tables checked on login

**Potential weakness:**
- Frontend role can be spoofed by editing localStorage key name
- **Mitigation:** Backend guards ALWAYS verify table membership

```typescript
// ATTACK: Attacker changes localStorage key from workos_employer_auth to workos_admin_auth
// RESULT: Frontend shows admin UI, BUT:
//   - All admin API calls fail with ADMIN_NOT_FOUND
//   - requireAdmin() queries adminUsers table
//   - User not in adminUsers = ConvexError thrown
```

### 3.4 Security Model Summary

| Threat | Protection | Status |
|--------|------------|--------|
| CSRF | OAuth state tokens (5-min TTL) | Implemented |
| Token theft | JWT expiration check | Implemented |
| Replay attack | State deleted after use | Implemented |
| Role escalation | Table membership check | Implemented |
| XSS token access | localStorage (vulnerable) | Risk accepted |
| Session fixation | New session per login | Implemented |
| Man-in-the-middle | HTTPS required | Environment-dependent |

---

## 4. EXTENSIBILITY GAPS

### 4.1 Hardcoded Role Assumptions

| Location | Hardcoding | Impact |
|----------|------------|--------|
| `UserRole` type | Literal union | Must update for new roles |
| `STORAGE_KEYS` | 3 fixed keys | Must add key for new roles |
| `AuthErrorCode` | 5 error codes | Must add `X_NOT_FOUND` errors |
| HTTP callback | Priority order | New role needs explicit branch |
| Role hooks | 3 separate hooks | Must create new hook per role |

### 4.2 Missing Abstraction Layers

| Gap | Current State | Recommended |
|-----|---------------|-------------|
| Role registry | Hardcoded in multiple files | Create `RoleConfig` type with all role metadata |
| Guard factory | Copy-paste for each role | Generic `requireRole<T>(tableName)` factory |
| Hook factory | Manual hook per role | `createRoleHook(role: UserRole)` generator |
| Storage abstraction | Direct localStorage | `AuthStorageAdapter` interface |

### 4.3 Coupling Issues

```
                    ┌─────────────────────────────────────────┐
                    │         COUPLING DEPENDENCIES           │
                    └─────────────────────────────────────────┘

workos-auth.tsx ─────────────────┬─────────────────┬─────────────────┐
    │                            │                 │                 │
    ▼                            ▼                 ▼                 ▼
 UserRole type              STORAGE_KEYS      Role hooks        Provider aliases
    │                            │                 │                 │
    │                            │                 │                 │
    └────────────────────────────┴─────────────────┴─────────────────┘
                                 │
                    ALL require simultaneous update
                    when adding new role
```

**Proposed Decoupling:**

```typescript
// roleConfig.ts - Single source of truth
interface RoleDefinition {
  role: string;
  storageKey: string;
  tableName: string;
  indexName: string;
  errorCode: string;
  redirectPath: string;
}

const ROLES: Record<string, RoleDefinition> = {
  admin: { role: "admin", storageKey: "workos_admin_auth", tableName: "adminUsers", ... },
  employer: { role: "employer", storageKey: "workos_employer_auth", ... },
  doctor: { role: "doctor", storageKey: "workos_doctor_auth", ... },
  // Add new role here - ONE PLACE
};
```

---

## 5. EXTENSION INTERFACES

### 5.1 Frontend Extension Interface

```typescript
// Types for role extension
interface RoleHookConfig {
  role: UserRole;
  entityType: Doc<"nurseSettings"> | Doc<"employers"> | Doc<"doctorSettings">;
  loginFn: (workosUserId: string, accessToken: string, refreshToken: string) => void;
}

interface AuthExtensionPoint {
  onLogin?: (role: UserRole, tokens: AuthTokens) => void;
  onLogout?: (role: UserRole) => void;
  onTokenExpired?: (role: UserRole) => void;
  onError?: (error: Error, role: UserRole) => void;
}
```

### 5.2 Backend Extension Interface

```typescript
// Generic guard factory pattern
function createRoleGuard<T extends Doc<any>>(
  tableName: string,
  indexName: string,
  errorCode: string
): (ctx: AuthContext) => Promise<T> {
  return async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) {
      throw new ConvexError({ code: "UNAUTHENTICATED", message: "Authentication required" });
    }
    
    const record = await ctx.db
      .query(tableName)
      .withIndex(indexName, (q) => q.eq("workosUserId", user.workosUserId))
      .first();
    
    if (!record) {
      throw new ConvexError({ code: errorCode, message: `${tableName} access required` });
    }
    
    return record as T;
  };
}

// Usage
const requireNurse = createRoleGuard<Doc<"nurseSettings">>(
  "nurseSettings",
  "by_workos_user",
  "NURSE_NOT_FOUND"
);
```

---

## 6. QUICK REFERENCE: NEW ROLE CHECKLIST

- [ ] Update `UserRole` type in `src/lib/workos-auth.tsx`
- [ ] Add storage key to `STORAGE_KEYS`
- [ ] Create `useXAuth()` hook following doctor pattern
- [ ] Export `XAuthProvider` alias
- [ ] Add table to `convex/schema.ts` with `by_workos_user` index
- [ ] Create `convex/xSettings.ts` with `getByWorkosId` internal query
- [ ] Add `requireXAccess()` guard to `authorization.ts`
- [ ] Add error code `X_NOT_FOUND` to `AuthErrorCode`
- [ ] Export guard from `authModules/index.ts`
- [ ] Add parallel query in `convex/http.ts` callback
- [ ] Add role detection branch in callback
- [ ] Create `XLayout.tsx` portal
- [ ] Add routes in `App.tsx`
- [ ] Update `ChooseRole.tsx` if applicable
- [ ] Run `npx convex dev` to apply schema
- [ ] Run `npm run typecheck` to verify

---

## 7. ARCHITECTURE RECOMMENDATIONS

### Short-term (Low Effort)
1. Extract `RoleConfig` to separate file
2. Create generic `createRoleGuard()` factory
3. Add `onTokenExpired` callback to provider

### Medium-term (Moderate Effort)
1. Implement token refresh logic
2. Create `createRoleHook()` generator function
3. Add role-agnostic `AuthStorageAdapter`

### Long-term (High Effort)
1. Migrate to WorkOS Organization-based roles (avoids table queries)
2. Implement proper refresh token rotation
3. Add session validation polling
4. Consider moving to HTTP-only cookies for tokens

---

**Analysis Date**: 2026-01-04
**Files Analyzed**: 8 core auth files
**Total Extension Points Identified**: 13
**Security Validations**: 7/7 implemented
**Missing Features**: Token refresh, session polling
