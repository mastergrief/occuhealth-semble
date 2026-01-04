# Extension API Specification: Convex + WorkOS Auth System

**Created**: 2026-01-04
**Version**: 1.0.0
**Status**: COMPLETE

---

## Table of Contents
1. [Backend Extension Points](#1-backend-extension-points)
2. [Frontend Extension Points](#2-frontend-extension-points)
3. [OAuth Extension Points](#3-oauth-extension-points)
4. [Stable API Contracts](#4-stable-api-contracts)
5. [Extensibility Gaps & Recommendations](#5-extensibility-gaps--recommendations)

---

## 1. Backend Extension Points

### 1.1 Authorization Guards

**Location**: `convex/authModules/authorization.ts`

**Current Guards**:
| Guard | Purpose | Signature |
|-------|---------|-----------|
| `requireAdmin(ctx)` | Verifies admin role | Returns `Doc<"adminUsers">` |
| `requireEmployerOwnership(ctx, employerId)` | Verifies employer owns resource | Returns `Doc<"employers">` |
| `requireDoctorAccess(ctx)` | Verifies doctor role | Returns `Doc<"doctorSettings">` |

**Extension Pattern - Adding New Guards**:
```typescript
// Example: Adding a "nurse" role guard
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

**Steps to Add New Role**:
1. Add table to `convex/schema.ts` (e.g., `nurseSettings`)
2. Create guard function in `convex/authModules/authorization.ts`
3. Export from `convex/authModules/index.ts`
4. Add error code to `AuthErrorCode` union type
5. Update `convex/http.ts` callback to check new table
6. Update frontend `UserRole` type and `STORAGE_KEYS`

**Guard Usage Pattern**:
```typescript
// In any query/mutation
export const someProtectedQuery = query({
  args: { ... },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    // admin is guaranteed to exist here
    // ... rest of handler
  },
});
```

### 1.2 Middleware Patterns

**Current State**: No formal middleware system exists in Convex. Authorization is done per-function.

**Workaround - Wrapper Functions**:
```typescript
// Create a higher-order function for common patterns
export function withAdminAuth<Args extends object, Result>(
  handler: (ctx: AuthContext, admin: Doc<"adminUsers">, args: Args) => Promise<Result>
) {
  return async (ctx: AuthContext, args: Args): Promise<Result> => {
    const admin = await requireAdmin(ctx);
    return handler(ctx, admin, args);
  };
}

// Usage
export const myQuery = query({
  args: { ... },
  handler: withAdminAuth(async (ctx, admin, args) => {
    // admin is guaranteed, audit log before/after
  }),
});
```

**Recommendation**: Create a `convex/helpers/authWrapper.ts` with typed wrappers.

### 1.3 Rate Limiting

**Current State**: No rate limiting exists.

**Extension Pattern**:
```typescript
// convex/helpers/rateLimiter.ts
import { MutationCtx } from "../_generated/server";

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export async function checkRateLimit(
  ctx: MutationCtx,
  userId: string,
  action: string,
  config: RateLimitConfig
): Promise<boolean> {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  // Query rate limit table
  const recentRequests = await ctx.db
    .query("rateLimits")
    .withIndex("by_key_timestamp", (q) => 
      q.eq("key", key).gte("timestamp", windowStart)
    )
    .collect();
  
  if (recentRequests.length >= config.maxRequests) {
    return false; // Rate limited
  }
  
  // Log this request
  await ctx.db.insert("rateLimits", { key, timestamp: now });
  return true;
}
```

**Required Schema Addition**:
```typescript
rateLimits: defineTable({
  key: v.string(),
  timestamp: v.number(),
}).index("by_key_timestamp", ["key", "timestamp"]),
```

### 1.4 Audit Logging Wrapper

**Current Implementation**: `convex/helpers/auditLogger.ts`

**Available Functions**:
| Function | Purpose | Signature |
|----------|---------|-----------|
| `logPatientAction(ctx, action, patientId, details?)` | Patient ops | void |
| `logReportAction(ctx, action, reportId, patientId, details?)` | Report ops | void |
| `logAppointmentAction(ctx, action, appointmentId, patientId, details?)` | Appointment ops | void |

**Extension Pattern - Adding New Resource Type**:
```typescript
// Add to convex/helpers/auditLogger.ts
export async function logEmployerAction(
  ctx: MutationCtx,
  action: string,
  employerId: Id<"employers">,
  details?: Record<string, unknown>
): Promise<void> {
  const { actorType, actorId } = await getActorInfo(ctx);

  await ctx.runMutation(internal.gdpr.logAction, {
    action,
    actorType,
    actorId,
    resourceType: "employer",
    resourceId: employerId,
    details,
  });
}
```

**Wrapping All Auth Actions**:
```typescript
// convex/helpers/authAuditWrapper.ts
export async function withAuditedAuth<T>(
  ctx: MutationCtx,
  action: string,
  resourceType: string,
  resourceId: string | undefined,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await operation();
    await logAuthAction(ctx, action, resourceType, resourceId, {
      status: "success",
      duration: Date.now() - startTime,
    });
    return result;
  } catch (error) {
    await logAuthAction(ctx, action, resourceType, resourceId, {
      status: "failed",
      error: String(error),
      duration: Date.now() - startTime,
    });
    throw error;
  }
}
```

---

## 2. Frontend Extension Points

### 2.1 Auth Hook Architecture

**Location**: `src/lib/workos-auth.tsx`

**Core Provider**: `WorkOSAuthProvider`
- Manages unified auth state for all roles
- Stores tokens in localStorage per role
- Provides multi-tab sync via `storage` event

**Role-Specific Hooks**:
| Hook | Role | Returns |
|------|------|---------|
| `useAdminAuth()` | admin | `{ adminUser, isAdminAuthenticated, loginAsAdmin, logoutAdmin, sessionId }` |
| `useEmployerAuth()` | employer | `{ isAuthenticated, employer, workosUserId, loginAsEmployer, logoutEmployer, sessionId }` |
| `useDoctorAuth()` | doctor | `{ isAuthenticated, doctor, workosUserId, loginAsDoctor, logoutDoctor, sessionId }` |

**Extension Pattern - Adding New Role Hook**:
```typescript
// Add to src/lib/workos-auth.tsx

// 1. Update UserRole type
export type UserRole = "admin" | "employer" | "doctor" | "nurse";

// 2. Add storage key
const STORAGE_KEYS: Record<UserRole, string> = {
  admin: "workos_admin_auth",
  employer: "workos_employer_auth",
  doctor: "workos_doctor_auth",
  nurse: "workos_nurse_auth", // NEW
};

// 3. Create role-specific hook
export function useNurseAuth(): {
  isAuthenticated: boolean;
  isLoading: boolean;
  nurse: Nurse | null;
  workosUserId: string | null;
  accessToken: string | null;
  sessionId: string | null;
  loginAsNurse: (
    workosUserId: string,
    accessToken: string,
    refreshToken: string,
    sessionId?: string
  ) => void;
  logoutNurse: () => void;
} {
  const auth = useWorkOSAuth();

  const loginAsNurse = useCallback(
    (workosUserId: string, accessToken: string, refreshToken: string, sessionId?: string) => {
      auth.login("nurse", { workosUserId, accessToken, refreshToken, sessionId });
    },
    [auth]
  );

  return {
    isAuthenticated: auth.role === "nurse" && auth.isAuthenticated,
    isLoading: auth.isLoading,
    nurse: null, // Fetched via Convex
    workosUserId: auth.role === "nurse" ? (auth.tokens?.workosUserId ?? null) : null,
    accessToken: auth.role === "nurse" ? (auth.tokens?.accessToken ?? null) : null,
    sessionId: auth.role === "nurse" ? (auth.tokens?.sessionId ?? null) : null,
    loginAsNurse,
    logoutNurse: auth.logout,
  };
}
```

### 2.2 Role-Based UI Permissions

**Current Pattern**: Each layout component checks auth and redirects.

**Extension Pattern - Permission Component**:
```typescript
// src/components/auth/RequirePermission.tsx
interface RequirePermissionProps {
  permission: string;
  role: UserRole;
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequirePermission({
  permission,
  role,
  children,
  fallback = null,
}: RequirePermissionProps) {
  const auth = useWorkOSAuth();
  
  // Define permission matrix
  const permissions: Record<UserRole, string[]> = {
    admin: ["view_all", "edit_all", "delete_all", "verify_employers", "process_erasure"],
    employer: ["view_employees", "book_appointments", "view_reports"],
    doctor: ["view_appointments", "create_reports", "manage_schedule"],
    nurse: ["view_appointments", "assist_doctor"],
  };
  
  if (auth.role !== role || !permissions[role]?.includes(permission)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}
```

### 2.3 Token Refresh Extension Point

**Current State**: Token expiration is checked via `isTokenExpired()` but refresh is NOT implemented.

**Gap**: No automatic token refresh mechanism exists.

**Extension Pattern**:
```typescript
// src/lib/token-refresh.ts
export async function refreshAccessToken(
  refreshToken: string
): Promise<AuthTokens | null> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_CONVEX_URL?.replace('.cloud', '.site')}/auth/refresh`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return {
      workosUserId: data.userId,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      sessionId: data.sessionId,
    };
  } catch {
    return null;
  }
}
```

**Backend Required** (add to `convex/http.ts`):
```typescript
http.route({
  path: "/auth/refresh",
  method: "POST",
  handler: httpAction(async (_, request) => {
    const { refreshToken } = await request.json();
    const workos = getWorkOS();
    
    const result = await workos.userManagement.authenticateWithRefreshToken({
      clientId: process.env.WORKOS_CLIENT_ID!,
      refreshToken,
    });
    
    return new Response(JSON.stringify({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    }), { headers: { "Content-Type": "application/json" } });
  }),
});
```

### 2.4 Auth Event Listeners

**Current State**: Multi-tab sync via `storage` event only.

**Extension Pattern**:
```typescript
// src/lib/auth-events.ts
type AuthEvent = 
  | { type: "login"; role: UserRole; userId: string }
  | { type: "logout"; role: UserRole }
  | { type: "token_refresh"; role: UserRole }
  | { type: "session_expired"; role: UserRole };

type AuthEventListener = (event: AuthEvent) => void;

class AuthEventEmitter {
  private listeners: Set<AuthEventListener> = new Set();
  
  subscribe(listener: AuthEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  emit(event: AuthEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }
}

export const authEvents = new AuthEventEmitter();

// Usage in WorkOSAuthProvider
const login = useCallback((role: UserRole, tokens: AuthTokens) => {
  // ... existing logic
  authEvents.emit({ type: "login", role, userId: tokens.workosUserId });
}, []);
```

---

## 3. OAuth Extension Points

### 3.1 Adding OAuth Providers

**Current State**: WorkOS AuthKit is the only provider.

**WorkOS Supports**: Google, GitHub, Microsoft, SAML, OIDC

**Extension via WorkOS Dashboard**:
1. Enable provider in WorkOS Dashboard > Authentication > Providers
2. No code changes needed - WorkOS handles provider routing

**Extension Pattern - Custom Provider Routing**:
```typescript
// Modify /auth/login to accept provider param
http.route({
  path: "/auth/login",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const provider = url.searchParams.get("provider") || "authkit";
    
    const authParams = {
      provider, // "google", "github", "microsoft", etc.
      redirectUri: `${process.env.CONVEX_SITE_URL}/auth/callback`,
      clientId: process.env.WORKOS_CLIENT_ID!,
      state,
    };
    
    // ... rest of handler
  }),
});
```

### 3.2 Callback Customization

**Location**: `convex/http.ts` - `/auth/callback`

**Current Logic**:
1. Exchange code for tokens
2. Check all role tables (employers, doctorSettings, adminUsers)
3. Route based on first match

**Extension Points**:
| Hook Point | Current | Extension |
|------------|---------|-----------|
| Pre-auth | CSRF check | Add IP logging, device fingerprint |
| Post-auth | Role lookup | Add user provisioning, onboarding check |
| Redirect | Path-based | Add query params, deep link support |

**Example - Adding Onboarding Check**:
```typescript
// In /auth/callback handler
if (employer) {
  // Check if employer completed onboarding
  const hasCompletedOnboarding = await ctx.runQuery(
    internal.employers.hasCompletedOnboarding,
    { employerId: employer._id }
  );
  redirectPath = hasCompletedOnboarding 
    ? "/employer" 
    : "/employer/onboarding";
}
```

### 3.3 Session Metadata Extension

**Current State**: Session stores `userId`, `accessToken`, `refreshToken`, `sessionId`.

**Schema Location**: localStorage keys in `STORAGE_KEYS`

**Extension Pattern**:
```typescript
// Extended AuthTokens interface
export interface AuthTokens {
  workosUserId: string;
  accessToken: string;
  refreshToken?: string;
  sessionId?: string;
  // Extensions:
  organizationId?: string;
  permissions?: string[];
  metadata?: Record<string, unknown>;
}
```

### 3.4 MFA/2FA Integration

**Current State**: Not implemented.

**WorkOS MFA Support**: Available via AuthKit

**Extension Pattern**:
```typescript
// 1. Enable MFA in WorkOS Dashboard
// 2. WorkOS handles MFA during authentication
// 3. Callback receives verified user

// For step-up auth (requiring MFA for sensitive ops):
http.route({
  path: "/auth/step-up",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const returnTo = url.searchParams.get("returnTo") || "/";
    
    // Force MFA re-verification
    const authUrl = workos.userManagement.getAuthorizationUrl({
      provider: "authkit",
      redirectUri: `${process.env.CONVEX_SITE_URL}/auth/step-up/callback`,
      clientId: process.env.WORKOS_CLIENT_ID!,
      prompt: "consent", // Forces re-auth with MFA
    });
    
    return Response.redirect(authUrl, 302);
  }),
});
```

---

## 4. Stable API Contracts

### 4.1 Backend Exports (DO NOT BREAK)

**From `convex/authModules/index.ts`**:
```typescript
// Functions (signature stable)
export { getAuthenticatedUser } from "./authorization";
export { requireEmployerOwnership } from "./authorization";
export { requireDoctorAccess } from "./authorization";
export { requireAdmin } from "./authorization";

// Types (schema stable)
export type { AuthContext } from "./authorization";
export type { AuthenticatedUser } from "./authorization";
export type { AuthErrorCode } from "./authorization";
```

### 4.2 Frontend Exports (DO NOT BREAK)

**From `src/lib/workos-auth.tsx`**:
```typescript
// Types
export type UserRole = "admin" | "employer" | "doctor";
export interface AuthTokens { ... }

// Hooks
export function useWorkOSAuth(): WorkOSAuthContextType;
export function useAdminAuth(): { ... };
export function useEmployerAuth(): { ... };
export function useDoctorAuth(): { ... };

// Provider
export function WorkOSAuthProvider({ children }): JSX.Element;
```

### 4.3 HTTP Routes (URL stable)

| Route | Method | Purpose | Breaking to Change |
|-------|--------|---------|-------------------|
| `/auth/login` | GET | Initiate OAuth | YES |
| `/auth/callback` | GET | Handle OAuth return | YES |
| `/auth/logout` | GET | End session | YES |
| `/health` | GET | Health check | NO |

### 4.4 Breaking Change Risks

| Risk | Location | Impact |
|------|----------|--------|
| Changing `UserRole` values | `workos-auth.tsx` | Breaks localStorage, all hooks |
| Changing `STORAGE_KEYS` | `workos-auth.tsx` | Logs out all users |
| Changing guard signatures | `authorization.ts` | Breaks all protected functions |
| Changing `AuthTokens` fields | `workos-auth.tsx` | Breaks token storage |
| Renaming HTTP routes | `http.ts` | Breaks OAuth flow completely |

---

## 5. Extensibility Gaps & Recommendations

### 5.1 Hard-Coded Values (Should Be Configurable)

| Location | Value | Recommendation |
|----------|-------|----------------|
| `http.ts:40` | OAuth state TTL (5 min) | Move to env var `OAUTH_STATE_TTL_MS` |
| `http.ts:45` | `redirectUri` path | Move to env var `AUTH_CALLBACK_PATH` |
| `workos-auth.tsx:65-69` | `STORAGE_KEYS` | Allow override via config |
| `authorization.ts` | Error codes | Export as const enum for extension |

### 5.2 Missing Extension Points

| Gap | Current Workaround | Recommended Solution |
|-----|-------------------|---------------------|
| Token refresh | Manual re-login | Add `/auth/refresh` endpoint + auto-refresh hook |
| Rate limiting | None | Add `rateLimits` table + `checkRateLimit()` helper |
| Middleware | Per-function guards | Create `withAuth()` wrapper HOF |
| Event system | Storage events only | Add `AuthEventEmitter` class |
| Permission matrix | Hardcoded in layouts | Create `permissions.ts` config file |

### 5.3 Recommended Modularization

**Current Structure**:
```
convex/authModules/
├── authorization.ts  (206 lines - OK)
└── index.ts          (22 lines - facade)
```

**Recommended Split** (if adding features):
```
convex/authModules/
├── index.ts              (exports only)
├── guards.ts             (requireAdmin, requireEmployer, etc.)
├── authentication.ts     (getAuthenticatedUser, token validation)
├── permissions.ts        (permission definitions, checks)
├── rateLimiting.ts       (rate limit logic)
└── types.ts              (AuthContext, AuthErrorCode, etc.)
```

### 5.4 Extension Checklist for New Roles

- [ ] Add table to `convex/schema.ts`
- [ ] Create index `by_workos_user` on new table
- [ ] Add guard function to `authorization.ts`
- [ ] Add error code to `AuthErrorCode` type
- [ ] Export guard from `index.ts`
- [ ] Update `http.ts` callback to check new table
- [ ] Add `UserRole` value in `workos-auth.tsx`
- [ ] Add `STORAGE_KEYS` entry
- [ ] Create role-specific hook (e.g., `useNurseAuth`)
- [ ] Create layout component (e.g., `NurseLayout.tsx`)
- [ ] Add routes to `App.tsx`
- [ ] Update `NAV-MAP.md` documentation

---

## Summary

The current auth system is **moderately extensible** with clear patterns for:
- Adding new authorization guards (backend)
- Creating role-specific auth hooks (frontend)
- OAuth provider additions (via WorkOS)

**Major gaps requiring implementation**:
1. Token refresh mechanism
2. Rate limiting infrastructure
3. Auth event system
4. Formal middleware/wrapper pattern

**API stability is good** - the facade pattern in `authModules/index.ts` allows internal refactoring without breaking consumers.
