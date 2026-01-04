# Architecture Analysis: Auth System Structure

**Sprint**: 02 of 07
**Index**: AUTH_ANALYSIS_INDEX
**Depends On**: AUTH_ANALYSIS_SPRINT_01_EXECUTIVE_SUMMARY
**Next**: AUTH_ANALYSIS_SPRINT_03_SECURITY

---

## Source Tree

```
convex-medical-starter/
├── convex/                                    # Backend
│   ├── authModules/
│   │   ├── authorization.ts    [208 lines] ✅ # Guards (well-documented)
│   │   └── index.ts            [23 lines]  ✅ # Facade re-exports
│   ├── http.ts                 [225 lines] ✅ # OAuth endpoints
│   ├── oauthState.ts           [54 lines]  ✅ # CSRF protection
│   ├── adminUsers.ts           [79 lines]  ⚠️ # Some public queries
│   ├── employers.ts            [140+ lines]✅ # Guarded
│   ├── doctorSettings.ts       [80+ lines] ✅ # Guarded
│   ├── gdpr.ts                 [311 lines] ⛔ # UNGUARDED
│   ├── patients.ts             [120+ lines]✅ # Guarded
│   ├── appointments.ts         [180+ lines]✅ # Guarded
│   ├── reports.ts              [150+ lines]✅ # Guarded
│   ├── schema.ts               [340+ lines]✅ # Indexes OK
│   └── auth.config.ts          [NOT EXIST] ❌ # Planned but missing
│
├── src/
│   ├── lib/workos-auth.tsx     [413 lines] ⚠️ # Partial docs
│   ├── main.tsx                [22 lines]  ⚠️ # No ConvexProviderWithAuth
│   └── pages/{Admin,Employer,Doctor}Layout.tsx
│
└── package.json
    ├── @workos-inc/node: ^7.79.3
    ├── @convex-dev/auth: ^0.0.90
    └── convex: ^1.31.2
```

---

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React 19)                          │
├────────────────────────────────────────────────────────────────┤
│  ConvexProvider (NO AUTH) → WorkOSAuthProvider                  │
│       │                           │                             │
│       └─ useQuery/useMutation     ├─ useAdminAuth()            │
│          ⚠️ NO AUTH TOKEN         ├─ useEmployerAuth()         │
│                                   └─ useDoctorAuth()           │
│                                          │                      │
│                    ┌─────────────────────┼─────────────────┐   │
│                    ↓                     ↓                 ↓   │
│             workos_admin_auth   workos_employer_auth  workos_doctor_auth │
│                         (localStorage)                          │
└────────────────────────────────────────────────────────────────┘
                              │ WebSocket
                              │ ⚠️ NO AUTH
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                     BACKEND (Convex)                            │
├────────────────────────────────────────────────────────────────┤
│  HTTP Endpoints (convex/http.ts):                               │
│  ├─ GET /auth/login    → CSRF state + WorkOS redirect          │
│  ├─ GET /auth/callback → Token exchange + role routing         │
│  └─ GET /auth/logout   → WorkOS session invalidation           │
│                                                                 │
│  Authorization (convex/authModules/):                           │
│  ├─ getAuthenticatedUser(ctx) → ctx.auth.getUserIdentity()     │
│  │                              ⚠️ RETURNS NULL                 │
│  ├─ requireAdmin(ctx)         → checks adminUsers table        │
│  ├─ requireEmployerOwnership(ctx, id) → checks employers       │
│  └─ requireDoctorAccess(ctx)  → checks doctorSettings          │
│                                                                 │
│  Database Tables:                                               │
│  ├─ adminUsers    (by_workos_user_id, by_email)                │
│  ├─ employers     (by_workos_user, by_status, by_email)        │
│  ├─ doctorSettings (by_workos_user)                            │
│  ├─ oauthStates   (by_state) - CSRF tokens                     │
│  └─ patients, appointments, reports, auditLogs                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Auth Flow Sequence

```
USER → Click Login
  ↓
FRONTEND → GET /auth/login
  ↓
CONVEX HTTP:
  1. crypto.randomUUID() → state
  2. Store state in oauthStates (5-min TTL)
  3. Redirect to WorkOS AuthKit
  ↓
WORKOS → User authenticates
  ↓
WORKOS → Redirect to /auth/callback?code=...&state=...
  ↓
CONVEX HTTP:
  1. Validate CSRF state
  2. Exchange code for tokens
  3. Extract sessionId from JWT
  4. Parallel role queries:
     - employers.getByWorkosId()
     - doctorSettings.getByWorkosId()
     - adminUsers.getByWorkosId()
  5. Redirect to frontend with tokens in URL
  ↓
FRONTEND (AdminAuthCallback):
  1. Extract tokens from URL
  2. Store in localStorage
  3. Navigate to role dashboard
  ↓
FRONTEND → useQuery()
  ⚠️ Convex RPC has NO auth token
  ⚠️ ctx.auth.getUserIdentity() = null
  ⚠️ Guards fail with UNAUTHENTICATED
```

---

## Guard Usage Statistics

| Guard Function | Calls | Files |
|----------------|-------|-------|
| requireAdmin | 6 | employers.ts |
| requireEmployerOwnership | 20 | patients, reports, employers, appointments |
| requireDoctorAccess | 15 | reports, appointments |
| **Total** | **41** | **6 files** |

---

## The Core Problem

**Gap**: Frontend stores WorkOS tokens in localStorage, but Convex client doesn't send them.

**Current**: `ConvexProvider` (no auth) wraps app
**Needed**: `ConvexProviderWithAuth` with `useAuth()` hook that provides tokens

**Files to modify for fix**:
1. Create `convex/auth.config.ts` - Configure WorkOS as provider
2. Update `src/main.tsx` - Use ConvexProviderWithAuth
3. Add `useConvexAuth()` to `src/lib/workos-auth.tsx`
4. Add `/auth/refresh` to `convex/http.ts`

---

→ Next: AUTH_ANALYSIS_SPRINT_03_SECURITY
