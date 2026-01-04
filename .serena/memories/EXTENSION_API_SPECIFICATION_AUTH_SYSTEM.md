# Extension API Specification - OccuHealth Auth System

**Document Date**: 2026-01-04
**Coverage**: 100% - Complete auth system analysis
**Purpose**: Guide for adding new roles and understanding extension points

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Complete API Surface](#2-complete-api-surface)
3. [Extension Points Analysis](#3-extension-points-analysis)
4. [Adding a New Role: Step-by-Step Guide](#4-adding-a-new-role-step-by-step-guide)
5. [Contract Between Frontend and Backend](#5-contract-between-frontend-and-backend)
6. [Coupling and Rigidity Analysis](#6-coupling-and-rigidity-analysis)
7. [Current Limitations](#7-current-limitations)

---

## 1. System Overview

### Architecture Pattern
The auth system uses a **Unified Provider Pattern** with role-specific hooks:

```
┌─────────────────────────────────────────────────────────────────┐
│                    WorkOSAuthProvider                           │
│  (Unified state management for all roles)                       │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐            │
│  │useAdminAuth │  │useEmployerAuth│  │useDoctorAuth│            │
│  └─────────────┘  └──────────────┘  └─────────────┘            │
│       │                  │                 │                    │
│       └──────────────────┴─────────────────┘                    │
│                          │                                      │
│               ┌──────────▼──────────┐                          │
│               │  useWorkOSAuth()    │                          │
│               │  (Core context)     │                          │
│               └─────────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow
```
WorkOS AuthKit → Backend (/auth/callback) → Frontend (/auth/callback) → localStorage
```

---

## 2. Complete API Surface

### 2.1 Type Definitions

**File**: `src/lib/workos-auth.tsx` (lines 12-70)

```typescript
// Core role type - EXTENSION POINT #1
export type UserRole = "admin" | "employer" | "doctor";

// Token structure - used for all roles
export interface AuthTokens {
  workosUserId: string;      // WorkOS user identifier
  accessToken: string;       // JWT for API calls
  refreshToken?: string;     // For token renewal
  sessionId?: string;        // For proper WorkOS logout
}

// Internal state structure
interface WorkOSAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  tokens: AuthTokens | null;
  role: UserRole | null;
}

// Context type with actions
interface WorkOSAuthContextType extends WorkOSAuthState {
  login: (role: UserRole, tokens: AuthTokens) => void;
  logout: () => void;
}
```

### 2.2 Storage Keys Constant

**File**: `src/lib/workos-auth.tsx` (lines 66-70)

```typescript
// EXTENSION POINT #2 - Must add new role key here
const STORAGE_KEYS: Record<UserRole, string> = {
  admin: "workos_admin_auth",
  employer: "workos_employer_auth",
  doctor: "workos_doctor_auth",
};
```

**Also duplicated in**: `src/main.tsx` (lines 13-17) - MUST KEEP IN SYNC

### 2.3 Exported Functions

| Export | Type | Purpose | Lines |
|--------|------|---------|-------|
| `refreshAccessToken` | Function | Refresh expired tokens via backend | 106-156 |
| `WorkOSAuthProvider` | Component | Root provider for auth state | 162-303 |
| `useWorkOSAuth` | Hook | Generic access to auth context | 309-315 |
| `useAdminAuth` | Hook | Admin-specific auth interface | 325-369 |
| `useEmployerAuth` | Hook | Employer-specific auth interface | 375-416 |
| `useDoctorAuth` | Hook | Doctor-specific auth interface | 422-461 |
| `EmployerAuthProvider` | Alias | Re-exports WorkOSAuthProvider | 471 |
| `DoctorAuthProvider` | Alias | Re-exports WorkOSAuthProvider | 477 |

### 2.4 Role-Specific Hook Interfaces

#### useAdminAuth() Return Type
```typescript
{
  adminUser: AdminUser | null;           // {userId, accessToken, refreshToken}
  isAdminAuthenticated: boolean;         // role === "admin" && isAuthenticated
  isLoading: boolean;                    
  sessionId: string | null;              
  loginAsAdmin: (params: {               // Calls auth.login("admin", {...})
    accessToken: string;
    refreshToken?: string;
    userId: string;
    sessionId?: string;
  }) => void;
  logoutAdmin: () => void;               // Calls auth.logout()
}
```

#### useEmployerAuth() Return Type
```typescript
{
  isAuthenticated: boolean;              // role === "employer" && isAuthenticated
  isLoading: boolean;
  employer: Employer | null;             // Always null (fetched via Convex)
  workosUserId: string | null;
  accessToken: string | null;
  sessionId: string | null;
  isVerified: boolean;                   // Always false (checked via Convex)
  loginAsEmployer: (                     // Calls auth.login("employer", {...})
    workosUserId: string,
    accessToken: string,
    refreshToken: string,
    sessionId?: string
  ) => void;
  logoutEmployer: () => void;            // Calls auth.logout()
}
```

#### useDoctorAuth() Return Type
```typescript
{
  isAuthenticated: boolean;              // role === "doctor" && isAuthenticated
  isLoading: boolean;
  doctor: Doctor | null;                 // Always null (fetched via Convex)
  workosUserId: string | null;
  accessToken: string | null;
  sessionId: string | null;
  loginAsDoctor: (                       // Calls auth.login("doctor", {...})
    workosUserId: string,
    accessToken: string,
    refreshToken: string,
    sessionId?: string
  ) => void;
  logoutDoctor: () => void;              // Calls auth.logout()
}
```

---

## 3. Extension Points Analysis

### 3.1 Backend Extension Points

**File**: `convex/http.ts` (lines 152-167)

```typescript
// EXTENSION POINT #3 - Role detection queries
const [employer, doctor, adminUser] = await Promise.all([
  ctx.runQuery(internal.employers.getByWorkosId, { workosUserId: user.id }),
  ctx.runQuery(internal.doctorSettings.getByWorkosId, { workosUserId: user.id }),
  ctx.runQuery(internal.adminUsers.getByWorkosId, { workosUserId: user.id }),
  // ADD: ctx.runQuery(internal.nurses.getByWorkosId, { workosUserId: user.id }),
]);

// EXTENSION POINT #4 - Redirect path mapping
let redirectPath = "/register/choose-role";
if (employer) {
  redirectPath = "/employer";
} else if (doctor) {
  redirectPath = "/doctor";
} else if (adminUser) {
  redirectPath = "/admin";
}
// ADD: else if (nurse) { redirectPath = "/nurse"; }
```

### 3.2 Database Extension Points

**File**: `convex/schema.ts`

Each role requires a dedicated table with:
- `workosUserId: v.string()` - Foreign key to WorkOS
- Index: `by_workos_user` or `by_workos_user_id`
- Role-specific fields

**Required Query**: `getByWorkosId` internal query per table

### 3.3 Frontend Extension Points

| Location | What to Add | Purpose |
|----------|-------------|---------|
| `UserRole` type | New role literal | Type safety |
| `STORAGE_KEYS` | New localStorage key | Token persistence |
| `main.tsx` STORAGE_KEYS | Same key | Must stay in sync |
| `workos-auth.tsx` | New `useNurseAuth()` hook | Role-specific interface |
| `App.tsx` | Route for `/nurse/*` | Portal routing |
| New Layout | `NurseLayout.tsx` | Portal UI shell |

---

## 4. Adding a New Role: Step-by-Step Guide

### Example: Adding "Nurse" Role

#### Step 1: Update Types (workos-auth.tsx)

```typescript
// Line 16 - Add to UserRole union
export type UserRole = "admin" | "employer" | "doctor" | "nurse";

// Lines 66-70 - Add storage key
const STORAGE_KEYS: Record<UserRole, string> = {
  admin: "workos_admin_auth",
  employer: "workos_employer_auth",
  doctor: "workos_doctor_auth",
  nurse: "workos_nurse_auth",           // ADD
};
```

#### Step 2: Sync main.tsx Storage Keys

```typescript
// Lines 13-17 in main.tsx
const STORAGE_KEYS = {
  admin: "workos_admin_auth",
  employer: "workos_employer_auth",
  doctor: "workos_doctor_auth",
  nurse: "workos_nurse_auth",           // ADD
} as const;
```

#### Step 3: Create Database Table (schema.ts)

```typescript
// Add to defineSchema
nurseSettings: defineTable({
  workosUserId: v.string(),
  email: v.string(),
  name: v.string(),
  licenseNumber: v.string(),
  specialty: v.string(),
  createdAt: v.number(),
})
  .index("by_workos_user", ["workosUserId"]),
```

#### Step 4: Create Database Queries (convex/nurseSettings.ts)

```typescript
import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";

// Internal query for auth routing (REQUIRED)
export const getByWorkosId = internalQuery({
  args: { workosUserId: v.string() },
  handler: async (ctx, { workosUserId }) => {
    return ctx.db
      .query("nurseSettings")
      .withIndex("by_workos_user", (q) => q.eq("workosUserId", workosUserId))
      .first();
  },
});

// Public query for layout (REQUIRED)
export const getByWorkosUserId = query({
  args: { workosUserId: v.string() },
  handler: async (ctx, { workosUserId }) => {
    return ctx.db
      .query("nurseSettings")
      .withIndex("by_workos_user", (q) => q.eq("workosUserId", workosUserId))
      .first();
  },
});

// Create mutation for registration (REQUIRED)
export const create = mutation({
  args: {
    workosUserId: v.string(),
    email: v.string(),
    name: v.string(),
    licenseNumber: v.string(),
    specialty: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("nurseSettings", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
```

#### Step 5: Update Backend Role Detection (http.ts)

```typescript
// Lines 152-157 - Add nurse query
const [employer, doctor, adminUser, nurse] = await Promise.all([
  ctx.runQuery(internal.employers.getByWorkosId, { workosUserId: user.id }),
  ctx.runQuery(internal.doctorSettings.getByWorkosId, { workosUserId: user.id }),
  ctx.runQuery(internal.adminUsers.getByWorkosId, { workosUserId: user.id }),
  ctx.runQuery(internal.nurseSettings.getByWorkosId, { workosUserId: user.id }),
]);

// Lines 159-167 - Add nurse redirect
let redirectPath = "/register/choose-role";
if (employer) {
  redirectPath = "/employer";
} else if (doctor) {
  redirectPath = "/doctor";
} else if (adminUser) {
  redirectPath = "/admin";
} else if (nurse) {
  redirectPath = "/nurse";
}
```

#### Step 6: Create Frontend Hook (workos-auth.tsx)

```typescript
// Add after useDoctorAuth (around line 462)

interface Nurse {
  _id: Id<"nurseSettings">;
  workosUserId: string;
  email: string;
  name: string;
  licenseNumber: string;
  specialty: string;
}

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
    nurse: null, // Fetched via Convex in consuming components
    workosUserId: auth.role === "nurse" ? (auth.tokens?.workosUserId ?? null) : null,
    accessToken: auth.role === "nurse" ? (auth.tokens?.accessToken ?? null) : null,
    sessionId: auth.role === "nurse" ? (auth.tokens?.sessionId ?? null) : null,
    loginAsNurse,
    logoutNurse: auth.logout,
  };
}

// Add provider alias
export const NurseAuthProvider = WorkOSAuthProvider;
```

#### Step 7: Create Layout Component

```typescript
// src/pages/NurseLayout.tsx
import { Outlet, NavLink, Navigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNurseAuth } from "@/lib/workos-auth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Calendar, FileText, Settings, LogOut } from "lucide-react";

export function NurseLayout() {
  const { isAuthenticated, isLoading, workosUserId, logoutNurse, sessionId } = useNurseAuth();

  const handleLogout = () => {
    logoutNurse();
    localStorage.clear();
    sessionStorage.clear();
    if (sessionId) {
      window.location.href = `${import.meta.env.VITE_CONVEX_URL?.replace('.cloud', '.site')}/auth/logout?sessionId=${sessionId}`;
    } else {
      window.location.href = "/";
    }
  };

  const nurse = useQuery(
    api.nurseSettings.getByWorkosUserId,
    workosUserId ? { workosUserId } : "skip"
  );

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <aside className="relative w-64 bg-white dark:bg-slate-800 border-r">
        <div className="p-6">
          <h1 className="text-xl font-bold text-blue-600">OccuHealth</h1>
          <p className="text-sm text-muted-foreground">{nurse?.name ?? "Loading..."}</p>
        </div>

        <nav className="px-4 space-y-1">
          {/* Add navigation items */}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="h-5 w-5 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      <main className="flex-1 p-6">
        <Outlet context={{ nurse }} />
      </main>
    </div>
  );
}
```

#### Step 8: Add Route to App.tsx

```typescript
// Add lazy import
const NurseLayout = lazy(() =>
  import("./pages/NurseLayout").then(m => ({ default: m.NurseLayout }))
);

// Add route (around line 100)
<Route path="/nurse/*" element={
  <NurseAuthProvider>
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <NurseLayout />
      </Suspense>
    </ErrorBoundary>
  </NurseAuthProvider>
} />
```

#### Step 9: Update ChooseRole (if new users can be nurses)

```typescript
// Add nurse card to ChooseRole.tsx
<Card
  className="cursor-pointer hover:border-medical-blue transition-colors"
  onClick={() => handleSelectRole("nurse")}
>
  <CardHeader className="text-center">
    <Heart className="h-12 w-12 mx-auto text-medical-blue" />
    <CardTitle>Nurse</CardTitle>
    <CardDescription>
      Assist with assessments and patient care
    </CardDescription>
  </CardHeader>
</Card>
```

#### Step 10: Create Registration Form

Follow `EmployerRegistrationForm.tsx` pattern:
- Extract tokens from URL params
- Create database record via mutation
- Call `loginAsNurse()` with tokens
- Navigate to `/nurse` portal

---

## 5. Contract Between Frontend and Backend

### 5.1 URL Parameters (Backend to Frontend)

**Callback URL Structure**: `${APP_URL}/auth/callback?{params}`

| Parameter | Required | Purpose |
|-----------|----------|---------|
| `accessToken` | Yes | JWT for API authentication |
| `refreshToken` | No | For token renewal |
| `userId` | Yes | WorkOS user identifier |
| `sessionId` | No | For proper WorkOS logout |
| `redirectPath` | Yes | Role-based destination |
| `error` | On error | Error description |

### 5.2 Valid Redirect Paths

| Path | Condition | Description |
|------|-----------|-------------|
| `/admin` | User in `adminUsers` table | Admin portal |
| `/employer` | User in `employers` table | Employer portal |
| `/doctor` | User in `doctorSettings` table | Doctor portal |
| `/register/choose-role` | User not in any table | New user registration |

### 5.3 Registration URL Parameters

For `/register/choose-role` and `/register/{role}`:

| Parameter | Required | Purpose |
|-----------|----------|---------|
| `accessToken` | Yes | Pass to registration form |
| `refreshToken` | Yes | Pass to registration form |
| `userId` | Yes | WorkOS ID for database record |
| `sessionId` | Yes | For logout capability |

---

## 6. Coupling and Rigidity Analysis

### 6.1 Hardcoded Elements (Should Be Configurable)

| Location | What's Hardcoded | Impact |
|----------|------------------|--------|
| `UserRole` type | Role literals | Type changes require rebuild |
| `STORAGE_KEYS` | localStorage key names | Must change in 2 files |
| `http.ts` redirectPath | Portal paths | Backend knows frontend routes |
| Layouts | `/auth/logout` URL | Duplicated in 3 files |
| Layouts | `VITE_CONVEX_URL` transform | Duplicated logic |

### 6.2 Tight Coupling Points

1. **Frontend-Backend Path Coupling**
   - Backend determines redirectPath (e.g., `/employer`)
   - Frontend must have matching route
   - No validation mechanism

2. **Storage Key Duplication**
   - `STORAGE_KEYS` in `workos-auth.tsx` lines 66-70
   - `STORAGE_KEYS` in `main.tsx` lines 13-17
   - Must be manually synchronized

3. **Logout Logic Duplication**
   - Same logout pattern in 3 layouts
   - URL construction repeated

### 6.3 Extension Friction

Adding a new role requires changes in **10+ files**:
1. `workos-auth.tsx` - UserRole type
2. `workos-auth.tsx` - STORAGE_KEYS
3. `workos-auth.tsx` - New hook
4. `main.tsx` - STORAGE_KEYS
5. `schema.ts` - New table
6. `convex/{role}Settings.ts` - New queries
7. `http.ts` - Role detection
8. `http.ts` - Redirect path
9. `App.tsx` - New route
10. New `{Role}Layout.tsx` - Portal shell
11. `ChooseRole.tsx` - Role card (if applicable)
12. New registration form

### 6.4 Recommendations for Reducing Rigidity

1. **Single Source of Truth for Roles**
   ```typescript
   // roles.config.ts
   export const ROLES = {
     admin: { storageKey: "workos_admin_auth", portal: "/admin" },
     employer: { storageKey: "workos_employer_auth", portal: "/employer" },
     doctor: { storageKey: "workos_doctor_auth", portal: "/doctor" },
   } as const;
   
   export type UserRole = keyof typeof ROLES;
   ```

2. **Extract Logout Logic**
   ```typescript
   // lib/logout.ts
   export function performLogout(role: UserRole, sessionId: string | null, logoutFn: () => void) {
     logoutFn();
     localStorage.clear();
     sessionStorage.clear();
     const logoutUrl = sessionId 
       ? `${getSiteUrl()}/auth/logout?sessionId=${sessionId}`
       : "/";
     window.location.href = logoutUrl;
   }
   ```

3. **Dynamic Role Detection Factory**
   ```typescript
   // Backend: Register role detectors
   const roleDetectors = [
     { role: "employer", query: internal.employers.getByWorkosId },
     { role: "doctor", query: internal.doctorSettings.getByWorkosId },
     { role: "admin", query: internal.adminUsers.getByWorkosId },
   ];
   ```

---

## 7. Current Limitations

### 7.1 Known Bugs

| Bug ID | Description | Impact |
|--------|-------------|--------|
| BUG-001 | AdminAuthCallback always calls `loginAsAdmin()` | Doctor/employer tokens stored in wrong key |
| BUG-002 | Missing doctor registration form | New doctors cannot complete registration |
| BUG-003 | No `/register/doctor` route in App.tsx | Doctor registration fails |

### 7.2 Architectural Limitations

1. **No Role Hierarchy**
   - Each role is completely independent
   - No "user has multiple roles" support
   - First valid token wins on page load

2. **No Permission System**
   - Roles are binary (have or don't have)
   - No granular permissions within roles
   - All employers have same access

3. **Token in URL**
   - Callback passes tokens via URL params
   - Visible in browser history
   - Documented as acceptable for OAuth

4. **Static Role List**
   - Roles must be known at compile time
   - No runtime role discovery
   - Adding role requires code changes

### 7.3 Missing Features

| Feature | Current State | Impact |
|---------|---------------|--------|
| Role switching | Not supported | User must log out to change role |
| Multi-role users | Not supported | User can only be one role |
| Role expiration | Not implemented | Roles persist indefinitely |
| Admin role assignment | Manual DB insert | No UI for admin management |

---

## Summary: Extension Checklist

When adding a new role, complete these items:

- [ ] Update `UserRole` type in `workos-auth.tsx`
- [ ] Add storage key to `STORAGE_KEYS` in `workos-auth.tsx`
- [ ] Sync storage key to `main.tsx`
- [ ] Create database table in `schema.ts`
- [ ] Create `{role}Settings.ts` with `getByWorkosId` query
- [ ] Add public `getByWorkosUserId` query
- [ ] Create registration `create` mutation
- [ ] Update `http.ts` role detection (Promise.all)
- [ ] Update `http.ts` redirectPath logic
- [ ] Create `use{Role}Auth()` hook
- [ ] Add `{Role}AuthProvider` alias
- [ ] Create `{Role}Layout.tsx` component
- [ ] Add route to `App.tsx`
- [ ] Update `ChooseRole.tsx` if needed
- [ ] Create registration form if needed
- [ ] Run `npx convex dev` to deploy schema changes
- [ ] Test full login flow for new role
