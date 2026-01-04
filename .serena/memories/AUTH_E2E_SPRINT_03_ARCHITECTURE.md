# Architecture & Data Flow

**Sprint**: 03 of 07  
**Index**: AUTH_E2E_INDEX  
**Depends On**: AUTH_E2E_SPRINT_01_EXECUTIVE_SUMMARY  
**Next**: AUTH_E2E_SPRINT_04_BROWSER_CLI_TESTING

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      OCCUHEALTH AUTHENTICATION ARCHITECTURE                  │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────────┐
                              │   WorkOS.com     │
                              │  (OAuth Provider)│
                              └────────┬─────────┘
                                       │ OAuth 2.0
                    ┌──────────────────┴──────────────────┐
                    ▼                                      ▼
          ┌─────────────────┐                    ┌─────────────────┐
          │  /auth/login    │──── CSRF State ────│ /auth/callback  │
          │  (http.ts:26)   │    (5-min TTL)     │ (http.ts:96)    │
          └─────────────────┘                    └────────┬────────┘
                                                          │
                    ┌─────────────────────────────────────┘
                    │ Role Detection (3 Parallel Queries)
                    ▼
     ┌──────────────┴──────────────┬─────────────────┬─────────────────┐
     ▼                              ▼                 ▼                 ▼
┌─────────┐                  ┌──────────┐      ┌──────────┐      ┌───────────┐
│adminUser│                  │ employer │      │  doctor  │      │  NEW USER │
│  found  │                  │  found   │      │  found   │      │ (no match)│
└────┬────┘                  └────┬─────┘      └────┬─────┘      └─────┬─────┘
     │                            │                 │                  │
     ▼                            ▼                 ▼                  ▼
  /admin                    /employer           /doctor         /register/
                                                               choose-role
```

---

## File Structure (17 Files, 2,360 Lines)

```
convex-medical-starter/
├── convex/                          (Backend - 507 lines)
│   ├── http.ts                      225L  ← OAuth routes
│   ├── authModules/
│   │   ├── authorization.ts         207L  ← Guards
│   │   └── index.ts                  22L  ← Facade
│   ├── oauthState.ts                 53L  ← CSRF
│   ├── adminUsers.ts                 78L
│   ├── employers.ts                 155L
│   └── doctorSettings.ts             70L
│
├── src/lib/
│   └── workos-auth.tsx              404L  ← Auth Context
│
├── src/components/auth/              (114 lines)
│   ├── AdminAuthCallback.tsx         81L
│   ├── SignOutButton.tsx             30L
│   └── index.ts                       3L
│
├── src/pages/register/               (413 lines)
│   ├── ChooseRole.tsx                82L
│   └── EmployerRegistrationForm     331L
│
└── src/pages/                        (589 lines)
    ├── App.tsx                      252L
    ├── AdminLayout.tsx              117L
    ├── EmployerLayout.tsx           131L
    └── DoctorLayout.tsx              89L
```

---

## OAuth Flow (Complete)

### Phase 1: Login Initiation
```
User clicks "Sign In"
    ↓
Frontend: window.location.href = /auth/login
    ↓
Backend (http.ts:26-63):
    1. Generate CSRF state (crypto.randomUUID)
    2. Store in oauthStates table (5-min TTL)
    3. Build WorkOS authorization URL
    4. HTTP 302 redirect to WorkOS
```

### Phase 2: WorkOS Authentication
```
WorkOS.com:
    1. Display login form
    2. User enters credentials
    3. WorkOS validates
    4. Generates auth code
    5. Redirect to /auth/callback?code=...&state=...
```

### Phase 3: Token Exchange
```
Backend (http.ts:96-195):
    1. Validate CSRF state (oauthState.validate)
    2. Delete state (prevent replay)
    3. Exchange code for tokens (WorkOS SDK)
    4. Extract sessionId from JWT.sid
    5. Role detection (3 parallel queries)
    6. Build callback URL with tokens
    7. HTTP 302 redirect to frontend
```

### Phase 4: Frontend Callback
```
AdminAuthCallback.tsx:
    1. Extract tokens from URL params
    2. Call loginAsAdmin/Employer/Doctor
    3. Store in localStorage
    4. Navigate to portal
```

---

## Database Schema (4 Auth Tables)

### adminUsers
```typescript
{
  workosUserId: string,     // Primary identifier
  email: string,
  firstName?: string,
  lastName?: string,
  profilePictureUrl?: string,
  lastLoginAt: number       // Updated on each login
}
// Indexes: by_workos_user_id, by_email
```

### employers
```typescript
{
  workosUserId: string,
  companyName: string,
  companyType: "employer" | "insurer",
  status: "pending" | "verified" | "rejected",
  email: string,
  contactName: string,
  // ... address fields
}
// Indexes: by_workos_user, by_status, by_email
```

### doctorSettings
```typescript
{
  workosUserId: string,
  email: string,
  name: string,
  zoomPersonalLink?: string
}
// Indexes: by_workos_user
```

### oauthStates
```typescript
{
  state: string,            // UUID
  expiresAt: number         // Date.now() + 5 minutes
}
// Indexes: by_state
```

---

## Authorization Guards

### Backend (convex/authModules/authorization.ts)

```typescript
// All throw ConvexError with consistent format
requireAdmin(ctx)              // → adminUsers lookup
requireEmployerOwnership(ctx, employerId)  // → employers + ownership check
requireDoctorAccess(ctx)       // → doctorSettings lookup
getAuthenticatedUser(ctx)      // → Extract identity from JWT
```

### Frontend (src/lib/workos-auth.tsx)

```typescript
useAdminAuth()     // Returns: adminUser, isAdminAuthenticated, sessionId
useEmployerAuth()  // Returns: workosUserId, accessToken (no sessionId!)
useDoctorAuth()    // Returns: workosUserId, accessToken (no sessionId!)
```

---

## Token Storage Pattern

### localStorage Keys
```
workos_admin_auth:    { userId, accessToken, refreshToken, sessionId }
workos_employer_auth: { workosUserId, accessToken, refreshToken, sessionId }
workos_doctor_auth:   { workosUserId, accessToken, refreshToken, sessionId }
```

### Field Normalization
- Admin uses legacy `userId` for backward compatibility
- Others use `workosUserId`
- Internal normalization: `parsed.workosUserId || parsed.userId`

---

## Multi-Tab Sync

```typescript
// workos-auth.tsx lines 143-182
useEffect(() => {
  const handleStorageChange = (e: StorageEvent) => {
    // When another tab logs in/out, sync this tab
    if (Object.values(STORAGE_KEYS).includes(e.key)) {
      // Update state to match other tab
    }
  };
  window.addEventListener("storage", handleStorageChange);
  return () => window.removeEventListener("storage", handleStorageChange);
}, [state.role]);
```

---

## Performance Characteristics

| Operation | Timing | Optimization |
|-----------|--------|--------------|
| Role Detection | 50-150ms | Promise.all (parallel) |
| JWT Parsing | ~0.1ms | Single parse per load |
| Page Auth Check | ~0.5ms | localStorage sync |
| Full OAuth Flow | 500-800ms | WorkOS API latency |

---

→ Next: AUTH_E2E_SPRINT_04_BROWSER_CLI_TESTING
